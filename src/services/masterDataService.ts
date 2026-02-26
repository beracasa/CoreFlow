import { supabase } from './supabaseClient';
import { Machine, Technician, ZoneStructure } from '../../types';
import { MachineSupabaseService } from './implementations/machineSupabase';

export const MasterDataService = {
  // MACHINES
  async getMachines(): Promise<Machine[]> {
    return MachineSupabaseService.getMachines();
  },

  async createMachine(machine: Omit<Machine, 'id'>): Promise<Machine> {
    return MachineSupabaseService.createMachine(machine);
  },

  async updateMachine(machine: Machine): Promise<void> {
    return MachineSupabaseService.updateMachine(machine);
  },

  async deleteMachine(id: string): Promise<void> {
    return MachineSupabaseService.deleteMachine(id);
  },

  // TECHNICIANS
  async getTechnicians(): Promise<Technician[]> {
    const { data, error } = await supabase.from('technicians').select('*');
    if (error) throw error;
    return data as Technician[];
  },

  async createTechnician(tech: Technician): Promise<Technician> {
    const { data, error } = await supabase.from('technicians').insert(tech).select().single();
    if (error) throw error;
    return data as Technician;
  },

  // ZONES
  async getZones(): Promise<ZoneStructure[]> {
    const { data, error } = await supabase.from('zones').select('*').order('order_index', { ascending: true });
    if (error) throw error;
    return data.map((z: any) => ({
      ...z,
      orderIndex: z.order_index
    })) as ZoneStructure[];
  },

  async createZone(zone: ZoneStructure): Promise<ZoneStructure> {
    const { data, error } = await supabase.from('zones').insert({
      id: zone.id,
      name: zone.name,
      lines: zone.lines,
      x: zone.x,
      y: zone.y,
      width: zone.width,
      height: zone.height,
      color: zone.color,
      order_index: zone.orderIndex || 0
    }).select().single();
    if (error) throw error;
    // Map back to camelCase
    return { ...data, orderIndex: data.order_index } as ZoneStructure;
  },

  async updateZone(zone: ZoneStructure): Promise<void> {
    const { error } = await supabase.from('zones').update({
      name: zone.name,
      lines: zone.lines,
      x: zone.x,
      y: zone.y,
      width: zone.width,
      height: zone.height,
      color: zone.color,
      order_index: zone.orderIndex
    }).eq('id', zone.id);
    if (error) throw error;
  },

  async updateZoneOrder(zones: ZoneStructure[]): Promise<void> {
    // Upsert all zones with new order_index
    // Prepare payload
    const updates = zones.map(z => ({
      id: z.id,
      name: z.name,
      lines: z.lines,
      x: z.x,
      y: z.y,
      width: z.width,
      height: z.height,
      color: z.color,
      order_index: z.orderIndex
    }));

    const { error } = await supabase.from('zones').upsert(updates);
    if (error) throw error;
  },

  async removeZone(id: string): Promise<void> {
    const { error } = await supabase.from('zones').delete().eq('id', id);
    if (error) throw error;
  },

  // BRANCHES
  async getBranches(): Promise<string[]> {
    const { data, error } = await supabase.from('branches').select('name').order('name');
    if (error) throw error;
    return data.map((b: any) => b.name);
  },
  async createBranch(name: string): Promise<string> {
    const { data, error } = await supabase.from('branches').insert({ name }).select('name').single();
    if (error) throw error;
    return data.name;
  },
  async removeBranch(name: string): Promise<void> {
    const { error } = await supabase.from('branches').delete().eq('name', name);
    if (error) throw error;
  },

  // CATEGORIES
  async getCategories(): Promise<string[]> {
    const { data, error } = await supabase.from('asset_categories').select('name').order('name');
    if (error) throw error;
    return data.map((c: any) => c.name);
  },
  async createCategory(name: string): Promise<string> {
    const { data, error } = await supabase.from('asset_categories').insert({ name }).select('name').single();
    if (error) throw error;
    return data.name;
  },
  async removeCategory(name: string): Promise<void> {
    const { error } = await supabase.from('asset_categories').delete().eq('name', name);
    if (error) throw error;
  },

  // ASSET TYPES
  async getAssetTypes(): Promise<string[]> {
    const { data, error } = await supabase.from('asset_types').select('name').order('name');
    if (error) throw error;
    return data.map((t: any) => t.name);
  },
  async createAssetType(name: string): Promise<string> {
    const { data, error } = await supabase.from('asset_types').insert({ name }).select('name').single();
    if (error) throw error;
    return data.name;
  },
  async removeAssetType(name: string): Promise<void> {
    const { error } = await supabase.from('asset_types').delete().eq('name', name);
    if (error) throw error;
  },

  // SETTINGS (Metadata)
  async getPlantSettings(): Promise<any> {
    const { data, error } = await supabase.from('plant_settings').select('*').single();
    if (error) {
      // If no row exists (e.g. before running script), return null or throw. 
      // Ideally the script inserts row 1.
      console.warn("Could not fetch plant settings:", error.message);
      return null;
    }
    return {
      plantName: data.plant_name,
      rnc: data.rnc,
      timezone: data.timezone,
      currency: data.currency,
      logoUrl: data.logo_url
    };
  },

  async updatePlantSettings(settings: any): Promise<void> {
    const { error } = await supabase.from('plant_settings').upsert({
      id: 1, // Force singleton
      plant_name: settings.plantName,
      rnc: settings.rnc,
      timezone: settings.timezone,
      currency: settings.currency,
      logo_url: settings.logoUrl,
      updated_at: new Date()
    });
    if (error) throw error;
  },

  // SPARE PARTS CONFIGURATION
  // Categories
  async getPartCategories(): Promise<string[]> {
    const { data, error } = await supabase.from('spare_part_categories').select('name').order('name');
    if (error) throw error;
    return data.map((c: any) => c.name);
  },
  async createPartCategory(name: string): Promise<string> {
    const { data, error } = await supabase.from('spare_part_categories').insert({ name }).select('name').single();
    if (error) throw error;
    return data.name;
  },
  async removePartCategory(name: string): Promise<void> {
    const { error } = await supabase.from('spare_part_categories').delete().eq('name', name);
    if (error) throw error;
  },

  // Locations
  async getPartLocations(): Promise<string[]> {
    const { data, error } = await supabase.from('spare_part_locations').select('name').order('name');
    if (error) throw error;
    return data.map((l: any) => l.name);
  },
  async createPartLocation(name: string): Promise<string> {
    const { data, error } = await supabase.from('spare_part_locations').insert({ name }).select('name').single();
    if (error) throw error;
    return data.name;
  },
  async removePartLocation(name: string): Promise<void> {
    const { error } = await supabase.from('spare_part_locations').delete().eq('name', name);
    if (error) throw error;
  },

  // Units
  async getPartUnits(): Promise<string[]> {
    const { data, error } = await supabase.from('spare_part_units').select('name').order('name');
    if (error) throw error;
    return data.map((u: any) => u.name);
  },
  async createPartUnit(name: string): Promise<string> {
    const { data, error } = await supabase.from('spare_part_units').insert({ name }).select('name').single();
    if (error) throw error;
    return data.name;
  },
  async removePartUnit(name: string): Promise<void> {
    const { error } = await supabase.from('spare_part_units').delete().eq('name', name);
    if (error) throw error;
  },

  // Update with Cascade
  async updatePartCategory(oldName: string, newName: string): Promise<void> {
    // 1. Update config table
    const { error: configError } = await supabase.from('spare_part_categories').update({ name: newName }).eq('name', oldName);
    if (configError) throw configError;

    // 2. Cascade to spare_parts
    const { error: cascadeError } = await supabase.from('spare_parts').update({ category: newName }).eq('category', oldName);
    if (cascadeError) throw cascadeError;
  },

  async updatePartLocation(oldName: string, newName: string): Promise<void> {
    // 1. Update config table
    const { error: configError } = await supabase.from('spare_part_locations').update({ name: newName }).eq('name', oldName);
    if (configError) throw configError;

    // 2. Cascade to spare_parts
    const { error: cascadeError } = await supabase.from('spare_parts').update({ location_code: newName }).eq('location_code', oldName);
    if (cascadeError) throw cascadeError;
  },

  async updatePartUnit(oldName: string, newName: string): Promise<void> {
    // 1. Update config table
    const { error: configError } = await supabase.from('spare_part_units').update({ name: newName }).eq('name', oldName);
    if (configError) throw configError;

    // 2. Cascade to spare_parts
    const { error: cascadeError } = await supabase.from('spare_parts').update({ unit_of_measure: newName }).eq('unit_of_measure', oldName);
    if (cascadeError) throw cascadeError;
  }
};
