 function handler(params) {
    const SYNC_ENTITY = 'inventory';

    const { tenant_config: tenantConfigStr } = params.data.steps.SelectTableTblCin7TrackstarTenantConfig.output[0];
    const connectionId = params.data.var.connectionId;

    const tenantConfig = JSON.parse(tenantConfigStr);
    const { syncConfig, locationMapping } = tenantConfig;

    let isSyncActive = false;
    let quantityType = 'sellable'; // default
    let locationScope = 'mapped'; // default
    let warehouses = {};

    for (const entityConfig of syncConfig) {
      if (entityConfig.entity === SYNC_ENTITY) {
        isSyncActive = entityConfig.status === 'Active';
        quantityType = entityConfig.quantityType || 'sellable';
        locationScope = entityConfig.locationScope || 'mapped';
        break;
      }
    }

    // Find warehouses for the specific connectionId
    for (const mapping of locationMapping) {
      if (mapping.connectionId === connectionId) {
        warehouses = mapping.warehouses || {};
        break;
      }
    }

    return {
      isSyncActive,
      quantityType,
      locationScope,
      warehouses
    };
  }
