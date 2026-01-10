import React, { useState, useEffect, useCallback } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useDropzone } from 'react-dropzone';
import { Viden, VidensKategori } from '../../types';
import { api } from '../../api';
import Modal from '../Modal';
import { X, Upload, Link as LinkIcon, FileText, Loader2, Save } from 'lucide-react';

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
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (editingViden) {
                setTitel(editingViden.titel);
                setKategori(editingViden.kategori);
                setIndhold(editingViden.indhold || '');
                setLink(editingViden.link || '');
                setEksisterendeFil(editingViden.fil);
                setFil(null);
            } else {
                setTitel('');
                setKategori('');
                setIndhold('');
                setLink('');
                setFil(null);
                setEksisterendeFil(null);
            }
        }
    }, [editingViden, isOpen]);

    const handleSave = async () => {
        if (!titel || !kategori || !indhold) {
            alert("Udfyld venligst titel, kategori og indhold.");
            return;
        }

        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('titel', titel);
            formData.append('kategori', kategori.toString());
            formData.append('indhold', indhold);
            formData.append('link', link);
            if (fil) {
                formData.append('fil', fil);
            }

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
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean']
        ],
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

                <div className="flex flex-col gap-1 text-left">
                    <label className="text-xs font-bold text-gray-500 uppercase">Indhold</label>
                    <div className="border border-gray-300 rounded-lg overflow-hidden flex flex-col min-h-[400px]">
                        <ReactQuill
                            theme="snow"
                            value={indhold}
                            onChange={(content) => setIndhold(content)}
                            modules={quillModules}
                            className="flex-1 flex flex-col [&>.ql-container]:flex-1 [&>.ql-container]:overflow-visible [&>.ql-editor]:min-h-[350px]"
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
            </div>
        </Modal>
    );
};

export default VidensbankModal;
