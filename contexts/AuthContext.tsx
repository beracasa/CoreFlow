import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, UserRole } from '../types';
import { supabase } from '../src/services/supabaseClient';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Map Supabase User to UserProfile
  const mapSupabaseUser = (sbUser: any): UserProfile | null => {
    if (!sbUser) return null;
    
    // In a real app, user meta would come from a 'profiles' table or user_metadata
    // For now, we fallback to defaults if metadata is missing/incomplete
    const metadata = sbUser.user_metadata || {};
    
    return {
        id: sbUser.id,
        email: sbUser.email || '',
        full_name: metadata.full_name || 'Agente Supabase',
        role: metadata.role || UserRole.ADMIN_SOLICITANTE, // Default until roles logic is hardened
        tenant_id: metadata.tenant_id || 'default-tenant',
        status: 'ACTIVE',
        job_title: metadata.job_title || 'Operator'
    };
  };

  useEffect(() => {
    // 1. Check active session
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            setUser(mapSupabaseUser(session.user));
        }
        setIsLoading(false);
    };
    
    checkSession();

    // 2. Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
            setUser(mapSupabaseUser(session.user));
        } else {
            setUser(null);
        }
        setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        setIsLoading(false);
        throw error;
    }
    // onAuthStateChange will handle setting user
  };

  const logout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setIsLoading(false);
  };

  const hasRole = (allowedRoles: UserRole[]) => {
    if (!user) return false;
    // Simple logic: if user role is in allowed list. 
    // Types might need casting if role comes as string from DB
    return allowedRoles.includes(user.role as UserRole);
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