// src/pages/BlokInfoSkabelonerPage.jsx
//@ 2025-09-10 21:31 - Rettet import-sti for at løse kompileringsfejl
import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '/src/config.js';
import { PlusCircle, AlertCircle } from 'lucide-react';

function BlokInfoSkabelonerPage() {
  const [skabeloner, setSkabeloner] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function hentSkabeloner() {
      try {
        const response = await fetch(`${API_BASE_URL}/skabeloner/blokinfo/`);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        setSkabeloner(data);
      } catch (e) {
        setError('Kunne ikke hente data. Sikr at backend-serveren kører og API-endpointet er korrekt.');
        console.error("Fejl ved hentning af BlokInfo skabeloner:", e);
      } finally {
        setIsLoading(false);
      }
    }
    hentSkabeloner();
  }, []);

  if (isLoading) {
    return <div className="p-8 text-center">Henter data...</div>;
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-red-600">
        <AlertCircle size={48} className="mb-4" />
        <h2 className="text-xl font-bold mb-2">Fejl</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">BlokInfo Skabeloner</h2>
        <button className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700" title="Opret Ny Skabelon">
          <PlusCircle size={20} />
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-800 text-white text-sm">
            <tr>
              <th className="text-left py-2 px-4 uppercase font-semibold">Formaal</th>
              <th className="text-left py-2 px-4 uppercase font-semibold">Nr</th>
              <th className="text-left py-2 px-4 uppercase font-semibold">Titel (kort)</th>
              <th className="text-left py-2 px-4 uppercase font-semibold">Beskrivelse</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-sm">
            {skabeloner.length > 0 ? (
              skabeloner.map(skabelon => (
                <tr key={skabelon.id} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="py-2 px-4">{skabelon.formaal}</td>
                  <td className="py-2 px-4">{skabelon.nr}</td>
                  <td className="py-2 px-4">{skabelon.titel_kort}</td>
                  <td className="py-2 px-4">{skabelon.beskrivelse}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center py-4">Ingen skabeloner fundet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BlokInfoSkabelonerPage;

