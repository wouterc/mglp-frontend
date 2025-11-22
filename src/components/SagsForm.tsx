// --- Fil: src/components/SagsForm.tsx ---

//@@ 2025-09-09 15:14 - Rettet logik til at hente bygningsdata fra en liste (bygninger)
// @# 2025-11-10 19:05 - Refaktoreret til at bruge globale typer fra types.ts
// @# 2025-11-10 19:20 - Rettet 7 fejl ifm.
// @# 2025-11-10 19:30 - Rettet 8. fejl (type-mismatch i useEffect) ved eksplicit mapping
// @# 2025-11-10 20:10 - Rettet type-fejl i handleSubmit (string | null vs string)
// @# 2025-11-15 12:30 - Opdateret til at bruge genbrugelig Button-komponent
// @# 2025-11-19 20:30 - Tilføjet håndtering af kommunekode fra DAWA.
import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { API_BASE_URL } from '../config';
import AdresseSøgning from './AdresseSøgning';
// @# 2025-11-10 19:05 - Importeret globale typer
import type { Status, BbrAnvendelse, DawaAdresse, Sag } from '../types';
import Button from './ui/Button'; // Importer den nye knap

// @# 2025-11-10 19:05 - Fjernet lokale, redundante type-definitioner for Status og BbrAnvendelse

// @# 2025-11-10 19:05 - Ændret lokal type til at bruge den globale 'Sag' type
type SagTilRedigering = Sag | null;

interface SagsFormProps {
  onSave: () => void;
  onCancel: () => void;
  sagTilRedigering: SagTilRedigering;
}

// @# 2025-11-10 19:05 - Fjernet lokal, redundant type-definition for DawaAdresse

// @# 2025-11-10 19:20 - Tilføjet id og sags_nr til state-interfacet
interface SagsDataState {
  id?: number; // Tilføjet
  sags_nr?: string; // Tilføjet
  alias: string;
  hovedansvarlige: string;
  status_id: string;
  adresse_vej: string;
  adresse_husnr: string;
  adresse_etage: string;
  adresse_doer: string;
  adresse_post_nr: string;
  adresse_by: string;
  adresse_id_dawa: string | null;
  adressebetegnelse: string;
  // @# 2025-11-19 20:30 - Tilføjet kommunekode til state (som string for nemheds skyld i forms)
  kommunekode: string; 
  bolig_type: string;
  bolig_bfe: string;
  bolig_matrikel: string;
  bolig_anpart: string;
  bolig_anvendelse_id: string;
  kommentar: string;
  byggeaar: string;
  boligareal: string;
  [key: string]: any;
}

function SagsForm({ onSave, onCancel, sagTilRedigering }: SagsFormProps) {
  const [sagsData, setSagsData] = useState<SagsDataState>({
    alias: '',
    hovedansvarlige: '',
    status_id: '',
    adresse_vej: '',
    adresse_husnr: '',
    adresse_etage: '',
    adresse_doer: '',
    adresse_post_nr: '',
    adresse_by: '',
    adresse_id_dawa: null,
    adressebetegnelse: '',
    // @# 2025-11-19 20:30 - Init
    kommunekode: '',
    bolig_type: '',
    bolig_bfe: '',
    bolig_matrikel: '',
    bolig_anpart: '',
    bolig_anvendelse_id: '',
    kommentar: '',
    byggeaar: '',
    boligareal: '',
  });
  const [statusser, setStatusser] = useState<Status[]>([]);
  const [bbrAnvendelser, setBbrAnvendelser] = useState<BbrAnvendelse[]>([]);
  const [isFetchingDetails, setIsFetchingDetails] = useState<boolean>(false);
  const erRedigering = sagTilRedigering != null;

  // @# 2025-11-10 19:30 - Rettet type-mismatch. Mapper nu eksplicit null -> ''
  useEffect(() => {
    if (erRedigering && sagTilRedigering) {
      setSagsData({
        // Bevar felter, der kun findes på SagsDataState (som byggeaar)
        ...sagsData,
        
        // Udfyld fra sagTilRedigering og konverter 'null' til 'string'
        id: sagTilRedigering.id,
        sags_nr: sagTilRedigering.sags_nr || '',
        alias: sagTilRedigering.alias || '',
        hovedansvarlige: sagTilRedigering.hovedansvarlige || '',
        status_id: sagTilRedigering.status ? String(sagTilRedigering.status.id) : '',
        
        adresse_vej: sagTilRedigering.adresse_vej || '',
        adresse_husnr: sagTilRedigering.adresse_husnr || '',
        adresse_etage: sagTilRedigering.adresse_etage || '',
        adresse_doer: sagTilRedigering.adresse_doer || '',
        adresse_post_nr: sagTilRedigering.adresse_post_nr || '',
        adresse_by: sagTilRedigering.adresse_by || '',
        adresse_id_dawa: sagTilRedigering.adresse_id_dawa || null,
        adressebetegnelse: sagTilRedigering.adressebetegnelse || '',
        // @# 2025-11-19 20:30 - Hent kommunekode
        kommunekode: sagTilRedigering.kommunekode ? String(sagTilRedigering.kommunekode) : '',

        bolig_type: sagTilRedigering.bolig_type || '',
        bolig_bfe: sagTilRedigering.bolig_bfe || '',
        bolig_matrikel: sagTilRedigering.bolig_matrikel || '',
        bolig_anpart: sagTilRedigering.bolig_anpart || '',
        bolig_anvendelse_id: sagTilRedigering.bolig_anvendelse ? String(sagTilRedigering.bolig_anvendelse.id) : '',

        kommentar: sagTilRedigering.kommentar || '',
      });
    }
  }, [sagTilRedigering, erRedigering]);
  
  useEffect(() => {
    const fetchStatusser = async () => {
        try {
            // @# 2025-11-10 19:20 - Tilføjet ?formaal=1 for kun at hente sags-statusser
            const response = await fetch(`${API_BASE_URL}/kerne/status/?formaal=1`);
            if (!response.ok) throw new Error('Kunne ikke hente statusser');
            // @# 2025-11-10 19:05 - Brug 'any' til at håndtere pagineret/ikke-pagineret svar
            const data: any = await response.json();
            setStatusser(data.results || data);
        } catch (error) {
            console.error('Fejl ved hentning af statusser:', error);
        }
    };
    fetchStatusser();
  }, []);

  useEffect(() => {
    const fetchBbrAnvendelser = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/kerne/bbr-anvendelser/`);
            if (!response.ok) throw new Error('Could not fetch BBR applications');
            const data: BbrAnvendelse[] = await response.json();
            setBbrAnvendelser(data);
        } catch (error) {
           console.error('Error fetching BBR applications:', error);
        }
    };
    fetchBbrAnvendelser();
  }, []);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handleEsc);
    return () => { window.removeEventListener('keydown', handleEsc); };
  }, [onCancel]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSagsData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleAdresseValgt = async (adresse: DawaAdresse) => {
    setSagsData(prevData => ({
      ...prevData,
      adresse_id_dawa: adresse.id,
      adressebetegnelse: adresse.adressebetegnelse,
      adresse_vej: adresse.vejnavn,
      adresse_husnr: adresse.husnr,
      adresse_etage: adresse.etage || '',
      adresse_doer: adresse.dør || '',
      adresse_post_nr: adresse.postnr,
      adresse_by: adresse.postnrnavn,
      // Nulstil detaljer, mens vi henter nye
      bolig_bfe: '',
      bolig_matrikel: '',
      bolig_anvendelse_id: '',
      kommunekode: '', // Nulstil
      byggeaar: '',
      boligareal: '',
    }));

    setIsFetchingDetails(true);

    try {
      const adresseResponse = await fetch(adresse.href);
      const adresseDetaljer = await adresseResponse.json();
      const adgangsAdresseData = adresseDetaljer.adgangsadresse;

      const matrikelnr = adgangsAdresseData?.jordstykke?.matrikelnr || '';
      const bfeNummer = adgangsAdresseData?.bfe_nummer || '';
      
      // @# 2025-11-19 20:30 - Hent kommunekode fra DAWA (ligger i adgangsadresse -> kommune -> kode)
      const kommunekodeRaw = adgangsAdresseData?.kommune?.kode || '';

      const bygningHref = adgangsAdresseData?.bygninger?.[0]?.href;
      let bbrKode = '';
      let byggeaar = '';
      let boligareal = '';
      
      if (bygningHref) {
        const bygningResponse = await fetch(bygningHref);
        const bygningDetaljer = await bygningResponse.json();
        bbrKode = bygningDetaljer.byg_anvendelse?.kode || '';
        byggeaar = bygningDetaljer.opfoerelsesaar || '';
        boligareal = bygningDetaljer.samlet_bolig_areal || '';
      }
      
      const matchendeAnvendelse = bbrAnvendelser.find(a => String(a.kode) === String(bbrKode));
      const anvendelseId = matchendeAnvendelse ? String(matchendeAnvendelse.id) : '';

      setSagsData(prevData => ({
        ...prevData,
        bolig_matrikel: matrikelnr,
        bolig_bfe: bfeNummer,
        bolig_anvendelse_id: anvendelseId,
        kommunekode: kommunekodeRaw, // Gem kommunekoden
        byggeaar: byggeaar,
        boligareal: boligareal,
      }));
    } catch (error) {
      console.error("Error fetching additional address details:", error);
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // @# 2025-11-10 20:10 - Rettet type fra Partial<SagsDataState> til 'any'
    // Objektet er en API-payload, der tillader 'null', hvor SagsDataState kun tillader 'string'.
    const dataToSave: any = { 
      ...sagsData,
      bolig_anvendelse_id: sagsData.bolig_anvendelse_id === '' ? null : sagsData.bolig_anvendelse_id,
      status_id: sagsData.status_id === '' ? null : sagsData.status_id,
      // @# 2025-11-19 20:30 - Konverter kommunekode til int eller null
      kommunekode: sagsData.kommunekode ? parseInt(sagsData.kommunekode, 10) : null
    };

    delete dataToSave.byggeaar;
    delete dataToSave.boligareal;
    // @# 2025-11-10 19:20 - Slet read-only felter (objekter) før 'send'
    delete (dataToSave as any).status;
    delete (dataToSave as any).bolig_anvendelse;
    
    if (!erRedigering) {
      delete dataToSave.sags_nr;
    }

    const url = erRedigering ? `${API_BASE_URL}/sager/${dataToSave.id}/` : `${API_BASE_URL}/sager/`;
    const method = erRedigering ? 'PUT' : 'POST';
    
    try {
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSave) });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: 'Unknown server error.' }));
        console.error('Server error:', errorBody);
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      onSave();
    } catch (error) {
      console.error('Error saving case:', error);
    }
  };

  const erFormularGyldig = sagsData.alias && sagsData.hovedansvarlige;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {erRedigering ? `Rediger Sag: ${sagsData.alias}` : 'Opret Ny Sag'}
        </h2>
        {/* @# 2025-11-15 12:30 - Udskiftet <button> med <Button> */}
        <div className="flex justify-end space-x-4">
           <Button type="button" onClick={onCancel} variant="secondary">
            Annuller (Esc)
          </Button>
           <Button type="submit" onClick={(e) => handleSubmit(e as any)} disabled={!erFormularGyldig} variant="primary">
            Gem Sag
          </Button>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-4 border rounded-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Generelt</h3>
           
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {erRedigering && (
                <div>
                    <label htmlFor="sags_nr" className="block text-sm font-medium text-gray-700">SagsNr</label>
                    <input type="text" id="sags_nr" name="sags_nr" value={sagsData.sags_nr || ''} disabled className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"/>
                </div>
                )}
                <div>
                    <label htmlFor="status_id" className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                        id="status_id"
                        name="status_id"
                        value={sagsData.status_id || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                        <option value="">Vælg status...</option>
                        {statusser.map(status => (
                            <option key={status.id} value={status.id}>
                                {status.status_nummer} - {status.beskrivelse}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="alias" className="block text-sm font-medium text-gray-700">Alias (Påkrævet)</label>
                    <input type="text" id="alias" name="alias" value={sagsData.alias || ''} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/>
                </div>
                <div>
                    {/* @# 2025-11-10 19:20 - Rettet tastefejl </Lavel> til </label> */}
                    <label htmlFor="hovedansvarlige" className="block text-sm font-medium text-gray-700">Hovedansvarlig (Påkrævet)</label>
                    <input type="text" id="hovedansvarlige" name="hovedansvarlige" value={sagsData.hovedansvarlige || ''} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/>
                </div>
            </div>
        </div>
        
        <div className="p-4 border rounded-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Adresse</h3>
            <AdresseSøgning onAdresseValgt={handleAdresseValgt} />
            {isFetchingDetails && <div className="mt-2 text-sm text-gray-500">Henter detaljer...</div>}
            
            <div className="grid grid-cols-12 gap-4 mt-4">
                <div className="col-span-12 sm:col-span-6">
                    <label htmlFor="adresse_vej_vis" className="block text-sm font-medium text-gray-700">Vejnavn</label>
                    <input type="text" id="adresse_vej_vis" value={sagsData.adresse_vej || ''} disabled className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"/>
                </div>
                <div className="col-span-4 sm:col-span-2">
                    <label htmlFor="adresse_husnr_vis" className="block text-sm font-medium text-gray-700">Nr.</label>
                    <input type="text" id="adresse_husnr_vis" value={sagsData.adresse_husnr || ''} disabled className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"/>
                </div>
                <div className="col-span-4 sm:col-span-2">
                    <label htmlFor="adresse_etage_vis" className="block text-sm font-medium text-gray-700">Etage</label>
                    <input type="text" id="adresse_etage_vis" value={sagsData.adresse_etage || ''} disabled className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"/>
                </div>
                <div className="col-span-4 sm:col-span-2">
                    <label htmlFor="adresse_doer_vis" className="block text-sm font-medium text-gray-700">Dør</label>
                    <input type="text" id="adresse_doer_vis" value={sagsData.adresse_doer || ''} disabled className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"/>
                </div>
            </div>
            <div className="grid grid-cols-12 gap-4 mt-4">
                <div className="col-span-12 sm:col-span-4">
                    <label htmlFor="adresse_post_nr_vis" className="block text-sm font-medium text-gray-700">Postnr.</label>
                     <input type="text" id="adresse_post_nr_vis" value={sagsData.adresse_post_nr || ''} disabled className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"/>
                </div>
                <div className="col-span-12 sm:col-span-8">
                    <label htmlFor="adresse_by_vis" className="block text-sm font-medium text-gray-700">By</label>
                    <input type="text" id="adresse_by_vis" value={sagsData.adresse_by || ''} disabled className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"/>
                </div>
            </div>
            
            {/* @# 2025-11-19 20:30 - Visning af kommunekode (skrivebeskyttet) */}
            <div className="mt-4">
                 <label htmlFor="kommunekode_vis" className="block text-sm font-medium text-gray-700">Kommunekode</label>
                 <input type="text" id="kommunekode_vis" value={sagsData.kommunekode || ''} disabled className="mt-1 block w-1/4 px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"/>
            </div>
        </div>
        
        {/* @ 2025-09-14 11:58 - Udkommenteret hele Bolig-blokken */}
        {/* ... (bolig sektion udeladt for klarhed) ... */}
        
        <div>
            <label htmlFor="kommentar" className="block text-sm font-medium text-gray-700">Kommentar</label>
            <textarea id="kommentar" name="kommentar" value={sagsData.kommentar || ''} onChange={handleChange} rows={4} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/>
        </div>

        {/* @# 2025-11-15 12:30 - Udskiftet <button> med <Button> */}
        <div className="flex justify-end space-x-4 pt-4">
          <Button type="button" onClick={onCancel} variant="secondary">
            Annuller (Esc)
          </Button>
          <Button type="submit" onClick={(e) => handleSubmit(e as any)} disabled={!erFormularGyldig} variant="primary">
            Gem Sag
          </Button>
        </div>
      </form>
    </div>
  );
}

export default SagsForm;