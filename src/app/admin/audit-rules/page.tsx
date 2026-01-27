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
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  Loader2,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PharmacyStat {
  pharmacy_id: string;
  pharmacy_name: string;
  risk_count: number;
  patient_count: number;
  total_exposure: number;
}

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
  pharmacy_stats?: PharmacyStat[];
  total_risks?: number;
  total_patients?: number;
  total_exposure?: number;
}

export default function AuditRulesPage() {
  const [rules, setRules] = useState<AuditRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [editingRule, setEditingRule] = useState<AuditRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [scanningPharmacy, setScanningPharmacy] = useState<string | null>(null);
  const [pharmacies, setPharmacies] = useState<{ pharmacy_id: string; pharmacy_name: string }[]>([]);

  useEffect(() => {
    fetchRules();
    fetchPharmacies();
  }, []);

  async function fetchPharmacies() {
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/pharmacies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPharmacies(data.pharmacies || []);
      }
    } catch (err) {
      console.error('Failed to fetch pharmacies:', err);
    }
  }

  async function scanPharmacyForRule(ruleId: string, pharmacyId: string, pharmacyName: string) {
    setScanningPharmacy(pharmacyId);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/audit-rules/${ruleId}/scan-pharmacy/${pharmacyId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Scan complete for ${pharmacyName}!\n\nFlags created: ${data.flagsCreated || 0}\nPatients affected: ${data.patientsAffected || 0}`);
        fetchRules();
      } else {
        const error = await res.json();
        alert('Scan failed: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to scan pharmacy:', err);
      alert('Failed to scan pharmacy');
    } finally {
      setScanningPharmacy(null);
    }
  }

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

  async function saveRule() {
    if (!editingRule) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/audit-rules/${editingRule.rule_id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ruleCode: editingRule.rule_code,
          ruleName: editingRule.rule_name,
          ruleDescription: editingRule.rule_description,
          ruleType: editingRule.rule_type,
          drugKeywords: editingRule.drug_keywords,
          ndcPattern: editingRule.ndc_pattern,
          expectedQuantity: editingRule.expected_quantity,
          minQuantity: editingRule.min_quantity,
          maxQuantity: editingRule.max_quantity,
          quantityTolerance: editingRule.quantity_tolerance,
          minDaysSupply: editingRule.min_days_supply,
          maxDaysSupply: editingRule.max_days_supply,
          allowedDawCodes: editingRule.allowed_daw_codes,
          hasGenericAvailable: editingRule.has_generic_available,
          gpThreshold: editingRule.gp_threshold,
          severity: editingRule.severity,
          auditRiskScore: editingRule.audit_risk_score,
          isEnabled: editingRule.is_enabled,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRules(prev => prev.map(r =>
          r.rule_id === editingRule.rule_id ? data.rule : r
        ));
        setEditingRule(null);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to save rule');
      }
    } catch (err) {
      console.error('Failed to save rule:', err);
      alert('Failed to save rule');
    } finally {
      setSaving(false);
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
              <th className="w-8 px-4 py-3"></th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Rule</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Type</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Drug Target</th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Risks</th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Severity</th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRules.map((rule) => (
              <>
              <tr key={rule.rule_id} className="border-b border-[#1e3a5f]/50 hover:bg-[#1e3a5f]/30">
                <td className="px-4 py-3">
                  <button
                    onClick={() => setExpandedRule(expandedRule === rule.rule_id ? null : rule.rule_id)}
                    className="p-1 hover:bg-[#1e3a5f] rounded text-slate-400"
                  >
                    {expandedRule === rule.rule_id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </td>
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
                  {rule.total_risks && rule.total_risks > 0 ? (
                    <span className="text-sm font-medium text-amber-400">{rule.total_risks}</span>
                  ) : (
                    <span className="text-sm text-slate-500">0</span>
                  )}
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
                      onClick={() => setEditingRule({ ...rule })}
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
              {/* Expanded Row with Pharmacy Stats */}
              {expandedRule === rule.rule_id && (
                <tr className="bg-[#0a1628]">
                  <td colSpan={8} className="px-4 py-4">
                    <div className="mb-3">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase">
                        Pharmacy Audit Risks ({rule.total_risks || 0} total, {rule.total_patients || 0} patients, ${((rule.total_exposure || 0) / 1000).toFixed(1)}k exposure)
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                      {pharmacies.map((pharmacy) => {
                        const stats = rule.pharmacy_stats?.find(p => p.pharmacy_id === pharmacy.pharmacy_id);
                        return (
                          <div
                            key={pharmacy.pharmacy_id}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${
                              stats && stats.risk_count > 0
                                ? 'bg-amber-500/10 border-amber-500/30'
                                : 'bg-[#0d2137] border-[#1e3a5f]'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-white truncate">{pharmacy.pharmacy_name}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              {stats && stats.risk_count > 0 ? (
                                <>
                                  <span className="text-slate-400">{stats.risk_count} risks</span>
                                  <span className="text-slate-500">{stats.patient_count} pts</span>
                                  <span className="text-amber-400">${(stats.total_exposure / 1000).toFixed(1)}k</span>
                                </>
                              ) : (
                                <span className="text-slate-500">0 risks</span>
                              )}
                              <button
                                onClick={() => scanPharmacyForRule(rule.rule_id, pharmacy.pharmacy_id, pharmacy.pharmacy_name)}
                                disabled={scanningPharmacy === pharmacy.pharmacy_id}
                                className="p-1 hover:bg-amber-500/20 rounded text-slate-400 hover:text-amber-400 transition-colors disabled:opacity-50"
                                title="Scan this pharmacy"
                              >
                                {scanningPharmacy === pharmacy.pharmacy_id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Zap className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {pharmacies.length === 0 && (
                        <p className="text-xs text-slate-500 col-span-3">No pharmacies available</p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              </>
            ))}
          </tbody>
        </table>
        {filteredRules.length === 0 && (
          <div className="text-center py-8 text-slate-400">No audit rules found</div>
        )}
      </div>

      {/* Edit Modal */}
      {editingRule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[#1e3a5f]">
              <h2 className="text-lg font-semibold text-white">Edit Audit Rule</h2>
              <button
                onClick={() => setEditingRule(null)}
                className="p-1 hover:bg-[#1e3a5f] rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Rule Name</label>
                  <input
                    type="text"
                    value={editingRule.rule_name}
                    onChange={(e) => setEditingRule({ ...editingRule, rule_name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1e3a5f] border border-[#2a4a6f] rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Rule Code</label>
                  <input
                    type="text"
                    value={editingRule.rule_code}
                    onChange={(e) => setEditingRule({ ...editingRule, rule_code: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1e3a5f] border border-[#2a4a6f] rounded-lg text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Description</label>
                <textarea
                  value={editingRule.rule_description || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, rule_description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-[#1e3a5f] border border-[#2a4a6f] rounded-lg text-sm text-white"
                />
              </div>

              {/* Type and Severity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Rule Type</label>
                  <select
                    value={editingRule.rule_type}
                    onChange={(e) => setEditingRule({ ...editingRule, rule_type: e.target.value as AuditRule['rule_type'] })}
                    className="w-full px-3 py-2 bg-[#1e3a5f] border border-[#2a4a6f] rounded-lg text-sm text-white"
                  >
                    <option value="quantity_mismatch">Quantity Mismatch</option>
                    <option value="days_supply_mismatch">Days Supply Mismatch</option>
                    <option value="daw_violation">DAW Violation</option>
                    <option value="sig_quantity_mismatch">Sig Quantity Mismatch</option>
                    <option value="high_gp_risk">High GP Risk</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Severity</label>
                  <select
                    value={editingRule.severity}
                    onChange={(e) => setEditingRule({ ...editingRule, severity: e.target.value as AuditRule['severity'] })}
                    className="w-full px-3 py-2 bg-[#1e3a5f] border border-[#2a4a6f] rounded-lg text-sm text-white"
                  >
                    <option value="critical">Critical</option>
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                  </select>
                </div>
              </div>

              {/* Drug Target */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Drug Keywords (comma separated)</label>
                <input
                  type="text"
                  value={editingRule.drug_keywords?.join(', ') || ''}
                  onChange={(e) => setEditingRule({
                    ...editingRule,
                    drug_keywords: e.target.value ? e.target.value.split(',').map(s => s.trim()) : null
                  })}
                  placeholder="e.g., LISINOPRIL, METFORMIN"
                  className="w-full px-3 py-2 bg-[#1e3a5f] border border-[#2a4a6f] rounded-lg text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">NDC Pattern</label>
                <input
                  type="text"
                  value={editingRule.ndc_pattern || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, ndc_pattern: e.target.value || null })}
                  placeholder="e.g., 00378%"
                  className="w-full px-3 py-2 bg-[#1e3a5f] border border-[#2a4a6f] rounded-lg text-sm text-white font-mono"
                />
              </div>

              {/* Quantity Rules */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Expected Qty</label>
                  <input
                    type="number"
                    value={editingRule.expected_quantity ?? ''}
                    onChange={(e) => setEditingRule({ ...editingRule, expected_quantity: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-2 bg-[#1e3a5f] border border-[#2a4a6f] rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Min Qty</label>
                  <input
                    type="number"
                    value={editingRule.min_quantity ?? ''}
                    onChange={(e) => setEditingRule({ ...editingRule, min_quantity: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-2 bg-[#1e3a5f] border border-[#2a4a6f] rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Max Qty</label>
                  <input
                    type="number"
                    value={editingRule.max_quantity ?? ''}
                    onChange={(e) => setEditingRule({ ...editingRule, max_quantity: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-2 bg-[#1e3a5f] border border-[#2a4a6f] rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Qty Tolerance</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRule.quantity_tolerance}
                    onChange={(e) => setEditingRule({ ...editingRule, quantity_tolerance: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#1e3a5f] border border-[#2a4a6f] rounded-lg text-sm text-white"
                  />
                </div>
              </div>

              {/* Days Supply */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Min Days Supply</label>
                  <input
                    type="number"
                    value={editingRule.min_days_supply ?? ''}
                    onChange={(e) => setEditingRule({ ...editingRule, min_days_supply: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-2 bg-[#1e3a5f] border border-[#2a4a6f] rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Max Days Supply</label>
                  <input
                    type="number"
                    value={editingRule.max_days_supply ?? ''}
                    onChange={(e) => setEditingRule({ ...editingRule, max_days_supply: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-2 bg-[#1e3a5f] border border-[#2a4a6f] rounded-lg text-sm text-white"
                  />
                </div>
              </div>

              {/* DAW and GP */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Allowed DAW Codes (comma separated)</label>
                  <input
                    type="text"
                    value={editingRule.allowed_daw_codes?.join(', ') || ''}
                    onChange={(e) => setEditingRule({
                      ...editingRule,
                      allowed_daw_codes: e.target.value ? e.target.value.split(',').map(s => s.trim()) : null
                    })}
                    placeholder="e.g., 0, 1, 4"
                    className="w-full px-3 py-2 bg-[#1e3a5f] border border-[#2a4a6f] rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">GP Threshold ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRule.gp_threshold}
                    onChange={(e) => setEditingRule({ ...editingRule, gp_threshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#1e3a5f] border border-[#2a4a6f] rounded-lg text-sm text-white"
                  />
                </div>
              </div>

              {/* Audit Risk Score and Toggles */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Audit Risk Score</label>
                  <input
                    type="number"
                    value={editingRule.audit_risk_score ?? ''}
                    onChange={(e) => setEditingRule({ ...editingRule, audit_risk_score: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-2 bg-[#1e3a5f] border border-[#2a4a6f] rounded-lg text-sm text-white"
                  />
                </div>
                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingRule.has_generic_available || false}
                      onChange={(e) => setEditingRule({ ...editingRule, has_generic_available: e.target.checked })}
                      className="w-4 h-4 rounded bg-[#1e3a5f] border-[#2a4a6f]"
                    />
                    <span className="text-sm text-slate-300">Generic Available</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingRule.is_enabled}
                      onChange={(e) => setEditingRule({ ...editingRule, is_enabled: e.target.checked })}
                      className="w-4 h-4 rounded bg-[#1e3a5f] border-[#2a4a6f]"
                    />
                    <span className="text-sm text-slate-300">Enabled</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-[#1e3a5f]">
              <button
                onClick={() => setEditingRule(null)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveRule}
                disabled={saving}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
