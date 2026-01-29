'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  TrendingDown,
  Loader2,
  ArrowLeft,
  Play,
  DollarSign,
  Users,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Loser {
  base_drug_name: string;
  drug_name: string;
  insurance_bin: string;
  insurance_group: string | null;
  fill_count: number;
  patient_count: number;
  pharmacy_count: number;
  avg_gp: number;
  total_loss: number;
  worst_gp: number;
  best_gp: number;
}

interface ScanDetail {
  currentDrug: string;
  bin: string;
  group: string | null;
  avgGP: number;
  fills: number;
  patients: number;
  totalLoss: number;
  therapeuticClass: string;
  recommendedDrug: string;
  altAvgGP: number;
  altFills: number;
  estimatedAnnualGainPerPatient: number;
  estimatedTotalAnnualGain: number;
}

interface SkipItem {
  drug: string;
  bin?: string;
  group?: string | null;
  avgGP?: number;
  fills?: number;
  patients?: number;
  totalLoss?: number;
  therapeuticClass?: string;
  recommendedDrug?: string;
  altAvgGP?: number;
  annualGainPerPatient?: number;
}

interface ScanResult {
  success: boolean;
  losersFound: number;
  candidatesGenerated: number;
  submittedToQueue: number;
  skippedExisting: number;
  skippedNoClass: number;
  skippedNoAlternative: number;
  skippedLowGain: number;
  processingTimeMs: number;
  errors: { drug: string; error: string }[];
  details: ScanDetail[];
  unclassifiedDrugs: SkipItem[];
  noAlternativeDrugs: SkipItem[];
  existingTriggerDrugs: SkipItem[];
  lowGainDrugs: SkipItem[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatCurrencyExact(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

const COLUMN_LABELS: Record<string, string> = {
  drug: 'Drug',
  bin: 'BIN',
  group: 'GROUP',
  fills: 'Fills',
  patients: 'Patients',
  avgGP: 'Avg GP',
  totalLoss: 'Total Loss',
  therapeuticClass: 'Class',
  recommendedDrug: 'Recommended',
  altAvgGP: 'Alt Avg GP',
  annualGainPerPatient: 'Annual Gain/Pt',
};

const RIGHT_ALIGN = new Set(['fills', 'patients', 'avgGP', 'totalLoss', 'altAvgGP', 'annualGainPerPatient']);
const CURRENCY_COLS = new Set(['avgGP', 'totalLoss', 'altAvgGP', 'annualGainPerPatient']);

function SkipSection({ title, description, color, items, columns }: {
  title: string;
  description: string;
  color: string;
  items: any[];
  columns: string[];
}) {
  const [open, setOpen] = useState(false);
  const colorMap: Record<string, string> = {
    amber: 'border-amber-500/30 text-amber-400',
    orange: 'border-orange-500/30 text-orange-400',
    blue: 'border-blue-500/30 text-blue-400',
    slate: 'border-slate-500/30 text-slate-400',
  };
  const borderColor = colorMap[color] || colorMap.slate;

  return (
    <div className={`mb-3 border ${borderColor.split(' ')[0]} rounded-lg overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-xs font-medium hover:bg-[#0a1628] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={borderColor.split(' ')[1]}>{title}</span>
          <span className="text-slate-500">{description}</span>
        </div>
        {open ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-t border-b border-[#1e3a5f]">
                {columns.map(col => (
                  <th key={col} className={`py-2 px-2 ${RIGHT_ALIGN.has(col) ? 'text-right' : 'text-left'}`}>
                    {COLUMN_LABELS[col] || col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-[#1e3a5f]/30 hover:bg-[#1e3a5f]/20">
                  {columns.map(col => {
                    const val = item[col];
                    const isRight = RIGHT_ALIGN.has(col);
                    const isCurrency = CURRENCY_COLS.has(col);
                    let display = val ?? '-';
                    if (isCurrency && typeof val === 'number') display = formatCurrencyExact(val);
                    else if (typeof val === 'number') display = val.toLocaleString();

                    let textColor = 'text-slate-300';
                    if (col === 'drug') textColor = 'text-white font-medium';
                    if (col === 'recommendedDrug') textColor = 'text-emerald-400 font-medium';
                    if ((col === 'avgGP' || col === 'totalLoss') && typeof val === 'number' && val < 0) textColor = 'text-red-400';
                    if (col === 'altAvgGP' && typeof val === 'number' && val > 0) textColor = 'text-emerald-400';

                    return (
                      <td key={col} className={`py-1.5 px-2 ${isRight ? 'text-right' : 'text-left'} ${textColor}`}>
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function NegativeGPScanPage() {
  // Preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [losers, setLosers] = useState<Loser[] | null>(null);

  // Scan state
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  // Sort state for preview losers table
  const [sortField, setSortField] = useState<keyof Loser | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Threshold config
  const [showConfig, setShowConfig] = useState(false);
  const [minFills, setMinFills] = useState(3);
  const [maxAvgGP, setMaxAvgGP] = useState(-2);
  const [lookbackDays, setLookbackDays] = useState(180);
  const [minFillsAlt, setMinFillsAlt] = useState(2);
  const [minAvgGPAlt, setMinAvgGPAlt] = useState(5);
  const [minMarginGain, setMinMarginGain] = useState(10);
  const [maxResults, setMaxResults] = useState(50);

  async function previewLosers() {
    setPreviewLoading(true);
    setLosers(null);
    setScanResult(null);
    try {
      const token = localStorage.getItem('therxos_token');
      const params = new URLSearchParams({
        minFills: String(minFills),
        maxAvgGP: String(maxAvgGP),
        lookbackDays: String(lookbackDays),
        limit: '100',
      });
      const res = await fetch(`${API_URL}/api/admin/negative-gp-losers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLosers(data.losers || []);
      } else {
        const error = await res.json();
        alert('Failed to load: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to preview losers:', err);
      alert('Failed to load negative GP preview');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function runFullScan() {
    setScanning(true);
    setScanResult(null);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/scan-negative-gp`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          minFillsNegative: minFills,
          maxAvgGP,
          minFillsAlternative: minFillsAlt,
          minAvgGPAlternative: minAvgGPAlt,
          lookbackDays,
          minMarginGain,
          maxResults,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setScanResult(data);
      } else {
        const error = await res.json();
        alert('Scan failed: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to run scan:', err);
      alert('Failed to run negative GP scan');
    } finally {
      setScanning(false);
    }
  }

  const totalLoss = losers?.reduce((sum, l) => sum + l.total_loss, 0) || 0;
  const totalPatients = losers?.reduce((sum, l) => sum + l.patient_count, 0) || 0;

  function toggleSort(field: keyof Loser) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'drug_name' || field === 'insurance_bin' || field === 'insurance_group' ? 'asc' : 'desc');
    }
  }

  const sortedLosers = losers ? [...losers].sort((a, b) => {
    if (!sortField) return 0;
    const av = a[sortField];
    const bv = b[sortField];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortDir === 'asc' ? cmp : -cmp;
  }) : null;

  const SortHeader = ({ field, label, align = 'right' }: { field: keyof Loser; label: string; align?: string }) => (
    <th
      className={`${align === 'left' ? 'text-left' : 'text-right'} py-2 px-3 cursor-pointer hover:text-slate-200 select-none transition-colors`}
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortField === field ? (
          sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <span className="w-3" />
        )}
      </span>
    </th>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Negative GP Scanner</h1>
            <p className="text-sm text-slate-400">
              Find drugs losing money and discover profitable alternatives
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

      {/* How it works */}
      <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4 mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">How it works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs text-slate-400">
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">1</span>
            <span>Finds drugs with consistently negative gross profit per BIN/GROUP</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">2</span>
            <span>Identifies the therapeutic class of each loser drug</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">3</span>
            <span>Searches for alternatives with positive GP on the same BIN/GROUP</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">4</span>
            <span>Queues findings for your review in the approval queue</span>
          </div>
        </div>
      </div>

      {/* Threshold Config */}
      <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl mb-6">
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="w-full flex items-center justify-between p-4 text-sm font-medium text-slate-300 hover:text-white transition-colors"
        >
          <span>Scan Thresholds</span>
          {showConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showConfig && (
          <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Min fills (loser)</label>
              <input type="number" value={minFills} onChange={e => setMinFills(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Max avg GP (loser)</label>
              <input type="number" step="0.5" value={maxAvgGP} onChange={e => setMaxAvgGP(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Lookback (days)</label>
              <input type="number" value={lookbackDays} onChange={e => setLookbackDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Min fills (alternative)</label>
              <input type="number" value={minFillsAlt} onChange={e => setMinFillsAlt(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Min avg GP (alternative)</label>
              <input type="number" step="0.5" value={minAvgGPAlt} onChange={e => setMinAvgGPAlt(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Min annual gain/patient</label>
              <input type="number" step="1" value={minMarginGain} onChange={e => setMinMarginGain(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Max results</label>
              <input type="number" value={maxResults} onChange={e => setMaxResults(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={previewLosers}
          disabled={previewLoading || scanning}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {previewLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading Preview...
            </>
          ) : (
            <>
              <TrendingDown className="w-4 h-4" />
              Preview Losers
            </>
          )}
        </button>
        <button
          onClick={runFullScan}
          disabled={scanning || previewLoading}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {scanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running Full Scan...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Full Scan
            </>
          )}
        </button>
      </div>

      {/* Scan Result Summary */}
      {scanResult && (
        <div className="bg-[#0d2137] border border-emerald-500/30 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Check className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Scan Complete</h3>
            <span className="text-xs text-slate-400 ml-auto">{scanResult.processingTimeMs}ms</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="bg-[#0a1628] rounded-lg p-3">
              <p className="text-xs text-slate-400">Losers Found</p>
              <p className="text-xl font-bold text-white">{scanResult.losersFound}</p>
            </div>
            <div className="bg-[#0a1628] rounded-lg p-3">
              <p className="text-xs text-slate-400">Candidates</p>
              <p className="text-xl font-bold text-white">{scanResult.candidatesGenerated}</p>
            </div>
            <div className="bg-[#0a1628] rounded-lg p-3">
              <p className="text-xs text-emerald-400">Queued for Review</p>
              <p className="text-xl font-bold text-emerald-400">{scanResult.submittedToQueue}</p>
            </div>
            <div className="bg-[#0a1628] rounded-lg p-3">
              <p className="text-xs text-slate-400">Skipped</p>
              <p className="text-xl font-bold text-slate-400">
                {scanResult.skippedExisting + scanResult.skippedNoClass + scanResult.skippedNoAlternative + scanResult.skippedLowGain}
              </p>
            </div>
          </div>

          {/* Skip detail sections */}
          {scanResult.unclassifiedDrugs?.length > 0 && (
            <SkipSection
              title={`Unclassified (${scanResult.unclassifiedDrugs.length})`}
              description="Drug not in any known therapeutic class pattern"
              color="amber"
              items={scanResult.unclassifiedDrugs}
              columns={['drug', 'bin', 'group', 'fills', 'patients', 'avgGP', 'totalLoss']}
            />
          )}
          {scanResult.noAlternativeDrugs?.length > 0 && (
            <SkipSection
              title={`No Alternatives Found (${scanResult.noAlternativeDrugs.length})`}
              description="Classified but no positive-GP alternative in same class + BIN/GROUP"
              color="orange"
              items={scanResult.noAlternativeDrugs}
              columns={['drug', 'therapeuticClass', 'bin', 'group', 'fills', 'patients', 'avgGP', 'totalLoss']}
            />
          )}
          {scanResult.existingTriggerDrugs?.length > 0 && (
            <SkipSection
              title={`Already Has Trigger (${scanResult.existingTriggerDrugs.length})`}
              description="A trigger or pending queue item already covers this"
              color="blue"
              items={scanResult.existingTriggerDrugs}
              columns={['drug', 'recommendedDrug', 'therapeuticClass', 'bin', 'group']}
            />
          )}
          {scanResult.lowGainDrugs?.length > 0 && (
            <SkipSection
              title={`Below Margin Threshold (${scanResult.lowGainDrugs.length})`}
              description="Alternative found but annual gain per patient too low"
              color="slate"
              items={scanResult.lowGainDrugs}
              columns={['drug', 'recommendedDrug', 'therapeuticClass', 'bin', 'group', 'avgGP', 'altAvgGP', 'annualGainPerPatient']}
            />
          )}

          {/* Discoveries table */}
          {scanResult.details.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">New Discoveries</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-[#1e3a5f]">
                      <th className="text-left py-2 px-2">Current Drug (Loser)</th>
                      <th className="text-left py-2 px-2">Recommended</th>
                      <th className="text-left py-2 px-2">Class</th>
                      <th className="text-left py-2 px-2">BIN/GROUP</th>
                      <th className="text-right py-2 px-2">Avg GP (Loser)</th>
                      <th className="text-right py-2 px-2">Avg GP (Alt)</th>
                      <th className="text-right py-2 px-2">Patients</th>
                      <th className="text-right py-2 px-2">Est. Annual Gain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanResult.details.map((d, i) => (
                      <tr key={i} className="border-b border-[#1e3a5f]/50 hover:bg-[#1e3a5f]/20">
                        <td className="py-2 px-2 text-red-400 font-medium">{d.currentDrug}</td>
                        <td className="py-2 px-2 text-emerald-400 font-medium">{d.recommendedDrug}</td>
                        <td className="py-2 px-2 text-slate-300">{d.therapeuticClass}</td>
                        <td className="py-2 px-2 text-slate-300">{d.bin}/{d.group || 'ALL'}</td>
                        <td className="py-2 px-2 text-right text-red-400">{formatCurrencyExact(d.avgGP)}</td>
                        <td className="py-2 px-2 text-right text-emerald-400">{formatCurrencyExact(d.altAvgGP)}</td>
                        <td className="py-2 px-2 text-right text-white">{d.patients}</td>
                        <td className="py-2 px-2 text-right text-emerald-400 font-semibold">{formatCurrency(d.estimatedTotalAnnualGain)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex justify-end">
                <Link
                  href="/admin/opportunity-approval"
                  className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Review in Approval Queue <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {scanResult.errors.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#1e3a5f]">
              <p className="text-xs text-red-400 mb-1">Errors ({scanResult.errors.length}):</p>
              {scanResult.errors.slice(0, 5).map((e, i) => (
                <p key={i} className="text-xs text-slate-400">{e.drug}: {e.error}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview Losers Table */}
      {losers !== null && !scanResult && (
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#1e3a5f] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-white">
                Negative GP Drugs ({losers.length})
              </h3>
              {losers.length > 0 && (
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-red-400" />
                    Total loss: <span className="text-red-400 font-semibold">{formatCurrency(totalLoss)}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {totalPatients} patients
                  </span>
                </div>
              )}
            </div>
          </div>
          {losers.length === 0 ? (
            <div className="p-8 text-center">
              <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-slate-300">No drugs with negative GP found at current thresholds.</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting the thresholds above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-[#1e3a5f]">
                    <SortHeader field="drug_name" label="Drug Name" align="left" />
                    <SortHeader field="insurance_bin" label="BIN" align="left" />
                    <SortHeader field="insurance_group" label="GROUP" align="left" />
                    <SortHeader field="fill_count" label="Fills" />
                    <SortHeader field="patient_count" label="Patients" />
                    <SortHeader field="avg_gp" label="Avg GP" />
                    <SortHeader field="total_loss" label="Total Loss" />
                    <SortHeader field="worst_gp" label="Worst GP" />
                  </tr>
                </thead>
                <tbody>
                  {(sortedLosers || []).map((l, i) => (
                    <tr key={i} className="border-b border-[#1e3a5f]/50 hover:bg-[#1e3a5f]/20">
                      <td className="py-2 px-3 text-white font-medium">{l.drug_name}</td>
                      <td className="py-2 px-3 text-slate-300">{l.insurance_bin}</td>
                      <td className="py-2 px-3 text-slate-300">{l.insurance_group || '-'}</td>
                      <td className="py-2 px-3 text-right text-slate-300">{l.fill_count}</td>
                      <td className="py-2 px-3 text-right text-slate-300">{l.patient_count}</td>
                      <td className="py-2 px-3 text-right text-red-400 font-medium">{formatCurrencyExact(l.avg_gp)}</td>
                      <td className="py-2 px-3 text-right text-red-400 font-semibold">{formatCurrency(l.total_loss)}</td>
                      <td className="py-2 px-3 text-right text-red-400">{formatCurrencyExact(l.worst_gp)}</td>
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
