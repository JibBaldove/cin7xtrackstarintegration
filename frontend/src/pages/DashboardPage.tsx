import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../api/client';
import { SyncConfigEditor } from '../components/SyncConfigEditor';
import { LocationMappingEditor } from '../components/LocationMappingEditor';

export function DashboardPage() {
  const { tenantId, logout } = useAuth();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'sync' | 'location'>('sync');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.getTenantConfig();
      setConfig(response.data);
    } catch (err) {
      setError('Failed to load configuration');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');
      await apiClient.updateTenantConfig(config);
      setSuccessMessage('Configuration saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to save configuration');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div>Loading configuration...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #ddd',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Tenant Configuration</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.875rem' }}>
            Tenant: <strong>{tenantId}</strong>
          </p>
        </div>
        <button
          onClick={logout}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </header>

      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {error && (
          <div style={{
            backgroundColor: '#fee',
            color: '#c33',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            border: '1px solid #fcc'
          }}>
            {error}
          </div>
        )}

        {successMessage && (
          <div style={{
            backgroundColor: '#efe',
            color: '#3c3',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            border: '1px solid #cfc'
          }}>
            {successMessage}
          </div>
        )}

        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #ddd'
          }}>
            <button
              onClick={() => setActiveTab('sync')}
              style={{
                flex: 1,
                padding: '1rem',
                border: 'none',
                backgroundColor: activeTab === 'sync' ? 'white' : '#f5f5f5',
                borderBottom: activeTab === 'sync' ? '2px solid #007bff' : 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'sync' ? '600' : 'normal'
              }}
            >
              Sync Configuration
            </button>
            <button
              onClick={() => setActiveTab('location')}
              style={{
                flex: 1,
                padding: '1rem',
                border: 'none',
                backgroundColor: activeTab === 'location' ? 'white' : '#f5f5f5',
                borderBottom: activeTab === 'location' ? '2px solid #007bff' : 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'location' ? '600' : 'normal'
              }}
            >
              Location Mapping
            </button>
          </div>

          <div style={{ padding: '2rem' }}>
            {activeTab === 'sync' && config && (
              <SyncConfigEditor
                syncConfig={config.syncConfig}
                onChange={(newSyncConfig) => setConfig({ ...config, syncConfig: newSyncConfig })}
              />
            )}

            {activeTab === 'location' && config && (
              <LocationMappingEditor
                locationMapping={config.locationMapping}
                onChange={(newLocationMapping) => setConfig({ ...config, locationMapping: newLocationMapping })}
              />
            )}
          </div>
        </div>

        <div style={{
          marginTop: '2rem',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '1rem'
        }}>
          <button
            onClick={loadConfig}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: saving ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </main>
    </div>
  );
}
