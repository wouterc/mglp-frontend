// --- Fil: src/pages/DokumentskabelonerPage.tsx ---
import React, { useState, useEffect, useCallback, useMemo, ReactElement, ChangeEvent } from 'react';
import useDebounce from '../hooks/useDebounce.ts';
import DokumentSkabelonForm from '../components/DokumentSkabelonForm.tsx';
import LinkingTab from '../components/skabeloner/LinkingTab';
import { RefreshCw, PlusCircle, AlertCircle, Edit, FunnelX, Loader2, ChevronLeft, ChevronRight, Info, ExternalLink, FileText, Eye, EyeOff, PlusCircle as PlusCircleIcon, Maximize2 } from 'lucide-react';
import type { Blokinfo, SkabDokument, DokumentskabelonerFilterState } from '../types.ts';
import { useAppState } from '../StateContext.js';
import Button from '../components/ui/Button.tsx';
import Tooltip from '../components/Tooltip';
import { api } from '../api';
import ConfirmModal from '../components/ui/ConfirmModal.tsx';

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

interface PaginatedDokumenterResponse {
  results: SkabDokument[];
  next: string | null;
}

function DokumentskabelonerPage(): ReactElement {
  const { state, dispatch } = useAppState();
  const {
    dokumentskabeloner: dokumenter,
    dokumentskabelonerFilters: filters,
    dokumentskabelonerIsLoading: isLoading,
    dokumentskabelonerVisUdgaaede: visUdgaaede,
    dokumentskabelonerError: error,
    erDokumentskabelonerHentet,
    informationsKilder,
  } = state;

  const [blokinfo, setBlokinfo] = useState<Blokinfo[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [visForm, setVisForm] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'oversigt' | 'linking'>('oversigt');
  const [dokumentTilRedigering, setDokumentTilRedigering] = useState<SkabDokument | null>(null);

  // State til den celle der lige nu redigeres
  const [activeCell, setActiveCell] = useState<{ id: number; field: string; value: any } | null>(null);

  // State til hurtig-opret
  const [nyDokumentNr, setNyDokumentNr] = useState('');
  const [nyDokumentNavn, setNyDokumentNavn] = useState('');
  const [isSavingNy, setIsSavingNy] = useState(false);

  // Synkroniserings-state
  const [manglerSync, setManglerSync] = useState<Record<number, boolean>>({});
  const [nyeDokumenterFindes, setNyeDokumenterFindes] = useState(false);
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

  // Filter-grupper (formaal = 3 for dokumenter)
  const dokumentGrupper = useMemo(() => blokinfo.filter(b => b.formaal === 3), [blokinfo]);

  const debouncedFilters = useDebounce(filters, 500);

  const buildQueryString = useCallback((filterObj: DokumentskabelonerFilterState) => {
    const params = new URLSearchParams();
    if (filterObj.gruppe_nr) params.append('gruppe_nr', filterObj.gruppe_nr);
    if (filterObj.dokument_nr) params.append('dokument_nr', filterObj.dokument_nr);
    if (filterObj.dokument) params.append('dokument', filterObj.dokument);
    params.append('udgaaet', visUdgaaede ? 'true' : 'false');
    return params.toString();
  }, [visUdgaaede]);

  const hentData = useCallback(async (filterObj: DokumentskabelonerFilterState) => {
    dispatch({ type: 'SET_DOKUMENTSSKABELONER_STATE', payload: { dokumentskabelonerIsLoading: true, dokumentskabelonerError: null } });
    const queryString = buildQueryString(filterObj);

    try {
      const data = await api.get<PaginatedDokumenterResponse>(`/skabeloner/dokumenter/?${queryString}`);
      dispatch({
        type: 'SET_DOKUMENTSSKABELONER_STATE',
        payload: {
          dokumentskabeloner: data.results || [],
          erDokumentskabelonerHentet: true
        }
      });
      setNextPageUrl(data.next);

      // Efter vi har hentet data, tjekker vi for synkroniserings-mangler
      const syncRes = await api.get<any>(`/skabeloner/dokumenter/sync_check/?${queryString}`);
      setManglerSync(syncRes.mangler_per_skabelon || {});
      setNyeDokumenterFindes(syncRes.nye_dokumenter_findes || false);

    } catch (e: any) {
      dispatch({ type: 'SET_DOKUMENTSSKABELONER_STATE', payload: { dokumentskabelonerError: 'Fejl ved hentning af data.' } });
    } finally {
      dispatch({ type: 'SET_DOKUMENTSSKABELONER_STATE', payload: { dokumentskabelonerIsLoading: false } });
    }
  }, [buildQueryString, dispatch]);

  // Hent blokinfo (grupper) ved start
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
  }, [debouncedFilters, hentData]);

  // Beregn næste dokument_nr ved valg af gruppe
  useEffect(() => {
    if (filters.gruppe_nr) {
      const gruppeDoks = dokumenter.filter(d => d.gruppe?.nr?.toString() === filters.gruppe_nr);
      if (gruppeDoks.length > 0) {
        const maxNr = Math.max(...gruppeDoks.map(d => d.dokument_nr || 0));
        setNyDokumentNr((maxNr + 1).toString());
      } else {
        setNyDokumentNr('1');
      }
    } else {
      setNyDokumentNr('');
    }
  }, [filters.gruppe_nr, dokumenter]);

  const handleSynkroniserAlleSager = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Synkroniser dokumenter',
      message: 'Er du sikker på, at du vil tilføje manglende dokument-krav til ALLE aktive sager?',
      confirmText: 'Synkroniser',
      cancelText: 'Annuller',
      onConfirm: async () => {
        setIsSyncingAlle(true);
        try {
          const res = await api.post<any>('/sager/synkroniser_alle_dokumenter/');
          showAlert('Systemet siger', res.detaljer || "Synkronisering fuldført.");
          hentData(filters);
          setNyeDokumenterFindes(false);
        } catch (e: any) {
          showAlert('Systemet siger', `Fejl ved bulk-synkronisering: ${e.message}`);
        } finally {
          setIsSyncingAlle(false);
        }
      }
    });
  };

  const handleHentFlere = async () => {
    if (!nextPageUrl || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const data = await api.get<PaginatedDokumenterResponse>(nextPageUrl);
      dispatch({
        type: 'SET_DOKUMENTSSKABELONER_STATE',
        payload: {
          dokumentskabeloner: [...dokumenter, ...(data.results || [])]
        }
      });
      setNextPageUrl(data.next);
    } catch (e) {
      dispatch({ type: 'SET_DOKUMENTSSKABELONER_STATE', payload: { dokumentskabelonerError: 'Fejl ved hentning af mere data.' } });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const [sidebarWidth, setSidebarWidth] = useState<number>(200);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Sidebar resizing logic
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing) {
      const newWidth = mouseMoveEvent.clientX;
      if (newWidth > 50 && newWidth < 800) setSidebarWidth(newWidth);
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
    window.addEventListener("mousemove", resize as any);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize as any);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let newFilters = { ...filters, [name]: value };

    // Global søgning: Hvis man søger på dokument eller nr, så ryd gruppe afgrænsning
    if ((name === 'dokument' || name === 'dokument_nr') && value.trim() !== '') {
      newFilters = { ...newFilters, gruppe_nr: '' };
    }

    dispatch({
      type: 'SET_DOKUMENTSSKABELONER_STATE',
      payload: { dokumentskabelonerFilters: newFilters }
    });
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const navn = nyDokumentNavn.trim();
    if (!navn || !filters.gruppe_nr || !nyDokumentNr) return;

    setIsSavingNy(true);
    try {
      const valgtGruppeObj = dokumentGrupper.find(g => g.nr.toString() === filters.gruppe_nr);
      if (!valgtGruppeObj) throw new Error("Gruppe ikke fundet");

      // Dobbelt tjek: Hent nyeste data for at undgå dupletter hvis flere har arbejdet samtidig
      const senesteData = await api.get<{ results: SkabDokument[] }>(`/skabeloner/dokumenter/?gruppe_nr=${filters.gruppe_nr}&limit=1000`);
      const eksisterendeDoks = senesteData.results || [];
      const aktueltNr = parseInt(nyDokumentNr);

      if (eksisterendeDoks.some(d => d.dokument_nr === aktueltNr)) {
        // Hvis nummeret blev snuppet, så find det næste ledige
        const maxNr = eksisterendeDoks.length > 0 ? Math.max(...eksisterendeDoks.map(d => d.dokument_nr || 0)) : 0;
        const rigtigtNr = maxNr + 1;
        alert(`Nummer ${aktueltNr} findes allerede. Bruger i stedet nummer ${rigtigtNr}.`);

        await api.post('/skabeloner/dokumenter/', {
          dokument: navn,
          dokument_nr: rigtigtNr,
          gruppe_id: valgtGruppeObj.id,
          aktiv: true,
          dokument_type: 'Villa'
        });
      } else {
        await api.post('/skabeloner/dokumenter/', {
          dokument: navn,
          dokument_nr: aktueltNr,
          gruppe_id: valgtGruppeObj.id,
          aktiv: true,
          dokument_type: 'Villa'
        });
      }

      setNyDokumentNavn('');
      // Vigtigt: Hent data med det samme så listen er opdateret
      await hentData(filters);
    } catch (e: any) {
      alert("Fejl ved hurtig-tilføj: " + (e.message || "Ukendt fejl"));
    } finally {
      setIsSavingNy(false);
    }
  };

  const handleNulstilFiltre = () => {
    dispatch({
      type: 'SET_DOKUMENTSSKABELONER_STATE',
      payload: {
        dokumentskabelonerFilters: { gruppe_nr: '', dokument_nr: '', dokument: '' }
      }
    });
  };

  const handleRediger = (dok: SkabDokument) => {
    setDokumentTilRedigering(dok);
    setVisForm(true);
  };

  const handleQuickUpdate = async (dok: SkabDokument, updates: Partial<SkabDokument>) => {
    try {
      const updated = await api.put<SkabDokument>(`/skabeloner/dokumenter/${dok.id}/`, { ...dok, ...updates });
      const opdaterede = dokumenter.map(d => d.id === dok.id ? updated : d);
      dispatch({ type: 'SET_DOKUMENTSSKABELONER_STATE', payload: { dokumentskabeloner: opdaterede } });
    } catch (err) {
      alert("Kunne ikke opdatere feltet.");
    }
  };

  const handleToggleAktiv = async (dok: SkabDokument) => {
    const nyStatus = !dok.aktiv;
    handleQuickUpdate(dok, { aktiv: nyStatus });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-baseline gap-6">
          <h2 onClick={() => setActiveTab('oversigt')} className={`text-2xl font-bold cursor-pointer transition-colors ${activeTab === 'oversigt' ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>Dokumentskabeloner</h2>
          <h2 onClick={() => setActiveTab('linking')} className={`text-2xl font-bold cursor-pointer transition-colors ${activeTab === 'linking' ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>Link Aktiviteter</h2>
        </div>
        <div className="flex space-x-2">
          {(nyeDokumenterFindes || isSyncingAlle) && (
            <button
              onClick={handleSynkroniserAlleSager}
              disabled={isSyncingAlle}
              className={`
                p-2 rounded-full border transition-all
                ${isSyncingAlle ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200 animate-pulse'}
              `}
              title="Nye dokumenter fundet - Klik for at rulle ud til alle sager"
            >
              {isSyncingAlle ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
            </button>
          )}
          <button
            onClick={() => { setDokumentTilRedigering(null); setVisForm(true); }}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-sm"
            title="Opret Ny Dokumentskabelon"
          >
            <PlusCircle size={20} />
          </button>
        </div>
      </div>

      <div className={`flex flex-1 overflow-hidden relative ${activeTab === 'oversigt' ? '' : 'hidden'}`}>
        {/* Sidebar - Grupper */}
        <div
          className="bg-white border-r border-gray-200 flex flex-col flex-shrink-0 relative transition-all duration-75"
          style={{ width: `${sidebarWidth}px`, maxWidth: isExpanded ? 'none' : '20%' }}
        >
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center h-12">
            <h2 className={`text-xs font-semibold text-gray-400 uppercase truncate ${!isExpanded && sidebarWidth < 100 ? 'hidden' : ''}`}>
              Dokumentgrupper
            </h2>
            <button onClick={toggleSidebar} className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-400">
              {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>

          <div className="flex-grow overflow-y-auto">
            <div
              className={`p-3 cursor-pointer border-l-4 transition-colors ${!filters.gruppe_nr ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium' : 'border-transparent hover:bg-gray-50'}`}
              onClick={() => handleFilterChange({ target: { name: 'gruppe_nr', value: '' } } as any)}
            >
              {sidebarWidth > 100 ? 'Alle grupper' : 'Alle'}
            </div>
            {dokumentGrupper.map(g => (
              <div
                key={g.id}
                className={`p-3 cursor-pointer border-l-4 transition-colors text-sm ${filters.gruppe_nr === g.nr.toString() ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium' : 'border-transparent hover:bg-gray-50'}`}
                onClick={() => handleFilterChange({ target: { name: 'gruppe_nr', value: g.nr.toString() } } as any)}
              >
                <div className="flex justify-between items-center truncate">
                  <span className="truncate">{g.nr} - {g.titel_kort}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Resize Handle */}
          <div
            onMouseDown={startResizing}
            className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors z-10"
          />
        </div>

        {/* Main Content */}
        <div className="flex-grow flex flex-col min-w-0">
          <div className="p-4 bg-white border-b border-gray-200 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                id="filter-dokument-navn"
                type="text"
                name="dokument"
                placeholder="Søg dokument..."
                value={filters.dokument}
                onChange={handleFilterChange}
                className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black text-sm w-64"
                aria-label="Søg efter dokument"
              />
              <input
                id="filter-dokument-nr"
                type="text"
                name="dokument_nr"
                placeholder="Nr..."
                value={filters.dokument_nr}
                onChange={handleFilterChange}
                className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black text-sm w-20"
                aria-label="Filtrer på nummer"
              />
            </div>

            <button onClick={handleNulstilFiltre} className="p-2 text-gray-400 hover:text-gray-600 transition-colors" title="Ryd filtre">
              <FunnelX size={20} />
            </button>

            <button onClick={() => hentData(filters)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Opdater data">
              <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={() => dispatch({ type: 'SET_DOKUMENTSSKABELONER_STATE', payload: { dokumentskabelonerVisUdgaaede: !visUdgaaede } })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${visUdgaaede ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title={visUdgaaede ? "Skjul udgåede" : "Vis udgåede"}
            >
              {visUdgaaede ? <EyeOff size={18} /> : <Eye size={18} />}
              <span>{visUdgaaede ? 'Skjul udgåede' : 'Vis udgåede'}</span>
            </button>
          </div>

          <div className="flex-grow overflow-auto p-4">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
                <AlertCircle size={20} />
                <p>{error}</p>
              </div>
            )}

            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="py-2 px-3 font-semibold text-gray-700 text-sm w-12 text-center border-b">Aktiv</th>
                    <th className="py-2 px-3 font-semibold text-gray-700 text-sm w-20 text-left border-b">Nr</th>
                    <th className="py-2 px-3 font-semibold text-gray-700 text-sm w-[25%] border-b text-left">Dokument</th>
                    <th className="py-2 px-3 font-semibold text-gray-700 text-sm w-[34%] border-b text-left">Link</th>
                    <th className="py-2 px-3 font-semibold text-gray-700 text-sm w-[34%] border-b text-left">Filnavn</th>
                    <th className="py-2 px-3 font-semibold text-gray-700 text-sm w-[15%] border-b text-left">Kilde</th>
                    <th className="py-2 px-3 font-semibold text-gray-700 text-sm w-10 text-center border-b">Info</th>
                    <th className="py-2 px-3 font-semibold text-gray-700 text-sm w-12 text-center border-b">Ret</th>
                  </tr>
                </thead>
                <tbody className="">
                  {isLoading && dokumenter.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="animate-spin text-blue-500" size={32} />
                          <p className="text-gray-500">Henter dokument skabeloner...</p>
                        </div>
                      </td>
                    </tr>
                  ) : dokumenter.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-500">
                        Ingen dokument skabeloner fundet.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {dokumenter.map((dok) => {
                        const isCellActive = (field: string) => activeCell?.id === dok.id && activeCell?.field === field;
                        const isRowActive = activeCell?.id === dok.id;

                        return (
                          <tr
                            key={dok.id}
                            className={`border-b transition-all group ${isRowActive ? 'shadow-[inset_0_-2px_0_0_#ef4444] bg-red-50/30' : 'border-gray-100 hover:bg-gray-50'} ${dok.udgaaet ? 'opacity-60' : ''}`}
                          >
                            <td className="py-2 px-3 text-center">
                              <input
                                id={`aktiv-checkbox-${dok.id}`}
                                name={`aktiv-${dok.id}`}
                                type="checkbox"
                                checked={!!dok.aktiv}
                                onChange={() => handleToggleAktiv(dok)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                aria-label="Toggle aktiv status"
                              />
                            </td>
                            <td className="py-2 px-3 text-sm text-gray-600">
                              {isCellActive('dokument_nr') ? (
                                <input
                                  id={`edit-nr-${dok.id}`}
                                  name="dokument_nr"
                                  autoFocus
                                  type="number"
                                  value={activeCell?.value ?? ''}
                                  className="w-full text-black px-2 py-1 text-xs rounded border border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none"
                                  onChange={(e) => setActiveCell({ ...activeCell!, value: e.target.value })}
                                  onBlur={() => {
                                    if (activeCell?.value !== undefined) {
                                      handleQuickUpdate(dok, { dokument_nr: Number(activeCell.value) });
                                    }
                                    setActiveCell(null);
                                  }}
                                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                  aria-label="Rediger nummer"
                                />
                              ) : (
                                <div
                                  className="cursor-text py-1 rounded hover:bg-blue-50/50"
                                  onClick={() => setActiveCell({ id: dok.id, field: 'dokument_nr', value: dok.dokument_nr })}
                                >
                                  {dok.gruppe?.nr ? `${dok.gruppe.nr}.${dok.dokument_nr}` : dok.dokument_nr}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-sm font-medium text-gray-900 truncate" title={dok.dokument || ''}>
                              <div className="flex items-center gap-2 overflow-hidden">
                                {isCellActive('dokument') ? (
                                  <input
                                    id={`edit-dokument-${dok.id}`}
                                    name="dokument"
                                    autoFocus
                                    type="text"
                                    value={activeCell?.value ?? ''}
                                    className="w-full text-black px-2 py-1 text-sm rounded border border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none"
                                    onChange={(e) => setActiveCell({ ...activeCell!, value: e.target.value })}
                                    onBlur={() => {
                                      if (activeCell?.value !== undefined) {
                                        handleQuickUpdate(dok, { dokument: activeCell.value });
                                      }
                                      setActiveCell(null);
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                    aria-label="Rediger dokument navn"
                                  />
                                ) : (
                                  <span
                                    className="truncate cursor-text py-1 px-1 rounded hover:bg-blue-50/50 block w-full"
                                    onClick={() => setActiveCell({ id: dok.id, field: 'dokument', value: dok.dokument })}
                                  >
                                    {dok.dokument}
                                  </span>
                                )}
                                {manglerSync[dok.id] && (
                                  <Tooltip content="Dette dokument er nyt og mangler at blive tilføjet på sagerne.">
                                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                      <PlusCircleIcon size={10} />
                                      NY
                                    </span>
                                  </Tooltip>
                                )}
                                {dok.udgaaet && (
                                  <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold flex-shrink-0">
                                    Udgået
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-sm text-blue-600 max-w-0">
                              <InlineTextEditor
                                value={dok.link}
                                placeholder="Tilføj link..."
                                onEdit={() => setActiveCell({ id: dok.id, field: 'link', value: dok.link })}
                                onBlur={() => setActiveCell(null)}
                                onSave={(val) => handleQuickUpdate(dok, { link: val })}
                                onExpand={() => setActiveCell({ id: dok.id, field: 'link_expanded', value: dok.link })}
                              />
                              {isCellActive('link_expanded') && (
                                <div className="absolute z-50 bg-white p-3 shadow-2xl border rounded mt-1 left-40 min-w-[400px]">
                                  <div className="block text-xs font-bold mb-1 text-gray-500">Link:</div>
                                  <textarea
                                    id={`edit-link-expanded-${dok.id}`}
                                    name="link"
                                    autoFocus
                                    value={activeCell?.value ?? ''}
                                    className="w-full p-2 text-sm border rounded h-32 focus:ring-1 focus:ring-blue-400 outline-none"
                                    onChange={(e) => setActiveCell({ ...activeCell!, value: e.target.value })}
                                    onBlur={() => {
                                      handleQuickUpdate(dok, { link: activeCell?.value });
                                      setActiveCell(null);
                                    }}
                                    aria-label="Rediger link"
                                  />
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-sm text-gray-600 max-w-0">
                              <InlineTextEditor
                                value={dok.filnavn}
                                placeholder="Navne-mønster..."
                                onEdit={() => setActiveCell({ id: dok.id, field: 'filnavn', value: dok.filnavn })}
                                onBlur={() => setActiveCell(null)}
                                onSave={(val) => handleQuickUpdate(dok, { filnavn: val })}
                                onExpand={() => setActiveCell({ id: dok.id, field: 'filnavn_expanded', value: dok.filnavn })}
                              />
                              {isCellActive('filnavn_expanded') && (
                                <div className="absolute z-50 bg-white p-3 shadow-2xl border rounded mt-1 left-1/3 min-w-[400px]">
                                  <div className="block text-xs font-bold mb-1 text-gray-500">Filnavn mønster:</div>
                                  <textarea
                                    id={`edit-filnavn-expanded-${dok.id}`}
                                    name="filnavn"
                                    autoFocus
                                    value={activeCell?.value ?? ''}
                                    className="w-full p-2 text-sm border rounded h-32 focus:ring-1 focus:ring-blue-400 outline-none"
                                    onChange={(e) => setActiveCell({ ...activeCell!, value: e.target.value })}
                                    onBlur={() => {
                                      handleQuickUpdate(dok, { filnavn: activeCell?.value });
                                      setActiveCell(null);
                                    }}
                                    aria-label="Rediger filnavn mønster"
                                  />
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-sm text-gray-600 truncate">
                              {isCellActive('informations_kilde_id') ? (
                                <select
                                  id={`select-kilde-${dok.id}`}
                                  name="informations_kilde_id"
                                  autoFocus
                                  value={activeCell?.value ?? ''}
                                  className="w-full text-black px-1 py-1 text-xs rounded border border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none bg-white font-sans"
                                  onChange={(e) => setActiveCell({ ...activeCell!, value: e.target.value })}
                                  onBlur={() => {
                                    if (activeCell?.value !== undefined) {
                                      handleQuickUpdate(dok, { informations_kilde_id: activeCell.value ? Number(activeCell.value) : null });
                                    }
                                    setActiveCell(null);
                                  }}
                                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                  aria-label="Vælg kilde"
                                >
                                  <option value="">Vælg kilde...</option>
                                  {informationsKilder.map(k => (
                                    <option key={k.id} value={k.id}>{k.navn}</option>
                                  ))}
                                </select>
                              ) : (
                                <div
                                  className="cursor-text py-1 rounded hover:bg-blue-50/50"
                                  onClick={() => setActiveCell({ id: dok.id, field: 'informations_kilde_id', value: dok.informations_kilde?.id })}
                                >
                                  {dok.informations_kilde?.navn || <span className="text-gray-300 italic">Vælg kilde...</span>}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <Tooltip content={dok.kommentar || 'Ingen kommentar'}>
                                <div
                                  className="cursor-pointer p-1 hover:bg-gray-100 rounded inline-block"
                                  onClick={() => setActiveCell({ id: dok.id, field: 'kommentar', value: dok.kommentar })}
                                >
                                  <Info size={16} className={`${dok.kommentar ? 'text-blue-500' : 'text-gray-300'}`} />
                                </div>
                              </Tooltip>
                              {isCellActive('kommentar') && (
                                <div className="absolute z-50 bg-white p-3 shadow-2xl border rounded mt-2 right-10 min-w-[350px]">
                                  <div className="block text-xs font-bold mb-1 text-gray-500">Kommentar / Note:</div>
                                  <textarea
                                    id={`edit-kommentar-expanded-${dok.id}`}
                                    name="kommentar"
                                    autoFocus
                                    value={activeCell?.value ?? ''}
                                    className="w-full p-2 text-xs border rounded h-32 focus:ring-1 focus:ring-blue-400 outline-none"
                                    onChange={(e) => setActiveCell({ ...activeCell!, value: e.target.value })}
                                    onBlur={() => {
                                      handleQuickUpdate(dok, { kommentar: activeCell?.value });
                                      setActiveCell(null);
                                    }}
                                    aria-label="Rediger kommentar"
                                  />
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button onClick={() => handleRediger(dok)} className="text-gray-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100">
                                <Edit size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Hurtig-opret række */}
                      {filters.gruppe_nr && (
                        <tr className="bg-blue-50/20 border-t border-blue-100">
                          <td className="py-2 px-3 text-center">
                            <PlusCircle size={14} className="mx-auto text-blue-400" />
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="text"
                              value={filters.gruppe_nr ? `${filters.gruppe_nr}.${nyDokumentNr}` : nyDokumentNr}
                              readOnly
                              placeholder="Nr"
                              className="w-full px-2 py-1 text-[11px] bg-transparent border-0 border-b border-blue-200 text-gray-500 cursor-not-allowed font-medium"
                              title="Nummeret tildeles automatisk"
                            />
                          </td>
                          <td className="py-1 px-2">
                            <form onSubmit={handleQuickAdd}>
                              <input
                                id="ny-dokument-navn"
                                name="ny-dokument-navn"
                                type="text"
                                value={nyDokumentNavn}
                                onChange={(e) => setNyDokumentNavn(e.target.value)}
                                placeholder="Nyt dokumentnavn... (Enter for at gemme)"
                                className="w-full px-2 py-1 text-[11px] bg-transparent border-0 border-b border-blue-200 focus:border-blue-500 focus:ring-0 placeholder-gray-400 outline-none"
                                aria-label="Nyt dokumentnavn"
                              />
                            </form>
                          </td>
                          <td className="py-1 px-2">
                            <button
                              onClick={handleQuickAdd}
                              disabled={isSavingNy || !nyDokumentNavn.trim()}
                              className="text-[10px] uppercase font-bold text-blue-600 hover:text-blue-800 disabled:text-gray-400 transition-colors inline-flex items-center gap-1 w-full justify-start whitespace-nowrap"
                            >
                              {isSavingNy ? <Loader2 size={12} className="animate-spin" /> : <PlusCircle size={12} />}
                              TILFØJ
                            </button>
                          </td>
                          <td className="py-1 px-2"></td> {/* Filnavn kolonne tom */}
                          <td className="py-1 px-2"></td> {/* Kilde kolonne tom */}
                          <td className="py-1 px-2 text-center" colSpan={2}></td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>

              {nextPageUrl && (
                <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
                  <Button onClick={handleHentFlere} variant="secondary" disabled={isLoadingMore}>
                    <div className="flex items-center gap-2">
                      {isLoadingMore ? <Loader2 className="animate-spin" size={18} /> : <PlusCircle size={18} />}
                      <span>{isLoadingMore ? 'Henter...' : 'Hent flere'}</span>
                    </div>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={`flex-1 overflow-hidden ${activeTab === 'linking' ? 'flex' : 'hidden'}`}>
        <LinkingTab blokinfo={blokinfo} />
      </div>

      {visForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <DokumentSkabelonForm
              dokument={dokumentTilRedigering}
              onSave={() => { setVisForm(false); hentData(filters); }}
              onCancel={() => setVisForm(false)}
              initialFilters={filters}
            />
          </div>
        </div>
      )}
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

export default DokumentskabelonerPage;