function handler(params) {
  const locationMappingConfig = params.data?.var?.locationMapping;
  const targetConnectionId = params.data?.var?.connectionId;

  let result = { connectionId: null };

  try {
    const mapping = typeof locationMappingConfig === 'string'
      ? JSON.parse(locationMappingConfig)
      : locationMappingConfig;

    if (Array.isArray(mapping)) {
      // If only 1 connection, return it directly
      if (mapping.length === 1) {
        return {
          connectionId: mapping[0].connectionId
        };
      }

      // Multiple connections - try to find matching connectionId
      for (const connection of mapping) {
        if (connection.connectionId === targetConnectionId) {
          // Found matching connection - get first warehouse
          const firstWarehouse = connection.warehouses?.[0];

          if (firstWarehouse) {
            result = {
              connectionId: connection.connectionId,
              warehouse: firstWarehouse.cin7WarehouseName || '',
              warehouseId: firstWarehouse.trackstarLocationId || ''
            };
          } else {
            result = {
              connectionId: connection.connectionId
            };
          }
          break;
        }
      }

      // If not found, fall back to 'default' connectionId
      if (result.connectionId === null) {
        for (const connection of mapping) {
          if (connection.connectionId === 'default') {
            const firstWarehouse = connection.warehouses?.[0];

            if (firstWarehouse) {
              result = {
                connectionId: connection.connectionId,
                warehouse: firstWarehouse.cin7WarehouseName || '',
                warehouseId: firstWarehouse.trackstarLocationId || ''
              };
            } else {
              result = {
                connectionId: connection.connectionId
              };
            }
            break;
          }
        }
      }
    }
  } catch (e) {
    result = { connectionId: null };
  }

  return result;
}
