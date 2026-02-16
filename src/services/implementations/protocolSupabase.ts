
import { supabase } from '../supabaseClient';
import { MaintenancePlan, MaintenanceInterval, MaintenanceTask } from '../../../types';

export const ProtocolSupabaseService = {

  // --- GET ---
  async getProtocolByMachineId(machineId: string): Promise<MaintenancePlan | null> {
    // 1. Get Protocol ID
    const { data: protocol, error: protoError } = await supabase
      .from('maintenance_protocols')
      .select('id')
      .eq('machine_id', machineId)
      .single();

    if (protoError) {
        if (protoError.code === 'PGRST116') return null; // Not found
        throw protoError;
    }

    if (!protocol) return null;

    // 2. Get Intervals
    const { data: intervalsData, error: intervError } = await supabase
      .from('maintenance_intervals')
      .select('*')
      .eq('protocol_id', protocol.id)
      .order('hours', { ascending: true }); // Order by hours

    if (intervError) throw intervError;

    // 3. Get Tasks for all intervals
    const intervalIds = intervalsData.map((i: any) => i.id);
    let tasksData: any[] = [];
    
    if (intervalIds.length > 0) {
        const { data: tasks, error: taskError } = await supabase
        .from('maintenance_tasks')
        .select('*')
        .in('interval_id', intervalIds)
        .order('sequence', { ascending: true });
        
        if (taskError) throw taskError;
        tasksData = tasks;
    }

    // 4. Assemble Structure
    const intervals: MaintenanceInterval[] = intervalsData.map((interv: any) => {
        const tasks = tasksData
            .filter((t: any) => t.interval_id === interv.id)
            .map((t: any) => ({
                id: t.id,
                sequence: t.sequence,
                group: t.group_name,
                component: t.component,
                activity: t.activity,
                estimatedTime: t.estimated_time,
                referenceCode: t.reference_code,
                lubricantType: t.lubricant_type,
                lubricantCode: t.lubricant_code,
                notes: t.notes, // If stored
                actionFlags: {
                    clean: t.action_clean,
                    inspect: t.action_inspect,
                    lubricate: t.action_lubricate,
                    adjust: t.action_adjust,
                    refill: t.action_refill,
                    replace: t.action_replace,
                    mount: t.action_mount
                }
            } as MaintenanceTask));

        return {
            id: interv.id,
            hours: interv.hours,
            label: interv.label,
            tasks: tasks
        };
    });

    return {
        machineId: machineId,
        intervals: intervals
    };
  },

  // --- CREATE / UPDATE ---
  // Simplification: We'll delete existing protocol for this machine and recreate it 
  // to handle complex nested updates (add/remove intervals/tasks) easily. 
  // In a high-concurrency app, this is bad. For this app, it's robust.
  
  async saveProtocol(plan: MaintenancePlan): Promise<MaintenancePlan> {
    // 1. Check if protocol exists
    const { data: existing } = await supabase
        .from('maintenance_protocols')
        .select('id')
        .eq('machine_id', plan.machineId)
        .single();
    
    let protocolId = existing?.id;

    if (existing) {
        const { error: delError } = await supabase
            .from('maintenance_intervals')
            .delete()
            .eq('protocol_id', protocolId);
            
        if (delError) throw delError;
    } else {
        // Create Protocol
        const { data: newProto, error: createError } = await supabase
            .from('maintenance_protocols')
            .insert({ machine_id: plan.machineId, description: 'Auto-generated' })
            .select('id')
            .single();
            
        if (createError) throw createError;
        protocolId = newProto.id;
    }

    // 2. Insert Intervals
    for (const interval of plan.intervals) {
        const { data: intervalDB, error: intError } = await supabase
            .from('maintenance_intervals')
            .insert({
                protocol_id: protocolId,
                hours: interval.hours,
                label: interval.label
            })
            .select('id')
            .single();

        if (intError) throw intError;

        // 3. Insert Tasks
        if (interval.tasks.length > 0) {
            const tasksPayload = interval.tasks.map(t => ({
                interval_id: intervalDB.id,
                sequence: t.sequence,
                group_name: t.group,
                component: t.component,
                activity: t.activity,
                estimated_time: t.estimatedTime,
                reference_code: t.referenceCode,
                lubricant_type: t.lubricantType,
                lubricant_code: t.lubricantCode,
                // notes: t.notes
                action_clean: t.actionFlags.clean,
                action_inspect: t.actionFlags.inspect,
                action_lubricate: t.actionFlags.lubricate,
                action_adjust: t.actionFlags.adjust,
                action_refill: t.actionFlags.refill,
                action_replace: t.actionFlags.replace,
                action_mount: t.actionFlags.mount
            }));

            const { error: taskError } = await supabase
                .from('maintenance_tasks')
                .insert(tasksPayload);

            if (taskError) throw taskError;
        }
    }

    // 4. Return fresh protocol with new IDs
    const freshProfile = await this.getProtocolByMachineId(plan.machineId);
    if (!freshProfile) throw new Error('Failed to retrieve saved protocol');
    return freshProfile;
  }
};
