function handler(params) {
  // Get the config from the response - matching the working handler pattern
  const { tenant_config: tenantConfigStr } = params.data.steps.SelectTableTblCin7TrackstarTenantConfig.output[0];

  // Parse the tenant config JSON string
  const tenantConfig = JSON.parse(tenantConfigStr);

  // Return ALL config data for UI - no filtering
  const parsedConfig = {
    apiKey: tenantConfig.apiKey || '',

    // Parse sync configuration - include ALL entities with ALL their fields
    syncConfig: (tenantConfig.syncConfig || []).map(entity => {
      const entityConfig = {
        entity: entity.entity,
        status: entity.status
      };

      // Include webhooks if present
      if (entity.webhook) {
        entityConfig.webhooks = entity.webhook.map(webhook => ({
          url: webhook.url,
          event: webhook.event,
          status: webhook.status
        }));
      }

      // Include ALL other fields (quantityType, autoAcceptThreshold, locationScope, etc.)
      Object.keys(entity).forEach(key => {
        if (key !== 'entity' && key !== 'status' && key !== 'webhook') {
          entityConfig[key] = entity[key];
        }
      });

      return entityConfig;
    }),

    // Parse location mapping - include ALL mappings with ALL fields
    locationMapping: (tenantConfig.locationMapping || []).map(mapping => {
      const mappingConfig = {
        connectionId: mapping.connectionId,
        warehouses: mapping.warehouses || {}
      };

      // Include ALL other fields (substitutionList, etc.)
      Object.keys(mapping).forEach(key => {
        if (key !== 'connectionId' && key !== 'warehouses') {
          mappingConfig[key] = mapping[key];
        }
      });

      return mappingConfig;
    }),

    // Parse notification recipients
    notificationRecipient: tenantConfig.notificationRecipient || []
  };

  // Include ANY other top-level fields that might exist in the config
  Object.keys(tenantConfig).forEach(key => {
    if (key !== 'apiKey' && key !== 'syncConfig' && key !== 'locationMapping' && key !== 'notificationRecipient') {
      parsedConfig[key] = tenantConfig[key];
    }
  });

  return parsedConfig;
}
