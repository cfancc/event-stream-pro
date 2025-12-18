// Map tabId to devtools connection port
const connections = {};

chrome.runtime.onConnect.addListener(function (port) {
    const extensionListener = function (message, sender, sendResponse) {
        // The original connection event doesn't include the tab ID of the
        // DevTools page, so we need to send it explicitly.
        if (message.name == "init") {
            connections[message.tabId] = port;
            console.log("Connected to devtools for tab " + message.tabId);

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
            connections[tabId].postMessage(request);
        } else {
            console.log("Tab not found in connection list.");
        }
    } else {
        console.log("sender.tab not defined.");
    }
});
