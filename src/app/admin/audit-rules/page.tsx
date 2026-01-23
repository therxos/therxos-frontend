'use client';

import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface AuditRule {
  rule_id: string;
  rule_code: string;
  rule_name: string;
  rule_description: string | null;
  rule_type: 'quantity_mismatch' | 'days_supply_mismatch' | 'daw_violation' | 'sig_quantity_mismatch' | 'high_gp_risk';
  drug_keywords: string[] | null;
  ndc_pattern: string | null;
  expected_quantity: number | null;
  min_quantity: number | null;
  max_quantity: number | null;
  quantity_tolerance: number;
  min_days_supply: number | null;
  max_days_supply: number | null;
  allowed_daw_codes: string[] | null;
  has_generic_available: boolean | null;
  gp_threshold: number;
  severity: 'critical' | 'warning' | 'info';
  audit_risk_score: number | null;
  is_enabled: boolean;
  created_at: string;
}

export default function AuditRulesPage() {
  const [rules, setRules] = useState<AuditRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchRules();
  }, []);

  async function fetchRules() {
    setLoading(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/audit-rules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } catch (err) {
      console.error('Failed to fetch audit rules:', err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleRule(ruleId: string, enabled: boolean) {
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/audit-rules/${ruleId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_enabled: enabled }),
      });
      if (res.ok) {
        setRules(prev => prev.map(r =>
          r.rule_id === ruleId ? { ...r, is_enabled: enabled } : r
        ));
      }
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  }

  async function deleteRule(ruleId: string) {
    if (!confirm('Are you sure you want to delete this audit rule?')) return;
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/audit-rules/${ruleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setRules(prev => prev.filter(r => r.rule_id !== ruleId));
      }
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  }

  const filteredRules = rules.filter(r => {
    const matchesSearch =
      r.rule_name.toLowerCase().includes(search.toLowerCase()) ||
      r.rule_code?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || r.rule_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const ruleTypes = ['all', 'quantity_mismatch', 'days_supply_mismatch', 'daw_violation', 'sig_quantity_mismatch', 'high_gp_risk'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Audit Rules</h1>
            <p className="text-sm text-slate-400">
              {rules.length} rules ({rules.filter(r => r.is_enabled).length} enabled)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchRules}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            New Rule
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search rules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
        >
          {ruleTypes.map(type => (
            <option key={type} value={type}>
              {type === 'all' ? 'All Types' : type.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Rules Table */}
      <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e3a5f]">
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Rule</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Type</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Drug Target</th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Severity</th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRules.map((rule) => (
              <tr key={rule.rule_id} className="border-b border-[#1e3a5f]/50 hover:bg-[#1e3a5f]/30">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-white">{rule.rule_name}</p>
                  <p className="text-xs text-slate-500 font-mono">{rule.rule_code}</p>
                  {rule.rule_description && (
                    <p className="text-xs text-slate-400 mt-1">{rule.rule_description}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    rule.rule_type === 'quantity_mismatch' ? 'bg-blue-500/20 text-blue-400'
                      : rule.rule_type === 'days_supply_mismatch' ? 'bg-purple-500/20 text-purple-400'
                      : rule.rule_type === 'daw_violation' ? 'bg-amber-500/20 text-amber-400'
                      : rule.rule_type === 'high_gp_risk' ? 'bg-red-500/20 text-red-400'
                      : 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {rule.rule_type.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="max-w-48 truncate text-xs text-slate-300">
                    {rule.drug_keywords?.slice(0, 3).join(', ') || rule.ndc_pattern || 'All drugs'}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    rule.severity === 'critical' ? 'bg-red-500/20 text-red-400'
                      : rule.severity === 'warning' ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {rule.severity}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleRule(rule.rule_id, !rule.is_enabled)}
                    className={`p-1 rounded transition-colors ${
                      rule.is_enabled
                        ? 'text-emerald-400 hover:bg-emerald-500/20'
                        : 'text-slate-500 hover:bg-slate-500/20'
                    }`}
                  >
                    {rule.is_enabled ? (
                      <ToggleRight className="w-6 h-6" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      className="p-1.5 hover:bg-[#1e3a5f] rounded text-slate-400 hover:text-white transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteRule(rule.rule_id)}
                      className="p-1.5 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRules.length === 0 && (
          <div className="text-center py-8 text-slate-400">No audit rules found</div>
        )}
      </div>
    </div>
  );
}
