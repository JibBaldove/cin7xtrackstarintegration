function handler(params) {
      const { data, previous_attributes } = params.data?.input || {};
      let taskId = params?.data?.steps.SelectReferenceTable?.output[0]?.cin7_id;

      // If taskId contains a colon, extract the part after the colon
      if (taskId && taskId.includes(':')) {
          taskId = taskId.split(':')[1];
      }

      // Get location mapping from variables
      const locationMapping = params.data?.var?.locationMapping || [];

      // Check if this is a direct trigger (not a change-based trigger)
      const isDirectTrigger = params.data?.var?.trigger === null || params.data?.var?.trigger === undefined;

      // Helper function to get warehouse name from Trackstar warehouse ID
      function getWarehouseName(warehouseId) {
          if (!warehouseId || !locationMapping || locationMapping.length === 0) {
              return "";
          }

          // Normalize the warehouse ID (trim whitespace, convert to string)
          const normalizedSearchId = String(warehouseId).trim();

          // Search through all connection mappings
          for (let mapping of locationMapping) {
              if (!mapping.warehouses || !Array.isArray(mapping.warehouses)) continue;

              // Search through warehouses array to find the Cin7 warehouse name by Trackstar location ID
              for (let warehouse of mapping.warehouses) {
                  const normalizedMappingId = String(warehouse.trackstarLocationId).trim();

                  if (normalizedMappingId === normalizedSearchId) {
                      return warehouse.cin7WarehouseName;
                  }
              }
          }

          return "";
      }

      // Start with base payload structure
      let payload = {
          saleId: taskId
      };

      // If no previous_attributes and not a direct trigger, return just saleId
      if (!previous_attributes && !isDirectTrigger) {
          return payload;
      }

      // Build a Set of changed fields using for...in loop (the only method that works)
      const changedFields = new Set();
      for (let key in previous_attributes) {
          changedFields.add(key);
      }

      // Helper: Check if field was changed or if we're in direct trigger mode
      function wasFieldChanged(fieldPath) {
          return isDirectTrigger || changedFields.has(fieldPath);
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

      // ===== DETERMINE SALE TYPE (Simple vs Advanced) EARLY =====
      // We need to determine this before processing shipments to know if TaskID should be included
      // Determine if multi-fulfillment based on:
      // 1. Multiple shipments exist (already fulfilled in multiple shipments)
      // 2. Partial fulfillment (shipped < ordered, expecting more shipments)
      let saleType = "Simple"; // Default to Simple (single fulfillment)

      // Check if multiple shipments exist
      if (data.shipments && data.shipments.length > 1) {
          saleType = "Advanced";
      } else if (data.line_items && data.line_items.length > 0) {
          // If only one or no shipments, check if partial fulfillment
          // Build a map of ordered quantities by SKU
          const orderedQtyMap = {};
          data.line_items.forEach(item => {
              orderedQtyMap[item.sku] = (orderedQtyMap[item.sku] || 0) + item.quantity;
          });

          // Calculate shipped quantities by SKU from all shipments
          const shippedQtyMap = {};
          if (data.shipments && data.shipments.length > 0) {
              data.shipments.forEach(shipment => {
                  if (shipment.packages && shipment.packages.length > 0) {
                      shipment.packages.forEach(pkg => {
                          if (pkg.line_items && pkg.line_items.length > 0) {
                              pkg.line_items.forEach(item => {
                                  shippedQtyMap[item.sku] = (shippedQtyMap[item.sku] || 0) + item.quantity;
                              });
                          }
                      });
                  }
              });
          }

          // Compare ordered vs shipped quantities for each SKU
          for (let sku in orderedQtyMap) {
              const ordered = orderedQtyMap[sku];
              const shipped = shippedQtyMap[sku] || 0;

              if (shipped < ordered) {
                  // Not fully fulfilled - expecting more shipments in the future
                  saleType = "Advanced";
                  break;
              }
          }
      }

      // ===== SHIPMENTS =====
      // When shipments change, create separate payloads for Pack and Ship endpoints
      // Process each shipment individually to create Pick, Pack, and Ship operations

      if (wasFieldChanged('shipments')) {
          if (data.shipments && data.shipments.length > 0) {
              const allTrackingNumbers = [];
              const shipmentOperations = [];

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

              // ===== PROCESS EACH SHIPMENT INDIVIDUALLY =====
              // Create Pick, Pack, and Ship operations for each shipment
              data.shipments.forEach(shipment => {
                  // Get trackstar ID (order_id:shipment_id) and key (order_number:last6digits)
                  const shipmentId = shipment.id || shipment.shipment_id;
                  const trackstarOrderId = data.id || data.order_id;
                  const trackstarId = `${trackstarOrderId}:${shipmentId}`;
                  const last6Digits = shipmentId ? shipmentId.toString().slice(-6) : '000000';
                  const trackstarKey = `${data.order_number || ''}:${last6Digits}`;

                  // Get warehouse name for the location
                  let warehouseName = "";
                  if (shipment.warehouse_id) {
                      warehouseName = getWarehouseName(shipment.warehouse_id);
                  }
                  // If not found in mapping, fall back to order warehouse
                  if (!warehouseName && data.warehouse_id) {
                      warehouseName = getWarehouseName(data.warehouse_id);
                  }
                  // If still not found, use default warehouse name
                  if (!warehouseName) {
                      warehouseName = "Main Warehouse";
                  }

                  // Get current Cin7 order data to check for existing lot info
                  const cin7Order = params.data?.steps?.getSale?.output;
                  const cin7PickLines = cin7Order?.Fulfilments?.[0]?.Pick?.Lines || [];

                  // Helper function to get lot info for a SKU
                  function getLotInfo(sku, trackstarLotId, trackstarExpiryDate) {
                      // Priority 1: Check if Cin7 Pick already has lot info for this SKU
                      const cin7PickLine = cin7PickLines.find(line => line.SKU === sku);
                      if (cin7PickLine && cin7PickLine.BatchSN) {
                          return {
                              BatchSN: cin7PickLine.BatchSN,
                              ExpiryDate: cin7PickLine.ExpiryDate || null
                          };
                      }

                      // Priority 2: Use Trackstar lot info if available
                      if (trackstarLotId) {
                          return {
                              BatchSN: trackstarLotId,
                              ExpiryDate: trackstarExpiryDate || null
                          };
                      }

                      // Priority 3: No lot info available
                      return null;
                  }

                  // ===== CREATE SALE PICK =====
                  const pickLines = [];
                  if (shipment.packages && shipment.packages.length > 0) {
                      shipment.packages.forEach(pkg => {
                          if (pkg.line_items && pkg.line_items.length > 0) {
                              pkg.line_items.forEach(item => {
                                  pickLines.push({
                                      SKU: item.sku,
                                      Location: warehouseName,
                                      Quantity: item.quantity
                                  });
                              });
                          }
                      });
                  }

                  // ===== CREATE SALE PACK =====
                  const packLines = [];
                  if (shipment.packages && shipment.packages.length > 0) {
                      shipment.packages.forEach((pkg, pkgIndex) => {
                          if (pkg.line_items && pkg.line_items.length > 0) {
                              pkg.line_items.forEach(item => {
                                  const packLine = {
                                      SKU: item.sku,
                                      Location: warehouseName,
                                      Quantity: item.quantity,
                                      Box: pkg.package_name || pkg.tracking_number || `Box ${pkgIndex + 1}`
                                  };

                                  // Add lot info if available
                                  const lotInfo = getLotInfo(item.sku, item.lot_id, item.expiration_date);
                                  if (lotInfo) {
                                      packLine.BatchSN = lotInfo.BatchSN;
                                      if (lotInfo.ExpiryDate) {
                                          packLine.ExpiryDate = lotInfo.ExpiryDate;
                                      }
                                  }

                                  packLines.push(packLine);
                              });
                          }
                      });
                  }

                  // ===== CREATE SALE SHIP =====
                  const shipLines = [];
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

                  // Build operation bodies - conditionally include TaskID based on saleType
                  const salePickBody = {
                      Status: "AUTHORISED",
                      Lines: pickLines
                  };
                  const salePackBody = {
                      Status: "AUTHORISED",
                      Lines: packLines
                  };
                  const saleShipBody = {
                      Status: "AUTHORISED",
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
                      ShippingNotes: `Shipment Status: ${shipment.status || 'shipped'}`,
                      Lines: shipLines
                  };

                  // Add TaskID only if saleType is Simple
                  if (saleType === "Simple") {
                      salePickBody.TaskID = taskId;
                      salePackBody.TaskID = taskId;
                      saleShipBody.TaskID = taskId;
                  }

                  // Add this shipment's operations to the array
                  shipmentOperations.push({
                      trackstarId: trackstarId,
                      trackstarKey: trackstarKey,
                      salePick: pickLines.length > 0 ? {
                          endpoint: "POST /salepick",
                          body: salePickBody
                      } : null,
                      salePack: packLines.length > 0 ? {
                          endpoint: "POST /salepack",
                          body: salePackBody
                      } : null,
                      saleShip: shipLines.length > 0 ? {
                          endpoint: "POST /saleship",
                          body: saleShipBody
                      } : null
                  });
              });

              // Add the shipment operations array to the payload
              payload.shipmentOperations = shipmentOperations;
          }
      }

      // Add saleType to the payload (already determined earlier)
      payload.saleType = saleType;

      return payload;
  }