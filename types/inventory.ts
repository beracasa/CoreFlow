import { z } from 'zod';

/**
 * =============================================================================
 * DOMAIN ENUMS
 * =============================================================================
 */

/**
 * Categorías industriales para clasificación de repuestos.
 * Coincide con CHECK constraint de base de datos.
 */
export enum PartCategory {
  MECHANICAL = 'MECHANICAL',
  ELECTRICAL = 'ELECTRICAL',
  HYDRAULIC = 'HYDRAULIC',
  PNEUMATIC = 'PNEUMATIC',
  CONSUMABLE = 'CONSUMABLE',
  SENSOR = 'SENSOR',
  PLC = 'PLC',
  OTHER = 'OTHER'
}

/**
 * Tipos de movimiento de inventario.
 * Determina si el stock se suma o se resta.
 */
export enum TransactionType {
  INBOUND = 'INBOUND',           // Recepción de proveedor (Suma)
  OUTBOUND = 'OUTBOUND',         // Consumo en planta (Resta)
  ADJUSTMENT_ADD = 'ADJUSTMENT_ADD', // Ajuste de auditoría (Suma)
  ADJUSTMENT_SUB = 'ADJUSTMENT_SUB'  // Ajuste de auditoría (Resta)
}

/**
 * Estado calculado del inventario para UI.
 */
export type InventoryStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

/**
 * =============================================================================
 * DATABASE INTERFACES (Mapped from Supabase)
 * =============================================================================
 */

export interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  tax_id?: string;
  contact_info: Record<string, any>;
  lead_time_days: number;
  created_at: string;
}

export interface SparePart {
  id: string;
  tenant_id: string;
  supplier_id?: string;
  
  /** Stock Keeping Unit - Unique per Tenant */
  sku: string;
  
  name_es: string;
  name_en?: string;
  
  category: PartCategory;
  location_code?: string; // e.g., "A-12-04"
  
  /** Cantidad física actual en almacén */
  current_stock: number;
  
  /** Punto crítico. Si current < min, dispara alerta crítica */
  min_safety_stock: number;
  
  /** Punto sugerido de re-compra */
  reorder_point: number;
  
  unit_cost: number;
  currency: 'USD' | 'MXN' | 'EUR';
  
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  tenant_id: string;
  part_id: string;
  
  transaction_type: TransactionType;
  quantity: number;
  
  /** ID de la Orden de Trabajo (R-MANT-05) o ID de Orden de Compra */
  reference_id?: string;
  
  notes?: string;
  created_by: string; // UUID del usuario
  created_at: string;
}

export interface AssetCompatibility {
  id: string;
  asset_id: string; // Machine ID
  part_id: string;
  
  /** Si es TRUE, la máquina NO puede operar sin este repuesto */
  is_critical: boolean;
}

/**
 * =============================================================================
 * ZOD SCHEMAS & VALIDATION (Input Types)
 * =============================================================================
 */

// Schema para crear/editar un repuesto
export const CreateSparePartSchema = z.object({
  sku: z.string()
    .min(3, { message: "SKU must be at least 3 characters" })
    .regex(/^[A-Z0-9-]+$/, { message: "SKU can only contain uppercase letters, numbers, and hyphens" }),
  
  name_es: z.string().min(2, "Name (Spanish) is required"),
  name_en: z.string().optional(),
  
  category: z.nativeEnum(PartCategory),
  location_code: z.string().max(20).optional(),
  
  current_stock: z.number().min(0, "Stock cannot be negative"),
  min_safety_stock: z.number().min(0),
  reorder_point: z.number().min(0),
  
  unit_cost: z.number().positive("Cost must be positive"),
  currency: z.enum(['USD', 'MXN', 'EUR']).default('USD'),
  
  supplier_id: z.string().uuid().optional(),
  lead_time_days: z.number().int().min(0).default(0)
});

// Type inference from Zod schema
export type CreateSparePartInput = z.infer<typeof CreateSparePartSchema>;

// Schema para registrar un movimiento
export const CreateTransactionSchema = z.object({
  part_id: z.string().uuid(),
  transaction_type: z.nativeEnum(TransactionType),
  quantity: z.number().positive("Quantity must be greater than 0"),
  reference_id: z.string().optional(), // Puede ser WO ID o null
  notes: z.string().max(500).optional()
});

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;

/**
 * =============================================================================
 * UTILITY HELPERS
 * =============================================================================
 */

/**
 * Determina el estado del inventario basado en reglas de negocio
 */
export const getInventoryStatus = (current: number, min: number): InventoryStatus => {
  if (current === 0) return 'OUT_OF_STOCK';
  if (current <= min) return 'LOW_STOCK';
  return 'IN_STOCK';
};
