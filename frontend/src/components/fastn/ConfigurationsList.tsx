import { useState } from 'react';
import { useConfigurations } from '@fastn-ai/react-core';
import { Card, ResourceList, ResourceItem, Avatar, Badge, Button, SkeletonBodyText, Banner, Modal } from '@shopify/polaris';
import { ConfigurationFormModal } from './ConfigurationFormModal';

export function ConfigurationsList() {
  const { data: configurations, isLoading, error } = useConfigurations({});
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card>
        <SkeletonBodyText lines={5} />
      </Card>
    );
  }

  if (error) {
    return (
      <Banner tone="critical" title="Error loading configurations">
        {error.message}
      </Banner>
    );
  }

  if (!configurations || configurations.length === 0) {
    return (
      <Banner tone="info">
        No configurations yet. Activate a connector from the "Available Connectors" tab to get started.
      </Banner>
    );
  }

  const getStatusTone = (status: string) => {
    switch (status) {
      case 'ENABLED':
        return 'success';
      case 'DISABLED':
        return 'warning';
      case 'PENDING':
        return 'info';
      default:
        return undefined;
    }
  };

  return (
    <>
      <Card>
        <ResourceList
          resourceName={{ singular: 'configuration', plural: 'configurations' }}
          items={configurations}
          renderItem={(config) => {
            const { id, name, description, imageUri, status, actions } = config;
            const media = imageUri ? <Avatar customer source={imageUri} name={name} /> : undefined;

            return (
              <ResourceItem
                id={id}
                media={media}
                accessibilityLabel={`View details for ${name}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3>
                      <span style={{ fontWeight: 600 }}>{name}</span>
                      <span style={{ marginLeft: '0.5rem' }}>
                        <Badge tone={getStatusTone(status)}>{status}</Badge>
                      </span>
                    </h3>
                    <div style={{ marginTop: '0.25rem', color: '#6d7175' }}>{description}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {actions?.map((action) => (
                      <Button
                        key={action.name}
                        onClick={async () => {
                          if (action.onClick) {
                            const result = await action.onClick();
                            // Open form modal for UPDATE action
                            if (action.actionType === 'UPDATE' && result?.status === 'SUCCESS') {
                              setSelectedConfigId(id);
                            }
                          }
                        }}
                        tone={
                          action.actionType === 'ENABLE' ? 'success' :
                          action.actionType === 'DELETE' ? 'critical' :
                          undefined
                        }
                      >
                        {action.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </ResourceItem>
            );
          }}
        />
      </Card>

      {selectedConfigId && (
        <ConfigurationFormModal
          configurationId={selectedConfigId}
          onClose={() => setSelectedConfigId(null)}
        />
      )}
    </>
  );
}
