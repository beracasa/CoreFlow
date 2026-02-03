import React, { useState, useEffect } from 'react';
import { InventoryMockService } from '../../services/implementations/inventoryMock';
import { SparePart, RequestPriority } from '../../types/inventory';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';

const service = new InventoryMockService();

export const PartRequestForm: React.FC = () => {
    const [parts, setParts] = useState<SparePart[]>([]);
    const [technicianId, setTechnicianId] = useState('');
    const [priority, setPriority] = useState<RequestPriority>('NORMAL');

    // Form Item State
    const [selectedPartId, setSelectedPartId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [requestItems, setRequestItems] = useState<{ partId: string; quantity: number; partName: string }[]>([]);

    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        service.getAllParts().then(setParts);
    }, []);

    const selectedPart = parts.find(p => p.id === selectedPartId);
    const isStockInsufficient = selectedPart && quantity > selectedPart.currentStock;

    const addItem = () => {
        if (!selectedPart) return;

        setRequestItems(prev => [
            ...prev,
            { partId: selectedPart.id, quantity: quantity, partName: selectedPart.name }
        ]);

        // Reset item fields
        setSelectedPartId('');
        setQuantity(1);
    };

    const removeItem = (index: number) => {
        const newItems = [...requestItems];
        newItems.splice(index, 1);
        setRequestItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await service.createRequest({
                technicianId,
                priority,
                items: requestItems.map(i => ({ partId: i.partId, quantity: i.quantity }))
            });
            setFeedback({ type: 'success', message: 'Solicitud creada exitosamente.' });
            // Reset form
            setRequestItems([]);
            setTechnicianId('');
            setPriority('NORMAL');
        } catch (error) {
            console.error(error);
            setFeedback({ type: 'error', message: 'Error al crear la solicitud.' });
        }
    };

    return (
        <div className="bg-industrial-800 rounded-lg shadow-xl border border-industrial-700 p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="p-1 bg-industrial-900 rounded border border-industrial-600">
                    <Plus className="w-5 h-5 text-industrial-accent" />
                </span>
                Nueva Solicitud de Repuestos
            </h2>

            {feedback && (
                <div className={`mb-6 p-4 rounded-lg flex items-center border ${feedback.type === 'success' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>
                    <span className="text-sm font-medium">{feedback.message}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-2">Técnico Solicitante (ID)</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-industrial-900 border border-industrial-600 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-industrial-accent transition-colors placeholder-industrial-600"
                            placeholder="Ingrese ID del técnico"
                            value={technicianId}
                            onChange={e => setTechnicianId(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-2">Prioridad</label>
                        <select
                            className="w-full bg-industrial-900 border border-industrial-600 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-industrial-accent transition-colors appearance-none cursor-pointer"
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as RequestPriority)}
                        >
                            <option value="NORMAL">Normal</option>
                            <option value="HIGH">Alta</option>
                            <option value="EMERGENCY">Emergencia</option>
                        </select>
                    </div>
                </div>

                <div className="border-t border-industrial-700 py-6">
                    <h3 className="text-lg font-bold text-white mb-4">Agregar Repuestos</h3>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-6">
                            <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-2">Repuesto</label>
                            <select
                                className="w-full bg-industrial-900 border border-industrial-600 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-industrial-accent transition-colors appearance-none cursor-pointer"
                                value={selectedPartId}
                                onChange={e => setSelectedPartId(e.target.value)}
                            >
                                <option value="">Seleccionar Repuesto...</option>
                                {parts.map(p => (
                                    <option key={p.id} value={p.id}>{p.partNumber} - {p.name}</option>
                                ))}
                            </select>
                            {selectedPart && (
                                <p className="mt-2 text-sm text-industrial-400">
                                    Stock Disponible: <span className="font-bold text-white ml-1">{selectedPart.currentStock} {selectedPart.unitOfMeasure}</span>
                                </p>
                            )}
                        </div>

                        <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-2">Cantidad</label>
                            <input
                                type="number"
                                min="1"
                                className="w-full bg-industrial-900 border border-industrial-600 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-industrial-accent transition-colors font-mono"
                                value={quantity}
                                onChange={e => setQuantity(parseInt(e.target.value) || 0)}
                            />
                        </div>

                        <div className="md:col-span-3">
                            <button
                                type="button"
                                onClick={addItem}
                                disabled={!selectedPart || quantity <= 0}
                                className="w-full flex items-center justify-center px-4 py-2.5 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white bg-industrial-accent hover:bg-blue-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Agregar
                            </button>
                        </div>
                    </div>

                    {isStockInsufficient && (
                        <div className="mt-4 flex items-start p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" />
                            <p className="text-sm text-yellow-200">
                                <strong className="font-bold text-yellow-400">Advertencia: Stock insuficiente.</strong> La solicitud quedará como "Pendiente de Compra".
                            </p>
                        </div>
                    )}
                </div>

                {/* List of added items */}
                {requestItems.length > 0 && (
                    <div className="bg-industrial-900/50 rounded-lg p-4 border border-industrial-700">
                        <h4 className="text-xs font-bold text-industrial-400 uppercase tracking-wider mb-3">Ítems a Solicitar</h4>
                        <ul className="space-y-2">
                            {requestItems.map((item, index) => (
                                <li key={index} className="flex justify-between items-center bg-industrial-800 p-3 rounded border border-industrial-700">
                                    <div className="flex items-center">
                                        <div className="w-2 h-2 rounded-full bg-industrial-accent mr-3"></div>
                                        <span className="font-medium text-white">{item.partName}</span>
                                        <span className="text-sm text-industrial-400 ml-3 font-mono bg-industrial-900 px-2 py-0.5 rounded">x{item.quantity}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="text-industrial-500 hover:text-red-400 transition-colors p-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="flex justify-end pt-4 border-t border-industrial-700">
                    <button
                        type="submit"
                        disabled={requestItems.length === 0}
                        className="px-6 py-2.5 border border-transparent rounded-lg shadow-lg shadow-emerald-900/20 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Crear Solicitud
                    </button>
                </div>
            </form>
        </div>
    );
};
