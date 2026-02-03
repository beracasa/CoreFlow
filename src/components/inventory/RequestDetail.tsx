import React from 'react';
import { InventoryMockService } from '../../services/implementations/inventoryMock';
import { PartsRequest, SparePart } from '../../types/inventory';
import { Package, Calendar, User, Clock, ArrowLeft, CheckCircle } from 'lucide-react';

const service = new InventoryMockService();

interface RequestDetailProps {
    request: PartsRequest;
    parts: SparePart[]; // Need parts to resolve names
    onBack: () => void;
}

export const RequestDetail: React.FC<RequestDetailProps> = ({ request, parts, onBack }) => {

    const getPartName = (partId: string) => {
        return parts.find(p => p.id === partId)?.name || partId;
    };

    const getPartNumber = (partId: string) => {
        return parts.find(p => p.id === partId)?.partNumber || '';
    };

    return (
        <div className="bg-industrial-800 rounded-lg shadow-xl border border-industrial-700 h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-industrial-700 flex justify-between items-start bg-industrial-900/50">
                <div>
                    <button
                        onClick={onBack}
                        className="flex items-center text-industrial-400 hover:text-white mb-4 transition-colors text-sm font-medium"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Volver a la lista
                    </button>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        {request.requestNumber}
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${request.status === 'OPEN' ? 'bg-blue-900/30 text-blue-400 border-blue-800' :
                                request.status === 'PENDING_STOCK' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' :
                                    request.status === 'CLOSED' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' :
                                        'bg-gray-800 text-gray-400'
                            }`}>
                            {request.status.replace('_', ' ')}
                        </span>
                    </h2>
                </div>
                {/* Actions could go here */}
            </div>

            {/* Content */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Info Cards */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-industrial-900/50 p-4 rounded-lg border border-industrial-700">
                        <h3 className="text-xs font-bold text-industrial-500 uppercase tracking-wider mb-4">Información General</h3>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-industrial-300">
                                <Calendar className="w-4 h-4 text-industrial-500" />
                                <div>
                                    <p className="text-xs text-industrial-500">Fecha Creación</p>
                                    <p className="font-medium text-white">{new Date(request.createdDate).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-industrial-300">
                                <User className="w-4 h-4 text-industrial-500" />
                                <div>
                                    <p className="text-xs text-industrial-500">Solicitante</p>
                                    <p className="font-medium text-white">{request.technicianId}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-industrial-300">
                                <Clock className="w-4 h-4 text-industrial-500" />
                                <div>
                                    <p className="text-xs text-industrial-500">Prioridad</p>
                                    <p className={`font-medium ${request.priority === 'EMERGENCY' ? 'text-red-400' : 'text-white'}`}>
                                        {request.priority}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items List */}
                <div className="lg:col-span-2">
                    <div className="bg-industrial-900/50 rounded-lg border border-industrial-700 overflow-hidden">
                        <div className="p-4 border-b border-industrial-700">
                            <h3 className="text-xs font-bold text-industrial-500 uppercase tracking-wider">Items Solicitados</h3>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-industrial-900 text-industrial-400 text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-3">Repuesto</th>
                                    <th className="px-6 py-3 text-center">Solicitado</th>
                                    <th className="px-6 py-3 text-center">Entregado</th>
                                    <th className="px-6 py-3 text-right">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-industrial-700">
                                {request.items.map((item, idx) => {
                                    const part = parts.find(p => p.id === item.partId);
                                    const isFullyDelivered = item.quantityDelivered >= item.quantityRequested;

                                    return (
                                        <tr key={idx} className="hover:bg-industrial-800/50">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-white font-medium">{part?.name || item.partId}</p>
                                                    <p className="text-industrial-500 text-xs font-mono">{part?.partNumber}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center text-white font-mono">
                                                {item.quantityRequested}
                                            </td>
                                            <td className="px-6 py-4 text-center text-industrial-300 font-mono">
                                                {item.quantityDelivered}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {isFullyDelivered ? (
                                                    <span className="inline-flex items-center text-emerald-400 text-xs font-bold">
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        Completado
                                                    </span>
                                                ) : (
                                                    <span className="text-yellow-400 text-xs font-bold">Pendiente</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
