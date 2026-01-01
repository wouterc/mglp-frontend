// --- Fil: src/pages/BlokInfoSkabelonerPage.tsx ---
// @# 2025-11-23 19:15 - Tilføjet Import/Export funktionalitet (Excel).
import React, { useState, useEffect, useMemo, Fragment, ChangeEvent, ReactElement, useCallback } from 'react';
import { api } from '../api';
import { PlusCircle, AlertCircle, Edit, Save, XCircle, UploadCloud, Download, Loader2, Maximize2 } from 'lucide-react';
import type { Blokinfo } from '../types.ts';
import { useAppState } from '../StateContext.js';
import CsvImportModal from '../components/CsvImportModal';
import * as XLSX from 'xlsx';

interface InlineEditorProps {
  value: string | null | undefined;
  onSave: (value: string) => void;
  onEdit?: () => void;
  onBlur?: () => void;
  onExpand?: () => void;
  placeholder?: string;
}

const InlineTextEditor = ({ value, onSave, onEdit, onBlur, onExpand, placeholder }: InlineEditorProps) => {
  const [text, setText] = useState(value || '');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => { setText(value || ''); }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    if (text !== (value || '')) onSave(text);
    if (onBlur) onBlur();
  };

  if (!isEditing) {
    return (
      <div
        className="cursor-text py-1 px-2 rounded hover:bg-blue-50/50 group/editor relative min-h-[24px] flex items-center"
        onClick={() => {
          setIsEditing(true);
          if (onEdit) onEdit();
        }}
      >
        <span className={`truncate flex-1 ${!text ? 'text-gray-300 italic' : 'text-gray-700'}`}>
          {text || placeholder || 'Klik for at skrive...'}
        </span>
        {onExpand && (
          <button
            onClick={(e) => { e.stopPropagation(); onExpand(); }}
            className="p-1 text-gray-400 hover:text-blue-600 opacity-0 group-hover/editor:opacity-100 transition-opacity"
          >
            <Maximize2 size={12} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 w-full bg-white rounded border border-blue-400 p-0.5">
      <input
        autoFocus
        type="text"
        value={text}
        className="flex-1 text-xs px-1 py-0.5 outline-none text-black bg-transparent"
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
      />
      {onExpand && (
        <button onMouseDown={(e) => { e.preventDefault(); onExpand(); }} className="p-1 text-blue-500">
          <Maximize2 size={12} />
        </button>
      )}
    </div>
  );
};

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
  // State til den celle der lige nu redigeres
  const [activeCell, setActiveCell] = useState<{ id: number; field: string; value: any } | null>(null);
  const [visOpretForm, setVisOpretForm] = useState<boolean>(false);
  const [nySkabelonData, setNySkabelonData] = useState({ formaal: '', nr: '', titel_kort: '', beskrivelse: '', proces_id: '' });

  // State til Import/Export
  const [visImportModal, setVisImportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const hentSkabeloner = useCallback(async () => {
    if (erBlokinfoSkabelonerHentet && !visImportModal) return;

    // Kun sæt isLoading hvis vi slet ikke har data endnu (for at undgå flicker ved opdateringer)
    const shouldShowLoading = !erBlokinfoSkabelonerHentet;
    if (shouldShowLoading) {
      dispatch({ type: 'SET_BLOKINFO_SKABELONER_STATE', payload: { blokinfoSkabelonerIsLoading: true, blokinfoSkabelonerError: null } });
    }

    try {
      const data = await api.get<Blokinfo[]>('/skabeloner/blokinfo/');
      dispatch({ type: 'SET_BLOKINFO_SKABELONER_STATE', payload: { blokinfoSkabeloner: data, erBlokinfoSkabelonerHentet: true } });
    } catch (e) {
      dispatch({ type: 'SET_BLOKINFO_SKABELONER_STATE', payload: { blokinfoSkabelonerError: 'Kunne ikke hente data.' } });
    } finally {
      if (shouldShowLoading) {
        dispatch({ type: 'SET_BLOKINFO_SKABELONER_STATE', payload: { blokinfoSkabelonerIsLoading: false } });
      }
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

  const procesMuligheder = useMemo(() => skabeloner.filter(s => s.formaal === 1), [skabeloner]);

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
      XLSX.writeFile(workbook, `blokinfo_export_${new Date().toISOString().slice(0, 10)}.xlsx`);

    } catch (e) {
      console.error(e);
      alert("Fejl ved eksport");
    } finally {
      setIsExporting(false);
    }
  };

  const handleQuickUpdate = async (skabelon: Blokinfo, updates: Partial<Blokinfo>) => {
    try {
      const updatedSkabelon = await api.put<Blokinfo>(`/skabeloner/blokinfo/${skabelon.id}/`, { ...skabelon, ...updates });

      // Opdater lokal state med det samme
      const nyeSkabeloner = skabeloner.map(s => s.id === skabelon.id ? updatedSkabelon : s);
      dispatch({ type: 'SET_BLOKINFO_SKABELONER_STATE', payload: { blokinfoSkabeloner: nyeSkabeloner } });
    } catch (err) {
      dispatch({ type: 'SET_BLOKINFO_SKABELONER_STATE', payload: { blokinfoSkabelonerError: "Kunne ikke opdatere feltet." } });
    }
  };

  const handleQuickSaveProces = async (skabelon: Blokinfo, newProcesId: string) => {
    try {
      const proces_id = newProcesId === '' ? null : Number(newProcesId);
      const updatedSkabelon = await api.put<Blokinfo>(`/skabeloner/blokinfo/${skabelon.id}/`, { ...skabelon, proces_id });

      // Opdater lokal state med det samme
      const nyeSkabeloner = skabeloner.map(s => s.id === skabelon.id ? updatedSkabelon : s);
      dispatch({ type: 'SET_BLOKINFO_SKABELONER_STATE', payload: { blokinfoSkabeloner: nyeSkabeloner } });
    } catch (err) {
      dispatch({ type: 'SET_BLOKINFO_SKABELONER_STATE', payload: { blokinfoSkabelonerError: "Kunne ikke opdatere proces." } });
    }
  };

  const handleOpretClick = () => setVisOpretForm(true);
  const handleAnnullerOpret = () => {
    setVisOpretForm(false);
    setNySkabelonData({ formaal: '', nr: '', titel_kort: '', beskrivelse: '', proces_id: '' });
  };

  const handleNySkabelonChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNySkabelonData(prev => ({ ...prev, [name]: value }));
  };

  const handleGemNy = async () => {
    try {
      const nySkabelon = await api.post<Blokinfo>(`/skabeloner/blokinfo/`, nySkabelonData);

      // Tilføj den nye til den lokale liste
      const nyeSkabeloner = [...skabeloner, nySkabelon];
      dispatch({ type: 'SET_BLOKINFO_SKABELONER_STATE', payload: { blokinfoSkabeloner: nyeSkabeloner } });

      handleAnnullerOpret();
    } catch (err) {
      dispatch({ type: 'SET_BLOKINFO_SKABELONER_STATE', payload: { blokinfoSkabelonerError: "Kunne ikke oprette ny skabelon." } });
    }
  };

  let lastFormaal: number | null = null;

  if (isLoading && !erBlokinfoSkabelonerHentet) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;

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
            {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
          </button>

          {/* IMPORT KNAP */}
          <button onClick={() => setVisImportModal(true)} className="p-2 bg-white text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50" title="Importer fra Excel">
            <UploadCloud size={20} />
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
              <th className="text-left py-1 px-2 uppercase font-semibold w-[10%]">Nr</th>
              <th className="text-left py-1 px-2 uppercase font-semibold w-[30%]">Titel</th>
              <th className="text-left py-1 px-2 uppercase font-semibold w-[35%]">Beskrivelse</th>
              <th className="text-left py-1 px-2 uppercase font-semibold w-[25%]">Proces (Relateret)</th>
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
                    <select name="formaal" value={nySkabelonData.formaal} onChange={handleNySkabelonChange} className="w-1/3 text-black px-1 py-0.5 text-sm rounded-sm border bg-white">
                      <option value="">Vælg formål...</option>
                      {Object.entries(formaalBeskrivelser).map(([key, value]) => (
                        <option key={key} value={key}>{value}</option>
                      ))}
                    </select>
                    {Number(nySkabelonData.formaal) > 1 && (
                      <select name="proces_id" value={nySkabelonData.proces_id} onChange={handleNySkabelonChange} className="w-2/3 text-black px-1 py-0.5 text-sm rounded-sm border bg-white">
                        <option value="">Ingen proces valgt...</option>
                        {procesMuligheder.map(p => (
                          <option key={p.id} value={p.id}>{p.nr} - {p.titel_kort}</option>
                        ))}
                      </select>
                    )}
                    <button onClick={handleGemNy} title="Gem"><Save size={16} className="text-green-600 hover:text-green-800" /></button>
                    <button onClick={handleAnnullerOpret} title="Annuller"><XCircle size={16} className="text-red-600 hover:text-red-800" /></button>
                  </div>
                </td>
              </tr>
            )}
            {filtreredeSkabeloner.map(skabelon => {
              const showHeader = skabelon.formaal !== lastFormaal;
              if (showHeader) lastFormaal = skabelon.formaal;

              const isCellActive = (field: string) => activeCell?.id === skabelon.id && activeCell?.field === field;

              return (
                <Fragment key={skabelon.id}>
                  {showHeader && (
                    <tr className="bg-gray-200 sticky top-0">
                      <td colSpan={4} className="py-1.5 px-3 font-bold text-gray-700 text-base border-y border-gray-300">
                        {formaalBeskrivelser[skabelon.formaal] || `Ukendt Formål (${skabelon.formaal})`}
                      </td>
                    </tr>
                  )}
                  <tr className={`border-b transition-all group ${activeCell?.id === skabelon.id ? 'shadow-[inset_0_-2px_0_0_#ef4444] bg-red-50/30' : 'border-gray-100 hover:bg-gray-50'}`}>
                    {/* NR FELT */}
                    <td className="py-2 px-2 text-center">
                      {isCellActive('nr') ? (
                        <input
                          autoFocus
                          type="number"
                          value={activeCell?.value ?? ''}
                          className="w-full text-black px-2 py-1 text-sm rounded border border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none"
                          onChange={(e) => setActiveCell({ ...activeCell!, value: e.target.value })}
                          onBlur={() => {
                            if (activeCell?.value !== undefined) {
                              handleQuickUpdate(skabelon, { nr: Number(activeCell.value) });
                            }
                            setActiveCell(null);
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        />
                      ) : (
                        <div
                          className="font-medium text-gray-500 cursor-text py-1 hover:bg-blue-50/50 rounded transition-colors"
                          onClick={() => setActiveCell({ id: skabelon.id, field: 'nr', value: skabelon.nr })}
                        >
                          {skabelon.nr}
                        </div>
                      )}
                    </td>

                    {/* TITEL FELT */}
                    <td className="py-2 px-2">
                      {isCellActive('titel_kort') ? (
                        <input
                          autoFocus
                          type="text"
                          value={activeCell?.value ?? ''}
                          className="w-full text-black px-2 py-1 text-sm rounded border border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none"
                          onChange={(e) => setActiveCell({ ...activeCell!, value: e.target.value })}
                          onBlur={() => {
                            if (activeCell?.value !== undefined) {
                              handleQuickUpdate(skabelon, { titel_kort: activeCell.value });
                            }
                            setActiveCell(null);
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        />
                      ) : (
                        <div
                          className="font-semibold text-gray-800 cursor-text py-1 px-2 hover:bg-blue-50/50 rounded truncate transition-colors"
                          onClick={() => setActiveCell({ id: skabelon.id, field: 'titel_kort', value: skabelon.titel_kort })}
                        >
                          {skabelon.titel_kort}
                        </div>
                      )}
                    </td>

                    {/* BESKRIVELSE FELT */}
                    <td className="py-2 px-2 max-w-0">
                      <InlineTextEditor
                        value={skabelon.beskrivelse}
                        placeholder="Klik for beskrivelse..."
                        onEdit={() => setActiveCell({ id: skabelon.id, field: 'beskrivelse', value: skabelon.beskrivelse })}
                        onBlur={() => setActiveCell(null)}
                        onSave={(val) => handleQuickUpdate(skabelon, { beskrivelse: val })}
                        onExpand={() => setActiveCell({ id: skabelon.id, field: 'beskrivelse_expanded', value: skabelon.beskrivelse })}
                      />
                      {isCellActive('beskrivelse_expanded') && (
                        <div className="absolute z-50 bg-white p-3 shadow-2xl border rounded mt-1 left-1/3 min-w-[500px]">
                          <label className="block text-xs font-bold mb-1 text-gray-500">Beskrivelse:</label>
                          <textarea
                            autoFocus
                            value={activeCell?.value ?? ''}
                            className="w-full p-2 text-sm border rounded h-48 focus:ring-1 focus:ring-blue-400 outline-none"
                            onChange={(e) => setActiveCell({ ...activeCell!, value: e.target.value })}
                            onBlur={() => {
                              handleQuickUpdate(skabelon, { beskrivelse: activeCell?.value });
                              setActiveCell(null);
                            }}
                          />
                        </div>
                      )}
                    </td>

                    {/* PROCES FELT (ALTID SELECT) */}
                    <td className="py-2 px-2" onClick={(e) => e.stopPropagation()}>
                      {skabelon.formaal > 1 ? (
                        <select
                          value={skabelon.proces_id || ''}
                          onChange={(e) => handleQuickSaveProces(skabelon, e.target.value)}
                          className="w-full text-blue-600 bg-transparent border-none hover:bg-blue-50/50 focus:ring-0 text-sm italic py-1 px-1 cursor-pointer outline-none rounded transition-colors"
                        >
                          <option value="" className="text-gray-400">Vælg proces...</option>
                          {procesMuligheder.map(p => (
                            <option key={p.id} value={p.id} className="text-black not-italic">{p.nr} - {p.titel_kort}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-center text-gray-400 py-1">-</div>
                      )}
                    </td>
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