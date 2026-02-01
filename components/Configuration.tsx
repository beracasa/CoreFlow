
import React, { useState } from 'react';
import { Machine, Technician, MachineStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { UserManagement } from './user/UserManagement';
import { RoleManagement } from './user/RoleManagement';
import { X, UserPlus, Mail, Briefcase, Clock, Calendar, Server, Cpu, Wifi, Plus, MapPin, Layout, Box, Settings, Shield, Pencil, Camera, FileText, Trash2, CornerDownRight } from 'lucide-react';

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
}

type Tab = 'ASSETS' | 'WORKFORCE' | 'ROLES' | 'SETTINGS';

export const Configuration: React.FC<ConfigurationProps> = ({ machines, technicians, onAddTechnician, onAddMachine, onUpdateMachine, settings, onUpdateSettings }) => {
  const [activeTab, setActiveTab] = useState<Tab>('ASSETS');

  const [settingsTab, setSettingsTab] = useState<'GENERAL' | 'ZONES' | 'EQUIPMENT'>('GENERAL');
  const { t } = useLanguage();

  // State for Equipment Configuration
  const [branches, setBranches] = useState<string[]>(['Main Branch', 'Secondary Branch']);
  const [categories, setCategories] = useState<string[]>(['Production', 'Packaging', 'Utilities']);
  const [assetTypes, setAssetTypes] = useState<string[]>(['GENERIC', 'CONVEYOR', 'MIXER', 'OVEN', 'SENSOR']);
  const [maintenanceSchedules, setMaintenanceSchedules] = useState<string[]>(['250 Hours', '500 Hours', '1000 Hours']);

  // State for new entries
  const [newBranch, setNewBranch] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newAssetType, setNewAssetType] = useState('');
  const [newMaintenanceSchedule, setNewMaintenanceSchedule] = useState('');

  // State for Zones/Lines
  // State for Zones/Lines (Structured)
  interface ZoneStructure {
    id: string;
    name: string;
    lines: string[];
  }
  const [zoneStructures, setZoneStructures] = useState<ZoneStructure[]>([
    { id: '1', name: 'Zone A', lines: ['Production Line 1'] },
    { id: '2', name: 'Zone B', lines: ['Assembly'] }
  ]);
  const zones = zoneStructures.flatMap(z => z.lines.length > 0 ? z.lines.map(l => `${z.name} - ${l}`) : [z.name]);
  const [newZoneName, setNewZoneName] = useState('');
  const [newLineInputs, setNewLineInputs] = useState<Record<string, string>>({});

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Gateway Modal State (IoT)
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [newMachine, setNewMachine] = useState<Partial<Machine> & { customIntervals?: string }>({
    name: '',
    plate: '',
    type: 'GENERIC',
    runningHours: 0,
    customIntervals: '',
    branch: 'Main Branch',
    category: 'Production',
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
    branch: 'Main Branch',
    category: 'Production',
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
    documents: []
  });

  // --- ACTIONS ---

  const openAddGateway = () => {
    setEditingId(null);
    setNewMachine({
      name: '', plate: '', type: 'GENERIC', runningHours: 0, customIntervals: '',
      branch: 'Main Branch', category: 'Production', alias: '', brand: '', model: '', year: new Date().getFullYear(),
      capacity: '', currentRating: 0, frequency: 60, voltage: 480, power: 0, imageUrl: '', documents: []
    });
    setShowGatewayModal(true);
  };

  const openAddManual = () => {
    setEditingId(null);

    setNewManualAsset({
      name: '', plate: '', type: 'GENERIC', zone: zones[0] || '', customIntervals: '',
      branch: 'Main Branch', category: 'Production', alias: '', brand: '', model: '', year: new Date().getFullYear(),
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
        onUpdateMachine({
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
      onAddMachine(machine);
    }

    setShowGatewayModal(false);
    setEditingId(null);
  };

  const handleManualAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManualAsset.name) return;

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
        onUpdateMachine({
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
      onAddMachine(machine);
    }

    setShowManualAssetModal(false);
    setEditingId(null);
  };

  const handleAddZoneStructure = () => {
    if (newZoneName.trim()) {
      const newZone: ZoneStructure = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: newZoneName.trim(),
        lines: []
      };
      setZoneStructures([...zoneStructures, newZone]);
      setNewZoneName('');
    }
  };

  const handleDeleteZone = (id: string) => {
    setZoneStructures(zoneStructures.filter(z => z.id !== id));
  };

  const handleAddLine = (zoneId: string) => {
    const lineName = newLineInputs[zoneId];
    if (lineName && lineName.trim()) {
      setZoneStructures(zoneStructures.map(z =>
        z.id === zoneId ? { ...z, lines: [...z.lines, lineName.trim()] } : z
      ));
      setNewLineInputs({ ...newLineInputs, [zoneId]: '' });
    }
  };

  const handleDeleteLine = (zoneId: string, lineToRemove: string) => {
    setZoneStructures(zoneStructures.map(z =>
      z.id === zoneId ? { ...z, lines: z.lines.filter(l => l !== lineToRemove) } : z
    ));
  };

  const handleAddToList = (list: string[], setList: (l: string[]) => void, newItem: string, setNewItem: (s: string) => void) => {
    if (newItem.trim()) {
      setList([...list, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemoveFromList = (list: string[], setList: (l: string[]) => void, itemToRemove: string) => {
    setList(list.filter(item => item !== itemToRemove));
  };

  return (
    <div className="h-full bg-industrial-900 flex flex-col overflow-hidden relative">
      {/* Module Header */}
      <div className="p-6 border-b border-industrial-800 bg-industrial-900">
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
        <div className="flex gap-6 mt-8 border-b border-industrial-700">
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
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-industrial-900/50">

        {/* ASSET REGISTRY TAB */}
        {activeTab === 'ASSETS' && (
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

            <div className="bg-industrial-800 rounded-lg border border-industrial-700 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm text-industrial-400">
                <thead className="bg-industrial-900 text-xs uppercase font-bold text-industrial-500">
                  <tr>
                    <th className="px-6 py-4">{t('assets.col.id')}</th>
                    <th className="px-6 py-4">{t('assets.col.name')}</th>
                    <th className="px-6 py-4">Zone / Line</th>
                    <th className="px-6 py-4">{t('assets.col.type')}</th>
                    <th className="px-6 py-4">{t('assets.col.protocol')}</th>
                    <th className="px-6 py-4">{t('assets.col.schedule')}</th>
                    <th className="px-6 py-4 text-right">{t('assets.col.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-700">
                  {machines.map((m) => (
                    <tr key={m.id} className="hover:bg-industrial-700/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-industrial-500">{m.id.toUpperCase()}</td>
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
                        {m.intervals ? m.intervals.join(', ') : 'Default'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEditMachine(m)}
                          className="text-industrial-400 hover:text-white transition-colors flex items-center justify-end gap-1"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LOCATIONS TAB */}


        {/* WORKFORCE TAB */}
        {activeTab === 'WORKFORCE' && (
          <UserManagement />
        )}

        {/* ROLES TAB (NEW) */}
        {activeTab === 'ROLES' && (
          <div className="h-full animate-fadeIn">
            <RoleManagement />
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'SETTINGS' && (
          <div className="max-w-4xl space-y-6 animate-fadeIn">

            {/* Sub-Module Navigation */}
            <div className="flex gap-2 bg-industrial-800 p-1 rounded-lg w-fit border border-industrial-700">
              <button
                onClick={() => setSettingsTab('GENERAL')}
                className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${settingsTab === 'GENERAL'
                  ? 'bg-industrial-600 text-white shadow-md'
                  : 'text-industrial-400 hover:text-white hover:bg-industrial-700'
                  }`}
              >
                Datos Generales
              </button>
              <button
                onClick={() => setSettingsTab('ZONES')}
                className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${settingsTab === 'ZONES'
                  ? 'bg-industrial-600 text-white shadow-md'
                  : 'text-industrial-400 hover:text-white hover:bg-industrial-700'
                  }`}
              >
                Zonas - Líneas
              </button>
              <button
                onClick={() => setSettingsTab('EQUIPMENT')}
                className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${settingsTab === 'EQUIPMENT'
                  ? 'bg-industrial-600 text-white shadow-md'
                  : 'text-industrial-400 hover:text-white hover:bg-industrial-700'
                  }`}
              >
                Equipos
              </button>
            </div>

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
                      {settings?.logoUrl ? (
                        <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
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
                                  onUpdateSettings({ ...settings, logoUrl: reader.result as string });
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
                                  onUpdateSettings({ ...settings, logoUrl: reader.result as string });
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
                        value={settings?.plantName || ''}
                        onChange={(e) => onUpdateSettings && onUpdateSettings({ ...settings, plantName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-industrial-400 mb-1">{t('settings.costCenter')}</label>
                      <input
                        type="text"
                        placeholder="131-23456-9"
                        className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-sm text-white focus:border-industrial-accent outline-none transition-colors font-mono"
                        value={settings?.rnc || ''}
                        onChange={(e) => onUpdateSettings && onUpdateSettings({ ...settings, rnc: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-industrial-400 mb-1">{t('settings.timezone')}</label>
                      <select
                        className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-sm text-white focus:border-industrial-accent outline-none transition-colors"
                        value={settings?.timezone || 'AST'}
                        onChange={(e) => onUpdateSettings && onUpdateSettings({ ...settings, timezone: e.target.value })}
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
                        value={settings?.currency || 'DOP'}
                        onChange={(e) => onUpdateSettings && onUpdateSettings({ ...settings, currency: e.target.value })}
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
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-industrial-700">
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <Layout size={16} className="text-industrial-400" />
                            {zone.name}
                          </h4>
                          <button
                            onClick={() => handleDeleteZone(zone.id)}
                            className="text-industrial-500 hover:text-red-400 p-1 hover:bg-industrial-700 rounded transition-colors"
                            title="Eliminar Zona"
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

                <div className="grid grid-cols-2 gap-6">
                  {/* Branches */}
                  <div className="bg-industrial-800 rounded-lg border border-industrial-700 p-4">
                    <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Briefcase size={14} /> Sucursales</h4>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input type="text" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm" placeholder="Nueva Sucursal" value={newBranch} onChange={e => setNewBranch(e.target.value)} />
                        <button onClick={() => handleAddToList(branches, setBranches, newBranch, setNewBranch)} className="bg-industrial-700 hover:bg-industrial-600 text-white px-3 rounded"><Plus size={14} /></button>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {branches.map((item, idx) => (
                          <div key={idx} className="bg-industrial-900/50 p-2 rounded border border-industrial-700 text-xs text-industrial-300 flex justify-between items-center group">
                            <span>{item}</span>
                            <button onClick={() => handleRemoveFromList(branches, setBranches, item)} className="text-industrial-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="bg-industrial-800 rounded-lg border border-industrial-700 p-4">
                    <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Box size={14} /> Categorías</h4>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input type="text" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm" placeholder="Nueva Categoría" value={newCategory} onChange={e => setNewCategory(e.target.value)} />
                        <button onClick={() => handleAddToList(categories, setCategories, newCategory, setNewCategory)} className="bg-industrial-700 hover:bg-industrial-600 text-white px-3 rounded"><Plus size={14} /></button>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {categories.map((item, idx) => (
                          <div key={idx} className="bg-industrial-900/50 p-2 rounded border border-industrial-700 text-xs text-industrial-300 flex justify-between items-center group">
                            <span>{item}</span>
                            <button onClick={() => handleRemoveFromList(categories, setCategories, item)} className="text-industrial-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Asset Types */}
                  <div className="bg-industrial-800 rounded-lg border border-industrial-700 p-4">
                    <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Cpu size={14} /> Tipos de Activo</h4>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input type="text" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm" placeholder="Nuevo Tipo (ej. GENERATOR)" value={newAssetType} onChange={e => setNewAssetType(e.target.value)} />
                        <button onClick={() => handleAddToList(assetTypes, setAssetTypes, newAssetType, setNewAssetType)} className="bg-industrial-700 hover:bg-industrial-600 text-white px-3 rounded"><Plus size={14} /></button>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {assetTypes.map((item, idx) => (
                          <div key={idx} className="bg-industrial-900/50 p-2 rounded border border-industrial-700 text-xs text-industrial-300 flex justify-between items-center group">
                            <span>{item}</span>
                            <button onClick={() => handleRemoveFromList(assetTypes, setAssetTypes, item)} className="text-industrial-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Maintenance Schedules */}
                  <div className="bg-industrial-800 rounded-lg border border-industrial-700 p-4">
                    <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Clock size={14} /> Programas de Mantenimiento</h4>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input type="text" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm" placeholder="Nuevo Intervalo (ej. 2000 Hours)" value={newMaintenanceSchedule} onChange={e => setNewMaintenanceSchedule(e.target.value)} />
                        <button onClick={() => handleAddToList(maintenanceSchedules, setMaintenanceSchedules, newMaintenanceSchedule, setNewMaintenanceSchedule)} className="bg-industrial-700 hover:bg-industrial-600 text-white px-3 rounded"><Plus size={14} /></button>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {maintenanceSchedules.map((item, idx) => (
                          <div key={idx} className="bg-industrial-900/50 p-2 rounded border border-industrial-700 text-xs text-industrial-300 flex justify-between items-center group">
                            <span>{item}</span>
                            <button onClick={() => handleRemoveFromList(maintenanceSchedules, setMaintenanceSchedules, item)} className="text-industrial-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Zones Reference */}
                  <div className="bg-industrial-800/50 rounded-lg border border-industrial-700/50 p-4 col-span-2 opacity-70">
                    <h4 className="text-sm font-bold text-industrial-400 mb-2 flex items-center gap-2"><Layout size={14} /> Ubicaciones (Solo Lectura)</h4>
                    <p className="text-xs text-industrial-500 mb-3">Las ubicaciones se gestionan en la pestaña "Zonas - Líneas". Aquí se muestran las disponibles para referencia.</p>
                    <div className="flex flex-wrap gap-2">
                      {zones.map((item, idx) => (
                        <span key={idx} className="bg-industrial-900 px-2 py-1 rounded border border-industrial-700 text-xs text-industrial-500 font-mono">{item}</span>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
                      <option value="Main Branch">Main Branch</option>
                      <option value="Secondary Branch">Secondary Branch</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.category')}</label>
                    <select
                      className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newMachine.category}
                      onChange={e => setNewMachine({ ...newMachine, category: e.target.value })}
                    >
                      <option value="Production">Production</option>
                      <option value="Packaging">Packaging</option>
                      <option value="Utilities">Utilities</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.location')}</label>
                    <select
                      className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newMachine.zone || zones[0]}
                      onChange={e => setNewMachine({ ...newMachine, zone: e.target.value })}
                    >
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
                      <option value="SACMI">SACMI</option>
                      <option value="MOSS">MOSS</option>
                      <option value="PMV">PMV</option>
                      <option value="GENERIC">GENERIC</option>
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
                    <input type="text" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      placeholder="e.g. 500 Hours, 1000 Hours"
                      value={newMachine.customIntervals} onChange={e => setNewMachine({ ...newMachine, customIntervals: e.target.value })} />
                  </div>
                  {/* Simulated Discovery Message */}
                  {/* Simulated Discovery Message */}
                  <div className="mt-6 p-5 bg-blue-900/30 border border-blue-500/50 rounded-lg flex items-center gap-5 shadow-lg shadow-blue-900/20">
                    <div className="bg-blue-500/20 p-3 rounded-full">
                      <Wifi className="w-8 h-8 text-blue-400 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base text-blue-100 font-bold tracking-wide">IoT Discovery & Protocol</p>
                      <p className="text-sm text-blue-300">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></span>
                        OPC-UA Handshake Active. Protocol: <span className="font-mono text-blue-200 bg-blue-900/50 px-2 py-0.5 rounded border border-blue-700">{newMachine.type === 'GENERIC' ? 'Standard' : newMachine.type}</span>
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
                          <span className="text-[10px] text-industrial-400">Tap to Upload</span>
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
                        <Plus size={10} /> Add Document
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
                    {editingId ? 'Save Changes' : t('assets.provision')}
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
                      <option value="Main Branch">Main Branch</option>
                      <option value="Secondary Branch">Secondary Branch</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium">{t('assets.category')}</label>
                    <select
                      className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      value={newManualAsset.category}
                      onChange={e => setNewManualAsset({ ...newManualAsset, category: e.target.value })}
                    >
                      <option value="Production">Production</option>
                      <option value="Packaging">Packaging</option>
                      <option value="Utilities">Utilities</option>
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
                      <option value="SACMI">SACMI</option>
                      <option value="MOSS">MOSS</option>
                      <option value="PMV">PMV</option>
                      <option value="GENERIC">GENERIC</option>
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
                    <input type="text" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                      placeholder="e.g. Monthly Inspection"
                      value={newManualAsset.customIntervals} onChange={e => setNewManualAsset({ ...newManualAsset, customIntervals: e.target.value })} />
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
                          <span className="text-[10px] text-industrial-400">Tap to Upload</span>
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
                      ) : <span className="text-xs text-industrial-500 italic">No documents</span>}

                      <label className="mt-2 flex items-center justify-center gap-1 text-xs text-blue-400 cursor-pointer hover:underline">
                        <Plus size={10} /> Add Document
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
                    {editingId ? 'Save Changes' : 'Create Asset'}
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
