// --- Fil: src/components/KontaktForm.tsx ---
// @# 2025-11-06 18:25 - Oprettet ny formular-komponent for Kontakter.
// @# 2025-11-06 19:27 - Opdateret 'rolle' til at være en dropdown (select).
// @# 2025-11-06 20:45 - Forbedret håndtering af paginerede data.
// @# 2025-11-08 14:25 - Opdateret 'Virksomhed' dropdown til at vise 'Navn - Afdeling' og sortere listen.
// @# 2025-11-10 17:40 - Ombygget 'rolle_id' (select) til 'roller_ids' (checkboxes) for M2M.
// @# 2025-11-10 18:00 - Tilføjet 'onSaveNyKontakt' og 'defaultRolleIds' props til genbrug.
// @# 2025-11-10 19:35 - Rettet redigerings-bug (tom formular) ved at gen-introducere useEffect. Tilføjet Adressesøgning.
import React, { useState, useEffect, ChangeEvent, FormEvent, ReactElement } from 'react';
import { api } from '../api';
import { Save, X } from 'lucide-react';
// @# 2025-11-10 19:35 - Importeret DawaAdresse og AdresseSøgning
import { Kontakt, Virksomhed, Rolle, DawaAdresse } from '../types';
import AdresseSøgning from './AdresseSøgning';

interface KontaktFormProps {
  onSave: () => void; // Bruges til generel lukning/opdatering
  onCancel: () => void;
  kontaktTilRedigering: Kontakt | null;
  defaultRolleIds?: number[]; // F.eks. [3] for "Sælger"
  onSaveNyKontakt?: (nyKontakt: Kontakt) => void; // Returnerer den nye kontakt
}

type FormDataState = Partial<Omit<Kontakt, 'id' | 'virksomhed' | 'roller' | 'fulde_navn'>> & {
  virksomhed_id: string;
  roller_ids: number[]; // Ændret fra rolle_id: string
};

const formatVirksomhedsnavn = (v: Virksomhed): string => {
  return v.afdeling ? `${v.navn} - ${v.afdeling}` : v.navn;
};

// @# 2025-11-10 19:35 - Definer start-state UDENFOR komponenten
const getInitialFormData = (defaultRolleIds: number[]): FormDataState => ({
  fornavn: '', mellemnavn: '', efternavn: '', telefon: '', email: '',
  adresse_vej: '', adresse_postnr: '', adresse_by: '', kommentar: '',
  virksomhed_id: '',
  roller_ids: defaultRolleIds,
});

function KontaktForm({ onSave, onCancel, kontaktTilRedigering, defaultRolleIds = [], onSaveNyKontakt }: KontaktFormProps): ReactElement {

  // @# 2025-11-10 19:35 - Initial state er nu altid baseret på defaults
  const [formData, setFormData] = useState<FormDataState>(() => getInitialFormData(defaultRolleIds));

  const [virksomheder, setVirksomheder] = useState<Virksomhed[]>([]);
  const [roller, setRoller] = useState<Rolle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const erRedigering = kontaktTilRedigering != null;

  useEffect(() => {
    const fetchDataForForm = async () => {
      setIsLoading(true);
      try {
        const [virksomhederData, rollerData] = await Promise.all([
          api.get<any>('/register/virksomheder/?limit=1000'),
          api.get<any>('/register/roller/')
        ]);

        const virksomhederListe = Array.isArray(virksomhederData) ? virksomhederData : virksomhederData.results;
        const rollerListe = Array.isArray(rollerData) ? rollerData : rollerData.results;

        virksomhederListe.sort((a: Virksomhed, b: Virksomhed) => {
          return formatVirksomhedsnavn(a).localeCompare(formatVirksomhedsnavn(b));
        });

        setVirksomheder(virksomhederListe || []);
        setRoller(rollerListe || []);
      } catch (error) {
        console.error("Fejl ved hentning af data til form:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDataForForm();
  }, []);

  // @# 2025-11-10 19:35 - START: Løsning på redigerings-bug
  // Denne hook kører, når formen åbnes, og når 'kontaktTilRedigering' ændrer sig.
  // Den fylder formen med data, HVIS vi redigerer.
  useEffect(() => {
    if (erRedigering && kontaktTilRedigering) {
      // Vi er i redigeringstilstand, fyld formen
      setFormData({
        ...kontaktTilRedigering,
        virksomhed_id: kontaktTilRedigering.virksomhed?.id.toString() || '',
        roller_ids: kontaktTilRedigering.roller?.map(r => r.id) || [],
      });
    } else {
      // Vi er i opret-tilstand, nulstil formen
      setFormData(getInitialFormData(defaultRolleIds));
    }
    // Vi lytter kun på disse to. defaultRolleIds er stabil.
  }, [kontaktTilRedigering, erRedigering]);
  // @# 2025-11-10 19:35 - SLUT

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRolleChange = (rolleId: number) => {
    setFormData(prev => {
      const nyeRoller = prev.roller_ids.includes(rolleId)
        ? prev.roller_ids.filter(id => id !== rolleId) // Fjern
        : [...prev.roller_ids, rolleId]; // Tilføj
      return { ...prev, roller_ids: nyeRoller };
    });
  };

  // @# 2025-11-10 19:35 - START: Tilføjet callback til adressesøgning
  const handleAdresseValgt = (adresse: DawaAdresse) => {
    setFormData(prev => ({
      ...prev,
      adresse_vej: `${adresse.vejnavn} ${adresse.husnr}`,
      adresse_postnr: adresse.postnr,
      adresse_by: adresse.postnrnavn,
    }));
  };
  // @# 2025-11-10 19:35 - SLUT

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const payload = {
      ...formData,
      virksomhed_id: formData.virksomhed_id === '' ? null : parseInt(formData.virksomhed_id, 10),
      roller_ids: formData.roller_ids,
    };
    delete (payload as any).roller;
    delete (payload as any).rolle_id;

    try {
      let result: Kontakt;
      if (erRedigering) {
        result = await api.put<Kontakt>(`/register/kontakter/${kontaktTilRedigering?.id}/`, payload);
      } else {
        result = await api.post<Kontakt>(`/register/kontakter/`, payload);
      }

      if (!erRedigering && onSaveNyKontakt) {
        onSaveNyKontakt(result);
      } else {
        onSave();
      }

    } catch (error) {
      console.error('Fejl ved lagring af kontakt:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {erRedigering ? 'Rediger Kontakt' : 'Opret Ny Kontakt'}
            </h2>
            <div className="flex items-center space-x-2">
              <button type="button" onClick={onCancel} className="p-2 text-gray-600 rounded-full hover:bg-gray-200" title="Annuller (Esc)">
                <X size={24} />
              </button>
              <button type="submit" className="p-2 text-white bg-blue-600 rounded-full hover:bg-blue-700" title="Gem">
                <Save size={24} />
              </button>
            </div>
          </div>

          <fieldset className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-md">
            <legend className="text-lg font-medium px-2">Person Info</legend>
            <div>
              <label htmlFor="fornavn" className="block text-sm font-medium">Fornavn</label>
              <input type="text" name="fornavn" value={formData.fornavn || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
            </div>
            <div>
              <label htmlFor="mellemnavn" className="block text-sm font-medium">Mellemnavn</label>
              <input type="text" name="mellemnavn" value={formData.mellemnavn || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
            </div>
            <div>
              <label htmlFor="efternavn" className="block text-sm font-medium">Efternavn (Påkrævet)</label>
              <input type="text" name="efternavn" value={formData.efternavn || ''} onChange={handleChange} required className="mt-1 w-full p-2 border rounded-md" />
            </div>
          </fieldset>

          <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
            <legend className="text-lg font-medium px-2">Job Info</legend>

            <div>
              <label className="block text-sm font-medium">Roller</label>
              <div className="mt-2 p-2 border rounded-md max-h-32 overflow-y-auto space-y-1">
                {isLoading ? (
                  <span className="text-sm text-gray-500">Henter roller...</span>
                ) : (
                  roller.map(r => (
                    <label key={r.id} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.roller_ids.includes(r.id)}
                        onChange={() => handleRolleChange(r.id)}
                      />
                      <span>{r.navn}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div>
              <label htmlFor="virksomhed_id" className="block text-sm font-medium">Virksomhed</label>
              <select
                name="virksomhed_id"
                value={formData.virksomhed_id || ''}
                onChange={handleChange}
                disabled={isLoading}
                className="mt-1 w-full p-2 border rounded-md bg-white"
              >
                {isLoading ? (
                  <option>Henter virksomheder...</option>
                ) : (
                  <>
                    <option value="">Ingen virksomhed</option>
                    {virksomheder.map(v => (
                      <option key={v.id} value={v.id}>
                        {formatVirksomhedsnavn(v)}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
            <div>
              <label htmlFor="telefon" className="block text-sm font-medium">Telefon</label>
              <input type="text" name="telefon" value={formData.telefon || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium">Email</label>
              <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
            </div>
          </fieldset>

          <fieldset className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-md">
            <legend className="text-lg font-medium px-2">Adresse</legend>

            {/* @# 2025-11-10 19:35 - START: Tilføjet AdresseSøgning */}
            <div className="md:col-span-3">
              <AdresseSøgning onAdresseValgt={handleAdresseValgt} />
            </div>
            {/* @# 2025-11-10 19:35 - SLUT */}

            <div className="md:col-span-3">
              <label htmlFor="adresse_vej" className="block text-sm font-medium">Vej og Nr.</label>
              <input type="text" name="adresse_vej" value={formData.adresse_vej || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
            </div>
            <div>
              <label htmlFor="adresse_postnr" className="block text-sm font-medium">Postnr.</label>
              <input type="text" name="adresse_postnr" value={formData.adresse_postnr || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="adresse_by" className="block text-sm font-medium">By</label>
              <input type="text" name="adresse_by" value={formData.adresse_by || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
            </div>
          </fieldset>

          <div>
            <label htmlFor="kommentar" className="block text-sm font-medium">Kommentar</label>
            <textarea name="kommentar" value={formData.kommentar || ''} onChange={handleChange} rows={4} className="mt-1 w-full p-2 border rounded-md"></textarea>
          </div>
        </form>
      </div>
    </div>
  );
}

export default KontaktForm;