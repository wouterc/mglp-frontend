// --- Fil: src/components/RaadgiverStyring.tsx ---
// @# 2025-11-17 19:50 - Oprettet ny komponent til Rådgiver-tilknytninger
// @# 2025-11-17 20:05 - Rettet manglende import af 'User'-ikon
import React, { useState, useEffect, useCallback, MouseEvent, useMemo } from 'react';
import { API_BASE_URL } from '../config';
import { Kontakt, Virksomhed, Rolle, SagRaadgiverTilknytning } from '../types';
import useDebounce from '../hooks/useDebounce';
// @# 2025-11-17 20:05 - Tilføjet 'User'
import { X, UserPlus, Loader2, Search, User, Edit, Copy, Check, Mail, Phone, Home, Building } from 'lucide-react';
import KontaktForm from './KontaktForm';
import VirksomhedForm from './VirksomhedForm';
import Modal from './Modal';
import Button from './ui/Button';

interface RaadgiverStyringProps {
  sagId: number;
  initialTilknytninger: SagRaadgiverTilknytning[];
  onTilknytningOpdateret: () => void; // Bruges til at gen-hente sagen
}

// Minimal type til søgeresultater
type SoegeResultat = 
  | { type: 'virksomhed', data: Virksomhed }
  | { type: 'kontakt', data: Kontakt };

// Helper til at formatere adresse
const formatAdresse = (k: Kontakt | Virksomhed | null) => {
  if (!k) return 'Adresse mangler';
  const parts = [k.adresse_vej, k.adresse_postnr, k.adresse_by].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Adresse mangler';
};

function RaadgiverStyring({ sagId, initialTilknytninger, onTilknytningOpdateret }: RaadgiverStyringProps) {
  const [tilknytninger, setTilknytninger] = useState<SagRaadgiverTilknytning[]>(initialTilknytninger);
  const [soegning, setSoegning] = useState('');
  const [soegeresultater, setSoegeresultater] = useState<SoegeResultat[]>([]);
  
  // States til formularer
  const [visKontaktForm, setVisKontaktForm] = useState(false);
  const [visVirksomhedForm, setVisVirksomhedForm] = useState(false);
  const [kontaktTilRedigering, setKontaktTilRedigering] = useState<Kontakt | null>(null);
  
  // States til sletning
  const [tilknytningTilSletning, setTilknytningTilSletning] = useState<SagRaadgiverTilknytning | null>(null);

  // States til UI
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [raadgiverRolleId, setRaadgiverRolleId] = useState<number | null>(null);
  const debouncedSoegning = useDebounce(soegning, 300);

  useEffect(() => {
    setTilknytninger(initialTilknytninger);
  }, [initialTilknytninger]);

  // 1. Find ID'et for "Rådgiver" rollen ved indlæsning
  useEffect(() => {
    const fetchRaadgiverRolleId = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/register/roller/?er_raadgiver_kontakt=true`);
        const data: Rolle[] = await res.json();
        if (data.length > 0) {
          setRaadgiverRolleId(data[0].id);
        } else {
          console.error("KRITISK FEJL: Kunne ikke finde en 'Rådgiver-kontakt'-rolle i systemet (er_raadgiver_kontakt=true).");
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchRaadgiverRolleId();
  }, []);

  // 2. Søg efter både virksomheder og kontakter
  useEffect(() => {
    const searchAlle = async () => {
      if (debouncedSoegning.length < 2) {
        setSoegeresultater([]);
        return;
      }
      setIsLoading(true);
      try {
        // Find ID-liste over allerede tilknyttede
        const tilknyttedeVirksomhedIds = new Set(tilknytninger.map(t => t.virksomhed?.id).filter(Boolean));
        const tilknyttedeKontaktIds = new Set(tilknytninger.map(t => t.kontakt?.id).filter(Boolean));

        // Søg efter virksomheder
        const vParams = new URLSearchParams({ search: debouncedSoegning, er_raadgiver: 'true' });
        const vRes = await fetch(`${API_BASE_URL}/register/virksomheder/?${vParams.toString()}`);
        const vData = await vRes.json();
        const vListe: Virksomhed[] = (Array.isArray(vData) ? vData : vData.results) || [];
        
        // Søg efter kontakter
        const kParams = new URLSearchParams({ search: debouncedSoegning, er_raadgiver_kontakt: 'true' });
        const kRes = await fetch(`${API_BASE_URL}/register/kontakter/?${kParams.toString()}`);
        const kData = await kRes.json();
        const kListe: Kontakt[] = (Array.isArray(kData) ? kData : kData.results) || [];

        // Kombiner resultater og filtrer dem, der allerede er tilføjet
        const vResultater: SoegeResultat[] = vListe
          .filter(v => !tilknyttedeVirksomhedIds.has(v.id))
          .map(v => ({ type: 'virksomhed', data: v }));
          
        const kResultater: SoegeResultat[] = kListe
          .filter(k => !tilknyttedeKontaktIds.has(k.id))
          .map(k => ({ type: 'kontakt', data: k }));

        setSoegeresultater([...vResultater, ...kResultater]);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    searchAlle();
  }, [debouncedSoegning, tilknytninger]);

  // 3. API-kald til at oprette/slette en tilknytning
  const opretTilknytning = async (payload: { virksomhed_id?: number | null, kontakt_id?: number | null }) => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sager/raadgivere/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sag_id: sagId,
          ...payload
        }),
      });
      if (!res.ok) throw new Error("Kunne ikke oprette tilknytning");
      
      onTilknytningOpdateret(); // Fortæl parent at den skal gen-hente sagen
      setSoegning('');
      setSoegeresultater([]);
      
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const sletTilknytning = async (tilknytningId: number) => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sager/raadgivere/${tilknytningId}/`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error("Kunne ikke slette tilknytning");
      onTilknytningOpdateret(); // Fortæl parent at den skal gen-hente sagen
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Håndter valg fra søgeresultater
  const handleSoegevalg = (valg: SoegeResultat) => {
    if (valg.type === 'virksomhed') {
      opretTilknytning({ virksomhed_id: valg.data.id, kontakt_id: null });
    } else {
      // Hvis kontakten har et firma, tilføj begge. Ellers kun kontakten.
      if (valg.data.virksomhed) {
        opretTilknytning({ virksomhed_id: valg.data.virksomhed.id, kontakt_id: valg.data.id });
      } else {
        opretTilknytning({ virksomhed_id: null, kontakt_id: valg.data.id });
      }
    }
  };

  // 5. Håndter sletning
  const handleFjernTilknytning = (tilknytning: SagRaadgiverTilknytning) => {
    setTilknytningTilSletning(tilknytning);
  };

  const handleLukSletModal = () => {
    setTilknytningTilSletning(null);
  };
  
  const handleBekræftSlet = () => {
    if (!tilknytningTilSletning) return;
    sletTilknytning(tilknytningTilSletning.id);
    handleLukSletModal();
  };

  // 6. Håndter "Opret ny"
  const handleOpretNyKontakt = () => {
    if (raadgiverRolleId === null) {
      alert("Fejl: Rådgiver-rolle ID kunne ikke findes.");
      return;
    }
    setKontaktTilRedigering(null);
    setVisKontaktForm(true);
  };
  
  const handleOpretNyVirksomhed = () => {
    // TODO: Vi mangler en måde at auto-vælge "Rådgiver" gruppen på.
    // Lige nu åbner den bare en tom virksomheds-form.
    setVisVirksomhedForm(true);
  };

  // 7. Håndter formular-lukning og -gem
  const handleFormLuk = () => {
    setVisKontaktForm(false);
    setVisVirksomhedForm(false);
    setKontaktTilRedigering(null);
  };

  const handleFormSave = (nyData: Kontakt | Virksomhed, type: 'kontakt' | 'virksomhed') => {
    handleFormLuk();
    if (type === 'kontakt') {
      opretTilknytning({ kontakt_id: nyData.id, virksomhed_id: (nyData as Kontakt).virksomhed?.id || null });
    } else {
      opretTilknytning({ virksomhed_id: nyData.id, kontakt_id: null });
    }
  };

  // 8. Håndter kopiering
  const handleCopy = (text: string, key: string, e: MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text).then(() => {
          setCopiedId(key);
          setTimeout(() => setCopiedId(null), 2000);
      });
  };

  // Sortering
  const sorteredeTilknytninger = useMemo(() => {
    return [...tilknytninger].sort((a, b) => {
      const aNavn = a.virksomhed?.navn || a.kontakt?.fulde_navn || '';
      const bNavn = b.virksomhed?.navn || b.kontakt?.fulde_navn || '';
      return aNavn.localeCompare(bNavn);
    });
  }, [tilknytninger]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      
      {/* --- FORMS (MODALS) --- */}
      {visKontaktForm && (
        <KontaktForm
          onCancel={handleFormLuk}
          kontaktTilRedigering={kontaktTilRedigering}
          onSave={() => { /* Redigering håndteres ikke her endnu */ handleFormLuk(); onTilknytningOpdateret(); }}
          onSaveNyKontakt={(nyKontakt) => handleFormSave(nyKontakt, 'kontakt')}
          defaultRolleIds={raadgiverRolleId ? [raadgiverRolleId] : []}
        />
      )}
      
      {visVirksomhedForm && (
        <VirksomhedForm
          onCancel={handleFormLuk}
          virksomhedTilRedigering={null}
          onSave={() => {
            // Dette er en "hacky" måde at få fat i den nyeste virksomhed på.
            // Bør ideelt set returneres fra onSave.
            onTilknytningOpdateret(); 
            handleFormLuk();
            // Vi kan ikke automatisk tilføje den her, da vi ikke kender ID'et.
          }}
        />
      )}

      {/* Bekræft Sletning Modal */}
      <Modal
        isOpen={tilknytningTilSletning !== null}
        onClose={handleLukSletModal}
        title="Bekræft fjernelse"
      >
        <p>
          Er du sikker på, at du vil fjerne denne tilknytning fra sagen?
        </p>
        <div className="flex justify-end space-x-3 mt-6">
          <Button onClick={handleLukSletModal} variant="secondary">Annuller</Button>
          <Button onClick={handleBekræftSlet} variant="danger">Fjern</Button>
        </div>
      </Modal>

      {/* --- SØGEBOKS --- */}
      <div className="relative">
         <div className="relative">
          <input
            type="text"
            value={soegning}
            onChange={(e) => setSoegning(e.target.value)}
            placeholder="Søg efter rådgiver (firma eller person)..."
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
          />
           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
          </span>
        </div>
        
        {/* Søgeresultater */}
        {(soegeresultater.length > 0 || soegning.length > 0) && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            <ul>
               {soegeresultater.map(res => (
                <li
                  key={`${res.type}-${res.data.id}`}
                  onClick={() => handleSoegevalg(res)}
                  className="p-3 hover:bg-blue-50 cursor-pointer border-b"
                >
                   <div className="font-medium flex items-center">
                    {res.type === 'virksomhed' ? 
                        <Building size={16} className="mr-2 text-gray-500" /> : 
                        <User size={16} className="mr-2 text-gray-500" />}
                    {res.type === 'virksomhed' ? res.data.navn : res.data.fulde_navn}
                   </div>
                   <div className="text-sm text-gray-600 pl-8">
                     {res.type === 'kontakt' && res.data.virksomhed ? res.data.virksomhed.navn : formatAdresse(res.data)}
                   </div>
                </li>
               ))}
         
              {/* "Opret ny" knapper */}
              {soegeresultater.length === 0 && !isLoading && debouncedSoegning.length > 1 && (
                <>
                  <li
                    onClick={handleOpretNyVirksomhed}
                    className="p-3 text-blue-600 hover:bg-blue-50 cursor-pointer flex items-center"
                  >
                    <Building size={18} className="mr-2" />
                    Opret ny virksomhed...
                  </li>
                  <li
                    onClick={handleOpretNyKontakt}
                    className="p-3 text-blue-600 hover:bg-blue-50 cursor-pointer flex items-center"
                  >
                    <UserPlus size={18} className="mr-2" />
                    Opret ny kontaktperson...
                  </li>
                </>
              )}
            </ul>
          </div>
         )}
       </div>

      {/* --- LISTE OVER TILKNYTTEDE --- */}
      <div className="space-y-2 mt-4">
        {isSaving && <Loader2 size={16} className="animate-spin" />}
        {tilknytninger.length === 0 && (
          <p className="text-sm text-gray-500 italic">Ingen rådgivere tilknyttet.</p>
        )}
         
         {sorteredeTilknytninger.map(t => (
          <div key={t.id} className="p-3 bg-gray-100 rounded-md">
            
            <div className="flex justify-between items-start">
              {/* Info-blok */}
              <div className="space-y-2">
                {/* Virksomhed (hvis den findes) */}
                {t.virksomhed && (
                  <div className="flex items-center space-x-2">
                    <Building size={16} className="text-gray-600 flex-shrink-0" />
                    <span className="font-semibold text-gray-800">{t.virksomhed.navn}</span>
                  </div>
                )}
                
                {/* Kontakt (hvis den findes) */}
                {t.kontakt && (
                  <div className={`flex items-center space-x-2 ${t.virksomhed ? 'pl-8' : ''}`}>
                    <User size={16} className="text-gray-600 flex-shrink-0" />
                    <span className="font-medium text-gray-700">{t.kontakt.fulde_navn}</span>
                  </div>
                )}

                {/* Detaljer (viser fra kontakt HVIS den findes, ellers fra virksomhed) */}
                <div className={`space-y-1 text-xs text-gray-600 ${t.virksomhed || t.kontakt ? 'pl-8' : ''}`}>
                  {(t.kontakt || t.virksomhed) && (
                    <>
                      {/* Telefon */}
                      <div className="flex items-center space-x-2">
                        <Phone size={14} className="text-gray-400 flex-shrink-0" />
                        <span>{t.kontakt?.telefon || t.virksomhed?.telefon || <span className="italic">Mangler tlf.</span>}</span>
                      </div>
                      
                      {/* Email */}
                      {(t.kontakt?.email || t.virksomhed?.email) && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => handleCopy((t.kontakt?.email || t.virksomhed?.email)!, `t-${t.id}-email`, e)}
                            title="Kopier email"
                            className="p-0.5 rounded-md hover:bg-gray-200"
                          >
                            {copiedId === `t-${t.id}-email` ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-blue-500" />}
                          </button>
                          <a href={`mailto:${t.kontakt?.email || t.virksomhed?.email}`} className="text-blue-600 hover:underline truncate">
                            {t.kontakt?.email || t.virksomhed?.email}
                          </a>
                        </div>
                      )}
                      
                      {/* Adresse */}
                      <div className="flex items-start space-x-1">
                        <button
                          onClick={(e) => handleCopy(formatAdresse(t.kontakt || t.virksomhed), `t-${t.id}-adr`, e)}
                          title="Kopier adresse"
                          className="p-0.5 rounded-md hover:bg-gray-200 mt-0.5"
                        >
                          {copiedId === `t-${t.id}-adr` ? <Check size={14} className="text-green-500" /> : <Home size={14} className="text-gray-400 hover:text-blue-700" />}
                        </button>
                        <div className="flex-col">
                          <div>{t.kontakt?.adresse_vej || t.virksomhed?.adresse_vej || <span className="italic">Mangler adresse</span>}</div>
                          <div>{t.kontakt?.adresse_postnr || t.virksomhed?.adresse_postnr} {t.kontakt?.adresse_by || t.virksomhed?.adresse_by}</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Knap-blok */}
              <div className="flex-shrink-0">
                {/* <button
                  onClick={() => alert("Redigering af tilknytning er ikke implementeret")}
                  className="p-1 text-blue-600 hover:text-blue-800"
                  title="Rediger tilknytning"
                >
                  <Edit size={18} />
                </button> */}
                <button
                  onClick={() => handleFjernTilknytning(t)}
                  className="p-1 text-red-500 hover:text-red-700"
                  title="Fjern tilknytning"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
       </div>
    </div>
  );
}

export default RaadgiverStyring;