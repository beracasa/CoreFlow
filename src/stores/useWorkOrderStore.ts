import { create } from 'zustand';
import { WorkOrder } from '../../types'; // Adjust path if types.ts is in src, currently at root so ../../types or ../types depending on where we are.
// Wait, file is src/stores/useWorkOrderStore.ts -> ../../types is correct if types is in root.
import { workOrderService } from '../services';

interface WorkOrderState {
    workOrders: WorkOrder[];
    loading: boolean;
    isInitialized: boolean;
    error: string | null;
    pagination: {
        page: number;
        limit: number;
        total: number;
    };

    fetchOrders: (page?: number, limit?: number, formType?: string) => Promise<void>;
    setPage: (page: number, formType?: string) => Promise<void>;
    addOrder: (order: Omit<WorkOrder, 'id'>) => Promise<void>;
    updateOrder: (id: string, updates: Partial<WorkOrder>) => Promise<void>;
    deleteOrder: (id: string) => Promise<void>;
    getOrderById: (id: string) => WorkOrder | undefined;
}

export const useWorkOrderStore = create<WorkOrderState>((set, get) => ({
    workOrders: [],
    loading: false,
    isInitialized: false, // Add flag
    error: null,
    pagination: {
        page: 1,
        limit: 50,
        total: 0
    },

    fetchOrders: async (page = 1, limit = 50, formType) => {
        set({ loading: true, error: null });
        try {
            const result = await workOrderService.getAll(page, limit, formType);
            set({
                workOrders: result.data,
                pagination: { page, limit, total: result.total },
                loading: false,
                isInitialized: true
            });
        } catch (err: any) {
            set({ error: err.message || 'Failed to fetch orders', loading: false, isInitialized: true });
        }
    },

    setPage: async (page, formType) => {
        const { pagination } = get();
        await get().fetchOrders(page, pagination.limit, formType);
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
            throw err; // Re-throw for UI handling
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
            throw err; // Re-throw for UI handling
        }
    },

    deleteOrder: async (id) => {
        set({ loading: true, error: null });
        try {
            await workOrderService.delete(id);
            set((state) => ({
                workOrders: state.workOrders.filter(o => o.id !== id),
                loading: false
            }));
        } catch (err: any) {
            set({ error: err.message || 'Failed to delete order', loading: false });
            throw err;
        }
    },

    getOrderById: (id: string) => {
        return get().workOrders.find(o => o.id === id);
    }
}));
