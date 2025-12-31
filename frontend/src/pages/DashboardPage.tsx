import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { SyncConfigEditor } from '../components/SyncConfigEditor';
import { LocationMappingEditor } from '../components/LocationMappingEditor';
import { SettingsEditor } from '../components/SettingsEditor';
import type { TenantConfig, ConfigOptions, Connection, LocationMapping } from '../types/config';

export function DashboardPage() {
  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [options, setOptions] = useState<ConfigOptions>({ cin7Warehouses: [], connections: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'sync' | 'location' | 'settings'>('sync');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.getTenantConfig();
      // Handle nested config structure
      const configData = response.config || response;
      setConfig(configData);

      // Extract and transform options if available
      if (response.options) {
        // Transform cin7Warehouses from { ID, Name } to { id, name }
        const cin7Warehouses = (response.options.cin7Warehouses || []).map((wh: any) => ({
          id: wh.ID,
          name: wh.Name
        }));

        // Transform connections and add display names
        let connections = (response.options.connections || []).map((conn: any) => {
          // Generate friendly name from connection ID
          const name = conn.id === 'default'
            ? 'Default Connection'
            : conn.id
                .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to spaces
                .replace(/[_-]/g, ' ') // underscores/hyphens to spaces
                .split(' ')
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

          return {
            id: conn.id,
            name: name,
            locations: conn.locations || []
          };
        });

        // Filter out "default" if there are other connections
        // Exception: keep "default" if it's already being used in existing locationMapping
        const nonDefaultConnections = connections.filter((c: Connection) => c.id !== 'default');
        const isDefaultInUse = configData.locationMapping?.some((loc: LocationMapping) => loc.connectionId === 'default');

        if (nonDefaultConnections.length > 0 && !isDefaultInUse) {
          connections = nonDefaultConnections;
        }
        // Otherwise keep default (if it's the only connection or already in use)

        setOptions({
          cin7Warehouses,
          connections
        });
      }
    } catch (err) {
      setError('Failed to load configuration');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      // Exclude API key from config update
      const { apiKey, hasApiKey, tenantId: _, ...configUpdate } = config;
      await apiClient.updateTenantConfig(configUpdate);

      setSuccessMessage('Configuration saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to save configuration');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleApiKeySave = async (newApiKey: string) => {
    try {
      setSavingApiKey(true);
      setError('');
      setSuccessMessage('');

      await apiClient.updateApiKey(newApiKey);

      // Reload config to get the new masked API key
      await loadConfig();

      setSuccessMessage('API Key updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to update API key');
      console.error(err);
      throw err; // Re-throw so SettingsEditor can handle it
    } finally {
      setSavingApiKey(false);
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
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
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
            <button
              onClick={() => setActiveTab('settings')}
              style={{
                flex: 1,
                padding: '1rem',
                border: 'none',
                backgroundColor: activeTab === 'settings' ? 'white' : '#f5f5f5',
                borderBottom: activeTab === 'settings' ? '2px solid #007bff' : 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'settings' ? '600' : 'normal'
              }}
            >
              Settings
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
                cin7Warehouses={options.cin7Warehouses}
                connections={options.connections}
              />
            )}

            {activeTab === 'settings' && config && (
              <SettingsEditor
                apiKey={config.apiKey || ''}
                hasApiKey={config.hasApiKey || false}
                notificationRecipient={config.notificationRecipient || []}
                onNotificationRecipientChange={(recipients) =>
                  setConfig({ ...config, notificationRecipient: recipients })
                }
                onApiKeySave={handleApiKeySave}
                savingApiKey={savingApiKey}
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
    </div>
  );
}
