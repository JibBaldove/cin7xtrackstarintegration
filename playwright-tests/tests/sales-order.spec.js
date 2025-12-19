const { test, expect } = require('@playwright/test');

/**
 * Sales Order Webhook Tests
 * Endpoint: /api/v1/clients/d0f8c7f3-69d3-403c-90a0-17c8857e095f/webhooks/sync_salesorder_cin7_trackstar_v2
 *
 * This test suite validates the sales order synchronization between Cin7 and Trackstar
 */

test.describe('Sales Order Webhook Tests', () => {
  const CLIENT_ID = 'd0f8c7f3-69d3-403c-90a0-17c8857e095f';
  const WEBHOOK_PATH = `/api/v1/clients/${CLIENT_ID}/webhooks/sync_salesorder_cin7_trackstar_v2`;

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
   * Helper function to generate a unique sale ID
   */
  function generateSaleId() {
    return `TEST-SO-${Date.now()}`;
  }

  /**
   * Test: Create a basic sales order
   */
  test('should successfully create a sales order with basic details', async ({ request }) => {
    const saleId = generateSaleId();

    const payload = {
      syncMode: 'create',
      saleId: saleId,
      connection_id: CLIENT_ID,
      isRetry: false
    };

    const response = await request.post(WEBHOOK_PATH, {
      headers: AUTH_HEADERS,
      data: payload
    });

    // Validate response
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const responseBody = await response.json();
    console.log('Sales Order Response:', JSON.stringify(responseBody, null, 2));
  });

  /**
   * Test: Create a sales order with update mode
   */
  test('should successfully update an existing sales order', async ({ request }) => {
    const saleId = generateSaleId();

    const payload = {
      syncMode: 'update',
      saleId: saleId,
      connection_id: CLIENT_ID,
      isRetry: false
    };

    const response = await request.post(WEBHOOK_PATH, {
      headers: AUTH_HEADERS,
      data: payload
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const responseBody = await response.json();
    console.log('Sales Order Update Response:', JSON.stringify(responseBody, null, 2));
  });

  /**
   * Test: Retry a failed sales order sync
   */
  test('should retry a previously failed sales order sync', async ({ request }) => {
    const saleId = 'EXISTING-SALE-ID'; // Replace with actual sale ID for retry testing

    const payload = {
      syncMode: 'create',
      saleId: saleId,
      connection_id: CLIENT_ID,
      isRetry: true
    };

    const response = await request.post(WEBHOOK_PATH, {
      headers: AUTH_HEADERS,
      data: payload
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const responseBody = await response.json();
    console.log('Sales Order Retry Response:', JSON.stringify(responseBody, null, 2));
  });

  /**
   * Test: Create sales order with purchase reference
   */
  test('should create sales order with purchase order reference', async ({ request }) => {
    const saleId = generateSaleId();
    const purchaseId = `TEST-PO-${Date.now()}`;

    const payload = {
      syncMode: 'create',
      saleId: saleId,
      purchaseId: purchaseId,
      connection_id: CLIENT_ID,
      isRetry: false
    };

    const response = await request.post(WEBHOOK_PATH, {
      headers: AUTH_HEADERS,
      data: payload
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const responseBody = await response.json();
    console.log('Sales Order with PO Response:', JSON.stringify(responseBody, null, 2));
  });

  /**
   * Test: Error handling - Missing required fields
   */
  test('should handle missing required fields gracefully', async ({ request }) => {
    const payload = {
      syncMode: 'create',
      // Missing saleId
      connection_id: CLIENT_ID
    };

    const response = await request.post(WEBHOOK_PATH, {
      headers: AUTH_HEADERS,
      data: payload
    });

    // Log the response for debugging
    const responseBody = await response.text();
    console.log('Error Response:', responseBody);
    console.log('Response Status:', response.status());
  });

  /**
   * Test: Validate webhook response time
   */
  test('should respond within acceptable time frame', async ({ request }) => {
    const saleId = generateSaleId();
    const startTime = Date.now();

    const payload = {
      syncMode: 'create',
      saleId: saleId,
      connection_id: CLIENT_ID,
      isRetry: false
    };

    const response = await request.post(WEBHOOK_PATH, {
      headers: AUTH_HEADERS,
      data: payload
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log(`Response time: ${responseTime}ms`);

    expect(response.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(30000); // Should respond within 30 seconds
  });
});
