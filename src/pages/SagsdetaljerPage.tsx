// --- Fil: src/pages/SagsdetaljerPage.tsx ---
// @# 2025-11-22 18:30 - Fuld omstrukturering: Implementeret Dashboard-layout med Lazy Loading tabs.
// @# 2025-11-23 10:00 - Rettet modal-styling (hvid baggrund) og flyttet rediger-knap til OverblikTab.
// @# 2025-11-23 14:00 - Tilføjet status-logik (hentning + opdatering) til OverblikTab.
import React, { useState, useEffect, useCallback, ReactElement } from 'react';
import { useLocation } from 'react-router-dom';
import { Sag } from '../types';
import { SagService } from '../services/SagService';
import { Loader2, AlertCircle } from 'lucide-react';
import { useSager } from '../contexts/SagContext';
import { useLookups } from '../contexts/LookupContext';

// Layout og Tabs
import SagsdetaljerLayout, { TabType } from '../components/sagsdetaljer/SagsdetaljerLayout';
import OverblikTab from '../components/sagsdetaljer/tabs/OverblikTab';
import MaeglerTab from '../components/sagsdetaljer/tabs/MaeglerTab';
import BankTab from '../components/sagsdetaljer/tabs/BankTab';
import SaelgereTab from '../components/sagsdetaljer/tabs/SaelgereTab';
import RaadgivereTab from '../components/sagsdetaljer/tabs/RaadgivereTab';
import KommuneTab from '../components/sagsdetaljer/tabs/KommuneTab';
import ForsyningTab from '../components/sagsdetaljer/tabs/ForsyningTab';
import ProcesserTab from '../components/sagsdetaljer/tabs/ProcesserTab';
import FakturaTab from '../components/sagsdetaljer/tabs/FakturaTab';

// Komponenter til redigering
import SagsForm from '../components/SagsForm';
import Modal from '../components/Modal';

interface SagsdetaljerPageProps {
    sagId: number | null;
    navigateTo: (side: string, sag: Sag | null) => void;
}


function SagsdetaljerPage({ sagId, navigateTo }: SagsdetaljerPageProps): ReactElement {
    const { state: sagState, dispatch: sagDispatch } = useSager();
    const { state: lookupState } = useLookups();
    const { sagsStatusser: statusser } = lookupState;
    const location = useLocation();

    const [sag, setSag] = useState<Sag | null>(sagState.valgtSag && sagState.valgtSag.id === sagId ? sagState.valgtSag : null);
    const [isLoading, setIsLoading] = useState(!sag && !!sagId);
    const [error, setError] = useState<string | null>(null);

    // UI State
    const [activeTab, setActiveTab] = useState<TabType>('overblik');
    const [visRedigerStamdata, setVisRedigerStamdata] = useState(false);
    // Lazy mount: Track hvilke tabs der er blevet aktiveret
    // En tab mountes første gang den besøges og forbliver monteret derefter
    const [mountedTabs, setMountedTabs] = useState<Set<TabType>>(new Set(['overblik']));

    // 1. Hent kun sagens stamdata (Letvægts fetch)
    const fetchSag = useCallback(async (id: number, silent = false) => {
        const hasLoadedMatch = sagState.valgtSag && sagState.valgtSag.id === id;

        if (!silent && !hasLoadedMatch) {
            setIsLoading(true);
        }

        setError(null);
        try {
            const data = await SagService.getSag(id);
            setSag(data);
            sagDispatch({ type: 'SET_VALGT_SAG', payload: data });
        } catch (e: any) {
            if (!hasLoadedMatch) {
                setError(e.message);
                setSag(null);
            }
            console.error("Fejl ved hentning af sag:", e);
        } finally {
            setIsLoading(false);
        }
    }, [sagDispatch, sagState.valgtSag]);

    // 1b. Sørg for at statusser er indlæst (Lookups håndteres nu i StateContext)
    // Men vi behøver stadig sags-statusser (formaal=1) som måske ikke er dem i global state?
    // StateContext henter formaal=2 (aktiviteter). 
    // Lad os tjekke om vi skal tilføje flere statusser til global state.

    // Initial load: Hent data når sagId ændres
    useEffect(() => {
        if (sagId) {
            fetchSag(sagId);
        }
    }, [sagId]); // Kun kør når sagId ændres

    // Tab-initialisering: Sæt start-fane når sagId ændres eller ved navigation
    useEffect(() => {
        if (sagId) {
            const navState = location.state as { initialTab?: TabType } | null;
            const startTab = navState?.initialTab || 'overblik';
            setActiveTab(startTab);
            // Reset mountede tabs når vi skifter til en ny sag
            setMountedTabs(new Set([startTab]));
        }
    }, [sagId, location.state]); // Kør når vi skifter sag eller hopper ind med en specifik fane

    // Registrér tab som monteret når den aktiveres
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setMountedTabs(prev => new Set([...prev, tab]));
    };

    // 2. Håndter navigation (Næste/Forrige/Søgning) fra Layoutet
    const handleNavigateToSag = async (targetId: number) => {
        // Opdater route via parent
        navigateTo('sagsdetaljer', null); // "Reset" view (valgfrit) eller direkte kald:
        // Men SagsdetaljerPage modtager sagId via props (fra App.tsx router state eller URL params).
        // navigateTo('sagsdetaljer', { id: targetId }); <-- Dette afhænger af hvordan App.tsx håndterer routing.

        // Da vi er i en SPA uden "rigtig" routing parameter i URL'en (baseret på App.tsx logik),
        // skal vi bede parent om at skifte sagId.
        // HVIS 'navigateTo' funktionen i App.tsx tager et sags-objekt og udleder ID'et:
        // Vi behøver ikke hente sagen først, hvis parent gør det.
        // MEN hvis parent forventer et objekt, så lad os hente den (som vi gør).

        // Problemet kan være at setIsLoading(true) låser visningen, men navigateTo ikke mounter komponenten på ny,
        // hvis det bare er en prop-opdatering.

        if (targetId === sagId) return; // Allerede på sagen

        setIsLoading(true);
        try {
            // Hent den nye sag
            const nySag = await SagService.getSag(targetId);
            // Naviger via parent, send hele objektet med
            navigateTo('sagsdetaljer', nySag);
            // Hvis komponenten ikke unmounter, skal vi manuelt opdatere state:
            setSag(nySag);
            setActiveTab('overblik'); // Reset tab eller bevar? Ofte vil man starte forfra på ny sag.
        } catch (e) {
            console.error("Fejl ved sags-navigation:", e);
        } finally {
            setIsLoading(false);
        }
    };

    // 3. Gen-hent data hvis noget ændres i en fane (Callback)
    const handleUpdateSag = (silent = true) => {
        if (sagId) fetchSag(sagId, silent);
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
            const opdateretSag = await SagService.updateSag(sag.id, { status_id: statusIdInt });
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


    return (
        <>
            <SagsdetaljerLayout
                sag={sag}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onBack={() => navigateTo('sagsoversigt', null)}
                onNavigateToSag={handleNavigateToSag}
            >
                {/* Lazy mount: En tab renderes første gang den aktiveres og forbliver monteret.
                    display:none skjuler inaktive tabs uden at unmounte dem. */}
                <div style={{ display: activeTab === 'overblik' ? undefined : 'none' }}>
                    <OverblikTab
                        sag={sag}
                        statusser={statusser}
                        onNavigateToTab={handleTabChange}
                        onEditStamdata={() => setVisRedigerStamdata(true)}
                        onStatusChange={handleStatusChange}
                        onUpdate={handleUpdateSag}
                    />
                </div>
                {mountedTabs.has('processer') && (
                    <div style={{ display: activeTab === 'processer' ? undefined : 'none' }}>
                        <ProcesserTab sag={sag} onUpdate={handleUpdateSag} />
                    </div>
                )}
                {mountedTabs.has('faktura') && (
                    <div style={{ display: activeTab === 'faktura' ? undefined : 'none' }}>
                        <FakturaTab sag={sag} onUpdate={handleUpdateSag} />
                    </div>
                )}
                {mountedTabs.has('maegler') && (
                    <div style={{ display: activeTab === 'maegler' ? undefined : 'none' }}>
                        <MaeglerTab sag={sag} onUpdate={handleUpdateSag} />
                    </div>
                )}
                {mountedTabs.has('bank') && (
                    <div style={{ display: activeTab === 'bank' ? undefined : 'none' }}>
                        <BankTab sag={sag} onUpdate={handleUpdateSag} />
                    </div>
                )}
                {mountedTabs.has('saelgere') && (
                    <div style={{ display: activeTab === 'saelgere' ? undefined : 'none' }}>
                        <SaelgereTab sag={sag} onUpdate={handleUpdateSag} />
                    </div>
                )}
                {mountedTabs.has('raadgivere') && (
                    <div style={{ display: activeTab === 'raadgivere' ? undefined : 'none' }}>
                        <RaadgivereTab sag={sag} onUpdate={handleUpdateSag} />
                    </div>
                )}
                {mountedTabs.has('kommune') && (
                    <div style={{ display: activeTab === 'kommune' ? undefined : 'none' }}>
                        <KommuneTab sag={sag} />
                    </div>
                )}
                {mountedTabs.has('forsyning') && (
                    <div style={{ display: activeTab === 'forsyning' ? undefined : 'none' }}>
                        <ForsyningTab sag={sag} onUpdate={handleUpdateSag} />
                    </div>
                )}
                {(activeTab === 'koebere' || activeTab === 'forening') && (
                    <div className="p-12 text-center bg-white rounded-lg border border-dashed border-gray-300">
                        <p className="text-xl text-gray-400 font-semibold mb-2">Under udvikling</p>
                        <p className="text-gray-500">Fanen "{activeTab}" er ikke implementeret endnu.</p>
                    </div>
                )}
            </SagsdetaljerLayout>

            <Modal
                isOpen={visRedigerStamdata}
                onClose={() => setVisRedigerStamdata(false)}
                title={`Rediger Sag: ${sag.sags_nr}`}
                wide
            >
                <SagsForm
                    onSave={handleSaveStamdata}
                    onCancel={() => setVisRedigerStamdata(false)}
                    sagTilRedigering={sag}
                />
            </Modal>
        </>
    );
}

export default SagsdetaljerPage;