function handler(params) {
      const { data, previous_attributes } = params.data?.input || {};
      let trackstarOrderId = params?.data?.steps.SelectReferenceTable?.output[0]?.cin7_id;

      // Get location mapping from variables
      const locationMapping = params.data?.var?.locationMapping || [];

      // Helper function to get warehouse name from ID
      function getWarehouseName(warehouseId) {
          if (!warehouseId || !locationMapping || locationMapping.length === 0) {
              return "";
          }

          // Normalize the warehouse ID (trim whitespace, convert to string)
          const normalizedSearchId = String(warehouseId).trim();

          // Search through all connection mappings
          for (let mapping of locationMapping) {
              if (!mapping.warehouses) continue;

              // Search through warehouses to find the name by ID
              for (let warehouseName in mapping.warehouses) {
                  const normalizedMappingId = String(mapping.warehouses[warehouseName]).trim();

                  if (normalizedMappingId === normalizedSearchId) {
                      return warehouseName;
                  }
              }
          }

          return "";
      }

      // Start with required ID field only
      let payload = {
          saleUpdate: {
              body: {
                  ID: trackstarOrderId,
                  Customer: data?.trading_partner
                          || data?.ship_to_address?.full_name
                          || data?.ship_to_address?.company
                          || ""
              }
          }
      };

      // If no previous_attributes, return just the ID (no changes to update)
      if (!previous_attributes) {
          return payload;
      }

      // Build a Set of changed fields using for...in loop (the only method that works)
      const changedFields = new Set();
      for (let key in previous_attributes) {
          changedFields.add(key);
      }

      // Helper: Check if field was changed
      function wasFieldChanged(fieldPath) {
          return changedFields.has(fieldPath);
      }

      // Map only changed Trackstar fields → Cin7 fields
      let changes = {};

      // ===== ORDER LEVEL FIELDS =====

      // Status
      if (wasFieldChanged('status')) {
          changes.Status = data.status || "";
      }

      // Raw Status
      if (wasFieldChanged('raw_status')) {
          changes.Note = `Status: ${data.raw_status}` || "";
      }

      // Reference ID / Order Number
      if (wasFieldChanged('reference_id')) {
          changes.CustomerReference = data.reference_id || "";
      }

      if (wasFieldChanged('order_number')) {
          changes.CustomerReference = data.order_number || "";
      }

      // Trading Partner / Customer
      if (wasFieldChanged('trading_partner')) {
          changes.Customer = data.trading_partner || "";
      }

      // Warehouse Customer ID
      if (wasFieldChanged('warehouse_customer_id')) {
          changes.CustomerID = data.warehouse_customer_id || "";
      }

      // Channel
      if (wasFieldChanged('channel')) {
          changes.Note = (changes.Note ? changes.Note + " | " : "") + `Channel: ${data.channel}`;
      }

      // Shipping Notes
      if (wasFieldChanged('shipping_notes')) {
          changes.ShippingNotes = data.shipping_notes || "";
      }

      // ===== DATES =====

      if (wasFieldChanged('required_ship_date')) {
          changes.ShipBy = data.required_ship_date || "";
      }

      if (wasFieldChanged('created_date')) {
          changes.SaleOrderDate = data.created_date || "";
      }

      // ===== SHIPPING FIELDS =====

      if (wasFieldChanged('carrier_name')) {
          changes.Carrier = data.carrier_name || "";
      }

      if (wasFieldChanged('shipping_method')) {
          changes.Carrier = data.shipping_method || "";
      }

      if (wasFieldChanged('shipping_method_name')) {
          changes.Carrier = data.shipping_method_name || "";
      }

      if (wasFieldChanged('service_level')) {
          changes.Carrier = data.service_level || "";
      }

      if (wasFieldChanged('warehouse_id')) {
          // changes.Location = data.warehouse_id || "";
      }

      // ===== SHIPPING ADDRESS FIELDS =====

      if (wasFieldChanged('ship_to_address.email_address')) {
          changes.Email = data.ship_to_address?.email_address || "";
      }

      if (wasFieldChanged('ship_to_address.phone_number')) {
          changes.Phone = data.ship_to_address?.phone_number || "";
      }

      if (wasFieldChanged('ship_to_address.full_name')) {
          changes.Contact = data.ship_to_address?.full_name || "";
      }

      const addressFields = [
          'ship_to_address.company',
          'ship_to_address.state',
          'ship_to_address.country',
          'ship_to_address.city',
          'ship_to_address.address1',
          'ship_to_address.postal_code',
          'ship_to_address.address2',
          'ship_to_address.address3'
      ];

      const addressChanged = addressFields.some(field => wasFieldChanged(field));

      if (addressChanged) {
          changes.ShippingAddress = {
              Line1: data.ship_to_address?.address1 || "",
              Line2: data.ship_to_address?.address2 || "",
              City: data.ship_to_address?.city || "",
              State: data.ship_to_address?.state || "",
              Postcode: data.ship_to_address?.postal_code || "",
              Country: data.ship_to_address?.country || "",
              Company: data.ship_to_address?.company || "",
              Contact: data.ship_to_address?.full_name || "",
              ShipToOther: false
          };
      }

      // ===== LINE ITEMS =====

      const lineItemChanged = Array.from(changedFields).some(key =>
          key.startsWith('line_items.')
      );

      if (lineItemChanged) {
          changes.Lines = data.line_items?.map(item => ({
              Product: item.sku,
              Quantity: item.quantity,
              Price: item.unit_price,
              Discount: item.discount_amount || 0
          }));
      }

      // ===== PICK ITEMS =====
      // Check if any line item's is_picked status changed from false to true
      const isPickedChanged = Array.from(changedFields).some(key =>
          key.includes('is_picked')
      );

      if (isPickedChanged && data.line_items) {
          // Check if items are now picked
          const hasPickedItems = data.line_items.some(item => item.is_picked === true);

          if (hasPickedItems) {
              // Get warehouse name for the location
              const warehouseName = getWarehouseName(data.warehouse_id);

              // Create SalePick payload - this must happen BEFORE Pack and Ship
              payload.salePick = {
                  endpoint: "POST /salepick",
                  body: {
                      TaskID: trackstarOrderId,
                      Status: "AUTHORISED",
                      Lines: data.line_items
                          .filter(item => item.is_picked === true)
                          .map(item => ({
                              SKU: item.sku,
                              Location: warehouseName,
                              Quantity: item.quantity
                          }))
                  }
              };
          }
      }

      // ===== SHIPMENTS =====
      // When shipments change, create separate payloads for Pack and Ship endpoints

      if (wasFieldChanged('shipments')) {
          if (data.shipments && data.shipments.length > 0) {
              const allTrackingNumbers = [];

              data.shipments.forEach(shipment => {
                  if (shipment.packages && shipment.packages.length > 0) {
                      shipment.packages.forEach(pkg => {
                          if (pkg.tracking_number) {
                              allTrackingNumbers.push(pkg.tracking_number);
                          }
                      });
                  }
              });

              if (allTrackingNumbers.length > 0) {
                  changes.CombinedTrackingNumbers = allTrackingNumbers.join(', ');
              }

              const firstShipment = data.shipments[0];

              if (firstShipment.packages && firstShipment.packages.length > 0) {
                  const firstPackage = firstShipment.packages[0];

                  if (firstPackage.carrier_name && !changes.Carrier) {
                      changes.Carrier = firstPackage.carrier_name;
                  }
              }

              if (firstShipment.status) {
                  const statusNote = `Shipment Status: ${firstShipment.status}`;
                  changes.Note = changes.Note
                      ? `${changes.Note} | ${statusNote}`
                      : statusNote;
              }

              // ===== CREATE SALE PACK PAYLOAD =====
              // This marks items as packed in Cin7
              const packLines = [];

              // Try shipment warehouse first, fall back to order warehouse
              let warehouseName = "";
              if (firstShipment.warehouse_id) {
                  warehouseName = getWarehouseName(firstShipment.warehouse_id);
              }
              // If not found in mapping, fall back to order warehouse
              if (!warehouseName && data.warehouse_id) {
                  warehouseName = getWarehouseName(data.warehouse_id);
              }
              // If still not found, use default warehouse name
              if (!warehouseName) {
                  warehouseName = "Main Warehouse";
              }

              // If we have shipment package data, use it for box names
              if (firstShipment.packages && firstShipment.packages.length > 0) {
                  firstShipment.packages.forEach((pkg, pkgIndex) => {
                      if (pkg.line_items && pkg.line_items.length > 0) {
                          pkg.line_items.forEach(item => {
                              packLines.push({
                                  SKU: item.sku,
                                  Location: warehouseName,
                                  Quantity: item.quantity,
                                  Box: pkg.package_name || pkg.tracking_number || `Box ${pkgIndex + 1}`
                              });
                          });
                      }
                  });
              }

              // Fallback: if no package line items, use main line items
              if (packLines.length === 0) {
                  data.line_items?.forEach((item, index) => {
                      packLines.push({
                          SKU: item.sku,
                          Location: warehouseName,
                          Quantity: item.quantity,
                          Box: "Box 1"  // Default box name
                      });
                  });
              }

              payload.salePack = {
                  endpoint: "POST /salepack",
                  body: {
                      TaskID: trackstarOrderId,
                      Status: "AUTHORISED",
                      Lines: packLines
                  }
              };

              // ===== CREATE SALE SHIP PAYLOAD =====
              // This marks the order as shipped with tracking info
              const shipLines = [];

              // Build shipment lines per package/box
              data.shipments.forEach(shipment => {
                  if (shipment.packages && shipment.packages.length > 0) {
                      shipment.packages.forEach((pkg, pkgIndex) => {
                          shipLines.push({
                              ShipmentDate: shipment.shipped_date || new Date().toISOString(),
                              Carrier: pkg.carrier_name || "",
                              Box: pkg.package_name || pkg.tracking_number || `Box ${pkgIndex + 1}`,
                              TrackingNumber: pkg.tracking_number || "",
                              TrackingURL: pkg.tracking_url || "",
                              IsShipped: true
                          });
                      });
                  }
              });

              // Determine ship status based on completion
              let shipStatus = "AUTHORISED"; // Default: fully shipped

              // Calculate total shipped quantity per SKU from packages
              const shippedQuantities = {};
              data.shipments.forEach(shipment => {
                  if (shipment.packages && shipment.packages.length > 0) {
                      shipment.packages.forEach(pkg => {
                          if (pkg.line_items && pkg.line_items.length > 0) {
                              pkg.line_items.forEach(item => {
                                  shippedQuantities[item.sku] = (shippedQuantities[item.sku] || 0) + item.quantity;
                              });
                          }
                      });
                  }
              });

              // Compare with order line items
              let allItemsShipped = true;
              if (data.line_items && data.line_items.length > 0) {
                  for (let item of data.line_items) {
                      const orderedQty = item.quantity || 0;
                      const shippedQty = shippedQuantities[item.sku] || 0;

                      if (shippedQty < orderedQty) {
                          allItemsShipped = false;
                          break;
                      }
                  }
              }

              // Set status based on completion
              if (!allItemsShipped) {
                  shipStatus = "PARTIALLY AUTHORISED";
              }

              payload.saleShip = {
                  endpoint: "POST /saleship",
                  body: {
                      TaskID: trackstarOrderId,
                      Status: shipStatus,
                      RequireBy: null,
                      ShippingAddress: {
                          DisplayAddressLine1: data.ship_to_address?.address1 || "",
                          DisplayAddressLine2: [
                              data.ship_to_address?.city,
                              data.ship_to_address?.state,
                              data.ship_to_address?.postal_code,
                              data.ship_to_address?.country
                          ].filter(Boolean).join(' '),
                          Line1: data.ship_to_address?.address1 || "",
                          Line2: data.ship_to_address?.address2 || "",
                          City: data.ship_to_address?.city || "",
                          State: data.ship_to_address?.state || "",
                          Postcode: data.ship_to_address?.postal_code || "",
                          Country: data.ship_to_address?.country || "",
                          Company: data.ship_to_address?.company || "",
                          Contact: data.ship_to_address?.full_name || "",
                          ShipToOther: false
                      },
                      ShippingNotes: `Shipment Status: ${firstShipment.status || 'shipped'}`,
                      Lines: shipLines.length > 0 ? shipLines : [{
                          ShipmentDate: new Date().toISOString(),
                          Carrier: "",
                          Box: "Box 1",
                          TrackingNumber: "",
                          TrackingURL: "",
                          IsShipped: true
                      }]
                  }
              };
          }
      }

      // ===== STATUS CHANGES =====
      // If order status changes to specific values, might need invoice endpoint
      if (wasFieldChanged('status')) {
          const status = data.status?.toLowerCase();

          // If order is fulfilled/invoiced, create invoice payload
          if (status === 'fulfilled' || status === 'invoiced') {
              payload.saleInvoice = {
                  endpoint: "POST /sale/invoice",
                  body: {
                      TaskID: trackstarOrderId,
                      InvoiceDate: data.updated_date || new Date().toISOString(),
                      InvoiceDueDate: data.updated_date || new Date().toISOString()
                  }
              };
          }

          // If order is cancelled
          if (status === 'cancelled' || status === 'voided') {
              payload.saleVoid = {
                  endpoint: "POST /sale/void",
                  body: {
                      TaskID: trackstarOrderId
                  }
              };
          }
      }

      // ===== ADDITIONAL FIELDS =====

      if (wasFieldChanged('saturday_delivery')) {
          const saturdayNote = `Saturday Delivery: ${data.saturday_delivery}`;
          changes.ShippingNotes = changes.ShippingNotes
              ? `${changes.ShippingNotes}\n${saturdayNote}`
              : saturdayNote;
      }

      if (wasFieldChanged('signature_required')) {
          const signatureNote = `Signature Required: ${data.signature_required}`;
          changes.ShippingNotes = changes.ShippingNotes
              ? `${changes.ShippingNotes}\n${signatureNote}`
              : signatureNote;
      }

      // Merge ID with only the changed fields
      payload.saleUpdate.body = {
          ...payload.saleUpdate.body,
          ...changes
      };

      return payload;
  }x``