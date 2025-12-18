import React from 'react';
import { List, Badge, Typography } from 'antd';

const { Text } = Typography;

const RequestList = ({ requests, selectedId, onSelect }) => {
    return (
        <div style={{
            height: '100%',
            overflowY: 'auto',
            borderRight: '1px solid #E0E0E0',
            backgroundColor: '#F5F5F5'
        }}>
            <List
                itemLayout="horizontal"
                dataSource={requests}
                renderItem={(item) => {
                    const isSelected = item.id === selectedId;
                    let name = item.url;
                    try {
                        const urlObj = new URL(item.url, 'http://localhost'); // Provide base for relative URLs
                        // Show full path + query
                        name = urlObj.pathname + urlObj.search;
                    } catch (e) {
                        // fallback to full url string
                    }

                    return (
                        <List.Item
                            onClick={() => onSelect(item.id)}
                            style={{
                                cursor: 'pointer',
                                padding: '12px',
                                backgroundColor: isSelected ? '#E6F7FF' : 'transparent',
                                borderLeft: isSelected ? '3px solid #1890ff' : '3px solid transparent',
                                transition: 'all 0.2s',
                                borderBottom: '1px solid #F0F0F0'
                            }}
                            className="request-item"
                        >
                            <div style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text strong style={{ color: isSelected ? '#1890ff' : '#333', fontSize: '13px' }} ellipsis>{name}</Text>
                                    <Badge status="processing" color={item.method === 'SSE' ? "#52c41a" : "#1890ff"} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text type="secondary" style={{ fontSize: '11px', color: '#888' }}>{item.method || 'SSE'}</Text>
                                    <Text type="secondary" style={{ fontSize: '11px', color: '#999' }}>
                                        {new Date(item.startTime).toLocaleTimeString()}
                                    </Text>
                                </div>
                            </div>
                        </List.Item>
                    );
                }}
            />
        </div>
    );
};

export default RequestList;
