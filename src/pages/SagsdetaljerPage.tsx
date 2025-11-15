// --- Fil: src/pages/SagsdetaljerPage.tsx ---
// @# 2025-11-09 17:30 - Oprettet SagsdetaljerPage med mægler-funktionalitet.
// @# 2025-11-09 18:30 - Tilføjet "Tilbage"-knap og opdelt mægler-valg i to kolonner.
// @# 2025-11-09 18:45 - Tilføjet detaljer (tlf, email, adr) under valgte emner.
// @# 2025-11-09 19:19 - Tilføjet ikoner (Phone, Mail, Home) og flyttet kopier-ikon bag e-mail.
// @# 2025-11-10 18:50 - Importeret og tilføjet SaelgerStyring-komponent og refresh-logik.
// @# 2025-11-10 21:10 - Tilføjet "Kopier Adresse"-funktion til Mægler og Kontakt.
// @# 2025-11-10 21:15 - Flyttet "Kopier Adresse" til Home-ikonet.
// @# 2025-11-10 21:30 - Sender 'primaerSaelgerId' prop til SaelgerStyring.
// @# 2025-11-15 11:31 - Omdannet side til Accordion-struktur.
// @# 2025-11-15 12:00 - Opdateret ikoner (Køber, Forening, Forsyning) jf. ønske.
import React, { useState, useEffect, useCallback, ChangeEvent, ReactElement, MouseEvent } from 'react';
import { API_BASE_URL } from '../config';
import { Sag, Virksomhed, Kontakt } from '../types';
import { useAppState } from '../StateContext';
// @# 2025-11-15 12:00 - Importeret Droplet, Flame, Handshake. Fjernet UserCheck, Library, Plug.
import {
    Loader2, Building, User, ArrowLeft, Copy, Check, Phone, Mail, Home, Building2,
    Landmark, LifeBuoy,
    Handshake, Droplet, Flame
} from 'lucide-react';
import SaelgerStyring from '../components/SaelgerStyring';

interface SagsdetaljerPageProps {
  sagId: number | null;
  navigateTo: (side: string, sag: Sag | null) => void;
}

function SagsdetaljerPage({ sagId, navigateTo }: SagsdetaljerPageProps): ReactElement {
  const { dispatch: globalDispatch } = useAppState();
  const [sag, setSag] = useState<Sag | null>(null);
  const [alleMaeglere, setAlleMaeglere] = useState<Virksomhed[]>([]);
  const [kontakterForValgtMaegler, setKontakterForValgtMaegler] = useState<Kontakt[]>([]);
  const [isLoadingSag, setIsLoadingSag] = useState(true);
  const [isLoadingMaeglere, setIsLoadingMaeglere] = useState(true);
  const [isLoadingKontakter, setIsLoadingKontakter] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // @# 2025-11-15 11:31 - State til at styre åben sektion.
  const [openSection, setOpenSection] = useState<string | null>('maegler');

  // @# 2025-11-15 11:31 - Funktion til at skifte den åbne sektion
  const handleToggleSection = (sectionId: string) => {
      setOpenSection(prevOpenSection =>
          prevOpenSection === sectionId ? null : sectionId
      );
  };

  // 1. Hent mægler-virksomheder (kun én gang)
  useEffect(() => {
    const fetchAlleMaeglere = async () => {
      setIsLoadingMaeglere(true);
      try {
        const res = await fetch(`${API_BASE_URL}/register/virksomheder/?er_maegler=true`);
        if (!res.ok) throw new Error("Kunne ikke hente mægler-listen");
        const data = await res.json();
        const liste = Array.isArray(data) ? data : data.results;
        setAlleMaeglere(liste || []);
   
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoadingMaeglere(false);
      }
    };
    fetchAlleMaeglere();
  }, []);

  // 2. Hent kontakter (når en virksomhed vælges)
  const fetchKontakter = useCallback(async (virksomhedId: number) => {
    setIsLoadingKontakter(true);
    setKontakterForValgtMaegler([]); // Nulstil listen
    try {
      const res = await fetch(`${API_BASE_URL}/register/kontakter/?virksomhed=${virksomhedId}`);
      if (!res.ok) throw new Error("Kunne ikke hente kontaktpersoner");
      const data = await res.json();
      const liste = Array.isArray(data) ? data : data.results;
      setKontakterForValgtMaegler(liste || []);
    } catch (e: any) {
      
 
      setError(e.message);
    } finally {
      setIsLoadingKontakter(false);
    }
  }, []);

  // @# 2025-11-10 18:50 - START: Gør 'fetchSag' genbrugelig
  const fetchSag = useCallback(async (id: number) => {
    if (!id) {
        setIsLoadingSag(false);
        setSag(null);
        return;
    }
    
    setIsLoadingSag(true);
    setError(null);
    setKontakterForValgtMaegler([]);
    try {
      const res = await fetch(`${API_BASE_URL}/sager/${id}/`);
      if (!res.ok) throw new Error(`Kunne ikke hente sag ${id}`);
    
       const sagData: Sag = await res.json();
      setSag(sagData);

      if (sagData.maegler_virksomhed) {
        fetchKontakter(sagData.maegler_virksomhed.id);
      }
    } catch (e: any) {
      setError(e.message);
      setSag(null);
    } finally {
      setIsLoadingSag(false);
    }
  }, [fetchKontakter]);
  // fetchKontakter er i dependency array
  
  // 3. Hent sag (når sagId ændres)
  useEffect(() => {
    if (sagId) {
        fetchSag(sagId);
    }
  }, [sagId, fetchSag]);
  // @# 2025-11-10 18:50 - SLUT

  // 4. Gem ændringer til backend
  const saveSagUpdate = async (opdatering: { [key: string]: number | string | null }) => {
    if (!sagId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sager/${sagId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opdatering),
      });
      if (!res.ok) {
        console.error("Gem-fejl:", await res.json());
        throw new Error("Kunne ikke gemme ændring");
      }
      const opdateretSag: Sag = await res.json();
      setSag(opdateretSag);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Håndter valg af Mægler (Virksomhed)
  const handleVirksomhedChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const virksomhedIdStr = e.target.value;
    const virksomhedId = virksomhedIdStr ? parseInt(virksomhedIdStr) : null;
    
    saveSagUpdate({ 
      maegler_virksomhed_id: virksomhedId,
      maegler_kontakt_id: null 
    });
    if (virksomhedId) {
      const valgtVirksomhed = alleMaeglere.find(m => m.id === virksomhedId);
      setSag(prev => prev ? { ...prev, maegler_virksomhed: valgtVirksomhed || null, maegler_kontakt: null } : null);
      fetchKontakter(virksomhedId);
    } else {
      setSag(prev => prev ? { ...prev, maegler_virksomhed: null, maegler_kontakt: null } : null);
      setKontakterForValgtMaegler([]);
    }
  };

  // 6. Håndter valg af Mægler (Kontakt)
  const handleKontaktChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const kontaktIdStr = e.target.value;
    const kontaktId = kontaktIdStr ? parseInt(kontaktIdStr) : null;
    
    saveSagUpdate({ maegler_kontakt_id: kontaktId });

    const valgtKontakt = kontakterForValgtMaegler.find(k => k.id === kontaktId);
    setSag(prev => prev ? { ...prev, maegler_kontakt: valgtKontakt || null } : null);
  };

  const handleCopy = (text: string, key: string, e: MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };
  
  // @# 2025-11-10 18:50 - Callback til SaelgerStyring
  const handleSaelgereOpdateret = () => {
      if (sagId) {
          fetchSag(sagId); // Genhent hele sagen for at få friske data
      }
  };

  // --- Rendering ---
  if (isLoadingSag) {
    return <div className="p-8 flex justify-center items-center"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /></div>;
  }
  
  if (error) {
    return <div className="p-8 text-center text-red-600">Fejl: {error}</div>;
  }

  if (!sagId || !sag) {
    return <div className="p-8 text-center text-gray-600">Ingen sag valgt.
Vælg en sag fra sagsoversigten.</div>;
  }

  const erKontaktDropdownDeaktiveret = !sag.maegler_virksomhed || isLoadingKontakter;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Sagsdetaljer: {sag.sags_nr} - {sag.alias}
        </h1>
        <div className="flex items-center space-x-4">
          {isSaving && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
          <button
          
            onClick={() => navigateTo('sagsoversigt', null)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 flex items-center"
            title="Tilbage til sagsoversigt"
          >
            <ArrowLeft size={18} className="mr-2" />
            Tilbage
          </button>
        </div>
      </div>


      {/* @# 2025-11-15 11:31 - START: Hele sidens layout ændret til accordion */}
      <div className="space-y-2">

        {/* --- MÆGLER (Sektion 1) --- */}
        <div className="border rounded shadow-sm bg-white overflow-hidden">
            {/* Header */}
            <div
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => handleToggleSection('maegler')}
            >
                <div className="flex items-center">
                    <Building2 size={20} className="mr-3 text-gray-500" />
                    <h2 className="text-xl font-semibold">Mægler</h2>
                </div>
                <span className="text-xl transform transition-transform duration-200">
                    {openSection === 'maegler' ? '▼' : '►'}
                </span>
            </div>
            {/* Indhold (sammenklappeligt) */}
            {openSection === 'maegler' && (
                <div className="p-4 border-t bg-gray-50/50">
                    {/* Den eksisterende grid-struktur for Mægler/Kontakt er flyttet herind */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Kolonne 1: Mæglervirksomhed */}
                        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                          <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center">
                            <Building size={20} className="mr-3 text-gray-500" />
                            Mæglervirksomhed
                          
                          </h2>
                  
                           <select
                            id="maegler-virksomhed"
                            value={sag.maegler_virksomhed?.id ||
''}
                            onChange={handleVirksomhedChange}
                            disabled={isLoadingMaeglere ||
isSaving}
                            className="w-full p-2 border border-gray-300 rounded-md bg-white shadow-sm"
                          >
                            {isLoadingMaeglere ?
(
                              <option>Henter virksomheder...</option>
                            ) : (
                              <>
                                <option value="">Vælg mæglervirksomhed...</option>
                                {alleMaeglere.map(m => (
                                  <option key={m.id} value={m.id}>
 
                                    {m.navn}{m.afdeling ? ` - ${m.afdeling}` : ''}
                                  </option>
                                ))}
                              </>
                            )}
                          </select>
                    
                  
                      
                          {sag.maegler_virksomhed && (
                            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                              
                              {sag.maegler_virksomhed.telefon && (
                                <div className="flex items-center space-x-3 text-sm text-gray-600">
             
                                      <Phone size={14} className="text-gray-400 flex-shrink-0" />
                                  <span>{sag.maegler_virksomhed.telefon}</span>
                                </div>
                              )}

                              {sag.maegler_virksomhed.email && (
                                <div className="flex items-center space-x-2 text-sm">
      
                                      <Mail size={14} className="text-gray-400 flex-shrink-0" />
                                  <a href={`mailto:${sag.maegler_virksomhed.email}`} className="text-blue-600 hover:underline truncate">
                                    {sag.maegler_virksomhed.email}
                                  </a>
                                  <button
     
                                    onClick={(e) => handleCopy(sag.maegler_virksomhed!.email!, 'v-email', e)}
                                    title={`Kopier ${sag.maegler_virksomhed.email}`}
                                    className="p-0.5 rounded-md hover:bg-gray-200 flex-shrink-0"
                                  >
                                  
                                    {copiedId === 'v-email' 
                                    ?
<Check size={14} className="text-green-500" /> : <Copy size={14} className="text-blue-500 hover:text-blue-700" />}
                                  </button>
                                </div>
                              )}
                              
                              {/* @# 2025-11-10 21:15 - START: "Kopier Adresse" flyttet til Home-ikon (Request 3) */}
  
                                {(sag.maegler_virksomhed.adresse_vej || sag.maegler_virksomhed.adresse_postnr) && (
                                <div className="flex items-start space-x-3 text-sm text-gray-600">
                                  <button
                                    onClick={(e) => handleCopy(
                                      [sag.maegler_virksomhed!.adresse_vej, 
`${sag.maegler_virksomhed!.adresse_postnr || ''} ${sag.maegler_virksomhed!.adresse_by || ''}`.trim()].filter(Boolean).join('\n'),
                                      'v-adr', e
                                    )}
                                    title="Kopier adresse"
                                    className="p-0.5 rounded-md hover:bg-gray-200 flex-shrink-0 mt-0.5"
       
                                    >
                                    {copiedId === 'v-adr' 
                                      ?
<Check size={14} className="text-green-500" /> 
                                      : <Home size={14} className="text-gray-400 hover:text-blue-700" />}
                                  </button>
                                  <div>
                                    {sag.maegler_virksomhed.adresse_vej && <div>{sag.maegler_virksomhed.adresse_vej}</div>}
           
                                         {(sag.maegler_virksomhed.adresse_postnr || sag.maegler_virksomhed.adresse_by) && (
                                      <div>{sag.maegler_virksomhed.adresse_postnr} {sag.maegler_virksomhed.adresse_by}</div>
                                    )}
                                  </div>
                                </div>
          
                                )}
                              {/* @# 2025-11-10 21:15 - SLUT */}
           
                           </div>
                          )}
                        </div>

                        {/* Kolonne 2: Mægler Kontakt */}
                        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
         
                           <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center">
                            <User size={20} className="mr-3 text-gray-500" />
                            Kontaktperson
          
                           </h2>
                          <select
                            id="maegler-kontakt"
                            value={sag.maegler_kontakt?.id ||
''}
                            onChange={handleKontaktChange}
                            disabled={erKontaktDropdownDeaktiveret ||
isSaving}
                            className="w-full p-2 border border-gray-300 rounded-md bg-white shadow-sm disabled:bg-gray-100"
                          >
                            {isLoadingKontakter ?
(
                              <option>Henter kontakter...</option>
                            ) : !sag.maegler_virksomhed ?
(
                              <option>Vælg virksomhed først...</option>
                            ) : kontakterForValgtMaegler.length === 0 ?
(
                              <option>Ingen kontakter fundet...</option>
                            ) : (
                              <>
                                <option value="">Vælg kontakt...</option>
                                {kontakterForValgtMaegler.map(k => (
                                  <option key={k.id} 
                  
                                  value={k.id}>
                                    {k.fulde_navn}
                                  </option>
                                ))}
                              </>
                            )}
  
                          </select>
          
 
                          {sag.maegler_kontakt && (
                            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                              
                              {sag.maegler_kontakt.telefon && (
                                <div className="flex items-center space-x-3 text-sm text-gray-600">
 
                                     <Phone size={14} 
                                  className="text-gray-400 flex-shrink-0" />
                                  <span>{sag.maegler_kontakt.telefon}</span>
                                </div>
                              )}

             
                                 {sag.maegler_kontakt.email && (
                                <div className="flex items-center space-x-2 text-sm">
              
                                   <Mail size={14} className="text-gray-400 flex-shrink-0" />
                                  <a href={`mailto:${sag.maegler_kontakt.email}`} className="text-blue-600 hover:underline truncate">
                  
                                     {sag.maegler_kontakt.email}
                                  </a>
                                  <button
              
                                     onClick={(e) => handleCopy(sag.maegler_kontakt!.email!, 'k-email', e)}
                                    title={`Kopier ${sag.maegler_kontakt.email}`}
  
                                       className="p-0.5 rounded-md hover:bg-gray-200 flex-shrink-0"
                                  >
                                    {copiedId === 'k-email' ?
<Check size={14} className="text-green-500" /> : <Copy size={14} className="text-blue-500 hover:text-blue-700" />}
                                  </button>
                                </div>
                              )}
                              
                              {/* @# 2025-11-10 21:15 - START: "Kopier Adresse" flyttet til Home-ikon (Request 3) */}
  
                                {(sag.maegler_kontakt.adresse_vej || sag.maegler_kontakt.adresse_postnr) && (
                                <div className="flex items-start space-x-3 text-sm text-gray-600">
                                  <button
                                    onClick={(e) => handleCopy(
                                      [sag.maegler_kontakt!.adresse_vej, 
`${sag.maegler_kontakt!.adresse_postnr || ''} ${sag.maegler_kontakt!.adresse_by || ''}`.trim()].filter(Boolean).join('\n'),
                                      'k-adr', e
                                    )}
                                    title="Kopier adresse"
                                    className="p-0.5 rounded-md hover:bg-gray-200 flex-shrink-0 mt-0.5"
       
                                    >
                                    {copiedId === 'k-adr' 
                                      ?
<Check size={14} className="text-green-500" /> 
                                      : <Home size={14} className="text-gray-400 hover:text-blue-700" />}
                                  </button>
                                  <div>
                                    {sag.maegler_kontakt.adresse_vej && <div>{sag.maegler_kontakt.adresse_vej}</div>}
           
                                         {(sag.maegler_kontakt.adresse_postnr || sag.maegler_kontakt.adresse_by) && (
                                       <div>{sag.maegler_kontakt.adresse_postnr} {sag.maegler_kontakt.adresse_by}</div>
                                    )}
                                  </div>
                                </div>
         
                               )}
                              {/* @# 2025-11-10 21:15 - SLUT */}
            
                             </div>
                          )}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* --- SÆLGERE (Sektion 2) --- */}
        <div className="border rounded shadow-sm bg-white overflow-hidden">
            {/* Header */}
            <div
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => handleToggleSection('saelgere')}
            >
                <div className="flex items-center">
                    <User size={20} className="mr-3 text-gray-500" />
                    <h2 className="text-xl font-semibold">Sælgere</h2>
                </div>
                <span className="text-xl transform transition-transform duration-200">
                    {openSection === 'saelgere' ? '▼' : '►'}
                </span>
            </div>
            {/* Indhold (sammenklappeligt) */}
            {openSection === 'saelgere' && (
                <div className="p-4 border-t bg-gray-50/50">
                    {/* Den eksisterende SaelgerStyring er flyttet herind */}
                    <SaelgerStyring
                      sagId={sag.id}
                      initialSaelgere={sag.saelgere ||
[]}
                      // @# 2025-11-10 21:30 - Tilføjet ny prop
                      primaerSaelgerId={sag.primaer_saelger?.id ||
null}
                      onSaelgerOpdateret={handleSaelgereOpdateret}
                    />
                </div>
            )}
        </div>
        
        {/* @# 2025-11-15 12:00 - Opdateret ikon til Handshake */}
        {/* --- KØBERE (Sektion 3 - Placeholder) --- */}
        <div className="border rounded shadow-sm bg-white overflow-hidden">
            <div
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => handleToggleSection('koebere')}
            >
                <div className="flex items-center">
                    <Handshake size={20} className="mr-3 text-gray-500" />
                    <h2 className="text-xl font-semibold">Købere</h2>
                </div>
                <span className="text-xl transform transition-transform duration-200">
                    {openSection === 'koebere' ? '▼' : '►'}
                </span>
            </div>
            {openSection === 'koebere' && (
                <div className="p-4 border-t italic text-gray-500 bg-gray-50/50">
                    Indhold for Købere kommer her...
                </div>
            )}
        </div>

        {/* --- BANK (Sektion 4 - Placeholder) --- */}
        <div className="border rounded shadow-sm bg-white overflow-hidden">
            <div
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => handleToggleSection('bank')}
            >
                <div className="flex items-center">
                    <Landmark size={20} className="mr-3 text-gray-500" />
                    <h2 className="text-xl font-semibold">Bank</h2>
                </div>
                <span className="text-xl transform transition-transform duration-200">
                    {openSection === 'bank' ? '▼' : '►'}
                </span>
            </div>
            {openSection === 'bank' && (
                <div className="p-4 border-t italic text-gray-500 bg-gray-50/50">
                    Indhold for Bank kommer her...
                </div>
            )}
        </div>

        {/* --- RÅDGIVERE (Sektion 5 - Placeholder) --- */}
        <div className="border rounded shadow-sm bg-white overflow-hidden">
            <div
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => handleToggleSection('raadgivere')}
            >
                <div className="flex items-center">
                    <LifeBuoy size={20} className="mr-3 text-gray-500" />
                    <h2 className="text-xl font-semibold">Rådgivere</h2>
                </div>
                <span className="text-xl transform transition-transform duration-200">
                    {openSection === 'raadgivere' ? '▼' : '►'}
                </span>
            </div>
            {openSection === 'raadgivere' && (
                <div className="p-4 border-t italic text-gray-500 bg-gray-50/50">
                    Indhold for Rådgivere kommer her...
                </div>
            )}
        </div>
        
        {/* @# 2025-11-15 12:00 - Opdateret ikon til Building */}
        {/* --- FORENING (Sektion 6 - Placeholder) --- */}
        <div className="border rounded shadow-sm bg-white overflow-hidden">
            <div
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => handleToggleSection('forening')}
            >
                <div className="flex items-center">
                    <Building size={20} className="mr-3 text-gray-500" />
                    <h2 className="text-xl font-semibold">Forening</h2>
                </div>
                <span className="text-xl transform transition-transform duration-200">
                    {openSection === 'forening' ? '▼' : '►'}
                </span>
            </div>
            {openSection === 'forening' && (
                <div className="p-4 border-t italic text-gray-500 bg-gray-50/50">
                    Indhold for Forening kommer her...
                </div>
            )}
        </div>
        
        {/* @# 2025-11-15 12:00 - Opdateret ikon til Droplet + Flame */}
        {/* --- FORSYNING (Sektion 7 - Placeholder) --- */}
        <div className="border rounded shadow-sm bg-white overflow-hidden">
            <div
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => handleToggleSection('forsyning')}
            >
                <div className="flex items-center">
                    <Droplet size={20} className="mr-2 text-gray-500" />
                    <Flame size={20} className="mr-3 text-gray-500" />
                    <h2 className="text-xl font-semibold">Forsyning</h2>
                </div>
                <span className="text-xl transform transition-transform duration-200">
                    {openSection === 'forsyning' ? '▼' : '►'}
                </span>
            </div>
            {openSection === 'forsyning' && (
                <div className="p-4 border-t italic text-gray-500 bg-gray-50/50">
                    Indhold for Forsyning kommer her...
                </div>
            )}
        </div>

      </div>
      {/* @# 2025-11-15 11:31 - SLUT: Accordion-struktur */}
    </div>
  );
}

export default SagsdetaljerPage;