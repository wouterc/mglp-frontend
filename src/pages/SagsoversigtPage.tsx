// --- Fil: src/pages/SagsoversigtPage.tsx ---
// @# 2025-09-15 17:18 - Implementeret piletast-navigation via useTableNavigation hook.
// @# 2025-11-06 19:14 - Reduceret padding (py-2 til py-1) i tabel for øget informationstæthed.
// @# 2025-11-09 14:00 - Implementeret inline status-redigering (dropdown) i oversigten.
// @# 2025-11-09 18:15 - Reverteret kolonner. Mægler-info flyttet til "fold-ud" detalje-område.
import React, { useState, useEffect, useMemo, ChangeEvent, MouseEvent, useCallback, ReactNode, useRef } from 'react';
import { API_BASE_URL } from '../config';
import SagsForm from '../components/SagsForm';
// @# 2025-11-09 18:15 - Tilføjet Copy og Check ikoner
import { Edit, ArrowUp, ArrowDown, FileText, Folder, ListChecks, PlusCircle, FunnelX, Loader2, AlertCircle, Copy, Check } from 'lucide-react';
// @# 2025-11-09 18:15 - Importeret Virksomhed for helper-funktion
import type { Sag, Status, Virksomhed } from '../types';
import { useAppState } from '../StateContext';
import Modal from '../components/Modal';
import { useTableNavigation } from '../hooks/useTableNavigation'; 

interface SagsoversigtPageProps {
  navigateTo: (side: string, sag: Sag | null) => void;
}

// @# 2025-11-09 18:15 - Tilføjet helper-funktion til formatering
const formatVirksomhedsnavn = (v: Virksomhed | null | undefined): string => {
    if (!v) return '';
    return v.afdeling ? `${v.navn} - ${v.afdeling}` : v.navn;
};

// @# 2025-11-09 18:15 - Reverteret SortKey
type SortKey = keyof Sag | 
  `status.${keyof Status}`;

function SagsoversigtPage({ navigateTo }: SagsoversigtPageProps) {
  const { state, dispatch } = useAppState();
  const {
    sager,
    sagsoversigtError: error,
    sagsoversigtIsLoading: isLoading,
    sagsoversigtFilters: filter,
    sagsoversigtSortConfig: sortConfig,
    sagsoversigtVisLukkede: visLukkede,
    sagsoversigtVisAnnullerede: visAnnullerede,
    erSagerHentet
  } = state;
  const [visForm, setVisForm] = useState<boolean>(false);
  const [sagTilRedigering, setSagTilRedigering] = useState<Sag | null>(null);
  const [udfoldetSagId, setUdfoldetSagId] = useState<number | null>(null);
  const [statusser, setStatusser] = useState<Status[]>([]);
  const [visFlereFiltre, setVisFlereFiltre] = useState<boolean>(false);
  const [creatingActivitiesForSagId, setCreatingActivitiesForSagId] = useState<number | null>(null);
  const [modalInfo, setModalInfo] = useState<{ isOpen: boolean; title: string; message: ReactNode }>({ isOpen: false, title: '', message: null });
  // @# 2025-11-09 18:15 - Opdateret state til at håndtere separate IDs for kopiering
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);
  
  const tableRef = useRef<HTMLTableElement>(null);
  useTableNavigation(tableRef);

  const hentSager = useCallback(async () => { 
    if (erSagerHentet) return;
    dispatch({ type: 'SET_SAGER_STATE', payload: { sagsoversigtIsLoading: true, sagsoversigtError: null } });
    try { 
      const [sagerRes, statusRes] = await Promise.all([
          fetch(`${API_BASE_URL}/sager/`),
          fetch(`${API_BASE_URL}/kerne/status/?formaal=1`)
      ]);
      if (!sagerRes.ok || !statusRes.ok) throw new Error(`HTTP error!`); 
      const sagerData = await sagerRes.json(); 
      const statusData = await statusRes.json();
      const sagsliste: Sag[] = Array.isArray(sagerData.results) ? sagerData.results : Array.isArray(sagerData) ? sagerData : [];
      const statusliste: Status[] = Array.isArray(statusData.results) ? statusData.results : Array.isArray(statusData) ? statusData : [];
      dispatch({ type: 'SET_SAGER_STATE', payload: { sager: sagsliste, erSagerHentet: true } });
      setStatusser(statusliste);
    } catch (e: any) { 
      dispatch({ type: 'SET_SAGER_STATE', payload: { sagsoversigtError: `Kunne ikke hente sagsdata.\nSikr at backend-serveren kører.` } });
      console.error("Fejl ved hentning af sager:", e);
    } finally {
      dispatch({ type: 'SET_SAGER_STATE', payload: { sagsoversigtIsLoading: false } });
    }
  }, [dispatch, erSagerHentet]);

  useEffect(() => { hentSager(); }, [hentSager]);

  const handleStatusSave = async (sagId: number, nyStatusId: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/sager/${sagId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_id: nyStatusId }),
        });
        if (!response.ok) throw new Error('Kunne ikke opdatere status.');
        const opdateretSag: Sag = await response.json();
        const opdateredeSager = sager.map(sag => (sag.id === sagId ? opdateretSag : sag));
        dispatch({ type: 'SET_SAGER_STATE', payload: { sager: opdateredeSager } });
    } catch (error) {
        console.error("Fejl ved opdatering af status:", error);
    }
  };

  // @# 2025-11-09 18:15 - Generisk "kopier email"-funktion
  const handleCopyEmail = (email: string, key: string, e: MouseEvent) => {
      e.stopPropagation();
      if (navigator.clipboard) {
          navigator.clipboard.writeText(email).then(() => {
              setCopiedEmailId(key);
              setTimeout(() => setCopiedEmailId(null), 2000);
          }).catch(err => {
              console.error('Kunne ikke kopiere email:', err);
          });
      }
  };

  const handleOpretAktiviteter = async (sagId: number) => {
    setCreatingActivitiesForSagId(sagId);
    try {
        const response = await fetch(`${API_BASE_URL}/sager/${sagId}/opret_aktiviteter/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Der opstod en fejl.');
        }
        const sagRes = await fetch(`${API_BASE_URL}/sager/${sagId}/`);
        const opdateretSag: Sag = await sagRes.json();
        const opdateredeSager = sager.map(s => s.id === sagId ? opdateretSag : s);
        dispatch({ type: 'SET_SAGER_STATE', payload: { sager: opdateredeSager } });
        
        setModalInfo({
            isOpen: true,
            title: "Succes",
            message: (
                <div className="text-center">
                    <p className="text-gray-600">Aktiviteter til</p>
                    <p className="font-bold text-lg my-1">{opdateretSag.sags_nr} - {opdateretSag.alias}</p>
                    <p className="text-gray-600">er oprettet.</p>
                </div>
            )
        });
    } catch (error: any) {
        setModalInfo({ isOpen: true, title: "Fejl", message: error.message });
    } finally {
        setCreatingActivitiesForSagId(null);
    }
  };

  const sorteredeOgFiltreredeSager = useMemo(() => {
    const getNestedValue = (obj: any, path: string) => path.split('.').reduce((acc, part) => acc && acc[part], obj);
    let filtreret = [...sager];
    
    // @# 2025-11-09 18:15 - Reverteret filterlogik
    if (filter.sags_nr || filter.status) {
      filtreret = filtreret.filter(sag => {
        if (filter.sags_nr && !sag.sags_nr?.toString().includes(filter.sags_nr)) return false;
        if (filter.status) {
          const searchLower = filter.status.toLowerCase();
          const statusMatch = sag.status?.beskrivelse.toLowerCase().includes(searchLower) || sag.status?.status_nummer.toString().includes(searchLower);
          if (!statusMatch) return false;
        }
        return true;
      });
    } else {
      filtreret = filtreret.filter(sag => {
        if (!sag.status) return !visLukkede && !visAnnullerede;
        const kategori = sag.status.status_kategori;
        const isVisibleStatus = (kategori === 0 && !visLukkede && !visAnnullerede) || (kategori === 1 && visLukkede) || (kategori === 9 && visAnnullerede);
        if (!isVisibleStatus) return false;
        if (filter.alias && !sag.alias?.toLowerCase().includes(filter.alias.toLowerCase())) return false;
        // @# 2025-11-09 18:15 - Reverteret til kun at søge på intern ansvarlig
        if (filter.hovedansvarlige && !(sag.hovedansvarlige || '').toLowerCase().includes(filter.hovedansvarlige.toLowerCase())) return false;
        if (filter.adresse && !sag.fuld_adresse?.toLowerCase().includes(filter.adresse.toLowerCase())) return false;
        return true;
      });
    }

    if (sortConfig.key) {
      filtreret.sort((a, b) => {
        // @# 2025-11-09 18:15 - Reverteret sorteringslogik
        const aValue = getNestedValue(a, String(sortConfig.key)) || '';
        const bValue = getNestedValue(b, String(sortConfig.key)) || '';
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return filtreret;
  }, [sager, filter, sortConfig, visLukkede, visAnnullerede]);

  // @# 2025-11-09 18:15 - Reverteret type til SortKey
  const requestSort = (key: SortKey) => { 
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') { 
      direction = 'descending';
    } 
    dispatch({ type: 'SET_SAGER_STATE', payload: { sagsoversigtSortConfig: { key, direction } } });
  };

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement>) => { 
    const { name, value } = e.target;
    dispatch({ type: 'SET_SAGER_STATE', payload: { sagsoversigtFilters: { ...filter, [name]: value } } });
  };

  const handleNulstilFiltre = () => { 
    dispatch({ 
        type: 'SET_SAGER_STATE', 
        payload: { 
            sagsoversigtFilters: { sags_nr: '', alias: '', hovedansvarlige: '', adresse: '', status: '' },
            sagsoversigtVisLukkede: false,
            sagsoversigtVisAnnullerede: false
        } 
    });
  };

  const handleOpretNySag = () => { setSagTilRedigering(null); setVisForm(true); };
  const handleRedigerSag = (sag: Sag) => { setSagTilRedigering(sag); setVisForm(true); };
  const handleAnnuller = () => { setVisForm(false); setSagTilRedigering(null); };
  const handleRaekkeKlik = (sagId: number) => { setUdfoldetSagId(udfoldetSagId === sagId ? null : sagId); };
  
  const handleSaveSag = () => { 
    dispatch({ type: 'SET_SAGER_STATE', payload: { erSagerHentet: false } });
    setVisForm(false); 
    setSagTilRedigering(null); 
  };
  
  // @# 2025-11-09 18:15 - Reverteret type til SortKey
  const getSortIcon = (key: SortKey) => { 
    if (sortConfig.key !== key) return null;
    if (sortConfig.direction === 'ascending') return <ArrowUp className="inline-block ml-1 h-4 w-4" />; 
    return <ArrowDown className="inline-block ml-1 h-4 w-4" />; 
  };
  
  if (error) return <div className="p-8 flex flex-col items-center justify-center text-red-600"><AlertCircle size={48} className="mb-4" /><h2 className="text-xl font-bold mb-2">Fejl</h2><p>{error}</p></div>;
  if (visForm) return <SagsForm onSave={handleSaveSag} onCancel={handleAnnuller} sagTilRedigering={sagTilRedigering} />;
  
  return (
    <div className="p-4">
      <Modal
        isOpen={modalInfo.isOpen}
        onClose={() => setModalInfo({ isOpen: false, title: '', message: null })}
        title={modalInfo.title}
        footer={
          <button 
            onClick={() => setModalInfo({ isOpen: false, title: '', message: null })}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            OK
          </button>
        }
      >
        {modalInfo.message}
      </Modal>

      <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold text-gray-800">Sagsoversigt</h2><button onClick={handleOpretNySag} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700" title="Opret Ny Sag"><PlusCircle size={20} /></button></div>
      
      {/* @# 2025-11-09 18:15 - Reverteret filter-layout og placeholder-tekst */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          <input type="text" name="sags_nr" placeholder="Sagsnr..." value={filter.sags_nr} onChange={handleFilterChange} className="p-2 border border-gray-300 rounded-md lg:col-span-2 text-sm"/>
          <input type="text" name="status" placeholder="Status..." value={filter.status} onChange={handleFilterChange} className="p-2 border border-gray-300 rounded-md lg:col-span-2 text-sm"/>
          <input type="text" name="alias" placeholder="Alias..." value={filter.alias} onChange={handleFilterChange} className="p-2 border border-gray-300 rounded-md lg:col-span-2 text-sm"/>
          <input type="text" name="hovedansvarlige" placeholder="Ansvarlig..." value={filter.hovedansvarlige} onChange={handleFilterChange} className="p-2 border border-gray-300 rounded-md lg:col-span-3 text-sm"/>
          <input type="text" name="adresse" placeholder="Adresse..." value={filter.adresse} onChange={handleFilterChange} className="p-2 border border-gray-300 rounded-md lg:col-span-3 text-sm"/>
        </div>
        <div className="flex justify-between items-center mt-4">
          <button onClick={() => setVisFlereFiltre(!visFlereFiltre)} className="text-blue-600 hover:text-blue-800 text-sm">{visFlereFiltre ? 'Skjul flere filtre' : 'Vis flere filtre'}</button>
          <button onClick={handleNulstilFiltre} className="p-2 text-gray-600 rounded-full hover:bg-gray-200" title="Nulstil Alle Filtre"><FunnelX size={18} /></button>
        </div>
        {visFlereFiltre && (<div className="mt-4 pt-4 border-t border-gray-200"><div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={visLukkede} onChange={() => dispatch({ type: 'SET_SAGER_STATE', payload: { sagsoversigtVisLukkede: !visLukkede } })} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/><span>Vis lukkede</span></label>
        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={visAnnullerede} onChange={() => dispatch({ type: 'SET_SAGER_STATE', payload: { sagsoversigtVisAnnullerede: !visAnnullerede } })} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/><span>Vis annullerede</span></label></div></div>)}
      </div>

      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full bg-white table-fixed" ref={tableRef}>
          {/* @# 2025-11-09 18:15 - Reverteret tabel-header */}
          <thead className="bg-gray-800 text-white text-sm">
            <tr>
              <th className="text-left py-1 px-2 uppercase font-semibold w-[7%]" onClick={() => requestSort('sags_nr')}>SagsNr{getSortIcon('sags_nr')}</th>
              <th className="text-left py-1 px-2 uppercase font-semibold w-[15%]" onClick={() => requestSort('alias')}>Alias{getSortIcon('alias')}</th>
              <th className="text-left py-1 px-2 uppercase font-semibold w-[15%]" onClick={() => requestSort('status.beskrivelse')}>Status{getSortIcon('status.beskrivelse')}</th>
              <th className="text-left py-1 px-2 uppercase font-semibold w-[15%]" onClick={() => requestSort('hovedansvarlige')}>Ansvarlig{getSortIcon('hovedansvarlige')}</th>
              <th className="text-left py-1 px-2 uppercase font-semibold" onClick={() => requestSort('fuld_adresse')}>Adresse{getSortIcon('fuld_adresse')}</th>
              <th className="text-left py-1 px-2 uppercase font-semibold w-[18%]" >Handlinger</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-sm">
            {isLoading 
              ? (<tr><td colSpan={6} className="text-center py-4"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>) 
              : sorteredeOgFiltreredeSager.length === 0 
              ? (<tr><td colSpan={6} className="text-center py-4">Ingen sager fundet.</td></tr>) 
              : (sorteredeOgFiltreredeSager.map(sag => (<React.Fragment key={sag.id}>
                <tr onClick={() => handleRaekkeKlik(sag.id)} className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer">
                  {/* @# 2025-11-09 18:15 - Reverteret række-indhold */}
                  <td className="py-1 px-2">{sag.sags_nr}</td>
                  <td className="py-1 px-2">{sag.alias}</td>
                  <td className="py-1 px-2">
                    <select
                        id={`cell-${sag.id}-2`}
                        value={sag.status ? sag.status.id : ''}
                        onChange={(e) => handleStatusSave(sag.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()} 
                        className="p-1 border border-gray-300 rounded-md bg-white w-full"
                    >
                     {statusser.map(s => (
                        <option key={s.id} value={s.id}>{s.status_nummer} - {s.beskrivelse}</option>
                    ))}
                    </select>
                  </td>
                  <td className="py-1 px-2">{sag.hovedansvarlige}</td>
                  <td className="py-1 px-2">{sag.fuld_adresse}</td>
                  <td className="py-1 px-2">
                      <div className="flex items-center space-x-3">
                         <button id={`cell-${sag.id}-5`} onClick={(e: MouseEvent) => { e.stopPropagation(); handleRedigerSag(sag); }} title="Rediger sag"><Edit size={18} className="text-gray-500 hover:text-blue-600" /></button>
                        <button onClick={(e: MouseEvent) => { e.stopPropagation(); navigateTo('sagsdetaljer', sag); }} title="Vis sagsdetaljer"><FileText size={18} className="text-gray-500 hover:text-green-600" /></button>
                        {creatingActivitiesForSagId === sag.id ? (
                            <Loader2 size={18} className="text-gray-500 animate-spin" />
                        ) : sag.opgaver_oprettet ? (
                            <button onClick={(e: MouseEvent) => { e.stopPropagation(); navigateTo('aktiviteter', sag); }} title="Vis aktiviteter">
                                <ListChecks size={18} className="text-gray-500 hover:text-purple-600" />
                            </button>
                        ) : (
                            <button onClick={(e: MouseEvent) => { e.stopPropagation(); handleOpretAktiviteter(sag.id); }} title="Opret Aktiviteter">
                                <ListChecks size={18} className="text-red-500 hover:text-red-700" />
                            </button>
                        )}
                        <button onClick={(e: MouseEvent) => { e.stopPropagation(); navigateTo('dokumenter', sag); }} title="Vis dokumenter">
                            <Folder size={18} className={sag.mappen_oprettet ? "text-gray-500 hover:text-yellow-600" : "text-red-500 hover:text-yellow-600"} />
                        </button>
                      </div>
                  </td>
                </tr>
                
                {/* @# 2025-11-09 18:15 - START: Opdateret "fold-ud" detalje-område */}
                {udfoldetSagId === sag.id && (
                  <tr className="bg-gray-50">
                    <td colSpan={6} className="p-4">
                      {/* Original række */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h4 className="font-bold text-gray-700">Adresse</h4>
                          <p>{sag.fuld_adresse || "Ikke angivet"}</p>
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-700">Boliginformation</h4>
                          <p><span className="font-semibold">Type:</span> {sag.bolig_type || "N/A"}</p>
                          <p><span className="font-semibold">Matrikel:</span> {sag.bolig_matrikel || "N/A"}</p>
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-700">Hovedansvarlig (Intern)</h4>
                          <p>{sag.hovedansvarlige || "Ikke angivet"}</p>
                        </div>
                      </div>
                      
                      {/* Ny Mægler-række */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                        <div>
                          <h4 className="font-bold text-gray-700">Mægler Virksomhed</h4>
                          <div className="flex items-center space-x-1">
                            <span>{formatVirksomhedsnavn(sag.maegler_virksomhed) || <span className="italic text-gray-500">Ikke valgt</span>}</span>
                            {sag.maegler_virksomhed?.email && (
                              <button 
                                  onClick={(e) => handleCopyEmail(sag.maegler_virksomhed!.email!, `v-${sag.id}`, e)} 
                                  title={`Kopier ${sag.maegler_virksomhed.email}`}
                                  className="p-0.5 rounded-md hover:bg-gray-200 flex-shrink-0"
                              >
                                  {copiedEmailId === `v-${sag.id}` ? (
                                      <Check size={14} className="text-green-500" />
                                  ) : (
                                      <Copy size={14} className="text-blue-500 hover:text-blue-700" />
                                  )}
                              </button>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-700">Mægler Kontakt</h4>
                          <p>{sag.maegler_kontakt?.fulde_navn || <span className="italic text-gray-500">Ikke valgt</span>}</p>
                          {sag.maegler_kontakt?.email && (
                            <div className="flex items-center space-x-1 text-xs">
                              <button 
                                  onClick={(e) => handleCopyEmail(sag.maegler_kontakt!.email!, `k-${sag.id}`, e)} 
                                  title={`Kopier ${sag.maegler_kontakt.email}`}
                                  className="p-0.5 rounded-md hover:bg-gray-200 flex-shrink-0"
                              >
                                  {copiedEmailId === `k-${sag.id}` ? (
                                      <Check size={14} className="text-green-500" />
                                  ) : (
                                      <Copy size={14} className="text-blue-500 hover:text-blue-700" />
                                  )}
                              </button>
                              <a 
                                  href={`mailto:${sag.maegler_kontakt.email}`} 
                                  className="text-blue-600 hover:underline"
                                  onClick={(e) => e.stopPropagation()} 
                                  title="Send email"
                              >
                                  {sag.maegler_kontakt.email}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Kommentar-række */}
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-bold text-gray-700">Kommentar</h4>
                        <p>{sag.kommentar || <span className="italic text-gray-500">Ingen kommentar</span>}</p>
                      </div>
                    </td>
                  </tr> 
                )}
                {/* @# 2025-11-09 18:15 - SLUT: Opdateret "fold-ud" detalje-område */}

              </React.Fragment>)))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SagsoversigtPage;