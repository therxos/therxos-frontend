'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi, opportunitiesApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import { usePermissions } from '@/hooks/usePermissions';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Pill,
  RefreshCw,
  AlertTriangle,
  ArrowUpDown,
  ShieldAlert,
  Zap,
  Layers,
  Combine,
} from 'lucide-react';

function formatCurrency(value: number) {
  if (isNaN(value) || value === null || value === undefined) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortCurrency(value: number) {
  if (isNaN(value) || value === null || value === undefined) return '$0';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return formatCurrency(value);
}

function formatPatientName(firstName?: string, lastName?: string, hash?: string, isDemo?: boolean) {
  if (firstName && lastName) {
    if (isDemo) {
      return `${firstName} ${lastName}`;
    }
    const last3 = lastName.slice(0, 3).toUpperCase();
    const first3 = firstName.slice(0, 3).toUpperCase();
    return `${last3},${first3}`;
  }
  if (lastName) return isDemo ? lastName : lastName.slice(0, 6).toUpperCase();
  return hash?.slice(0, 8) || 'Unknown';
}

function formatDOB(dob?: string) {
  if (!dob) return '';
  const date = new Date(dob);
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
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
  type,
  count,
  annualValue,
  monthlyValue,
  onClick,
  showFinancials = true,
}: {
  icon: any;
  iconClass: string;
  label: string;
  type: string;
  count: number;
  annualValue: number;
  monthlyValue: number;
  onClick: () => void;
  showFinancials?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between py-3 cursor-pointer hover:bg-[var(--navy-700)] px-3 -mx-3 rounded-lg transition-colors"
      style={{ borderBottom: '1px solid var(--navy-600)' }}
    >
      <div className="flex items-center gap-3">
        <div className={`type-icon ${iconClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-xs" style={{ color: 'var(--slate-400)' }}>{count} opportunities</p>
        </div>
      </div>
      {showFinancials && (
        <div className="text-right">
          <p className="font-bold text-[var(--green-500)]">{formatCurrency(annualValue)}<span className="text-xs font-normal text-slate-400">/yr</span></p>
          <p className="text-xs" style={{ color: 'var(--slate-400)' }}>{formatShortCurrency(monthlyValue)}/mo</p>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { canViewFinancialData } = usePermissions();
  const isDemo = user?.email === 'demo@therxos.com';

  // Fetch real data (demo account now has real superhero data)
  const { data: oppData } = useQuery({
    queryKey: ['all-opportunities'],
    queryFn: () => opportunitiesApi.getAll({ limit: 2000 }).then((r) => r.data),
  });

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.dashboard(30).then((r) => r.data),
  });

  const { data: performanceData } = useQuery({
    queryKey: ['performance'],
    queryFn: () => analyticsApi.performance(30).then((r) => r.data),
  });

  // Fetch audit flags
  const { data: auditData } = useQuery({
    queryKey: ['audit-flags'],
    queryFn: () => analyticsApi.auditFlags({ status: 'open', limit: 100 }).then((r) => r.data),
  });

  // Count open audit flags
  const openAuditFlags = auditData?.flags?.length || 0;

  // Process opportunities for type breakdown and top patients
  const opportunities = oppData?.opportunities || [];
  
  // Group by type - only count Not Submitted opportunities
  const pendingOpportunities = opportunities.filter((o: any) => o.status === 'Not Submitted');
  
  const byType = pendingOpportunities.reduce((acc: any, opp: any) => {
    const type = opp.opportunity_type || 'unknown';
    if (!acc[type]) {
      acc[type] = { count: 0, totalMargin: 0 };
    }
    acc[type].count++;
    const annual = Number(opp.annual_margin_gain) || Number(opp.potential_margin_gain) * 12 || 0;
    acc[type].totalMargin += annual;
    return acc;
  }, {});

  const typeData = Object.entries(byType).map(([type, data]: [string, any]) => ({
    opportunity_type: type,
    count: data.count,
    total_margin: data.totalMargin,
  })).sort((a, b) => b.total_margin - a.total_margin);

  // Group by patient for top patients - only Not Submitted
  const byPatient = pendingOpportunities.reduce((acc: any, opp: any) => {
    const pid = opp.patient_id;
    if (!acc[pid]) {
      acc[pid] = {
        patient_id: pid,
        patient_hash: opp.patient_hash,
        first_name: opp.patient_first_name,
        last_name: opp.patient_last_name,
        date_of_birth: opp.patient_dob,
        chronic_conditions: opp.chronic_conditions || [],
        opportunity_count: 0,
        total_margin: 0,
        last_visit: opp.created_at,
      };
    }
    acc[pid].opportunity_count++;
    const annual = Number(opp.annual_margin_gain) || Number(opp.potential_margin_gain) * 12 || 0;
    acc[pid].total_margin += annual;
    return acc;
  }, {});

  const topPatients = Object.values(byPatient)
    .sort((a: any, b: any) => b.total_margin - a.total_margin)
    .slice(0, 5);

  // Calculate stats - use V1 status values
  const totalOpps = opportunities.length;
  const pendingOpps = opportunities.filter((o: any) => o.status === 'Not Submitted').length;
  const capturedOpps = opportunities.filter((o: any) => o.status === 'Completed' || o.status === 'Approved');
  
  // Pending = Not Submitted opportunities
  const pendingAnnual = opportunities
    .filter((o: any) => o.status === 'Not Submitted')
    .reduce((s: number, o: any) => {
      const annual = Number(o.annual_margin_gain) || Number(o.potential_margin_gain) * 12 || 0;
      return s + annual;
    }, 0);
  const pendingMonthly = pendingAnnual / 12;
  
  // Captured = Completed + Approved opportunities
  const capturedAnnual = capturedOpps.reduce((s: number, o: any) => {
    const annual = Number(o.annual_margin_gain) || Number(o.potential_margin_gain) * 12 || 0;
    return s + annual;
  }, 0);
  const capturedMonthly = capturedAnnual / 12;

  const stats = {
    pending_opportunities: pendingOpps,
    pending_annual: pendingAnnual,
    pending_monthly: pendingMonthly,
    captured_annual: capturedAnnual,
    captured_monthly: capturedMonthly,
    total_patients: dashboardData?.total_patients || 0,
    patients_with_opps: dashboardData?.patients_with_opportunities || Object.keys(byPatient).length,
  };

  const changes = performanceData?.changes || {};

  // Type config
  const typeConfig: Record<string, { icon: any; iconClass: string; label: string }> = {
    missing_therapy: { icon: AlertTriangle, iconClass: 'therapy', label: 'Missing Therapy' },
    therapeutic_interchange: { icon: ArrowUpDown, iconClass: 'interchange', label: 'Therapeutic Interchange' },
    ndc_optimization: { icon: Pill, iconClass: 'ndc', label: 'NDC Optimization' },
    brand_to_generic: { icon: RefreshCw, iconClass: 'brand', label: 'Brand → Generic' },
    formulation_change: { icon: Layers, iconClass: 'formulation', label: 'Formulation Change' },
    combo_therapy: { icon: Combine, iconClass: 'combo', label: 'Combo Therapy' },
    audit_flag: { icon: ShieldAlert, iconClass: 'audit', label: 'Audit Flags' },
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleTypeClick = (type: string) => {
    router.push(`/dashboard/opportunities?type=${type}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--teal-500)]" />
      </div>
    );
  }

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
        <div className="stat-card teal p-6">
          <p className="label-text mb-2">Not Submitted</p>
          <p className="text-3xl font-bold mb-1" style={{ color: 'var(--teal-500)' }}>
            {(stats.pending_opportunities || 0).toLocaleString()}
          </p>
          <p className="text-xs" style={{ color: 'var(--slate-400)' }}>opportunities pending action</p>
        </div>
        
        {canViewFinancialData && (
          <div className="stat-card green p-6">
            <p className="label-text mb-2">Potential Margin</p>
            <p className="text-3xl font-bold mb-1" style={{ color: 'var(--green-500)' }}>
              {formatCurrency(stats.pending_annual || 0)}
            </p>
            <p className="text-xs" style={{ color: 'var(--slate-400)' }}>
              {formatShortCurrency(stats.pending_monthly || 0)}/mo annual opportunity
            </p>
          </div>
        )}

        {canViewFinancialData && (
          <div className="stat-card amber p-6">
            <p className="label-text mb-2">Captured Value</p>
            <p className="text-3xl font-bold mb-1" style={{ color: 'var(--amber-500)' }}>
              {formatCurrency(stats.captured_annual || 0)}
            </p>
            <p className="text-xs" style={{ color: 'var(--slate-400)' }}>
              {formatShortCurrency(stats.captured_monthly || 0)}/mo realized
            </p>
          </div>
        )}
        
        <div className="stat-card blue p-6">
          <p className="label-text mb-2">Patients</p>
          <p className="text-3xl font-bold mb-1" style={{ color: 'var(--blue-500)' }}>
            {(stats.total_patients || 0).toLocaleString()}
          </p>
          <p className="text-xs" style={{ color: 'var(--slate-400)' }}>
            {stats.patients_with_opps || 0} with open opportunities
          </p>
        </div>
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
                const config = typeConfig[item.opportunity_type] || { icon: Zap, iconClass: 'ndc', label: item.opportunity_type?.replace(/_/g, ' ') || 'Unknown' };
                const annualValue = Number(item.total_margin) || 0;
                const monthlyValue = annualValue / 12;
                return (
                  <OpportunityTypeRow
                    key={item.opportunity_type}
                    icon={config.icon}
                    iconClass={config.iconClass}
                    label={config.label}
                    type={item.opportunity_type}
                    count={item.count}
                    annualValue={annualValue}
                    monthlyValue={monthlyValue}
                    onClick={() => handleTypeClick(item.opportunity_type)}
                    showFinancials={canViewFinancialData}
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
                {dashboardData?.action_rate || 0}%
              </span>
              <span className="text-sm mb-1" style={{ color: 'var(--slate-400)' }}>
                of opportunities actioned
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${dashboardData?.action_rate || 0}%` }}
              />
            </div>
          </div>

          {/* Audit Risks */}
          <Link href="/dashboard/audit" className="card p-6 block hover:bg-[var(--navy-700)] transition-colors cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <p className="label-text">Audit Risks</p>
              {openAuditFlags > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  {openAuditFlags} Open
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-3xl font-bold ${openAuditFlags > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                  {openAuditFlags}
                </span>
                <span className="text-sm ml-2" style={{ color: 'var(--slate-400)' }}>
                  {openAuditFlags === 1 ? 'active risk' : 'active risks'}
                </span>
              </div>
              <div className={`type-icon ${openAuditFlags > 0 ? 'audit' : ''}`} style={openAuditFlags === 0 ? { backgroundColor: 'rgba(16, 185, 129, 0.2)' } : {}}>
                <ShieldAlert className={`w-5 h-5 ${openAuditFlags > 0 ? '' : 'text-emerald-400'}`} />
              </div>
            </div>
            {openAuditFlags > 0 && (
              <div className="mt-3 flex items-center gap-1 text-xs text-orange-400">
                <span>Review flagged claims</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            )}
          </Link>

          {/* Rx Count */}
          <div className="card p-6">
            <p className="label-text mb-4">Prescriptions (30 days)</p>
            <span className="text-3xl font-bold">{(dashboardData?.rx_count || totalOpps || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Top Opportunity Patients */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--navy-600)' }}>
          <h2 className="text-lg font-semibold">Top Opportunity Patients</h2>
          <Link 
            href="/dashboard/opportunities" 
            className="text-sm flex items-center gap-1 transition-colors hover:text-[var(--teal-400)]"
            style={{ color: 'var(--teal-500)' }}
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--navy-600)' }}>
                <th className="text-left text-xs font-semibold uppercase tracking-wider px-6 py-4" style={{ color: 'var(--slate-400)', width: '200px' }}>Patient</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider px-6 py-4" style={{ color: 'var(--slate-400)', width: '250px' }}>Conditions</th>
                <th className="text-center text-xs font-semibold uppercase tracking-wider px-6 py-4" style={{ color: 'var(--slate-400)', width: '120px' }}>Opportunities</th>
                {canViewFinancialData && (
                  <th className="text-right text-xs font-semibold uppercase tracking-wider px-6 py-4" style={{ color: 'var(--slate-400)', width: '200px' }}>Potential Margin</th>
                )}
                <th className="text-right text-xs font-semibold uppercase tracking-wider px-6 py-4" style={{ color: 'var(--slate-400)', width: '120px' }}>Last Visit</th>
              </tr>
            </thead>
            <tbody>
              {topPatients && topPatients.length > 0 ? (
                topPatients.map((patient: any) => (
                  <tr key={patient.patient_id} style={{ borderBottom: '1px solid var(--navy-600)' }} className="hover:bg-[var(--navy-700)]">
                    <td className="px-6 py-4">
                      <Link 
                        href={`/dashboard/patients/${patient.patient_id}`} 
                        className="hover:text-[var(--teal-400)] transition-colors"
                        style={{ color: 'var(--teal-500)' }}
                      >
                        <div className="font-semibold">
                          {formatPatientName(patient.first_name, patient.last_name, patient.patient_hash, isDemo)}
                        </div>
                        {patient.date_of_birth && (
                          <div className="text-xs mt-0.5" style={{ color: 'var(--slate-400)' }}>
                            DOB: {formatDOB(patient.date_of_birth)}
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(patient.chronic_conditions || []).slice(0, 3).map((condition: string) => (
                          <span key={condition} className="badge badge-slate text-xs">
                            {condition}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-semibold text-white">{patient.opportunity_count}</span>
                    </td>
                    {canViewFinancialData && (
                      <td className="px-6 py-4 text-right">
                        <div className="text-emerald-400 font-semibold">{formatCurrency(patient.total_margin)}/yr</div>
                        <div className="text-xs" style={{ color: 'var(--slate-400)' }}>{formatShortCurrency(patient.total_margin / 12)}/mo</div>
                      </td>
                    )}
                    <td className="px-6 py-4 text-right" style={{ color: 'var(--slate-400)' }}>
                      {patient.last_visit ? new Date(patient.last_visit).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canViewFinancialData ? 5 : 4} className="text-center py-12" style={{ color: 'var(--slate-400)' }}>
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
