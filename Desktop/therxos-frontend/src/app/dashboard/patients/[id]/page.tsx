'use client';

import { useQuery } from '@tanstack/react-query';
import { patientsApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Calendar, 
  Pill, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  DollarSign,
  Activity
} from 'lucide-react';

// Demo patient data
const DEMO_PATIENT = {
  patient_id: '1',
  patient_hash: 'abc123de456789',
  date_of_birth: '1955-03-15',
  chronic_conditions: ['Diabetes', 'Hypertension', 'High Cholesterol'],
  med_sync_date: 15,
  primary_insurance_bin: '610014',
  primary_insurance_pcn: 'ABC',
  prescriptions: [
    { rx_number: 'RX100001', drug_name: 'Metformin 500mg', quantity: 90, days_supply: 30, last_fill: '2025-12-20' },
    { rx_number: 'RX100002', drug_name: 'Lisinopril 10mg', quantity: 30, days_supply: 30, last_fill: '2025-12-20' },
    { rx_number: 'RX100003', drug_name: 'Atorvastatin 20mg', quantity: 30, days_supply: 30, last_fill: '2025-12-15' },
  ],
  opportunities: [
    { opportunity_id: '1', type: 'ndc_optimization', current_drug: 'Lisinopril 10mg', recommended: 'Lisinopril 10mg (Alt NDC)', margin: 2.50, status: 'new' },
    { opportunity_id: '2', type: 'brand_to_generic', current_drug: 'Lipitor 20mg', recommended: 'Atorvastatin 20mg', margin: 41.80, status: 'new' },
  ],
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function PatientDetailPage() {
  const params = useParams();
  const user = useAuthStore((state) => state.user);
  const isDemo = user?.userId === 'demo-user-001';

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', params.id],
    queryFn: () => patientsApi.getOne(params.id as string).then((r) => r.data),
    enabled: !isDemo,
  });

  const displayPatient = isDemo ? DEMO_PATIENT : patient;

  if (isLoading && !isDemo) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--teal-500)]" />
      </div>
    );
  }

  if (!displayPatient) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--slate-400)' }}>
        <p>Patient not found</p>
        <Link href="/dashboard/patients" className="btn btn-secondary mt-4">
          Back to Patients
        </Link>
      </div>
    );
  }

  const totalMargin = displayPatient.opportunities?.reduce((sum: number, o: any) => sum + (o.margin || 0), 0) || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/patients" className="icon-btn">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            Patient 
            <span className="font-mono text-lg" style={{ color: 'var(--teal-500)' }}>
              {displayPatient.patient_hash?.slice(0, 8)}...
            </span>
          </h1>
          <p className="mt-1" style={{ color: 'var(--slate-400)' }}>
            DOB: {displayPatient.date_of_birth ? new Date(displayPatient.date_of_birth).toLocaleDateString() : 'Unknown'}
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card teal p-4">
          <p className="label-text mb-1">Active Rx</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--teal-500)' }}>
            {displayPatient.prescriptions?.length || 0}
          </p>
        </div>
        <div className="stat-card amber p-4">
          <p className="label-text mb-1">Opportunities</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--amber-500)' }}>
            {displayPatient.opportunities?.length || 0}
          </p>
        </div>
        <div className="stat-card green p-4">
          <p className="label-text mb-1">Potential Margin</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--green-500)' }}>
            {formatCurrency(totalMargin)}
          </p>
        </div>
        <div className="stat-card blue p-4">
          <p className="label-text mb-1">Med Sync</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--blue-500)' }}>
            {displayPatient.med_sync_date ? `Day ${displayPatient.med_sync_date}` : 'Not enrolled'}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conditions & Insurance */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Patient Info</h2>
          
          <div className="mb-6">
            <p className="label-text mb-2">Chronic Conditions</p>
            <div className="flex flex-wrap gap-2">
              {displayPatient.chronic_conditions?.map((condition: string) => (
                <span key={condition} className="badge badge-purple">{condition}</span>
              ))}
            </div>
          </div>

          <div>
            <p className="label-text mb-2">Insurance</p>
            <div className="space-y-1 text-sm">
              <p>BIN: <span style={{ color: 'var(--slate-300)' }}>{displayPatient.primary_insurance_bin || '—'}</span></p>
              <p>PCN: <span style={{ color: 'var(--slate-300)' }}>{displayPatient.primary_insurance_pcn || '—'}</span></p>
            </div>
          </div>
        </div>

        {/* Prescriptions */}
        <div className="lg:col-span-2 card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Pill className="w-5 h-5" style={{ color: 'var(--teal-500)' }} />
            Active Prescriptions
          </h2>
          
          {displayPatient.prescriptions?.length > 0 ? (
            <div className="space-y-3">
              {displayPatient.prescriptions.map((rx: any) => (
                <div 
                  key={rx.rx_number} 
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: 'var(--navy-700)' }}
                >
                  <div>
                    <p className="font-medium">{rx.drug_name}</p>
                    <p className="text-sm" style={{ color: 'var(--slate-400)' }}>
                      {rx.rx_number} • Qty {rx.quantity} • {rx.days_supply} days
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm" style={{ color: 'var(--slate-400)' }}>Last fill</p>
                    <p className="text-sm">{new Date(rx.last_fill).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--slate-400)' }}>No active prescriptions</p>
          )}
        </div>
      </div>

      {/* Opportunities */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" style={{ color: 'var(--amber-500)' }} />
          Opportunities
        </h2>
        
        {displayPatient.opportunities?.length > 0 ? (
          <div className="space-y-3">
            {displayPatient.opportunities.map((opp: any) => (
              <div 
                key={opp.opportunity_id} 
                className="flex items-center justify-between p-4 rounded-lg border"
                style={{ background: 'var(--navy-700)', borderColor: 'var(--navy-600)' }}
              >
                <div className="flex items-center gap-4">
                  <div className={`type-icon ${opp.type === 'ndc_optimization' ? 'ndc' : opp.type === 'brand_to_generic' ? 'brand' : 'therapy'}`}>
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{opp.current_drug} → {opp.recommended}</p>
                    <p className="text-sm" style={{ color: 'var(--slate-400)' }}>
                      {opp.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="value-positive text-lg">{formatCurrency(opp.margin)}</span>
                  <span className={`badge ${opp.status === 'new' ? 'badge-amber' : opp.status === 'actioned' ? 'badge-green' : 'badge-slate'}`}>
                    {opp.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8" style={{ color: 'var(--slate-400)' }}>
            <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No opportunities for this patient</p>
          </div>
        )}
      </div>
    </div>
  );
}
