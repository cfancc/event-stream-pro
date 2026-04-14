(function () {
    // Prevent duplicate injection
    if (window.__EVENT_STREAM_DEVTOOLS_CS_INJECTED) {
        return;
    }
    window.__EVENT_STREAM_DEVTOOLS_CS_INJECTED = true;

    const BRIDGE_INIT_SOURCE = "event-stream-proxy-init";
    const EVENT_SOURCE = "event-stream-proxy";
    const ALLOWED_TYPES = new Set([
        "es-connect",
        "es-message",
        "es-error",
        "fetch-start",
        "fetch-chunk",
        "fetch-done",
        "fetch-error",
        "bridge-ready"
    ]);

    function isValidPayload(payload, expectedToken = null) {
        if (!payload || typeof payload !== "object") return false;
        if (payload.source !== EVENT_SOURCE) return false;
        if (!ALLOWED_TYPES.has(payload.type)) return false;
        if (!payload.data || typeof payload.data !== "object") return false;
        if (expectedToken && payload.token !== expectedToken) return false;

        const id = payload.data.id;
        if (typeof id !== "string" || id.length === 0 || id.length > 128) return false;
        return true;
    }

    function relayToBackground(payload) {
        try {
            chrome.runtime.sendMessage(payload);
        } catch (e) {
            if (e.message && e.message.includes("Extension context invalidated")) {
                console.log("[EventStream Pro] Extension reloaded. Please refresh the page to reconnect.");
            } else {
                console.error("[EventStream Pro] Error relaying message:", e);
            }
        }
    }

    function handleFallbackMessage(event, bridgeToken) {
        if (event.source !== window) return;
        if (!isValidPayload(event.data, bridgeToken)) return;
        if (event.data.type === "bridge-ready") return;
        relayToBackground(event.data);
    }

    // Inject the interception script
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("injected-script.js");
    const bridgeToken = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    script.dataset.bridgeToken = bridgeToken;
    // Preferred bridge: dedicated MessageChannel
    let bridge = null;
    try {
        bridge = new MessageChannel();
        bridge.port1.onmessage = function (event) {
            const payload = event.data;
            if (!isValidPayload(payload)) return;
            if (payload.type === "bridge-ready") return;
            relayToBackground(payload);
        };
        bridge.port1.start();
    } catch (channelError) {
        bridge = null;
        console.warn("[EventStream Pro] MessageChannel bridge unavailable, fallback to window.postMessage.", channelError);
    }

    script.onload = function () {
        this.remove();

        // Always enable validated fallback listener.
        window.addEventListener("message", function (event) {
            handleFallbackMessage(event, bridgeToken);
        });

        if (bridge) {
            try {
                window.postMessage(
                    { source: BRIDGE_INIT_SOURCE, token: bridgeToken },
                    "*",
                    [bridge.port2]
                );
                return;
            } catch (bridgeInitError) {
                console.warn("[EventStream Pro] Bridge init failed, fallback to window.postMessage.", bridgeInitError);
            }
        }
    };
    (document.head || document.documentElement).appendChild(script);
})();
