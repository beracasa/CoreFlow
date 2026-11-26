import React, { useState, useEffect, useMemo } from 'react';
import { inventoryService, machineService } from '../../services';
import { UserSupabaseService } from '../../services/UserSupabaseService';
import { SparePart, RequestPriority } from '../../types/inventory';
import { UserProfile, Machine } from '../../../types';
import { AlertTriangle, Plus, Trash2, Search, Edit, X, Save as SaveIcon, Loader2, User, CheckCircle } from 'lucide-react';

import { PartsRequest, RequestItem } from '../../types/inventory';
import { useAuth } from '../../../contexts/AuthContext';

// Service initialized in index.ts

interface PartRequestFormProps {
    initialData?: PartsRequest;
    onCancel?: () => void;
    onSuccess?: () => void;
}

export const PartRequestForm: React.FC<PartRequestFormProps> = ({ initialData, onCancel, onSuccess }) => {
    const { hasPermission } = useAuth();
    const canCreate = hasPermission('manage_inventory') || hasPermission('create_part_requests');
    const canEdit = hasPermission('manage_inventory');
    const [parts, setParts] = useState<SparePart[]>([]);
    const [isSearchingParts, setIsSearchingParts] = useState(false);
    const [technicianId, setTechnicianId] = useState(initialData?.technicianId || '');
    const [priority, setPriority] = useState<RequestPriority>(initialData?.priority || 'NORMAL');

    // Requester (System User) Selector State
    const [systemUsers, setSystemUsers] = useState<UserProfile[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [requesterSearch, setRequesterSearch] = useState(initialData?.technicianId || '');
    const [selectedRequester, setSelectedRequester] = useState<UserProfile | null>(null);
    const [isRequesterDropdownOpen, setIsRequesterDropdownOpen] = useState(false);
    const [showRequesterError, setShowRequesterError] = useState(false);

    // Equipment (Lugar de Uso) Selector State
    const [machines, setMachines] = useState<Machine[]>([]);
    const [isLoadingMachines, setIsLoadingMachines] = useState(false);
    const [machineSearch, setMachineSearch] = useState('');
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
    const [isMachineDropdownOpen, setIsMachineDropdownOpen] = useState(false);

    // Form Item State
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedPartId, setSelectedPartId] = useState('');
    const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [usageLocation, setUsageLocation] = useState('');
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Map initial items to form state
    const [requestItems, setRequestItems] = useState<{
        partId: string;
        quantity: number;
        partName: string;
        usageLocation?: string;
        quantityDelivered?: number; // Keep track of this for validation
    }[]>(initialData?.items.map(item => ({
        partId: item.partId,
        quantity: item.quantityRequested,
        partName: item.partId, // We'll update this when parts load
        usageLocation: item.usageLocation,
        quantityDelivered: item.quantityDelivered
    })) || []);

    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Load system users for requester selector
    useEffect(() => {
        let isMounted = true;
        setIsLoadingUsers(true);
        UserSupabaseService.getUsers()
            .then(users => {
                if (!isMounted) return;
                const activeUsers = users.filter(u => u.status !== 'INACTIVE');
                setSystemUsers(activeUsers);
                if (initialData?.technicianId) {
                    const matched = activeUsers.find(
                        u =>
                            u.full_name?.toLowerCase() === initialData.technicianId.toLowerCase() ||
                            u.email?.toLowerCase() === initialData.technicianId.toLowerCase() ||
                            u.id === initialData.technicianId
                    );
                    if (matched) {
                        setSelectedRequester(matched);
                        setRequesterSearch(matched.full_name || matched.email);
                    }
                }
            })
            .catch(err => console.error('Error loading system users:', err))
            .finally(() => {
                if (isMounted) setIsLoadingUsers(false);
            });

        return () => {
            isMounted = false;
        };
    }, [initialData?.technicianId]);

    const filteredRequesters = useMemo(() => {
        const term = requesterSearch.trim().toLowerCase();
        if (!term || (selectedRequester && term === (selectedRequester.full_name || selectedRequester.email).toLowerCase())) {
            return systemUsers;
        }
        return systemUsers.filter(u =>
            (u.full_name || '').toLowerCase().includes(term) ||
            (u.email || '').toLowerCase().includes(term) ||
            (u.job_title || '').toLowerCase().includes(term)
        );
    }, [systemUsers, requesterSearch, selectedRequester]);

    const formatMachineLabel = (machine: Machine) => {
        return (machine.alias || machine.code || machine.name || '').trim();
    };

    // Load system machines for Lugar de Uso selector
    useEffect(() => {
        let isMounted = true;
        setIsLoadingMachines(true);
        machineService.getAllMachines()
            .then(data => {
                if (!isMounted) return;
                const activeMachines = (data || [])
                    .filter(m => m.isActive !== false)
                    .sort((a, b) => formatMachineLabel(a).localeCompare(formatMachineLabel(b)));
                setMachines(activeMachines);
            })
            .catch(err => console.error('Error loading machines:', err))
            .finally(() => {
                if (isMounted) setIsLoadingMachines(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredMachines = useMemo(() => {
        const term = machineSearch.trim().toLowerCase();
        if (!term || (selectedMachine && term === formatMachineLabel(selectedMachine).toLowerCase())) {
            return machines;
        }
        return machines.filter(m =>
            (m.alias || '').toLowerCase().includes(term) ||
            (m.name || '').toLowerCase().includes(term) ||
            (m.code || '').toLowerCase().includes(term) ||
            (m.plate || '').toLowerCase().includes(term) ||
            (m.brand || '').toLowerCase().includes(term) ||
            (m.model || '').toLowerCase().includes(term) ||
            (m.zone || '').toLowerCase().includes(term)
        );
    }, [machines, machineSearch, selectedMachine]);

    // Load initial parts on mount
    useEffect(() => {
        let isMounted = true;
        setIsSearchingParts(true);
        inventoryService.getAllParts(1, 50)
            .then(res => {
                if (!isMounted) return;
                setParts(res.data);
                setIsSearchingParts(false);
            })
            .catch(err => {
                console.error('Error fetching initial parts:', err);
                if (isMounted) setIsSearchingParts(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    // Resolve part names for initial data in edit mode
    useEffect(() => {
        if (!initialData || !initialData.items || initialData.items.length === 0) return;

        let isMounted = true;
        const resolveNames = async () => {
            const resolved = await Promise.all(
                initialData.items.map(async item => {
                    try {
                        const part = await inventoryService.getPartById(item.partId);
                        return {
                            partId: item.partId,
                            quantity: item.quantityRequested,
                            partName: part ? `${part.partNumber} - ${part.name}` : item.partId,
                            usageLocation: item.usageLocation,
                            quantityDelivered: item.quantityDelivered
                        };
                    } catch {
                        return {
                            partId: item.partId,
                            quantity: item.quantityRequested,
                            partName: item.partId,
                            usageLocation: item.usageLocation,
                            quantityDelivered: item.quantityDelivered
                        };
                    }
                })
            );
            if (isMounted) {
                setRequestItems(resolved);
            }
        };

        resolveNames();
        return () => {
            isMounted = false;
        };
    }, [initialData]);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Dynamic backend search when user types
    useEffect(() => {
        if (selectedPart && searchTerm === `${selectedPart.partNumber} - ${selectedPart.name}`) {
            setIsSearchingParts(false);
            return;
        }

        let isMounted = true;
        setIsSearchingParts(true);

        const trimmed = debouncedSearch.trim();
        inventoryService.getAllParts(1, 50, trimmed ? { search: trimmed } : undefined)
            .then(res => {
                if (!isMounted) return;
                setParts(res.data);
                setIsSearchingParts(false);
            })
            .catch(err => {
                console.error('Error searching parts:', err);
                if (isMounted) setIsSearchingParts(false);
            });

        return () => {
            isMounted = false;
        };
    }, [debouncedSearch]);

    const isStockInsufficient = selectedPart && quantity > selectedPart.currentStock;

    const addItem = () => {
        if (!selectedPart) return;

        setRequestItems(prev => [
            ...prev,
            {
                partId: selectedPart.id,
                quantity: quantity,
                partName: `${selectedPart.partNumber} - ${selectedPart.name}`,
                usageLocation: usageLocation.trim() || undefined
            }
        ]);

        // Reset item fields
        setSelectedPart(null);
        setSelectedPartId('');
        setSearchTerm('');
        setQuantity(1);
        setUsageLocation('');
        setMachineSearch('');
        setSelectedMachine(null);
    };

    const startEditing = async (index: number) => {
        const item = requestItems[index];
        setEditingItemIndex(index);
        setSelectedPartId(item.partId);
        setSearchTerm(item.partName);
        setQuantity(item.quantity);
        setUsageLocation(item.usageLocation || '');
        setMachineSearch(item.usageLocation || '');
        if (item.usageLocation) {
            const target = item.usageLocation.toLowerCase();
            const matchedMachine = machines.find(
                m =>
                    formatMachineLabel(m).toLowerCase() === target ||
                    (m.name || '').toLowerCase() === target ||
                    `${m.name} (${m.code || m.plate})`.toLowerCase() === target
            );
            setSelectedMachine(matchedMachine || null);
        } else {
            setSelectedMachine(null);
        }

        const found = parts.find(p => p.id === item.partId);
        if (found) {
            setSelectedPart(found);
        } else {
            const fetched = await inventoryService.getPartById(item.partId);
            if (fetched) {
                setSelectedPart(fetched);
            }
        }
    };

    const updateItem = () => {
        if (!selectedPart || editingItemIndex === null) return;

        const updatedItems = [...requestItems];
        const currentItem = updatedItems[editingItemIndex];

        // Validation: Cannot reduce quantity below delivered
        if (currentItem.quantityDelivered && quantity < currentItem.quantityDelivered) {
            alert(`No puedes reducir la cantidad por debajo de lo ya entregado (${currentItem.quantityDelivered}).`);
            return;
        }

        updatedItems[editingItemIndex] = {
            ...currentItem,
            partId: selectedPart.id,
            quantity: quantity,
            partName: `${selectedPart.partNumber} - ${selectedPart.name}`,
            usageLocation: usageLocation.trim() || undefined
        };

        setRequestItems(updatedItems);
        cancelEdit();
    };

    const cancelEdit = () => {
        setEditingItemIndex(null);
        setSelectedPart(null);
        setSelectedPartId('');
        setSearchTerm('');
        setQuantity(1);
        setUsageLocation('');
        setMachineSearch('');
        setSelectedMachine(null);
    };

    const removeItem = (index: number) => {
        const newItems = [...requestItems];
        newItems.splice(index, 1);
        setRequestItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (initialData && !canEdit) {
            setFeedback({ type: 'error', message: 'No tiene permisos para editar solicitudes de repuestos.' });
            return;
        }
        if (!initialData && !canCreate) {
            setFeedback({ type: 'error', message: 'No tiene permisos para crear solicitudes de repuestos.' });
            return;
        }
        if (!technicianId.trim()) {
            setShowRequesterError(true);
            return;
        }
        setShowRequesterError(false);
        setIsSubmitting(true);
        try {
            if (initialData) {
                // UPDATE logic
                await inventoryService.updateRequest({
                    ...initialData,
                    technicianId,
                    priority,
                    items: requestItems.map(i => ({
                        partId: i.partId,
                        quantityRequested: i.quantity,
                        quantityDelivered: i.quantityDelivered || 0, // Preserve delivered
                        usageLocation: i.usageLocation
                    }))
                });
                setFeedback({ type: 'success', message: 'Solicitud actualizada exitosamente.' });
                if (onSuccess) onSuccess();
            } else {
                // CREATE logic
                await inventoryService.createRequest({
                    technicianId,
                    priority,
                    items: requestItems.map(i => ({
                        partId: i.partId,
                        quantity: i.quantity,
                        usageLocation: i.usageLocation
                    }))
                });
                setFeedback({ type: 'success', message: 'Solicitud creada exitosamente.' });
                // Reset form
                setRequestItems([]);
                setTechnicianId('');
                setSelectedRequester(null);
                setRequesterSearch('');
                setShowRequesterError(false);
                setPriority('NORMAL');
            }
        } catch (error) {
            console.error(error);
            setFeedback({ type: 'error', message: 'Error al procesar la solicitud.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-industrial-800 rounded-lg shadow-xl border border-industrial-700 p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="p-1 bg-industrial-900 rounded border border-industrial-600">
                    <Plus className="w-5 h-5 text-industrial-accent" />
                </span>
                {initialData ? 'Editar Solicitud' : 'Nueva Solicitud de Repuestos'}
            </h2>

            {feedback && (
                <div className={`mb-6 p-4 rounded-lg flex items-center border ${feedback.type === 'success' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>
                    <span className="text-sm font-medium">{feedback.message}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative">
                        <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-2">
                            Solicitante <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-industrial-500 w-4 h-4 pointer-events-none" />
                            <input
                                type="text"
                                className={`w-full bg-industrial-900 border rounded-lg pl-10 pr-10 py-2.5 text-white outline-none focus:ring-2 transition-colors placeholder-industrial-600 ${
                                    showRequesterError
                                        ? 'border-red-500 focus:ring-red-500/40'
                                        : 'border-industrial-600 focus:ring-industrial-accent'
                                }`}
                                placeholder="Buscar y seleccionar usuario..."
                                value={requesterSearch}
                                onFocus={() => setIsRequesterDropdownOpen(true)}
                                onBlur={() => setTimeout(() => setIsRequesterDropdownOpen(false), 200)}
                                onChange={e => {
                                    const val = e.target.value;
                                    setRequesterSearch(val);
                                    setIsRequesterDropdownOpen(true);
                                    if (selectedRequester || technicianId) {
                                        setSelectedRequester(null);
                                        setTechnicianId('');
                                    }
                                    if (showRequesterError) setShowRequesterError(false);
                                }}
                            />
                            {(requesterSearch || selectedRequester) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRequesterSearch('');
                                        setSelectedRequester(null);
                                        setTechnicianId('');
                                        setIsRequesterDropdownOpen(true);
                                    }}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-industrial-500 hover:text-white transition-colors"
                                    title="Limpiar selección"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {isRequesterDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-industrial-800 border border-industrial-600 rounded-lg shadow-2xl max-h-60 overflow-y-auto">
                                {isLoadingUsers ? (
                                    <div className="px-4 py-3 text-industrial-400 text-sm flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-industrial-accent" />
                                        <span>Cargando usuarios...</span>
                                    </div>
                                ) : filteredRequesters.length > 0 ? (
                                    <ul className="py-1">
                                        {filteredRequesters.map(user => {
                                            const displayName = user.full_name || user.email;
                                            const isSelected = selectedRequester?.id === user.id || technicianId === displayName;
                                            return (
                                                <li
                                                    key={user.id}
                                                    className={`px-4 py-2.5 cursor-pointer flex items-center gap-3 hover:bg-industrial-700 border-b border-industrial-700/50 last:border-0 ${isSelected ? 'bg-blue-900/30' : ''}`}
                                                    onMouseDown={e => {
                                                        e.preventDefault();
                                                        setSelectedRequester(user);
                                                        setTechnicianId(displayName);
                                                        setRequesterSearch(displayName);
                                                        setIsRequesterDropdownOpen(false);
                                                        setShowRequesterError(false);
                                                    }}
                                                >
                                                    <div className="w-7 h-7 rounded-full bg-industrial-700 border border-industrial-600 flex items-center justify-center flex-shrink-0">
                                                        <User className="w-3.5 h-3.5 text-industrial-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white text-sm font-medium truncate">{user.full_name || 'Sin nombre'}</p>
                                                        <p className="text-industrial-500 text-xs truncate">
                                                            {user.email}{user.job_title ? ` • ${user.job_title}` : ''}
                                                        </p>
                                                    </div>
                                                    {isSelected && (
                                                        <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <div className="px-4 py-3 text-industrial-500 text-sm italic text-center">
                                        No se encontraron usuarios.
                                    </div>
                                )}
                            </div>
                        )}

                        {showRequesterError && (
                            <p className="text-xs text-red-400 mt-1.5 font-medium">
                                Debe seleccionar un usuario de la lista.
                            </p>
                        )}
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
                            <option value="EMERGENCY">Urgente</option>
                        </select>
                    </div>
                </div>

                <div className="border-t border-industrial-700 py-6">
                    <h3 className="text-lg font-bold text-white mb-4">Agregar Repuestos</h3>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                        <div className="md:col-span-5 relative">
                            <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-2">Repuesto (Buscar por nombre o código)</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-industrial-500 w-4 h-4 pointer-events-none" />
                                <input
                                    type="text"
                                    className="w-full bg-industrial-900 border border-industrial-600 rounded-lg pl-10 pr-9 py-2.5 text-white outline-none focus:ring-2 focus:ring-industrial-accent transition-colors placeholder-industrial-600"
                                    placeholder="Buscar repuesto..."
                                    value={searchTerm}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    // Delay hiding to allow click event on option to fire
                                    onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setSearchTerm(val);
                                        setIsDropdownOpen(true);
                                        if (selectedPart) {
                                            setSelectedPart(null);
                                            setSelectedPartId('');
                                        }
                                        setIsSearchingParts(true);
                                    }}
                                />
                                {(searchTerm || selectedPart) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchTerm('');
                                            setSelectedPart(null);
                                            setSelectedPartId('');
                                            setIsDropdownOpen(true);
                                        }}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-industrial-500 hover:text-white transition-colors"
                                        title="Limpiar selección"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Floating Dropdown */}
                            {isDropdownOpen && (
                                <div className="absolute z-50 w-full mt-1 bg-industrial-800 border border-industrial-600 rounded-lg shadow-2xl max-h-60 overflow-y-auto">
                                    {isSearchingParts ? (
                                        <div className="px-4 py-3 text-industrial-400 text-sm flex items-center justify-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-industrial-accent" />
                                            <span>Buscando repuestos...</span>
                                        </div>
                                    ) : parts.length > 0 ? (
                                        <ul className="py-1">
                                            {parts.map(p => {
                                                const isSelected = selectedPartId === p.id;
                                                return (
                                                    <li
                                                        key={p.id}
                                                        className={`px-4 py-2.5 cursor-pointer flex items-center justify-between gap-3 hover:bg-industrial-700 border-b border-industrial-700/50 last:border-0 ${isSelected ? 'bg-blue-900/30' : ''}`}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault(); // Prevent input blur
                                                            setSelectedPart(p);
                                                            setSelectedPartId(p.id);
                                                            setSearchTerm(`${p.partNumber} - ${p.name}`);
                                                            setIsDropdownOpen(false);
                                                        }}
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-white text-sm font-medium truncate">{p.name}</p>
                                                            <p className="text-industrial-500 text-xs truncate">{p.partNumber}</p>
                                                        </div>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap flex-shrink-0 ${p.currentStock > 0 ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                                                            Stock: {p.currentStock}
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : (
                                        <div className="px-4 py-3 text-industrial-500 text-sm italic text-center">
                                            No se encontraron repuestos.
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedPart && !isDropdownOpen && (
                                <p className="mt-2 text-xs text-industrial-400">
                                    Stock Disponible: <span className="font-bold text-white ml-1">{selectedPart.currentStock} {selectedPart.unitOfMeasure}</span>
                                </p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-2">Cantidad</label>
                            <input
                                type="number"
                                min="1"
                                className="w-full bg-industrial-900 border border-industrial-600 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-industrial-accent transition-colors font-mono"
                                value={quantity || ''}
                                onFocus={e => e.target.select()}
                                onChange={e => {
                                    const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                    setQuantity(isNaN(val) ? 0 : val);
                                }}
                            />
                        </div>

                        <div className="md:col-span-5 relative">
                            <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-2">Lugar de Uso (Equipo)</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-industrial-500 w-4 h-4 pointer-events-none" />
                                <input
                                    type="text"
                                    className="w-full bg-industrial-900 border border-industrial-600 rounded-lg pl-10 pr-9 py-2.5 text-white outline-none focus:ring-2 focus:ring-industrial-accent transition-colors placeholder-industrial-600"
                                    placeholder="Buscar equipo..."
                                    value={machineSearch}
                                    onFocus={() => setIsMachineDropdownOpen(true)}
                                    onBlur={() => setTimeout(() => setIsMachineDropdownOpen(false), 200)}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setMachineSearch(val);
                                        setIsMachineDropdownOpen(true);
                                        if (selectedMachine || usageLocation) {
                                            setSelectedMachine(null);
                                            setUsageLocation('');
                                        }
                                    }}
                                />
                                {(machineSearch || selectedMachine) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMachineSearch('');
                                            setSelectedMachine(null);
                                            setUsageLocation('');
                                            setIsMachineDropdownOpen(true);
                                        }}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-industrial-500 hover:text-white transition-colors"
                                        title="Limpiar selección"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {isMachineDropdownOpen && (
                                <div className="absolute z-50 w-full mt-1 bg-industrial-800 border border-industrial-600 rounded-lg shadow-2xl max-h-60 overflow-y-auto">
                                    {isLoadingMachines ? (
                                        <div className="px-4 py-3 text-industrial-400 text-sm flex items-center justify-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-industrial-accent" />
                                            <span>Cargando equipos...</span>
                                        </div>
                                    ) : filteredMachines.length > 0 ? (
                                        <ul className="py-1">
                                            {filteredMachines.map(machine => {
                                                const label = formatMachineLabel(machine);
                                                const isSelected = selectedMachine?.id === machine.id || usageLocation === label;
                                                const subtitle = [
                                                    machine.name && machine.name !== label ? machine.name : '',
                                                    machine.brand,
                                                    machine.model,
                                                    machine.zone
                                                ]
                                                    .filter(Boolean)
                                                    .join(' • ');
                                                return (
                                                    <li
                                                        key={machine.id}
                                                        className={`px-4 py-2.5 cursor-pointer flex items-center justify-between gap-3 hover:bg-industrial-700 border-b border-industrial-700/50 last:border-0 ${isSelected ? 'bg-blue-900/30' : ''}`}
                                                        onMouseDown={e => {
                                                            e.preventDefault();
                                                            setSelectedMachine(machine);
                                                            setUsageLocation(label);
                                                            setMachineSearch(label);
                                                            setIsMachineDropdownOpen(false);
                                                        }}
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-white text-sm font-medium truncate">{label}</p>
                                                            {subtitle && (
                                                                <p className="text-industrial-500 text-xs truncate">{subtitle}</p>
                                                            )}
                                                        </div>
                                                        {isSelected && (
                                                            <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : (
                                        <div className="px-4 py-3 text-industrial-500 text-sm italic text-center">
                                            No se encontraron equipos.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="md:col-span-12 flex justify-end mt-2">
                            <button
                                type="button"
                                onClick={editingItemIndex !== null ? updateItem : addItem}
                                disabled={!selectedPart || quantity <= 0}
                                className={`px-6 py-2.5 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center ${editingItemIndex !== null ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-industrial-accent hover:bg-blue-600'
                                    }`}
                            >
                                {editingItemIndex !== null ? (
                                    <>
                                        <SaveIcon className="w-4 h-4 mr-2" />
                                        Actualizar Item
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Agregar
                                    </>
                                )}
                            </button>
                            {editingItemIndex !== null && (
                                <button
                                    type="button"
                                    onClick={cancelEdit}
                                    className="ml-2 px-4 py-2.5 border border-industrial-600 rounded-lg text-sm font-bold text-industrial-300 hover:bg-industrial-700 transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
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
                                    <div className="flex items-center flex-1">
                                        <div className="w-2 h-2 rounded-full bg-industrial-accent mr-3"></div>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-white">{item.partName}</span>
                                            {item.usageLocation && (
                                                <span className="text-xs text-industrial-400">Uso: {item.usageLocation}</span>
                                            )}
                                        </div>
                                        <span className="text-sm text-industrial-400 ml-auto mr-4 font-mono bg-industrial-900 px-2 py-0.5 rounded">x{item.quantity}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => startEditing(index)}
                                        className="text-industrial-500 hover:text-yellow-400 transition-colors p-1"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        disabled={item.quantityDelivered ? item.quantityDelivered > 0 : false}
                                        title={item.quantityDelivered && item.quantityDelivered > 0 ? "Ya se han entregado items" : "Eliminar"}
                                        className="text-industrial-500 hover:text-red-400 transition-colors p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="flex justify-end pt-4 border-t border-industrial-700">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isSubmitting}
                            className="px-6 py-2.5 mr-3 border border-industrial-600 rounded-lg text-sm font-bold text-industrial-300 hover:bg-industrial-700 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancelar
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={requestItems.length === 0 || isSubmitting}
                        className="px-6 py-2.5 border border-transparent rounded-lg shadow-lg shadow-emerald-900/20 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isSubmitting ? 'Procesando...' : (initialData ? 'Guardar Cambios' : 'Crear Solicitud')}
                    </button>
                </div>
            </form>
        </div>
    );
};
