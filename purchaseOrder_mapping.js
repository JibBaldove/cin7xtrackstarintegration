function handler(params) {
          let cin7PO = params.data?.steps.GetAdvancedPurchase.output || {};
          const schemaData = params.data?.steps?.flattenSchemaForCreatePO?.output?.schema || {};
          const warehouse_id = params.data.var.mappedWarehouse;
          const invoiceId = params.data.var.invoiceId;
          const integrationType = "purchase";

          // Get invoices and putaway data
          const invoices = cin7PO.Invoice || [];
          const putAwayReceipts = cin7PO.PutAway || [];

          // Helper: Convert date to ISO8601 with timezone
          const toISO8601WithTimezone = (dateString) => {
              if (!dateString) return null;

              try {
                  const date = new Date(dateString);
                  if (isNaN(date.getTime())) return null;

                  // Convert to ISO string with Z (UTC timezone)
                  return date.toISOString();
              } catch (e) {
                  return null;
              }
          };

          // Helper: Fill data according to schema
          const fillFromSchema = (schemaObj, dataObj) => {
              const result = {};

              for (const key in schemaObj) {
                  const schemaVal = schemaObj[key];
                  const dataVal = dataObj?.[key];

                  if (key === "line_items") {
                      if (Array.isArray(dataVal) && dataVal.length > 0) {
                          const items = dataVal.map(item => fillFromSchema(schemaVal, item));
                          if (items.length > 0) result[key] = items;
                      }
                  } else if (typeof schemaVal === "object" && !Array.isArray(schemaVal)) {
                      const nested = fillFromSchema(schemaVal, dataVal || {});
                      if (Object.keys(nested).length > 0) result[key] = nested;
                  } else {
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

          // Helper: Process a single invoice and create payload
          const processInvoice = (invoice) => {
              // Skip if invoice has no lines
              if (!invoice.Lines || invoice.Lines.length === 0) {
                  return null;
              }

              // Find matching PutAway receipt for actual received quantities
              const putAwayReceipt = putAwayReceipts.find(
                  pa => pa.TaskID && invoice.TaskID &&
                  pa.TaskID.toLowerCase() === invoice.TaskID.toLowerCase()
              );

              // Build source data for this specific invoice/receipt
              const sourceData = {
                  approach: cin7PO.Approach || "INVOICE",
                  supplier: cin7PO.Supplier || "",
                  warehouse_id,
                  purchase_order_number: cin7PO.OrderNumber || "",
                  country_code: cin7PO.ShippingAddress?.Country || cin7PO.BillingAddress?.Country || "US",
                  trackstar_tags: [
                      cin7PO.OrderNumber || "",
                      `Invoice-${invoice.InvoiceNumber}`,
                      `Receipt-${invoice.InvoicingAndReceivingNumber}`
                  ].filter(tag => tag),
                  reference: `${cin7PO.OrderNumber}-R${invoice.InvoicingAndReceivingNumber}`,
                  expected_arrival_date: toISO8601WithTimezone(invoice.InvoiceDate || cin7PO.OrderDate),
                  // Use Invoice Lines for actual invoiced quantities
                  line_items: invoice.Lines.map(line => {
                      // Find matching PutAway line to check if received
                      const putAwayLine = putAwayReceipt?.Lines?.find(
                          pal => pal.SKU === line.SKU
                      );

                      return {
                          sku: line.SKU || "",
                          expected_quantity: line.Quantity || 0,
                          received_quantity: putAwayLine?.Received ? (putAwayLine.Quantity || 0) : 0,
                          unit_cost: line.Price || 0,
                          product_name: line.Name || "",
                          barcode: putAwayLine?.BatchSN || ""
                      };
                  })
              };

              // Apply schema mapping
              const body = fillFromSchema(schemaData, sourceData);

              return {
                  body,
                  metadata: {
                      cin7_purchase_id: cin7PO.ID,
                      purchase_order_number: cin7PO.OrderNumber,
                      invoice_task_id: invoice.TaskID,
                      invoice_number: invoice.InvoiceNumber,
                      invoice_date: invoice.InvoiceDate,
                      invoicing_receiving_number: invoice.InvoicingAndReceivingNumber,
                      invoice_status: invoice.Status,
                      invoice_total: invoice.Total
                  }
              };
          };

          // Check if invoiceId is provided and valid
          if (!invoiceId || invoiceId === "" || invoiceId === null) {
              // Process ALL invoices and return array, filtering out nulls (empty invoices)
              return invoices.map(invoice => processInvoice(invoice)).filter(payload => payload !== null);
          } else {
              // Find the specific invoice by TaskID (case-insensitive)
              const invoice = invoices.find(inv =>
                  inv.TaskID &&
                  inv.TaskID.toLowerCase() === invoiceId.toLowerCase()
              );

              // If invoice not found, return error with empty array
              if (!invoice) {
                  return {
                      error: `Invoice with TaskID ${invoiceId} not found`,
                      payloads: []
                  };
              }

              // Check if invoice has lines
              if (!invoice.Lines || invoice.Lines.length === 0) {
                  return {
                      error: `Invoice with TaskID ${invoiceId} has no line items`,
                      payloads: []
                  };
              }

              // Return array with single payload
              return [processInvoice(invoice)];
          }
      }