'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store';
import { settingsApi, authApi } from '@/lib/api';
import {
  User,
  Building2,
  Bell,
  Shield,
  Save,
  Check,
  Eye,
  EyeOff,
  Lightbulb,
  UserX,
  Users,
  Plus,
  Trash2,
  X,
  Loader2,
  Mail,
  Copy
} from 'lucide-react';

const OPPORTUNITY_TYPES = {
  missing_therapy: {
    label: 'Missing Therapy',
    description: 'Patients missing recommended medications based on their conditions'
  },
  therapeutic_interchange: {
    label: 'Therapeutic Interchange',
    description: 'Drug substitutions for better patient outcomes or cost savings'
  },
  ndc_optimization: {
    label: 'NDC Optimization',
    description: 'Product switches to improve margins or availability'
  }
};

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', description: 'Full access to all features' },
  { value: 'pharmacist', label: 'Pharmacist', description: 'Clinical access, can approve changes' },
  { value: 'technician', label: 'Technician', description: 'Limited access, needs approval for faxes' },
  { value: 'staff', label: 'Staff', description: 'View-only access' }
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';

  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

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

  // New user modal state
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserRole, setNewUserRole] = useState('technician');
  const [createdUser, setCreatedUser] = useState<any>(null);

  // New prescriber modal state
  const [showPrescriberModal, setShowPrescriberModal] = useState(false);
  const [newPrescriberName, setNewPrescriberName] = useState('');
  const [newPrescriberNpi, setNewPrescriberNpi] = useState('');
  const [newPrescriberDea, setNewPrescriberDea] = useState('');
  const [newPrescriberReason, setNewPrescriberReason] = useState('');

  // Fetch pharmacy settings
  const { data: pharmacySettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['pharmacy-settings', user?.pharmacyId],
    queryFn: () => settingsApi.getPharmacySettings(user!.pharmacyId).then(r => r.data),
    enabled: !!user?.pharmacyId && isOwnerOrAdmin
  });

  // Fetch excluded prescribers
  const { data: excludedPrescribers, isLoading: prescribersLoading } = useQuery({
    queryKey: ['excluded-prescribers', user?.pharmacyId],
    queryFn: () => settingsApi.getExcludedPrescribers(user!.pharmacyId).then(r => r.data),
    enabled: !!user?.pharmacyId && isOwnerOrAdmin
  });

  // Fetch pharmacy users
  const { data: pharmacyUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['pharmacy-users', user?.pharmacyId],
    queryFn: () => settingsApi.getPharmacyUsers(user!.pharmacyId).then(r => r.data),
    enabled: !!user?.pharmacyId && isOwnerOrAdmin
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (settings: any) => settingsApi.updatePharmacySettings(user!.pharmacyId, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to save settings');
      setTimeout(() => setError(''), 5000);
    }
  });

  // Add excluded prescriber mutation
  const addPrescriberMutation = useMutation({
    mutationFn: (data: any) => settingsApi.addExcludedPrescriber(user!.pharmacyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excluded-prescribers'] });
      setShowPrescriberModal(false);
      setNewPrescriberName('');
      setNewPrescriberNpi('');
      setNewPrescriberDea('');
      setNewPrescriberReason('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to add prescriber');
      setTimeout(() => setError(''), 5000);
    }
  });

  // Remove excluded prescriber mutation
  const removePrescriberMutation = useMutation({
    mutationFn: (id: string) => settingsApi.removeExcludedPrescriber(user!.pharmacyId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excluded-prescribers'] });
    }
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (data: any) => settingsApi.createUser(user!.pharmacyId, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-users'] });
      setCreatedUser(response.data);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to create user');
      setTimeout(() => setError(''), 5000);
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: any }) =>
      settingsApi.updateUser(user!.pharmacyId, userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-users'] });
    }
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => {
      setSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to change password');
      setTimeout(() => setError(''), 5000);
    }
  });

  const handleSaveProfile = async () => {
    updateUser({ firstName, lastName });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setTimeout(() => setError(''), 5000);
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      setTimeout(() => setError(''), 5000);
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const handleToggleOpportunityType = (type: string, enabled: boolean) => {
    const newSettings = {
      ...pharmacySettings,
      enabledOpportunityTypes: {
        ...pharmacySettings?.enabledOpportunityTypes,
        [type]: enabled
      }
    };
    updateSettingsMutation.mutate(newSettings);
  };

  const handleCreateUser = () => {
    if (!newUserEmail || !newUserFirstName || !newUserLastName) {
      setError('All fields are required');
      setTimeout(() => setError(''), 5000);
      return;
    }
    createUserMutation.mutate({
      email: newUserEmail,
      firstName: newUserFirstName,
      lastName: newUserLastName,
      role: newUserRole
    });
  };

  const handleAddPrescriber = () => {
    if (!newPrescriberName) {
      setError('Prescriber name is required');
      setTimeout(() => setError(''), 5000);
      return;
    }
    if (!newPrescriberNpi && !newPrescriberDea) {
      setError('Either NPI or DEA is required');
      setTimeout(() => setError(''), 5000);
      return;
    }
    addPrescriberMutation.mutate({
      prescriberName: newPrescriberName,
      prescriberNpi: newPrescriberNpi || undefined,
      prescriberDea: newPrescriberDea || undefined,
      reason: newPrescriberReason || undefined
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'pharmacy', label: 'Pharmacy', icon: Building2 },
    ...(isOwnerOrAdmin ? [
      { id: 'opportunities', label: 'Opportunities', icon: Lightbulb },
      { id: 'prescribers', label: 'Prescribers', icon: UserX },
      { id: 'team', label: 'Team', icon: Users }
    ] : []),
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1" style={{ color: 'var(--slate-400)' }}>
          Manage your account and pharmacy preferences
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

      {/* Success/Error Messages */}
      {saved && (
        <div className="p-4 rounded-lg flex items-center gap-3" style={{ background: 'var(--green-100)' }}>
          <Check className="w-5 h-5" style={{ color: '#166534' }} />
          <span style={{ color: '#166534' }}>Settings saved successfully</span>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-lg flex items-center gap-3" style={{ background: 'var(--red-100)' }}>
          <X className="w-5 h-5" style={{ color: '#991b1b' }} />
          <span style={{ color: '#991b1b' }}>{error}</span>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-6">Profile Information</h2>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>First Name</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>Last Name</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>Email</label>
              <input type="email" value={email} className="input" disabled />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>Role</label>
              <input type="text" value={user?.role || 'Staff'} className="input capitalize" disabled />
            </div>
            <button onClick={handleSaveProfile} className="btn btn-primary mt-4">
              <Save className="w-4 h-4" /> Save Changes
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
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>Pharmacy Name</label>
              <input type="text" value={user?.pharmacyName || ''} className="input" disabled />
            </div>
            <p className="text-sm" style={{ color: 'var(--slate-500)' }}>Contact support to update pharmacy information</p>
          </div>
        </div>
      )}

      {/* Opportunities Tab (Owner/Admin only) */}
      {activeTab === 'opportunities' && isOwnerOrAdmin && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-2">Opportunity Settings</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--slate-400)' }}>
            Enable or disable opportunity types for your pharmacy
          </p>

          {settingsLoading ? (
            <div className="flex items-center gap-2" style={{ color: 'var(--slate-400)' }}>
              <Loader2 className="w-4 h-4 animate-spin" /> Loading settings...
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(OPPORTUNITY_TYPES).map(([type, info]) => (
                <label key={type} className="flex items-start gap-4 p-4 rounded-lg cursor-pointer hover:bg-[var(--navy-700)]" style={{ background: 'var(--navy-800)' }}>
                  <input
                    type="checkbox"
                    checked={pharmacySettings?.enabledOpportunityTypes?.[type] !== false}
                    onChange={(e) => handleToggleOpportunityType(type, e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded accent-[var(--teal-500)]"
                    disabled={updateSettingsMutation.isPending}
                  />
                  <div>
                    <p className="font-medium">{info.label}</p>
                    <p className="text-sm" style={{ color: 'var(--slate-400)' }}>{info.description}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Prescribers Tab (Owner/Admin only) */}
      {activeTab === 'prescribers' && isOwnerOrAdmin && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Excluded Prescribers</h2>
              <p className="text-sm" style={{ color: 'var(--slate-400)' }}>
                Opportunities from these prescribers will be hidden
              </p>
            </div>
            <button onClick={() => setShowPrescriberModal(true)} className="btn btn-primary">
              <Plus className="w-4 h-4" /> Add Prescriber
            </button>
          </div>

          {prescribersLoading ? (
            <div className="flex items-center gap-2" style={{ color: 'var(--slate-400)' }}>
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          ) : excludedPrescribers?.length === 0 ? (
            <p className="text-center py-8" style={{ color: 'var(--slate-400)' }}>
              No excluded prescribers. All prescribers are included in opportunity scanning.
            </p>
          ) : (
            <div className="space-y-2">
              {excludedPrescribers?.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'var(--navy-700)' }}>
                  <div>
                    <p className="font-medium">{p.prescriber_name}</p>
                    <p className="text-sm" style={{ color: 'var(--slate-400)' }}>
                      {p.prescriber_npi && `NPI: ${p.prescriber_npi}`}
                      {p.prescriber_npi && p.prescriber_dea && ' • '}
                      {p.prescriber_dea && `DEA: ${p.prescriber_dea}`}
                    </p>
                    {p.reason && <p className="text-sm mt-1" style={{ color: 'var(--slate-500)' }}>Reason: {p.reason}</p>}
                  </div>
                  <button
                    onClick={() => removePrescriberMutation.mutate(p.id)}
                    className="icon-btn text-red-400 hover:text-red-300"
                    disabled={removePrescriberMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Team Tab (Owner/Admin only) */}
      {activeTab === 'team' && isOwnerOrAdmin && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Team Members</h2>
              <p className="text-sm" style={{ color: 'var(--slate-400)' }}>
                Manage staff accounts for your pharmacy
              </p>
            </div>
            <button onClick={() => { setShowNewUserModal(true); setCreatedUser(null); }} className="btn btn-primary">
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>

          {usersLoading ? (
            <div className="flex items-center gap-2" style={{ color: 'var(--slate-400)' }}>
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          ) : (
            <div className="space-y-2">
              {pharmacyUsers?.map((u: any) => (
                <div key={u.user_id} className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'var(--navy-700)' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-medium" style={{ background: 'var(--teal-500)', color: 'var(--navy-900)' }}>
                      {u.first_name?.[0]}{u.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-medium">{u.first_name} {u.last_name}</p>
                      <p className="text-sm" style={{ color: 'var(--slate-400)' }}>{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <select
                      value={u.role}
                      onChange={(e) => updateUserMutation.mutate({ userId: u.user_id, data: { role: e.target.value } })}
                      className="input py-1 px-2 text-sm"
                      disabled={u.user_id === user?.userId || u.role === 'owner'}
                    >
                      {u.role === 'owner' && <option value="owner">Owner</option>}
                      <option value="admin">Admin</option>
                      <option value="pharmacist">Pharmacist</option>
                      <option value="technician">Technician</option>
                      <option value="staff">Staff</option>
                    </select>
                    {u.user_id !== user?.userId && u.role !== 'owner' && (
                      <button
                        onClick={() => updateUserMutation.mutate({ userId: u.user_id, data: { isActive: !u.is_active } })}
                        className={`text-sm ${u.is_active ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
                <p className="text-sm" style={{ color: 'var(--slate-400)' }}>Receive important updates via email</p>
              </div>
              <input type="checkbox" checked={emailNotifications} onChange={(e) => setEmailNotifications(e.target.checked)} className="w-5 h-5 rounded accent-[var(--teal-500)]" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium">Weekly Digest</p>
                <p className="text-sm" style={{ color: 'var(--slate-400)' }}>Summary of opportunities and performance</p>
              </div>
              <input type="checkbox" checked={weeklyDigest} onChange={(e) => setWeeklyDigest(e.target.checked)} className="w-5 h-5 rounded accent-[var(--teal-500)]" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium">New Opportunity Alerts</p>
                <p className="text-sm" style={{ color: 'var(--slate-400)' }}>Get notified when new opportunities are found</p>
              </div>
              <input type="checkbox" checked={opportunityAlerts} onChange={(e) => setOpportunityAlerts(e.target.checked)} className="w-5 h-5 rounded accent-[var(--teal-500)]" />
            </label>
            <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }} className="btn btn-primary mt-4">
              <Save className="w-4 h-4" /> Save Preferences
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
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>Current Password</label>
              <div className="relative">
                <input type={showPasswords ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input pr-10" />
                <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--slate-400)' }}>
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>New Password</label>
              <input type={showPasswords ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>Confirm New Password</label>
              <input type={showPasswords ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input" />
            </div>
            <button onClick={handleChangePassword} className="btn btn-primary mt-4" disabled={!currentPassword || !newPassword || !confirmPassword || changePasswordMutation.isPending}>
              {changePasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              Update Password
            </button>
          </div>
        </div>
      )}

      {/* New User Modal */}
      {showNewUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full">
            {createdUser ? (
              <>
                <h3 className="text-lg font-semibold mb-4">User Created Successfully</h3>
                <div className="space-y-4">
                  <p className="text-sm" style={{ color: 'var(--slate-400)' }}>
                    Share these credentials with <strong>{createdUser.firstName}</strong>:
                  </p>
                  <div className="p-4 rounded-lg" style={{ background: 'var(--navy-700)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm" style={{ color: 'var(--slate-400)' }}>Email:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{createdUser.email}</span>
                        <button onClick={() => copyToClipboard(createdUser.email)} className="icon-btn">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: 'var(--slate-400)' }}>Password:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{createdUser.password}</span>
                        <button onClick={() => copyToClipboard(createdUser.password)} className="icon-btn">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--amber-400)' }}>
                    Make sure to save this password - it cannot be retrieved later.
                  </p>
                  <button onClick={() => { setShowNewUserModal(false); setCreatedUser(null); setNewUserEmail(''); setNewUserFirstName(''); setNewUserLastName(''); }} className="btn btn-primary w-full">
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Add New User</h3>
                  <button onClick={() => setShowNewUserModal(false)} className="icon-btn">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>Email</label>
                    <input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="input" placeholder="user@example.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>First Name</label>
                      <input type="text" value={newUserFirstName} onChange={(e) => setNewUserFirstName(e.target.value)} className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>Last Name</label>
                      <input type="text" value={newUserLastName} onChange={(e) => setNewUserLastName(e.target.value)} className="input" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>Role</label>
                    <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} className="input">
                      {ROLE_OPTIONS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <p className="text-xs mt-1" style={{ color: 'var(--slate-500)' }}>
                      {ROLE_OPTIONS.find(r => r.value === newUserRole)?.description}
                    </p>
                  </div>
                  <button onClick={handleCreateUser} className="btn btn-primary w-full" disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create User
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* New Prescriber Modal */}
      {showPrescriberModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Add Excluded Prescriber</h3>
              <button onClick={() => setShowPrescriberModal(false)} className="icon-btn">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>Prescriber Name *</label>
                <input type="text" value={newPrescriberName} onChange={(e) => setNewPrescriberName(e.target.value)} className="input" placeholder="Dr. John Smith" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>NPI</label>
                <input type="text" value={newPrescriberNpi} onChange={(e) => setNewPrescriberNpi(e.target.value)} className="input" placeholder="1234567890" maxLength={10} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>DEA</label>
                <input type="text" value={newPrescriberDea} onChange={(e) => setNewPrescriberDea(e.target.value)} className="input" placeholder="AB1234567" maxLength={9} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>Reason (optional)</label>
                <input type="text" value={newPrescriberReason} onChange={(e) => setNewPrescriberReason(e.target.value)} className="input" placeholder="e.g., Retired, not accepting changes" />
              </div>
              <p className="text-sm" style={{ color: 'var(--slate-500)' }}>* Either NPI or DEA is required</p>
              <button onClick={handleAddPrescriber} className="btn btn-primary w-full" disabled={addPrescriberMutation.isPending}>
                {addPrescriberMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add to Exclusion List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
