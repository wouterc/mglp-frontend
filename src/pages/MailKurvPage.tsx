
import React, { ReactElement } from 'react';
import { useAppState } from '../StateContext';
import { useNavigate } from 'react-router-dom';
import MailKurvTab from '../components/sagsdetaljer/tabs/MailKurvTab';
import CaseSelector from '../components/ui/CaseSelector';
import { MailPlus, RefreshCw } from 'lucide-react';
import { api } from '../api';
import { Sag } from '../types';

export default function MailKurvPage(): ReactElement {
    const { state, dispatch } = useAppState();
    const { valgtSag } = state;
    const navigate = useNavigate();

    const [activeBaskets, setActiveBaskets] = React.useState<Sag[]>([]);

    const fetchActiveBaskets = () => {
        api.get<Sag[]>('/sager/with_mail_basket/')
            .then(data => setActiveBaskets(data))
            .catch(err => console.error(err));
    };

    React.useEffect(() => {
        fetchActiveBaskets();
    }, [valgtSag]);

    const handleSelectSag = async (id: number) => {
        try {
            const data = await api.get<Sag>(`/sager/${id}/`);
            dispatch({ type: 'SET_VALGT_SAG', payload: data });
        } catch (e) {
            console.error(e);
        }
    };

    const handleSelectActive = (sag: Sag) => {
        dispatch({ type: 'SET_VALGT_SAG', payload: sag });
    };

    return (
        <div className="flex h-full bg-white overflow-hidden">
            {/* Left Column: Context / Selection similar to SagsMailPage */}
            <div className="w-[300px] flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-gray-200 space-y-3 shrink-0">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <MailPlus size={18} className="text-blue-600" />
                            Mail Kurv
                        </h2>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                        Vælg en sag for at se og redigere mail-kurven.
                    </div>
                    <CaseSelector value={valgtSag?.id || null} onChange={handleSelectSag} />
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Active Baskets List */}
                    <div className="p-2">
                        <div className="flex justify-between items-center px-2 mt-2 mb-2">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Sager med indhold
                            </div>
                            <button
                                onClick={fetchActiveBaskets}
                                className="text-gray-400 hover:text-blue-600 transition-colors"
                                title="Opdater liste"
                            >
                                <RefreshCw size={12} />
                            </button>
                        </div>
                        {activeBaskets.length === 0 ? (
                            <p className="text-xs text-center text-gray-400 py-4">Ingen aktive mailkurve</p>
                        ) : (
                            <div className="space-y-1">
                                {activeBaskets.map(sag => (
                                    <button
                                        key={sag.id}
                                        onClick={() => handleSelectActive(sag)}
                                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${valgtSag?.id === sag.id ? 'bg-blue-100 text-blue-800 font-medium' : 'hover:bg-gray-200 text-gray-700'}`}
                                    >
                                        <div className="truncate">{sag.sags_nr} - {sag.alias}</div>
                                        {sag.fuld_adresse && <div className="text-[10px] text-gray-400 truncate">{sag.fuld_adresse}</div>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
                {valgtSag ? (
                    <MailKurvTab sag={valgtSag} onUpdate={fetchActiveBaskets} />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 flex-col">
                        <MailPlus size={48} className="mb-4 opacity-20" />
                        <p>Ingen sag valgt</p>
                    </div>
                )}
            </div>
        </div>
    );
}
