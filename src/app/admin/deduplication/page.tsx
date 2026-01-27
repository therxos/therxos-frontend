'use client';

import { useState, useEffect } from 'react';
import {
  Copy,
  Trash2,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Users,
  DollarSign,
  Filter,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Duplicate {
  patient_id: string;
  pharmacy_id: string;
  patient_name: string;
  dob: string;
  pharmacy_name: string;
  category: string;
  count: number;
  opp_ids: string[];
  drugs: string[];
  values: number[];
}

interface DedupeResult {
  category: string;
  patientId: string;
  pharmacyId: string;
  keptOpportunityId: string;
  keptValue: number;
  removedCount: number;
  removedMargin: number;
}

interface Summary {
  patientsAffected: number;
  totalDuplicateOpportunities: number;
  inflatedMargin: string;
}

export default function DeduplicationPage() {
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [deduplicating, setDeduplicating] = useState(false);
  const [pharmacyFilter, setPharmacyFilter] = useState<string>('');
  const [pharmacies, setPharmacies] = useState<{ pharmacy_id: string; pharmacy_name: string }[]>([]);
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [lastDedupeResult, setLastDedupeResult] = useState<{
    dryRun: boolean;
    summary: any;
    message: string;
  } | null>(null);

  useEffect(() => {
    fetchPharmacies();
    fetchDuplicates();
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

  async function fetchDuplicates() {
    setLoading(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const url = pharmacyFilter
        ? `${API_URL}/api/admin/opportunities/duplicates?pharmacyId=${pharmacyFilter}`
        : `${API_URL}/api/admin/opportunities/duplicates`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setDuplicates(data.duplicates || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Failed to fetch duplicates:', err);
    } finally {
      setLoading(false);
    }
  }

  async function runDeduplication(dryRun: boolean) {
    setDeduplicating(true);
    setLastDedupeResult(null);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/opportunities/deduplicate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pharmacyId: pharmacyFilter || undefined,
          dryRun,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLastDedupeResult(data);

        if (!dryRun) {
          // Refresh the list after actual deduplication
          fetchDuplicates();
        }
      } else {
        const error = await res.json();
        alert('Deduplication failed: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Deduplication error:', err);
      alert('Failed to run deduplication');
    } finally {
      setDeduplicating(false);
    }
  }

  function formatCurrency(value: number | string | null | undefined): string {
    const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
    if (isNaN(num)) return '$0';
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Group duplicates by category
  const groupedByCategory = duplicates.reduce((acc, dup) => {
    if (!acc[dup.category]) {
      acc[dup.category] = [];
    }
    acc[dup.category].push(dup);
    return acc;
  }, {} as Record<string, Duplicate[]>);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Copy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Opportunity Deduplication</h1>
            <p className="text-sm text-slate-400">
              Find and remove duplicate opportunities to avoid inflated values
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchDuplicates()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1">
          <select
            value={pharmacyFilter}
            onChange={(e) => {
              setPharmacyFilter(e.target.value);
              setTimeout(fetchDuplicates, 100);
            }}
            className="w-full max-w-xs px-4 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
          >
            <option value="">All Pharmacies</option>
            {pharmacies.map((p) => (
              <option key={p.pharmacy_id} value={p.pharmacy_id}>
                {p.pharmacy_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{summary.patientsAffected}</p>
                <p className="text-xs text-slate-400">Patients with Duplicates</p>
              </div>
            </div>
          </div>

          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Copy className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{summary.totalDuplicateOpportunities}</p>
                <p className="text-xs text-slate-400">Duplicate Opportunities</p>
              </div>
            </div>
          </div>

          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{formatCurrency(summary.inflatedMargin)}</p>
                <p className="text-xs text-slate-400">Inflated Margin Value</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {summary && summary.totalDuplicateOpportunities > 0 && (
        <div className="bg-[#0d2137] border border-amber-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-white mb-1">
                {summary.totalDuplicateOpportunities} duplicate opportunities found
              </h3>
              <p className="text-xs text-slate-400 mb-3">
                These duplicates inflate your total opportunity value by {formatCurrency(summary.inflatedMargin)}.
                Deduplication will keep the highest-value opportunity for each patient in each therapeutic category.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => runDeduplication(true)}
                  disabled={deduplicating}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Search className="w-4 h-4" />
                  {deduplicating ? 'Analyzing...' : 'Preview Cleanup'}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to remove ${summary.totalDuplicateOpportunities} duplicate opportunities?\n\nThis will reduce the total opportunity value by ${formatCurrency(summary.inflatedMargin)}.\n\nThis action cannot be undone.`)) {
                      runDeduplication(false);
                    }
                  }}
                  disabled={deduplicating}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {deduplicating ? 'Processing...' : 'Remove Duplicates'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dedupe Result */}
      {lastDedupeResult && (
        <div className={`border rounded-xl p-4 mb-6 ${
          lastDedupeResult.dryRun
            ? 'bg-blue-500/10 border-blue-500/30'
            : 'bg-emerald-500/10 border-emerald-500/30'
        }`}>
          <div className="flex items-start gap-3">
            {lastDedupeResult.dryRun ? (
              <Search className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <h3 className={`text-sm font-medium mb-1 ${
                lastDedupeResult.dryRun ? 'text-blue-400' : 'text-emerald-400'
              }`}>
                {lastDedupeResult.dryRun ? 'Preview Results' : 'Cleanup Complete'}
              </h3>
              <p className="text-sm text-white">{lastDedupeResult.message}</p>
              <div className="mt-2 text-xs text-slate-400">
                <span>Categories checked: {lastDedupeResult.summary.categoriesChecked}</span>
                <span className="mx-2">•</span>
                <span>Patients affected: {lastDedupeResult.summary.patientsAffected}</span>
                <span className="mx-2">•</span>
                <span>Opportunities {lastDedupeResult.dryRun ? 'to remove' : 'removed'}: {lastDedupeResult.summary.opportunitiesRemoved}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicates by Category */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        </div>
      ) : Object.keys(groupedByCategory).length === 0 ? (
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-8 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">No Duplicates Found</h3>
          <p className="text-sm text-slate-400">
            All opportunities are unique within their therapeutic categories.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByCategory).map(([category, dups]) => (
            <div key={category} className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1e3a5f] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-medium text-white">{category}</h3>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                    {dups.length} patients
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {dups.reduce((sum, d) => sum + (d.count - 1), 0)} duplicates
                </span>
              </div>

              <div className="divide-y divide-[#1e3a5f]">
                {dups.map((dup) => (
                  <div key={`${dup.patient_id}-${dup.category}`} className="p-4">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedPatient(
                        expandedPatient === `${dup.patient_id}-${dup.category}`
                          ? null
                          : `${dup.patient_id}-${dup.category}`
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-sm font-medium text-white">{dup.patient_name}</p>
                          <p className="text-xs text-slate-400">
                            DOB: {formatDate(dup.dob)} • {dup.pharmacy_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-amber-400">{dup.count} opportunities</p>
                          <p className="text-xs text-slate-400">
                            Inflated by {formatCurrency(dup.values.slice(1).reduce((s, v) => s + v, 0))}
                          </p>
                        </div>
                        {expandedPatient === `${dup.patient_id}-${dup.category}` ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {expandedPatient === `${dup.patient_id}-${dup.category}` && (
                      <div className="mt-3 pl-4 border-l-2 border-[#1e3a5f] space-y-2">
                        {dup.drugs.map((drug, i) => (
                          <div
                            key={i}
                            className={`flex items-center justify-between p-2 rounded ${
                              i === 0
                                ? 'bg-emerald-500/10 border border-emerald-500/30'
                                : 'bg-red-500/10 border border-red-500/30'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {i === 0 ? (
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Trash2 className="w-4 h-4 text-red-400" />
                              )}
                              <span className={`text-sm ${i === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {drug}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${i === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatCurrency(dup.values[i])}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                i === 0
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {i === 0 ? 'Keep' : 'Remove'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
