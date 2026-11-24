import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle,
  Clock,
  RefreshCw,
  Wrench,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkOrderStore } from '../src/stores/useWorkOrderStore';
import { WorkOrder, WorkOrderStage, WorkOrderStatus } from '../types';

type ResolvedStage = 'REQUESTED' | 'EXECUTION' | 'HANDOVER' | 'CLOSED';

interface MaintenanceOpenStats {
  abiertos: number;
  solicitados: number;
  enEjecucion: number;
  enSupervision: number;
}

interface DonutDatum {
  name: string;
  value: number;
  color: string;
}

const normalizeKey = (value?: string | null): string =>
  (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const resolveOrderStage = (order: WorkOrder): ResolvedStage => {
  switch (order.currentStage) {
    case WorkOrderStage.CLOSED:
      return 'CLOSED';
    case WorkOrderStage.HANDOVER:
      return 'HANDOVER';
    case WorkOrderStage.EXECUTION:
      return 'EXECUTION';
    case WorkOrderStage.REQUESTED:
    case WorkOrderStage.DRAFT:
      return 'REQUESTED';
    default:
      if (order.status === WorkOrderStatus.DONE) return 'CLOSED';
      if (order.status === WorkOrderStatus.REVIEW) return 'HANDOVER';
      if (order.status === WorkOrderStatus.IN_PROGRESS) return 'EXECUTION';
      return 'REQUESTED';
  }
};

const computeOpenStats = (
  orders: WorkOrder[],
  formType: 'R-MANT-02' | 'R-MANT-05'
): MaintenanceOpenStats => {
  let solicitados = 0;
  let enEjecucion = 0;
  let enSupervision = 0;

  for (const order of orders) {
    if (order.formType !== formType) continue;
    const stage = resolveOrderStage(order);
    if (stage === 'REQUESTED') solicitados += 1;
    else if (stage === 'EXECUTION') enEjecucion += 1;
    else if (stage === 'HANDOVER') enSupervision += 1;
  }

  return {
    abiertos: solicitados + enEjecucion + enSupervision,
    solicitados,
    enEjecucion,
    enSupervision,
  };
};

const FAILURE_TYPE_CATEGORIES: { key: string; label: string; color: string }[] = [
  { key: 'mecanica', label: 'Mecánica', color: '#3b82f6' },
  { key: 'electrica', label: 'Eléctrica', color: '#f59e0b' },
  { key: 'plomeria', label: 'Plomería', color: '#06b6d4' },
];

const CONDITION_CATEGORIES: { key: string; label: string; color: string }[] = [
  { key: 'normal', label: 'Normal', color: '#10b981' },
  { key: 'media', label: 'Media', color: '#f59e0b' },
  { key: 'critica', label: 'Crítica', color: '#ef4444' },
];

const CONSEQUENCE_CATEGORIES: { key: string; label: string; color: string }[] = [
  { key: 'ninguna', label: 'Ninguna', color: '#10b981' },
  { key: 'bajo rendimiento', label: 'Bajo Rendimiento', color: '#f59e0b' },
  { key: 'parada', label: 'Parada', color: '#ef4444' },
];

interface MaintenanceKpiCardProps {
  title: string;
  code: 'R-MANT-02' | 'R-MANT-05';
  accent: 'blue' | 'orange';
  icon: React.ReactNode;
  stats: MaintenanceOpenStats;
  loading: boolean;
  onNavigate: () => void;
}

const MaintenanceKpiCard: React.FC<MaintenanceKpiCardProps> = ({
  title,
  code,
  accent,
  icon,
  stats,
  loading,
  onNavigate,
}) => {
  const accentStyles =
    accent === 'blue'
      ? {
          topBar: 'from-blue-500 to-cyan-400',
          iconWrap: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
          codeBadge: 'bg-blue-600/20 text-blue-300 border-blue-500/40',
          hoverBorder: 'hover:border-blue-500/50',
        }
      : {
          topBar: 'from-orange-500 to-amber-400',
          iconWrap: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
          codeBadge: 'bg-orange-600/20 text-orange-300 border-orange-500/40',
          hoverBorder: 'hover:border-orange-500/50',
        };

  const total = stats.abiertos;
  const pctSolicitados = total > 0 ? (stats.solicitados / total) * 100 : 0;
  const pctEjecucion = total > 0 ? (stats.enEjecucion / total) * 100 : 0;
  const pctSupervision = total > 0 ? (stats.enSupervision / total) * 100 : 0;

  return (
    <div
      className={`relative overflow-hidden bg-industrial-800 rounded-xl border border-industrial-700 ${accentStyles.hoverBorder} shadow-xl transition-all duration-200 flex flex-col`}
    >
      {/* Top accent strip */}
      <div className={`h-1 w-full bg-gradient-to-r ${accentStyles.topBar}`} />

      <div className="p-6 flex flex-col flex-1">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`p-2.5 rounded-lg border shrink-0 ${accentStyles.iconWrap}`}
            >
              {icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${accentStyles.codeBadge}`}
                >
                  {code}
                </span>
              </div>
              <h3 className="text-base font-bold text-white leading-snug">
                {title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigate}
            className="p-1.5 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-700/70 transition-colors shrink-0"
            title={`Ver listado de ${title}`}
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Hero KPI: Abiertos */}
        <div className="mb-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-industrial-400 block mb-1">
            Abiertos
          </span>
          {loading ? (
            <div className="h-12 w-24 rounded-lg bg-industrial-700/70 animate-pulse" />
          ) : (
            <div className="flex items-baseline gap-2.5">
              <span className="text-5xl font-mono font-bold text-white tracking-tight">
                {stats.abiertos}
              </span>
              <span className="text-xs text-industrial-400">
                {stats.abiertos === 1 ? 'orden abierta' : 'órdenes abiertas'}
              </span>
            </div>
          )}
        </div>

        {/* Proportional Status Distribution Bar */}
        <div className="w-full h-2 rounded-full bg-industrial-900 overflow-hidden flex mb-5 border border-industrial-700/60">
          {!loading && total > 0 ? (
            <>
              {pctSolicitados > 0 && (
                <div
                  className="bg-blue-500 h-full transition-all duration-500"
                  style={{ width: `${pctSolicitados}%` }}
                  title={`Solicitados: ${stats.solicitados}`}
                />
              )}
              {pctEjecucion > 0 && (
                <div
                  className="bg-pink-500 h-full transition-all duration-500"
                  style={{ width: `${pctEjecucion}%` }}
                  title={`En ejecución: ${stats.enEjecucion}`}
                />
              )}
              {pctSupervision > 0 && (
                <div
                  className="bg-purple-500 h-full transition-all duration-500"
                  style={{ width: `${pctSupervision}%` }}
                  title={`En supervisión: ${stats.enSupervision}`}
                />
              )}
            </>
          ) : (
            <div className="w-full h-full bg-industrial-800/40" />
          )}
        </div>

        {/* Status Breakdown (exact maintenance status colors) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-auto">
          {/* Solicitados - Blue */}
          <div className="rounded-lg px-3 py-2.5 bg-blue-900/30 border border-blue-700/70 flex items-center justify-between sm:flex-col sm:items-start gap-1">
            <div className="flex items-center gap-1.5 text-blue-300">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-semibold">Solicitados</span>
            </div>
            {loading ? (
              <div className="h-6 w-8 rounded bg-blue-800/50 animate-pulse" />
            ) : (
              <span className="text-xl font-mono font-bold text-blue-200 leading-none sm:mt-1">
                {stats.solicitados}
              </span>
            )}
          </div>

          {/* En ejecución - Pink */}
          <div className="rounded-lg px-3 py-2.5 bg-pink-900/30 border border-pink-700/70 flex items-center justify-between sm:flex-col sm:items-start gap-1">
            <div className="flex items-center gap-1.5 text-pink-300">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-semibold">En ejecución</span>
            </div>
            {loading ? (
              <div className="h-6 w-8 rounded bg-pink-800/50 animate-pulse" />
            ) : (
              <span className="text-xl font-mono font-bold text-pink-200 leading-none sm:mt-1">
                {stats.enEjecucion}
              </span>
            )}
          </div>

          {/* En supervisión - Purple */}
          <div className="rounded-lg px-3 py-2.5 bg-purple-900/30 border border-purple-700/70 flex items-center justify-between sm:flex-col sm:items-start gap-1">
            <div className="flex items-center gap-1.5 text-purple-300">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-semibold">En supervisión</span>
            </div>
            {loading ? (
              <div className="h-6 w-8 rounded bg-purple-800/50 animate-pulse" />
            ) : (
              <span className="text-xl font-mono font-bold text-purple-200 leading-none sm:mt-1">
                {stats.enSupervision}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface DonutCardProps {
  title: string;
  subtitle?: string;
  data: DonutDatum[];
  loading: boolean;
}

const HorizontalDonutCard: React.FC<DonutCardProps> = ({
  title,
  subtitle,
  data,
  loading,
}) => {
  const total = useMemo(
    () => data.reduce((acc, item) => acc + item.value, 0),
    [data]
  );

  const nonZeroData = useMemo(
    () => data.filter((item) => item.value > 0),
    [data]
  );

  return (
    <div className="relative bg-industrial-800 rounded-xl border border-industrial-700 hover:border-orange-500/40 shadow-xl transition-all duration-200 flex flex-col">
      {/* Top accent strip */}
      <div className="h-1 w-full rounded-t-xl bg-gradient-to-r from-orange-500 to-amber-400 shrink-0" />

      <div className="p-4 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-baseline justify-between gap-2 mb-3 shrink-0">
          <h4 className="text-sm font-bold text-white leading-tight truncate">
            {title}
          </h4>
          {subtitle && (
            <span className="text-[11px] font-medium text-industrial-400 shrink-0">
              {subtitle}
            </span>
          )}
        </div>

        {/* Horizontal Body: Fixed-size Donut (left) + Readable Legend (right) */}
        <div className="flex items-center gap-4 flex-1">
          {/* Left: Fixed-size Donut Chart so both cards match identically */}
          <div className="relative w-36 h-36 shrink-0">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-28 h-28 rounded-full border-8 border-industrial-700 animate-pulse" />
              </div>
            ) : total === 0 ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-28 h-28 rounded-full border-[10px] border-industrial-700/60 flex flex-col items-center justify-center">
                  <span className="text-lg font-mono font-bold text-industrial-400">
                    0
                  </span>
                  <span className="text-[10px] text-industrial-500">
                    Sin datos
                  </span>
                </div>
              </div>
            ) : (
              <>
                {/* Center Total Label rendered behind Recharts so Tooltip always sits on top */}
                <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-mono font-bold text-white leading-none">
                    {total}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-industrial-400 mt-1">
                    Total
                  </span>
                </div>

                <div className="relative z-10 w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={nonZeroData}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={64}
                        paddingAngle={nonZeroData.length > 1 ? 2 : 0}
                        dataKey="value"
                        stroke="none"
                      >
                        {nonZeroData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        wrapperStyle={{ zIndex: 50, pointerEvents: 'none' }}
                        formatter={(value: number, name: string) => {
                          const pct =
                            total > 0
                              ? ((value / total) * 100).toFixed(1)
                              : '0.0';
                          return [`${value} (${pct}%)`, name];
                        }}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          borderRadius: '0.5rem',
                          fontSize: '12px',
                          padding: '6px 10px',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)',
                          color: '#f8fafc',
                        }}
                        itemStyle={{ color: '#f8fafc', fontWeight: 600 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>

          {/* Right: Clean Vertical Legend */}
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
            {data.map((item) => {
              const pct =
                total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-2 bg-industrial-900/55 border border-industrial-700/50 rounded-md px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs font-medium text-industrial-200 truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 shrink-0 font-mono">
                    <span className="text-xs font-bold text-white">
                      {loading ? '-' : item.value}
                    </span>
                    <span className="text-[10px] text-industrial-400">
                      {loading ? '' : `${pct}%`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const BreakdownListCard: React.FC<DonutCardProps> = ({
  title,
  subtitle,
  data,
  loading,
}) => {
  const total = useMemo(
    () => data.reduce((acc, item) => acc + item.value, 0),
    [data]
  );

  return (
    <div className="relative bg-industrial-800 rounded-xl border border-industrial-700 hover:border-orange-500/40 shadow-xl transition-all duration-200 flex flex-col h-full">
      {/* Top accent strip */}
      <div className="h-1 w-full rounded-t-xl bg-gradient-to-r from-orange-500 to-amber-400 shrink-0" />

      <div className="p-4 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-baseline justify-between gap-2 mb-3 shrink-0">
          <h4 className="text-sm font-bold text-white leading-tight truncate">
            {title}
          </h4>
          {subtitle && (
            <span className="text-[11px] font-medium text-industrial-400 shrink-0">
              {subtitle}
            </span>
          )}
        </div>

        {/* List Body: Label, Count & Percentage */}
        <div className="flex-1 flex flex-col justify-center gap-2">
          {data.map((item) => {
            const pct =
              total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
            return (
              <div
                key={item.name}
                className="flex items-center justify-between gap-2 bg-industrial-900/55 border border-industrial-700/50 rounded-md px-2.5 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-medium text-industrial-200 truncate">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 shrink-0 font-mono">
                  <span className="text-xs font-bold text-white">
                    {loading ? '-' : item.value}
                  </span>
                  <span className="text-[10px] text-industrial-400">
                    {loading ? '' : `${pct}%`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const Analytics: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { allOrders, allOrdersLoading, fetchAllOrders } = useWorkOrderStore();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = async () => {
    await fetchAllOrders();
    setLastUpdated(new Date());
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preventiveStats = useMemo(
    () => computeOpenStats(allOrders, 'R-MANT-02'),
    [allOrders]
  );

  const correctiveStats = useMemo(
    () => computeOpenStats(allOrders, 'R-MANT-05'),
    [allOrders]
  );

  const correctiveOrders = useMemo(
    () => allOrders.filter((o) => o.formType === 'R-MANT-05'),
    [allOrders]
  );

  const failureTypeData = useMemo<DonutDatum[]>(() => {
    const counts: Record<string, number> = {};
    for (const order of correctiveOrders) {
      const rawKey = normalizeKey(order.failureType);
      const key = rawKey === 'electronica' ? 'electrica' : rawKey;
      if (key) counts[key] = (counts[key] || 0) + 1;
    }
    return FAILURE_TYPE_CATEGORIES.map((cat) => ({
      name: cat.label,
      value: counts[cat.key] || 0,
      color: cat.color,
    }));
  }, [correctiveOrders]);

  const conditionData = useMemo<DonutDatum[]>(() => {
    const counts: Record<string, number> = {};
    for (const order of correctiveOrders) {
      const key = normalizeKey(order.condition);
      if (key) counts[key] = (counts[key] || 0) + 1;
    }
    return CONDITION_CATEGORIES.map((cat) => ({
      name: cat.label,
      value: counts[cat.key] || 0,
      color: cat.color,
    }));
  }, [correctiveOrders]);

  const consequenceData = useMemo<DonutDatum[]>(() => {
    const counts: Record<string, number> = {};
    for (const order of correctiveOrders) {
      const key = normalizeKey(order.consequence);
      if (key) counts[key] = (counts[key] || 0) + 1;
    }
    return CONSEQUENCE_CATEGORIES.map((cat) => ({
      name: cat.label,
      value: counts[cat.key] || 0,
      color: cat.color,
    }));
  }, [correctiveOrders]);

  const isInitialLoading = allOrdersLoading && allOrders.length === 0;

  return (
    <div className="h-full bg-industrial-900 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="p-2 bg-industrial-800 rounded-lg border border-industrial-700">
              <BarChart3 className="w-6 h-6 text-industrial-accent" />
            </span>
            {t('analytics.title')}
          </h2>
          <p className="text-sm text-industrial-400 mt-1 ml-14">
            Indicadores clave de gestión de mantenimiento con datos en tiempo real
          </p>
        </div>

        <div className="flex items-center gap-3 ml-14 sm:ml-0">
          {lastUpdated && (
            <span className="text-xs text-industrial-500 font-mono">
              Actualizado:{' '}
              {lastUpdated.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          )}
          <button
            type="button"
            onClick={loadData}
            disabled={allOrdersLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-industrial-800 hover:bg-industrial-700 border border-industrial-700 text-xs font-semibold text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${allOrdersLoading ? 'animate-spin' : ''}`}
            />
            Actualizar
          </button>
        </div>
      </div>

      {/* Section: Estado Actual de Mantenimientos Abiertos */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-industrial-400">
          Órdenes de Mantenimiento Abiertas
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <MaintenanceKpiCard
          title="Mantenimientos Preventivos R-MANT-02"
          code="R-MANT-02"
          accent="blue"
          icon={<Wrench className="w-5 h-5" />}
          stats={preventiveStats}
          loading={isInitialLoading}
          onNavigate={() => navigate('/orders/preventive')}
        />

        <MaintenanceKpiCard
          title="Mantenimientos Correctivos R-MANT-05"
          code="R-MANT-05"
          accent="orange"
          icon={<AlertTriangle className="w-5 h-5" />}
          stats={correctiveStats}
          loading={isInitialLoading}
          onNavigate={() => navigate('/orders/corrective')}
        />
      </div>

      {/* Section: Distribución de Correctivos (3/4 del ancho para 2 fichas rectangulares + 1/4 reservado a la derecha) */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-industrial-400">
          Distribución de Mantenimientos Correctivos
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-6">
          <HorizontalDonutCard
            title="Correctivos R-MANT-05"
            subtitle="Por Tipo de Avería"
            data={failureTypeData}
            loading={isInitialLoading}
          />

          <HorizontalDonutCard
            title="Correctivos R-MANT-05"
            subtitle="Por Condición"
            data={conditionData}
            loading={isInitialLoading}
          />
        </div>

        {/* Ficha Consecuencia por avería (1/4 del tablero, sin gráfico circular) */}
        <div className="lg:col-span-3">
          <BreakdownListCard
            title="Consecuencia por avería"
            data={consequenceData}
            loading={isInitialLoading}
          />
        </div>
      </div>
    </div>
  );
};
