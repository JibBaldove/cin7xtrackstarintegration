import { useState, useEffect } from 'react';
import { Text, Spinner, InlineStack } from '@shopify/polaris';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../api/client';
import { SearchableSelect } from './SearchableSelect';

export function TenantSwitcher() {
  const { tenantId, switchTenant } = useAuth();
  const [tenants, setTenants] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const tenantList = await apiClient.getTenantList();
      setTenants(tenantList);
      setError(null);
    } catch (err) {
      setError('Failed to load tenants');
      console.error('Error loading tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTenantChange = async (newTenantId: string) => {
    if (newTenantId === tenantId) return;

    try {
      setSwitching(true);
      setError(null);
      await switchTenant(newTenantId);
      window.location.reload();
    } catch (err) {
      setError('Failed to switch tenant');
      console.error('Error switching tenant:', err);
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <InlineStack gap="200" blockAlign="center">
        <Spinner size="small" />
        <Text as="span" variant="bodySm" tone="subdued">
          Loading tenants...
        </Text>
      </InlineStack>
    );
  }

  if (error && tenants.length === 0) {
    return (
      <Text as="span" variant="bodySm" tone="critical">
        {error}
      </Text>
    );
  }

  const tenantOptions = tenants.map(t => ({ id: t, name: t }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '200px' }}>
      <Text as="p" variant="bodyXs" fontWeight="semibold" tone="subdued">
        TENANT
      </Text>
      <SearchableSelect
        options={tenantOptions}
        value={tenantId || ''}
        onChange={handleTenantChange}
        placeholder="Select tenant..."
        disabled={switching}
      />
      {error && switching && (
        <Text as="p" variant="bodyXs" tone="critical">
          {error}
        </Text>
      )}
    </div>
  );
}
