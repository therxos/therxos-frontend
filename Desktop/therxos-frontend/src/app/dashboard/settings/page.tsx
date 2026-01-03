'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store';
import { 
  User, 
  Building2, 
  Bell, 
  Shield, 
  Save,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);
  
  // Profile form state
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  
  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [opportunityAlerts, setOpportunityAlerts] = useState(true);

  const handleSaveProfile = async () => {
    // In demo mode, just update local state
    updateUser({ firstName, lastName });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    // Would call API here
    setSaved(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setSaved(false), 3000);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'pharmacy', label: 'Pharmacy', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1" style={{ color: 'var(--slate-400)' }}>
          Manage your account and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-[var(--teal-500)] text-[var(--navy-900)]' 
                : 'bg-[var(--navy-700)] text-[var(--slate-300)] hover:bg-[var(--navy-600)]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Success Message */}
      {saved && (
        <div className="p-4 rounded-lg flex items-center gap-3" style={{ background: 'var(--green-100)' }}>
          <Check className="w-5 h-5" style={{ color: '#166534' }} />
          <span style={{ color: '#166534' }}>Settings saved successfully</span>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-6">Profile Information</h2>
          
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                disabled
              />
              <p className="text-xs mt-1" style={{ color: 'var(--slate-500)' }}>
                Contact support to change your email address
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>
                Role
              </label>
              <input
                type="text"
                value={user?.role || 'Staff'}
                className="input"
                disabled
              />
            </div>

            <button onClick={handleSaveProfile} className="btn btn-primary mt-4">
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Pharmacy Tab */}
      {activeTab === 'pharmacy' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-6">Pharmacy Information</h2>
          
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>
                Pharmacy Name
              </label>
              <input
                type="text"
                value={user?.pharmacyName || ''}
                className="input"
                disabled
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>
                Subdomain
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={user?.subdomain || ''}
                  className="input"
                  disabled
                />
                <span style={{ color: 'var(--slate-400)' }}>.therxos.com</span>
              </div>
            </div>

            <p className="text-sm" style={{ color: 'var(--slate-500)' }}>
              Contact support to update pharmacy information
            </p>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-6">Notification Preferences</h2>
          
          <div className="space-y-6 max-w-md">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm" style={{ color: 'var(--slate-400)' }}>
                  Receive important updates via email
                </p>
              </div>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="w-5 h-5 rounded accent-[var(--teal-500)]"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium">Weekly Digest</p>
                <p className="text-sm" style={{ color: 'var(--slate-400)' }}>
                  Summary of opportunities and performance
                </p>
              </div>
              <input
                type="checkbox"
                checked={weeklyDigest}
                onChange={(e) => setWeeklyDigest(e.target.checked)}
                className="w-5 h-5 rounded accent-[var(--teal-500)]"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium">New Opportunity Alerts</p>
                <p className="text-sm" style={{ color: 'var(--slate-400)' }}>
                  Get notified when new opportunities are found
                </p>
              </div>
              <input
                type="checkbox"
                checked={opportunityAlerts}
                onChange={(e) => setOpportunityAlerts(e.target.checked)}
                className="w-5 h-5 rounded accent-[var(--teal-500)]"
              />
            </label>

            <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }} className="btn btn-primary mt-4">
              <Save className="w-4 h-4" />
              Save Preferences
            </button>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-6">Change Password</h2>
          
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--slate-400)' }}
                >
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>
                New Password
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>
                Confirm New Password
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
              />
            </div>

            <button 
              onClick={handleChangePassword} 
              className="btn btn-primary mt-4"
              disabled={!currentPassword || !newPassword || !confirmPassword}
            >
              <Shield className="w-4 h-4" />
              Update Password
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
