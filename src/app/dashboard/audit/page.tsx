'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, AlertCircle, Info, Check, X, Eye, Filter, Building2 } from 'lucide-react';
import { useAuthStore } from '@/store';

interface Pharmacy {
  pharmacy_id: string;
  pharmacy_name: string;
  client_name: string;
}

interface AuditFlag {
  flag_id: string;
  patient_id: string;
  patient_first_name: string;
  patient_last_name: string;
  rule_type: string;
  rule_name: string;
  rule_description: string;
  severity: 'critical' | 'warning' | 'info';
  drug_name: string;
  ndc: string;
  dispensed_quantity: number;
  days_supply: number;
  daw_code: string;
  gross_profit: number;
  violation_message: string;
  expected_value: string;
  actual_value: string;
  status: 'open' | 'reviewed' | 'resolved' | 'false_positive';
  dispensed_date: string;
  flagged_at: string;
}

const severityConfig = {
  critical: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/50' },
  warning: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/50' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/50' },
};

const statusConfig = {
  open: { label: 'Open', color: 'text-red-400', bg: 'bg-red-500/20' },
  reviewed: { label: 'Reviewed', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  resolved: { label: 'Resolved', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  false_positive: { label: 'False Positive', color: 'text-slate-400', bg: 'bg-slate-500/20' },
};

export default function AuditRisksPage() {
  const [flags, setFlags] = useState<AuditFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<{ byStatus: Record<string, number>; bySeverity: Record<string, number> }>({
    byStatus: {},
    bySeverity: {},
  });
  const [filter, setFilter] = useState<{ status: string; severity: string }>({ status: '', severity: '' });
  const [selectedFlag, setSelectedFlag] = useState<AuditFlag | null>(null);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string>('');
  const { token, user } = useAuthStore();

  const isSuperAdmin = user?.role === 'super_admin';
  const needsPharmacySelection = isSuperAdmin && !user?.pharmacyId;

  // Fetch pharmacies list for super admins
  useEffect(() => {
    if (needsPharmacySelection) {
      fetchPharmacies();
    }
  }, [needsPharmacySelection]);

  // Fetch flags when filter changes or pharmacy is selected
  useEffect(() => {
    if (!needsPharmacySelection || selectedPharmacyId) {
      fetchFlags();
    }
  }, [filter, selectedPharmacyId, needsPharmacySelection]);

  const fetchPharmacies = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/pharmacies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPharmacies(data.pharmacies || []);
        // Auto-select first pharmacy if available
        if (data.pharmacies?.length > 0) {
          setSelectedPharmacyId(data.pharmacies[0].pharmacy_id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch pharmacies:', error);
    }
  };

  const fetchFlags = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.severity) params.append('severity', filter.severity);

      // For super admins without a pharmacy, use selected pharmacy
      if (needsPharmacySelection && selectedPharmacyId) {
        params.append('pharmacyId', selectedPharmacyId);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/analytics/audit-flags?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setFlags(data.flags);
        setCounts(data.counts);
      }
    } catch (error) {
      console.error('Failed to fetch audit flags:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFlagStatus = async (flagId: string, status: string, notes?: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/analytics/audit-flags/${flagId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status, resolution_notes: notes }),
        }
      );

      if (response.ok) {
        fetchFlags();
        setSelectedFlag(null);
      }
    } catch (error) {
      console.error('Failed to update flag:', error);
    }
  };

  const totalOpen = counts.byStatus.open || 0;
  const totalCritical = counts.bySeverity.critical || 0;
  const totalWarning = counts.bySeverity.warning || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--teal-500)]"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Audit Risks</h1>
          <p className="text-slate-400">Monitor claims that may attract PBM audit scrutiny</p>
        </div>
        {needsPharmacySelection && pharmacies.length > 0 && (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              value={selectedPharmacyId}
              onChange={(e) => setSelectedPharmacyId(e.target.value)}
              className="bg-[var(--navy-700)] border border-[var(--navy-600)] rounded-lg px-3 py-2 text-white text-sm"
            >
              {pharmacies.map((pharmacy) => (
                <option key={pharmacy.pharmacy_id} value={pharmacy.pharmacy_id}>
                  {pharmacy.pharmacy_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalOpen}</p>
              <p className="text-sm text-slate-400">Open Flags</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalCritical}</p>
              <p className="text-sm text-slate-400">Critical</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalWarning}</p>
              <p className="text-sm text-slate-400">Warnings</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{counts.byStatus.resolved || 0}</p>
              <p className="text-sm text-slate-400">Resolved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="bg-[var(--navy-700)] border border-[var(--navy-600)] rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
            <option value="false_positive">False Positive</option>
          </select>
          <select
            value={filter.severity}
            onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
            className="bg-[var(--navy-700)] border border-[var(--navy-600)] rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>
      </div>

      {/* Flags List */}
      {flags.length === 0 ? (
        <div className="card p-12 text-center">
          <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Audit Flags</h3>
          <p className="text-slate-400">No audit risks have been detected yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => {
            const severity = severityConfig[flag.severity] || severityConfig.info;
            const status = statusConfig[flag.status] || statusConfig.open;
            const SeverityIcon = severity.icon;

            return (
              <div
                key={flag.flag_id}
                className={`card p-4 border-l-4 ${severity.border} hover:bg-[var(--navy-700)] transition-colors cursor-pointer`}
                onClick={() => setSelectedFlag(flag)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg ${severity.bg} flex items-center justify-center flex-shrink-0 mt-1`}>
                      <SeverityIcon className={`w-4 h-4 ${severity.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">
                          {flag.patient_first_name} {flag.patient_last_name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 mb-1">{flag.violation_message}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{flag.drug_name}</span>
                        <span>Dispensed: {new Date(flag.dispensed_date).toLocaleDateString()}</span>
                        {flag.gross_profit && <span>GP: ${Number(flag.gross_profit).toFixed(2)}</span>}
                      </div>
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedFlag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--navy-800)] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--navy-700)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Audit Flag Details</h2>
                <button onClick={() => setSelectedFlag(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-slate-500 uppercase">Patient</label>
                <p className="text-white">{selectedFlag.patient_first_name} {selectedFlag.patient_last_name}</p>
              </div>

              <div>
                <label className="text-xs text-slate-500 uppercase">Drug</label>
                <p className="text-white">{selectedFlag.drug_name}</p>
              </div>

              <div>
                <label className="text-xs text-slate-500 uppercase">Violation</label>
                <p className="text-white">{selectedFlag.violation_message}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 uppercase">Expected</label>
                  <p className="text-white">{selectedFlag.expected_value || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase">Actual</label>
                  <p className="text-white">{selectedFlag.actual_value || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-500 uppercase">Qty</label>
                  <p className="text-white">{selectedFlag.dispensed_quantity}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase">Days Supply</label>
                  <p className="text-white">{selectedFlag.days_supply}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase">DAW</label>
                  <p className="text-white">{selectedFlag.daw_code || 'N/A'}</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 uppercase">Gross Profit</label>
                <p className="text-white">${Number(selectedFlag.gross_profit || 0).toFixed(2)}</p>
              </div>

              <div>
                <label className="text-xs text-slate-500 uppercase">Dispensed Date</label>
                <p className="text-white">{new Date(selectedFlag.dispensed_date).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="p-6 border-t border-[var(--navy-700)] flex gap-3">
              {selectedFlag.status === 'open' && (
                <>
                  <button
                    onClick={() => updateFlagStatus(selectedFlag.flag_id, 'reviewed')}
                    className="flex-1 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30"
                  >
                    Mark Reviewed
                  </button>
                  <button
                    onClick={() => updateFlagStatus(selectedFlag.flag_id, 'resolved')}
                    className="flex-1 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={() => updateFlagStatus(selectedFlag.flag_id, 'false_positive')}
                    className="flex-1 py-2 bg-slate-500/20 text-slate-400 rounded-lg hover:bg-slate-500/30"
                  >
                    False Positive
                  </button>
                </>
              )}
              {selectedFlag.status === 'reviewed' && (
                <>
                  <button
                    onClick={() => updateFlagStatus(selectedFlag.flag_id, 'resolved')}
                    className="flex-1 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={() => updateFlagStatus(selectedFlag.flag_id, 'false_positive')}
                    className="flex-1 py-2 bg-slate-500/20 text-slate-400 rounded-lg hover:bg-slate-500/30"
                  >
                    False Positive
                  </button>
                </>
              )}
              {(selectedFlag.status === 'resolved' || selectedFlag.status === 'false_positive') && (
                <button
                  onClick={() => updateFlagStatus(selectedFlag.flag_id, 'open')}
                  className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                >
                  Reopen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
