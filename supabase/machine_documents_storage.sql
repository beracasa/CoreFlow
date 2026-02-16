-- =====================================================
-- Supabase Storage: Machine Documents
-- Descripción: Configuración de bucket y políticas RLS
--              para almacenar documentos de equipos
-- Fecha: 2026-02-16
-- =====================================================

-- Crear bucket para documentos de equipos (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('machine-documents', 'machine-documents', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Políticas RLS para el Bucket
-- =====================================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Allow authenticated users to read machine documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload machine documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete machine documents" ON storage.objects;

-- Política: Permitir lectura a usuarios autenticados
CREATE POLICY "Allow authenticated users to read machine documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'machine-documents');

-- Política: Permitir subida a usuarios autenticados
CREATE POLICY "Allow authenticated users to upload machine documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'machine-documents');

-- Política: Permitir eliminación a usuarios autenticados
CREATE POLICY "Allow authenticated users to delete machine documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'machine-documents');

-- Política: Permitir actualización a usuarios autenticados
CREATE POLICY "Allow authenticated users to update machine documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'machine-documents')
WITH CHECK (bucket_id = 'machine-documents');

-- =====================================================
-- Verificación
-- =====================================================

-- Verificar que el bucket fue creado
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE id = 'machine-documents';

-- Verificar políticas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'objects' AND policyname LIKE '%machine documents%';
