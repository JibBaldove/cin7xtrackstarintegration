function handler(params) {
  const tenantConfig = params.data.steps.extractTenantConfig.output;
  const trackstarInventoryData = params.data.steps.GetInventoryItemBySKU.output;

  // Validate inventory data exists
  if (!trackstarInventoryData.data || trackstarInventoryData.data.length === 0) {
    return { error: 'No inventory data found' };
  }

  const trackstarInventory = trackstarInventoryData.data[0];
  const { quantityType, locationScope, warehouses } = tenantConfig;

  const results = [];

  for (const warehouse of warehouses) {
    let quantity;

    if (locationScope === 'all') {
      // Use top-level quantity (aggregated across all warehouses)
      // Note: "all" scope is only valid when there's 1 warehouse mapped
      quantity = trackstarInventory[quantityType] || 0;
    } else {
      // Use warehouse-specific quantity from inventory_by_warehouse_id
      const warehouseInventory = trackstarInventory.inventory_by_warehouse_id?.[warehouse.warehouseId];
      quantity = warehouseInventory ? (warehouseInventory[quantityType] || 0) : 0;
    }

    const result = {
      locationName: warehouse.id, // e.g., "Retail Store"
      warehouseId: warehouse.warehouseId, // e.g., "da314a37-7053-4eaf-a9ab-65596a0045b5"
      Lines: [{
        SKU: trackstarInventory.sku,
        ProductName: trackstarInventory.name,
        Quantity: quantity,
        UnitCost: trackstarInventory.unit_cost || 1,
        LocationID: warehouse.warehouseId,
        Location: warehouse.id,
        ProductLength: trackstarInventory.measurements?.length || 1,
        ProductWidth: trackstarInventory.measurements?.width || 1,
        ProductHeight: trackstarInventory.measurements?.height || 1,
        ProductWeight: trackstarInventory.measurements?.weight || 1
      }]
    };

    results.push(result);
  }

  // Always return array regardless of number of results
  return results;
}
