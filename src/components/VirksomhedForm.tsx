// --- Fil: src/components/VirksomhedForm.tsx ---
// @# 2025-11-06 18:25 - Oprettet ny formular-komponent for Virksomheder.
// @# 2025-11-06 20:02 - Opdateret 'gruppe' til at være en dropdown (select).
// @# 2025-11-08 14:32 - Bytte rækkefølge på CVR/Afdeling som ønsket.
// @# 2025-11-08 14:40 - Tilføjet CVR-opslags-knap og logik.
// @# 2025-11-08 14:48 - Rettet lodret justering af CVR-input og -knap.
// @# 2025-11-09 13:25 - Rettet fejl, hvor CVR-data blev ignoreret af setFormData.
// @# 2025-11-09 13:30 - Rydder form-data ved CVR-fejl (f.eks. "Ikke fundet").
// @# 2025-11-09 13:45 - Sikrer, at 'navn' altid overskrives (også hvis det er en tom streng).
// @# 2025-11-10 21:25 - Tilføjet AdresseSøgning-komponent og -logik.
import React, { useState, useEffect, ChangeEvent, FormEvent, ReactElement } from 'react';
import { API_BASE_URL } from '../config';
import { Save, X, Search, Loader2 } from 'lucide-react';
// @# 2025-11-10 21:25 - Importeret DawaAdresse og AdresseSøgning
import { Virksomhed, VirksomhedGruppe, DawaAdresse } from '../types';
import AdresseSøgning from './AdresseSøgning';

interface VirksomhedFormProps {
  onSave: () => void;
  onCancel: () => void;
  virksomhedTilRedigering: Virksomhed | null;
}

type FormDataState = Partial<Omit<Virksomhed, 'id' | 'gruppe'>> & {
    gruppe_id: string;
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
  });
  const [grupper, setGrupper] = useState<VirksomhedGruppe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCvrLoading, setIsCvrLoading] = useState(false);
  const [cvrError, setCvrError] = useState<string | null>(null);
  
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
      });
    } else {
      setFormData({
        navn: '', cvr_nr: '', gruppe_id: '', afdeling: '', telefon: '', email: '',
        web: '', adresse_vej: '', adresse_postnr: '', adresse_by: '', kommentar: '',
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
  };

  // @# 2025-11-10 21:25 - START: Tilføjet adressesøgnings-handler
  const handleAdresseValgt = (adresse: DawaAdresse) => {
    setFormData(prev => ({
      ...prev,
      adresse_vej: `${adresse.vejnavn} ${adresse.husnr}`,
      adresse_postnr: adresse.postnr,
      adresse_by: adresse.postnrnavn,
      // Ryd CVR-specifikke felter, da de ikke er en del af DAWA-svaret
      adresse_etage: '', 
      adresse_doer: '', 
    }));
    // Nulstil CVR-fejl, hvis en adresse vælges manuelt
    setCvrError(null);
  };
  // @# 2025-11-10 21:25 - SLUT

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const url = erRedigering
      ? `${API_BASE_URL}/register/virksomheder/${virksomhedTilRedigering?.id}/`
      : `${API_BASE_URL}/register/virksomheder/`;
    const method = erRedigering ? 'PUT' : 'POST';

    const payload = {
        ...formData,
        gruppe_id: formData.gruppe_id === '' ?
        null : parseInt(formData.gruppe_id, 10),
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
        console.error("API Error Response:", errorData);
        throw new Error('Netværksrespons var ikke ok.');
      }
      onSave();
    } catch (error) {
      console.error('Fejl ved lagring af virksomhed:', error);
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
        const response = await fetch(`${API_BASE_URL}/register/cvr_opslag/${formData.cvr_nr}/`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Fejl ved CVR-opslag");
        }
        
        const data = await response.json();
        // @# 2025-11-09 13:45 - RETTELSE: 'data.navn' kan være '', men ikke null/undefined.
        // Vi tjekker om 'navn' eksisterer i data-objektet.
        setFormData(prev => ({
            ...prev,
            navn: 'navn' in data ? data.navn : prev.navn, // Overskriv kun hvis 'navn' findes i responsen
            adresse_vej: data.adresse_vej || '',
            adresse_postnr: data.adresse_postnr || '',
            adresse_by: data.adresse_by || '',
      
             adresse_etage: data.adresse_etage || '', 
            adresse_doer: data.adresse_doer || '', 
        }));
    } catch (error: any) {
        setCvrError(error.message);
        // Ryd de automatisk udfyldte felter, så gammel data ikke bliver stående
        setFormData(prev => ({
            ...prev,
            navn: '',
            adresse_vej: '',
            adresse_postnr: '',
            adresse_by: '',
            adresse_etage: '',
  
             adresse_doer: '',
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
              <button type="submit" className="p-2 text-white bg-blue-600 rounded-full hover:bg-blue-700" title="Gem">
  
                 <Save size={24} />
              </button>
            </div>
          </div>

          <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
            <legend className="text-lg font-medium px-2">Basis Info</legend>
            
   
             <div>
              <label htmlFor="navn" className="block text-sm font-medium">Navn (Påkrævet)</label>
              <input type="text" name="navn" value={formData.navn ||
''} onChange={handleChange} required className="mt-1 w-full p-2 border rounded-md"/>
            </div>
            
            <div>
              <label htmlFor="afdeling" className="block text-sm font-medium">Afdeling</label>
              <input type="text" name="afdeling" value={formData.afdeling ||
''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md"/>
            </div>

            <div>
              <label htmlFor="cvr_nr" className="block text-sm font-medium">CVR-nr.</label>
              <div className="flex items-center space-x-2 mt-1">
                  <input 
               
                     type="text" 
                      name="cvr_nr" 
                      value={formData.cvr_nr ||
''} 
                      onChange={handleChange} 
                      className="w-full p-2 border rounded-md"
                      maxLength={8}
                  />
           
                 <button 
                      type="button" 
                      onClick={handleHentCvrData} 
                      disabled={isCvrLoading ||
!formData.cvr_nr || formData.cvr_nr.length !== 8}
                      className="p-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
                      title="Hent data fra CVR"
                  >
                      {isCvrLoading ?
<Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                  </button>
              </div>
              {cvrError && <p className="text-xs text-red-600 mt-1">{cvrError}</p>}
            </div>
            
            <div>
      
                 <label htmlFor="gruppe_id" className="block text-sm font-medium">Gruppe</label>
              <select 
                name="gruppe_id" 
                value={formData.gruppe_id ||
''} 
                onChange={handleChange}
                disabled={isLoading}
                className="mt-1 w-full p-2 border rounded-md bg-white"
              >
                {isLoading ?
(
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
              <input type="text" name="telefon" value={formData.telefon ||
''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md"/>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium">Email</label>
              <input type="email" name="email" value={formData.email ||
''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md"/>
            </div>
            <div className="col-span-2">
              <label htmlFor="web" className="block text-sm font-medium">Web</label>
              <input type="text" name="web" value={formData.web ||
''} onChange={handleChange} placeholder="https://..." className="mt-1 w-full p-2 border rounded-md"/>
            </div>
          </fieldset>

          <fieldset className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-md">
            <legend className="text-lg font-medium px-2">Adresse</legend>

            {/* @# 2025-11-10 21:25 - START: Tilføjet AdresseSøgning */}
            <div className="md:col-span-3">
               <AdresseSøgning onAdresseValgt={handleAdresseValgt} />
            </div>
            {/* @# 2025-11-10 21:25 - SLUT */}

            <div className="md:col-span-3">
               {/* @# 2025-11-10 21:25 - Opdateret label fra "Vej" til "Vej og Nr." */}
               <label htmlFor="adresse_vej" className="block text-sm font-medium">Vej og Nr.</label>
       
               <input type="text" name="adresse_vej" value={formData.adresse_vej ||
''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md"/>
            </div>
            <div>
              <label htmlFor="adresse_postnr" className="block text-sm font-medium">Postnr.</label>
              <input type="text" name="adresse_postnr" value={formData.adresse_postnr ||
''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md"/>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="adresse_by" className="block text-sm font-medium">By</label>
              <input type="text" name="adresse_by" value={formData.adresse_by ||
''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md"/>
            </div>
          </fieldset>

          <div>
            <label htmlFor="kommentar" className="block text-sm font-medium">Kommentar</label>
            <textarea name="kommentar" value={formData.kommentar ||
''} onChange={handleChange} rows={4} className="mt-1 w-full p-2 border rounded-md"></textarea>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VirksomhedForm;