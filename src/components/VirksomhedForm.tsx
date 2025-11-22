// --- Fil: src/components/VirksomhedForm.tsx ---
// @# 2025-11-22 10:15 - Tilføjet håndtering af kommunekode.
// @# 2025-11-22 14:00 - Opdateret CVR-hentning.
// @# 2025-11-22 14:45 - Tilføjet dublet-tjek før CVR-opslag og bedre fejlhåndtering ved gem.
import React, { useState, useEffect, ChangeEvent, FormEvent, ReactElement } from 'react';
import { API_BASE_URL } from '../config';
import { Save, X, Search, Loader2, AlertTriangle } from 'lucide-react'; // Tilføjet AlertTriangle
import { Virksomhed, VirksomhedGruppe, DawaAdresse } from '../types';
import AdresseSøgning from './AdresseSøgning';
import Button from './ui/Button'; // Genbrug vores knap

interface VirksomhedFormProps {
  onSave: () => void;
  onCancel: () => void;
  virksomhedTilRedigering: Virksomhed | null;
}

// Vi skal fjerne 'kommunekode' fra base-typen, før vi genindfører den som string
type FormDataState = Partial<Omit<Virksomhed, 'id' | 'gruppe' | 'kommunekode'>> & {
    gruppe_id: string;
    kommunekode: string;
};

function VirksomhedForm({ onSave, onCancel, virksomhedTilRedigering }: VirksomhedFormProps): ReactElement {
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
  // @# 2025-11-22 14:45 - Ny state til generelle fejlbeskeder ved gem
  const [formError, setFormError] = useState<string | null>(null); 
  const [isFetchingAddressDetails, setIsFetchingAddressDetails] = useState(false);
  
  const erRedigering = virksomhedTilRedigering != null;

  useEffect(() => {
    const fetchGrupper = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/register/virksomhedsgrupper/`);
            if (!response.ok) throw new Error('Kunne ikke hente virksomhedsgrupper');
            const data = await response.json();
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
    // Ryd generel fejl ved ændring
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
        const response = await fetch(adresse.href);
        if (!response.ok) throw new Error("Kunne ikke hente adressedetaljer");
        const data = await response.json();
        
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
    setFormError(null); // Nulstil fejl

    const url = erRedigering
      ? `${API_BASE_URL}/register/virksomheder/${virksomhedTilRedigering?.id}/`
      : `${API_BASE_URL}/register/virksomheder/`;
    const method = erRedigering ? 'PUT' : 'POST';

    const payload = {
        ...formData,
        gruppe_id: formData.gruppe_id === '' ? null : parseInt(formData.gruppe_id, 10),
        kommunekode: formData.kommunekode ? parseInt(formData.kommunekode, 10) : null,
    };
    delete (payload as any).gruppe;

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // @# 2025-11-22 14:45 - Håndter "Unique constraint" fejl pænt
        if (errorData.cvr_nr) {
            setFormError(`Dette CVR-nummer findes allerede i systemet.`);
            return;
        }
        
        console.error("API Error Response:", errorData);
        throw new Error('Der opstod en fejl ved gemning.');
      }
      onSave();
    } catch (error: any) {
      console.error('Fejl ved lagring af virksomhed:', error);
      if (!formError) setFormError(error.message);
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
        // @# 2025-11-22 14:45 - TRIN 1: Tjek om virksomheden findes LOKALT først
        // Vi bruger vores eksisterende filter-endpoint
        const localCheckResponse = await fetch(`${API_BASE_URL}/register/virksomheder/?cvr_nr=${formData.cvr_nr}`);
        const localData = await localCheckResponse.json();
        const eksisterende = Array.isArray(localData) ? localData : localData.results;

        // Hvis vi finder en virksomhed med dette CVR-nr, og vi IKKE er ved at redigere netop den
        if (eksisterende && eksisterende.length > 0) {
            const fundetVirksomhed = eksisterende[0];
            
            // Hvis vi redigerer, og ID'et er det samme, er det fint (vi opdaterer os selv)
            if (erRedigering && virksomhedTilRedigering?.id === fundetVirksomhed.id) {
                // Fortsæt til CVR opslag...
            } else {
                // Stop og advar brugeren
                setCvrError(`Dette CVR-nummer findes allerede: ${fundetVirksomhed.navn}`);
                setIsCvrLoading(false);
                return; // VIGTIGT: Stop her, slå ikke op i CVR
            }
        }

        // @# 2025-11-22 14:45 - TRIN 2: Slå op i CVR (Virk)
        const response = await fetch(`${API_BASE_URL}/register/cvr_opslag/${formData.cvr_nr}/`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Fejl ved CVR-opslag");
        }
        
        const data = await response.json();
        
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
        // Hvis CVR fejler, rydder vi felterne for at undgå forvirring
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

          {/* @# 2025-11-22 14:45 - Vis generelle fejlbeskeder her */}
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
              <input type="text" name="navn" value={formData.navn || ''} onChange={handleChange} required className="mt-1 w-full p-2 border rounded-md"/>
            </div>
            
            <div>
              <label htmlFor="afdeling" className="block text-sm font-medium">Afdeling</label>
              <input type="text" name="afdeling" value={formData.afdeling || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md"/>
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
              <input type="text" name="telefon" value={formData.telefon || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md"/>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium">Email</label>
              <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md"/>
            </div>
            <div className="col-span-2">
              <label htmlFor="web" className="block text-sm font-medium">Web</label>
              <input type="text" name="web" value={formData.web || ''} onChange={handleChange} placeholder="https://..." className="mt-1 w-full p-2 border rounded-md"/>
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
               <input type="text" name="adresse_vej" value={formData.adresse_vej || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md"/>
            </div>
            <div>
              <label htmlFor="adresse_postnr" className="block text-sm font-medium">Postnr.</label>
              <input type="text" name="adresse_postnr" value={formData.adresse_postnr || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md"/>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="adresse_by" className="block text-sm font-medium">By</label>
              <input type="text" name="adresse_by" value={formData.adresse_by || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md"/>
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