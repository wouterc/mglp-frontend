// src/components/SagsForm.jsx
import React, { useState, useEffect } from 'react';

function SagsForm({ onSave, onCancel, sagTilRedigering }) {
  const [sagsData, setSagsData] = useState({
    sags_nr: '',
    alias: '',
    hovedansvarlige: '',
    status: '', // Tilføjet status
  });

  const erRedigering = sagTilRedigering != null;

  useEffect(() => {
    if (erRedigering) {
      setSagsData(sagTilRedigering);
    }
  }, [sagTilRedigering, erRedigering]);

  // Ny effekt til at lytte efter Escape-tasten
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onCancel(); // Kald annuller-funktionen
      }
    };
    window.addEventListener('keydown', handleEsc);

    // Vigtig oprydnings-funktion: fjerner event listener, når komponenten forsvinder
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onCancel]); // Dependency-array sikrer, at funktionen er opdateret

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSagsData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(sagsData);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {erRedigering ? `Rediger Sag: ${sagsData.alias}` : 'Opret Ny Sag'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="sags_nr" className="block text-sm font-medium text-gray-700">SagsNr</label>
          <input
            type="text"
            id="sags_nr"
            name="sags_nr"
            value={sagsData.sags_nr || ''}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
            disabled={erRedigering} // Gør feltet skrivebeskyttet ved redigering
            required={!erRedigering} // Kun påkrævet ved oprettelse
          />
        </div>
        <div>
          <label htmlFor="alias" className="block text-sm font-medium text-gray-700">Alias</label>
          <input
            type="text"
            id="alias"
            name="alias"
            value={sagsData.alias || ''}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            required
          />
        </div>
        <div>
          <label htmlFor="hovedansvarlige" className="block text-sm font-medium text-gray-700">Hovedansvarlig</label>
          <input
            type="text"
            id="hovedansvarlige"
            name="hovedansvarlige"
            value={sagsData.hovedansvarlige || ''}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            required
          />
        </div>
        {/* Nyt felt til Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
          <input
            type="number"
            id="status"
            name="status"
            value={sagsData.status || ''}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
            Annuller (Esc)
          </button>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Gem Sag
          </button>
        </div>
      </form>
    </div>
  );
}

export default SagsForm;
