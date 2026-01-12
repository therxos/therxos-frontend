'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { usePermissions } from '@/hooks/usePermissions';
import {
  ArrowLeft,
  Pill,
  DollarSign,
  Building2,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  FileText,
  Heart,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://therxos-backend-production.up.railway.app';

interface Patient {
  patient_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  primary_insurance_bin: string;
  primary_insurance_pcn: string;
  primary_insurance_group: string;
  chronic_conditions: string[];
  profile_data: { medications?: string[] };
}

interface Prescription {
  prescription_id: string;
  rx_number: string;
  drug_name: string;
  dispensed_date: string;
  patient_pay: number;
  insurance_pay: number;
  prescriber_name: string;
}

interface Opportunity {
  opportunity_id: string;
  current_drug_name: string;
  recommended_drug_name: string;
  annual_margin_gain: number;
  status: string;
}

function formatCurrency(value: number): string {
  if (isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatDate(date: string): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US');
}

function formatPatientName(first?: string, last?: string, isDemo?: boolean): string {
  if (isDemo && first && last) {
    return `${first} ${last}`;
  }
  const f = (first || '').toUpperCase().slice(0, 3);
  const l = (last || '').toUpperCase().slice(0, 3);
  return f && l ? `${l},${f}` : l || 'UNKNOWN';
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'Not Submitted': 'bg-amber-500/20 text-amber-400',
    'Submitted': 'bg-blue-500/20 text-blue-400',
    'Approved': 'bg-emerald-500/20 text-emerald-400',
    'Completed': 'bg-green-500/20 text-green-400',
    'Denied': 'bg-slate-500/20 text-slate-400',
    "Didn't Work": 'bg-red-500/20 text-red-400',
  };
  return <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || 'bg-amber-500/20 text-amber-400'}`}>{status}</span>;
}

export default function PatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const user = useAuthStore((state) => state.user);
  const { canViewFinancialData } = usePermissions();
  const isDemo = user?.email === 'demo@therxos.com';
  const [patient, setPatient] = useState<Patient | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPatientData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/patients/${patientId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setPatient(data.patient);
        setPrescriptions(data.prescriptions || []);
        setOpportunities(data.opportunities || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [patientId]);

  useEffect(() => { 
    if (patientId) fetchPatientData(); 
  }, [patientId, fetchPatientData]);

  const totalOppValue = opportunities.reduce((s, o) => s + (Number(o.annual_margin_gain) || 0), 0);
  const pending = opportunities.filter(o => o.status === 'new').length;
  const captured = opportunities.filter(o => o.status === 'actioned').length;

  if (loading) return <div className="min-h-screen bg-[#0a1628] flex items-center justify-center"><RefreshCw className="w-8 h-8 text-[#14b8a6] animate-spin" /></div>;
  if (!patient) return <div className="min-h-screen bg-[#0a1628] p-8 text-center py-20"><AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" /><h2 className="text-xl font-semibold text-white mb-2">Patient Not Found</h2><button onClick={() => router.back()} className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg">Go Back</button></div>;

  return (
    <div className="min-h-screen bg-[#0a1628] p-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2 hover:bg-[#1e3a5f] rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-400" /></button>
        <div className="w-14 h-14 rounded-full bg-[#14b8a6]/20 flex items-center justify-center"><span className="text-lg font-bold text-[#14b8a6]">{(patient.last_name || '?').slice(0,2).toUpperCase()}</span></div>
        <div><h1 className="text-2xl font-bold text-white">{formatPatientName(patient.first_name, patient.last_name, isDemo)}</h1><p className="text-slate-400">DOB: {formatDate(patient.date_of_birth)}</p></div>
      </div>

      <div className={`grid grid-cols-1 ${canViewFinancialData ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-6 mb-8`}>
        {canViewFinancialData && (
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-[#14b8a6]/20 flex items-center justify-center"><DollarSign className="w-5 h-5 text-[#14b8a6]" /></div><div><p className="text-sm text-slate-400">Opp Value</p><p className="text-xl font-bold text-[#14b8a6]">{formatCurrency(totalOppValue)}</p></div></div></div>
        )}
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-400" /></div><div><p className="text-sm text-slate-400">Pending</p><p className="text-xl font-bold text-amber-400">{pending}</p></div></div></div>
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-400" /></div><div><p className="text-sm text-slate-400">Captured</p><p className="text-xl font-bold text-emerald-400">{captured}</p></div></div></div>
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center"><Pill className="w-5 h-5 text-blue-400" /></div><div><p className="text-sm text-slate-400">Prescriptions</p><p className="text-xl font-bold text-blue-400">{prescriptions.length}</p></div></div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6"><h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Building2 className="w-5 h-5 text-[#14b8a6]" />Insurance</h2><div className="space-y-3"><div className="flex justify-between"><span className="text-slate-400">BIN</span><span className="text-white font-medium">{patient.primary_insurance_bin || 'N/A'}</span></div>{patient.primary_insurance_pcn && <div className="flex justify-between"><span className="text-slate-400">PCN</span><span className="text-white font-medium">{patient.primary_insurance_pcn}</span></div>}<div className="flex justify-between"><span className="text-slate-400">Group</span><span className="text-white font-medium">{patient.primary_insurance_group || 'N/A'}</span></div></div></div>
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6"><h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Heart className="w-5 h-5 text-red-400" />Chronic Conditions</h2>{patient.chronic_conditions && patient.chronic_conditions.length > 0 ? <div className="flex flex-wrap gap-2">{patient.chronic_conditions.map((c, i) => <span key={i} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">{c}</span>)}</div> : <p className="text-slate-500">None identified</p>}</div>
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6"><h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-400" />Medication List</h2>{patient.profile_data?.medications && patient.profile_data.medications.length > 0 ? <ul className="space-y-2 max-h-64 overflow-y-auto">{patient.profile_data.medications.map((m, i) => <li key={i} className="text-sm text-slate-300 flex items-center gap-2"><Pill className="w-3 h-3 text-slate-500" />{m}</li>)}</ul> : <p className="text-slate-500">No medications on file</p>}</div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl overflow-hidden"><div className="px-6 py-4 border-b border-[#1e3a5f]"><h2 className="text-lg font-semibold text-white flex items-center gap-2"><AlertCircle className="w-5 h-5 text-emerald-400" />Opportunities ({opportunities.length})</h2></div>{opportunities.length > 0 ? <table className="w-full"><thead className="bg-[#1e3a5f]/50"><tr><th className="text-left text-xs font-semibold text-slate-400 uppercase px-4 py-3">Opportunity</th>{canViewFinancialData && <th className="text-right text-xs font-semibold text-slate-400 uppercase px-4 py-3">Value</th>}<th className="text-center text-xs font-semibold text-slate-400 uppercase px-4 py-3">Status</th></tr></thead><tbody>{opportunities.map(o => <tr key={o.opportunity_id} className="border-t border-[#1e3a5f]"><td className="px-4 py-3 text-sm text-white">{o.current_drug_name} → <span className="text-[#14b8a6]">{o.recommended_drug_name}</span></td>{canViewFinancialData && <td className="px-4 py-3 text-right text-emerald-400 font-medium">{formatCurrency(Number(o.annual_margin_gain) || 0)}</td>}<td className="px-4 py-3 text-center"><StatusBadge status={o.status} /></td></tr>)}</tbody></table> : <div className="p-8 text-center text-slate-500">No opportunities</div>}</div>
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl overflow-hidden"><div className="px-6 py-4 border-b border-[#1e3a5f]"><h2 className="text-lg font-semibold text-white flex items-center gap-2"><Pill className="w-5 h-5 text-blue-400" />Recent Prescriptions ({prescriptions.length})</h2></div>{prescriptions.length > 0 ? <table className="w-full"><thead className="bg-[#1e3a5f]/50"><tr><th className="text-left text-xs font-semibold text-slate-400 uppercase px-4 py-3">Drug</th><th className="text-left text-xs font-semibold text-slate-400 uppercase px-4 py-3">Prescriber</th><th className="text-center text-xs font-semibold text-slate-400 uppercase px-4 py-3">Date</th>{canViewFinancialData && <th className="text-right text-xs font-semibold text-slate-400 uppercase px-4 py-3">GP</th>}</tr></thead><tbody>{prescriptions.slice(0,20).map(rx => <tr key={rx.prescription_id} className="border-t border-[#1e3a5f]"><td className="px-4 py-3"><div className="text-sm text-white">{rx.drug_name}</div><div className="text-xs text-slate-500">Rx# {rx.rx_number}</div></td><td className="px-4 py-3 text-sm text-slate-300">{rx.prescriber_name || 'Unknown'}</td><td className="px-4 py-3 text-center text-sm text-slate-400">{formatDate(rx.dispensed_date)}</td>{canViewFinancialData && <td className="px-4 py-3 text-right text-emerald-400 font-medium">{formatCurrency((Number(rx.insurance_pay) || 0) + (Number(rx.patient_pay) || 0))}</td>}</tr>)}</tbody></table> : <div className="p-8 text-center text-slate-500">No prescriptions</div>}</div>
        </div>
      </div>
    </div>
  );
}
