import { create } from 'zustand';
import { WorkOrder } from '../../types'; // Adjust path if types.ts is in src, currently at root so ../../types or ../types depending on where we are.
// Wait, file is src/stores/useWorkOrderStore.ts -> ../../types is correct if types is in root.
import { workOrderService } from '../services';
import { WorkOrderFilters } from '../services/workOrderService';

let lastOrdersFetchId = 0;

interface WorkOrderState {
    workOrders: WorkOrder[];
    allOrders: WorkOrder[]; // Global list for indicators (all types, all pages)
    loading: boolean;
    isInitialized: boolean;
    error: string | null;
    activeFilters?: WorkOrderFilters;
    pagination: {
        page: number;
        limit: number;
        total: number;
    };

    calendarOrders: WorkOrder[];
    allOrdersLoading: boolean;
    fetchOrders: (page?: number, limit?: number, formType?: string, filters?: WorkOrderFilters) => Promise<void>;
    fetchAllOrders: () => Promise<void>;
    fetchAllFilteredOrders: (formType?: string, filters?: WorkOrderFilters) => Promise<WorkOrder[]>;
    setPage: (page: number, formType?: string, filters?: WorkOrderFilters) => Promise<void>;
    addOrder: (order: Omit<WorkOrder, 'id'>) => Promise<WorkOrder>;
    updateOrder: (id: string, updates: Partial<WorkOrder>) => Promise<void>;
    deleteOrder: (id: string) => Promise<void>;
    getOrderById: (id: string) => WorkOrder | undefined;
    fetchCalendarOrders: () => Promise<void>;
}

export const useWorkOrderStore = create<WorkOrderState>((set, get) => ({
    workOrders: [],
    allOrders: [],
    calendarOrders: [],
    loading: false,
    allOrdersLoading: false,
    isInitialized: false, // Add flag
    error: null,
    activeFilters: undefined,
    pagination: {
        page: 1,
        limit: 25,
        total: 0
    },

    fetchOrders: async (page = 1, limit = 25, formType, filters) => {
        const fetchId = ++lastOrdersFetchId;
        set({ loading: true, error: null, activeFilters: filters });
        try {
            const result = await workOrderService.getAll(page, limit, formType, filters);

            // Ignore stale responses if a newer fetch was triggered
            if (fetchId !== lastOrdersFetchId) return;

            // If fetching without formType or filters, it's a global fetch (effectively "all orders" for indicators)
            const updates: Partial<WorkOrderState> = {
                workOrders: result.data,
                pagination: { page, limit, total: result.total },
                loading: false,
                isInitialized: true
            };

            if (!formType && !filters) {
                updates.allOrders = result.data;
            }

            set(updates);
        } catch (err: any) {
            if (fetchId !== lastOrdersFetchId) return;
            set({ error: err.message || 'Failed to fetch orders', loading: false, isInitialized: true });
        }
    },

    fetchAllOrders: async () => {
        set({ allOrdersLoading: true, error: null });
        try {
            const pageSize = 1000;
            let page = 1;
            let collected: WorkOrder[] = [];
            let total = 0;

            do {
                const result = await workOrderService.getAll(page, pageSize);
                collected = collected.concat(result.data);
                total = result.total;
                page += 1;
                if (result.data.length === 0) break;
            } while (collected.length < total);

            set({
                allOrders: collected,
                allOrdersLoading: false
            });
        } catch (err: any) {
            set({ error: err.message || 'Failed to fetch all orders', allOrdersLoading: false });
        }
    },

    fetchAllFilteredOrders: async (formType, filters) => {
        const pageSize = 1000;
        let page = 1;
        let collected: WorkOrder[] = [];
        let total = 0;

        do {
            const result = await workOrderService.getAll(page, pageSize, formType, filters);
            collected = collected.concat(result.data);
            total = result.total;
            page += 1;
            if (result.data.length === 0) break;
        } while (collected.length < total);

        return collected;
    },

    setPage: async (page, formType, filters) => {
        const { pagination, activeFilters } = get();
        await get().fetchOrders(page, pagination.limit, formType, filters ?? activeFilters);
    },

    addOrder: async (orderData) => {
        set({ loading: true, error: null });
        try {
            const newOrder = await workOrderService.create(orderData);
            set((state) => ({
                workOrders: [newOrder, ...state.workOrders],
                allOrders: [newOrder, ...state.allOrders],
                loading: false
            }));
            return newOrder;
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
                allOrders: state.allOrders.map(o => o.id === id ? { ...o, ...updates } : o),
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
                allOrders: state.allOrders.filter(o => o.id !== id),
                loading: false
            }));
        } catch (err: any) {
            set({ error: err.message || 'Failed to delete order', loading: false });
            throw err;
        }
    },

    getOrderById: (id: string) => {
        return get().workOrders.find(o => o.id === id);
    },

    fetchCalendarOrders: async () => {
        set({ loading: true, error: null });
        try {
            const result = await workOrderService.getAll(1, 1000);
            set({
                calendarOrders: result.data,
                loading: false
            });
        } catch (err: any) {
            set({ error: err.message || 'Failed to fetch calendar orders', loading: false });
        }
    }
}));
