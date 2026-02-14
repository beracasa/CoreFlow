import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Machine, Technician, SparePart, MachineStatus, PlanTier, ZoneStructure } from '../../types';

// ... (retain existing initial data constants: INITIAL_MACHINES, INITIAL_PARTS, INITIAL_ZONES, INITIAL_TECHNICIANS)
// To keep the file clean, I'll rely on the existing constants being there. 
// However, replace_file_content replaces a block. 
// I need to import persist and wrap the create call.

// Let's target the imports first.
import { create } from 'zustand';
import { Machine, Technician, SparePart, ZoneStructure, MaintenancePlan, PlanTier } from '../../types';
import { MasterDataService } from '../services/masterDataService';
import { inventoryService } from '../services'; // For parts

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
    maintenancePlans: MaintenancePlan[];

    // Loading & Error
    isLoading: boolean;
    error: string | null;

    // Configuration Lists
    branches: string[];
    categories: string[];
    assetTypes: string[];
    maintenanceSchedules: string[];
    
    // Spare Parts Configuration
    partCategories: string[];
    partLocations: string[];
    partUnits: string[];

    // Actions
    fetchMasterData: () => Promise<void>;
    
    updateMachine: (updatedMachine: Machine) => Promise<void>;
    addMachine: (machine: Machine) => Promise<void>;
    addTechnician: (tech: Technician) => Promise<void>;
    addPart: (part: SparePart) => Promise<void>;
    
    addZone: (zone: ZoneStructure) => Promise<void>;
    updateZone: (zone: ZoneStructure) => Promise<void>;
    removeZone: (id: string) => Promise<void>;

    // Config Actions (Keep local for now or TODO: move to DB)
    updateSettings: (settings: PlantSettings) => void;
    
    addBranch: (branch: string) => void;
    removeBranch: (branch: string) => void;
    updateBranch: (oldVal: string, newVal: string) => void;

    addCategory: (category: string) => void;
    removeCategory: (category: string) => void;
    updateCategory: (oldVal: string, newVal: string) => void;

    addAssetType: (type: string) => void;
    removeAssetType: (type: string) => void;
    updateAssetType: (oldVal: string, newVal: string) => void;

    // Spare Parts Config Actions
    addPartCategory: (category: string) => void;
    removePartCategory: (category: string) => void;
    updatePartCategory: (oldVal: string, newVal: string) => void;

    addPartLocation: (location: string) => void;
    removePartLocation: (location: string) => void;
    updatePartLocation: (oldVal: string, newVal: string) => void;

    addPartUnit: (unit: string) => void;
    removePartUnit: (unit: string) => void;
    updatePartUnit: (oldVal: string, newVal: string) => void;
}

export const useMasterStore = create<MasterState>((set, get) => ({
    machines: [],
    technicians: [],
    parts: [],
    zones: [],
    
    // Default Settings
    plantSettings: {
        plantName: 'Sede Principal - Rep. Dom.',
        rnc: '131-23456-9',
        timezone: 'AST',
        currency: 'DOP',
        logoUrl: ''
    },
    currentPlan: PlanTier.BUSINESS,
    maintenancePlans: [], // TODO: Migrate to DB

    isLoading: false,
    error: null,

    // Shared Configuration Lists (Defaults)
    branches: ['Planta Principal', 'Planta Secundaria'],
    categories: ['Producción', 'Empaque', 'Servicios'],
    assetTypes: ['GENERIC', 'CONVEYOR', 'MIXER', 'OVEN', 'SENSOR'],
    maintenanceSchedules: ['250 Horas', '500 Horas', '1000 Horas'],
    partCategories: ['Rodamientos', 'Hidráulica', 'Electrónica', 'Neumática', 'Consumibles', 'Mecánica'],
    partLocations: ['Estante A', 'Estante B', 'Estante C', 'Almacén Central'],
    partUnits: ['PCS', 'M', 'KG', 'L', 'SET'],

    fetchMasterData: async () => {
        set({ isLoading: true, error: null });
        try {
            const [machines, technicians, zones, parts] = await Promise.all([
                MasterDataService.getMachines(),
                MasterDataService.getTechnicians(),
                MasterDataService.getZones(),
                inventoryService.getAllParts()
            ]);
            
            set({
                machines,
                technicians,
                zones,
                parts,
                isLoading: false
            });
        } catch (error: any) {
            console.error('Failed to fetch master data:', error);
            set({ error: error.message, isLoading: false });
        }
    },

    updateMachine: async (updatedMachine) => {
        try {
            await MasterDataService.updateMachine(updatedMachine);
            set((state) => ({
                machines: state.machines.map(m => m.id === updatedMachine.id ? updatedMachine : m)
            }));
        } catch (error: any) {
            set({ error: error.message });
        }
    },

    addMachine: async (machine) => {
        try {
            const newMachine = await MasterDataService.createMachine(machine);
            set((state) => ({
                machines: [newMachine, ...state.machines]
            }));
        } catch (error: any) {
             set({ error: error.message });
        }
    },

    addTechnician: async (tech) => {
        try {
            const newTech = await MasterDataService.createTechnician(tech);
             set((state) => ({
                technicians: [...state.technicians, newTech]
            }));
        } catch (error: any) {
             set({ error: error.message });
        }
    },

    addPart: async (part) => {
        try {
            const newPart = await inventoryService.createPart(part);
            set((state) => ({
                parts: [...state.parts, newPart]
            }));
        } catch (error: any) {
             set({ error: error.message });
        }
    },

    addZone: async (zone) => {
        try {
            const newZone = (await MasterDataService.createZone(zone)) as any; // Cast if array returned
            set((state) => ({
                zones: [...state.zones, newZone] // Ensure implementation returns single or array
            }));
        } catch (error: any) {
             set({ error: error.message });
        }
    },

    updateZone: async (updatedZone) => {
        try {
            await MasterDataService.updateZone(updatedZone);
            set((state) => ({
                zones: state.zones.map(z => z.id === updatedZone.id ? updatedZone : z)
            }));
        } catch (error: any) {
             set({ error: error.message });
        }
    },

    removeZone: async (id) => {
        try {
            await MasterDataService.removeZone(id);
             set((state) => ({
                zones: state.zones.filter(z => z.id !== id)
            }));
        } catch (error: any) {
             set({ error: error.message });
        }
    },

    // Sync Actions (Config)
    updateSettings: (settings) => set({ plantSettings: settings }),

    // Branches
    addBranch: (branch) => set((state) => ({ branches: [...state.branches, branch] })),
    removeBranch: (branch) => set((state) => ({ branches: state.branches.filter(b => b !== branch) })),
    updateBranch: (oldVal, newVal) => set((state) => ({ branches: state.branches.map(b => b === oldVal ? newVal : b) })),

    // Categories
    addCategory: (category) => set((state) => ({ categories: [...state.categories, category] })),
    removeCategory: (category) => set((state) => ({ categories: state.categories.filter(c => c !== category) })),
    updateCategory: (oldVal, newVal) => set((state) => ({ categories: state.categories.map(c => c === oldVal ? newVal : c) })),

    // Asset Types
    addAssetType: (type) => set((state) => ({ assetTypes: [...state.assetTypes, type] })),
    removeAssetType: (type) => set((state) => ({ assetTypes: state.assetTypes.filter(t => t !== type) })),
    updateAssetType: (oldVal, newVal) => set((state) => ({ assetTypes: state.assetTypes.map(t => t === oldVal ? newVal : t) })),

    // Part Categories
    addPartCategory: (category) => set((state) => ({ partCategories: [...state.partCategories, category] })),
    removePartCategory: (category) => set((state) => ({ partCategories: state.partCategories.filter(c => c !== category) })),
    updatePartCategory: (oldVal, newVal) => set((state) => ({ partCategories: state.partCategories.map(c => c === oldVal ? newVal : c) })),

    // Part Locations
    addPartLocation: (location) => set((state) => ({ partLocations: [...state.partLocations, location] })),
    removePartLocation: (location) => set((state) => ({ partLocations: state.partLocations.filter(l => l !== location) })),
    updatePartLocation: (oldVal, newVal) => set((state) => ({ partLocations: state.partLocations.map(l => l === oldVal ? newVal : l) })),

    // Part Units
    addPartUnit: (unit) => set((state) => ({ partUnits: [...state.partUnits, unit] })),
    removePartUnit: (unit) => set((state) => ({ partUnits: state.partUnits.filter(u => u !== unit) })),
    updatePartUnit: (oldVal, newVal) => set((state) => ({ partUnits: state.partUnits.map(u => u === oldVal ? newVal : u) })),
}));
