import { useState, useCallback } from 'react';
import { Page, Tabs } from '@shopify/polaris';
import { ConnectorsList } from '../components/fastn/ConnectorsList';
import { ConfigurationsList } from '../components/fastn/ConfigurationsList';
import { FastnProviderWrapper } from '../contexts/FastnContext';

export function MyTenantPage() {
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = useCallback((selectedTabIndex: number) => {
    setSelectedTab(selectedTabIndex);
  }, []);

  const tabs = [
    {
      id: 'connectors',
      content: 'Available Connectors',
      panelID: 'connectors-panel',
    },
    {
      id: 'configurations',
      content: 'My Configurations',
      panelID: 'configurations-panel',
    },
  ];

  return (
    <FastnProviderWrapper>
      <Page title="API Connectors">
        <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
          {selectedTab === 0 && <ConnectorsList />}
          {selectedTab === 1 && <ConfigurationsList />}
        </Tabs>
      </Page>
    </FastnProviderWrapper>
  );
}
