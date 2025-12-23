// --- Fil: src/pages/DokumenterPage.tsx ---
import React, { ReactElement, useEffect, useState } from 'react';
import { useAppState } from '../StateContext';
import { api } from '../api';
import { Sag } from '../types';
import DokumenterTab from '../components/sagsdetaljer/tabs/DokumenterTab';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DokumenterPageProps {
  sagId: number | null;
}

function DokumenterPage({ sagId }: DokumenterPageProps): ReactElement {
  const { state, dispatch } = useAppState();
  const { valgtSag } = state;
  const navigate = useNavigate();

  const [localSag, setLocalSag] = useState<Sag | null>(valgtSag);
  const [loading, setLoading] = useState(!valgtSag && !!sagId);

  useEffect(() => {
    // Hvis valgtSag matcher sagId, brug den.
    if (valgtSag && valgtSag.id === sagId) {
      setLocalSag(valgtSag);
      setLoading(false);
    } else if (sagId) {
      // Hent sag hvis den mangler
      setLoading(true);
      api.get<Sag>(`/sager/${sagId}/`).then(data => {
        setLocalSag(data);
        dispatch({ type: 'SET_VALGT_SAG', payload: data });
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [sagId, valgtSag, dispatch]);

  if (!sagId) {
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