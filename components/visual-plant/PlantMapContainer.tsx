import React, { useState, useRef } from 'react';
import { Layers, Activity, Wrench, Battery, Gauge, ZoomIn, ZoomOut, Maximize, Edit3, Save, Plus, Move, Trash2 } from 'lucide-react';
import { AssetNode, MapLayer } from './AssetNode';
import { AssetDrawer } from './AssetDrawer';
import { AssetSelectionModal } from '../modals/AssetSelectionModal';
import { ZoneModal } from '../modals/ZoneModal';
import { Machine, ZoneStructure } from '../../types';
import { analyzeMachineHealth, PredictiveAnalysis } from '../../services/geminiService';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkOrderStore } from '../../src/stores/useWorkOrderStore';

const ZONE_STYLE_MAP: Record<string, { border: string; bg: string; text: string; subtext: string; dotHex: string }> = {
  blue: { border: 'border-blue-500/60', bg: 'bg-blue-500/5', text: 'text-blue-400', subtext: 'text-blue-200', dotHex: '#3b82f6' },
  emerald: { border: 'border-emerald-500/60', bg: 'bg-emerald-500/5', text: 'text-emerald-400', subtext: 'text-emerald-200', dotHex: '#10b981' },
  amber: { border: 'border-amber-500/60', bg: 'bg-amber-500/5', text: 'text-amber-400', subtext: 'text-amber-200', dotHex: '#f59e0b' },
  purple: { border: 'border-purple-500/60', bg: 'bg-purple-500/5', text: 'text-purple-400', subtext: 'text-purple-200', dotHex: '#8b5cf6' },
  red: { border: 'border-red-500/60', bg: 'bg-red-500/5', text: 'text-red-400', subtext: 'text-red-200', dotHex: '#ef4444' },
  cyan: { border: 'border-cyan-500/60', bg: 'bg-cyan-500/5', text: 'text-cyan-400', subtext: 'text-cyan-200', dotHex: '#06b6d4' },
  slate: { border: 'border-industrial-500/50', bg: 'bg-industrial-800/30', text: 'text-industrial-200', subtext: 'text-industrial-300', dotHex: '#64748b' }
};

interface PlantMapContainerProps {
  machines: Machine[];
  zones: ZoneStructure[];
  onCreateWorkOrder: (machineId: string) => void;
  onMoveMachine?: (id: string, x: number, y: number) => void;
  onUpdateZone?: (zone: ZoneStructure) => void;
  onAddMachine?: (zoneId: string, lineName: string) => void;
  onAddZone?: (zone: ZoneStructure) => void;
  onRemoveZone?: (id: string) => void;
  onRemoveMachine?: (id: string) => void;
}

export const PlantMapContainer: React.FC<PlantMapContainerProps> = ({ machines, zones, onCreateWorkOrder, onMoveMachine, onUpdateZone, onAddMachine, onAddZone, onRemoveZone, onRemoveMachine }) => {
  const { t } = useLanguage();
  const { hasPermission } = useAuth();
  const [activeLayer, setActiveLayer] = useState<MapLayer>('OPERATIONAL');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Edit Mode & Dragging State
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null); // Machine ID
  const [draggingZoneId, setDraggingZoneId] = useState<string | null>(null);
  const [resizingZoneId, setResizingZoneId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null); // 'nw', 'ne', 'sw', 'se'

  // Track cursor offset to prevent jumping when dragging starts
  const [dragOffset, setDragOffset] = useState<{ x: number, y: number }>({ x: 0, y: 0 });

  // Draft state for fast dragging without hammering the backend
  const [draftMachinePos, setDraftMachinePos] = useState<{ id: string, x: number, y: number } | null>(null);
  const [draftZonePos, setDraftZonePos] = useState<{ id: string, x: number, y: number, w?: number, h?: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const { allOrders, isInitialized, fetchOrders } = useWorkOrderStore();

  React.useEffect(() => {
    if (!isInitialized || allOrders.length === 0) {
      fetchOrders();
    }
  }, [isInitialized, allOrders.length, fetchOrders]);

  // Analysis State
  const [analysis, setAnalysis] = useState<PredictiveAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Asset Selection State
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [assetModalType, setAssetModalType] = useState<'MACHINE' | 'ZONE'>('ZONE');
  const [targetZoneForMachine, setTargetZoneForMachine] = useState<{ id: string, line: string } | null>(null);

  // Zone Creation and Format Editing State
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ZoneStructure | null>(null);

  const handleOpenCreateZone = () => {
    setEditingZone(null);
    setIsZoneModalOpen(true);
  };

  const handleEditZone = (zone: ZoneStructure) => {
    setEditingZone(zone);
    setIsZoneModalOpen(true);
  };

  const handleSaveZoneModal = async (zoneData: ZoneStructure) => {
    if (editingZone && onUpdateZone) {
      await onUpdateZone(zoneData);
    } else if (onAddZone) {
      await onAddZone(zoneData);
    }
    setIsZoneModalOpen(false);
    setEditingZone(null);
  };

  const handleMachineClick = (machine: Machine) => {
    if (isEditMode) return;
    setSelectedMachine(machine);
    setAnalysis(null);
  };

  // Filter Placed/Unplaced Items
  const placedZones = zones.filter(z => (z.x !== undefined && z.y !== undefined && (z.x > 0 || z.y > 0)));
  const unplacedZones = zones.filter(z => !z.x && !z.y || (z.x === 0 && z.y === 0));

  const placedMachines = machines.filter(m => m.isActive !== false && (m.location?.x !== undefined && m.location?.y !== undefined && (m.location.x > 0 || m.location.y > 0)));
  const unplacedMachines = machines.filter(m => m.isActive !== false && (!m.location || (m.location.x === 0 && m.location.y === 0)));

  // Determine actual display data (merging draft states with store states)
  const displayMachines = placedMachines.map(m => draftMachinePos?.id === m.id ? { ...m, location: { x: draftMachinePos.x, y: draftMachinePos.y } } : m);
  const displayZones = placedZones.map(z => draftZonePos?.id === z.id ? { ...z, x: draftZonePos.x, y: draftZonePos.y, width: draftZonePos.w ?? z.width, height: draftZonePos.h ?? z.height } : z);

  const handleOpenAssetModal = (type: 'MACHINE' | 'ZONE', zoneInfo?: { id: string, line: string }) => {
    setAssetModalType(type);
    if (zoneInfo) setTargetZoneForMachine(zoneInfo);
    else setTargetZoneForMachine(null);
    setIsAssetModalOpen(true);
  };

  const handleSelectAsset = (item: Machine | ZoneStructure) => {
    if (assetModalType === 'ZONE' && onUpdateZone) {
      // Place Zone in center (simplification)
      onUpdateZone({ ...item as ZoneStructure, x: 10, y: 10, width: 20, height: 20 });
    } else if (assetModalType === 'MACHINE' && onMoveMachine) {
      // If adding to specific line in zone
      if (targetZoneForMachine) {
        // Logic to place inside zone would be ideal, for now default to near top-left of zone?
        // Or just center screen if generic add.
        // For now, let's place it at 50, 50 if generic, or try to find zone center.
        const zone = zones.find(z => z.id === targetZoneForMachine.id);
        const x = zone ? (zone.x || 0) + 5 : 50;
        const y = zone ? (zone.y || 0) + 5 : 50;
        onMoveMachine(item.id, x, y);

        // Also update machine zone/line metadata if needed?
        // The visual editor mainly handles position. 
        // The backend should ideally update the machine's zone field if we are dragging it into a zone.
        // But for "Add to Line" button, we definitely want to association.
        // FOR NOW: Visual Placement Only.
      } else {
        onMoveMachine(item.id, 50, 50);
      }
    }
    setIsAssetModalOpen(false);
  };

  const runAnalysis = async () => {
    if (!selectedMachine) return;
    setAnalyzing(true);
    try {
      const result = await analyzeMachineHealth(selectedMachine, selectedMachine.history);
      setAnalysis(result);
    } finally {
      setAnalyzing(false);
    }
  };

  // --- DRAG AND DROP LOGIC (MACHINES) ---
  const handleDragStart = (e: React.MouseEvent, machine: Machine) => {
    if (!isEditMode || !containerRef.current) return;
    e.stopPropagation();

    const rect = containerRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    setDragOffset({
      x: xPct - (machine.location?.x || 0),
      y: yPct - (machine.location?.y || 0)
    });

    setDraggingId(machine.id);
    setDraftMachinePos({ id: machine.id, x: machine.location.x, y: machine.location.y });
  };

  // --- ZONE EDITING LOGIC ---
  const handleZoneMouseDown = (e: React.MouseEvent, zone: ZoneStructure) => {
    if (!isEditMode || !containerRef.current) return;
    e.stopPropagation();

    const rect = containerRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    setDragOffset({
      x: xPct - (zone.x || 0),
      y: yPct - (zone.y || 0)
    });

    setDraggingZoneId(zone.id);
    setDraftZonePos({ id: zone.id, x: zone.x || 0, y: zone.y || 0, w: zone.width, h: zone.height });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, zone: ZoneStructure, handle: string) => {
    if (!isEditMode) return;
    e.stopPropagation();
    setResizingZoneId(zone.id);
    setResizeHandle(handle);
    setDraftZonePos({ id: zone.id, x: zone.x || 0, y: zone.y || 0, w: zone.width, h: zone.height });
  };

  const handleAddEquipmentToLine = (e: React.MouseEvent, zoneId: string, lineName: string) => {
    e.stopPropagation();
    if (onAddMachine) {
      onAddMachine(zoneId, lineName);
    } else {
      alert(`Agregar equipo a: ${lineName} (Funcionalidad pendiente de conexión con modal)`);
    }
  };


  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isEditMode || !containerRef.current) return;

    // Convert mouse delta to percentage
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    // 1. Moving Machine
    if (draggingId && onMoveMachine) {
      // Apply offset to cursor
      const targetX = xPct - dragOffset.x;
      const targetY = yPct - dragOffset.y;

      // Snap logic (optional, but keep it roughly grid-aligned if preferred)
      // For machines, we might just want free movement
      const clampedX = Math.max(0, Math.min(100, targetX));
      const clampedY = Math.max(0, Math.min(100, targetY));

      setDraftMachinePos({ id: draggingId, x: clampedX, y: clampedY });
      return;
    }

    // 2. Moving Zone
    if (draggingZoneId && onUpdateZone) {
      const zone = zones.find(z => z.id === draggingZoneId);
      if (zone) {
        // Apply offset to keep cursor relative to the zone
        let newX = xPct - dragOffset.x;
        let newY = yPct - dragOffset.y;

        // Bounds (ensure the zone doesn't bleed off the map 100x100 grid)
        newX = Math.max(0, Math.min(100 - (zone.width || 20), newX));
        newY = Math.max(0, Math.min(100 - (zone.height || 20), newY));

        setDraftZonePos({ id: zone.id, x: newX, y: newY, w: zone.width, h: zone.height });
      }
      return;
    }

    // 3. Resizing Zone
    if (resizingZoneId && resizeHandle && onUpdateZone) {
      const zone = zones.find(z => z.id === resizingZoneId);
      if (zone) {
        let newWidth = zone.width || 20;
        let newHeight = zone.height || 20;
        const currentX = zone.x || 0;
        const currentY = zone.y || 0;

        // Calculate new dimensions based on handle (Supporting SE only for now)
        if (resizeHandle.includes('e')) {
          newWidth = xPct - currentX;
        }
        if (resizeHandle.includes('s')) {
          newHeight = yPct - currentY;
        }

        // Constrain min size
        newWidth = Math.max(2, newWidth);
        newHeight = Math.max(2, newHeight);

        setDraftZonePos({ id: zone.id, x: currentX, y: currentY, w: newWidth, h: newHeight });
      }
    }
  };

  const handleMouseUp = () => {
    // Grid snapping on drop (optional, comment out if you want completely free placement)
    const snap = 1; // Snapping to 1% instead of 2.5% for finer control, or remove completely

    // Commit machine draft position
    if (draggingId && draftMachinePos && onMoveMachine) {
      const finalX = Math.round(draftMachinePos.x / snap) * snap;
      const finalY = Math.round(draftMachinePos.y / snap) * snap;
      onMoveMachine(draftMachinePos.id, finalX, finalY);
    }

    // Commit zone draft position/size
    if ((draggingZoneId || resizingZoneId) && draftZonePos && onUpdateZone) {
      const zone = zones.find(z => z.id === draftZonePos.id);
      if (zone) {
        const finalX = Math.round(draftZonePos.x / snap) * snap;
        const finalY = Math.round(draftZonePos.y / snap) * snap;
        const finalW = draftZonePos.w ? Math.round(draftZonePos.w / snap) * snap : zone.width;
        const finalH = draftZonePos.h ? Math.round(draftZonePos.h / snap) * snap : zone.height;
        onUpdateZone({ ...zone, x: finalX, y: finalY, width: finalW, height: finalH });
      }
    }

    setDraggingId(null);
    setDraggingZoneId(null);
    setResizingZoneId(null);
    setResizeHandle(null);
    setDraftMachinePos(null);
    setDraftZonePos(null);
  };

  // Helper to render layer buttons with tooltips
  const renderLayerButton = (layer: MapLayer, icon: React.ReactNode, label: string, descKey: string) => (
    <div className="group relative">
      <button
        onClick={() => setActiveLayer(layer)}
        disabled={isEditMode}
        className={`flex items-center justify-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition-all ${activeLayer === layer ? 'bg-industrial-accent text-white shadow-lg' : 'text-industrial-400 hover:bg-industrial-700 hover:text-white'} ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {icon} {label}
      </button>

      {/* Tooltip (Dropdown) */}
      {!isEditMode && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-56 bg-industrial-900/95 backdrop-blur text-white text-[10px] p-3 rounded border border-industrial-600 shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 invisible group-hover:visible translate-y-[-10px] group-hover:translate-y-0">
          <p className="font-semibold text-industrial-accent mb-1 text-xs">{label}</p>
          <p className="text-industrial-300 leading-tight">{t(descKey)}</p>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-industrial-600 border-l-transparent border-r-transparent"></div>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="h-full w-full relative bg-industrial-900 overflow-hidden flex flex-col font-sans"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >

      {/* 1. Top Bar Control Panel (Layers & Edit) - Horizontal Layout */}
      <div className="absolute top-0 left-0 w-full z-30 p-4 bg-gradient-to-b from-industrial-900 via-industrial-900/90 to-transparent pointer-events-none">

        <div className="flex justify-between items-start pointer-events-auto">
          {/* Left: Plant Status Header & Edit */}
          <div className="flex gap-4 items-center">
            <div className="bg-industrial-800/90 backdrop-blur px-4 py-2 rounded-xl border border-industrial-600 shadow-xl">
              <h2 className="text-lg font-bold text-white font-mono tracking-tight leading-none">{t('map.title')}</h2>
            </div>

            {/* Edit Layout Button - Protected by Permission */}
            {hasPermission('edit_dashboard_map') && (
              <div className="bg-industrial-800/90 backdrop-blur p-1 rounded-xl border border-industrial-600 shadow-xl flex gap-1">
                {isEditMode && (
                  <>
                    <button
                      onClick={handleOpenCreateZone}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-industrial-700 text-industrial-200 hover:bg-industrial-600 hover:text-white transition-colors"
                      title="Crear una nueva Línea con formato y áreas"
                    >
                      <Plus size={14} /> <span>Crear Línea</span>
                    </button>
                    {unplacedZones.length > 0 && (
                      <button
                        onClick={() => handleOpenAssetModal('ZONE')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-industrial-700 text-industrial-300 hover:bg-industrial-600 hover:text-white transition-colors border-r border-industrial-600/50"
                        title="Agregar líneas existentes que no están en el mapa"
                      >
                        <Layers size={14} /> <span>Agregar Línea ({unplacedZones.length})</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenAssetModal('MACHINE')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-industrial-700 text-industrial-300 hover:bg-industrial-600 hover:text-white transition-colors border-r border-industrial-600/50"
                    >
                      <Plus size={14} /> <span>Agregar Equipo</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setIsEditMode(!isEditMode);
                    setSelectedMachine(null);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isEditMode ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'bg-industrial-700 text-white hover:bg-industrial-600'}`}
                >
                  {isEditMode ? <Save size={14} /> : <Edit3 size={14} />}
                  <span>{isEditMode ? 'Guardar Diseño' : 'Editar Diseño'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Right: Layer Switcher (Horizontal) */}
          <div className={`bg-industrial-800/90 backdrop-blur p-1 rounded-xl border border-industrial-600 shadow-xl flex gap-1 transition-opacity duration-300 ${isEditMode ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            {renderLayerButton('OPERATIONAL', <Activity size={14} />, t('map.layer.operational'), 'map.layer.operational.desc')}
            {renderLayerButton('MAINTENANCE', <Wrench size={14} />, t('map.layer.maintenance'), 'map.layer.maintenance.desc')}
            {renderLayerButton('INVENTORY', <Battery size={14} />, t('map.layer.inventory'), 'map.layer.inventory.desc')}
            {renderLayerButton('EFFICIENCY', <Gauge size={14} />, 'Mapa Calor OEE', 'map.layer.efficiency.desc')}
          </div>
        </div>
      </div>

      {/* 2. Zoom Controls */}
      <div className="absolute bottom-6 left-6 z-30 flex gap-2">
        <button onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))} className="p-3 bg-industrial-800 rounded-lg text-white border border-industrial-600 hover:bg-industrial-700"><ZoomOut size={18} /></button>
        <span className="p-3 bg-industrial-900 rounded-lg text-industrial-400 border border-industrial-700 text-xs font-mono min-w-[60px] text-center flex items-center justify-center">
          {Math.round(zoomLevel * 100)}%
        </span>
        <button onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))} className="p-3 bg-industrial-800 rounded-lg text-white border border-industrial-600 hover:bg-industrial-700"><ZoomIn size={18} /></button>
        <button onClick={() => setZoomLevel(1)} className="p-3 bg-industrial-800 rounded-lg text-white border border-industrial-600 hover:bg-industrial-700 ml-2"><Maximize size={18} /></button>
      </div>

      {/* 3. The Map Canvas */}
      <div
        className={`flex-1 relative overflow-hidden bg-industrial-900 ${isEditMode ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
        onClick={() => setSelectedMachine(null)}
      >
        {/* Grid Background Pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            backgroundPosition: 'center'
          }}
        />

        <div
          ref={containerRef}
          className="absolute inset-0 transition-transform duration-75 ease-out origin-center"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* --- DYNAMIC ZONES --- */}
          {displayZones.map(zone => {
            const zoneStyle = ZONE_STYLE_MAP[zone.color || 'slate'] || ZONE_STYLE_MAP.slate;
            return (
              <div
                key={zone.id}
                className={`absolute transition-all duration-75 group ${isEditMode ? 'cursor-move' : 'pointer-events-none'}`}
                style={{
                  left: `${zone.x || 0}%`,
                  top: `${zone.y || 0}%`,
                  width: `${zone.width || 20}%`,
                  height: `${zone.height || 20}%`,
                  zIndex: isEditMode && draggingZoneId === zone.id ? 20 : 1
                }}
                onMouseDown={(e) => handleZoneMouseDown(e, zone)}
              >
                {/* Zone Border & Format */}
                <div
                  className={`absolute inset-0 border-2 rounded-xl transition-colors ${
                    isEditMode
                      ? 'border-yellow-500/50 border-dashed bg-yellow-500/5'
                      : `${zoneStyle.border} ${zoneStyle.bg} border-dashed`
                  }`}
                ></div>

                {/* Resize Handle (SE) */}
                {isEditMode && (
                  <div
                    className="absolute bottom-0 right-0 w-6 h-6 bg-yellow-500 rounded-tl-xl cursor-se-resize flex items-center justify-center hover:scale-110 transition-transform z-30"
                    onMouseDown={(e) => handleResizeMouseDown(e, zone, 'se')}
                    title="Arrastra para redimensionar la zona"
                  >
                    <Maximize size={12} className="text-black rotate-90" />
                  </div>
                )}

                {/* Delete Zone Button (Edit Mode) */}
                {isEditMode && onRemoveZone && (
                  <button
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`¿Remover la línea "${zone.name}" del mapa?`)) {
                        onRemoveZone(zone.id);
                      }
                    }}
                    className="absolute top-0 left-0 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-br-lg opacity-0 group-hover:opacity-100 transition-opacity z-40 cursor-pointer"
                    title="Remover Línea del mapa"
                  >
                    <Trash2 size={12} />
                  </button>
                )}

                {/* Edit Zone Format Button (Edit Mode) */}
                {isEditMode && (
                  <button
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleEditZone(zone);
                    }}
                    className="absolute top-0 right-0 p-1.5 bg-industrial-700/90 hover:bg-industrial-600 text-white rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity z-40 cursor-pointer"
                    title="Editar Formato, Color y Áreas de la Línea"
                  >
                    <Edit3 size={12} />
                  </button>
                )}

                {/* Drag Handle Indicator (Center) - Only in Edit Mode */}
                {isEditMode && (
                  <div className="absolute top-2 right-8 p-1 bg-yellow-500/20 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <Move size={14} className="text-yellow-500" />
                  </div>
                )}

                {/* Zone Content */}
                <div className="absolute inset-0 p-4 overflow-hidden pointer-events-auto">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: zoneStyle.dotHex }} />
                    <h3 className={`text-xl font-black font-mono uppercase tracking-widest truncate transition-opacity ${isEditMode ? 'text-yellow-400 opacity-100' : `${zoneStyle.text} opacity-100`}`}>
                      {zone.name}
                    </h3>
                  </div>

                  <div className="mt-3 space-y-2 ml-1 border-l-2 border-industrial-600/50 pl-3">
                    {zone.lines.map((line, idx) => (
                      <div key={idx} className="flex items-center justify-between group/line">
                        <p className={`text-xs font-bold font-mono tracking-wide truncate ${isEditMode ? 'text-yellow-200' : zoneStyle.subtext}`}>
                          {line}
                        </p>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAssetModal('MACHINE', { id: zone.id, line });
                          }}
                          className="p-1 rounded bg-industrial-800 hover:bg-industrial-accent text-industrial-400 hover:text-white transition-colors border border-industrial-700 opacity-0 group-hover/line:opacity-100"
                          title="Agregar Equipo a esta Área"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            );
          })}

          {/* --- MACHINES --- */}
          {displayMachines.map((machine) => (
            <AssetNode
              key={machine.id}
              machine={machine}
              layer={activeLayer}
              onClick={handleMachineClick}
              isSelected={selectedMachine?.id === machine.id}
              isEditMode={isEditMode}
              onMouseDown={handleDragStart}
              onDelete={() => {
                if (window.confirm(`Remove machine ${machine.name} from map?`)) {
                  onRemoveMachine && onRemoveMachine(machine.id);
                }
              }}
            />
          ))}
        </div>

        {/* Editing Overlay Indicator */}
        {isEditMode && (
          <div className="absolute top-0 w-full bg-yellow-500/10 border-b border-yellow-500/50 text-yellow-500 text-center py-1 text-xs font-bold pointer-events-none z-20">
            MODO EDICIÓN ACTIVO - ARRASTRA LÍNEAS Y EQUIPOS PARA REUBICAR - REDIMENSIONA LÍNEAS DESDE LA ESQUINA INFERIOR DERECHA
          </div>
        )}
      </div>

      {/* 4. Details Drawer */}
      <AssetDrawer
        machine={selectedMachine}
        onClose={() => setSelectedMachine(null)}
        analysis={analysis}
        onRunAnalysis={runAnalysis}
        isAnalyzing={analyzing}
        onCreateWorkOrder={() => selectedMachine && onCreateWorkOrder(selectedMachine.id)}
      />

      <AssetSelectionModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        title={assetModalType === 'MACHINE' ? 'Select Machine to Place' : 'Seleccionar Línea para Agregar al Mapa'}
        items={assetModalType === 'MACHINE' ? unplacedMachines : unplacedZones}
        onSelect={handleSelectAsset}
        type={assetModalType}
        onCreateNew={
          assetModalType === 'MACHINE'
            ? () => onAddMachine && onAddMachine(targetZoneForMachine?.id || '', targetZoneForMachine?.line || '')
            : handleOpenCreateZone
        }
      />

      <ZoneModal
        isOpen={isZoneModalOpen}
        onClose={() => {
          setIsZoneModalOpen(false);
          setEditingZone(null);
        }}
        onSave={handleSaveZoneModal}
        zone={editingZone}
      />

    </div>
  );
};