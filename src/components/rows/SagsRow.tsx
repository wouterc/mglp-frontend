
import React, { useState, MouseEvent } from 'react';
import { Edit, FileText, ListChecks, Folder, Loader2, Copy, Check, Inbox } from 'lucide-react';
import { Sag, Status, Virksomhed } from '../../types';
import { useNavigate } from 'react-router-dom';

interface SagsRowProps {
    sag: Sag;
    statusser: Status[];
    isExpanded: boolean;
    isCreatingActivities: boolean;
    isCreatingDocuments: boolean;
    onToggleExpand: () => void;
    onStatusChange: (sagId: number, statusId: string) => void;
    onEdit: (sag: Sag) => void;
    onOpretAktiviteter: (sagId: number) => void;
    onOpretDokumenter: (sagId: number) => void;
    navigateTo: (side: string, sag: Sag) => void;
    dispatch: any; // Ideally typed from StateContext, but any for loose coupling here
}

const formatVirksomhedsnavn = (v: Virksomhed | null | undefined): string => {
    if (!v) return '';
    return v.afdeling ? `${v.navn} - ${v.afdeling}` : v.navn;
};

export default function SagsRow({
    sag,
    statusser,
    isExpanded,
    isCreatingActivities,
    isCreatingDocuments,
    onToggleExpand,
    onStatusChange,
    onEdit,
    onOpretAktiviteter,
    onOpretDokumenter,
    navigateTo,
    dispatch
}: SagsRowProps) {
    const navigate = useNavigate();
    const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);

    const handleCopyEmail = (email: string, key: string, e: MouseEvent) => {
        e.stopPropagation();
        if (navigator.clipboard) {
            navigator.clipboard.writeText(email).then(() => {
                setCopiedEmailId(key);
                setTimeout(() => setCopiedEmailId(null), 2000);
            }).catch(err => {
                console.error('Kunne ikke kopiere email:', err);
            });
        }
    };

    return (
        <>
            <tr onClick={onToggleExpand} className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors">
                <td className="py-1 px-2">{sag.sags_nr}</td>
                <td className="py-1 px-2">{sag.alias}</td>
                <td className="py-1 px-2">
                    <select
                        id={`cell-${sag.id}-2`}
                        value={sag.status ? sag.status.id : ''}
                        onChange={(e) => onStatusChange(sag.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 border border-gray-300 rounded-md bg-white w-full text-xs"
                    >
                        {statusser.map(s => (
                            <option key={s.id} value={s.id}>{s.status_nummer} - {s.beskrivelse}</option>
                        ))}
                    </select>
                </td>
                <td className="py-1 px-2">{sag.hovedansvarlige}</td>
                <td className="py-1 px-2">{sag.fuld_adresse}</td>
                <td className="py-1 px-2">
                    <div className="flex items-center space-x-3">
                        <button id={`cell-${sag.id}-5`} onClick={(e: MouseEvent) => { e.stopPropagation(); onEdit(sag); }} title="Rediger sag">
                            <Edit size={18} className="text-gray-500 hover:text-blue-600" />
                        </button>
                        <button onClick={(e: MouseEvent) => { e.stopPropagation(); navigateTo('sagsdetaljer', sag); }} title="Vis sagsdetaljer">
                            <FileText size={18} className="text-gray-500 hover:text-green-600" />
                        </button>
                        {isCreatingActivities ? (
                            <Loader2 size={18} className="text-gray-500 animate-spin" />
                        ) : sag.opgaver_oprettet ? (
                            <button onClick={(e: MouseEvent) => { e.stopPropagation(); navigateTo('aktiviteter', sag); }} title="Vis aktiviteter">
                                <ListChecks size={18} className="text-gray-500 hover:text-purple-600" />
                            </button>
                        ) : (
                            <button onClick={(e: MouseEvent) => { e.stopPropagation(); onOpretAktiviteter(sag.id); }} title="Opret Aktiviteter">
                                <ListChecks size={18} className="text-red-500 hover:text-red-700" />
                            </button>
                        )}
                        {isCreatingDocuments ? (
                            <Loader2 size={18} className="text-gray-500 animate-spin" />
                        ) : sag.mappen_oprettet ? (
                            <button onClick={(e: MouseEvent) => {
                                e.stopPropagation();
                                dispatch({ type: 'SET_VALGT_SAG', payload: sag });
                                navigate('/dokumenter');
                            }} title="Vis dokumenter">
                                <Folder size={18} className="text-gray-500 hover:text-yellow-600" />
                            </button>
                        ) : (
                            <button onClick={(e: MouseEvent) => { e.stopPropagation(); onOpretDokumenter(sag.id); }} title="Opret Dokumentstruktur">
                                <Folder size={18} className="text-red-500 hover:text-red-700" />
                            </button>
                        )}
                        <button onClick={(e: MouseEvent) => {
                            e.stopPropagation();
                            dispatch({ type: 'SET_VALGT_SAG', payload: sag });
                            navigate('/sags_mail');
                        }} title="Vis postkasse">
                            <Inbox size={18} className="text-gray-500 hover:text-blue-600" />
                        </button>
                    </div>
                </td>
            </tr>

            {isExpanded && (
                <tr className="bg-gray-50 border-b border-gray-200">
                    <td colSpan={6} className="p-4 cursor-auto" onClick={(e) => e.stopPropagation()}>
                        {/* Original række */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <h4 className="font-bold text-gray-700 text-xs uppercase mb-1">Adresse</h4>
                                <p className="text-sm">{sag.fuld_adresse || "Ikke angivet"}</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-700 text-xs uppercase mb-1">Boliginformation</h4>
                                <p className="text-sm"><span className="font-semibold">Type:</span> {sag.bolig_type || "N/A"}</p>
                                <p className="text-sm"><span className="font-semibold">Matrikel:</span> {sag.bolig_matrikel || "N/A"}</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-700 text-xs uppercase mb-1">Hovedansvarlig (Intern)</h4>
                                <p className="text-sm">{sag.hovedansvarlige || "Ikke angivet"}</p>
                            </div>
                        </div>

                        {/* Ny Mægler-række */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                            <div>
                                <h4 className="font-bold text-gray-700 text-xs uppercase mb-1">Mægler Virksomhed</h4>
                                <div className="flex items-center space-x-1 text-sm">
                                    <span>{formatVirksomhedsnavn(sag.maegler_virksomhed) || <span className="italic text-gray-500">Ikke valgt</span>}</span>
                                    {sag.maegler_virksomhed?.email && (
                                        <button
                                            onClick={(e) => handleCopyEmail(sag.maegler_virksomhed!.email!, `v-${sag.id}`, e)}
                                            title={`Kopier ${sag.maegler_virksomhed.email}`}
                                            className="p-0.5 rounded-md hover:bg-gray-200 flex-shrink-0"
                                        >
                                            {copiedEmailId === `v-${sag.id}` ? (
                                                <Check size={14} className="text-green-500" />
                                            ) : (
                                                <Copy size={14} className="text-blue-500 hover:text-blue-700" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-700 text-xs uppercase mb-1">Mægler Kontakt</h4>
                                <p className="text-sm">{sag.maegler_kontakt?.fulde_navn || <span className="italic text-gray-500">Ikke valgt</span>}</p>
                                {sag.maegler_kontakt?.email && (
                                    <div className="flex items-center space-x-1 text-xs mt-1">
                                        <button
                                            onClick={(e) => handleCopyEmail(sag.maegler_kontakt!.email!, `k-${sag.id}`, e)}
                                            title={`Kopier ${sag.maegler_kontakt.email}`}
                                            className="p-0.5 rounded-md hover:bg-gray-200 flex-shrink-0"
                                        >
                                            {copiedEmailId === `k-${sag.id}` ? (
                                                <Check size={14} className="text-green-500" />
                                            ) : (
                                                <Copy size={14} className="text-blue-500 hover:text-blue-700" />
                                            )}
                                        </button>
                                        <a
                                            href={`mailto:${sag.maegler_kontakt.email}`}
                                            className="text-blue-600 hover:underline"
                                            onClick={(e) => e.stopPropagation()}
                                            title="Send email"
                                        >
                                            {sag.maegler_kontakt.email}
                                        </a>
                                    </div>
                                )}
                            </div>
                            <div>
                                {sag.bolig_link && (
                                    <>
                                        <h4 className="font-bold text-gray-700 text-xs uppercase mb-1">Bolig system</h4>
                                        <div className="flex items-center space-x-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(sag.bolig_link!);
                                                    setCopiedEmailId(`link-${sag.id}`);
                                                    setTimeout(() => setCopiedEmailId(null), 2000);
                                                }}
                                                className="p-1 rounded-md hover:bg-gray-200"
                                                title="Kopier link"
                                            >
                                                {copiedEmailId === `link-${sag.id}` ? (
                                                    <Check size={14} className="text-green-500" />
                                                ) : (
                                                    <Copy size={14} className="text-blue-500 hover:text-blue-700" />
                                                )}
                                            </button>
                                            <a
                                                href={sag.bolig_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 hover:underline truncate max-w-[250px]"
                                                onClick={(e) => e.stopPropagation()}
                                                title={sag.bolig_link}
                                            >
                                                {sag.bolig_link}
                                            </a>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Kommentar-række */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="font-bold text-gray-700 text-xs uppercase mb-1">Kommentar</h4>
                            <p className="text-sm whitespace-pre-wrap">{sag.kommentar || <span className="italic text-gray-500">Ingen kommentar</span>}</p>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
