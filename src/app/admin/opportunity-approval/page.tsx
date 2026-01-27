'use client';

import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Search,
  Check,
  X,
  Eye,
  AlertTriangle,
  Trash2,
  Plus,
  Building2,
  Users,
  DollarSign,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  CheckSquare,
  Square,
  MinusSquare,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PendingOpportunityType {
  pending_type_id: string;
  recommended_drug_name: string;
  opportunity_type: string;
  source: string;
  source_details: Record<string, unknown>;
  affected_pharmacies: string[];
  affected_pharmacy_names?: string[]; // Resolved pharmacy names
  total_patient_count: number;
  estimated_annual_margin: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  reviewer_first?: string;
  reviewer_last?: string;
}

interface ApprovalCounts {
  pending?: number;
  approved?: number;
  rejected?: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function OpportunityApprovalPage() {
  const [items, setItems] = useState<PendingOpportunityType[]>([]);
  const [counts, setCounts] = useState<ApprovalCounts>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [processingItem, setProcessingItem] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PendingOpportunityType | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [deleteOpportunities, setDeleteOpportunities] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [itemDetails, setItemDetails] = useState<any>(null);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkApproveModal, setShowBulkApproveModal] = useState(false);
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkNotes, setBulkNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('limit', '200');

      const res = await fetch(`${API_URL}/api/opportunity-approval?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setCounts(data.counts || {});
      } else {
        console.error('Failed to fetch:', await res.text());
      }
    } catch (err) {
      console.error('Failed to fetch approval queue:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchItemDetails(id: string) {
    setDetailsLoading(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/opportunity-approval/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItemDetails(data);
      }
    } catch (err) {
      console.error('Failed to fetch details:', err);
    } finally {
      setDetailsLoading(false);
    }
  }

  async function approveItem() {
    if (!selectedItem) return;
    setProcessingItem(selectedItem.pending_type_id);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/opportunity-approval/${selectedItem.pending_type_id}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: approveNotes,
          // Trigger will be auto-created by backend
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setShowApproveModal(false);
        setApproveNotes('');
        setSelectedItem(null);
        fetchData();
        // Show success message with trigger info
        if (result.trigger) {
          alert(`Approved! Trigger "${result.trigger.display_name}" ${result.triggerAction === 'created_new' ? 'created' : 'linked'} for future scanning.`);
        }
      } else {
        const error = await res.json();
        alert('Failed to approve: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setProcessingItem(null);
    }
  }

  async function rejectItem() {
    if (!selectedItem) return;
    setProcessingItem(selectedItem.pending_type_id);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/opportunity-approval/${selectedItem.pending_type_id}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: rejectNotes,
          deleteExistingOpportunities: deleteOpportunities,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setShowRejectModal(false);
        setRejectNotes('');
        setSelectedItem(null);
        if (result.deletedOpportunities > 0) {
          alert(`Rejected and deleted ${result.deletedOpportunities} opportunities`);
        }
        fetchData();
      } else {
        const error = await res.json();
        alert('Failed to reject: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to reject:', err);
    } finally {
      setProcessingItem(null);
    }
  }

  // Sorting handler
  function handleSort(column: string) {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  }

  // Bulk selection handlers
  function toggleSelectAll() {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.pending_type_id)));
    }
  }

  function toggleSelect(id: string) {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  }

  // Bulk approve
  async function bulkApprove() {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    const token = localStorage.getItem('therxos_token');
    let successCount = 0;
    let errorCount = 0;

    for (const id of selectedIds) {
      try {
        const res = await fetch(`${API_URL}/api/opportunity-approval/${id}/approve`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ notes: bulkNotes }),
        });
        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    setBulkProcessing(false);
    setShowBulkApproveModal(false);
    setBulkNotes('');
    setSelectedIds(new Set());
    fetchData();
    alert(`Approved ${successCount} items${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
  }

  // Bulk reject
  async function bulkReject() {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    const token = localStorage.getItem('therxos_token');
    let successCount = 0;
    let errorCount = 0;

    for (const id of selectedIds) {
      try {
        const res = await fetch(`${API_URL}/api/opportunity-approval/${id}/reject`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ notes: bulkNotes, deleteExistingOpportunities: deleteOpportunities }),
        });
        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    setBulkProcessing(false);
    setShowBulkRejectModal(false);
    setBulkNotes('');
    setSelectedIds(new Set());
    fetchData();
    alert(`Rejected ${successCount} items${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
  }

  // Sort icon component
  function SortIcon({ column }: { column: string }) {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3 h-3 text-slate-500" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3 h-3 text-teal-400" />
      : <ArrowDown className="w-3 h-3 text-teal-400" />;
  }

  const filteredItems = items
    .filter(i => {
      const matchesSearch =
        i.recommended_drug_name?.toLowerCase().includes(search.toLowerCase()) ||
        i.source?.toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      let aVal: any;
      let bVal: any;
      switch (sortColumn) {
        case 'recommended_drug_name':
          aVal = a.recommended_drug_name?.toLowerCase() || '';
          bVal = b.recommended_drug_name?.toLowerCase() || '';
          break;
        case 'opportunity_type':
          aVal = a.opportunity_type?.toLowerCase() || '';
          bVal = b.opportunity_type?.toLowerCase() || '';
          break;
        case 'source':
          aVal = a.source?.toLowerCase() || '';
          bVal = b.source?.toLowerCase() || '';
          break;
        case 'total_patient_count':
          aVal = a.total_patient_count || 0;
          bVal = b.total_patient_count || 0;
          break;
        case 'estimated_annual_margin':
          aVal = a.estimated_annual_margin || 0;
          bVal = b.estimated_annual_margin || 0;
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'created_at':
        default:
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const totalPending = counts.pending || 0;
  const totalApproved = counts.approved || 0;
  const totalRejected = counts.rejected || 0;
  const totalPendingMargin = items.filter(i => i.status === 'pending').reduce((sum, i) => sum + (i.estimated_annual_margin || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Opportunity Approval Queue</h1>
            <p className="text-sm text-slate-400">
              {totalPending} pending · Review new opportunity types before they go live
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#0d2137] border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-400 text-xs mb-1">
            <AlertTriangle className="w-4 h-4" />
            Pending Review
          </div>
          <p className="text-2xl font-bold text-amber-400">{totalPending}</p>
        </div>
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-400 text-xs mb-1">
            <Check className="w-4 h-4" />
            Approved
          </div>
          <p className="text-2xl font-bold text-emerald-400">{totalApproved}</p>
        </div>
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-400 text-xs mb-1">
            <X className="w-4 h-4" />
            Rejected
          </div>
          <p className="text-2xl font-bold text-red-400">{totalRejected}</p>
        </div>
        <div className="bg-[#0d2137] border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-purple-400 text-xs mb-1">
            <DollarSign className="w-4 h-4" />
            Pending Margin
          </div>
          <p className="text-2xl font-bold text-purple-400">{formatCurrency(totalPendingMargin)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by drug name or source..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All Status</option>
        </select>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-purple-400">
              {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-slate-400 hover:text-white"
            >
              Clear selection
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkRejectModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              Reject Selected
            </button>
            <button
              onClick={() => setShowBulkApproveModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Check className="w-4 h-4" />
              Approve Selected
            </button>
          </div>
        </div>
      )}

      {/* Items Table */}
      <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e3a5f]">
              <th className="text-center px-2 py-3 w-10">
                <button
                  onClick={toggleSelectAll}
                  className="p-1 hover:bg-[#1e3a5f] rounded text-slate-400 hover:text-white transition-colors"
                >
                  {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-purple-400" />
                  ) : selectedIds.size > 0 ? (
                    <MinusSquare className="w-4 h-4 text-purple-400" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th
                onClick={() => handleSort('recommended_drug_name')}
                className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  Recommended Drug
                  <SortIcon column="recommended_drug_name" />
                </div>
              </th>
              <th
                onClick={() => handleSort('source')}
                className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  Source
                  <SortIcon column="source" />
                </div>
              </th>
              <th
                onClick={() => handleSort('total_patient_count')}
                className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center justify-center gap-1">
                  <Users className="w-3 h-3" />
                  Patients
                  <SortIcon column="total_patient_count" />
                </div>
              </th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">
                <div className="flex items-center justify-center gap-1">
                  <Building2 className="w-3 h-3" />
                  Pharmacies
                </div>
              </th>
              <th
                onClick={() => handleSort('estimated_annual_margin')}
                className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center justify-center gap-1">
                  Est. Margin
                  <SortIcon column="estimated_annual_margin" />
                </div>
              </th>
              <th
                onClick={() => handleSort('status')}
                className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center justify-center gap-1">
                  Status
                  <SortIcon column="status" />
                </div>
              </th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.pending_type_id} className="border-b border-[#1e3a5f]/50 hover:bg-[#1e3a5f]/30">
                <td className="text-center px-2 py-3">
                  <button
                    onClick={() => toggleSelect(item.pending_type_id)}
                    className="p-1 hover:bg-[#1e3a5f] rounded text-slate-400 hover:text-white transition-colors"
                  >
                    {selectedIds.has(item.pending_type_id) ? (
                      <CheckSquare className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-white">{item.recommended_drug_name}</p>
                  <p className="text-xs text-slate-500">Added {formatDate(item.created_at)}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    item.source === 'legacy_scan' ? 'bg-amber-500/20 text-amber-400'
                      : item.source === 'manual' ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {item.source || 'unknown'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm text-white font-medium">{item.total_patient_count || 0}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center">
                    {item.affected_pharmacy_names && item.affected_pharmacy_names.length > 0 ? (
                      <span className="text-sm text-slate-300" title={item.affected_pharmacy_names.join(', ')}>
                        {item.affected_pharmacy_names.length === 1
                          ? item.affected_pharmacy_names[0]
                          : `${item.affected_pharmacy_names[0]} +${item.affected_pharmacy_names.length - 1}`}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-500">{item.affected_pharmacies?.length || 0}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm text-emerald-400 font-semibold">
                    {formatCurrency(item.estimated_annual_margin || 0)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    item.status === 'pending' ? 'bg-amber-500/20 text-amber-400'
                      : item.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    {item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowApproveModal(true);
                          }}
                          disabled={processingItem === item.pending_type_id}
                          className="p-1.5 hover:bg-emerald-500/20 rounded text-slate-400 hover:text-emerald-400 transition-colors disabled:opacity-50"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowRejectModal(true);
                          }}
                          disabled={processingItem === item.pending_type_id}
                          className="p-1.5 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setShowDetailsModal(true);
                        fetchItemDetails(item.pending_type_id);
                      }}
                      className="p-1.5 hover:bg-[#1e3a5f] rounded text-slate-400 hover:text-white transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredItems.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            {statusFilter === 'pending' ? 'No pending items to review' : 'No items found'}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Approve Opportunity Type</h2>
                <p className="text-sm text-slate-400">{selectedItem.recommended_drug_name}</p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-[#0a1628] rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-500">Patients:</span>
                  <span className="text-white ml-2">{selectedItem.total_patient_count}</span>
                </div>
                <div>
                  <span className="text-slate-500">Est. Margin:</span>
                  <span className="text-emerald-400 ml-2">{formatCurrency(selectedItem.estimated_annual_margin)}</span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-400 mb-2">Notes (optional)</label>
              <textarea
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                placeholder="Add approval notes..."
                className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedItem(null);
                  setApproveNotes('');
                }}
                className="flex-1 px-4 py-2 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={approveItem}
                disabled={processingItem === selectedItem.pending_type_id}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processingItem === selectedItem.pending_type_id ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Approve
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <X className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Reject Opportunity Type</h2>
                <p className="text-sm text-slate-400">{selectedItem.recommended_drug_name}</p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">
                This will mark this opportunity type as rejected. You can optionally delete all existing opportunities of this type.
              </p>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteOpportunities}
                  onChange={(e) => setDeleteOpportunities(e.target.checked)}
                  className="w-4 h-4 rounded border-[#1e3a5f] bg-[#0a1628] text-red-500 focus:ring-red-500"
                />
                <span>Delete all existing opportunities ({selectedItem.total_patient_count} patients)</span>
              </label>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-400 mb-2">Rejection Reason</label>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Why is this being rejected?"
                className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedItem(null);
                  setRejectNotes('');
                }}
                className="flex-1 px-4 py-2 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={rejectItem}
                disabled={processingItem === selectedItem.pending_type_id}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processingItem === selectedItem.pending_type_id ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Reject {deleteOpportunities ? '& Delete' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedItem.recommended_drug_name}</h2>
                  <p className="text-sm text-slate-400">Opportunity Type Details</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedItem(null);
                  setItemDetails(null);
                }}
                className="p-2 hover:bg-[#1e3a5f] rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
              </div>
            ) : itemDetails ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                      <Users className="w-4 h-4" />
                      Total Patients
                    </div>
                    <p className="text-2xl font-bold text-white">{itemDetails.total_patient_count?.toLocaleString() || 0}</p>
                  </div>
                  <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                      <DollarSign className="w-4 h-4" />
                      Est. Annual Margin
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(itemDetails.estimated_annual_margin || 0)}</p>
                  </div>
                  <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                      <Building2 className="w-4 h-4" />
                      Pharmacies
                    </div>
                    <p className="text-2xl font-bold text-white">{itemDetails.affected_pharmacies?.length || 0}</p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Opportunity Type</p>
                    <p className="text-sm text-white">{itemDetails.opportunity_type || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Source</p>
                    <p className="text-sm text-white">{itemDetails.source || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Status</p>
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      itemDetails.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                      itemDetails.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {itemDetails.status?.charAt(0).toUpperCase() + itemDetails.status?.slice(1)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Created</p>
                    <p className="text-sm text-white">{formatDate(itemDetails.created_at)}</p>
                  </div>
                </div>

                {/* Affected Pharmacies */}
                {itemDetails.affected_pharmacies_resolved && itemDetails.affected_pharmacies_resolved.length > 0 ? (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Affected Pharmacies</p>
                    <div className="flex flex-wrap gap-2">
                      {itemDetails.affected_pharmacies_resolved.map((ph: { pharmacy_id: string; pharmacy_name: string }, i: number) => (
                        <span key={i} className="px-2 py-1 bg-[#1e3a5f] text-white text-xs rounded">
                          {ph.pharmacy_name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : itemDetails.affected_pharmacies && itemDetails.affected_pharmacies.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Affected Pharmacies</p>
                    <div className="flex flex-wrap gap-2">
                      {itemDetails.affected_pharmacies.map((ph: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-[#1e3a5f] text-white text-xs rounded">
                          {ph}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Drug Breakdown - What triggered these opportunities */}
                {itemDetails.current_drug_breakdown && itemDetails.current_drug_breakdown.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Current Drugs (What Triggered This)</p>
                    <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#1e3a5f]">
                            <th className="text-left px-3 py-2 text-xs text-slate-400">Current Drug</th>
                            <th className="text-right px-3 py-2 text-xs text-slate-400">Count</th>
                            <th className="text-right px-3 py-2 text-xs text-slate-400">Est. Margin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itemDetails.current_drug_breakdown.map((drug: { current_drug_name: string; count: number; total_margin: number }, i: number) => (
                            <tr key={i} className="border-b border-[#1e3a5f]/50">
                              <td className="px-3 py-2 text-white">{drug.current_drug_name || 'Unknown'}</td>
                              <td className="px-3 py-2 text-right text-slate-300">{drug.count}</td>
                              <td className="px-3 py-2 text-right text-emerald-400">{formatCurrency(drug.total_margin || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* BIN/Group Breakdown - Insurance context */}
                {itemDetails.bin_breakdown && itemDetails.bin_breakdown.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Insurance BIN/Group Breakdown</p>
                    <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#1e3a5f]">
                            <th className="text-left px-3 py-2 text-xs text-slate-400">BIN</th>
                            <th className="text-left px-3 py-2 text-xs text-slate-400">Group</th>
                            <th className="text-left px-3 py-2 text-xs text-slate-400">Plan</th>
                            <th className="text-right px-3 py-2 text-xs text-slate-400">Count</th>
                            <th className="text-right px-3 py-2 text-xs text-slate-400">Margin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itemDetails.bin_breakdown.slice(0, 10).map((bin: { bin: string; grp: string; plan_name: string; count: number; total_margin: number }, i: number) => (
                            <tr key={i} className="border-b border-[#1e3a5f]/50">
                              <td className="px-3 py-2 text-white font-mono text-xs">{bin.bin || 'N/A'}</td>
                              <td className="px-3 py-2 text-slate-300 font-mono text-xs">{bin.grp || '-'}</td>
                              <td className="px-3 py-2 text-slate-400 text-xs truncate max-w-[150px]">{bin.plan_name || '-'}</td>
                              <td className="px-3 py-2 text-right text-slate-300">{bin.count}</td>
                              <td className="px-3 py-2 text-right text-emerald-400">{formatCurrency(bin.total_margin || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {itemDetails.bin_breakdown.length > 10 && (
                        <p className="text-xs text-slate-500 p-2 text-center">
                          +{itemDetails.bin_breakdown.length - 10} more BIN/Group combinations
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Sample Opportunities */}
                {itemDetails.sample_opportunities && itemDetails.sample_opportunities.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Sample Opportunities ({itemDetails.sample_opportunities.length})</p>
                    <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-[#0a1628]">
                          <tr className="border-b border-[#1e3a5f]">
                            <th className="text-left px-3 py-2 text-xs text-slate-400">Patient</th>
                            <th className="text-left px-3 py-2 text-xs text-slate-400">Current Drug</th>
                            <th className="text-left px-3 py-2 text-xs text-slate-400">Prescriber</th>
                            <th className="text-left px-3 py-2 text-xs text-slate-400">BIN</th>
                            <th className="text-right px-3 py-2 text-xs text-slate-400">Margin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itemDetails.sample_opportunities.map((opp: any, i: number) => (
                            <tr key={i} className="border-b border-[#1e3a5f]/50">
                              <td className="px-3 py-2 text-white text-xs">{opp.patient_name || 'Unknown'}</td>
                              <td className="px-3 py-2 text-slate-300 text-xs truncate max-w-[150px]">{opp.current_drug_name || '-'}</td>
                              <td className="px-3 py-2 text-slate-400 text-xs truncate max-w-[100px]">{opp.prescriber_name || '-'}</td>
                              <td className="px-3 py-2 text-slate-400 font-mono text-xs">{opp.insurance_bin || '-'}</td>
                              <td className="px-3 py-2 text-right text-emerald-400">{formatCurrency(opp.annual_margin_gain || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Legacy Sample Data (fallback) */}
                {(!itemDetails.current_drug_breakdown || itemDetails.current_drug_breakdown.length === 0) &&
                  itemDetails.sample_data && Object.keys(itemDetails.sample_data).length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Sample Data</p>
                    <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg p-4">
                      {itemDetails.sample_data.current_drugs && (
                        <div className="mb-3">
                          <p className="text-xs text-slate-400 mb-1">Current Drugs Detected:</p>
                          <div className="flex flex-wrap gap-1">
                            {itemDetails.sample_data.current_drugs.slice(0, 10).map((drug: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 bg-[#1e3a5f] text-slate-300 text-xs rounded">
                                {drug}
                              </span>
                            ))}
                            {itemDetails.sample_data.current_drugs.length > 10 && (
                              <span className="px-2 py-0.5 text-slate-500 text-xs">
                                +{itemDetails.sample_data.current_drugs.length - 10} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      <pre className="text-xs text-slate-400 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(itemDetails.sample_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Review Notes */}
                {itemDetails.review_notes && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Review Notes</p>
                    <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg p-4">
                      <p className="text-sm text-white">{itemDetails.review_notes}</p>
                      {itemDetails.reviewer_first && (
                        <p className="text-xs text-slate-500 mt-2">
                          — {itemDetails.reviewer_first} {itemDetails.reviewer_last}, {formatDate(itemDetails.reviewed_at)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Linked Trigger */}
                {itemDetails.created_trigger_id && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Linked Trigger</p>
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                      <p className="text-sm text-emerald-400">
                        Trigger ID: {itemDetails.created_trigger_id}
                      </p>
                      {itemDetails.trigger_name && (
                        <p className="text-xs text-slate-400 mt-1">
                          {itemDetails.trigger_name}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* History */}
                {itemDetails.history && itemDetails.history.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Approval History</p>
                    <div className="space-y-2">
                      {itemDetails.history.map((h: any, i: number) => (
                        <div key={i} className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg p-3 flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${
                            h.action === 'approved' ? 'bg-emerald-500' :
                            h.action === 'rejected' ? 'bg-red-500' : 'bg-amber-500'
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white capitalize">{h.action}</span>
                              <span className="text-xs text-slate-500">
                                {h.previous_status} → {h.new_status}
                              </span>
                            </div>
                            {h.notes && <p className="text-xs text-slate-400 mt-1">{h.notes}</p>}
                            <p className="text-xs text-slate-500 mt-1">
                              {h.first_name} {h.last_name} • {formatDate(h.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                Failed to load details
              </div>
            )}

            {/* Action Buttons */}
            {itemDetails?.status === 'pending' && (
              <div className="flex gap-3 mt-6 pt-6 border-t border-[#1e3a5f]">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowRejectModal(true);
                  }}
                  className="flex-1 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowApproveModal(true);
                  }}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Approve
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Approve Modal */}
      {showBulkApproveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Bulk Approve</h2>
                <p className="text-sm text-slate-400">{selectedIds.size} items selected</p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <p className="text-sm text-emerald-400">
                This will approve all selected items and create triggers for each new opportunity type.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-400 mb-2">Notes (optional)</label>
              <textarea
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder="Add notes for all approvals..."
                className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBulkApproveModal(false);
                  setBulkNotes('');
                }}
                className="flex-1 px-4 py-2 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={bulkApprove}
                disabled={bulkProcessing}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {bulkProcessing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Approve All
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Reject Modal */}
      {showBulkRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <X className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Bulk Reject</h2>
                <p className="text-sm text-slate-400">{selectedIds.size} items selected</p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">
                This will reject all selected items. You can optionally delete existing opportunities.
              </p>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteOpportunities}
                  onChange={(e) => setDeleteOpportunities(e.target.checked)}
                  className="w-4 h-4 rounded border-[#1e3a5f] bg-[#0a1628] text-red-500 focus:ring-red-500"
                />
                <span>Delete all existing opportunities</span>
              </label>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-400 mb-2">Rejection Reason (optional)</label>
              <textarea
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder="Why are these being rejected?"
                className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBulkRejectModal(false);
                  setBulkNotes('');
                }}
                className="flex-1 px-4 py-2 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={bulkReject}
                disabled={bulkProcessing}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {bulkProcessing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Reject All {deleteOpportunities ? '& Delete' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
