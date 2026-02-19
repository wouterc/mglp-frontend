import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../Modal';
import { Opgave, OpgavePriority, OpgaveStatus, User } from '../../types';
import { opgaveService } from '../../services/opgaveService';
import { useAppState } from '../../StateContext';
import { X, Save, MessageSquare, Trash2, MessageCircleHeart, Edit, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import 'react-quill-new/dist/quill.snow.css';

import { STATUS_LABELS, PRIORITY_LABELS } from '../../constants';

interface TaskDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    opgave?: Opgave; // If undefined, we are creating
    onSaved: () => void;
    users: User[]; // Pass users for assignee picker
}

const CustomToolbar = ({ id }: { id: string }) => (
    <div id={id} className="flex items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1 rounded-t-lg">
        <select className="ql-header" defaultValue="">
            <option value="1">Overskrift 1</option>
            <option value="2">Overskrift 2</option>
            <option value="">Normal</option>
        </select>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button className="ql-bold"></button>
        <button className="ql-italic"></button>
        <button className="ql-underline"></button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button className="ql-list" value="ordered"></button>
        <button className="ql-list" value="bullet"></button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button className="ql-link"></button>
        <button className="ql-image"></button>
        <button className="ql-clean"></button>
    </div>
);

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ isOpen, onClose, opgave, onSaved, users }) => {
    const navigate = useNavigate();
    const { state } = useAppState();
    const { currentUser } = state;

    // Form States
    const [titel, setTitel] = useState('');
    const [beskrivelse, setBeskrivelse] = useState('');
    const [status, setStatus] = useState<OpgaveStatus>(OpgaveStatus.BACKLOG);
    const [prioritet, setPrioritet] = useState<OpgavePriority>(OpgavePriority.MEDIUM);
    const [ansvarlige, setAnsvarlige] = useState<number[]>([]);
    const [deadline, setDeadline] = useState('');

    // Comment States
    const [newComment, setNewComment] = useState('');
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editingCommentText, setEditingCommentText] = useState('');

    // Editor Focus State
    const [activeEditor, setActiveEditor] = useState<'desc' | 'new-comment' | 'edit-comment'>('desc');

    useEffect(() => {
        if (isOpen) {
            if (opgave) {
                setTitel(opgave.titel);
                setBeskrivelse(opgave.beskrivelse);
                setStatus(opgave.status);
                setPrioritet(opgave.prioritet);
                setAnsvarlige(opgave.ansvarlige || []);
                setDeadline(opgave.deadline || '');
            } else {
                setTitel('');
                setBeskrivelse('');
                setStatus(OpgaveStatus.BACKLOG);
                setPrioritet(OpgavePriority.MEDIUM);
                setAnsvarlige([]);
                setDeadline('');
            }
            setNewComment('');
            setEditingCommentId(null);
            setEditingCommentText('');
            setActiveEditor('desc');
        }
    }, [isOpen, opgave]);

    const handleSave = async () => {
        const data = {
            titel,
            beskrivelse,
            status,
            prioritet,
            ansvarlige,
            deadline: deadline || null,
        };

        try {
            if (opgave) {
                await opgaveService.update(opgave.id, data);
            } else {
                await opgaveService.create(data);
            }
            onSaved();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Fejl ved gemning af opgave');
        }
    };

    const handleAddComment = async () => {
        if (!opgave || !newComment.trim()) return;
        try {
            await opgaveService.addComment(opgave.id, newComment);
            setNewComment('');
            onSaved();
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdateComment = async () => {
        if (!editingCommentId || !editingCommentText.trim()) return;
        try {
            await opgaveService.updateComment(editingCommentId, editingCommentText);
            setEditingCommentId(null);
            setEditingCommentText('');
            onSaved();
        } catch (error) {
            console.error(error);
            alert('Kunne ikke opdatere kommentar');
        }
    };

    const handleSendToChat = () => {
        if (!opgave) return;
        const url = `${window.location.origin}/opgaver?id=${opgave.id}`;
        const content = `Tjek venligst denne opgave: <a href="${url}">${opgave.titel}</a>`;
        navigate('/kommunikation', { state: { initialMessage: content } });
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={opgave ? 'Rediger Opgave' : 'Ny Opgave'}
            maxWidth="max-w-[95vw]"
            noContentPadding
        >
            <div className="flex flex-col lg:flex-row gap-4 h-[85vh] p-4">
                {/* Left: Main Content */}
                <div className="flex-1 flex flex-col gap-0 overflow-hidden bg-white rounded-lg">

                    {/* Sticky Toolbar Stack */}
                    <div className="shrink-0 z-20 pt-1">
                        <div className={activeEditor === 'desc' ? 'block' : 'hidden'}>
                            <CustomToolbar id="toolbar-desc" />
                        </div>
                        <div className={activeEditor === 'new-comment' ? 'block' : 'hidden'}>
                            <CustomToolbar id="toolbar-new-comment" />
                        </div>
                        <div className={activeEditor === 'edit-comment' ? 'block' : 'hidden'}>
                            <CustomToolbar id="toolbar-edit-comment" />
                        </div>
                    </div>

                    {/* Scrollable Content: Title, Description, Comment List */}
                    <div className="flex-1 flex flex-col gap-2 overflow-y-auto px-1 pb-2 custom-scrollbar pt-2">
                        <div>
                            <input
                                type="text"
                                value={titel}
                                onChange={(e) => setTitel(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-lg"
                                placeholder="Hvad skal laves?"
                            />
                        </div>

                        {/* Description - Auto height */}
                        <div className="flex flex-col">
                            <div className="bg-white border rounded-b-lg overflow-hidden min-h-[100px]">
                                <ReactQuill
                                    theme="snow"
                                    value={beskrivelse}
                                    onChange={setBeskrivelse}
                                    modules={{ toolbar: { container: '#toolbar-desc' } }}
                                    onFocus={() => setActiveEditor('desc')}
                                    className="custom-quill-editor"
                                    placeholder="Beskrivelse..."
                                />
                            </div>
                        </div>

                        {/* Comment List Only */}
                        {opgave && (
                            <div className="mt-2 border-t pt-2">
                                <h3 className="font-bold text-gray-500 text-xs mb-2 uppercase flex items-center gap-2 px-1">
                                    <MessageSquare size={12} /> Kommentarer
                                </h3>
                                <div className="space-y-3 mb-2">
                                    {opgave.kommentarer?.map((k) => (
                                        <div key={k.id} className="bg-gray-50 p-3 rounded-lg text-sm border border-gray-100 group/comment">
                                            {editingCommentId === k.id ? (
                                                <div className="flex flex-col gap-2">
                                                    <div className="text-xs font-bold text-gray-500">Redigerer kommentar...</div>
                                                    <div className="bg-white border rounded-lg overflow-hidden">
                                                        <ReactQuill
                                                            theme="snow"
                                                            value={editingCommentText}
                                                            onChange={setEditingCommentText}
                                                            modules={{ toolbar: { container: '#toolbar-edit-comment' } }}
                                                            onFocus={() => setActiveEditor('edit-comment')}
                                                        />
                                                    </div>
                                                    <div className="flex gap-2 justify-end">
                                                        <button
                                                            onClick={() => setEditingCommentId(null)}
                                                            className="px-3 py-1.5 text-gray-600 hover:text-gray-800 text-xs font-medium"
                                                        >
                                                            Annuller
                                                        </button>
                                                        <button
                                                            onClick={handleUpdateComment}
                                                            className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                                                        >
                                                            Gem ændringer
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                        <span className="font-bold">{k.bruger_details?.first_name || 'Ukendt'}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span>{new Date(k.oprettet).toLocaleString()}</span>
                                                            {currentUser?.id === k.bruger && (
                                                                <div className="flex gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingCommentId(k.id);
                                                                            setEditingCommentText(k.tekst);
                                                                            setActiveEditor('edit-comment');
                                                                        }}
                                                                        className="text-blue-600 hover:text-blue-800"
                                                                        title="Rediger"
                                                                    >
                                                                        <Edit size={12} />
                                                                    </button>
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (confirm('Slet kommentar?')) {
                                                                                await opgaveService.deleteComment(k.id);
                                                                                onSaved();
                                                                            }
                                                                        }}
                                                                        className="text-red-400 hover:text-red-600"
                                                                        title="Slet"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div
                                                        className="text-gray-800 prose prose-sm max-w-none [&>p]:mb-1 [&>img]:max-w-full [&>img]:rounded-lg"
                                                        dangerouslySetInnerHTML={{ __html: k.tekst }}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer: New Comment Input (Always Visible) */}
                    {opgave && (
                        <div className="shrink-0 pt-3 pb-1 border-t mt-auto bg-white z-10">
                            <div className="flex flex-col gap-2">
                                <div className="bg-white border rounded-b-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 shadow-sm">
                                    <ReactQuill
                                        theme="snow"
                                        value={newComment}
                                        onChange={setNewComment}
                                        placeholder="Skriv en kommentar..."
                                        modules={{ toolbar: { container: '#toolbar-new-comment' } }}
                                        onFocus={() => setActiveEditor('new-comment')}
                                        className="bg-white"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleAddComment}
                                        disabled={!newComment.trim() || newComment === '<p><br></p>'}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors shadow-sm"
                                    >
                                        Send Kommentar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Sidebar Metadata */}
                <div className="w-full lg:w-64 bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col gap-3 h-full overflow-y-auto shrink-0">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as OpgaveStatus)}
                            className="w-full px-2 py-1.5 bg-white border rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                        >
                            {Object.values(OpgaveStatus).map((s) => (
                                <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Prioritet</label>
                        <select
                            value={prioritet}
                            onChange={(e) => setPrioritet(e.target.value as OpgavePriority)}
                            className="w-full px-2 py-1.5 bg-white border rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                        >
                            {Object.values(OpgavePriority).map((p) => (
                                <option key={p} value={p}>{PRIORITY_LABELS[p] || p}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Ansvarlige</label>
                        <div className="flex flex-col gap-1.5">
                            {/* Selected Users */}
                            <div className="flex flex-wrap gap-1">
                                {ansvarlige.map(id => {
                                    const user = users.find(u => u.id === id);
                                    if (!user) return null;
                                    return (
                                        <div key={id} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[11px] font-bold border border-blue-100">
                                            <span>{user.first_name} {user.last_name}</span>
                                            <button
                                                onClick={() => setAnsvarlige(prev => prev.filter(p => p !== id))}
                                                className="hover:text-blue-900 rounded-full hover:bg-blue-200 p-0.5"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Add User Dropdown */}
                            <select
                                value=""
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (val && !ansvarlige.includes(val)) {
                                        setAnsvarlige(prev => [...prev, val]);
                                    }
                                }}
                                className="w-full px-2 py-1.5 bg-white border rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">+ Tilføj ansvarlig</option>
                                {users
                                    .filter(u => !ansvarlige.includes(u.id))
                                    .filter(u => (u.opgave_sortering || 0) > 0)
                                    .sort((a, b) => (a.opgave_sortering || 0) - (b.opgave_sortering || 0))
                                    .map((u) => (
                                        <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                                    ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Deadline</label>
                        <input
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    {/* Show creator if exists */}
                    {opgave?.oprettet_af_details && (
                        <div className="text-[10px] text-gray-400 text-center mt-1">
                            Oprettet af {opgave.oprettet_af_details.first_name || opgave.oprettet_af_details.username} • {new Date(opgave.oprettet).toLocaleDateString()}
                        </div>
                    )}

                    <div className="mt-auto pt-3 border-t flex flex-col gap-1.5">
                        <button
                            onClick={handleSave}
                            className="w-full py-1.5 bg-blue-600 text-white rounded-lg font-bold shadow-sm hover:bg-blue-700 flex justify-center items-center gap-2 text-xs"
                        >
                            <Save size={14} /> Gem Opgave
                        </button>

                        {opgave && (
                            <button
                                onClick={handleSendToChat}
                                className="w-full py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg font-bold hover:bg-blue-100 flex justify-center items-center gap-2 text-xs"
                            >
                                <MessageCircleHeart size={14} /> Send til Chat
                            </button>
                        )}

                        {opgave && (
                            <div className="flex gap-1.5">
                                <button
                                    onClick={async () => {
                                        if (confirm('Arkiver denne opgave?')) {
                                            await opgaveService.archive(opgave.id);
                                            onSaved();
                                            onClose();
                                        }
                                    }}
                                    className="flex-1 py-1.5 bg-white text-orange-600 border border-orange-100 rounded-lg font-bold hover:bg-orange-50 flex justify-center items-center gap-1 text-xs"
                                >
                                    <Archive size={14} /> Arkiver
                                </button>
                                <button
                                    onClick={async () => {
                                        if (confirm('Er du sikker på at du vil slette denne opgave?')) {
                                            await opgaveService.delete(opgave.id);
                                            onSaved();
                                            onClose();
                                        }
                                    }}
                                    className="flex-1 py-1.5 bg-white text-red-600 border border-red-100 rounded-lg font-bold hover:bg-red-50 flex justify-center items-center gap-1 text-xs"
                                >
                                    <Trash2 size={14} /> Slet
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default TaskDetailModal;
