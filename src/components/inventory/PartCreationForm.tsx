import React, { useState } from 'react';
import { InventoryMockService } from '../../services/implementations/inventoryMock';
import { Package, PlusCircle, Save } from 'lucide-react';

const service = new InventoryMockService();

export const PartCreationForm: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        partNumber: '',
        category: '',
        description: '',
        minStock: 0,
        unitOfMeasure: 'PCS',
        location: '',
        initialStock: 0,
        initialStock: 0,
    });

    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'minStock' || name === 'cost' || name === 'initialStock' ? parseFloat(value) || 0 : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await service.createPart(formData);
            setFeedback({ type: 'success', message: 'Repuesto creado exitosamente.' });
            setFormData({
                name: '',
                partNumber: '',
                category: '',
                description: '',
                minStock: 0,
                unitOfMeasure: 'PCS',
                unitOfMeasure: 'PCS',
                location: '',
                initialStock: 0,
                cost: 0
            });
        } catch (error: any) {
            console.error(error);
            setFeedback({ type: 'error', message: error.message || 'Error al crear el repuesto.' });
        }
    };

    return (
        <div className="bg-industrial-800 rounded-lg shadow-xl border border-industrial-700 p-6">
            <div className="flex items-center mb-6 text-white pb-6 border-b border-industrial-700">
                <span className="p-1.5 bg-blue-900/30 rounded border border-blue-800 mr-3">
                    <Package className="w-6 h-6 text-blue-500" />
                </span>
                <h2 className="text-xl font-bold">Crear Nuevo Repuesto</h2>
            </div>

            {feedback && (
                <div className={`mb-6 p-4 rounded-lg flex items-center border ${feedback.type === 'success' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>
                    <span className="font-medium text-sm">{feedback.message}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Part Number */}
                    <div>
                        <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-2">Código / N° Parte</label>
                        <input
                            type="text"
                            name="partNumber"
                            required
                            className="w-full bg-industrial-900 border border-industrial-600 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder-industrial-600 font-mono"
                            placeholder="Ej. BRG-6204"
                            value={formData.partNumber}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-2">Nombre Repuesto</label>
                        <input
                            type="text"
                            name="name"
                            required
                            className="w-full bg-industrial-900 border border-industrial-600 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder-industrial-600"
                            placeholder="Ej. Rodamiento de Bola"
                            value={formData.name}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-2">Categoría</label>
                        <select
                            name="category"
                            required
                            className="w-full bg-industrial-900 border border-industrial-600 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-colors appearance-none cursor-pointer"
                            value={formData.category}
                            onChange={handleChange}
                        >
                            <option value="">Seleccionar...</option>
                            <option value="Bearings">Rodamientos</option>
                            <option value="Hydraulics">Hidráulica</option>
                            <option value="Electronics">Electrónica</option>
                            <option value="Pneumatics">Neumática</option>
                            <option value="Consumables">Consumibles</option>
                            <option value="Mechanical">Mecánica</option>
                        </select>
                    </div>

                    {/* Location */}
                    <div>
                        <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-2">Ubicación</label>
                        <input
                            type="text"
                            name="location"
                            className="w-full bg-industrial-900 border border-industrial-600 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder-industrial-600"
                            placeholder="Ej. Estante A-01"
                            value={formData.location}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Min Stock */}
                    <div>
                        <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-2">Stock Mínimo</label>
                        <input
                            type="number"
                            name="minStock"
                            min="0"
                            className="w-full bg-industrial-900 border border-industrial-600 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-mono"
                            value={formData.minStock}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Initial Stock */}
                    <div>
                        <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-2">Stock Inicial</label>
                        <input
                            type="number"
                            name="initialStock"
                            min="0"
                            className="w-full bg-industrial-900 border border-industrial-600 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-mono"
                            value={formData.initialStock}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Unit of Measure */}
                    <div>
                        <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-2">Unidad de Medida</label>
                        <select
                            name="unitOfMeasure"
                            className="w-full bg-industrial-900 border border-industrial-600 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-colors appearance-none cursor-pointer"
                            value={formData.unitOfMeasure}
                            onChange={handleChange}
                        >
                            <option value="PCS">Piezas (UN)</option>
                            <option value="M">Metros (M)</option>
                            <option value="KG">Kilogramos (KG)</option>
                            <option value="L">Litros (L)</option>
                            <option value="SET">Juego (SET)</option>
                        </select>
                    </div>
                    {/* Cost */}
                    <div>
                        <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-2">Costo Unitario ($)</label>
                        <input
                            type="number"
                            name="cost"
                            min="0"
                            step="0.01"
                            className="w-full bg-industrial-900 border border-industrial-600 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-mono"
                            value={formData.cost}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-2">Descripción</label>
                    <textarea
                        name="description"
                        rows={3}
                        className="w-full bg-industrial-900 border border-industrial-600 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder-industrial-600 resize-none"
                        placeholder="Descripción detallada del repuesto..."
                        value={formData.description}
                        onChange={handleChange}
                    />
                </div>

                <div className="pt-4 border-t border-industrial-700">
                    <button
                        type="submit"
                        className="w-full px-4 py-3 border border-transparent rounded-lg shadow-lg shadow-blue-900/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition-all flex items-center justify-center gap-2"
                    >
                        <Save className="w-5 h-5" />
                        Guardar Repuesto
                    </button>
                </div>
            </form>
        </div>
    );
};
