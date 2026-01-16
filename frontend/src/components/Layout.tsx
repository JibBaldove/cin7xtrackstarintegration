import { useState, useCallback } from 'react';
import { Frame, TopBar, Navigation } from '@shopify/polaris';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { TenantSwitcher } from './TenantSwitcher';

interface Props {
  children: React.ReactNode;
}

export function Layout({ children }: Props) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false);

  const toggleMobileNavigationActive = useCallback(
    () => setMobileNavigationActive((active) => !active),
    []
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const logo = {
    width: 124,
    topBarSource: undefined,
    contextualSaveBarSource: undefined,
    url: '#',
    accessibilityLabel: 'Cin7 × Trackstar',
  };

  const topBarMarkup = (
    <TopBar
      showNavigationToggle
      onNavigationToggle={toggleMobileNavigationActive}
      secondaryMenu={
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <TenantSwitcher />
          <TopBar.Menu
            activatorContent="Logout"
            open={false}
            onOpen={() => {}}
            onClose={() => {}}
            actions={[
              {
                items: [{ content: 'Logout', onAction: handleLogout }],
              },
            ]}
          />
        </div>
      }
    />
  );

  const navigationMarkup = (
    <Navigation location={location.pathname}>
      <Navigation.Section
        items={[
          {
            url: '/dashboard',
            label: 'Configuration',
            selected: location.pathname === '/dashboard',
            onClick: () => navigate('/dashboard'),
          },
          {
            url: '/sync-history',
            label: 'Sync History',
            selected: location.pathname === '/sync-history',
            onClick: () => navigate('/sync-history'),
          },
        ]}
      />
    </Navigation>
  );

  return (
    <Frame
      logo={logo}
      topBar={topBarMarkup}
      navigation={navigationMarkup}
      showMobileNavigation={mobileNavigationActive}
      onNavigationDismiss={toggleMobileNavigationActive}
    >
      {children}
    </Frame>
  );
}
