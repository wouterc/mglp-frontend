// --- Fil: src/pages/BlokInfoSkabelonerPage.jsx ---
//@ 2025-09-12 22:55 - Genindsat filter for 'formaal' og rettet 'nr' filter til eksakt match
//@ 2025-09-12 22:50 - Implementeret grupperede rækker med overskrifter baseret på 'formaal'
//@ 2025-09-11 11:25 - Tilføjet funktionalitet til at oprette nye blokinfo-skabeloner
import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { API_BASE_URL } from '/src/config.js';
import { PlusCircle, AlertCircle, Edit, Save, XCircle } from 'lucide-react';

// Hardkodet "enum" for formålsbeskrivelser
const formaalBeskrivelser = {
  1: '1: Procesoversigt (for aktiviteter)',
  2: '2: Grupperinger for Aktiviteter',
  3: '3: Grupperinger for Dokumenter',
};

function BlokInfoSkabelonerPage() {
  const [skabeloner, setSkabeloner] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    formaal: '', // Genindsat
    nr: '',
    titel_kort: '',
    beskrivelse: '',
  });

  const [editingId, setEditingId] = useState(null);
  const [editedData, setEditedData] = useState({});

  const [visOpretForm, setVisOpretForm] = useState(false);
  const [nySkabelonData, setNySkabelonData] = useState({
    formaal: '',
    nr: '',
    titel_kort: '',
    beskrivelse: '',
  });

  const hentSkabeloner = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/skabeloner/blokinfo/`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setSkabeloner(data);
    } catch (e) {
      setError('Kunne ikke hente data. Sikr at backend-serveren kører og API-endpointet er korrekt.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    hentSkabeloner();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prevFilters => ({ ...prevFilters, [name]: value }));
  };

  const filtreredeSkabeloner = useMemo(() => {
    return skabeloner.filter(skabelon => {
      // Tjek for formaal (eksakt match)
      if (filters.formaal && skabelon.formaal.toString() !== filters.formaal) {
        return false;
      }
      // Tjek for nr (eksakt match)
      if (filters.nr && skabelon.nr.toString() !== filters.nr) {
        return false;
      }
      // Tjek for titel_kort (indeholder)
      if (filters.titel_kort && !(skabelon.titel_kort || '').toLowerCase().includes(filters.titel_kort.toLowerCase())) {
        return false;
      }
      // Tjek for beskrivelse (indeholder)
      if (filters.beskrivelse && !(skabelon.beskrivelse || '').toLowerCase().includes(filters.beskrivelse.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [skabeloner, filters]);

  const handleEditClick = (skabelon) => {
    setEditingId(skabelon.id);
    setEditedData({ ...skabelon });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedData({});
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditedData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/skabeloner/blokinfo/${id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedData),
      });
      if (!response.ok) throw new Error('Kunne ikke gemme ændringer.');
      await hentSkabeloner();
      handleCancelEdit();
    } catch (err) {
      setError("Kunne ikke gemme ændringerne. Prøv igen.");
    }
  };

  const handleOpretClick = () => {
    setVisOpretForm(true);
  };
  
  const handleAnnullerOpret = () => {
    setVisOpretForm(false);
    setNySkabelonData({ formaal: '', nr: '', titel_kort: '', beskrivelse: '' });
  };

  const handleNySkabelonChange = (e) => {
    const { name, value } = e.target;
    setNySkabelonData(prev => ({ ...prev, [name]: value }));
  };

  const handleGemNy = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/skabeloner/blokinfo/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nySkabelonData),
      });
      if (!response.ok) throw new Error('Kunne ikke oprette ny skabelon.');
      await hentSkabeloner();
      handleAnnullerOpret();
    } catch (err) {
      setError("Kunne ikke oprette den nye skabelon. Prøv igen.");
    }
  };

  let lastFormaal = null;

  if (isLoading) return <div className="p-8 text-center">Henter data...</div>;
  if (error) return (
    <div className="p-8 flex flex-col items-center justify-center text-red-600">
      <AlertCircle size={48} className="mb-4" /> <h2 className="text-xl font-bold mb-2">Fejl</h2> <p>{error}</p>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">BlokInfo Skabeloner</h2>
        <button onClick={handleOpretClick} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700" title="Opret Ny Skabelon">
          <PlusCircle size={20} />
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full bg-white table-fixed">
          <thead className="bg-gray-800 text-white text-sm">
            <tr>
              <th className="text-left py-1 px-2 uppercase font-semibold w-[15%]">Nr</th>
              <th className="text-left py-1 px-2 uppercase font-semibold w-[40%]">Titel</th>
              <th className="text-left py-1 px-2 uppercase font-semibold w-[35%]">Beskrivelse</th>
              <th className="text-left py-1 px-2 uppercase font-semibold w-[10%]"></th>
            </tr>
            <tr>
              <th className="p-1"><input type="text" name="nr" onChange={handleFilterChange} placeholder="Filtrer..." className="w-full text-black px-1 py-0.5 text-sm rounded-sm border" /></th>
              <th className="p-1"><input type="text" name="titel_kort" onChange={handleFilterChange} placeholder="Filtrer..." className="w-full text-black px-1 py-0.5 text-sm rounded-sm border" /></th>
              <th className="p-1" colSpan="2">
                <div className="flex space-x-2">
                  <input type="text" name="beskrivelse" onChange={handleFilterChange} placeholder="Filtrer beskrivelse..." className="w-full text-black px-1 py-0.5 text-sm rounded-sm border" />
                  <select name="formaal" value={filters.formaal} onChange={handleFilterChange} className="w-full text-black px-1 py-0.5 text-sm rounded-sm border bg-white">
                    <option value="">Alle formål...</option>
                    {Object.entries(formaalBeskrivelser).map(([key, value]) => (
                      <option key={key} value={key}>{value}</option>
                    ))}
                  </select>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-sm">
            {visOpretForm && (
              <tr className="bg-blue-50">
                <td className="py-1 px-2"><input type="number" name="nr" value={nySkabelonData.nr} onChange={handleNySkabelonChange} className="w-full text-black px-1 py-0.5 text-sm rounded-sm border" /></td>
                <td className="py-1 px-2"><input type="text" name="titel_kort" value={nySkabelonData.titel_kort} onChange={handleNySkabelonChange} className="w-full text-black px-1 py-0.5 text-sm rounded-sm border" /></td>
                <td className="py-1 px-2" colSpan="2">
                  <div className="flex items-center space-x-2">
                    <select name="formaal" value={nySkabelonData.formaal} onChange={handleNySkabelonChange} className="w-full text-black px-1 py-0.5 text-sm rounded-sm border bg-white">
                      <option value="">Vælg formål...</option>
                      {Object.entries(formaalBeskrivelser).map(([key, value]) => (
                        <option key={key} value={key}>{value}</option>
                      ))}
                    </select>
                    <button onClick={handleGemNy} title="Gem"><Save size={16} className="text-green-600 hover:text-green-800" /></button>
                    <button onClick={handleAnnullerOpret} title="Annuller"><XCircle size={16} className="text-red-600 hover:text-red-800" /></button>
                  </div>
                </td>
              </tr>
            )}
            {filtreredeSkabeloner.map(skabelon => {
              const showHeader = skabelon.formaal !== lastFormaal;
              if (showHeader) {
                lastFormaal = skabelon.formaal;
              }
              return (
                <Fragment key={skabelon.id}>
                  {showHeader && (
                    <tr className="bg-gray-200 sticky top-0">
                      <td colSpan="4" className="py-1 px-2 font-bold text-gray-700">
                        {formaalBeskrivelser[skabelon.formaal] || `Ukendt Formål (${skabelon.formaal})`}
                      </td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-200 hover:bg-gray-100">
                    {editingId === skabelon.id ? (
                      <>
                        <td className="py-1 px-2">{editedData.nr}</td>
                        <td className="py-1 px-2"><input type="text" name="titel_kort" value={editedData.titel_kort} onChange={handleEditChange} className="w-full text-black px-1 py-0.5 text-sm rounded-sm border" /></td>
                        <td className="py-1 px-2"><input type="text" name="beskrivelse" value={editedData.beskrivelse} onChange={handleEditChange} className="w-full text-black px-1 py-0.5 text-sm rounded-sm border" /></td>
                        <td className="py-1 px-2">
                          <div className="flex items-center space-x-2">
                            <button onClick={() => handleSave(skabelon.id)} title="Gem"><Save size={16} className="text-green-600 hover:text-green-800" /></button>
                            <button onClick={handleCancelEdit} title="Annuller"><XCircle size={16} className="text-red-600 hover:text-red-800" /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-1 px-2">{skabelon.nr}</td>
                        <td className="py-1 px-2 break-words">{skabelon.titel_kort}</td>
                        <td className="py-1 px-2 break-words">{skabelon.beskrivelse}</td>
                        <td className="py-1 px-2">
                          <button onClick={() => handleEditClick(skabelon)} title="Rediger"><Edit size={16} className="text-blue-600 hover:text-blue-800" /></button>
                        </td>
                      </>
                    )}
                  </tr>
                </Fragment>
              )
            })}
            {filtreredeSkabeloner.length === 0 && !visOpretForm && (
              <tr><td colSpan="4" className="text-center py-4">Ingen skabeloner matcher dit filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BlokInfoSkabelonerPage;

