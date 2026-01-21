import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, UserRole } from '../types';

// Mock Users for Simulation
const MOCK_USERS: Record<string, UserProfile> = {
  'admin@coreflow.io': {
    id: 'u-admin-01',
    email: 'admin@coreflow.io',
    full_name: 'Carlos Rivera',
    job_title: 'Plant Manager',
    role: UserRole.ADMIN_SOLICITANTE,
    tenant_id: 'tenant-mx-01',
    status: 'ACTIVE'
  },
  'tech@coreflow.io': {
    id: 'u-tech-01',
    email: 'tech@coreflow.io',
    full_name: 'Sarah Connor',
    job_title: 'Senior Mechanic',
    role: UserRole.TECNICO_MANT,
    tenant_id: 'tenant-mx-01',
    status: 'ACTIVE'
  },
  'auditor@coreflow.io': {
    id: 'u-audit-01',
    email: 'auditor@coreflow.io',
    full_name: 'Mike Ross',
    job_title: 'Safety Inspector',
    role: UserRole.AUDITOR,
    tenant_id: 'tenant-mx-01',
    status: 'ACTIVE'
  }
};

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate Session Check on Mount
  useEffect(() => {
    const storedUser = localStorage.getItem('coreflow_session');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    // Simulate Network Delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simple Mock Authentication Logic
    // In production, this would call supabase.auth.signInWithPassword()
    const mockUser = MOCK_USERS[email];
    
    if (mockUser && password.length > 3) {
      setUser(mockUser);
      localStorage.setItem('coreflow_session', JSON.stringify(mockUser));
      setIsLoading(false);
    } else {
      setIsLoading(false);
      throw new Error('Invalid credentials');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('coreflow_session');
  };

  const hasRole = (allowedRoles: UserRole[]) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};