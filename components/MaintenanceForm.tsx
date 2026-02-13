
import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { WorkOrder, Machine, Technician, Priority, WorkOrderStatus, SparePart, WorkOrderStage, MaintenanceTask, UserRole } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Save, X, CheckSquare, Plus, Trash2, Lock, PlayCircle, CheckCircle, ArrowRight, Settings, User, Clock, AlertCircle } from 'lucide-react';
import { ProtocolViewer } from './ProtocolViewer';
import { useMasterStore } from '../src/stores/useMasterStore';

// --- 1. CONFIGURATION & MASTER DATA ENGINE ---

// Hierarchy: If I select '2160 Hours', I must perform '360' and '1080' tasks too.
const INTERVAL_HIERARCHY = ['360 Hours', '1080 Hours', '2160 Hours', '4320 Hours', '8640 Hours'];

// Master Task Database (Simulating a DB Table: maintenance_protocols)
// Master Task Database (Simulating a DB Table: maintenance_protocols)
// UPDATED: Now uses detailed MaintenanceTask structure
const MOCK_FLAGS = { clean: false, inspect: false, lubricate: false, adjust: false, refill: false, replace: false, mount: false };
const MAINTENANCE_PROTOCOLS: Record<string, Record<string, MaintenanceTask[]>> = {
   'SACMI': {
      '360 Hours': [
         {
            id: 't1', sequence: 1, group: 'Extrusor', component: 'Boquilla extrusor', activity: 'Limpieza',
            referenceCode: '8.1.2.2.3.7', estimatedTime: 10,
            actionFlags: { ...MOCK_FLAGS, clean: true }
         },
         {
            id: 't2', sequence: 2, group: 'Extrusor', component: 'Tornillo de encastre', activity: 'Limpieza',
            referenceCode: '8.1.2.2.3.7', estimatedTime: 10,
            actionFlags: { ...MOCK_FLAGS, clean: true }
         },
         {
            id: 't3', sequence: 3, group: 'Carrusel de Introducción', component: 'Cuchilla de corte', activity: 'Afilado / Regulado',
            referenceCode: '8.1.2.3.1', estimatedTime: 45,
            actionFlags: { ...MOCK_FLAGS, adjust: true, replace: true }
         }
      ],
      '1080 Hours': [
         {
            id: 't4', sequence: 14, group: 'Motorizacion', component: 'Motorreductor Carrusel', activity: 'Control nivel aceite',
            referenceCode: '8.1.2.1.6', estimatedTime: 15,
            actionFlags: { ...MOCK_FLAGS, inspect: true, refill: true }
         }
      ],
      '2160 Hours': []
   },
   'MOSS': {
      '360 Hours': [],
      '1080 Hours': [],
      '2160 Hours': []
   },
   'GENERIC': {
      '360 Hours': [
         {
            id: 'tg1', sequence: 1, group: 'General', component: 'Inspección Visual', activity: 'Control General',
            estimatedTime: 30,
            actionFlags: { ...MOCK_FLAGS, inspect: true }
         }
      ],
      '1080 Hours': []
   }
};

// Mock Spare Parts for Selection
const MOCK_SPARE_PARTS: SparePart[] = [
   { id: 'sp1', sku: '589635', name: 'Tornillo M8x20', currentStock: 100, minimumStock: 10, unitCost: 1.5, supplier: 'Wurth', leadTimeDays: 1 },
   { id: 'sp2', sku: '602111', name: 'Rodamiento 6205', currentStock: 10, minimumStock: 2, unitCost: 12.50, supplier: 'SKF', leadTimeDays: 3 },
   { id: 'sp3', sku: '998822', name: 'Aceite Hidráulico', currentStock: 50, minimumStock: 10, unitCost: 5.00, supplier: 'Shell', leadTimeDays: 2 },
   { id: 'sp4', sku: '100200', name: 'Sello Viton', currentStock: 20, minimumStock: 5, unitCost: 8.20, supplier: 'Generic', leadTimeDays: 5 },
];

// --- 2. ZOD VALIDATION SCHEMAS (State Guards) ---

const SchemaStage1 = z.object({
   machineId: z.string().min(1, "Machine is required"),
   interval: z.string().min(1, "Interval is required"),
   priority: z.nativeEnum(Priority)
});

const SchemaStage2 = z.object({
   startTime: z.string().min(1, "Start time is required"),
   endTime: z.string().min(1, "End time is required"),
   executors: z.array(z.object({
      name: z.string().min(1),
      position: z.string()
   })).min(1, "At least one technician is required"),
   tasks: z.array(z.object({
      completed: z.literal(true, { errorMap: () => ({ message: "All tasks must be completed" }) })
   }))
});

interface MaintenanceFormProps {
   type: 'R-MANT-02' | 'R-MANT-05';
   machines: Machine[];
   technicians: Technician[];
   onSave: (order: WorkOrder) => void;
   onSaveAndStay?: (order: WorkOrder) => void;
   onCancel: () => void;
   initialMachineId?: string;
   initialData?: Partial<WorkOrder>;
}

export const MaintenanceForm: React.FC<MaintenanceFormProps> = ({
   type,
   machines,
   technicians,
   onSave,
   onSaveAndStay,
   onCancel,
   initialMachineId,
   initialData
}) => {
   const { t } = useLanguage();
   const { user, hasRole } = useAuth(); // RBAC Context

   // -- STATE MANAGEMENT --
   const [formData, setFormData] = useState<Partial<WorkOrder>>({
      formType: type,
      status: WorkOrderStatus.BACKLOG,
      currentStage: WorkOrderStage.DRAFT,
      priority: Priority.MEDIUM,
      createdDate: new Date().toISOString(),
      maintenanceType: 'Preventive',
      checklist: { pointClean: null, areaClean: null, guardsComplete: null, toolsRemoved: null, greaseCleaned: null, safetyActivated: null },
      consumedParts: [],
      executors: [{ name: '', lastName: '', position: '' }],
      tasks: [],
      totalMaintenanceCost: 0
   });

   const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
   const [validationError, setValidationError] = useState<string | null>(null);
   const [duration, setDuration] = useState<string>('0h 0m');
   const [editingSection, setEditingSection] = useState<number | null>(null);

   // Helper UI renderers - Defined early to avoid TDZ and usage in handlers
   const isSection1Editable = (formData.currentStage === WorkOrderStage.DRAFT || editingSection === 1) && hasRole([UserRole.ADMIN_SOLICITANTE]);
   // Allow editing section 2 in DRAFT, REQUESTED, EXECUTION
   const isSection2Editable = ((formData.currentStage === WorkOrderStage.DRAFT || formData.currentStage === WorkOrderStage.EXECUTION || formData.currentStage === WorkOrderStage.REQUESTED) || editingSection === 2) && hasRole([UserRole.TECNICO_MANT, UserRole.ADMIN_SOLICITANTE]);

   console.log('DEBUG: MaintenanceForm Render', {
      stage: formData.currentStage,
      role: user?.role,
      isSection2Editable,
      tasksCount: formData.tasks?.length
   });

   const isSection3Editable = (formData.currentStage === WorkOrderStage.HANDOVER || editingSection === 3) && hasRole([UserRole.ADMIN_SOLICITANTE]);


   // -- INITIALIZATION EFFECT --
   useEffect(() => {
      if (initialMachineId) {
         const machine = machines.find(m => m.id === initialMachineId);
         if (machine) {
            handleMachineChange(machine.id);
         }
      }
      if (initialData) {
         setFormData(prev => ({ ...prev, ...initialData, formType: type }));

         // If it's a new form coming from Map but with machine ID, we might need logic.
         // But if it's an existing order (has ID), we just load it.
         const machineIdToUse = initialData.machineId || initialMachineId;

         if (machineIdToUse) {
            const machine = machines.find(m => m.id === machineIdToUse);
            setSelectedMachine(machine);

            // If we have an interval but NO tasks (e.g. fresh from map), generate tasks.
            // If we are editing an existing record, tasks should already be in initialData.
            if (initialData.interval && (!initialData.tasks || initialData.tasks.length === 0)) {
               const machine = machines.find(m => m.id === machineIdToUse);
               if (machine) {
                  // Pass the machine ID to generate tasks from the store
                  const tasks = generateCumulativeTasks(machine.id, machine.type, initialData.interval);
                  setFormData(prev => ({ ...prev, tasks }));
               }
            }
         }
      }
   }, [initialMachineId, initialData]);

   // Access store
   // Access store
   const { maintenancePlans } = useMasterStore();

   // -- LOGIC ENGINE: Cumulative Tasks --
   const generateCumulativeTasks = (machineId: string, machineType: string, selectedInterval: string): MaintenanceTask[] => {
      // 1. Try to find a specific plan for this machine
      const specificPlan = maintenancePlans.find(p => p.machineId === machineId);

      if (specificPlan) {
         // Dynamic Logic based on Maintenance Module
         // Find the target interval object to get its hours
         const targetInterval = specificPlan.intervals.find(i => i.label === selectedInterval);
         if (!targetInterval) return [];

         const targetHours = targetInterval.hours;

         // Filter intervals <= targetHours and Sort by hours ASC
         const relevantIntervals = specificPlan.intervals
            .filter(i => i.hours <= targetHours)
            .sort((a, b) => a.hours - b.hours);

         // Flatten tasks
         // Note: references, estimatedTime etc are already in tasks.
         // We add a unique ID to avoid collisions if we were to have same task in multiple (unlikely but possible logic)
         // But mainly we tag them with intervalOrigin
         let cumulativeTasks: MaintenanceTask[] = [];

         relevantIntervals.forEach(interval => {
            const labeledTasks = interval.tasks.map(t => ({
               ...t,
               id: `t-${interval.id}-${t.id}-${Math.random().toString(36).substr(2, 5)}`, // Ensure unique ID for this instance
               intervalOrigin: interval.label,
               completed: false
            }));
            cumulativeTasks = [...cumulativeTasks, ...labeledTasks];
         });

         return cumulativeTasks;
      } else {
         // Fallback to legacy hardcoded logic if no plan exists
         const selectedIndex = INTERVAL_HIERARCHY.indexOf(selectedInterval);
         if (selectedIndex === -1) return [];

         let tasks: MaintenanceTask[] = [];

         for (let i = 0; i <= selectedIndex; i++) {
            const intervalLabel = INTERVAL_HIERARCHY[i];
            const protocolSet = MAINTENANCE_PROTOCOLS[machineType] || MAINTENANCE_PROTOCOLS['GENERIC'];
            const sourceTasks = protocolSet[intervalLabel] || [];

            const newTasks = sourceTasks.map(t => ({
               ...t,
               id: `t-${intervalLabel.replace(/\s/g, '')}-${t.id}-${Math.random().toString(36).substr(2, 5)}`,
               intervalOrigin: intervalLabel,
               completed: false
            }));

            tasks = [...tasks, ...newTasks];
         }
         return tasks;
      }
   };

   const handleTaskToggle = (taskId: string, action: string) => {
      console.log('DEBUG: handleTaskToggle called', { taskId, action, isSection2Editable });
      // Only allow toggle if editable
      if (!isSection2Editable) {
         console.warn('DEBUG: Toggle blocked because isSection2Editable is false');
         return;
      }

      setFormData(prev => {
         const tasks = prev.tasks?.map(t => {
            if (t.id === taskId) {
               const newChecks = { ...(t.checks || {}), [action]: !t.checks?.[action] };

               // Check if all required actions are done
               const requiredActions = Object.keys(t.actionFlags).filter(k => t.actionFlags[k as keyof typeof t.actionFlags] === true);
               const isComplete = requiredActions.every(k => newChecks[k] === true);

               return { ...t, checks: newChecks, completed: isComplete };
            }
            return t;
         });
         return { ...prev, tasks };
      });
   };

   // -- LOGIC ENGINE: Time Calculation --
   useEffect(() => {
      if (formData.startTime && formData.endTime) {
         // Mock calculation for demo purposes since we are storing just Time Strings (HH:MM)
         // In prod, use full ISO strings.
         const startParts = formData.startTime.split(':');
         const endParts = formData.endTime.split(':');

         if (startParts.length === 2 && endParts.length === 2) {
            let startMin = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
            let endMin = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

            if (endMin < startMin) endMin += 24 * 60; // Cross midnight

            const diff = endMin - startMin;
            const hours = Math.floor(diff / 60);
            const mins = diff % 60;
            setDuration(`${hours}h ${mins}m`);
         }
      }
   }, [formData.startTime, formData.endTime]);

   // -- HANDLERS --

   const handleMachineChange = (machineId: string) => {
      const machine = machines.find(m => m.id === machineId);
      setSelectedMachine(machine);
      // Don't overwrite ID if we are just changing machine on a draft, but typically we shouldn't change machine on existing order.
      setFormData(prev => ({
         ...prev,
         machineId: machineId,
         machinePlate: machine?.plate || '',
         interval: prev.interval || '',
         tasks: prev.tasks || []
      }));
   };

   const handleIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const interval = e.target.value;
      if (!selectedMachine) return;

      const tasks = generateCumulativeTasks(selectedMachine.id, selectedMachine.type, interval);
      setFormData(prev => ({
         ...prev,
         interval: interval,
         tasks: tasks
      }));
   };

   const handleInternalSave = (order: WorkOrder, stay: boolean = false) => {
      const orderToSave = { ...order };
      if (!orderToSave.title || orderToSave.title.trim() === '') {
         const machine = machines.find(m => m.id === orderToSave.machineId);
         const machineName = machine ? (machine.alias || machine.name) : 'Unknown Machine';

         if (type === 'R-MANT-02') {
            orderToSave.title = `${t('mant02.formTitle')} - ${machineName} - ${orderToSave.interval || 'N/A'}`;
         } else {
            const desc = orderToSave.description || 'Reporte de Falla';
            orderToSave.title = `Correctivo - ${machineName} - ${desc.substring(0, 30)}`;
         }
      }
      if (stay && onSaveAndStay) {
         onSaveAndStay(orderToSave);
      } else {
         onSave(orderToSave);
      }
   };

   const saveProgress = () => {
      // Save without closing or changing stage
      const orderToSave = {
         ...formData,
         id: formData.id || `WO-${Date.now()}` // Generate ID if it's the first save
      } as WorkOrder;

      handleInternalSave(orderToSave, false); // False = Close (Navigate back)
   };

   // -- STATE MACHINE TRANSITIONS --

   const transitionToRequested = () => {
      // RBAC: Only Admin
      if (!hasRole([UserRole.ADMIN_SOLICITANTE])) {
         setValidationError("Access Denied: Only Admins can request maintenance.");
         return;
      }

      // Validation
      const result = SchemaStage1.safeParse(formData);
      if (!result.success) {
         setValidationError("Please fill all required fields in Section 1.");
         return;
      }

      const updated = {
         ...formData,
         currentStage: WorkOrderStage.REQUESTED,
         status: WorkOrderStatus.BACKLOG
      };
      setFormData(updated);
      setValidationError(null);
      // Auto save on transition
      handleInternalSave({ ...updated, id: formData.id || `WO-${Date.now()}` } as WorkOrder, true);
   };

   const startExecution = () => {
      // RBAC: Tech or Admin
      if (!hasRole([UserRole.TECNICO_MANT, UserRole.ADMIN_SOLICITANTE])) return;

      const updated = {
         ...formData,
         currentStage: WorkOrderStage.EXECUTION,
         status: WorkOrderStatus.IN_PROGRESS,
         startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      };
      setFormData(updated);
      handleInternalSave({ ...updated, id: formData.id || `WO-${Date.now()}` } as WorkOrder, true);
   };

   const finishExecution = () => {
      // RBAC: Tech or Admin
      if (!hasRole([UserRole.TECNICO_MANT, UserRole.ADMIN_SOLICITANTE])) return;

      // Validate Task Completion
      const pendingTasks = formData.tasks?.filter(t => !t.completed).length || 0;
      if (pendingTasks > 0) {
         setValidationError(`Cannot finish: ${pendingTasks} tasks are pending.`);
         return;
      }

      const updated = {
         ...formData,
         currentStage: WorkOrderStage.HANDOVER,
         status: WorkOrderStatus.REVIEW,
         endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      };
      setFormData(updated);
      setValidationError(null);
      handleInternalSave({ ...updated, id: formData.id || `WO-${Date.now()}` } as WorkOrder, true);
   };

   const closeWorkOrder = () => {
      // RBAC: Only Admin/Solicitante can sign off
      if (!hasRole([UserRole.ADMIN_SOLICITANTE])) {
         setValidationError("Access Denied: Only Supervisors can sign off and close ticket.");
         return;
      }

      const newOrder = {
         ...formData,
         id: formData.id || `WO-${Date.now()}`, // Preserve ID if exists
         status: WorkOrderStatus.DONE,
         currentStage: WorkOrderStage.CLOSED,
         completedDate: new Date().toISOString()
      } as WorkOrder;

      handleInternalSave(newOrder);
   };

   const signSupervisor = () => {
      if (!isSection3Editable) return;
      if (formData.signatureSupervisor) return; // Already signed

      setFormData(prev => ({
         ...prev,
         signatureSupervisor: user?.full_name || 'Admin User',
         signatureSupervisorDate: new Date().toISOString()
      }));
   };

   return (
      <div className="h-full bg-industrial-900 flex flex-col overflow-hidden animate-fadeIn">
         {/* Top Bar */}
         <div className="p-4 border-b border-industrial-800 bg-industrial-900 flex justify-between items-center shrink-0">
            <div>
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {type === 'R-MANT-02' ? t('mant02.formTitle') : 'Corrective Action Report'}
                  <span className="text-sm font-mono text-industrial-500 ml-2">{formData.id ? `ID: ${formData.id}` : '(New)'}</span>
               </h2>
               {/* Status Pills */}
               <div className="flex gap-2 text-xs mt-1 items-center">
                  <div className={`px-2 py-0.5 rounded transition-colors font-bold ${formData.currentStage === WorkOrderStage.DRAFT || formData.currentStage === WorkOrderStage.REQUESTED ? 'bg-emerald-500 text-white' : 'bg-industrial-800 text-industrial-500'}`}>
                     1. Solicitud
                  </div>
                  <span className="text-industrial-600">→</span>
                  <div className={`px-2 py-0.5 rounded transition-colors font-bold ${formData.currentStage === WorkOrderStage.EXECUTION ? 'bg-pink-500 text-white' : 'bg-industrial-800 text-industrial-500'}`}>
                     2. Ejecución
                  </div>
                  <span className="text-industrial-600">→</span>
                  <div className={`px-2 py-0.5 rounded transition-colors font-bold ${formData.currentStage === WorkOrderStage.HANDOVER ? 'bg-emerald-500 text-white' : 'bg-industrial-800 text-industrial-500'}`}>
                     3. Supervisión
                  </div>
                  <span className="text-industrial-600">→</span>
                  <div className={`px-2 py-0.5 rounded transition-colors font-bold ${formData.currentStage === WorkOrderStage.CLOSED ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-industrial-800 text-industrial-500'}`}>
                     4. Cerrado
                  </div>
               </div>
            </div>
            <button onClick={onCancel} className="text-industrial-400 hover:text-white"><X className="w-6 h-6" /></button>
         </div>

         {/* Global Validation Error Banner */}
         {validationError && (
            <div className="bg-red-900/50 border-b border-red-500/50 p-2 flex items-center justify-center gap-2 text-red-200 text-sm animate-pulse">
               <AlertCircle size={16} /> {validationError}
            </div>
         )}

         <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8">

               {/* =====================================================================================
              SECTION 1: REQUEST (GREEN)
              Context: Solicitante / Gerente fills this to create the request.
          ===================================================================================== */}
               <section className={`rounded-lg border-2 transition-all duration-300 ${isSection1Editable
                  ? 'bg-emerald-900/10 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                  : 'bg-industrial-900 border-industrial-700'
                  }`}>
                  <div className={`p-4 border-b flex justify-between items-center ${isSection1Editable ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-industrial-800 border-industrial-700'}`}>
                     <h3 className={`${isSection1Editable ? 'text-emerald-400' : 'text-industrial-400'} font-bold flex items-center gap-2`}>
                        1. Solicitud de Mantenimiento {!isSection1Editable && <Lock size={14} />}
                     </h3>
                     {!isSection1Editable && hasRole([UserRole.ADMIN_SOLICITANTE]) && (
                        <button onClick={() => setEditingSection(1)} className="bg-emerald-900/50 hover:bg-emerald-800 text-emerald-400 px-4 py-2 rounded text-sm font-bold transition-colors border border-emerald-500/30">
                           Editar
                        </button>
                     )}
                     {editingSection === 1 && (
                        <button onClick={() => { setEditingSection(null); handleInternalSave(formData, true); }} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-sm font-bold transition-colors shadow-lg">
                           Guardar
                        </button>
                     )}
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                     {/* 1. Order Number (Auto) */}
                     <div className="space-y-1">
                        <label className="text-xs text-industrial-400 font-bold">Número de Orden</label>
                        <input type="text" readOnly disabled className="w-full bg-industrial-900/50 border border-industrial-700 rounded p-2 text-industrial-300 text-sm font-mono"
                           value={formData.id || 'ORD-XXX'} />
                     </div>

                     {/* 2. Maintenance Type */}
                     <div className="space-y-1">
                        <label className="text-xs text-industrial-400 font-bold">Tipo de Mantenimiento</label>
                        <select disabled={!isSection1Editable}
                           className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm focus:border-emerald-500 outline-none"
                           value={formData.maintenanceType || 'Preventive'}
                           onChange={e => setFormData({ ...formData, maintenanceType: e.target.value as any })}>
                           <option value="Preventive">Preventivo</option>
                           <option value="Programmed">Programado</option>
                        </select>
                     </div>

                     {/* 3. Machine Search (Alias) */}
                     <div className="space-y-1">
                        <label className="text-xs text-industrial-400 font-bold">{t('form.machine')} (Nombre o Alias)</label>
                        <div className="relative">
                           <input
                              list="machine-list"
                              disabled={!isSection1Editable}
                              className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm focus:border-emerald-500 outline-none placeholder-industrial-600"
                              placeholder="Buscar equipo..."
                              value={selectedMachine ? `${selectedMachine.name} (Alias: ${selectedMachine.alias || 'N/A'})` : ''}
                              onChange={(e) => {
                                 // Simple input handling to allow clearing, but actual selection depends on datalist
                                 if (e.target.value === '') handleMachineChange('');
                              }}
                              onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
                                 // Try to find match in list
                                 const val = e.target.value;
                                 const match = machines.find(m => `${m.name} (Alias: ${m.alias || 'N/A'})` === val || m.plate === val);
                                 if (match) handleMachineChange(match.id);
                              }}
                           />
                           <datalist id="machine-list">
                              {machines.map(m => (
                                 <option key={m.id} value={`${m.name} (Alias: ${m.alias || 'N/A'})`}>
                                    Placa: {m.plate}
                                 </option>
                              ))}
                           </datalist>
                        </div>
                     </div>

                     {/* 4. License Plate (Auto) */}
                     <div className="space-y-1">
                        <label className="text-xs text-industrial-400 font-bold">{t('form.plate')}</label>
                        <input type="text" readOnly className="w-full bg-industrial-900/50 border border-industrial-700 rounded p-2 text-industrial-300 text-sm" value={selectedMachine?.plate || ''} />
                     </div>

                     {/* 5. Start Date (Calendar) */}
                     <div className="space-y-1">
                        <label className="text-xs text-industrial-400 font-bold">Fecha de Inicio</label>
                        <input
                           type="date"
                           disabled={!isSection1Editable}
                           className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm focus:border-emerald-500 outline-none"
                           value={formData.startDate || new Date().toISOString().split('T')[0]}
                           onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        />
                     </div>

                     {/* 6. Interval Selection */}
                     <div className="space-y-1">
                        <label className="text-xs text-industrial-400 font-bold">{t('mant02.interval')}</label>
                        <select disabled={!isSection1Editable || !selectedMachine}
                           className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm disabled:opacity-50"
                           value={formData.interval || ''} onChange={handleIntervalChange}>
                           <option value="">- Seleccionar Programa -</option>
                           {(() => {
                              const plan = maintenancePlans.find(p => p.machineId === selectedMachine?.id);
                              // Prioritize Configured Plans -> Legacy Machine Intervals -> Hardcoded Hierarchy
                              const intervals = plan?.intervals.map(i => i.label)
                                 || (selectedMachine?.intervals && selectedMachine.intervals.length > 0 ? selectedMachine.intervals : INTERVAL_HIERARCHY);

                              return intervals.map(int => <option key={int} value={int}>{int}</option>);
                           })()}
                        </select>
                     </div>

                     {/* 7. Current Hours (Formatted) */}
                     <div className="space-y-1">
                        <label className="text-xs text-industrial-400 font-bold">Horas de Trabajo Máquina</label>
                        <input
                           type="text"
                           readOnly
                           className="w-full bg-industrial-900/50 border border-industrial-700 rounded p-2 text-industrial-300 text-sm font-mono text-right"
                           value={selectedMachine?.runningHours ? selectedMachine.runningHours.toLocaleString('en-US') : '0'}
                        />
                     </div>

                     {/* 8. Next Maintenance Hours (Formatted) */}
                     <div className="space-y-1">
                        <label className="text-xs text-industrial-400 font-bold text-emerald-400">Horas Próximo Mantenimiento</label>
                        <input
                           type="text"
                           readOnly
                           className="w-full bg-industrial-900/50 border border-industrial-700 rounded p-2 text-emerald-400 font-bold text-sm font-mono text-right"
                           value={selectedMachine?.runningHours ? (selectedMachine.runningHours + 360).toLocaleString('en-US') : '0'}
                        />
                     </div>

                     {/* 9. Executor (Filtered) */}
                     <div className="space-y-1">
                        <label className="text-xs text-industrial-400 font-bold">Ejecutante (Técnico)</label>
                        <select disabled={!isSection1Editable}
                           className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm focus:border-emerald-500 outline-none"
                           value={formData.assignedMechanic || ''}
                           onChange={e => setFormData({ ...formData, assignedMechanic: e.target.value })}>
                           <option value="">- Seleccionar Técnico -</option>
                           {technicians.filter(t => t.role === UserRole.TECNICO_MANT).map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                           ))}
                        </select>
                     </div>

                     {/* 10. Supervisor (Filtered) */}
                     <div className="space-y-1">
                        <label className="text-xs text-industrial-400 font-bold">Supervisor</label>
                        <select disabled={!isSection1Editable}
                           className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm focus:border-emerald-500 outline-none"
                           value={formData.supervisor || ''}
                           onChange={e => setFormData({ ...formData, supervisor: e.target.value })}>
                           <option value="">- Seleccionar Supervisor -</option>
                           {technicians.filter(t => t.role === 'SUPERVISOR' || t.role === UserRole.ADMIN_SOLICITANTE).map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                           ))}
                        </select>
                     </div>

                  </div>

                  {isSection1Editable && (
                     <div className="p-4 border-t border-emerald-500/30 flex justify-end gap-3">
                        <button type="button" onClick={saveProgress} className="text-emerald-400 hover:text-white px-4 py-2 text-sm font-medium">
                           Guardar Borrador
                        </button>
                        <button type="button" onClick={transitionToRequested} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded font-bold shadow-lg transition-colors flex items-center gap-2">
                           Solicitar Mantenimiento <ArrowRight size={16} />
                        </button>
                     </div>
                  )}
               </section>


               {/* =====================================================================================
              SECTION 2: EXECUTION (PINK)
              Context: Maintenance Tech performs tasks, logs parts, and times.
          ===================================================================================== */}
               <section className={`rounded-lg border-2 transition-all duration-300 ${isSection2Editable
                  ? 'bg-pink-900/10 border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.1)]'
                  : 'bg-industrial-900 border-industrial-700'
                  }`}>
                  <div className={`p-4 border-b flex justify-between items-center ${isSection2Editable ? 'bg-pink-900/20 border-pink-500/30' : 'bg-industrial-800 border-industrial-700'}`}>
                     <h3 className={`${isSection2Editable ? 'text-pink-400' : 'text-industrial-400'} font-bold flex items-center gap-2`}>
                        2. Intervenciones de Mantenimiento {!isSection2Editable && <Lock size={14} />}
                     </h3>
                     <div className="flex gap-2">
                        {formData.currentStage === WorkOrderStage.REQUESTED && hasRole([UserRole.TECNICO_MANT, UserRole.ADMIN_SOLICITANTE]) && (
                           <button onClick={startExecution} className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-1 rounded text-sm font-bold flex items-center gap-1 animate-pulse">
                              <PlayCircle size={14} /> Iniciar Trabajo
                           </button>
                        )}
                        {!isSection2Editable && hasRole([UserRole.ADMIN_SOLICITANTE, UserRole.TECNICO_MANT]) && (
                           <button onClick={() => setEditingSection(2)} className="bg-pink-900/50 hover:bg-pink-800 text-pink-400 px-4 py-2 rounded text-sm font-bold transition-colors border border-pink-500/30">
                              Editar
                           </button>
                        )}
                        {editingSection === 2 && (
                           <button onClick={() => { setEditingSection(null); handleInternalSave(formData, true); }} className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded text-sm font-bold transition-colors shadow-lg">
                              Guardar
                           </button>
                        )}
                     </div>
                  </div>

                  <div className={`p-6`}>
                     {/* Time & Duration */}
                     <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-industrial-900 p-3 rounded border border-industrial-700">
                           <span className="text-xs text-industrial-500 block">Hora Inicio</span>
                           <span className="text-xl font-mono text-white">{formData.startTime || '--:--'}</span>
                        </div>
                        <div className="bg-industrial-900 p-3 rounded border border-industrial-700">
                           <span className="text-xs text-industrial-500 block">Hora Fin</span>
                           <span className="text-xl font-mono text-white">{formData.endTime || '--:--'}</span>
                        </div>
                        <div className="bg-industrial-900 p-3 rounded border border-industrial-700">
                           <span className="text-xs text-industrial-500 block flex items-center gap-1"><Clock size={10} /> Duración</span>
                           <span className="text-xl font-mono text-pink-400">{duration}</span>
                        </div>
                     </div>

                     {/* Tasks List (Inherited) */}
                     {type === 'R-MANT-02' && (
                        <div className="mb-6">
                           <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><CheckSquare size={14} className="text-pink-500" /> Tareas de Mantenimiento Acumuladas</h4>
                           <div className="bg-industrial-900 rounded border border-industrial-700 overflow-hidden">
                              {/* New Protocol Viewer */}
                              {/* New Protocol Viewer - Grouped by Interval Origin */}
                              {formData.tasks && formData.tasks.length > 0 ? (
                                 Array.from(new Set(formData.tasks.map(t => t.intervalOrigin))).map(origin => (
                                    <div key={origin} className="mb-8 last:mb-0">
                                       <h5 className="text-industrial-300 font-bold mb-2 border-b border-industrial-700 pb-1 text-xs uppercase tracking-wider">
                                          {origin || 'Tareas Generales'}
                                       </h5>
                                       <ProtocolViewer
                                          tasks={formData.tasks?.filter(t => t.intervalOrigin === origin) || []}
                                          readOnly={!isSection2Editable}
                                          onToggle={handleTaskToggle}
                                       />
                                    </div>
                                 ))
                              ) : (
                                 <div className="text-center p-4 text-industrial-500 italic">No tasks generated.</div>
                              )}

                              {/* Temporary explicit completion override for demo since Viewer is read-only for now */}
                              {isSection2Editable && formData.tasks && formData.tasks.length > 0 && (
                                 <div className="p-2 bg-industrial-800 border-t border-industrial-700 flex justify-end">
                                    <button
                                       onClick={() => {
                                          const updated = formData.tasks?.map(t => ({ ...t, completed: true }));
                                          setFormData({ ...formData, tasks: updated });
                                       }}
                                       className="text-xs text-emerald-400 hover:text-emerald-300 underline"
                                    >
                                       Mark All Tasks Completed (Demo Shortcut)
                                    </button>
                                 </div>
                              )}
                           </div>
                        </div>
                     )}

                     {/* Executors (Multiple) */}
                     <div className="mb-6">
                        <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><User size={14} className="text-pink-500" /> Personal Ejecutante</h4>
                        {formData.executors?.map((exec, idx) => (
                           <div key={idx} className="grid grid-cols-2 gap-2 mb-2 items-center">
                              <select
                                 disabled={!isSection2Editable}
                                 className="bg-industrial-900 border border-industrial-700 rounded p-2 text-xs text-white focus:border-pink-500 outline-none"
                                 value={technicians.find(t => t.name === exec.name)?.id || ''}
                                 onChange={(e) => {
                                    const tech = technicians.find(t => t.id === e.target.value);
                                    if (tech) {
                                       const updated = [...(formData.executors || [])];
                                       updated[idx] = { name: tech.name, lastName: '', position: tech.role };
                                       setFormData({ ...formData, executors: updated });
                                    }
                                 }}
                              >
                                 <option value="">Select Technician...</option>
                                 {technicians.map(t => <option key={t.id} value={t.id}>{t.name} ({t.role})</option>)}
                              </select>
                              <input type="text" readOnly disabled className="bg-industrial-900/50 border border-industrial-700 rounded p-2 text-xs text-industrial-400 cursor-not-allowed" value={exec.position} />
                           </div>
                        ))}
                        {isSection2Editable && (
                           <button type="button" onClick={() => setFormData(p => ({ ...p, executors: [...(p.executors || []), { name: '', lastName: '', position: '' }] }))} className="text-xs text-pink-400 flex items-center gap-1"><Plus size={12} /> Add Tech</button>
                        )}
                     </div>
                  </div>

                  {isSection2Editable && (
                     <div className="p-4 border-t border-pink-500/30 flex justify-end gap-3">
                        <button type="button" onClick={saveProgress} className="text-pink-400 hover:text-white px-4 py-2 text-sm font-medium">
                           Guardar Progreso
                        </button>
                        <button type="button" onClick={finishExecution} className="bg-pink-600 hover:bg-pink-500 text-white px-6 py-2 rounded font-bold shadow-lg transition-colors flex items-center gap-2">
                           Finalizar Ejecución <CheckCircle size={16} />
                        </button>
                     </div>
                  )}
               </section>

               {/* =====================================================================================
              SECTION 3: HANDOVER & CLOSE (GREEN)
              Context: Supervisor review, checklist, and signature.
          ===================================================================================== */}
               <section className={`rounded-lg border-2 transition-all duration-300 ${isSection3Editable
                  ? 'bg-emerald-900/10 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                  : 'bg-industrial-900 border-industrial-700'
                  }`}>
                  <div className={`p-4 border-b flex justify-between items-center ${isSection3Editable ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-industrial-800 border-industrial-700'}`}>
                     <h3 className={`${isSection3Editable ? 'text-emerald-400' : 'text-industrial-400'} font-bold flex items-center gap-2`}>
                        3. Cierre y Entrega {!isSection3Editable && <Lock size={14} />}
                     </h3>
                     {!isSection3Editable && hasRole([UserRole.ADMIN_SOLICITANTE]) && formData.currentStage === WorkOrderStage.CLOSED && (
                        <button onClick={() => setEditingSection(3)} className="bg-emerald-900/50 hover:bg-emerald-800 text-emerald-400 px-4 py-2 rounded text-sm font-bold transition-colors border border-emerald-500/30">
                           Editar
                        </button>
                     )}
                     {editingSection === 3 && (
                        <button onClick={() => { setEditingSection(null); handleInternalSave(formData, true); }} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-sm font-bold transition-colors shadow-lg">
                           Guardar
                        </button>
                     )}
                  </div>

                  <div className={`p-6`}>
                     <div className="mb-6">
                        <h4 className="text-sm font-bold text-white mb-4 uppercase">{t('mant02.checklist.title')}</h4>
                        <div className="space-y-1">
                           {['pointClean', 'areaClean', 'guardsComplete', 'toolsRemoved', 'safetyActivated'].map((key) => (
                              <div key={key} className="flex justify-between py-2 border-b border-industrial-700/50 items-center">
                                 <span className="text-sm text-industrial-300">{t(`mant02.check.${key === 'pointClean' ? '1' : '2'}`)} (Mock Label)</span>
                                 <div className="flex gap-4">
                                    <label className={`flex items-center gap-2 px-2 py-1 rounded ${!isSection3Editable && formData.checklist?.[key as keyof typeof formData.checklist] === true ? 'bg-emerald-900/50 border border-emerald-500/50' : ''}`}>
                                       <input
                                          type="radio"
                                          disabled={!isSection3Editable}
                                          name={key}
                                          checked={formData.checklist?.[key as keyof typeof formData.checklist] === true}
                                          onChange={() => setFormData(p => ({ ...p, checklist: { ...p.checklist, [key]: true } }))}
                                          className={`${!isSection3Editable ? 'accent-emerald-500 opacity-100' : ''}`}
                                       />
                                       <span className={`${!isSection3Editable && formData.checklist?.[key as keyof typeof formData.checklist] === true ? 'text-emerald-400 font-bold' : ''}`}>Si</span>
                                    </label>
                                    <label className={`flex items-center gap-2 px-2 py-1 rounded ${!isSection3Editable && formData.checklist?.[key as keyof typeof formData.checklist] === false ? 'bg-red-900/50 border border-red-500/50' : ''}`}>
                                       <input
                                          type="radio"
                                          disabled={!isSection3Editable}
                                          name={key}
                                          checked={formData.checklist?.[key as keyof typeof formData.checklist] === false}
                                          onChange={() => setFormData(p => ({ ...p, checklist: { ...p.checklist, [key]: false } }))}
                                          className={`${!isSection3Editable ? 'accent-red-500 opacity-100' : ''}`}
                                       />
                                       <span className={`${!isSection3Editable && formData.checklist?.[key as keyof typeof formData.checklist] === false ? 'text-red-400 font-bold' : ''}`}>No</span>
                                    </label>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>

                     {/* Signatures */}
                     <div className="grid grid-cols-2 gap-8 mt-8">
                        <div>
                           <label className="text-xs text-industrial-400 font-bold mb-2 block">Firma Supervisor (Conformidad)</label>
                           <div
                              onClick={signSupervisor}
                              className={`h-24 bg-white/5 rounded border-2 border-dashed ${isSection3Editable && !formData.signatureSupervisor ? 'border-emerald-500/50 cursor-pointer hover:bg-white/10' : 'border-industrial-600'} flex items-center justify-center flex-col gap-1 transition-colors`}
                           >
                              {formData.signatureSupervisor ? (
                                 <>
                                    <span className="text-emerald-400 font-script text-xl">{formData.signatureSupervisor}</span>
                                    <span className="text-xs text-industrial-500">{new Date(formData.signatureSupervisorDate!).toLocaleDateString()}</span>
                                 </>
                              ) : (
                                 <span className="text-xs text-industrial-500">
                                    {isSection3Editable ? 'Click to Sign' : 'Pending Signature'}
                                 </span>
                              )}
                           </div>
                        </div>
                     </div>
                  </div>

                  {isSection3Editable && (
                     <div className="p-4 border-t border-emerald-500/30 flex justify-end gap-4">
                        <button onClick={() => setFormData(p => ({ ...p, currentStage: WorkOrderStage.EXECUTION, status: WorkOrderStatus.IN_PROGRESS }))} className="text-industrial-400 hover:text-white text-sm underline">
                           Rechazar (Volver a Ejecución)
                        </button>
                        <button onClick={closeWorkOrder} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded font-bold shadow-lg transition-colors flex items-center gap-2">
                           Cerrar Mantenimiento <Save size={16} />
                        </button>
                     </div>
                  )}
               </section>

            </div>
         </div>
      </div>
   );
};
