import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkOrderStatus, Priority } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useWorkOrderStore } from '../src/stores/useWorkOrderStore';
import { useMasterStore } from '../src/stores/useMasterStore';
import { calculatePlantMTTR } from '../src/utils/metricsCalculator';

// MTBF remains placeholder for now as per instructions to keep other functionalities intact
const calculateMTBF = () => 148.5;

export const MaintenanceKanban: React.FC = () => {
  const { t } = useLanguage();
  const { hasPermission } = useAuth();
  const { workOrders, updateOrder, fetchOrders } = useWorkOrderStore();
  const { machines } = useMasterStore();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<'R-MANT-02' | 'R-MANT-05' | null>(null);

  // Reset global filters on mount to ensure all orders are visible
  React.useEffect(() => {
    fetchOrders(); // Default fetch without formType filter
  }, [fetchOrders]);

  const columns = [
    { id: WorkOrderStatus.BACKLOG, title: t('kanban.col.backlog') },
    { id: WorkOrderStatus.IN_PROGRESS, title: t('kanban.col.progress') },
    { id: WorkOrderStatus.REVIEW, title: t('kanban.col.review') },
    { id: WorkOrderStatus.DONE, title: t('kanban.col.done') },
  ];



  return (
    <div className="h-full flex flex-col bg-industrial-900 p-6 overflow-hidden">
      {/* Header Metrics */}
      <div className="flex gap-6 mb-8 overflow-x-auto pb-2">
        <div className="bg-industrial-800 p-4 rounded border border-industrial-700 shadow-sm flex-1 min-w-[200px] max-w-xs">
          <p className="text-industrial-500 text-xs font-bold uppercase tracking-wider">{t('kanban.mttr')}</p>
          <p className="text-2xl font-mono text-white mt-1">{calculatePlantMTTR(workOrders)} <span className="text-sm text-industrial-500">hrs</span></p>
        </div>
        <div className="bg-industrial-800 p-4 rounded border border-industrial-700 shadow-sm flex-1 min-w-[200px] max-w-xs">
          <p className="text-industrial-500 text-xs font-bold uppercase tracking-wider">{t('kanban.mtbf')}</p>
          <p className="text-2xl font-mono text-white mt-1">{calculateMTBF()} <span className="text-sm text-industrial-500">hrs</span></p>
        </div>

        {/* R-MANT-02 Filter Card */}
        <div
          onClick={() => setTypeFilter(typeFilter === 'R-MANT-02' ? null : 'R-MANT-02')}
          className={`p-4 rounded border shadow-sm flex-1 min-w-[240px] max-w-xs cursor-pointer transition-all duration-200 ${typeFilter === 'R-MANT-02'
            ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/50'
            : 'bg-industrial-800 border-industrial-700 hover:border-industrial-500'
            }`}
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
          className={`p-4 rounded border shadow-sm flex-1 min-w-[240px] max-w-xs cursor-pointer transition-all duration-200 ${typeFilter === 'R-MANT-05'
            ? 'bg-orange-600/20 border-orange-500 ring-2 ring-orange-500/50'
            : 'bg-industrial-800 border-industrial-700 hover:border-industrial-500'
            }`}
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
          
          return (
            <div
              key={col.id}
              className="flex-1 min-w-[300px] bg-industrial-800/50 rounded-lg flex flex-col border border-industrial-700/50"
            >
              <div className="p-3 border-b border-industrial-700 bg-industrial-800 rounded-t-lg flex justify-between items-center">
                <h3 className="font-semibold text-industrial-500 text-sm">{col.title}</h3>
                <span className="bg-industrial-900 text-xs px-2 py-0.5 rounded-full text-industrial-500 font-mono">
                  {isDoneColumn ? `${displayOrders.length}${filteredOrders.length > 30 ? '+' : ''}` : filteredOrders.length}
                </span>
              </div>

              <div className="flex-1 p-2 space-y-3 overflow-y-auto">
                {displayOrders.map(order => {
                  const machine = machines.find(m => m.id === order.machineId);
                  const isMant02 = order.formType === 'R-MANT-02';

                  return (
                    <div
                      key={order.id}
                      onClick={() => navigate(`/orders/${order.id}`, { state: { type: order.formType } })}
                      className="bg-industrial-700 p-4 rounded-xl border border-industrial-600 shadow-xl transition-all hover:border-industrial-400 cursor-pointer hover:shadow-2xl"
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
                        <span className="font-mono font-medium">
                          {new Date(order.createdDate).toLocaleDateString()}
                        </span>
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