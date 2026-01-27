import { ReactNode } from 'react';
import { FastnProvider as CoreFastnProvider } from '@fastn-ai/react-core';
import { useAuth } from './AuthContext';

interface FastnProviderWrapperProps {
  children: ReactNode;
}

export function FastnProviderWrapper({ children }: FastnProviderWrapperProps) {
  const { tenantId } = useAuth();

  const spaceId = localStorage.getItem('spaceId') || 'd0f8c7f3-69d3-403c-90a0-17c8857e095f';
  const apiKey = localStorage.getItem('apiKey') || '';

  // Only render FastnProvider if we have credentials
  if (!tenantId || !apiKey || !spaceId) {
    return <>{children}</>;
  }

  const fastnConfig = {
    environment: 'LIVE',
    authToken: apiKey,
    tenantId: tenantId,
    spaceId: spaceId,
  };

  return (
    <CoreFastnProvider config={fastnConfig}>
      {children}
    </CoreFastnProvider>
  );
}
