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
        <div className="bg-gray-300 p-4 -m-4 flex-1 flex flex-col">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-300">
                <SaelgerStyring
                    sagId={sag.id}
                    initialSaelgere={sag.saelgere || []}
                    primaerSaelgerId={sag.primaer_saelger?.id || null}
                    onSaelgerOpdateret={onUpdate}
                />
            </div>
        </div>
    );
}

export default SaelgereTab;