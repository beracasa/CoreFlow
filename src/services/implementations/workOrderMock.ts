import { WorkOrder, WorkOrderStatus, WorkOrderStage, Priority } from '../../../types';
import { IWorkOrderService } from '../workOrderService';
import { saveToStorage, loadFromStorage } from '../../utils/persistence';

const INITIAL_ORDERS: WorkOrder[] = [
    { id: 'WO-101', title: 'Lubrication Pump Fail', machineId: 'm2', status: WorkOrderStatus.IN_PROGRESS, currentStage: WorkOrderStage.EXECUTION, priority: Priority.HIGH, description: 'Vibration detected in main pump assembly.', createdDate: '2023-10-20T08:00:00Z', type: 'CORRECTIVE', formType: 'R-MANT-02' },
    { id: 'WO-102', title: 'Weekly Inspection', machineId: 'm1', status: WorkOrderStatus.BACKLOG, currentStage: WorkOrderStage.REQUESTED, priority: Priority.MEDIUM, description: 'Standard R-MANT-05 checklist.', createdDate: '2023-10-21T09:00:00Z', type: 'PREVENTIVE', formType: 'R-MANT-05' },
    { id: 'WO-103', title: 'Sensor Calibration', machineId: 'm3', status: WorkOrderStatus.DONE, currentStage: WorkOrderStage.CLOSED, priority: Priority.LOW, description: 'Calibrate vision system.', createdDate: '2023-10-18T14:00:00Z', completedDate: '2023-10-19T10:00:00Z', type: 'PREVENTIVE', formType: 'R-MANT-05' },
    { id: 'WO-104', title: 'SACMI 360h Service', machineId: 'm1', status: WorkOrderStatus.BACKLOG, currentStage: WorkOrderStage.REQUESTED, priority: Priority.HIGH, description: 'Routine 360h maintenance according to manual.', createdDate: '2023-10-22T08:00:00Z', type: 'PREVENTIVE', formType: 'R-MANT-02' },
    { id: 'WO-105', title: 'Conveyor Jam L1', machineId: 'm1', status: WorkOrderStatus.IN_PROGRESS, currentStage: WorkOrderStage.EXECUTION, priority: Priority.CRITICAL, description: 'Bottles jamming at exit starwheel.', createdDate: '2023-10-22T10:30:00Z', type: 'CORRECTIVE', formType: 'R-MANT-05' },
];

const STORAGE_KEY = 'v2_cmms_work_orders';
const SIMULATED_DELAY = 800;

export class WorkOrderMockService implements IWorkOrderService {

    private async delay() {
        return new Promise(resolve => setTimeout(resolve, SIMULATED_DELAY));
    }

    private getFromStorage(): WorkOrder[] {
        return loadFromStorage(STORAGE_KEY, INITIAL_ORDERS);
    }

    private saveToStorage(data: WorkOrder[]) {
        saveToStorage(STORAGE_KEY, data);
    }

    async getAll(): Promise<WorkOrder[]> {
        await this.delay();
        return this.getFromStorage();
    }

    async getById(id: string): Promise<WorkOrder | null> {
        await this.delay();
        const orders = this.getFromStorage();
        return orders.find(o => o.id === id) || null;
    }

    async create(orderData: Omit<WorkOrder, 'id'>): Promise<WorkOrder> {
        await this.delay();
        const orders = this.getFromStorage();

        const newOrder: WorkOrder = {
            ...orderData,
            id: `WO-${Date.now()}`, // Simple unique ID
            createdDate: new Date().toISOString()
        } as WorkOrder;

        orders.unshift(newOrder); // Add to beginning
        this.saveToStorage(orders);
        return newOrder;
    }

    async update(id: string, updates: Partial<WorkOrder>): Promise<void> {
        await this.delay();
        const orders = this.getFromStorage();
        const index = orders.findIndex(o => o.id === id);

        if (index !== -1) {
            orders[index] = {
                ...orders[index],
                ...updates
            };
            this.saveToStorage(orders);
        } else {
            console.error(`Order with ID ${id} not found in mock storage`);
        }
    }
}
