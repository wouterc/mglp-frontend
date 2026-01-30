
import React, { useEffect, useState } from 'react';
import { useAppState } from '../../StateContext';
import { api } from '../../api';
import Button from '../../components/ui/Button';
import { Plus, Edit, Folder, Save, X, Trash2, ArrowUpDown } from 'lucide-react';
import type { StandardMappe } from '../../types';

const StandardMapperPage: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { currentUser, standardMapper: initialMapper } = state;
    const [mapper, setMapper] = useState<StandardMappe[]>(initialMapper || []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Edit state
    const [activeCell, setActiveCell] = useState<{ id: number; field: string; value: any } | null>(null);
    const [visOpretForm, setVisOpretForm] = useState(false);
    const [nyMappeData, setNyMappeData] = useState<Partial<StandardMappe>>({
        navn: '',
        beskrivelse: '',
        sortering: 100,
        formaal: 'DOK'
    });

    const fetchMapper = async () => {
        setLoading(true);
        try {
            const data = await api.get<StandardMappe[]>('/kerne/standardmapper/');
            setMapper(data);
            dispatch({ type: 'SET_STANDARD_MAPPER', payload: data });
        } catch (e: any) {
            console.error(e);
            setError("Kunne ikke hente mapper.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMapper();
    }, []);

    const handleQuickUpdate = async (mappe: StandardMappe, updates: Partial<StandardMappe>) => {
        try {
            const updated = await api.put<StandardMappe>(`/kerne/standardmapper/${mappe.id}/`, { ...mappe, ...updates });
            const nyeMapper = mapper.map(m => m.id === mappe.id ? updated : m);
            setMapper(nyeMapper);
            dispatch({ type: 'SET_STANDARD_MAPPER', payload: nyeMapper });
        } catch (err: any) {
            alert("Kunne ikke opdatere: " + (err.message || "Ukendt fejl"));
        }
    };

    const handleGemNy = async () => {
        if (!nyMappeData.navn) return;
        try {
            const nyMappe = await api.post<StandardMappe>('/kerne/standardmapper/', nyMappeData);
            const nyeMapper = [...mapper, nyMappe];
            setMapper(nyeMapper);
            dispatch({ type: 'SET_STANDARD_MAPPER', payload: nyeMapper });
            setVisOpretForm(false);
            setNyMappeData({ navn: '', beskrivelse: '', sortering: 100, formaal: 'DOK' });
        } catch (err: any) {
            alert("Kunne ikke oprette: " + (err.message || "Ukendt fejl"));
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Er du sikker på at du vil slette denne mappe?")) return;
        try {
            await api.delete(`/kerne/standardmapper/${id}/`);
            const nyeMapper = mapper.filter(m => m.id !== id);
            setMapper(nyeMapper);
            dispatch({ type: 'SET_STANDARD_MAPPER', payload: nyeMapper });
        } catch (err: any) {
            alert("Kunne ikke slette. Mappen er sandsynligvis i brug.");
        }
    };

    if (!currentUser?.is_superuser) {
        return <div className="p-8 text-center text-red-600">Du har ikke adgang til denne side.</div>;
    }

    return (
        <div className="flex-1 h-full overflow-y-auto p-6 bg-gray-50">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Folder className="text-blue-600" /> Standard Mapper (Undermapper)
                    </h1>
                    <p className="text-gray-500 text-sm">Definer de standard undermapper der kan vælges på sager og dokumenter.</p>
                </div>
                <Button variant="primary" onClick={() => setVisOpretForm(true)} ikon={Plus}>
                    Opret Mappe
                </Button>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-4 rounded mb-4">{error}</div>}

            <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Sorthj.</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">Navn</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">Formål</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Beskrivelse</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Handling</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {visOpretForm && (
                            <tr className="bg-blue-50/50">
                                <td className="px-4 py-2">
                                    <input
                                        type="number"
                                        className="w-full text-xs p-1 border rounded"
                                        value={nyMappeData.sortering}
                                        onChange={e => setNyMappeData({ ...nyMappeData, sortering: parseInt(e.target.value) })}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Mappenavn..."
                                        className="w-full text-xs p-1 border rounded"
                                        value={nyMappeData.navn}
                                        onChange={e => setNyMappeData({ ...nyMappeData, navn: e.target.value })}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <select
                                        className="w-full text-xs p-1 border rounded bg-white"
                                        value={nyMappeData.formaal}
                                        onChange={e => setNyMappeData({ ...nyMappeData, formaal: e.target.value as 'DOK' | 'EML' })}
                                    >
                                        <option value="DOK">Dokumenter</option>
                                        <option value="EML">Emails</option>
                                    </select>
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type="text"
                                        placeholder="Kort beskrivelse..."
                                        className="w-full text-xs p-1 border rounded"
                                        value={nyMappeData.beskrivelse || ''}
                                        onChange={e => setNyMappeData({ ...nyMappeData, beskrivelse: e.target.value })}
                                    />
                                </td>
                                <td className="px-4 py-2 text-right">
                                    <div className="flex justify-end gap-1">
                                        <button onClick={handleGemNy} className="text-green-600 hover:text-green-800"><Save size={18} /></button>
                                        <button onClick={() => setVisOpretForm(false)} className="text-red-600 hover:text-red-800"><X size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {mapper.map(mappe => {
                            const isCellActive = (field: string) => activeCell?.id === mappe.id && activeCell?.field === field;

                            return (
                                <tr key={mappe.id} className="hover:bg-gray-50 group">
                                    {/* Sortering */}
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                        {isCellActive('sortering') ? (
                                            <input
                                                type="number"
                                                autoFocus
                                                className="w-full text-xs p-1 border border-blue-400 rounded"
                                                value={activeCell?.value ?? ''}
                                                onChange={e => setActiveCell({ ...activeCell!, value: e.target.value })}
                                                onBlur={() => {
                                                    handleQuickUpdate(mappe, { sortering: parseInt(activeCell!.value) });
                                                    setActiveCell(null);
                                                }}
                                                onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                                            />
                                        ) : (
                                            <div onClick={() => setActiveCell({ id: mappe.id, field: 'sortering', value: mappe.sortering })} className="cursor-text py-1 px-1 rounded hover:bg-blue-50">
                                                {mappe.sortering}
                                            </div>
                                        )}
                                    </td>

                                    {/* Navn */}
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {isCellActive('navn') ? (
                                            <input
                                                type="text"
                                                autoFocus
                                                className="w-full text-xs p-1 border border-blue-400 rounded"
                                                value={activeCell?.value ?? ''}
                                                onChange={e => setActiveCell({ ...activeCell!, value: e.target.value })}
                                                onBlur={() => {
                                                    handleQuickUpdate(mappe, { navn: activeCell!.value });
                                                    setActiveCell(null);
                                                }}
                                                onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                                            />
                                        ) : (
                                            <div onClick={() => setActiveCell({ id: mappe.id, field: 'navn', value: mappe.navn })} className="cursor-text py-1 px-1 rounded hover:bg-blue-50">
                                                {mappe.navn}
                                            </div>
                                        )}
                                    </td>

                                    {/* Formål */}
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                        {isCellActive('formaal') ? (
                                            <select
                                                autoFocus
                                                className="w-full text-xs p-1 border border-blue-400 rounded"
                                                value={activeCell?.value ?? ''}
                                                onChange={e => setActiveCell({ ...activeCell!, value: e.target.value })}
                                                onBlur={() => {
                                                    handleQuickUpdate(mappe, { formaal: activeCell!.value });
                                                    setActiveCell(null);
                                                }}
                                            >
                                                <option value="DOK">Dokumenter</option>
                                                <option value="EML">Emails</option>
                                            </select>
                                        ) : (
                                            <div onClick={() => setActiveCell({ id: mappe.id, field: 'formaal', value: mappe.formaal })} className="cursor-pointer">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${mappe.formaal === 'DOK' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                                    {mappe.formaal === 'DOK' ? 'Dokumenter' : 'Emails'}
                                                </span>
                                            </div>
                                        )}
                                    </td>

                                    {/* Beskrivelse */}
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                        {isCellActive('beskrivelse') ? (
                                            <input
                                                type="text"
                                                autoFocus
                                                className="w-full text-xs p-1 border border-blue-400 rounded"
                                                value={activeCell?.value ?? ''}
                                                onChange={e => setActiveCell({ ...activeCell!, value: e.target.value })}
                                                onBlur={() => {
                                                    handleQuickUpdate(mappe, { beskrivelse: activeCell!.value });
                                                    setActiveCell(null);
                                                }}
                                                onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                                            />
                                        ) : (
                                            <div onClick={() => setActiveCell({ id: mappe.id, field: 'beskrivelse', value: mappe.beskrivelse })} className="cursor-text py-1 px-1 rounded hover:bg-blue-50 truncate max-w-xs">
                                                {mappe.beskrivelse || <span className="text-gray-300 italic">Klik for beskrivelse...</span>}
                                            </div>
                                        )}
                                    </td>

                                    {/* Handlinger */}
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleDelete(mappe.id)}
                                            className="text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {loading && <div className="text-center py-4 text-gray-400 text-xs">Opdaterer...</div>}
        </div>
    );
};

export default StandardMapperPage;
