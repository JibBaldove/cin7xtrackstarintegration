// Webhook configuration
export interface Webhook {
  url: string;
  event: string;
  status: 'Active' | 'Inactive';
}

// Schedule configuration
export interface Schedule {
  status: 'Active' | 'Inactive';
  interval: string; // in hours
  prepareScheduleId?: string;
  processScheduleId?: string;
}

// Entity schedules for connection-based scheduling
export interface EntitySchedules {
  sale?: Schedule;
  purchase?: Schedule;
  inventory?: Schedule;
  transfer?: Schedule;
  product?: Schedule;
  notification?: Schedule;
}

// Connection schedules (top-level)
export interface ConnectionSchedules {
  [connectionId: string]: EntitySchedules;
}

// Sync configuration for different entities
export interface SyncConfig {
  entity: 'sale' | 'purchase' | 'inventory' | 'transfer' | 'product';
  status: 'Active' | 'Inactive';
  webhook?: Webhook[];
  schedule?: Schedule;
  // Inventory-specific fields
  quantityType?: 'onhand' | 'sellable' | 'fulfillable';
  locationScope?: 'mapped' | 'all';
  autoAcceptThreshold?: number;
  // Sale-specific fields
  allowCompletedOrders?: boolean;
}

// Warehouse mapping (ID-based)
export interface WarehouseMapping {
  cin7WarehouseId: string;
  cin7WarehouseName?: string;
  trackstarLocationId: string;
}

// Substitution mapping
export interface SubstitutionMapping {
  [key: string]: string;
}

// Substitution list
export interface SubstitutionList {
  mapping: SubstitutionMapping;
  listName: string;
}

// Location mapping configuration
export interface LocationMapping {
  warehouses: WarehouseMapping[];
  connectionId: string;
  substitutionList?: SubstitutionList[];
  default3PLShippingMethod?: string;
}

// Options for dropdowns
export interface Cin7Warehouse {
  id: string;
  name: string;
}

export interface TrackstarLocation {
  id: string;
  name: string;
}

export interface Connection {
  id: string;
  name: string;
  locations: TrackstarLocation[];
}

export interface ConfigOptions {
  cin7Warehouses: Cin7Warehouse[];
  connections: Connection[];
}

// Complete tenant configuration
export interface TenantConfig {
  tenantId: string;
  apiKey: string;
  hasApiKey: boolean;
  syncConfig: SyncConfig[];
  locationMapping: LocationMapping[];
  notificationRecipient: string[];
  connectionSchedules?: ConnectionSchedules;
}

// Config update payload (excludes API key)
export interface TenantConfigUpdate {
  syncConfig: SyncConfig[];
  locationMapping: LocationMapping[];
  notificationRecipient: string[];
  connectionSchedules?: ConnectionSchedules;
}

// API key update payload
export interface ApiKeyUpdate {
  apiKey: string;
}

// API response wrapper
export interface TenantConfigResponse {
  config: TenantConfig;
  options?: ConfigOptions;
}
