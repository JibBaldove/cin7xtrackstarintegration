import { useState, useEffect, useMemo } from 'react';
import { Page, Banner, Card, Tabs, Select, TextField, Button, BlockStack, InlineStack, Badge, Text } from '@shopify/polaris';
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
  const [selectedEntity, setSelectedEntity] = useState<EntityType | ''>('sale');
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

  // Auto-switch to PULL when inventory is selected and current filter is PUSH
  useEffect(() => {
    if (selectedEntity === 'inventory' && actionFilter === 'PUSH') {
      setActionFilter('PULL');
    }
  }, [selectedEntity, actionFilter]);

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

    // Helper function to determine action based on children (majority wins)
    const determineActionFromChildren = (children: any[]) => {
      if (children.length === 0) return null;

      // Count PUSH and PULL actions
      const actionCounts = { PUSH: 0, PULL: 0 };
      children.forEach(child => {
        if (child.last_sync_action === 'PUSH') actionCounts.PUSH++;
        else if (child.last_sync_action === 'PULL') actionCounts.PULL++;
      });

      // Return majority, or PUSH if tied
      return actionCounts.PUSH >= actionCounts.PULL ? 'PUSH' : 'PULL';
    };

    // Helper function to determine status based on children (priority-based)
    const determineStatusFromChildren = (children: any[]): SyncStatus => {
      if (children.length === 0) return 'Success';

      // Priority order: Failed > In Queue > Success > Skipped > Invalid
      const statusPriority: Record<SyncStatus, number> = {
        'Failed': 1,
        'In Queue': 2,
        'Success': 3,
        'Skipped': 4,
        'Invalid': 5
      };

      // Find the status with the highest priority (lowest number)
      let highestPriorityStatus: SyncStatus = children[0].last_sync_status;
      let highestPriority = statusPriority[highestPriorityStatus] || 999;

      children.forEach(child => {
        const childStatus = child.last_sync_status;
        const childPriority = statusPriority[childStatus] || 999;

        if (childPriority < highestPriority) {
          highestPriority = childPriority;
          highestPriorityStatus = childStatus;
        }
      });

      return highestPriorityStatus;
    };

    // Map parent records with their children
    const parentsWithChildren = parentRecords.map(parent => {
      const children = actualChildRecords.filter(child => child.parent_reference_key === parent.reference_key);
      const hasChildren = children.length > 0;

      // Determine parent action based on children's actions
      const derivedAction = hasChildren ? determineActionFromChildren(children) : parent.last_sync_action;

      // Determine parent status based on children's statuses (priority-based)
      const derivedStatus = hasChildren ? determineStatusFromChildren(children) : parent.last_sync_status;

      return {
        ...parent,
        children,
        displayStatus: derivedStatus,
        last_sync_action: derivedAction || parent.last_sync_action
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
      const connectionId = (record.connection_id && record.connection_id !== 'null') ? record.connection_id : 'default';
      const isPull = record.last_sync_action === 'PULL';

      if (isPull) {
        // For PULL actions, use trackstar_id (or trackstar_key for inventory)
        if (record.type === 'inventory') {
          // Inventory uses SKU (trackstar_key) instead of ID
          if (!record.trackstar_key) {
            throw new Error('No Trackstar SKU available for inventory sync');
          }
          await apiClient.resyncInventoryPull(record.trackstar_key, connectionId);
        } else {
          // Other entities use trackstar_id
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
      case 'In Queue': return '#007bff';
      default: return '#6c757d';
    }
  };

  const getStatusBadgeTone = (status: SyncStatus | string): 'success' | 'critical' | 'warning' | 'info' | undefined => {
    switch (status) {
      case 'Success': return 'success';
      case 'Failed': return 'critical';
      case 'Skipped': return 'warning';
      case 'In Queue': return 'info';
      default: return undefined;
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

  const truncateMessage = (message: string | null) => {
    if (!message) return '';
    if (message.length <= 500) return message;
    return message.slice(0, 500) + '...';
  };

  // Prepare action filter tabs
  const actionTabs = useMemo(() => {
    const tabs = [];

    // Only show PUSH tab if not inventory entity
    if (selectedEntity !== 'inventory') {
      tabs.push({
        id: 'push-tab',
        content: 'Cin7 → Trackstar',
        panelID: 'push-panel'
      });
    }

    tabs.push({
      id: 'pull-tab',
      content: 'Trackstar → Cin7',
      panelID: 'pull-panel'
    });

    return tabs;
  }, [selectedEntity]);

  const selectedActionTabIndex = useMemo(() => {
    if (selectedEntity === 'inventory') {
      return 0; // PULL is the only/first tab
    }
    return actionFilter === 'PUSH' ? 0 : 1;
  }, [actionFilter, selectedEntity]);

  const handleActionTabChange = (selectedTabIndex: number) => {
    if (selectedEntity === 'inventory') {
      setActionFilter('PULL');
    } else {
      setActionFilter(selectedTabIndex === 0 ? 'PUSH' : 'PULL');
    }
  };

  return (
    <Page
      title="Sync History"
      subtitle={`View and manage synchronization records for ${tenantId}`}
    >
      <BlockStack gap="400">
        {/* Action Filter Tabs (PUSH/PULL) */}
        <Tabs tabs={actionTabs} selected={selectedActionTabIndex} onSelect={handleActionTabChange}>
          <div style={{ paddingTop: '1rem' }} />
        </Tabs>

        {/* Filters */}
        <Card>
          <BlockStack gap="400">
            <InlineStack gap="400" blockAlign="end" wrap={false}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <Select
                  label="Entity Type"
                  options={[
                    { label: 'All Active Entities', value: '' },
                    ...activeEntities.map(entity => ({
                      label: entity.charAt(0).toUpperCase() + entity.slice(1),
                      value: entity
                    }))
                  ]}
                  value={selectedEntity}
                  onChange={(value) => setSelectedEntity(value as EntityType | '')}
                  disabled={activeEntities.length === 0}
                  helpText={activeEntities.length === 0 && tenantConfig ? 'No active entities in config' : undefined}
                />
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                <TextField
                  label="Minimum Date"
                  type="date"
                  value={minDate}
                  onChange={(value) => setMinDate(value)}
                  autoComplete="off"
                />
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                <TextField
                  label="Search"
                  value={searchTerm}
                  onChange={(value) => setSearchTerm(value)}
                  placeholder="Search records..."
                  autoComplete="off"
                />
              </div>

              <Button onClick={loadSyncHistory} loading={loading}>
                Load Records
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        {error && (
          <Banner
            title="Error"
            tone="critical"
            onDismiss={() => setError('')}
          >
            {error}
          </Banner>
        )}

        {successMessage && (
          <Banner
            title="Success"
            tone="success"
            onDismiss={() => setSuccessMessage('')}
          >
            {successMessage}
          </Banner>
        )}

        {/* Status Tabs */}
        <Tabs
          tabs={['Ready to Process', 'All', ...statuses].map(status => ({
            id: status,
            content: `${status} (${statusCounts[status] || 0})`,
            panelID: `${status}-panel`
          }))}
          selected={['Ready to Process', 'All', ...statuses].indexOf(activeTab)}
          onSelect={(selectedTabIndex) => {
            const statusOptions: (SyncStatus | 'All' | 'Ready to Process')[] = ['Ready to Process', 'All', ...statuses];
            setActiveTab(statusOptions[selectedTabIndex]);
          }}
        >
          <div style={{ paddingTop: '1rem' }} />
        </Tabs>

        {/* Records Table */}
        <Card>
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
                              title={record.type === 'inventory' ? record.trackstar_key : record.trackstar_id}
                            >
                              {record.type === 'inventory' ? record.trackstar_key : truncateId(record.trackstar_id)}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const valueToCopy = record.type === 'inventory' ? record.trackstar_key! : record.trackstar_id!;
                              copyToClipboard(valueToCopy, `trackstar-${record.record_id}`);
                            }}
                            title={record.type === 'inventory' ? 'Copy Trackstar SKU to clipboard' : 'Copy Trackstar ID to clipboard'}
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
                      <Badge tone={getStatusBadgeTone(record.displayStatus)}>
                        {record.displayStatus}
                      </Badge>
                    </td>
                    <td style={{ padding: '0.75rem' }}>{record.last_sync_action}</td>
                    <td style={{ padding: '0.75rem', maxWidth: '300px' }}>
                      <div
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          wordBreak: 'break-word',
                          cursor: record.last_sync_message && record.last_sync_message.length > 500 ? 'help' : 'default'
                        }}
                        title={record.last_sync_message || ''}
                      >
                        {truncateMessage(record.last_sync_message)}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                      {formatDate(record.last_pushed_date)}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <Button
                        size="slim"
                        onClick={() => handleResync(record)}
                        disabled={resyncingRecords.has(record.record_id)}
                        loading={resyncingRecords.has(record.record_id)}
                      >
                        Sync
                      </Button>
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
                                title={child.type === 'inventory' ? child.trackstar_key : child.trackstar_id}
                              >
                                {child.type === 'inventory' ? child.trackstar_key : truncateId(child.trackstar_id)}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const valueToCopy = child.type === 'inventory' ? child.trackstar_key! : child.trackstar_id!;
                                copyToClipboard(valueToCopy, `trackstar-${child.record_id}`);
                              }}
                              title={child.type === 'inventory' ? 'Copy Trackstar SKU to clipboard' : 'Copy Trackstar ID to clipboard'}
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
                        <Badge tone={getStatusBadgeTone(child.last_sync_status)}>
                          {child.last_sync_status}
                        </Badge>
                      </td>
                      <td style={{ padding: '0.75rem' }}>{child.last_sync_action}</td>
                      <td style={{ padding: '0.75rem', maxWidth: '300px' }}>
                        <div
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            wordBreak: 'break-word',
                            cursor: child.last_sync_message && child.last_sync_message.length > 500 ? 'help' : 'default'
                          }}
                          title={child.last_sync_message || ''}
                        >
                          {truncateMessage(child.last_sync_message)}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                        {formatDate(child.last_pushed_date)}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <Button
                          size="slim"
                          onClick={() => handleResync(child)}
                          disabled={resyncingRecords.has(child.record_id)}
                          loading={resyncingRecords.has(child.record_id)}
                        >
                          Sync
                        </Button>
                      </td>
                    </tr>
                  ))}
                </>
              ))
            )}
          </tbody>
        </table>
        </Card>

        <Text as="p" variant="bodySm" tone="subdued">
          Showing {filteredRecords.length} of {organizedRecords.length} records
        </Text>
      </BlockStack>
    </Page>
  );
}
