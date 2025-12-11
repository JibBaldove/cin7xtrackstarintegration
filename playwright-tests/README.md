# Cin7 x Trackstar Integration - Playwright API Tests

This directory contains Playwright-based API tests for validating the webhook integration between Cin7 and Trackstar.

## Overview

The test suite covers two main integration flows:

1. **Sales Order Synchronization** - Testing the sync of sales orders from Cin7 to Trackstar
2. **Purchase Order Synchronization** - Testing the 2-step purchase order ingestion and sync process

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Installation

1. Navigate to the playwright-tests directory:
```bash
cd playwright-tests
```

2. Install dependencies:
```bash
npm install
```

3. Install Playwright browsers (if needed):
```bash
npx playwright install
```

4. Set up environment variables:
```bash
cp .env.example .env
```

Then edit `.env` to add your authentication credentials:
```
TENANT_ID=your-tenant-id
SPACE_ID=your-space-id
CONNECTION_ID=your-connection-id
API_KEY=your-api-key
```

## Authentication

The tests require authentication headers to access the webhook endpoints. These headers are configured based on the `retrieve_webhook_cin7.js` configuration:

- `x-fastn-space-tenantid`: Your tenant ID
- `x-fastn-space-id`: Your space/client ID (defaults to `d0f8c7f3-69d3-403c-90a0-17c8857e095f`)
- `x-fastn-space-connection-id`: Connection ID (defaults to `default`)
- `x-fastn-api-key`: Your API key (defaults to `9e8a14d0-b3c6-4a47-b821-126c56cce6da`)
- `stage`: LIVE (hardcoded)
- `x-app-source`: cin7 (hardcoded)

You can configure these values using environment variables in the `.env` file. If not set, the tests will use default values from `.env.example`.

## Running Tests

### Run all tests
```bash
npm test
```

### Run specific test suites
```bash
# Run only Sales Order tests
npm run test:sales

# Run only Purchase Order tests
npm run test:purchase
```

### Run tests in headed mode (with browser UI)
```bash
npm run test:headed
```

### Debug tests
```bash
npm run test:debug
```

## Test Structure

```
playwright-tests/
├── package.json              # Project dependencies and scripts
├── playwright.config.js      # Playwright configuration
├── tests/
│   ├── sales-order.spec.js       # Sales order webhook tests
│   └── purchase-order.spec.js    # Purchase order webhook tests (2-step)
└── README.md                 # This file
```

## Test Coverage

### Sales Order Tests (`sales-order.spec.js`)

- Create basic sales order
- Update existing sales order
- Retry failed sales order sync
- Create sales order with purchase order reference
- Error handling for missing required fields
- Response time validation

**Endpoint:**
```
POST /api/v1/clients/d0f8c7f3-69d3-403c-90a0-17c8857e095f/webhooks/sync_salesorder_cin7_trackstar_v2
```

**Payload Structure:**
```json
{
  "syncMode": "create|update",
  "saleId": "SALE-ID",
  "purchaseId": "PO-ID (optional)",
  "connection_id": "CLIENT-ID",
  "isRetry": false
}
```

### Purchase Order Tests (`purchase-order.spec.js`)

- Complete 2-step flow with fully received items
- Handle partially received items
- Process multiple line items
- Handle pending receipts (no items received)
- End-to-end processing time measurement
- Error handling for invalid data
- Error handling for non-existent purchase orders

**Step 1 - Ingest Endpoint:**
```
POST /api/v1/clients/d0f8c7f3-69d3-403c-90a0-17c8857e095f/webhooks/ingest_cin7_trackstar_purchase
```

**Step 1 Payload:**
```json
{
  "data": {
    "line_items": [
      {
        "sku": "SKU-001",
        "expected_quantity": 100,
        "received_quantity": 100,
        "unit_cost": 15.00,
        "product_name": "Product Name",
        "barcode": "BARCODE-123"
      }
    ],
    "updated_date": "2024-01-15T10:30:00Z"
  }
}
```

**Step 2 - Sync Endpoint:**
```
POST /api/v1/clients/d0f8c7f3-69d3-403c-90a0-17c8857e095f/webhooks/sync_purchaseorder_cin7_trackstar
```

**Step 2 Payload:**
```json
{
  "event": "Purchase/InvoiceAuthorised",
  "purchaseOrderId": "PO-ID",
  "connection_id": "CLIENT-ID"
}
```

## Test Reports

After running tests, Playwright generates HTML reports. To view the report:

```bash
npx playwright show-report
```

## Configuration

The `playwright.config.js` file contains:
- Test timeout: 60 seconds
- Base URL: https://live.fastn.ai
- Report formats: HTML and console list
- Trace recording on first retry

## Customization

### Changing Client ID

To test with a different client, update the `CLIENT_ID` constant in both test files:

```javascript
const CLIENT_ID = 'your-client-id-here';
```

### Adjusting Timeouts

Edit `playwright.config.js` to change global timeout:

```javascript
timeout: 60000, // milliseconds
```

Or override timeout per test:

```javascript
test('my test', async ({ request }) => {
  test.setTimeout(120000); // 2 minutes
  // ... test code
});
```

## Best Practices

1. **Unique Identifiers**: Tests generate unique IDs using timestamps to avoid collisions
2. **Console Logging**: Tests log request/response data for debugging
3. **Status Validation**: Tests validate HTTP status codes
4. **Timing Metrics**: Performance tests measure response times
5. **Error Scenarios**: Tests include error handling validation

## Troubleshooting

### Tests failing with timeout errors
- Increase timeout in `playwright.config.js`
- Check if the webhook endpoints are accessible
- Verify network connectivity

### Authentication errors
- Ensure the client ID is correct
- Check if additional headers are required

### Response validation errors
- Review console output for actual response structure
- Update test expectations based on actual API responses

## Notes

- These tests make actual API calls to the live endpoints
- Consider the impact on production data when running tests
- Some tests use placeholder data that may need adjustment based on actual system state
- Error handling tests may produce expected errors in logs

## Support

For issues or questions about the tests, refer to:
- Playwright documentation: https://playwright.dev/
- Project integration documentation
