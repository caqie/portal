
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminUser, AuditLog, SDMRole, normalizeRolesList } from './types';

interface AuthContextType {
  user: AdminUser | null;
  login: (user: AdminUser) => void;
  logout: () => void;
  updateUser: (updatedUser: Partial<AdminUser>) => void;
  logActivity: (action: AuditLog['action'], module: string, description: string) => void;
  isAuthenticated: boolean;
  isSuperadmin: boolean;
  canEdit: boolean;
  isAdminUangMakan: boolean;
  isAdminPerencanaan: boolean;
  isAdminBangkom: boolean;
  isAdminKarier: boolean;
  userRoles: string[];
  activeRole: string;
  setActiveRole: (role: string) => void;
  hasRole: (roleName?: string) => boolean;
  isMultiRole: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try {
        const parsed: AdminUser = JSON.parse(savedUser);
        const rolesList = normalizeRolesList(parsed.roles, parsed.role);
        const primaryRole = parsed.role || rolesList[0] || 'Viewer';
        const activeRole = parsed.activeRole && rolesList.includes(parsed.activeRole as any)
          ? parsed.activeRole
          : primaryRole;

        const normalized: AdminUser = {
          ...parsed,
          role: primaryRole,
          roles: rolesList,
          activeRole: activeRole
        };
        setUser(normalized);
      } catch (e) {
        console.error("Auth initialization error:", e);
        localStorage.removeItem('auth_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData: AdminUser) => {
    const rolesList = normalizeRolesList(userData.roles, userData.role);
    const primaryRole = userData.role || rolesList[0] || 'Viewer';
    const activeRole = userData.activeRole && rolesList.includes(userData.activeRole as any)
      ? userData.activeRole
      : (rolesList[0] || primaryRole);

    const normalizedUser: AdminUser = {
      ...userData,
      role: primaryRole,
      roles: rolesList,
      activeRole: activeRole
    };

    setUser(normalizedUser);
    localStorage.setItem('auth_user', JSON.stringify(normalizedUser));
    logActivity('LOGIN', 'Auth', `User ${normalizedUser.name} (${rolesList.join(', ')}) berhasil login ke sistem.`, normalizedUser);
  };

  const updateUser = (updatedData: Partial<AdminUser>) => {
    setUser(prev => {
      if (!prev) return null;
      const rolesList = normalizeRolesList(updatedData.roles ?? prev.roles, updatedData.role ?? prev.role);
      const primaryRole = updatedData.role || (rolesList.includes(prev.role as any) ? prev.role : rolesList[0]) || 'Viewer';
      const activeRole = updatedData.activeRole && rolesList.includes(updatedData.activeRole as any)
        ? updatedData.activeRole
        : (prev.activeRole && rolesList.includes(prev.activeRole as any) ? prev.activeRole : primaryRole);

      const updated: AdminUser = {
        ...prev,
        ...updatedData,
        role: primaryRole,
        roles: rolesList,
        activeRole: activeRole
      };
      localStorage.setItem('auth_user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  const setActiveRole = (role: string) => {
    if (!user) return;
    const updated = { ...user, activeRole: role };
    setUser(updated);
    localStorage.setItem('auth_user', JSON.stringify(updated));
    logActivity('UPDATE', 'Auth', `User ${user.name} beralih peran aktif ke ${role}.`, updated);
  };

  const logActivity = (action: AuditLog['action'], module: string, description: string, overrideUser?: AdminUser) => {
    const activeUser = overrideUser || user;
    if (!activeUser) return;

    const newLog: AuditLog = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toLocaleString('id-ID'),
      userNip: activeUser.nip,
      userName: activeUser.name,
      action,
      module,
      description
    };

    const existingLogsRaw = localStorage.getItem('portal_audit_logs');
    let existingLogs = [];
    if (existingLogsRaw) {
      try {
        existingLogs = JSON.parse(existingLogsRaw);
      } catch (e) {
        existingLogs = [];
      }
    }
    localStorage.setItem('portal_audit_logs', JSON.stringify([newLog, ...existingLogs].slice(0, 1000)));
  };

  // Roles calculation
  const rawRoles: string[] = [];
  if (user) {
    if (Array.isArray(user.roles)) {
      user.roles.forEach(r => { if (r && typeof r === 'string') rawRoles.push(r.trim()); });
    }
    if (user.role && typeof user.role === 'string') rawRoles.push(user.role.trim());
    if (user.activeRole && typeof user.activeRole === 'string') rawRoles.push(user.activeRole.trim());
  }
  
  const userRoles = Array.from(new Set(rawRoles.filter(Boolean)));

  const hasRole = (roleName?: string): boolean => {
    if (!user || !roleName || typeof roleName !== 'string') return false;
    if (user.role === 'Superadmin' || userRoles.includes('Superadmin')) return true;
    const search = roleName.toLowerCase().trim();
    if (!search) return false;
    return userRoles.some(r => {
      if (!r || typeof r !== 'string') return false;
      const lower = r.toLowerCase().trim();
      return lower === search || lower.includes(search) || search.includes(lower);
    });
  };

  const isAuthenticated = !!user;
  const isSuperadmin = hasRole('Superadmin');
  const isAdminUangMakan = hasRole('Admin Uang Makan');
  const isAdminPerencanaan = hasRole('Admin Perencanaan & Layanan') || hasRole('Admin Perencanaan') || isSuperadmin;
  const isAdminBangkom = hasRole('Admin Pengembangan Kompetensi') || hasRole('Admin Bangkom') || isSuperadmin;
  const isAdminKarier = hasRole('Admin Pengelolaan Karier') || hasRole('Admin Manajemen Karier') || isSuperadmin;
  
  const canEdit = isSuperadmin || userRoles.some(r => [
    'Editor', 
    'Admin Perencanaan & Layanan', 
    'Admin Pengembangan Kompetensi', 
    'Admin Pengelolaan Karier', 
    'Admin Uang Makan'
  ].includes(r));

  const activeRole = user?.activeRole || user?.role || 'Viewer';
  const isMultiRole = userRoles.length > 1;

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      updateUser,
      logActivity, 
      isAuthenticated, 
      isSuperadmin, 
      canEdit, 
      isAdminUangMakan,
      isAdminPerencanaan,
      isAdminBangkom,
      isAdminKarier,
      userRoles,
      activeRole,
      setActiveRole,
      hasRole,
      isMultiRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
