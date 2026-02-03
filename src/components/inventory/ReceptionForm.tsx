import React, { useState, useEffect } from 'react';
import { InventoryMockService } from '../../services/implementations/inventoryMock';
import { SparePart } from '../../types/inventory';
import { ArrowDownCircle } from 'lucide-react';

const service = new InventoryMockService();

export const ReceptionForm: React.FC = () => {
    const [parts, setParts] = useState<SparePart[]>([]);
    const [selectedPartId, setSelectedPartId] = useState('');
    const [quantity, setQuantity] = useState(0);
    const [relatedDocId, setRelatedDocId] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        service.getAllParts().then(setParts);
    }, []);

    const handleReceive = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPartId || quantity <= 0) return;

        try {
            await service.addStock(selectedPartId, quantity, relatedDocId);
            setMessage({ type: 'success', text: 'Stock actualizado correctamente.' });
            setQuantity(0);
            setRelatedDocId('');
            // Optional: Refresh parts stock logic if needed locally or rely on global reload
            service.getAllParts().then(setParts);
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Error al actualizar stock.' });
        }
    };

    return (
        <div className="bg-industrial-800 rounded-lg shadow-xl border border-industrial-700 p-6">
            <div className="flex items-center mb-6 text-white pb-6 border-b border-industrial-700">
                <span className="p-1.5 bg-emerald-900/30 rounded border border-emerald-800 mr-3">
                    <ArrowDownCircle className="w-6 h-6 text-emerald-500" />
                </span>
                <h2 className="text-xl font-bold">Recepción de Mercadería</h2>
            </div>

            {message && (
                <div className={`mb-6 p-4 rounded-lg flex items-center border ${message.type === 'success' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>
                    <span className="font-medium text-sm">{message.text}</span>
                </div>
            )}

            <form onSubmit={handleReceive} className="space-y-6">
                <div>
                    <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-2">Repuesto</label>
                    <select
                        className="w-full bg-industrial-900 border border-industrial-600 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-colors appearance-none cursor-pointer"
                        value={selectedPartId}
                        onChange={e => setSelectedPartId(e.target.value)}
                        required
                    >
                        <option value="">Seleccionar...</option>
                        {parts.map(p => (
                            <option key={p.id} value={p.id}>{p.partNumber} - {p.name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-2">Cantidad Recibida</label>
                        <input
                            type="number"
                            min="1"
                            className="w-full bg-industrial-900 border border-industrial-600 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-colors font-mono"
                            value={quantity}
                            onChange={e => setQuantity(parseInt(e.target.value) || 0)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-2">N° Orden Compra / Guía</label>
                        <input
                            type="text"
                            className="w-full bg-industrial-900 border border-industrial-600 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                            value={relatedDocId}
                            onChange={e => setRelatedDocId(e.target.value)}
                        />
                    </div>
                </div>

                <div className="pt-4 border-t border-industrial-700">
                    <button
                        type="submit"
                        className="w-full px-4 py-3 border border-transparent rounded-lg shadow-lg shadow-emerald-900/20 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none transition-all"
                    >
                        Registrar Ingreso
                    </button>
                </div>
            </form>
        </div>
    );
};
