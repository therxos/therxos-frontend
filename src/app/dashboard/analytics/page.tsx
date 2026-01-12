'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Activity,
  ChevronDown,
  ChevronUp,
  BarChart3,
  RefreshCw,
  Building2,
  Stethoscope,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://therxos-backend-production.up.railway.app';

interface AnalyticsData {
  pharmacy_wide: {
    total_rx_count: number;
    total_gross_profit: number;
    gp_per_rx: number;
    opportunity_impact: number;
    projected_gp_per_rx: number;
  };
  by_bin: Array<{
    bin: string;
    rx_count: number;
    gross_profit: number;
    gp_per_rx: number;
    opportunity_count: number;
    opportunity_value: number;
  }>;
  by_group: Array<{
    bin: string;
    group: string;
    rx_count: number;
    gross_profit: number;
    gp_per_rx: number;
    opportunity_count: number;
    opportunity_value: number;
  }>;
  by_prescriber: Array<{
    prescriber_name: string;
    rx_count: number;
    gross_profit: number;
    gp_per_rx: number;
    opportunity_count: number;
    opportunity_value: number;
  }>;
}

function formatCurrency(value: number): string {
  if (isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  if (isNaN(value)) return '0';
  return new Intl.NumberFormat('en-US').format(value);
}

// Expandable section for BIN/Group/Prescriber breakdowns
function BreakdownSection({
  title,
  icon: Icon,
  data,
  columns,
  expanded,
  onToggle,
  color,
}: {
  title: string;
  icon: React.ElementType;
  data: Array<Record<string, unknown>>;
  columns: Array<{ key: string; label: string; format?: (v: unknown) => string; align?: string }>;
  expanded: boolean;
  onToggle: () => void;
  color: string;
}) {
  const sortedData = [...data].sort((a, b) => (b.gp_per_rx as number) - (a.gp_per_rx as number));
  const avgGpRx = data.length > 0 ? data.reduce((s, d) => s + (d.gp_per_rx as number), 0) / data.length : 0;

  const colorClasses: Record<string, { bg: string; text: string }> = {
    teal: { bg: 'bg-[#14b8a6]/20', text: 'text-[#14b8a6]' },
    blue: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  };
  const colors = colorClasses[color] || colorClasses.teal;

  return (
    <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl overflow-hidden">
      <div
        onClick={onToggle}
        className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-[#1e3a5f]/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${colors.text}`} />
          </div>
          <div>
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="text-sm text-slate-400">{data.length} records • Avg GP/Rx: {formatCurrency(avgGpRx)}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#1e3a5f]">
          <table className="w-full">
            <thead className="bg-[#1e3a5f]/50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row, idx) => (
                <tr key={idx} className="border-t border-[#1e3a5f] hover:bg-[#1e3a5f]/20">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm ${col.align === 'right' ? 'text-right' : 'text-left'} ${
                        col.key === 'gp_per_rx'
                          ? (row[col.key] as number) >= avgGpRx
                            ? 'text-emerald-400 font-semibold'
                            : 'text-amber-400 font-semibold'
                          : 'text-slate-300'
                      }`}
                    >
                      {col.format ? col.format(row[col.key]) : String(row[col.key] || 'N/A')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const { canViewFinancialData } = usePermissions();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['bin']));

  // If user doesn't have permission to view financial data, show access denied
  if (!canViewFinancialData) {
    return (
      <div className="min-h-screen bg-[#0a1628] p-8 flex items-center justify-center">
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-8 text-center max-w-md">
          <DollarSign className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-slate-400">You don't have permission to view financial analytics. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/analytics/gp-metrics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (e) {
      console.error('Failed to load analytics:', e);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSection(section: string) {
    setExpandedSections((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  // Calculate display values
  const gpPerRx = analytics?.pharmacy_wide?.gp_per_rx || 0;
  const projectedGpPerRx = analytics?.pharmacy_wide?.projected_gp_per_rx || gpPerRx;
  const totalRx = analytics?.pharmacy_wide?.total_rx_count || 0;
  const totalGP = analytics?.pharmacy_wide?.total_gross_profit || 0;
  const oppImpact = analytics?.pharmacy_wide?.opportunity_impact || 0;
  const gpPerRxChange = projectedGpPerRx - gpPerRx;

  return (
    <div className="min-h-screen bg-[#0a1628] p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-slate-400 mt-1">GP/Rx performance metrics and opportunity impact</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white rounded-lg"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-[#14b8a6] animate-spin" />
        </div>
      ) : (
        <>
          {/* Top Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Current GP/Rx */}
            <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Current GP/Rx</p>
                  <p className="text-3xl font-bold text-[#14b8a6]">{formatCurrency(gpPerRx)}</p>
                  <p className="text-xs text-slate-500 mt-2">Based on {formatNumber(totalRx)} scripts</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-[#14b8a6]/20 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-[#14b8a6]" />
                </div>
              </div>
            </div>

            {/* Projected GP/Rx */}
            <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Projected GP/Rx</p>
                  <p className="text-3xl font-bold text-emerald-400">{formatCurrency(projectedGpPerRx)}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {gpPerRxChange >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                    <span className={`text-xs ${gpPerRxChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {gpPerRxChange >= 0 ? '+' : ''}
                      {formatCurrency(gpPerRxChange)} with opportunities
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </div>

            {/* Total GP */}
            <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Total Gross Profit</p>
                  <p className="text-3xl font-bold text-blue-400">{formatCurrency(totalGP)}</p>
                  <p className="text-xs text-slate-500 mt-2">Last 365 days</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>

            {/* Opportunity Impact */}
            <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Opportunity Impact</p>
                  <p className="text-3xl font-bold text-amber-400">{formatCurrency(oppImpact)}</p>
                  <p className="text-xs text-slate-500 mt-2">Annual potential gain</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-amber-400" />
                </div>
              </div>
            </div>
          </div>

          {/* GP/Rx Breakdown Sections */}
          <div className="space-y-4">
            {/* By BIN */}
            <BreakdownSection
              title="GP/Rx by BIN"
              icon={Building2}
              data={analytics?.by_bin || []}
              expanded={expandedSections.has('bin')}
              onToggle={() => toggleSection('bin')}
              color="teal"
              columns={[
                { key: 'bin', label: 'BIN' },
                { key: 'rx_count', label: 'Rx Count', format: (v) => formatNumber(v as number), align: 'right' },
                { key: 'gross_profit', label: 'Gross Profit', format: (v) => formatCurrency(v as number), align: 'right' },
                { key: 'gp_per_rx', label: 'GP/Rx', format: (v) => formatCurrency(v as number), align: 'right' },
                { key: 'opportunity_count', label: 'Opportunities', format: (v) => formatNumber(v as number), align: 'right' },
                { key: 'opportunity_value', label: 'Opp Value', format: (v) => formatCurrency(v as number), align: 'right' },
              ]}
            />

            {/* By Group */}
            <BreakdownSection
              title="GP/Rx by BIN + Group"
              icon={Users}
              data={analytics?.by_group || []}
              expanded={expandedSections.has('group')}
              onToggle={() => toggleSection('group')}
              color="blue"
              columns={[
                { key: 'bin', label: 'BIN' },
                { key: 'group', label: 'Group' },
                { key: 'rx_count', label: 'Rx Count', format: (v) => formatNumber(v as number), align: 'right' },
                { key: 'gross_profit', label: 'Gross Profit', format: (v) => formatCurrency(v as number), align: 'right' },
                { key: 'gp_per_rx', label: 'GP/Rx', format: (v) => formatCurrency(v as number), align: 'right' },
                { key: 'opportunity_count', label: 'Opportunities', format: (v) => formatNumber(v as number), align: 'right' },
                { key: 'opportunity_value', label: 'Opp Value', format: (v) => formatCurrency(v as number), align: 'right' },
              ]}
            />

            {/* By Prescriber */}
            <BreakdownSection
              title="GP/Rx by Prescriber"
              icon={Stethoscope}
              data={analytics?.by_prescriber || []}
              expanded={expandedSections.has('prescriber')}
              onToggle={() => toggleSection('prescriber')}
              color="purple"
              columns={[
                { key: 'prescriber_name', label: 'Prescriber' },
                { key: 'rx_count', label: 'Rx Count', format: (v) => formatNumber(v as number), align: 'right' },
                { key: 'gross_profit', label: 'Gross Profit', format: (v) => formatCurrency(v as number), align: 'right' },
                { key: 'gp_per_rx', label: 'GP/Rx', format: (v) => formatCurrency(v as number), align: 'right' },
                { key: 'opportunity_count', label: 'Opportunities', format: (v) => formatNumber(v as number), align: 'right' },
                { key: 'opportunity_value', label: 'Opp Value', format: (v) => formatCurrency(v as number), align: 'right' },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}
