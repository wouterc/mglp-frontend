// --- Fil: src/components/AktiviteterFilter.tsx ---
// @# 2025-09-15 22:48 - Ændret "Alle"-knappens værdi fra "" til "alle" for entydig kommunikation.
// @# 2025-11-03 21:45 - Implementeret manuel 'Filtrer'-knap for at stoppe automatiske API-kald.
import React, { useState, useEffect, ChangeEvent } from 'react';
import { API_BASE_URL } from '../config';
import { useAppState } from '../StateContext';
import FilterSidebar from './FilterSidebar';
import type { Status, AktiviteterFilterState } from '../types'; // Importer AktiviteterFilterState

function AktiviteterFilter() {
    const { state, dispatch } = useAppState();
    const { aktiviteterFilters } = state;
    
    // @# 2025-11-03 21:45 - Lokal state til at holde filter-ændringer, før de anvendes.
    const [lokaleFiltre, setLokaleFiltre] = useState<AktiviteterFilterState>(aktiviteterFilters);
    
    const [aktivitetStatusser, setAktivitetStatusser] = useState<Status[]>([]);

    // @# 2025-11-03 21:45 - Synkroniserer lokal state, hvis den globale state nulstilles.
    useEffect(() => {
        setLokaleFiltre(aktiviteterFilters);
    }, [aktiviteterFilters]);

    useEffect(() => {
        const fetchAktivitetStatusser = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/kerne/status/?formaal=2`);
                if (!response.ok) return;
                const data = await response.json();
                setAktivitetStatusser(data.results || data);
            } catch (error) {
                console.error("Kunne ikke hente statusser til filter:", error);
            }
        };
        fetchAktivitetStatusser();
    }, []);

    // @# 2025-11-03 21:45 - Opdaterer nu kun den LOKALE state.
    const handleFilterChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const checked = (e.target as HTMLInputElement).checked;
        setLokaleFiltre(prev => ({ ...prev, [name]: isCheckbox ? checked : value }));
    };

    // @# 2025-11-03 21:45 - Ny funktion, der sender den lokale state til den globale state.
    const handleSubmitFilter = () => {
        dispatch({
            type: 'SET_AKTIVITETER_STATE',
            payload: { aktiviteterFilters: lokaleFiltre },
        });
    };

    // @# 2025-11-03 21:45 - Nulstiller nu både lokal og global state.
    const handleNulstilFiltre = () => {
        const nulstilletState: AktiviteterFilterState = { 
            aktivitet: '', 
            ansvarlig: '', 
            status: '', 
            aktiv_filter: 'kun_aktive', 
            dato_intern_efter: '', 
            dato_intern_foer: '', 
            dato_ekstern_efter: '', 
            dato_ekstern_foer: '', 
            overskredet: false 
        };
        setLokaleFiltre(nulstilletState);
        dispatch({
            type: 'SET_AKTIVITETER_STATE',
            payload: { aktiviteterFilters: nulstilletState }
        });
    };

    return (
        <FilterSidebar onNulstil={handleNulstilFiltre}>
            <div className="space-y-4">
                <input type="text" name="aktivitet" placeholder="Søg i aktivitet..." value={lokaleFiltre.aktivitet} onChange={handleFilterChange} className="p-2 w-full border rounded-md text-sm"/>
                <input type="text" name="ansvarlig" placeholder="Søg i ansvarlig..." value={lokaleFiltre.ansvarlig} onChange={handleFilterChange} className="p-2 w-full border rounded-md text-sm"/>
                <select name="status" value={lokaleFiltre.status} onChange={handleFilterChange} className="p-2 w-full border rounded-md text-sm bg-white">
                    <option value="">Alle statusser</option>
                    <option value="ikke-faerdigmeldt">Alle ikke-færdigmeldte</option>
                    {aktivitetStatusser.map(s => <option key={s.id} value={s.id}>{s.status_nummer} - {s.beskrivelse}</option>)}
                </select>
         
               <div className="pt-2">
                    <label className="flex items-center space-x-2 text-sm"><input type="radio" name="aktiv_filter" value="kun_aktive" checked={lokaleFiltre.aktiv_filter === 'kun_aktive'} onChange={handleFilterChange} /> <span>Kun aktive</span></label>
                    <label className="flex items-center space-x-2 text-sm"><input type="radio" name="aktiv_filter" value="alle" checked={lokaleFiltre.aktiv_filter === 'alle'} onChange={handleFilterChange} /> <span>Alle</span></label>
                </div>
           
             <div className="pt-2 border-t mt-2">
                     <label className="flex items-center space-x-2 text-sm"><input type="checkbox" name="overskredet" checked={lokaleFiltre.overskredet} onChange={handleFilterChange} /> <span>Vis kun overskredne</span></label>
                </div>

                {/* @# 2025-11-03 21:45 - Den nye manuelle 'Filtrer'-knap */}
                <button
                    onClick={handleSubmitFilter}
                    className="w-full p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    Filtrer
                </button>
            </div>
        </FilterSidebar>
    );
}

export default AktiviteterFilter;