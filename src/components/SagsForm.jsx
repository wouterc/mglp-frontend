// src/components/SagsForm.jsx
import React, { useState, useEffect } from 'react';

function SagsForm({ onSave, onCancel, sagTilRedigering, alleStatusser }) {
  // Udvid state til at inkludere alle nye felter
  const [sagsData, setSagsData] = useState({
    alias: '',
    hovedansvarlige: '',
    adresse_vej: '',
    adresse_post_nr: '',
    adresse_by: '',
    bolig_type: '',
    bolig_bfe: '',
    bolig_matrikel: '',
    bolig_anpart: '',
    kommentar: '',
  });

  const erRedigering = sagTilRedigering != null;

  useEffect(() => {
    if (erRedigering) {
      // Hvis vi redigerer, fyld formularen med eksisterende data
      setSagsData({
          ...sagTilRedigering,
          status: sagTilRedigering.status ? sagTilRedigering.status.id : null,
      });
    }
  }, [sagTilRedigering]);

  useEffect(() => {
    const handleEsc = (event) => { if (event.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handleEsc);
    return () => { window.removeEventListener('keydown', handleEsc); };
  }, [onCancel]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSagsData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dataToSave = { ...sagsData };

    // Ved oprettelse skal vi ikke sende sags_nr eller status med. Backend håndterer det.
    if (!erRedigering) {
      delete dataToSave.sags_nr;
      delete dataToSave.status;
    }
    
    // ... (eksisterende logik til at sende data) ...
    const url = erRedigering ? `http://127.0.0.1:8000/api/sager/${dataToSave.id}/` : 'http://127.0.0.1:8000/api/sager/';
    const method = erRedigering ? 'PUT' : 'POST';
    try {
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSave) });
      if (!response.ok) throw new Error('Netværks-svar var ikke ok');
      onSave();
    } catch (error) { console.error('Fejl ved lagring af sag:', error); }
  };
  
  // Tjek om de påkrævede felter er udfyldt for at aktivere "Gem"-knappen
  const erFormularGyldig = sagsData.alias && sagsData.hovedansvarlige;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {erRedigering ? `Rediger Sag: ${sagsData.alias}` : 'Opret Ny Sag'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Generel Information */}
        <div className="p-4 border rounded-md">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Generelt</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SagsNr vises kun ved redigering */}
            {erRedigering && (
              <div>
                <label htmlFor="sags_nr" className="block text-sm font-medium text-gray-700">SagsNr</label>
                <input type="text" id="sags_nr" name="sags_nr" value={sagsData.sags_nr || ''} disabled className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"/>
              </div>
            )}
            {/* Status vises kun ved redigering */}
             {erRedigering && (
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                <input type="text" id="status" name="status" value={sagsData.status ? `${sagsData.status.status_nummer} - ${sagsData.status.beskrivelse}` : ''} disabled className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"/>
              </div>
            )}
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

        {/* Adresse Information */}
        <div className="p-4 border rounded-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Adresse</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <label htmlFor="adresse_vej" className="block text-sm font-medium text-gray-700">Vejnavn og Nr.</label>
                    <input type="text" id="adresse_vej" name="adresse_vej" value={sagsData.adresse_vej || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/>
                </div>
                <div>
                    <label htmlFor="adresse_post_nr" className="block text-sm font-medium text-gray-700">Postnr.</label>
                    <input type="text" id="adresse_post_nr" name="adresse_post_nr" value={sagsData.adresse_post_nr || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/>
                </div>
                <div className="md:col-span-3">
                    <label htmlFor="adresse_by" className="block text-sm font-medium text-gray-700">By</label>
                    <input type="text" id="adresse_by" name="adresse_by" value={sagsData.adresse_by || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/>
                </div>
            </div>
        </div>

        {/* Bolig Information */}
        <div className="p-4 border rounded-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Bolig</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="bolig_type" placeholder="Type" value={sagsData.bolig_type || ''} onChange={handleChange} className="p-2 border border-gray-300 rounded-md sm:text-sm"/>
                <input type="text" name="bolig_bfe" placeholder="BFE" value={sagsData.bolig_bfe || ''} onChange={handleChange} className="p-2 border border-gray-300 rounded-md sm:text-sm"/>
                <input type="text" name="bolig_matrikel" placeholder="Matrikel" value={sagsData.bolig_matrikel || ''} onChange={handleChange} className="p-2 border border-gray-300 rounded-md sm:text-sm"/>
                <input type="text" name="bolig_anpart" placeholder="Anpart" value={sagsData.bolig_anpart || ''} onChange={handleChange} className="p-2 border border-gray-300 rounded-md sm:text-sm"/>
            </div>
        </div>

        {/* Kommentar */}
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
