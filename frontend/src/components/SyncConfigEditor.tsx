
interface Webhook {
  url: string;
  event: string;
  status: 'Active' | 'Inactive';
}

interface SyncConfig {
  entity: 'sale' | 'purchase' | 'inventory';
  status: 'Active' | 'Inactive';
  webhook: Webhook[];
}

interface Props {
  syncConfig: SyncConfig[];
  onChange: (syncConfig: SyncConfig[]) => void;
}

export function SyncConfigEditor({ syncConfig, onChange }: Props) {
  const updateSyncConfig = (index: number, field: keyof SyncConfig, value: any) => {
    const updated = [...syncConfig];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const updateWebhook = (syncIndex: number, webhookIndex: number, field: keyof Webhook, value: any) => {
    const updated = [...syncConfig];
    const webhooks = [...updated[syncIndex].webhook];
    webhooks[webhookIndex] = { ...webhooks[webhookIndex], [field]: value };
    updated[syncIndex] = { ...updated[syncIndex], webhook: webhooks };
    onChange(updated);
  };

  const addWebhook = (syncIndex: number) => {
    const updated = [...syncConfig];
    updated[syncIndex].webhook.push({
      url: '',
      event: '',
      status: 'Active'
    });
    onChange(updated);
  };

  const removeWebhook = (syncIndex: number, webhookIndex: number) => {
    const updated = [...syncConfig];
    updated[syncIndex].webhook = updated[syncIndex].webhook.filter((_, i) => i !== webhookIndex);
    onChange(updated);
  };

  const addSyncConfig = () => {
    onChange([...syncConfig, {
      entity: 'sale',
      status: 'Active',
      webhook: []
    }]);
  };

  const removeSyncConfig = (index: number) => {
    onChange(syncConfig.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Sync Configuration</h2>
        <button
          onClick={addSyncConfig}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          + Add Entity
        </button>
      </div>

      {syncConfig.map((sync, syncIndex) => (
        <div
          key={syncIndex}
          style={{
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '1.5rem',
            marginBottom: '1rem',
            backgroundColor: '#fafafa'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Entity {syncIndex + 1}</h3>
            <button
              onClick={() => removeSyncConfig(syncIndex)}
              style={{
                padding: '0.25rem 0.75rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Remove
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Entity Type
              </label>
              <select
                value={sync.entity}
                onChange={(e) => updateSyncConfig(syncIndex, 'entity', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="sale">Sale</option>
                <option value="purchase">Purchase</option>
                <option value="inventory">Inventory</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Status
              </label>
              <select
                value={sync.status}
                onChange={(e) => updateSyncConfig(syncIndex, 'status', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: '500' }}>Webhooks</label>
              <button
                onClick={() => addWebhook(syncIndex)}
                style={{
                  padding: '0.25rem 0.75rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                + Add Webhook
              </button>
            </div>

            {sync.webhook.map((webhook, webhookIndex) => (
              <div
                key={webhookIndex}
                style={{
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '1rem',
                  marginBottom: '0.5rem',
                  backgroundColor: 'white'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '0.875rem' }}>Webhook {webhookIndex + 1}</strong>
                  <button
                    onClick={() => removeWebhook(syncIndex, webhookIndex)}
                    style={{
                      padding: '0.125rem 0.5rem',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Remove
                  </button>
                </div>

                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                    URL
                  </label>
                  <input
                    type="text"
                    value={webhook.url}
                    onChange={(e) => updateWebhook(syncIndex, webhookIndex, 'url', e.target.value)}
                    placeholder="https://..."
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                      Event
                    </label>
                    <input
                      type="text"
                      value={webhook.event}
                      onChange={(e) => updateWebhook(syncIndex, webhookIndex, 'event', e.target.value)}
                      placeholder="e.g., Sale/PickAuthorised"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                      Status
                    </label>
                    <select
                      value={webhook.status}
                      onChange={(e) => updateWebhook(syncIndex, webhookIndex, 'status', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {syncConfig.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          color: '#666',
          backgroundColor: '#fafafa',
          borderRadius: '4px',
          border: '1px dashed #ddd'
        }}>
          No sync configurations yet. Click "Add Entity" to create one.
        </div>
      )}
    </div>
  );
}
