// --- Fil: src/components/VirksomhedForm.tsx ---
// @# 2025-11-23 13:30 - Tilføjet 'onSaveNyVirksomhed' til interfacet.
import React, { useState, useEffect, ChangeEvent, FormEvent, ReactElement } from 'react';
import { api } from '../api';
import { Save, X, Search, Loader2, AlertTriangle } from 'lucide-react';
import { Virksomhed, VirksomhedGruppe, DawaAdresse } from '../types';
import AdresseSøgning from './AdresseSøgning';
import Button from './ui/Button';

interface VirksomhedFormProps {
  onSave: () => void;
  onCancel: () => void;
  virksomhedTilRedigering: Virksomhed | null;
  // @# VIGTIGT: Denne linje skal være her for at RådgiverStyring virker
  onSaveNyVirksomhed?: (nyVirksomhed: Virksomhed) => void;
}

type FormDataState = Partial<Omit<Virksomhed, 'id' | 'gruppe' | 'kommunekode'>> & {
  gruppe_id: string;
  kommunekode: string;
};

function VirksomhedForm({ onSave, onCancel, virksomhedTilRedigering, onSaveNyVirksomhed }: VirksomhedFormProps): ReactElement {
  const [formData, setFormData] = useState<FormDataState>({
    navn: '',
    cvr_nr: '',
    gruppe_id: '',
    afdeling: '',
    telefon: '',
    email: '',
    web: '',
    adresse_vej: '',
    adresse_postnr: '',
    adresse_by: '',
    kommentar: '',
    kommunekode: '',
  });
  const [grupper, setGrupper] = useState<VirksomhedGruppe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCvrLoading, setIsCvrLoading] = useState(false);
  const [cvrError, setCvrError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isFetchingAddressDetails, setIsFetchingAddressDetails] = useState(false);

  const erRedigering = virksomhedTilRedigering != null;

  useEffect(() => {
    const fetchGrupper = async () => {
      setIsLoading(true);
      try {
        const data = await api.get<any>('/register/virksomhedsgrupper/');
        setGrupper(data.results || data);
      } catch (error) {
        console.error("Fejl ved hentning af grupper til form:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGrupper();
  }, []);

  useEffect(() => {
    if (erRedigering && virksomhedTilRedigering) {
      setFormData({
        ...virksomhedTilRedigering,
        gruppe_id: virksomhedTilRedigering.gruppe?.id.toString() || '',
        kommunekode: virksomhedTilRedigering.kommunekode ? String(virksomhedTilRedigering.kommunekode) : '',
      });
    } else {
      setFormData({
        navn: '', cvr_nr: '', gruppe_id: '', afdeling: '', telefon: '', email: '',
        web: '', adresse_vej: '', adresse_postnr: '', adresse_by: '', kommentar: '',
        kommunekode: '',
      });
    }
  }, [virksomhedTilRedigering, erRedigering]);

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
    if (name === 'cvr_nr') {
      setCvrError(null);
    }
    setFormError(null);
  };

  const handleAdresseValgt = async (adresse: DawaAdresse) => {
    setFormData(prev => ({
      ...prev,
      adresse_vej: `${adresse.vejnavn} ${adresse.husnr}`,
      adresse_postnr: adresse.postnr,
      adresse_by: adresse.postnrnavn,
      adresse_etage: '',
      adresse_doer: '',
      kommunekode: '',
    }));
    setCvrError(null);

    setIsFetchingAddressDetails(true);
    try {
      const data = await api.get<any>(adresse.href);

      const adgangsadresse = data.adgangsadresse;
      const nyKommuneKode = adgangsadresse?.kommune?.kode || '';

      setFormData(prev => ({
        ...prev,
        kommunekode: String(nyKommuneKode)
      }));

    } catch (error) {
      console.error("Fejl ved hentning af ekstra adressedata:", error);
    } finally {
      setIsFetchingAddressDetails(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      ...formData,
      gruppe_id: formData.gruppe_id === '' ? null : parseInt(formData.gruppe_id, 10),
      kommunekode: formData.kommunekode ? parseInt(formData.kommunekode, 10) : null,
    };
    delete (payload as any).gruppe;

    try {
      let result: any;
      if (erRedigering) {
        result = await api.put<any>(`/register/virksomheder/${virksomhedTilRedigering?.id}/`, payload);
      } else {
        result = await api.post<any>(`/register/virksomheder/`, payload);
      }

      if (!erRedigering && onSaveNyVirksomhed) {
        onSaveNyVirksomhed(result);
      } else {
        onSave();
      }
    } catch (error: any) {
      console.error('Fejl ved lagring af virksomhed:', error);
      if (error.data?.cvr_nr) {
        setFormError(`Dette CVR-nummer findes allerede i systemet.`);
      } else {
        setFormError(error.message || 'Der opstod en fejl ved gemning.');
      }
    }
  };

  const handleHentCvrData = async () => {
    if (!formData.cvr_nr || formData.cvr_nr.length !== 8) {
      setCvrError("CVR-nummer skal være 8 cifre.");
      return;
    }

    setIsCvrLoading(true);
    setCvrError(null);

    try {
      const localData = await api.get<any>(`/register/virksomheder/?cvr_nr=${formData.cvr_nr}`);
      const eksisterende = Array.isArray(localData) ? localData : localData.results;

      if (eksisterende && eksisterende.length > 0) {
        const fundetVirksomhed = eksisterende[0];
        if (erRedigering && virksomhedTilRedigering?.id === fundetVirksomhed.id) {
          // Det er den samme, fortsæt...
        } else {
          setCvrError(`Dette CVR-nummer findes allerede: ${fundetVirksomhed.navn}`);
          setIsCvrLoading(false);
          return;
        }
      }

      const data = await api.get<any>(`/register/cvr_opslag/${formData.cvr_nr}/`);

      setFormData(prev => ({
        ...prev,
        navn: 'navn' in data ? data.navn : prev.navn,
        adresse_vej: data.adresse_vej || '',
        adresse_postnr: data.adresse_postnr || '',
        adresse_by: data.adresse_by || '',
        adresse_etage: data.adresse_etage || '',
        adresse_doer: data.adresse_doer || '',
        kommunekode: data.kommunekode ? String(data.kommunekode) : '',
      }));
    } catch (error: any) {
      setCvrError(error.message);
      setFormData(prev => ({
        ...prev,
        navn: '',
        adresse_vej: '',
        adresse_postnr: '',
        adresse_by: '',
        adresse_etage: '',
        adresse_doer: '',
        kommunekode: '',
      }));
    } finally {
      setIsCvrLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {erRedigering ? 'Rediger Virksomhed' : 'Opret Ny Virksomhed'}
            </h2>
            <div className="flex items-center space-x-2">
              <button type="button" onClick={onCancel} className="p-2 text-gray-600 rounded-full hover:bg-gray-200" title="Annuller (Esc)">
                <X size={24} />
              </button>
              <Button type="submit" variant="primary">
                <Save size={24} />
              </Button>
            </div>
          </div>

          {formError && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
              <AlertTriangle size={20} className="mr-2" />
              {formError}
            </div>
          )}

          <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
            <legend className="text-lg font-medium px-2">Basis Info</legend>

            <div>
              <label htmlFor="navn" className="block text-sm font-medium">Navn (Påkrævet)</label>
              <input type="text" name="navn" value={formData.navn || ''} onChange={handleChange} required className="mt-1 w-full p-2 border rounded-md" />
            </div>

            <div>
              <label htmlFor="afdeling" className="block text-sm font-medium">Afdeling</label>
              <input type="text" name="afdeling" value={formData.afdeling || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
            </div>

            <div>
              <label htmlFor="cvr_nr" className="block text-sm font-medium">CVR-nr.</label>
              <div className="flex items-center space-x-2 mt-1">
                <input
                  type="text"
                  name="cvr_nr"
                  value={formData.cvr_nr || ''}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md"
                  maxLength={8}
                />
                <button
                  type="button"
                  onClick={handleHentCvrData}
                  disabled={isCvrLoading || !formData.cvr_nr || formData.cvr_nr.length !== 8}
                  className="p-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
                  title="Hent data fra CVR"
                >
                  {isCvrLoading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                </button>
              </div>
              {cvrError && <p className="text-xs text-red-600 mt-1 font-semibold">{cvrError}</p>}
            </div>

            <div>
              <label htmlFor="gruppe_id" className="block text-sm font-medium">Gruppe</label>
              <select
                name="gruppe_id"
                value={formData.gruppe_id || ''}
                onChange={handleChange}
                disabled={isLoading}
                className="mt-1 w-full p-2 border rounded-md bg-white"
              >
                {isLoading ? (
                  <option>Henter grupper...</option>
                ) : (
                  <>
                    <option value="">Ingen gruppe</option>
                    {grupper.map(g => (
                      <option key={g.id} value={g.id}>{g.navn}</option>
                    ))}
                  </>
                )}
              </select>
            </div>
          </fieldset>

          <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
            <legend className="text-lg font-medium px-2">Kontakt Info</legend>
            <div>
              <label htmlFor="telefon" className="block text-sm font-medium">Telefon</label>
              <input type="text" name="telefon" value={formData.telefon || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium">Email</label>
              <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
            </div>
            <div className="col-span-2">
              <label htmlFor="web" className="block text-sm font-medium">Web</label>
              <input type="text" name="web" value={formData.web || ''} onChange={handleChange} placeholder="https://..." className="mt-1 w-full p-2 border rounded-md" />
            </div>
          </fieldset>

          <fieldset className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-md">
            <legend className="text-lg font-medium px-2">Adresse</legend>

            <div className="md:col-span-3">
              <AdresseSøgning onAdresseValgt={handleAdresseValgt} />
              {isFetchingAddressDetails && <span className="text-xs text-gray-500 ml-2">Henter detaljer...</span>}
            </div>

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

            <div>
              <label htmlFor="kommunekode" className="block text-sm font-medium">Kommunekode</label>
              <input
                type="text"
                name="kommunekode"
                value={formData.kommunekode || ''}
                onChange={handleChange}
                className="mt-1 w-full p-2 border rounded-md"
                placeholder="F.eks. 0101"
              />
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

export default VirksomhedForm;