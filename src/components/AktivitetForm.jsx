// --- Fil: src/components/AktivitetForm.jsx ---
// @ 2025-09-13 12:49 - Implementeret "cascading dropdown" for Proces -> Gruppe.
// @ 2025-09-13 12:43 - Flyttet 'Aktiv'/'Udgået' checkboxes og omdøbt 'Aktiv'.
// @ 2025-09-12 22:25 - Opdateret til at håndtere 'proces' som en relation
// @ 2025-09-11 21:05 - Rettet 400-fejl ved gem og tilføjet 'Esc' for at annullere.
// @ 2025-09-11 21:15 - Sikret at tomme talfelter sendes som 'null' i stedet for tom streng.
// @ 2025-09-11 21:42 - Ændret form-layout og flyttet Gem/Annuller knapper til toppen med ikoner.
import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../config';
import { Save, X } from 'lucide-react'; // Ikoner til knapper

function AktivitetForm({ onSave, onCancel, aktivitetTilRedigering, blokinfoList }) {
  const [formData, setFormData] = useState({
    proces: '',
    gruppe: '',
    aktivitet_nr: '',
    aktivitet: '',
    aktiv: true,
    udgaaet: false,
    note: '',
    ansvarlig: '',
    frist: '',
  });

// @ 2025-09-13 12:49 - Tilføjet state for at håndtere de afhængige grupper.
  const [tilgaengeligeGrupper, setTilgaengeligeGrupper] = useState([]);
  const [isGrupperLoading, setIsGrupperLoading] = useState(false);
  const erRedigering = aktivitetTilRedigering != null;

  const procesList = useMemo(() => blokinfoList.filter(b => b.formaal === 1), [blokinfoList]);
  
  // Fyld formularen ved redigering
  useEffect(() => {
    if (erRedigering) {
      setFormData({
        proces: aktivitetTilRedigering.proces?.id || '',
        gruppe: aktivitetTilRedigering.gruppe?.id || '',
        aktivitet_nr: aktivitetTilRedigering.aktivitet_nr || '',
        aktivitet: aktivitetTilRedigering.aktivitet || '',
        aktiv: aktivitetTilRedigering.aktiv === null ? true : aktivitetTilRedigering.aktiv,
        udgaaet: aktivitetTilRedigering.udgaaet || false,
        note: aktivitetTilRedigering.note || '',
        ansvarlig: aktivitetTilRedigering.ansvarlig || '',
        frist: aktivitetTilRedigering.frist || '',
      });
    }
  }, [aktivitetTilRedigering]);

// @ 2025-09-13 12:49 - Ny useEffect til at hente grupper, når en proces vælges.
  useEffect(() => {
    const fetchGrupperForProces = async () => {
      if (formData.proces) {
        setIsGrupperLoading(true);
        // Bevar den valgte gruppe, hvis den er gyldig, ellers nulstil den
        const nuvaerendeGruppeErGyldig = tilgaengeligeGrupper.some(g => g.id === formData.gruppe);
        if (!nuvaerendeGruppeErGyldig) {
            setFormData(prev => ({ ...prev, gruppe: '' }));
        }
        try {
          const response = await fetch(`${API_BASE_URL}/skabeloner/blokinfo/${formData.proces}/grupper/`);
          if (!response.ok) throw new Error('Kunne ikke hente grupper.');
          const data = await response.json();
          setTilgaengeligeGrupper(data);
        } catch (error) {
          console.error("Fejl ved hentning af grupper for proces:", error);
          setTilgaengeligeGrupper([]);
        } finally {
          setIsGrupperLoading(false);
        }
      } else {
        setTilgaengeligeGrupper([]);
        setFormData(prev => ({ ...prev, gruppe: '' }));
      }
    };
    fetchGrupperForProces();
  }, [formData.proces]);


  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = erRedigering
      ? `${API_BASE_URL}/skabeloner/aktiviteter/${aktivitetTilRedigering.id}/`
      : `${API_BASE_URL}/skabeloner/aktiviteter/`;
    const method = erRedigering ? 'PUT' : 'POST';
    const dataToSend = { ...formData };
    const numericFields = ['aktivitet_nr', 'frist'];
    numericFields.forEach(field => {
      if (dataToSend[field] === '' || dataToSend[field] === undefined) {
        dataToSend[field] = null;
      }
    });
    const payload = { ...dataToSend, proces_id: dataToSend.proces || null, gruppe_id: dataToSend.gruppe || null, };
    delete payload.proces;
    delete payload.gruppe;
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error Response:", errorData);
        throw new Error('Netværksrespons var ikke ok.');
      }
      onSave();
    } catch (error) {
      console.error('Fejl ved lagring af aktivitet:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {erRedigering ? 'Rediger Aktivitetsskabelon' : 'Opret Ny Aktivitetsskabelon'}
            </h2>
            <div className="flex items-center space-x-2">
              <button type="button" onClick={onCancel} className="p-2 text-gray-600 rounded-full hover:bg-gray-200" title="Annuller (Esc)">
                <X size={24} />
              </button>
              <button type="submit" className="p-2 text-white bg-blue-600 rounded-full hover:bg-blue-700" title="Gem">
                <Save size={24} />
              </button>
            </div>
          </div>
          
          <div className="flex items-start space-x-4">
            <div className="w-1/4">
              <label htmlFor="aktivitet_nr" className="block text-sm font-medium">Aktivitet Nr.</label>
              <input type="number" name="aktivitet_nr" value={formData.aktivitet_nr} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md"/>
            </div>
            <div className="flex-grow">
              <label htmlFor="aktivitet" className="block text-sm font-medium">Aktivitet</label>
              <input type="text" name="aktivitet" value={formData.aktivitet} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md"/>
            </div>
          </div>

          <div className="flex items-center space-x-6 pt-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" name="aktiv" checked={formData.aktiv} onChange={handleChange} />
              <span>Standard aktiveret</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" name="udgaaet" checked={formData.udgaaet} onChange={handleChange} />
              <span>Udgået</span>
            </label>
          </div>
          
          <div className="flex items-start space-x-4">
            <div className="w-1/2">
              <label htmlFor="proces" className="block text-sm font-medium">Proces</label>
              <select name="proces" value={formData.proces} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md bg-white">
                <option value="">Vælg proces...</option>
                {procesList.map(p => <option key={p.id} value={p.id}>{p.nr} - {p.titel_kort}</option>)}
              </select>
            </div>
            <div className="w-1/2">
              <label htmlFor="gruppe" className="block text-sm font-medium">Gruppe</label>
{/* @ 2025-09-13 12:49 - Opdateret select til at bruge den filtrerede liste. */}
              <select 
                name="gruppe" 
                value={formData.gruppe} 
                onChange={handleChange} 
                className="mt-1 w-full p-2 border rounded-md bg-white"
                disabled={!formData.proces || isGrupperLoading}
              >
                {isGrupperLoading ? (
                    <option>Henter grupper...</option>
                ) : !formData.proces ? (
                    <option>Vælg en proces først</option>
                ) : tilgaengeligeGrupper.length === 0 ? (
                    <option>Ingen grupper fundet</option>
                ) : (
                    <>
                        <option value="">Vælg gruppe...</option>
                        {tilgaengeligeGrupper.map(g => <option key={g.id} value={g.id}>{g.nr} - {g.titel_kort}</option>)}
                    </>
                )}
              </select>
            </div>
          </div>
          
          <div>
            <label htmlFor="note" className="block text-sm font-medium">Note</label>
            <textarea name="note" value={formData.note} onChange={handleChange} rows="3" className="mt-1 w-full p-2 border rounded-md"></textarea>
          </div>
          
          <div className="flex items-start space-x-4">
            <div className="w-1/2">
              <label htmlFor="ansvarlig" className="block text-sm font-medium">Ansvarlig</label>
              <input type="text" name="ansvarlig" value={formData.ansvarlig} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md"/>
            </div>
            <div className="w-1/2">
              <label htmlFor="frist" className="block text-sm font-medium">Frist (dage)</label>
               <input type="number" name="frist" value={formData.frist} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md"/>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
          </div>
        </form>
      </div>
    </div>
  );
}

export default AktivitetForm;