
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminUser, AuditLog } from './types';

interface AuthContextType {
  user: AdminUser | null;
  login: (user: AdminUser) => void;
  logout: () => void;
  logActivity: (action: AuditLog['action'], module: string, description: string) => void;
  isAuthenticated: boolean;
  isSuperadmin: boolean;
  canEdit: boolean;
  isAdminUangMakan: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Auth initialization error:", e);
        localStorage.removeItem('auth_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData: AdminUser) => {
    setUser(userData);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    logActivity('LOGIN', 'Auth', `User ${userData.name} berhasil login ke sistem.`, userData);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
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

  const isAuthenticated = !!user;
  const isSuperadmin = user?.role === 'Superadmin';
  const isAdminUangMakan = user?.role === 'Admin Uang Makan';
  const canEdit = user?.role === 'Superadmin' || user?.role === 'Editor';

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, logActivity, isAuthenticated, isSuperadmin, canEdit, isAdminUangMakan }}>
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
