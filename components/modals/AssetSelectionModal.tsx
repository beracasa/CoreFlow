import React, { useState } from 'react';
import { Search, X, Check, Box } from 'lucide-react';
import { Machine, ZoneStructure } from '../../types';

interface AssetSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    items: (Machine | ZoneStructure)[];
    onSelect: (item: Machine | ZoneStructure) => void;
    type: 'MACHINE' | 'ZONE';
}

export const AssetSelectionModal: React.FC<AssetSelectionModalProps> = ({ isOpen, onClose, title, items, onSelect, type }) => {
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (type === 'MACHINE' && (item as Machine).code?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-industrial-800 border border-industrial-600 rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-industrial-600 bg-industrial-900/50 rounded-t-xl">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Box size={20} className="text-industrial-accent" />
                        {title === 'Select Machine to Place' ? 'Seleccionar Equipo' : 'Seleccionar Zona'}
                    </h3>
                    <button onClick={onClose} className="text-industrial-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-industrial-600">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-400" size={18} />
                        <input
                            type="text"
                            placeholder={`Buscar ${type === 'MACHINE' ? 'equipos...' : 'zonas...'}`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-industrial-900 text-white pl-10 pr-4 py-2 rounded-lg border border-industrial-600 focus:border-industrial-accent focus:outline-none transition-colors"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filteredItems.length === 0 ? (
                        <div className="text-center py-8 text-industrial-400">
                            No se encontraron ítems.
                        </div>
                    ) : (
                        filteredItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => onSelect(item)}
                                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-industrial-700/50 transition-colors group text-left"
                            >
                                <div>
                                    <div className="font-bold text-white group-hover:text-industrial-accent transition-colors">
                                        {item.name}
                                    </div>
                                    {type === 'MACHINE' && (
                                        <div className="text-xs text-industrial-400">
                                            Código: {(item as Machine).code || 'N/A'} • Placa: {(item as Machine).plate || 'N/A'}
                                        </div>
                                    )}
                                    {type === 'ZONE' && (
                                        <div className="text-xs text-industrial-400">
                                            Líneas: {(item as ZoneStructure).lines.length}
                                        </div>
                                    )}
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-industrial-accent">
                                    <Check size={18} />
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-industrial-600 bg-industrial-900/50 rounded-b-xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-industrial-300 hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                </div>

            </div>
        </div>
    );
};
