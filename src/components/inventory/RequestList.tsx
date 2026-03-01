import React, { useEffect, useState } from 'react';
import { inventoryService } from '../../services';
import { PartsRequest } from '../../types/inventory';
import { FileText, AlertCircle, CheckCircle, Clock, ChevronRight, Search, Download, Filter, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SparePart } from '../../types/inventory'; // Need this to lookup part names if not in request item


import { useMasterStore } from '../../stores/useMasterStore';

import { TablePagination } from '../shared/TablePagination';

// Service initialized in index.ts

interface RequestListProps {
    onSelectRequest: (request: PartsRequest) => void;
}

export const RequestList: React.FC<RequestListProps> = ({ onSelectRequest }) => {
    const [requests, setRequests] = useState<PartsRequest[]>([]);
    const [parts, setParts] = useState<SparePart[]>([]); // Need parts to show names in report
    const { plantSettings } = useMasterStore();
    const [loading, setLoading] = useState(false);

    // Refs for date pickers
    const startDateRef = React.useRef<HTMLInputElement>(null);
    const endDateRef = React.useRef<HTMLInputElement>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Pagination state
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

    useEffect(() => {
        loadData();
    }, [pagination.page]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [reqs, partsData] = await Promise.all([
                inventoryService.getAllRequests(),
                inventoryService.getAllParts(1, 1000) // Fetch many for lookup
            ]);
            setRequests(reqs);
            setParts(partsData.data);
            setPagination(prev => ({ ...prev, total: reqs.length }));
        } catch (error) {
            console.error("Error loading requests:", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredRequests = requests.filter(req => {
        const matchesSearch =
            req.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.technicianId.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' ? true : req.status === statusFilter;

        const matchesPriority = priorityFilter === 'all' ? true : req.priority === priorityFilter;

        const reqDate = new Date(req.createdDate);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        // Reset hours for accurate date comparison
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        const matchesDate = (!start || reqDate >= start) && (!end || reqDate <= end);

        return matchesSearch && matchesStatus && matchesPriority && matchesDate;
    });

    const generatePDF = () => {
        const doc = new jsPDF();

        // Logo & Header
        // Add Logo if available
        if (plantSettings.logoUrl) {
            try {
                const imgProps = doc.getImageProperties(plantSettings.logoUrl);
                const logoWidth = 30;
                const logoHeight = (imgProps.height * logoWidth) / imgProps.width;
                doc.addImage(plantSettings.logoUrl, 'PNG', 14, 10, logoWidth, logoHeight);
            } catch (e) {
                console.warn('Could not add logo to PDF', e);
            }
        } else {
            // Fallback text if no logo
            doc.setFontSize(14);
            doc.text(plantSettings.plantName || 'CoreFlow', 14, 20);
        }

        // Title (Resultados del Reporte)
        doc.setFontSize(16);
        doc.text('Reporte de Solicitudes de Repuestos', 14, 35);

        // Date
        doc.setFontSize(10);
        const dateStr = new Date().toLocaleDateString();
        doc.text(`Fecha de Emisión: ${dateStr}`, 14, 42);

        // REMOVED Filter Info as requested

        let yPos = 50;

        // Loop through filtered requests
        filteredRequests.forEach((req, index) => {
            // Check if we need a new page
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            // Request Header
            doc.setFontSize(12);
            doc.setFillColor(240, 240, 240);
            doc.rect(14, yPos - 5, 182, 10, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text(`${req.requestNumber} - ${new Date(req.createdDate).toLocaleDateString()} - ${req.technicianId} - ${getStatusLabel(req.status)}`, 16, yPos + 2);

            yPos += 10;

            // Items Table
            const tableBody = req.items.map(item => {
                const part = parts.find(p => p.id === item.partId);
                const status = item.quantityDelivered >= item.quantityRequested ? 'Completado' :
                    item.quantityDelivered > 0 ? 'Parcial' : 'Pendiente';

                // Get receiver name if available
                const receiver = req.deliveredTo
                    ? (useMasterStore.getState().technicians.find(t => t.id === req.deliveredTo)?.name || req.deliveredTo)
                    : '-';

                return [
                    part?.partNumber || 'N/A',
                    part?.name || item.partId,
                    item.usageLocation || '-',
                    item.quantityRequested,
                    item.quantityDelivered,
                    receiver,
                    status
                ];
            });

            autoTable(doc, {
                startY: yPos,
                head: [['Código', 'Repuesto', 'Lugar Uso', 'Solicitado', 'Entregado', 'Entregado a', 'Estado']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
                bodyStyles: { fontSize: 9 },
                margin: { left: 14, right: 14 }
            });

            // Update yPos for next iteration
            // @ts-ignore
            yPos = doc.lastAutoTable.finalY + 15;
        });

        doc.save('reporte_solicitudes.pdf');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN': return 'text-blue-400 bg-blue-900/30 border-blue-800';
            case 'PENDING_STOCK': return 'text-yellow-400 bg-yellow-900/30 border-yellow-800';
            case 'PARTIAL': return 'text-orange-400 bg-orange-900/30 border-orange-800';
            case 'CLOSED': return 'text-emerald-400 bg-emerald-900/30 border-emerald-800';
            default: return 'text-gray-400 bg-gray-800 border-gray-700';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'OPEN': return 'Abierto';
            case 'PENDING_STOCK': return 'Stock Pendiente';
            case 'PARTIAL': return 'Parcial';
            case 'CLOSED': return 'Cerrado';
            default: return status;
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'EMERGENCY': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'HIGH': return <AlertCircle className="w-4 h-4 text-orange-500" />;
            default: return <Clock className="w-4 h-4 text-blue-500" />;
        }
    };

    const getPriorityLabel = (priority: string) => {
        switch (priority) {
            case 'EMERGENCY': return 'Urgente';
            case 'HIGH': return 'Alta';
            case 'NORMAL': return 'Normal';
            default: return priority;
        }
    };

    return (
        <div className="bg-industrial-800 rounded-lg shadow-xl border border-industrial-700 overflow-hidden">
            <div className="p-4 border-b border-industrial-700 bg-industrial-900/50">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-industrial-400" />
                        Solicitudes de Repuestos
                    </h2>
                    <button
                        onClick={generatePDF}
                        disabled={filteredRequests.length === 0}
                        className="flex items-center px-4 py-2 bg-industrial-accent hover:bg-blue-600 text-white rounded-lg font-bold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Generar Reporte
                    </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
                    <div>
                        <label className="block text-xs font-bold text-industrial-500 uppercase tracking-wider mb-2">Buscar</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-industrial-400 h-4 w-4" />
                            <input
                                type="text"
                                placeholder="N° o Solicitante..."
                                className="w-full pl-9 pr-4 py-2 bg-industrial-900 border border-industrial-600 rounded-lg focus:ring-1 focus:ring-industrial-accent outline-none text-white text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-industrial-500 uppercase tracking-wider mb-2">Estado</label>
                        <select
                            className="w-full px-3 py-2 bg-industrial-900 border border-industrial-600 rounded-lg focus:ring-1 focus:ring-industrial-accent outline-none text-white text-sm"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">Todos</option>
                            <option value="OPEN">Abierto</option>
                            <option value="PENDING_STOCK">Stock Pendiente</option>
                            <option value="PARTIAL">Parcial</option>
                            <option value="CLOSED">Cerrado</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-industrial-500 uppercase tracking-wider mb-2">Prioridad</label>
                        <select
                            className="w-full px-3 py-2 bg-industrial-900 border border-industrial-600 rounded-lg focus:ring-1 focus:ring-industrial-accent outline-none text-white text-sm"
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                        >
                            <option value="all">Todas</option>
                            <option value="NORMAL">Normal</option>
                            <option value="HIGH">Alta</option>
                            <option value="EMERGENCY">Urgente</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-industrial-500 uppercase tracking-wider mb-2">Desde</label>
                        <div className="relative">
                            <input
                                ref={startDateRef}
                                type="date"
                                className="w-full pl-3 pr-10 py-2 bg-industrial-900 border border-industrial-600 rounded-lg focus:ring-1 focus:ring-industrial-accent outline-none text-white text-sm"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                            <button
                                onClick={() => startDateRef.current?.showPicker()}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-industrial-400 hover:text-white"
                            >
                                <Calendar className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-industrial-500 uppercase tracking-wider mb-2">Hasta</label>
                        <div className="relative">
                            <input
                                ref={endDateRef}
                                type="date"
                                className="w-full pl-3 pr-10 py-2 bg-industrial-900 border border-industrial-600 rounded-lg focus:ring-1 focus:ring-industrial-accent outline-none text-white text-sm"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                            <button
                                onClick={() => endDateRef.current?.showPicker()}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-industrial-400 hover:text-white"
                            >
                                <Calendar className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-industrial-900 text-industrial-400 text-xs uppercase font-semibold">
                        <tr>
                            <th className="px-6 py-4">N° Solicitud</th>
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4">Solicitante</th>
                            <th className="px-6 py-4">Prioridad</th>
                            <th className="px-6 py-4">Estado</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-industrial-700">
                        {filteredRequests.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-industrial-500">
                                    No hay solicitudes registradas.
                                </td>
                            </tr>

                        ) : (
                            filteredRequests.map((req) => (
                                <tr
                                    key={req.id}
                                    className="hover:bg-industrial-700/30 transition-colors cursor-pointer group"
                                    onClick={() => onSelectRequest(req)}
                                >
                                    <td className="px-6 py-4 text-white font-mono font-medium">{req.requestNumber}</td>
                                    <td className="px-6 py-4 text-industrial-300 text-sm">
                                        {new Date(req.createdDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-white">{req.technicianId}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-industrial-300">
                                            {getPriorityIcon(req.priority)}
                                            {getPriorityLabel(req.priority)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(req.status)}`}>
                                            {getStatusLabel(req.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <ChevronRight className="w-5 h-5 text-industrial-500 group-hover:text-white transition-colors" />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex justify-end">
                <TablePagination
                    totalItems={pagination.total}
                    currentPage={pagination.page}
                    itemsPerPage={pagination.limit}
                    onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
                    isLoading={loading}
                />
            </div>
        </div >
    );
};
