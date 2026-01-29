'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Loader2,
  ArrowLeft,
  DollarSign,
  Users,
  ChevronDown,
  ChevronUp,
  ChevronRight,
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

interface DrugGroup {
  drug_name: string;
  entries: Winner[];
  total_fills: number;
  total_patients: number;
  avg_gp: number;
  total_profit: number;
  avg_acq_cost: number;
  avg_reimbursement: number;
  best_gp: number;
  bin_count: number;
}

type GroupSortField = 'drug_name' | 'bin_count' | 'total_fills' | 'total_patients' | 'avg_gp' | 'total_profit' | 'avg_acq_cost' | 'avg_reimbursement' | 'best_gp';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatCurrencyExact(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function buildGroups(winners: Winner[]): DrugGroup[] {
  const map = new Map<string, Winner[]>();
  for (const w of winners) {
    const key = w.drug_name;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(w);
  }

  const groups: DrugGroup[] = [];
  for (const [drug_name, entries] of map) {
    const total_fills = entries.reduce((s, e) => s + e.fill_count, 0);
    const total_profit = entries.reduce((s, e) => s + e.total_profit, 0);
    groups.push({
      drug_name,
      entries: entries.sort((a, b) => b.total_profit - a.total_profit),
      total_fills,
      total_patients: entries.reduce((s, e) => s + e.patient_count, 0),
      avg_gp: total_fills > 0 ? total_profit / total_fills : 0,
      total_profit,
      avg_acq_cost: total_fills > 0
        ? entries.reduce((s, e) => s + e.avg_acq_cost * e.fill_count, 0) / total_fills
        : 0,
      avg_reimbursement: total_fills > 0
        ? entries.reduce((s, e) => s + e.avg_reimbursement * e.fill_count, 0) / total_fills
        : 0,
      best_gp: Math.max(...entries.map(e => e.best_gp)),
      bin_count: entries.length,
    });
  }
  return groups;
}

export default function PositiveGPScanPage() {
  const [loading, setLoading] = useState(false);
  const [winners, setWinners] = useState<Winner[] | null>(null);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalPatients, setTotalPatients] = useState(0);

  const [sortField, setSortField] = useState<GroupSortField>('total_profit');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedDrugs, setExpandedDrugs] = useState<Set<string>>(new Set());

  const [filterBin, setFilterBin] = useState('');
  const [filterGroup, setFilterGroup] = useState('');

  const [showConfig, setShowConfig] = useState(false);
  const [minFills, setMinFills] = useState(3);
  const [minAvgGP, setMinAvgGP] = useState(10);
  const [lookbackDays, setLookbackDays] = useState(180);

  async function fetchWinners() {
    setLoading(true);
    setWinners(null);
    setExpandedDrugs(new Set());
    try {
      const token = localStorage.getItem('therxos_token');
      const params = new URLSearchParams({
        minFills: String(minFills),
        minAvgGP: String(minAvgGP),
        lookbackDays: String(lookbackDays),
        limit: '500',
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

  const filteredWinners = useMemo(() => {
    if (!winners) return null;
    return winners.filter(w => {
      if (filterBin && !w.insurance_bin.toLowerCase().includes(filterBin.toLowerCase())) return false;
      if (filterGroup && !(w.insurance_group || '').toLowerCase().includes(filterGroup.toLowerCase())) return false;
      return true;
    });
  }, [winners, filterBin, filterGroup]);

  const groups = useMemo(() => {
    if (!filteredWinners) return null;
    return buildGroups(filteredWinners);
  }, [filteredWinners]);

  const sortedGroups = useMemo(() => {
    if (!groups) return null;
    return [...groups].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [groups, sortField, sortDir]);

  function toggleSort(field: GroupSortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'drug_name' ? 'asc' : 'desc');
    }
  }

  function toggleExpand(drugName: string) {
    setExpandedDrugs(prev => {
      const next = new Set(prev);
      if (next.has(drugName)) next.delete(drugName);
      else next.add(drugName);
      return next;
    });
  }

  const SortHeader = ({ field, label, align = 'right' }: { field: GroupSortField; label: string; align?: string }) => (
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

  const uniqueDrugCount = groups?.length || 0;

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
          Drugs with the highest average gross profit per fill, grouped by drug name. Click any drug to expand and see the individual BIN/GROUP breakdowns.
          Use this data to identify which drugs to steer patients toward within the same therapeutic class when doing therapeutic interchanges.
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

      {/* BIN/GROUP Filter */}
      {winners !== null && winners.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Filter by BIN..."
            value={filterBin}
            onChange={e => setFilterBin(e.target.value)}
            className="px-3 py-1.5 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white placeholder-slate-500 w-40"
          />
          <input
            type="text"
            placeholder="Filter by GROUP..."
            value={filterGroup}
            onChange={e => setFilterGroup(e.target.value)}
            className="px-3 py-1.5 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white placeholder-slate-500 w-40"
          />
          {(filterBin || filterGroup) && (
            <button
              onClick={() => { setFilterBin(''); setFilterGroup(''); }}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {sortedGroups !== null && (
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#1e3a5f] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-white">
                Top Winners ({uniqueDrugCount} drugs)
              </h3>
              {uniqueDrugCount > 0 && (
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
          {uniqueDrugCount === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-300">No drugs matched the current thresholds.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-[#1e3a5f]">
                    <th className="w-6 py-2 px-1"></th>
                    <SortHeader field="drug_name" label="Drug Name" align="left" />
                    <SortHeader field="bin_count" label="BINs" />
                    <SortHeader field="total_fills" label="Fills" />
                    <SortHeader field="total_patients" label="Patients" />
                    <SortHeader field="avg_gp" label="Avg GP" />
                    <SortHeader field="total_profit" label="Total Profit" />
                    <SortHeader field="avg_acq_cost" label="Avg Acq Cost" />
                    <SortHeader field="avg_reimbursement" label="Avg Reimb" />
                    <SortHeader field="best_gp" label="Best GP" />
                  </tr>
                </thead>
                <tbody>
                  {sortedGroups.map((g) => {
                    const isExpanded = expandedDrugs.has(g.drug_name);
                    const hasMultiple = g.entries.length > 1;
                    return (
                      <GroupRows
                        key={g.drug_name}
                        group={g}
                        isExpanded={isExpanded}
                        hasMultiple={hasMultiple}
                        onToggle={() => toggleExpand(g.drug_name)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GroupRows({ group: g, isExpanded, hasMultiple, onToggle }: {
  group: DrugGroup;
  isExpanded: boolean;
  hasMultiple: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      {/* Main drug row */}
      <tr
        className={`border-b border-[#1e3a5f]/50 ${hasMultiple ? 'cursor-pointer hover:bg-[#1e3a5f]/30' : 'hover:bg-[#1e3a5f]/20'} ${isExpanded ? 'bg-[#1e3a5f]/20' : ''}`}
        onClick={hasMultiple ? onToggle : undefined}
      >
        <td className="py-2 px-1 text-center">
          {hasMultiple && (
            isExpanded
              ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 inline" />
              : <ChevronRight className="w-3.5 h-3.5 text-slate-400 inline" />
          )}
        </td>
        <td className="py-2 px-3 text-white font-medium">
          {g.drug_name}
          {!hasMultiple && g.entries[0] && (
            <span className="ml-2 text-slate-500 font-normal">{g.entries[0].insurance_bin}/{g.entries[0].insurance_group || '-'}</span>
          )}
        </td>
        <td className="py-2 px-3 text-right">
          {hasMultiple ? (
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 bg-[#1e3a5f] rounded text-slate-300 text-[10px] font-semibold">
              {g.bin_count}
            </span>
          ) : (
            <span className="text-slate-500">1</span>
          )}
        </td>
        <td className="py-2 px-3 text-right text-slate-300">{g.total_fills}</td>
        <td className="py-2 px-3 text-right text-slate-300">{g.total_patients}</td>
        <td className="py-2 px-3 text-right text-emerald-400 font-semibold">{formatCurrencyExact(g.avg_gp)}</td>
        <td className="py-2 px-3 text-right text-emerald-400 font-semibold">{formatCurrency(g.total_profit)}</td>
        <td className="py-2 px-3 text-right text-slate-300">{formatCurrencyExact(g.avg_acq_cost)}</td>
        <td className="py-2 px-3 text-right text-slate-300">{formatCurrencyExact(g.avg_reimbursement)}</td>
        <td className="py-2 px-3 text-right text-emerald-400">{formatCurrencyExact(g.best_gp)}</td>
      </tr>
      {/* Expanded BIN/GROUP rows */}
      {isExpanded && g.entries.map((w, i) => (
        <tr key={i} className="border-b border-[#0a1628]/80 bg-[#0a1628]/60">
          <td className="py-1.5 px-1"></td>
          <td className="py-1.5 px-3 pl-8 text-slate-400">
            <span className="text-slate-500 font-mono">{w.insurance_bin}</span>
            <span className="text-slate-600 mx-1">/</span>
            <span className="text-slate-500 font-mono">{w.insurance_group || '-'}</span>
          </td>
          <td className="py-1.5 px-3"></td>
          <td className="py-1.5 px-3 text-right text-slate-400">{w.fill_count}</td>
          <td className="py-1.5 px-3 text-right text-slate-400">{w.patient_count}</td>
          <td className="py-1.5 px-3 text-right text-emerald-400/80">{formatCurrencyExact(w.avg_gp)}</td>
          <td className="py-1.5 px-3 text-right text-emerald-400/80">{formatCurrencyExact(w.total_profit)}</td>
          <td className="py-1.5 px-3 text-right text-slate-400">{formatCurrencyExact(w.avg_acq_cost)}</td>
          <td className="py-1.5 px-3 text-right text-slate-400">{formatCurrencyExact(w.avg_reimbursement)}</td>
          <td className="py-1.5 px-3 text-right text-emerald-400/80">{formatCurrencyExact(w.best_gp)}</td>
        </tr>
      ))}
    </>
  );
}
