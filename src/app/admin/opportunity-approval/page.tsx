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
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PendingOpportunityType {
  pending_type_id: string;
  recommended_drug_name: string;
  opportunity_type: string;
  source: string;
  source_details: Record<string, unknown>;
  affected_pharmacies: string[];
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
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [deleteOpportunities, setDeleteOpportunities] = useState(true);

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
          createTrigger: false, // For now, don't auto-create triggers
        }),
      });
      if (res.ok) {
        setShowApproveModal(false);
        setApproveNotes('');
        setSelectedItem(null);
        fetchData();
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

  const filteredItems = items.filter(i => {
    const matchesSearch =
      i.recommended_drug_name?.toLowerCase().includes(search.toLowerCase()) ||
      i.source?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
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

      {/* Items Table */}
      <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e3a5f]">
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Recommended Drug</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Source</th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">
                <div className="flex items-center justify-center gap-1">
                  <Users className="w-3 h-3" />
                  Patients
                </div>
              </th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">
                <div className="flex items-center justify-center gap-1">
                  <Building2 className="w-3 h-3" />
                  Pharmacies
                </div>
              </th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Est. Margin</th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.pending_type_id} className="border-b border-[#1e3a5f]/50 hover:bg-[#1e3a5f]/30">
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
                  <span className="text-sm text-slate-300">{item.affected_pharmacies?.length || 0}</span>
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
                      onClick={() => setSelectedItem(item)}
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
    </div>
  );
}
