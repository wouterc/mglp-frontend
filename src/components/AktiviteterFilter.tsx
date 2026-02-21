// --- Fil: src/components/AktiviteterFilter.tsx ---
// @# 2025-09-15 22:48 - Ændret "Alle"-knappens værdi fra "" til "alle" for entydig kommunikation.
// @# 2025-11-03 21:45 - Implementeret manuel 'Filtrer'-knap for at stoppe automatiske API-kald.
// @# 2025-11-15 12:30 - Opdateret til at bruge genbrugelig Button-komponent
import React, { useState, useEffect, ChangeEvent } from 'react';
import { api } from '../api';
import { useAppState } from '../StateContext';
import FilterSidebar from './FilterSidebar';
import type { Status, AktiviteterFilterState, User } from '../types';
import { ChevronDown, ChevronUp, ArrowDown01, ArrowDownAZ } from 'lucide-react';
import Button from './ui/Button'; // Importer den nye knap

// Importer AktiviteterFilterState

function AktiviteterFilter() {
    const { state, dispatch } = useAppState();
    const { aktiviteterFilters, users: colleagues, aktivitetStatusser, informationsKilder, currentUser } = state;

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
            status: '',
            informations_kilde: '',
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

    const toggleSort = () => {
        if (!currentUser) return;
        const current = currentUser.aktivitet_sortering || 'nummer';
        const next = current === 'nummer' ? 'alfabetisk' : 'nummer';
        // Optimistic update
        dispatch({ type: 'SET_CURRENT_USER', payload: { ...currentUser, aktivitet_sortering: next } });
        // API call
        api.patch('/kerne/me/', { aktivitet_sortering: next }).catch(console.error);
    };

    return (
        <FilterSidebar onNulstil={handleNulstilFiltre}>
            <div className="space-y-4">
                {/* Sortering Toggle */}
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Sortering</span>
                    <button
                        onClick={toggleSort}
                        className="p-1 px-2 text-xs border rounded bg-white hover:bg-gray-50 flex items-center gap-1 transition-colors"
                        title={currentUser?.aktivitet_sortering === 'alfabetisk' ? 'Skift til nummerorden' : 'Skift til alfabetisk'}
                    >
                        {currentUser?.aktivitet_sortering === 'alfabetisk' ? (
                            <>
                                <ArrowDownAZ size={14} className="text-blue-600" />
                                <span className="font-medium">Alfabetisk</span>
                            </>
                        ) : (
                            <>
                                <ArrowDown01 size={14} className="text-blue-600" />
                                <span className="font-medium">Nummer</span>
                            </>
                        )}
                    </button>
                </div>

                <input
                    id="filter-aktivitet"
                    type="text"
                    name="aktivitet"
                    placeholder="Søg i aktivitet..."
                    value={aktiviteterFilters.aktivitet}
                    onChange={handleFilterChange}
                    className="p-2 w-full border rounded-md text-sm"
                    aria-label="Søg i aktivitet"
                />

                <select
                    id="filter-status"
                    name="status"
                    value={aktiviteterFilters.status}
                    onChange={handleFilterChange}
                    className="p-2 w-full border rounded-md text-sm bg-white"
                    aria-label="Vælg status"
                >
                    <option value="">Alle statusser</option>
                    <option value="ikke-faerdigmeldt">Alle ikke-færdigmeldte</option>
                    {aktivitetStatusser.map(s => <option key={s.id} value={s.id}>{s.status_nummer} - {s.beskrivelse}</option>)}
                </select>

                <select
                    id="filter-informations_kilde"
                    name="informations_kilde"
                    value={aktiviteterFilters.informations_kilde}
                    onChange={handleFilterChange}
                    className="p-2 w-full border rounded-md text-sm bg-white"
                    aria-label="Vælg informationskilde"
                >
                    <option value="">Alle informationskilder</option>
                    {informationsKilder.map(k => <option key={k.id} value={k.id}>{k.navn}</option>)}
                </select>

                <div className="pt-2">
                    <label className="flex items-center space-x-2 text-sm">
                        <input
                            id="filter-aktiv-kun-aktive"
                            type="radio"
                            name="aktiv_filter"
                            value="kun_aktive"
                            checked={aktiviteterFilters.aktiv_filter === 'kun_aktive'}
                            onChange={handleFilterChange}
                            aria-label="Kun aktive"
                        />
                        <span>Kun aktive</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                        <input
                            id="filter-aktiv-alle"
                            type="radio"
                            name="aktiv_filter"
                            value="alle"
                            checked={aktiviteterFilters.aktiv_filter === 'alle'}
                            onChange={handleFilterChange}
                            aria-label="Alle aktiviteter"
                        />
                        <span>Alle</span>
                    </label>
                </div>

                <div className="pt-2 border-t mt-2">
                    <label className="flex items-center space-x-2 text-sm cursor-pointer">
                        <input
                            id="filter-overskredet"
                            type="checkbox"
                            name="overskredet"
                            checked={aktiviteterFilters.overskredet}
                            onChange={handleFilterChange}
                            aria-label="Overskredne & Snart"
                        />
                        <span>Overskredne & Snart</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm cursor-pointer mt-1">
                        <input
                            id="filter-vigtige"
                            type="checkbox"
                            name="vigtige"
                            checked={aktiviteterFilters.vigtige}
                            onChange={handleFilterChange}
                            className="rounded text-red-600 focus:ring-red-500"
                            aria-label="Kun vigtige kommentarer"
                        />
                        <span>Kun vigtige kommentarer</span>
                    </label>
                </div>
            </div>
        </FilterSidebar>
    );
}

export default AktiviteterFilter;