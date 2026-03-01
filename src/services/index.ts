
import { IWorkOrderService } from './workOrderService';
import { WorkOrderMockService } from './implementations/workOrderMock';
import { WorkOrderSupabaseService } from './implementations/workOrderSupabase';
import { IInventoryService } from './inventoryService';
import { InventoryMockService } from './implementations/inventoryMock';
import { InventorySupabaseService } from './implementations/inventorySupabase';

// New Implementations
import { MachineSupabaseService } from './implementations/machineSupabase';
import { masterMockService } from './implementations/masterMock';
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

// Master Data Exports
export const machineService = useMock 
    ? masterMockService 
    : MachineSupabaseService;

export const technicianService = useMock
    ? masterMockService
    : null; // Direct supabase calls in MasterDataService for now

export const configService = useMock
    ? masterMockService
    : null;

export const sparePartService = useMock 
    ? inventoryService
    : SparePartSupabaseService;

export const protocolService = useMock
    ? null 
    : ProtocolSupabaseService;

console.log(`Service Layer initialized in ${useMock ? 'MOCK' : 'LIVE'} mode.`);

export * from './workOrderService';
export * from './inventoryService';
export * from './masterDataService'; // Export the wrapper
