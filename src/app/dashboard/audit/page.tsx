'use client';

import { ShieldAlert, Construction } from 'lucide-react';

export default function AuditRisksPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Audit Risks</h1>
        <p className="text-slate-400 mb-6 max-w-md">
          Monitor high-cost drugs and potential audit risks to protect your pharmacy from recoupments.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <Construction className="w-4 h-4" />
          <span>Coming Soon</span>
        </div>
      </div>
    </div>
  );
}
