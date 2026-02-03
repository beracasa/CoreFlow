import { SparePart, PartsRequest, InventoryTransaction, RequestStatus, RequestPriority } from '../../types/inventory';
import { saveToStorage, loadFromStorage } from '../../utils/persistence';

const PARTS_KEY = 'v1_inventory_parts';
const REQUESTS_KEY = 'v1_inventory_requests';
const TRANSACTIONS_KEY = 'v1_inventory_transactions';

const INITIAL_PARTS: SparePart[] = [
    { id: 'p1', name: 'Ball Bearing 6204', partNumber: 'BB-6204', description: 'Deep groove ball bearing', category: 'Bearings', unitOfMeasure: 'PCS', currentStock: 15, minStock: 5, location: 'A-01', cost: 5.50 },
    { id: 'p2', name: 'Hydraulic Hose 1/2"', partNumber: 'HH-050', description: 'High pressure hose', category: 'Hydraulics', unitOfMeasure: 'M', currentStock: 2, minStock: 10, location: 'B-03', cost: 12.00 },
    { id: 'p3', name: 'Limit Switch', partNumber: 'LS-001', description: 'Industrial limit switch', category: 'Electronics', unitOfMeasure: 'PCS', currentStock: 8, minStock: 3, location: 'C-02', cost: 45.00 },
];

export class InventoryMockService {

    // --- Persistence Helpers ---
    private getParts(): SparePart[] {
        return loadFromStorage(PARTS_KEY, INITIAL_PARTS);
    }

    private saveParts(parts: SparePart[]) {
        saveToStorage(PARTS_KEY, parts);
    }

    private getRequests(): PartsRequest[] {
        return loadFromStorage(REQUESTS_KEY, []);
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

    async getAllParts(): Promise<SparePart[]> {
        return this.getParts();
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
    async deliverParts(requestId: string, itemsToDeliver: { partId: string; quantity: number }[]): Promise<PartsRequest> {
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
                relatedDocumentId: requestId
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
        request.status = allDelivered ? 'CLOSED' : 'PARTIAL';

        // Save everything
        this.saveParts(parts);
        this.saveRequests(requests);
        this.saveTransactions(transactions);

        return request;
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
            currentStock: initialStock
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
}
