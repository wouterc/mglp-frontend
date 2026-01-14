import React, { useState, useEffect, useCallback } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useDropzone } from 'react-dropzone';
import { Viden, VidensKategori, HjaelpPunkt } from '../../types';
import { api } from '../../api';
import Modal from '../Modal';
import { X, Upload, Link as LinkIcon, FileText, Loader2, Save, Star, Archive } from 'lucide-react';
import { Quill } from 'react-quill-new';

// @# 2024-03-20 - Tving Quill til at acceptere 'style' og 'width' på tabel-celler
const Style = Quill.import('attributors/style/width') as any;
if (Style) {
    Quill.register(Style, true);
}

const TableCell = Quill.import('formats/table-cell') as any;
if (TableCell) {
    // Tillad 'width' som en gyldig attribut i Quills interne model
    const oldFormats = TableCell.formats;
    TableCell.formats = function (domNode: HTMLElement) {
        const formats = oldFormats(domNode) || {};
        if (domNode.hasAttribute('width')) {
            formats.width = domNode.getAttribute('width');
        } else if (domNode.style.width) {
            formats.width = domNode.style.width;
        }
        return formats;
    };
    Quill.register(TableCell, true);
}

interface VidensbankModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    editingViden?: Viden;
    kategorier: VidensKategori[];
}

const VidensbankModal: React.FC<VidensbankModalProps> = ({ isOpen, onClose, onSave, editingViden, kategorier }) => {
    const [titel, setTitel] = useState('');
    const [kategori, setKategori] = useState<number | ''>('');
    const [indhold, setIndhold] = useState('');
    const [link, setLink] = useState('');
    const [fil, setFil] = useState<File | null>(null);
    const [eksisterendeFil, setEksisterendeFil] = useState<string | null>(null);
    const [hjaelpPunkter, setHjaelpPunkter] = useState<HjaelpPunkt[]>([]);
    const [selectedHjaelpPunktIds, setSelectedHjaelpPunktIds] = useState<number[]>([]);
    const [arkiveret, setArkiveret] = useState(false);
    const [favorit, setFavorit] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const fetchHjaelpPunkter = useCallback(async () => {
        try {
            const res = await api.get<any>('/vidensbank/punkter/');
            const list = Array.isArray(res.results) ? res.results : res;
            setHjaelpPunkter(list);
        } catch (error) {
            console.error("Fejl ved hentning af hjælpepunkter", error);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchHjaelpPunkter();
        }
    }, [isOpen, fetchHjaelpPunkter]);

    useEffect(() => {
        if (isOpen) {
            if (editingViden) {
                setTitel(editingViden.titel);
                setKategori(editingViden.kategori);
                setIndhold(editingViden.indhold || '');
                setLink(editingViden.link || '');
                setEksisterendeFil(editingViden.fil);
                setSelectedHjaelpPunktIds(editingViden.hjaelp_punkt_ids || []);
                setArkiveret(editingViden.arkiveret);
                setFavorit(editingViden.favorit);
                setFil(null);
            } else {
                setTitel('');
                setKategori('');
                setIndhold('');
                setLink('');
                setSelectedHjaelpPunktIds([]);
                setFil(null);
                setEksisterendeFil(null);
                setArkiveret(false);
                setFavorit(false);
            }
        }
    }, [editingViden, isOpen]);

    const handleSave = async () => {
        // @# 2024-03-20 - Vigtigt: Træk indholdet direkte fra Quill-editoren ved gemning.
        const editor = quillRef.current?.getEditor();
        if (!editor) return;

        // "Fastfrys" kolonnebredder: Gennemgå alle TD'er og konverter deres 'style.width' (fra resize) 
        // til en permanent 'width' attribut, som Quill og databasen ikke smider væk.
        const tdElements = editor.root.querySelectorAll('td');
        tdElements.forEach((td: HTMLElement) => {
            if (td.style.width) {
                td.setAttribute('width', td.style.width);
            }
        });

        const currentContent = editor.root.innerHTML;

        if (!titel || !kategori || !currentContent) {
            alert("Udfyld venligst titel, kategori og indhold.");
            return;
        }

        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('titel', titel);
            formData.append('kategori', kategori.toString());
            formData.append('indhold', currentContent);
            formData.append('link', link);
            if (fil) {
                formData.append('fil', fil);
            }
            formData.append('arkiveret', arkiveret.toString());
            formData.append('favorit', favorit.toString());

            // Handle help point IDs - DRF PrimaryKeyRelatedField expects list of IDs
            selectedHjaelpPunktIds.forEach(id => {
                formData.append('hjaelp_punkt_ids', id.toString());
            });

            if (editingViden) {
                await api.patch(`/vidensbank/artikler/${editingViden.id}/`, formData);
            } else {
                await api.post('/vidensbank/artikler/', formData);
            }
            onSave();
        } catch (error) {
            console.error("Fejl ved gemning af viden", error);
            alert("Der opstod en fejl ved gemning.");
        } finally {
            setIsSaving(false);
        }
    };

    const headerActions = (
        <div className="flex gap-2 mr-2">
            <button
                onClick={onClose}
                className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium text-sm transition-colors"
                disabled={isSaving}
            >
                Annuller
            </button>
            <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 shadow-md font-bold flex items-center gap-2 disabled:bg-blue-400 text-sm transition-all"
            >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Gem artikel
            </button>
        </div>
    );

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFil(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false
    });

    const quillModules = {
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'indent': '-1' }, { 'indent': '+1' }],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                ['link', 'image', 'table'], // @# Added 'table'
                ['clean']
            ],
        },
        table: true // @# Enable table module
    };

    const quillRef = React.useRef<any>(null);

    const handleTableAction = (action: string) => {
        const quill = quillRef.current?.getEditor();
        const table = quill?.getModule('table');
        if (!table) return;

        switch (action) {
            case 'insert-row-above': table.insertRowAbove(); break;
            case 'insert-row-below': table.insertRowBelow(); break;
            case 'insert-column-left': table.insertColumnLeft(); break;
            case 'insert-column-right': table.insertColumnRight(); break;
            case 'delete-row': table.deleteRow(); break;
            case 'delete-column': table.deleteColumn(); break;
            case 'delete-table': table.deleteTable(); break;
            default: break;
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingViden ? 'Rediger viden' : 'Tilføj ny viden'}
            wide
            headerActions={headerActions}
        >
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1 text-left">
                        <label htmlFor="modal-titel" className="text-xs font-bold text-gray-500 uppercase">Titel</label>
                        <input
                            id="modal-titel"
                            type="text"
                            value={titel}
                            onChange={(e) => setTitel(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                            placeholder="Indtast en sigende titel..."
                        />
                    </div>
                    <div className="flex flex-col gap-1 text-left">
                        <label htmlFor="modal-kategori" className="text-xs font-bold text-gray-500 uppercase">Kategori</label>
                        <select
                            id="modal-kategori"
                            value={kategori}
                            onChange={(e) => setKategori(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white text-sm"
                        >
                            <option value="">Vælg kategori...</option>
                            {kategorier.map(kat => (
                                <option key={kat.id} value={kat.id}>{kat.navn}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex gap-6 items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={favorit}
                            onChange={(e) => setFavorit(e.target.checked)}
                            className="w-4 h-4 text-amber-500 rounded border-gray-300 focus:ring-amber-500"
                        />
                        <div className="flex items-center gap-1.5">
                            <Star size={16} className={favorit ? "text-amber-500 fill-amber-500" : "text-gray-400"} />
                            <span className="text-sm font-bold text-gray-700 group-hover:text-amber-600 transition-colors">Vigtig / Favorit</span>
                        </div>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={arkiveret}
                            onChange={(e) => setArkiveret(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-1.5">
                            <Archive size={16} className={arkiveret ? "text-blue-600" : "text-gray-400"} />
                            <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600 transition-colors">Arkiveret</span>
                        </div>
                    </label>
                </div>

                <div className="flex flex-col gap-1 text-left">
                    <div className="flex justify-between items-end mb-1 sticky top-[-24px] bg-white z-20 py-1 border-b border-gray-100">
                        <label className="text-xs font-bold text-gray-500 uppercase">Indhold</label>
                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-md border border-gray-200 shadow-sm">
                            <span className="text-[10px] font-bold text-gray-400 px-2 uppercase">Tabel værktøj:</span>
                            <button
                                onClick={() => handleTableAction('insert-row-below')}
                                className="px-2 py-1 text-[10px] bg-white border border-gray-300 rounded hover:bg-blue-50 hover:text-blue-600 transition-colors font-bold"
                                title="Indsæt række under"
                            >
                                + Række
                            </button>
                            <button
                                onClick={() => handleTableAction('insert-column-right')}
                                className="px-2 py-1 text-[10px] bg-white border border-gray-300 rounded hover:bg-blue-50 hover:text-blue-600 transition-colors font-bold"
                                title="Indsæt kolonne til højre"
                            >
                                + Kolonne
                            </button>
                            <div className="w-px h-4 bg-gray-300 mx-1"></div>
                            <button
                                onClick={() => handleTableAction('delete-row')}
                                className="px-2 py-1 text-[10px] bg-white border border-gray-300 rounded hover:bg-red-50 hover:text-red-600 transition-colors font-bold"
                                title="Slet række"
                            >
                                - Række
                            </button>
                            <button
                                onClick={() => handleTableAction('delete-column')}
                                className="px-2 py-1 text-[10px] bg-white border border-gray-300 rounded hover:bg-red-50 hover:text-red-600 transition-colors font-bold"
                                title="Slet kolonne"
                            >
                                - Kolonne
                            </button>
                            <button
                                onClick={() => handleTableAction('delete-table')}
                                className="px-2 py-1 text-[10px] bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-bold ml-2"
                                title="SLET HELE TABELLEN"
                            >
                                Slet tabel
                            </button>
                        </div>
                    </div>
                    <div className="border border-gray-300 rounded-lg flex flex-col min-h-[400px]">
                        <ReactQuill
                            ref={quillRef}
                            theme="snow"
                            value={indhold}
                            onChange={(content) => setIndhold(content)}
                            modules={quillModules}
                            className="flex-1 flex flex-col vidensbank-editor-rich-text [&>.ql-container]:flex-1 [&>.ql-container]:overflow-visible [&>.ql-editor]:min-h-[350px]"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1 text-left">
                        <label htmlFor="modal-link" className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                            <LinkIcon size={12} />
                            Eksternt Link
                        </label>
                        <input
                            id="modal-link"
                            type="text"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                            placeholder="https://..."
                        />
                    </div>

                    <div className="flex flex-col gap-1 text-left">
                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                            <Upload size={12} />
                            Vedhæft dokument
                        </label>
                        <div
                            {...getRootProps()}
                            className={`flex-1 border-2 border-dashed rounded-lg p-2 transition-colors flex items-center justify-center cursor-pointer min-h-[42px] ${isDragActive ? 'bg-blue-50 border-blue-400' : 'bg-gray-50 border-gray-200 hover:border-blue-300'}`}
                        >
                            <input {...getInputProps()} />
                            {fil ? (
                                <div className="flex items-center gap-2 text-xs text-blue-600">
                                    <FileText size={14} />
                                    <span className="truncate max-w-[150px] font-medium">{fil.name}</span>
                                    <button onClick={(e) => { e.stopPropagation(); setFil(null); }} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                        <X size={12} />
                                    </button>
                                </div>
                            ) : eksisterendeFil ? (
                                <div className="flex items-center gap-2 text-xs text-green-600">
                                    <FileText size={14} />
                                    <span className="truncate max-w-[150px] font-medium">Fil er uploadet</span>
                                    <span className="text-[9px] bg-green-50 px-1 py-0.5 rounded text-green-700">Klik/drag for ny</span>
                                </div>
                            ) : (
                                <div className="text-[10px] text-gray-400 text-center">
                                    {isDragActive ? 'Slip her' : 'Klik eller træk fil hertil'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2 text-left bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <label className="text-xs font-black text-gray-700 uppercase flex items-center gap-2">
                        <Save size={14} className="text-blue-600" />
                        Tilknyt Hjælpepunkter
                        <span className="text-[10px] font-normal lowercase text-gray-500">(Hvor skal denne artikel vises?)</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                        {hjaelpPunkter.map(punkt => (
                            <label key={punkt.id} className="flex items-center gap-3 p-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-all cursor-pointer group shadow-sm">
                                <input
                                    type="checkbox"
                                    checked={selectedHjaelpPunktIds.includes(punkt.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedHjaelpPunktIds([...selectedHjaelpPunktIds, punkt.id]);
                                        } else {
                                            setSelectedHjaelpPunktIds(selectedHjaelpPunktIds.filter(id => id !== punkt.id));
                                        }
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-700 group-hover:text-blue-700 transition-colors">{punkt.alias}</span>
                                    <code className="text-[10px] text-gray-400">{punkt.kode_navn}</code>
                                </div>
                            </label>
                        ))}
                        {hjaelpPunkter.length === 0 && (
                            <div className="col-span-full py-4 text-center text-gray-400 text-sm italic">
                                Ingen hjælpepunkter defineret endnu.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default VidensbankModal;
