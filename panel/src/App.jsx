import React, { useEffect, useRef, useState } from 'react';
import { Layout } from 'antd';
import RequestList from './components/RequestList';
import StreamViewer from './components/StreamViewer';
import useMessageProcessor from './hooks/useMessageProcessor';
import { Resizable } from 'react-resizable';
import './index.css';

const { Sider, Content } = Layout;

function App() {
  const { requests, messagesMap } = useMessageProcessor();
  const [width, setWidth] = useState(300);
  const [selectedId, setSelectedId] = useState(null);
  const previousRequestIdsRef = useRef(new Set());

  const onResize = (event, { size }) => {
    setWidth(size.width);
  };

  useEffect(() => {
    if (requests.length === 0) {
      previousRequestIdsRef.current = new Set();
      if (selectedId !== null) {
        setSelectedId(null);
      }
      return;
    }

    const previousIds = previousRequestIdsRef.current;
    const currentIds = new Set(requests.map((item) => item.id));
    const hasNewRequest = requests.some((item) => !previousIds.has(item.id));
    const selectedMissing = selectedId ? !currentIds.has(selectedId) : false;

    if (hasNewRequest || selectedMissing || !selectedId) {
      const latestRequest = requests.reduce((latest, current) => {
        if (!latest) return current;

        const latestTime = Number(latest.startTime) || 0;
        const currentTime = Number(current.startTime) || 0;
        if (currentTime !== latestTime) {
          return currentTime > latestTime ? current : latest;
        }
        return String(current.id) > String(latest.id) ? current : latest;
      }, null);

      if (latestRequest && latestRequest.id !== selectedId) {
        setSelectedId(latestRequest.id);
      }
    }

    previousRequestIdsRef.current = currentIds;
  }, [requests, selectedId]);

  const selectedRequest = requests.find(r => r.id === selectedId);
  const selectedMessages = selectedId ? (messagesMap[selectedId] || []) : [];

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Resizable
        width={width}
        height={0}
        axis="x"
        onResize={onResize}
        resizeHandles={['e']}
        handle={
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '10px',
              cursor: 'col-resize',
              zIndex: 100
            }}
            onClick={(e) => e.stopPropagation()}
          />
        }
      >
        <Sider width={width} theme="dark" style={{ borderRight: '1px solid #333', overflowY: 'auto', height: '100vh', position: 'relative' }}>
          <RequestList
            requests={requests}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </Sider>
      </Resizable>
      <Content style={{ backgroundColor: '#1E1E1E', minWidth: 0 }}>
        <StreamViewer
          request={selectedRequest}
          messages={selectedMessages}
        />
      </Content>
    </Layout>
  );
}

export default App;
