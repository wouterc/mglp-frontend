
import React, { useState, MouseEvent } from 'react';
import { Edit, MessageSquare, Copy, Check, Building } from 'lucide-react';
import { Kontakt, Virksomhed } from '../../types';
import Tooltip from '../Tooltip';

interface KontaktRowProps {
    kontakt: Kontakt;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onEdit: (kontakt: Kontakt, e: MouseEvent) => void;
    onNavToVirksomhed: (e: MouseEvent, virksomhed: Virksomhed | null) => void;
}

const VisAdresse = ({ vej, postnr, by }: { vej?: string | null, postnr?: string | null, by?: string | null }) => {
    const adresseLinje1 = (vej || '').trim();
    const adresseLinje2 = [(postnr || '').trim(), (by || '').trim()].filter(Boolean).join(' ');
    if (!adresseLinje1 && !adresseLinje2) return <span className="italic text-gray-500">Ingen adresse</span>;
    return (
        <>
            {adresseLinje1 && <div>{adresseLinje1}</div>}
            {adresseLinje2 && <div>{adresseLinje2}</div>}
        </>
    );
};

const formatVirksomhedsnavn = (v: Virksomhed | null | undefined): string => {
    if (!v) return '';
    return v.afdeling ? `${v.navn} - ${v.afdeling}` : v.navn;
};

export default function KontaktRow({
    kontakt,
    isExpanded,
    onToggleExpand,
    onEdit,
    onNavToVirksomhed
}: KontaktRowProps) {
    const [copiedEmailId, setCopiedEmailId] = useState<number | null>(null);
    const [copiedAddressId, setCopiedAddressId] = useState<number | null>(null);

    const handleCopyEmail = (email: string, id: number, e: MouseEvent) => {
        e.stopPropagation();
        if (navigator.clipboard) {
            navigator.clipboard.writeText(email).then(() => {
                setCopiedEmailId(id);
                setTimeout(() => setCopiedEmailId(null), 2000);
            }).catch(err => { console.error('Kunne ikke kopiere email:', err); });
        }
    };

    const handleCopyAddress = (k: Kontakt, e: MouseEvent) => {
        e.stopPropagation();
        const addressString = [
            k.adresse_vej,
            `${k.adresse_postnr || ''} ${k.adresse_by || ''}`.trim()
        ].filter(Boolean).join('\n');

        if (addressString && navigator.clipboard) {
            navigator.clipboard.writeText(addressString).then(() => {
                setCopiedAddressId(k.id);
                setTimeout(() => setCopiedAddressId(null), 2000);
            }).catch(err => { console.error(err); });
        }
    };

    return (
        <>
            <tr
                className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer text-xs"
                onClick={onToggleExpand}
            >
                <td className="py-1 px-2 font-medium">
                    <div className="flex items-center">
                        <span>{kontakt.fulde_navn}</span>
                        {(kontakt.kommentar || '').trim() && (
                            <Tooltip content={<div className="max-w-xs p-1">{kontakt.kommentar}</div>}>
                                <MessageSquare size={14} className="ml-2 text-green-600 flex-shrink-0" />
                            </Tooltip>
                        )}
                    </div>
                </td>
                <td className="py-1 px-2 truncate">
                    {kontakt.roller.map(r => r.navn).join(', ')}
                </td>
                <td className="py-1 px-2">
                    {kontakt.virksomhed && (
                        <button
                            className="flex items-center space-x-2 text-left text-blue-600 hover:underline"
                            onClick={(e) => onNavToVirksomhed(e, kontakt.virksomhed)}
                            title={`Gå til ${kontakt.virksomhed.navn}`}
                        >
                            <Building size={16} className="text-gray-400 flex-shrink-0" />
                            <span>{formatVirksomhedsnavn(kontakt.virksomhed)}</span>
                        </button>
                    )}
                </td>
                <td className="py-1 px-2">{kontakt.telefon}</td>
                <td className="py-1 px-2">
                    {kontakt.email && (
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={(e) => handleCopyEmail(kontakt.email!, kontakt.id, e)}
                                title="Kopier email"
                                className="p-0.5 rounded-md hover:bg-gray-200 flex-shrink-0"
                            >
                                {copiedEmailId === kontakt.id ? (
                                    <Check size={14} className="text-green-500" />
                                ) : (
                                    <Copy size={14} className="text-blue-500 hover:text-blue-700" />
                                )}
                            </button>
                            <a
                                href={`mailto:${kontakt.email}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                                title="Send email"
                            >
                                {kontakt.email}
                            </a>
                        </div>
                    )}
                </td>
                <td className="py-1 px-2 text-center">
                    <button onClick={(e) => onEdit(kontakt, e)} title="Rediger">
                        <Edit size={16} className="text-blue-600 hover:text-blue-800" />
                    </button>
                </td>
            </tr>
            {isExpanded && (
                <tr className="bg-gray-50 border-b border-gray-300">
                    <td colSpan={6} className="p-4 cursor-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                            <div>
                                <div className="flex items-center">
                                    <button
                                        onClick={(e) => handleCopyAddress(kontakt, e)}
                                        title="Kopier adresse"
                                        className="p-1 rounded-md hover:bg-gray-200 flex-shrink-0 mr-2"
                                    >
                                        {copiedAddressId === kontakt.id ? (
                                            <Check size={16} className="text-green-500" />
                                        ) : (
                                            <Copy size={16} className="text-blue-500 hover:text-blue-700" />
                                        )}
                                    </button>
                                    <h4 className="font-bold text-gray-700">Adresse</h4>
                                </div>
                                <VisAdresse vej={kontakt.adresse_vej} postnr={kontakt.adresse_postnr} by={kontakt.adresse_by} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-700">Kommentar</h4>
                                <p className="whitespace-pre-wrap break-words">{kontakt.kommentar || <span className="italic text-gray-500">Ingen kommentar</span>}</p>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
