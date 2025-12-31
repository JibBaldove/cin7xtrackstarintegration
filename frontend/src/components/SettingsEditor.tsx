import { useState } from 'react';

interface Props {
  apiKey: string;
  hasApiKey: boolean;
  notificationRecipient: string[];
  onNotificationRecipientChange: (recipients: string[]) => void;
  onApiKeySave: (apiKey: string) => Promise<void>;
  savingApiKey: boolean;
}

export function SettingsEditor({
  apiKey,
  hasApiKey,
  notificationRecipient,
  onNotificationRecipientChange,
  onApiKeySave,
  savingApiKey
}: Props) {
  const [newApiKey, setNewApiKey] = useState('');
  const [apiKeyError, setApiKeyError] = useState('');
  const [apiKeySuccess, setApiKeySuccess] = useState(false);

  const handleApiKeySave = async () => {
    // Validate API key is not empty
    if (!newApiKey.trim()) {
      setApiKeyError('Please enter a valid API key');
      return;
    }

    try {
      setApiKeyError('');
      setApiKeySuccess(false);
      await onApiKeySave(newApiKey);
      // Clear input and show success
      setNewApiKey('');
      setApiKeySuccess(true);
      setTimeout(() => setApiKeySuccess(false), 3000);
    } catch (err) {
      setApiKeyError('Failed to update API key. Please try again.');
    }
  };

  const addRecipient = () => {
    onNotificationRecipientChange([...notificationRecipient, '']);
  };

  const updateRecipient = (index: number, value: string) => {
    const updated = [...notificationRecipient];
    updated[index] = value;
    onNotificationRecipientChange(updated);
  };

  const removeRecipient = (index: number) => {
    onNotificationRecipientChange(notificationRecipient.filter((_, i) => i !== index));
  };

  return (
    <div>
      {/* API Key Section */}
      <div style={{
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        backgroundColor: '#fafafa'
      }}>
        <h2 style={{ margin: '0 0 1rem 0' }}>API Key</h2>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <label style={{ fontWeight: '500' }}>Current Status:</label>
            {hasApiKey ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                color: '#28a745',
                fontSize: '0.875rem'
              }}>
                <span style={{ fontSize: '1rem' }}>✓</span> API Key Configured
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                color: '#dc3545',
                fontSize: '0.875rem'
              }}>
                <span style={{ fontSize: '1rem' }}>✗</span> No API Key Set
              </span>
            )}
          </div>

          <div style={{
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '0.75rem',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            color: '#666',
            overflowX: 'auto'
          }}>
            {apiKey || 'Not set'}
          </div>
        </div>

        <div style={{
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '1rem',
          backgroundColor: 'white'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Update API Key</h3>

          {apiKeySuccess && (
            <div style={{
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '4px',
              padding: '0.75rem',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: '#155724'
            }}>
              <strong>✓ Success:</strong> API Key updated successfully!
            </div>
          )}

          {apiKeyError && (
            <div style={{
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              padding: '0.75rem',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: '#721c24'
            }}>
              <strong>✗ Error:</strong> {apiKeyError}
            </div>
          )}

          <p style={{
            fontSize: '0.875rem',
            color: '#666',
            margin: '0 0 0.5rem 0'
          }}>
            Enter a new API key below. This will replace the current API key.
          </p>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="password"
              value={newApiKey}
              onChange={(e) => {
                setNewApiKey(e.target.value);
                setApiKeyError('');
              }}
              placeholder="Enter new API key"
              disabled={savingApiKey}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
            />
            <button
              onClick={handleApiKeySave}
              disabled={savingApiKey || !newApiKey.trim()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: savingApiKey || !newApiKey.trim() ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: savingApiKey || !newApiKey.trim() ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                whiteSpace: 'nowrap'
              }}
            >
              {savingApiKey ? 'Updating...' : 'Update Key'}
            </button>
          </div>
        </div>
      </div>

      {/* Notification Recipients Section */}
      <div style={{
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '1.5rem',
        backgroundColor: '#fafafa'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h2 style={{ margin: 0 }}>Notification Recipients</h2>
          <button
            onClick={addRecipient}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            + Add Email
          </button>
        </div>

        <p style={{
          fontSize: '0.875rem',
          color: '#666',
          margin: '0 0 1rem 0'
        }}>
          Email addresses that will receive notifications about sync activities and errors
        </p>

        {notificationRecipient.map((email, index) => (
          <div
            key={index}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => updateRecipient(index, e.target.value)}
              placeholder="email@example.com"
              style={{
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            />
            <button
              onClick={() => removeRecipient(index)}
              style={{
                padding: '0.5rem 1rem',
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
        ))}

        {notificationRecipient.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#666',
            backgroundColor: 'white',
            borderRadius: '4px',
            border: '1px dashed #ddd',
            fontSize: '0.875rem'
          }}>
            No notification recipients configured. Click "Add Email" to add one.
          </div>
        )}
      </div>
    </div>
  );
}
