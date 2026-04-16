-- =============================================================================
-- Fix FINAL: Trigger handle_new_user simplificado y seguro
-- El trigger solo hace el INSERT mínimo necesario (sin role_id para evitar
-- fallos por FK). El edge function se encarga de actualizar los campos adicionales.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, tenant_id, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'tenant_id', 'primary'),
    'ACTIVE'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name  = EXCLUDED.full_name,
    tenant_id  = EXCLUDED.tenant_id,
    status     = EXCLUDED.status;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-aplicar el trigger (sin cambios, solo para asegurar que apunta a la función actualizada)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
