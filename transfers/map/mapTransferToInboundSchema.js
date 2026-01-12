function handler(params) {
      let cin7Transfer = params.data?.steps.getStockTransfer.output || {};
      const schemaData = params.data?.steps?.flattenSchemaForCreateInbound?.output?.schema || {};
      const warehouse_id = params.data.var.mappedWarehouse;
      const integrationType = "transfer";
      const hasInventoryFields = params.data.steps.flattenSchemaForCreateInbound.output.hasInventoryFields;

      // Helper function to ensure datetime has timezone
      const ensureTimezone = (datetime) => {
          if (!datetime) return null;
          // Check if datetime already has timezone (Z or +/- offset)
          if (datetime.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(datetime)) {
              return datetime;
          }
          // Append 'Z' for UTC timezone
          return datetime + 'Z';
      };

      // Get inventory items if hasInventoryFields is true (for inventory_item_id lookup only)
      let inventoryItemsMap = {};
      if (hasInventoryFields) {
          const inventoryItems = params.data?.steps?.GetAllInventoryItems?.output?.data || [];

          // Create a map of SKU -> inventory item for quick lookup
          inventoryItems.forEach(item => {
              inventoryItemsMap[item.sku] = item;
          });
      }

      // Helper function to get inventory_item_id from Trackstar
      const getInventoryItemId = (sku) => {
          if (!hasInventoryFields || !inventoryItemsMap[sku]) {
              return "";
          }
          return inventoryItemsMap[sku].id || "";
      };

      // Determine which Lines array to use based on SkipOrder
      const lines = (cin7Transfer.SkipOrder ? cin7Transfer.Lines : cin7Transfer.Order?.Lines) || [];

      // Build source data from Cin7 Stock Transfer
      const sourceData = {
          approach: "STOCK",
          supplier: cin7Transfer.FromLocation || "",
          warehouse_id,
          trackstar_tags: cin7Transfer.Number ? [cin7Transfer.Number] : [],
          reference: cin7Transfer.Reference || "",
          purchase_order_number: cin7Transfer.Number || "",
          expected_arrival_date: ensureTimezone(cin7Transfer.RequiredByDate || cin7Transfer.DepartureDate),
          country_code: "US",
          package_type: "Pallet", // Default value if required by schema
          box_packaging_type: "OneSkuPerBox", // Default value if required by schema
          line_items: lines.map(line => ({
              sku: line.SKU || "",
              expected_quantity: line.TransferQuantity || 0,
              unit_cost: 0,
              product_name: line.ProductName || "",
              barcode: line.Barcode || ""
          })),
          boxes: lines.map(line => {
              const lineItem = {
                  sku: line.SKU || "",
                  expected_quantity: line.TransferQuantity || 0
              };

              // Only add lot info if BOTH conditions are met:
              // 1. Schema has inventory fields (hasInventoryFields)
              // 2. Cin7 item has batch information (line.BatchSN)
              if (hasInventoryFields && line.BatchSN) {
                  lineItem.lot_id = line.BatchSN;
                  lineItem.inventory_item_id = getInventoryItemId(line.SKU);
                  if (line.ExpiryDate) {
                      lineItem.lot_expiration_date = ensureTimezone(line.ExpiryDate);
                  }
              }

              return {
                  line_items: [lineItem],
                  tracking_number: line.TrackingNumber || "XXX-XXXXX-XXXX" // Default if no tracking number
              };
          })
      };

      // Fill data according to schema
      const fillFromSchema = (schemaObj, dataObj) => {
          const result = {};

          for (const key in schemaObj) {
              const schemaVal = schemaObj[key];
              const dataVal = dataObj?.[key];

              // Handle line_items and boxes as arrays specifically
              if ((key === "line_items" || key === "boxes") && typeof schemaVal === "object" && !Array.isArray(schemaVal)) {
                  // Handle as array - schemaVal is the template for each item
                  if (Array.isArray(dataVal) && dataVal.length > 0) {
                      const items = dataVal.map(item => fillFromSchema(schemaVal, item));
                      if (items.length > 0) result[key] = items;
                  }
              } else if (typeof schemaVal === "object" && !Array.isArray(schemaVal)) {
                  // Nested object (like supplier_object)
                  const nested = fillFromSchema(schemaVal, dataObj || {});
                  if (Object.keys(nested).length > 0) result[key] = nested;
              } else {
                  // Primitive value
                  if (
                      dataVal !== undefined &&
                      dataVal !== null &&
                      dataVal !== "" &&
                      !(Array.isArray(dataVal) && dataVal.length === 0)
                  ) {
                      result[key] = dataVal;
                  }
              }
          }

          return result;
      };

      const body = fillFromSchema(schemaData, sourceData);

      return { body };
  }