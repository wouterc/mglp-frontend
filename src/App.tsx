// --- Fil: src/App.tsx ---
// @# 2025-09-15 18:05 - Opdateret til at vise den nye filter-sidebar på relevante sider.
// @# 2025-11-03 18:05 - Tilføjet manglende imports
// @# 2025-11-09 18:30 - Giver 'navigateTo' prop til SagsdetaljerPage.
// @# 2025-11-17 21:10 - Opdateret navigateTo og tilføjet StateContext import
// @# 2025-11-17 21:50 - Importeret react-router-dom og fjernet 'useState'
// @# 2025-11-17 22:40 - Endelig rettelse af import-sti og prop-typer
// @# 2025-11-23 20:00 - Tilføjet useEffect til at hente Current User ved start.
import React, { ReactNode, useContext, useEffect, useState } from 'react'; // @# Tilføj useEffect
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { api } from './api';

import Layout from './components/Layout';
import SkabelonerLayout from './components/SkabelonerLayout';
import ConfirmModal from './components/ui/ConfirmModal';
import SagsoversigtPage from './pages/SagsoversigtPage';
import SagsdetaljerPage from './pages/SagsdetaljerPage';
import AktiviteterPage from './pages/AktiviteterPage';
import AktiviteterFilter from './components/AktiviteterFilter';
import DokumenterPage from './pages/DokumenterPage';
import VirksomhederPage from './pages/VirksomhederPage';
import KontakterPage from './pages/KontakterPage';
import BlokInfoSkabelonerPage from './pages/BlokInfoSkabelonerPage';
import AktivitetsskabelonerPage from './pages/AktivitetsskabelonerPage';
import DokumentskabelonerPage from './pages/DokumentskabelonerPage';
import { VarelistePage } from './pages/VarelistePage';
import MinKontoPage from './pages/MinKontoPage';
import LoginPage from './pages/LoginPage';
import GlemtAdgangskodePage from './pages/GlemtAdgangskodePage';
import NulstilAdgangskodePage from './pages/NulstilAdgangskodePage';
import LandingPage from './pages/LandingPage';
import UserListPage from './pages/admin/UserListPage';
import MedarbejderePage from './pages/MedarbejderePage'; // @# Import
import StandardMapperPage from './pages/admin/StandardMapperPage';
import MailPage from './pages/MailPage';
import SagsMailPage from './pages/SagsMailPage';
import MailKurvPage from './pages/MailKurvPage';
import type { Sag } from './types';
import KommunikationPage from './pages/KommunikationPage';
import VidensbankPage from './pages/VidensbankPage';
import OpgaverPage from './pages/OpgaverPage';
import { useAppState, StateContext } from './StateContext';
import { useAuth } from './contexts/AuthContext';

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const { state, dispatch, initialVirksomhedFilters, initialKontaktFilters } = useAppState();
  const { logout } = useAuth();
  const { valgtSag, currentUser } = state;
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Auto-naviger til Kommunikation i PWA/Standalone mode ELLER på mobil hvis vi er på roden
  useEffect(() => {
    const isPwa = window.matchMedia('(display-mode: standalone)').matches;
    const isMobile = window.innerWidth <= 768;
    if ((isPwa || isMobile) && currentUser && (location.pathname === '/' || location.pathname === '/sagsoversigt')) {
      navigate('/kommunikation');
    }
  }, [currentUser, location.pathname, navigate]);


  const handleLogout = async () => {
    setShowLogoutConfirm(true);
  };

  const performLogout = async () => {
    await logout(); // Kald den centrale logout
  };

  const navigateTo = (side: string, context: any) => {
    if (side === 'log_ud') {
      handleLogout();
      return;
    }

    // Håndter specifik navigationslogik (f.eks. sæt filtre)
    if (['sagsdetaljer', 'aktiviteter', 'dokumenter'].includes(side) && context && (context as Sag).sags_nr) {
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

    const path = side.startsWith('/') ? side : `/${side}`;
    navigate(path);
  };

  let filterSidebarComponent: ReactNode = null;
  // if (location.pathname === '/aktiviteter') {
  //   filterSidebarComponent = <AktiviteterFilter />;
  // }

  const aktivSideForLayout = location.pathname.substring(1) || 'sagsoversigt';

  // @# Auth & Init Guard - Vent på både auth og grunddata for at fjerne flimmer
  if (state.isAuthChecking || state.lookupsIsLoading) {
    return <div className="flex items-center justify-center h-screen bg-gray-100 text-gray-500">Indlæser system...</div>;
  }

  const isPublic =
    location.pathname === '/login' ||
    location.pathname === '/glemt-adgangskode' ||
    location.pathname.startsWith('/reset-password/');

  if (!currentUser && !isPublic) {
    return <LandingPage />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/glemt-adgangskode" element={<GlemtAdgangskodePage />} />
      <Route path="/reset-password/:uid/:token" element={<NulstilAdgangskodePage />} />

      <Route path="/chat-popup" element={<div className="h-full bg-gray-100 overflow-hidden"><KommunikationPage /></div>} />
      <Route path="/vidensbank-popup" element={<div className="h-full bg-gray-100 overflow-hidden"><VidensbankPage standalone /></div>} />
      <Route path="*" element={
        <Layout
          aktivSide={aktivSideForLayout}
          setAktivSide={(side: string) => navigateTo(side, null)}
          filterSidebar={filterSidebarComponent}
        >
          <Routes key={location.pathname}>
            <Route path="/" element={<SagsoversigtPage navigateTo={navigateTo} />} />
            <Route path="/sagsoversigt" element={<SagsoversigtPage navigateTo={navigateTo} />} />
            <Route path="/aktiviteter" element={<AktiviteterPage sagId={valgtSag?.id ?? null} />} />
            <Route path="/sagsdetaljer" element={<SagsdetaljerPage sagId={valgtSag?.id ?? null} navigateTo={navigateTo} />} />
            <Route path="/dokumenter" element={<DokumenterPage sagId={valgtSag?.id ?? null} />} />
            <Route path="/sags_mail" element={<SagsMailPage sagId={valgtSag?.id ?? null} />} />
            <Route path="/mail_kurv" element={<MailKurvPage />} />
            <Route path="/virksomheder" element={<VirksomhederPage navigateTo={navigateTo} />} />
            <Route path="/kontakter" element={<KontakterPage navigateTo={navigateTo} />} />
            <Route path="/skabeloner" element={<SkabelonerLayout />}>
              <Route index element={<Navigate to="blokinfo" replace />} />
              <Route path="blokinfo" element={<BlokInfoSkabelonerPage />} />
              <Route path="aktiviteter" element={<AktivitetsskabelonerPage />} />
              <Route path="dokumenter" element={<DokumentskabelonerPage />} />
              <Route path="vareliste" element={<VarelistePage />} />
            </Route>
            {/* Redirects for legacy routes */}
            <Route path="/blokinfo_skabeloner" element={<Navigate to="/skabeloner/blokinfo" replace />} />
            <Route path="/aktivitetsskabeloner" element={<Navigate to="/skabeloner/aktiviteter" replace />} />
            <Route path="/dokumentskabeloner" element={<Navigate to="/skabeloner/dokumenter" replace />} />

            <Route path="/medarbejdere" element={<MedarbejderePage />} />
            <Route path="/min_konto" element={<MinKontoPage />} />
            {/* Login-relaterede sider er allerede håndteret ovenfor */}

            {/* Admin Routes */}
            <Route path="/admin/users" element={<UserListPage />} />
            <Route path="/admin/standardmapper" element={<StandardMapperPage />} />

            <Route path="/mail" element={<MailPage />} />
            <Route path="/kommunikation" element={<KommunikationPage />} />
            <Route path="/vidensbank" element={<VidensbankPage />} />
            <Route path="/vidensbank" element={<VidensbankPage />} />
            <Route path="/opgaver" element={<OpgaverPage />} />
            <Route path="*" element={<SagsoversigtPage navigateTo={navigateTo} />} />
          </Routes>
          <ConfirmModal
            isOpen={showLogoutConfirm}
            onClose={() => setShowLogoutConfirm(false)}
            onConfirm={performLogout}
            title="Log ud"
            message="Er du sikker på, at du vil logge ud?"
            confirmText="Log ud"
            cancelText="Annuller"
            isDestructive={true}
          />
        </Layout>
      } />
    </Routes>
  );
}

export default App;