-- =====================================================
-- Script: Limpiar Roles del Sistema No Deseados
-- Descripción: Elimina Supervisor, Técnico y Auditor
-- Fecha: 2026-02-15
-- =====================================================

-- Eliminar roles del sistema que no se necesitan
-- Solo se mantendrá el rol Administrador
DELETE FROM public.app_roles 
WHERE id IN (
  'a0000000-0000-0000-0000-000000000002', -- Supervisor
  'a0000000-0000-0000-0000-000000000003', -- Técnico
  'a0000000-0000-0000-0000-000000000004'  -- Auditor
);

-- Verificar que solo quede el Administrador
SELECT id, name, description, parent_role_id, is_system 
FROM public.app_roles 
ORDER BY name;
