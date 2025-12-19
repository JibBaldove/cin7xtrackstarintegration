// Test file to demonstrate the parser usage
const parser = require('./parseConfigResponse.js');

// Example response from the API (matching the WORKING handler structure)
// Working handler uses: params.data.steps.SelectTableTblCin7TrackstarTenantConfig.output[0].tenant_config
const exampleResponse = {
  data: {
    steps: {
      SelectTableTblCin7TrackstarTenantConfig: {
        input: "SELECT tenant_config FROM tbl_cin7_trackstar_tenant_config WHERE tenant_id = ?",
        output: [
          {
            tenant_config: "{\"apiKey\": \"9e8a14d0-b3c6-4a47-b821-126c56cce6da\", \"syncConfig\": [{\"entity\": \"sale\", \"status\": \"Active\", \"webhook\": [{\"url\": \"https://live.fastn.ai/api/v1/clients/d0f8c7f3-69d3-403c-90a0-17c8857e095f/webhooks/sync_salesorder_cin7_trackstar\", \"event\": \"Sale/PickAuthorised\", \"status\": \"Active\"}, {\"url\": \"https://live.fastn.ai/api/v1/clients/d0f8c7f3-69d3-403c-90a0-17c8857e095f/webhooks/sync_salesorder_cin7_trackstar_v2\", \"event\": \"Sale/PickAuthorised\", \"status\": \"Inactive\"}]}, {\"entity\": \"purchase\", \"status\": \"Active\", \"webhook\": [{\"url\": \"https://live.fastn.ai/api/v1/clients/d0f8c7f3-69d3-403c-90a0-17c8857e095f/webhooks/ingest_cin7_trackstar_purchase\", \"event\": \"Purchase/OrderAuthorised\", \"status\": \"Active\"}, {\"url\": \"https://live.fastn.ai/api/v1/clients/d0f8c7f3-69d3-403c-90a0-17c8857e095f/webhooks/sync_purchaseorder_cin7_trackstar\", \"event\": \"Purchase/InvoiceAuthorised\", \"status\": \"Active\"}]}, {\"entity\": \"inventory\", \"status\": \"Active\", \"quantityType\": \"sellable\", \"autoAcceptThreshold\": 5, \"locationScope\": \"mapped\"}], \"locationMapping\": [{\"warehouses\": {\"NRI-EAST\": \"MA\", \"NRI-WEST\": \"VB\"}, \"connectionId\": \"default\", \"substitutionList\": [{\"listName\": \"country\", \"mapping\": {\"USA\": \"US\", \"United States\": \"US\"}}]}], \"notificationRecipient\": [\"dorothee@spireoutdoorgroup.com\", \"jib@four13.co\"]}"
          }
        ]
      }
    },
    var: {
      connectionId: "default"
    }
  }
};

// Parse the response
const result = parser.handler(exampleResponse);

console.log('Parsed Config:');
console.log(JSON.stringify(result, null, 2));

/*
Expected Output Structure:
{
  "apiKey": "9e8a14d0-b3c6-4a47-b821-126c56cce6da",
  "syncConfig": [
    {
      "entity": "sale",
      "status": "Active",
      "webhooks": [
        {
          "url": "https://live.fastn.ai/api/v1/clients/d0f8c7f3-69d3-403c-90a0-17c8857e095f/webhooks/sync_salesorder_cin7_trackstar",
          "event": "Sale/PickAuthorised",
          "status": "Active"
        },
        {
          "url": "https://live.fastn.ai/api/v1/clients/d0f8c7f3-69d3-403c-90a0-17c8857e095f/webhooks/sync_salesorder_cin7_trackstar_v2",
          "event": "Sale/PickAuthorised",
          "status": "Inactive"
        }
      ]
    },
    {
      "entity": "purchase",
      "status": "Active",
      "webhooks": [
        {
          "url": "https://live.fastn.ai/api/v1/clients/d0f8c7f3-69d3-403c-90a0-17c8857e095f/webhooks/ingest_cin7_trackstar_purchase",
          "event": "Purchase/OrderAuthorised",
          "status": "Active"
        },
        {
          "url": "https://live.fastn.ai/api/v1/clients/d0f8c7f3-69d3-403c-90a0-17c8857e095f/webhooks/sync_purchaseorder_cin7_trackstar",
          "event": "Purchase/InvoiceAuthorised",
          "status": "Active"
        }
      ]
    }
  ],
  "locationMapping": [
    {
      "connectionId": "default",
      "warehouses": {
        "NRI-EAST": "MA",
        "NRI-WEST": "VB"
      }
    }
  ],
  "notificationRecipient": [
    "dorothee@spireoutdoorgroup.com",
    "jib@four13.co"
  ]
}
*/
