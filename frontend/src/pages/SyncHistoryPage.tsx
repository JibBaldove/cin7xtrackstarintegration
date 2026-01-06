import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../api/client';
import type { SyncHistoryRecord, EntityType, SyncStatus } from '../types/syncHistory';
import type { TenantConfig } from '../types/config';

type SortField = 'cin7_key' | 'trackstar_key' | 'connection_id' | 'last_sync_status' | 'last_sync_action' | 'last_pushed_date' | 'created_at';
type SortDirection = 'asc' | 'desc';

export function SyncHistoryPage() {
  const { tenantId } = useAuth();
  const [records, setRecords] = useState<SyncHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<'PUSH' | 'PULL' | 'ALL'>('PUSH');
  const [activeTab, setActiveTab] = useState<SyncStatus | 'All' | 'Ready to Process'>('Ready to Process');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [resyncingRecords, setResyncingRecords] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState('');
  const [sortField, setSortField] = useState<SortField>('last_pushed_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);

  // Filters
  const [selectedEntity, setSelectedEntity] = useState<EntityType | ''>('');
  const [minDate, setMinDate] = useState('');

  // Get active entities from config
  const activeEntities: EntityType[] = useMemo(() => {
    if (!tenantConfig) {
      return [];
    }
    return tenantConfig.syncConfig
      .filter(sync => sync.status === 'Active')
      .map(sync => sync.entity);
  }, [tenantConfig]);

  const statuses: SyncStatus[] = ['Success', 'Failed', 'Skipped', 'Invalid', 'In Queue'];

  useEffect(() => {
    loadTenantConfig();
    loadSyncHistory();
  }, []);

  const loadTenantConfig = async () => {
    try {
      const response = await apiClient.getTenantConfig();
      setTenantConfig(response.config);
    } catch (err: any) {
      console.error('Failed to load tenant config:', err);
      // Don't show error to user, just log it
    }
  };

  const loadSyncHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.getSyncHistory(
        selectedEntity || undefined,
        minDate || undefined
      );
      setRecords(response || []);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load sync history');
    } finally {
      setLoading(false);
    }
  };

  // Normalize last_sync_action: treat null, empty, or "null" as PUSH
  const normalizedRecords = useMemo(() => {
    return records.map(record => {
      const action = record.last_sync_action as any; // Cast to any to handle string 'null' values
      const normalizedAction = (!action || action === 'null' || action.trim() === '')
        ? 'PUSH' as const
        : record.last_sync_action;
      return {
        ...record,
        last_sync_action: normalizedAction
      };
    });
  }, [records]);

  // Organize records into parent-child structure
  const organizedRecords = useMemo(() => {
    // Records without parent_reference_key or with 'null' string are considered parents
    const parentRecords = normalizedRecords.filter(r => !r.parent_reference_key || r.parent_reference_key === 'null');

    // Records with parent_reference_key are potential children
    const potentialChildRecords = normalizedRecords.filter(r => r.parent_reference_key && r.parent_reference_key !== 'null');

    // Find which potential children actually have their parents in the result set
    const parentReferenceKeys = new Set(parentRecords.map(p => p.reference_key));
    const actualChildRecords = potentialChildRecords.filter(c =>
      c.parent_reference_key && parentReferenceKeys.has(c.parent_reference_key)
    );

    // Orphaned children (parent not in result set) should be displayed as regular records
    const orphanedChildren = potentialChildRecords.filter(c =>
      c.parent_reference_key && !parentReferenceKeys.has(c.parent_reference_key)
    );

    // Map parent records with their children
    const parentsWithChildren = parentRecords.map(parent => {
      const children = actualChildRecords.filter(child => child.parent_reference_key === parent.reference_key);
      const hasChildren = children.length > 0;

      return {
        ...parent,
        children,
        displayStatus: hasChildren ? 'Redirected' as SyncStatus : parent.last_sync_status
      };
    });

    // Add orphaned children as standalone records (no children, show original status)
    const orphanedAsStandalone = orphanedChildren.map(orphan => ({
      ...orphan,
      children: [],
      displayStatus: orphan.last_sync_status
    }));

    // Combine parent records and orphaned children
    return [...parentsWithChildren, ...orphanedAsStandalone];
  }, [normalizedRecords]);

  // Filter and search records
  const filteredRecords = useMemo(() => {
    let filtered = organizedRecords;

    // Filter by action (PUSH/PULL)
    if (actionFilter !== 'ALL') {
      filtered = filtered.filter(r => r.last_sync_action === actionFilter);
    }

    // Filter by status tab
    if (activeTab === 'Ready to Process') {
      // Ready to Process includes Failed and In Queue statuses
      filtered = filtered.filter(r => r.displayStatus === 'Failed' || r.displayStatus === 'In Queue');
    } else if (activeTab !== 'All') {
      filtered = filtered.filter(r => r.displayStatus === activeTab);
    }

    // Search across multiple fields
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.cin7_key?.toLowerCase().includes(term) ||
        r.trackstar_key?.toLowerCase().includes(term) ||
        r.cin7_id?.toLowerCase().includes(term) ||
        r.trackstar_id?.toLowerCase().includes(term) ||
        r.last_sync_message?.toLowerCase().includes(term) ||
        r.connection_id?.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // For dates, convert to timestamps
      if (sortField === 'last_pushed_date' || sortField === 'created_at') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }

      // Compare values
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [organizedRecords, actionFilter, activeTab, searchTerm, sortField, sortDirection]);

  // Count records by status (filtered by action)
  const statusCounts = useMemo(() => {
    // Filter by action first
    const actionFiltered = actionFilter === 'ALL'
      ? organizedRecords
      : organizedRecords.filter(r => r.last_sync_action === actionFilter);

    const counts: Record<string, number> = { All: actionFiltered.length };
    statuses.forEach(status => {
      counts[status] = actionFiltered.filter(r => r.displayStatus === status).length;
    });
    counts.Redirected = actionFiltered.filter(r => r.displayStatus === 'Redirected').length;
    // Ready to Process includes Failed and In Queue
    counts['Ready to Process'] = actionFiltered.filter(r =>
      r.displayStatus === 'Failed' || r.displayStatus === 'In Queue'
    ).length;
    return counts;
  }, [organizedRecords, actionFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending for dates, ascending for others
      setSortField(field);
      setSortDirection(field === 'last_pushed_date' || field === 'created_at' ? 'desc' : 'asc');
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        style={{
          padding: '0.75rem',
          textAlign: 'left',
          fontWeight: '600',
          cursor: 'pointer',
          userSelect: 'none',
          backgroundColor: isActive ? '#e7f3ff' : 'transparent',
          transition: 'background-color 0.2s'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {children}
          {isActive && (
            <span style={{ fontSize: '0.75rem' }}>
              {sortDirection === 'asc' ? '▲' : '▼'}
            </span>
          )}
        </div>
      </th>
    );
  };

  const toggleRowExpansion = (recordId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(recordId)) {
      newExpanded.delete(recordId);
    } else {
      newExpanded.add(recordId);
    }
    setExpandedRows(newExpanded);
  };

  const handleResync = async (record: SyncHistoryRecord) => {
    // Add record to resyncing set
    setResyncingRecords(prev => new Set(prev).add(record.record_id));
    setError('');
    setSuccessMessage('');

    try {
      const connectionId = record.connection_id || 'default';
      const isPull = record.last_sync_action === 'PULL';

      if (isPull) {
        // For PULL actions, use trackstar_id
        if (!record.trackstar_id || record.trackstar_id === 'null') {
          throw new Error('No Trackstar ID available for PULL action');
        }

        switch (record.type) {
          case 'sale':
            await apiClient.resyncSalePull(record.trackstar_id, connectionId);
            break;
          case 'purchase':
            await apiClient.resyncPurchasePull(record.trackstar_id, connectionId);
            break;
          case 'transfer':
            await apiClient.resyncTransferPull(record.trackstar_id, connectionId);
            break;
          default:
            throw new Error(`PULL resync not implemented for type: ${record.type}`);
        }

        setSuccessMessage(`Successfully triggered PULL resync for ${record.trackstar_key || record.trackstar_id}`);
      } else {
        // For PUSH actions, use cin7_id
        // Extract the base cin7_id (without any suffixes like :from, :to, :TO, :FROM)
        // For sales: extract substring before colon if present
        // For transfers: might have :from, :to, :FROM, :TO suffixes
        let baseCin7Id = record.cin7_id;

        // For sales and transfers, remove any suffix after colon
        if (record.type === 'sale' || record.type === 'transfer') {
          baseCin7Id = record.cin7_id.split(':')[0];
        }

        switch (record.type) {
          case 'sale':
            await apiClient.resyncSale(baseCin7Id, connectionId);
            break;
          case 'purchase':
            await apiClient.resyncPurchase(baseCin7Id, connectionId);
            break;
          case 'transfer':
            await apiClient.resyncTransfer(baseCin7Id, connectionId);
            break;
          default:
            throw new Error(`PUSH resync not implemented for type: ${record.type}`);
        }

        setSuccessMessage(`Successfully triggered PUSH resync for ${record.cin7_key}`);
      }

      // Reload records after successful resync
      setTimeout(() => {
        loadSyncHistory();
        setSuccessMessage('');
      }, 2000);

    } catch (err: any) {
      console.error('Resync error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to resync record';
      const displayKey = record.last_sync_action === 'PULL'
        ? (record.trackstar_key || record.trackstar_id)
        : record.cin7_key;
      setError(`Failed to resync ${displayKey}: ${errorMessage}`);
    } finally {
      // Remove record from resyncing set
      setResyncingRecords(prev => {
        const newSet = new Set(prev);
        newSet.delete(record.record_id);
        return newSet;
      });
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  const getStatusColor = (status: SyncStatus | string) => {
    switch (status) {
      case 'Success': return '#28a745';
      case 'Failed': return '#dc3545';
      case 'Skipped': return '#ffc107';
      case 'Invalid': return '#6c757d';
      case 'Redirected': return '#17a2b8';
      case 'In Queue': return '#007bff';
      default: return '#6c757d';
    }
  };

  const copyToClipboard = async (text: string, recordId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(recordId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const truncateId = (id: string, chars: number = 8) => {
    if (!id || id.length <= chars) return id;
    return '...' + id.slice(-chars);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem 0' }}>Sync History</h1>
        <p style={{ margin: 0, color: '#666' }}>View and manage synchronization records for {tenantId}</p>
      </div>

      {/* Action Filter Tabs (PUSH/PULL/ALL) */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        borderBottom: '3px solid #e0e0e0',
        paddingBottom: '0'
      }}>
        {(['PUSH', 'PULL', 'ALL'] as const).map(action => {
          const actionCounts = action === 'ALL'
            ? organizedRecords.length
            : organizedRecords.filter(r => r.last_sync_action === action).length;

          return (
            <button
              key={action}
              onClick={() => setActionFilter(action)}
              style={{
                padding: '1rem 2rem',
                backgroundColor: actionFilter === action ? '#007bff' : 'transparent',
                color: actionFilter === action ? 'white' : '#666',
                border: 'none',
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px',
                cursor: 'pointer',
                fontWeight: actionFilter === action ? '600' : '500',
                fontSize: '1rem',
                transition: 'all 0.2s',
                borderBottom: actionFilter === action ? 'none' : '3px solid transparent',
                position: 'relative',
                bottom: '-3px'
              }}
            >
              {action === 'PUSH' ? 'Cin7 → Trackstar (PUSH)' : action === 'PULL' ? 'Trackstar → Cin7 (PULL)' : 'All Records'} ({actionCounts})
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
              Entity Type
            </label>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value as EntityType | '')}
              disabled={activeEntities.length === 0}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.875rem',
                cursor: activeEntities.length === 0 ? 'not-allowed' : 'pointer',
                opacity: activeEntities.length === 0 ? 0.6 : 1
              }}
            >
              <option value="">All Active Entities</option>
              {activeEntities.map(entity => (
                <option key={entity} value={entity}>
                  {entity.charAt(0).toUpperCase() + entity.slice(1)}
                </option>
              ))}
            </select>
            {activeEntities.length === 0 && tenantConfig && (
              <div style={{ fontSize: '0.75rem', color: '#dc3545', marginTop: '0.25rem' }}>
                No active entities in config
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
              Minimum Date
            </label>
            <input
              type="date"
              value={minDate}
              onChange={(e) => setMinDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
              Search
            </label>
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <button
            onClick={loadSyncHistory}
            disabled={loading}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              fontSize: '0.875rem',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Loading...' : 'Load Records'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          color: '#721c24',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {successMessage && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          color: '#155724',
          marginBottom: '1rem'
        }}>
          {successMessage}
        </div>
      )}

      {/* Status Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1rem',
        borderBottom: '2px solid #ddd',
        flexWrap: 'wrap'
      }}>
        {['Ready to Process', 'All', ...statuses, 'Redirected'].map(status => (
          <button
            key={status}
            onClick={() => setActiveTab(status as SyncStatus | 'All' | 'Ready to Process')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === status ? 'white' : 'transparent',
              color: activeTab === status ? '#007bff' : '#666',
              border: 'none',
              borderBottom: activeTab === status ? '3px solid #007bff' : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === status ? '600' : '400',
              fontSize: '0.875rem',
              transition: 'all 0.2s'
            }}
          >
            {status} ({statusCounts[status] || 0})
          </button>
        ))}
      </div>

      {/* Records Table */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        overflow: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', width: '30px' }}></th>
              <SortableHeader field="cin7_key">Cin7 Key</SortableHeader>
              <SortableHeader field="trackstar_key">Trackstar Key</SortableHeader>
              <SortableHeader field="connection_id">Connection</SortableHeader>
              <SortableHeader field="last_sync_status">Status</SortableHeader>
              <SortableHeader field="last_sync_action">Action</SortableHeader>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Message</th>
              <SortableHeader field="last_pushed_date">
                {actionFilter === 'PULL' ? 'Last Pulled' : 'Last Pushed'}
              </SortableHeader>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                  {loading ? 'Loading records...' : 'No records found'}
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => (
                <>
                  {/* Parent Row */}
                  <tr key={record.record_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.75rem' }}>
                      {record.children.length > 0 && (
                        <button
                          onClick={() => toggleRowExpansion(record.record_id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            padding: '0.25rem'
                          }}
                        >
                          {expandedRows.has(record.record_id) ? '▼' : '▶'}
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: '500' }}>{record.cin7_key}</div>
                          <div
                            style={{ fontSize: '0.75rem', color: '#999', fontFamily: 'monospace', cursor: 'help' }}
                            title={record.cin7_id}
                          >
                            {truncateId(record.cin7_id)}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(record.cin7_id, record.record_id);
                          }}
                          title="Copy Cin7 ID to clipboard"
                          style={{
                            background: 'none',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            padding: '0.25rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: copiedId === record.record_id ? '#28a745' : '#666',
                            transition: 'all 0.2s',
                            fontSize: '0.875rem',
                            flexShrink: 0
                          }}
                        >
                          {copiedId === record.record_id ? '✓' : '📋'}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {record.trackstar_id && record.trackstar_id !== 'null' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div>{record.trackstar_key || '-'}</div>
                            <div
                              style={{ fontSize: '0.75rem', color: '#999', fontFamily: 'monospace', cursor: 'help' }}
                              title={record.trackstar_id}
                            >
                              {truncateId(record.trackstar_id)}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(record.trackstar_id!, `trackstar-${record.record_id}`);
                            }}
                            title="Copy Trackstar ID to clipboard"
                            style={{
                              background: 'none',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              padding: '0.25rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: copiedId === `trackstar-${record.record_id}` ? '#28a745' : '#666',
                              transition: 'all 0.2s',
                              fontSize: '0.875rem',
                              flexShrink: 0
                            }}
                          >
                            {copiedId === `trackstar-${record.record_id}` ? '✓' : '📋'}
                          </button>
                        </div>
                      ) : (
                        <div>{record.trackstar_key || '-'}</div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{record.connection_id || '-'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        backgroundColor: getStatusColor(record.displayStatus) + '20',
                        color: getStatusColor(record.displayStatus),
                        fontWeight: '500',
                        fontSize: '0.75rem'
                      }}>
                        {record.displayStatus}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>{record.last_sync_action}</td>
                    <td style={{ padding: '0.75rem', maxWidth: '300px' }}>
                      <div style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }} title={record.last_sync_message}>
                        {record.last_sync_message}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                      {formatDate(record.last_pushed_date)}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <button
                        onClick={() => handleResync(record)}
                        disabled={resyncingRecords.has(record.record_id)}
                        style={{
                          padding: '0.375rem 0.75rem',
                          backgroundColor: resyncingRecords.has(record.record_id) ? '#6c757d' : '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: resyncingRecords.has(record.record_id) ? 'not-allowed' : 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          opacity: resyncingRecords.has(record.record_id) ? 0.6 : 1
                        }}
                      >
                        {resyncingRecords.has(record.record_id) ? 'Resyncing...' : 'Resync'}
                      </button>
                    </td>
                  </tr>

                  {/* Child Rows */}
                  {expandedRows.has(record.record_id) && record.children.map((child) => (
                    <tr key={child.record_id} style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.75rem', paddingLeft: '2rem' }}></td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: '500' }}>{child.cin7_key}</div>
                            <div
                              style={{ fontSize: '0.75rem', color: '#999', fontFamily: 'monospace', cursor: 'help' }}
                              title={child.cin7_id}
                            >
                              {truncateId(child.cin7_id)}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(child.cin7_id, child.record_id);
                            }}
                            title="Copy Cin7 ID to clipboard"
                            style={{
                              background: 'none',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              padding: '0.25rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: copiedId === child.record_id ? '#28a745' : '#666',
                              transition: 'all 0.2s',
                              fontSize: '0.875rem',
                              flexShrink: 0
                            }}
                          >
                            {copiedId === child.record_id ? '✓' : '📋'}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {child.trackstar_id && child.trackstar_id !== 'null' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div>{child.trackstar_key || '-'}</div>
                              <div
                                style={{ fontSize: '0.75rem', color: '#999', fontFamily: 'monospace', cursor: 'help' }}
                                title={child.trackstar_id}
                              >
                                {truncateId(child.trackstar_id)}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(child.trackstar_id!, `trackstar-${child.record_id}`);
                              }}
                              title="Copy Trackstar ID to clipboard"
                              style={{
                                background: 'none',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                padding: '0.25rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: copiedId === `trackstar-${child.record_id}` ? '#28a745' : '#666',
                                transition: 'all 0.2s',
                                fontSize: '0.875rem',
                                flexShrink: 0
                              }}
                            >
                              {copiedId === `trackstar-${child.record_id}` ? '✓' : '📋'}
                            </button>
                          </div>
                        ) : (
                          <div>{child.trackstar_key || '-'}</div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>{child.connection_id || '-'}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          backgroundColor: getStatusColor(child.last_sync_status) + '20',
                          color: getStatusColor(child.last_sync_status),
                          fontWeight: '500',
                          fontSize: '0.75rem'
                        }}>
                          {child.last_sync_status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>{child.last_sync_action}</td>
                      <td style={{ padding: '0.75rem', maxWidth: '300px' }}>
                        <div style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }} title={child.last_sync_message}>
                          {child.last_sync_message}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                        {formatDate(child.last_pushed_date)}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <button
                          onClick={() => handleResync(child)}
                          disabled={resyncingRecords.has(child.record_id)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            backgroundColor: resyncingRecords.has(child.record_id) ? '#6c757d' : '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: resyncingRecords.has(child.record_id) ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            opacity: resyncingRecords.has(child.record_id) ? 0.6 : 1
                          }}
                        >
                          {resyncingRecords.has(child.record_id) ? 'Resyncing...' : 'Resync'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1rem', color: '#666', fontSize: '0.875rem' }}>
        Showing {filteredRecords.length} of {organizedRecords.length} records
      </div>
    </div>
  );
}
