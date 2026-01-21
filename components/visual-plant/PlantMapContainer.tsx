import React, { useState, useRef } from 'react';
import { Layers, Activity, Wrench, Battery, Gauge, ZoomIn, ZoomOut, Maximize, Edit3, Save } from 'lucide-react';
import { AssetNode, MapLayer } from './AssetNode';
import { AssetDrawer } from './AssetDrawer';
import { Machine } from '../../types';
import { analyzeMachineHealth, PredictiveAnalysis } from '../../services/geminiService';
import { useLanguage } from '../../contexts/LanguageContext';

interface PlantMapContainerProps {
  machines: Machine[];
  onCreateWorkOrder: (machineId: string) => void;
  onMoveMachine?: (id: string, x: number, y: number) => void;
}

export const PlantMapContainer: React.FC<PlantMapContainerProps> = ({ machines, onCreateWorkOrder, onMoveMachine }) => {
  const { t } = useLanguage();
  const [activeLayer, setActiveLayer] = useState<MapLayer>('OPERATIONAL');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Edit Mode & Dragging State
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Analysis State
  const [analysis, setAnalysis] = useState<PredictiveAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleMachineClick = (machine: Machine) => {
    if (isEditMode) return; // Disable selection in edit mode
    setSelectedMachine(machine);
    setAnalysis(null); // Reset previous analysis
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

  // --- DRAG AND DROP LOGIC ---
  const handleDragStart = (e: React.MouseEvent, machine: Machine) => {
    if (!isEditMode) return;
    e.stopPropagation();
    setDraggingId(machine.id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isEditMode || !draggingId || !containerRef.current || !onMoveMachine) return;

    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate position relative to the zoomed container
    // We need to account for Zoom Level to make the mouse movement 1:1 with the object
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;

    // Convert back to percentage based on the UNZOOMED original dimensions (100% width/height logic)
    // Rect width/height includes the zoom scale transformation visually, but we need the internal coordinate system.
    // Actually, simple percentage logic:
    // Pct X = (MouseX relative to rect / Rect Width) * 100
    
    let xPct = ((e.clientX - rect.left) / rect.width) * 100;
    let yPct = ((e.clientY - rect.top) / rect.height) * 100;

    // Boundaries
    xPct = Math.max(2, Math.min(98, xPct));
    yPct = Math.max(5, Math.min(95, yPct));

    onMoveMachine(draggingId, xPct, yPct);
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  // Helper to render layer buttons with tooltips
  const renderLayerButton = (layer: MapLayer, icon: React.ReactNode, label: string, descKey: string) => (
    <div className="group relative w-full">
      <button 
        onClick={() => setActiveLayer(layer)}
        disabled={isEditMode}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${activeLayer === layer ? 'bg-industrial-accent text-white shadow-lg' : 'text-industrial-400 hover:bg-industrial-700 hover:text-white'} ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {icon} {label}
      </button>
      
      {/* Tooltip */}
      {!isEditMode && (
        <div className="absolute left-full top-1/2 ml-3 -translate-y-1/2 w-48 bg-industrial-900/95 backdrop-blur text-white text-[10px] p-2 rounded border border-industrial-600 shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 invisible group-hover:visible translate-x-[-10px] group-hover:translate-x-0">
            <p className="font-semibold text-industrial-accent mb-1">{label}</p>
            <p className="text-industrial-300 leading-tight">{t(descKey)}</p>
            {/* Arrow */}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-industrial-600 border-t-transparent border-b-transparent"></div>
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
      
      {/* 1. Top Bar Control Panel (Layers & Edit) */}
      <div className="absolute top-6 left-6 z-30 flex flex-col gap-4">
        
        {/* Plant Status Header */}
        <div className="bg-industrial-800/90 backdrop-blur p-4 rounded-xl border border-industrial-600 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-1 font-mono tracking-tight">{t('map.title')}</h2>
          <p className="text-xs text-industrial-400">{t('map.zone')}</p>
        </div>

        {/* Action Buttons: Edit Layout */}
        <div className="bg-industrial-800/90 backdrop-blur p-2 rounded-xl border border-industrial-600 shadow-xl">
            <button 
                onClick={() => {
                    setIsEditMode(!isEditMode);
                    setSelectedMachine(null); // Close drawer if open
                }}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${isEditMode ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'bg-industrial-700 text-white hover:bg-industrial-600'}`}
            >
                {isEditMode ? <Save size={14}/> : <Edit3 size={14}/>}
                {isEditMode ? 'Save Layout' : 'Edit Layout'}
            </button>
        </div>

        {/* Layer Switcher */}
        <div className={`bg-industrial-800/90 backdrop-blur p-2 rounded-xl border border-industrial-600 shadow-xl flex flex-col gap-1 w-[180px] transition-opacity duration-300 ${isEditMode ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <div className="text-[10px] text-industrial-500 uppercase font-bold px-2 py-1 mb-1 flex items-center gap-2">
            <Layers size={12}/> {t('map.layers')}
          </div>
          
          {renderLayerButton('OPERATIONAL', <Activity size={16} />, t('map.layer.operational'), 'map.layer.operational.desc')}
          {renderLayerButton('MAINTENANCE', <Wrench size={16} />, t('map.layer.maintenance'), 'map.layer.maintenance.desc')}
          {renderLayerButton('INVENTORY', <Battery size={16} />, t('map.layer.inventory'), 'map.layer.inventory.desc')}
          {renderLayerButton('EFFICIENCY', <Gauge size={16} />, t('map.layer.efficiency'), 'map.layer.efficiency.desc')}
        </div>
      </div>

      {/* 2. Zoom Controls */}
      <div className="absolute bottom-6 left-6 z-30 flex gap-2">
        <button onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))} className="p-3 bg-industrial-800 rounded-lg text-white border border-industrial-600 hover:bg-industrial-700"><ZoomOut size={18}/></button>
        <span className="p-3 bg-industrial-900 rounded-lg text-industrial-400 border border-industrial-700 text-xs font-mono min-w-[60px] text-center flex items-center justify-center">
          {Math.round(zoomLevel * 100)}%
        </span>
        <button onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))} className="p-3 bg-industrial-800 rounded-lg text-white border border-industrial-600 hover:bg-industrial-700"><ZoomIn size={18}/></button>
        <button onClick={() => setZoomLevel(1)} className="p-3 bg-industrial-800 rounded-lg text-white border border-industrial-600 hover:bg-industrial-700 ml-2"><Maximize size={18}/></button>
      </div>

      {/* 3. The Map Canvas */}
      <div 
        className={`flex-1 relative overflow-hidden bg-industrial-900 ${isEditMode ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
        onClick={() => setSelectedMachine(null)} // Click bg to deselect
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
        
        {/* Floor Plan / Zones (Decorative SVGs) */}
        <div 
          ref={containerRef}
          className="absolute inset-0 transition-transform duration-75 ease-out origin-center"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Simulated Walls/Zones */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-industrial-700" style={{ opacity: 0.3 }}>
             <rect x="10%" y="10%" width="80%" height="80%" fill="none" strokeWidth="2" strokeDasharray="10,5" rx="20" />
             <line x1="40%" y1="10%" x2="40%" y2="90%" strokeWidth="1" />
             <text x="12%" y="15%" className="fill-industrial-600 text-4xl font-black font-mono">ZONE A</text>
             <text x="42%" y="15%" className="fill-industrial-600 text-4xl font-black font-mono">ZONE B</text>
          </svg>

          {/* Render Machines */}
          {machines.map((machine) => (
            <AssetNode 
              key={machine.id}
              machine={machine}
              layer={activeLayer}
              onClick={handleMachineClick}
              isSelected={selectedMachine?.id === machine.id}
              isEditMode={isEditMode}
              onMouseDown={handleDragStart}
            />
          ))}
        </div>
        
        {/* Editing Overlay Indicator */}
        {isEditMode && (
            <div className="absolute top-0 w-full bg-yellow-500/10 border-b border-yellow-500/50 text-yellow-500 text-center py-1 text-xs font-bold pointer-events-none z-20">
                LAYOUT EDITING MODE ACTIVE - DRAG ASSETS TO REPOSITION
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

    </div>
  );
};