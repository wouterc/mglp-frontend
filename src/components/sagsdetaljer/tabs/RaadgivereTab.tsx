// --- Fil: src/components/sagsdetaljer/tabs/RaadgivereTab.tsx ---
// @# 2025-11-23 13:00 - Rettet: Korrekte imports og props (fiksede VirksomhedFormProps fejl).
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
// BEMÆRK: Vi skal 3 niveauer op for at finde config og types
import { API_BASE_URL } from '../../../config';
import { Sag, SagRaadgiverTilknytning } from '../../../types';
// BEMÆRK: Vi skal 2 niveauer op for at finde RaadgiverStyring i components-roden
import RaadgiverStyring from '../../RaadgiverStyring';

interface RaadgivereTabProps {
    sag: Sag;
    onUpdate: () => void;
}

function RaadgivereTab({ sag, onUpdate }: RaadgivereTabProps) {
    const [tilknytninger, setTilknytninger] = useState<SagRaadgiverTilknytning[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Hent data ved mount (Lazy Load)
    useEffect(() => {
        const fetchRaadgivere = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/sager/raadgivere/?sag_id=${sag.id}`);
                if (!res.ok) throw new Error("Kunne ikke hente rådgivere");
                const data = await res.json();
                setTilknytninger(data || []);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRaadgivere();
    }, [sag.id]);

    if (isLoading) {
        return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    if (error) {
        return <div className="p-4 text-red-600 bg-red-50 rounded border border-red-200">Fejl: {error}</div>;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <RaadgiverStyring
                sagId={sag.id}
                initialTilknytninger={tilknytninger}
                onTilknytningOpdateret={onUpdate}
            />
        </div>
    );
}

export default RaadgivereTab;