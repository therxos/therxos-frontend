'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Pill,
  RefreshCw,
  AlertTriangle,
  ArrowUpDown,
  Activity,
  Zap,
} from 'lucide-react';

// Demo data for testing without backend
const DEMO_DASHBOARD = {
  pending_opportunities: 12,
  pending_margin: 4250,
  realized_margin: 8900,
  active_patients: 342,
  action_rate: 67,
  med_sync_patients: 89,
  rx_count: 1240,
};

const DEMO_BY_TYPE = [
  { opportunity_type: 'ndc_optimization', count: '5', total_margin: '1200' },
  { opportunity_type: 'brand_to_generic', count: '4', total_margin: '950' },
  { opportunity_type: 'therapeutic_interchange', count: '2', total_margin: '850' },
  { opportunity_type: 'missing_therapy', count: '1', total_margin: '250' },
];

const DEMO_CHANGES = {
  opportunities: 12,
  potential_margin: 8,
  realized_margin: 15,
};

const DEMO_TOP_PATIENTS = [
  { patient_id: '1', patient_hash: 'abc123de', chronic_conditions: ['Diabetes', 'Hypertension', 'High Cholesterol'], opportunity_count: 4, total_margin: 1200, last_visit: '2026-01-01' },
  { patient_id: '2', patient_hash: 'xyz789uv', chronic_conditions: ['COPD', 'Asthma'], opportunity_count: 3, total_margin: 850, last_visit: '2025-12-31' },
  { patient_id: '3', patient_hash: 'def456gh', chronic_conditions: ['Diabetes', 'Depression'], opportunity_count: 2, total_margin: 600, last_visit: '2025-12-30' },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function StatCard({
  label,
  value,
  change,
  changeLabel = 'vs last period',
  color,
}: {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  color: 'teal' | 'green' | 'amber' | 'blue' | 'purple';
}) {
  const colorMap = {
    teal: 'var(--teal-500)',
    green: 'var(--green-500)',
    amber: 'var(--amber-500)',
    blue: 'var(--blue-500)',
    purple: 'var(--purple-500)',
  };

  return (
    <div className={`stat-card ${color} p-6`}>
      <p className="label-text mb-2">{label}</p>
      <p className="text-3xl font-bold mb-2" style={{ color: colorMap[color] }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-xs ${change >= 0 ? 'text-[var(--green-500)]' : 'text-[var(--red-500)]'}`}>
          {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{change >= 0 ? '+' : ''}{change}% {changeLabel}</span>
        </div>
      )}
    </div>
  );
}

function OpportunityTypeRow({ 
  icon: Icon, 
  iconClass, 
  label, 
  count, 
  value 
}: { 
  icon: any; 
  iconClass: string; 
  label: string; 
  count: number; 
  value: number;
}) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--navy-600)' }}>
      <div className="flex items-center gap-3">
        <div className={`type-icon ${iconClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-xs" style={{ color: 'var(--slate-400)' }}>{count} opportunities</p>
        </div>
      </div>
      <p className="font-bold text-[var(--green-500)]">{formatCurrency(value)}</p>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const isDemo = user?.userId === 'demo-user-001';

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.dashboard(30).then((r) => r.data),
    enabled: !isDemo,
  });

  const { data: byTypeData } = useQuery({
    queryKey: ['opportunities-by-type'],
    queryFn: () => analyticsApi.byType('new').then((r) => r.data),
    enabled: !isDemo,
  });

  const { data: performanceData } = useQuery({
    queryKey: ['performance'],
    queryFn: () => analyticsApi.performance(30).then((r) => r.data),
    enabled: !isDemo,
  });

  const { data: topPatients } = useQuery({
    queryKey: ['top-patients'],
    queryFn: () => analyticsApi.topPatients(5).then((r) => r.data),
    enabled: !isDemo,
  });

  if (isLoading && !isDemo) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--teal-500)]" />
      </div>
    );
  }

  // Use demo data or real data
  const stats = isDemo ? DEMO_DASHBOARD : (dashboardData || {});
  const changes = isDemo ? DEMO_CHANGES : (performanceData?.changes || {});
  const typeData = isDemo ? DEMO_BY_TYPE : byTypeData;
  const patientsData = isDemo ? DEMO_TOP_PATIENTS : topPatients;

  // Map opportunity types to display info
  const typeConfig: Record<string, { icon: any; iconClass: string; label: string }> = {
    ndc_optimization: { icon: Pill, iconClass: 'ndc', label: 'NDC Optimization' },
    brand_to_generic: { icon: RefreshCw, iconClass: 'brand', label: 'Brand → Generic' },
    therapeutic_interchange: { icon: ArrowUpDown, iconClass: 'interchange', label: 'Therapeutic Interchange' },
    missing_therapy: { icon: AlertTriangle, iconClass: 'therapy', label: 'Missing Therapy' },
    audit_flag: { icon: AlertTriangle, iconClass: 'audit', label: 'Audit Flags' },
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          {greeting()}, {user?.firstName}!
        </h1>
        <p className="mt-1" style={{ color: 'var(--slate-400)' }}>
          Here's what's happening at {user?.pharmacyName} today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Pending Opportunities"
          value={stats.pending_opportunities || 0}
          change={changes.opportunities}
          color="teal"
        />
        <StatCard
          label="Potential Margin"
          value={formatCurrency(stats.pending_margin || 0)}
          change={changes.potential_margin}
          color="green"
        />
        <StatCard
          label="Margin Realized (30d)"
          value={formatCurrency(stats.realized_margin || 0)}
          change={changes.realized_margin}
          color="amber"
        />
        <StatCard
          label="Active Patients"
          value={stats.active_patients || 0}
          color="blue"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Opportunities by Type */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Opportunities by Type</h2>
            <Link 
              href="/dashboard/opportunities" 
              className="text-sm flex items-center gap-1 transition-colors hover:text-[var(--teal-400)]"
              style={{ color: 'var(--teal-500)' }}
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div>
            {typeData && typeData.length > 0 ? (
              typeData.map((item: any) => {
                const config = typeConfig[item.opportunity_type] || typeConfig.ndc_optimization;
                return (
                  <OpportunityTypeRow
                    key={item.opportunity_type}
                    icon={config.icon}
                    iconClass={config.iconClass}
                    label={config.label}
                    count={parseInt(item.count)}
                    value={parseFloat(item.total_margin) || 0}
                  />
                );
              })
            ) : (
              <div className="text-center py-12" style={{ color: 'var(--slate-400)' }}>
                <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No pending opportunities</p>
                <p className="text-sm mt-1">Great job! You're all caught up.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
          {/* Action Rate */}
          <div className="card p-6">
            <p className="label-text mb-4">Action Rate (30 days)</p>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-4xl font-bold" style={{ color: 'var(--teal-500)' }}>
                {stats.action_rate || 0}%
              </span>
              <span className="text-sm mb-1" style={{ color: 'var(--slate-400)' }}>
                of opportunities actioned
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${stats.action_rate || 0}%` }}
              />
            </div>
          </div>

          {/* Med Sync */}
          <div className="card p-6">
            <p className="label-text mb-4">Med Sync Enrollment</p>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-3xl font-bold">{stats.med_sync_patients || 0}</span>
                <span className="text-sm ml-2" style={{ color: 'var(--slate-400)' }}>patients enrolled</span>
              </div>
              <div className="type-icon auto">
                <Activity className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Rx Count */}
          <div className="card p-6">
            <p className="label-text mb-4">Prescriptions (30 days)</p>
            <span className="text-3xl font-bold">{(stats.rx_count || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Top Opportunity Patients */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--navy-600)' }}>
          <h2 className="text-lg font-semibold">Top Opportunity Patients</h2>
          <Link 
            href="/dashboard/patients?hasOpportunities=true" 
            className="text-sm flex items-center gap-1 transition-colors hover:text-[var(--teal-400)]"
            style={{ color: 'var(--teal-500)' }}
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        <table className="data-table">
          <thead>
            <tr>
              <th>Patient ID</th>
              <th>Conditions</th>
              <th className="text-right">Opportunities</th>
              <th className="text-right">Potential Margin</th>
              <th className="text-right">Last Visit</th>
            </tr>
          </thead>
          <tbody>
            {patientsData && patientsData.length > 0 ? (
              patientsData.map((patient: any) => (
                <tr key={patient.patient_id}>
                  <td>
                    <Link 
                      href={`/dashboard/patients/${patient.patient_id}`} 
                      className="font-mono text-sm hover:text-[var(--teal-400)]"
                      style={{ color: 'var(--teal-500)' }}
                    >
                      {patient.patient_hash?.slice(0, 8)}...
                    </Link>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {patient.chronic_conditions?.slice(0, 3).map((condition: string) => (
                        <span key={condition} className="badge badge-slate">
                          {condition}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="text-right font-semibold">{patient.opportunity_count}</td>
                  <td className="text-right value-positive">
                    {formatCurrency(patient.total_margin)}
                  </td>
                  <td className="text-right" style={{ color: 'var(--slate-400)' }}>
                    {patient.last_visit ? new Date(patient.last_visit).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-8" style={{ color: 'var(--slate-400)' }}>
                  No patients with opportunities found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
