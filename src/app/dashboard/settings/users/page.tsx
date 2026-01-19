'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import usePermissions, { PERMISSIONS, ROLES, ROLE_INFO } from '@/hooks/usePermissions';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Shield,
  Mail,
  ChevronDown,
  AlertCircle,
  Settings,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface User {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login: string;
}

interface PharmacySettings {
  fax_limits: {
    max_per_day: number;
    same_prescriber_cooldown_days: number;
    require_approval_for_technicians: boolean;
  };
  permission_overrides: Record<string, Record<string, boolean>>;
}

const CONFIGURABLE_PERMISSIONS = {
  pharmacist: [
    { key: 'send_fax_directly', label: 'Send faxes directly', default: true },
    { key: 'view_patient_details', label: 'View patient details', default: true },
    { key: 'view_financial_data', label: 'View financial data', default: true },
    { key: 'upload_data', label: 'Upload data files', default: true },
  ],
  technician: [
    { key: 'send_fax_directly', label: 'Send faxes directly (skip approval)', default: false },
    { key: 'view_patient_details', label: 'View patient details', default: true },
    { key: 'view_financial_data', label: 'View financial data', default: false },
    { key: 'view_analytics', label: 'View analytics', default: false },
    { key: 'upload_data', label: 'Upload data files', default: false },
  ],
};

export default function UserManagementPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { canManageUsers, isAdmin } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<PharmacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'fax'>('users');

  // New user form state
  const [newUser, setNewUser] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'technician',
    send_invite: true,
  });

  // Re-fetch when pharmacy changes (e.g., after impersonation)
  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    if (user?.pharmacyId) fetchData();
  }, [isAdmin, user?.pharmacyId]);

  async function fetchData() {
    setLoading(true);
    try {
      const token = localStorage.getItem('therxos_token');
      
      const [usersRes, settingsRes] = await Promise.all([
        fetch(`${API_URL}/api/users`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/pharmacy/settings`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
      
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function createUser() {
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });
      
      if (res.ok) {
        setShowAddModal(false);
        setNewUser({ email: '', first_name: '', last_name: '', role: 'technician', send_invite: true });
        fetchData();
      }
    } catch (err) {
      console.error('Failed to create user:', err);
    }
  }

  async function updateUserRole(userId: string, role: string) {
    try {
      const token = localStorage.getItem('therxos_token');
      await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });
      fetchData();
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  }

  async function toggleUserActive(userId: string, isActive: boolean) {
    try {
      const token = localStorage.getItem('therxos_token');
      await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: isActive }),
      });
      fetchData();
    } catch (err) {
      console.error('Failed to toggle user:', err);
    }
  }

  async function updateSettings(newSettings: Partial<PharmacySettings>) {
    try {
      const token = localStorage.getItem('therxos_token');
      await fetch(`${API_URL}/api/pharmacy/settings`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });
      fetchData();
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  }

  function togglePermission(role: string, permission: string) {
    const currentOverrides = settings?.permission_overrides || {};
    const roleOverrides = currentOverrides[role] || {};
    const currentValue = roleOverrides[permission];
    const defaultValue = CONFIGURABLE_PERMISSIONS[role as keyof typeof CONFIGURABLE_PERMISSIONS]
      ?.find(p => p.key === permission)?.default ?? true;
    
    const newValue = currentValue === undefined ? !defaultValue : !currentValue;
    
    updateSettings({
      permission_overrides: {
        ...currentOverrides,
        [role]: {
          ...roleOverrides,
          [permission]: newValue,
        },
      },
    });
  }

  function getPermissionValue(role: string, permission: string): boolean {
    const override = settings?.permission_overrides?.[role]?.[permission];
    if (override !== undefined) return override;
    return CONFIGURABLE_PERMISSIONS[role as keyof typeof CONFIGURABLE_PERMISSIONS]
      ?.find(p => p.key === permission)?.default ?? true;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400">Only administrators can manage users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Team Management</h1>
        <p className="text-slate-400">Manage users, roles, and permissions for your pharmacy</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'users', label: 'Users', icon: Users },
          { key: 'permissions', label: 'Role Permissions', icon: Shield },
          { key: 'fax', label: 'Fax Settings', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-teal-500 text-white'
                : 'bg-[#0d2137] text-slate-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl">
          <div className="px-6 py-4 border-b border-[#1e3a5f] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Team Members</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>
          </div>
          
          <div className="divide-y divide-[#1e3a5f]">
            {users.map((user) => (
              <div key={user.user_id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-medium">
                    {user.first_name[0]}{user.last_name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-white">{user.first_name} {user.last_name}</p>
                    <p className="text-sm text-slate-400">{user.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${ROLE_INFO[user.role as keyof typeof ROLE_INFO]?.color || 'bg-slate-500/20 text-slate-400'}`}>
                    {ROLE_INFO[user.role as keyof typeof ROLE_INFO]?.name || user.role}
                  </span>
                  
                  <select
                    value={user.role}
                    onChange={(e) => updateUserRole(user.user_id, e.target.value)}
                    className="bg-[#1e3a5f] border border-[#2d4a6f] rounded-lg px-3 py-1 text-sm text-white"
                    disabled={user.role === 'admin'} // Can't demote yourself
                  >
                    <option value="admin">Administrator</option>
                    <option value="pharmacist">Pharmacist</option>
                    <option value="technician">Technician</option>
                  </select>
                  
                  <button
                    onClick={() => toggleUserActive(user.user_id, !user.is_active)}
                    className={`p-2 rounded-lg ${user.is_active ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-slate-400 hover:bg-slate-500/20'}`}
                    title={user.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {user.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="space-y-6">
          {(['pharmacist', 'technician'] as const).map((role) => (
            <div key={role} className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl">
              <div className="px-6 py-4 border-b border-[#1e3a5f]">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${ROLE_INFO[role]?.color}`}>
                    {ROLE_INFO[role]?.name}
                  </span>
                  <span className="text-slate-400 text-sm">{ROLE_INFO[role]?.description}</span>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {CONFIGURABLE_PERMISSIONS[role].map((perm) => (
                  <div key={perm.key} className="flex items-center justify-between">
                    <span className="text-white">{perm.label}</span>
                    <button
                      onClick={() => togglePermission(role, perm.key)}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        getPermissionValue(role, perm.key) ? 'bg-teal-500' : 'bg-slate-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        getPermissionValue(role, perm.key) ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fax Settings Tab */}
      {activeTab === 'fax' && (
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Fax Limits & Controls</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Max faxes per day</label>
              <input
                type="number"
                value={settings?.fax_limits?.max_per_day || 10}
                onChange={(e) => updateSettings({
                  fax_limits: {
                    ...settings?.fax_limits,
                    max_per_day: parseInt(e.target.value) || 10,
                    same_prescriber_cooldown_days: settings?.fax_limits?.same_prescriber_cooldown_days || 7,
                    require_approval_for_technicians: settings?.fax_limits?.require_approval_for_technicians ?? true,
                  }
                })}
                className="w-32 px-4 py-2 bg-[#1e3a5f] border border-[#2d4a6f] rounded-lg text-white"
              />
              <p className="text-xs text-slate-500 mt-1">Limit automated faxes to prevent spam</p>
            </div>
            
            <div>
              <label className="block text-sm text-slate-400 mb-2">Same prescriber cooldown (days)</label>
              <input
                type="number"
                value={settings?.fax_limits?.same_prescriber_cooldown_days || 7}
                onChange={(e) => updateSettings({
                  fax_limits: {
                    ...settings?.fax_limits,
                    max_per_day: settings?.fax_limits?.max_per_day || 10,
                    same_prescriber_cooldown_days: parseInt(e.target.value) || 7,
                    require_approval_for_technicians: settings?.fax_limits?.require_approval_for_technicians ?? true,
                  }
                })}
                className="w-32 px-4 py-2 bg-[#1e3a5f] border border-[#2d4a6f] rounded-lg text-white"
              />
              <p className="text-xs text-slate-500 mt-1">Minimum days between faxes to the same prescriber</p>
            </div>
            
            <div className="flex items-center justify-between py-4 border-t border-[#1e3a5f]">
              <div>
                <p className="text-white font-medium">Require approval for technician faxes</p>
                <p className="text-sm text-slate-400">Technicians must submit faxes for pharmacist/admin approval</p>
              </div>
              <button
                onClick={() => updateSettings({
                  fax_limits: {
                    ...settings?.fax_limits,
                    max_per_day: settings?.fax_limits?.max_per_day || 10,
                    same_prescriber_cooldown_days: settings?.fax_limits?.same_prescriber_cooldown_days || 7,
                    require_approval_for_technicians: !settings?.fax_limits?.require_approval_for_technicians,
                  }
                })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings?.fax_limits?.require_approval_for_technicians !== false ? 'bg-teal-500' : 'bg-slate-600'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings?.fax_limits?.require_approval_for_technicians !== false ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowAddModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-white mb-6">Add Team Member</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">First Name</label>
                    <input
                      type="text"
                      value={newUser.first_name}
                      onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                      className="w-full px-4 py-2 bg-[#1e3a5f] border border-[#2d4a6f] rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={newUser.last_name}
                      onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                      className="w-full px-4 py-2 bg-[#1e3a5f] border border-[#2d4a6f] rounded-lg text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1e3a5f] border border-[#2d4a6f] rounded-lg text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1e3a5f] border border-[#2d4a6f] rounded-lg text-white"
                  >
                    <option value="pharmacist">Pharmacist</option>
                    <option value="technician">Technician</option>
                  </select>
                </div>
                
                <label className="flex items-center gap-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={newUser.send_invite}
                    onChange={(e) => setNewUser({ ...newUser, send_invite: e.target.checked })}
                    className="rounded"
                  />
                  Send email invitation
                </label>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={createUser}
                  className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
                >
                  Add User
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
