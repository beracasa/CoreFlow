import { WorkOrderStage, WorkOrder } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkOrderStore } from '../src/stores/useWorkOrderStore';
import { useMasterStore } from '../src/stores/useMasterStore';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface MaintenanceListProps {
  type: 'R-MANT-02' | 'R-MANT-05';
}

export const MaintenanceList: React.FC<MaintenanceListProps> = ({ type }) => {
  const { t } = useLanguage();
  const { workOrders } = useWorkOrderStore();
  const { machines } = useMasterStore();
  const navigate = useNavigate();

  // Filter orders by form type
  const filteredOrders = workOrders.filter(o => o.formType === type);

  const getStatusBadge = (stage: WorkOrderStage) => {
    switch (stage) {
      case WorkOrderStage.CLOSED:
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-900/30 text-emerald-400 border border-emerald-800 flex items-center gap-1 w-fit"><CheckCircle size={12} /> Cerrado</span>;
      case WorkOrderStage.HANDOVER:
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-teal-900/30 text-teal-400 border border-teal-800 flex items-center gap-1 w-fit"><CheckCircle size={12} /> Entrega</span>;
      case WorkOrderStage.EXECUTION:
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-pink-900/30 text-pink-400 border border-pink-800 flex items-center gap-1 w-fit"><Clock size={12} /> En Ejecución</span>;
      case WorkOrderStage.DRAFT:
      case WorkOrderStage.REQUESTED:
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-900/30 text-blue-400 border border-blue-800 flex items-center gap-1 w-fit"><AlertCircle size={12} /> Solicitado</span>;
    }
  };

  const getMaintenanceName = (order: WorkOrder) => {
    if (type === 'R-MANT-02') {
      const machine = machines.find(m => m.id === order.machineId);
      const machineName = machine ? (machine.alias || machine.name) : 'Unknown Machine';
      const interval = order.interval || 'N/A';
      return `${machineName} - ${interval}`;
    }
    return order.title;
  };

  return (
    <div className="h-full bg-industrial-900 p-6 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
            <span className="p-2 bg-industrial-800 rounded-lg border border-industrial-700">
              <FileText className="w-6 h-6 text-industrial-accent" />
            </span>
            {type === 'R-MANT-02' ? 'Mantenimiento Preventivo (R-MANT-02)' : 'Mantenimiento Correctivo (R-MANT-05)'}
          </h2>
          <p className="text-industrial-500 text-sm ml-14">
            {type === 'R-MANT-02' ? 'Programación y seguimiento de mantenimientos preventivos' : 'Reporte y gestión de fallas correctivas'}
          </p>
        </div>
        <button
          onClick={() => navigate('/orders/new', { state: { type } })}
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
              <th className="px-6 py-4">Orden</th>
              <th className="px-6 py-4">Mantenimiento</th>
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-industrial-700">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-industrial-600 italic">
                  No records found for {type}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="hover:bg-industrial-700/50 transition-colors cursor-pointer group"
                >
                  {/* Orden */}
                  <td className="px-6 py-4 font-mono text-industrial-300 font-medium group-hover:text-white transition-colors">
                    {order.id}
                  </td>

                  {/* Mantenimiento */}
                  <td className="px-6 py-4">
                    <div className="text-white font-medium mb-0.5">{getMaintenanceName(order)}</div>
                    {/* Optional: Show plate underneath if needed, or keeping it clean */}
                  </td>

                  {/* Fecha */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar className="w-3 h-3 text-industrial-500" />
                      {new Date(order.createdDate).toLocaleDateString()}
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-6 py-4 text-xs font-medium">
                    {getStatusBadge(order.currentStage)}
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

