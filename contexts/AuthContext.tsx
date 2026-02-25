import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, UserRole } from '../types';
import { supabase } from '../src/services/supabaseClient';
import { useUserStore } from '../src/stores/useUserStore';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (allowedRoles: UserRole[]) => boolean;
  hasPermission: (permissionId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper: Map Supabase User to UserProfile (Fallback)
  const mapSupabaseUser = (sbUser: any): UserProfile => {
    const metadata = sbUser.user_metadata || {};
    return {
      id: sbUser.id,
      email: sbUser.email || '',
      full_name: metadata.full_name || 'Usuario',
      role: metadata.role_id || metadata.role || UserRole.ADMIN_SOLICITANTE,
      tenant_id: metadata.tenant_id || 'default-tenant',
      status: 'ACTIVE',
      job_title: metadata.job_title || 'N/A',
      // Preserve existing if possible, otherwise empty
      specialties: [],
      company_code: metadata.company_code
    };
  };

  // Fetch profile from DB to ensure fresh data (Role, Company Code)
  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error("Error fetching profile:", error);
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      role: data.role_id || data.role, // Source of truth: role_id from new schema
      company_code: data.company_code,
      job_title: data.job_title,
      status: data.status,
      specialties: data.specialties || [],
      tenant_id: data.tenant_id,
      avatar_url: data.avatar_url
    };
  };

  useEffect(() => {
    let mounted = true;

    // 1. Initial Session Check with Timeout Race
    const checkSession = async () => {
      console.log("AuthContext: Starting session check...");

      const sessionPromise = (async () => {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();

          if (mounted) {
            if (error) {
              console.error("AuthContext: Session error:", error);
            }

            if (session?.user) {
              console.log("AuthContext: Session found for", session.user.email);
              try {
                const profile = await fetchProfile(session.user.id);
                if (mounted) {
                  if (profile) {
                    setUser(profile);
                  } else {
                    console.warn("AuthContext: Using metadata fallback.");
                    setUser(mapSupabaseUser(session.user));
                  }
                }
              } catch (err) {
                console.error("AuthContext: Profile fetch error:", err);
                if (mounted) setUser(mapSupabaseUser(session.user));
              }
            } else {
              console.log("AuthContext: No active session.");
            }
          }
        } catch (err) {
          console.error("AuthContext: Unexpected error:", err);
        }
      })();

      // Force timeout after 1.5 seconds to clear loading state
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1500));

      await Promise.race([sessionPromise, timeoutPromise]);

      if (mounted) {
        console.log("AuthContext: Session check complete (or timed out). Clearing loading state.");
        setIsLoading(false);
      }
    };

    checkSession();

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AuthContext: Auth event:", event);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
        if (mounted) setIsLoading(true);
      }

      try {
        if (session?.user) {
          // Profile Fetch with Timeout
          const fetchPromise = (async () => {
            try {
              const profile = await fetchProfile(session.user.id);
              if (mounted) {
                if (profile) setUser(profile);
                else setUser(mapSupabaseUser(session.user));
              }
            } catch (err) {
              console.error("AuthContext: Profile fetch error in listener:", err);
              if (mounted) setUser(mapSupabaseUser(session.user));
            }
          })();

          const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1500));

          await Promise.race([fetchPromise, timeoutPromise]);

        } else {
          if (mounted) setUser(null);
        }
      } catch (err) {
        console.error("Auth state change error:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    // Do not set global loading here. Let the UI handle its own loading state.
    // setIsLoading(true); 
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      // setIsLoading(false);
      throw error;
    }
    // onAuthStateChange will handle setting user and eventually loading state if needed
  };

  const logout = async () => {
    // setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    // setIsLoading(false);
  };

  const hasRole = (allowedRoles: UserRole[]) => {
    if (!user) return false;

    // Si el rol sigue siendo el string hardcodeado, usa la lógica vieja
    if (allowedRoles.includes(user.role as UserRole)) return true;

    // Si el rol es un UUID, buscar en los roles dinámicos
    const roles = useUserStore.getState().roles;
    const userRoleDef = roles.find(r => r.id === user.role);

    if (userRoleDef) {
      // Si el rol de DB dice "Admin", "Manager" o "Supervisor" o es de sistema
      // consideramos que es un "ADMIN_SOLICITANTE" lógico para mantener compatibilidad
      if (allowedRoles.includes(UserRole.ADMIN_SOLICITANTE)) {
        if (userRoleDef.name.toLowerCase().includes('admin') ||
          userRoleDef.name.toLowerCase().includes('manager') ||
          userRoleDef.isSystem) {
          return true;
        }
      }

      // Si se requiere tecnico
      if (allowedRoles.includes(UserRole.TECNICO_MANT)) {
        if (userRoleDef.name.toLowerCase().includes('tecnico') ||
          userRoleDef.name.toLowerCase().includes('mecanico')) {
          return true;
        }
      }
    }

    return false;
  };

  const hasPermission = (permissionId: string) => {
    if (!user) return false;

    // 1. Super Admin Bypass (optional, but good for dev)
    if (user.role === UserRole.ADMIN_SOLICITANTE) return true;

    // 2. Check Dynamic Roles
    const roles = useUserStore.getState().roles;
    const userRoleDef = roles.find(r => r.id === user.role);

    if (!userRoleDef) return false;

    // 2.5 New System Admin Bypass
    if (userRoleDef.isSystem ||
      userRoleDef.name.toLowerCase().includes('admin') ||
      userRoleDef.name.toLowerCase().includes('manager')) {
      return true;
    }

    // 3. Check specific permission
    if (Array.isArray(userRoleDef.permissions)) {
      return userRoleDef.permissions.includes(permissionId);
    } else {
      // Object format { [id]: boolean }
      return !!userRoleDef.permissions[permissionId];
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, hasRole, hasPermission }}>
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