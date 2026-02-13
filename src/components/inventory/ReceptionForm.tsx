import React, { useState, useEffect } from 'react';
import { inventoryService } from '../../services';
import { SparePart } from '../../types/inventory';
import { ArrowDownCircle } from 'lucide-react';

// Service initialized in index.ts

export const ReceptionForm: React.FC = () => {
    const [parts, setParts] = useState<SparePart[]>([]);
    const [selectedPartId, setSelectedPartId] = useState('');
    const [quantity, setQuantity] = useState(0);
    const [relatedDocId, setRelatedDocId] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Searchable Dropdown State
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    // Multi-item State
    const [itemsToReceive, setItemsToReceive] = useState<{ partId: string; partName: string; partNumber: string; quantity: number }[]>([]);

    useEffect(() => {
        inventoryService.getAllParts().then(setParts);
    }, []);

    const handleAddItem = () => {
        if (!selectedPartId || quantity <= 0) return;

        const part = parts.find(p => p.id === selectedPartId);
        if (!part) return;

        setItemsToReceive(prev => [
            ...prev,
            { partId: part.id, partName: part.name, partNumber: part.partNumber, quantity }
        ]);

        // Reset inputs but keep filtered doc id
        setSelectedPartId('');
        setSearchTerm('');
        setQuantity(0);
    };

    const handleRemoveItem = (index: number) => {
        setItemsToReceive(prev => prev.filter((_, i) => i !== index));
    };

    const handleReceive = async (e: React.FormEvent) => {
        e.preventDefault();
        if (itemsToReceive.length === 0) {
            setMessage({ type: 'error', text: 'Agregue al menos un ítem a la lista.' });
            return;
        }

        try {
            // Process all items sequentially
            for (const item of itemsToReceive) {
                await inventoryService.addStock(item.partId, item.quantity, relatedDocId);
            }

            setMessage({ type: 'success', text: 'Todos los ítems han sido recibidos correctamente.' });
            setItemsToReceive([]);
            setRelatedDocId('');
            setQuantity(0);
            setSearchTerm('');
            setSelectedPartId('');

            inventoryService.getAllParts().then(setParts);
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Error al procesar la recepción.' });
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

            <div className="space-y-6">
                {/* Document Header - Applies safely to all items */}
                <div>
                    <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-2">N° Orden Compra / Guía (Global)</label>
                    <input
                        type="text"
                        className="w-full bg-industrial-900 border border-industrial-600 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                        value={relatedDocId}
                        onChange={e => setRelatedDocId(e.target.value)}
                        placeholder="Ej: OC-2024-001"
                    />
                </div>

                <div className="p-4 bg-industrial-900/50 border border-industrial-700 rounded-lg space-y-4">
                    <h3 className="text-white font-bold text-sm">Agregar Ítem</h3>

                    <div>
                        <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-2">Repuesto</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar repuesto por código o nombre..."
                                className="w-full bg-industrial-900 border border-industrial-600 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                                value={searchTerm}
                                onChange={e => {
                                    setSearchTerm(e.target.value);
                                    setSelectedPartId('');
                                    setShowDropdown(true);
                                }}
                                onFocus={() => setShowDropdown(true)}
                                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                            />
                            {showDropdown && (
                                <div className="absolute z-10 w-full mt-1 bg-industrial-800 border border-industrial-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                    {parts.filter(p =>
                                        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        p.partNumber.toLowerCase().includes(searchTerm.toLowerCase())
                                    ).length > 0 ? (
                                        parts.filter(p =>
                                            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            p.partNumber.toLowerCase().includes(searchTerm.toLowerCase())
                                        ).map(p => (
                                            <div
                                                key={p.id}
                                                className="px-4 py-2 hover:bg-industrial-700 cursor-pointer text-white text-sm border-b border-industrial-700/50 last:border-0"
                                                onClick={() => {
                                                    setSelectedPartId(p.id);
                                                    setSearchTerm(`${p.partNumber} - ${p.name}`);
                                                    setShowDropdown(false);
                                                }}
                                            >
                                                <span className="font-bold text-emerald-400">{p.partNumber}</span> - {p.name}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-4 py-2 text-industrial-400 text-sm">No se encontraron resultados</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 items-end">
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-2">Cantidad</label>
                            <input
                                type="number"
                                min="1"
                                className="w-full bg-industrial-900 border border-industrial-600 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-colors font-mono"
                                value={quantity === 0 ? '' : quantity}
                                onChange={e => {
                                    const val = e.target.value;
                                    setQuantity(val === '' ? 0 : parseInt(val));
                                }}
                            />
                        </div>
                        <div className="col-span-1">
                            <button
                                type="button"
                                onClick={handleAddItem}
                                disabled={!selectedPartId || quantity <= 0}
                                className="w-full px-4 py-2.5 border border-transparent rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20"
                            >
                                + Agregar a Lista
                            </button>
                        </div>
                    </div>
                </div>

                {/* List of Items to Receive */}
                {itemsToReceive.length > 0 && (
                    <div className="border border-industrial-700 rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left text-gray-400">
                            <thead className="text-xs uppercase bg-industrial-900 text-industrial-400">
                                <tr>
                                    <th className="px-4 py-3">Código</th>
                                    <th className="px-4 py-3">Repuesto</th>
                                    <th className="px-4 py-3 text-right">Cant.</th>
                                    <th className="px-4 py-3 text-center"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {itemsToReceive.map((item, index) => (
                                    <tr key={index} className="bg-industrial-800 border-t border-industrial-700 hover:bg-industrial-700/50">
                                        <td className="px-4 py-3 font-mono text-emerald-400">{item.partNumber}</td>
                                        <td className="px-4 py-3 text-white">{item.partName}</td>
                                        <td className="px-4 py-3 text-right font-bold text-white">{item.quantity}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => handleRemoveItem(index)}
                                                className="text-red-400 hover:text-red-300 font-bold px-2"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="pt-4 border-t border-industrial-700">
                    <button
                        onClick={handleReceive}
                        disabled={itemsToReceive.length === 0}
                        className="w-full px-4 py-3 border border-transparent rounded-lg shadow-lg shadow-emerald-900/20 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none transition-all disabled:opacity-50 disabled:grayscale"
                    >
                        Registrar Ingreso ({itemsToReceive.length} ítems)
                    </button>
                </div>
            </div>
        </div>
    );
};
