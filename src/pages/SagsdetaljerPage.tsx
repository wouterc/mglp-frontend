// --- Fil: src/pages/SagsdetaljerPage.tsx ---
import React, { ReactElement } from 'react';

interface SagsdetaljerPageProps {
  sagId: number | null;
}

function SagsdetaljerPage({ sagId }: SagsdetaljerPageProps): ReactElement {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Sagsdetaljer</h1>
      {sagId ? (
        <p>Viser detaljer for Sag ID: {sagId}.</p>
      ) : (
        <p>Ingen sag valgt. Vælg en sag fra sagsoversigten.</p>
      )}
      <p className="mt-4 italic">Denne side er under opbygning.</p>
    </div>
  );
}

export default SagsdetaljerPage;