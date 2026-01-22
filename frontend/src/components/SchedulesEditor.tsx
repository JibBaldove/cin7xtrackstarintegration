import { useCallback, useState, useEffect } from 'react';
import { Card, TextField, Button, Banner, BlockStack, InlineStack, Text, Badge, Divider, Select } from '@shopify/polaris';
import type { ConnectionSchedules, Connection, SyncConfig, Schedule, LocationMapping } from '../types/config';
import { apiClient } from '../api/client';

interface Props {
  connectionSchedules: ConnectionSchedules;
  onChange: (connectionSchedules: ConnectionSchedules) => void;
  connections: Connection[];
  syncConfig: SyncConfig[];
  locationMapping: LocationMapping[];
}

export function SchedulesEditor({
  connectionSchedules,
  onChange,
  connections,
  syncConfig,
  locationMapping
}: Props) {
  const [triggeringSync, setTriggeringSync] = useState<Record<string, boolean>>({});
  const [syncError, setSyncError] = useState<string>('');
  const [syncSuccess, setSyncSuccess] = useState<string>('');

  // Automatically activate schedules for required entities (inventory, transfer)
  useEffect(() => {
    const activeEntities = syncConfig
      .filter(config => config.status === 'Active')
      .map(config => config.entity);

    const requiredEntities = activeEntities.filter(entity => ['inventory', 'transfer'].includes(entity));

    if (requiredEntities.length > 0 && locationMapping.length > 0) {
      let hasChanges = false;
      const updated = { ...connectionSchedules };

      // Only process connections that are configured in locationMapping
      const configuredConnectionIds = locationMapping.map(loc => loc.connectionId);
      const configuredConnections = connections.filter(conn => configuredConnectionIds.includes(conn.id));

      configuredConnections.forEach(connection => {
        const entitySchedules = updated[connection.id] || {};
        const newEntitySchedules = { ...entitySchedules };

        requiredEntities.forEach(entity => {
          const schedule = newEntitySchedules[entity as keyof typeof newEntitySchedules];
          if (!schedule || schedule.status !== 'Active') {
            newEntitySchedules[entity as keyof typeof newEntitySchedules] = {
              status: 'Active',
              interval: schedule?.interval || ''
            };
            hasChanges = true;
          }
        });

        if (hasChanges) {
          updated[connection.id] = newEntitySchedules;
        }
      });

      if (hasChanges) {
        onChange(updated);
      }
    }
  }, [syncConfig, connections, locationMapping, connectionSchedules, onChange]);

  const updateSchedule = useCallback((connectionId: string, entity: string, field: 'status' | 'interval', value: any) => {
    const entitySchedules = connectionSchedules[connectionId] || {};
    const schedule = entitySchedules[entity as keyof typeof entitySchedules] || { status: 'Inactive', interval: '' };
    onChange({
      ...connectionSchedules,
      [connectionId]: {
        ...entitySchedules,
        [entity]: { ...schedule, [field]: value }
      }
    });
  }, [connectionSchedules, onChange]);

  const handleManualTrigger = useCallback(async (connectionId: string, entity: string) => {
    const triggerKey = `${connectionId}-${entity}`;
    try {
      setTriggeringSync(prev => ({ ...prev, [triggerKey]: true }));
      setSyncError('');
      setSyncSuccess('');

      await apiClient.triggerEntitySync(entity, connectionId);

      setSyncSuccess(`Successfully triggered ${entity} sync for connection ${connectionId}`);
      setTimeout(() => setSyncSuccess(''), 5000);
    } catch (error: any) {
      console.error('Failed to trigger sync:', error);
      setSyncError(`Failed to trigger ${entity} sync: ${error.message || 'Unknown error'}`);
      setTimeout(() => setSyncError(''), 5000);
    } finally {
      setTriggeringSync(prev => ({ ...prev, [triggerKey]: false }));
    }
  }, []);

  const getActiveEntities = useCallback(() => {
    const activeEntities = syncConfig
      .filter(config => config.status === 'Active')
      .map(config => config.entity);

    // Remove duplicate purchase if it appears (as it may have multiple webhooks)
    return Array.from(new Set(activeEntities));
  }, [syncConfig]);

  const isScheduleRequired = useCallback((entity: string) => {
    return ['inventory', 'transfer'].includes(entity);
  }, []);

  const getEntityLabel = useCallback((entity: string) => {
    const labels: Record<string, string> = {
      'sale': 'Sale',
      'purchase': 'Purchase',
      'inventory': 'Inventory',
      'transfer': 'Transfer',
      'product': 'Product'
    };
    return labels[entity] || entity;
  }, []);

  return (
    <BlockStack gap="400">
      <BlockStack gap="200">
        <Text as="h2" variant="headingLg">Schedules</Text>
        <Text as="p" variant="bodySm" tone="subdued">
          Configure scheduled sync jobs for each connection. Schedules for Inventory and Transfer are required when these entities are active.
        </Text>
      </BlockStack>

      {syncError && (
        <Banner tone="critical" onDismiss={() => setSyncError('')}>
          {syncError}
        </Banner>
      )}

      {syncSuccess && (
        <Banner tone="success" onDismiss={() => setSyncSuccess('')}>
          {syncSuccess}
        </Banner>
      )}

      {getActiveEntities().length === 0 ? (
        <Banner tone="info">
          No active entities configured. Please activate entities in the Entity Settings tab first.
        </Banner>
      ) : locationMapping.length === 0 ? (
        <Banner tone="warning">
          No connections configured. Please configure connections in the Connection Settings tab first.
        </Banner>
      ) : (
        connections
          .filter(conn => locationMapping.some(loc => loc.connectionId === conn.id))
          .map((connection) => {
          const entitySchedules = connectionSchedules[connection.id] || {};

          return (
            <Card key={connection.id}>
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <Text as="h3" variant="headingMd">{connection.name}</Text>
                  <Text as="p" variant="bodySm" tone="subdued" fontWeight="medium">
                    ID: {connection.id}
                  </Text>
                </BlockStack>

                <Divider />

                <BlockStack gap="300">
                  {getActiveEntities().map((entity) => {
                    const schedule: Schedule = entitySchedules[entity as keyof typeof entitySchedules] || { status: 'Inactive', interval: '' };
                    const isRequired = isScheduleRequired(entity);
                    const isActive = schedule.status === 'Active';
                    const triggerKey = `${connection.id}-${entity}`;
                    const isTriggering = triggeringSync[triggerKey] || false;

                    return (
                      <Card key={entity} background="bg-surface-secondary">
                        <BlockStack gap="300">
                          <InlineStack align="space-between" blockAlign="center">
                            <InlineStack gap="200" blockAlign="center">
                              <Text as="strong" variant="bodySm">{getEntityLabel(entity)}</Text>
                              {isRequired && (
                                <Badge tone={isActive ? 'success' : 'critical'}>
                                  {isActive ? 'Required - Active' : 'Required'}
                                </Badge>
                              )}
                            </InlineStack>
                            <Button
                              size="slim"
                              onClick={() => handleManualTrigger(connection.id, entity)}
                              disabled={!isActive || isTriggering}
                              loading={isTriggering}
                            >
                              Trigger Now
                            </Button>
                          </InlineStack>

                          {isRequired && !isActive && (
                            <Banner tone="warning">
                              Schedule is required for {getEntityLabel(entity)} when the entity is active.
                            </Banner>
                          )}

                          <InlineStack gap="400" blockAlign="end">
                            <div style={{ flex: 1 }}>
                              <Select
                                label="Schedule Status"
                                options={[
                                  { label: 'Active', value: 'Active' },
                                  { label: 'Inactive', value: 'Inactive' }
                                ]}
                                value={schedule.status}
                                onChange={(value) => updateSchedule(connection.id, entity, 'status', value)}
                                disabled={isRequired}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <TextField
                                label="Runs every (in hours)"
                                type="number"
                                value={schedule.interval}
                                onChange={(value) => updateSchedule(connection.id, entity, 'interval', value)}
                                placeholder="e.g., 10"
                                autoComplete="off"
                                disabled={!isActive}
                                min={1}
                              />
                            </div>
                          </InlineStack>
                        </BlockStack>
                      </Card>
                    );
                  })}
                </BlockStack>

                {/* Notification Schedule Section */}
                <BlockStack gap="300">
                  <Divider />
                  <Text as="p" variant="bodyMd" fontWeight="semibold">Email Notification</Text>
                  {(() => {
                    const notificationSchedule: Schedule = entitySchedules.notification || { status: 'Inactive', interval: '' };
                    const isActive = notificationSchedule.status === 'Active';
                    const triggerKey = `${connection.id}-notification`;
                    const isTriggering = triggeringSync[triggerKey] || false;

                    return (
                      <Card background="bg-surface-secondary">
                        <BlockStack gap="300">
                          <InlineStack align="space-between" blockAlign="center">
                            <Text as="strong" variant="bodySm">Notification</Text>
                            <Button
                              size="slim"
                              onClick={() => handleManualTrigger(connection.id, 'notification')}
                              disabled={!isActive || isTriggering}
                              loading={isTriggering}
                            >
                              Trigger Now
                            </Button>
                          </InlineStack>

                          <InlineStack gap="400" blockAlign="end">
                            <div style={{ flex: 1 }}>
                              <Select
                                label="Schedule Status"
                                options={[
                                  { label: 'Active', value: 'Active' },
                                  { label: 'Inactive', value: 'Inactive' }
                                ]}
                                value={notificationSchedule.status}
                                onChange={(value) => updateSchedule(connection.id, 'notification', 'status', value)}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <TextField
                                label="Runs every (in hours)"
                                type="number"
                                value={notificationSchedule.interval}
                                onChange={(value) => updateSchedule(connection.id, 'notification', 'interval', value)}
                                placeholder="e.g., 24"
                                autoComplete="off"
                                disabled={!isActive}
                                min={1}
                              />
                            </div>
                          </InlineStack>
                        </BlockStack>
                      </Card>
                    );
                  })()}
                </BlockStack>
              </BlockStack>
            </Card>
          );
        })
      )}
    </BlockStack>
  );
}
