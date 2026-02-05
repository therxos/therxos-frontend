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
  X,
  StickyNote,
  ChevronDown,
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
  gross_profit: number;
  prescriber_name: string;
}

interface Opportunity {
  opportunity_id: string;
  current_drug_name: string;
  recommended_drug_name: string;
  recommended_ndc?: string;
  monthly_margin_gain: number;
  potential_margin_gain?: number;
  annual_margin_gain?: number;
  status: string;
  prescriber_name?: string;
  clinical_rationale?: string;
  staff_notes?: string;
  coverage_confidence?: string;
  actioned_at?: string;
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

const STATUS_OPTIONS = [
  'Not Submitted',
  'Submitted',
  'Approved',
  'Completed',
  "Didn't Work",
  'Flagged',
  'Denied',
];

function StatusDropdown({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const styles: Record<string, string> = {
    'Not Submitted': 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30',
    'Submitted': 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30',
    'Approved': 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30',
    'Completed': 'bg-green-500/20 text-green-400 hover:bg-green-500/30',
    'Denied': 'bg-slate-500/20 text-slate-400 hover:bg-slate-500/30',
    "Didn't Work": 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
    'Flagged': 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30',
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${styles[status] || styles['Not Submitted']}`}
      >
        {status}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 bg-[#0d2137] border border-[#1e3a5f] rounded-lg shadow-xl z-50 min-w-[140px]">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false); }}
                className={`w-full px-3 py-2 text-left text-xs hover:bg-[#1e3a5f] first:rounded-t-lg last:rounded-b-lg ${
                  s === status ? 'text-[#14b8a6] font-medium' : 'text-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CoverageConfidenceBadge({ confidence }: { confidence?: string }) {
  if (!confidence) return null;
  const config: Record<string, { bg: string; text: string; label: string }> = {
    verified: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Verified' },
    likely: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Likely' },
    unknown: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Unknown' },
    excluded: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Excluded' },
  };
  const c = config[confidence] || config.unknown;
  return <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
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
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [notesText, setNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

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

  async function updateStatus(oppId: string, newStatus: string) {
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/opportunities/${oppId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOpportunities(prev => prev.map(o => o.opportunity_id === oppId ? { ...o, status: newStatus } : o));
        if (selectedOpp?.opportunity_id === oppId) {
          setSelectedOpp({ ...selectedOpp, status: newStatus });
        }
      }
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  }

  async function saveNotes() {
    if (!selectedOpp) return;
    setSavingNotes(true);
    try {
      const token = localStorage.getItem('therxos_token');
      await fetch(`${API_URL}/api/opportunities/${selectedOpp.opportunity_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ staffNotes: notesText }),
      });
      setOpportunities(prev => prev.map(o => o.opportunity_id === selectedOpp.opportunity_id ? { ...o, staff_notes: notesText } : o));
      setSelectedOpp({ ...selectedOpp, staff_notes: notesText });
    } catch (e) {
      console.error('Failed to save notes:', e);
    }
    setSavingNotes(false);
  }

  const totalOppValue = opportunities.reduce((s, o) => s + (Number(o.monthly_margin_gain || o.potential_margin_gain) || 0), 0);
  const pending = opportunities.filter(o => o.status === 'Not Submitted').length;
  const captured = opportunities.filter(o => ['Approved', 'Completed'].includes(o.status)).length;

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
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-[#14b8a6]/20 flex items-center justify-center"><DollarSign className="w-5 h-5 text-[#14b8a6]" /></div><div><p className="text-sm text-slate-400">Monthly Value</p><p className="text-xl font-bold text-[#14b8a6]">{formatCurrency(totalOppValue)}</p></div></div></div>
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
          {/* Opportunities Table with Status Dropdown and View Button */}
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1e3a5f]">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-emerald-400" />
                Opportunities ({opportunities.length})
              </h2>
            </div>
            {opportunities.length > 0 ? (
              <table className="w-full">
                <thead className="bg-[#1e3a5f]/50">
                  <tr>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase px-4 py-3">Opportunity</th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase px-4 py-3">Prescriber</th>
                    {canViewFinancialData && <th className="text-right text-xs font-semibold text-slate-400 uppercase px-4 py-3">GP/Fill</th>}
                    <th className="text-center text-xs font-semibold text-slate-400 uppercase px-4 py-3">Status</th>
                    <th className="text-right text-xs font-semibold text-slate-400 uppercase px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.map(o => (
                    <tr key={o.opportunity_id} className="border-t border-[#1e3a5f] hover:bg-[#1e3a5f]/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white">
                            {o.current_drug_name} → <span className="text-[#14b8a6]">{o.recommended_drug_name}</span>
                          </span>
                          <CoverageConfidenceBadge confidence={o.coverage_confidence} />
                        </div>
                        {o.recommended_ndc && (
                          <span className="text-xs text-slate-500 font-mono">NDC: {o.recommended_ndc}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">{o.prescriber_name || 'Unknown'}</td>
                      {canViewFinancialData && (
                        <td className="px-4 py-3 text-right text-emerald-400 font-medium">
                          {formatCurrency(Number(o.monthly_margin_gain || o.potential_margin_gain) || 0)}
                        </td>
                      )}
                      <td className="px-4 py-3 text-center">
                        <StatusDropdown status={o.status} onChange={(s) => updateStatus(o.opportunity_id, s)} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => { setSelectedOpp(o); setNotesText(o.staff_notes || ''); }}
                          className="px-3 py-1.5 bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white rounded text-xs"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-slate-500">No opportunities</div>
            )}
          </div>

          {/* Prescriptions Table */}
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1e3a5f]">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Pill className="w-5 h-5 text-blue-400" />
                Recent Prescriptions ({prescriptions.length})
              </h2>
            </div>
            {prescriptions.length > 0 ? (
              <table className="w-full">
                <thead className="bg-[#1e3a5f]/50">
                  <tr>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase px-4 py-3">Drug</th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase px-4 py-3">Prescriber</th>
                    <th className="text-center text-xs font-semibold text-slate-400 uppercase px-4 py-3">Date</th>
                    {canViewFinancialData && <th className="text-right text-xs font-semibold text-slate-400 uppercase px-4 py-3">GP</th>}
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.slice(0,20).map(rx => (
                    <tr key={rx.prescription_id} className="border-t border-[#1e3a5f]">
                      <td className="px-4 py-3">
                        <div className="text-sm text-white">{rx.drug_name}</div>
                        <div className="text-xs text-slate-500">Rx# {rx.rx_number}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">{rx.prescriber_name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-center text-sm text-slate-400">{formatDate(rx.dispensed_date)}</td>
                      {canViewFinancialData && (
                        <td className="px-4 py-3 text-right text-emerald-400 font-medium">{formatCurrency(Number(rx.gross_profit) || 0)}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-slate-500">No prescriptions</div>
            )}
          </div>
        </div>
      </div>

      {/* Side Panel */}
      {selectedOpp && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedOpp(null)} />
          <aside className="fixed inset-y-0 right-0 w-[420px] bg-[#0d2137] border-l border-[#1e3a5f] shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e3a5f]">
              <span className="font-semibold text-white">Opportunity Details</span>
              <button onClick={() => setSelectedOpp(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Opportunity Info */}
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Opportunity</div>
                <div className="bg-[#1e3a5f] rounded-lg p-4">
                  <div className="text-white font-medium mb-2">
                    {selectedOpp.current_drug_name} → <span className="text-[#14b8a6]">{selectedOpp.recommended_drug_name}</span>
                  </div>
                  {selectedOpp.recommended_ndc && (
                    <div className="text-xs text-slate-400 font-mono mb-2">NDC: {selectedOpp.recommended_ndc}</div>
                  )}
                  {selectedOpp.clinical_rationale && (
                    <p className="text-sm text-slate-300 mt-2">{selectedOpp.clinical_rationale}</p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <CoverageConfidenceBadge confidence={selectedOpp.coverage_confidence} />
                  </div>
                </div>
              </div>

              {/* Prescriber */}
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Prescriber</div>
                <div className="bg-[#1e3a5f] rounded-lg p-4">
                  <div className="text-white">{selectedOpp.prescriber_name || 'Unknown'}</div>
                </div>
              </div>

              {/* Value */}
              {canViewFinancialData && (
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Value</div>
                  <div className="bg-[#1e3a5f] rounded-lg p-4">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Per Fill</span>
                      <span className="text-emerald-400 font-semibold">
                        {formatCurrency(Number(selectedOpp.monthly_margin_gain || selectedOpp.potential_margin_gain) || 0)}
                      </span>
                    </div>
                    {selectedOpp.annual_margin_gain && (
                      <div className="flex justify-between mt-2">
                        <span className="text-slate-400">Annual</span>
                        <span className="text-emerald-400">{formatCurrency(selectedOpp.annual_margin_gain)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Status</div>
                <StatusDropdown status={selectedOpp.status} onChange={(s) => updateStatus(selectedOpp.opportunity_id, s)} />
                {selectedOpp.actioned_at && (
                  <p className="text-xs text-slate-500 mt-2">Last updated: {formatDate(selectedOpp.actioned_at)}</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <StickyNote className="w-4 h-4" /> Staff Notes
                </div>
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white resize-none h-24"
                  placeholder="Add notes about this opportunity..."
                />
                <button
                  onClick={saveNotes}
                  disabled={savingNotes || notesText === (selectedOpp.staff_notes || '')}
                  className="mt-2 px-4 py-2 bg-[#14b8a6] hover:bg-[#0d9488] disabled:bg-[#14b8a6]/50 text-[#0a1628] rounded-lg text-sm font-medium w-full"
                >
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
