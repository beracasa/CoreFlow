import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkOrderStatus, Priority, WorkOrder, WorkOrderStage } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useWorkOrderStore } from '../src/stores/useWorkOrderStore';
import { useMasterStore } from '../src/stores/useMasterStore';
import { calculatePlantMTTR, calculatePlantMTBF } from '../src/utils/metricsCalculator';
import { formatDate } from '../src/utils/dateUtils';
import { Shield, Eye, Edit3, ChevronRight, ChevronLeft } from 'lucide-react';


export const MaintenanceKanban: React.FC = () => {
  const { t } = useLanguage();
  const { hasPermission } = useAuth();
  const { workOrders, updateOrder, fetchOrders } = useWorkOrderStore();
  const { machines } = useMasterStore();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<'R-MANT-02' | 'R-MANT-05' | null>(null);
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  const canEditKanban = hasPermission('edit_kanban');

  // Reset global filters on mount to ensure all orders are visible
  React.useEffect(() => {
    fetchOrders(); // Default fetch without formType filter
  }, [fetchOrders]);

  if (!hasPermission('view_kanban')) {
    return (
      <div className="h-full flex items-center justify-center bg-industrial-900 text-industrial-500 flex-col gap-4">
        <Shield className="w-12 h-12 text-red-900" />
        <span className="text-base font-semibold">Acceso Restringido: Se requiere el permiso de Ver Tablero Kanban.</span>
      </div>
    );
  }

  const columns = [
    { id: WorkOrderStatus.BACKLOG, title: t('kanban.col.backlog') },
    { id: WorkOrderStatus.IN_PROGRESS, title: t('kanban.col.progress') },
    { id: WorkOrderStatus.REVIEW, title: t('kanban.col.review') },
    { id: WorkOrderStatus.DONE, title: t('kanban.col.done') },
  ];

  const validateOrderTransition = (order: WorkOrder, targetStatus: WorkOrderStatus): string | null => {
    const hasSec2Signatures = Boolean(
      order.signatureExecutor && order.signatureExecutor !== 'false' &&
      order.signatureExecutionSupervisor && order.signatureExecutionSupervisor !== 'false'
    );
    const hasSec3Signature = Boolean(
      order.signatureSupervisor && order.signatureSupervisor !== 'false'
    );

    if (targetStatus === WorkOrderStatus.REVIEW) {
      if (!hasSec2Signatures) {
        return 'No se puede avanzar a Supervisión / Revisión: Es obligatorio que el Ejecutante y el Supervisor firmen la intervención (Sección 2).';
      }
    }

    if (targetStatus === WorkOrderStatus.DONE) {
      if (!hasSec2Signatures) {
        return 'No se puede cerrar el mantenimiento: Faltan las firmas de la intervención en la Sección 2 (Ejecutante y Supervisor).';
      }
      if (!hasSec3Signature) {
        return 'No se puede cerrar el mantenimiento: Falta la firma de recepción y conformidad del Supervisor en la Sección 3 (Cierre y Entrega).';
      }
    }

    return null;
  };

  const handleMoveOrderColumn = async (order: WorkOrder, direction: number) => {
    if (!canEditKanban) return;
    const orderStatuses = [
      WorkOrderStatus.BACKLOG,
      WorkOrderStatus.IN_PROGRESS,
      WorkOrderStatus.REVIEW,
      WorkOrderStatus.DONE
    ];
    const currentIndex = orderStatuses.indexOf(order.status);
    if (currentIndex === -1) return;
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < orderStatuses.length) {
      const targetStatus = orderStatuses[newIndex];
      const errorMsg = validateOrderTransition(order, targetStatus);
      if (errorMsg) {
        alert(`⚠️ ${errorMsg}`);
        return;
      }

      const updates: Partial<WorkOrder> = { status: targetStatus };
      if (targetStatus === WorkOrderStatus.REVIEW) {
        updates.currentStage = WorkOrderStage.HANDOVER;
      } else if (targetStatus === WorkOrderStatus.DONE) {
        updates.currentStage = WorkOrderStage.CLOSED;
        updates.completedDate = new Date().toISOString();
      } else if (targetStatus === WorkOrderStatus.IN_PROGRESS) {
        updates.currentStage = WorkOrderStage.EXECUTION;
      } else if (targetStatus === WorkOrderStatus.BACKLOG) {
        updates.currentStage = WorkOrderStage.REQUESTED;
      }

      try {
        await updateOrder(order.id, updates);
      } catch (err: any) {
        console.error('Error al actualizar estado:', err);
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-industrial-900 p-6 overflow-hidden">
      {/* Title & Mode Indicator */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white tracking-tight">
            {t('sidebar.maintenanceCanvas')}
          </h2>
          {canEditKanban ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm">
              <Edit3 size={12} /> Modo Edición Habilitado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-industrial-800 text-industrial-400 border border-industrial-700 shadow-sm">
              <Eye size={12} /> Modo Solo Lectura
            </span>
          )}
        </div>
        {!canEditKanban && (
          <p className="text-xs text-industrial-500 italic">
            Visualización informativa de tickets. Se requiere permiso de edición para mover o gestionar órdenes.
          </p>
        )}
      </div>

      {/* Header Metrics */}
      <div className="flex gap-6 mb-6 overflow-x-auto pb-2">
        <div className="bg-industrial-800 p-4 rounded border border-industrial-700 shadow-sm flex-1 min-w-[200px] max-w-xs">
          <p className="text-industrial-500 text-xs font-bold uppercase tracking-wider">{t('kanban.mttr')}</p>
          <p className="text-2xl font-mono text-white mt-1">{calculatePlantMTTR(workOrders)} <span className="text-sm text-industrial-500">hrs</span></p>
        </div>
        <div className="bg-industrial-800 p-4 rounded border border-industrial-700 shadow-sm flex-1 min-w-[200px] max-w-xs">
          <p className="text-industrial-500 text-xs font-bold uppercase tracking-wider">{t('kanban.mtbf')}</p>
          <p className="text-2xl font-mono text-white mt-1">{calculatePlantMTBF(workOrders)} <span className="text-sm text-industrial-500">hrs</span></p>
        </div>

        {/* R-MANT-02 Filter Card */}
        <div
          onClick={() => setTypeFilter(typeFilter === 'R-MANT-02' ? null : 'R-MANT-02')}
          className={`p-4 rounded border shadow-sm flex-1 min-w-[240px] max-w-xs transition-all duration-200 cursor-pointer ${
            typeFilter === 'R-MANT-02'
              ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/50'
              : 'bg-industrial-800 border-industrial-700 hover:border-industrial-500'
          }`}
          title="Filtrar por preventivos R-MANT-02"
        >
          <p className={`text-[10px] font-bold uppercase tracking-wider ${typeFilter === 'R-MANT-02' ? 'text-blue-400' : 'text-industrial-500'}`}>
            R-MANT-02 PREVENTIVOS ACTIVOS
          </p>
          <p className="text-2xl font-mono text-white mt-1">
            {workOrders.filter(o => o.formType === 'R-MANT-02' && o.status !== WorkOrderStatus.DONE).length}
          </p>
        </div>

        {/* R-MANT-05 Filter Card */}
        <div
          onClick={() => setTypeFilter(typeFilter === 'R-MANT-05' ? null : 'R-MANT-05')}
          className={`p-4 rounded border shadow-sm flex-1 min-w-[240px] max-w-xs transition-all duration-200 cursor-pointer ${
            typeFilter === 'R-MANT-05'
              ? 'bg-orange-600/20 border-orange-500 ring-2 ring-orange-500/50'
              : 'bg-industrial-800 border-industrial-700 hover:border-industrial-500'
          }`}
          title="Filtrar por correctivos R-MANT-05"
        >
          <p className={`text-[10px] font-bold uppercase tracking-wider ${typeFilter === 'R-MANT-05' ? 'text-orange-400' : 'text-industrial-500'}`}>
            R-MANT-05 CORRECTIVOS ACTIVOS
          </p>
          <p className="text-2xl font-mono text-white mt-1">
            {workOrders.filter(o => o.formType === 'R-MANT-05' && o.status !== WorkOrderStatus.DONE).length}
          </p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {columns.map(col => {
          const filteredOrders = workOrders
            .filter(order => order.status === col.id && (!typeFilter || order.formType === typeFilter));
          
          const isDoneColumn = col.id === WorkOrderStatus.DONE;
          const displayOrders = isDoneColumn ? filteredOrders.slice(0, 30) : filteredOrders;
          const isDragOver = dragOverColId === col.id;
          
          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                if (!canEditKanban) return;
                e.preventDefault();
                if (dragOverColId !== col.id) setDragOverColId(col.id);
              }}
              onDragLeave={() => {
                if (dragOverColId === col.id) setDragOverColId(null);
              }}
              onDrop={async (e) => {
                if (!canEditKanban) return;
                e.preventDefault();
                setDragOverColId(null);
                const orderId = e.dataTransfer.getData('text/plain') || draggedOrderId;
                if (!orderId) return;
                const order = workOrders.find(o => o.id === orderId);
                if (order && order.status !== col.id) {
                  const targetStatus = col.id as WorkOrderStatus;
                  const errorMsg = validateOrderTransition(order, targetStatus);
                  if (errorMsg) {
                    alert(`⚠️ ${errorMsg}`);
                    setDraggedOrderId(null);
                    return;
                  }

                  const updates: Partial<WorkOrder> = { status: targetStatus };
                  if (targetStatus === WorkOrderStatus.REVIEW) {
                    updates.currentStage = WorkOrderStage.HANDOVER;
                  } else if (targetStatus === WorkOrderStatus.DONE) {
                    updates.currentStage = WorkOrderStage.CLOSED;
                    updates.completedDate = new Date().toISOString();
                  } else if (targetStatus === WorkOrderStatus.IN_PROGRESS) {
                    updates.currentStage = WorkOrderStage.EXECUTION;
                  } else if (targetStatus === WorkOrderStatus.BACKLOG) {
                    updates.currentStage = WorkOrderStage.REQUESTED;
                  }

                  try {
                    await updateOrder(order.id, updates);
                  } catch (err: any) {
                    console.error('Error al soltar orden:', err);
                  }
                }
                setDraggedOrderId(null);
              }}
              className={`flex-1 min-w-[300px] bg-industrial-800/50 rounded-lg flex flex-col border transition-all duration-200 ${
                isDragOver
                  ? 'border-blue-500 ring-2 ring-blue-500/50 bg-industrial-800/80 shadow-lg'
                  : 'border-industrial-700/50'
              }`}
            >
              <div className="p-3 border-b border-industrial-700 bg-industrial-800 rounded-t-lg flex justify-between items-center">
                <h3 className="font-semibold text-industrial-400 text-sm">{col.title}</h3>
                <span className="bg-industrial-900 text-xs px-2 py-0.5 rounded-full text-industrial-400 font-mono">
                  {isDoneColumn ? `${displayOrders.length}${filteredOrders.length > 30 ? '+' : ''}` : filteredOrders.length}
                </span>
              </div>

              <div className="flex-1 p-2 space-y-3 overflow-y-auto">
                {displayOrders.map(order => {
                  const machine = machines.find(m => m.id === order.machineId);
                  const isMant02 = order.formType === 'R-MANT-02';
                  const orderColIndex = columns.findIndex(c => c.id === order.status);

                  return (
                    <div
                      key={order.id}
                      draggable={canEditKanban}
                      onDragStart={(e) => {
                        if (!canEditKanban) return;
                        setDraggedOrderId(order.id);
                        e.dataTransfer.setData('text/plain', order.id);
                      }}
                      onDragEnd={() => {
                        setDraggedOrderId(null);
                        setDragOverColId(null);
                      }}
                      onClick={() => {
                        if (canEditKanban) {
                          navigate(`/orders/${order.id}`, { state: { type: order.formType } });
                        }
                      }}
                      className={`bg-industrial-700 p-4 rounded-xl border border-industrial-600 shadow-xl transition-all select-none ${
                        canEditKanban
                          ? 'hover:border-industrial-400 cursor-grab active:cursor-grabbing hover:shadow-2xl'
                          : 'cursor-default opacity-95'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-wider ${isMant02
                          ? 'bg-blue-600 text-white border border-blue-400'
                          : 'bg-orange-600 text-white border border-orange-400'
                          }`}>
                          {isMant02 ? 'R-MANT-02' : 'R-MANT-05'}
                        </span>
                        <span className="text-xs text-white font-mono font-bold tracking-tight">
                          {order.displayId || `#${order.id.substring(0, 8)}`}
                        </span>
                      </div>

                      {/* Main Info Section */}
                      <div className="mb-4">
                        <h4 className="text-[10px] font-bold text-industrial-400 uppercase tracking-widest mb-1">
                          {isMant02 ? 'MANTENIMIENTO PREVENTIVO R-MANT-02' : 'MANTENIMIENTO CORRECTIVO R-MANT-05'}
                        </h4>

                        {isMant02 ? (
                          <>
                            <p className="text-sm font-bold text-white leading-tight">
                              {machine?.name || '---'} - {machine?.model || '---'} - {machine?.zone || '---'}
                            </p>
                            <p className="text-xs text-industrial-300 mt-1 font-medium italic">
                              {order.interval || 'Sin intervalo'}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-bold text-white leading-tight">
                              {machine?.name || '---'} - {order.maintenanceType || 'N/A'}
                            </p>
                            <p className="text-xs text-industrial-300 mt-1 font-medium font-mono uppercase">
                              {order.failureType || 'Sin tipo de avería'}
                            </p>
                          </>
                        )}
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-white border-t border-white/10 pt-3">
                        <span className="font-bold tracking-widest uppercase">
                          {isMant02 ? 'PREVENTIVO' : 'CORRECTIVO'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-industrial-300">
                            {formatDate(order.createdDate)}
                          </span>

                          {/* Quick Column Shift Controls when canEdit */}
                          {canEditKanban && (
                            <div className="flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                              {orderColIndex > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveOrderColumn(order, -1)}
                                  className="p-1 rounded bg-industrial-800 hover:bg-industrial-600 text-industrial-300 hover:text-white transition-colors"
                                  title="Mover a columna anterior"
                                >
                                  <ChevronLeft size={12} />
                                </button>
                              )}
                              {orderColIndex < columns.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveOrderColumn(order, 1)}
                                  className="p-1 rounded bg-industrial-800 hover:bg-industrial-600 text-industrial-300 hover:text-white transition-colors"
                                  title="Avanzar a siguiente columna"
                                >
                                  <ChevronRight size={12} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};