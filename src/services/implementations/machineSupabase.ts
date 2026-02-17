
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
        telemetry: { timestamp: new Date().toISOString(), temperature: 0, vibration: 0, pressure: 0, powerConsumption: 0 },
        documents: record.documents || [] // ✅ FIX: Map documents field
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
        next_maintenance: machine.nextMaintenance || null,
        documents: machine.documents || [] // ✅ FIX: Persist documents field
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
        updated_at: new Date().toISOString(),
        documents: machine.documents || [] // ✅ FIX: Persist documents field
      })
      .eq('id', machine.id);

    if (error) throw error;
  },

  async getRecentMachineHourLogs(limit: number = 50): Promise<any[]> {
    const { data, error } = await supabase
      .from('machine_hour_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent logs:', error);
      return [];
    }

    return data.map((log: any) => ({
      id: log.id,
      machineId: log.machine_id,
      date: log.date,
      hoursLogged: log.hours_logged,
      operator: log.operator || 'Unknown',
      comments: log.comments
    }));
  },

  async getMachineHourLogs(machineId: string): Promise<any[]> {
    console.log("Service: getMachineHourLogs called for:", machineId);
    const { data, error } = await supabase
      .from('machine_hour_logs')
      .select('*')
      .eq('machine_id', machineId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching machine logs:', error);
      return [];
    }

    console.log("Service: getMachineHourLogs data:", data);

    // Map snake_case to camelCase
    return data.map((log: any) => ({
      id: log.id,
      machineId: log.machine_id,
      date: log.date,
      hoursLogged: log.hours_logged,
      operator: log.operator || 'Unknown',
      comments: log.comments
    }));
  },

  async getFilteredMachineHourLogs(filters: { machineId?: string, startDate?: string, endDate?: string }): Promise<any[]> {
    let query = supabase
      .from('machine_hour_logs')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.machineId) {
      query = query.eq('machine_id', filters.machineId);
    }
    if (filters.startDate) {
      query = query.gte('date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('date', filters.endDate);
    }

    if (!filters.machineId && !filters.startDate && !filters.endDate) {
      query = query.limit(50);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching filtered logs:', error);
      return [];
    }

    return data.map((log: any) => ({
      id: log.id,
      machineId: log.machine_id,
      date: log.date,
      hoursLogged: log.hours_logged,
      operator: log.operator || 'Unknown',
      comments: log.comments
    }));
  },

  async logMachineHours(log: { machineId: string, hoursLogged: number, operator: string, comments?: string }): Promise<any> {
    // 1. Log the hours
    const { data, error } = await supabase
      .from('machine_hour_logs')
      .insert({
        machine_id: log.machineId,
        date: new Date().toISOString().split('T')[0], // Current date YYYY-MM-DD
        hours_logged: log.hoursLogged,
        operator: log.operator,
        comments: log.comments
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Sync with Machine (if not IoT)
    try {
      const { data: machineData, error: machineError } = await supabase
        .from('machines')
        .select('is_iot')
        .eq('id', log.machineId)
        .single();

      if (!machineError && machineData && !machineData.is_iot) {
        await supabase
          .from('machines')
          .update({ running_hours: log.hoursLogged })
          .eq('id', log.machineId);
      }
    } catch (syncError) {
      console.error("Failed to sync machine running hours:", syncError);
      // Do not fail the main request if sync fails, just log it
    }

    // Return mapped object
    return {
      id: data.id,
      machineId: data.machine_id,
      date: data.date,
      hoursLogged: data.hours_logged,
      operator: data.operator,
      comments: data.comments
    };
  },

  async deleteMachine(id: string): Promise<void> { // Optional
    const { error } = await supabase.from('machines').delete().eq('id', id);
    if (error) throw error;
  }
};
