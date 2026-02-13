import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { SparePart } from '../../types/inventory';
import { inventoryService } from '../../services';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react';

interface ImportSparePartsProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const ImportSpareParts: React.FC<ImportSparePartsProps> = ({ onClose, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<Omit<SparePart, 'id'>[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setError(null);
        parseFile(selectedFile);
    };

    const parseFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                // Basic validation and mapping
                // Assuming columns: SKU, Name, Category, Stock, MinStock, Location, Cost
                const mappedData: Omit<SparePart, 'id'>[] = jsonData.map((row: any) => ({
                    partNumber: row['SKU'] || row['sku'] || row['Part Number'] || row['Numero Parte'] || '',
                    name: row['Name'] || row['Nombre'] || row['name'] || '',
                    category: row['Category'] || row['Categoria'] || row['category'] || 'General',
                    currentStock: Number(row['Stock'] || row['Current Stock'] || row['currentStock'] || 0),
                    minStock: Number(row['Min Stock'] || row['Minimo'] || row['minimumStock'] || 0),
                    maxStock: Number(row['Max Stock'] || row['Maximo'] || row['maximumStock'] || 0),
                    location: row['Location'] || row['Ubicacion'] || row['locationCode'] || '',
                    cost: Number(row['Cost'] || row['Costo'] || row['unitCost'] || 0),
                    // supplier: row['Supplier'] || row['Proveedor'] || row['supplier'] || '',
                    // leadTimeDays: Number(row['Lead Time'] || row['Tiempo Entrega'] || row['leadTimeDays'] || 0),
                    unitOfMeasure: row['Unit'] || row['Unidad'] || 'PCS',
                    description: row['Description'] || row['Descripcion'] || '',
                }));

                const validData = mappedData.filter(d => d.partNumber && d.name);

                if (validData.length === 0) {
                    setError('No valid data found. Please ensure columns "SKU" and "Name" exist.');
                }

                setPreviewData(validData);
            } catch (err) {
                console.error(err);
                setError('Error parsing file. Please check the format.');
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleImport = async () => {
        if (previewData.length === 0) return;

        setLoading(true);
        try {
            await inventoryService.bulkCreate(previewData);
            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            setError('Failed to import data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <FileSpreadsheet className="w-6 h-6 text-green-600" />
                        Importar Repuestos
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto">

                    {!file ? (
                        <div
                            className="border-2 border-dashed border-gray-300 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="w-12 h-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-700 mb-2">Click to Upload Excel or CSV</h3>
                            <p className="text-sm text-gray-500 mb-6">Supported formats: .xlsx, .csv</p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".xlsx,.csv"
                                onChange={handleFileUpload}
                            />
                            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                Select File
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <FileSpreadsheet className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{file.name}</p>
                                        <p className="text-sm text-gray-500">{previewData.length} items found</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setFile(null); setPreviewData([]); setError(null); }}
                                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                                >
                                    Change File
                                </button>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5" />
                                    {error}
                                </div>
                            )}

                            {previewData.length > 0 && (
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                                            <tr>
                                                <th className="px-4 py-3">SKU / Code</th>
                                                <th className="px-4 py-3">Name</th>
                                                <th className="px-4 py-3">Category</th>
                                                <th className="px-4 py-3 text-right">Stock</th>
                                                <th className="px-4 py-3 text-right">Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {previewData.slice(0, 5).map((item, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-medium text-gray-900">{item.partNumber}</td>
                                                    <td className="px-4 py-3">{item.name}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                                                            {item.category}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">{item.currentStock}</td>
                                                    <td className="px-4 py-3 text-right">${item.cost?.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {previewData.length > 5 && (
                                        <div className="p-3 text-center text-xs text-gray-500 bg-gray-50 border-t">
                                            And {previewData.length - 5} more items...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={loading || previewData.length === 0}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? 'Importing...' : 'Import Data'}
                        {!loading && <CheckCircle className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
};
