import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiClient } from '../api/client';

interface AuthContextType {
  isAuthenticated: boolean;
  tenantId: string | null;
  login: (tenantId: string, apiKey: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.loadAuth();
    if (apiClient.isAuthenticated()) {
      setIsAuthenticated(true);
      setTenantId(apiClient.getTenantId());
    }
    setLoading(false);
  }, []);

  const login = async (tenantId: string, apiKey: string) => {
    apiClient.setAuth(tenantId, apiKey);

    try {
      await apiClient.getTenantConfig();
      setIsAuthenticated(true);
      setTenantId(tenantId);
    } catch (error) {
      apiClient.clearAuth();
      throw new Error('Invalid tenant ID or API key');
    }
  };

  const logout = () => {
    apiClient.clearAuth();
    setIsAuthenticated(false);
    setTenantId(null);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, tenantId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
