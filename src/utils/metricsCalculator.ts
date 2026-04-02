export const calculateMachineOEE = (machineId: string, workOrders: any[], periodDays = 30) => {
  if (!workOrders || workOrders.length === 0) return 100;

  const totalHours = periodDays * 24;
  
  // 1. Filtrar TODAS las órdenes (Preventivas R-MANT-02 y Correctivas R-MANT-05)
  const machineOrders = workOrders.filter(wo => {
    const isSameMachine = String(wo.machine_id) === String(machineId) || 
                          String(wo.machine) === String(machineId) || 
                          String(wo.machineId) === String(machineId);
    
    // Aceptamos ambos formularios o tipos de mantenimiento
    const formType = wo.form_type || wo.formType;
    const maintenanceType = wo.maintenance_type || wo.maintenanceType;
    const isMaintenance = formType === 'R-MANT-05' || 
                          formType === 'R-MANT-02' ||
                          (maintenanceType && ['CORRECTIVO', 'PREVENTIVO'].includes(String(maintenanceType).toUpperCase()));
    
    // Filtrar solo los de los últimos 30 días
    const dateToUse = wo.created_at || wo.created_date || wo.start_date || wo.createdAt;
    const isRecent = dateToUse ? new Date(dateToUse) >= new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000) : false;
    
    return isSameMachine && isMaintenance && isRecent;
  });

  console.log(`[OEE Calc] Máquina: ${machineId} | Órdenes totales (Prev + Corr) encontradas:`, machineOrders.length);

  // 2. Cálculo de horas acumuladas de parada
  let downtimeHours = 0;
  machineOrders.forEach(wo => {
    const startStr = wo.created_at || wo.created_date || wo.start_date || wo.createdAt;
    if (!startStr) return; 
    
    const start = new Date(startStr).getTime();
    
    // Si la orden está completada, usamos esa fecha. Si sigue en progreso, usamos la hora actual.
    const endStr = wo.completed_date || wo.closing_date || wo.completedAt;
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
