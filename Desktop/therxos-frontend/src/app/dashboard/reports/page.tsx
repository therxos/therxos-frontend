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

  useEffect(() => {
    fetchMonthlyStats();
  }, [selectedMonth, selectedYear]);

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

          {/* Download */}
          <button
            onClick={downloadReport}
            className="flex items-center gap-2 px-4 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-xl text-slate-400 hover:text-white"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
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
