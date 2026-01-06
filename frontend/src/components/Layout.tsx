import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { TenantSwitcher } from './TenantSwitcher';

interface Props {
  children: React.ReactNode;
}

export function Layout({ children }: Props) {
  const { logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #ddd',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#007bff' }}>
            Cin7 × Trackstar
          </h1>
          <nav style={{ display: 'flex', gap: '1rem' }}>
            <Link
              to="/dashboard"
              style={{
                padding: '0.5rem 1rem',
                textDecoration: 'none',
                color: isActive('/dashboard') ? '#007bff' : '#666',
                fontWeight: isActive('/dashboard') ? '600' : '400',
                borderBottom: isActive('/dashboard') ? '3px solid #007bff' : '3px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              Configuration
            </Link>
            <Link
              to="/sync-history"
              style={{
                padding: '0.5rem 1rem',
                textDecoration: 'none',
                color: isActive('/sync-history') ? '#007bff' : '#666',
                fontWeight: isActive('/sync-history') ? '600' : '400',
                borderBottom: isActive('/sync-history') ? '3px solid #007bff' : '3px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              Sync History
            </Link>
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <TenantSwitcher />
          <button
            onClick={logout}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main>
        {children}
      </main>
    </div>
  );
}
