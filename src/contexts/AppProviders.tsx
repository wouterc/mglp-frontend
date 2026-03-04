import React, { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { LookupProvider } from './LookupContext';
import { SagProvider } from './SagContext';
import { ChatProvider } from './ChatContext';
import { AktivitetDokumentProvider } from './AktivitetDokumentContext';
import { PartnerProvider } from './PartnerContext';
import { TemplateProvider } from './TemplateContext';

import { FakturaProvider } from './FakturaContext';
import { PunktafgiftProvider } from './PunktafgiftContext';

interface AppProvidersProps {
    children: ReactNode;
}

export const AppProviders = ({ children }: AppProvidersProps) => {
    return (
        <AuthProvider>
            <LookupProvider>
                <PartnerProvider>
                    <TemplateProvider>
                        <SagProvider>
                            <FakturaProvider>
                                <PunktafgiftProvider>
                                    <AktivitetDokumentProvider>
                                        <ChatProvider>
                                            {children}
                                        </ChatProvider>
                                    </AktivitetDokumentProvider>
                                </PunktafgiftProvider>
                            </FakturaProvider>
                        </SagProvider>
                    </TemplateProvider>
                </PartnerProvider>
            </LookupProvider>
        </AuthProvider>
    );
};
