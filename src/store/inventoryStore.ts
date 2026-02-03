import { create } from 'zustand';
import { SparePart, PartsRequest } from '../types/inventory';

interface InventoryState {
    parts: SparePart[];
    requests: PartsRequest[];
    loading: boolean;
    error: string | null;

    setParts: (parts: SparePart[]) => void;
    setRequests: (requests: PartsRequest[]) => void;
    addRequest: (request: PartsRequest) => void;
    updateRequest: (updatedRequest: PartsRequest) => void;
    updatePartStock: (partId: string, newStock: number) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
    parts: [],
    requests: [],
    loading: false,
    error: null,

    setParts: (parts) => set({ parts }),
    setRequests: (requests) => set({ requests }),

    addRequest: (request) => set((state) => ({
        requests: [request, ...state.requests]
    })),

    updateRequest: (updatedRequest) => set((state) => ({
        requests: state.requests.map((r) =>
            r.id === updatedRequest.id ? updatedRequest : r
        )
    })),

    updatePartStock: (partId, newStock) => set((state) => ({
        parts: state.parts.map((p) =>
            p.id === partId ? { ...p, currentStock: newStock } : p
        )
    })),

    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
}));
