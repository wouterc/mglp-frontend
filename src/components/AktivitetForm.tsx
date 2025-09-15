// --- Fil: src/components/AktivitetForm.tsx ---
import React, { useState, useEffect, useMemo, ChangeEvent, FormEvent, ReactElement } from 'react';
import { API_BASE_URL } from '../config.ts';
import { Save, X } from 'lucide-react';
import type { Blokinfo, AktivitetTilRedigering } from '../types.ts'; // IMPORTER CENTRALE TYPER

// --- Type-definitioner (kun komponent-specifikke) ---
interface AktivitetFormProps {
  onSave: () => void;
  onCancel: () => void;
  aktivitetTilRedigering: AktivitetTilRedigering;
  blokinfoList: Blokinfo[];
}

interface FormDataState {
  proces: string;
  gruppe: string;
  aktivitet_nr: string;
  aktivitet: string;
  aktiv: boolean;
  udgaaet: boolean;
  note: string;
  ansvarlig: string;
  frist: string;
}

function AktivitetForm({ onSave, onCancel, aktivitetTilRedigering, blokinfoList }: AktivitetFormProps): ReactElement {
  const [formData, setFormData] = useState<FormDataState>({
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

  const [tilgaengeligeGrupper, setTilgaengeligeGrupper] = useState<Blokinfo[]>([]);
  const [isGrupperLoading, setIsGrupperLoading] = useState<boolean>(false);
  const erRedigering = aktivitetTilRedigering != null;
  
  const procesList = useMemo(() => blokinfoList.filter(b => b.formaal === 1), [blokinfoList]);

  useEffect(() => {
    if (erRedigering && aktivitetTilRedigering) {
      setFormData({
        proces: aktivitetTilRedigering.proces?.id.toString() || '',
        gruppe: aktivitetTilRedigering.gruppe?.id.toString() || '',
        aktivitet_nr: aktivitetTilRedigering.aktivitet_nr?.toString() || '',
        aktivitet: aktivitetTilRedigering.aktivitet || '',
        aktiv: aktivitetTilRedigering.aktiv === null ? true : aktivitetTilRedigering.aktiv,
        udgaaet: aktivitetTilRedigering.udgaaet || false,
        note: aktivitetTilRedigering.note || '',
        ansvarlig: aktivitetTilRedigering.ansvarlig || '',
        frist: aktivitetTilRedigering.frist?.toString() || '',
      });
    }
  }, [aktivitetTilRedigering, erRedigering]);

  useEffect(() => {
    const fetchGrupperForProces = async () => {
      if (formData.proces) {
        setIsGrupperLoading(true);
        const nuvaerendeGruppeErGyldig = tilgaengeligeGrupper.some(g => g.id.toString() === formData.gruppe);
        if (!nuvaerendeGruppeErGyldig) {
            setFormData(prev => ({ ...prev, gruppe: '' }));
        }
  
        try {
          const response = await fetch(`${API_BASE_URL}/skabeloner/blokinfo/${formData.proces}/grupper/`);
          if (!response.ok) throw new Error('Kunne ikke hente grupper.');
          const data: Blokinfo[] = await response.json();
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const url = erRedigering
      ? `${API_BASE_URL}/skabeloner/aktiviteter/${aktivitetTilRedigering?.id}/`
      : `${API_BASE_URL}/skabeloner/aktiviteter/`;
    const method = erRedigering ? 'PUT' : 'POST';
    
    const dataToSend: any = { ...formData };
    const numericFields = ['aktivitet_nr', 'frist'];
    numericFields.forEach(field => {
      if (dataToSend[field] === '' || dataToSend[field] === undefined) {
        dataToSend[field] = null;
      }
    });
    
    const payload = { 
        ...dataToSend, 
        proces_id: dataToSend.proces || null, 
        gruppe_id: dataToSend.gruppe || null, 
    };
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
              <select 
                name="gruppe" 
                value={formData.gruppe} 
                onChange={handleChange} 
                className="mt-1 w-full p-2 border rounded-md bg-white"
                disabled={!formData.proces || isGrupperLoading}
              >
                {isGrupperLoading 
                  ? <option>Henter grupper...</option>
                  : !formData.proces 
                  ? <option>Vælg en proces først</option>
                  : tilgaengeligeGrupper.length === 0 
                  ? <option>Ingen grupper fundet</option>
                  : (
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
            <textarea name="note" value={formData.note} onChange={handleChange} rows={3} className="mt-1 w-full p-2 border rounded-md"></textarea>
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

        </form>
      </div>
    </div>
  );
}

export default AktivitetForm;