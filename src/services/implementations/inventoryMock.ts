import { SparePart, PartsRequest, InventoryTransaction, RequestStatus, TransactionType, PurchaseRequest } from '../../types/inventory';
import { saveToStorage, loadFromStorage } from '../../utils/persistence';

const PARTS_KEY = 'v2_inventory_parts';
const REQUESTS_KEY = 'v2_inventory_requests';
const TRANSACTIONS_KEY = 'v2_inventory_transactions';
const RECEPTIONS_KEY = 'v2_inventory_receptions';

const INITIAL_PARTS: SparePart[] = [
    { id: 'p1', name: 'Ball Bearing 6204', partNumber: 'BB-6204', description: 'Deep groove ball bearing', category: 'Bearings', unitOfMeasure: 'PCS', currentStock: 15, minStock: 5, location: 'A-01', cost: 5.50, createdAt: new Date().toISOString() },
    { id: 'p2', name: 'Hydraulic Hose 1/2"', partNumber: 'HH-050', description: 'High pressure hose', category: 'Hydraulics', unitOfMeasure: 'M', currentStock: 2, minStock: 10, location: 'B-03', cost: 12.00, createdAt: new Date().toISOString() },
    { id: 'p3', name: 'Limit Switch', partNumber: 'LS-001', description: 'Industrial limit switch', category: 'Electronics', unitOfMeasure: 'PCS', currentStock: 8, minStock: 3, location: 'C-02', cost: 45.00, createdAt: new Date().toISOString() },
    { id: 'p4', name: 'V-Belt A-48', partNumber: 'VB-A48', description: 'Industrial drive belt', category: 'Transmission', unitOfMeasure: 'PCS', currentStock: 12, minStock: 4, location: 'A-05', cost: 8.75, createdAt: new Date().toISOString() },
    { id: 'p5', name: 'Air Filter Element', partNumber: 'AF-500', description: 'Engine air intake filter', category: 'Filters', unitOfMeasure: 'PCS', currentStock: 20, minStock: 10, location: 'D-01', cost: 15.30, createdAt: new Date().toISOString() },
];

const INITIAL_REQUESTS: PartsRequest[] = [
    {
        id: 'r1',
        requestNumber: 'REQ-1001',
        technicianId: 'T1',
        status: 'OPEN',
        priority: 'NORMAL',
        createdDate: new Date().toISOString(),
        items: [
            { partId: 'p1', quantityRequested: 5, quantityDelivered: 0 }
        ]
    },
    {
        id: 'r2',
        requestNumber: 'REQ-1002',
        technicianId: 'T2',
        status: 'PENDING_STOCK',
        priority: 'HIGH',
        createdDate: new Date().toISOString(),
        items: [
            { partId: 'p2', quantityRequested: 10, quantityDelivered: 0 }
        ]
    }
];

import { IInventoryService } from '../inventoryService';

export class InventoryMockService implements IInventoryService {

    // --- Persistence Helpers ---
    private getParts(): SparePart[] {
        const parts = loadFromStorage(PARTS_KEY, INITIAL_PARTS);
        return parts.length > 0 ? parts : INITIAL_PARTS;
    }

    private saveParts(parts: SparePart[]) {
        saveToStorage(PARTS_KEY, parts);
    }

    private getRequests(): PartsRequest[] {
        const reqs = loadFromStorage(REQUESTS_KEY, INITIAL_REQUESTS);
        return reqs.length > 0 ? reqs : INITIAL_REQUESTS;
    }

    private saveRequests(requests: PartsRequest[]) {
        saveToStorage(REQUESTS_KEY, requests);
    }

    private getTransactions(): InventoryTransaction[] {
        return loadFromStorage(TRANSACTIONS_KEY, []);
    }

    private saveTransactions(transactions: InventoryTransaction[]) {
        saveToStorage(TRANSACTIONS_KEY, transactions);
    }

    // --- Public API ---

    async getAllParts(
        page: number = 1, 
        limit: number = 50,
        filters?: {
            search?: string;
            category?: string;
            location?: string;
            status?: 'all' | 'low' | 'normal';
        }
    ): Promise<{ data: SparePart[], total: number }> {
        let parts = this.getParts();

        // 1. Filtering
        if (filters) {
            if (filters.search) {
                const s = filters.search.toLowerCase();
                parts = parts.filter(p => 
                    p.name.toLowerCase().includes(s) || 
                    p.partNumber.toLowerCase().includes(s) || 
                    (p.description && p.description.toLowerCase().includes(s))
                );
            }
            if (filters.category && filters.category !== 'all') {
                parts = parts.filter(p => p.category === filters.category);
            }
            if (filters.location && filters.location !== 'all') {
                parts = parts.filter(p => p.location === filters.location);
            }
            if (filters.status === 'low') {
                parts = parts.filter(p => p.currentStock < p.minStock);
            } else if (filters.status === 'normal' && filters.status !== 'all') {
                parts = parts.filter(p => p.currentStock >= p.minStock);
            }
        }

        // 2. Sorting
        parts.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (dateA !== dateB) return dateB - dateA;
            return b.id.localeCompare(a.id);
        });

        const total = parts.length;

        // 3. Pagination
        const from = (page - 1) * limit;
        const to = from + limit;
        const pagedData = parts.slice(from, to);

        return { data: pagedData, total };
    }

    async getAllRequests(): Promise<PartsRequest[]> {
        return this.getRequests();
    }

    /**
     * Create a new Parts Request.
     * Checks stock availability. If requested > current, sets status to PENDING_STOCK.
     */
    async createRequest(requestData: Omit<PartsRequest, 'id' | 'createdDate' | 'status' | 'requestNumber' | 'items'> & { items: { partId: string; quantity: number }[] }): Promise<PartsRequest> {
        const parts = this.getParts();
        const requests = this.getRequests();

        let status: RequestStatus = 'OPEN';

        // Check stock availability
        for (const item of requestData.items) {
            const part = parts.find(p => p.id === item.partId);
            if (part && item.quantity > part.currentStock) {
                status = 'PENDING_STOCK';
                console.warn(`Stock insufficient for part ${part.name}. Requested: ${item.quantity}, Available: ${part.currentStock}`);
            }
        }

        const newRequest: PartsRequest = {
            id: `PR-${Date.now()}`,
            requestNumber: `REQ-${1000 + requests.length + 1}`,
            technicianId: requestData.technicianId,
            status: status,
            priority: requestData.priority,
            createdDate: new Date().toISOString(),
            items: requestData.items.map(i => ({
                partId: i.partId,
                quantityRequested: i.quantity,
                quantityDelivered: 0
            }))
        };

        requests.unshift(newRequest);
        this.saveRequests(requests);
        return newRequest;
    }

    /**
     * Deliver parts for a request.
     * THROWS Error if calling with quantity > currentStock.
     */
    /**
     * Deliver parts for a request.
     * THROWS Error if calling with quantity > currentStock.
     */
    async deliverParts(requestId: string, itemsToDeliver: { partId: string; quantity: number }[], receiverId?: string): Promise<PartsRequest> {
        const parts = this.getParts();
        const requests = this.getRequests();
        const transactions = this.getTransactions();

        const requestIndex = requests.findIndex(r => r.id === requestId);
        if (requestIndex === -1) throw new Error('Request not found');

        const request = requests[requestIndex];

        // 1. Validate Stock
        for (const deliveryItem of itemsToDeliver) {
            const part = parts.find(p => p.id === deliveryItem.partId);
            if (!part) throw new Error(`Part ${deliveryItem.partId} not found`);
            if (part.currentStock < deliveryItem.quantity) {
                throw new Error(`Insufficient stock for part ${part.name}. Current: ${part.currentStock}, Trying to deliver: ${deliveryItem.quantity}`);
            }
        }

        // 2. Perform Updates
        for (const deliveryItem of itemsToDeliver) {
            if (deliveryItem.quantity <= 0) continue;

            // Update Stock
            const partIndex = parts.findIndex(p => p.id === deliveryItem.partId);
            parts[partIndex].currentStock -= deliveryItem.quantity;

            // Create Transaction
            const transaction: InventoryTransaction = {
                id: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                partId: deliveryItem.partId,
                type: 'OUT',
                quantity: deliveryItem.quantity,
                date: new Date().toISOString(),
                userId: 'current-user', // Mock user
                relatedDocumentId: requestId,
                deliveredTo: receiverId
            };
            transactions.push(transaction);

            // Update Request Item
            const itemIndex = request.items.findIndex(i => i.partId === deliveryItem.partId);
            if (itemIndex !== -1) {
                request.items[itemIndex].quantityDelivered += deliveryItem.quantity;
            }
        }

        // 3. Update Status
        const allDelivered = request.items.every(i => i.quantityDelivered >= i.quantityRequested);
        const someDelivered = request.items.some(i => i.quantityDelivered > 0);

        if (allDelivered) {
            request.status = 'CLOSED';
        } else if (someDelivered) {
            request.status = 'PARTIAL';
        }

        // Save receiver
        if (receiverId) {
            request.deliveredTo = receiverId;
        }
        // If nothing delivered yet, it stays OPEN or PENDING_STOCK

        // Save everything
        this.saveParts(parts);
        this.saveRequests(requests);
        this.saveTransactions(transactions);

        return request;
    }

    async savePurchaseRequest(requestId: string, purchaseRequest: PurchaseRequest): Promise<PartsRequest> {
        const requests = this.getRequests();
        const index = requests.findIndex(r => r.id === requestId);

        if (index !== -1) {
            if (!requests[index].purchaseHistory) {
                requests[index].purchaseHistory = [];
            }
            requests[index].purchaseHistory!.push(purchaseRequest);
            this.saveRequests(requests);
            return requests[index];
        }
        throw new Error('Request not found');
    }

    async closeRequest(requestId: string): Promise<PartsRequest> {
        const requests = this.getRequests();
        const index = requests.findIndex(r => r.id === requestId);
        if (index === -1) throw new Error('Request not found');

        requests[index].status = 'CLOSED';
        this.saveRequests(requests);
        return requests[index];
    }

    /**
     * Add stock (Reception).
     */
    async addStock(partId: string, quantity: number, relatedDocId?: string): Promise<void> {
        const parts = this.getParts();
        const transactions = this.getTransactions();

        const partIndex = parts.findIndex(p => p.id === partId);
        if (partIndex === -1) throw new Error('Part not found');

        parts[partIndex].currentStock += quantity;

        transactions.push({
            id: `TX-${Date.now()}`,
            partId: partId,
            type: 'IN',
            quantity: quantity,
            date: new Date().toISOString(),
            userId: 'current-user',
            relatedDocumentId: relatedDocId
        });

        this.saveParts(parts);
        this.saveTransactions(transactions);
    }

    /**
     * Create a new Spare Part.
     */
    async createPart(partData: Omit<SparePart, 'id' | 'currentStock'> & { initialStock?: number }): Promise<SparePart> {
        const parts = this.getParts();
        const transactions = this.getTransactions();

        // Check for duplicate part number
        if (parts.some(p => p.partNumber === partData.partNumber)) {
            throw new Error(`Part number ${partData.partNumber} already exists.`);
        }

        const initialStock = partData.initialStock || 0;

        const newPart: SparePart = {
            id: `P-${Date.now()}`,
            ...partData,
            currentStock: initialStock,
            createdAt: new Date().toISOString()
        };

        parts.push(newPart);

        // Log transaction if there is initial stock
        if (initialStock > 0) {
            transactions.push({
                id: `TX-${Date.now()}`,
                partId: newPart.id,
                type: 'IN',
                quantity: initialStock,
                date: new Date().toISOString(),
                userId: 'current-user',
                relatedDocumentId: 'INITIAL_STOCK'
            });
        }

        this.saveParts(parts);
        this.saveTransactions(transactions);
        return newPart;
    }

    /**
     * Update an existing Spare Part.
     */
    async updatePart(updatedPart: SparePart): Promise<SparePart> {
        const parts = this.getParts();
        const index = parts.findIndex(p => p.id === updatedPart.id);
        if (index === -1) throw new Error('Part not found');

        // Check for duplicate part number if it changed (though UI blocks this)
        if (parts[index].partNumber !== updatedPart.partNumber) {
            if (parts.some(p => p.partNumber === updatedPart.partNumber)) {
                throw new Error(`Part number ${updatedPart.partNumber} already exists.`);
            }
        }

        // Preserve fields that shouldn't change via this update if needed, but here we update all passed fields
        // except keeping the ID safe is good practice, but updatedPart includes it.

        parts[index] = updatedPart;
        this.saveParts(parts);
        return updatedPart;
    }
    /**
     * Delete a request.
     */
    async deleteRequest(requestId: string): Promise<void> {
        const requests = this.getRequests();
        const index = requests.findIndex(r => r.id === requestId);
        if (index === -1) throw new Error('Request not found');

        requests.splice(index, 1);
        this.saveRequests(requests);
    }

    /**
     * Update a request.
     * Re-evaluates status based on stock if items changed.
     */
    async updateRequest(updatedRequest: PartsRequest): Promise<PartsRequest> {
        const requests = this.getRequests();
        const parts = this.getParts();
        const index = requests.findIndex(r => r.id === updatedRequest.id);
        if (index === -1) throw new Error('Request not found');

        // Re-evaluate status based on stock availability for any INCREASES or NEW items
        // This is a simplified check. Ideally we compare with previous state.
        // For now, we'll just check if any requested quantity > current stock
        let status: RequestStatus = 'OPEN';

        // If it was already PARTIAL or CLOSED, we might need to be careful. 
        // But user said "Open, Pending Stock, Partial" are editable.
        // If it's PARTIAL, we shouldn't revert to OPEN easily if things are delivered.

        const currentRequest = requests[index];

        // Preserve delivery status
        const hasDeliveries = updatedRequest.items.some(i => i.quantityDelivered > 0);
        const allDelivered = updatedRequest.items.length > 0 && updatedRequest.items.every(i => i.quantityDelivered >= i.quantityRequested);

        if (allDelivered) {
            status = 'CLOSED';
        } else if (hasDeliveries) {
            status = 'PARTIAL';
        } else {
            // Check stock for pending items
            for (const item of updatedRequest.items) {
                const part = parts.find(p => p.id === item.partId);
                const remainingNeeded = item.quantityRequested - item.quantityDelivered;
                if (remainingNeeded > 0 && part && remainingNeeded > part.currentStock) {
                    status = 'PENDING_STOCK';
                    break;
                }
            }
        }

        updatedRequest.status = status;
        requests[index] = updatedRequest;
        this.saveRequests(requests);
        return updatedRequest;
    }

    async bulkCreate(partsData: Omit<SparePart, 'id'>[]): Promise<void> {
        const parts = this.getParts();
        const transactions = this.getTransactions();

        for (const partData of partsData) {
            // Check for duplicate part number
            if (parts.some(p => p.partNumber === partData.partNumber)) {
                console.warn(`Skipping duplicate part number: ${partData.partNumber}`);
                continue;
            }

            const newPart: SparePart = {
                id: `P-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                ...partData,
                currentStock: partData.currentStock || 0
            };

            parts.push(newPart);

            // Log transaction if there is initial stock
            if (newPart.currentStock > 0) {
                transactions.push({
                    id: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    partId: newPart.id,
                    type: 'IN',
                    quantity: newPart.currentStock,
                    date: new Date().toISOString(),
                    userId: 'current-user',
                    relatedDocumentId: 'BULK_IMPORT'
                });
            }
        }

        this.saveParts(parts);
        this.saveTransactions(transactions);
    }

    async saveReception(reception: Omit<StockReception, 'id' | 'receptionDate'>): Promise<StockReception> {
        const receptions = loadFromStorage<StockReception>(RECEPTIONS_KEY, []);
        const newReception: StockReception = {
            id: `REC-${Date.now()}`,
            receptionDate: new Date().toISOString(),
            ...reception,
            receivedBy: 'current-user' // Default for mock
        };
        receptions.unshift(newReception);
        saveToStorage(RECEPTIONS_KEY, receptions);
        return newReception;
    }

    async getReceptions(filters?: { searchTerm?: string; partId?: string }): Promise<{ data: StockReception[], total: number }> {
        let receptions = loadFromStorage<StockReception>(RECEPTIONS_KEY, []);

        if (filters?.searchTerm || filters?.partId) {
            const s = filters.searchTerm?.toLowerCase() || '';
            const exactPartId = filters.partId;
            
            receptions = receptions.filter(r => {
                if (exactPartId) {
                    if (r.items && Array.isArray(r.items)) {
                        return r.items.some(i => i.partId === exactPartId);
                    }
                    return false;
                }
                
                if (s) {
                    if (r.documentNumber && r.documentNumber.toLowerCase().includes(s)) return true;
                    if (r.notes && r.notes.toLowerCase().includes(s)) return true;
                    
                    if (r.items && Array.isArray(r.items)) {
                        return r.items.some(i => 
                            (i.partName && i.partName.toLowerCase().includes(s)) || 
                            (i.partNumber && i.partNumber.toLowerCase().includes(s))
                        );
                    }
                }
                return false;
            });
        }

        return { data: receptions, total: receptions.length };
    }
}
