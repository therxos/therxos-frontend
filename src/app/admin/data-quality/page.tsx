'use client';

import { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  Search,
  Check,
  X,
  Eye,
  AlertCircle,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface DataQualityIssue {
  issue_id: string;
  pharmacy_id: string;
  pharmacy_name: string;
  opportunity_id: string;
  patient_id: string;
  patient_name: string;
  issue_type: string;
  issue_description: string;
  original_value: string;
  field_name: string;
  status: 'pending' | 'resolved' | 'ignored';
  resolved_value: string | null;
  resolved_at: string | null;
  created_at: string;
  annual_margin_gain: number;
  current_drug: string;
  recommended_drug: string;
}

interface QualityStats {
  total_pending: number;
  total_resolved: number;
  total_ignored: number;
  blocked_margin: number;
  by_type: { [key: string]: number };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DataQualityPage() {
  const [issues, setIssues] = useState<DataQualityIssue[]>([]);
  const [stats, setStats] = useState<QualityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [processingIssue, setProcessingIssue] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [statusFilter, typeFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      const token = localStorage.getItem('therxos_token');

      // Fetch stats
      const statsRes = await fetch(`${API_URL}/api/data-quality/stats/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      // Fetch issues
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('issue_type', typeFilter);

      const issuesRes = await fetch(`${API_URL}/api/data-quality?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (issuesRes.ok) {
        const data = await issuesRes.json();
        setIssues(data.issues || []);
      }
    } catch (err) {
      console.error('Failed to fetch data quality data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function resolveIssue(issueId: string, resolvedValue: string) {
    setProcessingIssue(issueId);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/data-quality/${issueId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'resolved',
          resolved_value: resolvedValue,
        }),
      });
      if (res.ok) {
        setIssues(prev => prev.filter(i => i.issue_id !== issueId));
        fetchData(); // Refresh stats
      }
    } catch (err) {
      console.error('Failed to resolve issue:', err);
    } finally {
      setProcessingIssue(null);
    }
  }

  async function ignoreIssue(issueId: string) {
    setProcessingIssue(issueId);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/data-quality/${issueId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'ignored' }),
      });
      if (res.ok) {
        setIssues(prev => prev.filter(i => i.issue_id !== issueId));
        fetchData(); // Refresh stats
      }
    } catch (err) {
      console.error('Failed to ignore issue:', err);
    } finally {
      setProcessingIssue(null);
    }
  }

  const filteredIssues = issues.filter(i => {
    const matchesSearch =
      i.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      i.pharmacy_name?.toLowerCase().includes(search.toLowerCase()) ||
      i.original_value?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const issueTypes = ['all', 'missing_prescriber', 'unknown_prescriber', 'missing_current_drug'];

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
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Database className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Data Quality</h1>
            <p className="text-sm text-slate-400">
              {stats?.total_pending || 0} pending issues · {formatCurrency(stats?.blocked_margin || 0)} blocked
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
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[#0d2137] border border-amber-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-400 text-xs mb-1">
              <AlertCircle className="w-4 h-4" />
              Pending
            </div>
            <p className="text-2xl font-bold text-amber-400">{stats.total_pending}</p>
          </div>
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
            <div className="flex items-center gap-2 text-emerald-400 text-xs mb-1">
              <Check className="w-4 h-4" />
              Resolved
            </div>
            <p className="text-2xl font-bold text-emerald-400">{stats.total_resolved}</p>
          </div>
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <X className="w-4 h-4" />
              Ignored
            </div>
            <p className="text-2xl font-bold text-slate-400">{stats.total_ignored}</p>
          </div>
          <div className="bg-[#0d2137] border border-red-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-400 text-xs mb-1">
              Blocked Margin
            </div>
            <p className="text-2xl font-bold text-red-400">{formatCurrency(stats.blocked_margin)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search issues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
        >
          {issueTypes.map(type => (
            <option key={type} value={type}>
              {type === 'all' ? 'All Types' : type.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
        >
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="ignored">Ignored</option>
          <option value="all">All Status</option>
        </select>
      </div>

      {/* Issues Table */}
      <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e3a5f]">
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Patient / Pharmacy</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Issue</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Original Value</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Opportunity</th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Value</th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredIssues.map((issue) => (
              <tr key={issue.issue_id} className="border-b border-[#1e3a5f]/50 hover:bg-[#1e3a5f]/30">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-white">{issue.patient_name || 'Unknown'}</p>
                  <p className="text-xs text-slate-500">{issue.pharmacy_name}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    issue.issue_type === 'missing_prescriber' ? 'bg-red-500/20 text-red-400'
                      : issue.issue_type === 'unknown_prescriber' ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {issue.issue_type.replace(/_/g, ' ')}
                  </span>
                  {issue.issue_description && (
                    <p className="text-xs text-slate-400 mt-1">{issue.issue_description}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <code className="text-xs text-slate-300 bg-[#0a1628] px-2 py-1 rounded">
                    {issue.original_value || 'N/A'}
                  </code>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs text-slate-400">{issue.current_drug}</p>
                  <p className="text-xs text-teal-400">→ {issue.recommended_drug}</p>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm text-amber-400 font-semibold">
                    {formatCurrency(issue.annual_margin_gain || 0)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => resolveIssue(issue.issue_id, issue.original_value)}
                      disabled={processingIssue === issue.issue_id}
                      className="p-1.5 hover:bg-emerald-500/20 rounded text-slate-400 hover:text-emerald-400 transition-colors disabled:opacity-50"
                      title="Mark Resolved"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => ignoreIssue(issue.issue_id)}
                      disabled={processingIssue === issue.issue_id}
                      className="p-1.5 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Ignore"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      className="p-1.5 hover:bg-[#1e3a5f] rounded text-slate-400 hover:text-white transition-colors"
                      title="View Opportunity"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredIssues.length === 0 && (
          <div className="text-center py-8 text-slate-400">No data quality issues found</div>
        )}
      </div>
    </div>
  );
}
