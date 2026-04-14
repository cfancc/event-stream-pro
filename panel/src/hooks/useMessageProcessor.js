import { useState, useEffect } from 'react';

const MAX_MESSAGES_PER_REQUEST = 5000;

const useMessageProcessor = () => {
    const [requests, setRequests] = useState([]);
    const [messagesMap, setMessagesMap] = useState({});

    const upsertRequest = (prev, id, partial = {}) => {
        const index = prev.findIndex((item) => item.id === id);
        const now = Date.now();

        if (index === -1) {
            return [
                ...prev,
                {
                    id,
                    url: partial.url || 'unknown',
                    method: partial.method || 'SSE',
                    startTime: partial.startTime || now,
                    status: partial.status || 'open',
                    endTime: partial.endTime || null,
                    error: partial.error || null
                }
            ];
        }

        const next = [...prev];
        next[index] = {
            ...next[index],
            ...partial
        };
        return next;
    };

    const appendMessage = (id, messagePayload) => {
        setMessagesMap((prev) => {
            const list = prev[id] || [];
            const nextList = [...list, messagePayload];
            if (nextList.length > MAX_MESSAGES_PER_REQUEST) {
                nextList.splice(0, nextList.length - MAX_MESSAGES_PER_REQUEST);
            }
            return {
                ...prev,
                [id]: nextList
            };
        });
    };

    const handleMessage = (msg) => {
        const { type, data } = msg;
        if (!data || typeof data !== 'object' || !data.id) return;

        if (['es-connect', 'fetch-start'].includes(type)) {
            setRequests(prev => {
                return upsertRequest(prev, data.id, {
                    url: data.url,
                    method: data.method || 'SSE',
                    startTime: data.startTime,
                    status: 'open',
                    endTime: null,
                    error: null
                });
            });
            setMessagesMap(prev => {
                if (prev[data.id]) return prev;
                return { ...prev, [data.id]: [] };
            });
        }
        else if (['es-message', 'fetch-chunk'].includes(type)) {
            setRequests((prev) => upsertRequest(prev, data.id, {
                method: type === 'fetch-chunk' ? 'FETCH_STREAM' : 'SSE',
                startTime: data.time || Date.now(),
                status: 'open'
            }));

            const messagePayload = type === 'fetch-chunk'
                ? { ...data, data: data.chunk, type: 'stream' }
                : data;
            appendMessage(data.id, messagePayload);
        }
        else if (type === 'fetch-done') {
            setRequests((prev) => upsertRequest(prev, data.id, {
                status: 'done',
                endTime: data.time || Date.now()
            }));
        }
        else if (['fetch-error', 'es-error'].includes(type)) {
            setRequests((prev) => upsertRequest(prev, data.id, {
                status: 'error',
                endTime: data.time || Date.now(),
                error: data.error || 'stream error'
            }));
            appendMessage(data.id, {
                id: data.id,
                type: 'error',
                data: data.error || 'stream error',
                time: data.time || Date.now()
            });
        }
    };

    useEffect(() => {
        // eslint-disable-next-line no-undef
        const tabId = chrome.devtools?.inspectedWindow?.tabId;
        
        let port = null;
        let isMounted = true;
        let reconnectTimer = null;

        const connect = () => {
            if (!isMounted) return;
            
            try {
                // eslint-disable-next-line no-undef
                port = chrome.runtime.connect({ name: "panel" });
                
                // Notify background script about initialization
                port.postMessage({ name: "init", tabId: tabId });

                // Listen for messages
                port.onMessage.addListener(handleMessage);

                // Handle disconnect (e.g. Service Worker goes inactive)
                port.onDisconnect.addListener(() => {
                    port = null;
                    if (isMounted) {
                        // Attempt reconnect after a short delay
                        reconnectTimer = setTimeout(connect, 2000);
                    }
                });
            } catch (e) {
                console.warn("Connection failed", e);
                if (isMounted) {
                    reconnectTimer = setTimeout(connect, 2000);
                }
            }
        };

        connect();

        const handleNavigated = () => {
            setRequests([]);
            setMessagesMap({});
        };

        try {
            // eslint-disable-next-line no-undef
            if (chrome.devtools?.network?.onNavigated) {
                // eslint-disable-next-line no-undef
                chrome.devtools.network.onNavigated.addListener(handleNavigated);
            }
        } catch (e) { }

        return () => {
            isMounted = false;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            
            if (port) {
                try {
                    port.disconnect();
                } catch (e) { /* ignore */ }
            }
            
            try {
                // eslint-disable-next-line no-undef
                if (chrome.devtools?.network?.onNavigated) {
                    // eslint-disable-next-line no-undef
                    chrome.devtools.network.onNavigated.removeListener(handleNavigated);
                }
            } catch (e) { }
        };
    }, []);

    return {
        requests,
        messagesMap,
        clearData: () => {
            setRequests([]);
            setMessagesMap({});
        }
    };
};

export default useMessageProcessor;
