// --- Fil: src/components/CsvImportModal.tsx ---
// @# 2025-11-23 19:30 - Opdateret til at håndtere 'aktivitetsskabelon' med opslag på Proces/Gruppe.
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx'; 
import { UploadCloud, FileText, AlertCircle, CheckCircle, Loader2, X, ArrowRight } from 'lucide-react';
import Button from './ui/Button';
import Modal from './Modal';
import { API_BASE_URL } from '../config';

interface CsvImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete: () => void;
    title: string;
    type: 'virksomhed' | 'kontakt' | 'blokinfo' | 'aktivitetsskabelon'; // <--- Tilføjet 'aktivitetsskabelon'
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
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = e.target?.result;
                if (data) {
                    try {
                        const workbook = XLSX.read(data, { type: 'array' });
                        const sheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[sheetName];
                        const jsonData = XLSX.utils.sheet_to_json(worksheet);
                        setParsedData(jsonData);
                        setLogs([]);
                        setProgress(0);
                    } catch (error: any) {
                        setLogs([{ row: 0, message: "Excel Fejl: " + error.message, status: 'error' }]);
                    }
                }
            };
            reader.readAsArrayBuffer(selectedFile);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
        onDrop, 
        accept: { 
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls']
        },
        multiple: false 
    });

    const logMsg = (row: number, message: string, status: ImportLog['status']) => {
        setLogs(prev => [...prev, { row, message, status }]);
    };

    // --- OPSLAGSFUNKTIONER ---
    const findExistingVirksomhed = async (cvr: string): Promise<number | null> => {
        try {
            const res = await fetch(`${API_BASE_URL}/register/virksomheder/?cvr_nr=${cvr}`);
            const data = await res.json();
            const results = Array.isArray(data) ? data : data.results;
            return (results && results.length > 0) ? results[0].id : null;
        } catch (e) { return null; }
    };

    const findExistingKontakt = async (email: string): Promise<number | null> => {
        try {
            const res = await fetch(`${API_BASE_URL}/register/kontakter/?email=${email}`);
            const data = await res.json();
            const results = Array.isArray(data) ? data : data.results;
            return (results && results.length > 0) ? results[0].id : null;
        } catch (e) { return null; }
    };

    const findExistingBlokinfo = async (formaal: number, nr: number): Promise<number | null> => {
        try {
            const res = await fetch(`${API_BASE_URL}/skabeloner/blokinfo/?formaal=${formaal}&nr=${nr}`);
            const data = await res.json();
            const results = Array.isArray(data) ? data : data.results;
            return (results && results.length > 0) ? results[0].id : null;
        } catch (e) { return null; }
    };

    // Finder aktivitet baseret på den logiske nøgle: ProcesNr + GruppeNr + AktivitetNr
    const findExistingAktivitet = async (procesNr: number, gruppeNr: number, aktivitetNr: number): Promise<number | null> => {
        try {
            const res = await fetch(`${API_BASE_URL}/skabeloner/aktiviteter/?proces_nr=${procesNr}&gruppe_nr=${gruppeNr}&aktivitet_nr=${aktivitetNr}`);
            const data = await res.json();
            const results = Array.isArray(data) ? data : data.results;
            return (results && results.length > 0) ? results[0].id : null;
        } catch (e) { return null; }
    };

    const fetchCvrData = async (cvr: string): Promise<any | null> => {
        try {
            const res = await fetch(`${API_BASE_URL}/register/cvr_opslag/${cvr}/`);
            if (res.ok) return await res.json();
        } catch (e) { console.error("CVR fejl", e); }
        return null;
    };

    // --- HOVEDLOGIK ---
    const handleStartImport = async () => {
        if (!parsedData.length) return;
        setIsProcessing(true);
        setLogs([]);

        let endpoint = '';
        if (type === 'virksomhed') endpoint = 'register/virksomheder';
        else if (type === 'kontakt') endpoint = 'register/kontakter';
        else if (type === 'blokinfo') endpoint = 'skabeloner/blokinfo';
        else if (type === 'aktivitetsskabelon') endpoint = 'skabeloner/aktiviteter';

        for (let i = 0; i < parsedData.length; i++) {
            const row = parsedData[i];
            const rowNum = i + 1;
            let idToUpdate: number | null = null;

            // Rens data og konverter tal
            Object.keys(row).forEach(key => {
                if (row[key] === '' || row[key] === undefined) delete row[key];
                else if (['id', 'formaal', 'nr', 'proces_nr', 'gruppe_nr', 'aktivitet_nr', 'frist', 'kommunekode'].includes(key)) {
                    const val = parseInt(row[key], 10);
                    if (!isNaN(val)) row[key] = val;
                }
            });
            
            if (row.cvr_nr) row.cvr_nr = row.cvr_nr.toString().replace(/\D/g, '');

            // --- SPECIAL LOGIK FOR AKTIVITETSSKABELONER ---
            if (type === 'aktivitetsskabelon') {
                // Vi skal konvertere proces_nr og gruppe_nr til ID'er
                if (row.proces_nr) {
                    const procesId = await findExistingBlokinfo(1, row.proces_nr);
                    if (procesId) row.proces_id = procesId;
                    else {
                        logMsg(rowNum, `Ukendt Proces Nr: ${row.proces_nr}`, 'error');
                        continue;
                    }
                }
                if (row.gruppe_nr) {
                    const gruppeId = await findExistingBlokinfo(2, row.gruppe_nr);
                    if (gruppeId) row.gruppe_id = gruppeId;
                    else {
                        logMsg(rowNum, `Ukendt Gruppe Nr: ${row.gruppe_nr}`, 'error');
                        continue;
                    }
                }
                // Fjern _nr felterne fra payload, da API forventer _id
                delete row.proces_nr; 
                delete row.gruppe_nr;
            }

            try {
                // TRIN 1: Tjek ID
                if (row.id) {
                    idToUpdate = parseInt(row.id, 10);
                } 
                // TRIN 2: Tjek unikke nøgler
                else {
                    if (type === 'virksomhed' && row.cvr_nr) {
                        idToUpdate = await findExistingVirksomhed(row.cvr_nr);
                    } else if (type === 'kontakt' && row.email) {
                        idToUpdate = await findExistingKontakt(row.email);
                    } else if (type === 'blokinfo' && row.formaal && row.nr) {
                        idToUpdate = await findExistingBlokinfo(row.formaal, row.nr);
                    } else if (type === 'aktivitetsskabelon') {
                        // For aktiviteter skal vi kigge i de originale parsedData for at finde nr, da vi lige slettede dem fra row
                        const origRow = parsedData[i]; 
                        if (origRow.proces_nr && origRow.gruppe_nr && origRow.aktivitet_nr) {
                            idToUpdate = await findExistingAktivitet(origRow.proces_nr, origRow.gruppe_nr, origRow.aktivitet_nr);
                        }
                    }
                }

                if (idToUpdate) {
                    // --- OPDATER ---
                    const res = await fetch(`${API_BASE_URL}/${endpoint}/${idToUpdate}/`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(row)
                    });
                    
                    if (res.ok) {
                        let navn = row.navn || row.fulde_navn || row.titel_kort || row.aktivitet || '';
                        logMsg(rowNum, `Opdateret ID ${idToUpdate}: ${navn}`, 'update');
                    } else {
                        const err = await res.json();
                        logMsg(rowNum, `Fejl opdatering ID ${idToUpdate}: ${JSON.stringify(err)}`, 'error');
                    }

                } else {
                    // --- OPRET NY ---
                    if (type === 'virksomhed' && !row.navn && row.cvr_nr) {
                        const cvrData = await fetchCvrData(row.cvr_nr);
                        if (cvrData) {
                            row.navn = cvrData.navn;
                            row.adresse_vej = cvrData.adresse_vej;
                            row.adresse_postnr = cvrData.adresse_postnr;
                            row.adresse_by = cvrData.adresse_by;
                            row.kommunekode = cvrData.kommunekode;
                        } else {
                            logMsg(rowNum, `Kunne ikke hente CVR-data for ${row.cvr_nr}`, 'error');
                            continue;
                        }
                    }

                    const res = await fetch(`${API_BASE_URL}/${endpoint}/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(row)
                    });

                    if (res.ok) {
                        const created = await res.json();
                        let navn = created.navn || created.fulde_navn || created.titel_kort || created.aktivitet || '';
                        logMsg(rowNum, `Oprettet ny: ${navn} (ID: ${created.id})`, 'success');
                    } else {
                        const err = await res.json();
                        logMsg(rowNum, `Fejl ved oprettelse: ${JSON.stringify(err)}`, 'error');
                    }
                }

            } catch (error: any) {
                logMsg(rowNum, `Netværksfejl: ${error.message}`, 'error');
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
                            {isDragActive ? "Slip filen her..." : "Træk en Excel-fil herhen, eller klik for at vælge"}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">Format: .xlsx eller .xls</p>
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
                                <Button onClick={handleStartImport} variant="primary">Start Import</Button>
                            )}
                            {!isProcessing && progress === 100 && (
                                <Button onClick={() => { handleReset(); onImportComplete(); }} variant="primary">Færdig / Luk</Button>
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
                                'text-green-400'
                            }`}>
                                <span className="mr-2 flex-shrink-0">
                                    {log.status === 'success' && <CheckCircle size={12} />}
                                    {log.status === 'update' && <ArrowRight size={12} />}
                                    {log.status === 'error' && <AlertCircle size={12} />}
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