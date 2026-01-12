'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { patientsApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import Link from 'next/link';
import { Search, Filter, Users, AlertCircle, ChevronRight } from 'lucide-react';

// Demo data
const DEMO_PATIENTS = [
  { patient_id: '1', patient_hash: 'abc123de456789', chronic_conditions: ['Diabetes', 'Hypertension', 'High Cholesterol'], opportunity_count: 4, total_margin: 1200, last_visit: '2026-01-01', med_sync_date: 15 },
  { patient_id: '2', patient_hash: 'xyz789uv123456', chronic_conditions: ['COPD', 'Asthma'], opportunity_count: 3, total_margin: 850, last_visit: '2025-12-31', med_sync_date: null },
  { patient_id: '3', patient_hash: 'def456gh789012', chronic_conditions: ['Diabetes', 'Depression'], opportunity_count: 2, total_margin: 600, last_visit: '2025-12-30', med_sync_date: 1 },
  { patient_id: '4', patient_hash: 'mno345pq678901', chronic_conditions: ['Hypertension', 'GERD'], opportunity_count: 1, total_margin: 250, last_visit: '2025-12-28', med_sync_date: null },
  { patient_id: '5', patient_hash: 'rst234uv567890', chronic_conditions: ['Hypothyroid'], opportunity_count: 0, total_margin: 0, last_visit: '2025-12-25', med_sync_date: 20 },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PatientsPage() {
  const user = useAuthStore((state) => state.user);
  const searchParams = useSearchParams();
  const isDemo = user?.userId === 'demo-user-001';
  const [search, setSearch] = useState('');
  const [filterOpportunities, setFilterOpportunities] = useState(false);

  // Initialize search from URL params
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch) {
      setSearch(urlSearch);
    }
  }, [searchParams]);

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients', search, filterOpportunities],
    queryFn: () => patientsApi.getAll({ 
      search: search || undefined, 
      hasOpportunities: filterOpportunities || undefined 
    }).then((r) => r.data),
    enabled: !isDemo,
  });

  const displayPatients = isDemo ? DEMO_PATIENTS : (patients || []);
  const filteredPatients = displayPatients.filter((p: any) => {
    if (search && !p.patient_hash.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (filterOpportunities && p.opportunity_count === 0) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Patients</h1>
          <p className="mt-1" style={{ color: 'var(--slate-400)' }}>
            {filteredPatients.length} patients total
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--slate-400)' }} />
          <input
            type="text"
            placeholder="Search by patient ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <button
          onClick={() => setFilterOpportunities(!filterOpportunities)}
          className={`btn ${filterOpportunities ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Filter className="w-4 h-4" />
          {filterOpportunities ? 'Showing with opportunities' : 'Filter by opportunities'}
        </button>
      </div>

      {/* Patients List */}
      <div className="card overflow-hidden">
        {isLoading && !isDemo ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--teal-500)]" />
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--slate-400)' }}>
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No patients found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Conditions</th>
                <th className="text-center">Med Sync</th>
                <th className="text-right">Opportunities</th>
                <th className="text-right">Potential Margin</th>
                <th className="text-right">Last Visit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient: any) => (
                <tr key={patient.patient_id}>
                  <td>
                    <span className="font-mono text-sm" style={{ color: 'var(--teal-500)' }}>
                      {patient.patient_hash?.slice(0, 8)}...
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {patient.chronic_conditions?.slice(0, 3).map((condition: string) => (
                        <span key={condition} className="badge badge-slate">
                          {condition}
                        </span>
                      ))}
                      {patient.chronic_conditions?.length > 3 && (
                        <span className="badge badge-slate">+{patient.chronic_conditions.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="text-center">
                    {patient.med_sync_date ? (
                      <span className="badge badge-teal">Day {patient.med_sync_date}</span>
                    ) : (
                      <span style={{ color: 'var(--slate-500)' }}>—</span>
                    )}
                  </td>
                  <td className="text-right">
                    {patient.opportunity_count > 0 ? (
                      <span className="flex items-center justify-end gap-1">
                        <AlertCircle className="w-4 h-4" style={{ color: 'var(--amber-500)' }} />
                        <span className="font-semibold">{patient.opportunity_count}</span>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--slate-500)' }}>0</span>
                    )}
                  </td>
                  <td className="text-right">
                    {patient.total_margin > 0 ? (
                      <span className="value-positive">{formatCurrency(patient.total_margin)}</span>
                    ) : (
                      <span style={{ color: 'var(--slate-500)' }}>—</span>
                    )}
                  </td>
                  <td className="text-right" style={{ color: 'var(--slate-400)' }}>
                    {patient.last_visit ? new Date(patient.last_visit).toLocaleDateString() : '—'}
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/dashboard/patients/${patient.patient_id}`}
                      className="icon-btn"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
