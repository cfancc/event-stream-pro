// Map tabId to devtools connection port
const connections = {};
const pendingMessagesByTab = {};
const MAX_BUFFERED_MESSAGES_PER_TAB = 1000;
const BUFFER_TTL_MS = 30000;

function enqueuePendingMessage(tabId, message) {
    if (!pendingMessagesByTab[tabId]) {
        pendingMessagesByTab[tabId] = [];
    }

    const queue = pendingMessagesByTab[tabId];
    queue.push({
        timestamp: Date.now(),
        payload: message
    });

    if (queue.length > MAX_BUFFERED_MESSAGES_PER_TAB) {
        queue.splice(0, queue.length - MAX_BUFFERED_MESSAGES_PER_TAB);
    }
}

function flushPendingMessages(tabId) {
    if (!(tabId in connections)) return;
    const queue = pendingMessagesByTab[tabId];
    if (!queue || queue.length === 0) return;

    const now = Date.now();
    const validMessages = queue.filter((item) => (now - item.timestamp) <= BUFFER_TTL_MS);
    const undelivered = [];

    validMessages.forEach((item) => {
        try {
            connections[tabId].postMessage(item.payload);
        } catch (e) {
            undelivered.push(item);
        }
    });

    if (undelivered.length > 0) {
        pendingMessagesByTab[tabId] = undelivered;
    } else {
        delete pendingMessagesByTab[tabId];
    }
}

chrome.runtime.onConnect.addListener(function (port) {
    const extensionListener = function (message, sender, sendResponse) {
        // The original connection event doesn't include the tab ID of the
        // DevTools page, so we need to send it explicitly.
        if (message.name == "init") {
            connections[message.tabId] = port;
            console.log("Connected to devtools for tab " + message.tabId);
            flushPendingMessages(message.tabId);

            // Auto-inject content script if missing
            chrome.scripting.executeScript({
                target: { tabId: message.tabId },
                files: ['content-script.js']
            }).catch(() => {
                // Ignore errors (e.g., cannot inject into privileged pages)
            });

            return;
        }

        // Handle other messages from DevTools panel if needed
    }

    port.onMessage.addListener(extensionListener);

    port.onDisconnect.addListener(function (port) {
        port.onMessage.removeListener(extensionListener);

        const tabs = Object.keys(connections);
        for (let i = 0; i < tabs.length; i++) {
            if (connections[tabs[i]] == port) {
                delete connections[tabs[i]];
                break;
            }
        }
    });
});

// Receive message from content script and relay to the specific devtools page for the current tab
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    // Messages from content scripts should have sender.tab set
    if (sender.tab) {
        const tabId = sender.tab.id;
        if (tabId in connections) {
            try {
                connections[tabId].postMessage(request);
            } catch (e) {
                enqueuePendingMessage(tabId, request);
            }
        } else {
            enqueuePendingMessage(tabId, request);
        }
    } else {
        console.log("sender.tab not defined.");
    }
});

chrome.tabs.onRemoved.addListener(function (tabId) {
    delete connections[tabId];
    delete pendingMessagesByTab[tabId];
});
