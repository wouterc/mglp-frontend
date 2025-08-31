// src/components/Sagsoversigt.jsx
import React, { useState, useEffect } from 'react';

function Sagsoversigt() {
  // 'sager' er en state-variabel, der vil holde vores liste af sager.
  // 'setSager' er den funktion, vi bruger til at opdatere den.
  const [sager, setSager] = useState([]);

  // useEffect kører, når komponenten bliver vist første gang.
  // Perfekt til at hente data fra et API.
  useEffect(() => {
    async function hentSager() {
      try {
        // Vores Django backend kører på port 8000
        const response = await fetch('http://127.0.0.1:8000/api/sager/');
        //const response = await fetch('[http://127.0.0.1:8000/api/sager/](http://127.0.0.1:8000/api/sager/)');
        const data = await response.json();
        setSager(data); // Opdater vores state med data fra API'et
      } catch (error) {
        console.error("Fejl ved hentning af sager:", error);
      }
    }

    hentSager();
  }, []); // Den tomme array [] betyder "kør kun denne effekt én gang"

  return (
    <div>
      <h2>Liste over sager</h2>
      <ul>
        {/* Vi mapper over 'sager'-arrayet og viser et listepunkt for hver sag */}
        {sager.map(sag => (
          <li key={sag.id}>
            <strong>{sag.titel}</strong> - Status: {sag.status} (Ansvarlig: {sag.ansvarlig})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Sagsoversigt;
