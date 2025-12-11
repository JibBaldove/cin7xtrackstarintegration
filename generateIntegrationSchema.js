function handler(params) {
  // Get the integration schema from the variable (set from database query)
  const integrationSchemaRaw = params.data.var.integrationSchema;

  // Get the action we want to generate schema for (e.g., 'create_order', 'create_inbound_shipment')
  const targetAction = params.data.var.targetAction || 'create_order';

  // Parse the JSON data from the integration schema
  // The database returns data in JSONB format: { data: { type: "jsonb", value: "JSON_STRING" } }
  const integrationData = JSON.parse(integrationSchemaRaw.data.value);

  // Verify we have operations array
  if (!integrationData || !Array.isArray(integrationData.operations)) {
    throw new Error('Integration data missing operations array. Parsed data keys: ' + Object.keys(integrationData || {}).join(', ') + '. Full raw input: ' + JSON.stringify(integrationSchemaRaw, null, 2));
  }

  // Find the operation that matches the target action
  const operation = integrationData.operations.find(op => op.action === targetAction);

  if (!operation) {
    throw new Error(`Operation '${targetAction}' not found in integration schema`);
  }

  // Helper function to convert flat dot-notation schema to nested object
  const unflattenSchema = (flatObj) => {
    const result = {};

    // First, collect all keys and sort them so parent objects are created before nested fields
    const keys = Object.keys(flatObj).sort();

    for (const key of keys) {
      const parts = key.split('.');
      let current = result;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (i === parts.length - 1) {
          // Last part - only set if it doesn't already exist as an object
          if (typeof current[part] !== 'object') {
            current[part] = "";
          }
        } else {
          // Intermediate part - create object if doesn't exist
          if (!current[part] || typeof current[part] !== 'object') {
            current[part] = {};
          }
          current = current[part];
        }
      }
    }

    return result;
  };

  // Combine base_schema_fields and integration_specific_fields
  const consolidatedFields = {
    ...operation.base_schema_fields,
    ...operation.integration_specific_fields
  };

  // Generate the nested schema structure
  const schema = unflattenSchema(consolidatedFields);

  return {
    integration_name: integrationSchemaRaw.integration_name,
    display_name: integrationSchemaRaw.display_name,
    action: targetAction,
    url: operation.url,
    schema: schema
  };
}
