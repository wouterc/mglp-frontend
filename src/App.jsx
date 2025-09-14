// @ 2025-09-13 19:55 - Tilføjet state management for at navigere til sider med et specifikt sags-ID.
// src/App.jsx
import React, { useState } from 'react';
import Layout from './components/Layout';

// Importer alle dine sider
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

function App() {
  const [aktivSide, setAktivSide] = useState('sagsoversigt');
  // Ny state til at holde ID'et på den valgte sag
  const [aktivSagId, setAktivSagId] = useState(null);

  // Ny funktion, der kan håndtere navigation med og uden et sags-ID
  const navigateTo = (side, sagId = null) => {
    setAktivSide(side);
    setAktivSagId(sagId);
  };

  const renderSide = () => {
    switch (aktivSide) {
      case 'sagsoversigt': 
        // Vi giver navigateTo-funktionen videre til SagsoversigtPage
        return <SagsoversigtPage navigateTo={navigateTo} />;
      case 'sagsdetaljer': 
        return <SagsdetaljerPage sagId={aktivSagId} />;
      case 'aktiviteter': 
        // Vi giver det gemte sags-ID videre til AktiviteterPage
        return <AktiviteterPage sagId={aktivSagId} />;
      case 'dokumenter': 
        return <DokumenterPage sagId={aktivSagId} />;
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
    // Vi bruger nu den nye navigateTo-funktion i Layout for at kunne navigere tilbage til oversigten
    <Layout aktivSide={aktivSide} setAktivSide={navigateTo}>
      {renderSide()}
    </Layout>
  );
}

export default App;

