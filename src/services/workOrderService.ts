import { WorkOrder } from '../../types';

export interface WorkOrderFilters {
    search?: string;
    machineIds?: string[];
    searchMachineIds?: string[];
    interval?: string;
    failureType?: string;
    stage?: string;
    startDate?: string;
    endDate?: string;
}

export interface IWorkOrderService {
    getAll(page?: number, limit?: number, formType?: string, filters?: WorkOrderFilters): Promise<{ data: WorkOrder[], total: number }>;
    getFilterOptions?(formType: 'R-MANT-02' | 'R-MANT-05'): Promise<{ intervals: string[]; failureTypes: string[] }>;
    getById(id: string): Promise<WorkOrder | null>;
    create(order: Omit<WorkOrder, 'id'>): Promise<WorkOrder>;
    update(id: string, updates: Partial<WorkOrder>): Promise<void>;
    delete(id: string): Promise<void>;
}
