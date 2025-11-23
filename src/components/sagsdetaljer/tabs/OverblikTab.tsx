// --- Fil: src/components/sagsdetaljer/tabs/OverblikTab.tsx ---
// @# 2025-11-22 17:45 - Oprettet OverblikTab som dashboard for sagen.
// @# 2025-11-23 10:00 - Tilføjet 'onEditStamdata' og flyttet rediger-ikon hertil.
// @# 2025-11-23 14:00 - Tilføjet status-dropdown for direkte redigering.
import React, { ChangeEvent } from 'react';
import { Sag, Status } from '../../../types';
import { 
    CheckCircle2, AlertCircle, Building2, Landmark, 
    User, LifeBuoy, Waves, MapPin, Building, Edit 
} from 'lucide-react';
import { TabType } from '../SagsdetaljerLayout';

interface OverblikTabProps {
    sag: Sag;
    // @# Nye props
    statusser: Status[];
    onNavigateToTab: (tab: TabType) => void;
    onEditStamdata: () => void;
    onStatusChange: (nyStatusId: string) => void;
}

interface StatusCardProps {
    label: string;
    icon: any;
    isOk: boolean;
    onClick: () => void;
}

const StatusCard = ({ label, icon: Icon, isOk, onClick }: StatusCardProps) => (
    <div
        onClick={onClick}
        className={`
            p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md flex items-center justify-between
            ${isOk ? 'bg-white border-gray-200' : 'bg-red-50 border-red-200'}
        `}
    >
        <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${isOk ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                <Icon size={20} />
            </div>
            <span className={`font-medium ${isOk ? 'text-gray-700' : 'text-red-700'}`}>{label}</span>
        </div>
        {isOk ? (
            <CheckCircle2 size={20} className="text-green-500" />
        ) : (
            <AlertCircle size={20} className="text-red-500" />
        )}
    </div>
);

function OverblikTab({ sag, statusser, onNavigateToTab, onEditStamdata, onStatusChange }: OverblikTabProps) {
    
    const maeglerOk = !!sag.maegler_virksomhed;
    const bankOk = !!sag.bank_virksomhed;
    const saelgereOk = sag.saelgere && sag.saelgere.length > 0;
    const forsyningOk = !!sag.vand_virksomhed && !!sag.varme_virksomhed && !!sag.spildevand_virksomhed;
    const kommuneOk = !!sag.kommunekode; 
    const raadgiverOk = sag.raadgiver_tilknytninger && sag.raadgiver_tilknytninger.length > 0;

    // Handler for select
    const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
        onStatusChange(e.target.value);
    };

    return (
        <div className="space-y-8">
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h2 className="text-lg font-bold text-gray-800">Stamdata</h2>
                    <button 
                        onClick={onEditStamdata}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded-full flex items-center gap-1 text-sm font-normal transition-colors"
                        title="Rediger stamdata"
                    >
                        <Edit size={16} />
                        <span>Rediger</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-semibold">Adresse</label>
                        <p className="text-gray-900 text-lg">{sag.fuld_adresse || '-'}</p>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-semibold">Sagsnummer & Alias</label>
                        <p className="text-gray-900 text-lg">{sag.sags_nr} - {sag.alias}</p>
                    </div>
                    
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-semibold">Boligtype</label>
                        <p className="text-gray-900">{sag.bolig_type || '-'}</p>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-semibold">Matrikel</label>
                        <p className="text-gray-900">{sag.bolig_matrikel || '-'}</p>
                    </div>

                    {/* Status (Nu redigerbar) */}
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-semibold">Nuværende Status</label>
                        <div className="mt-1">
                            <select 
                                value={sag.status?.id || ''} 
                                onChange={handleSelectChange}
                                className={`
                                    w-full md:w-auto p-2 border rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none
                                    ${sag.status?.status_kategori === 9 ? 'bg-red-50 text-red-800 border-red-200' : 'bg-green-50 text-green-800 border-green-200'}
                                `}
                            >
                                {statusser.map(s => (
                                    <option key={s.id} value={s.id}>{s.status_nummer} - {s.beskrivelse}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-semibold">Hovedansvarlig</label>
                        <p className="text-gray-900">{sag.hovedansvarlige || '-'}</p>
                    </div>

                    <div className="md:col-span-2">
                        <label className="text-xs text-gray-500 uppercase font-semibold">Kommentar</label>
                        <p className="text-gray-700 italic bg-gray-50 p-3 rounded mt-1 border border-gray-100">
                            {sag.kommentar || 'Ingen kommentarer.'}
                        </p>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4">Status på relationer</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatusCard label="Mægler" icon={Building2} isOk={maeglerOk} onClick={() => onNavigateToTab('maegler')} />
                    <StatusCard label="Sælgere" icon={User} isOk={saelgereOk} onClick={() => onNavigateToTab('saelgere')} />
                    <StatusCard label="Købere" icon={User} isOk={false} onClick={() => onNavigateToTab('koebere')} /> 
                    <StatusCard label="Bank" icon={Landmark} isOk={bankOk} onClick={() => onNavigateToTab('bank')} />
                    <StatusCard label="Rådgivere" icon={LifeBuoy} isOk={raadgiverOk} onClick={() => onNavigateToTab('raadgivere')} />
                    <StatusCard label="Forsyning" icon={Waves} isOk={forsyningOk} onClick={() => onNavigateToTab('forsyning')} />
                    <StatusCard label="Kommune" icon={MapPin} isOk={kommuneOk} onClick={() => onNavigateToTab('kommune')} />
                    <StatusCard label="Forening" icon={Building} isOk={false} onClick={() => onNavigateToTab('forening')} />
                </div>
            </div>
        </div>
    );
}

export default OverblikTab;