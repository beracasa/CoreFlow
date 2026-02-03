import { create } from 'zustand';
import { WorkOrder } from '../../types'; // Adjust path if types.ts is in src, currently at root so ../../types or ../types depending on where we are.
// Wait, file is src/stores/useWorkOrderStore.ts -> ../../types is correct if types is in root.
import { workOrderService } from '../services';

interface WorkOrderState {
    workOrders: WorkOrder[];
    loading: boolean;
    error: string | null;

    fetchOrders: () => Promise<void>;
    addOrder: (order: Omit<WorkOrder, 'id'>) => Promise<void>;
    updateOrder: (id: string, updates: Partial<WorkOrder>) => Promise<void>;
    getOrderById: (id: string) => WorkOrder | undefined;
}

export const useWorkOrderStore = create<WorkOrderState>((set, get) => ({
    workOrders: [],
    loading: false,
    error: null,

    fetchOrders: async () => {
        set({ loading: true, error: null });
        try {
            const orders = await workOrderService.getAll();
            set({ workOrders: orders, loading: false });
        } catch (err: any) {
            set({ error: err.message || 'Failed to fetch orders', loading: false });
        }
    },

    addOrder: async (orderData) => {
        set({ loading: true, error: null });
        try {
            const newOrder = await workOrderService.create(orderData);
            set((state) => ({
                workOrders: [newOrder, ...state.workOrders],
                loading: false
            }));
        } catch (err: any) {
            set({ error: err.message || 'Failed to create order', loading: false });
        }
    },

    updateOrder: async (id, updates) => {
        // Optimistic update or wait? User said "actualiza estado local". Use simple wait.
        set({ loading: true, error: null });
        try {
            await workOrderService.update(id, updates);
            set((state) => ({
                workOrders: state.workOrders.map(o => o.id === id ? { ...o, ...updates } : o),
                loading: false
            }));
            // Optionally re-fetch to be sure?
        } catch (err: any) {
            set({ error: err.message || 'Failed to update order', loading: false });
        }
    },

    getOrderById: (id: string) => {
        return get().workOrders.find(o => o.id === id);
    }
}));
