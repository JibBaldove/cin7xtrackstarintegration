function handler(params) {
  const tenantConfig = params.data.steps.extractTenantConfig.output;
  const trackstarInventoryData = params.data.steps.GetInventoryItemBySKU.output;

  // Validate inventory data exists
  if (!trackstarInventoryData.data || trackstarInventoryData.data.length === 0) {
    return { error: 'No inventory of this SKU found in 3PL/WMS' };
  }

  const trackstarInventory = trackstarInventoryData.data[0];
  const { quantityType, locationScope, warehouses } = tenantConfig;

  // Get product details from Cin7
  const productsData = params.data.steps.getProducts.output;

  // Find exact SKU match (not just similar SKUs)
  const matchedProduct = productsData.Products.find(p => p.SKU === trackstarInventory.sku);

  // If no exact match found, return error
  if (!matchedProduct) {
    return { error: `No product found in Cin7 with exact SKU: ${trackstarInventory.sku}` };
  }

  // Check costing method - if FIFO, Cin7 doesn't support batches, so consolidate lots
  const costingMethod = matchedProduct.CostingMethod;
  const shouldConsolidate = costingMethod === 'FIFO';

  const adjustments = [];

  // Check if the SKU has lots/batches
  const hasLots = trackstarInventory.lots && trackstarInventory.lots.length > 0;

  if (hasLots) {
    if (shouldConsolidate) {
      // FIFO costing method: Consolidate lots per location (Cin7 doesn't support batches for FIFO)
      if (locationScope === 'all') {
        // Consolidate ALL lots from ALL locations into one result
        const warehouse = warehouses[0]; // Should only be 1 warehouse when scope is 'all'
        let totalQuantity = 0;

        for (const lot of trackstarInventory.lots) {
          totalQuantity += lot.onhand;
        }

        const result = {
          locationName: warehouse.id,
          warehouseId: warehouse.warehouseId,
          note: 'Trackstar lotted inventory consolidated due to Cin7 product not supporting Batch/Serials (FIFO costing method)',
          Lines: [{
            SKU: trackstarInventory.sku,
            ProductName: trackstarInventory.name,
            Quantity: totalQuantity,
            UnitCost: trackstarInventory.unit_cost || 1,
            ProductLength: trackstarInventory.measurements?.length || 1,
            ProductWidth: trackstarInventory.measurements?.width || 1,
            ProductHeight: trackstarInventory.measurements?.height || 1,
            ProductWeight: trackstarInventory.measurements?.weight || 1
          }]
        };

        adjustments.push(result);
      } else {
        // Mapped scope: Consolidate lots per location
        // If we have 4 lots per location, we will total the stocks
        const locationMap = new Map();

        for (const lot of trackstarInventory.lots) {
          const warehouse = warehouses.find(w => w.warehouseId === lot.warehouse_id);

          if (!warehouse) {
            continue;
          }

          const locationKey = warehouse.id;

          if (locationMap.has(locationKey)) {
            // Add quantity to existing location
            locationMap.get(locationKey).quantity += lot.onhand;
          } else {
            // Create new location entry
            locationMap.set(locationKey, {
              locationName: warehouse.id,
              warehouseId: lot.warehouse_id,
              quantity: lot.onhand
            });
          }
        }

        // Convert map to results array - one inventory adjustment per location
        for (const [locationKey, locationData] of locationMap) {
          const result = {
            locationName: locationData.locationName,
            warehouseId: locationData.warehouseId,
            note: 'Trackstar lotted inventory per location consolidated due to Cin7 product not supporting Batch/Serials (Non-FIFO costing method)',
            Lines: [{
              SKU: trackstarInventory.sku,
              ProductName: trackstarInventory.name,
              Quantity: locationData.quantity,
              UnitCost: trackstarInventory.unit_cost || 1,
              ProductLength: trackstarInventory.measurements?.length || 1,
              ProductWidth: trackstarInventory.measurements?.width || 1,
              ProductHeight: trackstarInventory.measurements?.height || 1,
              ProductWeight: trackstarInventory.measurements?.weight || 1
            }]
          };

          adjustments.push(result);
        }
      }
    } else {
      // Non-FIFO costing method (FEFO, Batch, etc.): Process each lot separately (per lot + warehouse)
      for (const lot of trackstarInventory.lots) {
        const warehouse = warehouses.find(w => w.warehouseId === lot.warehouse_id);

        if (!warehouse) {
          continue;
        }

        const result = {
          locationName: warehouse.id,
          warehouseId: lot.warehouse_id,
          lot_id: lot.lot_id,
          expiration_date: lot.expiration_date,
          Lines: [{
            SKU: trackstarInventory.sku,
            ProductName: trackstarInventory.name,
            Quantity: lot.onhand,
            UnitCost: trackstarInventory.unit_cost || 1,
            ProductLength: trackstarInventory.measurements?.length || 1,
            ProductWidth: trackstarInventory.measurements?.width || 1,
            ProductHeight: trackstarInventory.measurements?.height || 1,
            ProductWeight: trackstarInventory.measurements?.weight || 1
          }]
        };

        adjustments.push(result);
      }
    }
  } else {
    // No lots - use original logic based on locationScope
    if (locationScope === 'all') {
      const quantity = trackstarInventory[quantityType] || 0;
      const warehouse = warehouses[0];

      const result = {
        locationName: warehouse.id,
        warehouseId: warehouse.warehouseId,
        Lines: [{
          SKU: trackstarInventory.sku,
          ProductName: trackstarInventory.name,
          Quantity: quantity,
          UnitCost: trackstarInventory.unit_cost || 1,
          ProductLength: trackstarInventory.measurements?.length || 1,
          ProductWidth: trackstarInventory.measurements?.width || 1,
          ProductHeight: trackstarInventory.measurements?.height || 1,
          ProductWeight: trackstarInventory.measurements?.weight || 1
        }]
      };

      adjustments.push(result);
    } else {
      for (const warehouse of warehouses) {
        const warehouseInventory = trackstarInventory.inventory_by_warehouse_id?.[warehouse.warehouseId];
        const quantity = warehouseInventory ? (warehouseInventory[quantityType] || 0) : 0;

        const result = {
          locationName: warehouse.id,
          warehouseId: warehouse.warehouseId,
          Lines: [{
            SKU: trackstarInventory.sku,
            ProductName: trackstarInventory.name,
            Quantity: quantity,
            UnitCost: trackstarInventory.unit_cost || 1,
            ProductLength: trackstarInventory.measurements?.length || 1,
            ProductWidth: trackstarInventory.measurements?.width || 1,
            ProductHeight: trackstarInventory.measurements?.height || 1,
            ProductWeight: trackstarInventory.measurements?.weight || 1
          }]
        };

        adjustments.push(result);
      }
    }
  }

  return {
    cin7Id: matchedProduct.ID,
    cin7Key: matchedProduct.SKU,
    trackstarId: trackstarInventory.id,
    trackstarKey: trackstarInventory.sku,
    adjustments: adjustments
  };
}
