'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi, opportunitiesApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Lightbulb,
  Users,
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  prefix = '',
}: {
  title: string;
  value: string | number;
  change?: number;
  icon: any;
  color: string;
  prefix?: string;
}) {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${change >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
              {change >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              <span>{Math.abs(change)}% vs last period</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function OpportunityTypeCard({ type, count, margin }: { type: string; count: number; margin: number }) {
  const typeLabels: Record<string, { label: string; color: string }> = {
    ndc_optimization: { label: 'NDC Optimization', color: 'bg-blue-100 text-blue-800' },
    brand_to_generic: { label: 'Brand → Generic', color: 'bg-green-100 text-green-800' },
    therapeutic_interchange: { label: 'Therapeutic Interchange', color: 'bg-purple-100 text-purple-800' },
    missing_therapy: { label: 'Missing Therapy', color: 'bg-orange-100 text-orange-800' },
    audit_flag: { label: 'Audit Flag', color: 'bg-red-100 text-red-800' },
  };

  const { label, color } = typeLabels[type] || { label: type, color: 'bg-gray-100 text-gray-800' };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <span className={`badge ${color}`}>{label}</span>
        <span className="text-sm text-gray-500">{count} opportunities</span>
      </div>
      <span className="text-sm font-semibold text-gray-900">{formatCurrency(margin)}</span>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.dashboard(30).then((r) => r.data),
  });

  const { data: byTypeData } = useQuery({
    queryKey: ['opportunities-by-type'],
    queryFn: () => analyticsApi.byType('new').then((r) => r.data),
  });

  const { data: performanceData } = useQuery({
    queryKey: ['performance'],
    queryFn: () => analyticsApi.performance(30).then((r) => r.data),
  });

  const { data: topPatients } = useQuery({
    queryKey: ['top-patients'],
    queryFn: () => analyticsApi.topPatients(5).then((r) => r.data),
  });

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const stats = dashboardData || {};
  const changes = performanceData?.changes || {};

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.firstName}!
        </h1>
        <p className="mt-1 text-gray-500">
          Here's what's happening at {user?.pharmacyName} today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Pending Opportunities"
          value={stats.pending_opportunities || 0}
          change={changes.opportunities}
          icon={Lightbulb}
          color="bg-primary-500"
        />
        <StatCard
          title="Potential Margin"
          value={formatCurrency(stats.pending_margin || 0)}
          change={changes.potential_margin}
          icon={DollarSign}
          color="bg-success-500"
        />
        <StatCard
          title="Margin Realized (30d)"
          value={formatCurrency(stats.realized_margin || 0)}
          change={changes.realized_margin}
          icon={TrendingUp}
          color="bg-purple-500"
        />
        <StatCard
          title="Active Patients"
          value={stats.active_patients || 0}
          icon={Users}
          color="bg-orange-500"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Opportunities by Type */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Opportunities by Type</h2>
              <Link href="/dashboard/opportunities" className="text-sm text-primary-600 hover:text-primary-700 flex items-center">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            <div className="space-y-3">
              {byTypeData && byTypeData.length > 0 ? (
                byTypeData.map((item: any) => (
                  <OpportunityTypeCard
                    key={item.opportunity_type}
                    type={item.opportunity_type}
                    count={parseInt(item.count)}
                    margin={parseFloat(item.total_margin) || 0}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No pending opportunities</p>
                  <p className="text-sm mt-1">Great job! You're all caught up.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          {/* Action Rate */}
          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Action Rate (30 days)</h3>
            <div className="flex items-end space-x-2">
              <span className="text-4xl font-bold text-gray-900">{stats.action_rate || 0}%</span>
              <span className="text-sm text-gray-500 mb-1">of opportunities actioned</span>
            </div>
            <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.action_rate || 0}%` }}
              />
            </div>
          </div>

          {/* Med Sync */}
          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Med Sync Enrollment</h3>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-3xl font-bold text-gray-900">{stats.med_sync_patients || 0}</span>
                <span className="text-sm text-gray-500 ml-2">patients enrolled</span>
              </div>
              <div className="p-3 bg-primary-50 rounded-xl">
                <Activity className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </div>

          {/* Rx Count */}
          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Prescriptions (30 days)</h3>
            <span className="text-3xl font-bold text-gray-900">{(stats.rx_count || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Top Opportunity Patients */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Top Opportunity Patients</h2>
          <Link href="/dashboard/patients?hasOpportunities=true" className="text-sm text-primary-600 hover:text-primary-700 flex items-center">
            View all <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                <th className="pb-3 font-medium">Patient ID</th>
                <th className="pb-3 font-medium">Conditions</th>
                <th className="pb-3 font-medium text-right">Opportunities</th>
                <th className="pb-3 font-medium text-right">Potential Margin</th>
                <th className="pb-3 font-medium text-right">Last Visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topPatients && topPatients.length > 0 ? (
                topPatients.map((patient: any) => (
                  <tr key={patient.patient_id} className="hover:bg-gray-50">
                    <td className="py-3">
                      <Link href={`/dashboard/patients/${patient.patient_id}`} className="text-primary-600 hover:text-primary-700 font-mono text-sm">
                        {patient.patient_hash?.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {patient.chronic_conditions?.slice(0, 3).map((condition: string) => (
                          <span key={condition} className="badge badge-gray text-xs">
                            {condition}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 text-right font-medium">{patient.opportunity_count}</td>
                    <td className="py-3 text-right font-semibold text-success-600">
                      {formatCurrency(patient.total_margin)}
                    </td>
                    <td className="py-3 text-right text-sm text-gray-500">
                      {patient.last_visit ? new Date(patient.last_visit).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No patients with opportunities found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
