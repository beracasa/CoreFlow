import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMasterStore } from '../src/stores/useMasterStore'; // App structure is messy, check path
// Dashboard is in /components/Dashboard.tsx. Root is ..
// Stores are in /src/stores. So path is ../src/stores/useMasterStore
import { PlantMapContainer } from './visual-plant/PlantMapContainer';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

export const Dashboard: React.FC = () => {
  const { machines, updateMachine } = useMasterStore();
  const { hasRole } = useAuth();
  const navigate = useNavigate();

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
    // Navigate to order creation, passing machineId in state or query param
    // RBAC check can be done here or in the route
    if (hasRole([UserRole.AUDITOR])) return;
    navigate('/orders/new', { state: { machineId } });
  };

  return (
    <div className="h-full w-full bg-industrial-900">
      <PlantMapContainer
        machines={machines}
        onCreateWorkOrder={handleCreateWorkOrder}
        onMoveMachine={handleMoveMachine}
      />
    </div>
  );
};