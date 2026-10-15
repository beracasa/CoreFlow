import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useMasterStore } from '../src/stores/useMasterStore';
import { PlantMapContainer } from './visual-plant/PlantMapContainer';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, Machine, MachineStatus, ZoneStructure } from '../types';
import { MachineModal } from './modals/MachineModal';

export const Dashboard: React.FC = () => {
  const { machines, updateMachine, addMachine, removeMachine, zones, updateZone, addZone, removeZone } = useMasterStore();
  const { hasRole, hasPermission } = useAuth();
  const navigate = useNavigate();

  // Permissions for Visual Plant & Map
  const canEditMap = hasPermission('edit_dashboard_map') || hasRole([UserRole.ADMIN_SOLICITANTE]);
  const canViewMap = hasPermission('view_dashboard') || canEditMap;

  // Machine Creation State
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [initialMachineData, setInitialMachineData] = useState<Partial<Machine>>({});

  const handleMoveMachine = (id: string, x: number, y: number) => {
    if (!canEditMap) {
      alert("Acceso denegado: Se requiere el permiso de Editar Planta Visual y Mapa.");
      return;
    }
    const machine = machines.find(m => m.id === id);
    if (machine) {
      updateMachine({ ...machine, location: { x, y } });
    }
  };

  const handleUpdateZone = (updatedZone: ZoneStructure) => {
    if (!canEditMap) {
      alert("Acceso denegado: Se requiere el permiso de Editar Planta Visual y Mapa.");
      return;
    }
    updateZone(updatedZone);
  };

  const handleAddZone = async (newZone: ZoneStructure) => {
    if (!canEditMap) {
      alert("Acceso denegado: Se requiere el permiso de Editar Planta Visual y Mapa.");
      return;
    }
    await addZone(newZone);
  };

  const handleRemoveZone = async (id: string) => {
    if (!canEditMap) {
      alert("Acceso denegado: Se requiere el permiso de Editar Planta Visual y Mapa.");
      return;
    }
    await removeZone(id);
  };

  const handleRemoveMachine = async (id: string) => {
    if (!canEditMap) {
      alert("Acceso denegado: Se requiere el permiso de Editar Planta Visual y Mapa.");
      return;
    }
    await removeMachine(id);
  };

  const handleCreateWorkOrder = (machineId: string) => {
    if (!hasPermission('create_wo')) {
      alert("Acceso denegado: Se requiere el permiso de Crear Órdenes de Mantenimiento.");
      return;
    }
    navigate('/orders/new', { state: { machineId } });
  };

  const handleOpenAddMachineInfo = (zoneId?: string, lineName?: string) => {
    if (!canEditMap) {
      alert("Acceso denegado: Se requiere el permiso de Editar Planta Visual y Mapa.");
      return;
    }
    const zone = zones.find(z => z.id === zoneId);
    const zoneName = zone ? zone.name : '';
    const fullLocation = lineName ? `${zoneName} - ${lineName}` : zoneName;

    setInitialMachineData({
      zone: fullLocation,
      location: {
        x: (zone?.x || 0) + 2,
        y: (zone?.y || 0) + 10
      }
    });
    setIsMachineModalOpen(true);
  };

  const handleSaveMachine = async (machine: Partial<Machine>) => {
    if (!canEditMap) {
      alert("Acceso denegado: Se requiere el permiso de Editar Planta Visual y Mapa.");
      return;
    }
    const newMachine: Machine = {
      id: `m-${Date.now()}`,
      name: machine.name || 'New Machine',
      status: machine.status || MachineStatus.IDLE,
      type: machine.type as any || 'GENERIC',
      brand: machine.brand || '',
      model: machine.model || '',
      plate: machine.plate || '',
      location: machine.location || { x: 50, y: 50 },
      zone: machine.zone || 'Unassigned',
      isIot: false, // Default for manual add
      runningHours: 0,
      lastMaintenance: new Date().toISOString(),
      nextMaintenance: '',
      telemetry: { timestamp: new Date().toISOString(), temperature: 0, vibration: 0, pressure: 0, powerConsumption: 0 },
      history: [],
      intervals: [],
      ...machine
    } as Machine;

    await addMachine(newMachine);
    setIsMachineModalOpen(false);
  };

  if (!canViewMap) {
    return (
      <div className="h-full flex items-center justify-center bg-industrial-900 text-industrial-500 flex-col gap-4">
        <Shield className="w-12 h-12 text-red-500/60" />
        <span className="text-lg font-medium text-industrial-300">
          Acceso Restringido: Se requiere el permiso de Ver Planta Visual y Mapa.
        </span>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-industrial-900">
      <PlantMapContainer
        machines={machines}
        zones={zones}
        onCreateWorkOrder={handleCreateWorkOrder}
        onMoveMachine={handleMoveMachine}
        onUpdateZone={handleUpdateZone}
        onAddMachine={handleOpenAddMachineInfo}
        onAddZone={handleAddZone}
        onRemoveZone={handleRemoveZone}
        onRemoveMachine={handleRemoveMachine}
      />

      <MachineModal
        isOpen={isMachineModalOpen}
        onClose={() => setIsMachineModalOpen(false)}
        onSave={handleSaveMachine}
        initialData={initialMachineData}
      />
    </div>
  );
};