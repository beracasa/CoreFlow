import { WorkOrder } from '../../types';

export interface IWorkOrderService {
    getAll(page?: number, limit?: number, formType?: string): Promise<{ data: WorkOrder[], total: number }>;
    getById(id: string): Promise<WorkOrder | null>;
    create(order: Omit<WorkOrder, 'id'>): Promise<WorkOrder>;
    update(id: string, updates: Partial<WorkOrder>): Promise<void>;
    delete(id: string): Promise<void>;
}
