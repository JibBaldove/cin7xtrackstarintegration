import { useCallback } from 'react';
import { Card, Select, TextField, Button, Banner, BlockStack, InlineStack, Text, Divider } from '@shopify/polaris';
import type { SyncConfig, Webhook } from '../types/config';

interface Props {
  syncConfig: SyncConfig[];
  onChange: (syncConfig: SyncConfig[]) => void;
}

export function SyncConfigEditor({ syncConfig, onChange }: Props) {
  const updateSyncConfig = useCallback((index: number, field: keyof SyncConfig, value: any) => {
    const updated = [...syncConfig];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  }, [syncConfig, onChange]);

  const updateWebhook = useCallback((syncIndex: number, webhookIndex: number, field: keyof Webhook, value: any) => {
    const updated = [...syncConfig];
    const webhooks = [...(updated[syncIndex].webhook || [])];
    webhooks[webhookIndex] = { ...webhooks[webhookIndex], [field]: value };
    updated[syncIndex] = { ...updated[syncIndex], webhook: webhooks };
    onChange(updated);
  }, [syncConfig, onChange]);

  const updateSaleWebhookEvent = useCallback((syncIndex: number, webhookIndex: number, eventType: string) => {
    const updated = [...syncConfig];
    const webhooks = [...(updated[syncIndex].webhook || [])];

    const eventUrlMap: { [key: string]: string } = {
      'Sale/PickAuthorised': 'https://live.fastn.ai/api/v1/clients/d0f8c7f3-69d3-403c-90a0-17c8857e095f/webhooks/sync_salesorder_cin7_trackstar',
      'Sale/OrderAuthorised': 'https://live.fastn.ai/api/v1/clients/d0f8c7f3-69d3-403c-90a0-17c8857e095f/webhooks/sync_salesorder_cin7_trackstar_orderauthorised'
    };

    webhooks[webhookIndex] = {
      ...webhooks[webhookIndex],
      event: eventType,
      url: eventUrlMap[eventType] || ''
    };
    updated[syncIndex] = { ...updated[syncIndex], webhook: webhooks };
    onChange(updated);
  }, [syncConfig, onChange]);

  const addWebhook = useCallback((syncIndex: number) => {
    const updated = [...syncConfig];
    const webhooks = [...(updated[syncIndex].webhook || [])];
    webhooks.push({
      url: '',
      event: '',
      status: 'Active'
    });
    updated[syncIndex] = { ...updated[syncIndex], webhook: webhooks };
    onChange(updated);
  }, [syncConfig, onChange]);

  const removeWebhook = useCallback((syncIndex: number, webhookIndex: number) => {
    const updated = [...syncConfig];
    const webhooks = (updated[syncIndex].webhook || []).filter((_, i) => i !== webhookIndex);
    updated[syncIndex] = { ...updated[syncIndex], webhook: webhooks };
    onChange(updated);
  }, [syncConfig, onChange]);

  const addSyncConfig = useCallback(() => {
    onChange([...syncConfig, {
      entity: 'sale',
      status: 'Active',
      webhook: []
    }]);
  }, [syncConfig, onChange]);

  const hasWebhooks = (entity: string) => {
    return ['sale', 'purchase'].includes(entity);
  };

  const removeSyncConfig = useCallback((index: number) => {
    onChange(syncConfig.filter((_, i) => i !== index));
  }, [syncConfig, onChange]);

  const entityOptions = [
    { label: 'Sale', value: 'sale' },
    { label: 'Purchase', value: 'purchase' },
    { label: 'Inventory', value: 'inventory' },
    { label: 'Transfer', value: 'transfer' },
    { label: 'Product', value: 'product' },
  ];

  const statusOptions = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
  ];

  const quantityTypeOptions = [
    { label: 'On Hand', value: 'onhand' },
    { label: 'Sellable', value: 'sellable' },
    { label: 'Fulfillable', value: 'fulfillable' },
  ];

  const locationScopeOptions = [
    { label: 'Mapped Only', value: 'mapped' },
    { label: 'All Locations', value: 'all' },
  ];

  const saleEventOptions = [
    { label: 'Select Event Type', value: '' },
    { label: 'Pick Authorised', value: 'Sale/PickAuthorised' },
    { label: 'Order Authorised', value: 'Sale/OrderAuthorised' },
  ];

  return (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="center">
        <Text as="h2" variant="headingLg">Sync Configuration</Text>
        <Button onClick={addSyncConfig}>Add Entity</Button>
      </InlineStack>

      {syncConfig.map((sync, syncIndex) => (
        <Card key={syncIndex}>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h3" variant="headingMd">Entity {syncIndex + 1}</Text>
              <Button tone="critical" onClick={() => removeSyncConfig(syncIndex)}>
                Remove
              </Button>
            </InlineStack>

            <InlineStack gap="400">
              <div style={{ flex: 1 }}>
                <Select
                  label="Entity Type"
                  options={entityOptions}
                  value={sync.entity}
                  onChange={(value) => updateSyncConfig(syncIndex, 'entity', value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Select
                  label="Status"
                  options={statusOptions}
                  value={sync.status}
                  onChange={(value) => updateSyncConfig(syncIndex, 'status', value)}
                />
              </div>
            </InlineStack>

            {/* Inventory-specific fields */}
            {sync.entity === 'inventory' && (
              <Card background="bg-surface-info-hover">
                <BlockStack gap="400">
                  <Text as="h4" variant="headingSm">Inventory Settings</Text>

                  <InlineStack gap="400">
                    <div style={{ flex: 1 }}>
                      <Select
                        label="Quantity Type"
                        options={quantityTypeOptions}
                        value={sync.quantityType || 'onhand'}
                        onChange={(value) => updateSyncConfig(syncIndex, 'quantityType', value)}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Select
                        label="Location Scope"
                        options={locationScopeOptions}
                        value={sync.locationScope || 'mapped'}
                        onChange={(value) => updateSyncConfig(syncIndex, 'locationScope', value)}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Auto Accept Threshold"
                        type="number"
                        value={String(sync.autoAcceptThreshold ?? 0)}
                        onChange={(value) => updateSyncConfig(syncIndex, 'autoAcceptThreshold', parseInt(value) || 0)}
                        min={0}
                        autoComplete="off"
                      />
                    </div>
                  </InlineStack>

                  <BlockStack gap="100">
                    <Text as="p" variant="bodySm" tone="subdued">
                      <strong>Quantity Type:</strong> On Hand (physical inventory), Sellable (on hand - unsellable), or Fulfillable (on hand - committed - unfulfillable)
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      <strong>Location Scope:</strong> Sync only mapped warehouses or all locations
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      <strong>Auto Accept:</strong> Automatically accept inventory updates with differences below this threshold
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>
            )}

            {/* Webhooks section */}
            {hasWebhooks(sync.entity) && (
              <BlockStack gap="400">
                <Divider />
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">Webhooks</Text>
                  <Button tone="success" onClick={() => addWebhook(syncIndex)}>
                    Add Webhook
                  </Button>
                </InlineStack>

                {(sync.webhook || []).map((webhook, webhookIndex) => (
                  <Card key={webhookIndex} background="bg-surface-secondary">
                    <BlockStack gap="400">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="strong" variant="bodySm">Webhook {webhookIndex + 1}</Text>
                        <Button
                          size="slim"
                          tone="critical"
                          onClick={() => removeWebhook(syncIndex, webhookIndex)}
                        >
                          Remove
                        </Button>
                      </InlineStack>

                      {sync.entity === 'sale' ? (
                        <InlineStack gap="400">
                          <div style={{ flex: 1 }}>
                            <Select
                              label="Event Type"
                              options={saleEventOptions}
                              value={webhook.event}
                              onChange={(value) => updateSaleWebhookEvent(syncIndex, webhookIndex, value)}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <Select
                              label="Status"
                              options={statusOptions}
                              value={webhook.status}
                              onChange={(value) => updateWebhook(syncIndex, webhookIndex, 'status', value)}
                            />
                          </div>
                        </InlineStack>
                      ) : (
                        <BlockStack gap="400">
                          <TextField
                            label="URL"
                            value={webhook.url}
                            onChange={(value) => updateWebhook(syncIndex, webhookIndex, 'url', value)}
                            placeholder="https://..."
                            autoComplete="off"
                          />
                          <InlineStack gap="400">
                            <div style={{ flex: 1 }}>
                              <TextField
                                label="Event"
                                value={webhook.event}
                                onChange={(value) => updateWebhook(syncIndex, webhookIndex, 'event', value)}
                                placeholder="e.g., Purchase/OrderAuthorised"
                                autoComplete="off"
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <Select
                                label="Status"
                                options={statusOptions}
                                value={webhook.status}
                                onChange={(value) => updateWebhook(syncIndex, webhookIndex, 'status', value)}
                              />
                            </div>
                          </InlineStack>
                        </BlockStack>
                      )}
                    </BlockStack>
                  </Card>
                ))}
              </BlockStack>
            )}

            {/* Message for entities without webhooks */}
            {!hasWebhooks(sync.entity) && (
              <Banner tone="info">
                This entity type does not use webhooks. Configuration is applied directly.
              </Banner>
            )}
          </BlockStack>
        </Card>
      ))}

      {syncConfig.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          backgroundColor: 'var(--p-color-bg-surface-secondary)',
          borderRadius: 'var(--p-border-radius-200)',
          border: '1px dashed var(--p-color-border)'
        }}>
          <Text as="p" variant="bodySm" tone="subdued">
            No sync configurations yet. Click "Add Entity" to create one.
          </Text>
        </div>
      )}
    </BlockStack>
  );
}
