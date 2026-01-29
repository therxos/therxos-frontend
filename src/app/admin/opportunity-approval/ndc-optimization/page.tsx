'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  Loader2,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface NDCOpportunity {
  base_drug: string;
  current_drug: string;
  current_ndc: string;
  better_drug: string;
  better_ndc: string;
  insurance_bin: string;
  insurance_group: string | null;
  current_fills: number;
  current_patients: number;
  current_avg_gp: number;
  current_acq_cost: number;
  current_reimbursement: number;
  better_fills: number;
  better_avg_gp: number;
  better_acq_cost: number;
  better_reimbursement: number;
  gp_difference: number;
  annual_gain_per_patient: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatCurrencyExact(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export default function NDCOptimizationPage() {
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<NDCOpportunity[] | null>(null);

  const [showConfig, setShowConfig] = useState(false);
  const [minFills, setMinFills] = useState(3);
  const [minGPDiff, setMinGPDiff] = useState(3);
  const [lookbackDays, setLookbackDays] = useState(180);

  async function fetchData() {
    setLoading(true);
    setOpportunities(null);
    try {
      const token = localStorage.getItem('therxos_token');
      const params = new URLSearchParams({
        minFills: String(minFills),
        minGPDifference: String(minGPDiff),
        lookbackDays: String(lookbackDays),
        limit: '200',
      });
      const res = await fetch(`${API_URL}/api/admin/ndc-optimization?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOpportunities(data.opportunities || []);
      } else {
        const error = await res.json();
        alert('Failed: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to fetch NDC optimization:', err);
      alert('Failed to load NDC optimization data');
    } finally {
      setLoading(false);
    }
  }

  const totalAnnualGain = opportunities?.reduce((sum, o) => sum + (o.annual_gain_per_patient * o.current_patients), 0) || 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">NDC Optimization</h1>
            <p className="text-sm text-slate-400">
              Find same-drug NDCs with better reimbursement on the same BIN/GROUP
            </p>
          </div>
        </div>
        <Link
          href="/admin/opportunity-approval"
          className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Queue
        </Link>
      </div>

      {/* What this shows */}
      <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4 mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">What this shows</h3>
        <p className="text-xs text-slate-400">
          When different NDCs of the same drug have different gross profit on the same BIN/GROUP, it usually means one NDC
          is reimbursing by AWP at a higher rate. Switching to the better-reimbursing NDC is a simple change that can
          significantly improve margins without changing the patient's therapy.
        </p>
      </div>

      {/* Threshold Config */}
      <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl mb-6">
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="w-full flex items-center justify-between p-4 text-sm font-medium text-slate-300 hover:text-white transition-colors"
        >
          <span>Thresholds</span>
          {showConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showConfig && (
          <div className="px-4 pb-4 grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Min fills per NDC</label>
              <input type="number" value={minFills} onChange={e => setMinFills(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Min GP difference ($)</label>
              <input type="number" step="0.5" value={minGPDiff} onChange={e => setMinGPDiff(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Lookback (days)</label>
              <input type="number" value={lookbackDays} onChange={e => setLookbackDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Action */}
      <div className="mb-6">
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Layers className="w-4 h-4" />
              Find NDC Opportunities
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {opportunities !== null && (
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#1e3a5f] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-white">
                NDC Optimization Opportunities ({opportunities.length})
              </h3>
              {opportunities.length > 0 && (
                <span className="text-xs text-slate-400">
                  Est. total annual gain: <span className="text-emerald-400 font-semibold">{formatCurrency(totalAnnualGain)}</span>
                </span>
              )}
            </div>
          </div>
          {opportunities.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-300">No NDC optimization opportunities found at current thresholds.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-[#1e3a5f]">
                    <th className="text-left py-2 px-2">Current Drug</th>
                    <th className="text-left py-2 px-2">Current NDC</th>
                    <th className="text-left py-2 px-2">Better Drug</th>
                    <th className="text-left py-2 px-2">Better NDC</th>
                    <th className="text-left py-2 px-2">BIN/GROUP</th>
                    <th className="text-right py-2 px-2">Current GP</th>
                    <th className="text-right py-2 px-2">Better GP</th>
                    <th className="text-right py-2 px-2">Difference</th>
                    <th className="text-right py-2 px-2">Patients</th>
                    <th className="text-right py-2 px-2">Annual/Pt</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.map((o, i) => (
                    <tr key={i} className="border-b border-[#1e3a5f]/50 hover:bg-[#1e3a5f]/20">
                      <td className="py-2 px-2 text-white font-medium">{o.current_drug}</td>
                      <td className="py-2 px-2 text-slate-400 font-mono text-[10px]">{o.current_ndc}</td>
                      <td className="py-2 px-2 text-emerald-400 font-medium">{o.better_drug}</td>
                      <td className="py-2 px-2 text-emerald-400 font-mono text-[10px]">{o.better_ndc}</td>
                      <td className="py-2 px-2 text-slate-300">{o.insurance_bin}/{o.insurance_group || 'ALL'}</td>
                      <td className="py-2 px-2 text-right text-red-400">{formatCurrencyExact(o.current_avg_gp)}</td>
                      <td className="py-2 px-2 text-right text-emerald-400">{formatCurrencyExact(o.better_avg_gp)}</td>
                      <td className="py-2 px-2 text-right text-emerald-400 font-semibold">+{formatCurrencyExact(o.gp_difference)}</td>
                      <td className="py-2 px-2 text-right text-white">{o.current_patients}</td>
                      <td className="py-2 px-2 text-right text-emerald-400 font-semibold">{formatCurrency(o.annual_gain_per_patient)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
