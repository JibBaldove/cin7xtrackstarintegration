import { useState, useCallback } from 'react';
import { Card, TextField, Button, Banner, BlockStack, InlineStack, Text, Badge, Icon } from '@shopify/polaris';
import { CheckIcon, XIcon } from '@shopify/polaris-icons';

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

  const handleApiKeySave = useCallback(async () => {
    if (!newApiKey.trim()) {
      setApiKeyError('Please enter a valid API key');
      return;
    }

    try {
      setApiKeyError('');
      setApiKeySuccess(false);
      await onApiKeySave(newApiKey);
      setNewApiKey('');
      setApiKeySuccess(true);
      setTimeout(() => setApiKeySuccess(false), 3000);
    } catch (err) {
      setApiKeyError('Failed to update API key. Please try again.');
    }
  }, [newApiKey, onApiKeySave]);

  const addRecipient = useCallback(() => {
    onNotificationRecipientChange([...notificationRecipient, '']);
  }, [notificationRecipient, onNotificationRecipientChange]);

  const updateRecipient = useCallback((index: number, value: string) => {
    const updated = [...notificationRecipient];
    updated[index] = value;
    onNotificationRecipientChange(updated);
  }, [notificationRecipient, onNotificationRecipientChange]);

  const removeRecipient = useCallback((index: number) => {
    onNotificationRecipientChange(notificationRecipient.filter((_, i) => i !== index));
  }, [notificationRecipient, onNotificationRecipientChange]);

  return (
    <BlockStack gap="400">
      {/* API Key Section */}
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">API Key</Text>

          <BlockStack gap="200">
            <InlineStack gap="200" blockAlign="center">
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                Current Status:
              </Text>
              {hasApiKey ? (
                <Badge tone="success" icon={CheckIcon}>API Key Configured</Badge>
              ) : (
                <Badge tone="critical" icon={XIcon}>No API Key Set</Badge>
              )}
            </InlineStack>

            <div style={{
              backgroundColor: 'var(--p-color-bg-surface-secondary)',
              padding: '12px',
              borderRadius: 'var(--p-border-radius-200)',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              overflowX: 'auto'
            }}>
              {apiKey || 'Not set'}
            </div>
          </BlockStack>

          <Card background="bg-surface-secondary">
            <BlockStack gap="400">
              <Text as="h3" variant="headingSm">Update API Key</Text>

              {apiKeySuccess && (
                <Banner
                  title="Success"
                  tone="success"
                  onDismiss={() => setApiKeySuccess(false)}
                >
                  API Key updated successfully!
                </Banner>
              )}

              {apiKeyError && (
                <Banner
                  title="Error"
                  tone="critical"
                  onDismiss={() => setApiKeyError('')}
                >
                  {apiKeyError}
                </Banner>
              )}

              <Text as="p" variant="bodySm" tone="subdued">
                Enter a new API key below. This will replace the current API key.
              </Text>

              <InlineStack gap="200">
                <div style={{ flex: 1 }}>
                  <TextField
                    label=""
                    type="password"
                    value={newApiKey}
                    onChange={(value) => {
                      setNewApiKey(value);
                      setApiKeyError('');
                    }}
                    placeholder="Enter new API key"
                    disabled={savingApiKey}
                    autoComplete="off"
                    monospaced
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={handleApiKeySave}
                  disabled={savingApiKey || !newApiKey.trim()}
                  loading={savingApiKey}
                >
                  Update Key
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </BlockStack>
      </Card>

      {/* Notification Recipients Section */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingMd">Notification Recipients</Text>
            <Button onClick={addRecipient}>Add Email</Button>
          </InlineStack>

          <Text as="p" variant="bodySm" tone="subdued">
            Email addresses that will receive notifications about sync activities and errors
          </Text>

          {notificationRecipient.length > 0 ? (
            <BlockStack gap="200">
              {notificationRecipient.map((email, index) => (
                <InlineStack key={index} gap="200">
                  <div style={{ flex: 1 }}>
                    <TextField
                      label=""
                      type="email"
                      value={email}
                      onChange={(value) => updateRecipient(index, value)}
                      placeholder="email@example.com"
                      autoComplete="off"
                    />
                  </div>
                  <Button
                    tone="critical"
                    onClick={() => removeRecipient(index)}
                  >
                    Remove
                  </Button>
                </InlineStack>
              ))}
            </BlockStack>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              backgroundColor: 'var(--p-color-bg-surface)',
              borderRadius: 'var(--p-border-radius-200)',
              border: '1px dashed var(--p-color-border)'
            }}>
              <Text as="p" variant="bodySm" tone="subdued">
                No notification recipients configured. Click "Add Email" to add one.
              </Text>
            </div>
          )}
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
