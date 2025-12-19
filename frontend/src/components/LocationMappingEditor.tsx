
interface WarehouseMapping {
  [warehouseName: string]: string;
}

interface SubstitutionMapping {
  [key: string]: string;
}

interface SubstitutionList {
  mapping: SubstitutionMapping;
  listName: string;
}

interface LocationMapping {
  warehouses: WarehouseMapping;
  connectionId: string;
  substitutionList?: SubstitutionList[];
}

interface Props {
  locationMapping: LocationMapping[];
  onChange: (locationMapping: LocationMapping[]) => void;
}

export function LocationMappingEditor({ locationMapping, onChange }: Props) {
  const updateLocationMapping = (index: number, field: keyof LocationMapping, value: any) => {
    const updated = [...locationMapping];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const updateWarehouse = (locationIndex: number, warehouseName: string, value: string) => {
    const updated = [...locationMapping];
    const warehouses = { ...updated[locationIndex].warehouses };

    if (value) {
      warehouses[warehouseName] = value;
    } else {
      delete warehouses[warehouseName];
    }

    updated[locationIndex] = { ...updated[locationIndex], warehouses };
    onChange(updated);
  };

  const addWarehouse = (locationIndex: number) => {
    const updated = [...locationMapping];
    const warehouses = { ...updated[locationIndex].warehouses };
    warehouses['New Warehouse'] = '';
    updated[locationIndex] = { ...updated[locationIndex], warehouses };
    onChange(updated);
  };

  const removeWarehouse = (locationIndex: number, warehouseName: string) => {
    const updated = [...locationMapping];
    const warehouses = { ...updated[locationIndex].warehouses };
    delete warehouses[warehouseName];
    updated[locationIndex] = { ...updated[locationIndex], warehouses };
    onChange(updated);
  };

  const renameWarehouse = (locationIndex: number, oldName: string, newName: string) => {
    const updated = [...locationMapping];
    const warehouses = { ...updated[locationIndex].warehouses };
    const value = warehouses[oldName];
    delete warehouses[oldName];
    warehouses[newName] = value;
    updated[locationIndex] = { ...updated[locationIndex], warehouses };
    onChange(updated);
  };

  const addLocationMapping = () => {
    onChange([...locationMapping, {
      warehouses: {},
      connectionId: '',
      substitutionList: []
    }]);
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
    mapping['New Key'] = '';
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Location Mapping</h2>
        <button
          onClick={addLocationMapping}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          + Add Location
        </button>
      </div>

      {locationMapping.map((location, locationIndex) => (
        <div
          key={locationIndex}
          style={{
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '1.5rem',
            marginBottom: '1rem',
            backgroundColor: '#fafafa'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Location {locationIndex + 1}</h3>
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
              Remove
            </button>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Connection ID
            </label>
            <input
              type="text"
              value={location.connectionId}
              onChange={(e) => updateLocationMapping(locationIndex, 'connectionId', e.target.value)}
              placeholder="e.g., earthbreeze-us"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: '500' }}>Warehouses</label>
              <button
                onClick={() => addWarehouse(locationIndex)}
                style={{
                  padding: '0.25rem 0.75rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                + Add Warehouse
              </button>
            </div>

            {Object.entries(location.warehouses).map(([warehouseName, warehouseId]) => (
              <div
                key={warehouseName}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr auto',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                  alignItems: 'center'
                }}
              >
                <input
                  type="text"
                  value={warehouseName}
                  onChange={(e) => renameWarehouse(locationIndex, warehouseName, e.target.value)}
                  placeholder="Warehouse Name"
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                />
                <input
                  type="text"
                  value={warehouseId}
                  onChange={(e) => updateWarehouse(locationIndex, warehouseName, e.target.value)}
                  placeholder="Warehouse ID"
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                />
                <button
                  onClick={() => removeWarehouse(locationIndex, warehouseName)}
                  style={{
                    padding: '0.5rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Remove
                </button>
              </div>
            ))}

            {Object.keys(location.warehouses).length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '1rem',
                color: '#666',
                backgroundColor: 'white',
                borderRadius: '4px',
                border: '1px dashed #ddd',
                fontSize: '0.875rem'
              }}>
                No warehouses configured. Click "Add Warehouse" to create one.
              </div>
            )}
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
                      <input
                        type="text"
                        value={key}
                        readOnly
                        style={{
                          padding: '0.375rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '0.8125rem',
                          backgroundColor: '#f9f9f9'
                        }}
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => updateSubstitutionMapping(locationIndex, subIndex, key, e.target.value)}
                        placeholder="Value"
                        style={{
                          padding: '0.375rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '0.8125rem'
                        }}
                      />
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
      ))}

      {locationMapping.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          color: '#666',
          backgroundColor: '#fafafa',
          borderRadius: '4px',
          border: '1px dashed #ddd'
        }}>
          No location mappings yet. Click "Add Location" to create one.
        </div>
      )}
    </div>
  );
}
