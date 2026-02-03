import React, { useEffect, useState } from 'react';
import { InventoryMockService } from '../../services/implementations/inventoryMock';
import { PartsRequest } from '../../types/inventory';
import { FileText, AlertCircle, CheckCircle, Clock, ChevronRight } from 'lucide-react';

const service = new InventoryMockService();

interface RequestListProps {
    onSelectRequest: (request: PartsRequest) => void;
}

export const RequestList: React.FC<RequestListProps> = ({ onSelectRequest }) => {
    const [requests, setRequests] = useState<PartsRequest[]>([]);

    useEffect(() => {
        service.getAllRequests().then(setRequests);
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN': return 'text-blue-400 bg-blue-900/30 border-blue-800';
            case 'PENDING_STOCK': return 'text-yellow-400 bg-yellow-900/30 border-yellow-800';
            case 'PARTIAL': return 'text-orange-400 bg-orange-900/30 border-orange-800';
            case 'CLOSED': return 'text-emerald-400 bg-emerald-900/30 border-emerald-800';
            default: return 'text-gray-400 bg-gray-800 border-gray-700';
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'EMERGENCY': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'HIGH': return <AlertCircle className="w-4 h-4 text-orange-500" />;
            default: return <Clock className="w-4 h-4 text-blue-500" />;
        }
    };

    return (
        <div className="bg-industrial-800 rounded-lg shadow-xl border border-industrial-700 overflow-hidden">
            <div className="p-4 border-b border-industrial-700 bg-industrial-900/50">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-industrial-400" />
                    Solicitudes de Repuestos
                </h2>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-industrial-900 text-industrial-400 text-xs uppercase font-semibold">
                        <tr>
                            <th className="px-6 py-4">N° Solicitud</th>
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4">Técnico</th>
                            <th className="px-6 py-4">Prioridad</th>
                            <th className="px-6 py-4">Estado</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-industrial-700">
                        {requests.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-industrial-500">
                                    No hay solicitudes registradas.
                                </td>
                            </tr>
                        ) : (
                            requests.map((req) => (
                                <tr
                                    key={req.id}
                                    className="hover:bg-industrial-700/30 transition-colors cursor-pointer group"
                                    onClick={() => onSelectRequest(req)}
                                >
                                    <td className="px-6 py-4 text-white font-mono font-medium">{req.requestNumber}</td>
                                    <td className="px-6 py-4 text-industrial-300 text-sm">
                                        {new Date(req.createdDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-white">{req.technicianId}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-industrial-300">
                                            {getPriorityIcon(req.priority)}
                                            {req.priority}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(req.status)}`}>
                                            {req.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <ChevronRight className="w-5 h-5 text-industrial-500 group-hover:text-white transition-colors" />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
