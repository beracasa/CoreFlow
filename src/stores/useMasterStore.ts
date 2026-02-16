import { create } from 'zustand';
import { Machine, Technician, SparePart, ZoneStructure, MaintenancePlan, PlanTier } from '../../types';
import { MasterDataService } from '../services/masterDataService';
import { inventoryService } from '../services'; // For parts
import { SettingsSupabaseService, GeneralSettings } from '../services/implementations/SettingsSupabase';

// Re-export GeneralSettings as PlantSettings for backward compatibility
type PlantSettings = GeneralSettings;

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
    addMachine: (machine: Omit<Machine, 'id'>) => Promise<void>;
    addTechnician: (tech: Technician) => Promise<void>;
    addPart: (part: Omit<SparePart, 'id'>) => Promise<void>;
    
    addZone: (zone: ZoneStructure) => Promise<void>;
    updateZone: (zone: ZoneStructure) => Promise<void>;
    removeZone: (id: string) => Promise<void>;

    // Config Actions (Keep local for now or TODO: move to DB)
    updateSettings: (settings: PlantSettings) => Promise<void>;
    
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
    addPartCategory: (category: string) => Promise<void>;
    removePartCategory: (category: string) => Promise<void>;
    updatePartCategory: (oldVal: string, newVal: string) => void;

    addPartLocation: (location: string) => Promise<void>;
    removePartLocation: (location: string) => Promise<void>;
    updatePartLocation: (oldVal: string, newVal: string) => void;

    addPartUnit: (unit: string) => Promise<void>;
    removePartUnit: (unit: string) => Promise<void>;
    updatePartUnit: (oldVal: string, newVal: string) => void;
}

export const useMasterStore = create<MasterState>((set, get) => ({
    machines: [],
    technicians: [],
    parts: [],
    zones: [],
    
    // Default Settings
    plantSettings: {
        plantName: '',
        taxId: '',
        address: '',
        logoUrl: '',
        timezone: 'AST',
        currency: 'DOP'
    },
    currentPlan: PlanTier.BUSINESS,
    maintenancePlans: [], // TODO: Migrate to DB

    isLoading: false,
    error: null,

    // Shared Configuration Lists (Defaults)
    // Shared Configuration Lists (Defaults)
    branches: [],
    categories: [],
    assetTypes: [],
    maintenanceSchedules: [],
    partCategories: [],
    partLocations: [],
    partUnits: [],

    fetchMasterData: async () => {
        set({ isLoading: true, error: null });
        try {
            const [machines, technicians, zones, parts, branches, categories, assetTypes, plantSettings, partCategories, partLocations, partUnits] = await Promise.all([
                MasterDataService.getMachines(),
                MasterDataService.getTechnicians(),
                MasterDataService.getZones(),
                inventoryService.getAllParts(),
                MasterDataService.getBranches(),
                MasterDataService.getCategories(),
                MasterDataService.getAssetTypes(),
                SettingsSupabaseService.getSettings(),
                MasterDataService.getPartCategories(),
                MasterDataService.getPartLocations(),
                MasterDataService.getPartUnits()
            ]);
            
            const currentState = get();
            set({
                machines,
                technicians,
                zones,
                parts,
                // Only override defaults if we have data, otherwise use defaults
                branches: branches.length > 0 ? branches : currentState.branches,
                categories: categories.length > 0 ? categories : currentState.categories,
                assetTypes: assetTypes.length > 0 ? assetTypes : currentState.assetTypes,
                partCategories: partCategories.length > 0 ? partCategories : currentState.partCategories,
                partLocations: partLocations.length > 0 ? partLocations : currentState.partLocations,
                partUnits: partUnits.length > 0 ? partUnits : currentState.partUnits,
                plantSettings: plantSettings, // Always use fetched settings (service returns defaults if empty)
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
            throw error; // Re-throw so component can handle it
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
             throw error; // Re-throw so component can handle it
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
    // Sync Actions (Config)
    updateSettings: async (settings) => {
        try {
            await SettingsSupabaseService.updateSettings(settings); // Persist to singleton table
            set({ plantSettings: settings });
        } catch (error: any) {
            console.error("Failed to save settings:", error);
            set({ error: error.message });
            throw error; // Re-throw so component knows it failed
        }
    },

    // Branches
    addBranch: async (branch) => {
        try {
            const newBranch = await MasterDataService.createBranch(branch);
            set((state) => ({ branches: [...state.branches, newBranch] }));
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        }
    },
    removeBranch: async (branch) => {
        try {
            await MasterDataService.removeBranch(branch);
            set((state) => ({ branches: state.branches.filter(b => b !== branch) }));
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        }
    },
    updateBranch: (oldVal, newVal) => set((state) => ({ branches: state.branches.map(b => b === oldVal ? newVal : b) })),

    // Categories
    addCategory: async (category) => {
        try {
            const newCategory = await MasterDataService.createCategory(category);
            set((state) => ({ categories: [...state.categories, newCategory] }));
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        }
    },
    removeCategory: async (category) => {
        try {
            await MasterDataService.removeCategory(category);
            set((state) => ({ categories: state.categories.filter(c => c !== category) }));
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        }
    },
    updateCategory: (oldVal, newVal) => set((state) => ({ categories: state.categories.map(c => c === oldVal ? newVal : c) })),

    // Asset Types
    addAssetType: async (type) => {
        try {
            const newType = await MasterDataService.createAssetType(type);
            set((state) => ({ assetTypes: [...state.assetTypes, newType] }));
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        }
    },
    removeAssetType: async (type) => {
        try {
            await MasterDataService.removeAssetType(type);
            set((state) => ({ assetTypes: state.assetTypes.filter(t => t !== type) }));
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        }
    },
    updateAssetType: (oldVal, newVal) => set((state) => ({ assetTypes: state.assetTypes.map(t => t === oldVal ? newVal : t) })),

    // Spare Parts Configuration (Async with Supabase)
    addPartCategory: async (category) => {
        try {
            const newCategory = await MasterDataService.createPartCategory(category);
            set((state) => ({ partCategories: [...state.partCategories, newCategory] }));
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        }
    },
    removePartCategory: async (category) => {
        try {
            await MasterDataService.removePartCategory(category);
            set((state) => ({ partCategories: state.partCategories.filter(c => c !== category) }));
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        }
    },
    updatePartCategory: (oldVal, newVal) => set((state) => ({ partCategories: state.partCategories.map(c => c === oldVal ? newVal : c) })),

    addPartLocation: async (location) => {
        try {
            const newLocation = await MasterDataService.createPartLocation(location);
            set((state) => ({ partLocations: [...state.partLocations, newLocation] }));
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        }
    },
    removePartLocation: async (location) => {
        try {
            await MasterDataService.removePartLocation(location);
            set((state) => ({ partLocations: state.partLocations.filter(l => l !== location) }));
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        }
    },
    updatePartLocation: (oldVal, newVal) => set((state) => ({ partLocations: state.partLocations.map(l => l === oldVal ? newVal : l) })),

    addPartUnit: async (unit) => {
        try {
            const newUnit = await MasterDataService.createPartUnit(unit);
            set((state) => ({ partUnits: [...state.partUnits, newUnit] }));
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        }
    },
    removePartUnit: async (unit) => {
        try {
            await MasterDataService.removePartUnit(unit);
            set((state) => ({ partUnits: state.partUnits.filter(u => u !== unit) }));
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        }
    },
    updatePartUnit: (oldVal, newVal) => set((state) => ({ partUnits: state.partUnits.map(u => u === oldVal ? newVal : u) })),
}));
