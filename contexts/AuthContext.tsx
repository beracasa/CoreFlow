import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, UserRole } from '../types';
import { supabase } from '../src/services/supabaseClient';
import { useUserStore } from '../src/stores/useUserStore';
import { normalizeRolePermissions } from '../src/services/RoleSupabaseService';

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
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialCheckComplete = useRef(false);

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
      .select('*, app_roles(*)')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error("Error fetching profile:", error);
      return null;
    }

    let status = data.status;
    if (status === 'INVITED') {
      console.log(`User ${userId} logging in for the first time. Activating account...`);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ status: 'ACTIVE' })
        .eq('id', userId);

      if (updateError) {
        console.error("Error updating user status to ACTIVE:", updateError);
      } else {
        status = 'ACTIVE';
      }
    }

    const appRole = Array.isArray(data.app_roles) ? data.app_roles[0] : data.app_roles;
    const roleId = data.role_id || appRole?.id || data.role;
    const roleName = appRole?.name || data.role;
    const permissions = normalizeRolePermissions(roleName, appRole?.permissions || data.permissions, appRole?.is_system);

    return {
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      role: roleId, // Source of truth: role_id or appRole.id or role
      roleName: roleName,
      company_code: data.company_code,
      job_title: data.job_title,
      status: status,
      specialties: data.specialties || [],
      tenant_id: data.tenant_id,
      avatar_url: data.avatar_url,
      requires_password_change: data.requires_password_change,
      permissions: permissions
    };
  };

  useEffect(() => {
    let mounted = true;
    const isInitialRecoveryUrl =
      window.location.hash.includes('type=recovery') ||
      window.location.search.includes('type=recovery');
    let isRecoveryFlow = isInitialRecoveryUrl;

    if (import.meta.env.VITE_USE_MOCK === 'true') {
      console.log("AuthContext: Mock mode active. Reading session from localStorage...");
      const checkMockSession = () => {
        const stored = localStorage.getItem('coreflow_mock_session');
        if (stored && mounted) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.status === 'INVITED') {
              parsed.status = 'ACTIVE';
              localStorage.setItem('coreflow_mock_session', JSON.stringify(parsed));
              
              // Also update in the mock users list
              const mockUsersRaw = localStorage.getItem('coreflow_mock_users');
              if (mockUsersRaw) {
                const mockUsers = JSON.parse(mockUsersRaw);
                const idx = mockUsers.findIndex((u: any) => u.id === parsed.id);
                if (idx !== -1) {
                  mockUsers[idx].status = 'ACTIVE';
                  localStorage.setItem('coreflow_mock_users', JSON.stringify(mockUsers));
                }
              }
            }
            setUser(parsed);
          } catch (e) {
            console.error("Failed to parse mock session", e);
          }
        }
        if (mounted) {
          setIsLoading(false);
        }
      };
      checkMockSession();
      return () => {
        mounted = false;
      };
    }

    // 1. Initial Session Check with Timeout Race
    const checkSession = async () => {
      console.log("AuthContext: Starting session check...");
      const searchParams = new URLSearchParams(window.location.search);
      const tokenHash = searchParams.get('token_hash');
      const otpType = searchParams.get('type');

      const sessionPromise = (async () => {
        try {
          if (tokenHash && (otpType === 'recovery' || !otpType)) {
            console.log("AuthContext: Verifying recovery token_hash...");
            isRecoveryFlow = true;
            const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: 'recovery',
            });
            if (verifyError) {
              console.error("AuthContext: Error verifying recovery token_hash:", verifyError);
            } else if (verifyData?.session?.user && mounted) {
              window.history.replaceState({}, document.title, '/change-password');
              const profile = await fetchProfile(verifyData.session.user.id);
              if (mounted) {
                const baseUser = profile || mapSupabaseUser(verifyData.session.user);
                setUser({ ...baseUser, requires_password_change: true });
                navigate('/change-password', { replace: true });
              }
              return;
            }
          }

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
                    setUser(isRecoveryFlow ? { ...profile, requires_password_change: true } : profile);
                  } else {
                    console.warn("AuthContext: Using metadata fallback.");
                    const fallback = mapSupabaseUser(session.user);
                    setUser(isRecoveryFlow ? { ...fallback, requires_password_change: true } : fallback);
                  }
                  if (isRecoveryFlow) {
                    navigate('/change-password', { replace: true });
                  }
                }
              } catch (err) {
                console.error("AuthContext: Profile fetch error:", err);
                if (mounted) {
                  const fallback = mapSupabaseUser(session.user);
                  setUser(isRecoveryFlow ? { ...fallback, requires_password_change: true } : fallback);
                  if (isRecoveryFlow) {
                    navigate('/change-password', { replace: true });
                  }
                }
              }
            } else {
              console.log("AuthContext: No active session.");
            }
          }
        } catch (err) {
          console.error("AuthContext: Unexpected error:", err);
        }
      })();

      // Force timeout after 1.5 seconds (or 5s when verifying recovery token) to clear loading state
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, tokenHash ? 5000 : 1500));

      await Promise.race([sessionPromise, timeoutPromise]);

      if (mounted) {
        console.log("AuthContext: Session check complete (or timed out). Clearing loading state.");
        initialCheckComplete.current = true;
        setIsLoading(false);
      }
    };

    checkSession();

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AuthContext: Auth event:", event);

      // SILENT REFRESH: Do NOT set isLoading(true) for TOKEN_REFRESHED
      // Only set loading for SIGNED_IN if we don't already have a current session (initial login)
      // or for SIGNED_OUT to ensure a clean transition.
      if (event === 'PASSWORD_RECOVERY') {
        isRecoveryFlow = true;
        if (mounted && session?.user) {
          // Set fallback user immediately with requires_password_change to avoid unauthenticated or dashboard redirect
          setUser({ ...mapSupabaseUser(session.user), requires_password_change: true });
          setIsLoading(true);
        }
        navigate('/change-password', { replace: true });
      }

      if (event === 'SIGNED_IN' && !session?.user) {
        if (mounted) setIsLoading(true);
      } else if (event === 'SIGNED_OUT') {
        isRecoveryFlow = false;
        if (mounted) setIsLoading(true);
      }

      try {
        if (session?.user) {
          // Profile Fetch with Timeout
          const fetchPromise = (async () => {
            try {
              const profile = await fetchProfile(session.user.id);
              if (mounted) {
                if (profile) {
                  setUser(isRecoveryFlow ? { ...profile, requires_password_change: true } : profile);
                } else {
                  const fallback = mapSupabaseUser(session.user);
                  setUser(isRecoveryFlow ? { ...fallback, requires_password_change: true } : fallback);
                }
                if (isRecoveryFlow) {
                  navigate('/change-password', { replace: true });
                }
              }
            } catch (err) {
              console.error("AuthContext: Profile fetch error in listener:", err);
              if (mounted) {
                const fallback = mapSupabaseUser(session.user);
                setUser(isRecoveryFlow ? { ...fallback, requires_password_change: true } : fallback);
              }
            }
          })();

          // Reduce timeout for background updates
          const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1000));

          await Promise.race([fetchPromise, timeoutPromise]);
          useUserStore.getState().fetchUsers().catch(console.error);
        } else {
          if (mounted) setUser(null);
          useUserStore.getState().fetchUsers().catch(console.error);
        }
      } catch (err) {
        console.error("Auth state change error:", err);
      } finally {
        if (mounted && initialCheckComplete.current) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 3. Subscribe to roles and users for reactivity in hasRole/hasPermission
  const roles = useUserStore(state => state.roles);
  const storeUsers = useUserStore(state => state.users);

  // 4. Keep current user state synchronized when storeUsers or roles change, or when tab regains focus
  useEffect(() => {
    if (!user?.id || import.meta.env.VITE_USE_MOCK === 'true') return;

    const matchedStoreUser = storeUsers.find(u => u.id === user.id);
    if (matchedStoreUser) {
      const matchedRoleDef = roles.find(r => r.id === matchedStoreUser.role);
      const nextRoleName = matchedRoleDef?.name || matchedStoreUser.roleName || user.roleName;
      const nextPerms = matchedRoleDef?.permissions || user.permissions;

      if (
        matchedStoreUser.role !== user.role ||
        nextRoleName !== user.roleName ||
        matchedStoreUser.job_title !== user.job_title ||
        matchedStoreUser.full_name !== user.full_name
      ) {
        setUser(prev => prev ? {
          ...prev,
          role: matchedStoreUser.role,
          roleName: nextRoleName,
          job_title: matchedStoreUser.job_title,
          full_name: matchedStoreUser.full_name,
          permissions: nextPerms
        } : prev);
      }
    }
  }, [storeUsers, roles, user?.id]);

  useEffect(() => {
    if (!user?.id || import.meta.env.VITE_USE_MOCK === 'true') return;

    const handleVisibilityOrFocus = async () => {
      if (document.visibilityState === 'visible') {
        useUserStore.getState().fetchRoles().catch(console.error);
        const freshProfile = await fetchProfile(user.id);
        if (freshProfile) {
          setUser(prev => prev ? { ...prev, ...freshProfile } : freshProfile);
        }
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    const channel = supabase
      .channel(`rbac-sync-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_roles' }, () => {
        useUserStore.getState().fetchRoles().catch(console.error);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, async () => {
        const freshProfile = await fetchProfile(user.id);
        if (freshProfile) {
          setUser(prev => prev ? { ...prev, ...freshProfile } : freshProfile);
        }
        useUserStore.getState().fetchUsers().catch(console.error);
      })
      .subscribe();

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const login = async (email: string, password: string) => {
    // Do not set global loading here. Let the UI handle its own loading state.
    // setIsLoading(true); 
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      const mockUsersRaw = localStorage.getItem('coreflow_mock_users');
      let status = 'ACTIVE';
      let fullName = email.split('@')[0].toUpperCase();
      let role = UserRole.ADMIN_SOLICITANTE;
      let companyCode = 'COMP-1';
      let jobTitle = 'Administrator';
      let specialties: string[] = [];
      let id = 'mock-user-id-' + email.replace(/[^a-zA-Z0-9]/g, '');

      if (mockUsersRaw) {
        const mockUsers = JSON.parse(mockUsersRaw);
        const existingMockUser = mockUsers.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
        if (existingMockUser) {
          id = existingMockUser.id;
          fullName = existingMockUser.full_name;
          role = existingMockUser.role;
          companyCode = existingMockUser.company_code || 'COMP-1';
          jobTitle = existingMockUser.job_title || 'Technician';
          specialties = existingMockUser.specialties || [];
          if (existingMockUser.status === 'INVITED') {
            status = 'ACTIVE';
            existingMockUser.status = 'ACTIVE';
            localStorage.setItem('coreflow_mock_users', JSON.stringify(mockUsers));
          } else {
            status = existingMockUser.status;
          }
        }
      }

      const mockUser: UserProfile = {
        id,
        email,
        full_name: fullName,
        role,
        tenant_id: 'default-tenant',
        status: status as any,
        job_title: jobTitle,
        specialties,
        company_code: companyCode
      };
      localStorage.setItem('coreflow_mock_session', JSON.stringify(mockUser));
      setUser(mockUser);
      return;
    }

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
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      localStorage.removeItem('coreflow_mock_session');
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    // setIsLoading(false);
  };

  // Helper: Resolver definición de rol con prioridad estricta (1º por UUID exacto, 2º por Nombre exacto)
  // NUNCA usar job_title para evitar colisiones entre roles (ej. Supervisor de Mantenimiento vs Supervisor de Producción)
  const resolveUserRoleDef = () => {
    if (!user || roles.length === 0) return undefined;

    const storeUser = storeUsers.find(
      u => u.id === user.id || (user.email && u.email?.toLowerCase().trim() === user.email.toLowerCase().trim())
    );

    const activeRoleValue = (storeUser?.role || user.role || '').toString().toLowerCase().trim();
    const activeRoleName = (storeUser?.roleName || user.roleName || '').toString().toLowerCase().trim();

    // Pasada 1: Coincidencia exacta por ID de rol (UUID)
    if (activeRoleValue) {
      const byId = roles.find(r => (r.id || '').toString().toLowerCase().trim() === activeRoleValue);
      if (byId) return byId;
    }

    // Pasada 2: Coincidencia exacta por Nombre de rol (solo si activeRoleValue no era un ID válido en roles)
    if (activeRoleValue) {
      const byValueAsName = roles.find(r => (r.name || '').toString().toLowerCase().trim() === activeRoleValue);
      if (byValueAsName) return byValueAsName;
    }

    if (activeRoleName) {
      const byRoleName = roles.find(r => (r.name || '').toString().toLowerCase().trim() === activeRoleName);
      if (byRoleName) return byRoleName;
    }

    return undefined;
  };

  const hasRole = (allowedRoles: UserRole[]) => {
    if (!user) return false;

    const storeUser = storeUsers.find(
      u => u.id === user.id || (user.email && u.email?.toLowerCase().trim() === user.email.toLowerCase().trim())
    );
    const activeRole = (storeUser?.role || user.role) as UserRole;

    // Si el rol sigue siendo el string hardcodeado, usa la lógica directa
    if (allowedRoles.includes(activeRole)) return true;

    const userRoleDef = resolveUserRoleDef();

    if (userRoleDef) {
      const rNameNorm = (userRoleDef.name || '').toLowerCase().trim();
      // Solo el rol de sistema o Administrador tiene bypass global de ADMIN_SOLICITANTE
      if (allowedRoles.includes(UserRole.ADMIN_SOLICITANTE)) {
        if (
          userRoleDef.isSystem ||
          rNameNorm === 'admin' ||
          rNameNorm === 'administrador' ||
          rNameNorm === 'administrador solicitante'
        ) {
          return true;
        }
      }

      // Si se requiere técnico
      if (allowedRoles.includes(UserRole.TECNICO_MANT)) {
        if (
          rNameNorm.includes('tecnico') ||
          rNameNorm.includes('técnico') ||
          rNameNorm.includes('mecanico') ||
          rNameNorm.includes('mecánico') ||
          rNameNorm.includes('electromec')
        ) {
          return true;
        }
      }
    }

    return false;
  };

  // Solo pares directos de Edición -> Lectura (idénticos a VIEW_EDIT_PAIRS en RoleManagement)
  const IMPLICIT_PERMISSIONS_MAP: Record<string, string[]> = {
    view_dashboard: ['edit_dashboard_map'],
    view_kanban: ['edit_kanban'],
    view_calendar: ['manage_calendar'],
    view_machines: ['manage_machines'],
    view_inventory: ['manage_inventory'],
    view_part_requests: ['manage_inventory'],
    view_purchase_requests: ['manage_inventory'],
  };

  const hasPermission = (permissionId: string) => {
    if (!user) return false;

    // 1. Obtener estado más reciente del usuario desde el store si está disponible
    const storeUser = storeUsers.find(
      u => u.id === user.id || (user.email && u.email?.toLowerCase().trim() === user.email.toLowerCase().trim())
    );
    const activeRoleStr = (storeUser?.role || user.role || '').toString().toLowerCase().trim();
    const userRoleDef = resolveUserRoleDef();
    const resolvedRoleName = (userRoleDef?.name || storeUser?.roleName || user.roleName || '').toString().toLowerCase().trim();

    // Super Admin Bypass (exclusivo para rol Admin / Administrador / Sistema)
    if (
      activeRoleStr === 'admin_solicitante' ||
      activeRoleStr === 'admin' ||
      activeRoleStr === 'administrador' ||
      resolvedRoleName === 'admin' ||
      resolvedRoleName === 'administrador' ||
      Boolean(userRoleDef?.isSystem)
    ) {
      return true;
    }

    const validPerms = [permissionId, ...(IMPLICIT_PERMISSIONS_MAP[permissionId] || [])];

    const checkContainer = (perms: any): boolean | null => {
      if (!perms) return null;
      let p = perms;
      if (typeof p === 'string') {
        try { p = JSON.parse(p); } catch { return null; }
      }
      if (Array.isArray(p)) {
        return validPerms.some(req => p.includes(req));
      } else if (typeof p === 'object' && p !== null) {
        return validPerms.some(req => p[req] === true);
      }
      return null;
    };

    // 2. Fuente de verdad reactiva: Definición del rol en useUserStore
    if (userRoleDef) {
      const normalizedPerms = normalizeRolePermissions(userRoleDef.name, userRoleDef.permissions, userRoleDef.isSystem);
      const rolePermRes = checkContainer(normalizedPerms);
      // Retornar resultado definitivo del rol actual (no caer al fallback estático si fue desactivado)
      return rolePermRes === true;
    } else if (roles.length === 0) {
      useUserStore.getState().fetchRoles().catch(console.error);
    }

    // 3. Fallback únicamente mientras roles aún no ha terminado de cargar en el store
    if (user.permissions) {
      const normalizedFallback = normalizeRolePermissions(resolvedRoleName, user.permissions, false);
      const userPermRes = checkContainer(normalizedFallback);
      if (userPermRes === true) return true;
    }

    return false;
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