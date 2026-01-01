// --- Fil: src/components/AktivitetForm.tsx ---
// @# 2025-11-23 19:50 - Forenklet logik: Bruger lokal filtrering af grupper i stedet for API-kald.
import React, { useState, useEffect, useMemo, ChangeEvent, FormEvent, ReactElement } from 'react';
import { Save, X, Loader2 } from 'lucide-react';
import type { Blokinfo, SkabAktivitet, InformationsKilde, User } from '../types.ts';
import { api } from '../api';

type AktivitetTilRedigering = SkabAktivitet;

interface AktivitetFormProps {
  onSave: () => void;
  onCancel: () => void;
  aktivitetTilRedigering: AktivitetTilRedigering | null;
  blokinfoList: Blokinfo[];
  initialFilters?: {
    proces_nr?: string;
    gruppe_nr?: string;
  };
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
  informations_kilde_id: string;
  mail_titel: string;
}

function AktivitetForm({ onSave, onCancel, aktivitetTilRedigering, blokinfoList, initialFilters }: AktivitetFormProps): ReactElement {
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
    informations_kilde_id: '',
    mail_titel: '',
  });

  const [informationsKilder, setInformationsKilder] = useState<InformationsKilde[]>([]);
  const [colleagues, setColleagues] = useState<User[]>([]);

  useEffect(() => {
    api.get<InformationsKilde[]>('/kerne/informationskilder/').then(setInformationsKilder).catch(console.error);
    api.get<User[]>('/kerne/users/').then(data => setColleagues(data.filter(u => u.is_active))).catch(console.error);
  }, []);

  const [isSaving, setIsSaving] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  const erRedigering = aktivitetTilRedigering != null;

  // Filtrer listerne direkte fra props - ingen ventetid!
  const procesList = useMemo(() => blokinfoList.filter(b => b.formaal === 1), [blokinfoList]);
  const gruppeList = useMemo(() => blokinfoList.filter(b => b.formaal === 2), [blokinfoList]);

  // Initialiser formular data
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
        informations_kilde_id: aktivitetTilRedigering.informations_kilde?.id?.toString() || '',
        mail_titel: aktivitetTilRedigering.mail_titel || '',
      });
    } else if (!erRedigering && initialFilters) {
      // Forudfyld fra filtre hvis muligt
      const valgtProces = procesList.find(p => p.nr.toString() === initialFilters.proces_nr);
      const valgtGruppe = gruppeList.find(g => g.nr.toString() === initialFilters.gruppe_nr);

      setFormData(prev => ({
        ...prev,
        proces: valgtProces?.id.toString() || '',
        gruppe: valgtGruppe?.id.toString() || '',
      }));
    }
  }, [aktivitetTilRedigering, erRedigering, initialFilters, procesList, gruppeList, blokinfoList]);

  // Automatisk kobling og nummerering
  useEffect(() => {
    // Vi stopper kun hvis auto-fill allerede kører. Vi tillader nu kørsel ved redigering
    // for at sikre at proces opdateres hvis man ændrer gruppe.
    if (isAutoFilling) return;

    const autoFill = async () => {
      // Hvis vi har Gruppe, så find/opdater Proces
      if (formData.gruppe) {
        // Find gruppe nummer for korrekt API filtrering
        const selectedGroup = gruppeList.find(g => g.id.toString() === formData.gruppe);
        const gruppeNr = selectedGroup?.nr;

        if (gruppeNr) {
          // 1. Find processen for denne gruppe
          try {
            // Vi har brug for at finde en aktivitet i denne gruppe for at kende processen.
            // Hvis gruppen er tom, kan vi ikke gætte processen nemt herfra uden at slå baglæns op,
            // men backend API'et understøtter via 'limit=1'.
            const data = await api.get<any>(`/skabeloner/aktiviteter/?gruppe_nr=${gruppeNr}&limit=1`);
            if (data.results && data.results.length > 0) {
              const correctProcesId = data.results[0].proces.id.toString();
              // Kun opdater hvis den ikke allerede er valgt korrekt
              if (formData.proces !== correctProcesId) {
                setFormData(prev => ({ ...prev, proces: correctProcesId }));
                // Vi returnerer her for at lade useEffect køre igen med den nye state
                return;
              }
            }
          } catch (e) {
            console.error("Kunne ikke finde proces for gruppe", e);
          }
        }
      }

      // Beregn næste nummer hvis vi har begge men mangler nummer
      if (formData.proces && formData.gruppe && !formData.aktivitet_nr) {
        const selectedGroup = gruppeList.find(g => g.id.toString() === formData.gruppe);
        const gruppeNr = selectedGroup?.nr;

        if (gruppeNr) {
          try {
            const data = await api.get<any>(`/skabeloner/aktiviteter/?gruppe_nr=${gruppeNr}&limit=1000`);
            const acts = data.results || [];

            const numbers = acts.map((a: any) => a.aktivitet_nr).filter((n: any) => n !== null && n !== undefined);
            const maxNr = numbers.length > 0 ? Math.max(...numbers) : 0;
            const newNr = maxNr + 1;

            setFormData(prev => ({ ...prev, aktivitet_nr: newNr.toString() }));
          } catch (e) {
            console.error("Kunne ikke beregne næste nr", e);
          }
        }
      }
    };

    autoFill();
  }, [formData.gruppe, formData.proces, formData.aktivitet_nr, erRedigering]);

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

    setFormData(prev => {
      const next = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };

      // Nulstil gruppe hvis proces ændres
      if (name === 'proces') {
        next.gruppe = '';
      }

      // Hvis aktivitet markeres som udgået, så deaktiver den også automatisk
      if (name === 'udgaaet' && checked === true) {
        next.aktiv = false;
      }

      // Forhindr at gøre den aktiv hvis den er markeret som udgået
      if (name === 'aktiv' && checked === true && next.udgaaet) {
        next.aktiv = false;
      }

      return next;
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const dataToSend: any = { ...formData };
    const numericFields = ['aktivitet_nr', 'frist'];
    numericFields.forEach(field => {
      if (dataToSend[field] === '' || dataToSend[field] === undefined) {
        dataToSend[field] = null;
      } else {
        dataToSend[field] = parseInt(dataToSend[field]);
      }
    });

    const payload: any = {
      ...dataToSend,
      proces_id: dataToSend.proces ? parseInt(dataToSend.proces) : null,
      gruppe_id: dataToSend.gruppe ? parseInt(dataToSend.gruppe) : null,
      informations_kilde_id: dataToSend.informations_kilde_id ? parseInt(dataToSend.informations_kilde_id) : null,
    };

    if (!payload.proces_id || !payload.gruppe_id) {
      alert("Både Proces og Gruppe skal vælges.");
      return;
    }

    // Fjern felter der ikke skal sendes til API'et
    delete payload.proces;
    delete payload.gruppe;

    setIsSaving(true);
    try {
      // Check for duplikat nummer
      const nummerErAendret = erRedigering && aktivitetTilRedigering &&
        (Number(payload.aktivitet_nr) !== aktivitetTilRedigering.aktivitet_nr ||
          Number(payload.gruppe_id) !== aktivitetTilRedigering.gruppe?.id);

      if (!erRedigering || nummerErAendret) {
        try {
          const selectedGroup = gruppeList.find(g => g.id.toString() === payload.gruppe_id.toString());
          if (selectedGroup) {
            const check = await api.get<any>(`/skabeloner/aktiviteter/?gruppe_nr=${selectedGroup.nr}&aktivitet_nr=${payload.aktivitet_nr}`);
            // Hvis vi finder en aktivitet med samme nummer
            if (check.results && check.results.length > 0) {
              // Tjek at det ikke er den samme aktivitet vi er ved at redigere
              const eksisterendeAktivitet = check.results[0];
              if (!erRedigering || eksisterendeAktivitet.id !== aktivitetTilRedigering?.id) {
                alert(`Fejl: Aktivitet nr. ${payload.aktivitet_nr} findes allerede i denne gruppe. Vælg venligst et andet nummer.`);
                setIsSaving(false);
                return;
              }
            }
          }
        } catch (e) {
          // Ignorer fejl ved check, lad backend håndtere det endelige save
        }
      }

      if (erRedigering) {
        await api.patch(`/skabeloner/aktiviteter/${aktivitetTilRedigering?.id}/`, payload);
      } else {
        await api.post(`/skabeloner/aktiviteter/`, payload);
      }
      onSave();
    } catch (error: any) {
      console.error('Fejl ved lagring af aktivitet:', error);
      alert(`Fejl ved lagring: ${error.message}`);
    } finally {
      setIsSaving(false);
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
              <button
                type="submit"
                disabled={!formData.proces || !formData.gruppe || !formData.aktivitet || !formData.aktivitet_nr || isSaving}
                className={`p-2 text-white rounded-full transition-all ${(!formData.proces || !formData.gruppe || !formData.aktivitet || !formData.aktivitet_nr || isSaving) ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md'}`}
                title="Gem"
              >
                {isSaving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
              </button>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-1/4">
              <label htmlFor="aktivitet_nr" className="block text-sm font-medium">Aktivitet Nr.</label>
              <input
                type="number"
                name="aktivitet_nr"
                value={formData.aktivitet_nr}
                onChange={handleChange}
                className={`mt-1 w-full p-2 border rounded-md text-[12px] ${!erRedigering ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                readOnly={!erRedigering}
                title={!erRedigering ? "Nummeret tildeles automatisk" : ""}
              />
            </div>
            <div className="flex-grow">
              <label htmlFor="aktivitet" className="block text-sm font-medium">Aktivitet</label>
              <input type="text" name="aktivitet" value={formData.aktivitet} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md text-[12px]" />
            </div>
          </div>

          <div className="flex items-center space-x-6 pt-2">
            <label className={`flex items-center space-x-2 ${formData.udgaaet ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                name="aktiv"
                checked={formData.aktiv}
                onChange={handleChange}
                disabled={!!formData.udgaaet}
              />
              <span>Standard aktiveret</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" name="udgaaet" checked={formData.udgaaet} onChange={handleChange} />
              <span>Udgået</span>
            </label>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-1/2">
              <label htmlFor="proces" className="block text-sm font-medium">Proces <span className="text-red-500">*</span></label>
              <select name="proces" value={formData.proces} onChange={handleChange} required className="mt-1 w-full p-2 border rounded-md bg-white border-blue-200 text-[12px]">
                <option value="">Vælg proces...</option>
                {procesList.map(p => <option key={p.id} value={p.id}>{p.nr} - {p.titel_kort}</option>)}
              </select>
            </div>
            <div className="w-1/2">
              <label htmlFor="gruppe" className="block text-sm font-medium">Gruppe <span className="text-red-500">*</span></label>
              <select
                name="gruppe"
                value={formData.gruppe}
                onChange={handleChange}
                required
                className="mt-1 w-full p-2 border rounded-md bg-white border-blue-200 text-[12px]"
              >
                <option value="">Vælg gruppe...</option>
                {gruppeList.map(g => (
                  <option key={g.id} value={g.id}>{g.nr} - {g.titel_kort}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="note" className="block text-sm font-medium">Note</label>
            <textarea name="note" value={formData.note} onChange={handleChange} rows={3} className="mt-1 w-full p-2 border rounded-md text-[11px] placeholder-gray-400"></textarea>
          </div>

          <div className="flex items-start space-x-4 pt-4 border-t border-gray-100">
            <div className="w-1/4">
              <label htmlFor="informations_kilde_id" className="block text-sm font-medium">Informationskilde</label>
              <select name="informations_kilde_id" value={formData.informations_kilde_id} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md bg-white text-[12px]">
                <option value="">Ingen</option>
                {informationsKilder.map(k => <option key={k.id} value={k.id}>{k.navn}</option>)}
              </select>
            </div>
            <div className="flex-grow">
              <label htmlFor="mail_titel" className="block text-sm font-medium">Mail Titel</label>
              <textarea
                name="mail_titel"
                value={formData.mail_titel}
                onChange={handleChange}
                className="mt-1 w-full p-2 border rounded-md text-[12px] resize-y min-h-[38px]"
                placeholder="Titel til eksterne mails"
                rows={2}
              />
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-1/2">
              <label htmlFor="ansvarlig" className="block text-sm font-medium">Ansvarlig</label>
              <select name="ansvarlig" value={formData.ansvarlig} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md bg-white text-[12px]">
                <option value="">Ingen</option>
                {colleagues.map(u => (
                  <option key={u.id} value={u.username}>{u.username}</option>
                ))}
              </select>
            </div>
            <div className="w-1/2">
              <label htmlFor="frist" className="block text-sm font-medium">Frist (dage)</label>
              <input type="number" name="frist" value={formData.frist} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md text-[12px]" />
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}

export default AktivitetForm;