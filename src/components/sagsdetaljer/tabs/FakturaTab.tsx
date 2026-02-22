// --- Fil: src/components/sagsdetaljer/tabs/FakturaTab.tsx ---
import React, { useState, useEffect, useMemo } from 'react';
import { ReceiptText, Search, Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { Sag, FakturaLine, Status, Vareliste } from '../../../types';
import { SagService } from '../../../services/SagService';
import { LookupService } from '../../../services/LookupService';
import dayjs from 'dayjs';
import 'dayjs/locale/da';
import ConfirmModal from '../../ui/ConfirmModal';

dayjs.locale('da');

// Redundant local interface removed in favor of global types.ts

const FakturaTab: React.FC<{ sag: Sag; onUpdate?: () => void }> = ({ sag, onUpdate }) => {
    const [lines, setLines] = useState<FakturaLine[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [availableItems, setAvailableItems] = useState<Vareliste[]>([]);
    const [isLoadingLines, setIsLoadingLines] = useState(true); // Kun til linjer-listen
    const [isSaving, setIsSaving] = useState(false);

    // Alert Modal State
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string }>({
        isOpen: false,
        title: '',
        message: ''
    });

    // Filtre og søgning
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [itemFilter, setItemFilter] = useState<string>('all');

    // Quick add state
    const [quickAdd, setQuickAdd] = useState({
        vare_id: '',
        beskrivelse: '',
        pris: '',
        dato: dayjs().format('YYYY-MM-DD'),
        faktura_nummer: '',
        kommentar: ''
    });

    // Item selection search state
    const [itemSearchText, setItemSearchText] = useState('');
    const [showItemSuggestions, setShowItemSuggestions] = useState(false);

    const inputRef = React.useRef<HTMLInputElement>(null);

    // Fjernede redundant local edit state til fordel for direkte felt-opdatering
    // (for at undgå fokus-problemer og gøre det mere intuitivt)

    useEffect(() => {
        fetchData();
    }, [sag.id]);

    const fetchData = async () => {
        setIsLoadingLines(true);
        try {
            const [linesData, itemsData, statusData] = await Promise.all([
                SagService.getFakturaLines(sag.id),
                LookupService.getVareliste(),
                LookupService.getStatusser(4)
            ]);

            setLines(linesData);
            setStatuses(statusData);

            // Filtrer varer baseret på sagens processer
            const sagsProcesIds = sag.valgte_processer?.map(p => p.id) || [];
            const filteredItems = itemsData.filter((item: any) =>
                !item.itemgruppe?.id || sagsProcesIds.includes(item.itemgruppe.id)
            );
            setAvailableItems(filteredItems);
        } catch (error) {
            console.error("Fejl ved hentning af fakturadata:", error);
        } finally {
            setIsLoadingLines(false);
        }
    };

    const handleQuickAdd = async () => {
        if (!quickAdd.beskrivelse || !quickAdd.pris) {
            setAlertModal({
                isOpen: true,
                title: 'Manglende oplysninger',
                message: 'Beskrivelse og pris er påkrævet for at tilføje en fakturalinje.'
            });
            return;
        }

        setIsSaving(true);
        try {
            const newLine = await SagService.createFakturaLine({
                sag: sag.id,
                vare_id: quickAdd.vare_id || null,
                beskrivelse: quickAdd.beskrivelse,
                pris: quickAdd.pris,
                dato: quickAdd.dato,
                faktura_nummer: quickAdd.faktura_nummer,
                kommentar: quickAdd.kommentar
            });

            // Opdater listen lokalt uden at genhente alt
            setLines(prev => [newLine, ...prev]);

            setQuickAdd({
                vare_id: '',
                beskrivelse: '',
                pris: '',
                dato: dayjs().format('YYYY-MM-DD'),
                faktura_nummer: '',
                kommentar: ''
            });
            setItemSearchText('');
        } catch (error) {
            console.error("Fejl ved oprettelse af fakturalinje:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleItemSelect = (itemId: string) => {
        const item = availableItems.find(i => i.id.toString() === itemId);
        if (item) {
            setQuickAdd(prev => ({
                ...prev,
                vare_id: itemId,
                beskrivelse: item.titel,
                pris: item.pris_ex_moms?.toString() || ''
            }));
            setItemSearchText(item.varenummer ? `[${item.varenummer}] ${item.titel}` : item.titel);
        } else {
            setQuickAdd(prev => ({
                ...prev,
                vare_id: '',
                beskrivelse: '',
                pris: ''
            }));
            setItemSearchText('');
        }
        setShowItemSuggestions(false);
    };

    const itemSuggestions = useMemo(() => {
        if (!itemSearchText || itemSearchText.length < 1) return [];

        // Hvis vi har valgt en vare, og søgeteksten matcher dens "visningsnavn", skal vi ikke vise forslag
        const selectedItem = availableItems.find(i => i.id.toString() === quickAdd.vare_id);
        const selectedDisplayName = selectedItem ? (selectedItem.varenummer ? `[${selectedItem.varenummer}] ${selectedItem.titel}` : selectedItem.titel) : '';
        if (itemSearchText === selectedDisplayName) return [];

        return availableItems.filter(item => {
            const search = itemSearchText.toLowerCase();
            const matchesTitel = item.titel.toLowerCase().includes(search);
            const matchesNr = item.varenummer?.toString().includes(search);
            return matchesTitel || matchesNr;
        }).slice(0, 10); // Begræns til 10 forslag
    }, [availableItems, itemSearchText, quickAdd.vare_id]);

    const handleUpdateLine = async (id: number, data: Partial<FakturaLine>) => {
        const line = lines.find(l => l.id === id);
        if (!line) return;

        let finalData = { ...data };

        // REGEL: Hvis man forsøger at sætte status til Annulleret (status_nummer 99)
        if (data.status_id) {
            const targetStatus = statuses.find(s => s.id === data.status_id);
            if (targetStatus?.status_nummer === 99 && (line.faktura_nummer || data.faktura_nummer)) {
                setAlertModal({
                    isOpen: true,
                    title: 'Kan ikke annulleres',
                    message: 'Du kan ikke annullere en linje, der har et fakturanummer.'
                });
                // Reset tabellens lokale state så det ikke ser ud som om den skiftede
                setLines(prev => [...prev]);
                return;
            }
        }

        // REGEL: Når man udfylder et fakturanr, skifter status automatisk til 'Faktureret' (20) 
        // hvis den nuværende status er 'Klar til fakturering' (10)
        if (data.faktura_nummer && data.faktura_nummer.trim() !== '') {
            if (line.status?.status_nummer === 10) {
                const faktureretStatus = statuses.find(s => s.status_nummer === 20);
                if (faktureretStatus) {
                    finalData.status_id = faktureretStatus.id;
                }
            }
        }

        setIsSaving(true);
        try {
            const updatedLine = await SagService.updateFakturaLine(id, finalData);
            // Opdater listen lokalt
            setLines(prev => prev.map(l => l.id === id ? updatedLine : l));
        } catch (error) {
            console.error("Fejl ved opdatering af fakturalinje:", error);
            // Ved fejl ruller vi tilbage (genindlæser data)
            fetchData();
        } finally {
            setIsSaving(false);
        }
    };



    const filteredLines = useMemo(() => {
        return lines.filter(line => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch =
                line.beskrivelse.toLowerCase().includes(searchLower) ||
                line.faktura_nummer?.toLowerCase().includes(searchLower) ||
                line.varenummer?.toString().toLowerCase().includes(searchLower) ||
                line.vare?.varenummer?.toString().toLowerCase().includes(searchLower);

            let matchesStatus = false;
            if (statusFilter === 'all') {
                // "Alle statusser" betyder alle undtaget Annulleret
                const statusName = line.status?.beskrivelse?.toLowerCase();
                matchesStatus = statusName !== 'annulleret' && line.status?.status_nummer !== 99;
            } else {
                matchesStatus = line.status?.id.toString() === statusFilter;
            }

            const matchesItem = itemFilter === 'all' || line.vare?.id.toString() === itemFilter;

            return matchesSearch && matchesStatus && matchesItem;
        });
    }, [lines, searchTerm, statusFilter, itemFilter]);

    return (
        <div className="flex-1 flex flex-col min-h-0 h-full">
            <div className="bg-white flex flex-col flex-1 rounded-lg shadow-md border border-gray-300">
                {/* Header med Titel og Filtre */}
                <div className="p-4 border-b border-gray-200">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <ReceiptText className="text-blue-600" />
                                Fakturaliste
                            </h2>
                            <p className="text-gray-500 text-sm">Administrer fakturalinjer for denne sag.</p>
                        </div>

                        <div className="flex flex-wrap gap-2 bg-gray-300 rounded-lg border border-gray-400 p-2">
                            <div className="relative flex-grow md:flex-grow-0">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Søg i listen..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-4 h-[30px] border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white min-w-[200px]"
                                />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                style={{
                                    color: statusFilter !== 'all' ? (statuses.find(s => s.id.toString() === statusFilter)?.farve || '#1F2937') : '#1F2937',
                                    fontWeight: statusFilter !== 'all' ? 'bold' : 'normal'
                                }}
                                className="px-3 h-[30px] border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                            >
                                <option value="all">Alle statusser</option>
                                {statuses.map(s => (
                                    <option key={s.id} value={s.id} style={{ color: s.farve }}>{s.beskrivelse}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="p-4 flex-1 flex flex-col space-y-4">
                    {/* Nye Faktura Section - Filter Box Style */}
                    <div className="p-3 bg-gray-300 rounded-lg border border-gray-400">
                        <h3 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2 uppercase">
                            <Plus size={14} />
                            Ny Faktura
                        </h3>
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="flex-1 min-w-[200px] relative">
                                <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">Vare / Varenummer</label>
                                <input
                                    type="text"
                                    placeholder="Søg nr eller navn..."
                                    value={itemSearchText}
                                    onChange={(e) => {
                                        setItemSearchText(e.target.value);
                                        setShowItemSuggestions(true);
                                        if (!e.target.value) {
                                            setQuickAdd(prev => ({ ...prev, vare_id: '', beskrivelse: '', pris: '' }));
                                        }
                                    }}
                                    onFocus={() => setShowItemSuggestions(true)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && itemSuggestions.length > 0) {
                                            e.preventDefault();
                                            handleItemSelect(itemSuggestions[0].id.toString());
                                        }
                                    }}
                                    className="w-full h-[30px] px-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none bg-white font-medium"
                                />

                                {showItemSuggestions && itemSuggestions.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                                        {itemSuggestions.map((item) => (
                                            <div
                                                key={item.id}
                                                onClick={() => handleItemSelect(item.id.toString())}
                                                className="px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                                            >
                                                <div className="font-medium text-gray-800">
                                                    {item.varenummer ? (
                                                        <span className="text-blue-600 mr-2">[{item.varenummer}]</span>
                                                    ) : null}
                                                    {item.titel}
                                                </div>
                                                {item.pris_ex_moms && (
                                                    <div className="text-xs text-gray-500">Pris: {item.pris_ex_moms} kr.</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Overlay til at lukke listen hvis man klikker udenfor */}
                                {showItemSuggestions && (
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowItemSuggestions(false)}
                                    />
                                )}
                            </div>
                            <div className="w-32">
                                <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">Pris</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={quickAdd.pris}
                                    onChange={(e) => setQuickAdd({ ...quickAdd, pris: e.target.value })}
                                    className="w-full h-[30px] px-2 text-sm border border-gray-300 rounded-md text-right focus:ring-1 focus:ring-blue-500 outline-none bg-white font-medium"
                                />
                            </div>
                            <div className="w-40">
                                <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">Dato</label>
                                <input
                                    type="date"
                                    value={quickAdd.dato}
                                    onChange={(e) => setQuickAdd({ ...quickAdd, dato: e.target.value })}
                                    className="w-full h-[30px] px-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none bg-white font-medium"
                                />
                            </div>
                            <button
                                onClick={handleQuickAdd}
                                disabled={isSaving || !quickAdd.vare_id || !quickAdd.pris || !quickAdd.dato}
                                className="h-[30px] px-6 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-xs font-semibold flex items-center gap-2 shadow-sm uppercase shadow-blue-200"
                            >
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                Tilføj
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto rounded-lg border border-gray-200 shadow-sm mt-4">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10 shadow-sm">
                                <tr className="bg-gray-800 text-white">
                                    <th className="px-4 py-2 text-xs font-semibold uppercase w-32 tracking-wider">Varenummer</th>
                                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider">Beskrivelse</th>
                                    <th className="px-4 py-2 text-xs font-semibold uppercase text-right w-44 tracking-wider">Pris</th>
                                    <th className="px-4 py-2 text-xs font-semibold uppercase w-48 tracking-wider">Dato</th>
                                    <th className="px-4 py-2 text-xs font-semibold uppercase w-40 tracking-wider text-center">Faktura nr.</th>
                                    <th className="px-4 py-2 text-xs font-semibold uppercase w-64 tracking-wider text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody>

                                {/* Loading skeleton */}
                                {isLoadingLines && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center">
                                            <Loader2 className="animate-spin text-blue-400 mx-auto" size={28} />
                                        </td>
                                    </tr>
                                )}

                                {/* List Rows */}
                                {filteredLines.map(line => (
                                    <tr key={line.id} className="border-b border-gray-200 hover:bg-gray-100 transition-colors">
                                        <td className="px-4 py-2 text-xs text-gray-700">
                                            {line.varenummer || line.vare?.varenummer || '-'}
                                        </td>
                                        <td className="px-4 py-2 text-xs text-gray-700">
                                            <div className="font-semibold text-gray-900 mb-1">{line.beskrivelse}</div>
                                            <textarea
                                                placeholder="Tilføj kommentar..."
                                                value={line.kommentar || ''}
                                                rows={1}
                                                ref={(el) => {
                                                    if (el) {
                                                        el.style.height = 'auto';
                                                        el.style.height = el.scrollHeight + 'px';
                                                    }
                                                }}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setLines(prev => prev.map(l => l.id === line.id ? { ...l, kommentar: val } : l));

                                                    // Auto-expand højde
                                                    e.target.style.height = 'auto';
                                                    e.target.style.height = e.target.scrollHeight + 'px';
                                                }}
                                                onBlur={(e) => {
                                                    handleUpdateLine(line.id, { kommentar: line.kommentar });
                                                    // Nulstil højde-override ved blur hvis den er tom
                                                    if (!line.kommentar) e.target.style.height = 'auto';
                                                }}
                                                className="w-full bg-transparent border-none p-0 text-[10px] text-blue-700 italic focus:ring-0 focus:text-blue-900 focus:not-italic placeholder:text-blue-400 transition-colors resize-none overflow-hidden block leading-tight min-h-[14px] break-words"
                                            />
                                        </td>
                                        <td className="px-6 py-2 text-xs text-gray-900 text-right font-bold">
                                            {new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(parseFloat(line.pris))}
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="date"
                                                value={line.dato || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setLines(prev => prev.map(l => l.id === line.id ? { ...l, dato: val } : l));
                                                }}
                                                onBlur={() => handleUpdateLine(line.id, { dato: line.dato })}
                                                className="w-full h-[26px] px-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="text"
                                                placeholder="..."
                                                value={line.faktura_nummer || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setLines(prev => prev.map(l => l.id === line.id ? { ...l, faktura_nummer: val } : l));
                                                }}
                                                onBlur={() => handleUpdateLine(line.id, { faktura_nummer: line.faktura_nummer })}
                                                className="w-full h-[26px] px-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white text-center"
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <select
                                                disabled={isSaving}
                                                value={line.status?.id || ''}
                                                onChange={(e) => handleUpdateLine(line.id, { status_id: parseInt(e.target.value) })}
                                                style={{
                                                    color: line.status?.farve || '#4B5563',
                                                    borderColor: line.status?.farve || '#D1D5DB',
                                                    backgroundColor: (line.status?.farve ? `${line.status.farve}20` : '#F9FAFB'), // 20 is ~12% opacity
                                                    borderWidth: '2px'
                                                }}
                                                className="w-full h-[26px] px-1 text-[10px] font-extrabold uppercase rounded border outline-none transition-all focus:ring-1 focus:ring-offset-1"
                                            >
                                                {statuses.map(s => (
                                                    <option key={s.id} value={s.id}>{s.beskrivelse}</option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                ))}

                                {!isLoadingLines && filteredLines.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-gray-400 italic">
                                            Ingen fakturalinjer fundet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <ConfirmModal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                title={alertModal.title}
                message={alertModal.message}
                confirmText="OK"
                cancelText="" // Skjul annuller knap for rene alerts
            />
        </div>
    );
};

export default FakturaTab;
