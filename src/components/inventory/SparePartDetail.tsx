import React from 'react';
import { SparePart } from '../../types/inventory';
import { X, Package, MapPin, AlertTriangle, Activity } from 'lucide-react';

interface SparePartDetailProps {
    part: SparePart;
    onClose: () => void;
}

export const SparePartDetail: React.FC<SparePartDetailProps> = ({ part, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-industrial-800 rounded-xl shadow-2xl border border-industrial-600 w-full max-w-2xl overflow-hidden animate-slide-up">

                {/* Header */}
                <div className="bg-industrial-900 px-6 py-4 border-b border-industrial-700 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="p-1.5 bg-blue-900/30 rounded border border-blue-800">
                                <Package className="w-5 h-5 text-blue-500" />
                            </span>
                            <h2 className="text-xl font-bold text-white">{part.name}</h2>
                        </div>
                        <p className="text-industrial-400 font-mono text-sm ml-11">{part.partNumber}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-industrial-400 hover:text-white hover:bg-industrial-700 p-1 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-industrial-900/50 p-4 rounded-lg border border-industrial-700">
                            <p className="text-xs text-industrial-500 uppercase font-bold mb-1">Stock Actual</p>
                            <p className={`text-2xl font-bold ${part.currentStock <= part.minStock ? 'text-red-400' : 'text-emerald-400'
                                }`}>
                                {part.currentStock} <span className="text-sm text-industrial-600 font-normal">{part.unitOfMeasure}</span>
                            </p>
                        </div>

                        <div className="bg-industrial-900/50 p-4 rounded-lg border border-industrial-700">
                            <p className="text-xs text-industrial-500 uppercase font-bold mb-1">Costo Unitario</p>
                            <p className="text-xl font-bold text-white">
                                ${part.cost}
                            </p>
                        </div>

                        <div className="bg-industrial-900/50 p-4 rounded-lg border border-industrial-700">
                            <p className="text-xs text-industrial-500 uppercase font-bold mb-1">Ubicación</p>
                            <div className="flex items-center gap-2 text-white font-medium">
                                <MapPin className="w-4 h-4 text-industrial-500" />
                                {part.location}
                            </div>
                        </div>

                        <div className="bg-industrial-900/50 p-4 rounded-lg border border-industrial-700">
                            <p className="text-xs text-industrial-500 uppercase font-bold mb-1">Categoría</p>
                            <p className="text-white font-medium truncate">
                                {part.category}
                            </p>
                        </div>
                    </div>

                    {/* Description & Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-industrial-500" />
                                Detalles
                            </h3>
                            <div className="text-industrial-300 text-sm leading-relaxed p-4 bg-industrial-900/20 rounded-lg border border-industrial-700/50 h-full">
                                {part.description || "Sin descripción disponible."}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-industrial-500" />
                                Estado de Inventario
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 rounded bg-industrial-900/30 border border-industrial-700/50">
                                    <span className="text-sm text-industrial-400">Stock Mínimo Requerido</span>
                                    <span className="text-white font-mono font-bold">{part.minStock} {part.unitOfMeasure}</span>
                                </div>
                                {part.currentStock <= part.minStock && (
                                    <div className="flex items-start gap-3 p-3 rounded bg-red-900/20 border border-red-900/50">
                                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                                        <div>
                                            <p className="text-red-400 font-bold text-sm">Stock Crítico</p>
                                            <p className="text-red-300/80 text-xs mt-1">
                                                El stock actual está por debajo del nivel mínimo. Se recomienda reabastecer.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
