
import React, { useState } from 'react';
import { Machine, Technician, MachineStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { UserManagement } from './user/UserManagement';
import { RoleManagement } from './user/RoleManagement';
import { X, UserPlus, Mail, Briefcase, Clock, Calendar, Server, Cpu, Wifi, Plus, MapPin, Layout, Box, Settings, Shield, Pencil } from 'lucide-react';

interface ConfigurationProps {
  machines: Machine[];
  technicians: Technician[];
  onAddTechnician: (tech: Technician) => void;
  onAddMachine: (machine: Machine) => void;
  onUpdateMachine: (machine: Machine) => void;
}

type Tab = 'ASSETS' | 'WORKFORCE' | 'ROLES' | 'SETTINGS' | 'LOCATIONS';

export const Configuration: React.FC<ConfigurationProps> = ({ machines, technicians, onAddTechnician, onAddMachine, onUpdateMachine }) => {
  const [activeTab, setActiveTab] = useState<Tab>('ASSETS');
  const { t } = useLanguage();
  
  // State for Zones/Lines
  const [zones, setZones] = useState<string[]>(['Zone A - Production Line 1', 'Zone B - Assembly']);
  const [newZoneName, setNewZoneName] = useState('');

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Gateway Modal State (IoT)
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [newMachine, setNewMachine] = useState<Partial<Machine> & { customIntervals?: string }>({
    name: '',
    plate: '',
    type: 'GENERIC',
    runningHours: 0,
    customIntervals: ''
  });

  // Visual Asset Modal State (Non-IoT)
  const [showManualAssetModal, setShowManualAssetModal] = useState(false);
  const [newManualAsset, setNewManualAsset] = useState<{name: string, type: string, zone: string, customIntervals: string}>({
    name: '',
    type: 'GENERIC',
    zone: zones[0] || '',
    customIntervals: ''
  });

  // --- ACTIONS ---

  const openAddGateway = () => {
    setEditingId(null);
    setNewMachine({ name: '', plate: '', type: 'GENERIC', runningHours: 0, customIntervals: '' });
    setShowGatewayModal(true);
  };

  const openAddManual = () => {
    setEditingId(null);
    setNewManualAsset({ name: '', type: 'GENERIC', zone: zones[0] || '', customIntervals: '' });
    setShowManualAssetModal(true);
  };

  const handleEditMachine = (m: Machine) => {
    setEditingId(m.id);
    const intervals = m.intervals ? m.intervals.join(', ') : '';
    
    if (m.isIot) {
        setNewMachine({
            name: m.name,
            plate: m.plate,
            type: m.type,
            runningHours: m.runningHours,
            customIntervals: intervals
        });
        setShowGatewayModal(true);
    } else {
        setNewManualAsset({
            name: m.name,
            type: m.type,
            zone: m.zone || zones[0],
            customIntervals: intervals
        });
        setShowManualAssetModal(true);
    }
  };

  const handleGatewaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMachine.name || !newMachine.plate) return;

    const intervals = newMachine.customIntervals 
        ? newMachine.customIntervals.split(',').map(s => s.trim()) 
        : ['360 Hours', '1080 Hours'];

    if (editingId) {
        const existing = machines.find(m => m.id === editingId);
        if (existing) {
            onUpdateMachine({
                ...existing,
                name: newMachine.name!,
                plate: newMachine.plate!,
                type: newMachine.type as any,
                runningHours: Number(newMachine.runningHours) || 0,
                intervals: intervals
            });
        }
    } else {
        const machine: Machine = {
            id: `m-${Date.now()}`,
            name: newMachine.name || 'New Machine',
            plate: newMachine.plate || '',
            type: newMachine.type as any,
            status: MachineStatus.IDLE,
            location: { x: Math.floor(Math.random() * 80) + 10, y: Math.floor(Math.random() * 80) + 10 },
            zone: zones[0], // Default zone for auto-provisioned
            isIot: true,
            runningHours: Number(newMachine.runningHours) || 0,
            lastMaintenance: new Date().toISOString(),
            nextMaintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days
            intervals: intervals,
            telemetry: { timestamp: new Date().toISOString(), temperature: 0, vibration: 0, pressure: 0, powerConsumption: 0 },
            history: []
        };
        onAddMachine(machine);
    }
    
    setShowGatewayModal(false);
    setEditingId(null);
    setNewMachine({ name: '', plate: '', type: 'GENERIC', runningHours: 0, customIntervals: '' });
  };

  const handleManualAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManualAsset.name) return;

    // Simulate location based on zone (Very rudimentary logic)
    let baseX = 50;
    let baseY = 50;
    
    if (newManualAsset.zone.includes("Zone A")) {
        baseX = 20 + Math.random() * 20; // 20-40%
        baseY = 20 + Math.random() * 60; // 20-80%
    } else if (newManualAsset.zone.includes("Zone B")) {
        baseX = 60 + Math.random() * 20; // 60-80%
        baseY = 20 + Math.random() * 60; // 20-80%
    } else {
        baseX = Math.random() * 80 + 10;
        baseY = Math.random() * 80 + 10;
    }

    const intervals = newManualAsset.customIntervals 
        ? newManualAsset.customIntervals.split(',').map(s => s.trim()) 
        : ['Manual Check'];

    if (editingId) {
        const existing = machines.find(m => m.id === editingId);
        if (existing) {
            onUpdateMachine({
                ...existing,
                name: newManualAsset.name,
                type: newManualAsset.type as any,
                zone: newManualAsset.zone,
                intervals: intervals
            });
        }
    } else {
        const machine: Machine = {
            id: `ma-${Date.now()}`,
            name: newManualAsset.name,
            plate: 'N/A', // Visual only often don't have plates or user doesn't care
            type: newManualAsset.type as any,
            status: MachineStatus.IDLE,
            location: { x: baseX, y: baseY },
            zone: newManualAsset.zone,
            isIot: false,
            runningHours: 0,
            lastMaintenance: new Date().toISOString(),
            nextMaintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            intervals: intervals,
            telemetry: { timestamp: new Date().toISOString(), temperature: 0, vibration: 0, pressure: 0, powerConsumption: 0 },
            history: []
        };
        onAddMachine(machine);
    }

    setShowManualAssetModal(false);
    setEditingId(null);
    setNewManualAsset({ name: '', type: 'GENERIC', zone: zones[0] || '', customIntervals: '' });
  };

  const handleAddZone = () => {
      if(newZoneName.trim()) {
          setZones([...zones, newZoneName]);
          setNewZoneName('');
      }
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
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'ASSETS'
                ? 'text-white border-industrial-accent'
                : 'text-industrial-500 border-transparent hover:text-industrial-300'
            }`}
          >
            {t('config.tab.assets')}
          </button>
          <button
            onClick={() => setActiveTab('LOCATIONS')}
             className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'LOCATIONS'
                ? 'text-white border-industrial-accent'
                : 'text-industrial-500 border-transparent hover:text-industrial-300'
            }`}
          >
            Lines & Locations
          </button>
          <button
            onClick={() => setActiveTab('WORKFORCE')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'WORKFORCE'
                ? 'text-white border-industrial-accent'
                : 'text-industrial-500 border-transparent hover:text-industrial-300'
            }`}
          >
            {t('workforce.title')}
          </button>
          <button
            onClick={() => setActiveTab('ROLES')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'ROLES'
                ? 'text-white border-industrial-accent'
                : 'text-industrial-500 border-transparent hover:text-industrial-300'
            }`}
          >
            Roles & Permissions
          </button>
          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'SETTINGS'
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
                  Add Visual Asset (Non-IoT)
                </button>
                <button 
                  onClick={openAddGateway}
                  className="bg-industrial-accent hover:bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium shadow-lg transition-colors flex items-center gap-2"
                >
                  <Wifi className="w-3 h-3"/> {t('assets.provision')} (IoT)
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
        {activeTab === 'LOCATIONS' && (
          <div className="space-y-6 animate-fadeIn max-w-4xl">
              <div className="flex justify-between items-center">
                 <div>
                    <h3 className="text-lg text-white font-medium">Production Zones & Lines</h3>
                    <p className="text-sm text-industrial-500">Configure physical locations to organize assets on the Visual Map.</p>
                 </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                 {/* Zone List */}
                 <div className="col-span-2 bg-industrial-800 rounded-lg border border-industrial-700 p-4">
                    <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Layout size={14}/> Active Zones</h4>
                    <div className="space-y-2">
                        {zones.map((zone, idx) => (
                            <div key={idx} className="bg-industrial-900/50 p-3 rounded border border-industrial-700 flex justify-between items-center group">
                                <span className="text-industrial-300 text-sm font-mono">{zone}</span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-xs text-industrial-500">{machines.filter(m => m.zone === zone).length} Assets</span>
                                    <button className="text-industrial-400 hover:text-white"><Settings size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>

                 {/* Add Zone */}
                 <div className="bg-industrial-800 rounded-lg border border-industrial-700 p-4 h-fit">
                    <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Plus size={14}/> Add New Zone</h4>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-xs text-industrial-400">Zone Name / Line ID</label>
                            <input 
                                type="text" 
                                className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm"
                                placeholder="e.g. Zone C - Packaging"
                                value={newZoneName}
                                onChange={(e) => setNewZoneName(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={handleAddZone}
                            className="w-full bg-industrial-700 hover:bg-industrial-600 text-white py-2 rounded text-sm transition-colors border border-industrial-600"
                        >
                            Create Zone
                        </button>
                    </div>
                 </div>
              </div>
          </div>
        )}

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
          <div className="max-w-4xl space-y-8 animate-fadeIn">
             
             <div className="bg-industrial-800 p-6 rounded-lg border border-industrial-700">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-industrial-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  {t('settings.metadata.title')}
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-industrial-400 mb-1">{t('settings.plantName')}</label>
                    <input type="text" defaultValue="Mexico City Main Plant" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-sm text-white focus:border-industrial-accent outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-industrial-400 mb-1">{t('settings.costCenter')}</label>
                    <input type="text" defaultValue="MX-IND-404" className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-sm text-white focus:border-industrial-accent outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-industrial-400 mb-1">{t('settings.timezone')}</label>
                    <select className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-sm text-white focus:border-industrial-accent outline-none transition-colors">
                      <option>UTC-6 (Central Time)</option>
                      <option>UTC-5 (Eastern Time)</option>
                      <option>UTC-4 (Caribbean)</option>
                      <option>UTC+1 (Central European Time)</option>
                    </select>
                  </div>
                   <div>
                    <label className="block text-xs font-medium text-industrial-400 mb-1">{t('settings.currency')}</label>
                    <select className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-sm text-white focus:border-industrial-accent outline-none transition-colors">
                      <option>USD ($)</option>
                      <option>MXN ($)</option>
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

          </div>
        )}
      </div>

       {/* MODAL - Add Gateway/Machine (IoT) */}
       {showGatewayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-industrial-800 rounded-lg border border-industrial-600 shadow-2xl w-full max-w-lg overflow-hidden">
             {/* Header */}
             <div className="p-4 border-b border-industrial-700 flex justify-between items-center bg-industrial-900/50">
               <h3 className="text-white font-bold flex items-center gap-2">
                 <Server className="w-4 h-4 text-industrial-accent" />
                 {editingId ? 'Edit Gateway Config' : `${t('assets.provision')} (IoT)`}
               </h3>
               <button onClick={() => setShowGatewayModal(false)} className="text-industrial-400 hover:text-white transition-colors">
                 <X className="w-5 h-5" />
               </button>
             </div>
             
             {/* Form */}
             <form onSubmit={handleGatewaySubmit} className="p-6 space-y-4">
               {/* Fields for Name, Plate, Type, Initial Hours */}
                <div className="space-y-1">
                 <label className="text-xs text-industrial-400 font-medium uppercase tracking-wider flex items-center gap-2">
                    <Cpu size={12} /> {t('assets.col.name')}
                 </label>
                 <input 
                   required
                   type="text" 
                   className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm focus:border-industrial-accent outline-none transition-colors"
                   placeholder="e.g. Injection Molder 04"
                   value={newMachine.name}
                   onChange={e => setNewMachine({...newMachine, name: e.target.value})}
                 />
              </div>
              <div className="space-y-1">
                 <label className="text-xs text-industrial-400 font-medium uppercase tracking-wider">{t('form.plate')}</label>
                 <input 
                   required
                   type="text" 
                   className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm focus:border-industrial-accent outline-none transition-colors"
                   placeholder="e.g. 10203040"
                   value={newMachine.plate}
                   onChange={e => setNewMachine({...newMachine, plate: e.target.value})}
                 />
              </div>
               <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium uppercase tracking-wider flex items-center gap-2">
                        {t('assets.col.type')}
                    </label>
                    <div className="relative">
                      <select 
                        className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm focus:border-industrial-accent outline-none appearance-none cursor-pointer transition-colors"
                        value={newMachine.type}
                        onChange={e => setNewMachine({...newMachine, type: e.target.value as any})}
                      >
                        <option value="SACMI">SACMI</option>
                        <option value="MOSS">MOSS</option>
                        <option value="PMV">PMV</option>
                        <option value="GENERIC">GENERIC</option>
                      </select>
                    </div>
                </div>
                <div className="space-y-1">
                 <label className="text-xs text-industrial-400 font-medium uppercase tracking-wider flex items-center gap-2">
                    <Clock size={12} /> Initial Running Hours
                 </label>
                 <input 
                   type="number" 
                   className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm focus:border-industrial-accent outline-none transition-colors"
                   value={newMachine.runningHours}
                   onChange={e => setNewMachine({...newMachine, runningHours: Number(e.target.value)})}
                 />
              </div>

              {/* NEW FIELD: Custom Intervals */}
              <div className="space-y-1">
                 <label className="text-xs text-industrial-400 font-medium uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={12} /> Custom Maintenance Intervals
                 </label>
                 <input 
                   type="text" 
                   className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm focus:border-industrial-accent outline-none transition-colors"
                   placeholder="e.g. 500 Hours, 1000 Hours, 2000 Hours"
                   value={newMachine.customIntervals}
                   onChange={e => setNewMachine({...newMachine, customIntervals: e.target.value})}
                 />
                 <p className="text-[10px] text-industrial-500">Separated by comma. Defines preventive schedule.</p>
              </div>

               {/* Simulated Discovery Message */}
               <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded flex items-center gap-3">
                  <Wifi className="w-5 h-5 text-blue-400 animate-pulse" />
                  <div>
                    <p className="text-xs text-blue-200 font-bold">IoT Discovery Active</p>
                    <p className="text-[10px] text-blue-300">Gateway will automatically handshake via OPC-UA</p>
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
                  {editingId ? 'Save Changes' : 'Provision Gateway'}
                </button>
              </div>
             </form>
          </div>
        </div>
       )}

       {/* MODAL - Add Manual Asset (Non-IoT) */}
       {showManualAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-industrial-800 rounded-lg border border-industrial-600 shadow-2xl w-full max-w-lg overflow-hidden">
             {/* Header */}
             <div className="p-4 border-b border-industrial-700 flex justify-between items-center bg-industrial-900/50">
               <h3 className="text-white font-bold flex items-center gap-2">
                 <Box className="w-4 h-4 text-industrial-500" />
                 {editingId ? 'Edit Visual Asset' : 'Add Visual Asset (Non-IoT)'}
               </h3>
               <button onClick={() => setShowManualAssetModal(false)} className="text-industrial-400 hover:text-white transition-colors">
                 <X className="w-5 h-5" />
               </button>
             </div>
             
             {/* Form */}
             <form onSubmit={handleManualAssetSubmit} className="p-6 space-y-4">
               
               <div className="bg-industrial-900/50 p-3 rounded border border-industrial-700 mb-2">
                  <p className="text-xs text-industrial-400">
                    This asset will appear on the Visual Plant map but will <strong>not</strong> receive real-time telemetry.
                  </p>
               </div>

                <div className="space-y-1">
                 <label className="text-xs text-industrial-400 font-medium uppercase tracking-wider flex items-center gap-2">
                    <Cpu size={12} /> Asset Name
                 </label>
                 <input 
                   required
                   type="text" 
                   className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm focus:border-industrial-accent outline-none transition-colors"
                   placeholder="e.g. Lathe 01 - Manual"
                   value={newManualAsset.name}
                   onChange={e => setNewManualAsset({...newManualAsset, name: e.target.value})}
                 />
              </div>

               <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium uppercase tracking-wider flex items-center gap-2">
                        {t('assets.col.type')}
                    </label>
                    <div className="relative">
                      <select 
                        className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm focus:border-industrial-accent outline-none appearance-none cursor-pointer transition-colors"
                        value={newManualAsset.type}
                        onChange={e => setNewManualAsset({...newManualAsset, type: e.target.value as any})}
                      >
                        <option value="GENERIC">GENERIC</option>
                        <option value="SACMI">SACMI</option>
                        <option value="MOSS">MOSS</option>
                        <option value="PMV">PMV</option>
                      </select>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-medium uppercase tracking-wider flex items-center gap-2">
                        <MapPin size={12} /> Assign to Zone / Line
                    </label>
                    <div className="relative">
                      <select 
                        className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm focus:border-industrial-accent outline-none appearance-none cursor-pointer transition-colors"
                        value={newManualAsset.zone}
                        onChange={e => setNewManualAsset({...newManualAsset, zone: e.target.value})}
                      >
                        {zones.map(z => <option key={z} value={z}>{z}</option>)}
                      </select>
                    </div>
                    <p className="text-[10px] text-industrial-500 mt-1 ml-1">
                        Asset will be visually placed within this zone coordinates on the map.
                    </p>
                </div>

                {/* NEW FIELD: Custom Intervals */}
                <div className="space-y-1">
                 <label className="text-xs text-industrial-400 font-medium uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={12} /> Maintenance Requirements
                 </label>
                 <input 
                   type="text" 
                   className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm focus:border-industrial-accent outline-none transition-colors"
                   placeholder="e.g. Monthly Inspection, Annual Calibration"
                   value={newManualAsset.customIntervals}
                   onChange={e => setNewManualAsset({...newManualAsset, customIntervals: e.target.value})}
                 />
                 <p className="text-[10px] text-industrial-500">Define specs for preventive alerts.</p>
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
       )}
    </div>
  );
};
