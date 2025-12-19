const { test, expect } = require('@playwright/test');

/**
 * Purchase Order Webhook Tests
 *
 * This is a 2-step process:
 * 1. Ingest Purchase Order: /api/v1/clients/{client_id}/webhooks/ingest_cin7_trackstar_purchase
 * 2. Sync Purchase Order: /api/v1/clients/{client_id}/webhooks/sync_purchaseorder_cin7_trackstar
 *
 * Event: Purchase/InvoiceAuthorised
 */

test.describe('Purchase Order Webhook Tests', () => {
  const CLIENT_ID = 'd0f8c7f3-69d3-403c-90a0-17c8857e095f';
  const INGEST_WEBHOOK_PATH = `/api/v1/clients/${CLIENT_ID}/webhooks/ingest_cin7_trackstar_purchase`;
  const SYNC_WEBHOOK_PATH = `/api/v1/clients/${CLIENT_ID}/webhooks/sync_purchaseorder_cin7_trackstar`;

  // Authentication headers (from working curl request)
  const AUTH_HEADERS = {
    'x-fastn-api-key': process.env.API_KEY || '9e8a14d0-b3c6-4a47-b821-126c56cce6da',
    'Content-Type': 'application/json',
    'x-fastn-space-id': process.env.SPACE_ID || CLIENT_ID,
    'x-fastn-space-tenantid': process.env.TENANT_ID || 'jb-test',
    'stage': 'LIVE',
    'x-fastn-custom-auth': 'true'
  };

  /**
   * Helper function to generate test purchase order data
   */
  function generatePurchaseOrderData() {
    const timestamp = Date.now();
    return {
      sku: `TEST-SKU-${timestamp}`,
      expectedQuantity: 100,
      receivedQuantity: 100,
      unitCost: 15.00,
      productName: `Test Product ${timestamp}`,
      barcode: `BAR-${timestamp}`
    };
  }

  /**
   * Test: Complete 2-step purchase order flow with fully received items
   */
  test('should complete full purchase order flow with fully received items', async ({ request }) => {
    const poData = generatePurchaseOrderData();
    const purchaseOrderId = `TEST-PO-${Date.now()}`;

    // Step 1: Ingest the purchase order data
    console.log('\n--- Step 1: Ingesting Purchase Order ---');
    const ingestPayload = {
      data: {
        line_items: [
          {
            sku: poData.sku,
            expected_quantity: poData.expectedQuantity,
            received_quantity: poData.receivedQuantity,
            unit_cost: poData.unitCost,
            product_name: poData.productName,
            barcode: poData.barcode
          }
        ],
        updated_date: new Date().toISOString()
      }
    };

    const ingestResponse = await request.post(INGEST_WEBHOOK_PATH, {
      headers: AUTH_HEADERS,
      data: ingestPayload
    });

    expect(ingestResponse.ok()).toBeTruthy();
    console.log('Ingest Status:', ingestResponse.status());
    const ingestBody = await ingestResponse.json();
    console.log('Ingest Response:', JSON.stringify(ingestBody, null, 2));

    // Step 2: Sync the purchase order (trigger invoice authorization)
    console.log('\n--- Step 2: Syncing Purchase Order ---');
    const syncPayload = {
      event: 'Purchase/InvoiceAuthorised',
      purchaseOrderId: purchaseOrderId,
      connection_id: CLIENT_ID
    };

    const syncResponse = await request.post(SYNC_WEBHOOK_PATH, {
      headers: AUTH_HEADERS,
      data: syncPayload
    });

    expect(syncResponse.ok()).toBeTruthy();
    console.log('Sync Status:', syncResponse.status());
    const syncBody = await syncResponse.json();
    console.log('Sync Response:', JSON.stringify(syncBody, null, 2));
  });

  /**
   * Test: Purchase order with partially received items
   */
  test('should handle purchase order with partially received items', async ({ request }) => {
    const poData = generatePurchaseOrderData();
    const purchaseOrderId = `TEST-PO-PARTIAL-${Date.now()}`;

    // Step 1: Ingest with partial receipt
    console.log('\n--- Step 1: Ingesting Partial Purchase Order ---');
    const ingestPayload = {
      data: {
        line_items: [
          {
            sku: poData.sku,
            expected_quantity: poData.expectedQuantity,
            received_quantity: 75, // Only 75% received
            unit_cost: poData.unitCost,
            product_name: poData.productName,
            barcode: poData.barcode
          }
        ],
        updated_date: new Date().toISOString()
      }
    };

    const ingestResponse = await request.post(INGEST_WEBHOOK_PATH, {
      headers: AUTH_HEADERS,
      data: ingestPayload
    });

    expect(ingestResponse.ok()).toBeTruthy();
    const ingestBody = await ingestResponse.json();
    console.log('Partial Ingest Response:', JSON.stringify(ingestBody, null, 2));

    // Step 2: Sync the partial purchase order
    console.log('\n--- Step 2: Syncing Partial Purchase Order ---');
    const syncPayload = {
      event: 'Purchase/InvoiceAuthorised',
      purchaseOrderId: purchaseOrderId,
      connection_id: CLIENT_ID
    };

    const syncResponse = await request.post(SYNC_WEBHOOK_PATH, {
      headers: AUTH_HEADERS,
      data: syncPayload
    });

    expect(syncResponse.ok()).toBeTruthy();
    const syncBody = await syncResponse.json();
    console.log('Partial Sync Response:', JSON.stringify(syncBody, null, 2));
  });

  /**
   * Test: Purchase order with multiple line items
   */
  test('should handle purchase order with multiple line items', async ({ request }) => {
    const timestamp = Date.now();
    const purchaseOrderId = `TEST-PO-MULTI-${timestamp}`;

    // Step 1: Ingest with multiple items
    console.log('\n--- Step 1: Ingesting Multi-Item Purchase Order ---');
    const ingestPayload = {
      data: {
        line_items: [
          {
            sku: `SKU-A-${timestamp}`,
            expected_quantity: 50,
            received_quantity: 50,
            unit_cost: 10.00,
            product_name: 'Product A',
            barcode: `BAR-A-${timestamp}`
          },
          {
            sku: `SKU-B-${timestamp}`,
            expected_quantity: 75,
            received_quantity: 75,
            unit_cost: 20.00,
            product_name: 'Product B',
            barcode: `BAR-B-${timestamp}`
          },
          {
            sku: `SKU-C-${timestamp}`,
            expected_quantity: 100,
            received_quantity: 90, // Partially received
            unit_cost: 15.50,
            product_name: 'Product C',
            barcode: `BAR-C-${timestamp}`
          }
        ],
        updated_date: new Date().toISOString()
      }
    };

    const ingestResponse = await request.post(INGEST_WEBHOOK_PATH, {
      headers: AUTH_HEADERS,
      data: ingestPayload
    });

    expect(ingestResponse.ok()).toBeTruthy();
    const ingestBody = await ingestResponse.json();
    console.log('Multi-Item Ingest Response:', JSON.stringify(ingestBody, null, 2));

    // Step 2: Sync the multi-item purchase order
    console.log('\n--- Step 2: Syncing Multi-Item Purchase Order ---');
    const syncPayload = {
      event: 'Purchase/InvoiceAuthorised',
      purchaseOrderId: purchaseOrderId,
      connection_id: CLIENT_ID
    };

    const syncResponse = await request.post(SYNC_WEBHOOK_PATH, {
      headers: AUTH_HEADERS,
      data: syncPayload
    });

    expect(syncResponse.ok()).toBeTruthy();
    const syncBody = await syncResponse.json();
    console.log('Multi-Item Sync Response:', JSON.stringify(syncBody, null, 2));
  });

  /**
   * Test: Purchase order with no received quantities (pending receipt)
   */
  test('should handle purchase order with no received quantities', async ({ request }) => {
    const poData = generatePurchaseOrderData();
    const purchaseOrderId = `TEST-PO-PENDING-${Date.now()}`;

    // Step 1: Ingest with zero received
    console.log('\n--- Step 1: Ingesting Pending Purchase Order ---');
    const ingestPayload = {
      data: {
        line_items: [
          {
            sku: poData.sku,
            expected_quantity: poData.expectedQuantity,
            received_quantity: 0, // Nothing received yet
            unit_cost: poData.unitCost,
            product_name: poData.productName,
            barcode: poData.barcode
          }
        ],
        updated_date: new Date().toISOString()
      }
    };

    const ingestResponse = await request.post(INGEST_WEBHOOK_PATH, {
      headers: AUTH_HEADERS,
      data: ingestPayload
    });

    expect(ingestResponse.ok()).toBeTruthy();
    const ingestBody = await ingestResponse.json();
    console.log('Pending Ingest Response:', JSON.stringify(ingestBody, null, 2));

    // Step 2: Attempt sync (may not complete if no items received)
    console.log('\n--- Step 2: Attempting Sync for Pending Purchase Order ---');
    const syncPayload = {
      event: 'Purchase/InvoiceAuthorised',
      purchaseOrderId: purchaseOrderId,
      connection_id: CLIENT_ID
    };

    const syncResponse = await request.post(SYNC_WEBHOOK_PATH, {
      headers: AUTH_HEADERS,
      data: syncPayload
    });

    // Log response regardless of success/failure
    console.log('Pending Sync Status:', syncResponse.status());
    const syncBody = await syncResponse.text();
    console.log('Pending Sync Response:', syncBody);
  });

  /**
   * Test: Measure end-to-end processing time
   */
  test('should complete 2-step process within acceptable timeframe', async ({ request }) => {
    const poData = generatePurchaseOrderData();
    const purchaseOrderId = `TEST-PO-TIMING-${Date.now()}`;
    const startTime = Date.now();

    // Step 1: Ingest
    const ingestPayload = {
      data: {
        line_items: [
          {
            sku: poData.sku,
            expected_quantity: poData.expectedQuantity,
            received_quantity: poData.receivedQuantity,
            unit_cost: poData.unitCost,
            product_name: poData.productName,
            barcode: poData.barcode
          }
        ],
        updated_date: new Date().toISOString()
      }
    };

    const ingestResponse = await request.post(INGEST_WEBHOOK_PATH, {
      headers: AUTH_HEADERS,
      data: ingestPayload
    });
    const ingestTime = Date.now() - startTime;
    console.log(`Ingest time: ${ingestTime}ms`);

    expect(ingestResponse.ok()).toBeTruthy();

    // Step 2: Sync
    const syncStartTime = Date.now();
    const syncPayload = {
      event: 'Purchase/InvoiceAuthorised',
      purchaseOrderId: purchaseOrderId,
      connection_id: CLIENT_ID
    };

    const syncResponse = await request.post(SYNC_WEBHOOK_PATH, {
      headers: AUTH_HEADERS,
      data: syncPayload
    });
    const syncTime = Date.now() - syncStartTime;
    console.log(`Sync time: ${syncTime}ms`);

    const totalTime = Date.now() - startTime;
    console.log(`Total time: ${totalTime}ms`);

    expect(syncResponse.ok()).toBeTruthy();
    expect(totalTime).toBeLessThan(60000); // Should complete within 60 seconds
  });

  /**
   * Test: Error handling - Step 1 (Ingest) with invalid data
   */
  test('should handle invalid ingest data gracefully', async ({ request }) => {
    const invalidPayload = {
      data: {
        line_items: [
          {
            // Missing required fields
            sku: 'INVALID-SKU'
          }
        ]
      }
    };

    const response = await request.post(INGEST_WEBHOOK_PATH, {
      headers: AUTH_HEADERS,
      data: invalidPayload
    });

    console.log('Invalid Ingest Status:', response.status());
    const responseBody = await response.text();
    console.log('Invalid Ingest Response:', responseBody);
  });

  /**
   * Test: Error handling - Step 2 (Sync) with missing purchase order
   */
  test('should handle sync for non-existent purchase order', async ({ request }) => {
    const syncPayload = {
      event: 'Purchase/InvoiceAuthorised',
      purchaseOrderId: 'NON-EXISTENT-PO-999999',
      connection_id: CLIENT_ID
    };

    const response = await request.post(SYNC_WEBHOOK_PATH, {
      headers: AUTH_HEADERS,
      data: syncPayload
    });

    console.log('Non-existent PO Sync Status:', response.status());
    const responseBody = await response.text();
    console.log('Non-existent PO Response:', responseBody);
  });
});
