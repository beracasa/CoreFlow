import React from 'react';
import { WorkOrderStage, WorkOrder } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkOrderStore } from '../src/stores/useWorkOrderStore';
import { useMasterStore } from '../src/stores/useMasterStore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Plus, Calendar, AlertCircle, CheckCircle, Clock, Download } from 'lucide-react';
import { generateMaintenanceListPDF, generateRMant02PDF, generateRMant05PDF } from '../src/utils/pdf/pdfGenerator';
import { generateWorkOrderReport } from '../src/services/ReportService';
import { TablePagination } from './shared/TablePagination';
import { DateInput } from './shared/DateInput';
import { formatDate } from '../src/utils/dateUtils';
import { workOrderService } from '../src/services';
import { WorkOrderFilters } from '../src/services/workOrderService';

const DEFAULT_FAILURE_TYPES = ['Mecánica', 'Eléctrica', 'Plomería'];

const extractIntervalHours = (label: string): number => {
  const match = label.replace(/,/g, '').match(/\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : Number.MAX_SAFE_INTEGER;
};


interface MaintenanceListProps {
  type: 'R-MANT-02' | 'R-MANT-05';
}

export const MaintenanceList: React.FC<MaintenanceListProps> = ({ type }) => {
  const { t, language } = useLanguage();
  const { workOrders, pagination, fetchOrders, fetchAllFilteredOrders, setPage, loading } = useWorkOrderStore();
  const { machines, zones: zoneStructures, maintenancePlans, plantSettings, fetchMasterData, isInitialized: masterInitialized } = useMasterStore();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('create_wo');
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState('');
  const [selectedZone, setSelectedZone] = React.useState('');
  const [selectedInterval, setSelectedInterval] = React.useState('');
  const [selectedFailureType, setSelectedFailureType] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState('');
  const [startDateFilter, setStartDateFilter] = React.useState('');
  const [endDateFilter, setEndDateFilter] = React.useState('');
  const [dbFilterOptions, setDbFilterOptions] = React.useState<{ intervals: string[]; failureTypes: string[] }>({
    intervals: [],
    failureTypes: []
  });
  const [exportingPdf, setExportingPdf] = React.useState(false);

  // Refs for date inputs
  const startDateRef = React.useRef<HTMLInputElement>(null);
  const endDateRef = React.useRef<HTMLInputElement>(null);

  // Ensure master data (machines, zones, maintenance plans) is loaded
  React.useEffect(() => {
    if (!masterInitialized) {
      fetchMasterData();
    }
  }, [fetchMasterData, masterInitialized]);

  // Fetch distinct DB filter options (intervals for R-MANT-02, failure types for R-MANT-05) across all records
  React.useEffect(() => {
    let active = true;
    if (workOrderService.getFilterOptions) {
      workOrderService.getFilterOptions(type)
        .then(opts => {
          if (active) setDbFilterOptions(opts);
        })
        .catch(err => console.error('Error loading filter options:', err));
    }
    return () => { active = false; };
  }, [type]);

  // Debounce search input to avoid excessive DB queries while typing
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Build zone options strictly in Configuration module order (sorted by orderIndex)
  const uniqueZones = React.useMemo(() => {
    const configuredZones = zoneStructures.flatMap(z =>
      z.lines && z.lines.length > 0
        ? z.lines.map(l => `${z.name} - ${l}`)
        : [z.name]
    );
    const ordered: string[] = [];
    const seen = new Set<string>();
    for (const z of configuredZones) {
      if (z && !seen.has(z)) {
        seen.add(z);
        ordered.push(z);
      }
    }
    // Append any legacy machine zones not present in current Configuration so no record is unreachable
    const extraZones = Array.from(
      new Set(machines.map(m => m.zone).filter((z): z is string => Boolean(z && !seen.has(z))))
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return [...ordered, ...extraZones];
  }, [zoneStructures, machines]);

  // Build interval options (R-MANT-02) from Configuration maintenance plans + DB values, ordered by hours ascending
  const uniqueIntervals = React.useMemo(() => {
    const configured = maintenancePlans
      .flatMap(p => p.intervals || [])
      .map(i => i.label)
      .filter((v): v is string => Boolean(v));
    const combined = Array.from(new Set([...configured, ...dbFilterOptions.intervals]));
    return combined.sort((a, b) => {
      const diff = extractIntervalHours(a) - extractIntervalHours(b);
      return diff !== 0 ? diff : a.localeCompare(b, undefined, { numeric: true });
    });
  }, [maintenancePlans, dbFilterOptions.intervals]);

  // Build failure type options (R-MANT-05) in canonical form order + any extra DB values
  const uniqueFailureTypes = React.useMemo(() => {
    const ordered: string[] = [];
    const seen = new Set<string>();
    for (const ft of DEFAULT_FAILURE_TYPES) {
      seen.add(ft);
      ordered.push(ft);
    }
    const extras = dbFilterOptions.failureTypes
      .filter(ft => ft && !seen.has(ft))
      .sort((a, b) => a.localeCompare(b));
    return [...ordered, ...extras];
  }, [dbFilterOptions.failureTypes]);

  const statusOptions = [
    { label: 'SOLICITADO', value: WorkOrderStage.REQUESTED },
    { label: 'EJECUCIÓN', value: WorkOrderStage.EXECUTION },
    { label: 'SUPERVISIÓN', value: WorkOrderStage.HANDOVER },
    { label: 'CERRADO', value: WorkOrderStage.CLOSED }
  ];

  // Build server-side query filters spanning the entire database
  const activeFilters = React.useMemo<WorkOrderFilters>(() => {
    const filters: WorkOrderFilters = {};

    if (selectedZone) {
      filters.machineIds = machines
        .filter(m => m.zone === selectedZone)
        .map(m => m.id);
    }

    const trimmedSearch = debouncedSearchQuery.trim();
    if (trimmedSearch) {
      const searchLower = trimmedSearch.toLowerCase();
      filters.search = trimmedSearch;
      const candidateMachines = selectedZone
        ? machines.filter(m => m.zone === selectedZone)
        : machines;
      filters.searchMachineIds = candidateMachines
        .filter(m =>
          m.name?.toLowerCase().includes(searchLower) ||
          m.plate?.toLowerCase().includes(searchLower) ||
          m.alias?.toLowerCase().includes(searchLower)
        )
        .map(m => m.id);
    }

    if (type === 'R-MANT-02' && selectedInterval) {
      filters.interval = selectedInterval;
    }

    if (type === 'R-MANT-05' && selectedFailureType) {
      filters.failureType = selectedFailureType;
    }

    if (selectedStatus) {
      filters.stage = selectedStatus;
    }

    if (startDateFilter) {
      filters.startDate = startDateFilter;
    }

    if (endDateFilter) {
      filters.endDate = endDateFilter;
    }

    return filters;
  }, [
    machines,
    selectedZone,
    debouncedSearchQuery,
    type,
    selectedInterval,
    selectedFailureType,
    selectedStatus,
    startDateFilter,
    endDateFilter
  ]);

  // Fetch matching orders from the database whenever type or any filter changes (always reset to page 1)
  React.useEffect(() => {
    // Wait for master data if a machine-dependent filter (zone or search) is active
    if ((selectedZone || debouncedSearchQuery.trim()) && !masterInitialized) {
      return;
    }
    fetchOrders(1, 50, type, activeFilters);
  }, [type, activeFilters, fetchOrders, masterInitialized, selectedZone, debouncedSearchQuery]);

  // Guard against briefly displaying orders from another formType during route transitions
  const filteredOrders = React.useMemo(
    () => workOrders.filter(o => o.formType === type),
    [workOrders, type]
  );

  const handleExportPDF = async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      const ordersToExport =
        pagination.total > filteredOrders.length
          ? await fetchAllFilteredOrders(type, activeFilters)
          : filteredOrders;
      generateWorkOrderReport(ordersToExport, getFiltersDescription(), machines, type, plantSettings.logoUrl);
    } catch (err) {
      console.error('Error exporting filtered work orders PDF:', err);
    } finally {
      setExportingPdf(false);
    }
  };

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

  const getFiltersDescription = () => {
    const parts = [];
    if (searchQuery) parts.push(`Búsqueda: "${searchQuery}"`);
    if (selectedStatus) {
      const statusLabel = statusOptions.find(opt => opt.value === selectedStatus)?.label;
      parts.push(`Estado: ${statusLabel}`);
    }
    if (selectedZone) parts.push(`Zona: ${selectedZone}`);
    if (type === 'R-MANT-02' && selectedInterval) parts.push(`Intervalo: ${selectedInterval}`);
    if (type === 'R-MANT-05' && selectedFailureType) parts.push(`Falla: ${selectedFailureType}`);

    if (startDateFilter || endDateFilter) {
      parts.push(`Rango: ${startDateFilter ? formatDate(startDateFilter) : 'Inicio'} a ${endDateFilter ? formatDate(endDateFilter) : 'Hoy'}`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'Todos los registros';
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={exportingPdf}
            onClick={handleExportPDF}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white px-4 py-2 rounded text-sm font-medium transition-colors shadow-lg shadow-emerald-900/20 flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            {exportingPdf ? 'Exportando...' : 'Exportar PDF'}
          </button>
          {canCreate && (
            <button
              onClick={() => navigate('/orders/new', { state: { type } })}
              className="bg-industrial-accent hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors shadow-lg shadow-blue-900/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('mant.new')}
            </button>
          )}
        </div>
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

        {/* Dynamic Filter (Interval or Failure Type) */}
        {type === 'R-MANT-02' ? (
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
        ) : (
          <select
            value={selectedFailureType}
            onChange={(e) => setSelectedFailureType(e.target.value)}
            className="px-4 py-2 bg-industrial-900 border border-industrial-700 rounded-lg text-sm text-white focus:outline-none focus:border-industrial-accent transition-colors"
          >
            <option value="">Todas las Averías</option>
            {uniqueFailureTypes.map(ft => (
              <option key={ft} value={ft}>{ft}</option>
            ))}
          </select>
        )}

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

      {/* Date Range Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-industrial-800/30 p-4 rounded-xl border border-industrial-700/30 border-t-0 -mt-6">
        <div className="md:col-span-2 flex items-center gap-4">
          <span className="text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: '#FFFFFF' }} fill="none" />
            Filtrar por Rango de Fechas:
          </span>
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1">
              <DateInput
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-industrial-900 border border-industrial-700 rounded text-xs text-white focus:border-industrial-accent outline-none"
              />
            </div>

            <span className="text-industrial-600 flex items-center">al</span>

            <div className="relative flex-1">
              <DateInput
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-industrial-900 border border-industrial-700 rounded text-xs text-white focus:border-industrial-accent outline-none"
              />
            </div>
          </div>
        </div>
        <div className="md:col-span-2 flex justify-end">
          {(startDateFilter || endDateFilter) && (
            <button
              onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }}
              className="text-xs text-industrial-500 hover:text-industrial-300 transition-colors"
            >
              Limpiar Fechas
            </button>
          )}
        </div>
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
                  <>
                    <th className="px-6 py-4">Máquina / Accesorio</th>
                    <th className="px-6 py-4">Ubicación</th>
                  </>
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
                  <td colSpan={8} className="px-6 py-12 text-center text-industrial-600 italic">
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
                          {/* Ubicación */}
                          <td className="px-6 py-4 text-white font-medium">
                            {machine?.zone || '-'}
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
                          <Calendar className="w-4 h-4" style={{ color: '#FFFFFF', strokeWidth: 3 }} />
                          {formatDate(order.createdDate)}
                        </div>
                      </td>

                      {/* Estado y Acciones */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {getStatusBadge(order.currentStage)}

                          {order.currentStage === WorkOrderStage.CLOSED && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevenir navegación
                                if (type === 'R-MANT-02') generateRMant02PDF(order, machine);
                                else generateRMant05PDF(order, machine);
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

        <div className="mt-4 flex justify-end px-6 py-4 bg-industrial-900 border-t border-industrial-700">
          <TablePagination
            totalItems={pagination.total}
            currentPage={pagination.page}
            itemsPerPage={pagination.limit}
            onPageChange={(p) => setPage(p, type, activeFilters)}
            isLoading={loading}
          />
        </div>
      </div>
    </div>
  );
};

