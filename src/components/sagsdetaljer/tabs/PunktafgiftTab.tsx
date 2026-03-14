import React, { useState, useEffect, useMemo } from 'react';
import { ReceiptText, Search, Plus, Trash2, Loader2, User } from 'lucide-react';
import { Sag, SagsPunktafgift } from '../../../types';
import { SagService } from '../../../services/SagService';
import { LookupService } from '../../../services/LookupService';
import dayjs from 'dayjs';
import 'dayjs/locale/da';
import ConfirmModal from '../../ui/ConfirmModal';

dayjs.locale('da');

const PunktafgiftTab: React.FC<{ sag: Sag; onUpdate?: () => void }> = ({ sag, onUpdate }) => {
    const [lines, setLines] = useState<SagsPunktafgift[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [isLoadingLines, setIsLoadingLines] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Alert Modal State
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string }>({
        isOpen: false,
        title: '',
        message: ''
    });

    // Filtre og søgning
    const [searchTerm, setSearchTerm] = useState('');
    const [afregnetFilter, setAfregnetFilter] = useState<string>('all');

    // Quick add state
    const [quickAdd, setQuickAdd] = useState({
        sagsidentification: '',
        beloeb: '',
        anmeldt: '',
        kontaktperson_id: '',
        dato_opkraevet: dayjs().format('YYYY-MM-DD'),
        dato_modtaget: '',
        dato_dokument_anmeldt: '',
        afregnet_skat: false,
        dato_afregnet_skat: ''
    });

    useEffect(() => {
        fetchData();
    }, [sag.id]);

    const fetchData = async () => {
        setIsLoadingLines(true);
        try {
            const [linesData, userData] = await Promise.all([
                SagService.getPunktafgifter(sag.id),
                LookupService.getUsers()
            ]);

            setLines(linesData);
            setUsers(userData);
        } catch (error) {
            console.error("Fejl ved hentning af punktafgiftsdata:", error);
        } finally {
            setIsLoadingLines(false);
        }
    };

    const handleQuickAdd = async () => {
        if (!quickAdd.sagsidentification || !quickAdd.beloeb) {
            setAlertModal({
                isOpen: true,
                title: 'Manglende oplysninger',
                message: 'Sagsidentification og beløb er påkrævet.'
            });
            return;
        }

        setIsSaving(true);
        try {
            const newLine = await SagService.createPunktafgift({
                sag: sag.id,
                ...quickAdd,
                kontaktperson_id: quickAdd.kontaktperson_id || null,
                dato_modtaget: quickAdd.dato_modtaget || null,
                dato_dokument_anmeldt: quickAdd.dato_dokument_anmeldt || null,
                dato_afregnet_skat: quickAdd.dato_afregnet_skat || null
            });

            setLines(prev => [newLine, ...prev]);

            setQuickAdd({
                sagsidentification: '',
                beloeb: '',
                anmeldt: '',
                kontaktperson_id: '',
                dato_opkraevet: dayjs().format('YYYY-MM-DD'),
                dato_modtaget: '',
                dato_dokument_anmeldt: '',
                afregnet_skat: false,
                dato_afregnet_skat: ''
            });
        } catch (error) {
            console.error("Fejl ved oprettelse af punktafgift:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateLine = async (id: number, data: Partial<SagsPunktafgift>) => {
        setIsSaving(true);
        try {
            const updatedLine = await SagService.updatePunktafgift(id, data);
            setLines(prev => prev.map(l => l.id === id ? updatedLine : l));
        } catch (error) {
            console.error("Fejl ved opdatering af punktafgift:", error);
            fetchData();
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteLine = async (id: number) => {
        setIsSaving(true);
        try {
            await SagService.deletePunktafgift(id);
            setLines(prev => prev.filter(l => l.id !== id));
        } catch (error) {
            console.error("Fejl ved sletning af punktafgift:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredLines = useMemo(() => {
        return lines.filter(line => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch =
                (line.sagsidentification || '').toLowerCase().includes(searchLower) ||
                (line.anmeldt || '').toLowerCase().includes(searchLower);

            let matchesAfregnet = true;
            if (afregnetFilter === 'ja') matchesAfregnet = line.afregnet_skat === true;
            if (afregnetFilter === 'nej') matchesAfregnet = line.afregnet_skat === false;

            return matchesSearch && matchesAfregnet;
        });
    }, [lines, searchTerm, afregnetFilter]);

    return (
        <div className="flex-1 flex flex-col min-h-0 h-full">
            <div className="bg-white flex flex-col flex-1 rounded-lg shadow-md border border-gray-300">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <ReceiptText className="text-purple-600" />
                                Tinglysningsafgifter
                            </h2>
                            <p className="text-gray-500 text-sm">Administrer tinglysningsafgifter for denne sag.</p>
                        </div>

                        <div className="flex flex-wrap gap-2 bg-gray-300 rounded-lg border border-gray-400 p-2">
                            <div className="relative flex-grow md:flex-grow-0">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Søg..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-4 h-[30px] border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white min-w-[200px]"
                                />
                            </div>
                            <select
                                value={afregnetFilter}
                                onChange={(e) => setAfregnetFilter(e.target.value)}
                                className="px-3 h-[30px] border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                            >
                                <option value="all">Alle</option>
                                <option value="ja">Afregnet</option>
                                <option value="nej">Ikke afregnet</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="p-4 flex-1 flex flex-col space-y-4">
                    <div className="p-3 bg-gray-300 rounded-lg border border-gray-400">
                        <h3 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2 uppercase">
                            <Plus size={14} />
                            Ny Tinglysning
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-3 items-end text-xs">
                            <div className="col-span-1">
                                <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">Sagsidentification</label>
                                <input
                                    type="text"
                                    value={quickAdd.sagsidentification}
                                    onChange={(e) => setQuickAdd({ ...quickAdd, sagsidentification: e.target.value })}
                                    className="w-full h-[30px] px-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">Beløb</label>
                                <input
                                    type="number"
                                    value={quickAdd.beloeb}
                                    onChange={(e) => setQuickAdd({ ...quickAdd, beloeb: e.target.value })}
                                    className="w-full h-[30px] px-2 text-right border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">Opkrævet den</label>
                                <input
                                    type="date"
                                    value={quickAdd.dato_opkraevet}
                                    onChange={(e) => setQuickAdd({ ...quickAdd, dato_opkraevet: e.target.value })}
                                    className="w-full h-[30px] px-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">Anmeldt af</label>
                                <input
                                    type="text"
                                    value={quickAdd.anmeldt}
                                    onChange={(e) => setQuickAdd({ ...quickAdd, anmeldt: e.target.value })}
                                    className="w-full h-[30px] px-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">Kontaktperson</label>
                                <select
                                    value={quickAdd.kontaktperson_id}
                                    onChange={(e) => setQuickAdd({ ...quickAdd, kontaktperson_id: e.target.value })}
                                    className="w-full h-[30px] px-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                                >
                                    <option value="">Vælg bruger...</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-1">
                                <button
                                    onClick={handleQuickAdd}
                                    disabled={isSaving || !quickAdd.sagsidentification || !quickAdd.beloeb}
                                    className="w-full h-[30px] px-4 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 transition-colors font-semibold flex items-center justify-center gap-2 uppercase shadow-sm"
                                >
                                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                    Tilføj
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto rounded-lg border border-gray-200 shadow-sm mt-4">
                        <table className="w-full text-left border-collapse min-w-[1400px]">
                            <thead className="sticky top-0 z-10 shadow-sm">
                                <tr className="bg-gray-800 text-white text-[11px]">
                                    <th className="px-3 py-2 font-semibold uppercase w-48 tracking-wider">Sagsid.</th>
                                    <th className="px-3 py-2 font-semibold uppercase w-32 text-right tracking-wider">Beløb</th>
                                    <th className="px-3 py-2 font-semibold uppercase w-36 tracking-wider">Opkrævet</th>
                                    <th className="px-3 py-2 font-semibold uppercase w-36 tracking-wider">Modtaget</th>
                                    <th className="px-3 py-2 font-semibold uppercase w-36 tracking-wider">Anmeldt af</th>
                                    <th className="px-3 py-2 font-semibold uppercase w-36 tracking-wider">Dok. anmeldt</th>
                                    <th className="px-3 py-2 font-semibold uppercase w-48 tracking-wider">Kontaktperson</th>
                                    <th className="px-3 py-2 font-semibold uppercase w-24 text-center tracking-wider">Afregnet</th>
                                    <th className="px-3 py-2 font-semibold uppercase w-36 tracking-wider">Afregnet den</th>
                                    <th className="px-3 py-2 font-semibold uppercase w-12 text-center tracking-wider"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoadingLines && (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-12 text-center">
                                            <Loader2 className="animate-spin text-purple-400 mx-auto" size={28} />
                                        </td>
                                    </tr>
                                )}

                                {filteredLines.map(line => (
                                    <tr key={line.id} className="border-b border-gray-200 hover:bg-gray-100 transition-colors text-xs">
                                        <td className="px-3 py-2">
                                            <input
                                                type="text"
                                                value={line.sagsidentification || ''}
                                                onChange={(e) => setLines(prev => prev.map(l => l.id === line.id ? { ...l, sagsidentification: e.target.value } : l))}
                                                onBlur={() => handleUpdateLine(line.id, { sagsidentification: line.sagsidentification })}
                                                className="w-full bg-transparent border-none p-0 focus:ring-0 font-semibold text-gray-900"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <input
                                                type="number"
                                                value={line.beloeb || ''}
                                                onChange={(e) => setLines(prev => prev.map(l => l.id === line.id ? { ...l, beloeb: e.target.value } : l))}
                                                onBlur={() => handleUpdateLine(line.id, { beloeb: line.beloeb })}
                                                className="w-full bg-transparent border-none p-0 focus:ring-0 text-right font-bold text-gray-900"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="date"
                                                value={line.dato_opkraevet || ''}
                                                onChange={(e) => setLines(prev => prev.map(l => l.id === line.id ? { ...l, dato_opkraevet: e.target.value || null } : l))}
                                                onBlur={() => handleUpdateLine(line.id, { dato_opkraevet: line.dato_opkraevet })}
                                                className="w-full bg-transparent border-none p-0 focus:ring-0"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="date"
                                                value={line.dato_modtaget || ''}
                                                onChange={(e) => setLines(prev => prev.map(l => l.id === line.id ? { ...l, dato_modtaget: e.target.value || null } : l))}
                                                onBlur={() => handleUpdateLine(line.id, { dato_modtaget: line.dato_modtaget })}
                                                className="w-full bg-transparent border-none p-0 focus:ring-0"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="text"
                                                value={line.anmeldt || ''}
                                                onChange={(e) => setLines(prev => prev.map(l => l.id === line.id ? { ...l, anmeldt: e.target.value } : l))}
                                                onBlur={() => handleUpdateLine(line.id, { anmeldt: line.anmeldt })}
                                                className="w-full bg-transparent border-none p-0 focus:ring-0"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="date"
                                                value={line.dato_dokument_anmeldt || ''}
                                                onChange={(e) => setLines(prev => prev.map(l => l.id === line.id ? { ...l, dato_dokument_anmeldt: e.target.value || null } : l))}
                                                onBlur={() => handleUpdateLine(line.id, { dato_dokument_anmeldt: line.dato_dokument_anmeldt })}
                                                className="w-full bg-transparent border-none p-0 focus:ring-0"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <select
                                                value={line.kontaktperson || ''}
                                                onChange={(e) => handleUpdateLine(line.id, { kontaktperson_id: e.target.value ? parseInt(e.target.value) : null } as any)}
                                                className="w-full bg-transparent border-none p-0 focus:ring-0"
                                            >
                                                <option value="">Vælg...</option>
                                                {users.map(u => (
                                                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <input
                                                type="checkbox"
                                                checked={line.afregnet_skat}
                                                onChange={(e) => {
                                                    const today = dayjs().format('YYYY-MM-DD');
                                                    handleUpdateLine(line.id, {
                                                        afregnet_skat: e.target.checked,
                                                        dato_afregnet_skat: e.target.checked ? today : null
                                                    });
                                                }}
                                                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="date"
                                                disabled={!line.afregnet_skat}
                                                value={line.dato_afregnet_skat || ''}
                                                onChange={(e) => setLines(prev => prev.map(l => l.id === line.id ? { ...l, dato_afregnet_skat: e.target.value || null } : l))}
                                                onBlur={() => handleUpdateLine(line.id, { dato_afregnet_skat: line.dato_afregnet_skat })}
                                                className={`w-full bg-transparent border-none p-0 focus:ring-0 ${!line.afregnet_skat ? 'opacity-30' : ''}`}
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Er du sikker på at du vil slette denne tinglysningsafgift?')) {
                                                        handleDeleteLine(line.id);
                                                    }
                                                }}
                                                className="p-1 text-gray-300 hover:text-red-600 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {!isLoadingLines && filteredLines.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-12 text-center text-gray-400 italic">
                                            Ingen tinglysningsafgifter fundet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PunktafgiftTab;
