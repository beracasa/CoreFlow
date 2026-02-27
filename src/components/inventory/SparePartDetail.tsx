import React, { useState } from 'react';
import { SparePart } from '../../types/inventory';
import { X, Package, MapPin, AlertTriangle, Activity, Edit } from 'lucide-react';
import { PartCreationForm } from './PartCreationForm';
import { inventoryService } from '../../services';

// Service initialized in index.ts

interface SparePartDetailProps {
    part: SparePart;
    onClose: () => void;
}

export const SparePartDetail: React.FC<SparePartDetailProps> = ({ part, onClose }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentPart, setCurrentPart] = useState(part);

    const handleEditSuccess = (updatedPart?: SparePart) => {
        setIsEditing(false);
        if (updatedPart) {
            // Use the RPC return value directly — avoids re-fetching via PostgREST
            setCurrentPart(updatedPart);
        } else {
            // Fallback: reload from server
            inventoryService.getAllParts().then(parts => {
                const updated = parts.find(p => p.id === currentPart.id);
                if (updated) setCurrentPart(updated);
            });
        }
    };

    if (isEditing) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-industrial-800 rounded-xl shadow-2xl border border-industrial-600 w-full max-w-4xl overflow-y-auto max-h-[95vh] animate-slide-up">
                    <PartCreationForm
                        initialData={currentPart}
                        onCancel={() => setIsEditing(false)}
                        onSuccess={handleEditSuccess}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-industrial-800 rounded-xl shadow-2xl border border-industrial-600 w-full max-w-5xl overflow-y-auto max-h-[95vh] animate-slide-up">

                {/* Header */}
                <div className="bg-industrial-900 px-6 py-4 border-b border-industrial-700 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="p-1.5 bg-blue-900/30 rounded border border-blue-800">
                                <Package className="w-5 h-5 text-blue-500" />
                            </span>
                            <h2 className="text-xl font-bold text-white">{currentPart.name}</h2>
                        </div>
                        <p className="text-industrial-400 font-mono text-sm ml-11">{currentPart.partNumber}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsEditing(true)}
                            className="text-industrial-400 hover:text-white hover:bg-industrial-700 p-2 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Edit className="w-5 h-5" />
                            <span className="text-sm font-bold">Editar</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="text-industrial-400 hover:text-white hover:bg-industrial-700 p-2 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <div className="bg-industrial-900/50 p-3 rounded-lg border border-industrial-700">
                            <p className="text-[10px] text-industrial-500 uppercase font-bold mb-1 tracking-wider">Stock Actual</p>
                            <p className={`text-xl font-bold ${currentPart.currentStock <= currentPart.minStock ? 'text-red-400' : 'text-emerald-400'
                                }`}>
                                {currentPart.currentStock} <span className="text-xs text-industrial-600 font-normal">{currentPart.unitOfMeasure}</span>
                            </p>
                        </div>

                        <div className="bg-industrial-900/50 p-3 rounded-lg border border-industrial-700">
                            <p className="text-[10px] text-industrial-500 uppercase font-bold mb-1 tracking-wider">Costo Unitario</p>
                            <p className="text-xl font-bold text-white">
                                RD${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(currentPart.cost)}
                            </p>
                        </div>

                        <div className="bg-industrial-900/50 p-3 rounded-lg border border-industrial-700">
                            <p className="text-[10px] text-industrial-500 uppercase font-bold mb-1 tracking-wider">Tramo</p>
                            <div className="flex items-center gap-1.5 text-white text-xl font-bold">
                                <MapPin className="w-4 h-4 text-industrial-500" />
                                {currentPart.location}
                            </div>
                        </div>

                        <div className="bg-industrial-900/50 p-3 rounded-lg border border-industrial-700">
                            <p className="text-[10px] text-industrial-500 uppercase font-bold mb-1 tracking-wider">Ubicación</p>
                            <div className="flex items-center gap-1.5 text-white text-xl font-bold">
                                <MapPin className="w-4 h-4 text-blue-400" />
                                {currentPart.subLocation || '-'}
                            </div>
                        </div>

                        <div className="bg-industrial-900/50 p-3 rounded-lg border border-industrial-700">
                            <p className="text-[10px] text-industrial-500 uppercase font-bold mb-1 tracking-wider">Categoría</p>
                            <p className="text-white text-xl font-bold truncate">
                                {currentPart.category}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-industrial-900/50 p-3 rounded-lg border border-industrial-700">
                            <p className="text-[10px] text-industrial-500 uppercase font-bold mb-1 tracking-wider">Fecha de Creación</p>
                            <p className="text-white text-lg font-bold">
                                {currentPart.createdAt ? new Date(currentPart.createdAt).toLocaleDateString() : '-'}
                            </p>
                        </div>
                    </div>

                    {/* Image and Description Split */}
                    <div className="flex flex-col md:flex-row gap-6 mb-6">
                        {currentPart.photoUrl && (
                            <div className="w-full md:w-1/3 shrink-0">
                                <div className="rounded-lg border border-industrial-700 overflow-hidden bg-black/20 aspect-square flex items-center justify-center">
                                    <img src={currentPart.photoUrl} alt={currentPart.name} className="w-full h-full object-contain" />
                                </div>
                            </div>
                        )}
                        <div className={currentPart.photoUrl ? 'w-full md:w-2/3' : 'w-full'}>
                            {/* Description & Status */}
                            <div>
                                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-industrial-500" />
                                    Detalles
                                </h3>
                                <div className="text-industrial-300 text-sm leading-relaxed p-4 bg-industrial-900/20 rounded-lg border border-industrial-700/50 mb-6">
                                    {currentPart.description || "Sin descripción disponible."}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-industrial-500" />
                                    Estado de Inventario
                                </h3>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex justify-between items-center p-3 rounded bg-industrial-900/30 border border-industrial-700/50">
                                            <span className="text-sm text-industrial-400">Min Stock</span>
                                            <span className="text-white font-mono font-bold">{currentPart.minStock} {currentPart.unitOfMeasure}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 rounded bg-industrial-900/30 border border-industrial-700/50">
                                            <span className="text-sm text-industrial-400">Max Stock</span>
                                            <span className="text-white font-mono font-bold">{currentPart.maxStock || '-'} {currentPart.unitOfMeasure}</span>
                                        </div>
                                    </div>

                                    {currentPart.currentStock <= currentPart.minStock && (
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
        </div>
    );
};
