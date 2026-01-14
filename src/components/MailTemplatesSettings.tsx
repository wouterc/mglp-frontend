
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { MailSkabelon, InformationsKilde } from '../types';
import { Plus, Trash2, Save, Info, Search, Copy, FileText, Code, Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import ConfirmModal from './ui/ConfirmModal';

// Rich Text Editor
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

export default function MailTemplatesSettings() {
    const [templates, setTemplates] = useState<MailSkabelon[]>([]);
    const [loading, setLoading] = useState(true);
    const [sources, setSources] = useState<InformationsKilde[]>([]);

    // Modals
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: number | null }>({ isOpen: false, id: null });
    const [confirmLeave, setConfirmLeave] = useState<{ isOpen: boolean, action: (() => void) | null }>({ isOpen: false, action: null });

    // Selection & Form State
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | 'new' | null>(null);
    const [formData, setFormData] = useState<Partial<MailSkabelon>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [isDirty, setIsDirty] = useState(false);

    // Editor State
    const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');
    const [htmlError, setHtmlError] = useState<string | null>(null);
    const [htmlSuccess, setHtmlSuccess] = useState<boolean>(false);

    useEffect(() => {
        fetchTemplates();
        fetchSources();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const data = await api.get<MailSkabelon[]>('/skabeloner/mail/');
            setTemplates(data);
        } catch (error) {
            console.error("Failed to fetch templates", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSources = async () => {
        try {
            const data = await api.get<InformationsKilde[]>('/kerne/informationskilder/');
            setSources(data);
        } catch (error) {
            console.error("Failed to fetch sources", error);
        }
    };

    const checkDirtyAndExecute = (action: () => void) => {
        if (isDirty) {
            setConfirmLeave({ isOpen: true, action });
        } else {
            action();
        }
    };

    const handleSelect = (id: number) => {
        checkDirtyAndExecute(() => {
            const template = templates.find(t => t.id === id);
            if (template) {
                setSelectedTemplateId(id);
                setFormData({ ...template, informations_kilde_id: template.informations_kilde?.id });
                setIsDirty(false);
                setHtmlError(null);
                setHtmlSuccess(false);
            }
        });
    };

    const handleCreateNew = () => {
        checkDirtyAndExecute(() => {
            setSelectedTemplateId('new');
            setFormData({
                navn: 'Ny skabelon',
                indhold: '',
                emne: '',
                formaal: ''
            });
            setIsDirty(false);
            setHtmlError(null);
            setHtmlSuccess(false);
        });
    };

    const handleCopy = (e: React.MouseEvent, template: MailSkabelon) => {
        e.stopPropagation();
        checkDirtyAndExecute(() => {
            setSelectedTemplateId('new');
            setFormData({
                ...template,
                id: undefined,
                navn: `${template.navn} (Kopi)`,
                informations_kilde_id: template.informations_kilde?.id
            });
            setIsDirty(true);
        });
    };

    const handleDeleteRequest = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        setConfirmDelete({ isOpen: true, id });
    };

    const handleDeleteConfirm = async () => {
        if (!confirmDelete.id) return;
        try {
            await api.delete(`/skabeloner/mail/${confirmDelete.id}/`);
            setTemplates(prev => prev.filter(t => t.id !== confirmDelete.id));

            if (selectedTemplateId === confirmDelete.id) {
                setSelectedTemplateId(null);
                setFormData({});
                setIsDirty(false);
            }
            setConfirmDelete({ isOpen: false, id: null });
        } catch (error) {
            console.error("Failed to delete template", error);
            alert("Kunne ikke slette skabelonen.");
        }
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        try {
            if (selectedTemplateId === 'new') {
                const res = await api.post<MailSkabelon>('/skabeloner/mail/', formData);
                setTemplates(prev => [...prev, res]);
                setSelectedTemplateId(res.id);
                setFormData({ ...res, informations_kilde_id: res.informations_kilde?.id });
            } else if (typeof selectedTemplateId === 'number') {
                const res = await api.patch<MailSkabelon>(`/skabeloner/mail/${selectedTemplateId}/`, formData);
                setTemplates(prev => prev.map(t => t.id === res.id ? res : t));
                setFormData({ ...res, informations_kilde_id: res.informations_kilde?.id });
            }
            setIsDirty(false);
        } catch (error) {
            console.error("Failed to save template", error);
            alert("Kunne ikke gemme skabelon.");
        }
    };

    const filteredTemplates = useMemo(() => {
        if (!searchQuery) return templates;
        const lower = searchQuery.toLowerCase();
        return templates.filter(t =>
            t.navn.toLowerCase().includes(lower) ||
            t.formaal?.toLowerCase().includes(lower) ||
            t.informations_kilde?.navn.toLowerCase().includes(lower)
        );
    }, [templates, searchQuery]);

    const handleChange = (field: keyof MailSkabelon, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
        setHtmlError(null);
        setHtmlSuccess(false);
    };

    const validateHTML = () => {
        const html = formData.indhold || '';
        setHtmlSuccess(false);
        setHtmlError(null);

        if (!html) {
            setHtmlError("Indholdet er tomt.");
            return;
        }

        // 1. Simple count check
        const openTags = (html.match(/<[a-zA-Z1-6]+/g) || []).map(t => t.toLowerCase());
        const closeTags = (html.match(/<\/[a-zA-Z1-6]+/g) || []).map(t => t.toLowerCase());

        if (openTags.length !== closeTags.length) {
            setHtmlError(`Ubalance i tags: Der er ${openTags.length} åbne tags og ${closeTags.length} lukkede tags.`);
            return;
        }

        // 2. Browser parsing test
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<!DOCTYPE html><html><body>${html}</body></html>`, 'text/html');
        // HTML parser is very forgiving, but we can check for specific parsererror in XML mode if we wanted strictly.
        // For HTML, we check if there are any <parsererror> elements (though browser might not inject them in text/html)

        // Let's do a stack-based check for common mistakes in source code
        const stack: string[] = [];
        const tagRegex = /<\/?([a-zA-Z1-6]+)[^>]*>/g;
        let match;
        const selfClosing = ['img', 'br', 'hr', 'input', 'link', 'meta'];

        while ((match = tagRegex.exec(html)) !== null) {
            const fullTag = match[0];
            const tagName = match[1].toLowerCase();
            const isClosing = fullTag.startsWith('</');

            if (selfClosing.includes(tagName) && !isClosing) continue;

            if (isClosing) {
                if (stack.length === 0 || stack[stack.length - 1] !== tagName) {
                    setHtmlError(`Fejl ved lukning af tag: Fandt </${tagName}> men forventede ${stack.length > 0 ? '</' + stack[stack.length - 1] + '>' : 'ingen lukning'}.`);
                    return;
                }
                stack.pop();
            } else {
                stack.push(tagName);
            }
        }

        if (stack.length > 0) {
            setHtmlError(`Manglende lukkede tags: ${stack.map(s => `</${s}>`).join(', ')}.`);
            return;
        }

        setHtmlSuccess(true);
        setTimeout(() => setHtmlSuccess(false), 3000);
    };

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'indent': '-1' }, { 'indent': '+1' }],
            ['link', 'clean'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'align': [] }]
        ],
    };

    return (
        <div className="flex h-full bg-white border-t border-gray-200">
            {/* Left Column (30%) - List */}
            <div className="w-[30%] flex flex-col border-r border-gray-200 bg-gray-50/50">
                <div className="p-4 border-b border-gray-200 bg-white">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-gray-800">Mailskabeloner</h2>
                        <button
                            onClick={handleCreateNew}
                            className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                            title="Opret ny skabelon"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Søg..."
                            className="w-full pl-9 pr-4 py-2 text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-gray-500 text-sm">Indlæser...</div>
                    ) : filteredTemplates.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">Ingen skabeloner fundet.</div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filteredTemplates.map(t => (
                                <div
                                    key={t.id}
                                    onClick={() => handleSelect(t.id)}
                                    className={`group p-4 cursor-pointer hover:bg-gray-100 transition-colors relative ${selectedTemplateId === t.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className={`text-sm font-medium pr-6 ${selectedTemplateId === t.id ? 'text-blue-900' : 'text-gray-900'}`}>
                                            {t.navn}
                                        </h3>
                                        <div className="hidden group-hover:flex absolute right-2 top-3 bg-white shadow-sm rounded-md border border-gray-200 p-0.5">
                                            <button
                                                onClick={(e) => handleCopy(e, t)}
                                                className="p-1.5 text-gray-500 hover:text-blue-600 rounded-sm"
                                                title="Kopier"
                                            >
                                                <Copy size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteRequest(e, t.id)}
                                                className="p-1.5 text-gray-500 hover:text-red-600 rounded-sm"
                                                title="Slet"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        {t.formaal && <span className="text-gray-500">{t.formaal}</span>}
                                        {t.informations_kilde && (
                                            <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                                                {t.informations_kilde.navn}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column (70%) - Edit Form */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
                {selectedTemplateId ? (
                    <form onSubmit={handleSave} className="flex flex-col h-full">
                        {/* Form Header */}
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">
                                    {selectedTemplateId === 'new' ? 'Ny skabelon' : 'Rediger skabelon'}
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {selectedTemplateId === 'new' ? 'Udfyld felterne nedenfor' : `Sidst opdateret: ${new Date(formData.sidst_opdateret || Date.now()).toLocaleDateString()}`}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditorMode(editorMode === 'visual' ? 'code' : 'visual')}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                                >
                                    {editorMode === 'visual' ? <Code size={18} /> : <Eye size={18} />}
                                    {editorMode === 'visual' ? 'Vis kildekode' : 'Vis visuelt'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={!isDirty}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${isDirty ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                >
                                    <Save size={18} />
                                    Gem ændringer
                                </button>
                            </div>
                        </div>

                        {/* Form Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Navn</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        value={formData.navn || ''}
                                        onChange={e => handleChange('navn', e.target.value)}
                                        placeholder="Skabelonens navn"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Formål</label>
                                    <input
                                        type="text"
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        value={formData.formaal || ''}
                                        onChange={e => handleChange('formaal', e.target.value)}
                                        placeholder="F.eks. Salg"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Informationskilde</label>
                                    <select
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        value={formData.informations_kilde_id || ''}
                                        onChange={e => handleChange('informations_kilde_id', e.target.value ? Number(e.target.value) : null)}
                                    >
                                        <option value="">Ingen specifik kilde</option>
                                        {sources.map(s => (
                                            <option key={s.id} value={s.id}>{s.navn}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Emne</label>
                                    <input
                                        type="text"
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        value={formData.emne || ''}
                                        onChange={e => handleChange('emne', e.target.value)}
                                        placeholder="Mailens emnefelt"
                                    />
                                </div>
                            </div>

                            {/* Editor Container */}
                            <div className="flex-1 flex flex-col min-h-[400px]">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Indhold {editorMode === 'code' ? '(HTML)' : '(Visuel Editor)'}
                                    </label>
                                    <div className="flex items-center gap-3">
                                        {editorMode === 'code' && (
                                            <button
                                                type="button"
                                                onClick={validateHTML}
                                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                            >
                                                Tjek HTML tags
                                            </button>
                                        )}
                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                            <Info size={12} /> Understøtter pladsholdere
                                        </span>
                                    </div>
                                </div>

                                {editorMode === 'visual' ? (
                                    <div className="flex-1 flex flex-col bg-white">
                                        <ReactQuill
                                            theme="snow"
                                            value={formData.indhold || ''}
                                            onChange={(val) => handleChange('indhold', val)}
                                            modules={modules}
                                            className="flex-1 flex flex-col quill-editor"
                                            style={{ height: '350px' }}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col">
                                        <textarea
                                            className="flex-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm font-mono p-4 leading-relaxed bg-gray-50 min-h-[350px]"
                                            value={formData.indhold || ''}
                                            onChange={e => handleChange('indhold', e.target.value)}
                                            placeholder="<div>Skriv dit indhold her...</div>"
                                        />
                                        {htmlError && (
                                            <div className="mt-2 text-xs text-red-600 flex items-center gap-1 font-medium bg-red-50 p-2 rounded">
                                                <AlertCircle size={14} /> {htmlError}
                                            </div>
                                        )}
                                        {htmlSuccess && (
                                            <div className="mt-2 text-xs text-green-600 flex items-center gap-1 font-medium bg-green-50 p-2 rounded">
                                                <CheckCircle2 size={14} /> HTML ser korrekt ud!
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
                                    <p className="text-xs font-semibold text-blue-900 mb-2">Tilgængelige pladsholdere:</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-[11px] text-blue-800">
                                        <div><code className="bg-blue-100 px-1 rounded">{`{{dato}}`}</code> Dags dato</div>
                                        <div><code className="bg-blue-100 px-1 rounded">{`{{dato+7}}`}</code> Dato +7 dage</div>
                                        <div><code className="bg-blue-100 px-1 rounded">{`{{signatur}}`}</code> Signatur</div>
                                        <div><code className="bg-blue-100 px-1 rounded">{`{{opgaveliste}}`}</code> Opgaver</div>
                                        <div><code className="bg-blue-100 px-1 rounded">{`{{sagsnummer}}`}</code> Sagsnr</div>
                                        <div><code className="bg-blue-100 px-1 rounded">{`{{Mref}}`}</code> Mægler ref</div>
                                        <div><code className="bg-blue-100 px-1 rounded">{`{{propadress}}`}</code> Adresse</div>
                                        <div><code className="bg-blue-100 px-1 rounded">{`{{name}}`}</code> Navn</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/30">
                        <FileText size={64} className="mb-4 opacity-10" />
                        <p className="text-lg font-medium text-gray-500">Ingen skabelon valgt</p>
                        <p className="text-sm mt-2">Vælg en skabelon fra listen til venstre, eller opret en ny.</p>
                        <button
                            onClick={handleCreateNew}
                            className="mt-6 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Plus size={18} />
                            Opret ny skabelon
                        </button>
                    </div>
                )}
            </div>

            {/* Confirm Modals */}
            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, id: null })}
                onConfirm={handleDeleteConfirm}
                title="Slet skabelon"
                message="Er du sikker på, at du vil slette denne skabelon? Dette kan ikke fortrydes."
                confirmText="Slet"
                cancelText="Annuller"
            />

            <ConfirmModal
                isOpen={confirmLeave.isOpen}
                onClose={() => setConfirmLeave({ isOpen: false, action: null })}
                onConfirm={() => {
                    if (confirmLeave.action) confirmLeave.action();
                    setConfirmLeave({ isOpen: false, action: null });
                    setIsDirty(false);
                }}
                title="Ugemte ændringer"
                message="Du har ugemte ændringer. Vil du fortsætte uden at gemme?"
                confirmText="Forlad uden at gemme"
                cancelText="Annuller"
            />
        </div>
    );
}
