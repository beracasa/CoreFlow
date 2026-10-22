import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { inventoryService } from '../../services';
import { SparePart } from '../../types/inventory';

export interface PartSearchInputProps {
    value: string;
    partId?: string;
    disabled?: boolean;
    placeholder?: string;
    accentColor?: 'pink' | 'emerald' | 'blue';
    className?: string;
    dropdownWidth?: string;
    onSelect: (part: SparePart) => void;
    onChangeText?: (text: string) => void;
    onClear?: () => void;
}

export const PartSearchInput: React.FC<PartSearchInputProps> = ({
    value,
    partId,
    disabled = false,
    placeholder = 'Buscar repuesto por código o nombre...',
    accentColor = 'pink',
    className = '',
    dropdownWidth = 'w-[380px]',
    onSelect,
    onChangeText,
    onClear
}) => {
    const [searchTerm, setSearchTerm] = useState(value || '');
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<SparePart[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Synchronize searchTerm when value changes externally (e.g., initial load or form reset)
    useEffect(() => {
        setSearchTerm(value || '');
    }, [value]);

    // Handle outside clicks to close dropdown
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Perform debounced search
    const performSearch = (query: string) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        setIsLoading(true);
        debounceTimerRef.current = setTimeout(async () => {
            try {
                const parts = await inventoryService.searchParts(query, 30);
                setResults(parts);
            } catch (err) {
                console.error('Error searching spare parts:', err);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 200);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value;
        setSearchTerm(text);
        setIsOpen(true);
        onChangeText?.(text);
        performSearch(text);
    };

    const handleFocus = () => {
        if (disabled) return;
        setIsOpen(true);
        // If not already selected or searching, fetch initial suggestions
        if (!partId) {
            performSearch(searchTerm);
        }
    };

    const handleSelect = (part: SparePart) => {
        const label = part.partNumber ? `${part.partNumber} - ${part.name}` : part.name;
        setSearchTerm(label);
        setIsOpen(false);
        onSelect(part);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSearchTerm('');
        setResults([]);
        setIsOpen(false);
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        onClear?.();
        onChangeText?.('');
    };

    // Color helpers based on accentColor
    const getAccentBorderClass = () => {
        if (disabled) return 'border-industrial-700 bg-industrial-900/50 text-industrial-400 cursor-not-allowed';
        if (!partId && searchTerm.trim()) {
            // Unconfirmed selection warning
            return accentColor === 'emerald'
                ? 'border-emerald-500 focus:border-emerald-400'
                : accentColor === 'blue'
                    ? 'border-blue-500 focus:border-blue-400'
                    : 'border-pink-500 focus:border-pink-400';
        }
        return accentColor === 'emerald'
            ? 'border-industrial-600 focus:border-emerald-500'
            : accentColor === 'blue'
                ? 'border-industrial-600 focus:border-blue-500'
                : 'border-industrial-600 focus:border-pink-500';
    };

    const getPartNumberColor = () => {
        if (accentColor === 'emerald') return 'text-emerald-400';
        if (accentColor === 'blue') return 'text-blue-400';
        return 'text-pink-400';
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div className="relative flex items-center">
                <input
                    type="text"
                    disabled={disabled}
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') setIsOpen(false);
                    }}
                    className={`w-full bg-industrial-900 border rounded p-1 text-white text-xs outline-none transition-colors placeholder-industrial-600 pr-12 ${getAccentBorderClass()}`}
                />
                
                <div className="absolute right-1.5 flex items-center gap-1">
                    {isLoading && (
                        <Loader2 className={`w-3.5 h-3.5 animate-spin ${getPartNumberColor()}`} />
                    )}
                    {!disabled && searchTerm && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-industrial-400 hover:text-white p-0.5 rounded transition-colors"
                            title="Limpiar"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* Dropdown Results */}
            {isOpen && !disabled && (
                <div className={`absolute left-0 top-full mt-1 ${dropdownWidth} z-50 bg-industrial-800 border border-industrial-600 rounded-md shadow-2xl max-h-64 overflow-y-auto animate-fade-in`}>
                    {isLoading && results.length === 0 ? (
                        <div className="p-3 text-industrial-400 text-xs flex items-center justify-center gap-2">
                            <Loader2 className={`w-3.5 h-3.5 animate-spin ${getPartNumberColor()}`} />
                            <span>Buscando repuestos...</span>
                        </div>
                    ) : results.length > 0 ? (
                        results.map((sp) => {
                            const isSelected = sp.id === partId;
                            const isLow = (sp.currentStock || 0) <= (sp.minStock || 0);

                            return (
                                <div
                                    key={sp.id}
                                    onMouseDown={(e) => {
                                        // onMouseDown prevents input blur before selection completes
                                        e.preventDefault();
                                        handleSelect(sp);
                                    }}
                                    className={`p-2.5 hover:bg-industrial-700 cursor-pointer border-b border-industrial-700/50 last:border-0 flex justify-between items-center gap-3 transition-colors ${isSelected ? 'bg-industrial-700/70' : ''}`}
                                >
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-xs font-mono font-bold ${getPartNumberColor()}`}>
                                                {sp.partNumber}
                                            </span>
                                            <span className="text-white text-xs font-medium truncate">
                                                {sp.name}
                                            </span>
                                        </div>
                                        <div className="text-industrial-400 text-[10px] flex items-center gap-1.5 mt-0.5">
                                            <span>{sp.unitOfMeasure || 'Unidad'}</span>
                                            <span>&bull;</span>
                                            <span>RD${(sp.cost || 0).toFixed(2)}</span>
                                            {sp.company && (
                                                <>
                                                    <span>&bull;</span>
                                                    <span className="text-industrial-500 truncate max-w-[120px]">{sp.company}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div
                                        className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded font-bold ${
                                            isLow
                                                ? 'bg-red-900/50 text-red-400 border border-red-500/30'
                                                : 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/30'
                                        }`}
                                    >
                                        Stock: {sp.currentStock ?? 0}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-3 text-industrial-500 text-xs italic text-center">
                            No se encontraron repuestos
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
