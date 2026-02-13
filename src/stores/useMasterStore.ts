import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Machine, Technician, SparePart, MachineStatus, PlanTier, ZoneStructure } from '../../types';

// ... (retain existing initial data constants: INITIAL_MACHINES, INITIAL_PARTS, INITIAL_ZONES, INITIAL_TECHNICIANS)
// To keep the file clean, I'll rely on the existing constants being there. 
// However, replace_file_content replaces a block. 
// I need to import persist and wrap the create call.

// Let's target the imports first.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Machine, Technician, SparePart, MachineStatus, PlanTier, ZoneStructure, MaintenancePlan, MaintenanceTask } from '../../types';

// Mock Data for Maintenance Protocols (Initial)
const INITIAL_MAINTENANCE_PLANS: MaintenancePlan[] = [
    {
        machineId: 'm1', // SACMI Press
        intervals: [
            {
                id: 'i-360', hours: 360, label: '360 Hours', tasks: [
                    {
                        id: 't1', sequence: 1, group: 'Extrusor', component: 'Boquilla extrusor', activity: 'Limpieza',
                        referenceCode: '8.1.2.2.3.7', estimatedTime: 10,
                        actionFlags: { clean: true, inspect: false, lubricate: false, adjust: false, refill: false, replace: false, mount: false }
                    },
                    {
                        id: 't2', sequence: 2, group: 'Extrusor', component: 'Tornillo de encastre', activity: 'Limpieza',
                        referenceCode: '8.1.2.2.3.7', estimatedTime: 10,
                        actionFlags: { clean: true, inspect: false, lubricate: false, adjust: false, refill: false, replace: false, mount: false }
                    }
                ]
            }
        ]
    }
];

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
        branch: 'Planta Principal',
        category: 'Producción',
        brand: 'SACMI',
        model: 'PH-3000'
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
        branch: 'Planta Principal',
        category: 'Producción',
        brand: 'MOSS',
        model: 'MO-2023'
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
        branch: 'Planta Principal',
        category: 'Producción',
        brand: 'PMV',
        model: 'Liner-X'
    },
];

const INITIAL_PARTS: SparePart[] = [
    { id: 'sp1', sku: 'BRG-6205', name: 'Ball Bearing 6205', currentStock: 4, minimumStock: 5, unitCost: 12.50, supplier: 'SKF', leadTimeDays: 3 },
    { id: 'sp2', sku: 'PLC-CPU', name: 'Siemens S7 CPU', currentStock: 2, minimumStock: 1, unitCost: 850.00, supplier: 'Siemens', leadTimeDays: 14 },
    { id: 'sp3', sku: 'OIL-SYN-50', name: 'Synthetic Oil 50L', currentStock: 12, minimumStock: 2, unitCost: 120.00, supplier: 'Mobil', leadTimeDays: 2 },
];

const INITIAL_ZONES: ZoneStructure[] = [
    { id: '1', name: 'Zone A', lines: ['Production Line 1'], x: 5, y: 15, width: 20, height: 30 },
    { id: '2', name: 'Zone B', lines: ['Assembly'], x: 27, y: 15, width: 20, height: 30 }
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
    zones: ZoneStructure[];
    plantSettings: PlantSettings;
    currentPlan: PlanTier;
    maintenancePlans: MaintenancePlan[]; // Added

    // Configuration Lists
    branches: string[];
    categories: string[];
    assetTypes: string[];
    maintenanceSchedules: string[];

    // Actions
    updateMachine: (updatedMachine: Machine) => void;
    addMachine: (machine: Machine) => void;

    addTechnician: (tech: Technician) => void;
    addPart: (part: SparePart) => void;

    addZone: (zone: ZoneStructure) => void;
    updateZone: (zone: ZoneStructure) => void;
    removeZone: (id: string) => void;

    // Protocol Actions
    addMaintenancePlan: (plan: MaintenancePlan) => void;
    updateMaintenancePlan: (plan: MaintenancePlan) => void;

    // List Actions
    addBranch: (branch: string) => void;
    removeBranch: (branch: string) => void;
    updateBranch: (oldVal: string, newVal: string) => void;

    addCategory: (category: string) => void;
    removeCategory: (category: string) => void;
    updateCategory: (oldVal: string, newVal: string) => void;

    addAssetType: (type: string) => void;
    removeAssetType: (type: string) => void;
    updateAssetType: (oldVal: string, newVal: string) => void;

    addMaintenanceSchedule: (schedule: string) => void;
    removeMaintenanceSchedule: (schedule: string) => void;

    updateSettings: (settings: PlantSettings) => void;

    // Spare Parts Configuration
    partCategories: string[];
    partLocations: string[];
    partUnits: string[];

    addPartCategory: (category: string) => void;
    removePartCategory: (category: string) => void;
    updatePartCategory: (oldCat: string, newCat: string) => void;

    addPartLocation: (location: string) => void;
    removePartLocation: (location: string) => void;
    updatePartLocation: (oldLoc: string, newLoc: string) => void;

    addPartUnit: (unit: string) => void;
    removePartUnit: (unit: string) => void;
    updatePartUnit: (oldUnit: string, newUnit: string) => void;
}

export const useMasterStore = create<MasterState>()(
    persist(
        (set) => ({
            machines: INITIAL_MACHINES,
            technicians: INITIAL_TECHNICIANS,
            parts: INITIAL_PARTS,
            zones: INITIAL_ZONES,
            plantSettings: {
                plantName: 'Sede Principal - Rep. Dom.',
                rnc: '131-23456-9',
                timezone: 'AST',
                currency: 'DOP',
                logoUrl: ''
            },
            currentPlan: PlanTier.BUSINESS,
            maintenancePlans: INITIAL_MAINTENANCE_PLANS,

            // Shared Configuration Lists
            branches: ['Planta Principal', 'Planta Secundaria'],
            categories: ['Producción', 'Empaque', 'Servicios'],
            assetTypes: ['GENERIC', 'CONVEYOR', 'MIXER', 'OVEN', 'SENSOR'],
            maintenanceSchedules: ['250 Horas', '500 Horas', '1000 Horas'],

            updateMachine: (updatedMachine) => set((state) => ({
                machines: state.machines.map(m => m.id === updatedMachine.id ? updatedMachine : m)
            })),

            addMachine: (machine) => set((state) => ({
                machines: [machine, ...state.machines]
            })),

            addTechnician: (tech) => set((state) => ({
                technicians: [...state.technicians, tech]
            })),

            addPart: (part) => set((state) => ({
                parts: [...state.parts, part]
            })),

            addZone: (zone) => set((state) => ({
                zones: [...state.zones, zone]
            })),

            updateZone: (updatedZone) => set((state) => ({
                zones: state.zones.map(z => z.id === updatedZone.id ? updatedZone : z)
            })),

            removeZone: (id) => set((state) => ({
                zones: state.zones.filter(z => z.id !== id)
            })),

            addMaintenancePlan: (plan) => set((state) => ({
                maintenancePlans: [...state.maintenancePlans, plan]
            })),

            updateMaintenancePlan: (updatedPlan) => set((state) => ({
                maintenancePlans: state.maintenancePlans.map(p => p.machineId === updatedPlan.machineId ? updatedPlan : p)
            })),

            // List Management Actions
            addBranch: (branch) => set((state) => ({ branches: [...state.branches, branch] })),
            removeBranch: (branch) => set((state) => ({ branches: state.branches.filter(b => b !== branch) })),
            updateBranch: (oldVal, newVal) => set((state) => ({ branches: state.branches.map(b => b === oldVal ? newVal : b) })),

            addCategory: (category) => set((state) => ({ categories: [...state.categories, category] })),
            removeCategory: (category) => set((state) => ({ categories: state.categories.filter(c => c !== category) })),
            updateCategory: (oldVal, newVal) => set((state) => ({ categories: state.categories.map(c => c === oldVal ? newVal : c) })),

            addAssetType: (type) => set((state) => ({ assetTypes: [...state.assetTypes, type] })),
            removeAssetType: (type) => set((state) => ({ assetTypes: state.assetTypes.filter(t => t !== type) })),
            updateAssetType: (oldVal, newVal) => set((state) => ({ assetTypes: state.assetTypes.map(t => t === oldVal ? newVal : t) })),

            addMaintenanceSchedule: (schedule) => set((state) => ({ maintenanceSchedules: [...state.maintenanceSchedules, schedule] })),
            removeMaintenanceSchedule: (schedule) => set((state) => ({ maintenanceSchedules: state.maintenanceSchedules.filter(s => s !== schedule) })),

            updateSettings: (settings) => set({ plantSettings: settings }),

            // Spare Parts Configuration
            partCategories: ['Rodamientos', 'Hidráulica', 'Electrónica', 'Neumática', 'Consumibles', 'Mecánica'],
            partLocations: ['Estante A', 'Estante B', 'Estante C', 'Almacén Central'],
            partUnits: ['PCS', 'M', 'KG', 'L', 'SET'],

            addPartCategory: (category) => set((state) => ({ partCategories: [...state.partCategories, category] })),
            removePartCategory: (category) => set((state) => ({ partCategories: state.partCategories.filter(c => c !== category) })),
            updatePartCategory: (oldCat, newCat) => set((state) => ({ partCategories: state.partCategories.map(c => c === oldCat ? newCat : c) })),

            addPartLocation: (location) => set((state) => ({ partLocations: [...state.partLocations, location] })),
            removePartLocation: (location) => set((state) => ({ partLocations: state.partLocations.filter(l => l !== location) })),
            updatePartLocation: (oldLoc, newLoc) => set((state) => ({ partLocations: state.partLocations.map(l => l === oldLoc ? newLoc : l) })),

            addPartUnit: (unit) => set((state) => ({ partUnits: [...state.partUnits, unit] })),
            removePartUnit: (unit) => set((state) => ({ partUnits: state.partUnits.filter(u => u !== unit) })),
            updatePartUnit: (oldUnit, newUnit) => set((state) => ({ partUnits: state.partUnits.map(u => u === oldUnit ? newUnit : u) })),
        }),
        {
            name: 'coreflow-master-storage', // unique name
            storage: createJSONStorage(() => localStorage),
        }
    )
);
