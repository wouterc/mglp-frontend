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

  const renderSide = () => {
    switch (aktivSide) {
      case 'sagsoversigt': return <SagsoversigtPage />;
      case 'sagsdetaljer': return <SagsdetaljerPage />;
      case 'aktiviteter': return <AktiviteterPage />;
      case 'dokumenter': return <DokumenterPage />;
      case 'virksomheder': return <VirksomhederPage />;
      case 'kontakter': return <KontakterPage />;
      case 'blokinfo_skabeloner': return <BlokInfoSkabelonerPage />;
      case 'aktivitetsskabeloner': return <AktivitetsskabelonerPage />;
      case 'dokumentskabeloner': return <DokumentskabelonerPage />;
      case 'min_konto': return <MinKontoPage />;
      default: return <SagsoversigtPage />;
    }
  };

  return (
    <Layout aktivSide={aktivSide} setAktivSide={setAktivSide}>
      {renderSide()}
    </Layout>
  );
}

export default App;
