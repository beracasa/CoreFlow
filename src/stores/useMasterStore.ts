import { create } from 'zustand';
import { Machine, Technician, SparePart, MachineStatus, PlanTier } from '../../types';

// Mock Data
const INITIAL_MACHINES: Machine[] = [
    {
        id: 'm1',
        name: 'SACMI Press 01',
        plate: '10022775',
        type: 'SACMI',
        status: MachineStatus.RUNNING,
        location: { x: 20, y: 30 },
        zone: 'Zone A - Production Line 1',
        isIot: true,
        runningHours: 12450,
        lastMaintenance: '2023-10-01',
        nextMaintenance: '2023-11-01',
        intervals: ['360 Hours', '1080 Hours', '2160 Hours', '4320 Hours'],
        telemetry: { timestamp: new Date().toISOString(), temperature: 65, vibration: 1.2, pressure: 5.5, powerConsumption: 45 },
        history: Array(5).fill({ timestamp: new Date().toISOString(), temperature: 65, vibration: 1.2, pressure: 5.5, powerConsumption: 45 }),
    },
    {
        id: 'm2',
        name: 'MOSS Printer 03',
        plate: '10321238',
        type: 'MOSS',
        status: MachineStatus.WARNING,
        location: { x: 50, y: 60 },
        zone: 'Zone B - Assembly',
        isIot: true,
        runningHours: 8500,
        lastMaintenance: '2023-09-15',
        nextMaintenance: '2023-10-25',
        intervals: ['150 Hours', '300 Hours', '600 Hours'],
        telemetry: { timestamp: new Date().toISOString(), temperature: 82, vibration: 4.5, pressure: 2.1, powerConsumption: 12 },
        history: Array(5).fill({ timestamp: new Date().toISOString(), temperature: 82, vibration: 4.5, pressure: 2.1, powerConsumption: 12 }),
    },
    {
        id: 'm3',
        name: 'PMV Lining 02',
        plate: '10259010',
        type: 'PMV',
        status: MachineStatus.RUNNING,
        location: { x: 75, y: 25 },
        zone: 'Zone B - Assembly',
        isIot: true,
        runningHours: 3200,
        lastMaintenance: '2023-10-10',
        nextMaintenance: '2023-12-10',
        intervals: ['500 Hours', '1000 Hours'],
        telemetry: { timestamp: new Date().toISOString(), temperature: 45, vibration: 0.5, pressure: 6.0, powerConsumption: 22 },
        history: Array(5).fill({ timestamp: new Date().toISOString(), temperature: 45, vibration: 0.5, pressure: 6.0, powerConsumption: 22 }),
    },
];

const INITIAL_PARTS: SparePart[] = [
    { id: 'sp1', sku: 'BRG-6205', name: 'Ball Bearing 6205', currentStock: 4, minimumStock: 5, unitCost: 12.50, supplier: 'SKF', leadTimeDays: 3 },
    { id: 'sp2', sku: 'PLC-CPU', name: 'Siemens S7 CPU', currentStock: 2, minimumStock: 1, unitCost: 850.00, supplier: 'Siemens', leadTimeDays: 14 },
    { id: 'sp3', sku: 'OIL-SYN-50', name: 'Synthetic Oil 50L', currentStock: 12, minimumStock: 2, unitCost: 120.00, supplier: 'Mobil', leadTimeDays: 2 },
];

const INITIAL_TECHNICIANS: Technician[] = [
    { id: 'T-042', name: 'Jorge Perez', role: 'SUPERVISOR', shift: 'MORNING', status: 'ACTIVE', email: 'jorge.perez@coreflow.io' },
    { id: 'T-089', name: 'Sarah Connor', role: 'MECHANICAL', shift: 'NIGHT', status: 'ACTIVE', email: 'sarah.c@coreflow.io' },
    { id: 'T-112', name: 'Mike Ross', role: 'ELECTRICAL', shift: 'AFTERNOON', status: 'LEAVE', email: 'mike.r@coreflow.io' },
    { id: 'T-155', name: 'Luis Diaz', role: 'MECHANICAL', shift: 'MORNING', status: 'ACTIVE', email: 'luis.d@coreflow.io' },
];

interface PlantSettings {
    plantName: string;
    rnc: string;
    timezone: string;
    currency: string;
    logoUrl: string;
}

interface MasterState {
    machines: Machine[];
    technicians: Technician[];
    parts: SparePart[];
    plantSettings: PlantSettings;
    currentPlan: PlanTier; // Moved from App.tsx

    // Actions
    updateMachine: (updatedMachine: Machine) => void;
    addMachine: (machine: Machine) => void;

    addTechnician: (tech: Technician) => void;
    addPart: (part: SparePart) => void;

    updateSettings: (settings: PlantSettings) => void;
}

export const useMasterStore = create<MasterState>((set) => ({
    machines: INITIAL_MACHINES,
    technicians: INITIAL_TECHNICIANS,
    parts: INITIAL_PARTS,
    plantSettings: {
        plantName: 'Sede Principal - Rep. Dom.',
        rnc: '131-23456-9',
        timezone: 'AST',
        currency: 'DOP',
        logoUrl: ''
    },
    currentPlan: PlanTier.BUSINESS,

    updateMachine: (updatedMachine) => set((state) => ({
        machines: state.machines.map(m => m.id === updatedMachine.id ? updatedMachine : m)
    })),

    addMachine: (machine) => set((state) => ({
        machines: [...state.machines, machine]
    })),

    addTechnician: (tech) => set((state) => ({
        technicians: [...state.technicians, tech]
    })),

    addPart: (part) => set((state) => ({
        parts: [...state.parts, part]
    })),

    updateSettings: (settings) => set({ plantSettings: settings })
}));
