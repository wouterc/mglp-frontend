// --- Fil: src/components/sagsdetaljer/tabs/SaelgereTab.tsx ---
// @# 2025-11-22 18:15 - Wrapper til SaelgerStyring.
import React from 'react';
import SaelgerStyring from '../../SaelgerStyring';
import { Sag } from '../../../types';

interface SaelgereTabProps {
    sag: Sag;
    onUpdate: () => void;
}

function SaelgereTab({ sag, onUpdate }: SaelgereTabProps) {
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <SaelgerStyring
                sagId={sag.id}
                initialSaelgere={sag.saelgere || []}
                primaerSaelgerId={sag.primaer_saelger?.id || null}
                onSaelgerOpdateret={onUpdate}
            />
        </div>
    );
}

export default SaelgereTab;