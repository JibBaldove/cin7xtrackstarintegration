/**
 * Tenant Config Parser
 * Utilities to parse and validate tenant configuration from PostgreSQL
 */

/**
 * Mask API key for security (show only first/last 4 characters)
 * @param {string} apiKey - API key to mask
 * @returns {string} Masked API key
 */
function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 12) {
    return '********';
  }
  const first4 = apiKey.substring(0, 4);
  const last4 = apiKey.substring(apiKey.length - 4);
  return `${first4}${'*'.repeat(apiKey.length - 8)}${last4}`;
}

/**
 * Parse tenant config from database row
 * @param {Object} params - Handler parameters with params.data.var.config and params.data.var.tenantId
 * @param {boolean} maskKey - Whether to mask the API key (default: true)
 * @returns {Object} Parsed tenant configuration
 */
function parseTenantConfig(params, maskKey = true) {
  try {
    let config = params.data.var.config;
    let tenantId = params.data.var.tenantId;

    return {
      tenantId: tenantId,
      // Mask apiKey in responses for security
      apiKey: maskKey ? maskApiKey(config.apiKey) : config.apiKey,
      hasApiKey: !!config.apiKey, // Indicate if API key exists
      syncConfig: config.syncConfig || [],
      locationMapping: config.locationMapping || [],
      notificationRecipient: config.notificationRecipient || []
    };
  } catch (error) {
    console.error('Error parsing tenant config:', error);
    throw new Error(`Failed to parse tenant config: ${error.message}`);
  }
}

/**
 * Prepare tenant config for database storage
 * @param {Object} config - Tenant configuration object
 * @param {Object} existingConfig - Existing configuration (optional, to preserve masked API key)
 * @returns {Object} Config object ready for database storage
 */
function prepareTenantConfigForDB(config, existingConfig = null) {
  try {
    const dbConfig = {
      // If apiKey is masked (contains asterisks), keep existing one
      apiKey: (config.apiKey && !config.apiKey.includes('*'))
        ? config.apiKey
        : existingConfig?.apiKey || config.apiKey,
      syncConfig: config.syncConfig || [],
      locationMapping: config.locationMapping || [],
      notificationRecipient: config.notificationRecipient || []
    };

    return dbConfig;
  } catch (error) {
    console.error('Error preparing tenant config for DB:', error);
    throw new Error(`Failed to prepare config for database: ${error.message}`);
  }
}

/**
 * Validate tenant config structure
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
function validateTenantConfig(config) {
  const errors = [];

  if (!config) {
    errors.push('Config is required');
    return { valid: false, errors };
  }

  // Validate apiKey (allow masked keys for updates)
  if (!config.apiKey || typeof config.apiKey !== 'string') {
    errors.push('apiKey is required and must be a string');
  }

  // Validate syncConfig
  if (!Array.isArray(config.syncConfig)) {
    errors.push('syncConfig must be an array');
  } else {
    config.syncConfig.forEach((sync, index) => {
      if (!sync.entity) {
        errors.push(`syncConfig[${index}]: entity is required`);
      }
      if (!sync.status) {
        errors.push(`syncConfig[${index}]: status is required`);
      }
      if (!Array.isArray(sync.webhook)) {
        errors.push(`syncConfig[${index}]: webhook must be an array`);
      } else {
        sync.webhook.forEach((webhook, webhookIndex) => {
          if (!webhook.url) {
            errors.push(`syncConfig[${index}].webhook[${webhookIndex}]: url is required`);
          }
          if (!webhook.event) {
            errors.push(`syncConfig[${index}].webhook[${webhookIndex}]: event is required`);
          }
        });
      }
    });
  }

  // Validate locationMapping
  if (!Array.isArray(config.locationMapping)) {
    errors.push('locationMapping must be an array');
  } else {
    config.locationMapping.forEach((location, index) => {
      if (!location.warehouses || typeof location.warehouses !== 'object') {
        errors.push(`locationMapping[${index}]: warehouses is required and must be an object`);
      }
      if (!location.connectionId) {
        errors.push(`locationMapping[${index}]: connectionId is required`);
      }
    });
  }

  // Validate notificationRecipient
  if (config.notificationRecipient) {
    if (!Array.isArray(config.notificationRecipient)) {
      errors.push('notificationRecipient must be an array');
    } else {
      config.notificationRecipient.forEach((email, index) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors.push(`notificationRecipient[${index}]: invalid email format`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * AWS Lambda handler example for GET tenant config
 * @param {Object} event - Lambda event
 * @returns {Object} Lambda response
 */
async function getTenantConfigHandler(event, context, pgClient) {
  try {
    const tenantId = event.pathParameters?.tenantId || event.queryStringParameters?.tenantId;
    const apiKey = event.headers?.['x-api-key'] || event.headers?.['X-Api-Key'];

    if (!tenantId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'tenantId is required'
        })
      };
    }

    if (!apiKey) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'API key is required'
        })
      };
    }

    // Query database (example - adjust table/column names as needed)
    const query = `
      SELECT tenant_id, config, created_at, updated_at
      FROM tenant_configs
      WHERE tenant_id = $1 AND config->>'apiKey' = $2
    `;

    const result = await pgClient.query(query, [tenantId, apiKey]);

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Tenant config not found or invalid API key'
        })
      };
    }

    const tenantConfig = parseTenantConfig(result.rows[0]);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        data: tenantConfig
      })
    };

  } catch (error) {
    console.error('Error in getTenantConfigHandler:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message
      })
    };
  }
}

/**
 * AWS Lambda handler example for UPDATE tenant config
 * @param {Object} event - Lambda event
 * @returns {Object} Lambda response
 */
async function updateTenantConfigHandler(event, context, pgClient) {
  try {
    const tenantId = event.pathParameters?.tenantId || event.queryStringParameters?.tenantId;
    const apiKey = event.headers?.['x-api-key'] || event.headers?.['X-Api-Key'];

    if (!tenantId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'tenantId is required'
        })
      };
    }

    if (!apiKey) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'API key is required'
        })
      };
    }

    const newConfig = JSON.parse(event.body);

    // Validate config
    const validation = validateTenantConfig(newConfig);
    if (!validation.valid) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Invalid configuration',
          details: validation.errors
        })
      };
    }

    // Verify tenant and API key
    const checkQuery = `
      SELECT tenant_id
      FROM tenant_configs
      WHERE tenant_id = $1 AND config->>'apiKey' = $2
    `;

    const checkResult = await pgClient.query(checkQuery, [tenantId, apiKey]);

    if (checkResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Tenant not found or invalid API key'
        })
      };
    }

    // Update config
    const configJson = prepareTenantConfigForDB(newConfig);
    const updateQuery = `
      UPDATE tenant_configs
      SET config = $1, updated_at = NOW()
      WHERE tenant_id = $2
      RETURNING tenant_id, config, created_at, updated_at
    `;

    const result = await pgClient.query(updateQuery, [configJson, tenantId]);
    const updatedConfig = parseTenantConfig(result.rows[0]);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        data: updatedConfig,
        message: 'Configuration updated successfully'
      })
    };

  } catch (error) {
    console.error('Error in updateTenantConfigHandler:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message
      })
    };
  }
}

module.exports = {
  maskApiKey,
  parseTenantConfig,
  prepareTenantConfigForDB,
  validateTenantConfig,
  getTenantConfigHandler,
  updateTenantConfigHandler
};
