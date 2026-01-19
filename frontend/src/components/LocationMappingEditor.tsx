import { useCallback } from 'react';
import { Card, TextField, Button, Banner, BlockStack, InlineStack, Text, Badge, Divider } from '@shopify/polaris';
import type { LocationMapping, SubstitutionList, Cin7Warehouse, Connection } from '../types/config';
import { SearchableSelect } from './SearchableSelect';

interface Props {
  locationMapping: LocationMapping[];
  onChange: (locationMapping: LocationMapping[]) => void;
  cin7Warehouses: Cin7Warehouse[];
  connections: Connection[];
}

export function LocationMappingEditor({
  locationMapping,
  onChange,
  cin7Warehouses,
  connections
}: Props) {
  const updateLocationMapping = useCallback((index: number, field: keyof LocationMapping, value: any) => {
    const updated = [...locationMapping];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  }, [locationMapping, onChange]);

  const addWarehouse = useCallback((locationIndex: number) => {
    const updated = [...locationMapping];
    const warehouses = [...updated[locationIndex].warehouses];
    warehouses.push({
      cin7WarehouseId: '',
      cin7WarehouseName: '',
      trackstarLocationId: ''
    });
    updated[locationIndex] = { ...updated[locationIndex], warehouses };
    onChange(updated);
  }, [locationMapping, onChange]);

  const updateWarehouseMapping = useCallback((
    locationIndex: number,
    warehouseIndex: number,
    field: keyof import('../types/config').WarehouseMapping,
    value: string
  ) => {
    const updated = [...locationMapping];
    const warehouses = [...updated[locationIndex].warehouses];
    warehouses[warehouseIndex] = { ...warehouses[warehouseIndex], [field]: value };
    updated[locationIndex] = { ...updated[locationIndex], warehouses };
    onChange(updated);
  }, [locationMapping, onChange]);

  const updateCin7Warehouse = useCallback((locationIndex: number, warehouseIndex: number, cin7WarehouseId: string) => {
    const updated = [...locationMapping];
    const warehouses = [...updated[locationIndex].warehouses];
    const selectedWarehouse = cin7Warehouses.find(w => w.id === cin7WarehouseId);
    warehouses[warehouseIndex] = {
      ...warehouses[warehouseIndex],
      cin7WarehouseId: cin7WarehouseId,
      cin7WarehouseName: selectedWarehouse?.name || ''
    };
    updated[locationIndex] = { ...updated[locationIndex], warehouses };
    onChange(updated);
  }, [locationMapping, cin7Warehouses, onChange]);

  const removeWarehouse = useCallback((locationIndex: number, warehouseIndex: number) => {
    const updated = [...locationMapping];
    const warehouses = updated[locationIndex].warehouses.filter((_, i) => i !== warehouseIndex);
    updated[locationIndex] = { ...updated[locationIndex], warehouses };
    onChange(updated);
  }, [locationMapping, onChange]);

  const removeLocationMapping = useCallback((index: number) => {
    onChange(locationMapping.filter((_, i) => i !== index));
  }, [locationMapping, onChange]);

  const addSubstitutionList = useCallback((locationIndex: number) => {
    const updated = [...locationMapping];
    if (!updated[locationIndex].substitutionList) {
      updated[locationIndex].substitutionList = [];
    }
    updated[locationIndex].substitutionList!.push({
      listName: '',
      mapping: {}
    });
    onChange(updated);
  }, [locationMapping, onChange]);

  const updateSubstitutionList = useCallback((locationIndex: number, subIndex: number, field: keyof SubstitutionList, value: any) => {
    const updated = [...locationMapping];
    const substitutionList = [...(updated[locationIndex].substitutionList || [])];
    substitutionList[subIndex] = { ...substitutionList[subIndex], [field]: value };
    updated[locationIndex] = { ...updated[locationIndex], substitutionList };
    onChange(updated);
  }, [locationMapping, onChange]);

  const addSubstitutionMapping = useCallback((locationIndex: number, subIndex: number) => {
    const updated = [...locationMapping];
    const substitutionList = [...(updated[locationIndex].substitutionList || [])];
    const mapping = { ...substitutionList[subIndex].mapping };

    let keyName = 'New Key';
    let counter = 1;
    while (mapping[keyName] !== undefined) {
      keyName = `New Key ${counter}`;
      counter++;
    }

    mapping[keyName] = '';
    substitutionList[subIndex] = { ...substitutionList[subIndex], mapping };
    updated[locationIndex] = { ...updated[locationIndex], substitutionList };
    onChange(updated);
  }, [locationMapping, onChange]);

  const updateSubstitutionMapping = useCallback((locationIndex: number, subIndex: number, key: string, value: string) => {
    const updated = [...locationMapping];
    const substitutionList = [...(updated[locationIndex].substitutionList || [])];
    const mapping = { ...substitutionList[subIndex].mapping };
    mapping[key] = value;
    substitutionList[subIndex] = { ...substitutionList[subIndex], mapping };
    updated[locationIndex] = { ...updated[locationIndex], substitutionList };
    onChange(updated);
  }, [locationMapping, onChange]);

  const renameSubstitutionKey = useCallback((locationIndex: number, subIndex: number, oldKey: string, newKey: string) => {
    const updated = [...locationMapping];
    const substitutionList = [...(updated[locationIndex].substitutionList || [])];
    const mapping = { ...substitutionList[subIndex].mapping };

    if (oldKey === newKey || (mapping[newKey] !== undefined && oldKey !== newKey)) {
      return;
    }

    const value = mapping[oldKey];
    delete mapping[oldKey];
    mapping[newKey] = value;

    substitutionList[subIndex] = { ...substitutionList[subIndex], mapping };
    updated[locationIndex] = { ...updated[locationIndex], substitutionList };
    onChange(updated);
  }, [locationMapping, onChange]);

  const removeSubstitutionMapping = useCallback((locationIndex: number, subIndex: number, key: string) => {
    const updated = [...locationMapping];
    const substitutionList = [...(updated[locationIndex].substitutionList || [])];
    const mapping = { ...substitutionList[subIndex].mapping };
    delete mapping[key];
    substitutionList[subIndex] = { ...substitutionList[subIndex], mapping };
    updated[locationIndex] = { ...updated[locationIndex], substitutionList };
    onChange(updated);
  }, [locationMapping, onChange]);

  const removeSubstitutionList = useCallback((locationIndex: number, subIndex: number) => {
    const updated = [...locationMapping];
    const substitutionList = (updated[locationIndex].substitutionList || []).filter((_, i) => i !== subIndex);
    updated[locationIndex] = { ...updated[locationIndex], substitutionList };
    onChange(updated);
  }, [locationMapping, onChange]);

  const usedConnectionIds = locationMapping.map(loc => loc.connectionId);
  const availableConnections = connections.filter(conn => !usedConnectionIds.includes(conn.id));

  return (
    <BlockStack gap="400">
      <BlockStack gap="200">
        <Text as="h2" variant="headingLg">Location Mapping</Text>
        <Text as="p" variant="bodySm" tone="subdued">
          Configure warehouse mappings for each connection. Cin7 warehouses will be mapped to Trackstar locations.
        </Text>
      </BlockStack>

      {availableConnections.length > 0 && (
        <Banner tone="info">
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd" fontWeight="semibold">
              Available Connections to Configure:
            </Text>
            <InlineStack gap="200" wrap>
              {availableConnections.map((conn) => (
                <Button
                  key={conn.id}
                  onClick={() => {
                    onChange([...locationMapping, {
                      warehouses: [],
                      connectionId: conn.id,
                      substitutionList: []
                    }]);
                  }}
                >
                  Configure {conn.name}
                </Button>
              ))}
            </InlineStack>
          </BlockStack>
        </Banner>
      )}

      {locationMapping.map((location, locationIndex) => {
        const selectedConnection = connections.find(conn => conn.id === location.connectionId);
        const connectionName = selectedConnection?.name || 'Unknown Connection';

        return (
          <Card key={locationIndex}>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text as="h3" variant="headingMd">{connectionName}</Text>
                  <Text as="p" variant="bodySm" tone="subdued" fontWeight="medium">
                    ID: {location.connectionId || 'Not set'}
                  </Text>
                </BlockStack>
                <Button tone="critical" onClick={() => removeLocationMapping(locationIndex)}>
                  Remove Connection
                </Button>
              </InlineStack>

              {!location.connectionId && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Select Connection
                  </label>
                  <SearchableSelect
                    options={connections.map(conn => ({ id: conn.id, name: conn.name }))}
                    value={location.connectionId}
                    onChange={(value) => updateLocationMapping(locationIndex, 'connectionId', value)}
                    placeholder="Select connection..."
                  />
                </div>
              )}

              <BlockStack gap="400">
                <Divider />
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">Warehouse Mappings</Text>
                  <Button
                    onClick={() => addWarehouse(locationIndex)}
                    disabled={!location.connectionId}
                    tone="success"
                  >
                    Add Mapping
                  </Button>
                </InlineStack>

                {location.warehouses.map((warehouse, warehouseIndex) => {
                  const selectedConnection = connections.find(conn => conn.id === location.connectionId);
                  const trackstarLocations = selectedConnection?.locations || [];

                  return (
                    <Card key={warehouseIndex} background="bg-surface-secondary">
                      <BlockStack gap="400">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text as="strong" variant="bodySm">Mapping {warehouseIndex + 1}</Text>
                          <Button
                            size="slim"
                            tone="critical"
                            onClick={() => removeWarehouse(locationIndex, warehouseIndex)}
                          >
                            Remove
                          </Button>
                        </InlineStack>

                        {!location.connectionId ? (
                          <Banner tone="warning">
                            Please select a connection first to enable warehouse mapping.
                          </Banner>
                        ) : (
                          <InlineStack gap="400">
                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                Cin7 Warehouse
                              </label>
                              <SearchableSelect
                                options={cin7Warehouses}
                                value={warehouse.cin7WarehouseId}
                                onChange={(value) => updateCin7Warehouse(locationIndex, warehouseIndex, value)}
                                placeholder="Select Cin7 warehouse..."
                              />
                              {warehouse.cin7WarehouseId && (
                                <BlockStack gap="100">
                                  {warehouse.cin7WarehouseName && (
                                    <Text as="p" variant="bodySm" tone="subdued">
                                      {warehouse.cin7WarehouseName}
                                    </Text>
                                  )}
                                  <Text as="p" variant="bodyXs" tone="subdued" fontWeight="medium">
                                    ID: {warehouse.cin7WarehouseId}
                                  </Text>
                                </BlockStack>
                              )}
                            </div>

                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                Trackstar Location
                              </label>
                              <SearchableSelect
                                options={trackstarLocations}
                                value={warehouse.trackstarLocationId}
                                onChange={(value) => updateWarehouseMapping(locationIndex, warehouseIndex, 'trackstarLocationId', value)}
                                placeholder="Select Trackstar location..."
                                disabled={trackstarLocations.length === 0}
                              />
                              {warehouse.trackstarLocationId && (
                                <Text as="p" variant="bodyXs" tone="subdued" fontWeight="medium">
                                  ID: {warehouse.trackstarLocationId}
                                </Text>
                              )}
                              {trackstarLocations.length === 0 && (
                                <Text as="p" variant="bodySm" tone="critical">
                                  No locations available for this connection
                                </Text>
                              )}
                            </div>
                          </InlineStack>
                        )}
                      </BlockStack>
                    </Card>
                  );
                })}

                {location.warehouses.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '2rem',
                    backgroundColor: 'var(--p-color-bg-surface)',
                    borderRadius: 'var(--p-border-radius-200)',
                    border: '1px dashed var(--p-color-border)'
                  }}>
                    <Text as="p" variant="bodySm" tone="subdued">
                      No warehouse mappings configured. Click "Add Mapping" to create one.
                    </Text>
                  </div>
                )}
              </BlockStack>

              <BlockStack gap="400">
                <Divider />
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">Substitution Lists</Text>
                  <Button onClick={() => addSubstitutionList(locationIndex)}>
                    Add Substitution List
                  </Button>
                </InlineStack>

                {(location.substitutionList || []).map((subList, subIndex) => (
                  <Card key={subIndex} background="bg-surface-secondary">
                    <BlockStack gap="400">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="strong" variant="bodySm">Substitution List {subIndex + 1}</Text>
                        <Button
                          size="slim"
                          tone="critical"
                          onClick={() => removeSubstitutionList(locationIndex, subIndex)}
                        >
                          Remove
                        </Button>
                      </InlineStack>

                      <TextField
                        label="List Name"
                        value={subList.listName}
                        onChange={(value) => updateSubstitutionList(locationIndex, subIndex, 'listName', value)}
                        placeholder="e.g., country"
                        autoComplete="off"
                      />

                      <BlockStack gap="200">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text as="p" variant="bodySm" fontWeight="semibold">Mappings</Text>
                          <Button size="slim" tone="success" onClick={() => addSubstitutionMapping(locationIndex, subIndex)}>
                            Add
                          </Button>
                        </InlineStack>

                        {Object.entries(subList.mapping).map(([key, value]) => (
                          <InlineStack key={key} gap="200" blockAlign="end">
                            <div style={{ flex: 1 }}>
                              <TextField
                                label="Cin7 value"
                                value={key}
                                onBlur={(e: any) => {
                                  const newKey = e.target.value.trim();
                                  if (newKey && newKey !== key) {
                                    renameSubstitutionKey(locationIndex, subIndex, key, newKey);
                                  }
                                }}
                                placeholder="e.g., United States"
                                autoComplete="off"
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <TextField
                                label="Trackstar value"
                                value={value}
                                onChange={(v) => updateSubstitutionMapping(locationIndex, subIndex, key, v)}
                                placeholder="e.g., US"
                                autoComplete="off"
                              />
                            </div>
                            <Button
                              size="slim"
                              tone="critical"
                              onClick={() => removeSubstitutionMapping(locationIndex, subIndex, key)}
                            >
                              X
                            </Button>
                          </InlineStack>
                        ))}
                      </BlockStack>
                    </BlockStack>
                  </Card>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        );
      })}

      {locationMapping.length === 0 && availableConnections.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          backgroundColor: 'var(--p-color-bg-surface-secondary)',
          borderRadius: 'var(--p-border-radius-200)',
          border: '1px dashed var(--p-color-border)'
        }}>
          <Text as="p" variant="bodySm" tone="subdued">
            No connections available to configure. Please check your connection settings.
          </Text>
        </div>
      )}

      {locationMapping.length === 0 && availableConnections.length > 0 && (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          backgroundColor: 'var(--p-color-bg-surface-secondary)',
          borderRadius: 'var(--p-border-radius-200)',
          border: '1px dashed var(--p-color-border)'
        }}>
          <Text as="p" variant="bodySm" tone="subdued">
            No location mappings configured yet. Select a connection above to get started.
          </Text>
        </div>
      )}
    </BlockStack>
  );
}
