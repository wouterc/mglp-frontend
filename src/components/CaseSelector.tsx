
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Sag } from '../types';
import { Search, Loader2 } from 'lucide-react';

interface CaseSelectorProps {
    onCaseSelected: (sag: Sag) => void;
    onEmailDrop?: (sag: Sag, emailId: number) => void;
}

export default function CaseSelector({ onCaseSelected, onEmailDrop }: CaseSelectorProps) {
    const [cases, setCases] = useState<Sag[]>([]);
    const [filteredCases, setFilteredCases] = useState<Sag[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchCases = async () => {
            setIsLoading(true);
            try {
                // Fetch all cases - in a real app might need pagination but for now we fetch all active ones
                const data = await api.get<Sag[]>('/sager/');
                if (Array.isArray(data)) {
                    setCases(data);
                    setFilteredCases(data);
                } else {
                    console.error("Expected array of cases but got:", data);
                    const results = (data as any).results;
                    if (Array.isArray(results)) {
                        setCases(results);
                        setFilteredCases(results);
                    } else {
                        setCases([]);
                        setFilteredCases([]);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch cases", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCases();
    }, []);

    useEffect(() => {
        const lower = searchTerm.toLowerCase();
        const filtered = cases.filter(c =>
            String(c.sags_nr).toLowerCase().includes(lower) ||
            c.alias?.toLowerCase().includes(lower) ||
            c.adressebetegnelse?.toLowerCase().includes(lower) ||
            c.adresse_vej?.toLowerCase().includes(lower)
        );
        setFilteredCases(filtered);
    }, [searchTerm, cases]);

    return (
        <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-xl z-20">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-sm font-bold text-gray-700 mb-2">Vælg Sag for Journalisering</h2>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
                    <input
                        type="text"
                        placeholder="Søg i sager..."
                        className="w-full pl-8 pr-4 py-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-100/50">
                {isLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-gray-400" /></div>
                ) : (
                    <>
                        {/* Dummy item for "Journaliseret (Uden sag)" */}
                        <div
                            onClick={() => {
                                const dummySag: any = {
                                    id: -1,
                                    sags_nr: 'Arkiv',
                                    alias: 'Journaliseret uden sag',
                                    adresse_vej: '',
                                    adresse: 'Ingen sagsmappe'
                                };
                                onCaseSelected(dummySag);
                            }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.add('ring-2', 'ring-blue-400', 'bg-blue-50');
                            }}
                            onDragLeave={(e) => {
                                e.currentTarget.classList.remove('ring-2', 'ring-blue-400', 'bg-blue-50');
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove('ring-2', 'ring-blue-400', 'bg-blue-50');
                                const emailIdStr = e.dataTransfer.getData("emailId");
                                if (emailIdStr && onEmailDrop) {
                                    // Special dummy case
                                    const dummySag: any = {
                                        id: -1,
                                        sags_nr: 'Arkiv',
                                        alias: 'Journaliseret uden sag',
                                        adresse_vej: '',
                                        adresse: 'Ingen sagsmappe'
                                    };
                                    onEmailDrop(dummySag, parseInt(emailIdStr));
                                }
                            }}
                            className="bg-white border-2 border-dashed border-gray-300 rounded-md p-3 cursor-pointer hover:border-blue-400 hover:bg-gray-50 transition-all flex items-center justify-center min-h-[60px]"
                        >
                            <span className="text-sm font-medium text-gray-500">Arkiv / Uden sag</span>
                        </div>

                        {filteredCases.map(sag => {
                            // Format full address
                            const fullAddress = [
                                sag.adresse_vej,
                                sag.adresse_husnr,
                                sag.adresse_etage,
                                sag.adresse_doer,
                                ((sag.adresse_post_nr || '') + ' ' + (sag.adresse_by || '')).trim()
                            ].filter(Boolean).join(' ');

                            return (
                                <div
                                    key={sag.id}
                                    onClick={() => onCaseSelected(sag)}
                                    // Drag Over Handlers
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.classList.add('ring-2', 'ring-blue-500', 'shadow-md', 'scale-[1.02]');
                                        e.currentTarget.classList.remove('border-gray-200');
                                    }}
                                    onDragLeave={(e) => {
                                        e.currentTarget.classList.remove('ring-2', 'ring-blue-500', 'shadow-md', 'scale-[1.02]');
                                        e.currentTarget.classList.add('border-gray-200');
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.classList.remove('ring-2', 'ring-blue-500', 'shadow-md', 'scale-[1.02]');
                                        e.currentTarget.classList.add('border-gray-200');
                                        const emailIdStr = e.dataTransfer.getData("emailId");
                                        if (emailIdStr && onEmailDrop) {
                                            onEmailDrop(sag, parseInt(emailIdStr));
                                        }
                                    }}
                                    className="bg-white border border-gray-200 rounded-md p-2 cursor-pointer transition-all hover:shadow-sm min-h-[50px] flex flex-col justify-center relative group"
                                >
                                    {/* Line 1: Sagsnr + Full Address */}
                                    <div className="flex items-baseline mb-0.5">
                                        <div className="font-bold text-gray-800 text-sm mr-2 flex-shrink-0">{sag.sags_nr}</div>
                                        <div className="text-[10px] text-gray-600 truncate" title={fullAddress}>
                                            {fullAddress || 'Ingen adresse'}
                                        </div>
                                    </div>

                                    {/* Line 2: Alias + Broker Sagsnr */}
                                    <div className="flex justify-between items-baseline">
                                        <div className="text-xs text-gray-900 font-medium truncate mr-2">{sag.alias || 'Ingen titel'}</div>
                                        {sag.maegler_sagsnr && (
                                            <div className="bg-blue-50 text-blue-700 text-[9px] px-1 py-0.5 rounded border border-blue-100 font-mono flex-shrink-0">
                                                {sag.maegler_sagsnr}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
        </div>
    );
}
