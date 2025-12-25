// --- Fil: src/components/AktiviteterFilter.tsx ---
// @# 2025-09-15 22:48 - Ændret "Alle"-knappens værdi fra "" til "alle" for entydig kommunikation.
// @# 2025-11-03 21:45 - Implementeret manuel 'Filtrer'-knap for at stoppe automatiske API-kald.
// @# 2025-11-15 12:30 - Opdateret til at bruge genbrugelig Button-komponent
import React, { useState, useEffect, ChangeEvent } from 'react';
import { api } from '../api';
import { useAppState } from '../StateContext';
import FilterSidebar from './FilterSidebar';
import type { Status, AktiviteterFilterState, User } from '../types';
import Button from './ui/Button'; // Importer den nye knap

// Importer AktiviteterFilterState

function AktiviteterFilter() {
    const { state, dispatch } = useAppState();
    const { aktiviteterFilters } = state;

    const [aktivitetStatusser, setAktivitetStatusser] = useState<Status[]>([]);
    const [colleagues, setColleagues] = useState<User[]>([]);

    useEffect(() => {
        api.get<User[]>('/kerne/users/').then(data => {
            setColleagues(data.filter(u => u.is_active));
        });
    }, []);

    useEffect(() => {
        const fetchAktivitetStatusser = async () => {
            try {
                const data = await api.get<any>('/kerne/status/?formaal=2');
                setAktivitetStatusser(data.results || data);
            } catch (error) {
                console.error("Kunne ikke hente statusser til filter:", error);
            }
        };
        fetchAktivitetStatusser();
    }, []);

    // @# 2025-12-21 - Opdaterer nu direkte den GLOBALE state for instant respons.
    const handleFilterChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const checked = (e.target as HTMLInputElement).checked;

        const updatedFilters = {
            ...aktiviteterFilters,
            [name]: isCheckbox ? checked : value
        };

        dispatch({
            type: 'SET_AKTIVITETER_STATE',
            payload: { aktiviteterFilters: updatedFilters },
        });
    };

    // @# 2025-11-03 21:45 - Nulstiller den globale state.
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
            overskredet: false,
            vigtige: false
        };
        dispatch({
            type: 'SET_AKTIVITETER_STATE',
            payload: { aktiviteterFilters: nulstilletState }
        });
    };

    return (
        <FilterSidebar onNulstil={handleNulstilFiltre}>
            <div className="space-y-4">
                <input type="text" name="aktivitet" placeholder="Søg i aktivitet..." value={aktiviteterFilters.aktivitet} onChange={handleFilterChange} className="p-2 w-full border rounded-md text-sm" />

                <select
                    name="ansvarlig"
                    value={aktiviteterFilters.ansvarlig || ''}
                    onChange={handleFilterChange}
                    className="p-2 w-full border rounded-md text-sm bg-white"
                >
                    <option value="">Alle ansvarlige</option>
                    {colleagues.map(u => (
                        <option key={u.id} value={u.username}>{u.username}</option>
                    ))}
                </select>

                <select name="status" value={aktiviteterFilters.status} onChange={handleFilterChange}
                    className="p-2 w-full border rounded-md text-sm bg-white">
                    <option value="">Alle statusser</option>
                    <option value="ikke-faerdigmeldt">Alle ikke-færdigmeldte</option>
                    {aktivitetStatusser.map(s => <option key={s.id} value={s.id}>{s.status_nummer} - {s.beskrivelse}</option>)}
                </select>

                <div className="pt-2">
                    <label className="flex items-center space-x-2 text-sm">
                        <input type="radio" name="aktiv_filter" value="kun_aktive" checked={aktiviteterFilters.aktiv_filter === 'kun_aktive'} onChange={handleFilterChange} /> <span>Kun aktive</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                        <input type="radio" name="aktiv_filter" value="alle" checked={aktiviteterFilters.aktiv_filter === 'alle'} onChange={handleFilterChange} /> <span>Alle</span>
                    </label>
                </div>

                <div className="pt-2 border-t mt-2">
                    <label className="flex items-center space-x-2 text-sm cursor-pointer">
                        <input type="checkbox" name="overskredet" checked={aktiviteterFilters.overskredet} onChange={handleFilterChange} /> <span>Vis kun overskredne</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm cursor-pointer mt-1">
                        <input type="checkbox" name="vigtige" checked={aktiviteterFilters.vigtige} onChange={handleFilterChange} className="rounded text-red-600 focus:ring-red-500" /> <span>Kun vigtige kommentarer</span>
                    </label>
                </div>
            </div>
        </FilterSidebar>
    );
}

export default AktiviteterFilter;