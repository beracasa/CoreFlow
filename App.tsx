import React, { useState, useEffect, ReactNode, ErrorInfo, Component } from 'react';
import {
  AppView,
  Machine,
  MachineStatus,
  WorkOrder,
  WorkOrderStatus,
  WorkOrderStage,
  Priority,
  SparePart,
  Technician,
  PlanTier,
  UserRole
} from './types';
import { Dashboard } from './components/Dashboard';
import { MaintenanceKanban } from './components/MaintenanceKanban';
import { MaintenanceList } from './components/MaintenanceList';
import { MaintenanceForm } from './components/MaintenanceForm';
import { MachineHoursLog } from './components/MachineHoursLog';
import { Inventory } from './components/Inventory';
import { Analytics } from './components/Analytics';
import { Configuration } from './components/Configuration';
import { UserProfileView } from './components/user/UserProfile';
import { OnboardingWizard } from './components/OnboardingWizard';
import { useLanguage } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Clock, LogOut, Shield, User, Cpu, Hexagon } from 'lucide-react';

// --- MOCK DATA ---
const INITIAL_MACHINES: Machine[] = [
  {
    id: 'm1',
    name: 'SACMI Press 01',
    plate: '10022775',
    type: 'SACMI',
    status: MachineStatus.RUNNING,
    location: { x: 20, y: 30 },
    zone: 'Zone A - Production Line 1',
    isIot: true,
    runningHours: 12450,
    lastMaintenance: '2023-10-01',
    nextMaintenance: '2023-11-01',
    intervals: ['360 Hours', '1080 Hours', '2160 Hours', '4320 Hours'],
    telemetry: { timestamp: new Date().toISOString(), temperature: 65, vibration: 1.2, pressure: 5.5, powerConsumption: 45 },
    history: Array(5).fill({ timestamp: new Date().toISOString(), temperature: 65, vibration: 1.2, pressure: 5.5, powerConsumption: 45 }),
  },
  {
    id: 'm2',
    name: 'MOSS Printer 03',
    plate: '10321238',
    type: 'MOSS',
    status: MachineStatus.WARNING,
    location: { x: 50, y: 60 },
    zone: 'Zone B - Assembly',
    isIot: true,
    runningHours: 8500,
    lastMaintenance: '2023-09-15',
    nextMaintenance: '2023-10-25',
    intervals: ['150 Hours', '300 Hours', '600 Hours'],
    telemetry: { timestamp: new Date().toISOString(), temperature: 82, vibration: 4.5, pressure: 2.1, powerConsumption: 12 },
    history: Array(5).fill({ timestamp: new Date().toISOString(), temperature: 82, vibration: 4.5, pressure: 2.1, powerConsumption: 12 }),
  },
  {
    id: 'm3',
    name: 'PMV Lining 02',
    plate: '10259010',
    type: 'PMV',
    status: MachineStatus.RUNNING,
    location: { x: 75, y: 25 },
    zone: 'Zone B - Assembly',
    isIot: true,
    runningHours: 3200,
    lastMaintenance: '2023-10-10',
    nextMaintenance: '2023-12-10',
    intervals: ['500 Hours', '1000 Hours'],
    telemetry: { timestamp: new Date().toISOString(), temperature: 45, vibration: 0.5, pressure: 6.0, powerConsumption: 22 },
    history: Array(5).fill({ timestamp: new Date().toISOString(), temperature: 45, vibration: 0.5, pressure: 6.0, powerConsumption: 22 }),
  },
];

const INITIAL_ORDERS: WorkOrder[] = [
  { id: 'WO-101', title: 'Lubrication Pump Fail', machineId: 'm2', status: WorkOrderStatus.IN_PROGRESS, currentStage: WorkOrderStage.EXECUTION, priority: Priority.HIGH, description: 'Vibration detected in main pump assembly.', createdDate: '2023-10-20T08:00:00Z', type: 'CORRECTIVE', formType: 'R-MANT-02' },
  { id: 'WO-102', title: 'Weekly Inspection', machineId: 'm1', status: WorkOrderStatus.BACKLOG, currentStage: WorkOrderStage.REQUESTED, priority: Priority.MEDIUM, description: 'Standard R-MANT-05 checklist.', createdDate: '2023-10-21T09:00:00Z', type: 'PREVENTIVE', formType: 'R-MANT-05' },
  { id: 'WO-103', title: 'Sensor Calibration', machineId: 'm3', status: WorkOrderStatus.DONE, currentStage: WorkOrderStage.CLOSED, priority: Priority.LOW, description: 'Calibrate vision system.', createdDate: '2023-10-18T14:00:00Z', completedDate: '2023-10-19T10:00:00Z', type: 'PREVENTIVE', formType: 'R-MANT-05' },
  { id: 'WO-104', title: 'SACMI 360h Service', machineId: 'm1', status: WorkOrderStatus.BACKLOG, currentStage: WorkOrderStage.REQUESTED, priority: Priority.HIGH, description: 'Routine 360h maintenance according to manual.', createdDate: '2023-10-22T08:00:00Z', type: 'PREVENTIVE', formType: 'R-MANT-02' },
  { id: 'WO-105', title: 'Conveyor Jam L1', machineId: 'm1', status: WorkOrderStatus.IN_PROGRESS, currentStage: WorkOrderStage.EXECUTION, priority: Priority.CRITICAL, description: 'Bottles jamming at exit starwheel.', createdDate: '2023-10-22T10:30:00Z', type: 'CORRECTIVE', formType: 'R-MANT-05' },
];

const INITIAL_PARTS: SparePart[] = [
  { id: 'sp1', sku: 'BRG-6205', name: 'Ball Bearing 6205', currentStock: 4, minimumStock: 5, unitCost: 12.50, supplier: 'SKF', leadTimeDays: 3 },
  { id: 'sp2', sku: 'PLC-CPU', name: 'Siemens S7 CPU', currentStock: 2, minimumStock: 1, unitCost: 850.00, supplier: 'Siemens', leadTimeDays: 14 },
  { id: 'sp3', sku: 'OIL-SYN-50', name: 'Synthetic Oil 50L', currentStock: 12, minimumStock: 2, unitCost: 120.00, supplier: 'Mobil', leadTimeDays: 2 },
];

const INITIAL_TECHNICIANS: Technician[] = [
  { id: 'T-042', name: 'Jorge Perez', role: 'SUPERVISOR', shift: 'MORNING', status: 'ACTIVE', email: 'jorge.perez@coreflow.io' },
  { id: 'T-089', name: 'Sarah Connor', role: 'MECHANICAL', shift: 'NIGHT', status: 'ACTIVE', email: 'sarah.c@coreflow.io' },
  { id: 'T-112', name: 'Mike Ross', role: 'ELECTRICAL', shift: 'AFTERNOON', status: 'LEAVE', email: 'mike.r@coreflow.io' },
  { id: 'T-155', name: 'Luis Diaz', role: 'MECHANICAL', shift: 'MORNING', status: 'ACTIVE', email: 'luis.d@coreflow.io' },
];

const SidebarItem = ({ icon, label, active, onClick, restricted = false }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, restricted?: boolean }) => {
  if (restricted) return null;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left ${active
        ? 'text-white bg-industrial-800 border-r-2 border-industrial-accent'
        : 'text-industrial-500 hover:text-industrial-300 hover:text-industrial-300 hover:bg-industrial-800/50'
        }`}
    >
      <div className="shrink-0">{icon}</div>
      <span className="leading-tight">{label}</span>
    </button>
  );
};

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children?: ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center bg-industrial-900 text-white p-8">
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-2xl w-full">
            <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              System Error
            </h2>
            <p className="text-industrial-300 mb-4">The application encountered a critical error during rendering.</p>
            <pre className="bg-black/50 p-4 rounded text-xs font-mono text-red-200 overflow-auto max-h-64">
              {this.state.error?.toString()}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 bg-industrial-700 hover:bg-industrial-600 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              Reload System
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- APP CONTENT WRAPPER (Inner Component) ---
const CoreFlowApp = () => {
  const { user, isAuthenticated, logout, hasRole } = useAuth();
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [currentPlan, setCurrentPlan] = useState<PlanTier>(PlanTier.BUSINESS);

  // Data State
  const [machines, setMachines] = useState<Machine[]>(INITIAL_MACHINES);
  const [technicians, setTechnicians] = useState<Technician[]>(INITIAL_TECHNICIANS);
  const [parts, setParts] = useState<SparePart[]>(INITIAL_PARTS);
  const [orders, setOrders] = useState<WorkOrder[]>(INITIAL_ORDERS);

  // UI State
  const [isCreatingForm, setIsCreatingForm] = useState(false);
  const [formInitialMachineId, setFormInitialMachineId] = useState<string | undefined>(undefined);
  const [formInitialData, setFormInitialData] = useState<Partial<WorkOrder> | undefined>(undefined);

  // Global Settings State
  const [plantSettings, setPlantSettings] = useState({
    plantName: 'Sede Principal - Rep. Dom.',
    rnc: '131-23456-9',
    timezone: 'AST',
    currency: 'DOP',
    logoUrl: ''
  });

  const { language, setLanguage, t } = useLanguage();

  // Redirect to Login if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  // --- ACTIONS ---
  const handleMoveMachine = (id: string, x: number, y: number) => {
    // RBAC: Only Admins can change Layout
    if (!hasRole([UserRole.ADMIN_SOLICITANTE])) {
      alert("Access Denied: Only Admins can modify plant layout.");
      return;
    }
    setMachines(prev => prev.map(m => m.id === id ? { ...m, location: { x, y } } : m));
  };

  const handleUpdateMachine = (updatedMachine: Machine) => {
    setMachines(prev => prev.map(m => m.id === updatedMachine.id ? updatedMachine : m));
  };

  const handleAddPart = (newPart: SparePart) => {
    setParts(prev => [...prev, newPart]);
  };
  const handleAddTechnician = (newTech: Technician) => {
    setTechnicians(prev => [...prev, newTech]);
  };
  const handleAddMachine = (newMachine: Machine) => {
    setMachines(prev => [...prev, newMachine]);
  };

  // Handle Save / Update Work Order
  const handleSaveOrder = (order: WorkOrder) => {
    setOrders(prev => {
      const exists = prev.some(o => o.id === order.id);
      if (exists) {
        // Update existing
        return prev.map(o => o.id === order.id ? order : o);
      } else {
        // Create new
        return [order, ...prev];
      }
    });
    setIsCreatingForm(false);
    setFormInitialData(undefined);
    setFormInitialMachineId(undefined);
  };

  const handleEditOrder = (order: WorkOrder) => {
    // Set the correct view context based on the order type so the Sidebar highlights correctly
    if (order.formType === 'R-MANT-05') {
      setView(AppView.MANT_05);
    } else {
      setView(AppView.MANT_02);
    }

    setFormInitialData(order);
    setFormInitialMachineId(order.machineId);
    setIsCreatingForm(true);
  };

  const handleCreateWorkOrderFromMap = (machineId: string) => {
    // RBAC: Auditors cannot create work orders
    if (hasRole([UserRole.AUDITOR])) return;

    const machine = machines.find(m => m.id === machineId);
    if (!machine) return;

    setFormInitialMachineId(machineId);
    const isCritical = machine.status === MachineStatus.WARNING || machine.status === MachineStatus.CRITICAL || machine.status === MachineStatus.OFFLINE;

    if (isCritical) {
      setView(AppView.MANT_05);
      setFormInitialData({
        title: `Repair Request: ${machine.name} - ${machine.status}`,
        priority: Priority.HIGH,
        description: `Automatic System Alert: Machine detected in ${machine.status} state. Telemetry: Temp ${machine.telemetry.temperature.toFixed(1)}°C, Vib ${machine.telemetry.vibration.toFixed(2)} mm/s.`,
        type: 'CORRECTIVE'
      });
    } else {
      setView(AppView.MANT_02);
      const suggestedInterval = machine.intervals && machine.intervals.length > 0 ? machine.intervals[0] : '360 Hours';
      setFormInitialData({
        title: `Preventive Maintenance ${suggestedInterval} - ${machine.name}`,
        priority: Priority.MEDIUM,
        interval: suggestedInterval,
        type: 'PREVENTIVE'
      });
    }
    setIsCreatingForm(true);
  };

  // --- MIDDLEWARE LOGIC (Client Side Route Protection) ---
  const renderContent = () => {
    // 1. Creation Mode (Restricted for Auditor)
    if (isCreatingForm) {
      // Auditors can VIEW the form but perhaps in read-only? 
      // For now, let's allow them to enter but the Form component itself handles read-only logic via roles.
      const formType = view === AppView.MANT_05 ? 'R-MANT-05' : 'R-MANT-02';
      return (
        <MaintenanceForm
          type={formType}
          machines={machines}
          technicians={technicians}
          onSave={handleSaveOrder}
          onCancel={() => { setIsCreatingForm(false); setFormInitialMachineId(undefined); setFormInitialData(undefined); }}
          initialMachineId={formInitialMachineId}
          initialData={formInitialData}
        />
      );
    }

    // 2. View Routing based on Role
    switch (view) {
      case AppView.DASHBOARD:
        return <Dashboard machines={machines} onSelectMachine={() => { }} onCreateWorkOrder={handleCreateWorkOrderFromMap} onMoveMachine={handleMoveMachine} />;

      case AppView.KANBAN:
        return <MaintenanceKanban orders={orders} />;

      case AppView.MANT_02: return <MaintenanceList type="R-MANT-02" orders={orders} onCreateNew={() => { setView(AppView.MANT_02); setIsCreatingForm(true); }} onEditOrder={handleEditOrder} />;
      case AppView.MANT_05: return <MaintenanceList type="R-MANT-05" orders={orders} onCreateNew={() => { setView(AppView.MANT_05); setIsCreatingForm(true); }} onEditOrder={handleEditOrder} />;
      case AppView.MACHINE_HOURS: return <MachineHoursLog machines={machines} />;
      case AppView.INVENTORY: return <Inventory parts={parts} onAddPart={handleAddPart} />;

      case AppView.ANALYTICS:
        // Restricted to Admin
        if (!hasRole([UserRole.ADMIN_SOLICITANTE])) {
          return <div className="h-full flex items-center justify-center bg-industrial-900 text-industrial-500 flex-col gap-4"><Shield className="w-12 h-12 text-red-900" /><span>Access Restricted: Analytics requires Admin privileges.</span></div>;
        }
        return <Analytics />;

      case AppView.CONFIGURATION:
        // Restricted to Admin
        if (!hasRole([UserRole.ADMIN_SOLICITANTE])) {
          return <div className="h-full flex items-center justify-center bg-industrial-900 text-industrial-500 flex-col gap-4"><Shield className="w-12 h-12 text-red-900" /><span>Access Restricted: Master Data requires Admin privileges.</span></div>;
        }
        return <Configuration
          machines={machines}
          technicians={technicians}
          onAddTechnician={handleAddTechnician}
          onAddMachine={handleAddMachine}
          onUpdateMachine={handleUpdateMachine}
          settings={plantSettings}
          onUpdateSettings={setPlantSettings}
        />;

      case AppView.PROFILE:
        return user ? <UserProfileView user={user} /> : <div>Error</div>;

      default: return <Dashboard machines={machines} onSelectMachine={() => { }} onCreateWorkOrder={handleCreateWorkOrderFromMap} onMoveMachine={handleMoveMachine} />;
    }
  };

  return (
    <div className="flex h-screen bg-industrial-900 text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-industrial-900 border-r border-industrial-800 flex flex-col">
        <div className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-500/30 overflow-hidden">
              {plantSettings.logoUrl ? (
                <img src={plantSettings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Hexagon size={24} className="text-white" strokeWidth={2.5} />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight leading-none">CoreFlow</h1>
              <p className="text-[10px] text-blue-400 font-medium tracking-wider uppercase">Maintenance Cloud</p>
            </div>
          </div>
          <p className="text-xs text-industrial-500 mt-1">Secured Instance</p>
        </div>

        <nav className="flex-1 space-y-1 mt-4">
          <SidebarItem
            active={view === AppView.DASHBOARD}
            onClick={() => { setView(AppView.DASHBOARD); setIsCreatingForm(false); }}
            label={t('sidebar.visualPlant')}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
          />
          <SidebarItem
            active={view === AppView.KANBAN}
            onClick={() => { setView(AppView.KANBAN); setIsCreatingForm(false); }}
            label={t('sidebar.maintenanceCanvas')}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
          />
          <div className="my-2 border-t border-industrial-800 mx-4"></div>

          <SidebarItem
            active={view === AppView.MANT_02}
            onClick={() => { setView(AppView.MANT_02); setIsCreatingForm(false); }}
            label={t('sidebar.rmant02')}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          />
          <SidebarItem
            active={view === AppView.MANT_05}
            onClick={() => { setView(AppView.MANT_05); setIsCreatingForm(false); }}
            label={t('sidebar.rmant05')}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
          />
          <SidebarItem
            active={view === AppView.MACHINE_HOURS}
            onClick={() => { setView(AppView.MACHINE_HOURS); setIsCreatingForm(false); }}
            label={t('sidebar.hours')}
            icon={<Clock className="w-5 h-5" />}
          />

          <div className="my-2 border-t border-industrial-800 mx-4"></div>

          {/* ADMIN ONLY MENUS */}
          <SidebarItem
            active={view === AppView.ANALYTICS}
            restricted={!hasRole([UserRole.ADMIN_SOLICITANTE])}
            onClick={() => { setView(AppView.ANALYTICS); setIsCreatingForm(false); }}
            label={t('sidebar.biAnalytics')}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          />

          <SidebarItem
            active={view === AppView.INVENTORY}
            onClick={() => { setView(AppView.INVENTORY); setIsCreatingForm(false); }}
            label={t('sidebar.kardex')}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
          />

          {/* ADMIN ONLY MENUS */}
          <div className="pt-4 mt-4 border-t border-industrial-800">
            <SidebarItem
              active={view === AppView.CONFIGURATION}
              restricted={!hasRole([UserRole.ADMIN_SOLICITANTE])}
              onClick={() => { setView(AppView.CONFIGURATION); setIsCreatingForm(false); }}
              label={t('sidebar.masterData')}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            />
          </div>
        </nav>

        <div className="p-4 border-t border-industrial-800 bg-industrial-900/50">
          <div className="flex items-center gap-3 mb-3 cursor-pointer hover:bg-industrial-800 rounded p-1 transition-colors" onClick={() => setView(AppView.PROFILE)}>
            <div className="w-8 h-8 rounded-full bg-industrial-700 flex items-center justify-center font-bold text-xs text-white border border-industrial-600">
              {user?.full_name.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate w-32">{user?.full_name}</p>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${user?.role === 'ADMIN_SOLICITANTE' ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                <p className="text-[10px] text-industrial-400 uppercase tracking-wider">{user?.role.replace('_', ' ')}</p>
              </div>
            </div>
            <div className="ml-auto text-industrial-500">
              <User size={14} />
            </div>
          </div>
          <div className="flex items-center justify-end">
            <button onClick={logout} className="text-industrial-500 hover:text-red-400 flex items-center gap-1 text-xs" title="Sign Out">
              <LogOut size={12} /> Sign Out
            </button>
          </div>

          <div className="flex bg-industrial-800 rounded p-1 mt-3">
            <button onClick={() => setLanguage('es')} className={`flex-1 text-xs py-1 rounded transition-colors ${language === 'es' ? 'bg-industrial-600 text-white shadow' : 'text-industrial-500 hover:text-white'}`}>ES</button>
            <button onClick={() => setLanguage('en')} className={`flex-1 text-xs py-1 rounded transition-colors ${language === 'en' ? 'bg-industrial-600 text-white shadow' : 'text-industrial-500 hover:text-white'}`}>EN</button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        <ErrorBoundary>
          {renderContent()}
        </ErrorBoundary>
      </main>
    </div>
  );
};

// --- MAIN EXPORT (Provider Wrapper) ---
export default function App() {
  return (
    <AuthProvider>
      <CoreFlowApp />
    </AuthProvider>
  );
}