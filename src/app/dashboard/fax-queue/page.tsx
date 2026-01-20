'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Send,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  User,
  Phone,
  Building2,
  Pill,
  RefreshCw,
  Search,
  Filter,
  Clock,
} from 'lucide-react';
import { jsPDF } from 'jspdf';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Opportunity {
  opportunity_id: string;
  patient_id: string;
  patient_first_name?: string;
  patient_last_name?: string;
  patient_dob?: string;
  current_drug_name: string;
  recommended_drug_name: string;
  opportunity_type: string;
  clinical_rationale: string;
  potential_margin_gain: number;
  annual_margin_gain: number;
  prescriber_name?: string;
  prescriber_npi?: string;
  prescriber_fax?: string;
  insurance_bin?: string;
  insurance_group?: string;
  insurance_pcn?: string;
  status: string;
}

interface Pharmacy {
  pharmacy_name: string;
  phone?: string;
  fax?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  npi?: string;
  ncpdp?: string;
}

interface PrescriberGroup {
  prescriber_name: string;
  prescriber_npi?: string;
  prescriber_fax?: string;
  opportunities: Opportunity[];
}

function formatPatientName(firstName?: string, lastName?: string, isDemo?: boolean): string {
  const properCase = (str?: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  if (firstName && lastName) {
    if (isDemo) {
      return `${properCase(firstName)} ${properCase(lastName)}`;
    } else {
      const f = lastName.slice(0, 3).toUpperCase();
      const l = firstName.slice(0, 3).toUpperCase();
      return `${f}, ${l}`;
    }
  }
  if (lastName) return isDemo ? properCase(lastName) : lastName.slice(0, 3).toUpperCase();
  if (firstName) return isDemo ? properCase(firstName) : firstName.slice(0, 3).toUpperCase();
  return 'Unknown';
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

function formatOpportunityType(type: string): string {
  return (type || 'Unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

export default function FaxQueuePage() {
  const user = useAuthStore((state) => state.user);
  const { canViewFinancialData } = usePermissions();
  const isDemo = user?.email === 'demo@therxos.com';

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOpps, setSelectedOpps] = useState<Set<string>>(new Set());
  const [expandedPrescribers, setExpandedPrescribers] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user?.pharmacyId]);

  async function fetchData() {
    if (!user?.pharmacyId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('therxos_token');

      // Fetch opportunities that are ready to fax (Not Submitted or Submitted)
      const oppRes = await fetch(`${API_URL}/api/opportunities?limit=5000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (oppRes.ok) {
        const data = await oppRes.json();
        // Filter to faxable opportunity types and statuses
        const faxableTypes = ['therapeutic_interchange', 'missing_therapy', 'formulation_change', 'combo_therapy'];
        const faxableStatuses = ['Not Submitted', 'Submitted'];
        const filtered = (data.opportunities || []).filter((o: Opportunity) =>
          faxableStatuses.includes(o.status) &&
          faxableTypes.includes(o.opportunity_type)
        );
        setOpportunities(filtered);

        // Auto-expand first prescriber
        const groups = groupByPrescriber(filtered);
        if (groups.length > 0) {
          setExpandedPrescribers(new Set([groups[0].prescriber_name]));
        }
      }

      // Fetch pharmacy info
      const pharmRes = await fetch(`${API_URL}/api/settings/pharmacy`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (pharmRes.ok) {
        const pharmData = await pharmRes.json();
        setPharmacy(pharmData.pharmacy || pharmData);
      }
    } catch (e) {
      console.error('Failed to fetch data:', e);
    } finally {
      setLoading(false);
    }
  }

  function groupByPrescriber(opps: Opportunity[]): PrescriberGroup[] {
    const map = new Map<string, PrescriberGroup>();

    opps.forEach(opp => {
      const name = opp.prescriber_name || 'Unknown Prescriber';
      if (!map.has(name)) {
        map.set(name, {
          prescriber_name: name,
          prescriber_npi: opp.prescriber_npi,
          prescriber_fax: opp.prescriber_fax,
          opportunities: [],
        });
      }
      map.get(name)!.opportunities.push(opp);
    });

    return Array.from(map.values()).sort((a, b) =>
      b.opportunities.length - a.opportunities.length
    );
  }

  // Filter opportunities
  const filteredOpps = opportunities.filter(opp => {
    if (typeFilter !== 'all' && opp.opportunity_type !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const matchesPatient = (
        opp.patient_first_name?.toLowerCase().includes(s) ||
        opp.patient_last_name?.toLowerCase().includes(s)
      );
      const matchesDrug = (
        opp.current_drug_name?.toLowerCase().includes(s) ||
        opp.recommended_drug_name?.toLowerCase().includes(s)
      );
      const matchesPrescriber = opp.prescriber_name?.toLowerCase().includes(s);
      if (!matchesPatient && !matchesDrug && !matchesPrescriber) return false;
    }
    return true;
  });

  const prescriberGroups = groupByPrescriber(filteredOpps);

  function toggleSelectAll(prescriber: string) {
    const group = prescriberGroups.find(g => g.prescriber_name === prescriber);
    if (!group) return;

    const allSelected = group.opportunities.every(o => selectedOpps.has(o.opportunity_id));
    const next = new Set(selectedOpps);

    if (allSelected) {
      group.opportunities.forEach(o => next.delete(o.opportunity_id));
    } else {
      group.opportunities.forEach(o => next.add(o.opportunity_id));
    }
    setSelectedOpps(next);
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedOpps);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedOpps(next);
  }

  // Generate PDF for selected opportunities
  async function generateFaxPDF() {
    if (selectedOpps.size === 0) {
      alert('Please select at least one opportunity to generate a fax.');
      return;
    }

    setGenerating(true);

    try {
      const selected = opportunities.filter(o => selectedOpps.has(o.opportunity_id));

      // Group selected by prescriber for multi-page faxes
      const byPrescriber = groupByPrescriber(selected);

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 50;
      const contentWidth = pageWidth - (margin * 2);

      byPrescriber.forEach((group, groupIndex) => {
        if (groupIndex > 0) {
          doc.addPage();
        }

        let y = margin;

        // Header - Pharmacy Info
        doc.setFillColor(13, 148, 136); // Teal
        doc.rect(0, 0, pageWidth, 80, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('TheRxOS', margin, 35);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Clinical Opportunity Notification', margin, 55);

        // Pharmacy details in header
        if (pharmacy) {
          doc.setFontSize(9);
          const pharmInfo = [
            pharmacy.pharmacy_name,
            pharmacy.phone ? `Phone: ${pharmacy.phone}` : null,
            pharmacy.fax ? `Fax: ${pharmacy.fax}` : null,
          ].filter(Boolean).join(' | ');
          doc.text(pharmInfo, pageWidth - margin, 35, { align: 'right' });

          if (pharmacy.address) {
            const address = `${pharmacy.address}, ${pharmacy.city}, ${pharmacy.state} ${pharmacy.zip}`;
            doc.text(address, pageWidth - margin, 50, { align: 'right' });
          }
          if (pharmacy.npi) {
            doc.text(`NPI: ${pharmacy.npi}`, pageWidth - margin, 65, { align: 'right' });
          }
        }

        y = 100;

        // Date
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        doc.text(`Date: ${new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`, margin, y);
        y += 25;

        // To: Prescriber Info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('TO:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(group.prescriber_name, margin + 30, y);
        y += 15;

        if (group.prescriber_npi) {
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.text(`NPI: ${group.prescriber_npi}`, margin + 30, y);
          y += 12;
        }
        if (group.prescriber_fax) {
          doc.text(`Fax: ${group.prescriber_fax}`, margin + 30, y);
          y += 12;
        }
        y += 15;

        // Intro text
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        const introText = `We have identified the following clinical opportunities for your patients. These recommendations are based on formulary optimization, therapeutic guidelines, and potential cost savings. Please review and consider the suggested changes.`;
        const introLines = doc.splitTextToSize(introText, contentWidth);
        doc.text(introLines, margin, y);
        y += (introLines.length * 12) + 20;

        // Patient opportunities
        group.opportunities.forEach((opp, oppIndex) => {
          // Check if we need a new page
          if (y > pageHeight - 150) {
            doc.addPage();
            y = margin;
          }

          // Patient header box
          doc.setFillColor(240, 249, 255);
          doc.setDrawColor(14, 165, 233);
          doc.roundedRect(margin, y, contentWidth, 45, 3, 3, 'FD');

          doc.setTextColor(0, 0, 0);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(`Patient ${oppIndex + 1}: ${formatPatientName(opp.patient_first_name, opp.patient_last_name, true)}`, margin + 10, y + 18);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text(`DOB: ${formatDate(opp.patient_dob)}`, margin + 10, y + 32);

          // Insurance info
          const insuranceInfo = [
            opp.insurance_bin ? `BIN: ${opp.insurance_bin}` : null,
            opp.insurance_group ? `Group: ${opp.insurance_group}` : null,
            opp.insurance_pcn ? `PCN: ${opp.insurance_pcn}` : null,
          ].filter(Boolean).join(' | ');
          if (insuranceInfo) {
            doc.text(insuranceInfo, pageWidth - margin - 10, y + 25, { align: 'right' });
          }

          y += 55;

          // Opportunity details
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(10);

          // Type badge
          doc.setFillColor(147, 51, 234);
          doc.roundedRect(margin, y, 120, 18, 2, 2, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.text(formatOpportunityType(opp.opportunity_type), margin + 5, y + 12);

          y += 25;

          // Current -> Recommended
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('Current Medication:', margin, y);
          doc.setFont('helvetica', 'normal');
          doc.text(opp.current_drug_name || 'N/A', margin + 110, y);
          y += 15;

          doc.setFont('helvetica', 'bold');
          doc.text('Recommended:', margin, y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(13, 148, 136);
          doc.text(opp.recommended_drug_name || 'N/A', margin + 110, y);
          y += 15;

          // Clinical Rationale
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'bold');
          doc.text('Clinical Rationale:', margin, y);
          y += 12;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          const rationaleText = opp.clinical_rationale?.split('\n\nAction: ')[0] || 'Formulary optimization opportunity.';
          const rationaleLines = doc.splitTextToSize(rationaleText, contentWidth - 10);
          doc.text(rationaleLines, margin + 10, y);
          y += (rationaleLines.length * 11) + 15;

          // Divider if not last
          if (oppIndex < group.opportunities.length - 1) {
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, y, pageWidth - margin, y);
            y += 15;
          }
        });

        // Response section
        if (y > pageHeight - 180) {
          doc.addPage();
          y = margin;
        }

        y += 20;
        doc.setDrawColor(13, 148, 136);
        doc.setLineWidth(2);
        doc.line(margin, y, pageWidth - margin, y);
        y += 20;

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('PRESCRIBER RESPONSE', margin, y);
        y += 20;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        // Checkboxes
        const checkboxY = y;
        doc.rect(margin, checkboxY, 12, 12);
        doc.text('APPROVED - Please proceed with the recommended change(s)', margin + 20, checkboxY + 9);

        doc.rect(margin, checkboxY + 20, 12, 12);
        doc.text('DENIED - Please continue current therapy', margin + 20, checkboxY + 29);

        doc.rect(margin, checkboxY + 40, 12, 12);
        doc.text('CONTACT ME - Please call to discuss', margin + 20, checkboxY + 49);

        y = checkboxY + 70;

        // Signature line
        doc.text('Comments: _______________________________________________', margin, y);
        y += 30;
        doc.text('Prescriber Signature: ___________________________ Date: ___________', margin, y);
        y += 20;

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('Please fax this form back to the pharmacy. Thank you for your partnership in patient care.', margin, y);

        // Page number
        doc.text(`Page ${groupIndex + 1} of ${byPrescriber.length}`, pageWidth - margin, pageHeight - 30, { align: 'right' });
      });

      // Save the PDF
      const filename = `fax_${new Date().toISOString().split('T')[0]}_${byPrescriber.length > 1 ? 'multiple' : byPrescriber[0]?.prescriber_name?.replace(/\s+/g, '_')}.pdf`;
      doc.save(filename);

    } catch (e) {
      console.error('PDF generation failed:', e);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  const opportunityTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'therapeutic_interchange', label: 'Therapeutic Interchange' },
    { value: 'missing_therapy', label: 'Missing Therapy' },
    { value: 'formulation_change', label: 'Formulation Change' },
    { value: 'combo_therapy', label: 'Combo Therapy' },
  ];

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* Header */}
      <div className="px-8 pt-6">
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#14b8a6]/20 flex items-center justify-center">
                <Send className="w-5 h-5 text-[#14b8a6]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Fax Queue</h1>
                <p className="text-sm text-slate-400">Generate and send fax PDFs to prescribers</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white rounded-lg text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={generateFaxPDF}
                disabled={selectedOpps.size === 0 || generating}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                  selectedOpps.size === 0
                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    : 'bg-[#14b8a6] hover:bg-[#0d9488] text-[#0a1628]'
                }`}
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Generate Fax PDF ({selectedOpps.size})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-4 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient, drug, prescriber..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#14b8a6]"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-[#0d2137] border border-[#1e3a5f] rounded-lg px-3 py-2 text-sm text-white"
        >
          {opportunityTypes.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <div className="text-sm text-slate-400">
          {filteredOpps.length} opportunities ready to fax
        </div>
      </div>

      {/* Prescriber Groups */}
      <div className="px-8 pb-8 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 text-[#14b8a6] animate-spin" />
          </div>
        ) : prescriberGroups.length === 0 ? (
          <div className="text-center py-16 bg-[#0d2137] rounded-xl border border-[#1e3a5f]">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No opportunities ready to fax</h3>
            <p className="text-slate-400">Opportunities with status "Not Submitted" or "Submitted" will appear here.</p>
          </div>
        ) : (
          prescriberGroups.map(group => {
            const isExpanded = expandedPrescribers.has(group.prescriber_name);
            const allSelected = group.opportunities.every(o => selectedOpps.has(o.opportunity_id));
            const someSelected = group.opportunities.some(o => selectedOpps.has(o.opportunity_id));
            const selectedCount = group.opportunities.filter(o => selectedOpps.has(o.opportunity_id)).length;

            return (
              <div key={group.prescriber_name} className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl overflow-hidden">
                {/* Group Header */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#1e3a5f]/50 transition-colors"
                  onClick={() => {
                    const next = new Set(expandedPrescribers);
                    if (next.has(group.prescriber_name)) {
                      next.delete(group.prescriber_name);
                    } else {
                      next.add(group.prescriber_name);
                    }
                    setExpandedPrescribers(next);
                  }}
                >
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectAll(group.prescriber_name);
                      }}
                      className={`w-5 h-5 rounded border flex items-center justify-center ${
                        allSelected
                          ? 'bg-[#14b8a6] border-[#14b8a6]'
                          : someSelected
                          ? 'bg-[#14b8a6]/50 border-[#14b8a6]'
                          : 'border-slate-500 hover:border-[#14b8a6]'
                      }`}
                    >
                      {allSelected && <Check className="w-3 h-3 text-white" />}
                      {someSelected && !allSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                    </button>
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{group.prescriber_name}</div>
                      <div className="text-xs text-slate-400">
                        {group.prescriber_npi && `NPI: ${group.prescriber_npi}`}
                        {group.prescriber_fax && ` | Fax: ${group.prescriber_fax}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-[#14b8a6] font-semibold">{group.opportunities.length} opportunities</div>
                      {selectedCount > 0 && (
                        <div className="text-xs text-slate-400">{selectedCount} selected</div>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Opportunities List */}
                {isExpanded && (
                  <div className="border-t border-[#1e3a5f]">
                    <table className="w-full">
                      <thead className="bg-[#1e3a5f]/50">
                        <tr>
                          <th className="w-12 px-4 py-3"></th>
                          <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Patient</th>
                          <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Type</th>
                          <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Current</th>
                          <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Recommended</th>
                          <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Insurance</th>
                          <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.opportunities.map(opp => {
                          const isSelected = selectedOpps.has(opp.opportunity_id);
                          return (
                            <tr
                              key={opp.opportunity_id}
                              className={`border-t border-[#1e3a5f] hover:bg-[#1e3a5f]/30 cursor-pointer ${
                                isSelected ? 'bg-[#14b8a6]/10' : ''
                              }`}
                              onClick={() => toggleSelect(opp.opportunity_id)}
                            >
                              <td className="px-4 py-3">
                                <button
                                  className={`w-5 h-5 rounded border flex items-center justify-center ${
                                    isSelected
                                      ? 'bg-[#14b8a6] border-[#14b8a6]'
                                      : 'border-slate-500 hover:border-[#14b8a6]'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                </button>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-white">
                                  {formatPatientName(opp.patient_first_name, opp.patient_last_name, isDemo)}
                                </div>
                                <div className="text-xs text-slate-400">DOB: {formatDate(opp.patient_dob)}</div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
                                  {formatOpportunityType(opp.opportunity_type)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-white">
                                {opp.current_drug_name || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-[#14b8a6] font-medium">
                                {opp.recommended_drug_name}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {opp.insurance_bin && (
                                    <span className="text-xs px-1.5 py-0.5 bg-[#14b8a6]/20 text-[#14b8a6] rounded">
                                      {opp.insurance_bin}
                                    </span>
                                  )}
                                  {opp.insurance_group && (
                                    <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                                      {opp.insurance_group}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  opp.status === 'Not Submitted'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {opp.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
