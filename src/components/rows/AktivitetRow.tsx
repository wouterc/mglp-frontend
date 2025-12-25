
import React, { useState } from 'react';
import { MessageSquare, Info, UploadCloud, CheckCircle2, Maximize2 } from 'lucide-react';
import Tooltip from '../Tooltip';
import SmartDateInput from '../SmartDateInput';
import { Aktivitet, User, Status } from '../../types';

interface AktivitetRowProps {
    aktivitet: Aktivitet;
    statusser: Status[];
    colleagues: User[];
    onInlineSave: (aktivitet: Aktivitet, field: string, value: any) => Promise<void>;
    onStatusToggle: (aktivitet: Aktivitet) => void;
    onEditComment: (aktivitet: Aktivitet) => void;
    onEditResultat?: (aktivitet: Aktivitet) => void;
    onGemTilSkabelon?: (aktivitet: Aktivitet) => void;
}

interface InlineEditorProps {
    value: string | null;
    onSave: (value: string) => void;
    type?: string;
    id?: string;
    onExpand?: () => void;
}

const InlineTextEditor = ({ value, onSave, type = "text", id, onExpand }: InlineEditorProps & { onExpand?: () => void }) => {
    const [text, setText] = useState(value);

    // Sync local state when prop changes
    React.useEffect(() => { setText(value); }, [value]);

    const handleBlur = () => { if (text !== value) { onSave(text || ''); } };

    return (
        <div className="relative group/editor">
            <input
                id={id}
                type={type}
                value={text || ''}
                onChange={(e) => setText(e.target.value)}
                onBlur={handleBlur}
                className="w-full py-0.5 px-1 pr-7 border border-gray-300 rounded-md text-xs bg-white focus:border-black focus:ring-0 truncate"
                title={text || ''}
            />
            {onExpand && (
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onExpand(); }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-blue-600 opacity-0 group-hover/editor:opacity-100 transition-opacity"
                    title="Udvid"
                >
                    <Maximize2 size={12} />
                </button>
            )}
        </div>
    );
};

export default function AktivitetRow({
    aktivitet,
    statusser,
    colleagues,
    onInlineSave,
    onStatusToggle,
    onEditComment,
    onEditResultat,
    onGemTilSkabelon
}: AktivitetRowProps) {

    return (
        <tr className="border-b border-gray-200 hover:bg-gray-50">
            <td className="py-0.5 px-2 text-center">
                <input
                    id={`cell-${aktivitet.id}-0`}
                    type="checkbox"
                    checked={!!aktivitet.aktiv}
                    onChange={(e) => onInlineSave(aktivitet, 'aktiv', e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                />
            </td>
            <td className="py-0.5 px-2 pl-8 break-words text-xs">
                {aktivitet.aktivitet_nr} - {aktivitet.aktivitet}
            </td>
            <td className="py-0.5 px-2">
                <SmartDateInput
                    value={aktivitet.dato_intern}
                    onSave={(val) => onInlineSave(aktivitet, 'dato_intern', val)}
                    className={`w-full py-0.5 px-1 border border-gray-300 rounded-md text-[11px] bg-white focus:text-gray-700 focus:border-black focus:ring-0 ${!aktivitet.dato_intern ? 'text-transparent hover:text-gray-400' : ''}`}
                />
            </td>
            <td className="py-0.5 px-2">
                <SmartDateInput
                    value={aktivitet.dato_ekstern}
                    onSave={(val) => onInlineSave(aktivitet, 'dato_ekstern', val)}
                    className={`w-full py-0.5 px-1 border border-gray-300 rounded-md text-[11px] bg-white focus:text-gray-700 focus:border-black focus:ring-0 ${!aktivitet.dato_ekstern ? 'text-transparent hover:text-gray-400' : ''}`}
                />
            </td>
            <td className="py-0.5 px-2 text-center">
                <div className="flex items-center justify-center gap-1.5 h-full">
                    {/* Slot 1: Skabelon Info / Note */}
                    <div className="w-4 flex justify-center">
                        {(aktivitet.skabelon_note || aktivitet.note) && (
                            <Tooltip content={aktivitet.skabelon_note || aktivitet.note}>
                                <Info size={14} className="text-amber-500 cursor-help" />
                            </Tooltip>
                        )}
                    </div>

                    {/* Slot 2: Bruger Kommentar */}
                    <div className="w-5 flex justify-center">
                        <Tooltip content={aktivitet.kommentar || "Tilføj kommentar"}>
                            <button
                                id={`cell-${aktivitet.id}-3`}
                                onClick={() => onEditComment(aktivitet)}
                                className={`p-0.5 rounded transition-colors ${aktivitet.kommentar_vigtig
                                    ? 'text-red-600 hover:bg-red-50'
                                    : aktivitet.kommentar
                                        ? 'text-blue-600 hover:bg-blue-50'
                                        : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
                                    }`}
                            >
                                <MessageSquare size={16} fill={aktivitet.kommentar ? "currentColor" : "none"} />
                            </button>
                        </Tooltip>
                    </div>

                    {/* Slot 3: Ny (Skabelon Upload) */}
                    <div className="w-5 flex justify-center">
                        {aktivitet.er_ny && onGemTilSkabelon && (
                            <Tooltip content="Denne aktivitet er kun på denne sag. Klik for at gemme den som en global skabelon.">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onGemTilSkabelon(aktivitet); }}
                                    className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                >
                                    <UploadCloud size={16} />
                                </button>
                            </Tooltip>
                        )}
                    </div>
                </div>
            </td>
            <td className={`py-0.5 px-2 transition-colors ${aktivitet.status?.status_nummer === 80 ? 'bg-green-50' : ''}`}>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => onStatusToggle(aktivitet)}
                        className={`flex-shrink-0 transition-colors ${aktivitet.status?.status_nummer === 80
                            ? 'text-green-600 hover:text-green-700'
                            : 'text-gray-300 hover:text-gray-500'
                            }`}
                        title={aktivitet.status?.status_nummer === 80 ? "Sæt til 'Oprettet'" : "Sæt til 'Udført'"}
                    >
                        <CheckCircle2 size={16} fill={aktivitet.status?.status_nummer === 80 ? "currentColor" : "none"} />
                    </button>
                    <select
                        id={`cell-${aktivitet.id}-2`}
                        value={aktivitet.status?.id || ''}
                        onChange={(e) => onInlineSave(aktivitet, 'status', e.target.value)}
                        className={`flex-grow py-0.5 px-1 border rounded-md text-xs bg-transparent focus:border-black focus:ring-0 ${aktivitet.status?.status_nummer === 80 ? 'border-green-200 text-green-800 font-medium' : 'border-gray-300'
                            }`}
                    >
                        <option value="">Vælg...</option>
                        {statusser.map(s => <option key={s.id} value={s.id}>{s.status_nummer} - {s.beskrivelse}</option>)}
                    </select>
                </div>
            </td>
            <td className="py-0.5 px-2">
                <InlineTextEditor
                    id={`cell-${aktivitet.id}-7`}
                    value={aktivitet.resultat}
                    onSave={(val) => onInlineSave(aktivitet, 'resultat', val)}
                    onExpand={onEditResultat ? () => onEditResultat(aktivitet) : undefined}
                />
            </td>
            <td className="py-0.5 px-2">
                <select
                    id={`cell-${aktivitet.id}-4`}
                    value={aktivitet.ansvarlig || ''}
                    onChange={(e) => onInlineSave(aktivitet, 'ansvarlig', e.target.value)}
                    className="w-full py-0.5 px-1 border border-gray-300 rounded-md text-xs bg-white focus:border-black focus:ring-0"
                >
                    <option value="">Ingen</option>
                    {colleagues.map(u => (
                        <option key={u.id} value={u.username}>{u.username}</option>
                    ))}
                </select>
            </td>
        </tr>
    );
}
