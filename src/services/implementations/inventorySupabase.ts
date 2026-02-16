
import { supabase } from '../supabaseClient';
import { IInventoryService } from '../inventoryService';
import { SparePart, PartsRequest } from '../../../types/inventory';

export class InventorySupabaseService implements IInventoryService {

    // --- Mappers ---
    private mapDBToPart(record: any): SparePart {
        return {
            id: record.id,
            partNumber: record.sku,
            sku: record.sku,
            name: record.name,
            category: record.category,
            currentStock: record.current_stock,
            minStock: record.minimum_stock,
            minimumStock: record.minimum_stock,
            maxStock: record.maximum_stock || 0, 
            maximumStock: record.maximum_stock || 0,
            reorderPoint: record.reorder_point, 
            location: record.location_code,
            locationCode: record.location_code,
            cost: record.unit_cost,
            unitCost: record.unit_cost,
            supplier: record.supplier,
            leadTimeDays: record.lead_time_days
            // photoUrl: record.image_url
            // createdAt: record.created_at
        } as SparePart;
    }

    private mapPartToDB(part: Partial<SparePart>): any {
        return {
            // id: part.id, // generated
            sku: part.sku || part.partNumber,
            name: part.name,
            category: part.category,
            current_stock: part.currentStock,
            minimum_stock: part.minStock || part.minimumStock,
            maximum_stock: part.maxStock || part.maximumStock,
            reorder_point: part.reorderPoint,
            location_code: part.location || part.locationCode,
            unit_cost: part.cost || part.unitCost,
            supplier: part.supplier,
            lead_time_days: part.leadTimeDays
            // image_url: (part as any).photoUrl // Column doesn't exist in spare_parts table
        };
    }

    // --- Parts API ---

    async getAllParts(): Promise<SparePart[]> {
        const { data, error } = await supabase
            .from('spare_parts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data.map(this.mapDBToPart);
    }

    async createPart(partData: Omit<SparePart, 'id' | 'currentStock'> & { initialStock?: number }): Promise<SparePart> {
        const dbPayload = this.mapPartToDB({
            ...partData,
            currentStock: partData.initialStock || 0
        });

        const id = crypto.randomUUID();
        dbPayload.id = id;

        const { data, error } = await supabase
            .from('spare_parts')
            .insert(dbPayload)
            .select()
            .single();

        if (error) throw error;
        return this.mapDBToPart(data);
    }

    async updatePart(updatedPart: SparePart): Promise<SparePart> {
        const dbPayload = this.mapPartToDB(updatedPart);

        const { data, error } = await supabase
            .from('spare_parts')
            .update(dbPayload)
            .eq('id', updatedPart.id)
            .select()
            .single();

        if (error) throw error;
        return this.mapDBToPart(data);
    }

    async addStock(partId: string, quantity: number, relatedDocId?: string): Promise<void> {
        // Optimistic update for now, ideally use RPC for atomic increment
        const { data: part, error: getError } = await supabase
            .from('spare_parts')
            .select('current_stock')
            .eq('id', partId)
            .single();

        if (getError) throw getError;

        const newStock = (part.current_stock || 0) + quantity;

        const { error: updateError } = await supabase
            .from('spare_parts')
            .update({ current_stock: newStock })
            .eq('id', partId);

        if (updateError) throw updateError;
    }

    async bulkCreate(parts: Omit<SparePart, 'id'>[]): Promise<void> {
        const dbPayloads = parts.map(part => {
            const payload = this.mapPartToDB(part);
            payload.id = crypto.randomUUID();
            return payload;
        });

        const { error } = await supabase
            .from('spare_parts')
            .insert(dbPayloads);

        if (error) throw error;
    }

    // --- Requests API (Stubs for now) ---

    async getAllRequests(): Promise<PartsRequest[]> {
        console.warn('getAllRequests: Not implemented in Supabase yet');
        return [];
    }

    async createRequest(requestData: any): Promise<PartsRequest> {
        console.warn('createRequest: Not implemented in Supabase yet');
        return {} as PartsRequest;
    }

    async deliverParts(requestId: string, itemsToDeliver: any[], receiverId?: string): Promise<PartsRequest> {
        console.warn('deliverParts: Not implemented in Supabase yet');
        return {} as PartsRequest;
    }

    async closeRequest(requestId: string): Promise<PartsRequest> {
         console.warn('closeRequest: Not implemented in Supabase yet');
         return {} as PartsRequest;
    }

    async deleteRequest(requestId: string): Promise<void> {
         console.warn('deleteRequest: Not implemented in Supabase yet');
    }

    async updateRequest(updatedRequest: PartsRequest): Promise<PartsRequest> {
         console.warn('updateRequest: Not implemented in Supabase yet');
         return updatedRequest;
    }

    async savePurchaseRequest(requestId: string, purchaseRequest: any): Promise<PartsRequest> {
         console.warn('savePurchaseRequest: Not implemented in Supabase yet');
         return {} as PartsRequest;
    }
}
