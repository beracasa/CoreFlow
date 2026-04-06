export const calculateMachineOEE = (machineId: string, workOrders: any[], periodDays = 30) => {
  if (!workOrders || workOrders.length === 0) return 100;

  const totalHours = periodDays * 24;
  
  // 1. Filtrar TODAS las órdenes (Preventivas R-MANT-02 y Correctivas R-MANT-05)
  const machineOrders = workOrders.filter(wo => {
    const isSameMachine = String(wo.machine_id) === String(machineId) || 
                          (wo.machine && String(wo.machine.id) === String(machineId)) ||
                          String(wo.machine) === String(machineId) || 
                          String(wo.machineId) === String(machineId);
    
    // Aceptamos ambos formularios o tipos de mantenimiento
    const formType = wo.form_type || wo.formType;
    const maintenanceType = wo.maintenance_type || wo.maintenanceType;
    const isMaintenance = formType === 'R-MANT-05' || 
                          formType === 'R-MANT-02' ||
                          (maintenanceType && ['CORRECTIVO', 'PREVENTIVO'].includes(String(maintenanceType).toUpperCase()));
    
    // Filtrar solo los de los últimos 30 días
    const dateToUse = wo.created_at || wo.created_date || wo.start_date || wo.createdAt || wo.createdDate || wo.startDate;
    const isRecent = dateToUse ? new Date(dateToUse) >= new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000) : false;
    
    return isSameMachine && isMaintenance && isRecent;
  });

  console.log(`[OEE Calc] Máquina: ${machineId} | Órdenes totales (Prev + Corr) encontradas:`, machineOrders.length);

  // 2. Cálculo de horas acumuladas de parada
  let downtimeHours = 0;
  machineOrders.forEach(wo => {
    const startStr = wo.created_at || wo.created_date || wo.start_date || wo.createdAt || wo.createdDate || wo.startDate;
    if (!startStr) return; 
    
    const start = new Date(startStr).getTime();
    
    // Si la orden está completada, usamos esa fecha. Si sigue en progreso, usamos la hora actual.
    const endStr = wo.completed_date || wo.closing_date || wo.completedAt || wo.completedDate || wo.endDate || wo.closingDate;
    const end = endStr ? new Date(endStr).getTime() : Date.now();

    const hours = (end - start) / (1000 * 60 * 60);
    if (!isNaN(hours) && hours > 0) {
      downtimeHours += hours;
    }
  });

  console.log(`[OEE Calc] Máquina: ${machineId} | Downtime Total (Horas):`, downtimeHours);

  // 3. Retornar porcentaje de disponibilidad
  const availability = Math.max(0, ((totalHours - downtimeHours) / totalHours) * 100);
  
  return Number(availability.toFixed(1));
};

/**
 * 1.1 Calcula el MTTR (Mean Time To Repair) individual de un equipo.
 * Solo considera órdenes correctivas (R-MANT-05) completadas.
 */
export const calculateMachineMTTR = (machineId: string, workOrders: any[]) => {
  if (!workOrders || workOrders.length === 0) return 0;

  // Filtrar solo R-MANT-05 completadas de la máquina específica
  const correctiveOrders = workOrders.filter(wo => {
    const isSameMachine = String(wo.machine_id) === String(machineId) || 
                         (wo.machine && String(wo.machine.id) === String(machineId)) ||
                         String(wo.machine) === String(machineId) || 
                         String(wo.machineId) === String(machineId);
                         
    const isCorrective = wo.form_type === 'R-MANT-05' || 
                         wo.formType === 'R-MANT-05' ||
                         (wo.maintenance_type && String(wo.maintenance_type).toUpperCase() === 'CORRECTIVO') ||
                         (wo.maintenanceType && String(wo.maintenanceType).toUpperCase() === 'CORRECTIVO');
                         
    const isCompleted = wo.status === 'COMPLETED' || 
                        wo.status === 'CERRADO' || 
                        wo.status === 'CERRADA' ||
                        wo.status === 'DONE' || 
                        wo.completed_date || 
                        wo.closing_date ||
                        wo.completedAt ||
                        wo.completedDate ||
                        wo.closingDate;
    
    return isSameMachine && isCorrective && isCompleted;
  });

  if (correctiveOrders.length === 0) return 0;

  let totalRepairHours = 0;
  correctiveOrders.forEach(wo => {
    const startStr = wo.created_at || wo.start_date || wo.created_date || wo.createdAt || wo.startDate || wo.createdDate;
    const endStr = wo.completed_date || wo.closing_date || wo.updated_at || wo.completedAt || wo.closingDate || wo.completionDate || wo.updatedAt;
    
    if (!startStr || !endStr) return;

    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    const hours = (end - start) / (1000 * 60 * 60);
    
    if (!isNaN(hours) && hours > 0) {
      totalRepairHours += hours;
    }
  });

  return Number((totalRepairHours / correctiveOrders.length).toFixed(1));
};

/**
 * 1.2 Calcula el MTTR (Mean Time To Repair) global de la planta.
 * Promedio de todas las reparaciones completadas en el sistema.
 */
export const calculatePlantMTTR = (workOrders: any[]) => {
  if (!workOrders || workOrders.length === 0) return 0;

  // Filtrar TODAS las correctivas completadas en el sistema
  const correctiveOrders = workOrders.filter(wo => {
    const isCorrective = wo.form_type === 'R-MANT-05' || 
                         wo.formType === 'R-MANT-05' ||
                         (wo.maintenance_type && String(wo.maintenance_type).toUpperCase() === 'CORRECTIVO') ||
                         (wo.maintenanceType && String(wo.maintenanceType).toUpperCase() === 'CORRECTIVO');
                         
    const isCompleted = wo.status === 'COMPLETED' || 
                        wo.status === 'CERRADO' || 
                        wo.status === 'CERRADA' ||
                        wo.status === 'DONE' || 
                        wo.completed_date || 
                        wo.closing_date ||
                        wo.completedAt ||
                        wo.completedDate ||
                        wo.closingDate;
    
    return isCorrective && isCompleted;
  });

  if (correctiveOrders.length === 0) return 0;

  let totalRepairHours = 0;
  correctiveOrders.forEach(wo => {
    const startStr = wo.created_at || wo.start_date || wo.created_date || wo.createdAt || wo.startDate || wo.createdDate;
    const endStr = wo.completed_date || wo.closing_date || wo.updated_at || wo.completedAt || wo.closingDate || wo.completionDate || wo.updatedAt;
    
    if (!startStr || !endStr) return;

    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    const hours = (end - start) / (1000 * 60 * 60);
    
    if (!isNaN(hours) && hours > 0) {
      totalRepairHours += hours;
    }
  });

  return Number((totalRepairHours / correctiveOrders.length).toFixed(1));
};
