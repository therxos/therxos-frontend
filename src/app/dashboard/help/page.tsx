'use client';

import { Mail, Phone, Calendar, BookOpen, MessageCircle, ExternalLink } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Help & Contact</h1>
        <p className="text-slate-400">
          Get support, schedule a call, or browse our resources.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Email */}
        <a 
          href="mailto:stan@therxos.com"
          className="card p-6 hover:border-[var(--teal-500)] transition-colors group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-[var(--teal-500)]/20 flex items-center justify-center flex-shrink-0">
              <Mail className="w-6 h-6 text-[var(--teal-500)]" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1 group-hover:text-[var(--teal-400)]">Email Support</h3>
              <p className="text-sm text-slate-400 mb-2">Get help via email. We typically respond within 24 hours.</p>
              <span className="text-[var(--teal-500)] text-sm">stan@therxos.com</span>
            </div>
          </div>
        </a>

        {/* Schedule Call */}
        <a 
          href="https://calendly.com/therxos/demo"
          target="_blank"
          rel="noopener noreferrer"
          className="card p-6 hover:border-[var(--teal-500)] transition-colors group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1 group-hover:text-[var(--teal-400)] flex items-center gap-2">
                Schedule a Call
                <ExternalLink className="w-4 h-4" />
              </h3>
              <p className="text-sm text-slate-400 mb-2">Book a time to speak with our team directly.</p>
              <span className="text-purple-400 text-sm">Book on Calendly</span>
            </div>
          </div>
        </a>

        {/* Phone */}
        <a
          href="tel:+13052050061"
          className="card p-6 hover:border-[var(--teal-500)] transition-colors group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Phone className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1 group-hover:text-[var(--teal-400)]">Phone Support</h3>
              <p className="text-sm text-slate-400 mb-2">Available Mon-Fri, 9am-5pm EST.</p>
              <span className="text-emerald-400 text-sm">(305) 205-0061</span>
            </div>
          </div>
        </a>

        {/* Live Chat */}
        <div className="card p-6 opacity-60">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Live Chat</h3>
              <p className="text-sm text-slate-400 mb-2">Chat with our support team in real-time.</p>
              <span className="text-slate-500 text-sm">Coming Soon</span>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="w-5 h-5 text-[var(--teal-500)]" />
          <h2 className="text-lg font-semibold text-white">Frequently Asked Questions</h2>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 rounded-lg" style={{ background: 'var(--navy-700)' }}>
            <h4 className="font-medium text-white mb-2">How do I add a new opportunity trigger?</h4>
            <p className="text-sm text-slate-400">
              Contact our team to request new opportunity triggers. We'll work with you to validate the trigger and add it to your dashboard.
            </p>
          </div>
          
          <div className="p-4 rounded-lg" style={{ background: 'var(--navy-700)' }}>
            <h4 className="font-medium text-white mb-2">How often is my data synced?</h4>
            <p className="text-sm text-slate-400">
              Data is synced nightly from your pharmacy management system. Opportunities are scanned and updated automatically after each sync.
            </p>
          </div>
          
          <div className="p-4 rounded-lg" style={{ background: 'var(--navy-700)' }}>
            <h4 className="font-medium text-white mb-2">Can I customize which opportunities appear?</h4>
            <p className="text-sm text-slate-400">
              Yes! Admin users can enable or disable specific opportunity triggers in Settings to tailor the dashboard to your pharmacy's needs.
            </p>
          </div>
          
          <div className="p-4 rounded-lg" style={{ background: 'var(--navy-700)' }}>
            <h4 className="font-medium text-white mb-2">How does the fax system work?</h4>
            <p className="text-sm text-slate-400">
              TheRxOS generates professional prescriber requests and can send them automatically or queue them for approval based on your settings.
            </p>
          </div>
        </div>
        
        <p className="text-sm text-slate-500 mt-6 text-center">
          More FAQs and video tutorials coming soon!
        </p>
      </div>
    </div>
  );
}
