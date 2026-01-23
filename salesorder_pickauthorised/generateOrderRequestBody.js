function handler(params) {
          params.data.headers['x-fastn-space-connection-id'] = params.data.var.connectionId;

          const flatSchema = params.data?.steps.generateIntegrationSchema?.output?.schema || {};
          const data = params.data?.steps.getCin7SaleDetails?.output || {};
          const shipping = params.data?.steps.determineShippingCountry?.output;
          const products = params.data?.steps?.GetAllProducts?.output?.data || [];
          const tenantConfig = params.data?.var.tenantConfig || {};
          const connectionId = params.data.var.connectionId;
          let warehouseId = params.data?.var.mappedWarehouse;
          const entityMapping = params.data.var.entityMapping;

          // Find substitutionList for current connection
          const locationMapping = tenantConfig.locationMapping || [];
          const currentConnection = locationMapping.find(mapping => mapping.connectionId === connectionId);
          const substitutionList = currentConnection?.substitutionList || [];
          const defaultShippingMethod = currentConnection?.default3PLShippingMethod;

          // Helper function to apply substitutions from the substitutionList
          const applySubstitution = (value, listName) => {
              if (!value || !substitutionList || !Array.isArray(substitutionList)) {
                  return value;
              }

              // Find the substitution list that matches the listName
              const substitution = substitutionList.find(sub => sub.listName === listName);

              if (!substitution || !substitution.mapping) {
                  return value;
              }

              // Return mapped value if it exists, otherwise return original value
              return substitution.mapping[value] || value;
          };

          const ensureTimezone = (datetime) => {
          if (!datetime) return null;
          // Check if datetime already has timezone (Z or +/- offset)
          if (datetime.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(datetime)) {
              return datetime;
          }
          // Append 'Z' for UTC timezone
          return datetime + 'Z';
      };

          // Helper function to get nested value from object using dot notation
          const getNestedValue = (obj, path) => {
              if (!path || !obj) return undefined;
              return path.split('.').reduce((current, key) => current?.[key], obj);
          };

          // Helper function to apply transformation to a value
          const applyTransform = (value, transform) => {
              if (!transform || value === undefined || value === null) return value;

              switch (transform.toLowerCase()) {
                  case 'uppercase':
                      return String(value).toUpperCase();
                  case 'lowercase':
                      return String(value).toLowerCase();
                  default:
                      return value;
              }
          };

          // Helper function to apply entity mapping config to source data
          const applyEntityMapping = (sourceData, mappingConfig, cin7Data) => {
              if (!mappingConfig || !Array.isArray(mappingConfig.mapping)) {
                  return sourceData;
              }

              // Only process if entity is "sale"
              if (mappingConfig.entity !== 'sale') {
                  return sourceData;
              }

              // Apply each mapping
              mappingConfig.mapping.forEach(map => {
                  const cin7Value = getNestedValue(cin7Data, map.cin7);
                  const transformedValue = applyTransform(cin7Value, map.transform);

                  if (transformedValue !== undefined) {
                      sourceData[map.trackstar] = transformedValue;
                  }
              });

              return sourceData;
          };

          // Helper function to parse DisplayAddressLine2 format: "City State/Region Zip/Postcode Country"
          const parseDisplayAddressLine2 = (displayLine) => {
            if (!displayLine) return {};

            const parts = displayLine.trim().split(/\s+/);
            if (parts.length < 2) return {};

            // Try to extract components (working backwards from the end)
            // Common formats: "Melbourne VIC 3000 Australia", "New York NY 10001 USA"
            let country = '';
            let postalCode = '';
            let state = '';
            let city = '';

            let idx = parts.length - 1;

            // Last part is usually country
            if (idx >= 0) {
              country = parts[idx];
              idx--;
            }

            // Check if second-to-last could be part of country (e.g., "New Zealand")
            if (idx >= 0 && parts[idx].length > 2 && !/^\d/.test(parts[idx]) && parts[idx].length < 8) {
              // Could be multi-word country, but more likely a long state name
              // Let's treat single uppercase short strings as state codes
            }

            // Check for split CANADIAN postal codes first: "A1A 1A1" format
            if (idx >= 1 &&
                /^[A-Z0-9]{3}$/i.test(parts[idx]) &&           // "1J0"
                /^[A-Z][0-9][A-Z]$/i.test(parts[idx-1])) {     // "G0G"
                // Canadian format: combine both parts
                postalCode = parts[idx-1] + ' ' + parts[idx];
                idx -= 2;
            }
            // Check for split UK postal codes: "SW1A 1AA" format
            else if (idx >= 1 &&
                /^[0-9][A-Z]{2}$/i.test(parts[idx]) &&         // "1AA"
                /^[A-Z]{1,2}[0-9]{1,2}[A-Z]?$/i.test(parts[idx-1])) {  // "SW1A"
                postalCode = parts[idx-1] + ' ' + parts[idx];
                idx -= 2;
            }
            // Single-part postal codes (US, AU, etc)
            else if (idx >= 0 && /^[A-Z0-9]{3,10}$/i.test(parts[idx])) {
                postalCode = parts[idx];
                idx--;
            }

            // State (usually 2-3 letter code or short word)
            if (idx >= 0 && parts[idx].length <= 4) {
              state = parts[idx];
              idx--;
            }

            // Everything else is city
            if (idx >= 0) {
              city = parts.slice(0, idx + 1).join(' ');
            }

            return { city, state, postalCode, country };
          };

          // Convert flat schema to nested structure
          const unflattenSchema = (flatObj) => {
            const result = {};

            for (const key in flatObj) {
              const parts = key.split('.');
              let current = result;

              for (let i = 0; i < parts.length; i++) {
                const part = parts[i];

                if (i === parts.length - 1) {
                  // Last part - set the value
                  current[part] = flatObj[key];
                } else {
                  // Intermediate part - create object if doesn't exist
                  if (!current[part]) {
                    current[part] = {};
                  }
                  current = current[part];
                }
              }
            }

            return result;
          };

          const schema = unflattenSchema(flatSchema);

          // Helper to check if a field path is in the schema (use schema, not flatSchema!)
          const isFieldInSchema = (path) => {
            return schema.hasOwnProperty(path);
          };

          // Parse shipping address components from DisplayAddressLine2 if needed
          const shippingParsed = parseDisplayAddressLine2(data?.ShippingAddress?.DisplayAddressLine2);
          const billingParsed = parseDisplayAddressLine2(data?.BillingAddress?.DisplayAddressLine2);

          // Determine which shipping/carrier method fields to include based on schema
          // Use default shipping method from config if available, otherwise fall back to Cin7 data
          const carrierValue = defaultShippingMethod?.carrier_name || data?.Carrier;
          const carrierIdValue = defaultShippingMethod?.carrier_id || data?.CarrierID;
          const shippingMethodNameValue = defaultShippingMethod?.name || data?.Carrier;
          const shippingMethodIdValue = defaultShippingMethod?.id || data?.CarrierID;

          // Check what fields exist in schema
          const hasCarrierName = isFieldInSchema('carrier_name');
          const hasCarrier = isFieldInSchema('carrier');
          const hasCarrierId = isFieldInSchema('carrier_id');
          const hasShippingMethodName = isFieldInSchema('shipping_method_name');
          const hasShippingMethod = isFieldInSchema('shipping_method');
          const hasShippingMethodId = isFieldInSchema('shipping_method_id');

          let shippingMethodFields = {};

          // Handle carrier fields - add each field that exists in schema
          // carrier is deprecated if carrier_name or carrier_id exists
          if (hasCarrierName) {
            shippingMethodFields.carrier_name = carrierValue || "N/A";
          }
          if (hasCarrierId && carrierIdValue) {
            shippingMethodFields.carrier_id = carrierIdValue;
          }
          if (hasCarrier && !hasCarrierName && !hasCarrierId) {
            shippingMethodFields.carrier = carrierValue || "N/A";
          }

          // Handle shipping_method fields - add each field that exists in schema
          // shipping_method is deprecated if shipping_method_name or shipping_method_id exists
          if (hasShippingMethodName) {
            shippingMethodFields.shipping_method_name = shippingMethodNameValue || "N/A";
          }
          if (hasShippingMethodId) {
            if (shippingMethodIdValue) {
              shippingMethodFields.shipping_method_id = shippingMethodIdValue;
            } else if (carrierValue && carrierValue !== "N/A") {
              // Fallback: use carrier name as ID when no ID is available
              shippingMethodFields.shipping_method_id = carrierValue;
            }
          }
          if (hasShippingMethod && !hasShippingMethodName && !hasShippingMethodId) {
            shippingMethodFields.shipping_method = shippingMethodNameValue || "N/A";
          }

          // Get current fulfillment from loop
          const currentFulfillment = params.data?.steps?.loopOverOrderFulfillments?.loopOverItem;

          // Get pick lines from current fulfillment only
          const pickLines = currentFulfillment?.Pick?.Lines || [];

          // Combine quantities for same SKU (in case picked from different locations)
          const skuQuantityMap = {};
          pickLines.forEach(pickLine => {
            const sku = pickLine.SKU;
            if (skuQuantityMap[sku]) {
              skuQuantityMap[sku].quantity += pickLine.Quantity;
            } else {
              skuQuantityMap[sku] = {
                sku: sku,
                quantity: pickLine.Quantity,
                productId: pickLine.ProductID
              };
            }
          });

          // Convert map to array of line items
          const combinedPickLines = Object.values(skuQuantityMap);

          const sourceData = {
            warehouse_id: warehouseId,
            reference_id: params.data?.steps.generateSaleReferences.output.cin7Id,
            order_number: data?.Order?.SaleOrderNumber,
            order_date: ensureTimezone(data?.SaleOrderDate),
            purchase_order_number: params.data?.steps.generateSaleReferences.output.cin7Key,
            trackstar_tags: [data?.Order?.SaleOrderNumber, `cin7_id:${params.data?.steps.generateSaleReferences.output.cin7Id}`].filter(Boolean),
            ...shippingMethodFields,
            ship_to_address: {
              full_name: data?.Customer,
              address1: data?.ShippingAddress?.Line1 || data?.ShippingAddress?.DisplayAddressLine1,
              address2: data?.ShippingAddress?.Line2,
              city: data?.ShippingAddress?.City || shippingParsed.city,
              state: data?.ShippingAddress?.State || shippingParsed.state,
              postal_code: data?.ShippingAddress?.Postcode || shippingParsed.postalCode,
              company: data?.ShippingAddress?.Company || data?.Customer,
              country: applySubstitution(
                  data?.ShippingAddress?.Country || shippingParsed.country || shipping?.country || "Australia",
                  "country"
              ),
              ...(data?.Phone && data.Phone !== "" ? { phone_number: data.Phone } : {})
            },
            bill_to_address: {
              full_name: data?.Customer,
              address1: data?.BillingAddress?.Line1 || data?.BillingAddress?.DisplayAddressLine1,
              address2: data?.BillingAddress?.Line2,
              city: data?.BillingAddress?.City || billingParsed.city,
              state: data?.BillingAddress?.State || billingParsed.state,
              postal_code: data?.BillingAddress?.Postcode || billingParsed.postalCode,
              company: data?.BillingAddress?.Company || data?.Customer,
              country: applySubstitution(
                  data?.BillingAddress?.Country || billingParsed.country || shipping?.country || "Australia",
                  "country"
              ),
              ...(data?.Phone && data.Phone !== "" ? { phone_number: data.Phone } : {})
            },
            line_items: combinedPickLines.map(item => {
              const orderLine = (data?.Order?.Lines || []).find(
                line => line.SKU === item.sku || line.ProductID === item.productId
              );

              const productMatch = products.find(p => p.sku === item.sku);

              return {
                sku: item.sku,
                quantity: item.quantity,
                unit_price: orderLine?.Price || 0,
                product_id: productMatch?.id || null,
                tax: orderLine?.Tax || 0,
              };
            }),
          };

          // Apply entity mapping if config exists (overwrites default mappings)
          applyEntityMapping(sourceData, entityMapping, data);

        const fillFromSchema = (schemaObj, dataObj, parentPath = '') => {
            const result = {};

            for (const key in schemaObj) {
              const schemaVal = schemaObj[key];
              const dataVal = dataObj?.[key];
              const currentPath = parentPath ? `${parentPath}.${key}` : key;

              // Handle line_items array
              if (key === "line_items") {
                if (Array.isArray(dataVal) && dataVal.length > 0) {
                  const lineSchema = schemaObj[key];
                  const items = dataVal.map(item => {
                    const filteredItem = fillFromSchema(lineSchema, item, currentPath);
                    // For dear-systems, always preserve tax field even if not in schema
                    if (params.data?.var?.integrationName === 'dear-systems' && item.hasOwnProperty('tax')) {
                      filteredItem.tax = item.tax;
                    }
                    return filteredItem;
                  });
                  if (items.length > 0) result[key] = items;
                }
                continue;
              }

              // Handle nested objects
              if (typeof schemaVal === "object" && !Array.isArray(schemaVal)) {
                const nested = fillFromSchema(schemaVal, dataVal || {}, currentPath);

                // Include if it has content OR if the parent path itself is required
                if (Object.keys(nested).length > 0 || isFieldInSchema(currentPath)) {
                  result[key] = nested;
                }
                continue;
              }

              // Handle primitive values
              const fieldExistsInData = dataObj?.hasOwnProperty(key);
              const hasValue = dataVal !== undefined &&
                              dataVal !== null &&
                              dataVal !== "" &&
                              !(Array.isArray(dataVal) && dataVal.length === 0);

              // Exception: Skip address2 if it has no value
              const isOptionalEmptyField = key === 'address2' && !hasValue;

              if (hasValue) {
                // Always include fields with actual values
                result[key] = dataVal;
              } else if (fieldExistsInData && !isOptionalEmptyField) {
                // Only include empty fields if they were explicitly set in sourceData
                // and are not optional fields like address2
                result[key] = dataVal ?? "";
              }
              // If field doesn't exist in sourceData or is an optional empty field, skip it
            }

            return result;
          };

          const body = fillFromSchema(schema, sourceData);

          return { body };
        }