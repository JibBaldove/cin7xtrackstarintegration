import { useConnectors } from '@fastn-ai/react-core';
import { Card, ResourceList, ResourceItem, Avatar, Badge, Button, SkeletonBodyText, Banner } from '@shopify/polaris';

export function ConnectorsList() {
  const { data: connectors, isLoading, error } = useConnectors();

  if (isLoading) {
    return (
      <Card>
        <SkeletonBodyText lines={5} />
      </Card>
    );
  }

  if (error) {
    return (
      <Banner tone="critical" title="Error loading connectors">
        {error.message}
      </Banner>
    );
  }

  if (!connectors || connectors.length === 0) {
    return (
      <Banner tone="info">
        No connectors available.
      </Banner>
    );
  }

  return (
    <Card>
      <ResourceList
        resourceName={{ singular: 'connector', plural: 'connectors' }}
        items={connectors}
        renderItem={(connector) => {
          const { id, name, description, imageUri, status, actions } = connector;
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
                    {status === 'ACTIVE' && (
                      <span style={{ marginLeft: '0.5rem' }}>
                        <Badge tone="success">Active</Badge>
                      </span>
                    )}
                  </h3>
                  <div style={{ marginTop: '0.25rem', color: '#6d7175' }}>{description}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {actions?.map((action) => (
                    <Button
                      key={action.name}
                      onClick={async () => {
                        if (action.onClick) {
                          await action.onClick();
                        }
                      }}
                      tone={action.actionType === 'ACTIVATION' ? 'success' : undefined}
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
  );
}
