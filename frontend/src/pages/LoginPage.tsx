import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, FormLayout, TextField, Button, Banner, Page, Text, BlockStack } from '@shopify/polaris';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const [tenantId, setTenantId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = useCallback(async () => {
    setError('');
    setLoading(true);

    try {
      await login(tenantId, apiKey);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }, [tenantId, apiKey, login, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f4f6f8'
    }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '1rem' }}>
        <BlockStack gap="400">
          <div style={{ textAlign: 'center' }}>
            <Text as="h1" variant="heading2xl">
              Cin7 × Trackstar Integration
            </Text>
            <div style={{ marginTop: '0.5rem' }}>
              <Text as="p" variant="bodyLg" tone="subdued">
                Tenant Login
              </Text>
            </div>
          </div>

          <Card>
            <BlockStack gap="400">
              {error && (
                <Banner
                  title="Login failed"
                  tone="critical"
                  onDismiss={() => setError('')}
                >
                  {error}
                </Banner>
              )}

              <Form onSubmit={handleSubmit}>
                <FormLayout>
                  <TextField
                    label="Tenant ID"
                    value={tenantId}
                    onChange={setTenantId}
                    autoComplete="username"
                    placeholder="e.g., earthbreeze"
                    requiredIndicator
                  />

                  <TextField
                    label="API Key"
                    type="password"
                    value={apiKey}
                    onChange={setApiKey}
                    autoComplete="current-password"
                    placeholder="Your API key"
                    requiredIndicator
                  />

                  <Button
                    variant="primary"
                    submit
                    loading={loading}
                    fullWidth
                  >
                    Login
                  </Button>
                </FormLayout>
              </Form>

              <div style={{ textAlign: 'center' }}>
                <Text as="p" variant="bodySm" tone="subdued">
                  Enter your tenant ID and API key to access your configuration
                </Text>
              </div>
            </BlockStack>
          </Card>
        </BlockStack>
      </div>
    </div>
  );
}
