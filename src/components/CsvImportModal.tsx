// --- Fil: src/components/CsvImportModal.tsx ---
// @# 2025-11-22 22:00 - Implementeret 3-trins logik: ID -> CVR -> Navn.
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { UploadCloud, FileText, AlertCircle, CheckCircle, Loader2, X, ArrowRight } from 'lucide-react';
import Button from './ui/Button';
import Modal from './Modal';
import { API_BASE_URL } from '../config';

interface CsvImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete: () => void;
    title: string;
    type: 'virksomhed' | 'kontakt';
}

interface ImportLog {
    row: number;
    message: string;
    status: 'success' | 'error' | 'skip' | 'update';
}

export default function CsvImportModal({ isOpen, onClose, onImportComplete, title, type }: CsvImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [logs, setLogs] = useState<ImportLog[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const selectedFile = acceptedFiles[0];
        if (selectedFile) {
            setFile(selectedFile);
            Papa.parse(selectedFile, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    setParsedData(results.data);
                    setLogs([]);
                    setProgress(0);
                },
                error: (error) => {
                    setLogs([{ row: 0, message: "CSV Fejl: " + error.message, status: 'error' }]);
                }
            });
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
        onDrop, 
        accept: { 'text/csv': ['.csv'] },
        multiple: false 
    });

    const logMsg = (row: number, message: string, status: ImportLog['status']) => {
        setLogs(prev => [...prev, { row, message, status }]);
    };

    // --- OPSLAGSFUNKTIONER ---
    const findById = async (endpoint: string, id: number) => {
        // Vi antager ID er korrekt hvis det er i filen, men vi kunne validere her
        return id; 
    };

    const findByCvr = async (cvr: string): Promise<number | null> => {
        try {
            const res = await fetch(`${API_BASE_URL}/register/virksomheder/?cvr_nr=${cvr}`);
            const data = await res.json();
            const results = Array.isArray(data) ? data : data.results;
            return (results && results.length > 0) ? results[0].id : null;
        } catch (e) { return null; }
    };

    const findByName = async (navn: string): Promise<number | null> => {
        try {
            // Søger bredt (icontains) for at fange "Hansen" i "Hansen ApS"
            const res = await fetch(`${API_BASE_URL}/register/virksomheder/?navn=${encodeURIComponent(navn)}`);
            const data = await res.json();
            const results = Array.isArray(data) ? data : data.results;
            
            // Simpel logik: Returner den første. 
            // Her kunne man lave bedre fuzzy match logik hvis nødvendigt.
            return (results && results.length > 0) ? results[0].id : null;
        } catch (e) { return null; }
    };

    const findKontaktByEmail = async (email: string): Promise<number | null> => {
        try {
            const res = await fetch(`${API_BASE_URL}/register/kontakter/?email=${email}`);
            const data = await res.json();
            const results = Array.isArray(data) ? data : data.results;
            return (results && results.length > 0) ? results[0].id : null;
        } catch (e) { return null; }
    };

    const fetchCvrData = async (cvr: string): Promise<any | null> => {
        try {
            const res = await fetch(`${API_BASE_URL}/register/cvr_opslag/${cvr}/`);
            if (res.ok) return await res.json();
        } catch (e) { console.error("CVR netværksfejl", e); }
        return null;
    };

    // --- HOVEDLOGIK ---
    const handleStartImport = async () => {
        if (!parsedData.length) return;
        setIsProcessing(true);
        setLogs([]);

        const endpoint = type === 'virksomhed' ? 'virksomheder' : 'kontakter';

        for (let i = 0; i < parsedData.length; i++) {
            const row = parsedData[i];
            const rowNum = i + 1;
            let idToUpdate: number | null = null;
            let actionType = '';

            // Rens data
            Object.keys(row).forEach(key => {
                if (row[key] === '' || row[key] === undefined) delete row[key];
                else if (key.endsWith('_id') || key === 'kommunekode') {
                    const val = parseInt(row[key], 10);
                    if (!isNaN(val)) row[key] = val;
                }
            });
            
            if (row.cvr_nr) row.cvr_nr = row.cvr_nr.toString().replace(/\D/g, '');

            try {
                // --- TRIN 1: Er der et ID? ---
                if (row.id) {
                    idToUpdate = parseInt(row.id, 10);
                    actionType = 'ID Match';
                } 
                // --- TRIN 2: Er der et CVR? (Kun virksomheder) ---
                else if (type === 'virksomhed' && row.cvr_nr) {
                    
                    // A. Hent stamdata fra Virk.dk (Enrich)
                    const cvrData = await fetchCvrData(row.cvr_nr);
                    if (cvrData) {
                        // Overskriv/udfyld felter med data fra Virk
                        row.navn = cvrData.navn;
                        row.adresse_vej = cvrData.adresse_vej;
                        row.adresse_postnr = cvrData.adresse_postnr;
                        row.adresse_by = cvrData.adresse_by;
                        row.kommunekode = cvrData.kommunekode;
                        // Kommentar osv. fra CSV bevares
                    } else {
                        // Hvis CVR-opslag fejler (f.eks. 401), logger vi det, men fortsætter hvis vi kan
                        logMsg(rowNum, `Kunne ikke hente data fra Virk for ${row.cvr_nr}`, 'skip');
                    }

                    // B. Tjek om virksomheden findes lokalt
                    idToUpdate = await findByCvr(row.cvr_nr);
                    actionType = 'CVR Match';
                }
                // --- TRIN 3: Er der et Navn/Email? ---
                else {
                    if (type === 'virksomhed' && row.navn) {
                        idToUpdate = await findByName(row.navn);
                        actionType = 'Navne Match';
                    } else if (type === 'kontakt' && row.email) {
                        idToUpdate = await findKontaktByEmail(row.email);
                        actionType = 'Email Match';
                    }
                }

                // --- UDFØR HANDLING ---
                if (idToUpdate) {
                    // OPDATER (PATCH)
                    const res = await fetch(`${API_BASE_URL}/register/${endpoint}/${idToUpdate}/`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(row)
                    });
                    
                    if (res.ok) {
                        const navn = type === 'virksomhed' ? row.navn : row.fulde_navn;
                        logMsg(rowNum, `Opdateret (${actionType}): ${navn || idToUpdate}`, 'update');
                    } else {
                        logMsg(rowNum, `Fejl ved opdatering ID ${idToUpdate}`, 'error');
                    }

                } else {
                    // OPRET NY (POST)
                    // Sikkerhedstjek: Vi kan ikke oprette en virksomhed uden navn
                    if (type === 'virksomhed' && !row.navn) {
                        logMsg(rowNum, `Mangler navn - sprang over`, 'error');
                        continue;
                    }

                    const res = await fetch(`${API_BASE_URL}/register/${endpoint}/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(row)
                    });

                    if (res.ok) {
                        const created = await res.json();
                        const navn = type === 'virksomhed' ? created.navn : created.fulde_navn;
                        logMsg(rowNum, `Oprettet ny: ${navn}`, 'success');
                    } else {
                        const err = await res.json();
                        logMsg(rowNum, `Fejl ved oprettelse: ${JSON.stringify(err)}`, 'error');
                    }
                }

            } catch (error: any) {
                logMsg(rowNum, `Systemfejl: ${error.message}`, 'error');
            }
            
            setProgress(Math.round(((i + 1) / parsedData.length) * 100));
        }

        setIsProcessing(false);
    };

    const handleReset = () => {
        setFile(null);
        setParsedData([]);
        setLogs([]);
        setProgress(0);
        setIsProcessing(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
                {!file && (
                    <div 
                        {...getRootProps()} 
                        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
                        `}
                    >
                        <input {...getInputProps()} />
                        <UploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                        <p className="text-sm text-gray-600">
                            {isDragActive ? "Slip filen her..." : "Træk en CSV-fil herhen, eller klik for at vælge"}
                        </p>
                    </div>
                )}

                {file && (
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center">
                                <FileText className="h-5 w-5 text-blue-600 mr-2" />
                                <span className="font-medium text-sm truncate max-w-[200px]">{file.name}</span>
                                <span className="ml-2 text-xs text-gray-500">({parsedData.length} rækker)</span>
                            </div>
                            {!isProcessing && (
                                <button onClick={handleReset} className="text-red-500 hover:text-red-700 p-1">
                                    <X size={18} />
                                </button>
                            )}
                        </div>

                        {isProcessing && (
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                        )}

                        <div className="flex justify-end space-x-2">
                            {!isProcessing && progress === 0 && (
                                <Button onClick={handleStartImport} variant="primary">
                                    Start Import
                                </Button>
                            )}
                            {!isProcessing && progress === 100 && (
                                <Button onClick={() => { handleReset(); onImportComplete(); }} variant="primary">
                                    Færdig / Luk
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {logs.length > 0 && (
                    <div className="mt-4 border rounded-md max-h-60 overflow-y-auto bg-slate-900 text-slate-50 font-mono text-xs p-2 shadow-inner">
                        {logs.map((log, idx) => (
                            <div key={idx} className={`flex items-center mb-1 last:mb-0 ${
                                log.status === 'error' ? 'text-red-400' : 
                                log.status === 'update' ? 'text-blue-300' : 
                                log.status === 'skip' ? 'text-yellow-400' :
                                'text-green-400'
                            }`}>
                                <span className="mr-2 flex-shrink-0">
                                    {log.status === 'success' && <CheckCircle size={12} />}
                                    {log.status === 'update' && <ArrowRight size={12} />}
                                    {log.status === 'error' && <AlertCircle size={12} />}
                                    {log.status === 'skip' && <span>-</span>}
                                </span>
                                <span>[Række {log.row}] {log.message}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
}