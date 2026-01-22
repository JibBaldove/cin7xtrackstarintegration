import { useState, useEffect, useCallback } from 'react';
import { Page, Tabs, Banner, BlockStack, Spinner } from '@shopify/polaris';
import { apiClient } from '../api/client';
import { SyncConfigEditor } from '../components/SyncConfigEditor';
import { LocationMappingEditor } from '../components/LocationMappingEditor';
import { SchedulesEditor } from '../components/SchedulesEditor';
import { SettingsEditor } from '../components/SettingsEditor';
import type { TenantConfig, ConfigOptions, Connection, LocationMapping, ConnectionSchedules } from '../types/config';

export function DashboardPage() {
  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [options, setOptions] = useState<ConfigOptions>({ cin7Warehouses: [], connections: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    loadConfig();
  }, []);

  const migrateSchedulesToTopLevel = useCallback((config: TenantConfig): TenantConfig => {
    // If already migrated, return as-is
    if (config.connectionSchedules) {
      return config;
    }

    // Extract schedules from locationMapping
    const connectionSchedules: ConnectionSchedules = {};

    if (config.locationMapping) {
      config.locationMapping.forEach(location => {
        if ((location as any).entitySchedules && location.connectionId) {
          connectionSchedules[location.connectionId] = (location as any).entitySchedules;
        }
      });
    }

    // Clean up locationMapping (remove entitySchedules)
    const cleanedLocationMapping = config.locationMapping?.map(
      ({ ...rest }: any) => {
        const { entitySchedules, ...cleaned } = rest;
        return cleaned;
      }
    ) || [];

    return {
      ...config,
      locationMapping: cleanedLocationMapping,
      connectionSchedules: Object.keys(connectionSchedules).length > 0 ? connectionSchedules : {}
    };
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.getTenantConfig();
      let configData = response.config || response;

      configData = migrateSchedulesToTopLevel(configData);

      setConfig(configData);

      if (response.options) {
        const cin7Warehouses = (response.options.cin7Warehouses || []).map((wh: any) => ({
          id: wh.ID,
          name: wh.Name
        }));

        let connections = (response.options.connections || []).map((conn: any) => {
          const name = conn.id === 'default'
            ? 'Default Connection'
            : conn.id
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/[_-]/g, ' ')
                .split(' ')
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

          return {
            id: conn.id,
            name: name,
            locations: conn.locations || [],
            shippingMethods: conn.shippingMethods || []
          };
        });

        const nonDefaultConnections = connections.filter((c: Connection) => c.id !== 'default');
        const isDefaultInUse = configData.locationMapping?.some((loc: LocationMapping) => loc.connectionId === 'default');

        if (nonDefaultConnections.length > 0 && !isDefaultInUse) {
          connections = nonDefaultConnections;
        }

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

  const handleSave = useCallback(async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

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
  }, [config]);

  const handleApiKeySave = useCallback(async (newApiKey: string) => {
    try {
      setSavingApiKey(true);
      setError('');
      setSuccessMessage('');

      await apiClient.updateApiKey(newApiKey);
      await loadConfig();

      setSuccessMessage('API Key updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to update API key');
      console.error(err);
      throw err;
    } finally {
      setSavingApiKey(false);
    }
  }, []);

  const tabs = [
    {
      id: 'location',
      content: 'Connection Settings',
      panelID: 'location-panel',
    },
    {
      id: 'sync',
      content: 'Entity Settings',
      panelID: 'sync-panel',
    },
    {
      id: 'schedules',
      content: 'Schedules',
      panelID: 'schedules-panel',
    },
    {
      id: 'settings',
      content: 'Other Settings',
      panelID: 'settings-panel',
    },
  ];

  if (loading) {
    return (
      <Page>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <Spinner size="large" />
        </div>
      </Page>
    );
  }

  return (
    <Page
      title="Configuration"
      subtitle="Manage your connection settings, entity settings, schedules, and other settings"
      primaryAction={{
        content: 'Save Changes',
        onAction: handleSave,
        loading: saving,
        disabled: saving,
      }}
      secondaryActions={[
        {
          content: 'Reset',
          onAction: loadConfig,
        },
      ]}
    >
      <BlockStack gap="400">
        {error && (
          <Banner
            title="Error"
            tone="critical"
            onDismiss={() => setError('')}
          >
            {error}
          </Banner>
        )}

        {successMessage && (
          <Banner
            title="Success"
            tone="success"
            onDismiss={() => setSuccessMessage('')}
          >
            {successMessage}
          </Banner>
        )}

        <Tabs tabs={tabs} selected={activeTab} onSelect={setActiveTab}>
          <div style={{ paddingTop: '1rem' }}>
            {activeTab === 0 && config && (
              <LocationMappingEditor
                locationMapping={config.locationMapping}
                onChange={(newLocationMapping) => setConfig({ ...config, locationMapping: newLocationMapping })}
                cin7Warehouses={options.cin7Warehouses}
                connections={options.connections}
              />
            )}

            {activeTab === 1 && config && (
              <SyncConfigEditor
                syncConfig={config.syncConfig}
                onChange={(newSyncConfig) => setConfig({ ...config, syncConfig: newSyncConfig })}
              />
            )}

            {activeTab === 2 && config && (
              <SchedulesEditor
                connectionSchedules={config.connectionSchedules || {}}
                onChange={(newConnectionSchedules) =>
                  setConfig({ ...config, connectionSchedules: newConnectionSchedules })
                }
                connections={options.connections}
                syncConfig={config.syncConfig}
                locationMapping={config.locationMapping}
              />
            )}

            {activeTab === 3 && config && (
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
        </Tabs>
      </BlockStack>
    </Page>
  );
}
