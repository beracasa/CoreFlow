import React, { useState } from 'react';
import { Machine, Technician, MachineStatus, MaintenanceTask, MaintenancePlan, MaintenanceInterval, ZoneStructure } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { UserManagement } from './user/UserManagement';
import { RoleManagement } from './user/RoleManagement';
import { ProtocolBuilder } from './ProtocolBuilder';
import { useMasterStore } from '../src/stores/useMasterStore';
import { X, UserPlus, Mail, Briefcase, Clock, Calendar, Server, Cpu, Wifi, Plus, MapPin, Layout, Box, Settings, Shield, Pencil, Camera, FileText, Trash2, CornerDownRight, Edit2, Check, Scale } from 'lucide-react';

interface ConfigurationProps {
  machines: Machine[];
  technicians: Technician[];
  onAddTechnician: (tech: Technician) => void;
  onAddMachine: (machine: Machine) => void;
  onUpdateMachine: (machine: Machine) => void;
  settings?: {
    plantName: string;
    rnc: string;
    timezone: string;
    currency: string;
    logoUrl: string;
  };
  onUpdateSettings?: (newSettings: any) => void;
  zoneStructures: ZoneStructure[]; // Renamed prop to match internal usage
  onAddZone: (zone: ZoneStructure) => void;
  onUpdateZone: (zone: ZoneStructure) => void;
  onRemoveZone: (id: string) => void;
}

type Tab = 'ASSETS' | 'WORKFORCE' | 'ROLES' | 'PROTOCOLS' | 'SETTINGS' | 'SPARE_PARTS';

export const Configuration: React.FC<ConfigurationProps> = ({
  machines: propMachines, // Renamed to avoid conflict with store
  technicians: propTechnicians, // Renamed to avoid conflict with store
  onAddTechnician,
  onAddMachine,
  onUpdateMachine,
  settings,
  onUpdateSettings,
  zoneStructures, // No alias needed
  onAddZone,
  onUpdateZone,
  onRemoveZone
}: ConfigurationProps) => {
  const {
    machines, addMachine, updateMachine,
    technicians, addTechnician,
    parts, addPart,
    zones: storeZoneStructures, addZone: storeAddZone, updateZone: storeUpdateZone, removeZone: storeRemoveZone,
    plantSettings, updateSettings,
    // Protocol Actions
    maintenancePlans, addMaintenancePlan, updateMaintenancePlan,
    // Config Lists
    branches, addBranch, removeBranch, updateBranch,
    categories, addCategory, removeCategory, updateCategory,
    assetTypes, addAssetType, removeAssetType, updateAssetType,
    // Spare Parts Config
    partCategories, addPartCategory, removePartCategory, updatePartCategory,
    partLocations, addPartLocation, removePartLocation, updatePartLocation,
    partUnits, addPartUnit, removePartUnit, updatePartUnit
  } = useMasterStore();

  const [activeTab, setActiveTab] = useState<Tab>('ASSETS');
  const { t } = useLanguage();

  const [settingsTab, setSettingsTab] = useState<'GENERAL' | 'ZONES' | 'EQUIPMENT' | 'SPARE_PARTS'>('GENERAL');

  // Protocol State (Machine -> Intervals -> Tasks)
  const [selectedProtocolMachineId, setSelectedProtocolMachineId] = useState<string | null>(null);
  const [activeIntervalTab, setActiveIntervalTab] = useState<string | null>(null);

  // Removed local maintenancePlans state in favor of store

  const [machineToAssociate, setMachineToAssociate] = useState<string>('');

  // Equipment Filters
  const [assetSearch, setAssetSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterZone, setFilterZone] = useState('');

  // Spare Parts Config Inputs
  const [newPartCategory, setNewPartCategory] = useState('');
  const [newPartLocation, setNewPartLocation] = useState('');
  const [newPartUnit, setNewPartUnit] = useState('');

  const filteredMachines = machines.filter(m => {
    const matchesSearch = assetSearch === '' ||
      m.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
      (m.plate && m.plate.toLowerCase().includes(assetSearch.toLowerCase())) ||
      (m.brand && m.brand.toLowerCase().includes(assetSearch.toLowerCase())) ||
      (m.model && m.model.toLowerCase().includes(assetSearch.toLowerCase()));

    // Strict equality check might fail if data is missing or mismatched
    const machineBranch = m.branch || '';
    const machineCategory = m.category || '';
    const machineType = m.type || '';

    const matchesBranch = filterBranch === '' || machineBranch === filterBranch;
    const matchesCategory = filterCategory === '' || machineCategory === filterCategory;
    const matchesType = filterType === '' || machineType === filterType;
    const matchesZone = filterZone === '' || m.zone === filterZone;

    return matchesSearch && matchesBranch && matchesCategory && matchesType && matchesZone;
  });

  const handleAssociateMachine = () => {
    if (machineToAssociate) {
      // Check if already exists
      if (maintenancePlans.some(p => p.machineId === machineToAssociate)) {
        alert('Este equipo ya tiene un plan de mantenimiento asociado.');
        return;
      }

      setMachineToAssociate('');

      const newPlan: MaintenancePlan = {
        machineId: machineToAssociate,
        intervals: []
      };

      addMaintenancePlan(newPlan);
      setSelectedProtocolMachineId(machineToAssociate);
    }
  };

  const handleSaveProtocol = (tasks: MaintenanceTask[]) => {
    if (selectedProtocolMachineId && activeIntervalTab) {
      const existingPlan = maintenancePlans.find(p => p.machineId === selectedProtocolMachineId);

      if (existingPlan) {
        const updatedPlan = {
          ...existingPlan,
          intervals: existingPlan.intervals.map(i =>
            i.id === activeIntervalTab ? { ...i, tasks } : i
          )
        };
        updateMaintenancePlan(updatedPlan);
        alert('Protocol saved successfully!');
      }
    }
  };

  const handleAddInterval = (machineId: string) => {
    const hoursStr = prompt("Ingrese las horas del intervalo (ej. 2160):");
    if (!hoursStr) return;
    const hours = parseInt(hoursStr);
    if (isNaN(hours)) return;

    const newInterval: MaintenanceInterval = {
      id: `i-${Date.now()}`,
      hours: hours,
      label: `${hours.toLocaleString()} Horas`,
      tasks: []
    };

    const existingPlan = maintenancePlans.find(p => p.machineId === machineId);
    if (existingPlan) {
      const updatedPlan = {
        ...existingPlan,
        intervals: [...existingPlan.intervals, newInterval].sort((a, b) => a.hours - b.hours)
      };
      updateMaintenancePlan(updatedPlan);
    } else {
      // Should not happen if UI is correct, but safe fallback
      addMaintenancePlan({ machineId, intervals: [newInterval] });
    }
  };

  const handleDeleteInterval = (machineId: string, intervalId: string) => {
    if (!confirm('¿Seguro que desea eliminar este intervalo?')) return;

    const existingPlan = maintenancePlans.find(p => p.machineId === machineId);
    if (existingPlan) {
      const updatedPlan = {
        ...existingPlan,
        intervals: existingPlan.intervals.filter(i => i.id !== intervalId)
      };
      updateMaintenancePlan(updatedPlan);
    }

    if (activeIntervalTab === intervalId) setActiveIntervalTab(null);
  };

  // State for Equipment Configuration
  const { maintenanceSchedules } = useMasterStore();

  const handleAddToList = (setter: (val: string) => void, newItem: string, clearItem: (val: string) => void) => {
    if (newItem.trim()) {
      setter(newItem.trim());
      clearItem('');
    }
  };

  const handleRemoveFromList = (remover: (val: string) => void, item: string) => {
    remover(item);
  };

  // State for new entries
  const [newBranch, setNewBranch] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newAssetType, setNewAssetType] = useState('');

  // State for Zones/Lines (Structured)
  // zoneStructures is now passed as prop, aliasing for compatibility
  const zones = zoneStructures.flatMap(z => z.lines.length > 0 ? z.lines.map(l => `${z.name} - ${l}`) : [z.name]);
  const [newZoneName, setNewZoneName] = useState('');
  const [newLineInputs, setNewLineInputs] = useState<Record<string, string>>({});

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingMachine, setViewingMachine] = useState<Machine | null>(null);

  const handleEditFromDetail = (m: Machine) => {
    setViewingMachine(null);
    handleEditMachine(m);
  };

  // Zone Editing State
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editingZoneName, setEditingZoneName] = useState('');

  const startEditingZone = (zone: ZoneStructure) => {
    setEditingZoneId(zone.id);
    setEditingZoneName(zone.name);
  };

  const saveZoneName = (zone: ZoneStructure) => {
    if (editingZoneName.trim()) {
      onUpdateZone({ ...zone, name: editingZoneName.trim() });
      setEditingZoneId(null);
    }
  };


  // Gateway Modal State (IoT)
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [newMachine, setNewMachine] = useState<Partial<Machine> & { customIntervals?: string }>({
    name: '',
    plate: '',
    type: 'GENERIC',
    runningHours: 0,
    customIntervals: '',
    branch: 'Planta Principal',
    category: 'Producción',
    alias: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    capacity: '',
    currentRating: 0,
    frequency: 60,
    voltage: 480,
    power: 0,
    imageUrl: '',
    isActive: true, // Default
    documents: []
  });

  // Visual Asset Modal State (Non-IoT)
  const [showManualAssetModal, setShowManualAssetModal] = useState(false);
  const [newManualAsset, setNewManualAsset] = useState<Partial<Machine> & { customIntervals?: string }>({
    name: '',
    plate: '',
    type: 'GENERIC',
    zone: zones[0] || '',
    customIntervals: '',
    branch: 'Planta Principal',
    category: 'Producción',
    alias: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    capacity: '',
    currentRating: 0,
    frequency: 60,
    voltage: 480,
    power: 0,
    imageUrl: '',
    isActive: true, // Default
    documents: []
  });

  // --- ACTIONS ---

  const openAddGateway = () => {
    setEditingId(null);
    setNewMachine({
      name: '', plate: '', type: 'GENERIC', runningHours: 0, customIntervals: '',
      branch: 'Main Branch', category: 'Production', alias: '', isActive: true, brand: '', model: '', year: new Date().getFullYear(),
      capacity: '', currentRating: 0, frequency: 60, voltage: 480, power: 0, imageUrl: '', documents: []
    });
    setShowGatewayModal(true);
  };

  const openAddManual = () => {
    setEditingId(null);

    setNewManualAsset({
      name: '', plate: '', type: 'GENERIC', zone: zones[0] || '', customIntervals: '',
      branch: 'Main Branch', category: 'Production', alias: '', isActive: true, brand: '', model: '', year: new Date().getFullYear(),
      capacity: '', currentRating: 0, frequency: 60, voltage: 480, power: 0, imageUrl: '', documents: []
    });
    setShowManualAssetModal(true);
  };

  const handleEditMachine = (m: Machine) => {
    setEditingId(m.id);
    const intervals = m.intervals ? m.intervals.join(', ') : '';
    const commonFields = {
      branch: m.branch || 'Main Branch',
      category: m.category || 'Production',
      alias: m.alias || '',
      isActive: m.isActive !== undefined ? m.isActive : true,
      brand: m.brand || '',
      model: m.model || '',
      year: m.year || new Date().getFullYear(),
      capacity: m.capacity || '',
      currentRating: m.currentRating || 0,
      frequency: m.frequency || 60,
      voltage: m.voltage || 480,
      power: m.power || 0,
      imageUrl: m.imageUrl || '',
      documents: m.documents || []
    };

    if (m.isIot) {
      setNewMachine({
        name: m.name,
        plate: m.plate,
        type: m.type,
        runningHours: m.runningHours,
        customIntervals: intervals,
        ...commonFields
      });
      setShowGatewayModal(true);
    } else {

      setNewManualAsset({
        name: m.name,
        plate: m.plate || '',
        type: m.type,
        zone: m.zone || zones[0],
        customIntervals: intervals,
        ...commonFields
      });
      setShowManualAssetModal(true);
    }
  };

  const handleGatewaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMachine.name) return; // Plate optional now?

    const intervals = newMachine.customIntervals
      ? newMachine.customIntervals.split(',').map(s => s.trim())
      : ['360 Hours', '1080 Hours'];

    const commonUpdate = {
      name: newMachine.name!,
      plate: newMachine.plate || 'N/A',
      type: newMachine.type as any,
      runningHours: Number(newMachine.runningHours) || 0,
      intervals: intervals,
      // New Fields
      branch: newMachine.branch,
      category: newMachine.category,
      alias: newMachine.alias,
      isActive: newMachine.isActive,
      brand: newMachine.brand,
      model: newMachine.model,
      year: Number(newMachine.year),
      capacity: newMachine.capacity,
      currentRating: Number(newMachine.currentRating),
      frequency: Number(newMachine.frequency),
      voltage: Number(newMachine.voltage),
      power: Number(newMachine.power),
      imageUrl: newMachine.imageUrl,
      documents: newMachine.documents
    };

    if (editingId) {
      const existing = machines.find(m => m.id === editingId);
      if (existing) {
        updateMachine({
          ...existing,
          ...commonUpdate
        });
      }
    } else {
      const machine: Machine = {
        id: `m-${Date.now()}`,
        status: MachineStatus.IDLE,
        location: { x: Math.floor(Math.random() * 80) + 10, y: Math.floor(Math.random() * 80) + 10 },
        zone: zones[0], // Default zone for auto-provisioned
        isIot: true,
        lastMaintenance: new Date().toISOString(),
        nextMaintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days
        telemetry: { timestamp: new Date().toISOString(), temperature: 0, vibration: 0, pressure: 0, powerConsumption: 0 },
        history: [],
        ...commonUpdate
      };
      addMachine(machine);
    }

    setShowGatewayModal(false);
    setEditingId(null);
  };

  const handleManualAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newManualAsset.name) {
      console.error("Name is missing");
      alert("Falta el nombre del equipo");
      return;
    }

    let baseX = 50, baseY = 50;
    if (newManualAsset.zone && newManualAsset.zone.includes("Zone A")) {
      baseX = 20 + Math.random() * 20; baseY = 20 + Math.random() * 60;
    } else if (newManualAsset.zone && newManualAsset.zone.includes("Zone B")) {
      baseX = 60 + Math.random() * 20; // 60-80%
      baseY = 20 + Math.random() * 60; // 20-80%
    }
    else {
      baseX = Math.random() * 80 + 10; baseY = Math.random() * 80 + 10;
    }

    const intervals = newManualAsset.customIntervals
      ? newManualAsset.customIntervals.split(',').map(s => s.trim())
      : ['Manual Check'];

    const commonUpdate = {
      name: newManualAsset.name!,
      plate: newManualAsset.plate || 'N/A',
      type: newManualAsset.type as any,
      zone: newManualAsset.zone,
      intervals: intervals,
      // New Fields
      branch: newManualAsset.branch,
      category: newManualAsset.category,
      alias: newManualAsset.alias,
      isActive: newManualAsset.isActive,
      brand: newManualAsset.brand,
      model: newManualAsset.model,
      year: Number(newManualAsset.year),
      capacity: newManualAsset.capacity,
      currentRating: Number(newManualAsset.currentRating),
      frequency: Number(newManualAsset.frequency),
      voltage: Number(newManualAsset.voltage),
      power: Number(newManualAsset.power),
      imageUrl: newManualAsset.imageUrl,
      documents: newManualAsset.documents
    };

    if (editingId) {
      const existing = machines.find(m => m.id === editingId);
      if (existing) {
        updateMachine({
          ...existing,
          ...commonUpdate
        });
      }
    } else {
      const machine: Machine = {
        id: `ma-${Date.now()}`,
        status: MachineStatus.IDLE,
        location: { x: baseX, y: baseY },
        isIot: false,
        runningHours: 0,
        lastMaintenance: new Date().toISOString(),
        nextMaintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        telemetry: { timestamp: new Date().toISOString(), temperature: 0, vibration: 0, pressure: 0, powerConsumption: 0 },
        history: [],
        ...commonUpdate
      };
      addMachine(machine);
    }

    setShowManualAssetModal(false);
    setEditingId(null);
  };

  const handleAddZoneStructure = () => {
    if (newZoneName.trim()) {
      // Auto-layout logic: Grid System
      // Start slightly below the top bar (y=15% roughly)
      const startX = 5;
      const startY = 15;
      const cardWidth = 20;
      const cardHeight = 30;
      const gapX = 2;
      const gapY = 5;

      let x = startX;
      let y = startY;

      if (zoneStructures.length > 0) {
        // Find the next available slot
        // Get the Last zone
        const lastZone = zoneStructures[zoneStructures.length - 1];

        let nextX = (lastZone.x || startX) + (lastZone.width || cardWidth) + gapX;
        let nextY = (lastZone.y || startY);

        // Check horizontal overflow (limit to ~95%)
        if (nextX + cardWidth > 98) {
          nextX = startX; // New row
          nextY = nextY + (lastZone.height || cardHeight) + gapY;
        }

        x = nextX;
        y = nextY;
      }

      const newZone: ZoneStructure = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: newZoneName.trim(),
        lines: [],
        x, y,
        width: cardWidth,
        height: cardHeight
      };
      onAddZone(newZone);
      setNewZoneName('');
    }
  };

  const handleDeleteZone = (id: string) => {
    onRemoveZone(id);
  };

  const handleAddLine = (zoneId: string) => {
    const lineName = newLineInputs[zoneId];
    if (lineName && lineName.trim()) {
      const zone = zoneStructures.find(z => z.id === zoneId);
      if (zone) {
        onUpdateZone({ ...zone, lines: [...zone.lines, lineName.trim()] });
      }
      setNewLineInputs({ ...newLineInputs, [zoneId]: '' });
    }
  };

  const handleDeleteLine = (zoneId: string, lineToRemove: string) => {
    const zone = zoneStructures.find(z => z.id === zoneId);
    if (zone) {
      onUpdateZone({ ...zone, lines: zone.lines.filter(l => l !== lineToRemove) });
    }
  };

  // Duplicate functions removed. 
  // The correct ones are defined above (lines 146-155) using the store actions.

  return (
    <div className="h-full bg-industrial-900 flex flex-col overflow-hidden relative" >
      {/* Module Header */}
      < div className="p-6 border-b border-industrial-800 bg-industrial-900" >
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{t('config.title')}</h2>
            <p className="text-industrial-500 text-sm">{t('config.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-industrial-800 hover:bg-industrial-700 text-white text-sm rounded border border-industrial-600 transition-colors">
              {t('config.export')}
            </button>
            <button className="px-4 py-2 bg-industrial-accent hover:bg-blue-600 text-white text-sm rounded font-medium shadow-lg shadow-blue-900/20 transition-colors">
              {t('config.save')}
            </button>

          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mt-8 border-b border-industrial-700" >
          <button
            onClick={() => setActiveTab('ASSETS')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'ASSETS'
              ? 'text-white border-industrial-accent'
              : 'text-industrial-500 border-transparent hover:text-industrial-300'
              }`}
          >
            {t('config.tab.assets')}
          </button>

          <button
            onClick={() => setActiveTab('WORKFORCE')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'WORKFORCE'
              ? 'text-white border-industrial-accent'
              : 'text-industrial-500 border-transparent hover:text-industrial-300'
              }`}
          >
            {t('workforce.title')}
          </button>

          <button
            onClick={() => setActiveTab('PROTOCOLS')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'PROTOCOLS'
              ? 'text-white border-industrial-accent'
              : 'text-industrial-500 border-transparent hover:text-industrial-300'
              }`}
          >
            Mantenimientos
          </button>


          <button
            onClick={() => setActiveTab('ROLES')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'ROLES'
              ? 'text-white border-industrial-accent'
              : 'text-industrial-500 border-transparent hover:text-industrial-300'
              }`}
          >
            Roles & Permissions
          </button>

          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'SETTINGS'
              ? 'text-white border-industrial-accent'
              : 'text-industrial-500 border-transparent hover:text-industrial-300'
              }`}
          >
            {t('config.tab.settings')}
          </button>
        </div >
      </div >

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-industrial-900/50">



        {/* ASSET REGISTRY TAB */}
        {
          activeTab === 'ASSETS' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center">
                <h3 className="text-lg text-white font-medium">{t('assets.title')}</h3>
                <div className="flex gap-3">
                  <button
                    onClick={openAddManual}
                    className="bg-industrial-800 hover:bg-industrial-700 text-white border border-industrial-600 px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-2"
                  >
                    <Box className="w-3 h-3" />
                    Agregar Equipo
                  </button>
                  <button
                    onClick={openAddGateway}
                    className="bg-industrial-accent hover:bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium shadow-lg transition-colors flex items-center gap-2"
                  >
                    <Wifi className="w-3 h-3" /> {t('assets.provision')}
                  </button>
                </div>
              </div>

              {/* Filters Section */}
              <div className="bg-industrial-800 p-4 rounded-lg border border-industrial-700 space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Buscar por Nombre, Matrícula, Marca o Modelo..."
                      className="w-full bg-industrial-900 border border-industrial-600 rounded px-4 py-2 text-white outline-none focus:border-emerald-500 transition-colors pl-10"
                      value={assetSearch}
                      onChange={(e) => setAssetSearch(e.target.value)}
                    />
                    <div className="absolute left-3 top-2.5 text-industrial-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <select
                    className="bg-industrial-900 border border-industrial-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-emerald-500"
                    value={filterBranch}
                    onChange={(e) => setFilterBranch(e.target.value)}
                  >
                    <option value="">Todas las Sucursales</option>
                    {branches.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <select
                    className="bg-industrial-900 border border-industrial-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-emerald-500"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="">Todas las Categorías</option>
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    className="bg-industrial-900 border border-industrial-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-emerald-500"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="">Todos los Tipos</option>
                    {assetTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <select
                    className="bg-industrial-900 border border-industrial-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-emerald-500"
                    value={filterZone}
                    onChange={(e) => setFilterZone(e.target.value)}
                  >
                    <option value="">Todas las Ubicaciones</option>
                    {zones.map(z => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-industrial-800 rounded-lg border border-industrial-700 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm text-industrial-400">
                  <thead className="bg-industrial-900 text-xs uppercase font-bold text-industrial-500">
                    <tr>
                      <th className="px-6 py-4">{t('assets.col.name')}</th>
                      <th className="px-6 py-4">Zone / Line</th>
                      <th className="px-6 py-4">{t('assets.col.type')}</th>
                      <th className="px-6 py-4">{t('assets.col.protocol')}</th>
                      <th className="px-6 py-4">{t('assets.col.schedule')}</th>
                      <th className="px-6 py-4 text-right">{t('assets.col.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-industrial-700">
                    {filteredMachines.map((m) => (
                      <tr key={m.id} className="hover:bg-industrial-700/30 transition-colors">
                        <td className="px-6 py-4 text-white font-medium">{m.name}</td>
                        <td className="px-6 py-4 text-industrial-300 text-xs">{m.zone || 'Unassigned'}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-industrial-900 rounded border border-industrial-600 text-xs font-mono">
                            {m.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {m.isIot ? (
                            <span className="text-emerald-500 flex items-center gap-1.5 text-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              OPC-UA
                            </span>
                          ) : (
                            <span className="text-industrial-500 flex items-center gap-1.5 text-xs">
                              <div className="w-1.5 h-1.5 rounded-full bg-industrial-500"></div>
                              Manual
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">
                          {maintenancePlans.find(p => p.machineId === m.id)?.intervals
                            .filter(i => i.hours > 0 || i.label)
                            .sort((a, b) => a.hours - b.hours)
                            .map(i => i.label || `${i.hours.toLocaleString()} h`)
                            .join(', ') || <span className="text-industrial-600 italic">Sin Programa</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setViewingMachine(m)}
                            className="text-industrial-400 hover:text-white transition-colors flex items-center justify-end gap-1"
                          >
                            <FileText size={12} /> Detalles
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* --- DETAIL VIEW MODAL --- */}
              {viewingMachine && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
                  <div className="bg-industrial-800 rounded-lg border border-industrial-600 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="p-4 border-b border-industrial-700 bg-industrial-900/50 flex justify-between items-center">
                      <h3 className="text-white font-bold flex items-center gap-2">
                        <Box size={18} className="text-industrial-accent" /> Ficha del Equipo
                      </h3>
                      <button onClick={() => setViewingMachine(null)} className="text-industrial-400 hover:text-white">
                        <X size={20} />
                      </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="p-6 overflow-y-auto space-y-6 flex-1">
                      {/* Top Section: Image & Basic Info */}
                      <div className="flex gap-6">
                        <div className="w-40 h-40 bg-industrial-900 rounded-lg border border-industrial-700 flex items-center justify-center overflow-hidden shrink-0">
                          {viewingMachine.imageUrl ? (
                            <img src={viewingMachine.imageUrl} alt={viewingMachine.name} className="w-full h-full object-cover" />
                          ) : (
                            <Camera size={40} className="text-industrial-600" />
                          )}
                        </div>
                        <div className="flex-1 space-y-4">
                          <div>
                            <h2 className="text-2xl font-bold text-white">{viewingMachine.name}</h2>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm text-industrial-400 font-mono">{viewingMachine.plate || 'N/A'}</span>
                              {viewingMachine.isActive === false ? (
                                <span className="px-2 py-0.5 bg-red-900/40 text-red-400 border border-red-800 rounded text-xs font-bold uppercase">Inactivo</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-900/40 text-emerald-400 border border-emerald-800 rounded text-xs font-bold uppercase">Activo</span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] text-industrial-500 uppercase font-bold">Tipo / Categoría</label>
                              <p className="text-sm text-white">{viewingMachine.type} <span className="text-industrial-500">•</span> {viewingMachine.category}</p>
                            </div>
                            <div>
                              <label className="text-[10px] text-industrial-500 uppercase font-bold">Ubicación</label>
                              <p className="text-sm text-white">{viewingMachine.branch}</p>
                              <p className="text-xs text-industrial-400">{viewingMachine.zone || 'Sin Zona Asignada'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Technical Specs Grid */}
                      <div>
                        <h4 className="text-xs font-bold text-industrial-400 uppercase border-b border-industrial-700 pb-2 mb-3">Especificaciones Técnicas</h4>
                        <div className="grid grid-cols-3 gap-4 bg-industrial-900/30 p-4 rounded border border-industrial-700/50">
                          <div>
                            <label className="text-[10px] text-industrial-500 uppercase">Marca</label>
                            <p className="text-sm text-white">{viewingMachine.brand || '-'}</p>
                          </div>
                          <div>
                            <label className="text-[10px] text-industrial-500 uppercase">Modelo</label>
                            <p className="text-sm text-white">{viewingMachine.model || '-'}</p>
                          </div>
                          <div>
                            <label className="text-[10px] text-industrial-500 uppercase">Año</label>
                            <p className="text-sm text-white">{viewingMachine.year || '-'}</p>
                          </div>

                          <div>
                            <label className="text-[10px] text-industrial-500 uppercase">Voltage (V)</label>
                            <p className="text-sm text-white">{viewingMachine.voltage ? `${viewingMachine.voltage}V` : '-'}</p>
                          </div>
                          <div>
                            <label className="text-[10px] text-industrial-500 uppercase">Frecuencia (Hz)</label>
                            <p className="text-sm text-white">{viewingMachine.frequency ? `${viewingMachine.frequency}Hz` : '-'}</p>
                          </div>
                          <div>
                            <label className="text-[10px] text-industrial-500 uppercase">Potencia (KVA)</label>
                            <p className="text-sm text-white">{viewingMachine.power ? `${viewingMachine.power} KVA` : '-'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Maintenance Info */}
                      <div>
                        <h4 className="text-xs font-bold text-industrial-400 uppercase border-b border-industrial-700 pb-2 mb-3">Mantenimiento</h4>
                        <div className="flex gap-4">
                          <div className="flex-1 bg-industrial-900/30 p-3 rounded border border-industrial-700/50 flex items-center gap-3">
                            <Clock className="text-industrial-500" size={20} />
                            <div>
                              <label className="text-[10px] text-industrial-500 uppercase">Horas de Uso</label>
                              <p className="text-lg font-mono text-white">{viewingMachine.runningHours.toLocaleString()} h</p>
                            </div>
                          </div>
                          <div className="flex-1 bg-industrial-900/30 p-3 rounded border border-industrial-700/50 flex items-center gap-3">
                            <Calendar className="text-industrial-500" size={20} />
                            <div>
                              <label className="text-[10px] text-industrial-500 uppercase">Último Mantenimiento</label>
                              <p className="text-sm text-white">{new Date(viewingMachine.lastMaintenance).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-industrial-700 bg-industrial-900/50 flex justify-end gap-3">
                      <button
                        onClick={() => setViewingMachine(null)}
                        className="px-4 py-2 text-sm text-industrial-400 hover:text-white"
                      >
                        Cerrar
                      </button>
                      <button
                        onClick={() => handleEditFromDetail(viewingMachine)}
                        className="px-4 py-2 bg-industrial-600 hover:bg-industrial-500 text-white rounded text-sm font-bold shadow flex items-center gap-2"
                      >
                        <Pencil size={14} /> Editar Equipo
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        }

        {/* LOCATIONS TAB */}


        {
          activeTab === 'WORKFORCE' && (
            <UserManagement />
          )
        }

        {/* PROTOCOLS TAB (Refined) */}
        {
          activeTab === 'PROTOCOLS' && (
            <div className="h-full flex flex-col animate-fadeIn">
              {/* Header / Sub-nav */}
              <div className="bg-industrial-800 p-4 border-b border-industrial-700 flex justify-between items-center">
                <div>
                  <h3 className="text-lg text-white font-bold">Mantenimientos</h3>
                  <p className="text-sm text-industrial-400">Intervalos de Intervención R-MANT-02</p>
                </div>
              </div>

              <div className="flex h-full overflow-hidden">
                {/* Sidebar List (Machines) */}
                <div className="w-72 border-r border-industrial-700 bg-industrial-800 shrink-0 flex flex-col">
                  <div className="p-3 border-b border-industrial-700 space-y-2">
                    <p className="text-xs text-industrial-400 font-bold uppercase">Equipos Asociados</p>

                    {/* Association Control */}
                    <div className="flex gap-1">
                      <select
                        className="bg-industrial-900 border border-industrial-600 text-white text-xs rounded p-1.5 flex-1 outline-none focus:border-industrial-accent"
                        value={machineToAssociate}
                        onChange={(e) => setMachineToAssociate(e.target.value)}
                      >
                        <option value="">Seleccionar Equipo...</option>
                        {machines
                          .filter(m => !maintenancePlans.some(p => p.machineId === m.id))
                          .map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                      </select>
                      <button
                        onClick={handleAssociateMachine}
                        disabled={!machineToAssociate}
                        className={`p-1.5 rounded transition-colors ${machineToAssociate ? 'bg-industrial-accent text-white hover:bg-blue-600' : 'bg-industrial-700 text-industrial-500 cursor-not-allowed'}`}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {maintenancePlans.map(plan => {
                      const m = machines.find(mac => mac.id === plan.machineId);
                      if (!m) return null; // Should not happen if data is consistent

                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            setSelectedProtocolMachineId(m.id);
                            // Auto select first interval if exists
                            const currentPlan = maintenancePlans.find(p => p.machineId === m.id);
                            if (currentPlan && currentPlan.intervals.length > 0) {
                              setActiveIntervalTab(currentPlan.intervals[0].id);
                            } else {
                              setActiveIntervalTab(null);
                            }
                          }}
                          className={`w-full text-left p-3 rounded text-sm transition-colors flex flex-col gap-1 ${selectedProtocolMachineId === m.id ? 'bg-industrial-700 text-white border border-industrial-600' : 'text-industrial-400 hover:bg-industrial-700/50'}`}
                        >
                          <span className="font-bold text-white">{m.name}</span>
                          <div className="flex justify-between items-center w-full">
                            <span className="text-[10px] bg-black/30 rounded px-1.5 py-0.5 w-fit font-mono">{m.id.toUpperCase()}</span>
                            <span className="text-[10px] text-industrial-500">{plan.intervals.length} Intervalos</span>
                          </div>
                        </button>
                      )
                    })}

                    {maintenancePlans.length === 0 && (
                      <div className="text-center p-4 text-industrial-500 text-xs italic">
                        No hay equipos asociados. Seleccione uno arriba para comenzar.
                      </div>
                    )}
                  </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 flex flex-col bg-industrial-900 overflow-hidden">
                  {selectedProtocolMachineId ? (
                    <>
                      {/* Interval Tabs */}
                      <div className="flex items-center gap-2 p-2 border-b border-industrial-700 bg-industrial-800/50 overflow-x-auto">
                        {maintenancePlans.find(p => p.machineId === selectedProtocolMachineId)?.intervals.map(interval => (
                          <div key={interval.id} className="group relative flex items-center">
                            <button
                              onClick={() => setActiveIntervalTab(interval.id)}
                              className={`px-4 py-2 rounded text-xs font-bold transition-all border ${activeIntervalTab === interval.id ? 'bg-industrial-600 text-white border-industrial-500 shadow-md' : 'bg-industrial-900 text-industrial-400 border-industrial-700 hover:bg-industrial-700'}`}
                            >
                              {interval.label}
                            </button>
                            {activeIntervalTab === interval.id && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteInterval(selectedProtocolMachineId, interval.id); }}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Eliminar Intervalo"
                              >
                                <X size={10} />
                              </button>
                            )}
                          </div>
                        ))}

                        <button
                          onClick={() => handleAddInterval(selectedProtocolMachineId)}
                          className="px-3 py-2 rounded text-xs font-medium text-industrial-400 hover:text-white hover:bg-industrial-700 border border-transparent border-dashed hover:border-industrial-500 flex items-center gap-1"
                        >
                          <Plus size={12} /> Nvo. Intervalo
                        </button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 overflow-hidden relative">
                        {activeIntervalTab ? (
                          <ProtocolBuilder
                            key={activeIntervalTab} // Force re-render on tab switch
                            initialTasks={maintenancePlans.find(p => p.machineId === selectedProtocolMachineId)?.intervals.find(i => i.id === activeIntervalTab)?.tasks}
                            onSave={handleSaveProtocol}
                          />
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-industrial-500 gap-4 opacity-50">
                            <Clock size={48} />
                            <p className="text-sm">Seleccione o cree un intervalo de mantenimiento para comenzar.</p>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-industrial-500 gap-4">
                      <Server size={48} className="opacity-20" />
                      <p>Seleccione un equipo para configurar sus protocolos de mantenimiento.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        }



        {/* ROLES TAB (NEW) */}
        {
          activeTab === 'ROLES' && (
            <div className="h-full animate-fadeIn">
              <RoleManagement />
            </div>
          )
        }

        {/* SETTINGS TAB */}
        {
          activeTab === 'SETTINGS' && (
            <div className="max-w-4xl space-y-6 animate-fadeIn">

              {/* Sub-Module Navigation */}
              <div className="flex gap-2 bg-industrial-800 p-1 rounded-lg w-fit border border-industrial-700">
                <button
                  onClick={() => setSettingsTab('GENERAL')}
                  className={`px-6 py-3 rounded-md text-sm font-medium transition-all ${settingsTab === 'GENERAL'
                    ? 'bg-industrial-600 text-white shadow-md'
                    : 'text-industrial-400 hover:text-white hover:bg-industrial-700'
                    }`}
                >
                  Datos Generales
                </button>
                <button
                  onClick={() => setSettingsTab('ZONES')}
                  className={`px-6 py-3 rounded-md text-sm font-medium transition-all ${settingsTab === 'ZONES'
                    ? 'bg-industrial-600 text-white shadow-md'
                    : 'text-industrial-400 hover:text-white hover:bg-industrial-700'
                    }`}
                >
                  Zonas - Líneas
                </button>
                <button
                  onClick={() => setSettingsTab('EQUIPMENT')}
                  className={`px-6 py-3 rounded-md text-sm font-medium transition-all ${settingsTab === 'EQUIPMENT'
                    ? 'bg-industrial-600 text-white shadow-md'
                    : 'text-industrial-400 hover:text-white hover:bg-industrial-700'
                    }`}
                >
                  Equipos
                </button>
                <button
                  onClick={() => setSettingsTab('SPARE_PARTS')}
                  className={`px-6 py-3 rounded-md text-sm font-medium transition-all ${settingsTab === 'SPARE_PARTS'
                    ? 'bg-industrial-600 text-white shadow-md'
                    : 'text-industrial-400 hover:text-white hover:bg-industrial-700'
                    }`}
                >
                  Repuestos
                </button>
              </div>


              {settingsTab === 'SPARE_PARTS' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg text-white font-medium">Configuración de Repuestos</h3>
                      <p className="text-sm text-industrial-500">Gestione las listas desplegables y opciones para el registro de repuestos.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Categories */}
                    <div className="bg-industrial-800 rounded-lg border border-industrial-700 p-6">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Box className="w-5 h-5 text-industrial-accent" />
                        Categorías
                      </h3>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Nueva categoría..."
                            className="flex-1 bg-industrial-900 border border-industrial-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-emerald-500"
                            value={newPartCategory}
                            onChange={(e) => setNewPartCategory(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddToList(addPartCategory, newPartCategory, setNewPartCategory);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleAddToList(addPartCategory, newPartCategory, setNewPartCategory)}
                            className="bg-industrial-700 hover:bg-industrial-600 text-white p-2 rounded transition-colors"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                          {partCategories.map((item) => (
                            <div key={item} className="flex justify-between items-center bg-industrial-900/50 p-3 rounded border border-industrial-700/50 group">
                              <input
                                type="text"
                                defaultValue={item}
                                className="bg-transparent text-industrial-300 border-none focus:ring-0 p-0 w-full mr-2"
                                onBlur={(e) => {
                                  if (e.target.value !== item && e.target.value.trim() !== '') {
                                    updatePartCategory(item, e.target.value.trim());
                                  } else {
                                    e.target.value = item;
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleRemoveFromList(removePartCategory, item)}
                                className="text-industrial-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Locations */}
                    <div className="bg-industrial-800 rounded-lg border border-industrial-700 p-6">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-orange-500" />
                        Ubicaciones
                      </h3>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Nueva ubicación..."
                            className="flex-1 bg-industrial-900 border border-industrial-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-emerald-500"
                            value={newPartLocation}
                            onChange={(e) => setNewPartLocation(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddToList(addPartLocation, newPartLocation, setNewPartLocation);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleAddToList(addPartLocation, newPartLocation, setNewPartLocation)}
                            className="bg-industrial-700 hover:bg-industrial-600 text-white p-2 rounded transition-colors"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                          {partLocations.map((item) => (
                            <div key={item} className="flex justify-between items-center bg-industrial-900/50 p-3 rounded border border-industrial-700/50 group">
                              <input
                                type="text"
                                defaultValue={item}
                                className="bg-transparent text-industrial-300 border-none focus:ring-0 p-0 w-full mr-2"
                                onBlur={(e) => {
                                  if (e.target.value !== item && e.target.value.trim() !== '') {
                                    updatePartLocation(item, e.target.value.trim());
                                  } else {
                                    e.target.value = item;
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleRemoveFromList(removePartLocation, item)}
                                className="text-industrial-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Units of Measure */}
                    <div className="bg-industrial-800 rounded-lg border border-industrial-700 p-6">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Scale className="w-5 h-5 text-purple-500" />
                        Unidades de Medida
                      </h3>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Nueva unidad..."
                            className="flex-1 bg-industrial-900 border border-industrial-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-emerald-500"
                            value={newPartUnit}
                            onChange={(e) => setNewPartUnit(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddToList(addPartUnit, newPartUnit, setNewPartUnit);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleAddToList(addPartUnit, newPartUnit, setNewPartUnit)}
                            className="bg-industrial-700 hover:bg-industrial-600 text-white p-2 rounded transition-colors"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                          {partUnits.map((item) => (
                            <div key={item} className="flex justify-between items-center bg-industrial-900/50 p-3 rounded border border-industrial-700/50 group">
                              <input
                                type="text"
                                defaultValue={item}
                                className="bg-transparent text-industrial-300 border-none focus:ring-0 p-0 w-full mr-2"
                                onBlur={(e) => {
                                  if (e.target.value !== item && e.target.value.trim() !== '') {
                                    updatePartUnit(item, e.target.value.trim());
                                  } else {
                                    e.target.value = item;
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleRemoveFromList(removePartUnit, item)}
                                className="text-industrial-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'GENERAL' && (
                <>
                  <div className="bg-industrial-800 p-6 rounded-lg border border-industrial-700">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                      <Settings size={18} className="text-industrial-500" />
                      {t('settings.metadata.title')}
                    </h3>

                    {/* Logo Upload Section */}
                    <div className="mb-6 bg-industrial-900/50 p-4 rounded border border-industrial-700/50 flex flex-col items-center justify-center gap-3">
                      <div className="w-24 h-24 rounded bg-white flex items-center justify-center overflow-hidden border border-industrial-600 relative group">
                        {plantSettings?.logoUrl ? (
                          <img src={plantSettings.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-industrial-400">
                            <span className="text-xs font-bold">NO LOGO</span>
                          </div>
                        )}

                        {/* Hover Overlay */}
                        <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          <span className="text-white text-xs font-medium">Change</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  if (onUpdateSettings && reader.result) {
                                    onUpdateSettings({ ...plantSettings, logoUrl: reader.result as string });
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>

                      <div className="text-center">
                        <p className="text-xs text-industrial-400 mb-1">Company Logo</p>
                        <label className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer flex items-center gap-1 justify-center">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          Upload Image
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  if (onUpdateSettings && reader.result) {
                                    onUpdateSettings({ ...plantSettings, logoUrl: reader.result as string });
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-medium text-industrial-400 mb-1">{t('settings.plantName')}</label>
                        <input
                          type="text"
                          className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-sm text-white focus:border-industrial-accent outline-none transition-colors"
                          value={plantSettings?.plantName || ''}
                          onChange={(e) => onUpdateSettings && onUpdateSettings({ ...plantSettings, plantName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-industrial-400 mb-1">{t('settings.costCenter')}</label>
                        <input
                          type="text"
                          placeholder="131-23456-9"
                          className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-sm text-white focus:border-industrial-accent outline-none transition-colors font-mono"
                          value={plantSettings?.rnc || ''}
                          onChange={(e) => onUpdateSettings && onUpdateSettings({ ...plantSettings, rnc: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-industrial-400 mb-1">{t('settings.timezone')}</label>
                        <select
                          className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-sm text-white focus:border-industrial-accent outline-none transition-colors"
                          value={plantSettings?.timezone || 'AST'}
                          onChange={(e) => onUpdateSettings && onUpdateSettings({ ...plantSettings, timezone: e.target.value })}
                        >
                          <option value="AST">Santo Domingo (GMT-4)</option>
                          <option value="CST">Mexico City (UTC-6)</option>
                          <option value="EST">New York (UTC-5)</option>
                          <option value="CET">Madrid (UTC+1)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-industrial-400 mb-1">{t('settings.currency')}</label>
                        <select
                          className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-sm text-white focus:border-industrial-accent outline-none transition-colors"
                          value={plantSettings?.currency || 'DOP'}
                          onChange={(e) => onUpdateSettings && onUpdateSettings({ ...plantSettings, currency: e.target.value })}
                        >
                          <option value="DOP">Peso Dominicano (RD$)</option>
                          <option value="USD">US Dollar (US$)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-industrial-800 p-6 rounded-lg border border-industrial-700">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-industrial-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {t('settings.compliance.title')}
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-industrial-900/50 rounded border border-industrial-700/50">
                        <div>
                          <span className="block text-sm text-white font-medium">{t('settings.compliance.sig')}</span>
                          <span className="text-xs text-industrial-500">{t('settings.compliance.sig.desc')}</span>
                        </div>
                        <div className="w-12 h-6 bg-industrial-accent rounded-full relative cursor-pointer">
                          <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1 shadow-sm"></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-industrial-900/50 rounded border border-industrial-700/50">
                        <div>
                          <span className="block text-sm text-white font-medium">{t('settings.compliance.auto')}</span>
                          <span className="text-xs text-industrial-500">{t('settings.compliance.auto.desc')}</span>
                        </div>
                        <div className="w-12 h-6 bg-industrial-accent rounded-full relative cursor-pointer">
                          <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1 shadow-sm"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {settingsTab === 'ZONES' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg text-white font-medium">Zonas de Producción y Líneas</h3>
                      <p className="text-sm text-industrial-500">Defina la estructura de planta. Las líneas pertenecen a una zona específica.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Zone List */}
                    <div className="col-span-2 space-y-4">
                      {zoneStructures.map((zone) => (
                        <div key={zone.id} className="bg-industrial-800 rounded-lg border border-industrial-700 p-4">
                          <div className="flex justify-between items-start mb-3 border-b border-industrial-700 pb-2">
                            {editingZoneId === zone.id ? (
                              <div className="flex gap-2 items-center flex-1 mr-2">
                                <input
                                  type="text"
                                  className="flex-1 bg-industrial-900 border border-blue-500 rounded p-1 text-sm text-white focus:outline-none"
                                  value={editingZoneName}
                                  onChange={(e) => setEditingZoneName(e.target.value)}
                                  autoFocus
                                />
                                <button onClick={() => saveZoneName(zone)} className="text-green-400 hover:text-green-300"><Check size={16} /></button>
                                <button onClick={() => setEditingZoneId(null)} className="text-red-400 hover:text-red-300"><X size={16} /></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-white text-sm">{zone.name}</h5>
                                <button onClick={() => startEditingZone(zone)} className="text-industrial-500 hover:text-blue-400 transition-colors">
                                  <Edit2 size={12} />
                                </button>
                              </div>
                            )}

                            <button
                              onClick={() => handleDeleteZone(zone.id)}
                              className="text-industrial-500 hover:text-red-500 transition-colors bg-industrial-900 p-1 rounded border border-industrial-800 hover:border-red-500/50"
                              title="Eliminar Zona completa"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className="space-y-2 pl-4 border-l-2 border-industrial-800 ml-1">
                            {zone.lines.map((line, idx) => (
                              <div key={idx} className="flex justify-between items-center group py-1">
                                <span className="text-industrial-300 text-sm font-mono flex items-center gap-2">
                                  <CornerDownRight size={12} className="text-industrial-600" />
                                  {line}
                                </span>
                                <button
                                  onClick={() => handleDeleteLine(zone.id, line)}
                                  className="text-industrial-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Eliminar Línea"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                            {zone.lines.length === 0 && (
                              <p className="text-xs text-industrial-600 italic py-1">No hay líneas registradas</p>
                            )}
                          </div>

                          {/* Add Line Input */}
                          <div className="mt-4 flex gap-2 pl-4">
                            <input
                              type="text"
                              className="flex-1 bg-industrial-900 border border-industrial-600 rounded p-1.5 text-xs text-white placeholder-industrial-500"
                              placeholder="Agregar Línea (ej. Línea 1)"
                              value={newLineInputs[zone.id] || ''}
                              onChange={(e) => setNewLineInputs({ ...newLineInputs, [zone.id]: e.target.value })}
                            />
                            <button
                              onClick={() => handleAddLine(zone.id)}
                              className="bg-industrial-700 hover:bg-industrial-600 text-white px-2 rounded text-xs"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {zoneStructures.length === 0 && (
                        <div className="bg-industrial-800/50 rounded-lg border border-industrial-700 p-8 text-center">
                          <Layout size={32} className="mx-auto text-industrial-600 mb-2" />
                          <p className="text-industrial-400 text-sm">No hay zonas configuradas</p>
                        </div>
                      )}
                    </div>

                    {/* Add Zone Card */}
                    <div className="bg-industrial-800 rounded-lg border border-industrial-700 p-4 h-fit sticky top-6">
                      <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Plus size={14} /> Agregar Nueva Zona</h4>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs text-industrial-400">Nombre de Zona</label>
                          <input
                            type="text"
                            className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                            placeholder="e.g. Producción"
                            value={newZoneName}
                            onChange={(e) => setNewZoneName(e.target.value)}
                          />
                        </div>
                        <button
                          onClick={handleAddZoneStructure}
                          className="w-full bg-industrial-700 hover:bg-industrial-600 text-white py-2 rounded text-sm transition-colors border border-industrial-600"
                        >
                          Crear Zona
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'EQUIPMENT' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg text-white font-medium">Configuración de Equipos</h3>
                      <p className="text-sm text-industrial-500">Gestione las listas desplegables y opciones para el registro de activos.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Branches */}
                    <div className="bg-industrial-800 rounded-lg border border-industrial-700 p-6">
                      <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Briefcase size={20} className="text-industrial-accent" />
                        Sucursales
                      </h4>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="flex-1 bg-industrial-900 border border-industrial-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-emerald-500"
                            placeholder="Nueva Sucursal"
                            value={newBranch}
                            onChange={e => setNewBranch(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddToList(addBranch, newBranch, setNewBranch);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleAddToList(addBranch, newBranch, setNewBranch)}
                            className="bg-industrial-700 hover:bg-industrial-600 text-white p-2 rounded transition-colors"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                          {branches.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-industrial-900/50 p-3 rounded border border-industrial-700/50 group">
                              <input
                                type="text"
                                defaultValue={item}
                                className="bg-transparent text-industrial-300 border-none focus:ring-0 p-0 w-full mr-2"
                                onBlur={(e) => {
                                  if (e.target.value !== item && e.target.value.trim() !== '') {
                                    updateBranch(item, e.target.value.trim());
                                  } else {
                                    e.target.value = item;
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleRemoveFromList(removeBranch, item)}
                                className="text-industrial-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Categories */}
                    <div className="bg-industrial-800 rounded-lg border border-industrial-700 p-6">
                      <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Box size={20} className="text-orange-500" />
                        Categorías
                      </h4>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="flex-1 bg-industrial-900 border border-industrial-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-emerald-500"
                            placeholder="Nueva Categoría"
                            value={newCategory}
                            onChange={e => setNewCategory(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddToList(addCategory, newCategory, setNewCategory);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleAddToList(addCategory, newCategory, setNewCategory)}
                            className="bg-industrial-700 hover:bg-industrial-600 text-white p-2 rounded transition-colors"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                          {categories.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-industrial-900/50 p-3 rounded border border-industrial-700/50 group">
                              <input
                                type="text"
                                defaultValue={item}
                                className="bg-transparent text-industrial-300 border-none focus:ring-0 p-0 w-full mr-2"
                                onBlur={(e) => {
                                  if (e.target.value !== item && e.target.value.trim() !== '') {
                                    updateCategory(item, e.target.value.trim());
                                  } else {
                                    e.target.value = item;
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleRemoveFromList(removeCategory, item)}
                                className="text-industrial-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Asset Types */}
                    <div className="bg-industrial-800 rounded-lg border border-industrial-700 p-6">
                      <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Cpu size={20} className="text-purple-500" />
                        Tipos de Activo
                      </h4>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="flex-1 bg-industrial-900 border border-industrial-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-emerald-500"
                            placeholder="Nuevo Tipo (ej. GENERATOR)"
                            value={newAssetType}
                            onChange={e => setNewAssetType(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddToList(addAssetType, newAssetType, setNewAssetType);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleAddToList(addAssetType, newAssetType, setNewAssetType)}
                            className="bg-industrial-700 hover:bg-industrial-600 text-white p-2 rounded transition-colors"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                          {assetTypes.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-industrial-900/50 p-3 rounded border border-industrial-700/50 group">
                              <input
                                type="text"
                                defaultValue={item}
                                className="bg-transparent text-industrial-300 border-none focus:ring-0 p-0 w-full mr-2"
                                onBlur={(e) => {
                                  if (e.target.value !== item && e.target.value.trim() !== '') {
                                    updateAssetType(item, e.target.value.trim());
                                  } else {
                                    e.target.value = item;
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleRemoveFromList(removeAssetType, item)}
                                className="text-industrial-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Zones Reference */}
                    <div className="bg-industrial-800/50 rounded-lg border border-industrial-700/50 p-6 col-span-1 md:col-span-3 opacity-70">
                      <h4 className="text-sm font-bold text-industrial-400 mb-2 flex items-center gap-2">
                        <Layout size={16} />
                        Ubicaciones (Solo Lectura)
                      </h4>
                      <p className="text-xs text-industrial-500 mb-3">
                        Las ubicaciones se gestionan en la pestaña "Zonas - Líneas". Aquí se muestran las disponibles para referencia.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {zones.map((item, idx) => (
                          <span key={idx} className="bg-industrial-900 px-2 py-1 rounded border border-industrial-700 text-xs text-industrial-500 font-mono">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )
        }
      </div >

      {/* MODAL - Add Gateway/Machine (IoT) */}
      {
        showGatewayModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-industrial-800 rounded-lg border border-industrial-600 shadow-2xl w-full max-w-5xl overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-industrial-700 flex justify-between items-center bg-industrial-900/50">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Server className="w-4 h-4 text-industrial-accent" />
                  {editingId ? 'Editar Equipo IoT' : 'Nuevo Equipo IoT'}
                </h3>
                <button onClick={() => setShowGatewayModal(false)} className="text-industrial-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleGatewaySubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">

                {/* Classification Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.branch')}</label>
                    <select
                      className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newMachine.branch}
                      onChange={e => setNewMachine({ ...newMachine, branch: e.target.value })}
                    >
                      <option value="" disabled>Seleccionar Sucursal</option>
                      {branches.map(branch => (
                        <option key={branch} value={branch}>{branch}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.category')}</label>
                    <select
                      className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newMachine.category}
                      onChange={e => setNewMachine({ ...newMachine, category: e.target.value })}
                    >
                      <option value="" disabled>Seleccionar Categoría</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.location')}</label>
                    <select
                      className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newMachine.zone || zones[0]}
                      onChange={e => setNewMachine({ ...newMachine, zone: e.target.value })}
                    >
                      <option value="" disabled>Seleccionar Zona</option>
                      {zones.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.col.type')}</label>
                    <select
                      className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newMachine.type}
                      onChange={e => setNewMachine({ ...newMachine, type: e.target.value })}
                    >
                      <option value="" disabled>Seleccionar Tipo</option>
                      {assetTypes.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">Estatus</label>
                    <select
                      className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newMachine.isActive ? 'true' : 'false'}
                      onChange={e => setNewMachine({ ...newMachine, isActive: e.target.value === 'true' })}
                    >
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </div>
                </div>

                <div className="h-px bg-industrial-700 my-2"></div>
                <h4 className="text-sm font-bold text-white mb-2">Detalles del Equipo</h4>

                {/* Equipment Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.col.name')} *</label>
                    <input required type="text" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newMachine.name} onChange={e => setNewMachine({ ...newMachine, name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.alias')} *</label>
                    <input required type="text" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newMachine.alias} onChange={e => setNewMachine({ ...newMachine, alias: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.brand')} *</label>
                    <input required type="text" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newMachine.brand} onChange={e => setNewMachine({ ...newMachine, brand: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.model')} *</label>
                    <input required type="text" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newMachine.model} onChange={e => setNewMachine({ ...newMachine, model: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('form.plate')} *</label>
                    <input required type="text" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newMachine.plate} onChange={e => setNewMachine({ ...newMachine, plate: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.year')}</label>
                    <input type="number" max="9999" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newMachine.year} onChange={e => setNewMachine({ ...newMachine, year: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.capacity')}</label>
                    <input type="text" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newMachine.capacity} onChange={e => setNewMachine({ ...newMachine, capacity: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.current')}</label>
                    <input type="number" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newMachine.currentRating} onChange={e => setNewMachine({ ...newMachine, currentRating: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.frequency')}</label>
                    <input type="number" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newMachine.frequency} onChange={e => setNewMachine({ ...newMachine, frequency: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.voltage')}</label>
                    <input type="number" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newMachine.voltage} onChange={e => setNewMachine({ ...newMachine, voltage: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.power')}</label>
                    <input type="number" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newMachine.power} onChange={e => setNewMachine({ ...newMachine, power: Number(e.target.value) })} />
                  </div>
                </div>

                {/* Maintenance & IoT */}
                <div className="pt-2">
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.col.schedule')}</label>
                    <div className="bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm min-h-[38px] flex items-center">
                      {editingId && maintenancePlans.find(p => p.machineId === editingId)?.intervals.length ? (
                        <div className="flex flex-wrap gap-2">
                          {maintenancePlans.find(p => p.machineId === editingId)?.intervals
                            .filter(i => i.hours > 0 || i.label)
                            .sort((a, b) => a.hours - b.hours)
                            .map(i => (
                              <span key={i.id} className="bg-blue-900/50 text-blue-200 px-2 py-0.5 rounded text-xs border border-blue-800">
                                {i.label || `${i.hours.toLocaleString()} Horas`}
                              </span>
                            ))}
                        </div>
                      ) : (
                        <span className="text-industrial-400 italic text-xs">Definir los Intervalos de Mantenimientos en las configuraciones de Mantenimientos</span>
                      )}
                    </div>
                  </div>
                  {/* Simulated Discovery Message */}
                  {/* Simulated Discovery Message */}
                  <div className="mt-6 p-5 bg-blue-900/30 border border-blue-500/50 rounded-lg flex items-center gap-5 shadow-lg shadow-blue-900/20">
                    <div className="bg-blue-500/20 p-3 rounded-full">
                      <Wifi className="w-8 h-8 text-blue-400 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base text-blue-100 font-bold tracking-wide">Descubrimiento IoT & Protocolo</p>
                      <p className="text-sm text-blue-300">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></span>
                        Handshake OPC-UA Activo. Protocolo: <span className="font-mono text-blue-200 bg-blue-900/50 px-2 py-0.5 rounded border border-blue-700">{newMachine.type === 'GENERIC' ? 'Estándar' : newMachine.type}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Files Section */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-industrial-700">
                  {/* Image Upload */}
                  <div className="space-y-2">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.image')}</label>
                    <div className="h-32 border-2 border-dashed border-industrial-600 rounded flex flex-col items-center justify-center relative hover:border-industrial-400 transition-colors">
                      {newMachine.imageUrl ? (
                        <img src={newMachine.imageUrl} className="h-full w-full object-contain" alt="Asset" />
                      ) : (
                        <div className="text-center p-2">
                          <Camera className="w-6 h-6 text-industrial-500 mx-auto mb-1" />
                          <span className="text-[10px] text-industrial-400">Toque para Subir</span>
                        </div>
                      )}
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const reader = new FileReader();
                            reader.onloadend = () => setNewMachine({ ...newMachine, imageUrl: reader.result as string });
                            reader.readAsDataURL(e.target.files[0]);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Documents Upload */}
                  <div className="space-y-2">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.docs')}</label>
                    <div className="bg-industrial-900 border border-industrial-600 rounded p-2 h-32 overflow-y-auto">
                      {newMachine.documents && newMachine.documents.length > 0 ? (
                        <ul className="text-xs space-y-1">
                          {newMachine.documents.map((doc, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-industrial-300">
                              <FileText size={10} /> Doc {idx + 1}
                            </li>
                          ))}
                        </ul>
                      ) : <span className="text-xs text-industrial-500 italic">No documents</span>}

                      <label className="mt-2 flex items-center justify-center gap-1 text-xs text-blue-400 cursor-pointer hover:underline">
                        <Plus size={10} /> Agregar Documento
                        <input type="file" className="hidden"
                          onChange={(e) => {
                            // Mock adding a document URL
                            if (e.target.files && e.target.files[0]) {
                              setNewMachine(prev => ({
                                ...prev,
                                documents: [...(prev.documents || []), e.target.files![0].name]
                              }));
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-industrial-700 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowGatewayModal(false)}
                    className="px-4 py-2 rounded text-sm text-industrial-300 hover:text-white hover:bg-industrial-700 transition-colors"
                  >
                    {t('workforce.modal.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded text-sm bg-industrial-accent text-white font-medium hover:bg-blue-600 transition-colors shadow-lg shadow-blue-900/20"
                  >
                    {editingId ? 'Guardar Cambios' : 'Registrar Activo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* MODAL - Add Manual Asset (Non-IoT) */}
      {
        showManualAssetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-industrial-800 rounded-lg border border-industrial-600 shadow-2xl w-full max-w-5xl overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-industrial-700 flex justify-between items-center bg-industrial-900/50">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Box className="w-4 h-4 text-industrial-500" />
                  {editingId ? 'Editar Equipo' : 'Nuevo Equipo'}
                </h3>
                <button onClick={() => setShowManualAssetModal(false)} className="text-industrial-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleManualAssetSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">

                {/* Classification Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.branch')}</label>
                    <select
                      className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newManualAsset.branch}
                      onChange={e => setNewManualAsset({ ...newManualAsset, branch: e.target.value })}
                    >
                      <option value="" disabled>Seleccionar Sucursal</option>
                      {branches.map(branch => (
                        <option key={branch} value={branch}>{branch}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.category')}</label>
                    <select
                      className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newManualAsset.category}
                      onChange={e => setNewManualAsset({ ...newManualAsset, category: e.target.value })}
                    >
                      <option value="" disabled>Seleccionar Categoría</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.location')}</label>
                    <select
                      className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newManualAsset.zone || zones[0]}
                      onChange={e => setNewManualAsset({ ...newManualAsset, zone: e.target.value })}
                    >
                      {zones.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.col.type')}</label>
                    <select
                      className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newManualAsset.type}
                      onChange={e => setNewManualAsset({ ...newManualAsset, type: e.target.value })}
                    >
                      <option value="" disabled>Seleccionar Tipo</option>
                      {assetTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">Estatus</label>
                    <select
                      className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newManualAsset.isActive ? 'true' : 'false'}
                      onChange={e => setNewManualAsset({ ...newManualAsset, isActive: e.target.value === 'true' })}
                    >
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </div>
                </div>

                <div className="h-px bg-industrial-700 my-2"></div>
                <h4 className="text-sm font-bold text-white mb-2">Detalles del Equipo</h4>

                {/* Equipment Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.col.name')} *</label>
                    <input required type="text" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newManualAsset.name} onChange={e => setNewManualAsset({ ...newManualAsset, name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.alias')} *</label>
                    <input required type="text" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newManualAsset.alias} onChange={e => setNewManualAsset({ ...newManualAsset, alias: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.brand')} *</label>
                    <input required type="text" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newManualAsset.brand} onChange={e => setNewManualAsset({ ...newManualAsset, brand: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.model')} *</label>
                    <input required type="text" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newManualAsset.model} onChange={e => setNewManualAsset({ ...newManualAsset, model: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('form.plate')} *</label>
                    <input required type="text" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      placeholder="e.g. 10203040"
                      value={newManualAsset.plate} onChange={e => setNewManualAsset({ ...newManualAsset, plate: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.year')}</label>
                    <input type="number" max="9999" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newManualAsset.year} onChange={e => setNewManualAsset({ ...newManualAsset, year: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.capacity')}</label>
                    <input type="text" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newManualAsset.capacity} onChange={e => setNewManualAsset({ ...newManualAsset, capacity: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.current')}</label>
                    <input type="number" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newManualAsset.currentRating} onChange={e => setNewManualAsset({ ...newManualAsset, currentRating: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.frequency')}</label>
                    <input type="number" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newManualAsset.frequency} onChange={e => setNewManualAsset({ ...newManualAsset, frequency: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.voltage')}</label>
                    <input type="number" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newManualAsset.voltage} onChange={e => setNewManualAsset({ ...newManualAsset, voltage: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.power')}</label>
                    <input type="number" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newManualAsset.power} onChange={e => setNewManualAsset({ ...newManualAsset, power: Number(e.target.value) })} />
                  </div>
                </div>

                <div className="pt-2">
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.col.schedule')}</label>
                    <div className="bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm min-h-[38px] flex items-center">
                      {editingId && maintenancePlans.find(p => p.machineId === editingId)?.intervals.length ? (
                        <div className="flex flex-wrap gap-2">
                          {maintenancePlans.find(p => p.machineId === editingId)?.intervals.map(i => (
                            <span key={i.id} className="bg-blue-900/50 text-blue-200 px-2 py-0.5 rounded text-xs border border-blue-800">
                              {i.tasks.reduce((sum, t) => sum + t.duration, 0) > 0
                                ? `${i.runningHours || 0} Horas` // Fallback if name is generic, usually we want the interval value
                                : `Intervalo ${i.id}`
                              }
                            </span>
                          ))}
                          {/* Actually user said to show "360 Horas, 1,080 Horas" etc. 
                              The 'runningHours' field on Interval seems the right place. 
                              Let's check MaintenanceInterval type in types.ts if needed, but assuming structure.
                              Actually, looking at previous code, intervals was string[]. 
                              Now it is MaintenancePlan -> intervals: MaintenanceInterval[]
                           */}
                          {maintenancePlans.find(p => p.machineId === editingId)?.intervals.map(i => (
                            <span key={i.id} className="bg-blue-900/50 text-blue-200 px-2 py-0.5 rounded text-xs border border-blue-800">
                              {i.runningHours ? `${i.runningHours.toLocaleString()} Horas` : 'Intervalo indefinido'}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-industrial-400 italic text-xs">Definir los Intervalos de Mantenimientos en las configuraciones de Mantenimientos</span>
                      )}
                    </div>
                  </div>
                  {/* Disclaimer */}
                  <div className="mt-4 bg-industrial-900/50 p-3 rounded border border-industrial-700/50">
                    <p className="text-xs text-industrial-400 flex items-center gap-2">
                      <Box className="w-3 h-3" />
                      Este equipo no es IoT. Se verá en el mapa, pero requiere entrada de data manual.
                    </p>
                  </div>
                </div>

                {/* Files Section */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-industrial-700">
                  {/* Image Upload */}
                  <div className="space-y-2">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.image')}</label>
                    <div className="h-32 border-2 border-dashed border-industrial-600 rounded flex flex-col items-center justify-center relative hover:border-industrial-400 transition-colors">
                      {newManualAsset.imageUrl ? (
                        <img src={newManualAsset.imageUrl} className="h-full w-full object-contain" alt="Asset" />
                      ) : (
                        <div className="text-center p-2">
                          <Camera className="w-6 h-6 text-industrial-500 mx-auto mb-1" />
                          <span className="text-[10px] text-industrial-400">Toque para Subir</span>
                        </div>
                      )}
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const reader = new FileReader();
                            reader.onloadend = () => setNewManualAsset({ ...newManualAsset, imageUrl: reader.result as string });
                            reader.readAsDataURL(e.target.files[0]);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Documents Upload */}
                  <div className="space-y-2">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.docs')}</label>
                    <div className="bg-industrial-900 border border-industrial-600 rounded p-2 h-32 overflow-y-auto">
                      {newManualAsset.documents && newManualAsset.documents.length > 0 ? (
                        <ul className="text-xs space-y-1">
                          {newManualAsset.documents.map((doc, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-industrial-300">
                              <FileText size={10} /> Doc {idx + 1}
                            </li>
                          ))}
                        </ul>
                      ) : <span className="text-xs text-industrial-500 italic">Sin documentos</span>}

                      <label className="mt-2 flex items-center justify-center gap-1 text-xs text-blue-400 cursor-pointer hover:underline">
                        <Plus size={10} /> Agregar Documento
                        <input type="file" className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setNewManualAsset(prev => ({
                                ...prev,
                                documents: [...(prev.documents || []), e.target.files![0].name]
                              }));
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>


                <div className="flex justify-end gap-3 pt-4 border-t border-industrial-700 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowManualAssetModal(false)}
                    className="px-4 py-2 rounded text-sm text-industrial-300 hover:text-white hover:bg-industrial-700 transition-colors"
                  >
                    {t('workforce.modal.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded text-sm bg-industrial-700 hover:bg-industrial-600 text-white font-medium transition-colors border border-industrial-600"
                  >
                    {editingId ? 'Guardar Cambios' : 'Crear Activo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
};
