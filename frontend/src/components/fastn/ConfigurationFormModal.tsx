import { useState, useEffect } from 'react';
import { useConfigurationForm } from '@fastn-ai/react-core';
import { Modal, FormLayout, Banner, Button, SkeletonBodyText } from '@shopify/polaris';
import { FormField } from './FormField';

interface ConfigurationFormModalProps {
  configurationId: string;
  onClose: () => void;
}

export function ConfigurationFormModal({ configurationId, onClose }: ConfigurationFormModalProps) {
  const { data: configurationForm, isLoading, error } = useConfigurationForm({ configurationId });
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize form with existing values
  useEffect(() => {
    if (configurationForm?.fields) {
      const initialData: Record<string, any> = {};
      configurationForm.fields.forEach((field) => {
        if (field.initialValue !== undefined) {
          initialData[field.key] = field.initialValue;
        }
      });
      setFormData(initialData);
    }
  }, [configurationForm]);

  const handleSubmit = async () => {
    if (!configurationForm?.submitHandler) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await configurationForm.submitHandler(formData);
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to save configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (fieldKey: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldKey]: value }));
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={configurationForm?.name || 'Configure Integration'}
      primaryAction={{
        content: isSubmitting ? 'Saving...' : 'Save Configuration',
        onAction: handleSubmit,
        loading: isSubmitting,
        disabled: isSubmitting || isLoading,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        {isLoading && <SkeletonBodyText lines={5} />}

        {error && (
          <Banner tone="critical" title="Error loading form">
            {error.message}
          </Banner>
        )}

        {submitError && (
          <div style={{ marginBottom: '1rem' }}>
            <Banner tone="critical" title="Error saving configuration">
              {submitError}
            </Banner>
          </div>
        )}

        {configurationForm && (
          <FormLayout>
            {configurationForm.description && (
              <p style={{ marginBottom: '1rem', color: '#6d7175' }}>
                {configurationForm.description}
              </p>
            )}

            {configurationForm.fields
              .filter((field) => !field.hidden)
              .map((field) => (
                <FormField
                  key={field.key}
                  field={field}
                  value={formData[field.key]}
                  onChange={(value) => handleFieldChange(field.key, value)}
                  context={formData}
                />
              ))}
          </FormLayout>
        )}
      </Modal.Section>
    </Modal>
  );
}
