import { SparePart, PartsRequest, InventoryTransaction, PurchaseRequest } from '../types/inventory';

export interface IInventoryService {
    getAllParts(): Promise<SparePart[]>;
    getAllRequests(): Promise<PartsRequest[]>;
    createRequest(requestData: Omit<PartsRequest, 'id' | 'createdDate' | 'status' | 'requestNumber' | 'items'> & { items: { partId: string; quantity: number }[] }): Promise<PartsRequest>;
    deliverParts(requestId: string, itemsToDeliver: { partId: string; quantity: number }[], receiverId?: string): Promise<PartsRequest>;
    closeRequest(requestId: string): Promise<PartsRequest>;
    addStock(partId: string, quantity: number, relatedDocId?: string): Promise<void>;
    createPart(partData: Omit<SparePart, 'id' | 'currentStock'> & { initialStock?: number }): Promise<SparePart>;
    updatePart(updatedPart: SparePart): Promise<SparePart>;
    deleteRequest(requestId: string): Promise<void>;
    updateRequest(updatedRequest: PartsRequest): Promise<PartsRequest>;

    // New method for bulk import
    bulkCreate(parts: Omit<SparePart, 'id'>[]): Promise<void>;

    // Purchase Request
    savePurchaseRequest(requestId: string, purchaseRequest: any): Promise<PartsRequest>;
}
