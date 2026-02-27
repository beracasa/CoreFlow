import React from 'react';
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

  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedZone, setSelectedZone] = React.useState('');
  const [selectedInterval, setSelectedInterval] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState('');

  // Get unique values for filters
  const uniqueZones = Array.from(new Set(machines.map(m => m.zone).filter(Boolean)));
  const uniqueIntervals = Array.from(new Set(workOrders.filter(o => o.formType === 'R-MANT-02').map(o => o.interval).filter(Boolean)));
  const statusOptions = [
    { label: 'SOLICITADO', value: WorkOrderStage.REQUESTED },
    { label: 'EJECUCIÓN', value: WorkOrderStage.EXECUTION },
    { label: 'SUPERVISIÓN', value: WorkOrderStage.HANDOVER },
    { label: 'CERRADO', value: WorkOrderStage.CLOSED }
  ];

  // Filter orders by form type, search, and filters
  const filteredOrders = workOrders.filter(o => {
    // 1. Type filter
    if (o.formType !== type) return false;

    // 2. Search filter
    const machine = machines.find(m => m.id === o.machineId);
    const searchLower = searchQuery.toLowerCase().trim();
    if (searchLower) {
      const matchName = machine?.name?.toLowerCase().includes(searchLower);
      const matchId = o.displayId?.toLowerCase().includes(searchLower);
      const matchPlate = machine?.plate?.toLowerCase().includes(searchLower);
      const matchAlias = machine?.alias?.toLowerCase().includes(searchLower);
      if (!matchName && !matchId && !matchPlate && !matchAlias) return false;
    }

    // 3. Zone filter
    if (selectedZone && machine?.zone !== selectedZone) return false;

    // 4. Interval filter
    if (selectedInterval && o.interval !== selectedInterval) return false;

    // 5. Status filter
    if (selectedStatus && o.currentStage !== selectedStatus) return false;

    return true;
  });

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
    <div className="h-full bg-industrial-900 p-6 flex flex-col overflow-hidden">
      <div className="flex justify-between items-start mb-6">
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

      {/* Filters Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-industrial-800/50 p-4 rounded-xl border border-industrial-700/50">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-industrial-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input
            type="text"
            placeholder="Buscar por equipo, orden, matrícula o alias..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-industrial-900 border border-industrial-700 rounded-lg text-sm text-white focus:outline-none focus:border-industrial-accent transition-colors"
          />
        </div>

        {/* Zone Filter */}
        <select
          value={selectedZone}
          onChange={(e) => setSelectedZone(e.target.value)}
          className="px-4 py-2 bg-industrial-900 border border-industrial-700 rounded-lg text-sm text-white focus:outline-none focus:border-industrial-accent transition-colors"
        >
          <option value="">Todas las Zonas</option>
          {uniqueZones.map(zone => (
            <option key={zone} value={zone}>{zone}</option>
          ))}
        </select>

        {/* Interval Filter */}
        <select
          value={selectedInterval}
          onChange={(e) => setSelectedInterval(e.target.value)}
          className="px-4 py-2 bg-industrial-900 border border-industrial-700 rounded-lg text-sm text-white focus:outline-none focus:border-industrial-accent transition-colors"
        >
          <option value="">Todos los Intervalos</option>
          {uniqueIntervals.map(interval => (
            <option key={interval} value={interval}>{interval}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-4 py-2 bg-industrial-900 border border-industrial-700 rounded-lg text-sm text-white focus:outline-none focus:border-industrial-accent transition-colors"
        >
          <option value="">Todos los Estados</option>
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-industrial-800 rounded-lg border border-industrial-700 overflow-hidden shadow-xl flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-sm text-industrial-400">
            <thead className="bg-industrial-900 sticky top-0 z-10 text-xs uppercase font-bold text-industrial-500 shadow-sm">
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
                    No records found matching filters
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
    </div>
  );
};

