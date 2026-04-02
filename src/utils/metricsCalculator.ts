export const calculateMachineOEE = (machineId: string, workOrders: any[], periodDays = 30) => {
  const totalHours = periodDays * 24;
  
  // Filtrar órdenes correctivas (R-MANT-05) de esta máquina en los últimos 30 días
  const machineOrders = workOrders.filter(wo => 
    wo.machineId === machineId && 
    wo.formType === 'R-MANT-05' &&
    new Date(wo.createdAt || wo.created_at || Date.now()) >= new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)
  );

  // Calcular horas de parada (Downtime). 
  // Si la orden está cerrada, usa completedAt - createdAt. Si está abierta, Date.now() - createdAt
  let downtimeHours = 0;
  machineOrders.forEach(wo => {
    const createdDate = new Date(wo.createdAt || wo.created_at || Date.now());
    const endDate = wo.completedAt || wo.completed_date ? new Date(wo.completedAt || wo.completed_date) : new Date();
    
    downtimeHours += (endDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
  });

  const availability = Math.max(0, ((totalHours - downtimeHours) / totalHours) * 100);
  return parseFloat(availability.toFixed(1));
};
