import { supabase } from '../supabaseClient';
import { WorkOrder } from '../../../types';
import { IWorkOrderService } from '../workOrderService';

export class WorkOrderSupabaseService implements IWorkOrderService {
    async getAll(): Promise<WorkOrder[]> {
        const { data, error } = await supabase
            .from('work_orders')
            .select('*')
            .order('createdDate', { ascending: false });

        if (error) {
            console.error('Error fetching orders:', error);
            throw error;
        }
        // TODO: Implement mapper if DB columns are snake_case vs WorkOrder camelCase
        return data as unknown as WorkOrder[];
    }

    async getById(id: string): Promise<WorkOrder | null> {
        const { data, error } = await supabase
            .from('work_orders')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error(`Error fetching order ${id}:`, error);
            return null;
        }
        return data as unknown as WorkOrder;
    }

    async create(orderData: Omit<WorkOrder, 'id'>): Promise<WorkOrder> {
        const { data, error } = await supabase
            .from('work_orders')
            .insert(orderData)
            .select()
            .single();

        if (error) {
            console.error('Error creating order:', error);
            throw error;
        }
        return data as unknown as WorkOrder;
    }

    async update(id: string, updates: Partial<WorkOrder>): Promise<void> {
        const { error } = await supabase
            .from('work_orders')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error(`Error updating order ${id}:`, error);
            throw error;
        }
    }
}
