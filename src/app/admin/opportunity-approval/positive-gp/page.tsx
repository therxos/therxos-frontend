'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Loader2,
  ArrowLeft,
  DollarSign,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Winner {
  base_drug_name: string;
  drug_name: string;
  insurance_bin: string;
  insurance_group: string | null;
  fill_count: number;
  patient_count: number;
  pharmacy_count: number;
  avg_gp: number;
  total_profit: number;
  best_gp: number;
  avg_acq_cost: number;
  avg_reimbursement: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatCurrencyExact(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export default function PositiveGPScanPage() {
  const [loading, setLoading] = useState(false);
  const [winners, setWinners] = useState<Winner[] | null>(null);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalPatients, setTotalPatients] = useState(0);

  const [showConfig, setShowConfig] = useState(false);
  const [minFills, setMinFills] = useState(3);
  const [minAvgGP, setMinAvgGP] = useState(10);
  const [lookbackDays, setLookbackDays] = useState(180);

  async function fetchWinners() {
    setLoading(true);
    setWinners(null);
    try {
      const token = localStorage.getItem('therxos_token');
      const params = new URLSearchParams({
        minFills: String(minFills),
        minAvgGP: String(minAvgGP),
        lookbackDays: String(lookbackDays),
        limit: '200',
      });
      const res = await fetch(`${API_URL}/api/admin/positive-gp-winners?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWinners(data.winners || []);
        setTotalProfit(data.totalProfit || 0);
        setTotalPatients(data.totalPatients || 0);
      } else {
        const error = await res.json();
        alert('Failed: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to fetch winners:', err);
      alert('Failed to load positive GP data');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Positive GP Scanner</h1>
            <p className="text-sm text-slate-400">
              Find top-performing drugs by gross profit per BIN/GROUP
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
          Drugs with the highest average gross profit per fill, grouped by BIN/GROUP. These are your best-performing scripts -
          use this data to identify which drugs to steer patients toward within the same therapeutic class when doing therapeutic interchanges.
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
              <label className="block text-xs text-slate-400 mb-1">Min fills</label>
              <input type="number" value={minFills} onChange={e => setMinFills(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Min avg GP ($)</label>
              <input type="number" step="1" value={minAvgGP} onChange={e => setMinAvgGP(Number(e.target.value))}
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
          onClick={fetchWinners}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4" />
              Find Top Winners
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {winners !== null && (
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#1e3a5f] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-white">
                Top Winners ({winners.length})
              </h3>
              {winners.length > 0 && (
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-emerald-400" />
                    Total profit: <span className="text-emerald-400 font-semibold">{formatCurrency(totalProfit)}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {totalPatients} patients
                  </span>
                </div>
              )}
            </div>
          </div>
          {winners.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-300">No drugs matched the current thresholds.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-[#1e3a5f]">
                    <th className="text-left py-2 px-3">Drug Name</th>
                    <th className="text-left py-2 px-3">BIN</th>
                    <th className="text-left py-2 px-3">GROUP</th>
                    <th className="text-right py-2 px-3">Fills</th>
                    <th className="text-right py-2 px-3">Patients</th>
                    <th className="text-right py-2 px-3">Avg GP</th>
                    <th className="text-right py-2 px-3">Total Profit</th>
                    <th className="text-right py-2 px-3">Avg Acq Cost</th>
                    <th className="text-right py-2 px-3">Avg Reimb</th>
                    <th className="text-right py-2 px-3">Best GP</th>
                  </tr>
                </thead>
                <tbody>
                  {winners.map((w, i) => (
                    <tr key={i} className="border-b border-[#1e3a5f]/50 hover:bg-[#1e3a5f]/20">
                      <td className="py-2 px-3 text-white font-medium">{w.drug_name}</td>
                      <td className="py-2 px-3 text-slate-300">{w.insurance_bin}</td>
                      <td className="py-2 px-3 text-slate-300">{w.insurance_group || '-'}</td>
                      <td className="py-2 px-3 text-right text-slate-300">{w.fill_count}</td>
                      <td className="py-2 px-3 text-right text-slate-300">{w.patient_count}</td>
                      <td className="py-2 px-3 text-right text-emerald-400 font-semibold">{formatCurrencyExact(w.avg_gp)}</td>
                      <td className="py-2 px-3 text-right text-emerald-400 font-semibold">{formatCurrency(w.total_profit)}</td>
                      <td className="py-2 px-3 text-right text-slate-300">{formatCurrencyExact(w.avg_acq_cost)}</td>
                      <td className="py-2 px-3 text-right text-slate-300">{formatCurrencyExact(w.avg_reimbursement)}</td>
                      <td className="py-2 px-3 text-right text-emerald-400">{formatCurrencyExact(w.best_gp)}</td>
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
