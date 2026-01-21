
import React from 'react';
import { WorkOrder, WorkOrderStatus, Priority } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { FileText, Plus, Calendar, User, Settings } from 'lucide-react';

interface MaintenanceListProps {
  type: 'R-MANT-02' | 'R-MANT-05';
  orders: WorkOrder[];
  onCreateNew: () => void;
  onEditOrder?: (order: WorkOrder) => void;
}

export const MaintenanceList: React.FC<MaintenanceListProps> = ({ type, orders, onCreateNew, onEditOrder }) => {
  const { t } = useLanguage();
  
  // Filter orders by form type
  const filteredOrders = orders.filter(o => o.formType === type);

  const getPriorityBadge = (p: Priority) => {
    switch (p) {
      case Priority.CRITICAL: return <span className="px-2 py-0.5 rounded text-[10px] bg-red-900/30 text-red-400 border border-red-900 font-bold">CRITICAL</span>;
      case Priority.HIGH: return <span className="px-2 py-0.5 rounded text-[10px] bg-orange-900/30 text-orange-400 border border-orange-900">HIGH</span>;
      case Priority.MEDIUM: return <span className="px-2 py-0.5 rounded text-[10px] bg-blue-900/30 text-blue-400 border border-blue-900">MEDIUM</span>;
      default: return <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">LOW</span>;
    }
  };

  const getStatusBadge = (s: WorkOrderStatus) => {
    switch (s) {
      case WorkOrderStatus.DONE: return <span className="text-emerald-400 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>Done</span>;
      case WorkOrderStatus.IN_PROGRESS: return <span className="text-blue-400 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>In Progress</span>;
      case WorkOrderStatus.REVIEW: return <span className="text-yellow-400 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>Review</span>;
      default: return <span className="text-slate-400 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>Backlog</span>;
    }
  };

  return (
    <div className="h-full bg-industrial-900 p-6 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
            <span className="p-2 bg-industrial-800 rounded-lg border border-industrial-700">
              <FileText className="w-6 h-6 text-industrial-accent" />
            </span>
            {type === 'R-MANT-02' ? t('sidebar.rmant02') : t('sidebar.rmant05')}
          </h2>
          <p className="text-industrial-500 text-sm ml-14">
            {type === 'R-MANT-02' ? 'Preventive Maintenance Schedule & Records' : 'Corrective Maintenance & Failure Reports'}
          </p>
        </div>
        <button 
          onClick={onCreateNew}
          className="bg-industrial-accent hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors shadow-lg shadow-blue-900/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('mant.new')}
        </button>
      </div>

      <div className="bg-industrial-800 rounded-lg border border-industrial-700 overflow-hidden shadow-xl flex-1">
        <table className="w-full text-left text-sm text-industrial-400">
          <thead className="bg-industrial-900 text-xs uppercase font-bold text-industrial-500">
            <tr>
              <th className="px-6 py-4">{t('mant.col.id')}</th>
              <th className="px-6 py-4">{t('mant.col.title')}</th>
              <th className="px-6 py-4">{t('mant.col.machine')}</th>
              <th className="px-6 py-4">{t('mant.col.date')}</th>
              <th className="px-6 py-4">{t('mant.col.priority')}</th>
              <th className="px-6 py-4">{t('mant.col.status')}</th>
              <th className="px-6 py-4 text-right">{t('mant.col.tech')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-industrial-700">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-industrial-600 italic">
                  No records found for {type}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr 
                    key={order.id} 
                    onClick={() => onEditOrder && onEditOrder(order)}
                    className="hover:bg-industrial-700/50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4 font-mono text-industrial-300 font-medium group-hover:text-white transition-colors">
                    {order.id}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white font-medium mb-0.5">{order.title}</div>
                    <div className="text-xs text-industrial-500 truncate max-w-[200px]">{order.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Settings className="w-3 h-3 text-industrial-500" />
                      <span className="text-industrial-300 font-mono text-xs uppercase">
                        {order.machineId}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar className="w-3 h-3 text-industrial-500" />
                      {new Date(order.createdDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getPriorityBadge(order.priority)}
                  </td>
                  <td className="px-6 py-4 text-xs font-medium">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {order.assignedTo ? (
                       <div className="flex items-center justify-end gap-2 text-xs text-industrial-300">
                          {order.assignedTo}
                          <div className="w-6 h-6 rounded-full bg-industrial-700 flex items-center justify-center text-[10px] font-bold text-white border border-industrial-600">
                            {order.assignedTo.substring(0,2).toUpperCase()}
                          </div>
                       </div>
                    ) : (
                      <span className="text-xs text-industrial-600 italic">Unassigned</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
