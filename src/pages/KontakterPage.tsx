// --- Fil: src/pages/KontakterPage.tsx ---
// @# 2025-11-06 18:25 - Opdateret til fuld CRUD-funktionalitet for Kontakter.
// @# 2025-11-06 19:14 - Reduceret padding (py-2 til py-1) i tabel for øget informationstæthed.
// @# 2025-11-06 19:27 - Implementeret 'Rolle'-filter, 'x'-ikoner og ændret filter-rækkefølge.
// @# 2025-11-06 20:45 - Rettet crash (blank skærm) ved forkert håndtering af paginerede data.
// @# 2025-11-06 20:52 - Tilføjet 'Kopier Email' og 'Kommentar-indikator' med tooltip.
// @# 2025-11-06 21:04 - Ændret kommentar-ikonets farve til grøn for bedre synlighed.
// @# 2025-11-06 21:15 - Tilføjet 'udfolde-række' funktionalitet for at vise detaljer.
// @# 2025-11-06 22:15 - Tilføjet 'mailto:' link, 'Kopier Email' og 'Kopier Adresse' funktioner.
// @# 2025-11-06 22:08 - Flyttet 'Kopier Adresse'-ikon til foran titlen.
// @# 2025-11-08 12:55 - Justeret kolonnebredder og placering af "Kopier Email"-ikon.
// @# 2025-11-08 12:58 - Justeret filter-bredder til at matche tabelkolonner.
// @# 2025-11-08 13:07 - Rettet tastefejl (rolle -> roller) i filter-dropdown.
// @# 2025-11-08 13:11 - Rettet filter-justering ved at flytte padding ind i div'sne.
// @# 2025-11-08 13:17 - Justeret container-padding (p-4 til py-4 px-2) for at flugte med tabel.
// @# 2025-11-08 14:02 - Splittet Telefon/Email, justeret layout og filter til 5 kolonner.
// @# 2025-11-08 14:10 - Rettet fejl med tom rolle-filter (adskilt datahentning). Omdøbt 'Privatadresse'.
// @# 2025-11-08 14:25 - Opdateret 'Virksomhed'-visning til at inkludere afdeling.
// @# 2025-11-10 17:40 - Opdateret filterlogik og visning til at håndtere M2M 'roller'.
// @# <2025-11-17 21:12> - Refaktoreret til global state og navigation
import React, { useState, useEffect, useMemo, useCallback, ChangeEvent, ReactElement, MouseEvent, Fragment } from 'react';
import { API_BASE_URL } from '../config';
// @# <2025-11-17 21:12> - Importeret Building og FunnelX
import { PlusCircle, AlertCircle, Edit, Loader2, X, MessageSquare, Copy, Check, Building, FunnelX } from 'lucide-react';
// @# <2025-11-17 21:12> - Importeret Sag for navigateTo prop
import { Kontakt, Rolle, Virksomhed, Sag } from '../types';
import { useAppState } from '../StateContext';
import KontaktForm from '../components/KontaktForm';
import useDebounce from '../hooks/useDebounce';
import Tooltip from '../components/Tooltip';

// @# <2025-11-17 21:12> - Tilføjet navigateTo prop interface
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

// @# 2025-11-08 14:25 - Ny hjælpefunktion til at formatere virksomhedsnavn
const formatVirksomhedsnavn = (v: Virksomhed | null | undefined): string => {
    if (!v) return '';
    return v.afdeling ? `${v.navn} - ${v.afdeling}` : v.navn;
};

// @# <2025-11-17 21:12> - Modtaget navigateTo prop
function KontakterPage({ navigateTo }: KontakterPageProps): ReactElement {
    const { state, dispatch } = useAppState();
    const {
        kontakter,
        // @# <2025-11-17 21:12> - Hentet globalt filter
        kontakterFilters,
        kontakterIsLoading: isLoading,
        kontakterError: error,
        erKontakterHentet
    } = state;

    const [visForm, setVisForm] = useState<boolean>(false);
    const [kontaktTilRedigering, setKontaktTilRedigering] = useState<Kontakt | null>(null);
    
    const [udfoldetKontaktId, setUdfoldetKontaktId] = useState<number | null>(null);
    
    // @# <2025-11-17 21:12> - Fjernet lokal filter-state (filterNavn, filterRolle etc.)

    // @# <2025-11-17 21:12> - Opdateret debouncere til at lytte på global state
    const debouncedNavn = useDebounce(kontakterFilters.navn, 300);
    const debouncedRolle = useDebounce(kontakterFilters.rolle, 300);
    const debouncedVirksomhed = useDebounce(kontakterFilters.virksomhed, 300);
    const debouncedTelefon = useDebounce(kontakterFilters.telefon, 300);
    const debouncedEmail = useDebounce(kontakterFilters.email, 300);

    const [roller, setRoller] = useState<Rolle[]>([]);
    const [copiedEmailId, setCopiedEmailId] = useState<number | null>(null);
    const [copiedAddressId, setCopiedAddressId] = useState<number | null>(null);

    // @# 2025-11-08 13:56 - Forenklet: Henter kun kontakter til global state.
    const hentKontakter = useCallback(async () => {
        if (erKontakterHentet) return;
        dispatch({ type: 'SET_KONTAKTER_STATE', payload: { kontakterIsLoading: true, kontakterError: null } });
        try {
            const kontakterRes = await fetch(`${API_BASE_URL}/register/kontakter/`);
            
            if (!kontakterRes.ok) throw new Error('Kunne ikke hente kontakter.');
          
   
            const kontakterData = await kontakterRes.json();
            const kontakterListe = Array.isArray(kontakterData) ? kontakterData : kontakterData.results;
            
            dispatch({ type: 'SET_KONTAKTER_STATE', payload: { kontakter: kontakterListe || [], erKontakterHentet: true } });

        } catch (e: any) {
             dispatch({ type: 'SET_KONTAKTER_STATE', payload: { kontakterError: e.message } });
        } finally {
            dispatch({ type: 'SET_KONTAKTER_STATE', payload: { kontakterIsLoading: false } });
        }
    }, [dispatch, erKontakterHentet]);

    // @# 2025-11-08 13:56 - Ny: Henter roller lokalt til filteret, uanset global state.
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
 
    }, []); // Kør kun én gang

    useEffect(() => {
        hentKontakter();
    }, [hentKontakter]);

    const filtreredeKontakter = useMemo(() => {
        if (!Array.isArray(kontakter)) return [];
        
        return kontakter.filter(k => 
            k.fulde_navn.toLowerCase().includes(debouncedNavn.toLowerCase()) &&
            // @# 2025-11-10 17:40 - Opdateret filterlogik til M2M
            (debouncedRolle === '' || k.roller.some(r => r.id.toString() === debouncedRolle)) &&
           
             // @# 2025-11-08 14:25 - Opdateret filterlogik til at søge i formateret navn
            formatVirksomhedsnavn(k.virksomhed).toLowerCase().includes(debouncedVirksomhed.toLowerCase()) &&
            (k.telefon || '').toLowerCase().includes(debouncedTelefon.toLowerCase()) &&
            (k.email || '').toLowerCase().includes(debouncedEmail.toLowerCase())
        );
    }, [kontakter, debouncedNavn, debouncedRolle, debouncedVirksomhed, debouncedTelefon, debouncedEmail]);

    // @# <2025-11-17 21:12> - Ny navigations-handler
    const handleNavToVirksomhed = (e: MouseEvent, virksomhed: Virksomhed | null) => {
        e.stopPropagation(); // Stop række-klik
        if (!virksomhed) return;
        
        // Sæt filteret på Virksomhed-siden og skift
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
        // Genhent både kontakter OG virksomheder (hvis en kontakt blev tilknyttet en ny)
        dispatch({ type: 'SET_KONTAKTER_STATE', payload: { erKontakterHentet: false } });
        dispatch({ type: 'SET_VIRKSOMHEDER_STATE', payload: { erVirksomhederHentet: false } });
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
            }).catch(err => {
                console.error('Kunne ikke kopiere email:', err);
            });
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
            }).catch(err => {
                console.error('Kunne ikke kopiere adresse:', err);
            });
        }
    };
    
    // @# <2025-11-17 21:12> - Ny handler til at opdatere global filter state
    const handleFilterChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        dispatch({
            type: 'SET_KONTAKTER_STATE',
            payload: { kontakterFilters: { ...kontakterFilters, [name]: value } }
        });
    };
    
    // @# <2025-11-17 21:12> - Ny handler til at nulstille global filter state
    const handleNulstilFiltre = () => {
        dispatch({
            type: 'SET_KONTAKTER_STATE',
            payload: { kontakterFilters: { navn: '', rolle: '', virksomhed: '', telefon: '', email: '' } }
        });
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

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Kontakter</h2>
                <button onClick={handleOpret} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700" title="Opret Ny Kontakt">
                    <PlusCircle size={20} />
                </button>
            </div>

            {/* @# <2025-11-17 21:12> - Inputs læser nu fra global 'kontakterFilters' og kalder 'handleFilterChange' */}
            <div className="mb-4 py-4 px-2 bg-gray-50 rounded-lg border border-gray-200 flex">
                <div className="relative w-[25%] pr-4">
                    <input 
                        type="text" 
                        name="navn" // Tilføjet name
                        placeholder="Filtrer på navn..." 
                        value={kontakterFilters.navn} // Læser fra global state
                        onChange={handleFilterChange} // Opdaterer global state
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
                        name="rolle" // Tilføjet name
                        value={kontakterFilters.rolle} // Læser fra global state
                        onChange={handleFilterChange} // Opdaterer global state
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
                        name="virksomhed" // Tilføjet name
                        placeholder="Filtrer på virksomhed..." 
                        value={kontakterFilters.virksomhed} // Læser fra global state
                        onChange={handleFilterChange} // Opdaterer global state
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
                        name="telefon" // Tilføjet name
                        placeholder="Filtrer på telefon..." 
                        value={kontakterFilters.telefon} // Læser fra global state
                        onChange={handleFilterChange} // Opdaterer global state
                        className="w-full p-2 border rounded-md text-sm pr-7"
                    />
                    {kontakterFilters.telefon && (
                        <button onClick={() => handleFilterChange({ target: { name: 'telefon', value: '' } } as any)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Ryd felt">
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* @# <2025-11-17 21:12> - Justeret bredde fra 35% til 30% */}
                <div className="relative w-[30%] pr-2">
                    <input 
                        type="text" 
                        name="email" // Tilføjet name
                        placeholder="Filtrer på email..." 
                        value={kontakterFilters.email} // Læser fra global state
                        onChange={handleFilterChange} // Opdaterer global state
                        className="w-full p-2 border rounded-md text-sm pr-7"
                    />
                    {kontakterFilters.email && (
                        <button onClick={() => handleFilterChange({ target: { name: 'email', value: '' } } as any)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Ryd felt">
                            <X size={16} />
                        </button>
                    )}
                </div>
                
                {/* @# <2025-11-17 21:12> - Tilføjet Nulstil-knap */}
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
                            {/* @# <2025-11-17 21:12> - Justeret bredde fra 35% til 30% */}
                            <th className="text-left py-1 px-2 uppercase font-semibold w-[30%]">Email</th>
                            {/* @# <2025-11-17 21:12> - Justeret bredde fra 50px til 5% */}
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
                                    {/* @# 2025-11-10 17:40 - Opdateret til at vise liste af roller */}
                                    <td className="py-1 px-2 truncate">
                                        {k.roller.map(r => r.navn).join(', ')}
                                    </td>
                                    {/* @# <2025-11-17 21:12> - START: Opdateret Virksomhed-celle med ikon og klik */}
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
                                    {/* @# <2025-11-17 21:12> - SLUT */}
                                    {/* @# 2025-11-08 14:02 - Opdelt celle */}
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
                                        {/* @# 2025-11-08 14:02 - Opdateret colSpan til 6 */}
                                        <td colSpan={6} className="p-4">
                                            {/* @# 2025-11-08 13:43 - Ændret grid-layout */}
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
                                                        {/* @# 2025-11-08 14:02 - Omdøbt "Privatadresse" */}
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
                            // @# 2025-11-08 14:02 - Opdateret colSpan til 6
                            <tr><td colSpan={6} className="text-center py-4">Ingen kontakter matcher dit filter.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
         </div>
    );
}

export default KontakterPage;