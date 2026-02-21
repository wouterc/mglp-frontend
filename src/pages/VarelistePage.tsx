import {
    PlusCircle,
    UploadCloud,
    Download,
    Loader2,
    FilterX,
    Edit,
    Trash2
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Vareliste, Varetype, Blokinfo } from '../types';
import { VarelisteService } from '../services/VarelisteService';
import { LookupService } from '../services/LookupService';
import SearchableSelect from '../components/SearchableSelect';
import Modal from '../components/Modal';
import { useAppState } from '../StateContext';

export const VarelistePage: React.FC = () => {
    const { state } = useAppState(); // For consistent styling access if needed
    const [varer, setVarer] = useState<Vareliste[]>([]);
    const [varetyper, setVaretyper] = useState<Varetype[]>([]);
    const [blokinfo, setBlokinfo] = useState<Blokinfo[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterVarenummer, setFilterVarenummer] = useState('');
    const [filterTitel, setFilterTitel] = useState('');
    const [filterItemgruppe, setFilterItemgruppe] = useState<string>('');
    const [filterVaretype, setFilterVaretype] = useState<string>('');

    // Import state
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVare, setEditingVare] = useState<Partial<Vareliste>>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [varerData, varetyperData, blokinfoData] = await Promise.all([
                VarelisteService.getAll(),
                VarelisteService.getVaretyper(),
                LookupService.getBlokinfoSkabeloner()
            ]);
            setVarer(varerData);
            setVaretyper(varetyperData);
            // Filter BlokInfo to only show proper item groups (formaal=1) if API doesn't already
            setBlokinfo(blokinfoData.filter(b => b.formaal === 1));
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (editingVare.id) {
                await VarelisteService.update(editingVare.id, editingVare);
            } else {
                await VarelisteService.create(editingVare);
            }
            setIsModalOpen(false);
            loadData();
        } catch (error) {
            console.error("Error saving vare:", error);
            alert("Fejl under gemning");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Er du sikker på at du vil slette denne vare?")) return;
        try {
            await VarelisteService.delete(id);
            loadData();
        } catch (error) {
            console.error("Error deleting vare:", error);
        }
    };

    const handleExport = async () => {
        try {
            const blob = await VarelisteService.exportExcel();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'vareliste.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exporting:", error);
            alert("Fejl under eksport");
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const result = await VarelisteService.importExcel(file);
            alert(`Import fuldført.\nOprettet: ${result.created}\nOpdateret: ${result.updated}`);
            loadData();
        } catch (error) {
            console.error("Error importing:", error);
            alert("Fejl under import: " + error);
        }
        // Reset valued to allow selecting same file again
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleResetFilters = () => {
        setFilterVarenummer('');
        setFilterTitel('');
        setFilterItemgruppe('');
        setFilterVaretype('');
    };

    const filteredVarer = varer.filter(v => {
        const matchesVarenummer = filterVarenummer === '' ||
            (v.varenummer && v.varenummer.toString().includes(filterVarenummer));

        const matchesTitel = filterTitel === '' ||
            v.titel.toLowerCase().includes(filterTitel.toLowerCase());

        const matchesItemgruppe = filterItemgruppe === '' ||
            v.itemgruppe_id === Number(filterItemgruppe) ||
            v.itemgruppe?.id === Number(filterItemgruppe);

        const matchesVaretype = filterVaretype === '' ||
            v.varetype_id === Number(filterVaretype) ||
            v.varetype?.id === Number(filterVaretype);

        return matchesVarenummer && matchesTitel && matchesItemgruppe && matchesVaretype;
    });

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    Vareliste
                </h2>
                <div className="flex space-x-2">
                    {/* Reset Filters */}
                    {(filterVarenummer || filterTitel || filterItemgruppe || filterVaretype) && (
                        <button
                            onClick={handleResetFilters}
                            className="p-2 bg-white text-red-600 border border-gray-300 rounded-full hover:bg-gray-50"
                            title="Nulstil filtre"
                        >
                            <FilterX size={20} />
                        </button>
                    )}

                    {/* Export */}
                    <button
                        onClick={handleExport}
                        className="p-2 bg-white text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50"
                        title="Eksportér til Excel"
                    >
                        <Download size={20} />
                    </button>

                    {/* Import */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 bg-white text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50"
                        title="Importer fra Excel"
                    >
                        <UploadCloud size={20} />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".xlsx"
                        onChange={handleImport}
                    />

                    {/* Create */}
                    <button
                        onClick={() => { setEditingVare({ aktiv: true } as Vareliste); setIsModalOpen(true); }}
                        className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                        title="Opret Vare"
                    >
                        <PlusCircle size={20} />
                    </button>
                </div>
            </div>

            {loading ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div> : (
                <div className="overflow-x-auto rounded-lg shadow-md">
                    <table className="min-w-full bg-white table-fixed">
                        <thead className="bg-gray-800 text-white text-sm">
                            <tr>
                                <th className="text-left py-1 px-2 uppercase font-semibold w-[15%]">Varenummer</th>
                                <th className="text-left py-1 px-2 uppercase font-semibold w-[25%]">Titel</th>
                                <th className="text-left py-1 px-2 uppercase font-semibold w-[20%]">Varetype</th>
                                <th className="text-left py-1 px-2 uppercase font-semibold w-[20%]">Itemgruppe</th>
                                <th className="text-right py-1 px-2 uppercase font-semibold w-[10%]">Pris</th>
                                <th className="text-right py-1 px-2 uppercase font-semibold w-[10%]">Handlinger</th>
                            </tr>
                            <tr>
                                <th className="p-1">
                                    <input
                                        type="text"
                                        value={filterVarenummer}
                                        onChange={e => setFilterVarenummer(e.target.value)}
                                        placeholder="Filtrer..."
                                        className="w-full text-black px-1 py-0.5 text-sm rounded-sm border"
                                    />
                                </th>
                                <th className="p-1">
                                    <input
                                        type="text"
                                        value={filterTitel}
                                        onChange={e => setFilterTitel(e.target.value)}
                                        placeholder="Filtrer..."
                                        className="w-full text-black px-1 py-0.5 text-sm rounded-sm border"
                                    />
                                </th>
                                <th className="p-1">
                                    <select
                                        value={filterVaretype}
                                        onChange={e => setFilterVaretype(e.target.value)}
                                        className="w-full text-black px-1 py-0.5 text-sm rounded-sm border bg-white"
                                    >
                                        <option value="">Alle...</option>
                                        {varetyper.map(vt => (
                                            <option key={vt.id} value={vt.id}>{vt.navn}</option>
                                        ))}
                                    </select>
                                </th>
                                <th className="p-1">
                                    <select
                                        value={filterItemgruppe}
                                        onChange={e => setFilterItemgruppe(e.target.value)}
                                        className="w-full text-black px-1 py-0.5 text-sm rounded-sm border bg-white"
                                    >
                                        <option value="">Alle...</option>
                                        {blokinfo.map(b => (
                                            <option key={b.id} value={b.id}>{b.nr} - {b.titel_kort}</option>
                                        ))}
                                    </select>
                                </th>
                                <th className="p-1"></th>
                                <th className="p-1"></th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 text-sm">
                            {filteredVarer.map(vare => (
                                <tr key={vare.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="py-1 px-2 whitespace-nowrap">{vare.varenummer || '-'}</td>
                                    <td className="py-1 px-2 whitespace-nowrap font-medium text-gray-900">{vare.titel}</td>
                                    <td className="py-1 px-2 whitespace-nowrap text-gray-500">{vare.varetype?.navn || '-'}</td>
                                    <td className="py-1 px-2 whitespace-nowrap text-gray-500">{vare.itemgruppe?.titel_kort || vare.itemgruppe?.nr || '-'}</td>
                                    <td className="py-1 px-2 whitespace-nowrap text-right text-gray-900">{vare.pris_ex_moms ? `${vare.pris_ex_moms} kr.` : '-'}</td>
                                    <td className="py-1 px-2 whitespace-nowrap text-right">
                                        <div className="flex justify-end gap-1">
                                            <button
                                                onClick={() => { setEditingVare(vare); setIsModalOpen(true); }}
                                                className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                                                title="Rediger"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(vare.id)}
                                                className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                                                title="Slet"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredVarer.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-gray-500 italic">
                                        Ingen varer fundet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingVare.id ? "Rediger Vare" : "Opret Vare"} maxWidth="max-w-xl">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Varenummer</label>
                            <input
                                type="number"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                value={editingVare.varenummer || ''}
                                onChange={e => setEditingVare({ ...editingVare, varenummer: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Pris ex. moms</label>
                            <input
                                type="number"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                value={editingVare.pris_ex_moms || ''}
                                onChange={e => setEditingVare({ ...editingVare, pris_ex_moms: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Titel</label>
                        <input
                            type="text"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={editingVare.titel || ''}
                            onChange={e => setEditingVare({ ...editingVare, titel: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Varetype</label>
                        <select
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={editingVare.varetype_id || editingVare.varetype?.id || ''}
                            onChange={e => setEditingVare({ ...editingVare, varetype_id: Number(e.target.value) })}
                        >
                            <option value="">Vælg type...</option>
                            {varetyper.map(vt => (
                                <option key={vt.id} value={vt.id}>{vt.navn}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Itemgruppe</label>
                        <SearchableSelect
                            options={blokinfo.map(b => ({ id: b.id, label: `${b.nr} - ${b.titel_kort || b.beskrivelse || ''}` }))}
                            value={editingVare.itemgruppe_id || editingVare.itemgruppe?.id || null}
                            onChange={(newValue) => setEditingVare({ ...editingVare, itemgruppe_id: newValue })}
                            placeholder="Søg efter itemgruppe..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Kommentar</label>
                        <textarea
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={editingVare.kommentar || ''}
                            onChange={e => setEditingVare({ ...editingVare, kommentar: e.target.value })}
                            rows={3}
                        />
                    </div>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            checked={editingVare.aktiv ?? true}
                            onChange={e => setEditingVare({ ...editingVare, aktiv: e.target.checked })}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-900">Aktiv</label>
                    </div>
                </div>
                <div className="mt-5 sm:mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsModalOpen(false)}
                    >
                        Annuller
                    </button>
                    <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:text-sm"
                        onClick={handleSave}
                    >
                        Gem
                    </button>
                </div>
            </Modal>
        </div>
    );
};
