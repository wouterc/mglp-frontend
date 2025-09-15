// --- Fil: src/pages/DokumenterPage.tsx ---
import React, { ReactElement } from 'react';

interface DokumenterPageProps {
  sagId: number | null;
}

function DokumenterPage({ sagId }: DokumenterPageProps): ReactElement {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Dokumenter</h1>
      {sagId ? (
        <p>Viser dokumenter for Sag ID: {sagId}.</p>
      ) : (
        <p>Ingen sag valgt. Vælg en sag fra sagsoversigten.</p>
      )}
      <p className="mt-4 italic">Denne side er under opbygning.</p>
    </div>
  );
}

export default DokumenterPage;