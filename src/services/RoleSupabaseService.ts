
import { supabase } from './supabaseClient';
import { RoleDefinition } from '../../types';

export const RoleSupabaseService = {
  // Get all roles (flat list with parent_role_id)
  async getRoles(): Promise<RoleDefinition[]> {
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      const stored = localStorage.getItem('coreflow_mock_roles');
      if (stored) {
        return JSON.parse(stored);
      }
      const initialRoles: RoleDefinition[] = [
        {
          id: 'ADMIN_SOLICITANTE',
          name: 'Administrador Solicitante',
          description: 'Acceso total de administración y solicitudes',
          parentRoleId: null,
          isSystem: true,
          permissions: { view_analytics: true },
          shareDataWithPeers: true,
          usersCount: 1
        },
        {
          id: 'TECNICO_MANT',
          name: 'Técnico de Mantenimiento',
          description: 'Ejecutor de órdenes y lecturas',
          parentRoleId: null,
          isSystem: true,
          permissions: {},
          shareDataWithPeers: false,
          usersCount: 1
        },
        {
          id: 'AUDITOR',
          name: 'Auditor',
          description: 'Acceso de solo lectura',
          parentRoleId: null,
          isSystem: true,
          permissions: {},
          shareDataWithPeers: false,
          usersCount: 0
        }
      ];
      localStorage.setItem('coreflow_mock_roles', JSON.stringify(initialRoles));
      return initialRoles;
    }

    // 1. Obtener todos los roles
    const { data: rolesData, error: rolesError } = await supabase
      .from('app_roles')
      .select('*')
      .order('name');

    if (rolesError) throw rolesError;
    
    // 2. Obtener todos los perfiles para contar usuarios por rol
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('role_id, role');
      
    if (profilesError) throw profilesError;

    // 3. Calcular la cantidad de usuarios por rol
    const userCounts: Record<string, number> = {};
    if (profilesData) {
      profilesData.forEach((p: any) => {
        const roleId = p.role_id || p.role; // Soporte para esquema actual o legacy
        if (roleId) {
          userCounts[roleId] = (userCounts[roleId] || 0) + 1;
        }
      });
    }

    return rolesData.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      parentRoleId: r.parent_role_id,
      isSystem: r.is_system || false,
      permissions: r.permissions || {},
      shareDataWithPeers: r.share_data_with_peers || false,
      usersCount: userCounts[r.id] || 0
    }));
  },

  // Create Role
  async createRole(role: Omit<RoleDefinition, 'id'>): Promise<RoleDefinition> {
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      const roles = await this.getRoles();
      const newRole: RoleDefinition = {
        ...role,
        id: 'role-' + Math.random().toString(36).substr(2, 9),
        usersCount: 0
      };
      roles.push(newRole);
      localStorage.setItem('coreflow_mock_roles', JSON.stringify(roles));
      return newRole;
    }

    const { data, error } = await supabase
      .from('app_roles')
      .insert({
        name: role.name,
        description: role.description,
        parent_role_id: role.parentRoleId || null,
        is_system: role.isSystem || false,
        permissions: role.permissions || {},
        share_data_with_peers: role.shareDataWithPeers || false
      })
      .select()
      .single();

    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      parentRoleId: data.parent_role_id,
      isSystem: data.is_system || false,
      permissions: data.permissions || {},
      shareDataWithPeers: data.share_data_with_peers || false,
      usersCount: 0
    };
  },

  // Update Role
  async updateRole(role: RoleDefinition): Promise<void> {
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      const roles = await this.getRoles();
      const index = roles.findIndex(r => r.id === role.id);
      if (index !== -1) {
        roles[index] = { ...roles[index], ...role };
        localStorage.setItem('coreflow_mock_roles', JSON.stringify(roles));
      }
      return;
    }

    const { error } = await supabase
      .from('app_roles')
      .update({
        name: role.name,
        description: role.description,
        parent_role_id: role.parentRoleId || null,
        permissions: role.permissions,
        share_data_with_peers: role.shareDataWithPeers || false
      })
      .eq('id', role.id);

    if (error) throw error;
  },

  // Update only permissions (método específico para panel de permisos)
  async updatePermissions(roleId: string, permissions: Record<string, boolean> | string[]): Promise<void> {
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      const roles = await this.getRoles();
      const index = roles.findIndex(r => r.id === roleId);
      if (index !== -1) {
        roles[index].permissions = permissions;
        localStorage.setItem('coreflow_mock_roles', JSON.stringify(roles));
      }
      return;
    }

    const { error } = await supabase
      .from('app_roles')
      .update({ permissions })
      .eq('id', roleId);

    if (error) throw error;
  },

  // Delete Role (valida que no tenga hijos)
  async deleteRole(id: string): Promise<void> {
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      const roles = await this.getRoles();
      const hasChildren = roles.some(r => r.parentRoleId === id);
      if (hasChildren) {
        throw new Error('No se puede eliminar un rol que tiene roles subordinados. Primero reasigne o elimine los roles hijos.');
      }
      const filtered = roles.filter(r => r.id !== id);
      localStorage.setItem('coreflow_mock_roles', JSON.stringify(filtered));
      return;
    }

    // Primero verificar si tiene roles hijos
    const { data: children, error: checkError } = await supabase
      .from('app_roles')
      .select('id')
      .eq('parent_role_id', id)
      .limit(1);

    if (checkError) throw checkError;

    if (children && children.length > 0) {
      throw new Error('No se puede eliminar un rol que tiene roles subordinados. Primero reasigne o elimine los roles hijos.');
    }

    // Si no tiene hijos, proceder con la eliminación
    const { error } = await supabase
      .from('app_roles')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Get role hierarchy (retorna solo los roles raíz con sus hijos anidados)
  async getRoleHierarchy(): Promise<RoleDefinition[]> {
    const allRoles = await this.getRoles();
    return buildRoleTree(allRoles);
  }
};

// Función helper para construir árbol desde lista plana
function buildRoleTree(roles: RoleDefinition[]): RoleDefinition[] {
  const roleMap = new Map<string, RoleDefinition>();
  const rootRoles: RoleDefinition[] = [];
  
  // Primera pasada: crear mapa y agregar campo children
  roles.forEach(role => {
    roleMap.set(role.id, { ...role, children: [], level: 0 });
  });
  
  // Segunda pasada: construir jerarquía
  roles.forEach(role => {
    const node = roleMap.get(role.id)!;
    
    if (role.parentRoleId) {
      const parent = roleMap.get(role.parentRoleId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
        node.level = (parent.level || 0) + 1;
      } else {
        // Si el parent no existe, tratar como raíz
        rootRoles.push(node);
      }
    } else {
      // Sin parent = rol raíz
      rootRoles.push(node);
    }
  });
  
  return rootRoles;
}
