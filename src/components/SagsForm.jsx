// --- Fil: src/components/SagsForm.jsx ---

//@@ 2025-09-09 15:14 - Rettet logik til at hente bygningsdata fra en liste (bygninger)
import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import AdresseSøgning from './AdresseSøgning';
function SagsForm({ onSave, onCancel, sagTilRedigering }) {
  const [sagsData, setSagsData] = useState({
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
    bolig_type: '',
    bolig_bfe: '',
    bolig_matrikel: '',
    bolig_anpart: '',
    bolig_anvendelse_id: '',
    kommentar: '',
    byggeaar: '',
    boligareal: '',
  });

  const [statusser, setStatusser] = useState([]);
  const [bbrAnvendelser, setBbrAnvendelser] = useState([]);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const erRedigering = sagTilRedigering != null;

  useEffect(() => {
    if (erRedigering) {
      setSagsData({
          ...sagTilRedigering,
          status_id: sagTilRedigering.status ? sagTilRedigering.status.id : '',
          bolig_anvendelse_id: sagTilRedigering.bolig_anvendelse ? String(sagTilRedigering.bolig_anvendelse.id) : (sagTilRedigering.bolig_anvendelse_id ? String(sagTilRedigering.bolig_anvendelse_id) : ''),
      });
    }
  }, [sagTilRedigering]);

  useEffect(() => {
    const fetchStatusser = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/kerne/status/`);
            if (!response.ok) throw new Error('Kunne ikke hente statusser');
            const data = await response.json();
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
            const data = await response.json();
            setBbrAnvendelser(data);
        } catch (error) {
            console.error('Error fetching BBR applications:', error);
        }
    };
    fetchBbrAnvendelser();
  }, []);
  useEffect(() => {
    const handleEsc = (event) => { if (event.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handleEsc);
    return () => { window.removeEventListener('keydown', handleEsc); };
  }, [onCancel]);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSagsData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleAdresseValgt = async (adresse) => {
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
      bolig_bfe: '',
      bolig_matrikel: '',
      bolig_anvendelse_id: '',
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
      const anvendelseId = matchendeAnvendelse ? matchendeAnvendelse.id : '';

      setSagsData(prevData => ({
        ...prevData,
        bolig_matrikel: matrikelnr,
        bolig_bfe: bfeNummer,
        bolig_anvendelse_id: anvendelseId,
        byggeaar: byggeaar,
        boligareal: boligareal,
      }));
    } catch (error) {
      console.error("Error fetching additional address details:", error);
    } finally {
      setIsFetchingDetails(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const dataToSave = { 
      ...sagsData,
      bolig_anvendelse_id: sagsData.bolig_anvendelse_id === '' ? null : sagsData.bolig_anvendelse_id,
      status_id: sagsData.status_id === '' ? null : sagsData.status_id
    };

    delete dataToSave.byggeaar;
    delete dataToSave.boligareal;
    delete dataToSave.status;

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
{/* @ 2025-09-14 11:58 - Tilføjet knapper i toppen af formen */}
        <div className="flex justify-end space-x-4">
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Annuller (Esc)</button>
          <button onClick={handleSubmit} disabled={!erFormularGyldig} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
            Gem Sag
          </button>
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
        </div>
        
{/* @ 2025-09-14 11:58 - Udkommenteret hele Bolig-blokken */}
        {/*
        <div className="p-4 border rounded-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Bolig</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bolig_bfe_vis" className="block text-sm font-medium text-gray-700">BFE</label>
                  <input type="text" id="bolig_bfe_vis" value={sagsData.bolig_bfe || ''} disabled className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"/>
                </div>
                <div>
                  <label htmlFor="bolig_matrikel_vis" className="block text-sm font-medium text-gray-700">Matrikel</label>
                  <input type="text" id="bolig_matrikel_vis" value={sagsData.bolig_matrikel || ''} disabled className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"/>
                </div>
                <div>
                  <label htmlFor="byggeaar" className="block text-sm font-medium text-gray-700">Byggeår</label>
                  <input type="text" id="byggeaar" value={sagsData.byggeaar || ''} disabled className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"/>
                </div>
                <div>
                  <label htmlFor="boligareal" className="block text-sm font-medium text-gray-700">Boligareal (m²)</label>
                  <input type="text" id="boligareal" value={sagsData.boligareal || ''} disabled className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"/>
                </div>
            </div>
            <div className="mt-4">
                <label htmlFor="bolig_anvendelse_id" className="block text-sm font-medium text-gray-700">BBR Anvendelse</label>
                <select
                     id="bolig_anvendelse_id"
                    name="bolig_anvendelse_id"
                    value={sagsData.bolig_anvendelse_id || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                    <option value="">Vælg anvendelse...</option>
                     {bbrAnvendelser.map(anvendelse => (
                        <option key={anvendelse.id} value={anvendelse.id}>
                            {anvendelse.kode} - {anvendelse.beskrivelse}
                        </option>
                     ))}
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                  <label htmlFor="bolig_anpart" className="block text-sm font-medium text-gray-700">Anpart</label>
                   <input type="text" id="bolig_anpart" name="bolig_anpart" placeholder="Indtast anpart manuelt" value={sagsData.bolig_anpart || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/>
              </div>
              <div>
                  <label htmlFor="bolig_type" className="block text-sm font-medium text-gray-700">Type</label>
                  <input type="text" id="bolig_type" name="bolig_type" placeholder="Indtast type manuelt" value={sagsData.bolig_type || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/>
              </div>
            </div>
        </div>
        */}
        
        <div>
            <label htmlFor="kommentar" className="block text-sm font-medium text-gray-700">Kommentar</label>
             <textarea id="kommentar" name="kommentar" value={sagsData.kommentar || ''} onChange={handleChange} rows="4" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Annuller (Esc)</button>
          <button type="submit" disabled={!erFormularGyldig} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
            Gem Sag
           </button>
        </div>
      </form>
    </div>
  );
}

export default SagsForm;