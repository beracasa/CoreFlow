import { supabase } from './supabaseClient';
import { Machine, Technician, ZoneStructure } from '../../types';

export const MasterDataService = {
  // MACHINES
  async getMachines(): Promise<Machine[]> {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching machines:', error);
        throw error;
    }
    
    // Minimal mapping needed since DB columns match types (mostly).
    // Adjust if needed based on snake_case vs camelCase if not handled automatically
    // or if we need to parse JSON fields.
    // Assuming simple mapping for now, but really we should map explicitly like other services.
    return data.map((record: any) => ({
        ...record,
        // Map snake_case to camelCase
        location: { x: record.location_x, y: record.location_y },
        runningHours: record.running_hours,
        lastMaintenance: record.last_maintenance,
        nextMaintenance: record.next_maintenance,
        isIot: record.is_iot,
        imageUrl: record.image_url,
        // Ensure arrays are arrays
        intervals: record.maintenance_intervals || [],
        history: [], // Not yet in DB or handled separately
        telemetry: {
             timestamp: new Date().toISOString(),
             temperature: 0,
             vibration: 0,
             pressure: 0,
             powerConsumption: 0
        } 
    })) as Machine[];
  },

  async createMachine(machine: Machine): Promise<Machine> {
    const { data, error } = await supabase
      .from('machines')
      .insert({
        id: machine.id,
        name: machine.name,
        plate: machine.plate,
        type: machine.type,
        status: machine.status,
        location_x: machine.location.x,
        location_y: machine.location.y,
        branch: machine.branch,
        category: machine.category,
        brand: machine.brand,
        model: machine.model,
        year: machine.year,
        is_iot: machine.isIot,
        running_hours: machine.runningHours,
        last_maintenance: machine.lastMaintenance,
        next_maintenance: machine.nextMaintenance,
        maintenance_intervals: machine.intervals,
        image_url: machine.imageUrl
      })
      .select()
      .single();

    if (error) throw error;
    return data; // Should map back ideally
  },

  async updateMachine(machine: Machine): Promise<void> {
    const { error } = await supabase
      .from('machines')
      .update({
        name: machine.name,
        plate: machine.plate,
        type: machine.type,
        status: machine.status,
        location_x: machine.location.x,
        location_y: machine.location.y,
        branch: machine.branch,
        category: machine.category,
        brand: machine.brand,
        model: machine.model,
        year: machine.year,
        is_iot: machine.isIot,
        running_hours: machine.runningHours,
        last_maintenance: machine.lastMaintenance,
        next_maintenance: machine.nextMaintenance,
        maintenance_intervals: machine.intervals,
        image_url: machine.imageUrl
      })
      .eq('id', machine.id);

    if (error) throw error;
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
    const { data, error } = await supabase.from('zones').select('*');
    if (error) throw error;
    return data as ZoneStructure[];
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
        color: zone.color
    }).select().single();
    if (error) throw error;
    return data as ZoneStructure[];
  },

  async updateZone(zone: ZoneStructure): Promise<void> {
    const { error } = await supabase.from('zones').update({
        name: zone.name,
        lines: zone.lines,
        x: zone.x,
        y: zone.y,
        width: zone.width,
        height: zone.height,
        color: zone.color
    }).eq('id', zone.id);
    if (error) throw error;
  },

  async removeZone(id: string): Promise<void> {
    const { error } = await supabase.from('zones').delete().eq('id', id);
    if (error) throw error;
  }
};
