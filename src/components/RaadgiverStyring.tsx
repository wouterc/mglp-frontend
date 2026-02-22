// --- Fil: src/components/RaadgiverStyring.tsx ---
// @# 2025-11-17 19:50 - Oprettet ny komponent til Rådgiver-tilknytninger
// @# 2025-11-23 12:00 - Tilføjet redigerings-ikoner.
// @# 2025-11-23 13:30 - Rettet: Tilføjet Mail import og explicit typing af 'ny' parameter.
// @# 2025-11-23 15:45 - Rettet: Henter nu FULDE kontakt-data ved redigering (fixer tomt skema).
import React, { useState, useEffect, useMemo, MouseEvent } from 'react';
import { api } from '../api';
import { Kontakt, Virksomhed, Rolle, SagRaadgiverTilknytning } from '../types';
import useDebounce from '../hooks/useDebounce';
import { X, UserPlus, Loader2, Search, User, Edit, Copy, Check, Phone, Home, Building, Mail } from 'lucide-react';
import KontaktForm from './KontaktForm';
import VirksomhedForm from './VirksomhedForm';
import Modal from './Modal';
import Button from './ui/Button';

interface RaadgiverStyringProps {
  sagId: number;
  initialTilknytninger: SagRaadgiverTilknytning[];
  onTilknytningOpdateret: () => void;
}

type SoegeResultat =
  | { type: 'virksomhed', data: Virksomhed }
  | { type: 'kontakt', data: Kontakt };

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

  // Redigerings-states
  const [kontaktTilRedigering, setKontaktTilRedigering] = useState<Kontakt | null>(null);
  const [virksomhedTilRedigering, setVirksomhedTilRedigering] = useState<Virksomhed | null>(null);

  // State til at vise loading-spinner PÅ selve rediger-knappen
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);

  const [tilknytningTilSletning, setTilknytningTilSletning] = useState<SagRaadgiverTilknytning | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [raadgiverRolleId, setRaadgiverRolleId] = useState<number | null>(null);
  const debouncedSoegning = useDebounce(soegning, 300);

  useEffect(() => {
    setTilknytninger(initialTilknytninger);
  }, [initialTilknytninger]);

  useEffect(() => {
    const fetchRaadgiverRolleId = async () => {
      try {
        const data = await api.get<Rolle[]>('/register/roller/?er_raadgiver_kontakt=true');
        if (data.length > 0) {
          setRaadgiverRolleId(data[0].id);
        } else {
          console.error("KRITISK FEJL: Kunne ikke finde en 'Rådgiver-kontakt'-rolle i systemet.");
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchRaadgiverRolleId();
  }, []);

  useEffect(() => {
    const searchAlle = async () => {
      if (debouncedSoegning.length < 2) {
        setSoegeresultater([]);
        return;
      }
      setIsLoading(true);
      try {
        const tilknyttedeVirksomhedIds = new Set(tilknytninger.map(t => t.virksomhed?.id).filter(Boolean));
        const tilknyttedeKontaktIds = new Set(tilknytninger.map(t => t.kontakt?.id).filter(Boolean));

        const vParams = new URLSearchParams({ search: debouncedSoegning, er_raadgiver: 'true' });
        const vData = await api.get<any>(`/register/virksomheder/?${vParams.toString()}`);
        const vListe: Virksomhed[] = (Array.isArray(vData) ? vData : vData.results) || [];

        const kParams = new URLSearchParams({ search: debouncedSoegning, er_raadgiver_kontakt: 'true' });
        const kData = await api.get<any>(`/register/kontakter/?${kParams.toString()}`);
        const kListe: Kontakt[] = (Array.isArray(kData) ? kData : kData.results) || [];

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

  const opretTilknytning = async (payload: { virksomhed_id?: number | null, kontakt_id?: number | null }) => {
    setIsSaving(true);
    try {
      await api.post(`/sager/raadgivere/`, { sag_id: sagId, ...payload });
      onTilknytningOpdateret();
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
      await api.delete(`/sager/raadgivere/${tilknytningId}/`);
      onTilknytningOpdateret();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSoegevalg = (valg: SoegeResultat) => {
    if (valg.type === 'virksomhed') {
      opretTilknytning({ virksomhed_id: valg.data.id, kontakt_id: null });
    } else {
      if (valg.data.virksomhed) {
        opretTilknytning({ virksomhed_id: valg.data.virksomhed.id, kontakt_id: valg.data.id });
      } else {
        opretTilknytning({ virksomhed_id: null, kontakt_id: valg.data.id });
      }
    }
  };

  const handleFjernTilknytning = (tilknytning: SagRaadgiverTilknytning) => setTilknytningTilSletning(tilknytning);
  const handleLukSletModal = () => setTilknytningTilSletning(null);
  const handleBekræftSlet = () => { if (tilknytningTilSletning) sletTilknytning(tilknytningTilSletning.id); handleLukSletModal(); };

  const handleOpretNyKontakt = () => {
    if (raadgiverRolleId === null) { alert("Fejl: Rådgiver-rolle ID mangler."); return; }
    setKontaktTilRedigering(null);
    setVisKontaktForm(true);
  };

  const handleOpretNyVirksomhed = () => {
    setVirksomhedTilRedigering(null);
    setVisVirksomhedForm(true);
  };

  // @# RETTELSE: Hent fulde data for kontakten før redigering
  const handleRedigerKontakt = async (kontakt: Kontakt, uniqueKey: string) => {
    setLoadingEditId(uniqueKey);
    try {
      const fuldKontakt = await api.get<Kontakt>(`/register/kontakter/${kontakt.id}/`);
      setKontaktTilRedigering(fuldKontakt);
      setVisKontaktForm(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingEditId(null);
    }
  };

  const handleRedigerVirksomhed = (virksomhed: Virksomhed) => {
    setVirksomhedTilRedigering(virksomhed);
    setVisVirksomhedForm(true);
  };

  const handleFormLuk = () => {
    setVisKontaktForm(false);
    setVisVirksomhedForm(false);
    setKontaktTilRedigering(null);
    setVirksomhedTilRedigering(null);
  };

  const handleKontaktSave = (nyKontakt?: Kontakt) => {
    handleFormLuk();
    if (nyKontakt) {
      opretTilknytning({ kontakt_id: nyKontakt.id, virksomhed_id: nyKontakt.virksomhed?.id || null });
    } else {
      onTilknytningOpdateret();
    }
  };

  const handleVirksomhedSave = (nyVirksomhed?: Virksomhed) => {
    handleFormLuk();
    if (nyVirksomhed) {
      opretTilknytning({ virksomhed_id: nyVirksomhed.id, kontakt_id: null });
    } else {
      onTilknytningOpdateret();
    }
  };

  const handleCopy = (text: string, key: string, e: MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const sorteredeTilknytninger = useMemo(() => {
    return [...tilknytninger].sort((a, b) => {
      const aNavn = a.virksomhed?.navn || a.kontakt?.fulde_navn || '';
      const bNavn = b.virksomhed?.navn || b.kontakt?.fulde_navn || '';
      return aNavn.localeCompare(bNavn);
    });
  }, [tilknytninger]);

  return (
    <div className="bg-white rounded-lg">

      {visKontaktForm && (
        <KontaktForm
          onCancel={handleFormLuk}
          kontaktTilRedigering={kontaktTilRedigering}
          onSave={() => handleKontaktSave()}
          onSaveNyKontakt={(ny) => handleKontaktSave(ny)}
          defaultRolleIds={raadgiverRolleId ? [raadgiverRolleId] : []}
        />
      )}

      {visVirksomhedForm && (
        <VirksomhedForm
          onCancel={handleFormLuk}
          virksomhedTilRedigering={virksomhedTilRedigering}
          onSave={() => handleVirksomhedSave()}
          onSaveNyVirksomhed={(ny) => handleVirksomhedSave(ny)}
        />
      )}

      <Modal isOpen={tilknytningTilSletning !== null} onClose={handleLukSletModal} title="Bekræft fjernelse">
        <p>Er du sikker på, at du vil fjerne denne rådgiver fra sagen?</p>
        <div className="flex justify-end space-x-3 mt-6">
          <Button onClick={handleLukSletModal} variant="secondary">Annuller</Button>
          <Button onClick={handleBekræftSlet} variant="danger">Fjern</Button>
        </div>
      </Modal>

      {/* Søgeboks */}
      <div className="relative mb-4">
        <div className="relative">
          <label htmlFor="raadgiver_soeg" className="sr-only">Søg efter rådgiver</label>
          <input
            id="raadgiver_soeg"
            name="raadgiver_soeg"
            type="text"
            value={soegning}
            onChange={(e) => setSoegning(e.target.value)}
            placeholder="Søg efter rådgiver (firma eller person)..."
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
          </span>
        </div>

        {(soegeresultater.length > 0 || soegning.length > 0) && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            <ul>
              {soegeresultater.map(res => (
                <li key={`${res.type}-${res.data.id}`} onClick={() => handleSoegevalg(res)} className="p-3 hover:bg-blue-50 cursor-pointer border-b flex justify-between items-center">
                  <div>
                    <div className="font-medium flex items-center">
                      {res.type === 'virksomhed' ? <Building size={16} className="mr-2 text-gray-500" /> : <User size={16} className="mr-2 text-gray-500" />}
                      {res.type === 'virksomhed' ? res.data.navn : res.data.fulde_navn}
                    </div>
                    <div className="text-sm text-gray-600 pl-6">
                      {res.type === 'kontakt' && res.data.virksomhed ? res.data.virksomhed.navn : formatAdresse(res.data)}
                    </div>
                  </div>
                </li>
              ))}
              {soegeresultater.length === 0 && !isLoading && debouncedSoegning.length > 1 && (
                <>
                  <li onClick={handleOpretNyVirksomhed} className="p-3 text-blue-600 hover:bg-blue-50 cursor-pointer flex items-center">
                    <Building size={18} className="mr-2" /> Opret ny virksomhed...
                  </li>
                  <li onClick={handleOpretNyKontakt} className="p-3 text-blue-600 hover:bg-blue-50 cursor-pointer flex items-center">
                    <UserPlus size={18} className="mr-2" /> Opret ny kontaktperson...
                  </li>
                </>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {isSaving && <div className="flex justify-center"><Loader2 size={24} className="animate-spin text-blue-600" /></div>}
        {tilknytninger.length === 0 && <p className="text-sm text-gray-500 italic text-center py-4">Ingen rådgivere tilknyttet.</p>}

        {sorteredeTilknytninger.map(t => (
          <div key={t.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
            <div className="flex justify-between items-start">

              <div className="space-y-3 w-full">
                {/* Virksomhed */}
                {t.virksomhed && (
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center space-x-2">
                      <Building size={18} className="text-blue-600 flex-shrink-0" />
                      <span className="font-semibold text-gray-800 text-lg">{t.virksomhed.navn}</span>
                    </div>
                    <button
                      onClick={() => handleRedigerVirksomhed(t.virksomhed!)}
                      className="text-gray-400 hover:text-blue-600 p-1 transition-colors"
                      title="Rediger virksomhed"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                )}

                {/* Kontakt */}
                {t.kontakt && (
                  <div className={`flex items-center justify-between group ${t.virksomhed ? 'pl-6 border-l-2 border-gray-200 ml-1' : ''}`}>
                    <div className="flex items-center space-x-2">
                      <User size={18} className="text-gray-600 flex-shrink-0" />
                      <span className="font-medium text-gray-700">{t.kontakt.fulde_navn}</span>
                    </div>
                    <button
                      onClick={() => handleRedigerKontakt(t.kontakt!, `k-${t.id}`)}
                      className="text-gray-400 hover:text-blue-600 p-1 transition-colors"
                      title="Rediger kontakt"
                      disabled={loadingEditId === `k-${t.id}`}
                    >
                      {loadingEditId === `k-${t.id}` ? <Loader2 size={16} className="animate-spin" /> : <Edit size={16} />}
                    </button>
                  </div>
                )}

                {/* Info-linje */}
                <div className="pl-7 text-sm text-gray-500 space-y-1">
                  {(t.kontakt || t.virksomhed) && (
                    <>
                      <div className="flex items-center space-x-2">
                        <Phone size={14} className="text-gray-400" />
                        <span>{t.kontakt?.telefon || t.virksomhed?.telefon || "-"}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Mail size={14} className="text-gray-400" />
                        {t.kontakt?.email || t.virksomhed?.email ? (
                          <>
                            <a href={`mailto:${t.kontakt?.email || t.virksomhed?.email}`} className="text-blue-600 hover:underline">{t.kontakt?.email || t.virksomhed?.email}</a>
                            <button onClick={(e) => handleCopy((t.kontakt?.email || t.virksomhed?.email)!, `t-${t.id}-email`, e)} className="p-0.5 rounded hover:bg-gray-200">
                              {copiedId === `t-${t.id}-email` ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                            </button>
                          </>
                        ) : <span>-</span>}
                      </div>

                      <div className="flex items-start space-x-2">
                        <button onClick={(e) => handleCopy(formatAdresse(t.kontakt || t.virksomhed), `t-${t.id}-adr`, e)} className="mt-0.5 p-0.5 rounded hover:bg-gray-200">
                          {copiedId === `t-${t.id}-adr` ? <Check size={14} className="text-green-500" /> : <Home size={14} className="text-gray-400 hover:text-blue-600" />}
                        </button>
                        <div>
                          <div>{t.kontakt?.adresse_vej || t.virksomhed?.adresse_vej}</div>
                          <div>{t.kontakt?.adresse_postnr || t.virksomhed?.adresse_postnr} {t.kontakt?.adresse_by || t.virksomhed?.adresse_by}</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button onClick={() => handleFjernTilknytning(t)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors flex-shrink-0 ml-2">
                <X size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RaadgiverStyring;