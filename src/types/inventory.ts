export interface SparePart {
    id: string;
    name: string;
    partNumber: string;
    description: string;
    category: string;
    unitOfMeasure: string;
    currentStock: number;
    minStock: number;
    location: string;
    cost: number;
}

export type TransactionType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface InventoryTransaction {
    id: string;
    partId: string;
    type: TransactionType;
    quantity: number;
    date: string;
    userId: string;
    relatedDocumentId?: string; // ID of the Request or Purchase Order
}

export type RequestStatus = 'OPEN' | 'PARTIAL' | 'CLOSED' | 'PENDING_STOCK';
export type RequestPriority = 'NORMAL' | 'HIGH' | 'EMERGENCY';

export interface RequestItem {
    partId: string;
    quantityRequested: number;
    quantityDelivered: number;
}

export interface PartsRequest {
    id: string;
    requestNumber: string;
    technicianId: string;
    status: RequestStatus;
    priority: RequestPriority;
    items: RequestItem[];
    createdDate: string;
}
