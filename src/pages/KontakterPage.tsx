
// --- Fil: src/pages/KontakterPage.tsx ---
import React, { useState, useEffect, useMemo, useCallback, ChangeEvent, ReactElement, MouseEvent } from 'react';
import { api } from '../api';
import { PlusCircle, AlertCircle, Loader2, X, Download, UploadCloud, FunnelX } from 'lucide-react';
import { Kontakt, Rolle, Virksomhed } from '../types';
import { useAppState } from '../StateContext';
import KontaktForm from '../components/KontaktForm';
import CsvImportModal from '../components/CsvImportModal';
import useDebounce from '../hooks/useDebounce';
import * as XLSX from 'xlsx';
import KontaktRow from '../components/rows/KontaktRow';

interface KontakterPageProps {
    navigateTo: (side: string, context?: any) => void;
}

// Helpers for Export (simplified/duplicated from Row or just inline logic here because it's only for export string formatting)
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

    const hentKontakter = useCallback(async () => {
        if (erKontakterHentet && !visImportModal) return;

        dispatch({ type: 'SET_KONTAKTER_STATE', payload: { kontakterIsLoading: true, kontakterError: null } });
        try {
            // Hent med høj limit for at sikre alt data (kan optimeres senere)
            const kontakterData = await api.get<any>('/register/kontakter/?limit=2000');
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
                const rollerData = await api.get<any>('/register/roller/');
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

    const handleExport = () => {
        setIsExporting(true);
        try {
            const dataToExport = filtreredeKontakter;

            if (dataToExport.length === 0) {
                alert("Der er ingen data at eksportere med de valgte filtre.");
                setIsExporting(false);
                return;
            }

            const excelData = dataToExport.map(k => ({
                id: k.id,
                fornavn: k.fornavn,
                efternavn: k.efternavn,
                fulde_navn: k.fulde_navn,
                virksomhed_id: k.virksomhed?.id,
                virksomhed_navn: k.virksomhed ? formatVirksomhedsnavn(k.virksomhed) : '',
                telefon: k.telefon,
                email: k.email,
                adresse_vej: k.adresse_vej,
                adresse_postnr: k.adresse_postnr,
                adresse_by: k.adresse_by,
                kommentar: k.kommentar,
                roller: k.roller.map(r => r.navn).join(', ')
            }));

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Kontakter");
            XLSX.writeFile(workbook, `kontakter_export_${new Date().toISOString().slice(0, 10)}.xlsx`);

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

            <CsvImportModal
                isOpen={visImportModal}
                onClose={() => setVisImportModal(false)}
                onImportComplete={() => {
                    setVisImportModal(false);
                    dispatch({ type: 'SET_KONTAKTER_STATE', payload: { erKontakterHentet: false } });
                    hentKontakter();
                }}
                title="Importer Kontakter (Excel)"
                type="kontakt"
            />

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Kontakter</h2>
                <div className="flex space-x-2">
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="p-2 bg-white text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50"
                        title="Eksporter til Excel"
                    >
                        {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                    </button>

                    <button
                        onClick={() => setVisImportModal(true)}
                        className="p-2 bg-white text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50"
                        title="Importer fra Excel"
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
                            <KontaktRow
                                key={k.id}
                                kontakt={k}
                                isExpanded={udfoldetKontaktId === k.id}
                                onToggleExpand={() => handleRaekkeKlik(k.id)}
                                onEdit={handleRediger}
                                onNavToVirksomhed={handleNavToVirksomhed}
                            />
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