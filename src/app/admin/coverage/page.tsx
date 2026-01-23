'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  RefreshCw,
  Zap,
  Loader2,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface ScanResult {
  triggerId: string;
  triggerName: string;
  triggerType: string;
  verifiedCount: number;
  topBins: {
    bin: string;
    group: string;
    bestDrug: string;
    avgMargin: string;
  }[];
}

interface ScanSummary {
  totalTriggers: number;
  triggersWithMatches: number;
  triggersWithNoMatches: number;
  minMarginUsed: number;
  dmeMinMarginUsed: number;
}

interface NoMatchTrigger {
  triggerId: string;
  triggerName: string;
  reason: string;
}

export default function CoverageScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    summary: ScanSummary;
    results: ScanResult[];
    noMatches: NoMatchTrigger[];
  } | null>(null);
  const [triggers, setTriggers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTriggers();
  }, []);

  async function fetchTriggers() {
    setLoading(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/triggers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTriggers(data.triggers || []);
      }
    } catch (err) {
      console.error('Failed to fetch triggers:', err);
    } finally {
      setLoading(false);
    }
  }

  async function runBulkScan() {
    setScanning(true);
    setScanResult(null);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/triggers/scan-all-coverage`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setScanResult(data);
        fetchTriggers(); // Refresh triggers to show updated data
      } else {
        const error = await res.json();
        alert('Scan failed: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to run scan:', err);
      alert('Failed to run coverage scan');
    } finally {
      setScanning(false);
    }
  }

  async function runSingleScan(triggerId: string) {
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/triggers/${triggerId}/scan-coverage`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        fetchTriggers(); // Refresh
      } else {
        const error = await res.json();
        alert('Scan failed: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to scan:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Coverage Scanner</h1>
            <p className="text-sm text-slate-400">
              Scan triggers across all pharmacies to verify BIN/GROUP coverage
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchTriggers}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={runBulkScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {scanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Scan All Coverage
              </>
            )}
          </button>
        </div>
      </div>

      {/* Scan Results */}
      {scanResult && (
        <div className="bg-[#0d2137] border border-emerald-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Scan Results</h2>
            <button
              onClick={() => setScanResult(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-[#0a1628] rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-white">{scanResult.summary.totalTriggers}</p>
              <p className="text-xs text-slate-400">Total Triggers</p>
            </div>
            <div className="bg-[#0a1628] rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{scanResult.summary.triggersWithMatches}</p>
              <p className="text-xs text-slate-400">With Matches</p>
            </div>
            <div className="bg-[#0a1628] rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{scanResult.summary.triggersWithNoMatches}</p>
              <p className="text-xs text-slate-400">No Matches</p>
            </div>
            <div className="bg-[#0a1628] rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-slate-300">${scanResult.summary.minMarginUsed}</p>
              <p className="text-xs text-slate-400">Min Margin (Rx)</p>
            </div>
            <div className="bg-[#0a1628] rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-slate-300">${scanResult.summary.dmeMinMarginUsed}</p>
              <p className="text-xs text-slate-400">Min Margin (DME)</p>
            </div>
          </div>

          {/* DME/NDC Results */}
          {scanResult.results.filter(r => r.triggerType === 'ndc_optimization').length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-3">
                DME Best Products Found Per BIN/Group
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {scanResult.results.filter(r => r.triggerType === 'ndc_optimization').map((r) => (
                  <div key={r.triggerId} className="p-3 bg-teal-500/10 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{r.triggerName}</span>
                      <span className="text-xs text-teal-400">{r.verifiedCount} BIN/Groups</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {r.topBins.map((b, i) => (
                        <div key={i} className="bg-[#0d2137] p-2 rounded">
                          <div className="text-slate-400">{b.bin}/{b.group || 'ALL'}</div>
                          <div className="text-emerald-400 font-medium">${b.avgMargin}</div>
                          <div className="text-white truncate" title={b.bestDrug}>{b.bestDrug}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Matches */}
          {scanResult.noMatches.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">
                Triggers Without Matches
              </h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {scanResult.noMatches.map((nm) => (
                  <div key={nm.triggerId} className="flex items-center justify-between text-sm py-2 px-3 bg-red-500/10 rounded">
                    <span className="text-white">{nm.triggerName}</span>
                    <span className="text-xs text-slate-400">{nm.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Triggers Status */}
      <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Trigger Coverage Status</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {triggers.filter(t => t.is_enabled).map((trigger) => {
            const hasCoverage = (trigger.bin_values?.length || 0) > 0;
            const verifiedCount = trigger.bin_values?.filter((bv: any) => bv.coverageStatus === 'verified').length || 0;

            return (
              <div
                key={trigger.trigger_id}
                className={`p-4 rounded-lg border ${
                  hasCoverage ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-[#1e3a5f] bg-[#0a1628]'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-white">{trigger.display_name}</p>
                    <p className="text-xs text-slate-500">{trigger.trigger_type.replace(/_/g, ' ')}</p>
                  </div>
                  {hasCoverage ? (
                    <Check className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1e3a5f]">
                  <span className="text-xs text-slate-400">
                    {trigger.bin_values?.length || 0} BINs ({verifiedCount} verified)
                  </span>
                  <button
                    onClick={() => runSingleScan(trigger.trigger_id)}
                    className="text-xs text-teal-400 hover:text-teal-300"
                  >
                    Scan
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
