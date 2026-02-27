import { WorkOrder } from '../../types';

export interface IWorkOrderService {
    getAll(): Promise<WorkOrder[]>;
    getById(id: string): Promise<WorkOrder | null>;
    create(order: Omit<WorkOrder, 'id'>): Promise<WorkOrder>;
    update(id: string, updates: Partial<WorkOrder>): Promise<void>;
    delete(id: string): Promise<void>;
}
