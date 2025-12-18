import React, { useState } from 'react';
import { Table, Tabs, Switch, Button, Input, Space, Tooltip, message, Checkbox } from 'antd';

import { CopyOutlined, EyeOutlined, PauseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Resizable } from 'react-resizable';
import { safeJsonParseAndDecode } from '../utils/decoder';
import DetailsModal from './DetailsModal';

const { TabPane } = Tabs;

const ResizableTitle = (props) => {
    const { onResize, width, ...restProps } = props;

    if (!width) {
        return <th {...restProps} />;
    }

    return (
        <Resizable
            width={width}
            height={0}
            handle={
                <span
                    className="react-resizable-handle"
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                />
            }
            onResize={onResize}
            draggableOpts={{ enableUserSelectHack: false }}
        >
            <th {...restProps} />
        </Resizable>
    );
};

const StreamViewer = ({ request, messages }) => {
    const [autoDecode, setAutoDecode] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [searchDecoded, setSearchDecoded] = useState(true);
    const [detailsContent, setDetailsContent] = useState('');
    const [isDetailsVisible, setIsDetailsVisible] = useState(false);

    const viewDetails = (text) => {
        setDetailsContent(text || '');
        setIsDetailsVisible(true);
    };

    const getDisplayContent = (text) => {
        if (text === undefined || text === null) return '';
        if (autoDecode) {
            const decoded = safeJsonParseAndDecode(text);
            return typeof decoded === 'object' ? JSON.stringify(decoded) : decoded;
        }
        return text;
    };

    const handleCopy = (e, text) => {
        e.stopPropagation(); // Prevent row click
        if (!text) return;
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) {
                message.success('Copied to clipboard');
                return;
            }
        } catch {
            // ignore
        }

        navigator.clipboard.writeText(text).then(() => {
            message.success('Copied to clipboard');
        }).catch(() => {
            message.error('Copy failed');
        });
    };

    const [columnWidths, setColumnWidths] = useState({
        id: 60,
        type: 100,
        time: 80,
        data: undefined
    });

    const handleResize = (dataIndex) => (e, { size }) => {
        setColumnWidths((prev) => ({
            ...prev,
            [dataIndex]: size.width,
        }));
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            width: columnWidths.id,
            render: (_, record) => <span style={{ color: '#888' }}>{record._originalIndex + 1}</span>
        },
        {
            title: 'Type',
            dataIndex: 'type',
            width: columnWidths.type,
            render: text => <span style={{ color: '#569CD6' }}>{text || 'message'}</span>
        },
        {
            title: 'Data',
            dataIndex: 'data',
            width: columnWidths.data,
            render: (text) => {
                const displayContent = getDisplayContent(text);
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Menlo, monospace', color: '#a50' }}>
                            {displayContent}
                        </div>
                        <div style={{ flexShrink: 0 }}>
                            <Tooltip title="Copy">
                                <Button type="text" size="small" icon={<CopyOutlined />} onClick={(e) => handleCopy(e, displayContent)} />
                            </Tooltip>
                        </div>
                    </div>
                );
            }
        },
        {
            title: 'Time',
            dataIndex: 'time',
            width: columnWidths.time,
            render: time => <span style={{ color: '#888', fontSize: '11px' }}>{new Date(time).toLocaleTimeString().split(' ')[0]}</span>
        }
    ];

    if (!request) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', backgroundColor: '#FFFFFF' }}>
                Select a request to view details
            </div>
        );
    }

    const resizableColumns = columns.map((col) => ({
        ...col,
        onHeaderCell: (column) => ({
            width: column.width,
            onResize: handleResize(col.dataIndex),
        }),
    }));

    const components = {
        header: {
            cell: ResizableTitle,
        },
    };



    const filteredMessages = messages.map((m, i) => ({ ...m, _originalIndex: i })).filter(msg => {
        if (!searchText) return true;
        const lowerSearch = searchText.toLowerCase();

        // 1. Decoded Search (Exclusive Mode)
        // If checked, we ONLY search in the processed/decoded values to avoid matching raw escapes like \uXXXX
        if (searchDecoded) {
            // Check ID
            if (String(msg._originalIndex + 1).includes(lowerSearch)) return true;
            // Check Type
            if (msg.type && msg.type.toLowerCase().includes(lowerSearch)) return true;
            // Check Data (Decoded)
            if (msg.data) {
                try {
                    const decoded = safeJsonParseAndDecode(msg.data);
                    const decodedStr = typeof decoded === 'object' ? JSON.stringify(decoded) : String(decoded);
                    if (decodedStr.toLowerCase().includes(lowerSearch)) return true;
                } catch {
                    // ignore
                    // Fallback to string check if something weird happens
                    if (String(msg.data).toLowerCase().includes(lowerSearch)) return true;
                }
            }
            return false;
        }

        // 2. Default Raw Search
        // Matches everything in the raw JSON payload
        const rawMatch = JSON.stringify(msg).toLowerCase().includes(lowerSearch);
        if (rawMatch) return true;

        return false;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#FFFFFF', color: '#333' }}>


            {/* Content Area with Fixed Tabs */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Tabs
                    defaultActiveKey="1"
                    style={{ height: '100%', width: '100%' }}
                    tabBarStyle={{ paddingLeft: 16, marginBottom: 0, borderBottom: '1px solid #f0f0f0', flexShrink: 0, backgroundColor: '#fff' }}
                    items={[
                        {
                            key: '1',
                            label: 'Messages',
                            children: (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                    <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa', flexShrink: 0, gap: 16 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                                            <Input
                                                placeholder="Filter messages..."
                                                size="small"
                                                value={searchText}
                                                onChange={e => setSearchText(e.target.value)}
                                                allowClear
                                                style={{ maxWidth: 300 }}
                                            />
                                            <Checkbox
                                                checked={searchDecoded}
                                                onChange={e => setSearchDecoded(e.target.checked)}
                                                style={{ fontSize: 12 }}
                                            >
                                                Search Decoded
                                            </Checkbox>
                                        </div>
                                        <Switch
                                            checkedChildren="Auto Decode"
                                            unCheckedChildren="Raw \u"
                                            checked={autoDecode}
                                            onChange={setAutoDecode}
                                            size="small"
                                        />
                                    </div>
                                    {/* Scrollable Table Container */}
                                    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                                        <Table
                                            dataSource={filteredMessages}
                                            columns={resizableColumns}
                                            components={components}
                                            pagination={false}
                                            size="small"
                                            rowKey={(r, i) => i}
                                            rowClassName="message-row"
                                            onRow={(record) => ({
                                                onClick: () => {
                                                    viewDetails(getDisplayContent(record.data));
                                                },
                                                style: { cursor: 'pointer' }
                                            })}
                                            sticky // Antd sticky header support inside scroll container
                                        />
                                    </div>
                                </div>
                            )
                        },
                        {
                            key: '2',
                            label: 'Raw',
                            children: (
                                <div style={{
                                    padding: '8px 4px',
                                    height: '100%',
                                    overflowY: 'auto',
                                    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                                    fontSize: '12px',
                                    lineHeight: '1.5',
                                    backgroundColor: '#FFFFFF',
                                    color: '#333'
                                }}>
                                    {messages.map((m, i) => (
                                        <div key={i} style={{ display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
                                            <div style={{
                                                width: 30,
                                                textAlign: 'right',
                                                paddingRight: 8,
                                                color: '#999',
                                                userSelect: 'none',
                                                borderRight: '1px solid #eee',
                                                marginRight: 8,
                                                flexShrink: 0
                                            }}>
                                                {i + 1}
                                            </div>
                                            <div style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                                                {m.type && m.type !== 'message' && (
                                                    <div style={{ color: '#0969da' }}>event: {m.type}</div>
                                                )}
                                                <div style={{ color: '#333' }}>
                                                    <span style={{ color: '#0969da' }}>data:</span>
                                                    {typeof m.data === 'string' ? m.data : JSON.stringify(m.data)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        }
                    ]}
                />
            </div>

            <DetailsModal
                open={isDetailsVisible}
                onClose={() => setIsDetailsVisible(false)}
                content={detailsContent}
            />

            <style>{`
        .ant-table-thead > tr > th { background: #FAFAFA !important; color: #333 !important; border-bottom: 1px solid #F0F0F0 !important; }
        .ant-table-tbody > tr > td { border-bottom: 1px solid #F0F0F0 !important; padding: 4px 8px !important; }
        .ant-table-tbody > tr:hover > td { background: #E6F7FF !important; }
        /* Fix Tabs Scrolling Height */
        .ant-tabs-content { height: 100%; }
        .ant-tabs-tabpane { height: 100%; }
        /* Resize Handle */
        .react-resizable {
          position: relative;
          background-clip: padding-box;
        }
        .react-resizable-handle {
          position: absolute;
          right: -5px;
          bottom: 0;
          z-index: 1;
          width: 10px;
          height: 100%;
          cursor: col-resize;
        }
      `}</style>
        </div>
    );
};

export default StreamViewer;
