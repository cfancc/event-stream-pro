(function () {
    // Prevent duplicate injection
    if (window.__EVENT_STREAM_DEVTOOLS_CS_INJECTED) {
        return;
    }
    window.__EVENT_STREAM_DEVTOOLS_CS_INJECTED = true;

    // Inject the interception script
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected-script.js');
    script.onload = function () {
        this.remove();
    };
    (document.head || document.documentElement).appendChild(script);

    // Listen for messages from the injected script
    window.addEventListener("message", function (event) {
        // We only accept messages from ourselves
        if (event.source != window)
            return;

        if (event.data.source && event.data.source === "event-stream-proxy") {
            // Relay to background script
            try {
                chrome.runtime.sendMessage(event.data);
            } catch (e) {
                if (e.message && e.message.includes('Extension context invalidated')) {
                    console.log('[EventStream Pro] Extension reloaded. Please refresh the page to reconnect.');
                } else {
                    console.error('[EventStream Pro] Error relaying message:', e);
                }
            }
        }
    });
})();
