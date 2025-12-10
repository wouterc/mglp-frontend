// --- Fil: src/pages/AktivitetsskabelonerPage.tsx ---
// @# 2025-11-23 19:30 - Tilføjet Import/Export funktionalitet (Excel).
import React, { useState, useEffect, useCallback, useMemo, Fragment, ReactElement, ChangeEvent } from 'react';
import { API_BASE_URL } from '../config.ts';
import AktivitetForm from '../components/AktivitetForm.tsx';
import useDebounce from '../hooks/useDebounce.ts';
import { PlusCircle, AlertCircle, Edit, FunnelX, Loader2, UploadCloud, Download } from 'lucide-react';
import type { Blokinfo, SkabAktivitet, AktivitetsskabelonerFilterState } from '../types.ts';
import { useAppState } from '../StateContext.js';
import Button from '../components/ui/Button.tsx'; 
import CsvImportModal from '../components/CsvImportModal';
import * as XLSX from 'xlsx'; 

interface PaginatedAktiviteterResponse {
  results: SkabAktivitet[];
  next: string | null;
}

function AktivitetsskabelonerPage(): ReactElement {
  const { state, dispatch } = useAppState();
  const {
    aktivitetsskabeloner: aktiviteter,
    aktivitetsskabelonerFilters: filters,
    aktivitetsskabelonerVisUdgaaede: visUdgaaede,
    aktivitetsskabelonerIsLoading: isLoading,
    aktivitetsskabelonerError: error,
    aktivitetsskabelonerNextPageUrl: nextPageUrl,
  } = state;

  const [blokinfo, setBlokinfo] = useState<Blokinfo[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [visForm, setVisForm] = useState<boolean>(false);
  const [aktivitetTilRedigering, setAktivitetTilRedigering] = useState<SkabAktivitet | null>(null);
  const [tilgaengeligeFilterGrupper, setTilgaengeligeFilterGrupper] = useState<Blokinfo[]>([]);
  const [isFilterGrupperLoading, setIsFilterGrupperLoading] = useState<boolean>(false);
  
  // State til Import/Export
  const [visImportModal, setVisImportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const debouncedFilters = useDebounce(filters, 500);

  const procesList = useMemo(() => blokinfo.filter(b => b.formaal === 1), [blokinfo]);
  const gruppeList = useMemo(() => blokinfo.filter(b => b.formaal === 2), [blokinfo]);

  const buildQueryString = useCallback((filterObj: AktivitetsskabelonerFilterState) => {
    const params = new URLSearchParams();
    if (filterObj.proces_nr) params.append('proces_nr', filterObj.proces_nr);
    if (filterObj.gruppe_nr) params.append('gruppe_nr', filterObj.gruppe_nr);
    if (filterObj.aktivitet_nr) params.append('aktivitet_nr', filterObj.aktivitet_nr);
    if (filterObj.aktivitet) params.append('aktivitet', filterObj.aktivitet);
    params.append('udgaaet', visUdgaaede ? 'true' : 'false');
    return params.toString();
  }, [visUdgaaede]);

  const hentData = useCallback(async (filterObj: AktivitetsskabelonerFilterState) => {
    if (visImportModal) return; // Undgå reload mens import modal er åben

    dispatch({ type: 'SET_AKTIVITETSSKABELONER_STATE', payload: { aktivitetsskabelonerIsLoading: true, aktivitetsskabelonerError: null } });
    const queryString = buildQueryString(filterObj);
    
    try {
      const [aktiviteterRes, blokinfoRes] = await Promise.all([
        fetch(`${API_BASE_URL}/skabeloner/aktiviteter/?${queryString}`),
        fetch(`${API_BASE_URL}/skabeloner/blokinfo/`)
      ]);

      if (!aktiviteterRes.ok || !blokinfoRes.ok) throw new Error('Kunne ikke hente data fra serveren.');
      
      const aktiviteterData: PaginatedAktiviteterResponse = await aktiviteterRes.json();
      const blokinfoData: Blokinfo[] = await blokinfoRes.json();
      
      dispatch({ 
        type: 'SET_AKTIVITETSSKABELONER_STATE', 
        payload: { 
          aktivitetsskabeloner: aktiviteterData.results || [],
          aktivitetsskabelonerNextPageUrl: aktiviteterData.next,
          erAktivitetsskabelonerHentet: true 
        } 
      });
      setBlokinfo(blokinfoData || []);
      setTilgaengeligeFilterGrupper(blokinfoData.filter(b => b.formaal === 2) || []);
    } catch (e: any) {
      dispatch({ type: 'SET_AKTIVITETSSKABELONER_STATE', payload: { aktivitetsskabelonerError: 'Fejl ved hentning af data.' } });
    } finally {
      dispatch({ type: 'SET_AKTIVITETSSKABELONER_STATE', payload: { aktivitetsskabelonerIsLoading: false } });
    }
  }, [buildQueryString, dispatch, visImportModal]);

  useEffect(() => {
    hentData(debouncedFilters);
  }, [debouncedFilters, visUdgaaede, hentData]);

  useEffect(() => {
    const fetchGrupperForFilter = async () => {
        if (filters.proces_nr) {
            const selectedProces = procesList.find(p => p.nr.toString() === filters.proces_nr);
            if (selectedProces) {
                setIsFilterGrupperLoading(true);
                try {
                    const response = await fetch(`${API_BASE_URL}/skabeloner/blokinfo/${selectedProces.id}/grupper/`);
                    const data: Blokinfo[] = await response.json();
                    setTilgaengeligeFilterGrupper(data);
                } catch (error) {
                    setTilgaengeligeFilterGrupper([]);
                } finally {
                    setIsFilterGrupperLoading(false);
                }
            }
        } else {
            setTilgaengeligeFilterGrupper(gruppeList);
        }
    };
    fetchGrupperForFilter();
  }, [filters.proces_nr, procesList, gruppeList]);

  const handleHentFlere = async () => {
    if (!nextPageUrl || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const response = await fetch(nextPageUrl);
      if (!response.ok) throw new Error('Kunne ikke hente mere data.');
      const data: PaginatedAktiviteterResponse = await response.json();
      dispatch({
        type: 'SET_AKTIVITETSSKABELONER_STATE',
        payload: {
          aktivitetsskabeloner: [...aktiviteter, ...(data.results || [])],
          aktivitetsskabelonerNextPageUrl: data.next
        }
      });
    } catch (e) {
      dispatch({ type: 'SET_AKTIVITETSSKABELONER_STATE', payload: { aktivitetsskabelonerError: 'Fejl ved hentning af mere data.' } });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newFilters = {
        ...filters,
        [name]: value,
        ...(name === 'proces_nr' && { gruppe_nr: '' })
    };
    dispatch({ type: 'SET_AKTIVITETSSKABELONER_STATE', payload: { aktivitetsskabelonerFilters: newFilters } });
  };

  const handleNulstilFiltre = () => {
    dispatch({
      type: 'SET_AKTIVITETSSKABELONER_STATE',
      payload: {
        aktivitetsskabelonerFilters: { proces_nr: '', gruppe_nr: '', aktivitet_nr: '', aktivitet: '' },
        aktivitetsskabelonerVisUdgaaede: false,
      }
    });
  };
  
  // --- EKSPORT FUNKTION ---
  const handleExport = async () => {
    setIsExporting(true);
    try {
        // Hent ALT data (uden pagination)
        const res = await fetch(`${API_BASE_URL}/skabeloner/aktiviteter/?limit=5000`); // Sæt høj limit
        if (!res.ok) throw new Error("Kunne ikke hente data.");
        
        const data = await res.json();
        const exportList: SkabAktivitet[] = Array.isArray(data) ? data : data.results;

        const excelData = exportList.map(a => ({
            id: a.id,
            proces_nr: a.proces?.nr,
            proces_titel: a.proces?.titel_kort,
            gruppe_nr: a.gruppe?.nr,
            gruppe_titel: a.gruppe?.titel_kort,
            aktivitet_nr: a.aktivitet_nr,
            aktivitet: a.aktivitet,
            ansvarlig: a.ansvarlig,
            frist: a.frist,
            udgaaet: a.udgaaet,
            aktiv: a.aktiv,
            note: a.note
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Aktivitetsskabeloner");
        XLSX.writeFile(workbook, `aktivitetsskabeloner_export_${new Date().toISOString().slice(0,10)}.xlsx`);

    } catch (e) {
        console.error(e);
        alert("Fejl ved eksport");
    } finally {
        setIsExporting(false);
    }
  };

  const handleOpret = () => {
    setAktivitetTilRedigering(null);
    setVisForm(true);
  };
  const handleRediger = (aktivitet: SkabAktivitet) => {
    setAktivitetTilRedigering(aktivitet);
    setVisForm(true);
  };
  const handleSave = () => {
    setVisForm(false);
    hentData(filters);
  };
  const handleCancel = () => {
    setVisForm(false);
  };

  let lastGroupHeader: string | null = null;

  if (error && !isLoadingMore) return (
    <div className="p-8 flex flex-col items-center justify-center text-red-600">
      <AlertCircle size={48} className="mb-4" />
      <h2 className="text-xl font-bold mb-2">Fejl</h2>
      <p>{error}</p>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {visForm && (
        <AktivitetForm
          onSave={handleSave}
          onCancel={handleCancel}
          aktivitetTilRedigering={aktivitetTilRedigering}
          blokinfoList={blokinfo}
        />
      )}

      <CsvImportModal
        isOpen={visImportModal}
        onClose={() => setVisImportModal(false)}
        onImportComplete={() => {
            setVisImportModal(false);
            hentData(filters);
        }}
        title="Importer Aktiviteter (Excel)"
        type="aktivitetsskabelon"
      />

       <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Aktivitetsskabeloner</h2>
        <div className="flex space-x-2">
            <button onClick={handleExport} disabled={isExporting} className="p-2 bg-white text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50" title="Eksportér til Excel">
                {isExporting ? <Loader2 size={20} className="animate-spin"/> : <Download size={20}/>}
            </button>
            <button onClick={() => setVisImportModal(true)} className="p-2 bg-white text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50" title="Importer fra Excel">
                <UploadCloud size={20}/>
            </button>
            <button onClick={handleOpret} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700" title="Opret Ny Aktivitetsskabelon">
                <PlusCircle size={20} />
            </button>
        </div>
      </div>

      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex space-x-2">
            <div className="w-[20%] flex">
                <input type="text" name="proces_nr" placeholder="Nr." value={filters.proces_nr} onChange={handleFilterChange} className="w-1/4 p-2 border border-gray-300 border-r-0 rounded-l-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <select name="proces_nr" value={filters.proces_nr} onChange={handleFilterChange} className="w-3/4 p-2 border border-gray-300 rounded-r-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Vælg proces...</option>
                   {procesList.map(p => (
                        <option key={p.id} value={p.nr}>{p.nr} - {p.titel_kort}</option>
                    ))}
                </select>
            </div>
            
            <div className="w-[20%] flex">
               <input type="text" name="gruppe_nr" placeholder="Nr." value={filters.gruppe_nr} onChange={handleFilterChange} className="w-1/4 p-2 border border-gray-300 border-r-0 rounded-l-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                <select name="gruppe_nr" value={filters.gruppe_nr} onChange={handleFilterChange} className="w-3/4 p-2 border border-gray-300 rounded-r-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" disabled={isFilterGrupperLoading}>
                 {isFilterGrupperLoading ? (
                        <option>Henter...</option>
                    ) : (
                        <>
                          <option value="">Vælg gruppe...</option>
                            {tilgaengeligeFilterGrupper.map(g => 
                                <option key={g.id} value={g.nr}>{g.nr} - {g.titel_kort}</option>
                            )}
                       </>
                    )}
                </select>
            </div>
        
            <div className="w-[10%]">
                <input type="text" name="aktivitet_nr" placeholder="Aktiv. Nr..." value={filters.aktivitet_nr} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm"/>
            </div>
            <div className="w-[35%]">
                <input type="text" name="aktivitet" placeholder="Filtrer på aktivitet..." value={filters.aktivitet} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm"/>
            </div>
            <div className="w-[15%]"></div> 
         </div>

         <div className="flex justify-between items-center mt-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={visUdgaaede} onChange={() => dispatch({ type: 'SET_AKTIVITETSSKABELONER_STATE', payload: { aktivitetsskabelonerVisUdgaaede: !visUdgaaede } })} className="h-4 w-4 rounded border-gray-300"/>
                    <span>Vis udgåede</span>
                 </label>
            </div>
            <button onClick={handleNulstilFiltre} className="p-2 text-gray-600 rounded-full hover:bg-gray-200" title="Nulstil Filtre">
               <FunnelX size={18} />
            </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg shadow-md">
         <table className="min-w-full bg-white table-fixed">
           <thead className="bg-gray-800 text-white text-sm">
            <tr>
              <th className="text-left py-1 px-2 uppercase font-semibold w-[15%]">Aktiv. Nr.</th>
              <th className="text-left py-1 px-2 uppercase font-semibold w-[70%]">Aktivitet</th>
              <th className="text-center py-1 px-2 uppercase font-semibold w-[5%]">Standard<br/>aktiveret</th>
              <th className="text-center py-1 px-2 uppercase font-semibold w-[10%]"></th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-sm">
             {isLoading && aktiviteter.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-4">Henter data...</td></tr>
            ) : (
              aktiviteter.map(a => {
                const currentGroupHeader = `${a.proces?.nr || ''}.${a.gruppe?.nr || ''} - ${a.proces?.titel_kort || ''} / ${a.gruppe?.titel_kort || ''}`;
                const showHeader = currentGroupHeader !== lastGroupHeader;
                if (showHeader) lastGroupHeader = currentGroupHeader;
                
                return (
                 <Fragment key={a.id}>
                    {showHeader && (
                      <tr className="bg-gray-200 sticky top-0">
                        <td colSpan={4} className="py-1 px-2 font-bold text-gray-700">
                             {currentGroupHeader}
                        </td>
                      </tr>
                   )}
                    <tr className="border-b border-gray-200 hover:bg-gray-100">
                       <td className="py-1 px-2">{a.aktivitet_nr}</td>
                      <td className="py-1 px-2 break-words">{a.aktivitet}</td>
                       <td className="py-1 px-2 text-center">
                         <input type="checkbox" checked={a.aktiv || false} readOnly disabled className="h-4 w-4"/>
                      </td>
                      <td className="py-1 px-2 text-center">
                        <button onClick={() => handleRediger(a)} title="Rediger"><Edit size={16} className="text-blue-600 hover:text-blue-800" /></button>
                      </td>
                    </tr>
                  </Fragment>
                );
              })
            )}
            {!isLoading && aktiviteter.length === 0 && (
              <tr><td colSpan={4} className="text-center py-4">Ingen aktiviteter matcher dit filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {nextPageUrl && (
           <div className="mt-4 text-center">
            <Button onClick={handleHentFlere} disabled={isLoadingMore} variant="secondary" className="mx-auto">
                 {isLoadingMore ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Henter...</> : 'Hent Flere'}
            </Button>
        </div>
      )}
    </div>
  );
}

export default AktivitetsskabelonerPage;