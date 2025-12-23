import React, { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Sag, SagsDokument } from '../../../types';
import { api } from '../../../api';
import { Loader2, FileText, RefreshCw, AlertCircle, UploadCloud, CheckCircle, Upload } from 'lucide-react';

interface DokumenterTabProps {
    sag: Sag;
    onUpdate?: () => void;
}

const DokumentRow = ({ doc, onUpload }: { doc: SagsDokument; onUpload: (docId: number, file: File) => Promise<void> }) => {
    const [isUploading, setIsUploading] = useState(false);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setIsUploading(true);
            onUpload(doc.id, acceptedFiles[0]).finally(() => setIsUploading(false));
        }
    }, [doc.id, onUpload]);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        noClick: true,
        noKeyboard: true,
        multiple: false
    });

    return (
        <tr {...getRootProps()} className={`hover:bg-gray-50 group transition-colors relative ${isDragActive ? 'bg-blue-50 ring-2 ring-blue-400 z-10' : ''}`}>
            <td className="px-4 py-3 text-center">
                <input {...getInputProps()} />
                <input
                    type="checkbox"
                    checked={doc.aktiv}
                    readOnly
                    className="rounded text-blue-600 focus:ring-blue-500"
                />
            </td>
            <td className="px-4 py-3">
                <div className="font-medium text-gray-800">
                    {doc.titel || doc.filnavn || 'Uden navn'}
                </div>
                {doc.gruppe_navn && (
                    <div className="text-xs text-gray-500 mt-0.5">{doc.gruppe_navn}</div>
                )}
            </td>
            <td className="px-4 py-3 relative">
                {isUploading ? (
                    <span className="flex items-center gap-2 text-blue-600 text-xs py-1 px-2">
                        <Loader2 size={14} className="animate-spin" /> Uploader...
                    </span>
                ) : doc.fil ? (
                    <a
                        href={doc.fil}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded inline-block max-w-full group/link"
                        onClick={(e) => e.stopPropagation()} // Stop propagation så row click (hvis vi tilføjer det) ikke trigger
                    >
                        <FileText size={14} className="flex-shrink-0" />
                        <span className="truncate text-xs font-medium max-w-[200px]">{doc.filnavn || 'Hent fil'}</span>
                    </a>
                ) : (
                    <div
                        onClick={open}
                        className="flex items-center gap-2 text-gray-400 text-xs italic border border-dashed border-gray-300 rounded px-2 py-1 bg-gray-50 hover:bg-gray-100 hover:text-blue-500 hover:border-blue-300 cursor-pointer transition-colors"
                    >
                        {isDragActive ? <UploadCloud size={14} className="text-blue-500" /> : <Upload size={12} />}
                        <span>{isDragActive ? 'Slip fil her' : 'Træk fil eller klik'}</span>
                    </div>
                )}

                {/* Drag Overlay */}
                {isDragActive && (
                    <div className="absolute inset-0 bg-blue-100 bg-opacity-90 flex items-center justify-center text-blue-700 font-semibold border-2 border-blue-500 rounded z-20">
                        <UploadCloud className="mr-2" size={16} /> Uploader til "{doc.titel}"
                    </div>
                )}
            </td>
            <td className="px-4 py-3 text-gray-500 tabular-nums text-xs whitespace-nowrap">
                <div className="flex flex-col gap-0.5">
                    {doc.dato_intern && <div>Int: {doc.dato_intern}</div>}
                    {doc.dato_ekstern && <div>Eks: {doc.dato_ekstern}</div>}
                </div>
            </td>
            <td className="px-4 py-3 text-gray-600 text-xs">
                {doc.ansvarlig_navn || '-'}
            </td>
            <td className="px-4 py-3 text-right">
                {doc.fil && <CheckCircle size={14} className="text-green-500 inline-block" />}
            </td>
        </tr>
    );
};

export default function DokumenterTab({ sag, onUpdate }: DokumenterTabProps) {
    const [dokumenter, setDokumenter] = useState<SagsDokument[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const fetchDokumenter = useCallback(async () => {
        try {
            const data = await api.get<SagsDokument[]>(`/sager/sagsdokumenter/?sag_id=${sag.id}`);
            // TODO: Sortering burde ske i backend, men vi kan sikre det her
            setDokumenter(data);
        } catch (error) {
            console.error("Fejl ved hentning af dokumenter:", error);
        } finally {
            setLoading(false);
        }
    }, [sag.id]);

    useEffect(() => {
        setLoading(true);
        fetchDokumenter();
    }, [fetchDokumenter]);

    const handleSync = async () => {
        setSyncing(true);
        try {
            await api.post(`/sager/${sag.id}/synkroniser_dokumenter/`);
            fetchDokumenter();
            if (onUpdate) onUpdate(); // Opdater sagens status i forælder
        } catch (error) {
            console.error("Fejl ved synkronisering:", error);
        } finally {
            setSyncing(false);
        }
    };

    const handleUploadFile = async (docId: number, file: File) => {
        const formData = new FormData();
        formData.append('fil', file);
        // Vi kan sende filnavn explicit, men backend bruger filens navn hvis ikke andet er sat
        // formData.append('filnavn', file.name);

        try {
            await api.patch(`/sager/sagsdokumenter/${docId}/`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            // Genindlæs dokumenter for at vise den nye fil status
            await fetchDokumenter();
        } catch (e) {
            console.error("Upload fejl:", e);
            alert("Kunne ikke uploade filen. Tjek konsollen for detaljer.");
            throw e; // Kast videre så row component ved det fejlede
        }
    };

    if (loading && dokumenter.length === 0) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Dokumenter</h2>
                    <p className="text-sm text-gray-500">Håndter dokumenter og filer for sagen</p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded shadow-sm text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                    <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                    <span>Synkroniser</span>
                </button>
            </div>

            {/* Dokument Liste */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 w-10 text-center">Aktiv</th>
                            <th className="px-4 py-3">Dokument / Gruppe</th>
                            <th className="px-4 py-3">Fil</th>
                            <th className="px-4 py-3">Datoer</th>
                            <th className="px-4 py-3">Ansvarlig</th>
                            <th className="px-4 py-3 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {dokumenter.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center">
                                        <FileText size={32} className="text-gray-300 mb-2" />
                                        <p>Ingen dokumenter fundet.</p>
                                        <p className="text-xs">Klik på "Synkroniser" for at hente skabeloner.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            dokumenter.map(doc => (
                                <DokumentRow
                                    key={doc.id}
                                    doc={doc}
                                    onUpload={handleUploadFile}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
