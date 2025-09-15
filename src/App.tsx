// --- Fil: src/App.tsx ---
// @# 2025-09-14 23:05 - Refaktoreret til at bruge global context for valgtSag
import React, { useState } from 'react';
import Layout from './components/Layout';
import SagsoversigtPage from './pages/SagsoversigtPage';
import SagsdetaljerPage from './pages/SagsdetaljerPage';
import AktiviteterPage from './pages/AktiviteterPage';
import DokumenterPage from './pages/DokumenterPage';
import VirksomhederPage from './pages/VirksomhederPage';
import KontakterPage from './pages/KontakterPage';
import BlokInfoSkabelonerPage from './pages/BlokInfoSkabelonerPage';
import AktivitetsskabelonerPage from './pages/AktivitetsskabelonerPage';
import DokumentskabelonerPage from './pages/DokumentskabelonerPage';
import MinKontoPage from './pages/MinKontoPage';
import type { Sag } from './types';
// @# 2025-09-14 23:05 - Importeret useAppState hook
import { useAppState } from './StateContext';

function App() {
  const [aktivSide, setAktivSide] = useState('sagsoversigt');
// @# 2025-09-14 23:05 - Bruger valgtSag og dispatch fra global context
  const { state, dispatch } = useAppState();
  const { valgtSag } = state;

  const navigateTo = (side: string, sag: Sag | null) => {
    setAktivSide(side);
    if (sag) {
// @# 2025-09-14 23:05 - Opdaterer valgtSag i global context
      dispatch({ type: 'SET_VALGT_SAG', payload: sag });
    }
  };

  const renderSide = () => {
    switch (aktivSide) {
      case 'sagsoversigt':
        return <SagsoversigtPage navigateTo={navigateTo} />;
      case 'sagsdetaljer':
        return <SagsdetaljerPage sagId={valgtSag?.id ?? null} />;
      case 'aktiviteter':
        return <AktiviteterPage sagId={valgtSag?.id ?? null} />;
      case 'dokumenter':
        return <DokumenterPage sagId={valgtSag?.id ?? null} />;
      case 'virksomheder':
        return <VirksomhederPage />;
      case 'kontakter':
        return <KontakterPage />;
      case 'blokinfo_skabeloner':
        return <BlokInfoSkabelonerPage />;
      case 'aktivitetsskabeloner':
        return <AktivitetsskabelonerPage />;
      case 'dokumentskabeloner':
        return <DokumentskabelonerPage />;
      case 'min_konto':
        return <MinKontoPage />;
      default:
        return <SagsoversigtPage navigateTo={navigateTo} />;
    }
  };

  return (
    <Layout aktivSide={aktivSide} setAktivSide={setAktivSide}>
      {renderSide()}
    </Layout>
  );
}

export default App;