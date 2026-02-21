// --- Fil: src/pages/SagsoversigtPage.tsx ---
// @# 2025-11-22 17:00 - Opdateret til at sende filtrerede sags-ID'er til global state.
// @# 2025-11-23 14:00 - Bruger nu globale 'statusser' i stedet for lokale, så de huskes ved tilbage-navigation.
// @# 2025-12-25 21:00 - Refactored to use SagsRow component.
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useMemo, ChangeEvent, useCallback, ReactNode, useRef } from 'react';
import type { Sag, Status } from '../types';
import { SagService } from '../services/SagService';
import SagsForm from '../components/SagsForm';
import { ArrowUp, ArrowDown, PlusCircle, FunnelX, Loader2, AlertCircle } from 'lucide-react';
import { useSager } from '../contexts/SagContext';
import { useLookups } from '../contexts/LookupContext';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import { useTableNavigation } from '../hooks/useTableNavigation';
import Button from '../components/ui/Button';
import SagsRow from '../components/rows/SagsRow';
import useDebounce from '../hooks/useDebounce';
import HelpButton from '../components/ui/HelpButton';
import SearchableSelect from '../components/ui/SearchableSelect';
import { LookupService } from '../services/LookupService';
import { User } from '../types';
import { User as UserIcon } from 'lucide-react';

interface SagsoversigtPageProps {
  navigateTo: (side: string, sag: Sag | null) => void;
}

type SortKey = keyof Sag | `status.${keyof Status}`;

function SagsoversigtPage({ navigateTo }: SagsoversigtPageProps) {
  const navigate = useNavigate();
  const { state: sagerState, dispatch: sagDispatch } = useSager();
  const { state: lookupState } = useLookups();
  const {
    sager,
    sagsoversigtError: error,
    sagsoversigtIsLoading: isLoading,
    sagsoversigtFilters: filter,
    sagsoversigtSortConfig: sortConfig,
    sagsoversigtVisLukkede: visLukkede,
    sagsoversigtVisAnnullerede: visAnnullerede,
    erSagerHentet
  } = sagerState;

  const { statusser } = lookupState;

  const [visForm, setVisForm] = useState<boolean>(false);
  const [sagTilRedigering, setSagTilRedigering] = useState<Sag | null>(null);
  const [udfoldetSagId, setUdfoldetSagId] = useState<number | null>(null);
  const [visFlereFiltre, setVisFlereFiltre] = useState<boolean>(false);
  const [creatingActivitiesForSagId, setCreatingActivitiesForSagId] = useState<number | null>(null);
  const [creatingDocumentsForSagId, setCreatingDocumentsForSagId] = useState<number | null>(null);
  const [modalInfo, setModalInfo] = useState<{ isOpen: boolean; title: string; message: ReactNode }>({ isOpen: false, title: '', message: null });
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [users, setUsers] = useState<User[]>([]);
  const { state: authState } = useAuth();

  const tableRef = useRef<HTMLTableElement>(null);
  useTableNavigation(tableRef);

  const debouncedFilter = useDebounce(filter, 300);

  const hentData = useCallback(async () => {
    // Hvis vi allerede har data, viser vi kun en lille "Updating" indikator
    if (sager.length > 0) {
      setIsUpdating(true);
    } else {
      sagDispatch({ type: 'SET_SAGER_STATE', payload: { sagsoversigtIsLoading: true, sagsoversigtError: null } });
    }

    try {
      const sagsliste = await SagService.getSager();
      sagDispatch({ type: 'SET_SAGER_STATE', payload: { sager: sagsliste, erSagerHentet: true } });
    } catch (e: any) {
      if (sager.length === 0) {
        sagDispatch({ type: 'SET_SAGER_STATE', payload: { sagsoversigtError: `Kunne ikke hente sager.\nSikr at backend-serveren kører.` } });
      }
      console.error("Fejl ved hentning af sager:", e);
    } finally {
      setIsUpdating(false);
      sagDispatch({ type: 'SET_SAGER_STATE', payload: { sagsoversigtIsLoading: false } });
    }
  }, [sagDispatch, sager.length]);

  useEffect(() => {
    hentData();
  }, [hentData]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const allUsers = await LookupService.getUsers();
        setUsers(allUsers.filter((u: User) => u.is_active && u.er_sagsbehandler !== false));
      } catch (error) {
        console.error('Fejl ved hentning af brugere:', error);
      }
    };
    fetchUsers();
  }, []);

  const handleStatusSave = async (sagId: number, nyStatusId: string) => {
    try {
      const opdateretSag = await SagService.updateSag(sagId, { status_id: nyStatusId });
      const opdateredeSager = sager.map(sag => (sag.id === sagId ? opdateretSag : sag));
      sagDispatch({ type: 'SET_SAGER_STATE', payload: { sager: opdateredeSager } });
    } catch (error) {
      console.error("Fejl ved opdatering af status:", error);
    }
  };

  const handleOpretAktiviteter = async (sagId: number) => {
    setCreatingActivitiesForSagId(sagId);
    try {
      await SagService.opretAktiviteter(sagId);
      const opdateretSag = await SagService.getSag(sagId);
      const opdateredeSager = sager.map(s => s.id === sagId ? opdateretSag : s);
      sagDispatch({ type: 'SET_SAGER_STATE', payload: { sager: opdateredeSager } });

      setModalInfo({
        isOpen: true,
        title: "Succes",
        message: (
          <div className="text-center">
            <p className="text-gray-600">Aktiviteter til</p>
            <p className="font-bold text-lg my-1">{opdateretSag.sags_nr} - {opdateretSag.alias}</p>
            <p className="text-gray-600">er oprettet.</p>
          </div>
        )
      });
    } catch (error: any) {
      setModalInfo({ isOpen: true, title: "Fejl", message: error.message });
    } finally {
      setCreatingActivitiesForSagId(null);
    }
  };

  const handleOpretDokumenter = async (sagId: number) => {
    setCreatingDocumentsForSagId(sagId);
    try {
      await SagService.synkroniserDokumenter(sagId);
      const opdateretSag = await SagService.getSag(sagId);
      const opdateredeSager = sager.map(s => s.id === sagId ? opdateretSag : s);
      sagDispatch({ type: 'SET_SAGER_STATE', payload: { sager: opdateredeSager } });

      setModalInfo({
        isOpen: true,
        title: "Succes",
        message: (
          <div className="text-center">
            <p className="text-gray-600">Dokumentstruktur for</p>
            <p className="font-bold text-lg my-1">{opdateretSag.sags_nr}</p>
            <p className="text-gray-600">er oprettet/opdateret.</p>
          </div>
        )
      });
    } catch (error: any) {
      setModalInfo({ isOpen: true, title: "Fejl", message: error.message || "Kunne ikke oprette dokumenter." });
    } finally {
      setCreatingDocumentsForSagId(null);
    }
  };

  const sorteredeOgFiltreredeSager = useMemo(() => {
    const getNestedValue = (obj: any, path: string) => path.split('.').reduce((acc: any, part: string) => acc && acc[part], obj);
    let filtreret = [...sager];

    filtreret = filtreret.filter(sag => {
      // 1. Visibility Check
      // If searching for specific Case ID or specifically by Status, we bypass default visibility rules (closed/cancelled)
      const isSpecificSearch = !!debouncedFilter.sags_nr || !!debouncedFilter.status;

      if (!isSpecificSearch) {
        if (!sag.status) return !visLukkede && !visAnnullerede;
        const kategori = sag.status.status_kategori;
        const isVisibleStatus = (kategori === 0 && !visLukkede && !visAnnullerede) || (kategori === 1 && visLukkede) || (kategori === 9 && visAnnullerede);
        if (!isVisibleStatus) return false;
      }

      // 2. Filters
      if (debouncedFilter.sags_nr && !String(sag.sags_nr || '').includes(debouncedFilter.sags_nr)) return false;

      if (debouncedFilter.status) {
        if (!sag.status) return false;

        const filterVal = debouncedFilter.status;
        const sagStatusId = String(sag.status.id);
        const sagStatusNr = String(sag.status.status_nummer);
        const sagStatusDesc = (sag.status.beskrivelse || '').toLowerCase();
        const sagStatusLabel = `${sag.status.status_nummer} - ${sag.status.beskrivelse}`;



        // Match Strategies:
        // 1. Exact ID
        if (sagStatusId === filterVal) return true;
        // 2. Exact Status Number
        if (sagStatusNr === filterVal) return true;
        // 3. Label Match (if filterVal is "1 - Registreret")
        if (sagStatusLabel === filterVal) return true;
        // 4. Description Contains (fallback)
        if (sagStatusDesc.includes(filterVal.toLowerCase())) return true;
        // 5. Status Number starts with filter (e.g. filter "1" matches "10", "15") - maybe not desired for dropdown but good for text
        // For dropdown, we expect exact ID. But if dropdown passes "1 - Registreret", strategy 3 handles it.

        return false;
      }

      if (debouncedFilter.alias && !sag.alias?.toLowerCase().includes(debouncedFilter.alias.toLowerCase())) return false;

      if (debouncedFilter.hovedansvarlige) {
        const sagAnsvarlig = (sag.hovedansvarlige || '').toLowerCase();
        const filterAnsvarlig = debouncedFilter.hovedansvarlige.toLowerCase();

        // Bidirectional check
        if (filterAnsvarlig && !sagAnsvarlig.includes(filterAnsvarlig) && !filterAnsvarlig.includes(sagAnsvarlig)) return false;
      }

      if (debouncedFilter.adresse && !sag.fuld_adresse?.toLowerCase().includes(debouncedFilter.adresse.toLowerCase())) return false;

      return true;
    });

    if (sortConfig.key) {
      filtreret.sort((a, b) => {
        const aValue = getNestedValue(a, String(sortConfig.key)) || '';
        const bValue = getNestedValue(b, String(sortConfig.key)) || '';
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return filtreret;
  }, [sager, debouncedFilter, sortConfig, visLukkede, visAnnullerede]);

  // Sync den filtrerede liste af ID'er til global state
  useEffect(() => {
    const ids = sorteredeOgFiltreredeSager.map(s => s.id);
    sagDispatch({ type: 'SET_SAGS_ID_LISTE', payload: ids });
  }, [sorteredeOgFiltreredeSager, sagDispatch]);

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    sagDispatch({ type: 'SET_SAGER_STATE', payload: { sagsoversigtSortConfig: { key, direction } } });
  };

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    sagDispatch({ type: 'SET_SAGER_STATE', payload: { sagsoversigtFilters: { ...filter, [name]: value } } });
  };

  const handleNulstilFiltre = () => {
    sagDispatch({
      type: 'SET_SAGER_STATE',
      payload: {
        sagsoversigtFilters: { sags_nr: '', alias: '', hovedansvarlige: '', adresse: '', status: '' },
        sagsoversigtVisLukkede: false,
        sagsoversigtVisAnnullerede: false
      }
    });
  };

  const handleFilterValueChange = (name: string, value: string) => {
    sagDispatch({ type: 'SET_SAGER_STATE', payload: { sagsoversigtFilters: { ...filter, [name]: value } } });
  };

  const handleSetMine = () => {
    if (authState.currentUser) {
      const myName = `${authState.currentUser.first_name} ${authState.currentUser.last_name}`.trim() || authState.currentUser.username;
      // Toggle off if already set to me
      if (filter.hovedansvarlige === myName) {
        handleFilterValueChange('hovedansvarlige', '');
      } else {
        handleFilterValueChange('hovedansvarlige', myName);
      }
    }
  };

  const handleOpretNySag = () => { setSagTilRedigering(null); setVisForm(true); };
  const handleRedigerSag = (sag: Sag) => { setSagTilRedigering(sag); setVisForm(true); };
  const handleAnnuller = () => { setVisForm(false); setSagTilRedigering(null); };
  const handleRaekkeKlik = (sagId: number) => { setUdfoldetSagId(udfoldetSagId === sagId ? null : sagId); };

  const handleSaveSag = (gemtSag?: Sag) => {
    const wasCreating = !sagTilRedigering;
    sagDispatch({ type: 'SET_SAGER_STATE', payload: { erSagerHentet: false } });
    setVisForm(false);
    setSagTilRedigering(null);

    if (wasCreating && gemtSag) {
      navigateTo('sagsdetaljer', gemtSag);
    }
  };

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return null;
    if (sortConfig.direction === 'ascending') return <ArrowUp className="inline-block ml-1 h-4 w-4" />;
    return <ArrowDown className="inline-block ml-1 h-4 w-4" />;
  };

  if (error) return <div className="p-8 flex flex-col items-center justify-center text-red-600"><AlertCircle size={48} className="mb-4" /><h2 className="text-xl font-bold mb-2">Fejl</h2><p>{error}</p></div>;
  return (
    <div className="p-4">
      <Modal
        isOpen={modalInfo.isOpen}
        onClose={() => setModalInfo({ isOpen: false, title: '', message: null })}
        title={modalInfo.title}
        footer={
          <Button
            onClick={() => setModalInfo({ isOpen: false, title: '', message: null })}
            variant="primary"
          >
            OK
          </Button>
        }
      >
        {modalInfo.message}
      </Modal>

      <Modal
        isOpen={visForm}
        onClose={handleAnnuller}
        title={sagTilRedigering ? `Rediger Sag: ${sagTilRedigering.sags_nr}` : 'Opret Ny Sag'}
        wide
      >
        <SagsForm
          onSave={handleSaveSag}
          onCancel={handleAnnuller}
          sagTilRedigering={sagTilRedigering}
        />
      </Modal>

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-800">Sagsoversigt</h2>
          {isUpdating && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100 animate-pulse">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Opdaterer...</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <HelpButton helpPointCode="SAGSOVERSIGT_HELP" />
          <button onClick={handleOpretNySag} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700" title="Opret Ny Sag">
            <PlusCircle size={20} />
          </button>
        </div>
      </div>

      <div className="mb-4 p-2 bg-gray-300 rounded-lg border border-gray-400">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          <input type="text" name="sags_nr" placeholder="Sagsnr..." value={filter.sags_nr} onChange={handleFilterChange} className="px-2 py-1 h-[30px] border border-gray-300 rounded-md lg:col-span-2 text-sm" />

          <div className="lg:col-span-2">
            <SearchableSelect
              value={filter.status}
              onChange={(val) => handleFilterValueChange('status', val)}
              options={[
                { value: '', label: 'Alle statusser' },
                ...statusser.map(s => ({ value: `${s.status_nummer} - ${s.beskrivelse}`, label: `${s.status_nummer} - ${s.beskrivelse}` }))
              ]}
              placeholder="Status..."
              className="w-full"
            />
          </div>

          <input type="text" name="alias" placeholder="Alias..." value={filter.alias} onChange={handleFilterChange} className="px-2 py-1 h-[30px] border border-gray-300 rounded-md lg:col-span-2 text-sm" />

          <div className="lg:col-span-2 flex items-center gap-2">
            <button
              onClick={handleSetMine}
              className={`h-[30px] w-[30px] flex items-center justify-center rounded-md transition-colors ${filter.hovedansvarlige === (authState.currentUser ? `${authState.currentUser.first_name} ${authState.currentUser.last_name}`.trim() || authState.currentUser.username : '---') ? 'bg-green-200 text-green-800 border border-green-400 shadow-sm' : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'}`}
              title="Mine sager"
            >
              <UserIcon size={16} />
            </button>
            <div className="flex-1">
              <SearchableSelect
                value={filter.hovedansvarlige}
                onChange={(val) => handleFilterValueChange('hovedansvarlige', val)}
                options={[
                  { value: '', label: 'Alle ansvarlige' },
                  ...users.map(u => {
                    const fullName = `${u.first_name} ${u.last_name}`.trim() || u.username;
                    return { value: fullName, label: u.username };
                  })
                ]}
                placeholder="Ansvarlig..."
                className="w-full"
              />
            </div>
          </div>

          <input type="text" name="adresse" placeholder="Adresse..." value={filter.adresse} onChange={handleFilterChange} className="px-2 py-1 h-[30px] border border-gray-300 rounded-md lg:col-span-4 text-sm" />
        </div>
        <div className="flex justify-between items-center mt-2">
          <button onClick={() => setVisFlereFiltre(!visFlereFiltre)} className="text-blue-700 hover:text-blue-900 text-sm font-medium">{visFlereFiltre ? 'Skjul flere filtre' : 'Vis flere filtre'}</button>
          <button onClick={handleNulstilFiltre} className="p-1 text-gray-700 rounded-full hover:bg-gray-400/50" title="Nulstil Alle Filtre"><FunnelX size={18} /></button>
        </div>
        {visFlereFiltre && (<div className="mt-2 pt-0"><div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={visLukkede} onChange={() => sagDispatch({ type: 'SET_SAGER_STATE', payload: { sagsoversigtVisLukkede: !visLukkede } })} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><span>Vis lukkede</span></label>
          <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={visAnnullerede} onChange={() => sagDispatch({ type: 'SET_SAGER_STATE', payload: { sagsoversigtVisAnnullerede: !visAnnullerede } })} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><span>Vis annullerede</span></label></div></div>)}
      </div>

      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full bg-white table-fixed" ref={tableRef}>
          <thead className="bg-gray-800 text-white text-xs">
            <tr>
              <th className="text-left py-1 px-2 uppercase font-semibold w-[7%]" onClick={() => requestSort('sags_nr')}>SagsNr{getSortIcon('sags_nr')}</th>
              <th className="text-left py-1 px-2 uppercase font-semibold w-[15%]" onClick={() => requestSort('alias')}>Alias{getSortIcon('alias')}</th>
              <th className="text-left py-1 px-2 uppercase font-semibold w-[15%]" onClick={() => requestSort('status.beskrivelse')}>Status{getSortIcon('status.beskrivelse')}</th>
              <th className="text-left py-1 px-2 uppercase font-semibold w-[15%]" onClick={() => requestSort('hovedansvarlige')}>Ansvarlig{getSortIcon('hovedansvarlige')}</th>
              <th className="text-left py-1 px-2 uppercase font-semibold" onClick={() => requestSort('fuld_adresse')}>Adresse{getSortIcon('fuld_adresse')}</th>
              <th className="text-left py-1 px-2 uppercase font-semibold w-[18%]" >Handlinger</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-xs">
            {isLoading && sorteredeOgFiltreredeSager.length === 0
              ? (<tr><td colSpan={6} className="text-center py-4"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>)
              : sorteredeOgFiltreredeSager.length === 0
                ? (<tr><td colSpan={6} className="text-center py-4">Ingen sager fundet.</td></tr>)
                : (sorteredeOgFiltreredeSager.map(sag => (
                  <SagsRow
                    key={sag.id}
                    sag={sag}
                    users={users}
                    statusser={statusser}
                    isExpanded={udfoldetSagId === sag.id}
                    isCreatingActivities={creatingActivitiesForSagId === sag.id}
                    isCreatingDocuments={creatingDocumentsForSagId === sag.id}
                    onToggleExpand={() => handleRaekkeKlik(sag.id)}
                    onStatusChange={handleStatusSave}
                    onEdit={handleRedigerSag}
                    onOpretAktiviteter={handleOpretAktiviteter}
                    onOpretDokumenter={handleOpretDokumenter}
                    navigateTo={navigateTo}
                    dispatch={sagDispatch}
                  />
                )))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SagsoversigtPage;