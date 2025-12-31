# Tenant Configuration API Documentation

## Overview

This document describes the format and best practices for handling tenant configuration in the Cin7-Trackstar integration system.

## Configuration Format

### Database Storage

Configuration is stored in a PostgreSQL database as a JSONB column with the following structure:

```json
{
  "apiKey": "9e8a14d0-b3c6-4a47-b821-126c56cce6da",
  "syncConfig": [
    {
      "entity": "sale",
      "status": "Active",
      "webhook": [
        {
          "url": "https://live.fastn.ai/api/v1/clients/{clientId}/webhooks/sync_salesorder_cin7_trackstar",
          "event": "Sale/PickAuthorised",
          "status": "Active"
        }
      ]
    },
    {
      "entity": "purchase",
      "status": "Active",
      "webhook": [
        {
          "url": "https://live.fastn.ai/api/v1/clients/{clientId}/webhooks/ingest_cin7_trackstar_purchase",
          "event": "Purchase/OrderAuthorised",
          "status": "Active"
        },
        {
          "url": "https://live.fastn.ai/api/v1/clients/{clientId}/webhooks/sync_purchaseorder_cin7_trackstar",
          "event": "Purchase/InvoiceAuthorised",
          "status": "Active"
        }
      ]
    },
    {
      "entity": "inventory",
      "status": "Active"
    },
    {
      "entity": "transfer",
      "status": "Active"
    },
    {
      "entity": "product",
      "status": "Active"
    }
  ],
  "locationMapping": [
    {
      "warehouses": {
        "Shipbob Fresno CA": "29"
      },
      "connectionId": "default"
    },
    {
      "warehouses": {
        "Shipbob Fresno CA": "29"
      },
      "connectionId": "cupids-test",
      "substitutionList": [
        {
          "mapping": {
            "Canada": "CA",
            "United States": "US"
          },
          "listName": "country"
        }
      ]
    }
  ],
  "notificationRecipient": [
    "jib@four13.co",
    "talaine@four13.co"
  ]
}
```

## Backend Handler Format

### GET Config Handler

When retrieving configuration from the database, use this format:

```javascript
/**
 * Handler to get tenant configuration
 * @param {Object} params - Handler parameters
 * @param {Object} params.data.var.config - Configuration from database
 * @param {string} params.data.var.tenantId - Tenant ID
 * @returns {Object} Formatted configuration with masked API key
 */
function getTenantConfigHandler(params) {
  let config = params.data.var.config;
  let tenantId = params.data.var.tenantId;

  // Mask API key for security
  function maskApiKey(apiKey) {
    if (!apiKey || apiKey.length < 12) {
      return '********';
    }
    const first4 = apiKey.substring(0, 4);
    const last4 = apiKey.substring(apiKey.length - 4);
    return `${first4}${'*'.repeat(apiKey.length - 8)}${last4}`;
  }

  return {
    tenantId: tenantId,
    // Mask apiKey in responses for security
    apiKey: maskApiKey(config.apiKey),
    hasApiKey: !!config.apiKey, // Indicate if API key exists
    syncConfig: config.syncConfig || [],
    locationMapping: config.locationMapping || [],
    notificationRecipient: config.notificationRecipient || []
  };
}
```

**Example Response:**

```json
{
  "tenantId": "earthbreeze",
  "apiKey": "9e8a****cce6da",
  "hasApiKey": true,
  "syncConfig": [...],
  "locationMapping": [...],
  "notificationRecipient": [...]
}
```

### UPDATE Config Handler

When updating configuration:

```javascript
/**
 * Handler to update tenant configuration
 * @param {Object} params - Handler parameters
 * @param {Object} params.data.var.newConfig - New configuration from request
 * @param {Object} params.data.var.existingConfig - Existing configuration from database
 * @returns {Object} Prepared configuration for database storage
 */
function updateTenantConfigHandler(params) {
  let newConfig = params.data.var.newConfig;
  let existingConfig = params.data.var.existingConfig;

  // Prepare config for database
  // If apiKey is masked (contains asterisks), preserve existing apiKey
  const dbConfig = {
    apiKey: (newConfig.apiKey && !newConfig.apiKey.includes('*'))
      ? newConfig.apiKey
      : existingConfig?.apiKey || newConfig.apiKey,
    syncConfig: newConfig.syncConfig || [],
    locationMapping: newConfig.locationMapping || [],
    notificationRecipient: newConfig.notificationRecipient || []
  };

  return dbConfig;
}
```

## API Key Security

### Masking Strategy

1. **GET Requests**: API keys are always masked showing only first 4 and last 4 characters
   - Example: `9e8a14d0-b3c6-4a47-b821-126c56cce6da` → `9e8a****cce6da`

2. **UPDATE Requests**:
   - If API key contains asterisks (`*`), preserve existing key from database
   - If API key is a new value (no asterisks), update it
   - This allows users to update other fields without exposing the API key

### Security Best Practices

- Never log or expose full API keys in responses
- Always validate API key on server-side before processing requests
- Use HTTPS for all API communications
- Consider implementing rate limiting for API endpoints

## Field Descriptions

### Root Level

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apiKey` | string | Yes | Cin7 API key for authentication |
| `syncConfig` | array | Yes | Configuration for entity synchronization |
| `locationMapping` | array | Yes | Warehouse and connection mappings |
| `notificationRecipient` | array | No | Email addresses for notifications |

### syncConfig[]

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `entity` | string | Yes | Entity type: `sale`, `purchase`, `inventory`, `transfer`, `product` |
| `status` | string | Yes | Status: `Active` or `Inactive` |
| `webhook` | array | No | Webhook configurations for this entity |

### syncConfig[].webhook[]

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | Webhook endpoint URL |
| `event` | string | Yes | Event trigger (e.g., `Sale/PickAuthorised`) |
| `status` | string | Yes | Status: `Active` or `Inactive` |

### locationMapping[]

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `warehouses` | object | Yes | Map of warehouse name to warehouse ID |
| `connectionId` | string | Yes | Connection identifier |
| `substitutionList` | array | No | Field value substitutions |

### locationMapping[].substitutionList[]

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `listName` | string | Yes | Name of the field to substitute |
| `mapping` | object | Yes | Key-value pairs for substitution |

## Frontend Integration

### Displaying Configuration

The frontend should receive the full configuration object and extract what's needed:

```typescript
interface TenantConfig {
  tenantId: string;
  apiKey: string;        // Masked value like "9e8a****cce6da"
  hasApiKey: boolean;    // True if API key exists
  syncConfig: SyncConfig[];
  locationMapping: LocationMapping[];
  notificationRecipient: string[];
}

// Example usage
function ConfigDisplay({ config }: { config: TenantConfig }) {
  return (
    <div>
      <p>API Key: {config.apiKey}</p>
      {config.hasApiKey && <span>✓ Configured</span>}
      {/* Render other fields */}
    </div>
  );
}
```

### Updating Configuration

When updating configuration, send the entire config object:

```typescript
// User updates a field
const updatedConfig = {
  ...config,
  notificationRecipient: ['newemail@example.com']
};

// API key remains masked if not changed
// Backend will preserve existing API key
await apiClient.updateTenantConfig(updatedConfig);
```

### Updating API Key

To update the API key, provide the new unmasked value:

```typescript
const updatedConfig = {
  ...config,
  apiKey: '1234567890abcdef-new-key-here'  // New unmasked key
};

await apiClient.updateTenantConfig(updatedConfig);
```

## Validation

### Server-Side Validation

The configuration must pass these validation rules:

1. **apiKey**: Required, must be a string
2. **syncConfig**: Must be an array
   - Each item must have `entity` and `status`
   - `webhook` must be an array
   - Each webhook must have `url`, `event`, and `status`
3. **locationMapping**: Must be an array
   - Each item must have `warehouses` (object) and `connectionId`
4. **notificationRecipient**: If present, must be an array of valid emails

### Example Validation Usage

```javascript
const { validateTenantConfig } = require('./tenantConfigParser');

const validation = validateTenantConfig(config);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  return {
    statusCode: 400,
    body: JSON.stringify({
      success: false,
      errors: validation.errors
    })
  };
}
```

## Architecture Decisions

### Why Return Full Object?

**Advantages:**
1. **Simplicity**: Single endpoint for all configuration
2. **Consistency**: What you read is what you can write
3. **Atomic Updates**: All changes saved together
4. **Maintainability**: Easy to add new fields

**Alternative Considered:**
Separate endpoints for each section (e.g., `/config/sync`, `/config/location`) was considered but rejected because:
- Increases API surface area
- Complicates versioning
- Risk of partial state inconsistencies
- More complex frontend state management

### Why Mask API Key?

**Security Concerns:**
1. API keys are sensitive credentials
2. Frontend may be accessed on shared devices
3. Network traffic could be intercepted
4. Browser console/dev tools expose data

**Solution:**
- Mask in transit (GET responses)
- Allow updates without exposure
- Preserve existing key if not changing

## Example Implementation

See `tenantConfigParser.js` for the complete implementation including:
- `maskApiKey()` - Mask API key for responses
- `parseTenantConfig()` - Parse config from database
- `prepareTenantConfigForDB()` - Prepare config for storage
- `validateTenantConfig()` - Validate config structure
- `getTenantConfigHandler()` - GET endpoint handler
- `updateTenantConfigHandler()` - UPDATE endpoint handler

## Testing

Example test cases:

```javascript
// Test API key masking
const masked = maskApiKey('9e8a14d0-b3c6-4a47-b821-126c56cce6da');
console.assert(masked === '9e8a****cce6da', 'API key should be masked');

// Test config parsing
const params = {
  data: {
    var: {
      tenantId: 'test-tenant',
      config: {
        apiKey: 'test-key',
        syncConfig: [],
        locationMapping: []
      }
    }
  }
};
const parsed = parseTenantConfig(params);
console.assert(parsed.apiKey === 'test****', 'API key should be masked in output');

// Test validation
const invalidConfig = { syncConfig: 'not-an-array' };
const validation = validateTenantConfig(invalidConfig);
console.assert(!validation.valid, 'Invalid config should fail validation');
```
