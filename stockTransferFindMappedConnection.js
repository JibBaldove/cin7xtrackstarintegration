function handler(params) {
      const locationMappingConfig = params.data?.var?.locationMapping;
      const toLocationName = params.data.var.toLocationName;
      const fromLocationName = params.data.var.fromLocationName;

      const normalize = (s) => (s || '').toString().trim().replace(/\s+/g, ' ');

      // Helper function to find mapping for a given location
      const findLocationMapping = (searchLocationRaw) => {
          const searchLocation = (searchLocationRaw || '').toString().trim();
          let connectionId = "";
          let mappedWarehouse = "";
          let mappingKey = undefined;
          let found = false;

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
                              found = true;
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
              found = false;
          }

          return { connectionId, mappedWarehouse, mappingKey, found };
      };

      // Find mappings for both locations
      const toMapping = findLocationMapping(toLocationName);
      const fromMapping = findLocationMapping(fromLocationName);

      // Build array with found locations only
      const locationMappings = [];

      if (toMapping.found) {
          locationMappings.push({
              locationType: "to",
              connectionId: toMapping.connectionId,
              mappedWarehouse: toMapping.mappedWarehouse,
              locationName: toMapping.mappingKey
          });
      }

      if (fromMapping.found) {
          locationMappings.push({
              locationType: "from",
              connectionId: fromMapping.connectionId,
              mappedWarehouse: fromMapping.mappedWarehouse,
              locationName: fromMapping.mappingKey
          });
      }

      return { locationMappings };
  }