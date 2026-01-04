// --- Fil: src/pages/AktivitetsskabelonerPage.tsx ---
// @# 2025-11-23 19:30 - Tilføjet Import/Export funktionalitet (Excel).
import React, { useState, useEffect, useCallback, useMemo, Fragment, ReactElement, ChangeEvent } from 'react';
import AktivitetForm from '../components/AktivitetForm.tsx';
import useDebounce from '../hooks/useDebounce.ts';
import { PlusCircle, AlertCircle, Edit, FunnelX, Loader2, UploadCloud, Download, ChevronLeft, ChevronRight, Info, RefreshCw, Maximize2 } from 'lucide-react';
import type { Blokinfo, SkabAktivitet, AktivitetsskabelonerFilterState, SkabDokument } from '../types.ts';
import { useAppState } from '../StateContext.js';
import Button from '../components/ui/Button.tsx';
import Tooltip from '../components/Tooltip';
import { api } from '../api';
import CsvImportModal from '../components/CsvImportModal';
import * as XLSX from 'xlsx';
import ConfirmModal from '../components/ui/ConfirmModal.tsx';
import ActivityDocLinkerPanel from '../components/panels/ActivityDocLinkerPanel.tsx';
import { Link as LinkIcon, Columns } from 'lucide-react';

interface InlineEditorProps {
  value: string | null | undefined;
  onSave: (value: string) => void;
  onEdit?: () => void;
  onBlur?: () => void;
  onExpand?: () => void;
  placeholder?: string;
  isTextarea?: boolean;
}

const InlineTextEditor = ({ value, onSave, onEdit, onBlur, onExpand, placeholder, isTextarea }: InlineEditorProps) => {
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
        className="flex-1 text-sm px-1 py-0.5 outline-none text-black bg-transparent"
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
    informationsKilder,
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

  // State til den celle der lige nu redigeres
  const [activeCell, setActiveCell] = useState<{ id: number; field: string; value: any } | null>(null);

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

  // @# Linker State (Split View)
  const [showLinkerPanel, setShowLinkerPanel] = useState(false);
  const [selectedLinkerActivityId, setSelectedLinkerActivityId] = useState<number | null>(null);
  const [dokumentskabeloner, setDokumentskabeloner] = useState<SkabDokument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Load documents once when panel is opened first time
  useEffect(() => {
    if (showLinkerPanel && dokumentskabeloner.length === 0 && !loadingDocs) {
      setLoadingDocs(true);
      api.get<any>(`/skabeloner/dokumenter/?limit=1000&udgaaet=false`)
        .then(data => {
          const results = Array.isArray(data) ? data : (data.results || []);
          setDokumentskabeloner(results);
        })
        .catch(e => {
          console.error("Failed to fetch doc templates", e);
          showAlert('Fejl', 'Kunne ikke hente dokumentskabeloner.');
        })
        .finally(() => setLoadingDocs(false));
    }
  }, [showLinkerPanel, dokumentskabeloner.length, loadingDocs]);


  // Handle selection (row click or specific logic)
  const handleRowClick = (aktivitet: SkabAktivitet) => {
    // If panel is open, update selection
    if (showLinkerPanel) {
      setSelectedLinkerActivityId(aktivitet.id);
    }
    // Also set for editing? Or is inline edit enough? 
    // Usually clicking row doesn't trigger edit mode in this table unless clicking specific cells.
  };

  const handleToggleLinkerPanel = () => {
    setShowLinkerPanel(!showLinkerPanel);
    if (!showLinkerPanel && !selectedLinkerActivityId && aktiviteter.length > 0) {
      // Auto-select first if none selected
      // setSelectedLinkerActivityId(aktiviteter[0].id);
    }
  };

  const selectedLinkerActivity = useMemo(() =>
    aktiviteter.find(a => a.id === selectedLinkerActivityId) || null,
    [aktiviteter, selectedLinkerActivityId]
  );

  const handleLinkChanges = async (aktivitetId: number, documentIds: number[]) => {
    try {
      const updated = await api.patch<SkabAktivitet>(`/skabeloner/aktiviteter/${aktivitetId}/`, { dokumenter: documentIds });

      dispatch({
        type: 'SET_AKTIVITETSSKABELONER_STATE',
        payload: {
          aktivitetsskabeloner: aktiviteter.map(a => a.id === updated.id ? updated : a)
        }
      });
    } catch (e: any) {
      console.error("Link update failed:", e);
      showAlert('Fejl', 'Kunne ikke opdatere links: ' + e.message);
    }
  };

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
        const selectedProces = procesList.find(p => p.nr?.toString() === filters.proces_nr);
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

  const handleQuickUpdate = async (aktivitet: SkabAktivitet, updates: Partial<SkabAktivitet>) => {
    try {
      const updated = await api.put<SkabAktivitet>(`/skabeloner/aktiviteter/${aktivitet.id}/`, { ...aktivitet, ...updates });

      const opdaterede = aktiviteter.map(a => a.id === aktivitet.id ? updated : a);
      dispatch({ type: 'SET_AKTIVITETSSKABELONER_STATE', payload: { aktivitetsskabeloner: opdaterede } });
    } catch (err) {
      dispatch({ type: 'SET_AKTIVITETSSKABELONER_STATE', payload: { aktivitetsskabelonerError: "Kunne ikke opdatere feltet." } });
    }
  };

  const handleToggleAktiv = async (aktivitet: SkabAktivitet) => {
    const nyStatus = !aktivitet.aktiv;
    handleQuickUpdate(aktivitet, { aktiv: nyStatus });
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

      {/* Old Modal Removed */}

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
          <button onClick={() => hentData(filters)} className="p-2 bg-white text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50" title="Opdater data">
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
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
                <thead className="bg-gray-50 text-gray-600 text-[10px] uppercase font-semibold border-b border-gray-200">
                  <tr>
                    <th className="text-center py-3 px-1 w-[5%]">Nr.</th>
                    <th className="text-left py-3 px-4 w-[25%]">Aktivitet</th>
                    <th className="text-left py-3 px-4 w-[25%]">Kommentar</th>
                    <th className="text-center py-3 px-2 w-[4%]">Link</th>
                    <th className="text-left py-3 px-2 w-[10%]">Kilde</th>
                    <th className="text-left py-3 px-4 w-[25%]">Mail Titel</th>
                    <th className="text-center py-3 px-2 w-[10%]">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {isLoading && aktiviteter.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400"><Loader2 className="animate-spin mx-auto mb-2" size={24} /> Indlæser...</td></tr>
                  ) : (
                    aktiviteter.map(a => {
                      const isCellActive = (field: string) => activeCell?.id === a.id && activeCell?.field === field;
                      const isRowActive = activeCell?.id === a.id;


                      return (
                        <tr
                          key={a.id}
                          onClick={(e) => {
                            // Don't trigger if editing
                            if (!activeCell) handleRowClick(a);
                          }}
                          className={`border-b transition-all group cursor-default
                                ${isRowActive ? 'shadow-[inset_0_-2px_0_0_#ef4444] bg-red-50/30' : ''}
                                ${selectedLinkerActivityId === a.id && showLinkerPanel ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'border-gray-100 hover:bg-gray-50'}
                            `}
                        >
                          {/* NR FELT */}
                          {/* NR FELT */}
                          <td className="py-2 px-1 text-center">
                            {isCellActive('aktivitet_nr') ? (
                              <input
                                autoFocus
                                type="number"
                                value={activeCell?.value ?? ''}
                                className="w-8 text-center text-black px-1 py-1 text-xs rounded border border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none"
                                onChange={(e) => setActiveCell({ ...activeCell!, value: e.target.value })}
                                onBlur={() => {
                                  if (activeCell?.value !== undefined) {
                                    handleQuickUpdate(a, { aktivitet_nr: Number(activeCell.value) });
                                  }
                                  setActiveCell(null);
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                              />
                            ) : (
                              <div
                                className="font-mono text-xs text-gray-500 cursor-text py-1 rounded hover:bg-blue-50/50"
                                onClick={() => setActiveCell({ id: a.id, field: 'aktivitet_nr', value: a.aktivitet_nr })}
                              >
                                {a.aktivitet_nr}
                              </div>
                            )}
                          </td>

                          {/* AKTIVITET FELT */}
                          <td className="py-2 px-2 max-w-0">
                            <InlineTextEditor
                              value={a.aktivitet}
                              onEdit={() => setActiveCell({ id: a.id, field: 'aktivitet', value: a.aktivitet })}
                              onBlur={() => setActiveCell(null)}
                              onSave={(val) => handleQuickUpdate(a, { aktivitet: val })}
                              onExpand={() => setActiveCell({ id: a.id, field: 'aktivitet_expanded', value: a.aktivitet })}
                            />
                            {isCellActive('aktivitet_expanded') && (
                              <div className="absolute z-50 bg-white p-3 shadow-2xl border rounded mt-1 left-20 min-w-[400px]">
                                <label className="block text-xs font-bold mb-1 text-gray-500">Aktivitet Titel:</label>
                                <textarea
                                  autoFocus
                                  value={activeCell?.value ?? ''}
                                  className="w-full p-2 text-sm border rounded h-32 focus:ring-1 focus:ring-blue-400 outline-none"
                                  onChange={(e) => setActiveCell({ ...activeCell!, value: e.target.value })}
                                  onBlur={() => {
                                    handleQuickUpdate(a, { aktivitet: activeCell?.value });
                                    setActiveCell(null);
                                  }}
                                />
                              </div>
                            )}
                          </td>

                          {/* KOMMENTAR (NOTE) FELT */}
                          <td className="py-2 px-2 max-w-0">
                            <InlineTextEditor
                              value={a.note}
                              placeholder="Tilføj note/kommentar..."
                              onEdit={() => setActiveCell({ id: a.id, field: 'note', value: a.note })}
                              onBlur={() => setActiveCell(null)}
                              onSave={(val) => handleQuickUpdate(a, { note: val })}
                              onExpand={() => setActiveCell({ id: a.id, field: 'note_expanded', value: a.note })}
                            />
                            {isCellActive('note_expanded') && (
                              <div className="absolute z-50 bg-white p-3 shadow-2xl border rounded mt-1 left-40 min-w-[400px]">
                                <label className="block text-xs font-bold mb-1 text-gray-500">Kommentar / Note:</label>
                                <textarea
                                  autoFocus
                                  value={activeCell?.value ?? ''}
                                  className="w-full p-2 text-sm border rounded h-48 focus:ring-1 focus:ring-blue-400 outline-none"
                                  onChange={(e) => setActiveCell({ ...activeCell!, value: e.target.value })}
                                  onBlur={() => {
                                    handleQuickUpdate(a, { note: activeCell?.value });
                                    setActiveCell(null);
                                  }}
                                />
                              </div>
                            )}
                          </td>

                          {/* LINK BUTTON */}
                          <td className="py-2 px-2 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!showLinkerPanel) {
                                  setShowLinkerPanel(true);
                                }
                                setSelectedLinkerActivityId(a.id);
                              }}
                              className={`p-1.5 rounded-full transition-colors ${a.dokumenter && a.dokumenter.length > 0
                                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                : 'text-gray-300 hover:text-gray-500'
                                }`}
                              title={a.dokumenter && a.dokumenter.length > 0
                                ? `${a.dokumenter.length} dokumenter linket`
                                : "Link dokumenter"}
                            >
                              <LinkIcon size={16} />
                            </button>
                          </td>

                          {/* KILDE FELT */}
                          <td className="py-2 px-2 text-xs text-gray-500">
                            {isCellActive('informations_kilde_id') ? (
                              <select
                                autoFocus
                                value={activeCell?.value ?? ''}
                                className="w-full text-black px-1 py-1 text-xs rounded border border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none bg-white font-sans"
                                onChange={(e) => setActiveCell({ ...activeCell!, value: e.target.value })}
                                onBlur={() => {
                                  if (activeCell?.value !== undefined) {
                                    handleQuickUpdate(a, { informations_kilde_id: activeCell.value ? Number(activeCell.value) : null });
                                  }
                                  setActiveCell(null);
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                              >
                                <option value="">Vælg kilde...</option>
                                {informationsKilder.map(k => (
                                  <option key={k.id} value={k.id}>{k.navn}</option>
                                ))}
                              </select>
                            ) : (
                              <div
                                className="cursor-text py-1 rounded hover:bg-blue-50/50 truncate max-w-full px-1"
                                onClick={() => setActiveCell({ id: a.id, field: 'informations_kilde_id', value: a.informations_kilde?.id })}
                              >
                                {a.informations_kilde?.navn || <span className="text-gray-300 italic">Vælg kilde...</span>}
                              </div>
                            )}
                          </td>

                          {/* MAIL TITEL FELT */}
                          <td className="py-2 px-2 max-w-0">
                            <InlineTextEditor
                              value={a.mail_titel}
                              placeholder="Tilføj mail titel..."
                              onEdit={() => setActiveCell({ id: a.id, field: 'mail_titel', value: a.mail_titel })}
                              onBlur={() => setActiveCell(null)}
                              onSave={(val) => handleQuickUpdate(a, { mail_titel: val })}
                              onExpand={() => setActiveCell({ id: a.id, field: 'mail_expanded', value: a.mail_titel })}
                            />
                            {isCellActive('mail_expanded') && (
                              <div className="absolute z-50 bg-white p-3 shadow-2xl border rounded mt-1 right-20 min-w-[400px]">
                                <label className="block text-xs font-bold mb-1 text-gray-500">Mail Titel:</label>
                                <textarea
                                  autoFocus
                                  value={activeCell?.value ?? ''}
                                  className="w-full p-2 text-sm border rounded h-32 focus:ring-1 focus:ring-blue-400 outline-none"
                                  onChange={(e) => setActiveCell({ ...activeCell!, value: e.target.value })}
                                  onBlur={() => {
                                    handleQuickUpdate(a, { mail_titel: activeCell?.value });
                                    setActiveCell(null);
                                  }}
                                />
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <input
                                type="checkbox"
                                checked={a.aktiv || false}
                                onChange={() => handleToggleAktiv(a)}
                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                title="Aktiv / Deaktiver"
                              />
                              <div className="flex items-center gap-1 min-w-[32px] justify-center">
                                {manglerSync[a.id] && (
                                  <Tooltip content="Denne aktivitet er ny og mangler at blive tilføjet på sagerne.">
                                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1 py-0.5 rounded">
                                      NY
                                    </span>
                                  </Tooltip>
                                )}
                                <button
                                  onClick={() => handleRediger(a)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                  title="Rediger Avanceret"
                                >
                                  <Edit size={16} />
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}  {!isLoading && aktiviteter.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400 italic">Vælg en gruppe eller juster filtrene</td></tr>
                  )}

                  {/* HURTIG OPRET RÆKKE (Vises kun hvis en gruppe er valgt) */}
                  {filters.gruppe_nr && (
                    <tr className="bg-blue-50/20 border-b border-blue-100 italic">
                      <td colSpan={1} className="py-2 px-1 text-center">
                        <PlusCircle size={14} className="mx-auto text-blue-400" />
                      </td>
                      <td colSpan={5} className="py-2 px-4">
                        <form onSubmit={handleQuickAdd} className="flex gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Indtast navnet på den nye aktivitet her... (Enter for at gemme)"
                            value={nyAktivitetNavn}
                            onChange={(e) => setNyAktivitetNavn(e.target.value)}
                            className="flex-1 w-full bg-transparent border-0 border-b border-blue-200 focus:border-blue-500 focus:ring-0 px-2 py-1 text-[11px] placeholder-gray-400"
                            disabled={isSavingNy}
                          />
                          <button
                            type="submit"
                            disabled={isSavingNy || !nyAktivitetNavn.trim()}
                            className="text-[10px] uppercase font-bold text-blue-600 hover:text-blue-800 disabled:text-gray-400 transition-colors inline-flex items-center gap-1"
                          >
                            {isSavingNy ? <Loader2 size={12} className="animate-spin" /> : <PlusCircle size={12} />}
                            TILFØJ
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
          {showLinkerPanel && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200" onClick={() => setShowLinkerPanel(false)}>
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                <ActivityDocLinkerPanel
                  selectedAktivitet={selectedLinkerActivity}
                  dokumenter={dokumentskabeloner}
                  onLinkChanges={handleLinkChanges}
                  onClose={() => setShowLinkerPanel(false)}
                  isLoadingDocs={loadingDocs}
                />
              </div>
            </div>
          )}
        </div>


      </div>


      {
        confirmDialog.isOpen && (
          <ConfirmModal
            isOpen={confirmDialog.isOpen}
            title={confirmDialog.title}
            message={confirmDialog.message}
            confirmText={confirmDialog.confirmText}
            cancelText={confirmDialog.cancelText}
            onConfirm={confirmDialog.onConfirm}
            onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
          />
        )
      }
    </div >
  );
}

export default AktivitetsskabelonerPage;