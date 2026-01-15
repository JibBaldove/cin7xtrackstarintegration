function handler(params) {
      const locationMappingConfig = params.data?.var?.locationMapping;

      // Use top-level Location field
      const searchLocationRaw = params.data.steps.getCin7SaleDetails.output.Location || '';
      const searchLocation = (searchLocationRaw || '').toString().trim();

      const normalize = (s) => (s || '').toString().trim().replace(/\s+/g, ' ');

      let connectionId = "";
      let mappedWarehouse = "";
      let mappingKey = undefined;
      let default3PLShippingMethod = "N/A";

      try {
        const mapping = typeof locationMappingConfig === 'string'
          ? JSON.parse(locationMappingConfig)
          : locationMappingConfig;

        if (Array.isArray(mapping)) {
          const normalizedSearch = normalize(searchLocation).toLowerCase();

          // Iterate through each connection in the array
          for (const connection of mapping) {
            if (!connection.warehouses || !Array.isArray(connection.warehouses)) {
              continue;
            }

            // Search through the warehouses array
            for (const warehouse of connection.warehouses) {
              let isMatch = false;

              // Try matching by cin7WarehouseName
              if (searchLocation && warehouse.cin7WarehouseName) {
                // Try direct match first
                if (warehouse.cin7WarehouseName === searchLocation) {
                  isMatch = true;
                }
                // Try normalized match
                else {
                  const normalizedWarehouseName = normalize(warehouse.cin7WarehouseName).toLowerCase();
                  if (normalizedWarehouseName === normalizedSearch) {
                    isMatch = true;
                  }
                }
              }

              if (isMatch) {
                connectionId = String(connection.connectionId || "");
                mappedWarehouse = String(warehouse.trackstarLocationId || "");
                mappingKey = warehouse.cin7WarehouseName;
                default3PLShippingMethod = String(connection.default3PLShippingMethod || "N/A");
                break;
              }
            }

            // If found a match, exit outer loop
            if (connectionId) {
              break;
            }
          }
        }
      } catch (e) {
        connectionId = "";
        mappedWarehouse = "";
        default3PLShippingMethod = "N/A";
      }

      return {
        connectionId,
        mappedWarehouse,
        mappingKey,
        default3PLShippingMethod
      };
    }