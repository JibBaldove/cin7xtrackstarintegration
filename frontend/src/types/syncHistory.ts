// Sync History Types

export type SyncStatus = 'Success' | 'Failed' | 'Skipped' | 'Invalid' | 'Redirected' | 'In Queue';
export type SyncAction = 'PUSH' | 'PULL';
export type EntityType = 'sale' | 'purchase' | 'transfer' | 'inventory' | 'product';

export interface SyncHistoryRecord {
  record_id: string;
  type: EntityType;
  cin7_key: string;
  cin7_id: string;
  trackstar_key: string | null;
  trackstar_id: string | null;
  connection_id: string;
  last_sync_status: SyncStatus;
  last_sync_action: SyncAction;
  last_sync_message: string;
  parent_reference_key: string | null;
  reference_key: string;
  created_at: string;
  last_pushed_date: string | null;
  last_pulled_date: string | null;
}

export interface SyncHistoryFilters {
  entity?: EntityType;
  minDate?: string;
}

export interface SyncHistoryResponse {
  records: SyncHistoryRecord[];
}
