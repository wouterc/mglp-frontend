// --- Fil: src/App.tsx ---
// @# 2025-09-15 18:05 - Opdateret til at vise den nye filter-sidebar på relevante sider.
// @# 2025-11-03 18:05 - Tilføjet manglende imports
// @# 2025-11-09 18:30 - Giver 'navigateTo' prop til SagsdetaljerPage.
import React, { useState, ReactNode } from 'react';
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
import { useAppState } from './StateContext';

function App() {
  const [aktivSide, setAktivSide] = useState('sagsoversigt');
  const { state, dispatch } = useAppState();
  const { valgtSag } = state;
  const navigateTo = (side: string, sag: Sag | null) => {
    setAktivSide(side);
    if (sag) {
      dispatch({ type: 'SET_VALGT_SAG', payload: sag });
    }
  };
  let pageComponent: ReactNode = null;
  let filterSidebarComponent: ReactNode = null;
  switch (aktivSide) {
    case 'sagsoversigt':
      pageComponent = <SagsoversigtPage navigateTo={navigateTo} />;
      // filterSidebarComponent = <SagsoversigtFilter />; // Klar til fremtidig brug
      break;
    case 'aktiviteter':
      pageComponent = <AktiviteterPage sagId={valgtSag?.id ?? null} />;
      filterSidebarComponent = <AktiviteterFilter />;
      break;
    case 'sagsdetaljer':
        // @# 2025-11-09 18:30 - Tilføjet navigateTo prop
        pageComponent = <SagsdetaljerPage sagId={valgtSag?.id ?? null} navigateTo={navigateTo} />;
        break;
    case 'dokumenter':
        pageComponent = <DokumenterPage sagId={valgtSag?.id ?? null} />;
        break;
    // @# 2025-11-03 18:05 - Tilføjet alle manglende sidetilfælde til switch-statement
    case 'virksomheder':
        pageComponent = <VirksomhederPage />;
        break;
    case 'kontakter':
        pageComponent = <KontakterPage />;
        break;
    case 'blokinfo_skabeloner':
        pageComponent = <BlokInfoSkabelonerPage />;
        break;
    case 'aktivitetsskabeloner':
        pageComponent = <AktivitetsskabelonerPage />;
        break;
    case 'dokumentskabeloner':
        pageComponent = <DokumentskabelonerPage />;
        break;
    case 'min_konto':
        pageComponent = <MinKontoPage />;
        break;
    default:
      pageComponent = <SagsoversigtPage navigateTo={navigateTo} />;
  }
  // Sørg for at alle dine sider er dækket i switch-statementet.
  return (
    <Layout aktivSide={aktivSide} setAktivSide={setAktivSide} filterSidebar={filterSidebarComponent}>
      {pageComponent}
    </Layout>
  );
}

export default App;