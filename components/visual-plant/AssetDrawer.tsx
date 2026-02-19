import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Box, Calendar, Clock, AlertTriangle, Gauge } from 'lucide-react';
import { Machine, MachineStatus } from '../../types';
import { PredictiveAnalysis } from '../../services/geminiService';

interface AssetDrawerProps {
  machine: Machine | null;
  onClose: () => void;
  analysis: PredictiveAnalysis | null;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
  onCreateWorkOrder: () => void;
}

export const AssetDrawer: React.FC<AssetDrawerProps> = ({ machine, onClose, analysis, onRunAnalysis, isAnalyzing, onCreateWorkOrder }) => {
  if (!machine) return null;

  // Mock Data for "Kardex Health"
  const criticalSpares = [
    { name: 'Servo Motor Axis-X', status: 'IN_STOCK', qty: 2 },
    { name: 'Hydraulic Seal Kit', status: 'LOW_STOCK', qty: 1 },
    { name: 'PLC IO Module', status: 'OUT_OF_STOCK', qty: 0 },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute top-0 right-0 h-full w-full md:w-[450px] bg-industrial-800/95 backdrop-blur-xl border-l border-industrial-600 shadow-2xl z-40 flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-industrial-700 flex justify-between items-start bg-industrial-900/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${machine.status === 'RUNNING' ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-xs font-mono text-industrial-400">{machine.id.toUpperCase()}</span>
            </div>
            <h2 className="text-2xl font-bold text-white font-sans">{machine.name}</h2>
            <p className="text-sm text-industrial-500">{machine.type} Unidad de Alta Precisión</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-industrial-700 rounded-full text-industrial-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Quick KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-industrial-900 p-3 rounded border border-industrial-700">
              <div className="flex items-center gap-1 text-industrial-500 mb-1 text-xs">
                <Clock size={12} /> MTTR
              </div>
              <div className="text-lg font-mono text-white">4.2h</div>
            </div>
            <div className="bg-industrial-900 p-3 rounded border border-industrial-700">
              <div className="flex items-center gap-1 text-industrial-500 mb-1 text-xs">
                <Activity size={12} /> MTBF
              </div>
              <div className="text-lg font-mono text-white">148h</div>
            </div>
            <div className="bg-industrial-900 p-3 rounded border border-industrial-700">
              <div className="flex items-center gap-1 text-industrial-500 mb-1 text-xs">
                <Gauge size={12} /> OEE
              </div>
              <div className="text-lg font-mono text-industrial-accent">92%</div>
            </div>
          </div>

          {/* AI Analysis Card */}
          <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 rounded-xl p-[1px] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <div className="bg-industrial-800/80 rounded-xl p-4 h-full">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <span className="text-indigo-400">✦</span> Diagnóstico IA
                </h3>
                {!analysis && (
                  <button
                    onClick={onRunAnalysis}
                    disabled={isAnalyzing}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded transition-colors"
                  >
                    {isAnalyzing ? 'Analizando...' : 'Ejecutar Análisis'}
                  </button>
                )}
              </div>

              {isAnalyzing && (
                <div className="flex flex-col gap-2">
                  <div className="h-2 bg-industrial-700 rounded w-full animate-pulse"></div>
                  <div className="h-2 bg-industrial-700 rounded w-2/3 animate-pulse"></div>
                </div>
              )}

              {analysis && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex justify-between items-end border-b border-white/10 pb-2">
                    <span className="text-xs text-industrial-400">Puntaje de Salud</span>
                    <span className={`text-2xl font-mono font-bold ${analysis.healthScore < 70 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {analysis.healthScore}<span className="text-sm text-industrial-600">/100</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-industrial-500 font-bold">Falla Predicha</span>
                    <p className="text-white text-sm mt-0.5">{analysis.predictedFailure}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-industrial-500 font-bold">Recomendación</span>
                    <p className="text-indigo-300 text-sm mt-0.5">{analysis.recommendedAction}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Critical Spares (Kardex Integration) */}
          <div>
            <h3 className="text-sm font-bold text-industrial-400 uppercase mb-3 flex items-center gap-2">
              <Box size={14} /> Repuestos Críticos (Kardex)
            </h3>
            <div className="space-y-2">
              {criticalSpares.map((part, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-industrial-900 rounded border border-industrial-700">
                  <span className="text-sm text-gray-300">{part.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-industrial-500">Cant: {part.qty}</span>
                    <span className={`w-2 h-2 rounded-full ${part.status === 'IN_STOCK' ? 'bg-emerald-500' :
                        part.status === 'LOW_STOCK' ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'
                      }`}></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Maintenance Countdown */}
          <div>
            <h3 className="text-sm font-bold text-industrial-400 uppercase mb-3 flex items-center gap-2">
              <Calendar size={14} /> Próximo Servicio
            </h3>
            <div className="bg-industrial-900 rounded-lg p-4 border border-industrial-700 flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">Preventivo R-MANT-02</p>
                <p className="text-xs text-industrial-500">Programado: {new Date(machine.nextMaintenance).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <span className="block text-2xl font-mono text-industrial-accent">
                  {Math.ceil((new Date(machine.nextMaintenance).getTime() - new Date().getTime()) / (1000 * 3600 * 24))}
                </span>
                <span className="text-[10px] text-industrial-500 uppercase">Días Restantes</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-industrial-700 bg-industrial-900/80 gap-2 flex">
          <button className="flex-1 bg-industrial-700 hover:bg-industrial-600 text-white py-2 rounded text-sm transition-colors border border-industrial-600">
            Ver Historial
          </button>
          <button
            onClick={onCreateWorkOrder}
            className="flex-1 bg-industrial-accent hover:bg-blue-600 text-white py-2 rounded text-sm font-medium shadow-lg shadow-blue-900/20 transition-colors"
          >
            Crear Orden de Trabajo
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};