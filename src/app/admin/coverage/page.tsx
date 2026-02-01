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
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function formatNdc(ndc: string | null | undefined): string {
  if (!ndc) return '';
  const clean = ndc.replace(/\D/g, '');
  if (clean.length === 11) return `${clean.slice(0, 5)}-${clean.slice(5, 9)}-${clean.slice(9)}`;
  if (clean.length === 10) return `0${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8)}`;
  return ndc;
}

interface DrugVariation {
  drugName: string;
  claimCount: number;
  ndcCount?: number;
  ndcs?: string[];
}

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
    avgQty?: string;
  }[];
  drugVariations?: DrugVariation[];
}

interface SingleScanResult {
  triggerId: string;
  triggerName: string;
  binCount: number;
  prescriptionCount: number;
  binValues: {
    bin: string;
    group: string;
    gpValue: number;
    avgQty: number;
    claimCount: number;
    bestDrugName: string;
    bestNdc: string;
    coverageStatus: string;
  }[];
  drugVariations?: DrugVariation[];
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
  const [scanningTrigger, setScanningTrigger] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{
    summary: ScanSummary;
    results: ScanResult[];
    noMatches: NoMatchTrigger[];
  } | null>(null);
  const [singleScanResult, setSingleScanResult] = useState<SingleScanResult | null>(null);
  const [triggers, setTriggers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTriggers, setExpandedTriggers] = useState<Set<string>>(new Set());
  const [expandedVariations, setExpandedVariations] = useState<Set<string>>(new Set());

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
    setSingleScanResult(null);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/triggers/verify-all-coverage`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setScanResult(data);
        fetchTriggers();
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
    setScanningTrigger(triggerId);
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
        const data = await res.json();
        setSingleScanResult(data);
        setScanResult(null);
        fetchTriggers();
      } else {
        const error = await res.json();
        alert('Scan failed: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to scan:', err);
    } finally {
      setScanningTrigger(null);
    }
  }

  function toggleExpanded(id: string) {
    setExpandedTriggers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleVariation(id: string) {
    setExpandedVariations(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
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
              Scan triggers to verify BIN/GROUP coverage and view drug name variations in claims data
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
                Scanning All...
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

      {/* Single Scan Result */}
      {singleScanResult && (
        <div className="bg-[#0d2137] border border-teal-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Scan: {singleScanResult.triggerName}
            </h2>
            <button onClick={() => setSingleScanResult(null)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-[#0a1628] rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-emerald-400">{singleScanResult.binCount}</p>
              <p className="text-xs text-slate-400">BIN/Groups Found</p>
            </div>
            <div className="bg-[#0a1628] rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-white">{singleScanResult.prescriptionCount}</p>
              <p className="text-xs text-slate-400">Total Claims</p>
            </div>
            <div className="bg-[#0a1628] rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-blue-400">{singleScanResult.drugVariations?.length || 0}</p>
              <p className="text-xs text-slate-400">Drug Name Variations</p>
            </div>
          </div>

          {/* Drug Name Variations */}
          {singleScanResult.drugVariations && singleScanResult.drugVariations.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-2">
                Drug Name Variations Found in Claims
              </h3>
              <div className="bg-[#0a1628] rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#1e3a5f]">
                      <th className="text-left px-3 py-2 text-slate-400 font-medium">Drug Name (as in claims)</th>
                      <th className="text-right px-3 py-2 text-slate-400 font-medium">Claims</th>
                      <th className="text-left px-3 py-2 text-slate-400 font-medium">NDCs (Product Identifiers)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {singleScanResult.drugVariations.map((v, i) => (
                      <tr key={i} className="border-b border-[#1e3a5f]/50 hover:bg-[#1e3a5f]/20">
                        <td className="px-3 py-2 text-white font-mono">{v.drugName}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{v.claimCount}</td>
                        <td className="px-3 py-2 text-slate-400">
                          {v.ndcs?.map((ndc, j) => (
                            <span key={j} className="inline-block bg-[#1e3a5f] text-slate-300 px-1.5 py-0.5 rounded mr-1 mb-0.5 font-mono">
                              {formatNdc(ndc)}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* BIN Values Table */}
          {singleScanResult.binValues.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                Covered BIN/Groups
              </h3>
              <div className="bg-[#0a1628] rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#0a1628]">
                    <tr className="border-b border-[#1e3a5f]">
                      <th className="text-left px-3 py-2 text-slate-400 font-medium">BIN</th>
                      <th className="text-left px-3 py-2 text-slate-400 font-medium">GROUP</th>
                      <th className="text-right px-3 py-2 text-slate-400 font-medium">30-Day GP</th>
                      <th className="text-right px-3 py-2 text-slate-400 font-medium">Avg Qty</th>
                      <th className="text-right px-3 py-2 text-slate-400 font-medium">Claims</th>
                      <th className="text-left px-3 py-2 text-slate-400 font-medium">Best Product</th>
                      <th className="text-left px-3 py-2 text-slate-400 font-medium">NDC (Product ID)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {singleScanResult.binValues.map((bv, i) => (
                      <tr key={i} className="border-b border-[#1e3a5f]/50 hover:bg-[#1e3a5f]/20">
                        <td className="px-3 py-2 text-white font-mono">{bv.bin}</td>
                        <td className="px-3 py-2 text-slate-300 font-mono">{bv.group || '-'}</td>
                        <td className="px-3 py-2 text-right text-emerald-400 font-semibold">${bv.gpValue.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{bv.avgQty?.toFixed(1) || '-'}</td>
                        <td className="px-3 py-2 text-right text-slate-400">{bv.claimCount}</td>
                        <td className="px-3 py-2 text-white truncate max-w-[200px]" title={bv.bestDrugName}>{bv.bestDrugName || '-'}</td>
                        <td className="px-3 py-2 text-slate-400 font-mono">{formatNdc(bv.bestNdc) || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk Scan Results */}
      {scanResult && (
        <div className="bg-[#0d2137] border border-emerald-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Bulk Scan Results</h2>
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

          {/* All Results with expandable drug variations */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {scanResult.results.map((r) => (
              <div key={r.triggerId} className={`rounded-lg border ${r.triggerType === 'ndc_optimization' ? 'border-teal-500/20 bg-teal-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5"
                  onClick={() => toggleExpanded(r.triggerId)}
                >
                  <div className="flex items-center gap-2">
                    {expandedTriggers.has(r.triggerId) ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    <span className="text-sm font-medium text-white">{r.triggerName}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[#1e3a5f] text-slate-400">
                      {r.triggerType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.drugVariations && r.drugVariations.length > 0 && (
                      <span className="text-xs text-blue-400">{r.drugVariations.length} name variations</span>
                    )}
                    <span className="text-xs text-emerald-400 font-medium">{r.verifiedCount} BIN/Groups</span>
                  </div>
                </div>

                {expandedTriggers.has(r.triggerId) && (
                  <div className="px-3 pb-3 space-y-3">
                    {/* Top BINs */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {r.topBins.map((b, i) => (
                        <div key={i} className="bg-[#0a1628] p-2 rounded">
                          <div className="text-slate-400 font-mono">{b.bin}/{b.group || 'ALL'}</div>
                          <div className="text-emerald-400 font-medium">${b.avgMargin}/mo</div>
                          <div className="text-white truncate" title={b.bestDrug}>{b.bestDrug}</div>
                          {b.avgQty && <div className="text-slate-500">Qty: {b.avgQty}</div>}
                        </div>
                      ))}
                    </div>

                    {/* Drug Variations */}
                    {r.drugVariations && r.drugVariations.length > 0 && (
                      <div>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleVariation(r.triggerId); }}
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-1"
                        >
                          {expandedVariations.has(r.triggerId) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          Drug Name Variations ({r.drugVariations.length})
                        </button>
                        {expandedVariations.has(r.triggerId) && (
                          <div className="bg-[#0a1628] rounded p-2 space-y-1">
                            {r.drugVariations.map((v, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-white font-mono">{v.drugName}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">{v.claimCount} claims</span>
                                  {v.ndcs?.map((ndc, j) => (
                                    <span key={j} className="text-slate-500 font-mono">{formatNdc(ndc)}</span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* No Matches */}
          {scanResult.noMatches.length > 0 && (
            <div className="mt-4">
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

      {/* Triggers Status Grid */}
      <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Trigger Coverage Status</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {triggers.filter(t => t.is_enabled).map((trigger) => {
            const hasCoverage = (trigger.bin_values?.length || 0) > 0;
            const verifiedCount = trigger.bin_values?.filter((bv: any) =>
              bv.coverageStatus === 'verified' || bv.coverage_status === 'verified'
            ).length || 0;
            const isScanning = scanningTrigger === trigger.trigger_id;

            return (
              <div
                key={trigger.trigger_id}
                className={`p-4 rounded-lg border ${
                  hasCoverage ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-[#1e3a5f] bg-[#0a1628]'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{trigger.display_name}</p>
                    <p className="text-xs text-slate-500">{trigger.trigger_type?.replace(/_/g, ' ')}</p>
                    {trigger.recommended_ndc && (
                      <p className="text-xs text-slate-500 mt-0.5 font-mono">
                        NDC: {formatNdc(trigger.recommended_ndc)}
                      </p>
                    )}
                  </div>
                  {hasCoverage ? (
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-slate-500 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1e3a5f]">
                  <span className="text-xs text-slate-400">
                    {trigger.bin_values?.length || 0} BINs ({verifiedCount} verified)
                  </span>
                  <button
                    onClick={() => runSingleScan(trigger.trigger_id)}
                    disabled={isScanning}
                    className="text-xs text-teal-400 hover:text-teal-300 disabled:opacity-50 flex items-center gap-1"
                  >
                    {isScanning ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    {isScanning ? 'Scanning...' : 'Scan'}
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
