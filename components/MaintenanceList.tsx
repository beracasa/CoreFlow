import { WorkOrderStage, WorkOrder } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkOrderStore } from '../src/stores/useWorkOrderStore';
import { useMasterStore } from '../src/stores/useMasterStore';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Calendar, AlertCircle, CheckCircle, Clock, Download } from 'lucide-react';

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
        return <span className="px-3 py-1.5 rounded-full text-sm font-bold bg-emerald-900/40 text-emerald-300 border border-emerald-700 flex items-center gap-2 w-fit shadow-md"><CheckCircle size={16} /> CERRADO</span>;
      case WorkOrderStage.HANDOVER:
        return <span className="px-3 py-1.5 rounded-full text-sm font-bold bg-purple-900/40 text-purple-300 border border-purple-700 flex items-center gap-2 w-fit shadow-md"><CheckCircle size={16} /> SUPERVISIÓN</span>;
      case WorkOrderStage.EXECUTION:
        return <span className="px-3 py-1.5 rounded-full text-sm font-bold bg-pink-900/40 text-pink-300 border border-pink-700 flex items-center gap-2 w-fit shadow-md"><Clock size={16} /> EJECUCIÓN</span>;
      case WorkOrderStage.DRAFT:
      case WorkOrderStage.REQUESTED:
      default:
        return <span className="px-3 py-1.5 rounded-full text-sm font-bold bg-blue-900/40 text-blue-300 border border-blue-700 flex items-center gap-2 w-fit shadow-md"><AlertCircle size={16} /> SOLICITADO</span>;
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
              <th className="px-6 py-4">Nº Orden</th>
              {type === 'R-MANT-02' ? (
                <>
                  <th className="px-6 py-4">Equipo</th>
                  <th className="px-6 py-4">Zona / Línea</th>
                  <th className="px-6 py-4">Alias</th>
                  <th className="px-6 py-4">Tipo Mantenimiento</th>
                  <th className="px-6 py-4">Intervalo</th>
                </>
              ) : (
                <th className="px-6 py-4">Máquina / Accesorio</th>
              )}
              {type === 'R-MANT-05' && (
                <>
                  <th className="px-6 py-4">Tipo Mantenimiento</th>
                  <th className="px-6 py-4">Departamento</th>
                  <th className="px-6 py-4">Tipo de Avería</th>
                </>
              )}
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-industrial-700">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={type === 'R-MANT-02' ? 8 : 7} className="px-6 py-12 text-center text-industrial-600 italic">
                  No records found for {type}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const machine = machines.find(m => m.id === order.machineId);

                const maintTypeMap: Record<string, string> = {
                  'Preventive': 'Preventivo',
                  'Programmed': 'Programado',
                  'Other': 'Otro'
                };
                const translatedType = order.maintenanceType ? (maintTypeMap[order.maintenanceType] || order.maintenanceType) : '-';

                return (
                  <tr
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`, { state: { type } })}
                    className="hover:bg-industrial-700/50 transition-colors cursor-pointer group"
                  >
                    {/* Nº Orden */}
                    <td className="px-6 py-4">
                      <div className="text-white font-mono font-bold whitespace-nowrap">{order.displayId || '(Nuevo)'}</div>
                    </td>
                    {type === 'R-MANT-02' ? (
                      <>
                        {/* Equipo */}
                        <td className="px-6 py-4 text-white font-medium">
                          {machine?.name || '-'}
                        </td>
                        {/* Zona / Línea */}
                        <td className="px-6 py-4 text-white font-medium">
                          {machine?.zone || '-'}
                        </td>
                        {/* Alias */}
                        <td className="px-6 py-4 text-white font-medium">
                          {machine?.alias || '-'}
                        </td>
                        {/* Tipo Mantenimiento */}
                        <td className="px-6 py-4 text-white font-medium">
                          {translatedType}
                        </td>
                        {/* Intervalo */}
                        <td className="px-6 py-4 text-white font-medium">
                          {order.interval || '-'}
                        </td>
                      </>
                    ) : (
                      <>
                        {/* Máquina / Accesorio */}
                        <td className="px-6 py-4 text-white font-medium">
                          {machine?.name || '-'} {machine?.alias ? `(${machine.alias})` : ''}
                        </td>
                        {/* Tipo Mantenimiento */}
                        <td className="px-6 py-4 text-white font-medium">
                          {order.maintenanceType || '-'}
                        </td>
                        {/* Departamento */}
                        <td className="px-6 py-4 text-white font-medium">
                          {order.department || '-'}
                        </td>
                        {/* Tipo de Avería */}
                        <td className="px-6 py-4 text-white font-medium">
                          {order.failureType || '-'}
                        </td>
                      </>
                    )}

                    {/* Fecha */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-white font-medium">
                        <Calendar className="w-4 h-4 text-industrial-500" />
                        {new Date(order.createdDate).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Estado y Acciones */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getStatusBadge(order.currentStage)}

                        {type === 'R-MANT-02' && order.currentStage === WorkOrderStage.CLOSED && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevenir navegación
                              import('../src/utils/pdf/pdfGenerator').then(module => {
                                module.generateRMant02PDF(order, machine);
                              });
                            }}
                            className="p-1.5 bg-industrial-800 hover:bg-industrial-700 text-industrial-300 rounded border border-industrial-600 transition-colors"
                            title="Descargar PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

