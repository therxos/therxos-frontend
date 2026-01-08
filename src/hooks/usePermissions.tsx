// usePermissions.ts - Enhanced Role-based access control hook for TheRxOS
// Supports configurable permissions per pharmacy

import { useAuthStore } from '@/store';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  PHARMACIST: 'pharmacist',
  TECHNICIAN: 'technician',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const PERMISSIONS = {
  // Super Admin only
  ACCESS_ALL_PHARMACIES: 'access_all_pharmacies',
  MANAGE_PLATFORM: 'manage_platform',
  VIEW_PLATFORM_ANALYTICS: 'view_platform_analytics',
  IMPERSONATE_USER: 'impersonate_user',
  
  // Pharmacy Admin
  MANAGE_PHARMACY_USERS: 'manage_pharmacy_users',
  MANAGE_PHARMACY_SETTINGS: 'manage_pharmacy_settings',
  MANAGE_BILLING: 'manage_billing',
  CONFIGURE_PERMISSIONS: 'configure_permissions',
  
  // Opportunities
  VIEW_OPPORTUNITIES: 'view_opportunities',
  ACTION_OPPORTUNITIES: 'action_opportunities',
  DELETE_OPPORTUNITIES: 'delete_opportunities',
  SEND_FAX_DIRECTLY: 'send_fax_directly',
  SUBMIT_TO_APPROVAL: 'submit_to_approval',
  APPROVE_FAX_REQUESTS: 'approve_fax_requests',
  
  // Patients
  VIEW_PATIENTS: 'view_patients',
  VIEW_PATIENT_DETAILS: 'view_patient_details',
  EXPORT_PATIENT_DATA: 'export_patient_data',
  
  // Analytics
  VIEW_ANALYTICS: 'view_analytics',
  VIEW_FINANCIAL_DATA: 'view_financial_data',
  
  // Data
  UPLOAD_DATA: 'upload_data',
  
  // Audit
  VIEW_AUDIT_RISKS: 'view_audit_risks',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Default permissions by role
const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS) as Permission[],
  
  [ROLES.ADMIN]: [
    PERMISSIONS.MANAGE_PHARMACY_USERS,
    PERMISSIONS.MANAGE_PHARMACY_SETTINGS,
    PERMISSIONS.MANAGE_BILLING,
    PERMISSIONS.CONFIGURE_PERMISSIONS,
    PERMISSIONS.VIEW_OPPORTUNITIES,
    PERMISSIONS.ACTION_OPPORTUNITIES,
    PERMISSIONS.DELETE_OPPORTUNITIES,
    PERMISSIONS.SEND_FAX_DIRECTLY,
    PERMISSIONS.APPROVE_FAX_REQUESTS,
    PERMISSIONS.VIEW_PATIENTS,
    PERMISSIONS.VIEW_PATIENT_DETAILS,
    PERMISSIONS.EXPORT_PATIENT_DATA,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_FINANCIAL_DATA,
    PERMISSIONS.UPLOAD_DATA,
    PERMISSIONS.VIEW_AUDIT_RISKS,
  ],
  
  [ROLES.PHARMACIST]: [
    PERMISSIONS.VIEW_OPPORTUNITIES,
    PERMISSIONS.ACTION_OPPORTUNITIES,
    PERMISSIONS.SEND_FAX_DIRECTLY,
    PERMISSIONS.APPROVE_FAX_REQUESTS,
    PERMISSIONS.VIEW_PATIENTS,
    PERMISSIONS.VIEW_PATIENT_DETAILS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_FINANCIAL_DATA,
    PERMISSIONS.UPLOAD_DATA,
    PERMISSIONS.VIEW_AUDIT_RISKS,
  ],
  
  [ROLES.TECHNICIAN]: [
    PERMISSIONS.VIEW_OPPORTUNITIES,
    PERMISSIONS.ACTION_OPPORTUNITIES,
    PERMISSIONS.SUBMIT_TO_APPROVAL,
    PERMISSIONS.VIEW_PATIENTS,
    PERMISSIONS.VIEW_PATIENT_DETAILS,
  ],
};

// Role display info
export const ROLE_INFO: Record<Role, { name: string; description: string; color: string }> = {
  [ROLES.SUPER_ADMIN]: {
    name: 'Super Admin',
    description: 'Platform administrator with access to all pharmacies',
    color: 'text-red-400 bg-red-500/20',
  },
  [ROLES.ADMIN]: {
    name: 'Administrator',
    description: 'Pharmacy owner/manager with full access and user management',
    color: 'text-purple-400 bg-purple-500/20',
  },
  [ROLES.PHARMACIST]: {
    name: 'Pharmacist',
    description: 'Licensed pharmacist with clinical access',
    color: 'text-blue-400 bg-blue-500/20',
  },
  [ROLES.TECHNICIAN]: {
    name: 'Technician',
    description: 'Pharmacy technician with workflow access',
    color: 'text-teal-400 bg-teal-500/20',
  },
};

// Check if a role has a specific permission
export function hasPermission(
  role: Role | string | undefined, 
  permission: Permission,
  permissionOverrides?: Record<string, Record<string, boolean>>
): boolean {
  if (!role) return false;
  
  // Super admin has all permissions
  if (role === ROLES.SUPER_ADMIN) return true;
  
  const basePermissions = DEFAULT_ROLE_PERMISSIONS[role as Role] || [];
  let hasBase = basePermissions.includes(permission);
  
  // Check for pharmacy-specific overrides
  if (permissionOverrides && role in permissionOverrides) {
    const overrides = permissionOverrides[role];
    if (permission in overrides) {
      hasBase = overrides[permission];
    }
  }
  
  return hasBase;
}

// Hook to use permissions in components
export function usePermissions() {
  const user = useAuthStore((state) => state.user);
  const role = (user?.role || 'technician') as Role;
  
  // TODO: Get permission overrides from pharmacy settings
  const permissionOverrides: Record<string, Record<string, boolean>> = {};
  
  const can = (permission: Permission) => hasPermission(role, permission, permissionOverrides);
  
  return {
    role,
    roleInfo: ROLE_INFO[role] || ROLE_INFO[ROLES.TECHNICIAN],
    
    // Role checks
    isSuperAdmin: role === ROLES.SUPER_ADMIN,
    isAdmin: role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN,
    isPharmacist: role === ROLES.PHARMACIST,
    isTechnician: role === ROLES.TECHNICIAN,
    
    // Permission check function
    can,
    canAny: (permissions: Permission[]) => permissions.some(p => can(p)),
    
    // Common permission shortcuts
    canManageUsers: can(PERMISSIONS.MANAGE_PHARMACY_USERS),
    canManageSettings: can(PERMISSIONS.MANAGE_PHARMACY_SETTINGS),
    canManageBilling: can(PERMISSIONS.MANAGE_BILLING),
    canViewOpportunities: can(PERMISSIONS.VIEW_OPPORTUNITIES),
    canActionOpportunities: can(PERMISSIONS.ACTION_OPPORTUNITIES),
    canSendFaxDirectly: can(PERMISSIONS.SEND_FAX_DIRECTLY),
    canApproveFaxRequests: can(PERMISSIONS.APPROVE_FAX_REQUESTS),
    canViewPatients: can(PERMISSIONS.VIEW_PATIENTS),
    canViewPatientDetails: can(PERMISSIONS.VIEW_PATIENT_DETAILS),
    canViewAnalytics: can(PERMISSIONS.VIEW_ANALYTICS),
    canViewFinancialData: can(PERMISSIONS.VIEW_FINANCIAL_DATA),
    canUploadData: can(PERMISSIONS.UPLOAD_DATA),
    canViewAuditRisks: can(PERMISSIONS.VIEW_AUDIT_RISKS),
    canAccessAllPharmacies: can(PERMISSIONS.ACCESS_ALL_PHARMACIES),
  };
}

// Component to conditionally render based on permissions
interface PermissionGateProps {
  permission: Permission | Permission[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { can, canAny } = usePermissions();
  
  const hasAccess = Array.isArray(permission) 
    ? canAny(permission)
    : can(permission);
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

export default usePermissions;
