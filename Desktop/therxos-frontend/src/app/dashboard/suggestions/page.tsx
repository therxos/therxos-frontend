'use client';

import { useState } from 'react';
import { MessageSquare, Send, CheckCircle } from 'lucide-react';

export default function SuggestionsPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    type: 'feedback',
    triggerDrug: '',
    recommendedDrug: '',
    insurances: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would send to your backend
    console.log('Suggestion submitted:', form);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setForm({ type: 'feedback', triggerDrug: '', recommendedDrug: '', insurances: '', message: '' });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Suggestions & Feedback</h1>
        <p className="text-slate-400">
          Help us improve TheRxOS by sharing your ideas, feedback, or requesting new opportunities.
        </p>
      </div>

      <div className="card p-6">
        {submitted ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Thank You!</h3>
            <p className="text-slate-400">Your feedback has been submitted. We appreciate your input!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Type of Feedback</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full bg-[var(--navy-700)] border border-[var(--navy-600)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--teal-500)]"
              >
                <option value="feedback">General Feedback</option>
                <option value="idea">Feature Idea</option>
                <option value="opportunity">Request New Opportunity</option>
                <option value="bug">Report a Bug</option>
              </select>
            </div>

            {form.type === 'opportunity' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Trigger Drug</label>
                  <input
                    type="text"
                    value={form.triggerDrug}
                    onChange={(e) => setForm({ ...form, triggerDrug: e.target.value })}
                    placeholder="e.g., Omeprazole 20mg"
                    className="w-full bg-[var(--navy-700)] border border-[var(--navy-600)] rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[var(--teal-500)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Recommended Drug</label>
                  <input
                    type="text"
                    value={form.recommendedDrug}
                    onChange={(e) => setForm({ ...form, recommendedDrug: e.target.value })}
                    placeholder="e.g., Dexlansoprazole 30mg"
                    className="w-full bg-[var(--navy-700)] border border-[var(--navy-600)] rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[var(--teal-500)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Insurance(s) This Works Under</label>
                  <input
                    type="text"
                    value={form.insurances}
                    onChange={(e) => setForm({ ...form, insurances: e.target.value })}
                    placeholder="e.g., Caremark, Humana, BCBS"
                    className="w-full bg-[var(--navy-700)] border border-[var(--navy-600)] rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[var(--teal-500)]"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {form.type === 'opportunity' ? 'Additional Details' : 'Your Message'}
              </label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Share your thoughts..."
                rows={5}
                className="w-full bg-[var(--navy-700)] border border-[var(--navy-600)] rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[var(--teal-500)] resize-none"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[var(--teal-500)] hover:bg-[var(--teal-600)] text-[var(--navy-900)] rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Send className="w-4 h-4" />
              Submit Feedback
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
