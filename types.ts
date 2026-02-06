
export enum MachineStatus {
  RUNNING = 'RUNNING',
  IDLE = 'IDLE',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  OFFLINE = 'OFFLINE'
}

export enum PlanTier {
  LIGHT = 'LIGHT',
  PROFESSIONAL = 'PROFESSIONAL',
  BUSINESS = 'BUSINESS'
}

// --- SECURITY & AUTH TYPES ---
export enum UserRole {
  ADMIN_SOLICITANTE = 'ADMIN_SOLICITANTE', // Full Access
  TECNICO_MANT = 'TECNICO_MANT',           // Execution & Readings
  AUDITOR = 'AUDITOR'                      // Read Only
}

// NEW: Dynamic Role Definitions
export interface Permission {
  id: string;
  category: 'OPERATIONAL' | 'ADMINISTRATIVE' | 'FINANCIAL' | 'SYSTEM';
  label: string;
  description: string;
}

export interface RoleDefinition {
  id: string; // e.g. 'custom-supervisor'
  name: string; // e.g. 'Line Supervisor'
  description: string;
  isSystem: boolean; // If true, cannot be deleted (only edited)
  permissions: string[]; // Array of Permission IDs
  usersCount?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  tenant_id: string;
  role: UserRole | string; // Updated to allow custom role IDs
  full_name: string;
  job_title: string;
  avatar_url?: string;
  signature_url?: string; // Base64 or URL from Storage
  specialties?: string[]; // Array of tags e.g. ["SACMI", "Hydraulics"]
  status: 'ACTIVE' | 'INVITED' | 'INACTIVE';
}

export interface TelemetryData {
  timestamp: string;
  temperature: number; // Celsius
  vibration: number; // mm/s
  pressure: number; // Bar
  powerConsumption: number; // kW
}

export interface Machine {
  id: string;
  name: string;
  plate: string;
  type: 'SACMI' | 'MOSS' | 'PMV' | 'GENERIC' | string; // Loosened type for dynamic input
  status: MachineStatus;
  location: { x: number; y: number };
  zone?: string;
  isIot: boolean;
  runningHours: number;
  lastMaintenance: string;
  nextMaintenance: string;
  intervals?: string[];
  telemetry: TelemetryData;
  history: TelemetryData[];

  // New Fields
  branch?: string;        // Empresa - Sucursal
  category?: string;      // Categoría
  alias?: string;         // Alias del Equipo
  brand?: string;         // Marca
  model?: string;         // Modelo
  year?: number;          // Año de Fabricación
  capacity?: string;      // Capacidad
  currentRating?: number; // In (A)
  frequency?: number;     // f (hz)
  voltage?: number;       // V. 3PH (VAC)
  power?: number;         // P (KVA)
  imageUrl?: string;      // Imagen del Equipo
  documents?: string[];   // Documentos adjuntos
}

export enum WorkOrderStatus {
  BACKLOG = 'BACKLOG',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE'
}

// Stages for the visual workflow (Green -> Pink -> Green)
export enum WorkOrderStage {
  DRAFT = 'DRAFT',           // Section 1 Editable
  REQUESTED = 'REQUESTED',   // Section 1 Locked, Section 2 Available
  EXECUTION = 'EXECUTION',   // Section 2 Active
  HANDOVER = 'HANDOVER',     // Section 2 Locked, Section 3 Active
  CLOSED = 'CLOSED'          // All Locked
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ConsumedPart {
  partId: string;
  partName: string; // Snapshot of name in case it changes
  sku: string;
  quantity: number;
  unit: string; // e.g., 'Pieza', 'Litro'
  unitCost: number;
  totalCost: number;
}

export interface ExecutorInfo {
  name: string;
  lastName: string;
  position: string;
}

// Maintenance Protocol Structure (R-MANT-02)
export interface MaintenancePlan {
  machineId: string;
  intervals: MaintenanceInterval[];
}

export interface MaintenanceInterval {
  id: string; // Add ID for keying
  hours: number;
  label: string; // e.g., "360 Horas"
  tasks: MaintenanceTask[];
}

export interface MaintenanceTask {
  id: string;
  sequence: number;          // Columna: Nº
  group: string;             // Columna: Grupo (ej: "Extrusor")
  component: string;         // Columna: Punto de intervencion
  activity: string;          // Columna: Tipo de intervencion

  // Datos Técnicos
  referenceCode?: string;    // Columna: Ref de interv.
  lubricantType?: string;    // Columna: Tipo de Lub.
  lubricantCode?: string;    // Columna: Codigo
  estimatedTime: number;     // Columna: Tiem. Estim min

  // Compatibility fields
  intervalOrigin?: string;   // Keeping for compatibility
  completed?: boolean;       // Keeping for state
  notes?: string;

  // Matriz de Acciones
  actionFlags: {
    clean: boolean;        // Limpieza
    inspect: boolean;      // Controlar/Verificar
    lubricate: boolean;    // Lubricación
    adjust: boolean;       // Regulación/Ajuste
    refill: boolean;       // Llenado/Recarga
    replace: boolean;      // Sustitución/Cambio
    mount: boolean;        // Desmontaje/Montaje
  };
}

export interface WorkOrder {
  id: string;
  title: string;
  machineId: string;
  status: WorkOrderStatus;
  currentStage: WorkOrderStage; // Controls the 3-section workflow
  priority: Priority;
  assignedTo?: string; // Main technician
  description: string;
  createdDate: string;
  completedDate?: string;
  type: 'PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE' | 'PROGRAMMED' | 'OTHER';
  formType: 'R-MANT-02' | 'R-MANT-05' | 'R-INOC-07';

  // R-MANT-02 Specifics (Image 2)
  maintenanceType?: 'Preventive' | 'Programmed' | 'Other';
  machinePlate?: string;
  interval?: string; // e.g. "360 Hours"
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  machineWorkHours?: number;   // Formatted in UI, number in generic
  nextMaintenanceHours?: number;
  electromechanicalGroup?: string; // "Electromecánicos" select
  executors?: ExecutorInfo[];
  supervisor?: string;


  // R-MANT-02 Specifics (Image 3 - Parts)
  consumedParts?: ConsumedPart[];
  totalMaintenanceCost?: number;

  // R-MANT-02 Specifics (Image 3 - Checklist)
  checklist?: {
    pointClean?: boolean | null; // Punto específico limpio
    areaClean?: boolean | null; // Área limpia
    guardsComplete?: boolean | null; // Protecciones completas
    toolsRemoved?: boolean | null; // Herramientas retiradas
    greaseCleaned?: boolean | null; // Grasas tapadas/limpias
    safetyActivated?: boolean | null; // Protecciones activadas
  };

  // R-MANT-02 Specifics (Image 4 - Executors)
  executors?: ExecutorInfo[];
  observations?: string;
  assignedMechanic?: string;
  receivedBy?: string;

  // R-MANT-05 Specifics
  department?: string;
  failureType?: string; // Mecánica, Eléctrica...
  frequency?: string; // Primera vez, Recurrente...
  consequence?: string; // Parada, Bajo Rendimiento...
  actionTaken?: string;

  // Signature Placeholders (Base64 or boolean for mock)
  signatureExecutor?: boolean;
  signatureSupervisor?: boolean;
}

export interface MachineHourLog {
  id: string;
  machineId: string;
  date: string;
  hoursLogged: number;
  operator: string;
  comments?: string;
}

export interface SparePart {
  id: string;
  sku: string;
  name: string;
  category?: 'MECHANICAL' | 'ELECTRICAL' | 'HYDRAULIC' | 'PNEUMATIC' | 'CONSUMABLE' | 'SENSOR' | 'PLC' | 'OTHER';
  currentStock: number;
  minimumStock: number;
  reorderPoint?: number;
  locationCode?: string;
  unitCost: number;
  currency?: string;
  supplier: string;
  leadTimeDays: number;
}

export interface Technician {
  id: string;
  name: string;
  role: 'MECHANICAL' | 'ELECTRICAL' | 'SUPERVISOR' | 'AUDITOR';
  shift: 'MORNING' | 'AFTERNOON' | 'NIGHT';
  status: 'ACTIVE' | 'LEAVE' | 'INACTIVE';
  email: string;
}

export enum AppView {
  LOGIN = 'LOGIN', // New Auth View
  WIZARD = 'WIZARD',
  DASHBOARD = 'DASHBOARD',
  KANBAN = 'KANBAN',
  MANT_02 = 'MANT_02',
  MANT_05 = 'MANT_05',
  MACHINE_HOURS = 'MACHINE_HOURS', // New Module
  INVENTORY = 'INVENTORY',
  ANALYTICS = 'ANALYTICS',
  CONFIGURATION = 'CONFIGURATION',
  PROFILE = 'PROFILE', // New User Profile View
}