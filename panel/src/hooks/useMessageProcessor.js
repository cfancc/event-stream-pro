import { useState, useEffect } from 'react';

const useMessageProcessor = () => {
    const [requests, setRequests] = useState([]);
    const [messagesMap, setMessagesMap] = useState({});

    const handleMessage = (msg) => {
        const { type, data } = msg;

        if (['es-connect', 'fetch-start'].includes(type)) {
            setRequests(prev => {
                if (prev.find(r => r.id === data.id)) return prev;
                return [...prev, {
                    id: data.id,
                    url: data.url,
                    method: data.method || 'SSE',
                    startTime: data.startTime
                }];
            });
            setMessagesMap(prev => ({ ...prev, [data.id]: [] }));
        }
        else if (['es-message', 'fetch-chunk'].includes(type)) {
            const { id } = data;
            const messagePayload = type === 'fetch-chunk'
                ? { ...data, data: data.chunk, type: 'stream' }
                : data;

            setMessagesMap(prev => ({
                ...prev,
                [id]: [...(prev[id] || []), messagePayload]
            }));
        }
    };

    useEffect(() => {
        // eslint-disable-next-line no-undef
        const tabId = chrome.devtools?.inspectedWindow?.tabId;

        let port = null;
        try {
            // eslint-disable-next-line no-undef
            port = chrome.runtime.connect({ name: "panel" });
            port.postMessage({ name: "init", tabId: tabId });

            port.onMessage.addListener((msg) => {
                handleMessage(msg);
            });
        } catch (e) {
            console.warn("Connection failed or not in extension environment", e);
        }

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
            if (port) port.disconnect();
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
