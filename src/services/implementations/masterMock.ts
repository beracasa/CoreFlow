import { Machine, Technician, ZoneStructure, MachineStatus } from '../../../types';
import { saveToStorage, loadFromStorage } from '../../utils/persistence';

const MACHINES_KEY = 'v2_cmms_machines';
const TECHS_KEY = 'v2_cmms_technicians';
const ZONES_KEY = 'v2_cmms_zones';

const INITIAL_MACHINES: Machine[] = [
    {
        id: 'm1',
        name: 'SACMI Press 01',
        plate: 'SP-001',
        alias: 'SP-001',
        type: 'SACMI',
        status: MachineStatus.RUNNING,
        isActive: true,
        location: { x: 20, y: 30 },
        zone: 'Zone A',
        branch: 'Planta Principal',
        category: 'Producción',
        isIot: true,
        runningHours: 1250,
        lastMaintenance: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        nextMaintenance: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        telemetry: { timestamp: new Date().toISOString(), temperature: 45, vibration: 2.5, pressure: 180, powerConsumption: 12.5 },
        history: [],
        brand: 'SACMI',
        model: 'PH-500',
        year: 2021,
        documents: []
    },
    {
        id: 'm2',
        name: 'MOSS Printer 03',
        plate: 'MP-003',
        alias: 'MP-003',
        type: 'MOSS',
        status: MachineStatus.IDLE,
        isActive: true,
        location: { x: 50, y: 30 },
        zone: 'Zone B',
        branch: 'Planta Principal',
        category: 'Impresión',
        isIot: false,
        runningHours: 850,
        lastMaintenance: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        nextMaintenance: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
        telemetry: { timestamp: new Date().toISOString(), temperature: 30, vibration: 0.5, pressure: 0, powerConsumption: 2.1 },
        history: [],
        brand: 'MOSS',
        model: 'MS-1000',
        year: 2019,
        documents: []
    }
];

const INITIAL_TECHS: Technician[] = [
    { id: 'T1', name: 'Juan Perez', role: 'MECHANICAL', shift: 'MORNING', status: 'ACTIVE', email: 'juan@example.com' },
    { id: 'T2', name: 'Maria Garcia', role: 'ELECTRICAL', shift: 'AFTERNOON', status: 'ACTIVE', email: 'maria@example.com' }
];

const INITIAL_ZONES: ZoneStructure[] = [
    { id: 'z1', name: 'Zone A', lines: ['Line 1', 'Line 2'], color: '#ef4444' },
    { id: 'z2', name: 'Zone B', lines: ['Line 3'], color: '#3b82f6' }
];

export class MasterMockService {
    async getMachines(page: number = 1, limit: number = 50, filters?: any): Promise<{ data: Machine[], total: number }> {
        let machines = loadFromStorage(MACHINES_KEY, INITIAL_MACHINES);
        
        if (filters) {
            if (filters.search) {
                const s = filters.search.toLowerCase();
                machines = machines.filter(m => 
                    m.name.toLowerCase().includes(s) || 
                    m.plate.toLowerCase().includes(s) ||
                    (m.brand && m.brand.toLowerCase().includes(s))
                );
            }
            if (filters.branch && filters.branch !== 'all' && filters.branch !== '') {
                machines = machines.filter(m => m.branch === filters.branch);
            }
            if (filters.category && filters.category !== 'all' && filters.category !== '') {
                machines = machines.filter(m => m.category === filters.category);
            }
            if (filters.zone && filters.zone !== 'all' && filters.zone !== '') {
                machines = machines.filter(m => m.zone === filters.zone);
            }
        }

        const total = machines.length;
        const from = (page - 1) * limit;
        const to = from + limit;
        return { data: machines.slice(from, to), total };
    }

    async getTechnicians(): Promise<Technician[]> {
        return loadFromStorage(TECHS_KEY, INITIAL_TECHS);
    }

    async getZones(): Promise<ZoneStructure[]> {
        return loadFromStorage(ZONES_KEY, INITIAL_ZONES);
    }

    async getBranches(): Promise<string[]> {
        return ['Planta Principal', 'Sucursal Norte', 'Sucursal Sur'];
    }

    async getCategories(): Promise<string[]> {
        return ['Producción', 'Impresión', 'Empaque', 'Servicios'];
    }

    async getAssetTypes(): Promise<string[]> {
        return ['SACMI', 'MOSS', 'PMV', 'GENERIC'];
    }

    async getPartCategories(): Promise<string[]> {
        return ['Bearings', 'Hydraulics', 'Electronics', 'Transmission', 'Filters'];
    }

    async getPartLocations(): Promise<string[]> {
        return ['A-01', 'B-03', 'C-02', 'A-05', 'D-01'];
    }

    async getPartUnits(): Promise<string[]> {
        return ['PCS', 'M', 'KG', 'L'];
    }
}

export const masterMockService = new MasterMockService();
