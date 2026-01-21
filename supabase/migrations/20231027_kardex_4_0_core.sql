-- =============================================================================
-- MANTIX 4.0 | KARDEX 4.0 CORE MIGRATION
-- Fecha: 2023-10-27
-- Autor: Senior Database Architect
-- Descripción: Esquema para gestión de inventarios, repuestos y proveedores
-- con soporte Multi-tenancy y seguridad RLS (Row Level Security).
-- =============================================================================

-- 1. Habilitar extensión para UUIDs si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLA: SUPPLIERS (Proveedores)
-- =============================================================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL, -- Aislamiento de datos por inquilino
    name TEXT NOT NULL,
    tax_id TEXT, -- RFC o Identificador Fiscal
    contact_info JSONB DEFAULT '{}'::JSONB, -- Datos flexibles de contacto
    lead_time_days INTEGER DEFAULT 0, -- Tiempo promedio de entrega en días
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsqueda y RLS
CREATE INDEX idx_suppliers_tenant ON suppliers(tenant_id);

-- Comentarios
COMMENT ON TABLE suppliers IS 'Directorio de proveedores de repuestos industriales.';
COMMENT ON COLUMN suppliers.lead_time_days IS 'Tiempo estimado en días desde la orden de compra hasta la recepción.';

-- Seguridad RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Isolation Policy for Suppliers" ON suppliers
    FOR ALL
    USING (tenant_id = auth.uid()); -- Ajustar según la estrategia de Auth de Supabase

-- =============================================================================
-- TABLA: SPARE_PARTS (Maestro de Repuestos)
-- =============================================================================
CREATE TABLE IF NOT EXISTS spare_parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    sku TEXT NOT NULL, -- Código único de repuesto (Stock Keeping Unit)
    name_es TEXT NOT NULL, -- Nombre en Español
    name_en TEXT, -- Nombre en Inglés (Soporte i18n)
    category TEXT CHECK (category IN ('MECHANICAL', 'ELECTRICAL', 'HYDRAULIC', 'PNEUMATIC', 'CONSUMABLE', 'SENSOR', 'PLC', 'OTHER')),
    location_code TEXT, -- Ubicación física (Pasillo-Estante-Nivel)
    current_stock NUMERIC DEFAULT 0 CHECK (current_stock >= 0),
    min_safety_stock NUMERIC DEFAULT 0, -- Punto crítico de seguridad
    reorder_point NUMERIC DEFAULT 0, -- Punto de reorden sugerido
    unit_cost NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- El SKU debe ser único, pero solo dentro del mismo Tenant
    CONSTRAINT uq_spare_parts_sku_tenant UNIQUE (tenant_id, sku)
);

CREATE INDEX idx_spare_parts_tenant ON spare_parts(tenant_id);
CREATE INDEX idx_spare_parts_sku ON spare_parts(sku);

COMMENT ON TABLE spare_parts IS 'Catálogo maestro de repuestos (Kardex Digital).';
COMMENT ON COLUMN spare_parts.min_safety_stock IS 'Nivel mínimo permitido antes de generar alerta crítica.';

ALTER TABLE spare_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Isolation Policy for Spare Parts" ON spare_parts
    FOR ALL
    USING (tenant_id = auth.uid());

-- =============================================================================
-- TABLA: INVENTORY_TRANSACTIONS (Libro Mayor de Movimientos)
-- =============================================================================
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    part_id UUID NOT NULL REFERENCES spare_parts(id) ON DELETE RESTRICT,
    transaction_type TEXT CHECK (transaction_type IN ('INBOUND', 'OUTBOUND', 'ADJUSTMENT_ADD', 'ADJUSTMENT_SUB')),
    quantity NUMERIC NOT NULL CHECK (quantity > 0), -- Cantidad absoluta
    reference_id UUID, -- ID opcional de Orden de Trabajo (R-MANT-05) o Compra
    notes TEXT,
    created_by UUID DEFAULT auth.uid(), -- Usuario que ejecutó el movimiento
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_transactions_tenant ON inventory_transactions(tenant_id);
CREATE INDEX idx_inventory_transactions_part ON inventory_transactions(part_id);

COMMENT ON TABLE inventory_transactions IS 'Registro inmutable de todos los movimientos de inventario.';
COMMENT ON COLUMN inventory_transactions.reference_id IS 'Enlace a la Orden de Mantenimiento (WO) que consumió el repuesto.';

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Isolation Policy for Transactions" ON inventory_transactions
    FOR ALL
    USING (tenant_id = auth.uid());

-- =============================================================================
-- TABLA: ASSET_SPARE_PARTS (Relación Activo-Repuesto)
-- =============================================================================
CREATE TABLE IF NOT EXISTS asset_spare_parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    asset_id UUID NOT NULL, -- Referencia al ID de la máquina (Tabla Assets externa)
    part_id UUID NOT NULL REFERENCES spare_parts(id) ON DELETE CASCADE,
    is_critical BOOLEAN DEFAULT FALSE, -- Define si la falta de este repuesto para la máquina
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_asset_part UNIQUE (tenant_id, asset_id, part_id)
);

CREATE INDEX idx_asset_parts_tenant ON asset_spare_parts(tenant_id);
CREATE INDEX idx_asset_parts_asset ON asset_spare_parts(asset_id);

COMMENT ON TABLE asset_spare_parts IS 'Matriz de compatibilidad entre Máquinas y Repuestos.';
COMMENT ON COLUMN asset_spare_parts.is_critical IS 'Si TRUE, la máquina no puede operar sin este componente.';

ALTER TABLE asset_spare_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Isolation Policy for Asset Parts" ON asset_spare_parts
    FOR ALL
    USING (tenant_id = auth.uid());

-- =============================================================================
-- LÓGICA DE NEGOCIO (TRIGGERS)
-- =============================================================================

-- Función para actualizar el stock automáticamente
CREATE OR REPLACE FUNCTION fn_update_inventory_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Lógica de Entrada (Suma)
    IF NEW.transaction_type IN ('INBOUND', 'ADJUSTMENT_ADD') THEN
        UPDATE spare_parts
        SET current_stock = current_stock + NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.part_id;
    
    -- Lógica de Salida (Resta)
    ELSIF NEW.transaction_type IN ('OUTBOUND', 'ADJUSTMENT_SUB') THEN
        -- Validar stock suficiente antes de restar (Opcional, evita stock negativo)
        IF (SELECT current_stock FROM spare_parts WHERE id = NEW.part_id) < NEW.quantity THEN
            RAISE EXCEPTION 'Stock insuficiente para realizar esta salida.';
        END IF;

        UPDATE spare_parts
        SET current_stock = current_stock - NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.part_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger vinculado a la tabla de transacciones
DROP TRIGGER IF EXISTS tr_update_stock ON inventory_transactions;

CREATE TRIGGER tr_update_stock
AFTER INSERT ON inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION fn_update_inventory_stock();

-- Fin del Script
