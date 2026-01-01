import React, { useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Besked, MessageType } from '../../types_kommunikation';
import { X, Smile } from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface MessageInputProps {
    onSend: (content: string, type: MessageType, linkUrl?: string, linkTitle?: string, parentId?: number) => void;
    replyingTo?: Besked;
    onCancelReply?: () => void;
    onDropMessage?: (messageId: number) => void;
}

const MessageInput: React.FC<MessageInputProps & { fullHeight?: boolean }> = ({ onSend, replyingTo, onCancelReply, fullHeight, onDropMessage }) => {
    const [content, setContent] = useState('');
    const [type, setType] = useState<MessageType>('NORMAL');
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkTitle, setLinkTitle] = useState('');

    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!isDragOver) setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const msgId = Number(e.dataTransfer.getData('text/plain'));
        if (msgId && onDropMessage) {
            onDropMessage(msgId);
        }
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        setContent(prev => prev + emojiData.emoji);
        setShowEmojiPicker(false);
    };
    // ...

    const handleSend = () => {
        if (!content.trim()) return;

        onSend(content, type, showLinkInput ? linkUrl : undefined, showLinkInput ? linkTitle : undefined, replyingTo?.id);

        // Reset
        setContent('');
        setType('NORMAL');
        setShowLinkInput(false);
        setLinkUrl('');
        setLinkTitle('');
    };

    const modules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean']
        ],
    };

    return (
        <div
            className={`p-4 bg-white border-t border-gray-200 transition-colors ${fullHeight ? 'h-full flex flex-col' : ''} ${isDragOver ? 'bg-red-50 border-red-500 border-t-2' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {replyingTo && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-md p-2 mb-2 shrink-0">
                    <div className="text-sm text-blue-800">
                        <span className="font-semibold">Svarer til:</span>
                        <span className="ml-2 italic truncate max-w-xs inline-block align-bottom text-gray-600" dangerouslySetInnerHTML={{ __html: replyingTo.indhold }}></span>
                    </div>
                    <button onClick={onCancelReply} className="text-blue-500 hover:text-blue-700">
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className={`bg-white ${fullHeight ? 'flex-1 flex flex-col min-h-0' : ''}`}>
                <ReactQuill
                    theme="snow"
                    value={content}
                    onChange={setContent}
                    modules={modules}
                    className={`${fullHeight ? 'h-full flex flex-col [&>.ql-container]:flex-1' : 'min-h-[120px] flex flex-col [&>.ql-container]:flex-1'} [&>.ql-container]:overflow-y-auto mb-2`}
                />
            </div>

            {/* Bottom Toolbar */}
            <div className="flex justify-between items-center mt-2 shrink-0 pt-2 border-t border-gray-100">
                <div className="flex gap-2 items-center flex-wrap">
                    <select
                        id="message-type-select"
                        name="messageType"
                        value={type}
                        onChange={(e) => setType(e.target.value as MessageType)}
                        className="text-xs border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1"
                    >
                        <option value="NORMAL">Normal</option>
                        <option value="VIGTIG">Vigtig</option>
                        <option value="INFO">Kun Info</option>
                        <option value="HANDLING">Kræver Handling</option>
                    </select>

                    <button
                        onClick={() => setShowLinkInput(!showLinkInput)}
                        className={`text-xs px-2 py-1 rounded ${showLinkInput ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        🔗 Link Context
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className={`p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors ${showEmojiPicker ? 'bg-blue-100 text-blue-600' : ''}`}
                            title="Indsæt smiley"
                        >
                            <Smile size={20} />
                        </button>
                        {showEmojiPicker && (
                            <div className="absolute bottom-10 left-0 z-50 shadow-xl border border-gray-200 rounded-lg">
                                <EmojiPicker
                                    onEmojiClick={onEmojiClick}
                                    width={300}
                                    height={400}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={handleSend}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 shadow-sm text-sm font-medium flex items-center gap-1"
                >
                    Send
                </button>
            </div>

            {showLinkInput && (
                <div className="flex gap-2 mt-2 p-2 bg-gray-50 rounded border border-gray-200 shrink-0">
                    <input
                        type="text"
                        id="link-url-input"
                        name="linkUrl"
                        placeholder="Link URL"
                        className="flex-1 text-xs border-gray-300 rounded"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                    />
                    <input
                        type="text"
                        id="link-title-input"
                        name="linkTitle"
                        placeholder="Link Titel"
                        className="flex-1 text-xs border-gray-300 rounded"
                        value={linkTitle}
                        onChange={(e) => setLinkTitle(e.target.value)}
                    />
                </div>
            )}
        </div>
    );
};

export default MessageInput;
