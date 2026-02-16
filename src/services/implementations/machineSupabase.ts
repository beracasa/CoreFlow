
import { supabase } from '../supabaseClient';
import { Machine } from '../../../types';

export const MachineSupabaseService = {
  async getMachines(): Promise<Machine[]> {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching machines:', error);
        throw error;
    }
    
    return data.map((record: any) => {
        const specs = record.specifications || {};
        
        return {
            id: record.id,
            name: record.name,
            code: record.code || '',
            serialNumber: record.serial_number || '',
            plate: record.serial_number || '', // Map serial_number to plate for component compatibility
            type: record.type || 'GENERIC', // ✅ FIX: Map type field
            status: record.status || 'IDLE',
            location: { x: record.location_x || 0, y: record.location_y || 0 },
            branch: record.branch || '',
            category: record.category || '',
            zone: record.zone || '',
            brand: record.brand || '',
            model: record.model || '',
            year: record.year || null,
            imageUrl: record.image_url || '',
            isIot: record.is_iot || false,
            isActive: record.is_active !== false, // Default to true if not specified
            runningHours: record.running_hours || 0,
            lastMaintenance: record.last_maintenance || null,
            nextMaintenance: record.next_maintenance || null,
            specifications: specs,
            // Extract technical specs from JSONB for component compatibility
            voltage: specs.voltage || null,
            frequency: specs.frequency || null,
            power: specs.power || null,
            capacity: specs.capacity || null,
            currentRating: specs.currentRating || null,
            intervals: [],
            history: [], 
            telemetry: { timestamp: new Date().toISOString(), temperature: 0, vibration: 0, pressure: 0, powerConsumption: 0 }
        };
    }) as Machine[];
  },

  async createMachine(machine: Omit<Machine, 'id'>): Promise<Machine> {
    // Build specifications object from individual fields
    const specifications: any = { ...(machine.specifications || {}) };
    
    // Add technical specs if they exist as top-level properties
    if ((machine as any).voltage) specifications.voltage = (machine as any).voltage;
    if ((machine as any).frequency) specifications.frequency = (machine as any).frequency;
    if ((machine as any).power) specifications.power = (machine as any).power;
    if ((machine as any).capacity) specifications.capacity = (machine as any).capacity;
    if ((machine as any).currentRating) specifications.currentRating = (machine as any).currentRating;
    
    const { data, error } = await supabase
      .from('machines')
      .insert({
        name: machine.name,
        code: machine.code || (machine as any).alias || null,
        serial_number: (machine as any).plate || machine.serialNumber || null,
        type: machine.type || 'GENERIC', // ✅ FIX: Persist type field
        status: machine.status || 'IDLE',
        location_x: machine.location?.x || 0,
        location_y: machine.location?.y || 0,
        branch: machine.branch || null,
        category: machine.category || null,
        zone: machine.zone || null,
        brand: machine.brand || null,
        model: machine.model || null,
        year: machine.year || null,
        image_url: machine.imageUrl || null,
        specifications: specifications,
        is_iot: machine.isIot || false,
        is_active: (machine as any).isActive !== false, // ✅ FIX: Persist isActive field
        running_hours: machine.runningHours || 0,
        last_maintenance: machine.lastMaintenance || null,
        next_maintenance: machine.nextMaintenance || null
      })
      .select()
      .single();

    if (error) throw error;
    
    // Return mapped object with new ID
    return {
        ...machine,
        id: data.id,
    } as Machine;
  },

  async updateMachine(machine: Machine): Promise<void> {
    // Build specifications object from individual fields
    const specifications: any = { ...(machine.specifications || {}) };
    
    // Add technical specs if they exist as top-level properties
    if ((machine as any).voltage) specifications.voltage = (machine as any).voltage;
    if ((machine as any).frequency) specifications.frequency = (machine as any).frequency;
    if ((machine as any).power) specifications.power = (machine as any).power;
    if ((machine as any).capacity) specifications.capacity = (machine as any).capacity;
    if ((machine as any).currentRating) specifications.currentRating = (machine as any).currentRating;
    
    const { error } = await supabase
      .from('machines')
      .update({
        name: machine.name,
        code: machine.code || (machine as any).alias || null,
        serial_number: (machine as any).plate || machine.serialNumber || null,
        type: machine.type || 'GENERIC', // ✅ FIX: Persist type field
        status: machine.status || 'IDLE',
        location_x: machine.location?.x || 0,
        location_y: machine.location?.y || 0,
        branch: machine.branch || null,
        category: machine.category || null,
        zone: machine.zone || null,
        brand: machine.brand || null,
        model: machine.model || null,
        year: machine.year || null,
        image_url: machine.imageUrl || null,
        specifications: specifications,
        is_iot: machine.isIot || false,
        is_active: (machine as any).isActive !== false, // ✅ FIX: Persist isActive field
        running_hours: machine.runningHours || 0,
        last_maintenance: machine.lastMaintenance || null,
        next_maintenance: machine.nextMaintenance || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', machine.id);

    if (error) throw error;
  },
  
  async deleteMachine(id: string): Promise<void> { // Optional
      const { error } = await supabase.from('machines').delete().eq('id', id);
      if(error) throw error;
  }
};
