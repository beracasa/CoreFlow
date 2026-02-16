
import { IWorkOrderService } from './workOrderService';
import { WorkOrderMockService } from './implementations/workOrderMock';
import { WorkOrderSupabaseService } from './implementations/workOrderSupabase';
import { IInventoryService } from './inventoryService';
import { InventoryMockService } from './implementations/inventoryMock';
import { InventorySupabaseService } from './implementations/inventorySupabase';

// New Implementations
import { MachineSupabaseService } from './implementations/machineSupabase';
// import { MachineMockService } from './implementations/machineMock'; // If existed
import { SparePartSupabaseService } from './implementations/sparePartSupabase';
import { ProtocolSupabaseService } from './implementations/protocolSupabase';

// VITE_USE_MOCK=true
const useMock = import.meta.env.VITE_USE_MOCK === 'true';
console.log('Running in mode:', useMock ? 'MOCK' : 'SUPABASE');

export const workOrderService: IWorkOrderService = useMock
    ? new WorkOrderMockService()
    : new WorkOrderSupabaseService();

export const inventoryService: IInventoryService = useMock
    ? new InventoryMockService()
    : new InventorySupabaseService();

// Master Data Exports (No interface abstraction yet for these specific ones, calling directly or via MasterDataService wrapper)
export const machineService = useMock 
    ? null // MachineMockService not standardized yet, assuming existing store logic handled it
    : MachineSupabaseService;

export const sparePartService = useMock 
    ? null // InventoryMockService handles parts?
    : SparePartSupabaseService;

export const protocolService = useMock
    ? null 
    : ProtocolSupabaseService;

console.log(`Service Layer initialized in ${useMock ? 'MOCK' : 'LIVE'} mode.`);

export * from './workOrderService';
export * from './inventoryService';
export * from './masterDataService'; // Export the wrapper
