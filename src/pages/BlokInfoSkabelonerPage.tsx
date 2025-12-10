// --- Fil: src/pages/BlokInfoSkabelonerPage.tsx ---
// @# 2025-11-23 19:15 - Tilføjet Import/Export funktionalitet (Excel).
import React, { useState, useEffect, useMemo, Fragment, ChangeEvent, ReactElement, useCallback } from 'react';
import { API_BASE_URL } from '../config.ts';
import { PlusCircle, AlertCircle, Edit, Save, XCircle, UploadCloud, Download, Loader2 } from 'lucide-react';
import type { Blokinfo } from '../types.ts';
import { useAppState } from '../StateContext.js';
import CsvImportModal from '../components/CsvImportModal';
import * as XLSX from 'xlsx'; 

const formaalBeskrivelser: { [key: number]: string } = {
  1: '1: Procesoversigt (for aktiviteter)',
  2: '2: Grupperinger for Aktiviteter',
  3: '3: Grupperinger for Dokumenter',
};

function BlokInfoSkabelonerPage(): ReactElement {
  const { state, dispatch } = useAppState();
  const {
    blokinfoSkabeloner: skabeloner,
    blokinfoSkabelonerFilters: filters,
    blokinfoSkabelonerIsLoading: isLoading,
    blokinfoSkabelonerError: error,
    erBlokinfoSkabelonerHentet,
  } = state;

  // State til redigering/oprettelse
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedData, setEditedData] = useState<Partial<Blokinfo>>({});
  const [visOpretForm, setVisOpretForm] = useState<boolean>(false);
  const [nySkabelonData, setNySkabelonData] = useState({ formaal: '', nr: '', titel_kort: '', beskrivelse: '' });

  // State til Import/Export
  const [visImportModal, setVisImportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const hentSkabeloner = useCallback(async () => {
    if (erBlokinfoSkabelonerHentet && !visImportModal) return;

    dispatch({ type: 'SET_BLOKINFO_SKABELONER_STATE', payload: { blokinfoSkabelonerIsLoading: true, blokinfoSkabelonerError: null } });
    try {
      const response = await fetch(`${API_BASE_URL}/skabeloner/blokinfo/`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data: Blokinfo[] = await response.json();
      dispatch({ type: 'SET_BLOKINFO_SKABELONER_STATE', payload: { blokinfoSkabeloner: data, erBlokinfoSkabelonerHentet: true } });
    } catch (e) {
      dispatch({ type: 'SET_BLOKINFO_SKABELONER_STATE', payload: { blokinfoSkabelonerError: 'Kunne ikke hente data.' } });
    } finally {
      dispatch({ type: 'SET_BLOKINFO_SKABELONER_STATE', payload: { blokinfoSkabelonerIsLoading: false } });
    }
  }, [dispatch, erBlokinfoSkabelonerHentet, visImportModal]);

  useEffect(() => {
    hentSkabeloner();
  }, [hentSkabeloner]);

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    dispatch({ type: 'SET_BLOKINFO_SKABELONER_STATE', payload: { blokinfoSkabelonerFilters: { ...filters, [name]: value } } });
  };

  const filtreredeSkabeloner = useMemo(() => {
    return skabeloner.filter(skabelon => {
      if (filters.formaal && skabelon.formaal.toString() !== filters.formaal) return false;
      if (filters.nr && skabelon.nr.toString() !== filters.nr) return false;
      if (filters.titel_kort && !(skabelon.titel_kort || '').toLowerCase().includes(filters.titel_kort.toLowerCase())) return false;
      if (filters.beskrivelse && !(skabelon.beskrivelse || '').toLowerCase().includes(filters.beskrivelse.toLowerCase())) return false;
      return true;
    });
  }, [skabeloner, filters]);

  // --- EKSPORT FUNKTION ---
  const handleExport = () => {
    setIsExporting(true);
    try {
      // Vi eksporterer ALTID alle skabeloner, hvis der ikke er filtre, ellers de filtrerede
      const dataToExport = filtreredeSkabeloner;

      if (dataToExport.length === 0) {
        alert("Ingen data at eksportere.");
        setIsExporting(false);
        return;
      }

      const excelData = dataToExport.map(s => ({
        id: s.id,
        formaal: s.formaal,
        nr: s.nr,
        titel_kort: s.titel_kort,
        beskrivelse: s.beskrivelse
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "BlokInfo");
      XLSX.writeFile(workbook, `blokinfo_export_${new Date().toISOString().slice(0,10)}.xlsx`);

    } catch (e) {
      console.error(e);
      alert("Fejl ved eksport");
    } finally {
      setIsExporting(false);
    }
  };

  const handleEditClick = (skabelon: Blokinfo) => {
    setEditingId(skabelon.id);
    setEditedData({ ...skabelon });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedData({});
  };

  const handleEditChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/skabeloner/blokinfo/${id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedData),
      });
      if (!response.ok) throw new Error('Kunne ikke gemme ændringer.');
      dispatch({ type: 'SET_BLOKINFO_SKABELONER_STATE', payload: { erBlokinfoSkabelonerHentet: false } });
      hentSkabeloner(); // Genindlæs for at opdatere listen
      handleCancelEdit();
    } catch (err) {
      dispatch({ type: 'SET_BLOKINFO_SKABELONER_STATE', payload: { blokinfoSkabelonerError: "Kunne ikke gemme ændringerne." } });
    }
  };

  const handleOpretClick = () => setVisOpretForm(true);
  const handleAnnullerOpret = () => {
    setVisOpretForm(false);
    setNySkabelonData({ formaal: '', nr: '', titel_kort: '', beskrivelse: '' });
  };

  const handleNySkabelonChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      dispatch({ type: 'SET_BLOKINFO_SKABELONER_STATE', payload: { erBlokinfoSkabelonerHentet: false } });
      hentSkabeloner(); 
      handleAnnullerOpret();
    } catch (err) {
      dispatch({ type: 'SET_BLOKINFO_SKABELONER_STATE', payload: { blokinfoSkabelonerError: "Kunne ikke oprette ny skabelon." } });
    }
  };

  let lastFormaal: number | null = null;

  if (isLoading && !erBlokinfoSkabelonerHentet) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600"/></div>;
  
  if (error) return (
    <div className="p-8 flex flex-col items-center justify-center text-red-600">
      <AlertCircle size={48} className="mb-4" /> <h2 className="text-xl font-bold mb-2">Fejl</h2> <p>{error}</p>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      
      {/* IMPORT MODAL */}
      <CsvImportModal
        isOpen={visImportModal}
        onClose={() => setVisImportModal(false)}
        onImportComplete={() => {
            setVisImportModal(false);
            dispatch({ type: 'SET_BLOKINFO_SKABELONER_STATE', payload: { erBlokinfoSkabelonerHentet: false } });
            hentSkabeloner();
        }}
        title="Importer BlokInfo (Excel)"
        type="blokinfo"
      />

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">BlokInfo Skabeloner</h2>
        <div className="flex space-x-2">
            {/* EKSPORT KNAP */}
            <button onClick={handleExport} disabled={isExporting} className="p-2 bg-white text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50" title="Eksportér til Excel">
                {isExporting ? <Loader2 size={20} className="animate-spin"/> : <Download size={20}/>}
            </button>
            
            {/* IMPORT KNAP */}
            <button onClick={() => setVisImportModal(true)} className="p-2 bg-white text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50" title="Importer fra Excel">
                <UploadCloud size={20}/>
            </button>

            <button onClick={handleOpretClick} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700" title="Opret Ny Skabelon">
              <PlusCircle size={20} />
            </button>
        </div>
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
              <th className="p-1"><input type="text" name="nr" value={filters.nr} onChange={handleFilterChange} placeholder="Filtrer..." className="w-full text-black px-1 py-0.5 text-sm rounded-sm border" /></th>
              <th className="p-1"><input type="text" name="titel_kort" value={filters.titel_kort} onChange={handleFilterChange} placeholder="Filtrer..." className="w-full text-black px-1 py-0.5 text-sm rounded-sm border" /></th>
              <th className="p-1" colSpan={2}>
                <div className="flex space-x-2">
                  <input type="text" name="beskrivelse" value={filters.beskrivelse} onChange={handleFilterChange} placeholder="Filtrer beskrivelse..." className="w-full text-black px-1 py-0.5 text-sm rounded-sm border" />
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
                <td className="py-1 px-2" colSpan={2}>
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
              if (showHeader) lastFormaal = skabelon.formaal;
              return (
                <Fragment key={skabelon.id}>
                  {showHeader && (
                    <tr className="bg-gray-200 sticky top-0">
                      <td colSpan={4} className="py-1 px-2 font-bold text-gray-700">
                        {formaalBeskrivelser[skabelon.formaal] || `Ukendt Formål (${skabelon.formaal})`}
                      </td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-200 hover:bg-gray-100">
                    {editingId === skabelon.id ? (
                      <>
                        <td className="py-1 px-2">{editedData.nr}</td>
                        <td className="py-1 px-2"><input type="text" name="titel_kort" value={editedData.titel_kort || ''} onChange={handleEditChange} className="w-full text-black px-1 py-0.5 text-sm rounded-sm border" /></td>
                        <td className="py-1 px-2"><input type="text" name="beskrivelse" value={editedData.beskrivelse || ''} onChange={handleEditChange} className="w-full text-black px-1 py-0.5 text-sm rounded-sm border" /></td>
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
              <tr><td colSpan={4} className="text-center py-4">Ingen skabeloner matcher dit filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BlokInfoSkabelonerPage;