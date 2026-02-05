'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store';
import {
  Send,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Phone,
  User,
  Calendar,
  DollarSign,
  BarChart3,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface FaxRecord {
  fax_id: string;
  opportunity_id: string;
  patient_id: string;
  patient_name: string;
  prescriber_name: string;
  prescriber_name_formatted: string;
  prescriber_npi: string;
  prescriber_fax_number: string;
  fax_status: 'queued' | 'sending' | 'accepted' | 'in_progress' | 'successful' | 'failed' | 'no_answer' | 'busy' | 'cancelled';
  trigger_type: string;
  current_drug: string;
  recommended_drug: string;
  sender_name: string;
  sent_at: string;
  delivered_at: string | null;
  failed_reason: string | null;
  page_count: number;
  cost_cents: number;
}

interface FaxStats {
  summary: {
    total_sent: number;
    delivered: number;
    failed: number;
    pending: number;
    total_cost_cents: number;
    total_pages: number;
    delivery_rate: number;
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  queued: { label: 'Queued', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: <Clock className="w-4 h-4" /> },
  sending: { label: 'Sending', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: <RefreshCw className="w-4 h-4 animate-spin" /> },
  accepted: { label: 'Accepted', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: <Clock className="w-4 h-4" /> },
  in_progress: { label: 'In Progress', color: 'text-amber-400', bgColor: 'bg-amber-500/20', icon: <RefreshCw className="w-4 h-4 animate-spin" /> },
  successful: { label: 'Delivered', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', icon: <CheckCircle className="w-4 h-4" /> },
  failed: { label: 'Failed', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: <XCircle className="w-4 h-4" /> },
  no_answer: { label: 'No Answer', color: 'text-amber-400', bgColor: 'bg-amber-500/20', icon: <Phone className="w-4 h-4" /> },
  busy: { label: 'Busy', color: 'text-amber-400', bgColor: 'bg-amber-500/20', icon: <Phone className="w-4 h-4" /> },
  cancelled: { label: 'Cancelled', color: 'text-slate-400', bgColor: 'bg-slate-500/20', icon: <XCircle className="w-4 h-4" /> },
};

export default function FaxQueuePage() {
  const user = useAuthStore((state) => state.user);
  const [faxes, setFaxes] = useState<FaxRecord[]>([]);
  const [stats, setStats] = useState<FaxStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'delivered' | 'failed'>('all');
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  useEffect(() => {
    loadFaxData();
  }, []);

  async function loadFaxData() {
    setLoading(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [logRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/fax/log?limit=100`, { headers }),
        fetch(`${API_URL}/api/fax/stats?days=30`, { headers }),
      ]);

      if (logRes.ok) {
        const data = await logRes.json();
        setFaxes(data.faxes || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to load fax data:', e);
    } finally {
      setLoading(false);
    }
  }

  async function refreshFaxStatus(faxId: string) {
    setRefreshingId(faxId);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/fax/${faxId}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setFaxes(prev => prev.map(f =>
          f.fax_id === faxId ? { ...f, fax_status: data.status } : f
        ));
      }
    } catch (e) {
      console.error('Failed to refresh fax status:', e);
    } finally {
      setRefreshingId(null);
    }
  }

  // Filter faxes
  const filteredFaxes = faxes.filter(fax => {
    if (filter === 'pending' && !['queued', 'sending', 'accepted', 'in_progress'].includes(fax.fax_status)) return false;
    if (filter === 'delivered' && fax.fax_status !== 'successful') return false;
    if (filter === 'failed' && !['failed', 'no_answer', 'busy'].includes(fax.fax_status)) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!fax.prescriber_name?.toLowerCase().includes(s) &&
          !fax.patient_name?.toLowerCase().includes(s) &&
          !fax.current_drug?.toLowerCase().includes(s)) {
        return false;
      }
    }
    return true;
  });

  const pendingCount = faxes.filter(f => ['queued', 'sending', 'accepted', 'in_progress'].includes(f.fax_status)).length;
  const deliveredCount = faxes.filter(f => f.fax_status === 'successful').length;
  const failedCount = faxes.filter(f => ['failed', 'no_answer', 'busy'].includes(f.fax_status)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#14b8a6]/20 flex items-center justify-center">
            <Send className="w-6 h-6 text-[#14b8a6]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Fax Queue</h1>
            <p className="text-sm text-slate-400">Track sent faxes and delivery status</p>
          </div>
        </div>
        <button
          onClick={loadFaxData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Send className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase">Total Sent</p>
                <p className="text-xl font-bold text-white">{stats.summary.total_sent}</p>
              </div>
            </div>
          </div>
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase">Delivered</p>
                <p className="text-xl font-bold text-emerald-400">{stats.summary.delivered}</p>
              </div>
            </div>
          </div>
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase">Delivery Rate</p>
                <p className="text-xl font-bold text-purple-400">{stats.summary.delivery_rate}%</p>
              </div>
            </div>
          </div>
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase">Total Cost</p>
                <p className="text-xl font-bold text-amber-400">{formatCurrency(stats.summary.total_cost_cents)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by prescriber, patient, or drug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#14b8a6]"
          />
        </div>
        <div className="flex bg-[#0d2137] border border-[#1e3a5f] rounded-lg p-1">
          {[
            { key: 'all', label: `All (${faxes.length})` },
            { key: 'pending', label: `Pending (${pendingCount})` },
            { key: 'delivered', label: `Delivered (${deliveredCount})` },
            { key: 'failed', label: `Failed (${failedCount})` },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as typeof filter)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-[#14b8a6] text-[#0a1628]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fax List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-8 h-8 text-[#14b8a6] animate-spin" />
        </div>
      ) : filteredFaxes.length === 0 ? (
        <div className="text-center py-16 bg-[#0d2137] rounded-xl border border-[#1e3a5f]">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No faxes found</h3>
          <p className="text-slate-400 max-w-md mx-auto">
            {faxes.length === 0
              ? 'When you send a fax from an opportunity, it will appear here for tracking.'
              : 'No faxes match your current filters.'}
          </p>
        </div>
      ) : (
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#1e3a5f]/50">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-300 uppercase px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-slate-300 uppercase px-4 py-3">Patient / Drug</th>
                <th className="text-left text-xs font-semibold text-slate-300 uppercase px-4 py-3">Prescriber</th>
                <th className="text-left text-xs font-semibold text-slate-300 uppercase px-4 py-3">Sent</th>
                <th className="text-right text-xs font-semibold text-slate-300 uppercase px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFaxes.map(fax => {
                const config = statusConfig[fax.fax_status] || statusConfig.queued;

                return (
                  <tr key={fax.fax_id} className="border-t border-[#1e3a5f] hover:bg-[#1e3a5f]/30">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center ${config.color}`}>
                          {config.icon}
                        </div>
                        <div>
                          <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                          {fax.failed_reason && (
                            <p className="text-xs text-red-400 mt-0.5">{fax.failed_reason}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm text-white font-medium">{fax.patient_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {fax.current_drug} → <span className="text-[#14b8a6]">{fax.recommended_drug}</span>
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm text-white">{fax.prescriber_name_formatted || fax.prescriber_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">{fax.prescriber_fax_number}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm text-slate-300">{formatDate(fax.sent_at)}</p>
                        <p className="text-xs text-slate-500 mt-0.5">by {fax.sender_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {['queued', 'sending', 'accepted', 'in_progress'].includes(fax.fax_status) && (
                        <button
                          onClick={() => refreshFaxStatus(fax.fax_id)}
                          disabled={refreshingId === fax.fax_id}
                          className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-[#1e3a5f] disabled:opacity-50"
                          title="Refresh status"
                        >
                          <RefreshCw className={`w-4 h-4 ${refreshingId === fax.fax_id ? 'animate-spin' : ''}`} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
