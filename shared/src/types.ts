export interface Webhook {
  url: string;
  event: string;
  status: 'Active' | 'Inactive';
}

export interface SyncConfig {
  entity: 'sale' | 'purchase' | 'inventory';
  status: 'Active' | 'Inactive';
  webhook: Webhook[];
}

export interface SubstitutionMapping {
  [key: string]: string;
}

export interface SubstitutionList {
  mapping: SubstitutionMapping;
  listName: string;
}

export interface WarehouseMapping {
  cin7WarehouseId: string;
  cin7WarehouseName?: string;
  trackstarLocationId: string;
}

export interface LocationMapping {
  warehouses: WarehouseMapping[];
  connectionId: string;
  substitutionList?: SubstitutionList[];
}

export interface TenantConfig {
  apiKey: string;
  syncConfig: SyncConfig[];
  locationMapping: LocationMapping[];
}

export interface TenantInfo {
  tenantId: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TenantWithConfig extends TenantInfo {
  config: TenantConfig;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
