
import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { WorkOrder, Machine, Technician, Priority, WorkOrderStatus, SparePart, WorkOrderStage, MaintenanceTask, UserRole } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Save, X, CheckSquare, Plus, Trash2, Lock, PlayCircle, CheckCircle, ArrowRight, Settings, User, Clock, AlertCircle } from 'lucide-react';

// --- 1. CONFIGURATION & MASTER DATA ENGINE ---

// Hierarchy: If I select '2160 Hours', I must perform '360' and '1080' tasks too.
const INTERVAL_HIERARCHY = ['360 Hours', '1080 Hours', '2160 Hours', '4320 Hours', '8640 Hours'];

// Master Task Database (Simulating a DB Table: maintenance_protocols)
const MAINTENANCE_PROTOCOLS: Record<string, Record<string, string[]>> = {
  'SACMI': {
    '360 Hours': ['Engrase general de columna central', 'Limpieza de sensores de visión', 'Verificar presión neumática (6 bar)'],
    '1080 Hours': ['Cambio de aceite hidráulico (Nivel 1)', 'Reapriete de tornillería de molde', 'Inspección de bandas transportadoras'],
    '2160 Hours': ['Sustitución de rodamientos de carrusel', 'Calibración de cámaras de inspección', 'Prueba de fugas en sellos rotativos']
  },
  'MOSS': {
    '360 Hours': ['Limpieza de cabezales de impresión', 'Verificar tinta y solvente'],
    '1080 Hours': ['Cambio de filtros de tinta', 'Ajuste de lámparas UV'],
    '2160 Hours': ['Reemplazo de servomotores eje X', 'Alineación de rodillos']
  },
  'GENERIC': {
    '360 Hours': ['Inspección visual general', 'Limpieza externa'],
    '1080 Hours': ['Revisión eléctrica básica', 'Lubricación de partes móviles']
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
  onCancel: () => void;
  initialMachineId?: string;
  initialData?: Partial<WorkOrder>;
}

export const MaintenanceForm: React.FC<MaintenanceFormProps> = ({ 
  type, 
  machines, 
  technicians, 
  onSave, 
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

  const [selectedMachine, setSelectedMachine] = useState<Machine | undefined>(undefined);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [duration, setDuration] = useState<string>('0h 0m');

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
                if (machine) {
                    const tasks = generateCumulativeTasks(machine.type, initialData.interval);
                    setFormData(prev => ({ ...prev, tasks }));
                }
             }
        }
    }
  }, [initialMachineId, initialData]);

  // -- LOGIC ENGINE: Cumulative Tasks --
  const generateCumulativeTasks = (machineType: string, selectedInterval: string): MaintenanceTask[] => {
    const selectedIndex = INTERVAL_HIERARCHY.indexOf(selectedInterval);
    if (selectedIndex === -1) return [];

    let tasks: MaintenanceTask[] = [];
    const protocolSet = MAINTENANCE_PROTOCOLS[machineType] || MAINTENANCE_PROTOCOLS['GENERIC'];

    // Cumulative Loop: Add tasks from 0 to selectedIndex
    for (let i = 0; i <= selectedIndex; i++) {
      const interval = INTERVAL_HIERARCHY[i];
      const taskDescriptions = protocolSet[interval] || [];
      
      const newTasks = taskDescriptions.map(desc => ({
        id: `t-${interval.replace(/\s/g, '')}-${Math.random().toString(36).substr(2, 5)}`,
        description: desc,
        intervalOrigin: interval,
        completed: false
      }));
      tasks = [...tasks, ...newTasks];
    }
    return tasks;
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
    
    const tasks = generateCumulativeTasks(selectedMachine.type, interval);
    setFormData(prev => ({
      ...prev,
      interval: interval,
      tasks: tasks
    }));
  };

  const saveProgress = () => {
      // Save without closing or changing stage
      const orderToSave = {
          ...formData,
          id: formData.id || `WO-${Date.now()}` // Generate ID if it's the first save
      } as WorkOrder;
      
      onSave(orderToSave);
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
    onSave({ ...updated, id: formData.id || `WO-${Date.now()}` } as WorkOrder);
  };

  const startExecution = () => {
    // RBAC: Tech or Admin
    if (!hasRole([UserRole.TECNICO_MANT, UserRole.ADMIN_SOLICITANTE])) return;

    const updated = { 
      ...formData, 
      currentStage: WorkOrderStage.EXECUTION, 
      status: WorkOrderStatus.IN_PROGRESS,
      startTime: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})
    };
    setFormData(updated);
    onSave({ ...updated, id: formData.id || `WO-${Date.now()}` } as WorkOrder);
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
      endTime: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})
    };
    setFormData(updated);
    setValidationError(null);
    onSave({ ...updated, id: formData.id || `WO-${Date.now()}` } as WorkOrder);
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

    onSave(newOrder);
  };

  // Helper UI renderers
  const isSection1Editable = formData.currentStage === WorkOrderStage.DRAFT && hasRole([UserRole.ADMIN_SOLICITANTE]);
  const isSection2Editable = formData.currentStage === WorkOrderStage.EXECUTION && hasRole([UserRole.TECNICO_MANT, UserRole.ADMIN_SOLICITANTE]);
  const isSection3Editable = formData.currentStage === WorkOrderStage.HANDOVER && hasRole([UserRole.ADMIN_SOLICITANTE]);

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
          <div className="flex gap-2 text-xs mt-1">
             <div className={`px-2 py-0.5 rounded transition-colors ${formData.currentStage === WorkOrderStage.DRAFT ? 'bg-emerald-500 text-white font-bold' : 'bg-industrial-800 text-gray-500'}`}>1. Request</div>
             <span className="text-gray-600">→</span>
             <div className={`px-2 py-0.5 rounded transition-colors ${formData.currentStage === WorkOrderStage.EXECUTION || formData.currentStage === WorkOrderStage.REQUESTED ? 'bg-pink-500 text-white font-bold' : 'bg-industrial-800 text-gray-500'}`}>2. Execution</div>
             <span className="text-gray-600">→</span>
             <div className={`px-2 py-0.5 rounded transition-colors ${formData.currentStage === WorkOrderStage.HANDOVER ? 'bg-emerald-500 text-white font-bold' : 'bg-industrial-800 text-gray-500'}`}>3. Handover</div>
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
          <section className={`rounded-lg border-2 transition-all duration-300 ${
            formData.currentStage === WorkOrderStage.DRAFT
              ? 'bg-emerald-900/10 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
              : 'bg-industrial-900 border-industrial-700 opacity-60'
          }`}>
             <div className={`p-4 border-b flex justify-between items-center ${formData.currentStage === WorkOrderStage.DRAFT ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-industrial-800 border-industrial-700'}`}>
                <h3 className={`${formData.currentStage === WorkOrderStage.DRAFT ? 'text-emerald-400' : 'text-industrial-400'} font-bold flex items-center gap-2`}>
                   1. Solicitud de Mantenimiento {!isSection1Editable && <Lock size={14} />}
                </h3>
             </div>
             
             <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-bold">{t('form.machine')}</label>
                    <select disabled={!isSection1Editable} 
                            className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            onChange={(e) => handleMachineChange(e.target.value)} value={formData.machineId || ''}>
                      <option value="">-Select-</option>
                      {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.type})</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                     <label className="text-xs text-industrial-400 font-bold">{t('form.plate')}</label>
                     <input type="text" readOnly className="w-full bg-industrial-900/50 border border-industrial-700 rounded p-2 text-industrial-300 text-sm" value={selectedMachine?.plate || ''} />
                </div>
                
                {type === 'R-MANT-02' ? (
                   <>
                    <div className="space-y-1">
                       <label className="text-xs text-industrial-400 font-bold">{t('mant02.interval')}</label>
                       <select disabled={!isSection1Editable || !selectedMachine}
                               className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm disabled:opacity-50"
                               value={formData.interval || ''} onChange={handleIntervalChange}>
                         <option value="">-Select-</option>
                         {INTERVAL_HIERARCHY.map(int => <option key={int} value={int}>{int}</option>)}
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs text-industrial-400 font-bold">{t('mant02.nextHours')}</label>
                       <input type="text" readOnly className="w-full bg-industrial-900/50 border border-industrial-700 rounded p-2 text-industrial-300 text-sm" 
                              value={selectedMachine ? `${selectedMachine.runningHours + 360}` : ''} />
                    </div>
                   </>
                ) : (
                    <div className="col-span-2 space-y-1">
                       <label className="text-xs text-industrial-400 font-bold">{t('form.description')}</label>
                       <input disabled={!isSection1Editable}
                              type="text" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm" 
                              value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
                    </div>
                )}
                <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-bold">{t('form.priority')}</label>
                    <select disabled={!isSection1Editable}
                            className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm disabled:opacity-50"
                            value={formData.priority || Priority.MEDIUM} onChange={e => setFormData({...formData, priority: e.target.value as Priority})}>
                       <option value={Priority.LOW}>LOW</option>
                       <option value={Priority.MEDIUM}>MEDIUM</option>
                       <option value={Priority.HIGH}>HIGH</option>
                       <option value={Priority.CRITICAL}>CRITICAL</option>
                    </select>
                </div>
             </div>
             
             {isSection1Editable && (
                <div className="p-4 border-t border-emerald-500/30 flex justify-end gap-3">
                   <button type="button" onClick={saveProgress} className="text-emerald-400 hover:text-white px-4 py-2 text-sm font-medium">
                      Save Draft
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
          <section className={`rounded-lg border-2 transition-all duration-300 ${
             formData.currentStage === WorkOrderStage.EXECUTION || formData.currentStage === WorkOrderStage.REQUESTED
             ? 'bg-pink-900/10 border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.1)]' 
             : 'bg-industrial-900 border-industrial-700 opacity-60'
          }`}>
             <div className={`p-4 border-b flex justify-between items-center ${formData.currentStage === WorkOrderStage.EXECUTION || formData.currentStage === WorkOrderStage.REQUESTED ? 'bg-pink-900/20 border-pink-500/30' : 'bg-industrial-800 border-industrial-700'}`}>
                <h3 className={`${formData.currentStage === WorkOrderStage.EXECUTION ? 'text-pink-400' : 'text-industrial-400'} font-bold flex items-center gap-2`}>
                   2. Ejecución y Repuestos {!isSection2Editable && formData.currentStage !== WorkOrderStage.REQUESTED && <Lock size={14} />}
                </h3>
                {formData.currentStage === WorkOrderStage.REQUESTED && hasRole([UserRole.TECNICO_MANT, UserRole.ADMIN_SOLICITANTE]) && (
                   <button onClick={startExecution} className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-1 rounded text-sm font-bold flex items-center gap-1 animate-pulse">
                      <PlayCircle size={14} /> Iniciar Trabajo
                   </button>
                )}
             </div>

             <div className={`p-6 ${formData.currentStage === WorkOrderStage.REQUESTED || formData.currentStage === WorkOrderStage.DRAFT ? 'opacity-50 pointer-events-none filter blur-[1px]' : ''}`}>
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
                       <span className="text-xs text-industrial-500 block flex items-center gap-1"><Clock size={10}/> Duración</span>
                       <span className="text-xl font-mono text-pink-400">{duration}</span>
                    </div>
                </div>

                {/* Tasks List (Inherited) */}
                {type === 'R-MANT-02' && (
                   <div className="mb-6">
                      <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><CheckSquare size={14} className="text-pink-500"/> Tareas de Mantenimiento Acumuladas</h4>
                      <div className="bg-industrial-900 rounded border border-industrial-700 overflow-hidden">
                         {formData.tasks?.length === 0 ? (
                            <p className="p-4 text-sm text-industrial-500 italic">Sin tareas. Seleccione un equipo e intervalo.</p>
                         ) : (
                            <div className="divide-y divide-industrial-700">
                               {formData.tasks?.map((task, idx) => (
                                  <div key={task.id} className="p-3 flex items-start gap-3 hover:bg-industrial-800 transition-colors">
                                     <input 
                                        type="checkbox" 
                                        disabled={!isSection2Editable}
                                        checked={task.completed} 
                                        onChange={() => {
                                            const updated = [...(formData.tasks || [])];
                                            updated[idx].completed = !updated[idx].completed;
                                            setFormData({...formData, tasks: updated});
                                        }}
                                        className="mt-1 w-4 h-4 text-pink-500 bg-industrial-900 border-industrial-500 rounded focus:ring-pink-500 cursor-pointer" 
                                     />
                                     <div>
                                        <p className={`text-sm ${task.completed ? 'text-industrial-400 line-through' : 'text-white'}`}>{task.description}</p>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-industrial-800 text-industrial-500 border border-industrial-700 font-mono">
                                            {task.intervalOrigin}
                                        </span>
                                     </div>
                                  </div>
                               ))}
                            </div>
                         )}
                      </div>
                   </div>
                )}

                {/* Executors (Multiple) */}
                 <div className="mb-6">
                     <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><User size={14} className="text-pink-500"/> Personal Ejecutante</h4>
                      {formData.executors?.map((exec, idx) => (
                        <div key={idx} className="grid grid-cols-2 gap-2 mb-2 items-center">
                           <select 
                              disabled={!isSection2Editable} 
                              className="bg-industrial-900 border border-industrial-700 rounded p-2 text-xs text-white focus:border-pink-500 outline-none"
                              value={technicians.find(t => t.name === exec.name)?.id || ''}
                              onChange={(e) => {
                                  const tech = technicians.find(t => t.id === e.target.value);
                                  if (tech) {
                                      const updated = [...(formData.executors||[])];
                                      updated[idx] = { name: tech.name, lastName: '', position: tech.role };
                                      setFormData({...formData, executors: updated});
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
                         <button onClick={() => setFormData(p => ({...p, executors: [...(p.executors||[]), {name:'', lastName:'', position:''}]}))} className="text-xs text-pink-400 flex items-center gap-1"><Plus size={12}/> Add Tech</button>
                      )}
                 </div>
             </div>

             {isSection2Editable && (
                <div className="p-4 border-t border-pink-500/30 flex justify-end gap-3">
                   <button type="button" onClick={saveProgress} className="text-pink-400 hover:text-white px-4 py-2 text-sm font-medium">
                      Save Progress
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
          <section className={`rounded-lg border-2 transition-all duration-300 ${
             formData.currentStage === WorkOrderStage.HANDOVER
             ? 'bg-emerald-900/10 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
             : 'bg-industrial-900 border-industrial-700 opacity-60'
          }`}>
             <div className={`p-4 border-b ${formData.currentStage === WorkOrderStage.HANDOVER ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-industrial-800 border-industrial-700'}`}>
                <h3 className={`${formData.currentStage === WorkOrderStage.HANDOVER ? 'text-emerald-400' : 'text-industrial-400'} font-bold flex items-center gap-2`}>
                   3. Cierre y Entrega {!isSection3Editable && <Lock size={14} />}
                </h3>
             </div>
             
             <div className={`p-6 ${formData.currentStage !== WorkOrderStage.HANDOVER ? 'opacity-50 pointer-events-none filter blur-[1px]' : ''}`}>
                <div className="mb-6">
                   <h4 className="text-sm font-bold text-white mb-4 uppercase">{t('mant02.checklist.title')}</h4>
                   <div className="space-y-1">
                      {['pointClean', 'areaClean', 'guardsComplete', 'toolsRemoved', 'safetyActivated'].map((key) => (
                          <div key={key} className="flex justify-between py-2 border-b border-industrial-700/50">
                              <span className="text-sm text-industrial-300">{t(`mant02.check.${key === 'pointClean' ? '1' : '2'}`)} (Mock Label)</span>
                              <div className="flex gap-4">
                                  <label className="flex items-center gap-2"><input type="radio" disabled={!isSection3Editable} name={key} checked={formData.checklist?.[key as keyof typeof formData.checklist] === true} onChange={() => setFormData(p => ({...p, checklist: {...p.checklist, [key]: true}}))} /> Si</label>
                                  <label className="flex items-center gap-2"><input type="radio" disabled={!isSection3Editable} name={key} checked={formData.checklist?.[key as keyof typeof formData.checklist] === false} onChange={() => setFormData(p => ({...p, checklist: {...p.checklist, [key]: false}}))} /> No</label>
                              </div>
                          </div>
                      ))}
                   </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 mt-8">
                   <div>
                      <label className="text-xs text-industrial-400 font-bold mb-2 block">Firma Supervisor (Conformidad)</label>
                      <div className={`h-24 bg-white/5 rounded border-2 border-dashed ${isSection3Editable ? 'border-emerald-500/50 cursor-pointer hover:bg-white/10' : 'border-industrial-600'} flex items-center justify-center`}>
                         <span className="text-xs text-industrial-500">
                             {formData.currentStage === WorkOrderStage.CLOSED ? 'Signed by ' + user?.full_name : 'Click to Sign'}
                         </span>
                      </div>
                   </div>
                </div>
             </div>

             {isSection3Editable && (
                <div className="p-4 border-t border-emerald-500/30 flex justify-end gap-4">
                   <button onClick={() => setFormData(p => ({...p, currentStage: WorkOrderStage.EXECUTION, status: WorkOrderStatus.IN_PROGRESS}))} className="text-industrial-400 hover:text-white text-sm underline">
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
