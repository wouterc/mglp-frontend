import React, { useState, useMemo } from 'react';
import { Sag, BbrKodeliste } from '../../../types';
import { RefreshCw, Building2, Calendar, LayoutGrid, CheckCircle2, FileText, Settings, ShieldAlert } from 'lucide-react';
import { useLookups } from '../../../contexts/LookupContext';
import { SagService } from '../../../services/SagService';
import Toast, { ToastType } from '../../ui/Toast';

interface BbrTabProps {
    sag: Sag;
    onUpdate: () => Promise<void> | void;
}

const BbrTab: React.FC<BbrTabProps> = ({ sag, onUpdate }) => {
    const { state: lookupState } = useLookups();
    const { bbrKodelister } = lookupState;
    const [isUpdating, setIsUpdating] = useState(false);
    const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: ToastType }>({
        isVisible: false,
        message: '',
        type: 'info'
    });

    const bbrInfo = sag.bbr_info;

    // Helper to get text from KodeListe
    const getKodelisteTekst = (kategori: string, kode: string | undefined | null) => {
        if (!kode) return '-';
        const kodeObj = bbrKodelister?.find((k: BbrKodeliste) => k.kategori === kategori && k.kode === kode);
        return kodeObj ? `${kodeObj.tekst} (${kode})` : kode;
    };

    const handleUpdateBbr = async () => {
        if (isUpdating) return;
        setIsUpdating(true);
        try {
            await SagService.opdaterBbr(sag.id);
            await onUpdate(); // Trickle refresh up og vent til fetch er færdig
        } catch (e: any) {
            console.error('Kunne ikke opdatere BBR data:', e);
            const dataMsg = e.data?.error || e.data?.detail || JSON.stringify(e.data) || 'Der blev ikke returneret nogen fejlbesked.';
            setToast({
                isVisible: true,
                message: `Kunne ikke hente BBR data.\nSystembesked: ${dataMsg}`,
                type: 'error'
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const formatterDato = (datoStr: string | null | undefined) => {
        if (!datoStr) return '-';
        const d = new Date(datoStr);
        return d.toLocaleString('da-DK', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="bg-white rounded-md shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-3 sm:px-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Building2 className="text-blue-600" size={18} />
                    <h3 className="font-semibold text-gray-800 text-sm">BBR Oplysninger</h3>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-500 hidden sm:flex items-center gap-1">
                        <Calendar size={12} className="text-gray-400" />
                        Sidst opdateret: <span className="font-medium text-gray-700">{formatterDato(bbrInfo?.sidst_opdateret)}</span>
                    </div>
                    <button
                        onClick={handleUpdateBbr}
                        disabled={isUpdating}
                        className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        <RefreshCw size={14} className={isUpdating ? "animate-spin" : ""} />
                        <span>Hent BBR-data</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {!bbrInfo ? (
                    <div className="text-center py-10">
                        <ShieldAlert className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <h3 className="text-sm font-medium text-gray-900">Ingen fuldstændige BBR-data</h3>
                        <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                            Vi har ikke en fuldstændig BBR-version af denne sag gemt i databasen endnu. Tryk på "Hent BBR-data" for at slå sagen op i reeltid.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">

                        {/* Sektion: Bygningsoplysninger */}
                        <div>
                            <h4 className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 pb-1 border-b border-gray-100">
                                <LayoutGrid size={14} className="text-blue-500" />
                                Generelle Bygningsoplysninger
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                <BbrField label="Anvendelse (Bygning)" value={getKodelisteTekst('byg_anvendelse', bbrInfo.byg_anvendelse?.kode)} />
                                <BbrField label="Anvendelse (Enhed)" value={getKodelisteTekst('bolig_type', bbrInfo.bolig_type)} />
                                <BbrField label="Byggeår / Opførelsesår" value={bbrInfo.opfoerelsesaar} />
                                <BbrField label="Ombygningsår" value={bbrInfo.ombygningsaar} />

                                <BbrField label="Antal Etager" value={bbrInfo.antal_etager} />
                                <BbrField label="Bebygget Areal" value={bbrInfo.bebygget_areal ? `${bbrInfo.bebygget_areal} m²` : null} />
                                <BbrField label="Samlet Bygningsareal" value={bbrInfo.samlet_bygningsareal ? `${bbrInfo.samlet_bygningsareal} m²` : null} />
                                <BbrField label="Samlet Boligareal" value={bbrInfo.samlet_bolig_areal ? `${bbrInfo.samlet_bolig_areal} m²` : null} />
                                <BbrField label="Boligareal (Enhed)" value={bbrInfo.enhed_beboelsesareal ? `${bbrInfo.enhed_beboelsesareal} m²` : null} />
                            </div>
                        </div>

                        {/* Sektion: Materialer */}
                        <div>
                            <h4 className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 pb-1 border-b border-gray-100">
                                <FileText size={14} className="text-blue-500" />
                                Materialer & Boligtype
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                <BbrField label="Asbest Materiale" value={getKodelisteTekst('asbestholdigt_materiale', bbrInfo.asbestholdigt_materiale)} />
                                <BbrField label="Ydervæg (Bygning)" value={getKodelisteTekst('ydervaeg_materiale', bbrInfo.ydervaeg_materiale)} />
                                <BbrField label="Tag (Bygning)" value={getKodelisteTekst('tag_materiale', bbrInfo.tag_materiale)} />
                            </div>
                        </div>

                        {/* Sektion: Installationer & Rum */}
                        <div>
                            <h4 className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 pb-1 border-b border-gray-100">
                                <Settings size={14} className="text-blue-500" />
                                Installationer & Indretning
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                <BbrField label="Antal Værelser" value={bbrInfo.antal_vaerelser} />
                                <BbrField label="Antal Toiletter" value={bbrInfo.antal_toiletter} />
                                <BbrField label="Antal Badeværelser" value={bbrInfo.antal_badevaerelser} />

                                <BbrField label="Toiletforhold" value={getKodelisteTekst('toiletforhold_kode', bbrInfo.toiletforhold_kode)} />
                                <BbrField label="Badeforhold" value={getKodelisteTekst('badeforhold_kode', bbrInfo.badeforhold_kode)} />
                                <BbrField label="Køkkenforhold" value={getKodelisteTekst('koekkenforhold_kode', bbrInfo.koekkenforhold_kode)} />

                                <BbrField label="Vandforsyning" value={getKodelisteTekst('vandforsyning', bbrInfo.vandforsyning)} />
                                <BbrField label="Afløbsforhold" value={getKodelisteTekst('afloebsforhold', bbrInfo.afloebsforhold)} />

                                <BbrField label="Varmeinstallation" value={getKodelisteTekst('varme_installation', bbrInfo.varme_installation)} />
                                <BbrField label="Opvarmningsmiddel" value={getKodelisteTekst('opvarmningsmiddel', bbrInfo.opvarmningsmiddel)} />
                                <BbrField label="Supplerende Varme" value={getKodelisteTekst('supplerende_varme', bbrInfo.supplerende_varme)} />
                            </div>
                        </div>

                    </div>
                )}
            </div>

            <Toast
                isVisible={toast.isVisible}
                message={toast.message}
                type={toast.type}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
            />
        </div>
    );
};

// Helper component for uniform display of an info field
const BbrField = ({ label, value }: { label: string, value: string | null | undefined }) => (
    <div className="bg-gray-50/50 rounded p-2.5 border border-gray-100 flex items-start gap-2">
        <CheckCircle2 size={12} className="text-green-500 mt-1 flex-shrink-0" />
        <div>
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">{label}</div>
            <div className={`text-xs font-medium ${value && value !== '-' ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                {value || '-'}
            </div>
        </div>
    </div>
);

export default BbrTab;
