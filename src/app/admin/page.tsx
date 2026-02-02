'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Crosshair,
  ShieldAlert,
  XCircle,
  Database,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PlatformStats {
  total_pharmacies: number;
  active_pharmacies: number;
  total_users: number;
  total_opportunities: number;
  total_value: number;
  captured_value: number;
  mrr: number;
  arr: number;
  pending_quality_issues?: number;
  blocked_margin?: number;
}

interface QuickStats {
  didntWorkCount: number;
  triggerCount: number;
  auditRuleCount: number;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [quickStats, setQuickStats] = useState<QuickStats>({ didntWorkCount: 0, triggerCount: 0, auditRuleCount: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const token = localStorage.getItem('therxos_token');

      // Fetch platform stats
      const statsRes = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      // Fetch triggers count
      const triggersRes = await fetch(`${API_URL}/api/admin/triggers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (triggersRes.ok) {
        const data = await triggersRes.json();
        setQuickStats(prev => ({ ...prev, triggerCount: data.triggers?.length || 0 }));
      }

      // Audit rules fetch removed (feature disabled)

      // Fetch didn't work count
      const didntWorkRes = await fetch(`${API_URL}/api/admin/didnt-work-queue`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (didntWorkRes.ok) {
        const data = await didntWorkRes.json();
        setQuickStats(prev => ({ ...prev, didntWorkCount: data.opportunities?.length || 0 }));
      }
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
          <p className="text-sm text-slate-400">Monitor and manage TheRxOS platform</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] hover:bg-[#2a4a6f] rounded-lg text-sm text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Building2 className="w-4 h-4" />
            Pharmacies
          </div>
          <p className="text-2xl font-bold text-white">{stats?.total_pharmacies || 0}</p>
          <p className="text-xs text-emerald-400">{stats?.active_pharmacies || 0} active</p>
        </div>

        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Users className="w-4 h-4" />
            Users
          </div>
          <p className="text-2xl font-bold text-white">{stats?.total_users || 0}</p>
        </div>

        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Activity className="w-4 h-4" />
            Opportunities
          </div>
          <p className="text-2xl font-bold text-teal-400">{(stats?.total_opportunities || 0).toLocaleString()}</p>
        </div>

        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <DollarSign className="w-4 h-4" />
            Total Value
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(stats?.total_value || 0)}</p>
        </div>

        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <CheckCircle className="w-4 h-4" />
            Captured
          </div>
          <p className="text-2xl font-bold text-amber-400">{formatCurrency(stats?.captured_value || 0)}</p>
        </div>

        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <TrendingUp className="w-4 h-4" />
            MRR / ARR
          </div>
          <p className="text-2xl font-bold text-purple-400">{formatCurrency(stats?.mrr || 0)}</p>
          <p className="text-xs text-purple-300">{formatCurrency(stats?.arr || 0)}/yr</p>
        </div>

        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <BarChart3 className="w-4 h-4" />
            Capture Rate
          </div>
          <p className="text-2xl font-bold text-blue-400">
            {stats?.total_value ? ((stats.captured_value / stats.total_value) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      {/* Data Quality Alert */}
      {(stats?.pending_quality_issues ?? 0) > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-amber-400 font-semibold">Data Quality Issues</p>
                <p className="text-sm text-slate-400">
                  {stats?.pending_quality_issues} issues blocking {formatCurrency(stats?.blocked_margin || 0)} in potential margin
                </p>
              </div>
            </div>
            <Link
              href="/admin/data-quality"
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm font-medium transition-colors"
            >
              Review Issues
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* Pharmacies */}
        <Link href="/admin/pharmacies" className="group">
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6 hover:border-teal-500/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-teal-400" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-teal-400 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Pharmacies</h3>
            <p className="text-sm text-slate-400">Manage pharmacy accounts, onboarding, and data</p>
            <p className="text-2xl font-bold text-teal-400 mt-4">{stats?.total_pharmacies || 0}</p>
          </div>
        </Link>

        {/* Triggers */}
        <Link href="/admin/triggers" className="group">
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6 hover:border-blue-500/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Crosshair className="w-6 h-6 text-blue-400" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Triggers</h3>
            <p className="text-sm text-slate-400">Configure opportunity detection rules and coverage</p>
            <p className="text-2xl font-bold text-blue-400 mt-4">{quickStats.triggerCount}</p>
          </div>
        </Link>

        {/* Audit Rules - disabled */}

        {/* Didn't Work Queue */}
        <Link href="/admin/didnt-work" className="group">
          <div className={`bg-[#0d2137] border rounded-xl p-6 hover:border-red-500/50 transition-colors ${quickStats.didntWorkCount > 0 ? 'border-red-500/30' : 'border-[#1e3a5f]'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-red-400 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Didn&apos;t Work Queue</h3>
            <p className="text-sm text-slate-400">Review opportunities marked as not working</p>
            <p className={`text-2xl font-bold mt-4 ${quickStats.didntWorkCount > 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {quickStats.didntWorkCount}
            </p>
          </div>
        </Link>

        {/* Data Quality */}
        <Link href="/admin/data-quality" className="group">
          <div className={`bg-[#0d2137] border rounded-xl p-6 hover:border-amber-500/50 transition-colors ${(stats?.pending_quality_issues ?? 0) > 0 ? 'border-amber-500/30' : 'border-[#1e3a5f]'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Database className="w-6 h-6 text-amber-400" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Data Quality</h3>
            <p className="text-sm text-slate-400">Review and fix data quality issues</p>
            <p className={`text-2xl font-bold mt-4 ${(stats?.pending_quality_issues ?? 0) > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {stats?.pending_quality_issues || 0}
            </p>
          </div>
        </Link>

        {/* Coverage Scanner */}
        <Link href="/admin/coverage" className="group">
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6 hover:border-emerald-500/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-emerald-400" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Coverage Scanner</h3>
            <p className="text-sm text-slate-400">Run bulk coverage scans across triggers</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
