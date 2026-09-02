
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminUser, AuditLog, SDMRole } from './types';

interface AuthContextType {
  user: AdminUser | null;
  login: (user: AdminUser) => void;
  logout: () => void;
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
  hasRole: (roleName: string) => boolean;
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
        // Normalize roles array if only single role is present
        if (!parsed.roles || parsed.roles.length === 0) {
          parsed.roles = parsed.role ? [parsed.role] : ['Viewer'];
        }
        if (!parsed.activeRole) {
          parsed.activeRole = parsed.roles[0] || parsed.role || 'Viewer';
        }
        setUser(parsed);
      } catch (e) {
        console.error("Auth initialization error:", e);
        localStorage.removeItem('auth_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData: AdminUser) => {
    // Ensure roles array is populated
    const rolesList = Array.isArray(userData.roles) && userData.roles.length > 0 
      ? Array.from(new Set([userData.role, ...userData.roles])).filter(Boolean) as (SDMRole | string)[]
      : [userData.role || 'Viewer'];

    const normalizedUser: AdminUser = {
      ...userData,
      roles: rolesList,
      activeRole: userData.activeRole || rolesList[0] || userData.role || 'Viewer'
    };

    setUser(normalizedUser);
    localStorage.setItem('auth_user', JSON.stringify(normalizedUser));
    logActivity('LOGIN', 'Auth', `User ${normalizedUser.name} (${rolesList.join(', ')}) berhasil login ke sistem.`, normalizedUser);
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
  const rawRoles: string[] = user ? [
    ...(Array.isArray(user.roles) ? user.roles : []),
    user.role,
    user.activeRole
  ].filter(Boolean) as string[] : [];
  
  const userRoles = Array.from(new Set(rawRoles));

  const hasRole = (roleName: string): boolean => {
    if (!user) return false;
    if (user.role === 'Superadmin' || userRoles.includes('Superadmin')) return true;
    const search = roleName.toLowerCase().trim();
    return userRoles.some(r => {
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
