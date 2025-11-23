// --- Fil: src/pages/SagsdetaljerPage.tsx ---
// @# 2025-11-22 18:30 - Fuld omstrukturering: Implementeret Dashboard-layout med Lazy Loading tabs.
// @# 2025-11-23 10:00 - Rettet modal-styling (hvid baggrund) og flyttet rediger-knap til OverblikTab.
// @# 2025-11-23 14:00 - Tilføjet status-logik (hentning + opdatering) til OverblikTab.
import React, { useState, useEffect, useCallback, ReactElement } from 'react';
import { API_BASE_URL } from '../config';
import { Sag } from '../types';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAppState } from '../StateContext';

// Layout og Tabs
import SagsdetaljerLayout, { TabType } from '../components/sagsdetaljer/SagsdetaljerLayout';
import OverblikTab from '../components/sagsdetaljer/tabs/OverblikTab';
import MaeglerTab from '../components/sagsdetaljer/tabs/MaeglerTab';
import BankTab from '../components/sagsdetaljer/tabs/BankTab';
import SaelgereTab from '../components/sagsdetaljer/tabs/SaelgereTab';
import RaadgivereTab from '../components/sagsdetaljer/tabs/RaadgivereTab';
import KommuneTab from '../components/sagsdetaljer/tabs/KommuneTab';
import ForsyningTab from '../components/sagsdetaljer/tabs/ForsyningTab';

// Komponenter til redigering
import SagsForm from '../components/SagsForm';

interface SagsdetaljerPageProps {
  sagId: number | null;
  navigateTo: (side: string, sag: Sag | null) => void;
}

function SagsdetaljerPage({ sagId, navigateTo }: SagsdetaljerPageProps): ReactElement {
  const { state, dispatch } = useAppState();
  const { statusser } = state; // @# Hent statusser fra global state
  
  const [sag, setSag] = useState<Sag | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState<TabType>('overblik');
  const [visRedigerStamdata, setVisRedigerStamdata] = useState(false);

  // 1. Hent kun sagens stamdata (Letvægts fetch)
  const fetchSag = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/sager/${id}/`);
      if (!res.ok) throw new Error(`Kunne ikke hente sag ${id}`);
      const data: Sag = await res.json();
      setSag(data);
    } catch (e: any) {
      setError(e.message);
      setSag(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 1b. Sørg for at statusser er indlæst
  useEffect(() => {
      const fetchStatusser = async () => {
          if (statusser.length > 0) return;
          try {
              const res = await fetch(`${API_BASE_URL}/kerne/status/?formaal=1`);
              if (res.ok) {
                  const data = await res.json();
                  dispatch({ type: 'SET_STATUSSER', payload: Array.isArray(data.results) ? data.results : data });
              }
          } catch (e) {
              console.error("Fejl ved hentning af statusser:", e);
          }
      };
      fetchStatusser();
  }, [statusser.length, dispatch]);


  // Initial load
  useEffect(() => {
    if (sagId) {
        fetchSag(sagId);
        setActiveTab('overblik'); 
    }
  }, [sagId, fetchSag]);

  // 2. Håndter navigation (Næste/Forrige) fra Layoutet
  const handleNavigateToSag = async (targetId: number) => {
      try {
          setIsLoading(true); 
          const res = await fetch(`${API_BASE_URL}/sager/${targetId}/`);
          if (res.ok) {
              const nySag = await res.json();
              navigateTo('sagsdetaljer', nySag);
          }
      } catch (e) {
          console.error("Fejl ved sags-navigation:", e);
          setIsLoading(false);
      }
  };

  // 3. Gen-hent data hvis noget ændres i en fane (Callback)
  const handleUpdateSag = () => {
      if (sagId) fetchSag(sagId);
  };

  // 4. Håndter redigering af stamdata (Modal)
  const handleSaveStamdata = () => {
      setVisRedigerStamdata(false);
      handleUpdateSag();
  };

  // @# 5. Ny: Håndter status-ændring direkte fra Overblik
  // @# 5. Ny: Håndter status-ændring direkte fra Overblik (Optimistisk UI)
  const handleStatusChange = async (nyStatusId: string) => {
    if (!sag) return;
    
    const statusIdInt = parseInt(nyStatusId);

    // 1. Optimistisk opdatering: Find status-objektet og opdater UI straks
    const valgtStatus = statusser.find(s => s.id === statusIdInt);
    
    // Gem den gamle sag, hvis vi får brug for at rulle tilbage ved fejl
    const gammelSag = { ...sag };

    if (valgtStatus) {
        // Opdater UI med det samme, så det føles hurtigt
        setSag(prev => prev ? { ...prev, status: valgtStatus } : null);
    }

    try {
        // 2. Send til serveren i baggrunden
        const response = await fetch(`${API_BASE_URL}/sager/${sag.id}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_id: statusIdInt }),
        });

        if (!response.ok) throw new Error('Kunne ikke opdatere status.');
        
        // 3. Opdater med det rigtige svar fra serveren (uden at trigge isLoading)
        const opdateretSag = await response.json();
        setSag(opdateretSag);

    } catch (error) {
        console.error("Fejl ved opdatering af status:", error);
        // Ved fejl: Rul tilbage til den gamle status
        setSag(gammelSag);
        alert("Der skete en fejl. Status blev ikke opdateret.");
    }
  };

  // --- Render Logik ---

  if (isLoading) {
    return (
        <div className="h-screen flex flex-col justify-center items-center bg-gray-50">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-500 font-medium">Henter sagsoplysninger...</p>
        </div>
    );
  }
  
  if (error || !sag) {
    return (
        <div className="p-8 flex flex-col items-center justify-center text-red-600 h-full">
            <AlertCircle size={48} className="mb-4" />
            <h2 className="text-xl font-bold mb-2">Der opstod en fejl</h2>
            <p>{error || "Sagen blev ikke fundet."}</p>
            <button onClick={() => navigateTo('sagsoversigt', null)} className="mt-4 text-blue-600 underline">
                Gå til oversigt
            </button>
        </div>
    );
  }

  // Vælg indhold baseret på aktiv fane
  const renderContent = () => {
      switch (activeTab) {
          case 'overblik':
              return <OverblikTab 
                  sag={sag} 
                  statusser={statusser} // @# Send liste med
                  onNavigateToTab={setActiveTab} 
                  onEditStamdata={() => setVisRedigerStamdata(true)}
                  onStatusChange={handleStatusChange} // @# Send handler med
              />;
          case 'maegler':
              return <MaeglerTab sag={sag} onUpdate={handleUpdateSag} />;
          case 'bank':
              return <BankTab sag={sag} onUpdate={handleUpdateSag} />;
          case 'saelgere':
              return <SaelgereTab sag={sag} onUpdate={handleUpdateSag} />;
          case 'raadgivere':
              return <RaadgivereTab sag={sag} onUpdate={handleUpdateSag} />;
          case 'kommune':
              return <KommuneTab sag={sag} />;
          case 'forsyning':
              return <ForsyningTab sag={sag} onUpdate={handleUpdateSag} />;
          
          case 'koebere':
          case 'forening':
              return (
                  <div className="p-12 text-center bg-white rounded-lg border border-dashed border-gray-300">
                      <p className="text-xl text-gray-400 font-semibold mb-2">Under udvikling</p>
                      <p className="text-gray-500">Fanen "{activeTab}" er ikke implementeret endnu.</p>
                  </div>
              );
          default:
              return null;
      }
  };

  return (
    <>
        <SagsdetaljerLayout
            sag={sag}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onBack={() => navigateTo('sagsoversigt', null)}
            onNavigateToSag={handleNavigateToSag}
        >
            {renderContent()}
        </SagsdetaljerLayout>

        {visRedigerStamdata && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
                    <SagsForm 
                        onSave={handleSaveStamdata}
                        onCancel={() => setVisRedigerStamdata(false)}
                        sagTilRedigering={sag}
                    />
                </div>
            </div>
        )}
    </>
  );
}

export default SagsdetaljerPage;