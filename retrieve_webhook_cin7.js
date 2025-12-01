 function handler(params) {
      const cin7Webhooks = params.data.var.cin7Webhooks || [];
      const clientWebhooks = params.data.var.clientWebhooks || [];
      const arrayOfWebHookToCreate = [];
      const arrayOfWebHookToUpdate = [];

      const tenantId = params.data.headers["x-fastn-space-tenantid"];
      const spaceId = params.data.headers["x-fastn-space-id"] || "d0f8c7f3-69d3-403c-90a0-17c8857e095f";
      const connectionId = params.data.headers["x-fastn-space-connection-id"] || "default";
      const bearerToken = "fdaf8895-2fdb-478b-babe-56deb85041cb";
      const stage = "LIVE";
      const apiKey = params.data.var.apiKey || "9e8a14d0-b3c6-4a47-b821-126c56cce6da";

      // Build ExternalHeaders array
      const externalHeaders = [
        {
          Key: "x-fastn-space-tenantId",  // ← Changed to capital I
          Value: tenantId
        },
        {
          Key: "x-fastn-space-id",
          Value: spaceId
        },
        {
          Key: "x-fastn-space-connection-id",
          Value: connectionId
        },
        {
          Key: "stage",
          Value: stage
        },
        {
          Key: "x-app-source",
          Value: "cin7"
        },
        {
          Key: "x-fastn-api-key",
          Value: apiKey
        }
      ];

      // Helper function to check if API key has changed
      const hasApiKeyChanged = (existingWebhook) => {
        const existingHeaders = existingWebhook.ExternalHeaders || [];
        const existingApiKeyHeader = existingHeaders.find(h => h.Key === "x-fastn-api-key");

        // If no API key exists in existing webhook, it's considered changed
        if (!existingApiKeyHeader) {
          return true;
        }

        // Compare values
        return existingApiKeyHeader.Value !== apiKey;
      };

      // Process each client webhook
      clientWebhooks.forEach(clientWebhook => {
        const webhookUrl = clientWebhook.webhook.url;
        const webhookEvent = clientWebhook.webhook.event;
        const webhookStatus = clientWebhook.webhook.status;
        const desiredIsActive = webhookStatus === 'Active';

        // Check if this URL already exists in cin7Webhooks
        const existingCin7Webhook = cin7Webhooks.find(
          cin7Webhook => cin7Webhook.ExternalURL === webhookUrl
        );

        if (existingCin7Webhook) {
          // Found webhook with matching URL
          const eventChanged = existingCin7Webhook.Type !== webhookEvent;
          const statusChanged = existingCin7Webhook.IsActive !== desiredIsActive;
          const apiKeyChanged = hasApiKeyChanged(existingCin7Webhook);

          if (eventChanged) {
            // Event changed - need to deactivate current and create/reactivate correct one

            // Deactivate the existing webhook (only if it's currently active)
            if (existingCin7Webhook.IsActive) {
              arrayOfWebHookToUpdate.push({
                ...existingCin7Webhook,
                IsActive: false
              });
            }

            // Look for a webhook with the same URL and correct event type
            const correctEventWebhook = cin7Webhooks.find(
              cin7Webhook => cin7Webhook.ExternalURL === webhookUrl && cin7Webhook.Type === webhookEvent
            );

            if (correctEventWebhook) {
              // Found webhook with correct event - reactivate if needed or update API key
              if (correctEventWebhook.IsActive !== desiredIsActive || hasApiKeyChanged(correctEventWebhook)) {
                arrayOfWebHookToUpdate.push({
                  ...correctEventWebhook,
                  IsActive: desiredIsActive,
                  ExternalHeaders: externalHeaders
                });
              }
            } else {
              // No webhook with correct event exists - create new one
              arrayOfWebHookToCreate.push({
                Type: webhookEvent,
                IsActive: desiredIsActive,
                ExternalURL: webhookUrl,
                ExternalAuthorizationType: 'bearerauth',
                ExternalBearerToken: bearerToken,
                ExternalHeaders: externalHeaders
              });
            }
          } else if (statusChanged || apiKeyChanged) {
            // Event is the same, but status or API key changed - update
            arrayOfWebHookToUpdate.push({
              ...existingCin7Webhook,
              IsActive: desiredIsActive,
              ExternalHeaders: externalHeaders
            });
          }
          // If nothing changed, do nothing
        } else {
          // Not found - prepare for creation
          arrayOfWebHookToCreate.push({
            Type: webhookEvent,
            IsActive: desiredIsActive,
            ExternalURL: webhookUrl,
            ExternalAuthorizationType: 'bearerauth',
            ExternalBearerToken: bearerToken,
            ExternalHeaders: externalHeaders
          });
        }
      });

      return { arrayOfWebHookToCreate, arrayOfWebHookToUpdate };
    }