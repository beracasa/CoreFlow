import { IWorkOrderService } from './workOrderService';
import { WorkOrderMockService } from './implementations/workOrderMock';
import { WorkOrderSupabaseService } from './implementations/workOrderSupabase';

// VITE_USE_MOCK=true
const useMock = import.meta.env.VITE_USE_MOCK === 'true';

export const workOrderService: IWorkOrderService = useMock
    ? new WorkOrderMockService()
    : new WorkOrderSupabaseService();

console.log(`Service Layer initialized in ${useMock ? 'MOCK' : 'LIVE'} mode.`);

import { IInventoryService } from './inventoryService';
import { InventoryMockService } from './implementations/inventoryMock';
import { InventorySupabaseService } from './implementations/inventorySupabase';

export const inventoryService: IInventoryService = useMock
    ? new InventoryMockService()
    : new InventorySupabaseService();

export * from './workOrderService';
export * from './inventoryService';
