'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Users, 
  Pill,
  Target,
  Calendar,
  BarChart3
} from 'lucide-react';

// Demo data
const DEMO_STATS = {
  total_opportunities: 156,
  actioned_opportunities: 89,
  dismissed_opportunities: 23,
  pending_opportunities: 44,
  total_margin_captured: 12450,
  total_margin_potential: 8200,
  action_rate: 67,
  avg_margin_per_opportunity: 140,
};

const DEMO_MONTHLY = [
  { month: 'Aug', captured: 1800, potential: 2200 },
  { month: 'Sep', captured: 2100, potential: 1900 },
  { month: 'Oct', captured: 2400, potential: 2100 },
  { month: 'Nov', captured: 2800, potential: 1800 },
  { month: 'Dec', captured: 3350, potential: 2200 },
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
  subValue,
  icon: Icon, 
  color,
  trend
}: { 
  label: string; 
  value: string | number; 
  subValue?: string;
  icon: any; 
  color: string;
  trend?: number;
}) {
  return (
    <div className="stat-card p-6" style={{ '--card-color': `var(--${color}-500)` } as any}>
      <div className="flex items-start justify-between">
        <div>
          <p className="label-text mb-2">{label}</p>
          <p className="text-3xl font-bold" style={{ color: `var(--${color}-500)` }}>
            {value}
          </p>
          {subValue && (
            <p className="text-sm mt-1" style={{ color: 'var(--slate-400)' }}>{subValue}</p>
          )}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs mt-2 ${trend >= 0 ? 'text-[var(--green-500)]' : 'text-[var(--red-500)]'}`}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{trend >= 0 ? '+' : ''}{trend}% vs last month</span>
            </div>
          )}
        </div>
        <div className={`type-icon`} style={{ background: `rgba(var(--${color}-rgb), 0.15)`, color: `var(--${color}-500)` }}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const user = useAuthStore((state) => state.user);
  const isDemo = user?.userId === 'demo-user-001';

  const { data: performance, isLoading } = useQuery({
    queryKey: ['analytics-performance'],
    queryFn: () => analyticsApi.performance(30).then((r) => r.data),
    enabled: !isDemo,
  });

  const stats = isDemo ? DEMO_STATS : (performance || DEMO_STATS);
  const monthlyData = DEMO_MONTHLY; // Always use demo for chart

  // Calculate max for chart scaling
  const maxValue = Math.max(...monthlyData.flatMap(m => [m.captured, m.potential]));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="mt-1" style={{ color: 'var(--slate-400)' }}>
          Performance overview for {user?.pharmacyName}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card teal p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="label-text mb-2">Margin Captured</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--teal-500)' }}>
                {formatCurrency(stats.total_margin_captured)}
              </p>
              <div className="flex items-center gap-1 text-xs mt-2 text-[var(--green-500)]">
                <TrendingUp className="w-3 h-3" />
                <span>+18% vs last month</span>
              </div>
            </div>
            <div className="type-icon auto">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="stat-card green p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="label-text mb-2">Action Rate</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--green-500)' }}>
                {stats.action_rate}%
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--slate-400)' }}>
                {stats.actioned_opportunities} of {stats.total_opportunities} actioned
              </p>
            </div>
            <div className="type-icon brand">
              <Target className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="stat-card amber p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="label-text mb-2">Pending Value</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--amber-500)' }}>
                {formatCurrency(stats.total_margin_potential)}
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--slate-400)' }}>
                {stats.pending_opportunities} opportunities
              </p>
            </div>
            <div className="type-icon interchange">
              <Pill className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="stat-card blue p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="label-text mb-2">Avg per Opportunity</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--blue-500)' }}>
                {formatCurrency(stats.avg_margin_per_opportunity)}
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--slate-400)' }}>
                per actioned item
              </p>
            </div>
            <div className="type-icon ndc">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <h2 className="text-lg font-semibold mb-6">Monthly Performance</h2>
          
          {/* Simple Bar Chart */}
          <div className="space-y-4">
            {monthlyData.map((month) => (
              <div key={month.month} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--slate-300)' }}>{month.month}</span>
                  <span style={{ color: 'var(--slate-400)' }}>
                    {formatCurrency(month.captured)} captured
                  </span>
                </div>
                <div className="flex gap-2 h-8">
                  <div 
                    className="rounded-md transition-all"
                    style={{ 
                      width: `${(month.captured / maxValue) * 100}%`,
                      background: 'var(--teal-500)'
                    }}
                  />
                  <div 
                    className="rounded-md transition-all"
                    style={{ 
                      width: `${(month.potential / maxValue) * 100}%`,
                      background: 'var(--amber-500)',
                      opacity: 0.5
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-6 mt-6 pt-4" style={{ borderTop: '1px solid var(--navy-600)' }}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ background: 'var(--teal-500)' }} />
              <span className="text-sm" style={{ color: 'var(--slate-400)' }}>Captured</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ background: 'var(--amber-500)', opacity: 0.5 }} />
              <span className="text-sm" style={{ color: 'var(--slate-400)' }}>Pending</span>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-6">Opportunity Breakdown</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--slate-300)' }}>Actioned</span>
              <span className="font-semibold" style={{ color: 'var(--green-500)' }}>{stats.actioned_opportunities}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${(stats.actioned_opportunities / stats.total_opportunities) * 100}%`,
                  background: 'var(--green-500)'
                }} 
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <span style={{ color: 'var(--slate-300)' }}>Pending</span>
              <span className="font-semibold" style={{ color: 'var(--amber-500)' }}>{stats.pending_opportunities}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${(stats.pending_opportunities / stats.total_opportunities) * 100}%`,
                  background: 'var(--amber-500)'
                }} 
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <span style={{ color: 'var(--slate-300)' }}>Dismissed</span>
              <span className="font-semibold" style={{ color: 'var(--slate-500)' }}>{stats.dismissed_opportunities}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${(stats.dismissed_opportunities / stats.total_opportunities) * 100}%`,
                  background: 'var(--slate-500)'
                }} 
              />
            </div>
          </div>

          <div className="mt-6 pt-4 text-center" style={{ borderTop: '1px solid var(--navy-600)' }}>
            <p className="text-sm" style={{ color: 'var(--slate-400)' }}>Total Opportunities</p>
            <p className="text-2xl font-bold mt-1">{stats.total_opportunities}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
