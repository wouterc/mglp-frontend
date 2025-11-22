// --- Fil: src/pages/VirksomhederPage.tsx ---
// @# 2025-11-06 18:25 - Opdateret til fuld CRUD-funktionalitet for Virksomheder.
// @# 2025-11-06 19:14 - Reduceret padding (py-2 til py-1) i tabel for øget informationstæthed.
// @# 2025-11-06 20:02 - Tilføjet 'Gruppe'-filter og 'X'-ikoner.
// @# 2025-11-06 20:45 - Forbedret håndtering af paginerede data.
// @# 2025-11-06 21:07 - Tilføjet 'Kommentar-indikator' med tooltip.
// @# 2025-11-06 21:15 - Tilføjet 'udfolde-række' funktionalitet for at vise detaljer.
// @# 2025-11-06 22:15 - Tilføjet 'mailto:' link, 'Kopier Email' og 'Kopier Adresse' funktioner.
// @# 2025-11-08 13:30 - Opdateret tabel-layout, filter-layout og flyttet CVR til detaljer.
// @# 2025-11-08 13:43 - Splittet Telefon/Email, justeret layout og filter til 5 kolonner.
// @# 2025-11-08 13:56 - Adskilt logik for hentning af grupper (til filter) fra hentning af virksomheder (global state).
import React, { useState, useEffect, useMemo, useCallback, ChangeEvent, ReactElement, Fragment, MouseEvent } from 'react';
import { API_BASE_URL } from '../config';
// @# <2025-11-17 20:45> - Importeret Users og FunnelX
import { PlusCircle, AlertCircle, Edit, Loader2, X, MessageSquare, Copy, Check, Users, FunnelX } from 'lucide-react';
// @# <2025-11-17 20:45> - Importeret Sag for navigateTo prop
import { Virksomhed, VirksomhedGruppe, Sag } from '../types';
import { useAppState } from '../StateContext';
import VirksomhedForm from '../components/VirksomhedForm';
import useDebounce from '../hooks/useDebounce';
import Tooltip from '../components/Tooltip';

// @# <2025-11-17 20:45> - Tilføjet navigateTo prop interface
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

// @# <2025-11-17 20:52> - TILFØJET MANGLENDE HJÆLPEFUNKTION
const formatVirksomhedsnavn = (v: Virksomhed | null | undefined): string => {
    if (!v) return '';
    return v.afdeling ? `${v.navn} - ${v.afdeling}` : v.navn;
};

// @# <2025-11-17 20:45> - Modtaget navigateTo prop
function VirksomhederPage({ navigateTo }: VirksomhederPageProps): ReactElement {
    const { state, dispatch } = useAppState();
    const {
        virksomheder,
        // @# <2025-11-17 20:45> - Hentet globalt filter
        virksomhederFilters,
        virksomhederIsLoading: isLoading,
        virksomhederError: error,
        erVirksomhederHentet
    } = state;

    const [visForm, setVisForm] = useState<boolean>(false);
    const [virksomhedTilRedigering, setVirksomhedTilRedigering] = useState<Virksomhed | null>(null);
    
    const [udfoldetVirksomhedId, setUdfoldetVirksomhedId] = useState<number | null>(null);
    
    // @# <2025-11-17 20:45> - Fjernet lokal filter-state (filterNavn, filterAfdeling etc.)

    // @# <2025-11-17 20:45> - Opdateret debouncere til at lytte på global state
    const debouncedNavn = useDebounce(virksomhederFilters.navn, 300);
    const debouncedAfdeling = useDebounce(virksomhederFilters.afdeling, 300);
    const debouncedGruppe = useDebounce(virksomhederFilters.gruppe, 300);
    const debouncedTelefon = useDebounce(virksomhederFilters.telefon, 300);
    const debouncedEmail = useDebounce(virksomhederFilters.email, 300);

    const [virksomhedGrupper, setVirksomhedGrupper] = useState<VirksomhedGruppe[]>([]);
    const [copiedEmailId, setCopiedEmailId] = useState<number | null>(null);
    const [copiedAddressId, setCopiedAddressId] = useState<number | null>(null);

    // @# 2025-11-08 13:56 - Forenklet: Henter kun virksomheder til global state.
    const hentVirksomheder = useCallback(async () => {
        if (erVirksomhederHentet) return;
        dispatch({ type: 'SET_VIRKSOMHEDER_STATE', payload: { virksomhederIsLoading: true, virksomhederError: null } });
        try {
            const virksomhederRes = await fetch(`${API_BASE_URL}/register/virksomheder/`);
            
            if (!virksomhederRes.ok) throw new Error('Kunne ikke hente virksomheder.');
          
   
            const virksomhederData = await virksomhederRes.json();
            const virksomhederListe = Array.isArray(virksomhederData) ? virksomhederData : virksomhederData.results;
            
            dispatch({ type: 'SET_VIRKSOMHEDER_STATE', payload: { virksomheder: virksomhederListe || [], erVirksomhederHentet: true } });
            
        } catch (e: any) {
             dispatch({ type: 'SET_VIRKSOMHEDER_STATE', payload: { virksomhederError: e.message } });
        } finally {
            dispatch({ type: 'SET_VIRKSOMHEDER_STATE', payload: { virksomhederIsLoading: false } });
        }
    }, [dispatch, erVirksomhederHentet]);

    // @# 2025-11-08 13:56 - Ny: Henter grupper lokalt til filteret, uanset global state.
    useEffect(() => {
        const fetchGrupper = async () => {
            try {
                const grupperRes = await fetch(`${API_BASE_URL}/register/virksomhedsgrupper/`);
                if (!grupperRes.ok) throw new Error('Kunne ikke hente grupper.');
                const grupperData = await grupperRes.json();
        
                const grupperListe = Array.isArray(grupperData) ? grupperData : grupperData.results;
                setVirksomhedGrupper(grupperListe || []);
            } catch (e) {
                console.error("Fejl ved hentning af grupper til filter:", e);
            }
        };
        fetchGrupper();
 
    }, []); // Kør kun én gang

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

    // @# <2025-11-17 20:45> - Ny navigations-handler
    const handleNavToKontakter = (e: MouseEvent, virksomhed: Virksomhed) => {
        e.stopPropagation(); // Stop række-klik
        // Sæt filteret på Kontakt-siden og skift
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
            }).catch(err => {
                console.error('Kunne ikke kopiere email:', err);
            });
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
            }).catch(err => {
                console.error('Kunne ikke kopiere adresse:', err);
            });
        }
    };

    // @# <2025-11-17 20:45> - Ny handler til at opdatere global filter state
    const handleFilterChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        dispatch({
            type: 'SET_VIRKSOMHEDER_STATE',
            payload: { virksomhederFilters: { ...virksomhederFilters, [name]: value } }
        });
    };
    
    // @# <2025-11-17 20:45> - Ny handler til at nulstille global filter state
    const handleNulstilFiltre = () => {
        dispatch({
            type: 'SET_VIRKSOMHEDER_STATE',
            payload: { virksomhederFilters: { navn: '', afdeling: '', gruppe: '', telefon: '', email: '' } }
        });
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
        <div className="p-4 sm:p-6 lg:p-8">
            {visForm && (
                <VirksomhedForm
                    onSave={handleSave}
                    onCancel={handleCancel}
                     virksomhedTilRedigering={virksomhedTilRedigering}
                />
            )}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Virksomheder</h2>
                <button onClick={handleOpret} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700" title="Opret Ny Virksomhed">
                     <PlusCircle size={20} />
                </button>
            </div>

            {/* @# <2025-11-17 20:45> - Inputs læser nu fra global 'virksomhederFilters' og kalder 'handleFilterChange' */}
            <div className="mb-4 py-4 px-2 bg-gray-50 rounded-lg border border-gray-200 flex">
                <div className="relative w-[25%] pr-4">
                     <input 
                        type="text" 
                        name="navn" // Tilføjet name
                        placeholder="Filtrer på navn..." 
                        value={virksomhederFilters.navn} // Læser fra global state
                         onChange={handleFilterChange} // Opdaterer global state
                        className="w-full p-2 border rounded-md text-sm pr-7"
                    />
                    {virksomhederFilters.navn && (
                         <button onClick={() => handleFilterChange({ target: { name: 'navn', value: '' } } as any)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Ryd felt">
                            <X size={16} />
                        </button>
                    )}
                 </div>
                
                <div className="relative w-[15%] pr-4">
                    <input 
                        type="text" 
                        name="afdeling" // Tilføjet name
                         placeholder="Filtrer på afdeling..." 
                        value={virksomhederFilters.afdeling} // Læser fra global state
                        onChange={handleFilterChange} // Opdaterer global state
                        className="w-full p-2 border rounded-md text-sm pr-7"
                    />
                    {virksomhederFilters.afdeling && (
                        <button onClick={() => handleFilterChange({ target: { name: 'afdeling', value: '' } } as any)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Ryd felt">
                         <X size={16} />
                        </button>
                    )}
                </div>

                <div className="relative w-[10%] pr-4">
                     <select
                        name="gruppe" // Tilføjet name
                        value={virksomhederFilters.gruppe} // Læser fra global state
                        onChange={handleFilterChange} // Opdaterer global state
                        className="w-full p-2 border rounded-md text-sm bg-white"
                     >
                        <option value="">Alle grupper...</option>
                        {virksomhedGrupper.map(g => (
                            <option key={g.id} value={g.id}>{g.navn}</option>
                         ))}
                    </select>
                </div>
                
                <div className="relative w-[10%] pr-4">
                     <input 
                        type="text" 
                        name="telefon" // Tilføjet name
                        placeholder="Filtrer på telefon..." 
                        value={virksomhederFilters.telefon} // Læser fra global state
                         onChange={handleFilterChange} // Opdaterer global state
                        className="w-full p-2 border rounded-md text-sm pr-7"
                    />
                    {virksomhederFilters.telefon && (
                         <button onClick={() => handleFilterChange({ target: { name: 'telefon', value: '' } } as any)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Ryd felt">
                            <X size={16} />
                        </button>
                    )}
                 </div>

                {/* @# <2025-11-17 20:45> - Justeret bredde fra 40% til 35% */}
                <div className="relative w-[35%] pr-2">
                    <input 
                        type="text" 
                        name="email" // Tilføjet name
                        placeholder="Filtrer på email..." 
                         value={virksomhederFilters.email} // Læser fra global state
                        onChange={handleFilterChange} // Opdaterer global state
                        className="w-full p-2 border rounded-md text-sm pr-7"
                    />
                     {virksomhederFilters.email && (
                        <button onClick={() => handleFilterChange({ target: { name: 'email', value: '' } } as any)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Ryd felt">
                            <X size={16} />
                         </button>
                    )}
                </div>
                
                {/* @# <2025-11-17 20:45> - Tilføjet Nulstil-knap */}
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
                             {/* @# <2025-11-17 20:45> - Justeret bredde fra 40% til 35% */}
                            <th className="text-left py-1 px-2 uppercase font-semibold w-[35%]">Email</th>
                            {/* @# <2025-11-17 20:45> - Ny kolonne tilføjet (5%) */}
                            <th className="text-center py-1 px-2 uppercase font-semibold w-[5%]">Kont.</th>
                        </tr>
                    </thead>
                     <tbody className="text-gray-700 text-sm">
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
                                    {/* @# <2025-11-17 20:45> - START: Opdateret sidste celle */}
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
                                    {/* @# <2025-11-17 20:45> - SLUT */}
                                </tr>
                                {udfoldetVirksomhedId === v.id && (
                                     <tr className="bg-gray-50 border-b border-gray-300">
                                        <td colSpan={6} className="p-4">
                                             {/* @# 2025-11-08 13:43 - Ændret grid-layout */}
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
                                                {/* CVR på sin egen række */}
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