// --- Fil: src/components/SaelgerStyring.tsx ---
// @# 2025-11-10 18:00 - Oprettet ny komponent til håndtering af Sælgere (M2M)
// @# 2025-11-10 18:15 - Rettet manglende import af 'User'-ikon.
// @# 2025-11-10 18:50 - Tilføjet 'Rediger'-knap og 'Bekræft sletning'-dialog.
// @# 2025-11-10 18:55 - Erstattet window.confirm med custom Modal komponent for sikrere sletning.
// @# 2025-11-10 20:20 - Tilføjet tlf/email og "kopier email"-knap til sælgerlisten.
// @# 2025-11-10 20:30 - Flyttet knapper op og justeret fontstørrelse på tlf/email.
// @# 2025-11-10 20:35 - Implementeret data-hentning før redigering af kontakt.
// @# 2025-11-10 20:40 - Tilføjet "Kopier alle emails"-knap ved titel.
// @# 2025-11-10 20:45 - Rettet 'setVisForm' til 'setVisKontaktForm'.
// @# 2025-11-10 21:15 - Viser altid tlf-ikon og "Kopier Adresse" er nu Home-ikonet (Request 1+2).
// @# 2025-11-10 21:30 - Implementeret logik for "Primær Sælger".
// @# 2025-11-10 21:45 - Flyttet "Primær" markering ned i detaljeblok og tilføjet tekst.
// @# 2025-11-10 21:55 - Justeret "Primær" layout og sorteringslogik (re-sorterer ikke live).
// @# 2025-11-10 22:15 - Flyttet "Primær" status/knap til navnelinjen (jf. billede).
// @# 2025-11-15 12:30 - Opdateret til at bruge genbrugelig Button-komponent
import React, { useState, useEffect, useCallback, MouseEvent, useMemo } from 'react';
import { api } from '../api';
import { Kontakt, Rolle, Sag } from '../types';
import useDebounce from '../hooks/useDebounce';
// @# 2025-11-10 21:30 - Importeret Star
import { X, UserPlus, Loader2, Search, User, Edit, Copy, Check, Mail, Phone, Home, Star } from 'lucide-react';
import KontaktForm from './KontaktForm';
// @# 2025-11-10 18:55 - Importeret Modal
import Modal from './Modal';
import Button from './ui/Button'; // Importer den nye knap

interface SaelgerStyringProps {
  sagId: number;
  initialSaelgere: Kontakt[];
  onSaelgerOpdateret: () => void;
  // @# 2025-11-10 21:30 - Tilføjet ny prop
  primaerSaelgerId: number | null;
}

// Helper til at vise adresse i søgeresultater
const formatAdresse = (k: Kontakt) => {
  const parts = [k.adresse_vej, k.adresse_postnr, k.adresse_by].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Adresse mangler';
};

function SaelgerStyring({ sagId, initialSaelgere, onSaelgerOpdateret, primaerSaelgerId }: SaelgerStyringProps) {
  const [saelgere, setSaelgere] = useState<Kontakt[]>(initialSaelgere);
  // @# 2025-11-10 21:55 - Lokal state til at styre primær ID (undgår "live" re-sortering)
  const [lokalPrimaerId, setLokalPrimaerId] = useState<number | null>(primaerSaelgerId);
  const [soegning, setSoegning] = useState('');
  const [soegeresultater, setSoegeresultater] = useState<Kontakt[]>([]);
  // @# 2025-11-10 20:45 - Rettet 'setVisForm' til 'setVisKontaktForm'
  const [visKontaktForm, setVisKontaktForm] = useState(false);
  const [kontaktTilRedigering, setKontaktTilRedigering] = useState<Kontakt | null>(null);
  // @# 2025-11-10 18:55 - Ny state til at styre slette-modal.
  // Gemmer kontakten, vi vil slette.
  const [kontaktTilSletning, setKontaktTilSletning] = useState<Kontakt | null>(null);
  // @# 2025-11-10 20:20 - Ny state til "kopier email"-knap
  const [copiedEmailId, setCopiedEmailId] = useState<number | null>(null);
  // @# 2025-11-10 21:10 - Ny state til "kopier adresse"
  const [copiedAddressId, setCopiedAddressId] = useState<number | null>(null);
  // @# 2025-11-10 20:40 - Ny state til "kopier alle"
  const [isCopiedAll, setIsCopiedAll] = useState<boolean>(false);
  // @# 2025-11-10 20:35 - Ny state til at vise loading på den specifikke rediger-knap
  const [loadingKontaktId, setLoadingKontaktId] = useState<number | null>(null);

  const [saelgerRolleId, setSaelgerRolleId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const debouncedSoegning = useDebounce(soegning, 300);

  useEffect(() => {
    setSaelgere(initialSaelgere);
    // @# 2025-11-10 21:55 - Opdater lokal state når props ændres
    setLokalPrimaerId(primaerSaelgerId);
  }, [initialSaelgere, primaerSaelgerId]);

  // 1. Find ID'et for "Sælger"-rollen ved indlæsning
  useEffect(() => {
    const fetchSaelgerRolleId = async () => {
      try {
        const data = await api.get<Rolle[]>('/register/roller/?er_saelger=true');
        if (data.length > 0) {
          setSaelgerRolleId(data[0].id);
        } else {
          console.error("KRITISK FEJL: Kunne ikke finde en 'Sælger'-rolle i systemet (er_saelger=true).");
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchSaelgerRolleId();
  }, []);

  // 2. Søg efter kontakter, når brugeren taster
  useEffect(() => {
    const searchKontakter = async () => {
      if (debouncedSoegning.length < 2) {
        setSoegeresultater([]);
        return;
      }
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          search: debouncedSoegning,
          er_saelger: 'true'
        });
        const data = await api.get<any>(`/register/kontakter/?${params.toString()}`);
        const liste: Kontakt[] = Array.isArray(data) ? data : data.results;

        const saelgerIds = saelgere.map(s => s.id);
        const filtreredeResultater = liste.filter(k => !saelgerIds.includes(k.id));
        setSoegeresultater(filtreredeResultater);

      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    searchKontakter();
  }, [debouncedSoegning, saelgere]);

  // @# 2025-11-10 21:30 - START: Omdøbt og generaliseret patch-funktion
  // 3. Gem opdateringer til Sagen
  const patchSagData = async (payload: { [key: string]: any }, refreshParent: boolean = true) => {
    setIsSaving(true);
    try {
      await api.patch(`/sager/${sagId}/`, payload);

      // @# 2025-11-10 21:55 - Kald kun onSaelgerOpdateret når det er nødvendigt
      if (refreshParent) {
        onSaelgerOpdateret();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };
  // @# 2025-11-10 21:30 - SLUT

  // @# 2025-11-10 21:30 - START: Opdateret til at håndtere 'primaer_saelger' (Request 4)
  // 4. Funktion til at TILFØJE en eksisterende kontakt
  const handleTilfoejSaelger = (kontakt: Kontakt) => {
    const nyeSaelgerIds = [...saelgere.map(s => s.id), kontakt.id];
    const payload: { saelgere_ids: number[]; primaer_saelger_id?: number } = {
      saelgere_ids: nyeSaelgerIds
    };

    // Hvis dette er den FØRSTE sælger, sæt som primær.
    if (saelgere.length === 0) {
      payload.primaer_saelger_id = kontakt.id;
    }

    patchSagData(payload, true); // Refresh parent
    setSoegning('');
    // Nulstil søgefelt
    setSoegeresultater([]);
  };
  // @# 2025-11-10 21:30 - SLUT

  // 5. Funktion til at FJERNE en tilknyttet kontakt
  const handleFjernSaelger = (kontakt: Kontakt) => {
    // @# 2025-11-10 18:55 - I stedet for window.confirm, åbner vi modalen
    setKontaktTilSletning(kontakt);
  };

  // @# 2025-11-10 18:55 - START: Nye funktioner til slette-modal
  const handleLukSletModal = () => {
    setKontaktTilSletning(null);
  };

  // @# 2025-11-10 21:30 - START: Opdateret til at håndtere 'primaer_saelger'
  const handleBekræftSlet = () => {
    if (!kontaktTilSletning) return;
    const nyeSaelgerIds = saelgere.map(s => s.id).filter(id => id !== kontaktTilSletning.id);

    const payload: { saelgere_ids: number[]; primaer_saelger_id?: number | null } = {
      saelgere_ids: nyeSaelgerIds
    };

    // Hvis vi sletter den primære sælger
    if (kontaktTilSletning.id === lokalPrimaerId) {
      // Sæt primær til den nye første i listen, eller null hvis listen er tom
      const nyPrimaerId = nyeSaelgerIds.length > 0 ? nyeSaelgerIds[0] : null;
      payload.primaer_saelger_id = nyPrimaerId;
      setLokalPrimaerId(nyPrimaerId); // Opdater lokalt
    }

    patchSagData(payload, true);
    // Refresh parent
    handleLukSletModal();
  };
  // @# 2025-11-10 21:30 - SLUT

  // @# 2025-11-10 20:20 - START: Ny funktion til at kopiere email
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
  // @# 2025-11-10 20:20 - SLUT

  // @# 2025-11-10 21:10 - START: Ny funktion til at kopiere adresse
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
      }).catch(err => console.error('Kunne ikke kopiere adresse:', err));
    }
  };
  // @# 2025-11-10 21:10 - SLUT

  // @# 2025-11-10 20:40 - START: Ny funktion til at kopiere ALLE emails
  const handleCopyAllEmails = (e: MouseEvent) => {
    e.stopPropagation();
    const emails = saelgere
      .map(s => s.email) // Få alle email-strenge (eller null)
      .filter(Boolean) as string[]; // Filtrer null/tomme strenge fra

    if (emails.length === 0) return;
    const emailString = emails.join(', ');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(emailString).then(() => {
        setIsCopiedAll(true);
        setTimeout(() => setIsCopiedAll(false), 2000);
      }).catch(err => {
        console.error('Kunne ikke kopiere alle emails:', err);
      });
    }
  };
  // @# 2025-11-10 20:40 - SLUT

  // @# 2025-11-10 21:55 - START: Opdateret 'setPrimær' (Request 2)
  // Funktion til at sætte primær sælger
  const handleSetPrimaer = (kontaktId: number) => {
    if (kontaktId === lokalPrimaerId) return; // Allerede primær
    setLokalPrimaerId(kontaktId); // Opdater lokalt UI med det samme
    patchSagData({ primaer_saelger_id: kontaktId }, false); // Opdater backend, men lad være med at refreshe parent
  };
  // @# 2025-11-10 21:55 - SLUT

  // 6. Håndter OPRET NY
  const handleOpretNy = () => {
    if (saelgerRolleId === null) {
      alert("Fejl: Sælger-rolle ID kunne ikke findes. Kan ikke oprette ny kontakt.");
      return;
    }
    setKontaktTilRedigering(null); // Sørg for at den er nulstillet
    setVisKontaktForm(true);
  };

  // @# 2025-11-10 20:35 - START: Opdateret handleRedigerSaelger
  // 7. Håndter REDIGER (henter fuld data først)
  const handleRedigerSaelger = async (kontakt: Kontakt) => {
    setLoadingKontaktId(kontakt.id); // Vis spinner på denne knap
    try {
      const fuldKontakt = await api.get<Kontakt>(`/register/kontakter/${kontakt.id}/`);
      setKontaktTilRedigering(fuldKontakt);
      setVisKontaktForm(true);
    } catch (error) {
      console.error(error);
      alert("Fejl: Kunne ikke hente kontakt-detaljer til redigering.");
    } finally {
      setLoadingKontaktId(null); // Stop spinner
    }
  };
  // @# 2025-11-10 20:35 - SLUT

  // 8. Fælles funktion til at lukke formen
  const handleFormLuk = () => {
    setVisKontaktForm(false);
    setKontaktTilRedigering(null);
  };

  // @# 2025-11-10 21:55 - START: Sortering (bruger nu 'primaerSaelgerId' fra prop)
  const sorteredeSaelgere = useMemo(() => {
    return [...saelgere].sort((a, b) => {
      // Sortering sker baseret på det 'primaerSaelgerId' der kom fra props (fra serveren)
      if (a.id === primaerSaelgerId) return -1;
      if (b.id === primaerSaelgerId) return 1;
      // Hvis ingen er primær, eller de begge ikke er, sorter alfabetisk
      return (a.fulde_navn || '').localeCompare(b.fulde_navn || '');

    });
  }, [saelgere, primaerSaelgerId]); // Lytter kun på prop, ikke lokal state
  // @# 2025-11-10 21:55 - SLUT

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">

      {/* KontaktForm (Opret/Rediger) */}
      {visKontaktForm && (
        <KontaktForm
          onCancel={handleFormLuk}
          kontaktTilRedigering={kontaktTilRedigering}


          onSave={() => {
            handleFormLuk();
            onSaelgerOpdateret(); // Fortæl parent at den skal gen-hente sagen
          }}
          onSaveNyKontakt={(nyKontakt) => {
            handleFormLuk();
            handleTilfoejSaelger(nyKontakt); // Tilføj den nye sælger
          }}


          defaultRolleIds={saelgerRolleId ? [saelgerRolleId] : []}
        />
      )}

      {/* @# 2025-11-10 18:55 - START: Bekræft Sletning Modal */}
      <Modal
        isOpen={kontaktTilSletning !== null}
        onClose={handleLukSletModal}
        title="Bekræft fjernelse"
      >
        <p>

          Er du sikker på, at du vil fjerne
          <strong className="font-bold"> {kontaktTilSletning?.fulde_navn} </strong>
          som sælger fra denne sag?
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Dette sletter ikke kontakten fra systemet, kun tilknytningen til sagen.
        </p>

        {/* Footer med knapper. */}
        {/* @# 2025-11-15 12:30 - Udskiftet <button> med <Button> */}
        <div className="flex justify-end space-x-3 mt-6">
          <Button
            onClick={handleLukSletModal}
            variant="secondary"
          >
            Annuller
          </Button>
          <Button
            onClick={handleBekræftSlet}
            variant="danger"
          >
            Fjern
          </Button>
        </div>
      </Modal>
      {/* @# 2025-11-10 18:55 - SLUT */}

      {/* @# 2025-11-10 20:40 - START: Opdateret 
 titel-sektion */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-700 flex items-center">
          <User size={20} className="mr-3 text-gray-500" />
          Sælgere
        </h2>

        <button
          type="button"
          onClick={handleCopyAllEmails}
          title="Kopier alle sælger-emails"
          className="p-1 text-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={saelgere.filter(s => s.email).length === 0}
        >
          {isCopiedAll ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
        </button>
      </div>
      {/* @# 2025-11-10 20:40 - SLUT */}

      {/* Liste over tilknyttede sælgere */}
      <div className="space-y-2 mb-4">
        {isSaving && <Loader2 size={16} className="animate-spin" />}
        {saelgere.length === 0 && (
          <p className="text-sm text-gray-500 italic">Ingen sælgere tilknyttet.</p>

        )}
        {/* @# 2025-11-10 21:55 - Mapper 'sorteredeSaelgere' */}
        {sorteredeSaelgere.map(saelger => (
          <div key={saelger.id} className="p-2 bg-gray-100 rounded-md">

            {/* @# 2025-11-10 22:15 - START: Top-række (Navn, Primær Status/Knap, Rediger/Slet) */}
            <div className="flex justify-between items-center">

              {/* Venstre side: Navn + Primær status/knap */}
              <div className="flex items-center space-x-2">
                <div className="font-medium text-gray-800">{saelger.fulde_navn}</div>

                {saelger.id === lokalPrimaerId ?
                  (
                    // Vises HVIS de ER primær
                    <div
                      className="flex items-center space-x-1 text-xs text-yellow-600 italic"
                      title="Primær sælger"

                    >
                      <Star size={14} className="fill-yellow-500" />
                      <span>primær kontakt</span>
                    </div>
                  ) : (

                    // Vises HVIS de IKKE er primær
                    <button
                      onClick={() => handleSetPrimaer(saelger.id)}
                      title="Sæt som primær"

                      className="p-1"
                      disabled={isSaving}
                    >
                      <Star size={14} className="text-gray-400 hover:text-yellow-500" />
                    </button>
                  )}

              </div>

              {/* Højre side: Rediger/Slet knapper */}
              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => handleRedigerSaelger(saelger)}

                  className="p-1 text-blue-600 hover:text-blue-800"
                  title="Rediger kontakt"
                  disabled={loadingKontaktId !== null}
                >
                  {loadingKontaktId === saelger.id ?
                    (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Edit size={18} />
                    )}
                </button>

                <button
                  onClick={() => handleFjernSaelger(saelger)}
                  className="p-1 text-red-500 hover:text-red-700"
                  title="Fjern sælger"
                  disabled={loadingKontaktId !== null}

                >
                  <X size={18} />
                </button>
              </div>
            </div>
            {/* @# 2025-11-10 22:15 - SLUT */}


            {/* @# 2025-11-10 22:15 - START: Bund-sektion (Tlf, Email, Adr) */}
            <div className="mt-1 space-y-1">
              {/* Tlf/Email Række (text-xs) */}
              <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-600">
                {/* Tlf Kolonne */}
                <div className="flex 
 items-center space-x-2">
                  <Phone size={14} className={saelger.telefon ? "text-gray-500 flex-shrink-0" : "text-gray-400 flex-shrink-0"} />
                  {saelger.telefon && (
                    <span>{saelger.telefon}</span>
                  )}
                </div>


                {/* Email Kolonne */}
                <div className="flex items-center space-x-2">
                  {saelger.email && (
                    <>
                      <button

                        onClick={(e) => handleCopyEmail(saelger.email!, saelger.id, e)}
                        title="Kopier email"
                        className="p-0.5 rounded-md hover:bg-gray-200"
                      >

                        {copiedEmailId === saelger.id ? (
                          <Check size={14} className="text-green-500" />
                        ) : (

                          <Copy size={14} className="text-blue-500 hover:text-blue-700" />
                        )}
                      </button>
                      <a href={`mailto:${saelger.email}`} className="text-blue-600 hover:underline truncate">

                        {saelger.email}
                      </a>
                    </>
                  )}
                </div>
              </div>


              {/* Adresse Række */}
              <div className="flex items-center space-x-2 text-xs text-gray-500 pt-1">
                <button
                  onClick={(e) => handleCopyAddress(saelger, e)}
                  title="Kopier adresse"

                  className="p-0.5 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!saelger.adresse_vej && !saelger.adresse_postnr}
                >
                  {copiedAddressId === saelger.id ?
                    (
                      <Check size={14} className="text-green-500" />
                    ) : (
                      <Home size={14} className={(saelger.adresse_vej || saelger.adresse_postnr) ? "text-gray-500 hover:text-blue-700" : "text-gray-400"} />
                    )}

                </button>
                <span>{formatAdresse(saelger)}</span>
              </div>
            </div>
            {/* @# 2025-11-10 22:15 - SLUT */}
          </div>
        ))}
      </div>

      {/* Søg/Opret boks */}
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            value={soegning}
            onChange={(e) => setSoegning(e.target.value)}
            placeholder="Søg efter eksisterende sælger..."
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

              {soegeresultater.map(kontakt => (
                <li
                  key={kontakt.id}
                  onClick={() => handleTilfoejSaelger(kontakt)}
                  className="p-3 hover:bg-blue-50 cursor-pointer border-b"

                >
                  <div className="font-medium">{kontakt.fulde_navn}</div>
                  <div className="text-sm text-gray-600">{formatAdresse(kontakt)}</div>
                </li>
              ))}

              {/* "Opret 
 ny" knap */}
              {soegeresultater.length === 0 && !isLoading && debouncedSoegning.length > 1 && (
                <li
                  onClick={handleOpretNy}
                  className="p-3 text-blue-600 hover:bg-blue-50 cursor-pointer flex items-center"
                >

                  <UserPlus size={18} className="mr-2" />
                  Opret ny kontakt...
                </li>
              )}
            </ul>
          </div>

        )}
      </div>
    </div>
  );
}

export default SaelgerStyring;