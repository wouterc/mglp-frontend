// --- Fil: src/pages/VirksomhederPage.tsx ---
import React, { useState, useEffect, useMemo, useCallback, ChangeEvent, ReactElement, Fragment, MouseEvent } from 'react';
import { api } from '../api';
import { PlusCircle, AlertCircle, Edit, Loader2, X, MessageSquare, Copy, Check, Users, FunnelX, UploadCloud, Download } from 'lucide-react';
import { Virksomhed, VirksomhedGruppe } from '../types';
import { useAppState } from '../StateContext';
import VirksomhedForm from '../components/VirksomhedForm';
import CsvImportModal from '../components/CsvImportModal';
import useDebounce from '../hooks/useDebounce';
import HelpButton from '../components/ui/HelpButton';
import Tooltip from '../components/Tooltip';
import * as XLSX from 'xlsx'; // Bruges til Excel eksport

// HER ER DEN MANGLENDE INTERFACE DEFINITION
interface VirksomhederPageProps {
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

function VirksomhederPage({ navigateTo }: VirksomhederPageProps): ReactElement {
    const { state, dispatch } = useAppState();
    const {
        virksomheder,
        virksomhederFilters,
        virksomhederIsLoading: isLoading,
        virksomhederError: error,
        erVirksomhederHentet
    } = state;

    const [visForm, setVisForm] = useState<boolean>(false);
    const [visImportModal, setVisImportModal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const [virksomhedTilRedigering, setVirksomhedTilRedigering] = useState<Virksomhed | null>(null);
    const [udfoldetVirksomhedId, setUdfoldetVirksomhedId] = useState<number | null>(null);

    const debouncedNavn = useDebounce(virksomhederFilters.navn, 300);
    const debouncedAfdeling = useDebounce(virksomhederFilters.afdeling, 300);
    const debouncedGruppe = useDebounce(virksomhederFilters.gruppe, 300);
    const debouncedTelefon = useDebounce(virksomhederFilters.telefon, 300);
    const debouncedEmail = useDebounce(virksomhederFilters.email, 300);

    const [virksomhedGrupper, setVirksomhedGrupper] = useState<VirksomhedGruppe[]>([]);
    const [copiedEmailId, setCopiedEmailId] = useState<number | null>(null);
    const [copiedAddressId, setCopiedAddressId] = useState<number | null>(null);

    const hentVirksomheder = useCallback(async () => {
        if (erVirksomhederHentet && !visImportModal) return;
        dispatch({ type: 'SET_VIRKSOMHEDER_STATE', payload: { virksomhederIsLoading: true, virksomhederError: null } });
        try {
            const data = await api.get<any>('/register/virksomheder/?limit=2000');
            const virksomhederListe = Array.isArray(data) ? data : data.results;

            dispatch({ type: 'SET_VIRKSOMHEDER_STATE', payload: { virksomheder: virksomhederListe || [], erVirksomhederHentet: true } });

        } catch (e: any) {
            dispatch({ type: 'SET_VIRKSOMHEDER_STATE', payload: { virksomhederError: e.message } });
        } finally {
            dispatch({ type: 'SET_VIRKSOMHEDER_STATE', payload: { virksomhederIsLoading: false } });
        }
    }, [dispatch, erVirksomhederHentet, visImportModal]);

    useEffect(() => {
        const fetchGrupper = async () => {
            try {
                const data = await api.get<any>('/register/virksomhedsgrupper/');
                const grupperListe = Array.isArray(data) ? data : data.results;
                setVirksomhedGrupper(grupperListe || []);
            } catch (e) {
                console.error("Fejl ved hentning af grupper til filter:", e);
            }
        };
        fetchGrupper();
    }, []);

    useEffect(() => {
        hentVirksomheder();
    }, [hentVirksomheder]);

    const filtreredeVirksomheder = useMemo(() => {
        if (!Array.isArray(virksomheder)) return [];

        return virksomheder.filter(v =>
            v.navn.toLowerCase().includes(debouncedNavn.toLowerCase()) &&
            (v.afdeling || '').toLowerCase().includes(debouncedAfdeling.toLowerCase()) &&
            (debouncedGruppe === '' || v.gruppe?.id.toString() === debouncedGruppe) &&
            (v.telefon || '').toLowerCase().includes(debouncedTelefon.toLowerCase()) &&
            (v.email || '').toLowerCase().includes(debouncedEmail.toLowerCase())
        );
    }, [virksomheder, debouncedNavn, debouncedAfdeling, debouncedGruppe, debouncedTelefon, debouncedEmail]);

    const handleNavToKontakter = (e: MouseEvent, virksomhed: Virksomhed) => {
        e.stopPropagation();
        navigateTo('kontakter', {
            filter: { virksomhed: formatVirksomhedsnavn(virksomhed) }
        });
    };

    const handleOpret = () => {
        setVirksomhedTilRedigering(null);
        setVisForm(true);
    };

    const handleRediger = (virksomhed: Virksomhed, e: MouseEvent) => {
        e.stopPropagation();
        setVirksomhedTilRedigering(virksomhed);
        setVisForm(true);
    };

    const handleSave = () => {
        setVisForm(false);
        setVirksomhedTilRedigering(null);
        dispatch({ type: 'SET_VIRKSOMHEDER_STATE', payload: { erVirksomhederHentet: false } });
        hentVirksomheder();
    };

    const handleCancel = () => {
        setVisForm(false);
        setVirksomhedTilRedigering(null);
    };

    const handleRaekkeKlik = (virksomhedId: number) => {
        setUdfoldetVirksomhedId(udfoldetVirksomhedId === virksomhedId ? null : virksomhedId);
    };

    const handleCopyEmail = (email: string, virksomhedId: number, e: MouseEvent) => {
        e.stopPropagation();
        if (navigator.clipboard) {
            navigator.clipboard.writeText(email).then(() => {
                setCopiedEmailId(virksomhedId);
                setTimeout(() => setCopiedEmailId(null), 2000);
            }).catch(err => { console.error(err); });
        }
    };

    const handleCopyAddress = (virksomhed: Virksomhed, e: MouseEvent) => {
        e.stopPropagation();
        const addressString = [
            virksomhed.adresse_vej,
            `${virksomhed.adresse_postnr || ''} ${virksomhed.adresse_by || ''}`.trim()
        ].filter(Boolean).join('\n');
        if (addressString && navigator.clipboard) {
            navigator.clipboard.writeText(addressString).then(() => {
                setCopiedAddressId(virksomhed.id);
                setTimeout(() => setCopiedAddressId(null), 2000);
            }).catch(err => { console.error(err); });
        }
    };

    const handleFilterChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        dispatch({
            type: 'SET_VIRKSOMHEDER_STATE',
            payload: { virksomhederFilters: { ...virksomhederFilters, [name]: value } }
        });
    };

    const handleNulstilFiltre = () => {
        dispatch({
            type: 'SET_VIRKSOMHEDER_STATE',
            payload: { virksomhederFilters: { navn: '', afdeling: '', gruppe: '', telefon: '', email: '' } }
        });
    };

    // <--- EKSPORT TIL EXCEL (.XLSX) --->
    const handleExport = () => {
        setIsExporting(true);
        try {
            // Vi bruger den filtrerede liste direkte fra skærmen
            const dataToExport = filtreredeVirksomheder;

            if (dataToExport.length === 0) {
                alert("Der er ingen data at eksportere med de valgte filtre.");
                setIsExporting(false);
                return;
            }

            // 1. Forbered data
            const excelData = dataToExport.map(v => ({
                id: v.id,
                navn: v.navn,
                cvr_nr: v.cvr_nr,
                afdeling: v.afdeling,
                gruppe_id: v.gruppe?.id,
                gruppe_navn: v.gruppe?.navn,
                adresse_vej: v.adresse_vej,
                adresse_postnr: v.adresse_postnr,
                adresse_by: v.adresse_by,
                telefon: v.telefon,
                email: v.email,
                web: v.web,
                kommentar: v.kommentar,
                kommunekode: v.kommunekode
            }));

            // 2. Opret Workbook og Sheet
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Virksomheder");

            // 3. Download filen
            XLSX.writeFile(workbook, `virksomheder_export_${new Date().toISOString().slice(0, 10)}.xlsx`);

        } catch (e) {
            console.error("Eksport fejl:", e);
            alert("Der skete en fejl under eksport.");
        } finally {
            setIsExporting(false);
        }
    };

    if (isLoading && !erVirksomhederHentet) return (
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
        <div className="flex-1 h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
            {visForm && (
                <VirksomhedForm
                    onSave={handleSave}
                    onCancel={handleCancel}
                    virksomhedTilRedigering={virksomhedTilRedigering}
                />
            )}

            <CsvImportModal
                isOpen={visImportModal}
                onClose={() => setVisImportModal(false)}
                onImportComplete={() => {
                    setVisImportModal(false);
                    dispatch({ type: 'SET_VIRKSOMHEDER_STATE', payload: { erVirksomhederHentet: false } });
                    hentVirksomheder();
                }}
                title="Importer Virksomheder (Excel)"
                type="virksomhed"
            />

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    Virksomheder
                    <HelpButton helpPointCode="VIRKSOMHEDER_HELP" />
                </h2>
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

                    <button onClick={handleOpret} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700" title="Opret Ny Virksomhed">
                        <PlusCircle size={20} />
                    </button>
                </div>
            </div>

            <div className="mb-4 py-4 px-2 bg-gray-50 rounded-lg border border-gray-200 flex">
                <div className="relative w-[25%] pr-4">
                    <input
                        id="filter-navn"
                        type="text"
                        name="navn"
                        placeholder="Filtrer på navn..."
                        value={virksomhederFilters.navn}
                        onChange={handleFilterChange}
                        className="w-full p-2 border rounded-md text-sm pr-7"
                        aria-label="Filtrer på navn"
                        autoComplete="off"
                    />
                    {virksomhederFilters.navn && (
                        <button onClick={() => handleFilterChange({ target: { name: 'navn', value: '' } } as any)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Ryd felt">
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="relative w-[15%] pr-4">
                    <input
                        id="filter-afdeling"
                        type="text"
                        name="afdeling"
                        placeholder="Filtrer på afdeling..."
                        value={virksomhederFilters.afdeling}
                        onChange={handleFilterChange}
                        className="w-full p-2 border rounded-md text-sm pr-7"
                        aria-label="Filtrer på afdeling"
                        autoComplete="off"
                    />
                    {virksomhederFilters.afdeling && (
                        <button onClick={() => handleFilterChange({ target: { name: 'afdeling', value: '' } } as any)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Ryd felt">
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="relative w-[10%] pr-4">
                    <select
                        id="filter-gruppe"
                        name="gruppe"
                        value={virksomhederFilters.gruppe}
                        onChange={handleFilterChange}
                        className="w-full p-2 border rounded-md text-sm bg-white"
                        aria-label="Filtrer på gruppe"
                    >
                        <option value="">Alle grupper...</option>
                        {virksomhedGrupper.map(g => (
                            <option key={g.id} value={g.id}>{g.navn}</option>
                        ))}
                    </select>
                </div>

                <div className="relative w-[10%] pr-4">
                    <input
                        id="filter-telefon"
                        type="text"
                        name="telefon"
                        placeholder="Filtrer på telefon..."
                        value={virksomhederFilters.telefon}
                        onChange={handleFilterChange}
                        className="w-full p-2 border rounded-md text-sm pr-7"
                        aria-label="Filtrer på telefon"
                        autoComplete="off"
                    />
                    {virksomhederFilters.telefon && (
                        <button onClick={() => handleFilterChange({ target: { name: 'telefon', value: '' } } as any)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Ryd felt">
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="relative w-[35%] pr-2">
                    <input
                        id="filter-email"
                        type="text"
                        name="email"
                        placeholder="Filtrer på email..."
                        value={virksomhederFilters.email}
                        onChange={handleFilterChange}
                        className="w-full p-2 border rounded-md text-sm pr-7"
                        aria-label="Filtrer på email"
                        autoComplete="off"
                    />
                    {virksomhederFilters.email && (
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
                            <th className="text-left py-1 px-2 uppercase font-semibold w-[15%]">Afdeling</th>
                            <th className="text-left py-1 px-2 uppercase font-semibold w-[10%]">Gruppe</th>
                            <th className="text-left py-1 px-2 uppercase font-semibold w-[10%]">Telefon</th>
                            <th className="text-left py-1 px-2 uppercase font-semibold w-[35%]">Email</th>
                            <th className="text-center py-1 px-2 uppercase font-semibold w-[5%]">Kont.</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700 text-xs">
                        {filtreredeVirksomheder.map(v => (
                            <Fragment key={v.id}>
                                <tr
                                    className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => handleRaekkeKlik(v.id)}
                                >
                                    <td className="py-1 px-2 font-medium">
                                        <div className="flex items-center">
                                            <span>{v.navn}</span>
                                            {(v.kommentar || '').trim() && (
                                                <Tooltip content={<div className="max-w-xs p-1">{v.kommentar}</div>}>
                                                    <MessageSquare size={14} className="ml-2 text-green-600 flex-shrink-0" />
                                                </Tooltip>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-1 px-2">{v.afdeling}</td>
                                    <td className="py-1 px-2">{v.gruppe?.navn}</td>
                                    <td className="py-1 px-2">{v.telefon}</td>
                                    <td className="py-1 px-2">
                                        {v.email && (
                                            <div className="flex items-center space-x-1">
                                                <button
                                                    onClick={(e) => handleCopyEmail(v.email!, v.id, e)}
                                                    title="Kopier email"
                                                    className="p-0.5 rounded-md hover:bg-gray-200 flex-shrink-0"
                                                >
                                                    {copiedEmailId === v.id ? (
                                                        <Check size={14} className="text-green-500" />
                                                    ) : (
                                                        <Copy size={14} className="text-blue-500 hover:text-blue-700" />
                                                    )}
                                                </button>
                                                <a
                                                    href={`mailto:${v.email}`}
                                                    className="text-blue-600 hover:underline"
                                                    onClick={(e) => e.stopPropagation()}
                                                    title="Send email"
                                                >
                                                    {v.email}
                                                </a>
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-1 px-2 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <button
                                                className="flex items-center text-gray-500 hover:text-blue-600"
                                                title="Vis tilknyttede kontakter"
                                                onClick={(e) => handleNavToKontakter(e, v)}
                                            >
                                                <Users size={16} className="mr-1" />
                                                <span>{v.kontakter_count}</span>
                                            </button>
                                            <button onClick={(e) => handleRediger(v, e)} title="Rediger">
                                                <Edit size={16} className="text-blue-600 hover:text-blue-800" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                {udfoldetVirksomhedId === v.id && (
                                    <tr className="bg-gray-50 border-b border-gray-300">
                                        <td colSpan={6} className="p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2">
                                                <div>
                                                    <div className="flex items-center">
                                                        <button
                                                            onClick={(e) => handleCopyAddress(v, e)}
                                                            title="Kopier adresse"
                                                            className="p-1 rounded-md hover:bg-gray-200 flex-shrink-0 mr-2"
                                                        >
                                                            {copiedAddressId === v.id ? (
                                                                <Check size={16} className="text-green-500" />
                                                            ) : (
                                                                <Copy size={16} className="text-blue-500 hover:text-blue-700" />
                                                            )}
                                                        </button>
                                                        <h4 className="font-bold text-gray-700">Adresse</h4>
                                                    </div>
                                                    <VisAdresse vej={v.adresse_vej} postnr={v.adresse_postnr} by={v.adresse_by} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-700">Web</h4>
                                                    {v.web ? (
                                                        <a href={v.web.startsWith('http') ? v.web : `https://${v.web}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{v.web}</a>
                                                    ) : <span className="italic text-gray-500">Ikke angivet</span>}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-700">Kommentar</h4>
                                                    <p className="whitespace-pre-wrap break-words">{v.kommentar || <span className="italic text-gray-500">Ingen kommentar</span>}</p>
                                                </div>
                                                <div className="mt-2">
                                                    <h4 className="font-bold text-gray-700">CVR</h4>
                                                    {v.cvr_nr ? <div>{v.cvr_nr}</div> : <span className="italic text-gray-500">Ikke angivet</span>}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                        {filtreredeVirksomheder.length === 0 && !isLoading && (
                            <tr><td colSpan={6} className="text-center py-4">Ingen virksomheder matcher dit filter.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default VirksomhederPage;