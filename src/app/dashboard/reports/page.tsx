'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store';
import {
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  Send,
  FileText,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  PieChart,
  FileDown,
  Printer,
  Users,
  Trophy,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface MonthlyStats {
  month: string;
  year: number;
  total_opportunities: number;
  new_opportunities: number;
  submitted: number;
  captured: number;
  rejected: number;
  total_value: number;
  captured_value: number;
  submission_rate: number;
  capture_rate: number;
  by_type: {
    type: string;
    count: number;
    value: number;
    captured: number;
  }[];
  by_status: {
    status: string;
    count: number;
    value: number;
  }[];
  daily_activity: {
    date: string;
    submitted: number;
    captured: number;
  }[];
  by_bin: {
    bin: string;
    count: number;
    value: number;
    captured: number;
    captured_value: number;
  }[];
  weekly_activity: {
    week_start: string;
    actioned_count: number;
    actioned_value: number;
  }[];
  staff_performance: {
    user_id: string;
    name: string;
    role: string;
    actioned_count: number;
    completed_count: number;
    captured_value: number;
    avg_value_per_capture: number;
  }[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [compareMode, setCompareMode] = useState(false);
  const [previousStats, setPreviousStats] = useState<MonthlyStats | null>(null);

  // Re-fetch when pharmacy or month/year changes
  useEffect(() => {
    if (user?.pharmacyId) fetchMonthlyStats();
  }, [selectedMonth, selectedYear, user?.pharmacyId]);

  async function fetchMonthlyStats() {
    setLoading(true);
    try {
      const token = localStorage.getItem('therxos_token');
      
      // Fetch current month
      const res = await fetch(
        `${API_URL}/api/analytics/monthly?month=${selectedMonth + 1}&year=${selectedYear}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }

      // Fetch previous month for comparison
      if (compareMode) {
        const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
        const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
        
        const prevRes = await fetch(
          `${API_URL}/api/analytics/monthly?month=${prevMonth + 1}&year=${prevYear}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (prevRes.ok) {
          const prevData = await prevRes.json();
          setPreviousStats(prevData);
        }
      }
    } catch (err) {
      console.error('Failed to fetch monthly stats:', err);
    } finally {
      setLoading(false);
    }
  }

  function goToPreviousMonth() {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  }

  function goToNextMonth() {
    const now = new Date();
    const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
    
    if (!isCurrentMonth) {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  }

  function formatPercent(value: number) {
    return `${(value * 100).toFixed(1)}%`;
  }

  function getChangeIndicator(current: number, previous: number | undefined) {
    if (!previous) return null;
    const change = ((current - previous) / previous) * 100;
    const isPositive = change > 0;
    
    return (
      <span className={`flex items-center gap-1 text-xs ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {Math.abs(change).toFixed(1)}%
      </span>
    );
  }

  async function downloadReport() {
    const token = localStorage.getItem('therxos_token');

    try {
      const res = await fetch(
        `${API_URL}/api/analytics/monthly/export?month=${selectedMonth + 1}&year=${selectedYear}&format=csv`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `therxos-report-${MONTHS[selectedMonth]}-${selectedYear}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to download report:', err);
    }
  }

  function printReport() {
    if (!stats) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>TheRxOS Report - ${MONTHS[selectedMonth]} ${selectedYear}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          h1 { color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 10px; }
          h2 { color: #0d9488; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
          .summary-card { background: #f0f9ff; padding: 15px; border-radius: 8px; }
          .summary-card .label { font-size: 12px; color: #666; text-transform: uppercase; }
          .summary-card .value { font-size: 24px; font-weight: bold; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
          th { background: #0d9488; color: white; padding: 10px 8px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
          tr:nth-child(even) { background: #f9fafb; }
          .value-green { color: #059669; font-weight: bold; }
          .value-amber { color: #d97706; font-weight: bold; }
          @media print { body { margin: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <h1>TheRxOS Monthly Report</h1>
        <p style="color: #666; margin-bottom: 20px;">${MONTHS[selectedMonth]} ${selectedYear}</p>

        <div class="summary">
          <div class="summary-card">
            <div class="label">Total Opportunities</div>
            <div class="value">${stats.total_opportunities}</div>
          </div>
          <div class="summary-card">
            <div class="label">Submitted</div>
            <div class="value" style="color: #3b82f6;">${stats.submitted}</div>
          </div>
          <div class="summary-card">
            <div class="label">Captured</div>
            <div class="value" style="color: #10b981;">${stats.captured}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Value</div>
            <div class="value" style="color: #d97706;">${formatCurrency(stats.total_value)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Captured Value</div>
            <div class="value" style="color: #10b981;">${formatCurrency(stats.captured_value)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Capture Rate</div>
            <div class="value" style="color: #8b5cf6;">${formatPercent(stats.capture_rate)}</div>
          </div>
        </div>

        <h2>By Status</h2>
        <table>
          <thead><tr><th>Status</th><th style="text-align:right">Count</th><th style="text-align:right">Value</th></tr></thead>
          <tbody>
            ${(stats.by_status || []).map(s => `<tr><td>${s.status}</td><td style="text-align:right">${s.count}</td><td style="text-align:right" class="value-green">${formatCurrency(s.value)}</td></tr>`).join('')}
          </tbody>
        </table>

        <h2>By Opportunity Type</h2>
        <table>
          <thead><tr><th>Type</th><th style="text-align:right">Count</th><th style="text-align:right">Value</th><th style="text-align:right">Captured</th></tr></thead>
          <tbody>
            ${(stats.by_type || []).map(t => `<tr><td>${t.type.replace(/_/g, ' ')}</td><td style="text-align:right">${t.count}</td><td style="text-align:right" class="value-amber">${formatCurrency(t.value)}</td><td style="text-align:right" class="value-green">${t.captured}</td></tr>`).join('')}
          </tbody>
        </table>

        <h2>By Insurance BIN</h2>
        <table>
          <thead><tr><th>BIN</th><th style="text-align:right">Count</th><th style="text-align:right">Value</th><th style="text-align:right">Captured</th><th style="text-align:right">Captured Value</th></tr></thead>
          <tbody>
            ${(stats.by_bin || []).map(b => `<tr><td>${b.bin}</td><td style="text-align:right">${b.count}</td><td style="text-align:right" class="value-amber">${formatCurrency(b.value)}</td><td style="text-align:right">${b.captured}</td><td style="text-align:right" class="value-green">${formatCurrency(b.captured_value)}</td></tr>`).join('')}
          </tbody>
        </table>

        <h2>Weekly Activity</h2>
        <table>
          <thead><tr><th>Week</th><th style="text-align:right">Actioned</th><th style="text-align:right">Value</th></tr></thead>
          <tbody>
            ${(stats.weekly_activity || []).map(w => {
              const weekStart = new Date(w.week_start);
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekEnd.getDate() + 6);
              return `<tr><td>${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td><td style="text-align:right">${w.actioned_count}</td><td style="text-align:right" class="value-green">${formatCurrency(w.actioned_value)}</td></tr>`;
            }).join('')}
          </tbody>
        </table>

        <p class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 12px 24px; background: #0d9488; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
            Print / Save as PDF
          </button>
        </p>

        <p style="margin-top: 30px; text-align: center; color: #999; font-size: 12px;">
          Generated by TheRxOS on ${new Date().toLocaleString()}
        </p>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  const isCurrentMonth = selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear();

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Monthly Reports</h1>
          <p className="text-slate-400">Activity breakdown and performance metrics</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-[#0d2137] border border-[#1e3a5f] rounded-xl px-4 py-2">
            <button 
              onClick={goToPreviousMonth}
              className="p-1 hover:bg-[#1e3a5f] rounded-lg text-slate-400 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 px-4">
              <Calendar className="w-5 h-5 text-teal-400" />
              <span className="text-white font-medium min-w-[140px] text-center">
                {MONTHS[selectedMonth]} {selectedYear}
              </span>
            </div>
            
            <button 
              onClick={goToNextMonth}
              disabled={isCurrentMonth}
              className={`p-1 rounded-lg ${isCurrentMonth ? 'text-slate-600 cursor-not-allowed' : 'hover:bg-[#1e3a5f] text-slate-400 hover:text-white'}`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Compare Toggle */}
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              compareMode 
                ? 'bg-teal-500 text-white' 
                : 'bg-[#0d2137] border border-[#1e3a5f] text-slate-400 hover:text-white'
            }`}
          >
            Compare to Previous
          </button>

          {/* Export Options */}
          <div className="flex items-center gap-2">
            <button
              onClick={downloadReport}
              className="flex items-center gap-2 px-4 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-xl text-slate-400 hover:text-white"
              title="Export to CSV"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={printReport}
              className="flex items-center gap-2 px-4 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-xl text-slate-400 hover:text-white"
              title="Print or Save as PDF"
            >
              <Printer className="w-4 h-4" />
              Print / PDF
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 uppercase">Total Opps</span>
            {compareMode && getChangeIndicator(stats?.total_opportunities || 0, previousStats?.total_opportunities)}
          </div>
          <p className="text-2xl font-bold text-white">{stats?.total_opportunities || 0}</p>
        </div>
        
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 uppercase">Submitted</span>
            {compareMode && getChangeIndicator(stats?.submitted || 0, previousStats?.submitted)}
          </div>
          <p className="text-2xl font-bold text-blue-400">{stats?.submitted || 0}</p>
        </div>
        
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 uppercase">Captured</span>
            {compareMode && getChangeIndicator(stats?.captured || 0, previousStats?.captured)}
          </div>
          <p className="text-2xl font-bold text-emerald-400">{stats?.captured || 0}</p>
        </div>
        
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 uppercase">Total Value</span>
            {compareMode && getChangeIndicator(stats?.total_value || 0, previousStats?.total_value)}
          </div>
          <p className="text-2xl font-bold text-amber-400">{formatCurrency(stats?.total_value || 0)}</p>
        </div>
        
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 uppercase">Captured Value</span>
            {compareMode && getChangeIndicator(stats?.captured_value || 0, previousStats?.captured_value)}
          </div>
          <p className="text-2xl font-bold text-teal-400">{formatCurrency(stats?.captured_value || 0)}</p>
        </div>
        
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 uppercase">Capture Rate</span>
            {compareMode && getChangeIndicator(stats?.capture_rate || 0, previousStats?.capture_rate)}
          </div>
          <p className="text-2xl font-bold text-purple-400">{formatPercent(stats?.capture_rate || 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Status */}
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-semibold text-white">By Status</h2>
          </div>
          
          <div className="space-y-4">
            {(stats?.by_status || []).map((item) => {
              const percentage = stats?.total_opportunities 
                ? (item.count / stats.total_opportunities) * 100 
                : 0;
              
              const statusColors: Record<string, string> = {
                'New': 'bg-slate-500',
                'Not Submitted': 'bg-amber-500',
                'Submitted': 'bg-blue-500',
                'Pending': 'bg-purple-500',
                'Approved': 'bg-teal-500',
                'Captured': 'bg-emerald-500',
                'Completed': 'bg-emerald-500',
                'Rejected': 'bg-red-500',
                'Declined': 'bg-red-500',
              };
              
              return (
                <div key={item.status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-300">{item.status}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-white font-medium">{item.count}</span>
                      <span className="text-xs text-slate-400">{percentage.toFixed(1)}%</span>
                      <span className="text-xs text-emerald-400">{formatCurrency(item.value)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-[#1e3a5f] rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${statusColors[item.status] || 'bg-slate-500'} rounded-full`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Type */}
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-semibold text-white">By Opportunity Type</h2>
          </div>
          
          <div className="space-y-4">
            {(stats?.by_type || []).map((item) => {
              const percentage = stats?.total_opportunities 
                ? (item.count / stats.total_opportunities) * 100 
                : 0;
              
              return (
                <div key={item.type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-300">{item.type.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-white font-medium">{item.count}</span>
                      <span className="text-xs text-emerald-400">{formatCurrency(item.value)}</span>
                      <span className="text-xs text-teal-400">{item.captured} captured</span>
                    </div>
                  </div>
                  <div className="h-2 bg-[#1e3a5f] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* By BIN */}
      <div className="mt-6 bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-teal-400" />
          <h2 className="text-lg font-semibold text-white">By Insurance BIN</h2>
        </div>

        {(stats?.by_bin || []).length === 0 ? (
          <p className="text-slate-400 text-sm">No BIN data available for this period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase border-b border-[#1e3a5f]">
                  <th className="pb-3 pr-4">BIN</th>
                  <th className="pb-3 pr-4 text-right">Count</th>
                  <th className="pb-3 pr-4 text-right">Value</th>
                  <th className="pb-3 pr-4 text-right">Captured</th>
                  <th className="pb-3 text-right">Captured Value</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.by_bin || []).map((item) => (
                  <tr key={item.bin} className="border-b border-[#1e3a5f]/50">
                    <td className="py-3 pr-4">
                      <span className="px-2 py-1 bg-teal-500/20 text-teal-400 rounded text-sm font-medium">
                        {item.bin}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right text-white font-medium">{item.count}</td>
                    <td className="py-3 pr-4 text-right text-amber-400">{formatCurrency(item.value)}</td>
                    <td className="py-3 pr-4 text-right text-emerald-400">{item.captured}</td>
                    <td className="py-3 text-right text-emerald-400">{formatCurrency(item.captured_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Weekly Activity by Actioned Date */}
      <div className="mt-6 bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="w-5 h-5 text-teal-400" />
          <h2 className="text-lg font-semibold text-white">Weekly Activity (by Actioned Date)</h2>
        </div>

        {(stats?.weekly_activity || []).length === 0 ? (
          <p className="text-slate-400 text-sm">No weekly activity data available for this period</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(stats?.weekly_activity || []).map((week) => {
              const weekStart = new Date(week.week_start);
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekEnd.getDate() + 6);

              return (
                <div key={week.week_start} className="bg-[#1e3a5f] rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-2">
                    {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-2xl font-bold text-white">{week.actioned_count}</div>
                  <div className="text-sm text-slate-400">opportunities actioned</div>
                  <div className="text-lg font-semibold text-emerald-400 mt-2">{formatCurrency(week.actioned_value)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Staff Performance */}
      <div className="mt-6 bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">Staff Performance</h2>
          <span className="text-xs text-slate-400 ml-2">(Opportunities completed this month)</span>
        </div>

        {(stats?.staff_performance || []).length === 0 ? (
          <p className="text-slate-400 text-sm">No staff activity data available for this period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase border-b border-[#1e3a5f]">
                  <th className="pb-3 pr-4">Staff Member</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4 text-right">Actioned</th>
                  <th className="pb-3 pr-4 text-right">Approved</th>
                  <th className="pb-3 pr-4 text-right">Approved Value</th>
                  <th className="pb-3 pr-4 text-right">Completed</th>
                  <th className="pb-3 pr-4 text-right">Completed Value</th>
                  <th className="pb-3 text-right">Total Captured</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.staff_performance || []).map((staff, idx) => (
                  <tr key={staff.user_id} className="border-b border-[#1e3a5f]/50">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        {idx === 0 && (stats?.staff_performance?.length || 0) > 1 && (
                          <Trophy className="w-4 h-4 text-amber-400" />
                        )}
                        <span className="text-white font-medium">{staff.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded text-xs capitalize">
                        {staff.role}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right text-blue-400 font-medium">{staff.actioned_count}</td>
                    <td className="py-3 pr-4 text-right text-emerald-400 font-medium">{staff.approved_count || 0}</td>
                    <td className="py-3 pr-4 text-right text-emerald-400 font-medium">{formatCurrency(staff.approved_value || 0)}</td>
                    <td className="py-3 pr-4 text-right text-green-400 font-medium">{staff.completed_count}</td>
                    <td className="py-3 pr-4 text-right text-green-400 font-medium">{formatCurrency(staff.completed_value || 0)}</td>
                    <td className="py-3 text-right text-teal-400 font-bold">{formatCurrency(staff.captured_value)}</td>
                  </tr>
                ))}
              </tbody>
              {(stats?.staff_performance || []).length > 0 && (
                <tfoot>
                  <tr className="border-t border-[#1e3a5f]">
                    <td colSpan={2} className="py-3 pr-4 text-slate-400 font-medium">Total</td>
                    <td className="py-3 pr-4 text-right text-blue-400 font-bold">
                      {(stats?.staff_performance || []).reduce((sum, s) => sum + s.actioned_count, 0)}
                    </td>
                    <td className="py-3 pr-4 text-right text-emerald-400 font-bold">
                      {(stats?.staff_performance || []).reduce((sum, s) => sum + (s.approved_count || 0), 0)}
                    </td>
                    <td className="py-3 pr-4 text-right text-emerald-400 font-bold">
                      {formatCurrency((stats?.staff_performance || []).reduce((sum, s) => sum + (s.approved_value || 0), 0))}
                    </td>
                    <td className="py-3 pr-4 text-right text-green-400 font-bold">
                      {(stats?.staff_performance || []).reduce((sum, s) => sum + s.completed_count, 0)}
                    </td>
                    <td className="py-3 pr-4 text-right text-green-400 font-bold">
                      {formatCurrency((stats?.staff_performance || []).reduce((sum, s) => sum + (s.completed_value || 0), 0))}
                    </td>
                    <td className="py-3 text-right text-teal-400 font-bold">
                      {formatCurrency((stats?.staff_performance || []).reduce((sum, s) => sum + s.captured_value, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Daily Activity Chart */}
      <div className="mt-6 bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="w-5 h-5 text-teal-400" />
          <h2 className="text-lg font-semibold text-white">Daily Activity</h2>
        </div>

        <div className="h-48 flex items-end gap-1">
          {(stats?.daily_activity || []).map((day, i) => {
            const maxValue = Math.max(
              ...((stats?.daily_activity || []).map(d => d.submitted + d.captured))
            ) || 1;
            const total = day.submitted + day.captured;
            const height = (total / maxValue) * 100;
            const date = new Date(day.date);

            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-1"
                title={`${date.toLocaleDateString()}: ${day.submitted} submitted, ${day.captured} captured`}
              >
                <div
                  className="w-full bg-gradient-to-t from-teal-500 to-emerald-500 rounded-t-sm hover:opacity-80 transition-opacity cursor-pointer"
                  style={{ height: `${height}%`, minHeight: total > 0 ? '4px' : '0' }}
                />
                {i % 5 === 0 && (
                  <span className="text-[10px] text-slate-500">{date.getDate()}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-[#1e3a5f]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs text-slate-400">Submitted</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-400">Captured</span>
          </div>
        </div>
      </div>
    </div>
  );
}
