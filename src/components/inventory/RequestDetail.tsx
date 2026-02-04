import React from 'react';
import { InventoryMockService } from '../../services/implementations/inventoryMock';
import { PartsRequest, SparePart } from '../../types/inventory';
import { Package, Calendar, User, Clock, ArrowLeft, CheckCircle, Truck, XCircle, Save, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PartRequestForm } from './PartRequestForm';

const service = new InventoryMockService();

interface RequestDetailProps {
    request: PartsRequest;
    parts: SparePart[]; // Need parts to resolve names
    onBack: () => void;
}

export const RequestDetail: React.FC<RequestDetailProps> = ({ request, parts, onBack }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [deliveryQuantities, setDeliveryQuantities] = useState<Record<string, number>>({});
    const [localRequest, setLocalRequest] = useState(request);

    const handleStartProcessing = () => {
        const initialQuantities: Record<string, number> = {};
        localRequest.items.forEach(item => {
            // Default to remaining quantity
            initialQuantities[item.partId] = Math.max(0, item.quantityRequested - item.quantityDelivered);
        });
        setDeliveryQuantities(initialQuantities);
        setIsProcessing(true);
    };

    const handleQuantityChange = (partId: string, value: number) => {
        setDeliveryQuantities(prev => ({
            ...prev,
            [partId]: value
        }));
    };

    const handleConfirmDelivery = async () => {
        try {
            const itemsToDeliver = Object.entries(deliveryQuantities).map(([partId, quantity]) => ({
                partId,
                quantity
            }));

            const updatedRequest = await service.deliverParts(localRequest.id, itemsToDeliver);
            setLocalRequest(updatedRequest);
            setIsProcessing(false);
        } catch (error) {
            console.error('Error delivering parts:', error);
            alert('Error al procesar la entrega. Verifique el stock.');
        }
    };

    const handleCloseRequest = async () => {
        if (!confirm('¿Está seguro de cerrar esta solicitud?')) return;
        try {
            const updatedRequest = await service.closeRequest(localRequest.id);
            setLocalRequest(updatedRequest);
        } catch (error) {
            console.error('Error closing request:', error);
        }
    };

    const handleDeleteRequest = async () => {
        if (!confirm('¿Está seguro de eliminar esta solicitud permanentemente?')) return;
        try {
            await service.deleteRequest(localRequest.id);
            onBack();
        } catch (error) {
            console.error('Error deleting request:', error);
            alert('Error al eliminar la solicitud.');
        }
    };

    const handleEditSuccess = () => {
        // Reload request data
        service.getAllRequests().then(requests => {
            const updated = requests.find(r => r.id === localRequest.id);
            if (updated) {
                setLocalRequest(updated);
                setIsEditing(false);
            }
        });
    };

    const getPartName = (partId: string) => {
        return parts.find(p => p.id === partId)?.name || partId;
    };

    const getPartNumber = (partId: string) => {
        return parts.find(p => p.id === partId)?.partNumber || '';
    };

    if (isEditing) {
        return (
            <div className="h-full">
                <PartRequestForm
                    initialData={localRequest}
                    onCancel={() => setIsEditing(false)}
                    onSuccess={handleEditSuccess}
                />
            </div>
        );
    }

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
                        {localRequest.requestNumber}
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${localRequest.status === 'OPEN' ? 'bg-blue-900/30 text-blue-400 border-blue-800' :
                            localRequest.status === 'PENDING_STOCK' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' :
                                localRequest.status === 'PARTIAL' ? 'bg-orange-900/30 text-orange-400 border-orange-800' :
                                    localRequest.status === 'CLOSED' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' :
                                        'bg-gray-800 text-gray-400'
                            }`}>
                            {localRequest.status === 'PARTIAL' ? 'Entrega Parcial' :
                                localRequest.status === 'PENDING_STOCK' ? 'Stock Pendiente' :
                                    localRequest.status === 'CLOSED' ? 'Cerrado' : 'Abierto'}
                        </span>
                    </h2>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    {!isProcessing && !isEditing && localRequest.status !== 'CLOSED' && (
                        <>
                            {(localRequest.status === 'OPEN' || localRequest.status === 'PENDING_STOCK' || localRequest.status === 'PARTIAL') && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center px-4 py-2 bg-industrial-800 border border-industrial-600 hover:bg-industrial-700 text-white rounded-lg font-bold text-sm transition-colors"
                                >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar
                                </button>
                            )}

                            <button
                                onClick={handleStartProcessing}
                                className="flex items-center px-4 py-2 bg-industrial-accent hover:bg-blue-600 text-white rounded-lg font-bold text-sm transition-colors shadow-lg"
                            >
                                <Truck className="w-4 h-4 mr-2" />
                                Procesar Entrega
                            </button>
                            <button
                                onClick={handleCloseRequest}
                                className="flex items-center px-4 py-2 bg-industrial-800 border border-industrial-600 hover:bg-red-900/50 hover:border-red-700 text-industrial-300 hover:text-red-400 rounded-lg font-bold text-sm transition-all"
                            >
                                <XCircle className="w-4 h-4 mr-2" />
                                Cerrar Solicitud
                            </button>
                        </>
                    )}
                    {!isProcessing && !isEditing && (
                        <button
                            onClick={handleDeleteRequest}
                            className="flex items-center px-4 py-2 bg-red-900/30 border border-red-800 hover:bg-red-900/50 text-red-400 rounded-lg font-bold text-sm transition-all"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                        </button>
                    )}

                    {isProcessing && (
                        <>
                            <button
                                onClick={handleConfirmDelivery}
                                className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors shadow-lg"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Confirmar Entrega
                            </button>
                            <button
                                onClick={() => setIsProcessing(false)}
                                className="flex items-center px-4 py-2 bg-industrial-800 border border-industrial-600 hover:bg-industrial-700 text-white rounded-lg font-bold text-sm transition-colors"
                            >
                                Cancelar
                            </button>
                        </>
                    )}
                </div>
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
                                    <p className="font-medium text-white">{new Date(localRequest.createdDate).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-industrial-300">
                                <User className="w-4 h-4 text-industrial-500" />
                                <div className="flex-1">
                                    <p className="text-xs text-industrial-500">Solicitante</p>
                                    <p className="font-medium text-white truncate" title={localRequest.technicianId}>{localRequest.technicianId}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-industrial-300">
                                <Clock className="w-4 h-4 text-industrial-500" />
                                <div>
                                    <p className="text-xs text-industrial-500">Prioridad</p>
                                    <p className={`font-medium ${localRequest.priority === 'EMERGENCY' ? 'text-red-400' : 'text-white'}`}>
                                        {localRequest.priority === 'EMERGENCY' ? 'Urgente' :
                                            localRequest.priority === 'HIGH' ? 'Alta' : 'Normal'}
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
                                    {isProcessing && <th className="px-6 py-3 text-center w-32">A Entregar</th>}
                                    <th className="px-6 py-3 text-right">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-industrial-700">
                                {localRequest.items.map((item, idx) => {
                                    const part = parts.find(p => p.id === item.partId);
                                    const isFullyDelivered = item.quantityDelivered >= item.quantityRequested;

                                    return (
                                        <tr key={idx} className="hover:bg-industrial-800/50">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-white font-medium">{part?.name || item.partId}</p>
                                                    <p className="text-industrial-500 text-xs font-mono">{part?.partNumber}</p>
                                                    {item.usageLocation && (
                                                        <p className="text-industrial-400 text-xs mt-1">Uso: {item.usageLocation}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center text-white font-mono">
                                                {item.quantityRequested}
                                            </td>
                                            <td className="px-6 py-4 text-center text-industrial-300 font-mono">
                                                {item.quantityDelivered}
                                            </td>
                                            {isProcessing && (
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={part ? part.currentStock : 0}
                                                        className="w-full bg-industrial-900 border border-industrial-600 rounded px-2 py-1 text-white text-center font-mono outline-none focus:ring-1 focus:ring-industrial-accent"
                                                        value={deliveryQuantities[item.partId] || 0}
                                                        onChange={(e) => handleQuantityChange(item.partId, parseInt(e.target.value) || 0)}
                                                    />
                                                    {part && part.currentStock < (deliveryQuantities[item.partId] || 0) && (
                                                        <p className="text-xs text-red-500 mt-1">Stock insuficiente ({part.currentStock})</p>
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-right">
                                                {isFullyDelivered ? (
                                                    <span className="inline-flex items-center text-emerald-400 text-xs font-bold">
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        Completado
                                                    </span>
                                                ) : (
                                                    <span className="text-yellow-400 text-xs font-bold">
                                                        {item.quantityDelivered > 0 ? 'Parcial' : 'Pendiente'}
                                                    </span>
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
