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
// @# 2025-11-17 19:55 - Implementeret Bank-blok (Mægler-model) og Rådgiver-blok (ny komponent)
// @# 2025-11-21 21:00 - Implementeret Kommune-sektion (opslag på kommunekode) og Forsyning (Vand/Varme/Spildevand).
// @# 2025-11-22 11:15 - Implementeret 'Smart Vælger' for forsyning med SearchableSelect og kommune-match.
// @# 2025-11-22 15:10 - Opdateret visning i forsyningsvælger til at inkludere kommunekode.
import React, { useState, useEffect, useCallback, ChangeEvent, ReactElement, MouseEvent, useMemo } from 'react';
import { API_BASE_URL } from '../config';
import { Sag, Virksomhed, Kontakt, SagRaadgiverTilknytning } from '../types';
import { useAppState } from '../StateContext';
import {
    Loader2, Building, User, ArrowLeft, Copy, Check, Phone, Mail, Home, Building2,
    Landmark, LifeBuoy,
    Handshake, Droplet, Flame, MapPin, Waves
} from 'lucide-react';
import SaelgerStyring from '../components/SaelgerStyring';
import RaadgiverStyring from '../components/RaadgiverStyring';
import SearchableSelect, { SearchableOption } from '../components/SearchableSelect';
import Button from '../components/ui/Button';

interface SagsdetaljerPageProps {
  sagId: number | null;
  navigateTo: (side: string, sag: Sag | null) => void;
}

// Hjælpefunktion til at formatere virksomhedsnavn
const formatVirksomhedsnavn = (v: Virksomhed | null | undefined): string => {
    if (!v) return '';
    return v.afdeling ? `${v.navn} - ${v.afdeling}` : v.navn;
};

function SagsdetaljerPage({ sagId, navigateTo }: SagsdetaljerPageProps): ReactElement {
  const { dispatch: globalDispatch } = useAppState();
  const [sag, setSag] = useState<Sag | null>(null);
  
  // Mægler state
  const [alleMaeglere, setAlleMaeglere] = useState<Virksomhed[]>([]);
  const [kontakterForValgtMaegler, setKontakterForValgtMaegler] = useState<Kontakt[]>([]);
  
  // Bank state
  const [alleBanker, setAlleBanker] = useState<Virksomhed[]>([]);
  const [kontakterForValgtBank, setKontakterForValgtBank] = useState<Kontakt[]>([]);
  const [isLoadingBanker, setIsLoadingBanker] = useState(true);
  const [isLoadingBankKontakter, setIsLoadingBankKontakter] = useState(false);

  // Rådgiver state
  const [raadgiverTilknytninger, setRaadgiverTilknytninger] = useState<SagRaadgiverTilknytning[]>([]);
  const [isLoadingRaadgivere, setIsLoadingRaadgivere] = useState(true);

  // Kommune og Forsyning state
  const [kommuneAdresser, setKommuneAdresser] = useState<Virksomhed[]>([]);
  const [isLoadingKommune, setIsLoadingKommune] = useState(false);
  
  const [alleForsyninger, setAlleForsyninger] = useState<Virksomhed[]>([]);
  const [isLoadingForsyninger, setIsLoadingForsyninger] = useState(true);

  const [isLoadingSag, setIsLoadingSag] = useState(true);
  const [isLoadingMaeglere, setIsLoadingMaeglere] = useState(true);
  const [isLoadingKontakter, setIsLoadingKontakter] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>('maegler');

  const handleToggleSection = (sectionId: string) => {
      setOpenSection(prevOpenSection =>
          prevOpenSection === sectionId ? null : sectionId
      );
  };

  // --- DATA HENTNING ---

  // 1. Hent Mægler-virksomheder
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

  // 1b. Hent Bank-virksomheder
  useEffect(() => {
    const fetchAlleBanker = async () => {
      setIsLoadingBanker(true);
      try {
        const res = await fetch(`${API_BASE_URL}/register/virksomheder/?er_bank=true`);
        if (!res.ok) throw new Error("Kunne ikke hente bank-listen");
        const data = await res.json();
        const liste = Array.isArray(data) ? data : data.results;
        setAlleBanker(liste || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoadingBanker(false);
      }
    };
    fetchAlleBanker();
  }, []);

  // 1c. Hent Forsynings-virksomheder
  useEffect(() => {
    const fetchAlleForsyninger = async () => {
      setIsLoadingForsyninger(true);
      try {
        const res = await fetch(`${API_BASE_URL}/register/virksomheder/?er_forsyning=true`);
        if (!res.ok) throw new Error("Kunne ikke hente forsynings-listen");
        const data = await res.json();
        const liste = Array.isArray(data) ? data : data.results;
        setAlleForsyninger(liste || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoadingForsyninger(false);
      }
    };
    fetchAlleForsyninger();
  }, []);

  // 2. Hent Mægler/Bank-kontakter
  const fetchKontakter = useCallback(async (virksomhedId: number, type: 'maegler' | 'bank') => {
    if (type === 'maegler') setIsLoadingKontakter(true);
    if (type === 'bank') setIsLoadingBankKontakter(true);
    
    const rolleFilter = type === 'maegler' ? 'er_maegler_kontakt=true' : 'er_bank_kontakt=true';

    try {
      const res = await fetch(`${API_BASE_URL}/register/kontakter/?virksomhed=${virksomhedId}&${rolleFilter}`);
      if (!res.ok) throw new Error(`Kunne ikke hente ${type} kontakter`);
      const data = await res.json();
      const liste = Array.isArray(data) ? data : data.results;
      
      if (type === 'maegler') setKontakterForValgtMaegler(liste || []);
      if (type === 'bank') setKontakterForValgtBank(liste || []);

    } catch (e: any) {
      setError(e.message);
    } finally {
      if (type === 'maegler') setIsLoadingKontakter(false);
      if (type === 'bank') setIsLoadingBankKontakter(false);
    }
  }, []);

  // 2b. Hent Rådgiver-tilknytninger
  const fetchRaadgivere = useCallback(async (currentSagId: number) => {
    setIsLoadingRaadgivere(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sager/raadgivere/?sag_id=${currentSagId}`);
      if (!res.ok) throw new Error("Kunne ikke hente rådgiver-tilknytninger");
      const data: SagRaadgiverTilknytning[] = await res.json();
      setRaadgiverTilknytninger(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoadingRaadgivere(false);
    }
  }, []);

  // 2c. Hent Kommune-adresser
  const fetchKommuneAdresser = useCallback(async (kode: number | null) => {
      if (!kode) {
          setKommuneAdresser([]);
          return;
      }
      setIsLoadingKommune(true);
      try {
          const res = await fetch(`${API_BASE_URL}/register/virksomheder/?er_kommune=true&kommunekode=${kode}`);
          if (!res.ok) throw new Error("Kunne ikke hente kommune-adresser");
          const data = await res.json();
          const liste = Array.isArray(data) ? data : data.results;
          setKommuneAdresser(liste || []);
      } catch (e: any) {
          console.error("Fejl ved hentning af kommune:", e);
      } finally {
          setIsLoadingKommune(false);
      }
  }, []);

  const fetchSag = useCallback(async (id: number) => {
    if (!id) {
        setIsLoadingSag(false);
        setSag(null);
        return;
    }
    
    setIsLoadingSag(true);
    setError(null);
    setKontakterForValgtMaegler([]);
    setKontakterForValgtBank([]);
    
    try {
      const res = await fetch(`${API_BASE_URL}/sager/${id}/`);
      if (!res.ok) throw new Error(`Kunne ikke hente sag ${id}`);
    
       const sagData: Sag = await res.json();
      setSag(sagData);

      if (sagData.maegler_virksomhed) {
        fetchKontakter(sagData.maegler_virksomhed.id, 'maegler');
      }
      if (sagData.bank_virksomhed) {
        fetchKontakter(sagData.bank_virksomhed.id, 'bank');
      }
      fetchRaadgivere(id);
      
      if (sagData.kommunekode) {
          fetchKommuneAdresser(sagData.kommunekode);
      }

    } catch (e: any) {
      setError(e.message);
      setSag(null);
    } finally {
      setIsLoadingSag(false);
    }
  }, [fetchKontakter, fetchRaadgivere, fetchKommuneAdresser]);

  useEffect(() => {
    if (sagId) {
        fetchSag(sagId);
    }
  }, [sagId, fetchSag]);

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

  // --- HANDLERS ---

  const handleVirksomhedChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const virksomhedIdStr = e.target.value;
    const virksomhedId = virksomhedIdStr ? parseInt(virksomhedIdStr) : null;
    
    saveSagUpdate({ maegler_virksomhed_id: virksomhedId, maegler_kontakt_id: null });
    if (virksomhedId) {
      const valgtVirksomhed = alleMaeglere.find(m => m.id === virksomhedId);
      setSag(prev => prev ? { ...prev, maegler_virksomhed: valgtVirksomhed || null, maegler_kontakt: null } : null);
      fetchKontakter(virksomhedId, 'maegler');
    } else {
      setSag(prev => prev ? { ...prev, maegler_virksomhed: null, maegler_kontakt: null } : null);
      setKontakterForValgtMaegler([]);
    }
  };

  const handleKontaktChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const kontaktIdStr = e.target.value;
    const kontaktId = kontaktIdStr ? parseInt(kontaktIdStr) : null;
    saveSagUpdate({ maegler_kontakt_id: kontaktId });
    const valgtKontakt = kontakterForValgtMaegler.find(k => k.id === kontaktId);
    setSag(prev => prev ? { ...prev, maegler_kontakt: valgtKontakt || null } : null);
  };

  const handleBankVirksomhedChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const virksomhedIdStr = e.target.value;
    const virksomhedId = virksomhedIdStr ? parseInt(virksomhedIdStr) : null;
    
    saveSagUpdate({ bank_virksomhed_id: virksomhedId, bank_kontakt_id: null });
    if (virksomhedId) {
      const valgtBank = alleBanker.find(m => m.id === virksomhedId);
      setSag(prev => prev ? { ...prev, bank_virksomhed: valgtBank || null, bank_kontakt: null } : null);
      fetchKontakter(virksomhedId, 'bank');
    } else {
      setSag(prev => prev ? { ...prev, bank_virksomhed: null, bank_kontakt: null } : null);
      setKontakterForValgtBank([]);
    }
  };

  const handleBankKontaktChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const kontaktIdStr = e.target.value;
    const kontaktId = kontaktIdStr ? parseInt(kontaktIdStr) : null;
    saveSagUpdate({ bank_kontakt_id: kontaktId });
    const valgtKontakt = kontakterForValgtBank.find(k => k.id === kontaktId);
    setSag(prev => prev ? { ...prev, bank_kontakt: valgtKontakt || null } : null);
  };

  const handleForsyningChange = (id: number | null, type: 'vand' | 'varme' | 'spildevand') => {
      const fieldName = `${type}_virksomhed_id`;
      
      saveSagUpdate({ [fieldName]: id });
      
      const valgtVirksomhed = alleForsyninger.find(v => v.id === id);
      setSag(prev => {
          if (!prev) return null;
          return {
              ...prev,
              [`${type}_virksomhed`]: valgtVirksomhed || null
          }
      });
  };

  const handleCopy = (text: string, key: string, e: MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };
  
  const handlePartOpdateret = () => {
      if (sagId) {
          fetchSag(sagId);
      }
  };

  // @# 2025-11-22 11:15 - Hjælpefunktion til at generere options
  // @# 2025-11-22 15:10 - Opdateret til at vise kommunekode i listen for nemmere debug
  const getForsyningsOptions = useMemo(() => (type: 'vand' | 'varme' | 'spildevand') => {
      if (!sag) return [];
      
      // Filtrer baseret på type (flag på gruppen)
      const relevanteForsyninger = alleForsyninger.filter(v => {
          if (!v.gruppe) return false;
          if (type === 'vand') return v.gruppe.er_vand;
          if (type === 'varme') return v.gruppe.er_varme;
          if (type === 'spildevand') return v.gruppe.er_spildevand;
          return false;
      });

      const sagKommuneKode = sag.kommunekode ? Number(sag.kommunekode) : null;

      // Map til SearchableOption
      const options: SearchableOption[] = relevanteForsyninger.map(v => {
          const virkKommuneKode = v.kommunekode ? Number(v.kommunekode) : null;
          
          // Tjek match (hvis begge har en kode)
          const isMatch = sagKommuneKode !== null && virkKommuneKode !== null && sagKommuneKode === virkKommuneKode;

          // Byg en sublabel der viser afdeling OG kommunekode (til debug)
          let extraInfo = [];
          if (formatVirksomhedsnavn(v) !== v.navn) extraInfo.push(v.afdeling || '');
          if (virkKommuneKode) extraInfo.push(`Kommune: ${virkKommuneKode}`);
          
          return {
              id: v.id,
              label: v.navn,
              // Rettelse: (v.afdeling || undefined) sikrer at null bliver til undefined
              subLabel: extraInfo.length > 0 ? extraInfo.join(' - ') : undefined,
              // Highlight hvis kommunekode matcher sagens kommunekode
              isHighlight: isMatch
          };
      });

      // Sorter: Highlighted først, derefter alfabetisk
      return options.sort((a, b) => {
          if (a.isHighlight && !b.isHighlight) return -1;
          if (!a.isHighlight && b.isHighlight) return 1;
          return a.label.localeCompare(b.label);
      });
  }, [alleForsyninger, sag]);

  // --- Rendering ---
  if (isLoadingSag) {
    return <div className="p-8 flex justify-center items-center"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /></div>;
  }
  
  if (error) {
    return <div className="p-8 text-center text-red-600">Fejl: {error}</div>;
  }

  if (!sagId || !sag) {
    return <div className="p-8 text-center text-gray-600">Ingen sag valgt. Vælg en sag fra sagsoversigten.</div>;
  }

  const erMaeglerKontaktDropdownDeaktiveret = !sag.maegler_virksomhed || isLoadingKontakter;
  const erBankKontaktDropdownDeaktiveret = !sag.bank_virksomhed || isLoadingBankKontakter;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Sagsdetaljer: {sag.sags_nr} - {sag.alias}
        </h1>
        <div className="flex items-center space-x-4">
          {isSaving && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
          <Button
            onClick={() => navigateTo('sagsoversigt', null)}
            variant="secondary"
            title="Tilbage til sagsoversigt"
          >
            <ArrowLeft size={18} className="mr-2" />
            Tilbage
          </Button>
        </div>
      </div>

      <div className="space-y-2">

        {/* --- MÆGLER (Sektion 1) --- */}
        <div className="border rounded shadow-sm bg-white overflow-hidden">
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
            {openSection === 'maegler' && (
                <div className="p-4 border-t bg-gray-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Kolonne 1: Mæglervirksomhed */}
                        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                           <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center">
                            <Building size={20} className="mr-3 text-gray-500" />
                            Mæglervirksomhed
                           </h2>
                           <select
                            id="maegler-virksomhed"
                            value={sag.maegler_virksomhed?.id || ''}
                            onChange={handleVirksomhedChange}
                            disabled={isLoadingMaeglere || isSaving}
                            className="w-full p-2 border border-gray-300 rounded-md bg-white shadow-sm"
                          >
                            {isLoadingMaeglere ? (
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
                                    {copiedId === 'v-email' ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-blue-500 hover:text-blue-700" />}
                                  </button>
                                </div>
                              )}
                              {(sag.maegler_virksomhed.adresse_vej || sag.maegler_virksomhed.adresse_postnr) && (
                                <div className="flex items-start space-x-3 text-sm text-gray-600">
                                  <button
                                    onClick={(e) => handleCopy(
                                      [sag.maegler_virksomhed!.adresse_vej, `${sag.maegler_virksomhed!.adresse_postnr || ''} ${sag.maegler_virksomhed!.adresse_by || ''}`.trim()].filter(Boolean).join('\n'),
                                      'v-adr', e
                                    )}
                                    title="Kopier adresse"
                                    className="p-0.5 rounded-md hover:bg-gray-200 flex-shrink-0 mt-0.5"
                                    >
                                     {copiedId === 'v-adr' ? <Check size={14} className="text-green-500" /> : <Home size={14} className="text-gray-400 hover:text-blue-700" />}
                                  </button>
                                   <div>
                                     {sag.maegler_virksomhed.adresse_vej && <div>{sag.maegler_virksomhed.adresse_vej}</div>}
                                     {(sag.maegler_virksomhed.adresse_postnr || sag.maegler_virksomhed.adresse_by) && (
                                      <div>{sag.maegler_virksomhed.adresse_postnr} {sag.maegler_virksomhed.adresse_by}</div>
                                     )}
                                   </div>
                                </div>
                               )}
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
                            value={sag.maegler_kontakt?.id || ''}
                            onChange={handleKontaktChange}
                            disabled={erMaeglerKontaktDropdownDeaktiveret || isSaving}
                            className="w-full p-2 border border-gray-300 rounded-md bg-white shadow-sm disabled:bg-gray-100"
                          >
                            {isLoadingKontakter ? (
                              <option>Henter kontakter...</option>
                            ) : !sag.maegler_virksomhed ? (
                              <option>Vælg virksomhed først...</option>
                            ) : kontakterForValgtMaegler.length === 0 ? (
                              <option>Ingen kontakter fundet...</option>
                            ) : (
                              <>
                                <option value="">Vælg kontakt...</option>
                                {kontakterForValgtMaegler.map(k => (
                                  <option key={k.id} value={k.id}>
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
                                      <Phone size={14} className="text-gray-400 flex-shrink-0" />
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
                                     {copiedId === 'k-email' ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-blue-500 hover:text-blue-700" />}
                                  </button>
                                </div>
                              )}
                              {(sag.maegler_kontakt.adresse_vej || sag.maegler_kontakt.adresse_postnr) && (
                                <div className="flex items-start space-x-3 text-sm text-gray-600">
                                  <button
                                    onClick={(e) => handleCopy(
                                      [sag.maegler_kontakt!.adresse_vej, `${sag.maegler_kontakt!.adresse_postnr || ''} ${sag.maegler_kontakt!.adresse_by || ''}`.trim()].filter(Boolean).join('\n'),
                                      'k-adr', e
                                    )}
                                    title="Kopier adresse"
                                    className="p-0.5 rounded-md hover:bg-gray-200 flex-shrink-0 mt-0.5"
                                    >
                                     {copiedId === 'k-adr' ? <Check size={14} className="text-green-500" /> : <Home size={14} className="text-gray-400 hover:text-blue-700" />}
                                  </button>
                                   <div>
                                     {sag.maegler_kontakt.adresse_vej && <div>{sag.maegler_kontakt.adresse_vej}</div>}
                                     {(sag.maegler_kontakt.adresse_postnr || sag.maegler_kontakt.adresse_by) && (
                                       <div>{sag.maegler_kontakt.adresse_postnr} {sag.maegler_kontakt.adresse_by}</div>
                                     )}
                                   </div>
                                </div>
                               )}
                             </div>
                          )}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* --- SÆLGERE (Sektion 2) --- */}
        <div className="border rounded shadow-sm bg-white overflow-hidden">
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
            {openSection === 'saelgere' && (
                <div className="p-4 border-t bg-gray-50/50">
                    <SaelgerStyring
                      sagId={sag.id}
                      initialSaelgere={sag.saelgere || []}
                      primaerSaelgerId={sag.primaer_saelger?.id || null}
                      onSaelgerOpdateret={handlePartOpdateret}
                    />
                </div>
            )}
        </div>
        
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

        {/* --- BANK (Sektion 4) --- */}
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
                <div className="p-4 border-t bg-gray-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                           <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center">
                             <Building size={20} className="mr-3 text-gray-500" />
                             Bank
                           </h2>
                           <select
                            id="bank-virksomhed"
                            value={sag.bank_virksomhed?.id || ''}
                            onChange={handleBankVirksomhedChange}
                            disabled={isLoadingBanker || isSaving}
                            className="w-full p-2 border border-gray-300 rounded-md bg-white shadow-sm"
                          >
                             {isLoadingBanker ? (
                              <option>Henter banker...</option>
                            ) : (
                              <>
                                <option value="">Vælg bank...</option>
                                {alleBanker.map(b => (
                                  <option key={b.id} value={b.id}>
                                    {b.navn}{b.afdeling ? ` - ${b.afdeling}` : ''}
                                  </option>
                                ))}
                              </>
                            )}
                          </select>
          
                          {sag.bank_virksomhed && (
                             <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                              {sag.bank_virksomhed.telefon && (
                                 <div className="flex items-center space-x-3 text-sm text-gray-600">
                                      <Phone size={14} className="text-gray-400 flex-shrink-0" />
                                      <span>{sag.bank_virksomhed.telefon}</span>
                                 </div>
                              )}
                              {sag.bank_virksomhed.email && (
                                 <div className="flex items-center space-x-2 text-sm">
                                      <Mail size={14} className="text-gray-400 flex-shrink-0" />
                                    <a href={`mailto:${sag.bank_virksomhed.email}`} className="text-blue-600 hover:underline truncate">
                                    {sag.bank_virksomhed.email}
                                  </a>
                                     <button
                                    onClick={(e) => handleCopy(sag.bank_virksomhed!.email!, 'b-v-email', e)}
                                    title={`Kopier ${sag.bank_virksomhed.email}`}
                                    className="p-0.5 rounded-md hover:bg-gray-200 flex-shrink-0"
                                  >
                                     {copiedId === 'b-v-email' ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-blue-500 hover:text-blue-700" />}
                                  </button>
                                </div>
                              )}
                             {(sag.bank_virksomhed.adresse_vej || sag.bank_virksomhed.adresse_postnr) && (
                                <div className="flex items-start space-x-3 text-sm text-gray-600">
                                  <button
                                     onClick={(e) => handleCopy(
                                      [sag.bank_virksomhed!.adresse_vej, `${sag.bank_virksomhed!.adresse_postnr || ''} ${sag.bank_virksomhed!.adresse_by || ''}`.trim()].filter(Boolean).join('\n'),
                                       'b-v-adr', e
                                    )}
                                    title="Kopier adresse"
                                     className="p-0.5 rounded-md hover:bg-gray-200 flex-shrink-0 mt-0.5"
                                    >
                                      {copiedId === 'b-v-adr' ? <Check size={14} className="text-green-500" /> : <Home size={14} className="text-gray-400 hover:text-blue-700" />}
                                  </button>
                                   <div>
                                      {sag.bank_virksomhed.adresse_vej && <div>{sag.bank_virksomhed.adresse_vej}</div>}
                                     {(sag.bank_virksomhed.adresse_postnr || sag.bank_virksomhed.adresse_by) && (
                                      <div>{sag.bank_virksomhed.adresse_postnr} {sag.bank_virksomhed.adresse_by}</div>
                                     )}
                                   </div>
                                </div>
                               )}
                           </div>
                          )}
                        </div>

                        {/* Kolonne 2: Bank Kontakt */}
                        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                           <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center">
                            <User size={20} className="mr-3 text-gray-500" />
                            Kontaktperson
                           </h2>
            
                                 <select
                            id="bank-kontakt"
                            value={sag.bank_kontakt?.id || ''}
                            onChange={handleBankKontaktChange}
                            disabled={erBankKontaktDropdownDeaktiveret || isSaving}
                            className="w-full p-2 border border-gray-300 rounded-md bg-white shadow-sm disabled:bg-gray-100"
                          >
                            {isLoadingBankKontakter ? (
                              <option>Henter kontakter...</option>
                            ) : !sag.bank_virksomhed ? (
                              <option>Vælg bank først...</option>
                            ) : kontakterForValgtBank.length === 0 ? (
                              <option>Ingen kontakter fundet...</option>
                            ) : (
                              <>
                                <option value="">Vælg kontakt...</option>
                                {kontakterForValgtBank.map(k => (
                                  <option key={k.id} value={k.id}>
                                    {k.fulde_navn}
                                   </option>
                                ))}
                             </>
                             )}
                          </select>
          
                              {sag.bank_kontakt && (
                             <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                              {sag.bank_kontakt.telefon && (
                                  <div className="flex items-center space-x-3 text-sm text-gray-600">
                                     <Phone size={14} className="text-gray-400 flex-shrink-0" />
                                    <span>{sag.bank_kontakt.telefon}</span>
                                </div>
                              )}
                              {sag.bank_kontakt.email && (
                                 <div className="flex items-center space-x-2 text-sm">
                                    <Mail size={14} className="text-gray-400 flex-shrink-0" />
                                    <a href={`mailto:${sag.bank_kontakt.email}`} className="text-blue-600 hover:underline truncate">
                                    {sag.bank_kontakt.email}
                                  </a>
                                    <button
                                     onClick={(e) => handleCopy(sag.bank_kontakt!.email!, 'b-k-email', e)}
                                    title={`Kopier ${sag.bank_kontakt.email}`}
                                     className="p-0.5 rounded-md hover:bg-gray-200 flex-shrink-0"
                                  >
                                      {copiedId === 'b-k-email' ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-blue-500 hover:text-blue-700" />}
                                  </button>
                                </div>
                              )}
                             {(sag.bank_kontakt.adresse_vej || sag.bank_kontakt.adresse_postnr) && (
                                <div className="flex items-start space-x-3 text-sm text-gray-600">
                                  <button
                                     onClick={(e) => handleCopy(
                                      [sag.bank_kontakt!.adresse_vej, `${sag.bank_kontakt!.adresse_postnr || ''} ${sag.bank_kontakt!.adresse_by || ''}`.trim()].filter(Boolean).join('\n'),
                                       'b-k-adr', e
                                    )}
                                    title="Kopier adresse"
                                     className="p-0.5 rounded-md hover:bg-gray-200 flex-shrink-0 mt-0.5"
                                    >
                                      {copiedId === 'b-k-adr' ? <Check size={14} className="text-green-500" /> : <Home size={14} className="text-gray-400 hover:text-blue-700" />}
                                  </button>
                                   <div>
                                      {sag.bank_kontakt.adresse_vej && <div>{sag.bank_kontakt.adresse_vej}</div>}
                                     {(sag.bank_kontakt.adresse_postnr || sag.bank_kontakt.adresse_by) && (
                                       <div>{sag.bank_kontakt.adresse_postnr} {sag.bank_kontakt.adresse_by}</div>
                                     )}
                                   </div>
                                 </div>
                               )}
                             </div>
                          )}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* --- RÅDGIVERE (Sektion 5) --- */}
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
                <div className="p-4 border-t bg-gray-50/50">
                    {isLoadingRaadgivere ? (
                        <div className="p-8 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
                    ) : (
                        <RaadgiverStyring
                          sagId={sag.id}
                          initialTilknytninger={raadgiverTilknytninger}
                          onTilknytningOpdateret={handlePartOpdateret}
                        />
                    )}
                  </div>
            )}
        </div>
        
        
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

        {/* --- KOMMUNE (Sektion 7) --- */}
        <div className="border rounded shadow-sm bg-white overflow-hidden">
            <div
                 className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
                 onClick={() => handleToggleSection('kommune')}
            >
                <div className="flex items-center">
                    <MapPin size={20} className="mr-3 text-gray-500" />
                     <h2 className="text-xl font-semibold">Kommune</h2>
                </div>
                <span className="text-xl transform transition-transform duration-200">
                    {openSection === 'kommune' ? '▼' : '►'}
                </span>
            </div>
            {openSection === 'kommune' && (
                <div className="p-4 border-t bg-gray-50/50">
                    {!sag.kommunekode ? (
                        <p className="text-sm text-gray-500 italic">Sagen mangler kommunekode. Opdater adressen for at se kommune-info.</p>
                    ) : isLoadingKommune ? (
                        <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
                    ) : kommuneAdresser.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">Ingen kommunale adresser fundet for kode {sag.kommunekode}.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {kommuneAdresser.map(k => (
                                <div key={k.id} className="bg-white p-4 rounded shadow-sm border">
                                    <h3 className="font-bold text-gray-800 mb-1">{k.navn}</h3>
                                     {k.afdeling && <div className="text-sm font-semibold text-blue-600 mb-2">{k.afdeling}</div>}
                                    
                                     <div className="space-y-1 text-sm text-gray-600">
                                        {(k.adresse_vej || k.adresse_postnr) && (
                                            <div className="flex items-start space-x-2">
                                                <Home size={14} className="mt-0.5 text-gray-400" />
                                                <div>
                                                    <div>{k.adresse_vej}</div>
                                                    <div>{k.adresse_postnr} {k.adresse_by}</div>
                                                </div>
                                            </div>
                                        )}
                                         {k.telefon && (
                                            <div className="flex items-center space-x-2">
                                                <Phone size={14} className="text-gray-400" />
                                                <span>{k.telefon}</span>
                                             </div>
                                        )}
                                        {k.email && (
                                            <div className="flex items-center space-x-2">
                                                <Mail size={14} className="text-gray-400" />
                                                 <a href={`mailto:${k.email}`} className="text-blue-600 hover:underline">{k.email}</a>
                                            </div>
                                         )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
        
        {/* @# 2025-11-22 11:15 - START: Opdateret FORSYNING (Sektion 8) */}
        {/* @# 2025-11-22 15:35 - RETTELSE: Fjernet 'overflow-hidden' så dropdown kan ses */}
        <div className="border rounded shadow-sm bg-white">
            <div
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => handleToggleSection('forsyning')}
            >
                <div className="flex items-center">
                    <Waves size={20} className="mr-3 text-gray-500" />
                    <h2 className="text-xl font-semibold">Forsyning</h2>
                </div>
                <span className="text-xl transform transition-transform duration-200">
                    {openSection === 'forsyning' ? '▼' : '►'}
                </span>
            </div>
            {openSection === 'forsyning' && (
                <div className="p-4 border-t bg-gray-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        
                        {/* VAND */}
                        <div className="bg-white p-4 rounded shadow-sm border">
                            <div className="flex items-center mb-3 text-blue-600">
                                <Droplet size={20} className="mr-2" />
                                <h3 className="font-semibold text-gray-700">Vand</h3>
                            </div>
                            <SearchableSelect 
                                options={getForsyningsOptions('vand')}
                                value={sag.vand_virksomhed?.id || null}
                                onChange={(id) => handleForsyningChange(id, 'vand')}
                                placeholder="Vælg vandselskab..."
                                disabled={isSaving}
                                emptyMessage="Ingen vandselskaber fundet"
                            />
                            
                            {sag.vand_virksomhed && (
                                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                                    {/* Telefon */}
                                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                                        <Phone size={14} className="text-gray-400 flex-shrink-0" />
                                        <span>{sag.vand_virksomhed.telefon || "-"}</span>
                                    </div>

                                    {/* Email */}
                                    <div className="flex items-center space-x-2 text-sm">
                                        <Mail size={14} className="text-gray-400 flex-shrink-0" />
                                        {sag.vand_virksomhed.email ? (
                                            <>
                                                <a href={`mailto:${sag.vand_virksomhed.email}`} className="text-blue-600 hover:underline truncate">
                                                    {sag.vand_virksomhed.email}
                                                </a>
                                                <button
                                                    onClick={(e) => handleCopy(sag.vand_virksomhed!.email!, 'vand-email', e)}
                                                    title="Kopier email"
                                                    className="p-0.5 rounded-md hover:bg-gray-200 flex-shrink-0"
                                                >
                                                    {copiedId === 'vand-email' ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-blue-500 hover:text-blue-700" />}
                                                </button>
                                            </>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </div>

                                    {/* Adresse */}
                                    <div className="flex items-start space-x-3 text-sm text-gray-600">
                                        <Home size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            {(sag.vand_virksomhed.adresse_vej || sag.vand_virksomhed.adresse_postnr) ? (
                                                <>
                                                    <div>{sag.vand_virksomhed.adresse_vej}</div>
                                                    <div>{sag.vand_virksomhed.adresse_postnr} {sag.vand_virksomhed.adresse_by}</div>
                                                </>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* VARME */}
                        <div className="bg-white p-4 rounded shadow-sm border">
                            <div className="flex items-center mb-3 text-red-600">
                                <Flame size={20} className="mr-2" />
                                <h3 className="font-semibold text-gray-700">Varme</h3>
                            </div>
                            <SearchableSelect 
                                options={getForsyningsOptions('varme')}
                                value={sag.varme_virksomhed?.id || null}
                                onChange={(id) => handleForsyningChange(id, 'varme')}
                                placeholder="Vælg varmeselskab..."
                                disabled={isSaving}
                                emptyMessage="Ingen varmeselskaber fundet"
                            />
                            
                            {sag.varme_virksomhed && (
                                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                                    {/* Telefon */}
                                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                                        <Phone size={14} className="text-gray-400 flex-shrink-0" />
                                        <span>{sag.varme_virksomhed.telefon || "-"}</span>
                                    </div>

                                    {/* Email */}
                                    <div className="flex items-center space-x-2 text-sm">
                                        <Mail size={14} className="text-gray-400 flex-shrink-0" />
                                        {sag.varme_virksomhed.email ? (
                                            <>
                                                <a href={`mailto:${sag.varme_virksomhed.email}`} className="text-blue-600 hover:underline truncate">
                                                    {sag.varme_virksomhed.email}
                                                </a>
                                                <button
                                                    onClick={(e) => handleCopy(sag.varme_virksomhed!.email!, 'varme-email', e)}
                                                    title="Kopier email"
                                                    className="p-0.5 rounded-md hover:bg-gray-200 flex-shrink-0"
                                                >
                                                    {copiedId === 'varme-email' ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-blue-500 hover:text-blue-700" />}
                                                </button>
                                            </>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </div>

                                    {/* Adresse */}
                                    <div className="flex items-start space-x-3 text-sm text-gray-600">
                                        <Home size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            {(sag.varme_virksomhed.adresse_vej || sag.varme_virksomhed.adresse_postnr) ? (
                                                <>
                                                    <div>{sag.varme_virksomhed.adresse_vej}</div>
                                                    <div>{sag.varme_virksomhed.adresse_postnr} {sag.varme_virksomhed.adresse_by}</div>
                                                </>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SPILDEVAND */}
                        <div className="bg-white p-4 rounded shadow-sm border">
                            <div className="flex items-center mb-3 text-green-700">
                                <Waves size={20} className="mr-2" />
                                <h3 className="font-semibold text-gray-700">Spildevand</h3>
                            </div>
                            <SearchableSelect 
                                options={getForsyningsOptions('spildevand')}
                                value={sag.spildevand_virksomhed?.id || null}
                                onChange={(id) => handleForsyningChange(id, 'spildevand')}
                                placeholder="Vælg spildevand..."
                                disabled={isSaving}
                                emptyMessage="Ingen spildevandsselskaber fundet"
                            />
                            
                            {sag.spildevand_virksomhed && (
                                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                                    {/* Telefon */}
                                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                                        <Phone size={14} className="text-gray-400 flex-shrink-0" />
                                        <span>{sag.spildevand_virksomhed.telefon || "-"}</span>
                                    </div>

                                    {/* Email */}
                                    <div className="flex items-center space-x-2 text-sm">
                                        <Mail size={14} className="text-gray-400 flex-shrink-0" />
                                        {sag.spildevand_virksomhed.email ? (
                                            <>
                                                <a href={`mailto:${sag.spildevand_virksomhed.email}`} className="text-blue-600 hover:underline truncate">
                                                    {sag.spildevand_virksomhed.email}
                                                </a>
                                                <button
                                                    onClick={(e) => handleCopy(sag.spildevand_virksomhed!.email!, 'spild-email', e)}
                                                    title="Kopier email"
                                                    className="p-0.5 rounded-md hover:bg-gray-200 flex-shrink-0"
                                                >
                                                    {copiedId === 'spild-email' ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-blue-500 hover:text-blue-700" />}
                                                </button>
                                            </>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </div>

                                    {/* Adresse */}
                                    <div className="flex items-start space-x-3 text-sm text-gray-600">
                                        <Home size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            {(sag.spildevand_virksomhed.adresse_vej || sag.spildevand_virksomhed.adresse_postnr) ? (
                                                <>
                                                    <div>{sag.spildevand_virksomhed.adresse_vej}</div>
                                                    <div>{sag.spildevand_virksomhed.adresse_postnr} {sag.spildevand_virksomhed.adresse_by}</div>
                                                </>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}
        </div>
        {/* @# 2025-11-22 11:15 - SLUT */}

      </div>
    </div>
  );
}

export default SagsdetaljerPage;