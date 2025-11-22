// --- Fil: src/App.tsx ---
// @# 2025-09-15 18:05 - Opdateret til at vise den nye filter-sidebar på relevante sider.
// @# 2025-11-03 18:05 - Tilføjet manglende imports
// @# 2025-11-09 18:30 - Giver 'navigateTo' prop til SagsdetaljerPage.
// @# <2025-11-17 21:10> - Opdateret navigateTo og tilføjet StateContext import
// @# 2025-11-17 21:50 - Importeret react-router-dom og fjernet 'useState'
// @# 2025-11-17 22:40 - Endelig rettelse af import-sti og prop-typer
import React, { ReactNode, useContext } from 'react';
// @# 2025-11-17 21:50 - Importeret Routes, Route, useNavigate og useLocation
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
// @# 2025-11-17 22:40 - Rettet sti til 'components/Layout' (uden 'ui/')
import Layout from './components/Layout';
import SagsoversigtPage from './pages/SagsoversigtPage';
import SagsdetaljerPage from './pages/SagsdetaljerPage';
import AktiviteterPage from './pages/AktiviteterPage';
import AktiviteterFilter from './components/AktiviteterFilter';
// Importer filter-komponenten
import DokumenterPage from './pages/DokumenterPage';
import VirksomhederPage from './pages/VirksomhederPage';
import KontakterPage from './pages/KontakterPage';
import BlokInfoSkabelonerPage from './pages/BlokInfoSkabelonerPage';
import AktivitetsskabelonerPage from './pages/AktivitetsskabelonerPage';
import DokumentskabelonerPage from './pages/DokumentskabelonerPage';
import MinKontoPage from './pages/MinKontoPage';
import type { Sag } from './types';
import { useAppState, StateContext } from './StateContext';

function App() {
  // @# 2025-11-17 21:50 - Fjernet 'aktivSide' state, tilføjet router-hooks
  const navigate = useNavigate();
  const location = useLocation();
  
  const { state, dispatch } = useAppState();
  // @# <2025-11-17 21:10> - Hentet filter-init states fra context
  const { initialVirksomhedFilters, initialKontaktFilters } = useContext(StateContext);
  const { valgtSag } = state;

  // @# 2025-11-17 21:50 - Opdateret navigateTo til at bruge routerens 'navigate'
  // @# 2025-11-17 22:40 - Sikret typer på parametre
  const navigateTo = (side: string, context: any) => {
    
    // Håndter specifik navigationslogik (f.eks. sæt filtre)
    if (side === 'sagsdetaljer' && context && (context as Sag).sags_nr) {
      dispatch({ type: 'SET_VALGT_SAG', payload: context as Sag });
    }
    else if (side === 'sagsoversigt' && context?.filter) {
        // Fremtidig brug: Sæt sagsfiltre her
    }
    else if (side === 'kontakter' && context?.filter) {
        // Nulstil først, og sæt derefter det specifikke filter
        dispatch({ 
            type: 'SET_KONTAKTER_STATE', 
            payload: { kontakterFilters: { ...initialKontaktFilters, ...context.filter } }
         });
    }
    else if (side === 'virksomheder' && context?.filter) {
        // Nulstil først, og sæt derefter det specifikke filter
        dispatch({ 
            type: 'SET_VIRKSOMHEDER_STATE', 
            payload: { virksomhederFilters: { ...initialVirksomhedFilters, ...context.filter } }
        });
    }
    
    // @# 2025-11-17 21:50 - Erstatter setAktivSide(side) med navigate
    const path = side.startsWith('/') ? side : `/${side}`;
    navigate(path);
  };

  // @# 2025-11-17 21:50 - Bestemmer filter-sidebar baseret på den aktuelle URL
  let filterSidebarComponent: ReactNode = null;
  if (location.pathname === '/aktiviteter') {
    filterSidebarComponent = <AktiviteterFilter />;
  }
  
  // @# 2025-11-17 21:50 - Finder den aktive side ud fra URL, til brug i Layout (highlight)
  const aktivSideForLayout = location.pathname.substring(1) || 'sagsoversigt';

  return (
    // @# 2025-11-17 21:50 - Opdateret Layout til at bruge den URL-baserede 'aktivSide'
    // @# 2025-11-17 22:40 - 'setAktivSide' er nu en wrapper, der kalder navigateTo med null-kontekst
    <Layout 
      aktivSide={aktivSideForLayout} 
      setAktivSide={(side: string) => navigateTo(side, null)} 
      filterSidebar={filterSidebarComponent}
    >
      
      {/* @# 2025-11-17 21:50 - Udskiftet det gamle 'switch'-statement med 'Routes' */}
      <Routes>
        <Route path="/" element={<SagsoversigtPage navigateTo={navigateTo} />} />
        
        <Route path="/sagsoversigt" element={<SagsoversigtPage navigateTo={navigateTo} />} />
        <Route path="/aktiviteter" element={<AktiviteterPage sagId={valgtSag?.id ?? null} />} />
        <Route path="/sagsdetaljer" element={<SagsdetaljerPage sagId={valgtSag?.id ?? null} navigateTo={navigateTo} />} />
        <Route path="/dokumenter" element={<DokumenterPage sagId={valgtSag?.id ?? null} />} />
        <Route path="/virksomheder" element={<VirksomhederPage navigateTo={navigateTo} />} />
        <Route path="/kontakter" element={<KontakterPage navigateTo={navigateTo} />} />
        <Route path="/blokinfo_skabeloner" element={<BlokInfoSkabelonerPage />} />
        <Route path="/aktivitetsskabeloner" element={<AktivitetsskabelonerPage />} />
        <Route path="/dokumentskabeloner" element={<DokumentskabelonerPage />} />
        <Route path="/min_konto" element={<MinKontoPage />} />
        
        {/* Fallback rute */}
        <Route path="*" element={<SagsoversigtPage navigateTo={navigateTo} />} />
      </Routes>
    </Layout>
  );
}

export default App;