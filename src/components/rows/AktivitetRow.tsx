
import React, { useState } from 'react';
import { MessageSquare, Info, UploadCloud, CheckCircle2, Maximize2, Link as LinkIcon, MoreVertical, Copy, Trash2, Edit3 } from 'lucide-react';
import Tooltip from '../Tooltip';
import SmartDateInput from '../SmartDateInput';
import { Aktivitet, User, Status, InformationsKilde } from '../../types';

interface AktivitetRowProps {
    aktivitet: Aktivitet;
    statusser: Status[];
    colleagues: User[];
    onInlineSave: (aktivitet: Aktivitet, field: string, value: any) => Promise<void>;
    onStatusToggle: (aktivitet: Aktivitet) => void;
    onEditComment: (aktivitet: Aktivitet) => void;
    onEditResultat?: (aktivitet: Aktivitet) => void;
    onGemTilSkabelon?: (aktivitet: Aktivitet) => void;
    onCopy: (aktivitet: Aktivitet) => void;
    onRenameLine?: (aktivitet: Aktivitet) => void;
    onDeleteLine?: (aktivitet: Aktivitet) => void;
    isLast?: boolean;
    onLinkClick?: (aktivitet: Aktivitet) => void;
    informationsKilder: InformationsKilde[];
    isActive?: boolean;
    onFocus?: () => void;
    onBlur?: () => void;
}

interface InlineEditorProps {
    value: string | null;
    onSave: (value: string) => void;
    type?: string;
    id?: string;
    onExpand?: () => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const InlineTextEditor = ({ value, onSave, type = "text", id, onExpand, onKeyDown }: InlineEditorProps & { onExpand?: () => void }) => {
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
                onKeyDown={onKeyDown}
                className="w-full py-0.5 px-1 pr-7 border border-gray-300 rounded-md text-[12px] bg-white focus:border-black focus:ring-0 truncate"
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

function AktivitetRow({
    aktivitet,
    statusser,
    colleagues,
    onInlineSave,
    onStatusToggle,
    onEditComment,
    onEditResultat,
    onGemTilSkabelon,
    onCopy,
    onRenameLine,
    onDeleteLine,
    isLast,
    onLinkClick,
    informationsKilder,
    isActive,
    onFocus,
    onBlur
}: AktivitetRowProps) {
    const isDone = aktivitet.status?.status_nummer === 80 || aktivitet.status?.status_kategori === 1;

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getDateColorClass = (dateStr: string | null) => {
        if (!dateStr || isDone) return '';

        // Parsing YYYY-MM-DD manually for robustness against timezone shifts
        const parts = dateStr.split('-');
        if (parts.length !== 3) return '';

        const targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        targetDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return '!bg-red-500 !text-white';

        let maxOrangeDiff = 1;
        const dayOfWeek = today.getDay(); // 0=Sun, 5=Fri, 6=Sat
        if (dayOfWeek === 5) maxOrangeDiff = 3;
        else if (dayOfWeek === 6) maxOrangeDiff = 2;

        if (diffDays <= maxOrangeDiff) return '!bg-orange-400 !text-white';
        return '';
    };

    const handleKeyDown = (e: React.KeyboardEvent, nextFieldId: string) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const nextEl = document.getElementById(nextFieldId);
            if (nextEl) {
                nextEl.focus();
                if (nextEl instanceof HTMLInputElement && nextEl.type === 'text') {
                    nextEl.select();
                }
            }
        }
    };

    return (
        <tr
            className={`border-b border-gray-200 transition-colors ${isActive ? 'bg-red-50/30' : 'hover:bg-gray-50'}`}
            style={isActive ? { boxShadow: 'inset 0 -2px 0 0 #ef4444' } : {}}
            onClick={onFocus}
            onFocus={onFocus}
            onBlur={(e) => {
                // Only call onBlur if focus is leaving the row entirely
                if (!e.currentTarget.contains(e.relatedTarget)) {
                    onBlur?.();
                }
            }}
        >
            <td className="py-0.5 px-2 text-center">
                <input
                    id={`a-${aktivitet.id}-f0`}
                    type="checkbox"
                    checked={!!aktivitet.aktiv}
                    onChange={(e) => onInlineSave(aktivitet, 'aktiv', e.target.checked)}
                    onKeyDown={(e) => handleKeyDown(e, `a-${aktivitet.id}-f1`)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                />
            </td>
            <td className="py-0.5 px-2 pl-8 break-words text-[12px]">
                {aktivitet.aktivitet_nr} - {aktivitet.aktivitet}
            </td>
            <td className="py-0.5 px-2">
                <SmartDateInput
                    id={`a-${aktivitet.id}-f1`}
                    value={aktivitet.dato_intern}
                    onSave={(val) => onInlineSave(aktivitet, 'dato_intern', val)}
                    onKeyDown={(e) => handleKeyDown(e, `a-${aktivitet.id}-f2`)}
                    className={`w-full py-0.5 px-1 border border-gray-300 rounded-md text-[11px] bg-white focus:text-gray-700 focus:border-black focus:ring-0 ${getDateColorClass(aktivitet.dato_intern)} ${!aktivitet.dato_intern ? 'text-transparent hover:text-gray-400' : ''}`}
                />
            </td>
            <td className="py-0.5 px-2">
                <SmartDateInput
                    id={`a-${aktivitet.id}-f2`}
                    value={aktivitet.dato_ekstern}
                    onSave={(val) => onInlineSave(aktivitet, 'dato_ekstern', val)}
                    onKeyDown={(e) => handleKeyDown(e, `a-${aktivitet.id}-f3`)}
                    className={`w-full py-0.5 px-1 border border-gray-300 rounded-md text-[11px] bg-white focus:text-gray-700 focus:border-black focus:ring-0 ${getDateColorClass(aktivitet.dato_ekstern)} ${!aktivitet.dato_ekstern ? 'text-transparent hover:text-gray-400' : ''}`}
                />
            </td>
            <td className="py-0.5 px-2 text-center relative">
                <div className="flex items-center justify-center gap-0.5 h-full">
                    {/* Slot 1: Skabelon Note */}
                    <div className="flex justify-center">
                        {(aktivitet.skabelon_note || aktivitet.note) && (
                            <div className="relative group/info inline-block">
                                <Info size={14} className="text-amber-500 cursor-help" />
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible z-50 transition-all pointer-events-none text-left">
                                    {aktivitet.skabelon_note || aktivitet.note}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Slot 2: Link Icon */}
                    <div className="flex justify-center">
                        <Tooltip content={aktivitet.har_links ? "Vis linkede dokumenter" : "Link dokumenter"}>
                            <button
                                onClick={(e) => { e.stopPropagation(); onLinkClick?.(aktivitet); }}
                                className={`p-0.5 rounded transition-colors ${aktivitet.har_links
                                    ? (aktivitet.links_status === 'red' ? 'text-red-500 hover:bg-red-50 font-bold' : 'text-green-600 hover:bg-green-50 font-bold')
                                    : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
                                    }`}
                            >
                                <LinkIcon size={14} fill={aktivitet.har_links ? "currentColor" : "none"} />
                            </button>
                        </Tooltip>
                    </div>

                    {/* Slot 3: User Comment */}
                    <div className="flex justify-center">
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
                                <MessageSquare size={14} fill={aktivitet.kommentar ? "currentColor" : "none"} />
                            </button>
                        </Tooltip>
                    </div>

                    {/* Slot 4: Gem til skabelon / Upload */}
                    <div className="flex justify-center">
                        {aktivitet.er_ny && onGemTilSkabelon && (
                            <Tooltip content="Denne aktivitet er kun på denne sag. Klik for at gemme den som en global skabelon.">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onGemTilSkabelon(aktivitet); }}
                                    className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                >
                                    <UploadCloud size={14} />
                                </button>
                            </Tooltip>
                        )}
                    </div>

                    {/* Slot 5: Action Menu Dropdown */}
                    <div className={`relative flex-shrink-0 ${isMenuOpen ? 'z-[60]' : 'z-10'}`} ref={menuRef}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(!isMenuOpen);
                            }}
                            className={`p-1 rounded-md shadow-sm border transition-all ${isMenuOpen ? 'bg-blue-600 text-white border-blue-700' : 'bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-white border-gray-200 hover:border-gray-300'}`}
                            title="Flere handlinger"
                        >
                            <MoreVertical size={16} />
                        </button>

                        {isMenuOpen && (
                            <div
                                className={`absolute right-0 ${isLast ? 'bottom-full mb-2' : 'top-full mt-2'} w-48 bg-amber-100 border-2 border-amber-400 rounded-lg shadow-2xl z-50 overflow-hidden`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => {
                                        onCopy(aktivitet);
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-amber-950 hover:bg-amber-200 transition-colors group border-b border-amber-200"
                                >
                                    <Copy size={15} className="text-amber-700 group-hover:text-amber-900" />
                                    <span className="font-bold">Kopier linje</span>
                                </button>

                                {aktivitet.er_ny && (
                                    <>
                                        <button
                                            onClick={() => {
                                                onRenameLine?.(aktivitet);
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-amber-950 hover:bg-amber-200 transition-colors group border-b border-amber-200"
                                        >
                                            <Edit3 size={15} className="text-amber-700 group-hover:text-amber-900" />
                                            <span className="font-bold">Omdøb linje</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                onDeleteLine?.(aktivitet);
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-700 hover:bg-red-100 transition-colors group"
                                        >
                                            <Trash2 size={15} className="text-red-500 group-hover:text-red-700" />
                                            <span className="font-bold">Slet linje</span>
                                        </button>
                                    </>
                                )}
                            </div>
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
                        id={`a-${aktivitet.id}-f3`}
                        value={aktivitet.status?.id || ''}
                        onChange={(e) => onInlineSave(aktivitet, 'status', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, `a-${aktivitet.id}-f4`)}
                        className={`flex-grow py-0.5 px-1 border rounded-md text-[12px] bg-transparent focus:border-black focus:ring-0 ${aktivitet.status?.status_nummer === 80 ? 'border-green-200 text-green-800 font-medium' : 'border-gray-300'
                            }`}
                    >
                        <option value="">Vælg...</option>
                        {statusser.map(s => <option key={s.id} value={s.id}>{s.status_nummer} - {s.beskrivelse}</option>)}
                    </select>
                </div>
            </td>
            <td className="py-0.5 px-2">
                <InlineTextEditor
                    id={`a-${aktivitet.id}-f4`}
                    value={aktivitet.resultat}
                    onSave={(val) => onInlineSave(aktivitet, 'resultat', val)}
                    onExpand={onEditResultat ? () => onEditResultat(aktivitet) : undefined}
                    onKeyDown={(e) => handleKeyDown(e, `a-${aktivitet.id}-f5`)}
                />
            </td>
            <td className="py-0.5 px-0.5 text-center">
                <input
                    id={`a-${aktivitet.id}-f5`}
                    type="checkbox"
                    checked={!!aktivitet.skal_mailes}
                    onChange={(e) => onInlineSave(aktivitet, 'skal_mailes', e.target.checked)}
                    onKeyDown={(e) => handleKeyDown(e, `a-${aktivitet.id}-f6`)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 mt-1"
                    title="Vælg til næste mail"
                />
            </td>
            <td className="py-0.5 px-2">
                <select
                    id={`a-${aktivitet.id}-f6`}
                    value={aktivitet.informations_kilde?.id || ''}
                    onChange={(e) => onInlineSave(aktivitet, 'informations_kilde_id', e.target.value === '' ? null : parseInt(e.target.value))}
                    onKeyDown={(e) => handleKeyDown(e, `a-${aktivitet.id}-f7`)}
                    className="w-full py-0.5 px-1 border border-gray-300 rounded-md text-[12px] bg-white focus:border-black focus:ring-0"
                >
                    <option value="">Ingen</option>
                    {informationsKilder.map(k => (
                        <option key={k.id} value={k.id}>
                            {k.navn}
                        </option>
                    ))}
                </select>
            </td>
        </tr>
    );
}

export default React.memo(AktivitetRow);
