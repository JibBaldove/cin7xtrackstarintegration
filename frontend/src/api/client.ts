import axios, { type AxiosInstance } from 'axios';
import type { TenantConfigUpdate } from '../types/config';

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

  async updateTenantConfig(config: TenantConfigUpdate) {
    if (!this.tenantId) {
      throw new Error('Tenant ID not set');
    }
    // Wrap entire payload in input object
    const payload = {
      input: {
        updateType: 'config',
        config
      }
    };
    const response = await this.client.post('/cin7_trackstar_config', payload);
    return response.data;
  }

  async updateApiKey(apiKey: string) {
    if (!this.tenantId) {
      throw new Error('Tenant ID not set');
    }
    // Wrap entire payload in input object
    const payload = {
      input: {
        updateType: 'credential',
        config: { apiKey }
      }
    };
    const response = await this.client.post('/cin7_trackstar_config', payload);
    return response.data;
  }

  async getSyncHistory(entity?: string, minDate?: string) {
    if (!this.tenantId) {
      throw new Error('Tenant ID not set');
    }
    const payload: any = {
      input: {}
    };
    if (entity) {
      payload.input.entity = entity;
    }
    if (minDate) {
      payload.input.minDate = minDate;
    }
    const response = await this.client.post('/get_cin7_trackstar_syncHistory', payload);
    return response.data;
  }

  async resyncSale(cin7Id: string, connectionId?: string) {
    if (!this.tenantId) {
      throw new Error('Tenant ID not set');
    }
    const headers: any = {
      'x-fastn-space-connection-id': connectionId || 'default'
    };
    const payload = {
      input: {
        SaleID: cin7Id
      }
    };
    const response = await this.client.post('/sync_cin7_trackstar_salesOrder_v2', payload, { headers });
    return response.data;
  }

  async resyncPurchase(cin7Id: string, connectionId?: string) {
    if (!this.tenantId) {
      throw new Error('Tenant ID not set');
    }
    const headers: any = {
      'x-fastn-space-connection-id': connectionId || 'default'
    };
    const payload = {
      input: {
        TaskID: cin7Id
      }
    };
    const response = await this.client.post('/sync_cin7_trackstar_purchaseOrder', payload, { headers });
    return response.data;
  }

  async resyncTransfer(cin7Id: string, connectionId?: string) {
    if (!this.tenantId) {
      throw new Error('Tenant ID not set');
    }
    const headers: any = {
      'x-fastn-space-connection-id': connectionId || 'default'
    };
    const payload = {
      input: {
        TransferID: cin7Id
      }
    };
    const response = await this.client.post('/sync_cin7_trackstar_transfer', payload, { headers });
    return response.data;
  }
}

export const apiClient = new ApiClient();
