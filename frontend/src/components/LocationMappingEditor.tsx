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
  const updateLocationMapping = (index: number, field: keyof LocationMapping, value: any) => {
    const updated = [...locationMapping];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addWarehouse = (locationIndex: number) => {
    const updated = [...locationMapping];
    const warehouses = [...updated[locationIndex].warehouses];
    warehouses.push({
      cin7WarehouseId: '',
      cin7WarehouseName: '',
      trackstarLocationId: ''
    });
    updated[locationIndex] = { ...updated[locationIndex], warehouses };
    onChange(updated);
  };

  const updateWarehouseMapping = (
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
  };

  const updateCin7Warehouse = (locationIndex: number, warehouseIndex: number, cin7WarehouseId: string) => {
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
  };

  const removeWarehouse = (locationIndex: number, warehouseIndex: number) => {
    const updated = [...locationMapping];
    const warehouses = updated[locationIndex].warehouses.filter((_, i) => i !== warehouseIndex);
    updated[locationIndex] = { ...updated[locationIndex], warehouses };
    onChange(updated);
  };

  const removeLocationMapping = (index: number) => {
    onChange(locationMapping.filter((_, i) => i !== index));
  };

  const addSubstitutionList = (locationIndex: number) => {
    const updated = [...locationMapping];
    if (!updated[locationIndex].substitutionList) {
      updated[locationIndex].substitutionList = [];
    }
    updated[locationIndex].substitutionList!.push({
      listName: '',
      mapping: {}
    });
    onChange(updated);
  };

  const updateSubstitutionList = (locationIndex: number, subIndex: number, field: keyof SubstitutionList, value: any) => {
    const updated = [...locationMapping];
    const substitutionList = [...(updated[locationIndex].substitutionList || [])];
    substitutionList[subIndex] = { ...substitutionList[subIndex], [field]: value };
    updated[locationIndex] = { ...updated[locationIndex], substitutionList };
    onChange(updated);
  };

  const addSubstitutionMapping = (locationIndex: number, subIndex: number) => {
    const updated = [...locationMapping];
    const substitutionList = [...(updated[locationIndex].substitutionList || [])];
    const mapping = { ...substitutionList[subIndex].mapping };

    // Find a unique key name
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
  };

  const updateSubstitutionMapping = (locationIndex: number, subIndex: number, key: string, value: string) => {
    const updated = [...locationMapping];
    const substitutionList = [...(updated[locationIndex].substitutionList || [])];
    const mapping = { ...substitutionList[subIndex].mapping };
    mapping[key] = value;
    substitutionList[subIndex] = { ...substitutionList[subIndex], mapping };
    updated[locationIndex] = { ...updated[locationIndex], substitutionList };
    onChange(updated);
  };

  const renameSubstitutionKey = (locationIndex: number, subIndex: number, oldKey: string, newKey: string) => {
    const updated = [...locationMapping];
    const substitutionList = [...(updated[locationIndex].substitutionList || [])];
    const mapping = { ...substitutionList[subIndex].mapping };

    // Don't rename if key hasn't changed or new key already exists
    if (oldKey === newKey || (mapping[newKey] !== undefined && oldKey !== newKey)) {
      return;
    }

    // Store the value, delete old key, add new key
    const value = mapping[oldKey];
    delete mapping[oldKey];
    mapping[newKey] = value;

    substitutionList[subIndex] = { ...substitutionList[subIndex], mapping };
    updated[locationIndex] = { ...updated[locationIndex], substitutionList };
    onChange(updated);
  };

  const removeSubstitutionMapping = (locationIndex: number, subIndex: number, key: string) => {
    const updated = [...locationMapping];
    const substitutionList = [...(updated[locationIndex].substitutionList || [])];
    const mapping = { ...substitutionList[subIndex].mapping };
    delete mapping[key];
    substitutionList[subIndex] = { ...substitutionList[subIndex], mapping };
    updated[locationIndex] = { ...updated[locationIndex], substitutionList };
    onChange(updated);
  };

  const removeSubstitutionList = (locationIndex: number, subIndex: number) => {
    const updated = [...locationMapping];
    const substitutionList = (updated[locationIndex].substitutionList || []).filter((_, i) => i !== subIndex);
    updated[locationIndex] = { ...updated[locationIndex], substitutionList };
    onChange(updated);
  };

  // Get list of connections that don't have mappings yet
  const usedConnectionIds = locationMapping.map(loc => loc.connectionId);
  const availableConnections = connections.filter(conn => !usedConnectionIds.includes(conn.id));

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>Location Mapping</h2>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>
          Configure warehouse mappings for each connection. Cin7 warehouses will be mapped to Trackstar locations.
        </p>
      </div>

      {/* Show available connections if any */}
      {availableConnections.length > 0 && (
        <div style={{
          backgroundColor: '#e7f3ff',
          border: '1px solid #b3d9ff',
          borderRadius: '4px',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ marginBottom: '0.75rem', fontWeight: '500', fontSize: '0.875rem' }}>
            Available Connections to Configure:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {availableConnections.map((conn) => (
              <button
                key={conn.id}
                onClick={() => {
                  onChange([...locationMapping, {
                    warehouses: [],
                    connectionId: conn.id,
                    substitutionList: []
                  }]);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                + Configure {conn.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {locationMapping.map((location, locationIndex) => {
        const selectedConnection = connections.find(conn => conn.id === location.connectionId);
        const connectionName = selectedConnection?.name || 'Unknown Connection';

        return (
          <div
            key={locationIndex}
            style={{
              border: '2px solid #007bff',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '1rem',
              backgroundColor: '#fafafa'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem' }}>{connectionName}</h3>
                <div style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'monospace' }}>
                  ID: {location.connectionId || 'Not set'}
                </div>
              </div>
              <button
                onClick={() => removeLocationMapping(locationIndex)}
                style={{
                  padding: '0.25rem 0.75rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Remove Connection
              </button>
            </div>

            {!location.connectionId && (
              <div style={{ marginBottom: '1rem' }}>
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

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: '500' }}>Warehouse Mappings</label>
              <button
                onClick={() => addWarehouse(locationIndex)}
                disabled={!location.connectionId}
                style={{
                  padding: '0.25rem 0.75rem',
                  backgroundColor: !location.connectionId ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: !location.connectionId ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem'
                }}
                title={!location.connectionId ? 'Select a connection first' : ''}
              >
                + Add Mapping
              </button>
            </div>

            {location.warehouses.map((warehouse, warehouseIndex) => {
              // Get Trackstar locations for the selected connection
              const selectedConnection = connections.find(conn => conn.id === location.connectionId);
              const trackstarLocations = selectedConnection?.locations || [];

              return (
                <div
                  key={warehouseIndex}
                  style={{
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '1rem',
                    marginBottom: '0.5rem',
                    backgroundColor: 'white'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <strong style={{ fontSize: '0.875rem' }}>Mapping {warehouseIndex + 1}</strong>
                    <button
                      onClick={() => removeWarehouse(locationIndex, warehouseIndex)}
                      style={{
                        padding: '0.125rem 0.5rem',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                    >
                      Remove
                    </button>
                  </div>

                  {!location.connectionId ? (
                    <div style={{
                      padding: '1rem',
                      backgroundColor: '#fff3cd',
                      border: '1px solid #ffc107',
                      borderRadius: '4px',
                      color: '#856404',
                      fontSize: '0.875rem'
                    }}>
                      Please select a connection first to enable warehouse mapping.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                          Cin7 Warehouse
                        </label>
                        <SearchableSelect
                          options={cin7Warehouses}
                          value={warehouse.cin7WarehouseId}
                          onChange={(value) => updateCin7Warehouse(locationIndex, warehouseIndex, value)}
                          placeholder="Select Cin7 warehouse..."
                        />
                        {warehouse.cin7WarehouseId && (
                          <div style={{ marginTop: '0.25rem' }}>
                            {warehouse.cin7WarehouseName && (
                              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.125rem' }}>
                                {warehouse.cin7WarehouseName}
                              </div>
                            )}
                            <div style={{
                              fontSize: '0.7rem',
                              color: '#999',
                              fontFamily: 'monospace',
                              letterSpacing: '-0.02em'
                            }}>
                              ID: {warehouse.cin7WarehouseId}
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
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
                          <div style={{
                            marginTop: '0.25rem',
                            fontSize: '0.7rem',
                            color: '#999',
                            fontFamily: 'monospace',
                            letterSpacing: '-0.02em'
                          }}>
                            ID: {warehouse.trackstarLocationId}
                          </div>
                        )}
                        {trackstarLocations.length === 0 && (
                          <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#dc3545' }}>
                            No locations available for this connection
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {location.warehouses.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '1rem',
                color: '#666',
                backgroundColor: 'white',
                borderRadius: '4px',
                border: '1px dashed #ddd',
                fontSize: '0.875rem'
              }}>
                No warehouse mappings configured. Click "Add Warehouse" to create one.
              </div>
            )}
          </div>

          {/* Default 3PL Shipping Method */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Default 3PL Shipping Method
            </label>
            <input
              type="text"
              value={location.default3PLShippingMethod || ''}
              onChange={(e) => updateLocationMapping(locationIndex, 'default3PLShippingMethod', e.target.value)}
              placeholder="e.g., Standard Shipping"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                backgroundColor: 'white'
              }}
            />
            <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#666' }}>
              Specify the default 3PL shipping method for this connection
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: '500' }}>Substitution Lists</label>
              <button
                onClick={() => addSubstitutionList(locationIndex)}
                style={{
                  padding: '0.25rem 0.75rem',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                + Add Substitution List
              </button>
            </div>

            {(location.substitutionList || []).map((subList, subIndex) => (
              <div
                key={subIndex}
                style={{
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '1rem',
                  marginBottom: '0.5rem',
                  backgroundColor: 'white'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '0.875rem' }}>Substitution List {subIndex + 1}</strong>
                  <button
                    onClick={() => removeSubstitutionList(locationIndex, subIndex)}
                    style={{
                      padding: '0.125rem 0.5rem',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Remove
                  </button>
                </div>

                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                    List Name
                  </label>
                  <input
                    type="text"
                    value={subList.listName}
                    onChange={(e) => updateSubstitutionList(locationIndex, subIndex, 'listName', e.target.value)}
                    placeholder="e.g., country"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Mappings</label>
                    <button
                      onClick={() => addSubstitutionMapping(locationIndex, subIndex)}
                      style={{
                        padding: '0.125rem 0.5rem',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                    >
                      + Add
                    </button>
                  </div>

                  {Object.entries(subList.mapping).map(([key, value]) => (
                    <div
                      key={key}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr auto',
                        gap: '0.25rem',
                        marginBottom: '0.25rem',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <input
                          type="text"
                          defaultValue={key}
                          onBlur={(e) => {
                            const newKey = e.target.value.trim();
                            if (newKey && newKey !== key) {
                              renameSubstitutionKey(locationIndex, subIndex, key, newKey);
                            } else if (!newKey) {
                              // If empty, revert to original key
                              e.target.value = key;
                            }
                          }}
                          placeholder="Cin7 value (e.g., United States)"
                          style={{
                            width: '100%',
                            padding: '0.375rem',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '0.8125rem',
                            boxSizing: 'border-box'
                          }}
                        />
                        <div style={{ fontSize: '0.65rem', color: '#666', marginTop: '0.125rem' }}>
                          Cin7 value
                        </div>
                      </div>
                      <div>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => updateSubstitutionMapping(locationIndex, subIndex, key, e.target.value)}
                          placeholder="Trackstar value (e.g., US)"
                          style={{
                            width: '100%',
                            padding: '0.375rem',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '0.8125rem',
                            boxSizing: 'border-box'
                          }}
                        />
                        <div style={{ fontSize: '0.65rem', color: '#666', marginTop: '0.125rem' }}>
                          Trackstar value
                        </div>
                      </div>
                      <button
                        onClick={() => removeSubstitutionMapping(locationIndex, subIndex, key)}
                        style={{
                          padding: '0.375rem',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        );
      })}

      {locationMapping.length === 0 && availableConnections.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          color: '#666',
          backgroundColor: '#fafafa',
          borderRadius: '4px',
          border: '1px dashed #ddd'
        }}>
          No connections available to configure. Please check your connection settings.
        </div>
      )}

      {locationMapping.length === 0 && availableConnections.length > 0 && (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          color: '#666',
          backgroundColor: '#fafafa',
          borderRadius: '4px',
          border: '1px dashed #ddd'
        }}>
          No location mappings configured yet. Select a connection above to get started.
        </div>
      )}
    </div>
  );
}
