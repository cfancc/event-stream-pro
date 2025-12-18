/**
 * EventStream Pro - Injected Proxy Script
 * 
 * This script is injected into the "main world" of the page to intercept
 * network requests that native DevTools might miss or not fully expose.
 * 
 * Capabilities:
 * 1. Proxy `window.EventSource` to capture SSE connection/message events.
 * 2. Proxy `window.fetch` to capture streaming responses (NDJSON/SSE).
 * 3. Forward captured data to the Content Script via `window.postMessage`.
 */
(function () {
    if (window.__EVENT_STREAM_PRO_INSTALLED__) return;
    window.__EVENT_STREAM_PRO_INSTALLED__ = true;

    // --- Utils ---

    /**
     * Generates a UUID for tracking requests across the bridge.
     */
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Sends structured data to the Content Script.
     * @param {string} type - Event type (es-connect, es-message, etc.)
     * @param {object} data - Payload
     */
    function sendToContentScript(type, data) {
        window.postMessage({
            source: "event-stream-proxy",
            type: type,
            data: data
        }, "*");
    }

    /**
     * MASKS the `toString` method of a proxy to return the native code string.
     * This helps avoid detection by some anti-bot/integrity checks.
     */
    function maskFunction(target, nativeFunc) {
        try {
            Object.defineProperty(target, 'toString', {
                value: function () { return nativeFunc.toString(); },
                writable: true,
                configurable: true
            });
        } catch (e) { }
    }

    // --- Proxy: EventSource ---

    const OriginalEventSource = window.EventSource;

    window.EventSource = function (url, options) {
        const instance = new OriginalEventSource(url, options);
        const id = generateUUID();

        // 1. Notify extension of new connection
        sendToContentScript("es-connect", {
            id: id,
            url: url,
            startTime: Date.now()
        });

        // Map to store our wrappers for correct removal:
        // Map<OriginalListener, Map<EventType, WrapperFunction>>
        const listenerMap = new Map();

        const originalAdd = instance.addEventListener;
        const originalRemove = instance.removeEventListener;

        // 2. Global Spy: Catch all 'message' events
        // Most SSE just uses .onmessage or addEventListener('message')
        originalAdd.call(instance, "message", function (e) {
            sendToContentScript("es-message", {
                id: id,
                type: "message",
                data: e.data,
                time: Date.now()
            });
        });

        // 3. Override addEventListener to capture NAMED events (e.g. event: custom)
        instance.addEventListener = function (type, listener, options) {
            // Retrieve or create the type map for this specific listener
            let typeMap = listenerMap.get(listener);
            if (!typeMap) {
                typeMap = new Map();
                listenerMap.set(listener, typeMap);
            }

            // Prevent duplicate wrapping if same listener+type is added agains
            if (typeMap.has(type)) {
                originalAdd.call(this, type, typeMap.get(type), options);
                return;
            }

            // Create a wrapper that forwards data to us, then calls original
            const wrapper = function (event) {
                // Avoid duplicating 'message' events since we have a global spy above
                if (type !== 'message') {
                    sendToContentScript("es-message", {
                        id: id,
                        type: type,
                        data: event.data,
                        time: Date.now()
                    });
                }

                // Call the user's original listener
                if (typeof listener === 'function') {
                    listener.call(this, event);
                } else if (listener && typeof listener.handleEvent === 'function') {
                    listener.handleEvent(event);
                }
            };

            typeMap.set(type, wrapper);
            originalAdd.call(this, type, wrapper, options);
        };

        // 4. Override removeEventListener to ensure wrappers are removed
        instance.removeEventListener = function (type, listener, options) {
            const typeMap = listenerMap.get(listener);
            const wrapper = typeMap ? typeMap.get(type) : null;

            if (wrapper) {
                originalRemove.call(this, type, wrapper, options);
                typeMap.delete(type);
                if (typeMap.size === 0) listenerMap.delete(listener);
            } else {
                // Fallback for untracked listeners
                originalRemove.call(this, type, listener, options);
            }
        };

        // 5. Proxy Error Logging
        const originalOnError = instance.onerror;
        instance.onerror = function (e) {
            sendToContentScript("es-error", { id: id, time: Date.now() });
            if (originalOnError) originalOnError.call(this, e);
        }

        return instance;
    };

    // Restore Prototype & Static Properties
    window.EventSource.prototype = OriginalEventSource.prototype;
    window.EventSource.CONNECTING = OriginalEventSource.CONNECTING;
    window.EventSource.OPEN = OriginalEventSource.OPEN;
    window.EventSource.CLOSED = OriginalEventSource.CLOSED;
    maskFunction(window.EventSource, OriginalEventSource);


    // --- Proxy: Fetch ---

    const originalFetch = window.fetch;
    window.fetch = async function (resource, options) {
        const id = generateUUID();
        let url = 'unknown';
        try {
            url = (resource instanceof Request) ? resource.url : resource;
        } catch (e) { }

        const method = options?.method || (resource instanceof Request ? resource.method : "GET");

        // 1. Execute Fetch
        let response;
        try {
            response = await originalFetch(resource, options);
        } catch (err) {
            throw err;
        }

        // 2. Check Content-Type to filter out non-stream requests
        const contentType = response.headers.get('content-type') || '';

        // DEBUG: Temporary log to debug missing captures
        // console.log("[EventStream Pro] Fetch Response:", url, "Content-Type:", contentType);

        if (!contentType.toLowerCase().includes('event-stream') &&
            !contentType.toLowerCase().includes('x-ndjson') &&
            !contentType.toLowerCase().includes('stream+json')) {
            // console.log("[EventStream Pro] Filtered out:", url);
            return response;
        }

        // 3. Notify Start (Confirmed Stream)
        try {
            sendToContentScript("fetch-start", {
                id: id,
                url: url,
                method: method,
                startTime: Date.now()
            });
        } catch (e) { }

        // 4. Clone and Read Stream
        // Use clone() so we don't consume the body for the main app
        try {
            if (!response.body) return response;

            const clone = response.clone();
            const reader = clone.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = '';

            (async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            sendToContentScript("fetch-done", { id: id, time: Date.now() });
                            break;
                        }

                        const chunk = decoder.decode(value, { stream: true });
                        buffer += chunk;

                        // Basic SSE Parsing on the fly
                        const parts = buffer.split(/\n\n/);
                        buffer = parts.pop(); // Keep incomplete chunk

                        parts.forEach(part => {
                            const lines = part.split(/\n/);
                            let eventType = 'message';
                            let dataParts = [];

                            lines.forEach(line => {
                                line = line.trimEnd();
                                if (line.startsWith('event:')) {
                                    eventType = line.slice(6).trim();
                                } else if (line.startsWith('data:')) {
                                    let d = line.slice(5);
                                    if (d.startsWith(' ')) d = d.slice(1);
                                    dataParts.push(d);
                                }
                            });

                            if (dataParts.length > 0 || eventType !== 'message') {
                                sendToContentScript("es-message", {
                                    id: id,
                                    type: eventType,
                                    data: dataParts.join('\n'),
                                    time: Date.now()
                                });
                            }
                        });
                    }
                } catch (err) {
                    sendToContentScript("fetch-error", { id: id, error: err.toString() });
                }
            })();
        } catch (e) {
            // console.error("EventStream Proxy: Fetch clone failed", e);
        }

        return response;
    };
    maskFunction(window.fetch, originalFetch);

})();
