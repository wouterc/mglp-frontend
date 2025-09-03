// src/components/SagsForm.jsx
import React, { useState, useEffect } from 'react';

function SagsForm({ onSave, onCancel, sagTilRedigering, alleStatusser }) {
  const [sagsData, setSagsData] = useState({
    sags_nr: '',
    alias: '',
    hovedansvarlige: '',
    status: null,
  });
  const [statusInput, setStatusInput] = useState('');
  const [error, setError] = useState('');

  const erRedigering = sagTilRedigering != null;

  useEffect(() => {
    if (erRedigering) {
      setSagsData({
        ...sagTilRedigering,
        status: sagTilRedigering.status ? sagTilRedigering.status.id : null,
      });
      setStatusInput(sagTilRedigering.status ? `${sagTilRedigering.status.status_nummer} - ${sagTilRedigering.status.beskrivelse}` : '');
    }
  }, [sagTilRedigering, erRedigering]);

  useEffect(() => {
    const handleEsc = (event) => { if (event.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handleEsc);
    return () => { window.removeEventListener('keydown', handleEsc); };
  }, [onCancel]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSagsData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleStatusChange = (e) => {
    const value = e.target.value;
    setStatusInput(value);
    
    const fundetStatus = alleStatusser.find(s => 
        s.status_nummer.toString() === value || 
        `${s.status_nummer} - ${s.beskrivelse}` === value
    );

    if (fundetStatus) {
      setSagsData(prevData => ({ ...prevData, status: fundetStatus.id }));
      setError('');
    } else {
      setSagsData(prevData => ({ ...prevData, status: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!sagsData.status) {
        const fundetStatus = alleStatusser.find(s => s.status_nummer.toString() === statusInput);
        if(fundetStatus) {
            sagsData.status = fundetStatus.id;
        } else {
            setError('Ugyldig status. Vælg venligst fra listen eller indtast et gyldigt nummer.');
            return;
        }
    }
    
    const dataToSave = { ...sagsData };
    
    const erRedigering = dataToSave.id != null;
    const url = erRedigering ? `http://127.0.0.1:8000/api/sager/${dataToSave.id}/` : '[http://127.0.0.1:8000/api/sager/](http://127.0.0.1:8000/api/sager/)';
    const method = erRedigering ? 'PUT' : 'POST';
    try {
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSave) });
      if (!response.ok) throw new Error('Netværks-svar var ikke ok');
      onSave();
    } catch (error) { 
      console.error('Fejl ved lagring af sag:', error); 
      setError('Kunne ikke gemme sagen. Prøv igen.');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {erRedigering ? `Rediger Sag: ${sagTilRedigering.alias}` : 'Opret Ny Sag'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label htmlFor="sags_nr" className="block text-sm font-medium text-gray-700">SagsNr</label><input type="text" id="sags_nr" name="sags_nr" value={sagsData.sags_nr || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100" disabled={erRedigering} required={!erRedigering}/></div>
        <div><label htmlFor="alias" className="block text-sm font-medium text-gray-700">Alias</label><input type="text" id="alias" name="alias" value={sagsData.alias || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required/></div>
        <div><label htmlFor="hovedansvarlige" className="block text-sm font-medium text-gray-700">Hovedansvarlig</label><input type="text" id="hovedansvarlige" name="hovedansvarlige" value={sagsData.hovedansvarlige || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required/></div>
        
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
          <input
            list="status-options"
            id="status"
            name="status"
            value={statusInput}
            onChange={handleStatusChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Skriv statusnr. eller vælg fra listen"
          />
          <datalist id="status-options">
            {alleStatusser.map(status => (
              <option key={status.id} value={`${status.status_nummer} - ${status.beskrivelse}`} />
            ))}
          </datalist>
        </div>
        
        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex justify-end space-x-4 pt-4">
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Annuller (Esc)</button>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Gem Sag</button>
        </div>
      </form>
    </div>
  );
}

export default SagsForm;
