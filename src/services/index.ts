import { IWorkOrderService } from './workOrderService';
import { WorkOrderMockService } from './implementations/workOrderMock';
import { WorkOrderSupabaseService } from './implementations/workOrderSupabase';

// VITE_USE_MOCK=true
const useMock = import.meta.env.VITE_USE_MOCK === 'true';

export const workOrderService: IWorkOrderService = useMock
    ? new WorkOrderMockService()
    : new WorkOrderSupabaseService();

console.log(`Service Layer initialized in ${useMock ? 'MOCK' : 'LIVE'} mode.`);

export * from './workOrderService';
