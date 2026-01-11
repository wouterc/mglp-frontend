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
    initialContent?: string;
    initialLinkUrl?: string;
    initialLinkTitle?: string;
    editingMessage?: Besked;
    onUpdate?: (id: number, content: string, type: MessageType, linkUrl?: string, linkTitle?: string) => void;
    onCancelEdit?: () => void;
}

const MessageInput: React.FC<MessageInputProps & { fullHeight?: boolean }> = ({
    onSend,
    replyingTo,
    onCancelReply,
    fullHeight,
    onDropMessage,
    initialContent,
    initialLinkUrl,
    initialLinkTitle,
    editingMessage,
    onUpdate,
    onCancelEdit
}) => {
    const [content, setContent] = useState(initialContent || '');
    const [type, setType] = useState<MessageType>('NORMAL');
    const [showLinkInput, setShowLinkInput] = useState(!!initialLinkUrl);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [linkUrl, setLinkUrl] = useState(initialLinkUrl || '');
    const [linkTitle, setLinkTitle] = useState(initialLinkTitle || '');
    const [showTypeMenu, setShowTypeMenu] = useState(false);

    const typeOptions: { type: MessageType, label: string, color: string }[] = [
        { type: 'NORMAL', label: 'Normal', color: 'bg-gray-300' },
        { type: 'VIGTIG', label: 'Vigtig', color: 'bg-red-500' },
        { type: 'INFO', label: 'Kun Info', color: 'bg-blue-500' },
        { type: 'HANDLING', label: 'Kræver Handling', color: 'bg-yellow-500' },
    ];

    const [isDragOver, setIsDragOver] = useState(false);

    // Populate form when editingMessage changes
    React.useEffect(() => {
        if (editingMessage) {
            setContent(editingMessage.indhold);
            setType(editingMessage.type as MessageType);
            setLinkUrl(editingMessage.link_url || '');
            setLinkTitle(editingMessage.link_titel || '');
            setShowLinkInput(!!editingMessage.link_url);
        }
    }, [editingMessage]);

    // Inherit type when replying
    React.useEffect(() => {
        if (replyingTo && !editingMessage) {
            setType(replyingTo.type as MessageType);
        }
    }, [replyingTo, editingMessage]);

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

    React.useEffect(() => {
        const fixInputs = () => {
            const tooltipInputs = document.querySelectorAll('.ql-tooltip input[type="text"]');
            tooltipInputs.forEach((input) => {
                if (input instanceof HTMLInputElement) {
                    if (!input.id) input.id = 'ql-tooltip-input';
                    if (!input.name) input.name = 'qlTooltipInput';
                    if (!input.getAttribute('aria-label')) {
                        input.setAttribute('aria-label', 'Indtast link, formel eller video URL');
                    }
                }
            });
        };

        // Run immediately
        fixInputs();

        // Observe for any changes to the DOM (nodes added or attributes changed)
        const observer = new MutationObserver(fixInputs);
        observer.observe(document.body, { childList: true, subtree: true, attributes: true });

        return () => observer.disconnect();
    }, []);

    const handleSend = () => {
        if (!content.trim()) return;

        if (editingMessage && onUpdate) {
            onUpdate(editingMessage.id, content, type, showLinkInput ? linkUrl : undefined, showLinkInput ? linkTitle : undefined);
        } else {
            onSend(content, type, showLinkInput ? linkUrl : undefined, showLinkInput ? linkTitle : undefined, replyingTo?.id);
        }

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
            className={`p-2 bg-white border-t border-gray-200 transition-colors ${fullHeight ? 'h-full flex flex-col' : ''} ${isDragOver ? 'bg-red-50 border-red-500 border-t-2' : ''} ${editingMessage ? 'ring-2 ring-yellow-400' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {editingMessage && (
                <div className="flex items-center justify-between bg-yellow-50 border border-yellow-100 rounded-md p-2 mb-2 shrink-0">
                    <div className="text-sm text-yellow-800">
                        <span className="font-semibold">Redigerer besked:</span>
                    </div>
                    <button onClick={onCancelEdit} className="text-yellow-600 hover:text-yellow-800">
                        <X size={16} />
                    </button>
                </div>
            )}

            {replyingTo && !editingMessage && (
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

            {/* Toolbar (Moved to Top) */}
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100 shrink-0">
                <div className="flex gap-2 items-center flex-wrap">
                    <div className="relative">
                        <button
                            onClick={() => setShowTypeMenu(!showTypeMenu)}
                            className="flex items-center gap-2 text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[100px]"
                        >
                            <div className={`w-2.5 h-2.5 rounded-full ${typeOptions.find(o => o.type === type)?.color || 'bg-gray-300'}`}></div>
                            <span className="font-medium text-gray-700">{typeOptions.find(o => o.type === type)?.label || 'Normal'}</span>
                        </button>

                        {showTypeMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowTypeMenu(false)} />
                                <div className="absolute bottom-full mb-1 left-0 z-50 w-40 bg-white rounded-lg shadow-xl border border-gray-200 py-1 overflow-hidden">
                                    {typeOptions.map(opt => (
                                        <button
                                            key={opt.type}
                                            onClick={() => {
                                                setType(opt.type);
                                                setShowTypeMenu(false);
                                            }}
                                            className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-50 ${type === opt.type ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}
                                        >
                                            <div className={`w-2.5 h-2.5 rounded-full ${opt.color}`}></div>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <button
                        onClick={() => setShowLinkInput(!showLinkInput)}
                        className={`text-xs px-2 py-1 rounded ${showLinkInput ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        🔗 <span className="hidden sm:inline">Link Context</span><span className="inline sm:hidden">Link</span>
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
                            <div className="absolute bottom-full mb-2 left-0 z-50 shadow-xl border border-gray-200 rounded-lg">
                                <EmojiPicker
                                    onEmojiClick={onEmojiClick}
                                    width={300}
                                    height={400}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-2">
                    {editingMessage && (
                        <button
                            onClick={onCancelEdit}
                            className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-200 shadow-sm text-sm font-medium"
                        >
                            Annuller
                        </button>
                    )}
                    <button
                        onClick={handleSend}
                        className={`${editingMessage ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'} text-white px-3 py-1.5 rounded-md shadow-sm text-sm font-medium flex items-center gap-1`}
                    >
                        {editingMessage ? 'Gem' : 'Send'}
                    </button>
                </div>
            </div>

            <div className={`bg-white ${fullHeight ? 'flex-1 flex flex-col min-h-0' : ''}`}>
                <ReactQuill
                    theme="snow"
                    value={content}
                    onChange={setContent}
                    modules={modules}
                    className={`${fullHeight ? 'h-full flex flex-col [&>.ql-container]:flex-1' : 'min-h-[60px] flex flex-col [&>.ql-container]:flex-1'} [&>.ql-container]:overflow-y-auto mb-2`}
                />
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
                        aria-label="Link URL"
                    />
                    <input
                        type="text"
                        id="link-title-input"
                        name="linkTitle"
                        placeholder="Link Titel"
                        className="flex-1 text-xs border-gray-300 rounded"
                        value={linkTitle}
                        onChange={(e) => setLinkTitle(e.target.value)}
                        aria-label="Link Titel"
                    />
                </div>
            )}
        </div>
    );
};

export default MessageInput;
