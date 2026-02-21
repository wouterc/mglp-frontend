import React, { ChangeEvent, useState, useEffect } from 'react';
import { Sag, Status } from '../../../types';
import {
    CheckCircle2, AlertCircle, Building2, Landmark,
    User, LifeBuoy, Waves, MapPin, Building, Edit, Copy, Check, Loader2, Save
} from 'lucide-react';
import { TabType } from '../SagsdetaljerLayout';
import { SagService } from '../../../services/SagService';
// useDebounce ikke længere i brug

interface OverblikTabProps {
    sag: Sag;
    // @# Nye props
    statusser: Status[];
    onNavigateToTab: (tab: TabType) => void;
    onEditStamdata: () => void;
    onStatusChange: (nyStatusId: string) => void;
    onUpdate: () => void;
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
            p-3 rounded-lg border shadow-sm cursor-pointer transition-all hover:shadow-md flex items-center justify-between
            ${isOk ? 'bg-white border-gray-300' : 'bg-red-50 border-red-200'}
        `}
    >
        <div className="flex items-center space-x-3">
            <div className={`p-1.5 rounded-full ${isOk ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                <Icon size={18} />
            </div>
            <span className={`font-medium text-sm ${isOk ? 'text-gray-700' : 'text-red-700'}`}>{label}</span>
        </div>
        {isOk ? (
            <CheckCircle2 size={18} className="text-green-500" />
        ) : (
            <AlertCircle size={18} className="text-red-500" />
        )}
    </div>
);

function OverblikTab({ sag, statusser, onNavigateToTab, onEditStamdata, onStatusChange, onUpdate }: OverblikTabProps) {

    const maeglerOk = !!sag.maegler_virksomhed;
    const bankOk = !!sag.bank_virksomhed;
    const saelgereOk = sag.saelgere && sag.saelgere.length > 0;
    const forsyningOk = !!sag.vand_virksomhed && !!sag.varme_virksomhed && !!sag.spildevand_virksomhed;
    const kommuneOk = !!sag.kommunekode;
    const raadgiverOk = sag.raadgiver_tilknytninger && sag.raadgiver_tilknytninger.length > 0;

    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [localComment, setLocalComment] = useState(sag.kommentar || '');
    const [isSavingComment, setIsSavingComment] = useState(false);

    // Tjek om der er ændringer
    const erAendret = localComment !== (sag.kommentar || '');

    useEffect(() => {
        setLocalComment(sag.kommentar || '');
    }, [sag.kommentar]);

    const handleSaveComment = async () => {
        setIsSavingComment(true);
        try {
            await SagService.updateSag(sag.id, { kommentar: localComment });
            onUpdate(); // Opdater parent
        } catch (error) {
            console.error("Fejl ved gemning af kommentar:", error);
        } finally {
            setIsSavingComment(false);
        }
    };

    const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
        onStatusChange(e.target.value);
    };

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(key);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    const CopyButton = ({ text, id }: { text: string, id: string }) => (
        <button
            onClick={() => handleCopy(text, id)}
            className="mr-1.5 p-0.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors inline-flex items-center"
            title="Kopier"
        >
            {copiedId === id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
        </button>
    );

    return (
        <div className="space-y-6">

            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-300">
                <div className="flex justify-between items-center mb-1 border-b border-gray-100 pb-2">
                    <h2 className="text-lg font-bold text-gray-800">Stamdata</h2>
                    <button
                        onClick={onEditStamdata}
                        className="p-1 px-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md flex items-center gap-1.5 text-sm font-medium transition-colors"
                        title="Rediger stamdata"
                    >
                        <Edit size={14} />
                        <span>Rediger</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2">
                    {/* Rad 1: Adresse og Sagsnr */}
                    <div className="md:col-span-2">
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Adresse</div>
                        <div className="flex items-center">
                            {sag.fuld_adresse && <CopyButton text={sag.fuld_adresse} id="adresse" />}
                            <p className="text-gray-900 text-base font-medium truncate" title={sag.fuld_adresse || ''}>{sag.fuld_adresse || '-'}</p>
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Sagsnummer & Alias</div>
                        <div className="flex items-center">
                            <CopyButton text={`${sag.sags_nr}`} id="sagsnr" />
                            <p className="text-gray-900 text-base font-medium truncate">{sag.sags_nr} - {sag.alias}</p>
                        </div>
                    </div>

                    {/* Rad 2: Property Basic */}
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Boligtype</div>
                        <p className="text-gray-900 text-sm font-medium">{sag.bolig_type_obj?.navn || sag.bolig_type || '-'}</p>
                    </div>
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Matrikel</div>
                        <p className="text-gray-900 text-sm font-medium">{sag.bolig_matrikel || '-'}</p>
                    </div>
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">BFE Nummer</div>
                        <p className="text-gray-900 text-sm font-medium">{sag.bolig_bfe || '-'}</p>
                    </div>
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Kommune / Region</div>
                        <p className="text-gray-900 text-sm font-medium">
                            {sag.kommunekode || '-'} / {sag.regionsnr || '-'}
                        </p>
                    </div>

                    {/* Rad 3: Ansvarlig, Mail, Status */}
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Hovedansvarlig</div>
                        <p className="text-gray-900 text-sm font-medium">{sag.hovedansvarlige || '-'}</p>
                    </div>
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Standard mail-konto</div>
                        <p className="text-gray-900 text-sm font-medium truncate" title={sag.standard_outlook_account_details?.email_address || ''}>
                            {sag.standard_outlook_account_details ? `${sag.standard_outlook_account_details.account_name}` : '-'}
                        </p>
                    </div>
                    {/* Rad 4: Status, Bolig Link og BBR */}
                    <div>
                        <label htmlFor="status_select" className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Nuværende Status</label>
                        <div className="mt-0.5">
                            <select
                                id="status_select"
                                name="status_select"
                                value={sag.status?.id || ''}
                                onChange={handleSelectChange}
                                className={`
                                    w-full p-0.5 border rounded text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none
                                    ${sag.status?.status_kategori === 9 ? 'bg-red-50 text-red-800 border-red-200' : 'bg-green-50 text-green-800 border-green-200'}
                                `}
                            >
                                {statusser.filter(s => s.aktiv || s.id === sag.status?.id).map(s => (
                                    <option key={s.id} value={s.id}>{s.status_nummer} - {s.beskrivelse}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Bolig system</div>
                        <div className="flex items-center">
                            {sag.bolig_link && <CopyButton text={sag.bolig_link} id="bolig_link" />}
                            {sag.bolig_link ? (
                                <a
                                    href={sag.bolig_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-sm font-medium truncate"
                                    title={sag.bolig_link}
                                >
                                    {sag.bolig_link}
                                </a>
                            ) : (
                                <p className="text-gray-900 text-sm font-medium">-</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">BBR Anvendelse</div>
                        <p className="text-gray-900 text-sm font-medium truncate" title={sag.bolig_anvendelse ? `${sag.bolig_anvendelse.kode} - ${sag.bolig_anvendelse.beskrivelse}` : '-'}>
                            {sag.bolig_anvendelse ? `${sag.bolig_anvendelse.kode} - ${sag.bolig_anvendelse.beskrivelse}` : '-'}
                        </p>
                    </div>

                    {/* Sagsnumre sektion - Samlet på én række (3 kolonner) */}
                    {(sag.maegler_sagsnr || sag.bank_sagsnr || sag.raadgiver_sagsnr) && (
                        <div className="md:col-span-2 pt-2 mt-0 border-t border-gray-100">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Mægler sagsnr.</div>
                                    <div className="flex items-center">
                                        <CopyButton text={sag.maegler_sagsnr || ''} id="maegler-sagsnr" />
                                        <p className="text-gray-900 text-sm font-medium truncate">{sag.maegler_sagsnr || '-'}</p>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Bank sagsnr.</div>
                                    <div className="flex items-center">
                                        <CopyButton text={sag.bank_sagsnr || ''} id="bank-sagsnr" />
                                        <p className="text-gray-900 text-sm font-medium truncate">{sag.bank_sagsnr || '-'}</p>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Rådgiver sagsnr.</div>
                                    <div className="flex items-center">
                                        <CopyButton text={sag.raadgiver_sagsnr || ''} id="raadgiver-sagsnr" />
                                        <p className="text-gray-900 text-sm font-medium truncate">{sag.raadgiver_sagsnr || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="md:col-span-3 mt-0">
                        <div className="flex items-center gap-2 mb-0.5 min-h-[20px]">
                            <label htmlFor="kommentar_textarea" className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Kommentar</label>
                            {erAendret && (
                                <button
                                    onClick={handleSaveComment}
                                    disabled={isSavingComment}
                                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2 py-0.5 rounded transition-colors shadow-sm"
                                    title="Gem kommentar"
                                >
                                    {isSavingComment ? (
                                        <>
                                            <Loader2 size={10} className="animate-spin" />
                                            <span>Gemmer...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save size={10} />
                                            <span>Gem</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                        <textarea
                            id="kommentar_textarea"
                            name="kommentar"
                            value={localComment}
                            onChange={(e) => setLocalComment(e.target.value)}
                            placeholder="Skriv en kommentar..."
                            className={`
                                w-full text-gray-700 text-sm bg-gray-50 p-2 rounded border outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white transition-all resize-none min-h-[40px]
                                ${erAendret ? 'border-blue-300 bg-white' : 'border-gray-200'}
                            `}
                        />
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">Status på relationer</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
