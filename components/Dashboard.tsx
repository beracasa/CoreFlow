import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMasterStore } from '../src/stores/useMasterStore';
import { PlantMapContainer } from './visual-plant/PlantMapContainer';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, Machine, MachineStatus } from '../types';
import { MachineModal } from './modals/MachineModal';

export const Dashboard: React.FC = () => {
  const { machines, updateMachine, addMachine, zones, updateZone } = useMasterStore();
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  // Machine Creation State
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [initialMachineData, setInitialMachineData] = useState<Partial<Machine>>({});

  const handleMoveMachine = (id: string, x: number, y: number) => {
    // RBAC: Only Admins can change Layout
    if (!hasRole([UserRole.ADMIN_SOLICITANTE])) {
      alert("Access Denied: Only Admins can modify plant layout.");
      return;
    }
    const machine = machines.find(m => m.id === id);
    if (machine) {
      updateMachine({ ...machine, location: { x, y } });
    }
  };

  const handleCreateWorkOrder = (machineId: string) => {
    if (hasRole([UserRole.AUDITOR])) return;
    navigate('/orders/new', { state: { machineId } });
  };

  const handleOpenAddMachineInfo = (zoneId: string, lineName: string) => {
    const zone = zones.find(z => z.id === zoneId);
    const zoneName = zone ? zone.name : '';
    const fullLocation = lineName ? `${zoneName} - ${lineName}` : zoneName;

    setInitialMachineData({
      zone: fullLocation,
      // Calculate a default X/Y relative to the zone
      // The zone has x,y (absolute %).
      // We want the machine to be inside the zone.
      location: {
        x: (zone?.x || 0) + 2,
        y: (zone?.y || 0) + 10
      }
    });
    setIsMachineModalOpen(true);
  };

  const handleSaveMachine = (machine: Partial<Machine>) => {
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
      nextMaintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      telemetry: { timestamp: new Date().toISOString(), temperature: 0, vibration: 0, pressure: 0, powerConsumption: 0 },
      history: [],
      intervals: [],
      ...machine
    } as Machine;

    addMachine(newMachine);
    setIsMachineModalOpen(false);
  };

  return (
    <div className="h-full w-full bg-industrial-900">
      <PlantMapContainer
        machines={machines}
        zones={zones}
        onCreateWorkOrder={handleCreateWorkOrder}
        onMoveMachine={handleMoveMachine}
        onUpdateZone={updateZone}
        onAddMachine={handleOpenAddMachineInfo}
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