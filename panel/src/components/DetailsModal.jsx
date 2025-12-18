import React, { useState, useEffect } from 'react';
import { Modal, Button, Switch, Space, Input, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

const { TextArea } = Input;

const DetailsModal = ({ open, onClose, content }) => {
    const [isJson, setIsJson] = useState(false);
    const [isFormatted, setIsFormatted] = useState(false);

    // Reset state when content changes or modal opens
    useEffect(() => {
        if (open && content) {
            let isJsonContent = false;
            try {
                const parsed = JSON.parse(content);
                if (typeof parsed === 'object' && parsed !== null) {
                    isJsonContent = true;
                }
            } catch (e) { }
            setIsJson(isJsonContent);
            setIsFormatted(isJsonContent); // Default to formatted if detected as JSON
        }
    }, [open, content]);

    const handleCopy = (text) => {
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
        } catch (e) { }

        navigator.clipboard.writeText(text).then(() => {
            message.success('Copied to clipboard');
        }).catch(() => {
            message.error('Copy failed');
        });
    };

    const displayContent = (isFormatted && isJson)
        ? (() => { try { return JSON.stringify(JSON.parse(content), null, 2); } catch (e) { return content; } })()
        : content;

    const modalTitle = (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 30 }}>
            <span>Full Data</span>
            {isJson && (
                <Space>
                    <span>Format JSON</span>
                    <Switch size="small" checked={isFormatted} onChange={setIsFormatted} />
                </Space>
            )}
        </div>
    );

    return (
        <Modal
            title={modalTitle}
            open={open}
            onCancel={onClose}
            footer={[
                <Button key="copy" icon={<CopyOutlined />} onClick={() => handleCopy(displayContent)}>Copy</Button>,
                <Button key="close" onClick={onClose}>Close</Button>
            ]}
            width={800}
        >
            <TextArea
                value={displayContent}
                autoSize={{ minRows: 10, maxRows: 30 }}
                readOnly
                style={{ fontFamily: isFormatted ? 'monospace' : 'inherit', color: '#333' }}
            />
        </Modal>
    );
};

export default DetailsModal;
