'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ArrowLeft,
  Loader2,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface BinValue {
  bin: string;
  group: string | null;
  gpValue: number;
  avgQty: number;
  claimCount: number;
  bestDrugName: string | null;
  bestNdc: string | null;
  coverageStatus: string;
  verifiedAt: string | null;
}

interface TriggerData {
  triggerId: string;
  displayName: string;
  recommendedDrug: string;
  triggerType: string;
  binValues: BinValue[];
}

interface DrugClassData {
  drugClassLabel: string;
  triggers: TriggerData[];
}

interface TopFormularyEntry {
  drugClass: string;
  drugClassLabel: string;
  bestDrug: string;
  bestGpValue: number;
  bestBin: string;
  bestGroup: string | null;
  triggerCount: number;
  binGroupCount: number;
  totalVerifiedClaims: number;
}

interface ReferenceDataResponse {
  topFormulary: TopFormularyEntry[];
  byClass: Record<string, DrugClassData>;
  drugClasses: string[];
  stats: {
    totalClasses: number;
    totalTriggers: number;
    totalBinGroups: number;
    totalVerifiedClaims: number;
  };
}

export default function ReferenceDataPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReferenceDataResponse | null>(null);
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [filterBin, setFilterBin] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [sortField, setSortField] = useState<'gpValue' | 'claimCount' | 'avgQty' | 'bin'>('gpValue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  async function fetchData() {
    setLoading(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const params = new URLSearchParams({ minGp: '0', minClaims: '1' });
      const res = await fetch(`${API_URL}/api/admin/reference-data?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        alert('Failed to load reference data');
      }
    } catch (err) {
      console.error('Failed to fetch reference data:', err);
      alert('Failed to load reference data');
    } finally {
      setLoading(false);
    }
  }

  function toggleClass(cls: string) {
    setExpandedClasses(prev => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return next;
    });
  }

  function handleSort(field: typeof sortField) {
    if (sortField === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  function getSortedBinValues(triggers: TriggerData[]): (BinValue & { drugName: string; triggerName: string })[] {
    const all: (BinValue & { drugName: string; triggerName: string })[] = [];
    for (const t of triggers) {
      for (const bv of t.binValues) {
        // Client-side BIN filter
        if (filterBin && !bv.bin.includes(filterBin.toUpperCase()) && !(bv.group || '').toUpperCase().includes(filterBin.toUpperCase())) continue;
        all.push({
          ...bv,
          drugName: bv.bestDrugName || t.recommendedDrug || t.displayName,
          triggerName: t.displayName
        });
      }
    }
    all.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'gpValue') cmp = a.gpValue - b.gpValue;
      else if (sortField === 'claimCount') cmp = a.claimCount - b.claimCount;
      else if (sortField === 'avgQty') cmp = a.avgQty - b.avgQty;
      else if (sortField === 'bin') cmp = a.bin.localeCompare(b.bin);
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return all;
  }

  const filteredClasses = data ? data.drugClasses.filter(cls => !filterClass || cls === filterClass) : [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Reference Data</h1>
            <p className="text-sm text-slate-400">Best reimbursing drug per class per BIN/Group</p>
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

      {/* Info Box */}
      <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4 mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Formulary Optimization Reference</h3>
        <p className="text-xs text-slate-400">
          Shows the highest-reimbursing drug for each therapeutic class on each insurance plan (BIN/Group).
          Use this to look up which specific product to recommend based on a patient&apos;s insurance.
          The Top Formulary summary shows the single best drug per class across all plans.
          Data comes from verified coverage scans - re-scan triggers to update.
        </p>
      </div>

      {/* Filters + Load */}
      <div className="flex items-end gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Filter by BIN or Group</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={filterBin}
              onChange={(e) => setFilterBin(e.target.value)}
              placeholder="e.g., 004336"
              className="w-48 pl-9 pr-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        {data && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Drug Class</label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="w-56 px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Classes</option>
              {data.drugClasses.map(cls => (
                <option key={cls} value={cls}>
                  {data.byClass[cls]?.drugClassLabel || cls}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              {data ? 'Refresh' : 'Load Reference Data'}
            </>
          )}
        </button>
      </div>

      {data && (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">{data.stats.totalClasses}</p>
              <p className="text-xs text-slate-400">Drug Classes</p>
            </div>
            <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">{data.stats.totalTriggers}</p>
              <p className="text-xs text-slate-400">Triggers</p>
            </div>
            <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{data.stats.totalBinGroups}</p>
              <p className="text-xs text-slate-400">BIN/Group Plans</p>
            </div>
            <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{data.stats.totalVerifiedClaims}</p>
              <p className="text-xs text-slate-400">Verified Claims</p>
            </div>
          </div>

          {/* Top Formulary Summary */}
          <div className="bg-[#0d2137] border border-emerald-500/30 rounded-xl overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-[#1e3a5f]">
              <h2 className="text-sm font-semibold text-emerald-400">Top Formulary - Best Drug Per Class</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1e3a5f]">
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Drug Class</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Best Drug</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-400">Best GP/Fill</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Best Plan</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-400">Claims</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-400">Plans</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topFormulary
                    .filter(e => !filterClass || e.drugClass === filterClass)
                    .map((entry) => (
                    <tr key={entry.drugClass} className="border-b border-[#1e3a5f]/50 hover:bg-[#1e3a5f]/30">
                      <td className="px-4 py-2.5 text-sm font-medium text-white">{entry.drugClassLabel}</td>
                      <td className="px-4 py-2.5 text-sm text-blue-400">{entry.bestDrug}</td>
                      <td className="px-4 py-2.5 text-sm text-emerald-400 text-right font-mono">${entry.bestGpValue.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-300 font-mono">
                        {entry.bestBin}{entry.bestGroup ? `/${entry.bestGroup}` : ''}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-300 text-right">{entry.totalVerifiedClaims}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-300 text-right">{entry.binGroupCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-Class Detail Sections */}
          <div className="space-y-2">
            {filteredClasses.map(cls => {
              const classData = data.byClass[cls];
              if (!classData) return null;
              const isExpanded = expandedClasses.has(cls);
              const allBinValues = getSortedBinValues(classData.triggers);
              const totalClaims = classData.triggers.reduce((s, t) => s + t.binValues.reduce((s2, b) => s2 + b.claimCount, 0), 0);
              const totalBins = classData.triggers.reduce((s, t) => s + t.binValues.length, 0);

              return (
                <div key={cls} className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleClass(cls)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1e3a5f]/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-white">{classData.drugClassLabel}</span>
                      <span className="text-xs text-slate-500">
                        {classData.triggers.length} trigger{classData.triggers.length !== 1 ? 's' : ''}
                        {' / '}{totalBins} plans
                        {' / '}{totalClaims} claims
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-[#1e3a5f]">
                      {allBinValues.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-slate-500">No entries match current filters</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-[#1e3a5f]">
                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Drug</th>
                                <th
                                  className="px-4 py-2 text-left text-xs font-medium text-slate-400 cursor-pointer hover:text-white"
                                  onClick={() => handleSort('bin')}
                                >
                                  BIN/Group {sortField === 'bin' && (sortDir === 'desc' ? '\u25BC' : '\u25B2')}
                                </th>
                                <th
                                  className="px-4 py-2 text-right text-xs font-medium text-slate-400 cursor-pointer hover:text-white"
                                  onClick={() => handleSort('gpValue')}
                                >
                                  GP/Fill {sortField === 'gpValue' && (sortDir === 'desc' ? '\u25BC' : '\u25B2')}
                                </th>
                                <th
                                  className="px-4 py-2 text-right text-xs font-medium text-slate-400 cursor-pointer hover:text-white"
                                  onClick={() => handleSort('avgQty')}
                                >
                                  Avg Qty {sortField === 'avgQty' && (sortDir === 'desc' ? '\u25BC' : '\u25B2')}
                                </th>
                                <th
                                  className="px-4 py-2 text-right text-xs font-medium text-slate-400 cursor-pointer hover:text-white"
                                  onClick={() => handleSort('claimCount')}
                                >
                                  Claims {sortField === 'claimCount' && (sortDir === 'desc' ? '\u25BC' : '\u25B2')}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {allBinValues.map((bv, idx) => (
                                <tr key={`${bv.bin}-${bv.group}-${idx}`} className="border-b border-[#1e3a5f]/30 hover:bg-[#1e3a5f]/20">
                                  <td className="px-4 py-2 text-sm text-blue-400 max-w-80" title={bv.drugName}>
                                    <span className="truncate block">{bv.drugName}</span>
                                    {bv.bestNdc && <span className="text-[10px] text-slate-500 font-mono">NDC: {bv.bestNdc}</span>}
                                  </td>
                                  <td className="px-4 py-2 text-xs text-slate-300 font-mono">
                                    {bv.bin}{bv.group ? `/${bv.group}` : ''}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-emerald-400 text-right font-mono">
                                    ${bv.gpValue.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-slate-300 text-right">
                                    {bv.avgQty ? Math.round(bv.avgQty) : '-'}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-slate-300 text-right">
                                    {bv.claimCount}
                                  </td>
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
            })}
          </div>
        </>
      )}
    </div>
  );
}
