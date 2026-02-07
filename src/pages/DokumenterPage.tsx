// --- Fil: src/pages/DokumenterPage.tsx ---
import React, { ReactElement, useEffect, useState, useRef } from 'react';
import { useSager } from '../contexts/SagContext';
import { useAktivitetDokument } from '../contexts/AktivitetDokumentContext';
import { api } from '../api';
import { Sag } from '../types';
import DokumenterTab from '../components/sagsdetaljer/tabs/DokumenterTab';
import StifinderTab from '../components/sagsdetaljer/tabs/StifinderTab';
import { Loader2, ListChecks, FolderSearch } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import CaseSelector from '../components/ui/CaseSelector';
import SagsHeader from '../components/sagsdetaljer/SagsHeader';

interface DokumenterPageProps {
  sagId: number | null;
}

function DokumenterPage({ sagId }: DokumenterPageProps): ReactElement {
  const { state: sagState, dispatch: sagDispatch } = useSager();
  const { state: adState, dispatch: adDispatch } = useAktivitetDokument();

  // --- SMART SHIMS for legacy compatibility & extreme performance ---
  const dispatch = adDispatch;
  const state = {
    ...sagState,
    ...adState,
    erFilterMenuAaben: false // No longer used here
  } as any;

  const { valgtSag } = sagState;
  const navigate = useNavigate();
  const location = useLocation();

  // @# DEBUG: Navigation issue
  useEffect(() => {
    console.log("DokumenterPage mounted. SagId:", sagId, "Path:", location.pathname);
    return () => console.log("DokumenterPage unmounting");
  }, [sagId, location.pathname]);

  // @# Resolve effective sagId (prop > URL)
  // ... remaining logic updated to use sagDispatch for SET_VALGT_SAG ...
  const queryParams = new URLSearchParams(location.search);
  const urlSagId = queryParams.get('sag_id');
  const effectiveSagId = sagId || (urlSagId ? parseInt(urlSagId, 10) : null);

  const [activeTab, setActiveTab] = useState<'tjekliste' | 'stifinder'>((queryParams.get('tab') as any) || 'tjekliste');

  const [localSag, setLocalSag] = useState<Sag | null>(valgtSag);
  const [loading, setLoading] = useState(!valgtSag && !!effectiveSagId);

  const handleTabChange = (tab: 'tjekliste' | 'stifinder') => {
    setActiveTab(tab);
    const params = new URLSearchParams(location.search);
    params.set('tab', tab);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  // Sync tab from URL if it changes (e.g. browser back button)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab') as 'tjekliste' | 'stifinder';
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    } else if (!tab && activeTab !== 'tjekliste') {
      // Default to tjekliste if no tab param
      setActiveTab('tjekliste');
    }
  }, [location.search]); // Remove activeTab from dependency to avoid loop



  const hasToggledRef = useRef(false);

  // Luk filter-menuen som standard når siden åbnes
  // (Fjernet legacy toggle-logik for at forbedre performance)


  useEffect(() => {
    if (!effectiveSagId) return;

    if (valgtSag && valgtSag.id === effectiveSagId) {
      setLocalSag(valgtSag);
      setLoading(false);
      return;
    }

    setLoading(true);
    api.get<Sag>(`/sager/${effectiveSagId}/`).then(data => {
      setLocalSag(data);
      sagDispatch({ type: 'SET_VALGT_SAG', payload: data });
      setLoading(false);
    }).catch(err => {
      console.error("Fejl ved hentning af sag i DokumenterPage:", err);
      setLoading(false);
    });
  }, [effectiveSagId, valgtSag, dispatch]);

  const handleSelectSag = async (id: number) => {
    setLoading(true);
    try {
      const targetSag = await api.get<Sag>(`/sager/${id}/`);
      sagDispatch({ type: 'SET_VALGT_SAG', payload: targetSag });

      // Update URL so navigation/refresh works
      const params = new URLSearchParams(location.search);
      params.set('sag_id', id.toString());
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    } catch (e: any) {
      console.error("Fejl ved sags-skift:", e);
    } finally {
      setLoading(false);
    }
  };

  if (!effectiveSagId) {
    return (
      <div className="p-12 text-center text-gray-500 bg-white m-6 rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold mb-4">Dokumentoversigt</h1>
        <p>Ingen sag valgt. Gå til sagsoversigten og vælg en sag (klik på mappe-ikonet) for at se dokumenter.</p>
        <button
          onClick={() => navigate('/sagsoversigt')}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Gå til Sagsoversigt
        </button>
      </div>
    );
  }

  if (loading || !localSag) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  const [toolbarContent, setToolbarContent] = useState<React.ReactNode>(null);

  useEffect(() => {
    // Reset toolbar content when tab changes
    setToolbarContent(null);
  }, [activeTab]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-gray-100">
      {localSag && (
        <SagsHeader
          sag={localSag}
          activePage="dokumenter"
          helpPointCode="DOKUMENTER_HELP"
          rightContent={
            <div className="flex items-center gap-4">
              <div className="min-w-64">
                <CaseSelector
                  value={localSag.id}
                  onChange={handleSelectSag}
                  label={`${localSag.sags_nr}${localSag.alias ? ' - ' + localSag.alias : ''}`}
                  className="shadow-none border-gray-200"
                  placeholder="Skift til en anden sag..."
                />
              </div>

              <button
                onClick={() => window.open(`/dokumenter?sag_id=${localSag.id}&tab=stifinder`, '_blank', 'width=1200,height=800')}
                title="Åbn Stifinder i nyt vindue"
                className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
              >
                <FolderSearch size={16} />
              </button>
            </div>
          }
          bottomContent={
            <div className="flex items-center w-full gap-32">
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg shadow-sm">
                <button
                  onClick={() => handleTabChange('tjekliste')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'tjekliste'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <ListChecks size={20} />
                  Tjekliste
                </button>
                <button
                  onClick={() => handleTabChange('stifinder')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all mr-12 ${activeTab === 'stifinder'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <FolderSearch size={20} />
                  Stifinder
                </button>
              </div>

              {/* Dynamic Toolbar Content (Counters, Collapse, etc.) */}
              <div className="flex items-center gap-2 animate-in fade-in">
                {toolbarContent}
              </div>
            </div>
          }
        />
      )}

      <div className="flex-1 h-full overflow-y-auto pl-[76px] pr-6 pb-6 pt-0 scroll-smooth">
        <div className="h-full space-y-6">

          {activeTab === 'tjekliste' ? (
            <DokumenterTab sag={localSag} onToolbarUpdate={setToolbarContent} />
          ) : (
            <StifinderTab sag={localSag} />
          )}
        </div>
      </div>
    </div>
  );
}

export default DokumenterPage;