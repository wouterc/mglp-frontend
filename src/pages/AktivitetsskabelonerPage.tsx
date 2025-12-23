// --- Fil: src/pages/AktivitetsskabelonerPage.tsx ---
// @# 2025-11-23 19:30 - Tilføjet Import/Export funktionalitet (Excel).
import React, { useState, useEffect, useCallback, useMemo, Fragment, ReactElement, ChangeEvent } from 'react';
import AktivitetForm from '../components/AktivitetForm.tsx';
import useDebounce from '../hooks/useDebounce.ts';
import { PlusCircle, AlertCircle, Edit, FunnelX, Loader2, UploadCloud, Download, ChevronLeft, ChevronRight, Info, RefreshCw } from 'lucide-react';
import type { Blokinfo, SkabAktivitet, AktivitetsskabelonerFilterState } from '../types.ts';
import { useAppState } from '../StateContext.js';
import Button from '../components/ui/Button.tsx';
import Tooltip from '../components/Tooltip';
import { api } from '../api';
import CsvImportModal from '../components/CsvImportModal';
import * as XLSX from 'xlsx';
import ConfirmModal from '../components/ui/ConfirmModal.tsx';

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

  // State til Sidebar bredde (i pixels)
  // Standard (ikke ekspanderet) = 200px. Ekspanderet = 300px.
  const [sidebarWidth, setSidebarWidth] = useState<number>(200);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // State til hurtig-opret i bunden
  const [nyAktivitetNr, setNyAktivitetNr] = useState('');
  const [nyAktivitetNavn, setNyAktivitetNavn] = useState('');
  const [isSavingNy, setIsSavingNy] = useState(false);

  // State til Import/Export
  const [visImportModal, setVisImportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Synkroniserings-state
  const [manglerSync, setManglerSync] = useState<Record<number, boolean>>({});
  const [nyeAktiviteterFindes, setNyeAktiviteterFindes] = useState(false);
  const [isSyncingAlle, setIsSyncingAlle] = useState(false);

  // Dialog-state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  const showAlert = (title: string, message: string) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmText: 'OK',
      cancelText: '',
      onConfirm: () => { },
    });
  };

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
      const data = await api.get<PaginatedAktiviteterResponse>(`/skabeloner/aktiviteter/?${queryString}`);

      dispatch({
        type: 'SET_AKTIVITETSSKABELONER_STATE',
        payload: {
          aktivitetsskabeloner: data.results || [],
          aktivitetsskabelonerNextPageUrl: data.next,
          erAktivitetsskabelonerHentet: true
        }
      });

      // Efter vi har hentet data, tjekker vi for synkroniserings-mangler
      const syncRes = await api.get<any>(`/skabeloner/aktiviteter/sync_check/?${queryString}`);
      setManglerSync(syncRes.mangler_per_skabelon || {});
      setNyeAktiviteterFindes(syncRes.nye_aktiviteter_findes || false);

    } catch (e: any) {
      dispatch({ type: 'SET_AKTIVITETSSKABELONER_STATE', payload: { aktivitetsskabelonerError: 'Fejl ved hentning af data.' } });
    } finally {
      dispatch({ type: 'SET_AKTIVITETSSKABELONER_STATE', payload: { aktivitetsskabelonerIsLoading: false } });
    }
  }, [buildQueryString, dispatch, visImportModal]);

  const handleSynkroniserAlleSager = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Synkroniser alle sager',
      message: 'Er du sikker på, at du vil tilføje manglende aktiviteter til ALLE aktive sager (kategori 0)?',
      confirmText: 'Synkroniser',
      cancelText: 'Annuller',
      onConfirm: async () => {
        setIsSyncingAlle(true);
        try {
          const res = await api.post<any>('/sager/synkroniser_alle_aktive/');
          showAlert('Systemet siger', res.detaljer || "Synkronisering fuldført.");
          // Genhent data for at opdatere badges
          hentData(filters);
        } catch (e: any) {
          showAlert('Systemet siger', `Fejl ved bulk-synkronisering: ${e.message}`);
        } finally {
          setIsSyncingAlle(false);
        }
      }
    });
  };

  // Hent grundlæggende data (processer/grupper) én gang ved start
  useEffect(() => {
    const hentBasisData = async () => {
      try {
        const data = await api.get<Blokinfo[]>('/skabeloner/blokinfo/');
        setBlokinfo(data || []);
      } catch (e) {
        console.error("Fejl ved hentning af blokinfo:", e);
      }
    };
    hentBasisData();
  }, []);

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
            const data = await api.get<Blokinfo[]>(`/skabeloner/blokinfo/${selectedProces.id}/grupper/`);
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
  }, [filters.proces_nr, procesList, gruppeList, visUdgaaede]);

  // Sidebar resizing logic
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing) {
      const newWidth = mouseMoveEvent.clientX;
      if (newWidth > 50 && newWidth < 800) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  const toggleSidebar = () => {
    if (isExpanded) {
      setSidebarWidth(200);
      setIsExpanded(false);
    } else {
      setSidebarWidth(300);
      setIsExpanded(true);
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const handleHentFlere = async () => {
    if (!nextPageUrl || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const data = await api.get<PaginatedAktiviteterResponse>(nextPageUrl);
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
    let newFilters = {
      ...filters,
      [name]: value,
      ...(name === 'proces_nr' && { gruppe_nr: '' })
    };

    // Global søgning: Hvis man søger på aktivitet eller nr, så ryd proces/gruppe afgrænsning
    if ((name === 'aktivitet' || name === 'aktivitet_nr') && value.trim() !== '') {
      newFilters = {
        ...newFilters,
        proces_nr: '',
        gruppe_nr: ''
      };
    }

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
      const data = await api.get<any>(`/skabeloner/aktiviteter/?limit=5000`);
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
      XLSX.writeFile(workbook, `aktivitetsskabeloner_export_${new Date().toISOString().slice(0, 10)}.xlsx`);

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

  const handleToggleAktiv = async (aktivitet: SkabAktivitet) => {
    const nyStatus = !aktivitet.aktiv;
    const opdateredeAktiviteter = aktiviteter.map(a =>
      a.id === aktivitet.id ? { ...a, aktiv: nyStatus } : a
    );
    dispatch({
      type: 'SET_AKTIVITETSSKABELONER_STATE',
      payload: { aktivitetsskabeloner: opdateredeAktiviteter }
    });

    try {
      await api.patch(`/skabeloner/aktiviteter/${aktivitet.id}/`, {
        aktiv: nyStatus
      });
    } catch (e: any) {
      console.error("Fejl ved toggle af aktiv:", e);
      hentData(filters);
      alert(`Kunne ikke opdatere: ${e.message}`);
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const navn = nyAktivitetNavn.trim();
    if (!navn || !filters.gruppe_nr) return;

    let targetProcesId: number | null = null;
    let targetGruppeId: number | null = null;

    // Find gruppe info
    const valgtGruppe = tilgaengeligeFilterGrupper.find(g => g.nr.toString() === filters.gruppe_nr);
    if (!valgtGruppe) {
      alert("Fejl: Kunne ikke finde den valgte gruppe.");
      return;
    }
    targetGruppeId = valgtGruppe.id;

    // Find proces info
    if (filters.proces_nr) {
      const p = procesList.find(p => p.nr.toString() === filters.proces_nr);
      if (p) targetProcesId = p.id;
    }

    // Hvis vi mangler proces, så prøv at finde den via en af de eksisterende aktiviteter i listen
    if (!targetProcesId && aktiviteter.length > 0) {
      const matchingAct = aktiviteter.find(a => a.gruppe?.id === targetGruppeId);
      if (matchingAct?.proces) {
        targetProcesId = matchingAct.proces.id;
      }
    }

    // Sidste udvej: Hvis vi stadig mangler proces, men har en gruppe, så hent info fra API
    if (!targetProcesId) {
      setIsSavingNy(true);
      try {
        const data = await api.get<any>(`/skabeloner/aktiviteter/?gruppe_id=${targetGruppeId}&limit=1`);
        if (data.results?.length > 0) {
          targetProcesId = data.results[0].proces.id;
        }
      } catch (e) {
        console.error("Kunne ikke finde proces for gruppe", e);
      } finally {
        setIsSavingNy(false);
      }
    }

    if (!targetProcesId) {
      alert("Fejl: Kunne ikke automatisk tildele en proces til denne gruppe. Vælg venligst en proces først.");
      return;
    }

    setIsSavingNy(true);
    try {
      const maxNr = aktiviteter.length > 0
        ? Math.max(...aktiviteter.map(a => a.aktivitet_nr || 0))
        : 0;

      const payload = {
        aktivitet: navn,
        aktivitet_nr: maxNr + 1,
        gruppe_id: targetGruppeId,
        proces_id: targetProcesId,
        aktiv: true,
        udgaaet: false
      };

      await api.post<any>(`/skabeloner/aktiviteter/`, payload);
      setNyAktivitetNavn('');
      hentData(filters);
    } catch (e: any) {
      console.error("Fejl ved hurtig oprettelse:", e);
      alert(`Fejl ved oprettelse: ${e.message}`);
    } finally {
      setIsSavingNy(false);
    }
  };

  const handleSelectGroup = (gruppeNr: string) => {
    const newFilters = { ...filters, gruppe_nr: gruppeNr };
    dispatch({ type: 'SET_AKTIVITETSSKABELONER_STATE', payload: { aktivitetsskabelonerFilters: newFilters } });
  };

  if (error && !isLoadingMore) return (
    <div className="p-8 flex flex-col items-center justify-center text-red-600">
      <AlertCircle size={48} className="mb-4" />
      <h2 className="text-xl font-bold mb-2">Fejl</h2>
      <p>{error}</p>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {visForm && (
        <AktivitetForm
          onSave={handleSave}
          onCancel={handleCancel}
          aktivitetTilRedigering={aktivitetTilRedigering}
          blokinfoList={blokinfo}
          initialFilters={filters}
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

      <div className="flex justify-between items-center p-4 bg-white border-b border-gray-200 flex-shrink-0">
        <h2 className="text-2xl font-bold text-gray-800">Aktivitetsskabeloner</h2>
        <div className="flex space-x-2">
          <button onClick={handleExport} disabled={isExporting} className="p-2 bg-white text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50" title="Eksportér til Excel">
            {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
          </button>
          <button onClick={() => setVisImportModal(true)} className="p-2 bg-white text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50" title="Importer fra Excel">
            <UploadCloud size={20} />
          </button>
          {(nyeAktiviteterFindes || isSyncingAlle) && (
            <button
              onClick={handleSynkroniserAlleSager}
              disabled={isSyncingAlle}
              className={`
                p-2 rounded-full border transition-all
                ${isSyncingAlle ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200 animate-pulse'}
              `}
              title="Nye aktiviteter fundet - Klik for at synkronisere alle sager"
            >
              {isSyncingAlle ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
            </button>
          )}
          <button onClick={handleOpret} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700" title="Opret Ny Aktivitetsskabelon">
            <PlusCircle size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* SIDEMENU (Grupper) */}
        <div
          className="bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0 relative transition-all duration-300"
          style={{ width: `${sidebarWidth}px`, maxWidth: isExpanded ? 'none' : '18%' }}
        >
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-gray-400 uppercase">Proces</label>
              <button onClick={toggleSidebar} className="p-1 text-gray-400 hover:text-gray-600 rounded-md" title={isExpanded ? "Skjul menu" : "Vis menu"}>
                {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
            </div>

            <div>
              <select
                name="proces_nr"
                value={filters.proces_nr}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-200 rounded-md text-sm bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all font-medium"
              >
                <option value="">Alle processer</option>
                {procesList.map(p => (
                  <option key={p.id} value={p.nr}>{p.nr} - {p.titel_kort}</option>
                ))}
              </select>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Grupper</label>
              <div className="space-y-1">
                {tilgaengeligeFilterGrupper.map(g => {
                  const isActive = filters.gruppe_nr === g.nr.toString();
                  return (
                    <button
                      key={g.id}
                      onClick={() => handleSelectGroup(g.nr.toString())}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-all group relative ${isActive
                        ? 'bg-blue-50 text-blue-700 font-medium border-l-4 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                        }`}
                    >
                      <span className="block truncate" title={`${g.nr} - ${g.titel_kort}`}>
                        {g.nr} - {g.titel_kort}
                      </span>
                    </button>
                  );
                })}
                {tilgaengeligeFilterGrupper.length === 0 && (
                  <p className="text-xs text-gray-400 italic">Ingen grupper fundet</p>
                )}
              </div>
            </div>
          </div>

          {/* Resize Handle */}
          <div
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-400 active:bg-blue-600 transition-colors z-20"
            onMouseDown={startResizing}
          />
        </div>

        {/* HOVEDINDHOLD (Aktiviteter) */}
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
          {/* Top Filter Bar i Hovedindhold */}
          <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between gap-4">
            <div className="flex-1 flex items-center gap-4">
              <div className="w-24">
                <input type="text" name="aktivitet_nr" placeholder="Nr..." value={filters.aktivitet_nr} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm" />
              </div>
              <div className="flex-1 max-w-md">
                <input type="text" name="aktivitet" placeholder="Søg i aktiviteter..." value={filters.aktivitet} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm" />
              </div>
              <label className="flex items-center space-x-2 cursor-pointer text-sm text-gray-600">
                <input type="checkbox" checked={visUdgaaede} onChange={() => dispatch({ type: 'SET_AKTIVITETSSKABELONER_STATE', payload: { aktivitetsskabelonerVisUdgaaede: !visUdgaaede } })} className="h-4 w-4 rounded border-gray-300" />
                <span>Vis udgåede</span>
              </label>
            </div>
            <button onClick={handleNulstilFiltre} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all" title="Nulstil Filtre">
              <FunnelX size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <table className="min-w-full table-fixed">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 w-[8%]">Nr.</th>
                    <th className="text-left py-3 px-4 w-[67%]">Aktivitet</th>
                    <th className="text-center py-3 px-4 w-[5%]"></th>
                    <th className="text-center py-3 px-4 w-[10%]">Aktiv</th>
                    <th className="text-center py-3 px-4 w-[10%]"></th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100">
                  {isLoading && aktiviteter.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-12 text-gray-400"><Loader2 className="animate-spin mx-auto mb-2" size={24} /> Indlæser...</td></tr>
                  ) : (
                    aktiviteter.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50 group">
                        <td className="py-2 px-4 text-gray-500 font-mono text-xs">{a.aktivitet_nr}</td>
                        <td className="py-2 px-4 font-medium text-gray-700">{a.aktivitet}</td>
                        <td className="py-2 px-4 text-center">
                          <div className="flex justify-center items-center gap-1">
                            {a.note && (
                              <Tooltip content={a.note}>
                                <Info size={14} className="text-red-600 cursor-help" />
                              </Tooltip>
                            )}
                            {manglerSync[a.id] && (
                              <Tooltip content="Denne aktivitet er ny og mangler at blive tilføjet på sagerne.">
                                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <PlusCircle size={10} />
                                  NY
                                </span>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={a.aktiv || false}
                            onChange={() => handleToggleAktiv(a)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-4 text-center">
                          <button
                            onClick={() => handleRediger(a)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                            title="Rediger"
                          >
                            <Edit size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                  {!isLoading && aktiviteter.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-12 text-gray-400 italic">Vælg en gruppe eller juster filtrene</td></tr>
                  )}

                  {/* HURTIG OPRET RÆKKE (Vises kun hvis en gruppe er valgt) */}
                  {filters.gruppe_nr && (
                    <tr className="bg-blue-50/30">
                      <td colSpan={1} className="py-3 px-4">
                        <span className="text-xs text-blue-400 font-bold uppercase">Ny:</span>
                      </td>
                      <td colSpan={3} className="py-3 px-4">
                        <form onSubmit={handleQuickAdd} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Indtast navnet på den nye aktivitet her..."
                            value={nyAktivitetNavn}
                            onChange={(e) => setNyAktivitetNavn(e.target.value)}
                            className="flex-1 p-2 text-sm border-transparent bg-transparent border-b border-blue-200 focus:border-blue-500 focus:ring-0 placeholder-blue-300"
                            disabled={isSavingNy}
                          />
                          <button
                            type="submit"
                            disabled={isSavingNy || !nyAktivitetNavn.trim()}
                            className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2"
                          >
                            {isSavingNy ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
                            Tilføj
                          </button>
                        </form>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {nextPageUrl && (
              <div className="mt-8 text-center pb-8">
                <Button onClick={handleHentFlere} disabled={isLoadingMore} variant="secondary">
                  {isLoadingMore ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Henter...</> : 'Hent Flere'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      {confirmDialog.isOpen && (
        <ConfirmModal
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          onConfirm={confirmDialog.onConfirm}
          onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
}

export default AktivitetsskabelonerPage;