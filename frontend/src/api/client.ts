import axios, { type AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://live.fastn.ai/api/v1';

export class ApiClient {
  private client: AxiosInstance;
  private tenantId: string | null = null;
  private spaceId: string | null = null;
  private apiKey: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        if (this.apiKey) {
          config.headers['x-fastn-api-key'] = this.apiKey;
        }
        if (this.spaceId) {
          config.headers['x-fastn-space-id'] = this.spaceId;
        }
        if (this.tenantId) {
          config.headers['x-fastn-space-tenantid'] = this.tenantId;
        }
        config.headers['stage'] = 'LIVE';
        config.headers['x-fastn-custom-auth'] = 'true';
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.clearAuth();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  setAuth(tenantId: string, apiKey: string, spaceId: string = 'd0f8c7f3-69d3-403c-90a0-17c8857e095f') {
    this.tenantId = tenantId;
    this.apiKey = apiKey;
    this.spaceId = spaceId;
    localStorage.setItem('tenantId', tenantId);
    localStorage.setItem('apiKey', apiKey);
    localStorage.setItem('spaceId', spaceId);
  }

  clearAuth() {
    this.tenantId = null;
    this.spaceId = null;
    this.apiKey = null;
    localStorage.removeItem('tenantId');
    localStorage.removeItem('spaceId');
    localStorage.removeItem('apiKey');
  }

  loadAuth() {
    const tenantId = localStorage.getItem('tenantId');
    const spaceId = localStorage.getItem('spaceId');
    const apiKey = localStorage.getItem('apiKey');
    if (tenantId && apiKey) {
      this.tenantId = tenantId;
      this.spaceId = spaceId || 'd0f8c7f3-69d3-403c-90a0-17c8857e095f';
      this.apiKey = apiKey;
    }
  }

  isAuthenticated() {
    return !!this.tenantId && !!this.apiKey && !!this.spaceId;
  }

  getTenantId() {
    return this.tenantId;
  }

  async getTenantConfig() {
    if (!this.tenantId || !this.spaceId) {
      throw new Error('Tenant ID or Space ID not set');
    }
    const response = await this.client.post('/get_cin7_trackstar_config', {
      input: {
        includeOtherPrices: true
      }
    });
    return response.data;
  }

  async updateTenantConfig(config: any) {
    if (!this.tenantId) {
      throw new Error('Tenant ID not set');
    }
    const response = await this.client.put(`/tenants/${this.tenantId}/config`, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
