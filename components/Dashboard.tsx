import React from 'react';
import { Machine } from '../types';
import { PlantMapContainer } from './visual-plant/PlantMapContainer';

interface DashboardProps {
  machines: Machine[];
  onSelectMachine: (machine: Machine) => void;
  onCreateWorkOrder: (machineId: string) => void;
  onMoveMachine?: (id: string, x: number, y: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ machines, onCreateWorkOrder, onMoveMachine }) => {
  return (
    <div className="h-full w-full bg-industrial-900">
      <PlantMapContainer 
        machines={machines} 
        onCreateWorkOrder={onCreateWorkOrder} 
        onMoveMachine={onMoveMachine}
      />
    </div>
  );
};