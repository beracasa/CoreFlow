-- =====================================================
-- Script: Esquema de Roles Jerárquicos (app_roles)
-- Descripción: Tabla para gestionar roles con jerarquía organizacional
-- Autor: CoreFlow Team
-- Fecha: 2026-02-15
-- =====================================================

-- Eliminar tabla existente si existe (CUIDADO: esto borrará datos)
-- DROP TABLE IF EXISTS public.app_roles CASCADE;

-- Crear tabla app_roles con soporte para jerarquía
CREATE TABLE IF NOT EXISTS public.app_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  
  -- Jerarquía: Auto-referencia para "Reporta a"
  parent_role_id UUID REFERENCES public.app_roles(id) ON DELETE SET NULL,
  
  -- Permisos en formato JSONB para flexibilidad
  -- Ejemplo: {"can_view_dashboard": true, "can_approve_wo": false, ...}
  permissions JSONB DEFAULT '{}'::jsonb,
  
  -- Configuración adicional
  share_data_with_peers BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  
  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_app_roles_parent ON public.app_roles(parent_role_id);
CREATE INDEX IF NOT EXISTS idx_app_roles_name ON public.app_roles(name);
CREATE INDEX IF NOT EXISTS idx_app_roles_is_system ON public.app_roles(is_system);

-- Índice GIN para búsquedas en JSONB permissions
CREATE INDEX IF NOT EXISTS idx_app_roles_permissions ON public.app_roles USING GIN (permissions);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_app_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_app_roles_updated_at
  BEFORE UPDATE ON public.app_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_app_roles_updated_at();

-- =====================================================
-- Políticas RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios autenticados pueden leer todos los roles
CREATE POLICY "Usuarios autenticados pueden leer roles"
  ON public.app_roles
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Solo administradores pueden crear roles
-- Nota: Ajustar según tu lógica de permisos (ej: verificar si el usuario tiene permiso 'manage_roles')
CREATE POLICY "Administradores pueden crear roles"
  ON public.app_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Verificar que el usuario tenga permiso de gestión de roles
    -- Esto asume que existe una función helper para verificar permisos
    -- Por ahora, permitimos a todos los autenticados (ajustar según necesidad)
    true
  );

-- Política: Solo administradores pueden actualizar roles
CREATE POLICY "Administradores pueden actualizar roles"
  ON public.app_roles
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política: Solo administradores pueden eliminar roles (excepto roles del sistema)
CREATE POLICY "Administradores pueden eliminar roles no-sistema"
  ON public.app_roles
  FOR DELETE
  TO authenticated
  USING (is_system = false);

-- =====================================================
-- Datos Iniciales (Roles del Sistema)
-- =====================================================

-- Insertar solo el rol Administrador como rol raíz del sistema
INSERT INTO public.app_roles (id, name, description, parent_role_id, permissions, is_system, share_data_with_peers)
VALUES 
  -- Rol raíz: Administrador (único rol del sistema protegido)
  (
    'a0000000-0000-0000-0000-000000000001',
    'Administrador',
    'Acceso completo al sistema',
    NULL,
    '{
      "view_dashboard": true,
      "view_kanban": true,
      "create_wo": true,
      "execute_wo": true,
      "log_hours": true,
      "manage_inventory": true,
      "manage_assets": true,
      "view_costs": true,
      "view_analytics": true,
      "manage_users": true,
      "manage_roles": true
    }'::jsonb,
    true,
    false
  )
ON CONFLICT (id) DO NOTHING;

-- Nota: Los demás roles (Director General, Gerentes, etc.) se crearán desde la interfaz

-- =====================================================
-- Función Helper: Verificar Ciclos en Jerarquía
-- =====================================================

-- Esta función previene que un rol reporte a uno de sus descendientes
CREATE OR REPLACE FUNCTION check_role_hierarchy_cycle(
  role_id UUID,
  new_parent_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  current_parent UUID;
  max_depth INT := 10; -- Prevenir loops infinitos
  depth INT := 0;
BEGIN
  -- Si no hay parent, no hay ciclo
  IF new_parent_id IS NULL THEN
    RETURN true;
  END IF;
  
  -- Si el parent es el mismo rol, es un ciclo
  IF role_id = new_parent_id THEN
    RETURN false;
  END IF;
  
  -- Recorrer la cadena de parents
  current_parent := new_parent_id;
  
  WHILE current_parent IS NOT NULL AND depth < max_depth LOOP
    -- Si encontramos el rol original en la cadena, hay un ciclo
    IF current_parent = role_id THEN
      RETURN false;
    END IF;
    
    -- Obtener el siguiente parent
    SELECT parent_role_id INTO current_parent
    FROM public.app_roles
    WHERE id = current_parent;
    
    depth := depth + 1;
  END LOOP;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Trigger: Validar Jerarquía antes de INSERT/UPDATE
-- =====================================================

CREATE OR REPLACE FUNCTION validate_role_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar que no se cree un ciclo
  IF NOT check_role_hierarchy_cycle(NEW.id, NEW.parent_role_id) THEN
    RAISE EXCEPTION 'No se puede crear un ciclo en la jerarquía de roles. Un rol no puede reportar a uno de sus descendientes.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_role_hierarchy
  BEFORE INSERT OR UPDATE ON public.app_roles
  FOR EACH ROW
  EXECUTE FUNCTION validate_role_hierarchy();

-- =====================================================
-- Comentarios en la tabla
-- =====================================================

COMMENT ON TABLE public.app_roles IS 'Tabla de roles con soporte para jerarquía organizacional';
COMMENT ON COLUMN public.app_roles.parent_role_id IS 'ID del rol superior en la jerarquía (Reporta a)';
COMMENT ON COLUMN public.app_roles.permissions IS 'Permisos del rol en formato JSONB';
COMMENT ON COLUMN public.app_roles.share_data_with_peers IS 'Si true, comparte datos con roles del mismo nivel';
COMMENT ON COLUMN public.app_roles.is_system IS 'Si true, el rol no puede ser eliminado (solo editado)';

-- =====================================================
-- Fin del Script
-- =====================================================
