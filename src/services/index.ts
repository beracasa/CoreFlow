
import { IWorkOrderService } from './workOrderService';
import { WorkOrderMockService } from './implementations/workOrderMock';
import { WorkOrderSupabaseService } from './implementations/workOrderSupabase';
import { IInventoryService } from './inventoryService';
import { InventoryMockService } from './implementations/inventoryMock';
import { InventorySupabaseService } from './implementations/inventorySupabase';
import { isSupabaseConfigured } from './supabaseClient';

// New Implementations
import { MachineSupabaseService } from './implementations/machineSupabase';
import { masterMockService } from './implementations/masterMock';
import { SparePartSupabaseService } from './implementations/sparePartSupabase';
import { ProtocolSupabaseService } from './implementations/protocolSupabase';

const requestedMock = import.meta.env.VITE_USE_MOCK === 'true';
const requestedLive = import.meta.env.VITE_USE_MOCK === 'false';
const allowMockInProd = import.meta.env.VITE_ALLOW_MOCK_IN_PROD === 'true';

let useMock = requestedMock ? true : requestedLive ? false : !isSupabaseConfigured;
export const SERVICE_WARNINGS: string[] = [];

// Guardrail: avoid accidentally shipping mock DB to Vercel Preview/Production builds.
if (import.meta.env.PROD && useMock && !allowMockInProd) {
  console.error(
    'Mock mode is enabled in a production build. Forcing LIVE mode. ' +
      'Set VITE_ALLOW_MOCK_IN_PROD=true to override (not recommended).'
  );
  SERVICE_WARNINGS.push(
    'Mock mode was requested for a production build; forcing LIVE mode. ' +
      'Set VITE_ALLOW_MOCK_IN_PROD=true to override (not recommended).'
  );
  useMock = false;
}

if (!useMock && !isSupabaseConfigured) {
  console.error(
    'Supabase is not configured (missing/placeholder VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY). ' +
      'Set real values in your deploy environment variables.'
  );
  SERVICE_WARNINGS.push(
    'Supabase env is missing/placeholder (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Writes will fail until configured.'
  );
}

console.log('Running in mode:', useMock ? 'MOCK' : 'SUPABASE');
export const SERVICE_MODE = useMock ? 'MOCK' : 'LIVE';

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
