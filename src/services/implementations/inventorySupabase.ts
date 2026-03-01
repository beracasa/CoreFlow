import { supabase, getPaginationRange } from '../supabaseClient';
import { IInventoryService } from '../inventoryService';
import { SparePart, PartsRequest } from '../../types/inventory';

export class InventorySupabaseService implements IInventoryService {
    private mapDBToPart(record: any): SparePart {
        if (!record) return {} as SparePart;
        return {
            id: record.id,
            name: record.name,
            partNumber: record.sku,
            description: record.description || '',
            category: record.category || '',
            unitOfMeasure: record.unit_of_measure || 'PCS',
            currentStock: Number(record.current_stock || 0),
            minStock: Number(record.minimum_stock || 0),
            maxStock: Number(record.maximum_stock || 0),
            location: record.location_code || '',
            subLocation: record.sub_location || '',
            cost: Number(record.unit_cost || 0),
            photoUrl: record.image_url || null,
            createdAt: record.created_at
        };
    }

    private mapPartToDB(part: Partial<SparePart>): any {
        return {
            sku: part.partNumber,
            name: part.name,
            description: part.description,
            category: part.category,
            unit_of_measure: part.unitOfMeasure,
            current_stock: part.currentStock,
            minimum_stock: part.minStock,
            maximum_stock: part.maxStock,
            location_code: part.location,
            sub_location: part.subLocation,
            unit_cost: part.cost,
            image_url: part.photoUrl
        };
    }

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
        const { from, to } = getPaginationRange(page, limit);

        let query = supabase
            .from('spare_parts')
            .select('id, sku, name, description, category, unit_of_measure, current_stock, minimum_stock, maximum_stock, location_code, sub_location, unit_cost, image_url, created_at', { count: 'exact' });

        if (filters) {
            if (filters.search) {
                query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
            }
            if (filters.category && filters.category !== 'all') {
                query = query.eq('category', filters.category);
            }
            if (filters.location && filters.location !== 'all') {
                query = query.eq('location_code', filters.location);
            }
            if (filters.status === 'low') {
                query = query.lt('current_stock', supabase.raw('minimum_stock')); // Note: Supabase might need a comparison column vs column if supported or a raw filter
                // Alternatively, if Supabase doesn't support col vs col in .lt(), we might need a stored procedure or special filter.
                // For now, let's use a standard filter if possible.
                query = query.filter('current_stock', 'lt', 'minimum_stock');
            } else if (filters.status === 'normal') {
                query = query.filter('current_stock', 'gte', 'minimum_stock');
            }
        }

        const { data, count, error } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;
        return { 
            data: (data || []).map(this.mapDBToPart),
            total: count || 0
        };
    }

    async createPart(partData: Omit<SparePart, 'id' | 'currentStock'> & { initialStock?: number }): Promise<SparePart> {
        const id = crypto.randomUUID();
        const { data, error } = await supabase.rpc('upsert_spare_part', {
            p_id:               id,
            p_sku:              partData.partNumber,
            p_name:             partData.name,
            p_description:      partData.description || null,
            p_category:         partData.category,
            p_unit_of_measure:  partData.unitOfMeasure,
            p_current_stock:    partData.initialStock || 0,
            p_minimum_stock:    partData.minStock || 0,
            p_maximum_stock:    partData.maxStock || 0,
            p_location_code:    partData.location || null,
            p_sub_location:     partData.subLocation || null,
            p_unit_cost:        partData.cost || 0,
            p_image_url:        partData.photoUrl || null,
            p_created_at:       partData.createdAt || null
        });
        if (error) throw error;
        return this.mapDBToPart(Array.isArray(data) ? data[0] : data);
    }

    async updatePart(updatedPart: SparePart): Promise<SparePart> {
        const { data, error } = await supabase.rpc('upsert_spare_part', {
            p_id:               updatedPart.id,
            p_sku:              updatedPart.partNumber,
            p_name:             updatedPart.name,
            p_description:      updatedPart.description || null,
            p_category:         updatedPart.category,
            p_unit_of_measure:  updatedPart.unitOfMeasure,
            p_current_stock:    updatedPart.currentStock || 0,
            p_minimum_stock:    updatedPart.minStock || 0,
            p_maximum_stock:    updatedPart.maxStock || 0,
            p_location_code:    updatedPart.location || null,
            p_sub_location:     updatedPart.subLocation || null,
            p_unit_cost:        updatedPart.cost || 0,
            p_image_url:        updatedPart.photoUrl || null,
            p_created_at:       updatedPart.createdAt || null
        });
        if (error) throw error;
        return this.mapDBToPart(Array.isArray(data) ? data[0] : data);
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

    // --- Requests API ---

    async getAllRequests(): Promise<PartsRequest[]> {
        const { data, error } = await supabase
            .from('spare_part_requests')
            .select(`
                *,
                spare_part_request_items (*),
                purchase_requests (*)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching requests:', error);
            throw error;
        }

        return data.map(record => ({
            id: record.id,
            requestNumber: record.request_number,
            technicianId: record.technician_name,
            status: record.status as any,
            priority: record.priority as any,
            items: (record.spare_part_request_items || []).map((item: any) => ({
                partId: item.part_id,
                quantityRequested: Number(item.quantity_requested),
                quantityDelivered: Number(item.quantity_delivered),
                usageLocation: item.usage_location
            })),
            createdDate: record.created_at,
            deliveredTo: record.delivered_to,
            purchaseHistory: (record.purchase_requests || []).map((pr: any) => ({
                id: pr.id,
                requestDate: pr.request_date,
                items: pr.items,
                requestedBy: pr.requested_by,
                purchaseRequestNumber: pr.purchase_request_number
            }))
        } as PartsRequest));
    }

    async createRequest(requestData: any): Promise<PartsRequest> {
        const requestId = crypto.randomUUID();
        
        // 1. Create the main request
        const { data: request, error: requestError } = await supabase
            .from('spare_part_requests')
            .insert({
                id: requestId,
                technician_name: requestData.technicianId,
                priority: requestData.priority,
                status: 'OPEN'
            })
            .select()
            .single();

        if (requestError) throw requestError;

        // 2. Insert items
        const itemsPayload = requestData.items.map((item: any) => ({
            request_id: requestId,
            part_id: item.partId,
            quantity_requested: item.quantity,
            usage_location: item.usageLocation
        }));

        const { error: itemsError } = await supabase
            .from('spare_part_request_items')
            .insert(itemsPayload);

        if (itemsError) throw itemsError;

        // Fetch back full request
        const allRequests = await this.getAllRequests();
        return allRequests.find(r => r.id === requestId) || {} as PartsRequest;
    }

    async deliverParts(requestId: string, itemsToDeliver: { partId: string; quantity: number }[], receiverId?: string): Promise<PartsRequest> {
        // 1. Process each item delivery
        for (const item of itemsToDeliver) {
            // Update quantity_delivered in request_items
            const { data: items, error: fetchError } = await supabase
                .from('spare_part_request_items')
                .select('*')
                .eq('request_id', requestId)
                .eq('part_id', item.partId);

            if (fetchError) throw fetchError;
            if (items && items.length > 0) {
                const requestItem = items[0];
                const newDelivered = (Number(requestItem.quantity_delivered) || 0) + item.quantity;
                
                await supabase
                    .from('spare_part_request_items')
                    .update({ quantity_delivered: newDelivered })
                    .eq('id', requestItem.id);

                // Create inventory transaction (this trigger will update spare_parts stock)
                await supabase
                    .from('inventory_transactions')
                    .insert({
                        part_id: item.partId,
                        transaction_type: 'OUTBOUND',
                        quantity: item.quantity,
                        reference_id: requestId,
                        notes: `Entrega para solicitud ${requestId}`,
                        delivered_to: receiverId
                    });
            }
        }

        // 2. Update request status if needed
        const req = await this.getByIdInternal(requestId);
        if (req) {
            let allDelivered = true;
            let anyDelivered = false;
            
            for (const item of (req as any).spare_part_request_items) {
                if (Number(item.quantity_delivered) < Number(item.quantity_requested)) {
                    allDelivered = false;
                }
                if (Number(item.quantity_delivered) > 0) {
                    anyDelivered = true;
                }
            }

            const newStatus = allDelivered ? 'CLOSED' : (anyDelivered ? 'PARTIAL' : 'OPEN');
            
            await supabase
                .from('spare_part_requests')
                .update({ 
                    status: newStatus,
                    delivered_to: receiverId || (req as any).delivered_to
                })
                .eq('id', requestId);
        }

        // Return updated request
        const all = await this.getAllRequests();
        return all.find(r => r.id === requestId) || {} as PartsRequest;
    }

    private async getByIdInternal(id: string) {
        const { data } = await supabase
            .from('spare_part_requests')
            .select('*, spare_part_request_items(*)')
            .eq('id', id)
            .single();
        return data;
    }

    async closeRequest(requestId: string): Promise<PartsRequest> {
         const { error } = await supabase
            .from('spare_part_requests')
            .update({ status: 'CLOSED' })
            .eq('id', requestId);
        
        if (error) throw error;
        const all = await this.getAllRequests();
        return all.find(r => r.id === requestId) || {} as PartsRequest;
    }

    async deleteRequest(requestId: string): Promise<void> {
         const { error } = await supabase
            .from('spare_part_requests')
            .delete()
            .eq('id', requestId);
        if (error) throw error;
    }

    async updateRequest(updatedRequest: PartsRequest): Promise<PartsRequest> {
         // Update main request
         const { error: reqError } = await supabase
            .from('spare_part_requests')
            .update({
                technician_name: updatedRequest.technicianId,
                priority: updatedRequest.priority,
                status: updatedRequest.status,
                delivered_to: updatedRequest.deliveredTo
            })
            .eq('id', updatedRequest.id);

        if (reqError) throw reqError;

        // Update items (this is complex, for now let's assume we replace or update by part_id)
        // Simplification: Delete existing items and re-insert
        await supabase.from('spare_part_request_items').delete().eq('request_id', updatedRequest.id);
        
        const itemsPayload = updatedRequest.items.map(item => ({
            request_id: updatedRequest.id,
            part_id: item.partId,
            quantity_requested: item.quantityRequested,
            quantity_delivered: item.quantityDelivered,
            usage_location: item.usageLocation
        }));

        await supabase.from('spare_part_request_items').insert(itemsPayload);

        const all = await this.getAllRequests();
        return all.find(r => r.id === updatedRequest.id) || {} as PartsRequest;
    }

    async savePurchaseRequest(requestId: string, purchaseRequest: any): Promise<PartsRequest> {
         const { error } = await supabase
            .from('purchase_requests')
            .insert({
                request_id: requestId,
                purchase_request_number: purchaseRequest.purchaseRequestNumber,
                requested_by: purchaseRequest.requestedBy,
                items: purchaseRequest.items,
                request_date: purchaseRequest.requestDate
            });

        if (error) throw error;

        // If a purchase request is made, we could optionally update the main request status to PENDING_STOCK
        await supabase.from('spare_part_requests').update({ status: 'PENDING_STOCK' }).eq('id', requestId);

        const all = await this.getAllRequests();
        return all.find(r => r.id === requestId) || {} as PartsRequest;
    }

    async saveReception(reception: { documentNumber?: string; items: any[]; notes?: string }): Promise<any> {
        const { data, error } = await supabase
            .from('stock_receptions')
            .insert({
                document_number: reception.documentNumber || null,
                items: reception.items,
                notes: reception.notes || null
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            receptionDate: data.reception_date,
            documentNumber: data.document_number,
            receivedBy: data.received_by,
            items: data.items,
            notes: data.notes
        };
    }

    async getReceptions(page: number = 1, limit: number = 50, filters?: { searchTerm?: string; partId?: string }): Promise<{ data: any[], total: number }> {
        const { from, to } = getPaginationRange(page, limit);

        if (!filters?.searchTerm && !filters?.partId) {
            // Normal pagination flow
            const { data, count, error } = await supabase
                .from('stock_receptions')
                .select('*', { count: 'exact' })
                .order('reception_date', { ascending: false })
                .range(from, to);

            if (error) throw error;

            const mappedData = (data || []).map((record: any) => ({
                id: record.id,
                receptionDate: record.reception_date,
                documentNumber: record.document_number,
                receivedBy: record.received_by,
                items: record.items || [],
                notes: record.notes
            }));

            return { data: mappedData, total: count || 0 };
        }

        // --- Robust Search Flow ---
        // Fetch a large window of recent records and filter in memory
        // This bypasses complex JSONB operator limitations in PostgREST
        const term = filters.searchTerm?.toLowerCase() || '';
        const exactPartId = filters.partId;
        
        const { data: allData, error } = await supabase
            .from('stock_receptions')
            .select('*')
            .order('reception_date', { ascending: false })
            .limit(2000); // Practical limit for client-side filtering of recent history

        if (error) throw error;

        const mappedAllData = (allData || []).map((record: any) => ({
            id: record.id,
            receptionDate: record.reception_date,
            documentNumber: record.document_number,
            receivedBy: record.received_by,
            items: record.items || [],
            notes: record.notes
        }));

        // Filter the mapped data
        const filteredData = mappedAllData.filter(rec => {
            // If we have an exact part ID, we ONLY want to check if the items array contains it
            if (exactPartId) {
                if (rec.items && Array.isArray(rec.items)) {
                    return rec.items.some((item: any) => item.partId === exactPartId);
                }
                return false;
            }

            // Otherwise, we do the robust text search
            if (term) {
                if (rec.documentNumber && rec.documentNumber.toLowerCase().includes(term)) return true;
                if (rec.notes && rec.notes.toLowerCase().includes(term)) return true;
                
                // Check nested items for partName or partNumber match
                if (rec.items && Array.isArray(rec.items)) {
                    return rec.items.some((item: any) => 
                        (item.partName && item.partName.toLowerCase().includes(term)) ||
                        (item.partNumber && item.partNumber.toLowerCase().includes(term))
                    );
                }
            }
            return false;
        });

        // Manual Pagination
        const total = filteredData.length;
        const pagedData = filteredData.slice(from, to + 1);

        return { data: pagedData, total };
    }
}
