function handler(params) {
  const tenantConfig = params.data.steps.extractTenantConfig.output;
  const trackstarInventoryData = params.data.steps.GetInventoryItemBySKU.output;

  // Validate inventory data exists
  if (!trackstarInventoryData.data || trackstarInventoryData.data.length === 0) {
    return { error: 'No inventory of this SKU found in 3PL/WMS' };
  }

  const trackstarInventory = trackstarInventoryData.data[0];
  const { quantityType, locationScope, warehouses } = tenantConfig;

  const results = [];

  // Check if the SKU has lots/batches
  const hasLots = trackstarInventory.lots && trackstarInventory.lots.length > 0;

  if (hasLots) {
    // If SKU has lots, process each lot separately (per lot + warehouse)
    // This applies regardless of locationScope setting - lots always require per-warehouse tracking
    for (const lot of trackstarInventory.lots) {
      // Find the warehouse mapping for this lot's warehouse_id
      const warehouse = warehouses.find(w => w.warehouseId === lot.warehouse_id);

      // Skip if warehouse not found in mapping
      if (!warehouse) {
        continue;
      }

      const result = {
        locationName: warehouse.id, // e.g., "Retail Store"
        warehouseId: lot.warehouse_id,
        lot_id: lot.lot_id,
        expiration_date: lot.expiration_date,
        Lines: [{
          SKU: trackstarInventory.sku,
          ProductName: trackstarInventory.name,
          Quantity: lot.onhand, // Use lot's onhand quantity
          UnitCost: trackstarInventory.unit_cost || 1,
          ProductLength: trackstarInventory.measurements?.length || 1,
          ProductWidth: trackstarInventory.measurements?.width || 1,
          ProductHeight: trackstarInventory.measurements?.height || 1,
          ProductWeight: trackstarInventory.measurements?.weight || 1
        }]
      };

      results.push(result);
    }
  } else {
    // No lots - use original logic based on locationScope
    if (locationScope === 'all') {
      // Use top-level quantity (aggregated across all warehouses)
      // Return single result for the sole mapped location
      const quantity = trackstarInventory[quantityType] || 0;
      const warehouse = warehouses[0]; // Should only be 1 warehouse when scope is 'all'

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

      results.push(result);
    } else {
      // Mapped scope - create one result per warehouse
      for (const warehouse of warehouses) {
        // Use warehouse-specific quantity from inventory_by_warehouse_id
        const warehouseInventory = trackstarInventory.inventory_by_warehouse_id?.[warehouse.warehouseId];
        const quantity = warehouseInventory ? (warehouseInventory[quantityType] || 0) : 0;

        const result = {
          locationName: warehouse.id, // e.g., "Retail Store"
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

        results.push(result);
      }
    }
  }

  // Always return array regardless of number of results
  return results;
}
