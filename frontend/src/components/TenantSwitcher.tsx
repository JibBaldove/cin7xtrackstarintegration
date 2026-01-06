import { useState, useEffect } from 'react';
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
      <div style={{ fontSize: '0.875rem', color: '#666' }}>
        Loading tenants...
      </div>
    );
  }

  if (error && tenants.length === 0) {
    return (
      <div style={{ fontSize: '0.875rem', color: '#dc3545' }}>
        {error}
      </div>
    );
  }

  const tenantOptions = tenants.map(t => ({ id: t, name: t }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '200px' }}>
      <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: '500' }}>
        TENANT
      </div>
      <SearchableSelect
        options={tenantOptions}
        value={tenantId || ''}
        onChange={handleTenantChange}
        placeholder="Select tenant..."
        disabled={switching}
      />
      {error && switching && (
        <div style={{ fontSize: '0.75rem', color: '#dc3545', marginTop: '0.25rem' }}>
          {error}
        </div>
      )}
    </div>
  );
}
