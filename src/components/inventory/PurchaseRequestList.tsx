import React, { useState, useEffect } from 'react';
import { inventoryService } from '../../services';
import { ExtendedPurchaseRequest, SparePart } from '../../types/inventory';
import { Search, FileText, Clock, ChevronDown, ChevronRight, Plus, Download, Eye, X, Package } from 'lucide-react';
import { exportPurchaseRequestPDF } from '../../utils/pdfExport';
import { TablePagination } from '../shared/TablePagination';

export const PurchaseRequestList: React.FC = () => {
    const [requests, setRequests] = useState<ExtendedPurchaseRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Direct Purchase States
    const [showDirectModal, setShowDirectModal] = useState(false);
    const [availableParts, setAvailableParts] = useState<SparePart[]>([]);
    const [selectedItems, setSelectedItems] = useState<{ partId: string; quantity: number, partName: string }[]>([
        { partId: '', quantity: 1, partName: '' }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Detail Modal State
    const [selectedRequest, setSelectedRequest] = useState<ExtendedPurchaseRequest | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);

    const handleStatusChange = async (newStatus: 'Pendiente' | 'Parcial' | 'Recibido' | 'Cancelado') => {
        if (!selectedRequest) return;
        setIsUpdatingStatus(true);
        setShowStatusDropdown(false);
        try {
            await inventoryService.updatePurchaseRequestStatus(selectedRequest.id, newStatus);
            setSelectedRequest({ ...selectedRequest, status: newStatus });
            setRequests(requests.map(r => r.id === selectedRequest.id ? { ...r, status: newStatus } : r));
        } catch (error) {
            console.error('Error al actualizar el estado:', error);
            alert('Asegúrate de haber ejecutado la migración de la base de datos para habilitar los nuevos estados.');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            const res = await inventoryService.getAllPurchaseRequests(currentPage, 50, { searchTerm });
            setRequests(res.data);
            setTotalItems(res.total);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            loadData();
        }, 400);
        return () => clearTimeout(timer);
    }, [currentPage, searchTerm]);

    useEffect(() => {
        const loadParts = async () => {
            try {
                const partsRes = await inventoryService.getAllParts(1, 1000);
                setAvailableParts(partsRes.data);
            } catch (err) {
                console.error('Error loading parts:', err);
            }
        };
        loadParts();
    }, []);

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    const handleAddDirectItem = () => {
        setSelectedItems([...selectedItems, { partId: '', quantity: 1, partName: '' }]);
    };

    const handleCreateDirectRequest = async () => {
        const validItems = selectedItems.filter(item => item.partId && item.quantity > 0);
        if (validItems.length === 0) return;

        setIsSubmitting(true);
        try {
            await inventoryService.createDirectPurchaseRequest(validItems);
            alert('✅ Solicitud directa creada exitosamente.');
            setShowDirectModal(false);
            setSelectedItems([]);
            loadData();
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Error al crear la solicitud de compra. Por favor, verifica la conexión o contacta a soporte.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Grouping logic
    const groupedRequests = requests.reduce((acc, req) => {
        const key = req.sourceRequestNumber
            ? `SPR (${req.sourceRequestNumber})`
            : `DIRECTO (${req.purchaseRequestNumber})`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(req);
        return acc;
    }, {} as Record<string, ExtendedPurchaseRequest[]>);

    const filteredGroupKeys = Object.keys(groupedRequests).filter(key =>
        key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        groupedRequests[key].some(r =>
            r.purchaseRequestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.sparePartName?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-industrial-500 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Buscar por SPR, código o repuesto..."
                        className="w-full bg-industrial-800 border border-industrial-700 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-industrial-accent"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => { setShowDirectModal(true); setSelectedItems([{ partId: '', quantity: 1, partName: '' }]); }}
                    className="px-4 py-2 bg-industrial-accent hover:bg-industrial-accent/90 text-white text-sm font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Solicitud Directa
                </button>
            </div>

            {isLoading ? (
                <div className="p-12 text-center italic text-industrial-500">Cargando solicitudes de compra...</div>
            ) : filteredGroupKeys.length === 0 ? (
                <div className="p-12 text-center italic text-industrial-500">No se encontraron solicitudes.</div>
            ) : (
                <div className="space-y-4">
                    {filteredGroupKeys.map(key => (
                        <div key={key} className="bg-industrial-800 rounded-xl border border-industrial-700 overflow-hidden shadow-sm">
                            <button
                                onClick={() => toggleGroup(key)}
                                className="w-full px-6 py-4 flex items-center justify-between bg-industrial-900/50 hover:bg-industrial-900 transition-colors border-b border-industrial-700"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-1 rounded transition-colors ${expandedGroups[key] ? 'bg-industrial-700 text-white' : 'text-industrial-500'}`}>
                                        {expandedGroups[key] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-white font-bold flex items-center gap-2">
                                            Origen: <span className={key.startsWith('DIRECTO') ? 'text-yellow-400' : 'text-blue-400'}>{key}</span>
                                            <span className="text-[10px] bg-industrial-700 px-2 py-0.5 rounded text-industrial-300 ml-2">
                                                {groupedRequests[key].reduce((sum, req) => sum + req.items.length, 0)} Solicitud(es)
                                            </span>
                                        </h3>
                                        <p className="text-[10px] text-industrial-500 font-medium">Última actualización: {new Date(groupedRequests[key][0].requestDate).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </button>

                            {expandedGroups[key] && (
                                <div className="divide-y divide-industrial-700">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-industrial-900/30 text-[10px] uppercase text-industrial-500 font-bold">
                                            <tr>
                                                <th className="px-6 py-3">Código</th>
                                                <th className="px-6 py-3">Repuesto</th>
                                                <th className="px-6 py-3 text-center">Cant.</th>
                                                <th className="px-6 py-3">Fecha</th>
                                                <th className="px-6 py-3 text-center">Estado</th>
                                                <th className="px-6 py-3 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-industrial-700">
                                            {groupedRequests[key].map(req => (
                                                <tr key={req.id} className="hover:bg-industrial-700/20 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <span className="text-white font-medium">{req.purchaseRequestNumber}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-industrial-200">
                                                            {req.items.length === 1 ? req.items[0].partName : req.items.length > 1 ? `Varios Repuestos (${req.items.length})` : 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-mono text-white text-xs">
                                                        {req.items.reduce((acc, i) => acc + i.quantity, 0)}
                                                    </td>
                                                    <td className="px-6 py-4 text-industrial-400 text-xs">
                                                        {new Date(req.requestDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${req.status === 'Recibido'
                                                            ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800'
                                                            : req.status === 'Cancelado'
                                                                ? 'bg-red-900/30 text-red-400 border border-red-800'
                                                                : req.status === 'Parcial'
                                                                    ? 'bg-blue-900/30 text-blue-400 border border-blue-800'
                                                                    : 'bg-yellow-900/30 text-yellow-500 border border-yellow-800'
                                                            }`}>
                                                            {req.status || 'Pendiente'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => setSelectedRequest(req)}
                                                                className="p-1.5 bg-industrial-700 hover:bg-industrial-600 rounded-lg text-industrial-300 hover:text-white transition-all"
                                                                title="Ver Detalles"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => exportPurchaseRequestPDF(req)}
                                                                className="p-1.5 bg-industrial-700 hover:bg-blue-600 rounded-lg text-industrial-300 hover:text-white transition-all"
                                                                title="Exportar PDF"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}

                    {totalItems > 0 && (
                        <div className="mt-6 border-t border-industrial-700/50 pt-4">
                            <TablePagination
                                totalItems={totalItems}
                                itemsPerPage={50}
                                currentPage={currentPage}
                                onPageChange={setCurrentPage}
                                isLoading={isLoading}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Modal: Nueva Solicitud Directa */}
            {showDirectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-industrial-800 rounded-xl shadow-2xl border border-industrial-600 w-full max-w-2xl overflow-hidden animate-slide-up">
                        <div className="bg-industrial-900 p-6 border-b border-industrial-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Plus className="w-6 h-6 text-industrial-accent" />
                                Nueva Solicitud Directa
                            </h3>
                            <button onClick={() => setShowDirectModal(false)} className="text-industrial-500 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                            {selectedItems.map((item, index) => (
                                <div key={index} className="flex gap-4 items-end bg-industrial-900/50 p-4 rounded-lg border border-industrial-700/50">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-industrial-500 uppercase mb-2">Repuesto</label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                className={`w-full bg-industrial-800 border ${!item.partId && item.partName ? 'border-blue-500' : 'border-industrial-600'} rounded py-2 px-3 text-white text-sm focus:outline-none focus:border-industrial-accent`}
                                                placeholder="Buscar repuesto por nombre o código..."
                                                value={item.partName}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const newItems = [...selectedItems];
                                                    newItems[index] = { ...newItems[index], partName: val, partId: '' }; // Clear ID while typing
                                                    setSelectedItems(newItems);
                                                }}
                                            />
                                            {/* Custom Dropdown Results */}
                                            {!item.partId && item.partName && (
                                                <div className="absolute left-0 top-full mt-1 w-full z-50 bg-industrial-800 border border-industrial-600 rounded-md shadow-xl max-h-60 overflow-y-auto">
                                                    {availableParts.filter(p =>
                                                        p.name.toLowerCase().includes(item.partName.toLowerCase()) ||
                                                        p.partNumber.toLowerCase().includes(item.partName.toLowerCase())
                                                    ).length > 0 ? (
                                                        availableParts.filter(p =>
                                                            p.name.toLowerCase().includes(item.partName.toLowerCase()) ||
                                                            p.partNumber.toLowerCase().includes(item.partName.toLowerCase())
                                                        ).map(sp => (
                                                            <div
                                                                key={sp.id}
                                                                className="p-3 hover:bg-industrial-700 cursor-pointer border-b border-industrial-700/50 last:border-0 flex justify-between items-center gap-3 transition-colors"
                                                                onClick={() => {
                                                                    const newItems = [...selectedItems];
                                                                    newItems[index] = {
                                                                        ...newItems[index],
                                                                        partId: sp.id,
                                                                        partName: `${sp.name} (${sp.partNumber})`,
                                                                    };
                                                                    setSelectedItems(newItems);
                                                                }}
                                                            >
                                                                <div className="flex flex-col flex-1 min-w-0">
                                                                    <span className="text-white text-sm font-bold truncate">
                                                                        {sp.name}
                                                                    </span>
                                                                    <span className="text-industrial-400 text-[10px] mt-0.5">
                                                                        Código: <span className="text-blue-400 font-mono">{sp.partNumber}</span>
                                                                    </span>
                                                                </div>
                                                                <div className={`flex-shrink-0 text-[10px] px-2 py-1 rounded font-bold ${sp.currentStock <= sp.minStock
                                                                    ? 'bg-red-900/50 text-red-400 border border-red-500/30'
                                                                    : 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/30'
                                                                    }`}>
                                                                    Stock: {sp.currentStock}
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-4 text-industrial-500 text-sm italic text-center">No se encontraron repuestos</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="w-24">
                                        <label className="block text-xs font-bold text-industrial-500 uppercase mb-2">Cantidad</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-full bg-industrial-800 border border-industrial-600 rounded py-2 px-3 text-white text-sm focus:outline-none focus:border-industrial-accent"
                                            value={item.quantity}
                                            onChange={(e) => {
                                                const newItems = [...selectedItems];
                                                newItems[index].quantity = parseInt(e.target.value);
                                                setSelectedItems(newItems);
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center pb-1">
                                        <button
                                            onClick={() => {
                                                const newItems = [...selectedItems];
                                                newItems.splice(index, 1);
                                                setSelectedItems(newItems);
                                            }}
                                            className="text-red-500 hover:bg-red-900/20 rounded transition-colors p-2 h-[38px] flex items-center justify-center"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={handleAddDirectItem}
                                className="w-full py-3 border-2 border-dashed border-industrial-700 rounded-lg text-industrial-500 hover:text-industrial-300 hover:border-industrial-500 transition-all flex items-center justify-center gap-2 font-bold"
                            >
                                <Plus className="w-4 h-4" />
                                Añadir otro repuesto
                            </button>
                        </div>
                        <div className="p-6 bg-industrial-900/50 border-t border-industrial-700 flex gap-4">
                            <button
                                onClick={() => setShowDirectModal(false)}
                                className="flex-1 py-3 text-industrial-400 font-bold hover:bg-industrial-700 rounded-lg transition-colors border border-industrial-700"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateDirectRequest}
                                className="flex-1 py-3 bg-industrial-accent text-white font-bold hover:bg-industrial-accent/90 rounded-lg transition-all shadow-lg"
                                disabled={isSubmitting || selectedItems.some(i => !i.partId)}
                            >
                                {isSubmitting ? 'Generando...' : 'Generar Solicitud de Compra'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Detalle de Solicitud */}
            {selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-industrial-800 rounded-xl shadow-2xl border border-industrial-600 w-full max-w-xl overflow-hidden animate-slide-up">
                        <div className="bg-industrial-900 p-6 border-b border-industrial-700 flex justify-between items-center text-white">
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Package className="w-6 h-6 text-blue-400" />
                                    Requisición {selectedRequest.purchaseRequestNumber}
                                </h3>
                                <p className="text-xs text-industrial-500 font-mono mt-0.5">ID: {selectedRequest.id}</p>
                            </div>
                            <button onClick={() => setSelectedRequest(null)} className="text-industrial-500 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-3 gap-8 bg-industrial-900/40 p-5 rounded-xl border border-industrial-700">
                                <div className="space-y-1">
                                    <span className="text-[10px] text-industrial-500 uppercase font-black tracking-widest">Fecha de Requisición</span>
                                    <p className="text-white font-medium flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-industrial-600" />
                                        {new Date(selectedRequest.requestDate).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] text-industrial-500 uppercase font-black tracking-widest">Solicitud de Origen</span>
                                    <p className="font-bold flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-xs ${selectedRequest.sourceRequestNumber ? 'bg-blue-900/30 text-blue-400 border border-blue-800' : 'bg-yellow-900/30 text-yellow-500 border border-yellow-800'}`}>
                                            {selectedRequest.sourceRequestNumber || 'DIRECTO'}
                                        </span>
                                    </p>
                                </div>
                                <div className="space-y-1 relative">
                                    <span className="text-[10px] text-industrial-500 uppercase font-black tracking-widest">Resumen General</span>
                                    <div>
                                        <button
                                            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                            disabled={isUpdatingStatus}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
                                                } ${selectedRequest.status === 'Recibido'
                                                    ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800'
                                                    : selectedRequest.status === 'Cancelado'
                                                        ? 'bg-red-900/30 text-red-400 border-red-800'
                                                        : selectedRequest.status === 'Parcial'
                                                            ? 'bg-blue-900/30 text-blue-400 border-blue-800'
                                                            : 'bg-yellow-900/30 text-yellow-500 border-yellow-800'
                                                }`}
                                        >
                                            <span className="text-xs font-black uppercase tracking-wider">{selectedRequest.status || 'Pendiente'}</span>
                                            <ChevronDown className="w-3 h-3" />
                                        </button>

                                        {showStatusDropdown && (
                                            <div className="absolute top-full mt-2 left-0 w-40 bg-industrial-800 rounded-lg shadow-xl border border-industrial-700 overflow-hidden z-[60]">
                                                {['Pendiente', 'Parcial', 'Recibido', 'Cancelado'].map((statusOption) => (
                                                    <button
                                                        key={statusOption}
                                                        onClick={() => handleStatusChange(statusOption as any)}
                                                        className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors ${selectedRequest.status === statusOption
                                                            ? 'bg-industrial-700/50 text-white'
                                                            : 'text-industrial-400 hover:bg-industrial-700 hover:text-white'
                                                            }`}
                                                    >
                                                        {statusOption}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-industrial-500 uppercase tracking-widest border-b border-industrial-700 pb-2">Items Solicitados</h4>
                                <div className="space-y-3">
                                    {selectedRequest.items.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center p-4 bg-industrial-900/20 rounded-lg border border-industrial-700/50 hover:border-industrial-600 transition-all">
                                            <div className="flex gap-4 items-center">
                                                <div className="w-10 h-10 bg-industrial-900 flex items-center justify-center rounded-lg border border-industrial-700 font-mono text-white text-lg font-bold">
                                                    {item.quantity}
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold">{item.partName || selectedRequest.sparePartName}</p>
                                                    <p className="text-[10px] text-industrial-500 font-mono">{item.partNumber || selectedRequest.sparePartNumber}</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] bg-yellow-900/30 text-yellow-500 font-black px-3 py-1 rounded-full border border-yellow-800 shadow-sm shadow-black">
                                                PENDIENTE
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-industrial-900/80 border-t border-industrial-700 flex gap-4">
                            <button
                                onClick={() => setSelectedRequest(null)}
                                className="px-6 py-3 text-industrial-400 font-bold hover:text-white transition-colors"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={() => exportPurchaseRequestPDF(selectedRequest)}
                                className="flex-1 py-3 bg-white text-industrial-900 font-black hover:bg-industrial-100 rounded-lg transition-all flex items-center justify-center gap-3 shadow-xl"
                            >
                                <Download className="w-5 h-5" />
                                EXPORTAR REQUISICIÓN (PDF)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
