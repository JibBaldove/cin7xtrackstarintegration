function handler(params) {
  // DEBUG MODE: Return structure information to help diagnose issues
  const debugMode = true; // Set to true to see structure

  if (debugMode) {
    const debugInfo = {
      paramsKeys: Object.keys(params),
      dataKeys: params.data ? Object.keys(params.data) : null,
      stepsKeys: params.data?.steps ? Object.keys(params.data.steps) : null,
      stepDetails: {}
    };

    // Show first step's output structure
    if (params.data?.steps) {
      const firstStepKey = Object.keys(params.data.steps)[0];
      if (firstStepKey) {
        const firstStep = params.data.steps[firstStepKey];
        debugInfo.stepDetails[firstStepKey] = {
          hasOutput: !!firstStep.output,
          outputLength: firstStep.output?.length,
          outputKeys: firstStep.output?.[0] ? Object.keys(firstStep.output[0]) : null
        };
      }
    }

    return { debug: debugInfo };
  }

  // Get the config from the response - matching the working handler pattern
  let tenantConfigStr;
  let foundAtStep;
  let foundAtField;

  // Try to find the step - be flexible with step names
  if (params.data?.steps) {
    const stepKeys = Object.keys(params.data.steps);

    // Try to find the right step
    for (const stepKey of stepKeys) {
      const step = params.data.steps[stepKey];
      if (step?.output?.[0]) {
        const output = step.output[0];

        // Try different field names
        if (output.tenant_config) {
          tenantConfigStr = output.tenant_config;
          foundAtStep = stepKey;
          foundAtField = 'tenant_config';
          break;
        } else if (output.config) {
          tenantConfigStr = output.config;
          foundAtStep = stepKey;
          foundAtField = 'config';
          break;
        }
      }
    }
  }

  if (!tenantConfigStr) {
    return {
      error: 'Config data not found',
      availableSteps: params.data?.steps ? Object.keys(params.data.steps) : [],
      hint: 'Set debugMode = true in the handler to see full structure'
    };
  }

  // Parse the tenant config JSON string
  let tenantConfig;

  if (typeof tenantConfigStr === 'string') {
    try {
      tenantConfig = JSON.parse(tenantConfigStr);
    } catch (error) {
      return {
        error: 'Failed to parse config JSON',
        message: error.message,
        foundAtStep: foundAtStep,
        foundAtField: foundAtField,
        configStringType: typeof tenantConfigStr,
        configStringPreview: String(tenantConfigStr).substring(0, 100)
      };
    }
  } else if (typeof tenantConfigStr === 'object') {
    tenantConfig = tenantConfigStr;
  } else {
    return {
      error: 'Unexpected config type',
      type: typeof tenantConfigStr,
      foundAtStep: foundAtStep,
      foundAtField: foundAtField
    };
  }

  // Return ALL config data for UI - no filtering
  const parsedConfig = {
    apiKey: tenantConfig.apiKey || '',
    hasApiKey: !!tenantConfig.apiKey, // Indicate if API key exists

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
