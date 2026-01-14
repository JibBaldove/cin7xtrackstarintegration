function handler(params) {
  const syncConfig = params.data.var.syncConfig;

  // Find the sale entity
  const saleEntity = syncConfig.find(config => config.entity === 'sale');

  // If no sale entity found or it's not active, return null
  if (!saleEntity || saleEntity.status !== 'Active') {
    return { activeEventType: null };
  }

  // Get the first active webhook's event type
  const activeWebhook = (saleEntity.webhook || [])
    .find(webhook => webhook.status === 'Active');

  const activeEventType = activeWebhook ? activeWebhook.event : null;

  return { activeEventType };
}
