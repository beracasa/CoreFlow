import React, { useState } from 'react';
import { WorkOrder, WorkOrderStatus, Priority } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface KanbanProps {
  orders: WorkOrder[];
}

// Simple calc helpers
const calculateMTTR = (orders: WorkOrder[]) => {
  const completed = orders.filter(o => o.status === WorkOrderStatus.DONE && o.completedDate);
  if (completed.length === 0) return 0;
  // Mock logic: Difference between created and completed in hours (randomized for demo if data insufficient)
  return 4.2; // Constant for demo
};

const calculateMTBF = () => 148.5; // Constant for demo

export const MaintenanceKanban: React.FC<KanbanProps> = ({ orders: initialOrders }) => {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<WorkOrder[]>(initialOrders);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const columns = [
    { id: WorkOrderStatus.BACKLOG, title: t('kanban.col.backlog') },
    { id: WorkOrderStatus.IN_PROGRESS, title: t('kanban.col.progress') },
    { id: WorkOrderStatus.REVIEW, title: t('kanban.col.review') },
    { id: WorkOrderStatus.DONE, title: t('kanban.col.done') },
  ];

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggingId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: WorkOrderStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    setDraggingId(null);
  };

  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case Priority.CRITICAL: return 'bg-red-900/50 text-red-200 border-red-700';
      case Priority.HIGH: return 'bg-orange-900/50 text-orange-200 border-orange-700';
      case Priority.MEDIUM: return 'bg-blue-900/50 text-blue-200 border-blue-700';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="h-full flex flex-col bg-industrial-900 p-6 overflow-hidden">
      {/* Header Metrics */}
      <div className="flex gap-6 mb-8">
        <div className="bg-industrial-800 p-4 rounded border border-industrial-700 shadow-sm flex-1 max-w-xs">
          <p className="text-industrial-500 text-xs font-bold uppercase tracking-wider">{t('kanban.mttr')}</p>
          <p className="text-2xl font-mono text-white mt-1">{calculateMTTR(orders)} <span className="text-sm text-industrial-500">hrs</span></p>
        </div>
        <div className="bg-industrial-800 p-4 rounded border border-industrial-700 shadow-sm flex-1 max-w-xs">
          <p className="text-industrial-500 text-xs font-bold uppercase tracking-wider">{t('kanban.mtbf')}</p>
          <p className="text-2xl font-mono text-white mt-1">{calculateMTBF()} <span className="text-sm text-industrial-500">hrs</span></p>
        </div>
        <div className="bg-industrial-800 p-4 rounded border border-industrial-700 shadow-sm flex-1 max-w-xs">
          <p className="text-industrial-500 text-xs font-bold uppercase tracking-wider">{t('kanban.active')}</p>
          <p className="text-2xl font-mono text-industrial-accent mt-1">{orders.filter(o => o.type === 'PREVENTIVE' && o.status !== WorkOrderStatus.DONE).length}</p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {columns.map(col => (
          <div 
            key={col.id}
            className="flex-1 min-w-[300px] bg-industrial-800/50 rounded-lg flex flex-col border border-industrial-700/50"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className="p-3 border-b border-industrial-700 bg-industrial-800 rounded-t-lg flex justify-between items-center">
              <h3 className="font-semibold text-industrial-500 text-sm">{col.title}</h3>
              <span className="bg-industrial-900 text-xs px-2 py-0.5 rounded-full text-industrial-500 font-mono">
                {orders.filter(o => o.status === col.id).length}
              </span>
            </div>
            
            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
              {orders
                .filter(order => order.status === col.id)
                .map(order => (
                  <div
                    key={order.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, order.id)}
                    className="bg-industrial-700 p-3 rounded border border-industrial-600 shadow-sm hover:border-industrial-500 cursor-move active:cursor-grabbing transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getPriorityColor(order.priority)} font-mono`}>
                        {order.priority}
                      </span>
                      <span className="text-[10px] text-industrial-500 font-mono">{order.id}</span>
                    </div>
                    <h4 className="text-sm font-medium text-white mb-1">{order.title}</h4>
                    <p className="text-xs text-industrial-400 truncate mb-3">{order.description}</p>
                    
                    <div className="flex justify-between items-center text-[10px] text-industrial-500 border-t border-white/5 pt-2">
                       <span>{order.type.substring(0,4)}</span>
                       <span>{new Date(order.createdDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};