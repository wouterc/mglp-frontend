// --- Fil: src/pages/KontakterPage.tsx ---
// @# 2025-11-22 21:00 - Tilføjet Import/Export funktionalitet (CSV) ligesom på VirksomhederPage.
import React, { useState, useEffect, useMemo, useCallback, ChangeEvent, ReactElement, MouseEvent, Fragment } from 'react';
import { API_BASE_URL } from '../config';
import { PlusCircle, AlertCircle, Edit, Loader2, X, MessageSquare, Copy, Check, Building, FunnelX, UploadCloud, Download } from 'lucide-react';
import { Kontakt, Rolle, Virksomhed } from '../types';
import { useAppState } from '../StateContext';
import KontaktForm from '../components/KontaktForm';
import useDebounce from '../hooks/useDebounce';
import Tooltip from '../components/Tooltip';
import CsvImportModal from '../components/CsvImportModal';
import Papa from 'papaparse';

interface KontakterPageProps {
  navigateTo: (side: string, context?: any) => void;
}

const VisAdresse = ({ vej, postnr, by }: { vej?: string | null, postnr?: string | null, by?: string | null }) => {
    const adresseLinje1 = (vej || '').trim();
    const adresseLinje2 = [(postnr || '').trim(), (by || '').trim()].filter(Boolean).join(' ');
    if (!adresseLinje1 && !adresseLinje2) return <span className="italic text-gray-500">Ingen adresse</span>;
    return (
        <>
            {adresseLinje1 && <div>{adresseLinje1}</div>}
            {adresseLinje2 && <div>{adresseLinje2}</div>}
        </>
    );
};

const formatVirksomhedsnavn = (v: Virksomhed | null | undefined): string => {
    if (!v) return '';
    return v.afdeling ? `${v.navn} - ${v.afdeling}` : v.navn;
};

function KontakterPage({ navigateTo }: KontakterPageProps): ReactElement {
    const { state, dispatch } = useAppState();
    const {
        kontakter,
        kontakterFilters,
        kontakterIsLoading: isLoading,
        kontakterError: error,
        erKontakterHentet
    } = state;

    const [visForm, setVisForm] = useState<boolean>(false);
    
    // State til Import/Export
    const [visImportModal, setVisImportModal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const [kontaktTilRedigering, setKontaktTilRedigering] = useState<Kontakt | null>(null);
    const [udfoldetKontaktId, setUdfoldetKontaktId] = useState<number | null>(null);

    const debouncedNavn = useDebounce(kontakterFilters.navn, 300);
    const debouncedRolle = useDebounce(kontakterFilters.rolle, 300);
    const debouncedVirksomhed = useDebounce(kontakterFilters.virksomhed, 300);
    const debouncedTelefon = useDebounce(kontakterFilters.telefon, 300);
    const debouncedEmail = useDebounce(kontakterFilters.email, 300);

    const [roller, setRoller] = useState<Rolle[]>([]);
    const [copiedEmailId, setCopiedEmailId] = useState<number | null>(null);
    const [copiedAddressId, setCopiedAddressId] = useState<number | null>(null);

    const hentKontakter = useCallback(async () => {
        // Tvungen opdatering hvis kaldt manuelt (f.eks. efter import), ellers tjek cache
        if (erKontakterHentet && !visImportModal) return;

        dispatch({ type: 'SET_KONTAKTER_STATE', payload: { kontakterIsLoading: true, kontakterError: null } });
        try {
            // Hent med høj limit for at sikre alt data (kan optimeres senere)
            const kontakterRes = await fetch(`${API_BASE_URL}/register/kontakter/?limit=2000`);
            if (!kontakterRes.ok) throw new Error('Kunne ikke hente kontakter.');
            const kontakterData = await kontakterRes.json();
            const kontakterListe = Array.isArray(kontakterData) ? kontakterData : kontakterData.results;
            
            dispatch({ type: 'SET_KONTAKTER_STATE', payload: { kontakter: kontakterListe || [], erKontakterHentet: true } });

        } catch (e: any) {
             dispatch({ type: 'SET_KONTAKTER_STATE', payload: { kontakterError: e.message } });
        } finally {
            dispatch({ type: 'SET_KONTAKTER_STATE', payload: { kontakterIsLoading: false } });
        }
    }, [dispatch, erKontakterHentet, visImportModal]);

    useEffect(() => {
        const fetchRoller = async () => {
            try {
                const rollerRes = await fetch(`${API_BASE_URL}/register/roller/`);
                if (!rollerRes.ok) throw new Error('Kunne ikke hente roller.');
                const rollerData = await rollerRes.json();
                const rollerListe = Array.isArray(rollerData) ? rollerData : rollerData.results;
                setRoller(rollerListe || []);
            } catch (e) {
                console.error("Fejl ved hentning af roller til filter:", e);
            }
        };
        fetchRoller();
    }, []);

    useEffect(() => {
        hentKontakter();
    }, [hentKontakter]);

    const filtreredeKontakter = useMemo(() => {
        if (!Array.isArray(kontakter)) return [];
        
        return kontakter.filter(k => 
            k.fulde_navn.toLowerCase().includes(debouncedNavn.toLowerCase()) &&
            (debouncedRolle === '' || k.roller.some(r => r.id.toString() === debouncedRolle)) &&
            formatVirksomhedsnavn(k.virksomhed).toLowerCase().includes(debouncedVirksomhed.toLowerCase()) &&
            (k.telefon || '').toLowerCase().includes(debouncedTelefon.toLowerCase()) &&
            (k.email || '').toLowerCase().includes(debouncedEmail.toLowerCase())
        );
    }, [kontakter, debouncedNavn, debouncedRolle, debouncedVirksomhed, debouncedTelefon, debouncedEmail]);

    const handleNavToVirksomhed = (e: MouseEvent, virksomhed: Virksomhed | null) => {
        e.stopPropagation();
        if (!virksomhed) return;
        navigateTo('virksomheder', { 
            filter: { navn: virksomhed.navn } 
        });
    };

    const handleOpret = () => {
        setKontaktTilRedigering(null);
        setVisForm(true);
    };

    const handleRediger = (kontakt: Kontakt, e: MouseEvent) => {
        e.stopPropagation();
        setKontaktTilRedigering(kontakt);
        setVisForm(true);
    };

    const handleSave = () => {
        setVisForm(false);
        setKontaktTilRedigering(null);
        dispatch({ type: 'SET_KONTAKTER_STATE', payload: { erKontakterHentet: false } });
        // Vi genhenter også virksomheder, da tællere kan have ændret sig
        dispatch({ type: 'SET_VIRKSOMHEDER_STATE', payload: { erVirksomhederHentet: false } });
        hentKontakter();
    };

    const handleCancel = () => {
        setVisForm(false);
        setKontaktTilRedigering(null);
    };

    const handleRaekkeKlik = (kontaktId: number) => {
        setUdfoldetKontaktId(udfoldetKontaktId === kontaktId ? null : kontaktId);
    };

    const handleCopyEmail = (email: string, kontaktId: number, e: MouseEvent) => {
        e.stopPropagation();
        if (navigator.clipboard) {
            navigator.clipboard.writeText(email).then(() => {
                setCopiedEmailId(kontaktId);
                setTimeout(() => setCopiedEmailId(null), 2000);
            }).catch(err => { console.error(err); });
        }
    };

    const handleCopyAddress = (kontakt: Kontakt, e: MouseEvent) => {
        e.stopPropagation();
        const addressString = [
            kontakt.adresse_vej,
            `${kontakt.adresse_postnr || ''} ${kontakt.adresse_by || ''}`.trim()
        ].filter(Boolean).join('\n');
        if (addressString && navigator.clipboard) {
            navigator.clipboard.writeText(addressString).then(() => {
                setCopiedAddressId(kontakt.id);
                setTimeout(() => setCopiedAddressId(null), 2000);
            }).catch(err => { console.error(err); });
        }
    };
    
    const handleFilterChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        dispatch({
            type: 'SET_KONTAKTER_STATE',
            payload: { kontakterFilters: { ...kontakterFilters, [name]: value } }
        });
    };
    
    const handleNulstilFiltre = () => {
        dispatch({
            type: 'SET_KONTAKTER_STATE',
            payload: { kontakterFilters: { navn: '', rolle: '', virksomhed: '', telefon: '', email: '' } }
        });
    };

    // <--- EKSPORT FUNKTION --->
    const handleExport = async () => {
        setIsExporting(true);
        try {
            // 1. Hent ALT data
            const res = await fetch(`${API_BASE_URL}/register/kontakter/?limit=10000`);
            if (!res.ok) throw new Error("Kunne ikke hente kontakter til eksport");
            
            const data = await res.json();
            const fullList: Kontakt[] = Array.isArray(data) ? data : data.results;

            // 2. Flad struktur til CSV
            const csvData = fullList.map(k => ({
                id: k.id,
                fornavn: k.fornavn,
                efternavn: k.efternavn,
                fulde_navn: k.fulde_navn,
                // Vi eksporterer virksomhed_id, så importen kan genskabe linket
                virksomhed_id: k.virksomhed?.id, 
                virksomhed_navn: k.virksomhed ? formatVirksomhedsnavn(k.virksomhed) : '',
                telefon: k.telefon,
                email: k.email,
                adresse_vej: k.adresse_vej,
                adresse_postnr: k.adresse_postnr,
                adresse_by: k.adresse_by,
                kommentar: k.kommentar,
                // Bemærk: Roller (M2M) er svære at importere via simpel CSV, så vi viser dem kun for info
                roller: k.roller.map(r => r.navn).join(', ')
            }));

            // 3. Generer CSV
            const csv = Papa.unparse(csvData, { delimiter: ";" });

            // 4. Download
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `kontakter_export_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (e) {
            console.error("Eksport fejl:", e);
            alert("Der skete en fejl under eksport.");
        } finally {
            setIsExporting(false);
        }
    };

    if (isLoading && !erKontakterHentet) return (
        <div className="p-8 flex justify-center items-center"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /></div>
    );

    if (error) return (
        <div className="p-8 flex flex-col items-center justify-center text-red-600">
            <AlertCircle size={48} className="mb-4" />
            <h2 className="text-xl font-bold mb-2">Fejl</h2>
            <p>{error}</p>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {visForm && (
                <KontaktForm
                    onSave={handleSave}
                    onCancel={handleCancel}
                    kontaktTilRedigering={kontaktTilRedigering}
                />
            )}

            {/* <--- IMPORT MODAL ---> */}
            <CsvImportModal 
                isOpen={visImportModal}
                onClose={() => setVisImportModal(false)}
                onImportComplete={() => {
                    setVisImportModal(false);
                    dispatch({ type: 'SET_KONTAKTER_STATE', payload: { erKontakterHentet: false } });
                    hentKontakter(); 
                }}
                title="Importer Kontakter (CSV)"
                type="kontakt"
            />

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Kontakter</h2>
                <div className="flex space-x-2">
                    {/* <--- EKSPORT KNAP ---> */}
                    <button 
                        onClick={handleExport} 
                        disabled={isExporting}
                        className="p-2 bg-white text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50" 
                        title="Eksporter til CSV"
                    >
                        {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                    </button>

                    {/* <--- IMPORT KNAP ---> */}
                    <button 
                        onClick={() => setVisImportModal(true)} 
                        className="p-2 bg-white text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50" 
                        title="Importer fra CSV"
                    >
                        <UploadCloud size={20} />
                    </button>

                    <button onClick={handleOpret} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700" title="Opret Ny Kontakt">
                        <PlusCircle size={20} />
                    </button>
                </div>
            </div>

            <div className="mb-4 py-4 px-2 bg-gray-50 rounded-lg border border-gray-200 flex">
                <div className="relative w-[25%] pr-4">
                    <input 
                        type="text" 
                        name="navn" 
                        placeholder="Filtrer på navn..." 
                        value={kontakterFilters.navn} 
                        onChange={handleFilterChange} 
                        className="w-full p-2 border rounded-md text-sm pr-7"
                    />
                    {kontakterFilters.navn && (
                        <button onClick={() => handleFilterChange({ target: { name: 'navn', value: '' } } as any)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Ryd felt">
                            <X size={16} />
                        </button>
                    )}
                </div>
                
                <div className="relative w-[10%] pr-4">
                    <select
                        name="rolle" 
                        value={kontakterFilters.rolle} 
                        onChange={handleFilterChange} 
                        className="w-full p-2 border rounded-md text-sm bg-white"
                    >
                        <option value="">Alle roller...</option>
                        {roller.map(r => (
                            <option key={r.id} value={r.id}>{r.navn}</option>
                        ))}
                    </select>
                </div>

                <div className="relative w-[20%] pr-4">
                    <input 
                        type="text" 
                        name="virksomhed" 
                        placeholder="Filtrer på virksomhed..." 
                        value={kontakterFilters.virksomhed} 
                        onChange={handleFilterChange} 
                        className="w-full p-2 border rounded-md text-sm pr-7"
                    />
                    {kontakterFilters.virksomhed && (
                        <button onClick={() => handleFilterChange({ target: { name: 'virksomhed', value: '' } } as any)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Ryd felt">
                            <X size={16} />
                        </button>
                    )}
                </div>
                
                <div className="relative w-[10%] pr-4">
                    <input 
                        type="text" 
                        name="telefon" 
                        placeholder="Filtrer på telefon..." 
                        value={kontakterFilters.telefon} 
                        onChange={handleFilterChange} 
                        className="w-full p-2 border rounded-md text-sm pr-7"
                    />
                    {kontakterFilters.telefon && (
                        <button onClick={() => handleFilterChange({ target: { name: 'telefon', value: '' } } as any)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Ryd felt">
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="relative w-[30%] pr-2">
                    <input 
                        type="text" 
                        name="email" 
                        placeholder="Filtrer på email..." 
                        value={kontakterFilters.email} 
                        onChange={handleFilterChange} 
                        className="w-full p-2 border rounded-md text-sm pr-7"
                    />
                    {kontakterFilters.email && (
                        <button onClick={() => handleFilterChange({ target: { name: 'email', value: '' } } as any)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Ryd felt">
                            <X size={16} />
                        </button>
                    )}
                </div>
                
                <div className="relative w-[5%]">
                    <button onClick={handleNulstilFiltre} className="p-2 text-gray-600 rounded-full hover:bg-gray-200" title="Nulstil Alle Filtre">
                        <FunnelX size={18} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg shadow-md">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-800 text-white text-sm">
                        <tr>
                            <th className="text-left py-1 px-2 uppercase font-semibold w-[25%]">Navn</th>
                            <th className="text-left py-1 px-2 uppercase font-semibold w-[10%]">Rolle(r)</th>
                            <th className="text-left py-1 px-2 uppercase font-semibold w-[20%]">Virksomhed</th>
                            <th className="text-left py-1 px-2 uppercase font-semibold w-[10%]">Telefon</th>
                            <th className="text-left py-1 px-2 uppercase font-semibold w-[30%]">Email</th>
                            <th className="text-center py-1 px-2 uppercase font-semibold w-[5%]"></th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700 text-sm">
                        {filtreredeKontakter.map(k => (
                            <Fragment key={k.id}>
                                <tr 
                                    className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => handleRaekkeKlik(k.id)}
                                >
                                    <td className="py-1 px-2 font-medium">
                                        <div className="flex items-center">
                                            <span>{k.fulde_navn}</span>
                                            {(k.kommentar || '').trim() && (
                                                <Tooltip content={<div className="max-w-xs p-1">{k.kommentar}</div>}>
                                                    <MessageSquare size={14} className="ml-2 text-green-600 flex-shrink-0" />
                                                </Tooltip>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-1 px-2 truncate">
                                        {k.roller.map(r => r.navn).join(', ')}
                                    </td>
                                    <td className="py-1 px-2">
                                        {k.virksomhed && (
                                            <button 
                                                className="flex items-center space-x-2 text-left text-blue-600 hover:underline"
                                                onClick={(e) => handleNavToVirksomhed(e, k.virksomhed)}
                                                title={`Gå til ${k.virksomhed.navn}`}
                                            >
                                                <Building size={16} className="text-gray-400 flex-shrink-0" />
                                                <span>{formatVirksomhedsnavn(k.virksomhed)}</span>
                                            </button>
                                        )}
                                    </td>
                                    <td className="py-1 px-2">{k.telefon}</td>
                                    <td className="py-1 px-2">
                                        {k.email && (
                                            <div className="flex items-center space-x-1">
                                                <button 
                                                    onClick={(e) => handleCopyEmail(k.email!, k.id, e)} 
                                                    title="Kopier email"
                                                    className="p-0.5 rounded-md hover:bg-gray-200 flex-shrink-0"
                                                >
                                                    {copiedEmailId === k.id ? (
                                                        <Check size={14} className="text-green-500" />
                                                    ) : (
                                                        <Copy size={14} className="text-blue-500 hover:text-blue-700" />
                                                    )}
                                                </button>
                                                <a 
                                                    href={`mailto:${k.email}`} 
                                                    className="text-blue-600 hover:underline"
                                                    onClick={(e) => e.stopPropagation()} 
                                                    title="Send email"
                                                >
                                                    {k.email}
                                                </a>
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-1 px-2 text-center">
                                        <button onClick={(e) => handleRediger(k, e)} title="Rediger">
                                            <Edit size={16} className="text-blue-600 hover:text-blue-800" />
                                        </button>
                                    </td>
                                </tr>
                                {udfoldetKontaktId === k.id && (
                                    <tr className="bg-gray-50 border-b border-gray-300">
                                        <td colSpan={6} className="p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                                <div>
                                                    <div className="flex items-center">
                                                        <button
                                                            onClick={(e) => handleCopyAddress(k, e)}
                                                            title="Kopier adresse"
                                                            className="p-1 rounded-md hover:bg-gray-200 flex-shrink-0 mr-2"
                                                        >
                                                            {copiedAddressId === k.id ? (
                                                                <Check size={16} className="text-green-500" />
                                                            ) : (
                                                                <Copy size={16} className="text-blue-500 hover:text-blue-700" />
                                                            )}
                                                        </button>
                                                        <h4 className="font-bold text-gray-700">Adresse</h4>
                                                    </div>
                                                    <VisAdresse vej={k.adresse_vej} postnr={k.adresse_postnr} by={k.adresse_by} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-700">Kommentar</h4>
                                                    <p className="whitespace-pre-wrap break-words">{k.kommentar || <span className="italic text-gray-500">Ingen kommentar</span>}</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                        {filtreredeKontakter.length === 0 && !isLoading && (
                            <tr><td colSpan={6} className="text-center py-4">Ingen kontakter matcher dit filter.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
         </div>
    );
}

export default KontakterPage;