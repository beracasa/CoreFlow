
import { supabase } from '../supabaseClient';
import { SparePart } from '../../../types';

export const SparePartSupabaseService = {
  async getAllParts(): Promise<SparePart[]> {
    const { data, error } = await supabase
      .from('spare_parts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((record: any) => ({
      id: record.id,
      sku: record.sku,
      name: record.name,
      category: record.category,
      currentStock: record.current_stock,
      minimumStock: record.minimum_stock,
      maximumStock: record.maximum_stock, // Handles null if DB default is 0
      reorderPoint: record.reorder_point,
      locationCode: record.location_code,
      unitCost: record.unit_cost,
      supplier: record.supplier,
      leadTimeDays: record.lead_time_days
      // description not in type yet?
    })) as SparePart[];
  },

  async createPart(part: Omit<SparePart, 'id'>): Promise<SparePart> {
    const { data, error } = await supabase
      .from('spare_parts')
      .insert({
        // id: part.id, // Let DB generate ID
        sku: part.sku,
        name: part.name,
        category: part.category,
        current_stock: part.currentStock,
        minimum_stock: part.minimumStock,
        // maximum_stock: part.maximumStock, 
        reorder_point: part.reorderPoint,
        location_code: part.locationCode,
        unit_cost: part.unitCost,
        supplier: part.supplier,
        lead_time_days: part.leadTimeDays
      })
      .select()
      .single();

    if (error) throw error;
    // Map back
    return {
        ...part,
        id: data.id
    } as SparePart;
  },

  async updatePart(part: SparePart): Promise<void> {
    const { error } = await supabase
      .from('spare_parts')
      .update({
        sku: part.sku,
        name: part.name,
        category: part.category,
        current_stock: part.currentStock,
        minimum_stock: part.minimumStock,
        reorder_point: part.reorderPoint,
        location_code: part.locationCode,
        unit_cost: part.unitCost,
        supplier: part.supplier,
        lead_time_days: part.leadTimeDays
      })
      .eq('id', part.id);

    if (error) throw error;
  }
};
