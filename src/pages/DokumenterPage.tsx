// --- Fil: src/pages/DokumenterPage.tsx ---
import React, { ReactElement, useEffect, useState, useRef } from 'react';
import { useAppState } from '../StateContext';
import { api } from '../api';
import { Sag } from '../types';
import DokumenterTab from '../components/sagsdetaljer/tabs/DokumenterTab';
import { Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface DokumenterPageProps {
  sagId: number | null;
}

function DokumenterPage({ sagId }: DokumenterPageProps): ReactElement {
  const { state, dispatch } = useAppState();
  const { valgtSag } = state;
  const navigate = useNavigate();
  const location = useLocation(); // @# Added hook

  // @# Resolve effective sagId (prop > URL)
  const queryParams = new URLSearchParams(location.search);
  const urlSagId = queryParams.get('sag_id');
  const effectiveSagId = sagId || (urlSagId ? parseInt(urlSagId, 10) : null);

  const [localSag, setLocalSag] = useState<Sag | null>(valgtSag);
  const [loading, setLoading] = useState(!valgtSag && !!effectiveSagId);

  const hasToggledRef = useRef(false);

  // Luk filter-menuen som standard når siden åbnes
  useEffect(() => {
    if (hasToggledRef.current) return;

    if (state.erFilterMenuAaben) {
      dispatch({ type: 'TOGGLE_FILTER_MENU' });
      hasToggledRef.current = true;
    }
    // Vi vil kun køre dette ved mount, så vi ignorerer dependency-warning
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    if (!effectiveSagId) return;

    // 1. Hvis valgtSag matcher sagId, brug den og stop fetch
    if (valgtSag && valgtSag.id === effectiveSagId) {
      setLocalSag(valgtSag);
      setLoading(false);
      return;
    }

    // 2. Fetch hvis vi mangler sagen eller id ikke matcher
    setLoading(true);
    api.get<Sag>(`/sager/${effectiveSagId}/`).then(data => {
      setLocalSag(data);
      dispatch({ type: 'SET_VALGT_SAG', payload: data });
      setLoading(false);
    }).catch(err => {
      console.error("Fejl ved hentning af sag i DokumenterPage:", err);
      setLoading(false);
    });

  }, [effectiveSagId, valgtSag, dispatch]);

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

  return (
    <div className="p-6 max-w-7xl mx-auto">


      {/* Genbrug tabs-komponenten */}
      <DokumenterTab sag={localSag} />
    </div >
  );
}

export default DokumenterPage;