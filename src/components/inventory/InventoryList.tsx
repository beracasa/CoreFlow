import React, { useState, useEffect } from 'react';
import { inventoryService } from '../../services';
import { ImportSpareParts } from './ImportSpareParts';
import { SparePart } from '../../types/inventory';
import { Search, AlertCircle } from 'lucide-react';
import { SparePartDetail } from './SparePartDetail';
import { useMasterStore } from '../../stores/useMasterStore';

// Service initialized in index.ts

export const InventoryList: React.FC = () => {
    const { parts, isLoading: loading, fetchMasterData, partCategories: categories, partLocations: locations } = useMasterStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);

    // Filters
    const [categoryFilter, setCategoryFilter] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'normal'>('all');

    // Derived options
    const matchSearch = (part: SparePart) =>
        part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.description.toLowerCase().includes(searchTerm.toLowerCase());

    useEffect(() => {
        fetchMasterData();
    }, []);

    const filteredParts = parts.filter(part => {
        const matchesSearch = matchSearch(part);
        const matchesCategory = categoryFilter ? part.category === categoryFilter : true;
        const matchesLocation = locationFilter ? part.location === locationFilter : true;
        const isLowStock = part.currentStock <= part.minStock;
        const matchesStatus = statusFilter === 'all'
            ? true
            : statusFilter === 'low' ? isLowStock : !isLowStock;

        return matchesSearch && matchesCategory && matchesLocation && matchesStatus;
    });

    return (
        <div className="bg-industrial-800 rounded-lg shadow-xl border border-industrial-700 p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="p-1.5 bg-industrial-900 rounded border border-industrial-600">
                        <Search className="w-4 h-4 text-industrial-accent" />
                    </span>
                    Inventario de Repuestos
                </h2>
                <button
                    onClick={() => setShowImportModal(true)}
                    className="px-4 py-2 bg-industrial-600 text-white rounded-lg hover:bg-industrial-500 transition-colors text-sm font-medium flex items-center gap-2"
                >
                    Importar Excel/CSV
                </button>
            </div>


            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                    <label className="block text-xs font-bold text-industrial-500 uppercase tracking-wider mb-2">Buscar</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-industrial-400 h-5 w-5" />
                        <input
                            type="text"
                            placeholder="Buscar repuesto..."
                            className="w-full pl-10 pr-4 py-2 bg-industrial-900 border border-industrial-600 rounded-lg focus:ring-2 focus:ring-industrial-accent focus:border-transparent outline-none text-white placeholder-industrial-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-industrial-500 uppercase tracking-wider mb-2">Categoría</label>
                    <select
                        className="w-full px-4 py-2 bg-industrial-900 border border-industrial-600 rounded-lg focus:ring-2 focus:ring-industrial-accent focus:border-transparent outline-none text-white appearance-none cursor-pointer"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="">Todas</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-industrial-500 uppercase tracking-wider mb-2">Tramo</label>
                    <select
                        className="w-full px-4 py-2 bg-industrial-900 border border-industrial-600 rounded-lg focus:ring-2 focus:ring-industrial-accent focus:border-transparent outline-none text-white appearance-none cursor-pointer"
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                    >
                        <option value="">Todas</option>
                        {locations.map(loc => (
                            <option key={loc} value={loc}>{loc}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-industrial-500 uppercase tracking-wider mb-2">Estado</label>
                    <select
                        className="w-full px-4 py-2 bg-industrial-900 border border-industrial-600 rounded-lg focus:ring-2 focus:ring-industrial-accent focus:border-transparent outline-none text-white appearance-none cursor-pointer"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                        <option value="all">Todos</option>
                        <option value="low">Bajo Stock</option>
                        <option value="normal">Normal</option>
                    </select>
                </div>
            </div>

            {
                loading ? (
                    <div className="text-center py-12 text-industrial-400">Cargando inventario...</div>
                ) : (
                    <div className="overflow-x-auto rounded-lg border border-industrial-700">
                        <table className="min-w-full divide-y divide-industrial-700">
                            <thead className="bg-industrial-900">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-industrial-500 uppercase tracking-wider">Código</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-industrial-500 uppercase tracking-wider">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-industrial-500 uppercase tracking-wider">Categoría</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-industrial-500 uppercase tracking-wider">Tramo</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-industrial-500 uppercase tracking-wider">Stock</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-industrial-500 uppercase tracking-wider">Mínimo</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-industrial-500 uppercase tracking-wider">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="bg-industrial-800 divide-y divide-industrial-700">
                                {filteredParts.map((part) => {
                                    const isLowStock = part.currentStock < part.minStock;
                                    return (
                                        <tr
                                            key={part.id}
                                            className={`hover:bg-industrial-700/50 transition-colors cursor-pointer ${isLowStock ? 'bg-red-900/10' : ''}`}
                                            onClick={() => setSelectedPart(part)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-industrial-300 font-medium">{part.partNumber}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">{part.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-industrial-400">{part.category}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-industrial-400">{part.location}</td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${isLowStock ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {part.currentStock} {part.unitOfMeasure}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-industrial-500">{part.minStock}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {isLowStock ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-900/30 text-red-400 border border-red-800">
                                                        <AlertCircle className="w-3 h-3 mr-1" />
                                                        Bajo Stock
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-900/30 text-emerald-400 border border-emerald-800">
                                                        Normal
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )
            }

            {
                selectedPart && (
                    <SparePartDetail
                        part={selectedPart}
                        onClose={() => setSelectedPart(null)}
                    />
                )
            }
            {showImportModal && (
                <ImportSpareParts
                    onClose={() => setShowImportModal(false)}
                    onSuccess={() => {
                        fetchMasterData();
                    }}
                />
            )}
        </div >
    );
};
