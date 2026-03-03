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
            .select('*', { count: 'exact' });

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
                query = query.eq('is_low_stock', true);
            } else if (filters.status === 'normal') {
                query = query.eq('is_low_stock', false);
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
        // Use RPC for atomic increment to prevent race conditions
        const { error } = await supabase.rpc('increment_part_stock', {
            p_part_id: partId,
            p_quantity: quantity
        });

        if (error) {
            console.error('Error in addStock atomic increment:', error);
            // Fallback for missing RPC or error
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

                // Create inventory transaction
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

                // Atomic decrement of spare_parts stock
                const { error: rpcError } = await supabase.rpc('increment_part_stock', {
                    p_part_id: item.partId,
                    p_quantity: -item.quantity
                });
                
                if (rpcError) {
                    console.error('Error in deliverParts atomic decrement, using fallback:', rpcError);
                    // Fallback for missing RPC
                    const { data: part, error: getError } = await supabase
                        .from('spare_parts')
                        .select('current_stock')
                        .eq('id', item.partId)
                        .single();

                    if (!getError && part) {
                        const newStock = (part.current_stock || 0) - item.quantity;
                        await supabase
                            .from('spare_parts')
                            .update({ current_stock: newStock })
                            .eq('id', item.partId);
                    }
                }

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
         const payload: any = {
                request_id: requestId,
                purchase_request_number: purchaseRequest.purchaseRequestNumber,
                items: purchaseRequest.items,
                request_date: purchaseRequest.requestDate
         };

         if (purchaseRequest.requestedBy && purchaseRequest.requestedBy !== 'System') {
             payload.requested_by = purchaseRequest.requestedBy;
         }

         const { error } = await supabase
            .from('purchase_requests')
            .insert(payload);

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

    async getReceptions(filters?: { searchTerm?: string; partId?: string }): Promise<{ data: StockReception[], total: number }> {
        let query = supabase
            .from('stock_receptions')
            .select('*', { count: 'exact' })
            .order('reception_date', { ascending: false });

        if (filters?.searchTerm) {
            query = query.or(`document_number.ilike.%${filters.searchTerm}%,notes.ilike.%${filters.searchTerm}%`);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('Error fetching receptions:', error);
            throw error;
        }

        let filteredData = (data || []).map(record => ({
            id: record.id,
            receptionDate: record.reception_date,
            documentNumber: record.document_number,
            receivedBy: record.received_by,
            items: record.items || [],
            notes: record.notes
        }));

        // Filter by partId if provided (since items is JSONB, it's easier to filter here if the dataset isn't huge, or use a complex PostgREST query)
        if (filters?.partId) {
            filteredData = filteredData.filter(rec => 
                rec.items.some((item: any) => item.partId === filters.partId)
            );
        }

        return { data: filteredData, total: count || 0 };
    }

    async getAllPurchaseRequests(page: number = 1, limit: number = 50, filters?: { searchTerm?: string }): Promise<{ data: ExtendedPurchaseRequest[], total: number }> {
        let query = supabase
            .from('purchase_requests')
            .select(`
                *,
                spare_part_requests (
                    request_number
                )
            `, { count: 'exact' })
            .order('request_date', { ascending: false });

        if (filters?.searchTerm) {
            query = query.or(`purchase_request_number.ilike.%${filters.searchTerm}%`);
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) {
            console.error('Error fetching all purchase requests:', error);
            throw error;
        }

        const { data: parts } = await supabase.from('spare_parts').select('id, name, sku');
        const partsMap = new Map((parts || []).map(p => [p.id, p]));

        const mappedData = (data || []).map(record => {
            const rawItems = record.items || [];
            
            const mappedItems = rawItems.map((item: any) => {
                const partInfo = partsMap.get(item.partId);
                return {
                    ...item,
                    partName: partInfo?.name || 'Repuesto Desconocido',
                    partNumber: partInfo?.sku || 'N/A'
                };
            });

            const firstItem = mappedItems[0] || {};

            return {
                id: record.id,
                purchaseRequestNumber: record.purchase_request_number,
                requestDate: record.request_date,
                requestedBy: record.requested_by,
                items: mappedItems,
                requestId: record.request_id,
                sourceRequestNumber: record.spare_part_requests?.request_number,
                sparePartName: firstItem.partName || 'N/A',
                sparePartNumber: firstItem.partNumber || 'N/A',
                status: record.status || 'Pendiente'
            };
        });

        return {
            data: mappedData,
            total: count || 0
        };
    }

    async createDirectPurchaseRequest(items: { partId: string; quantity: number }[]): Promise<void> {
        const scNumber = `SC-DIR-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        
        const payload: any = {
            request_id: null,
            purchase_request_number: scNumber,
            items: items,
            request_date: new Date().toISOString()
        };

        // Don't explicitly set requested_by to 'System' as it's a UUID column
        // Letting it be null will use the database default (auth.uid()) or remain null

        const { error } = await supabase
            .from('purchase_requests')
            .insert(payload);

        if (error) {
            console.error('Error creating direct purchase request:', error);
            throw error;
        }
    }

    async updatePurchaseRequestStatus(requestId: string, status: 'Pendiente' | 'Parcial' | 'Recibido' | 'Cancelado'): Promise<void> {
        const { error } = await supabase
            .from('purchase_requests')
            .update({ status })
            .eq('id', requestId);

        if (error) {
            console.error('Error updating purchase request status:', error);
            throw error;
        }
    }
}
