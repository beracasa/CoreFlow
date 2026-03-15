import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Cpu, AlertTriangle, Battery, Gauge, Move, Trash2 } from 'lucide-react';
import { Machine, MachineStatus, WorkOrderStatus } from '../../types';
import { useWorkOrderStore } from '../../src/stores/useWorkOrderStore';

export type MapLayer = 'OPERATIONAL' | 'MAINTENANCE' | 'INVENTORY' | 'EFFICIENCY';

interface AssetNodeProps {
  machine: Machine;
  layer: MapLayer;
  onClick: (machine: Machine) => void;
  isSelected: boolean;
  isEditMode?: boolean;
  onMouseDown?: (e: React.MouseEvent, machine: Machine) => void;
  onDelete?: () => void;
}

export const AssetNode: React.FC<AssetNodeProps> = ({ machine, layer, onClick, isSelected, isEditMode, onMouseDown, onDelete }) => {
  const { workOrders } = useWorkOrderStore();

  // Logic to determine color state based on Active Layer
  const getStateColor = () => {
    if (isEditMode) return 'bg-industrial-700 border-dashed border-2 border-industrial-400 opacity-90';

    switch (layer) {
      case 'MAINTENANCE':
        // Mock logic: Maintenance urgency
        const daysToMaint = Math.floor((new Date(machine.nextMaintenance).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        if (daysToMaint < 3) return 'bg-red-500 border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.6)]';
        if (daysToMaint < 14) return 'bg-yellow-500 border-yellow-400';
        return 'bg-emerald-600 border-emerald-400';

      case 'INVENTORY':
        // Mock logic: Spare parts availability (Random for demo)
        if (machine.status === MachineStatus.WARNING) return 'bg-orange-500 border-orange-400';
        return 'bg-blue-600 border-blue-400';

      case 'EFFICIENCY':
        // Mock logic: OEE (Use powerConsumption as proxy for load)
        if (machine.telemetry.powerConsumption > 40) return 'bg-emerald-500 border-emerald-400';
        if (machine.telemetry.powerConsumption > 20) return 'bg-yellow-500 border-yellow-400';
        return 'bg-slate-500 border-slate-400';

      case 'OPERATIONAL':
      default: {
        const hasActiveMaint = workOrders.some(wo => wo.machineId === machine.id && wo.status !== WorkOrderStatus.DONE);
        
        if (hasActiveMaint) {
          return 'bg-industrial-danger border-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]';
        }

        // Si no tiene mantenimiento activo, se considera operativo (verde)
        return 'bg-industrial-success border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]';
      }
    }
  };

  const getIcon = () => {
    if (isEditMode) return <Move className="w-5 h-5 text-industrial-300" />;
    if (layer === 'MAINTENANCE') return <Settings className="w-5 h-5 text-white" />;
    if (layer === 'INVENTORY') return <Battery className="w-5 h-5 text-white" />;
    if (layer === 'EFFICIENCY') return <Gauge className="w-5 h-5 text-white" />;
    if (machine.status === MachineStatus.WARNING) return <AlertTriangle className="w-5 h-5 text-white" />;
    return <Cpu className="w-5 h-5 text-white" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: isEditMode ? 1.05 : 1.1 }}
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 group z-10 ${isEditMode ? 'cursor-move' : 'cursor-pointer'}`}
      style={{ left: `${machine.location.x}%`, top: `${machine.location.y}%` }}
      onClick={(e) => {
        e.stopPropagation();
        if (!isEditMode) onClick(machine);
      }}
      onMouseDown={(e) => isEditMode && onMouseDown && onMouseDown(e, machine)}
    >
      {/* Label above */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-industrial-900/80 backdrop-blur border border-industrial-600 text-[10px] font-mono text-white whitespace-nowrap opacity-100">
        {machine.name}
      </div>

      {/* Main Node Shape */}
      <div
        className={`
          w-16 h-16 md:w-20 md:h-20 rounded-xl flex flex-col items-center justify-center 
          border-2 transition-colors duration-500
          ${getStateColor()}
          ${isSelected && !isEditMode ? 'ring-4 ring-white/50 scale-110' : ''}
        `}
      >
        {getIcon()}
        {!isEditMode && (
          <span className="mt-1 text-[10px] font-bold text-white drop-shadow-md">
            {layer === 'EFFICIENCY' ? 'OEE' : 'STAT'}
          </span>
        )}
      </div>

      {/* Telemetry Badge (Hidden in Edit Mode) */}
      {!isEditMode && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-industrial-900 text-white text-[9px] px-2 py-0.5 rounded-full border border-industrial-700 shadow-lg font-mono">
          {layer === 'EFFICIENCY' ? '88%' : `${machine.telemetry.temperature}°C`}
        </div>
      )}
      {/* Delete Button (Edit Mode) */}
      {isEditMode && onDelete && (
        <button
          onMouseDown={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -top-2 -right-2 p-1.5 bg-red-500 rounded-full text-white shadow-lg hover:bg-red-600 transition-colors z-50 hover:scale-110"
        >
          <Trash2 size={12} />
        </button>
      )}
    </motion.div>
  );
};