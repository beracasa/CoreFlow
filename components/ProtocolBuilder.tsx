import React, { useState, useEffect } from 'react';
import { MaintenanceTask } from '../types';
import { Plus, Trash2, Save, FileText, ChevronDown, ChevronRight, Copy, Upload } from 'lucide-react';
import { useRef } from 'react';
import * as XLSX from 'xlsx';

interface ProtocolBuilderProps {
    initialTasks?: MaintenanceTask[];
    onSave: (tasks: MaintenanceTask[]) => void;
}

export const ProtocolBuilder: React.FC<ProtocolBuilderProps> = ({ initialTasks, onSave }) => {
    const [tasks, setTasks] = useState<MaintenanceTask[]>(initialTasks || []);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Calculate total time
    const totalTime = tasks.reduce((acc, t) => acc + (t.estimatedTime || 0), 0);

    const addNewRow = () => {
        const lastTask = tasks[tasks.length - 1];
        const newSeq = (lastTask?.sequence || 0) + 1;

        const newTask: MaintenanceTask = {
            id: `task-${Date.now()}`,
            sequence: newSeq,
            group: lastTask?.group || '', // Auto-carry over group for easier entry
            component: '',
            activity: '',
            estimatedTime: 0,
            actionFlags: {
                clean: false,
                inspect: false,
                lubricate: false,
                adjust: false,
                refill: false,
                replace: false,
                mount: false
            }
        };
        setTasks([...tasks, newTask]);
    };

    const removeRow = (id: string) => {
        setTasks(tasks.filter(t => t.id !== id));
    };

    const updateTask = (id: string, field: keyof MaintenanceTask, value: any) => {
        setTasks(tasks.map(t => {
            if (t.id === id) {
                return { ...t, [field]: value };
            }
            return t;
        }));
    };

    const updateActionFlag = (id: string, flag: keyof MaintenanceTask['actionFlags']) => {
        setTasks(tasks.map(t => {
            if (t.id === id) {
                return {
                    ...t,
                    actionFlags: {
                        ...t.actionFlags,
                        [flag]: !t.actionFlags[flag]
                    }
                };
            }
            return t;
        }));
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        if (file.name.endsWith('.csv')) {
            reader.onload = (event) => {
                const text = event.target?.result as string;
                if (text) parseCSV(text);
            };
            reader.readAsText(file);
        } else {
            // Excel
            reader.onload = (event) => {
                const data = event.target?.result;
                if (data) parseExcel(data as ArrayBuffer);
            };
            reader.readAsArrayBuffer(file);
        }

        // Reset input
        e.target.value = '';
    };

    const processImportedData = (rawHeaders: string[], rows: any[]) => {
        // Helper to normalize string: remove accents, lowercase, trim
        const normalize = (str: string) => {
            return str.toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
                .trim();
        };

        // Smart Header Detection: If headers don't look right, scan first few rows
        let activeHeaders = rawHeaders;
        let activeRows = rows;

        // Check if current headers contain "group" or "grupo"
        const hasGroupHeader = rawHeaders.some(h => {
            const n = normalize(String(h));
            return n.includes('grupo') || n.includes('group');
        });

        if (!hasGroupHeader) {
            // Try to find header row in the first 20 rows
            let headerRowIndex = -1;
            for (let i = 0; i < Math.min(rows.length, 20); i++) {
                const row = rows[i];
                const rowValues = Array.isArray(row) ? row : Object.keys(row); // If object, keys might be the data if it was parsed weirdly, but usually sheet_to_json(header:1) returns array

                // Check if this row looks like a header
                const rowStr = rowValues.map(v => normalize(String(v || ''))).join(' ');
                if (rowStr.includes('grupo') && (rowStr.includes('punto') || rowStr.includes('component'))) {
                    headerRowIndex = i;
                    break;
                }
            }

            if (headerRowIndex !== -1) {
                activeHeaders = (rows[headerRowIndex] as any[]).map(String);
                activeRows = rows.slice(headerRowIndex + 1);
                console.log("Found headers at row index:", headerRowIndex, activeHeaders);
            }
        }

        const lowerHeaders = activeHeaders.map(normalize);

        // Fuzzy Validation
        const requiredKeywords = ['grupo', 'punto', 'tipo'];
        // Check if we have columns that *contain* these keywords
        const missing = requiredKeywords.filter(keyword => !lowerHeaders.some(h => h.includes(keyword)));

        if (missing.length > 0) {
            // Fallback for English
            const englishKeywords = ['group', 'component'];
            const missingEng = englishKeywords.filter(k => !lowerHeaders.some(h => h.includes(k)));

            if (missingEng.length > 0) {
                alert(`No se pudieron detectar las columnas requeridas (Grupo, Punto de Intervención, Tipo). \nVerifique que el archivo tenga encabezados claros.`);
                return;
            }
        }

        const newTasks: MaintenanceTask[] = [];
        let startSeq = (tasks.length > 0 ? tasks[tasks.length - 1].sequence : 0) + 1;

        activeRows.forEach((row, i) => {
            // Helper to get value loosely by header name
            const getVal = (possibleKeys: string[]) => {
                // Normalize possible keys
                const normKeys = possibleKeys.map(normalize);

                // Find which index in activeHeaders matches one of the possible keys (fuzzy match)
                // We look for the column header that *contains* the key
                const headerIndex = activeHeaders.findIndex(h => {
                    const normH = normalize(String(h));
                    return normKeys.some(k => normH.includes(k));
                });

                if (headerIndex >= 0) {
                    if (Array.isArray(row)) return row[headerIndex];
                    // If row is object (from sheet_to_json default), we fallback to key matching, 
                    // but we are forcing header:1 so row is Array.
                    return row[headerIndex];
                }
                return '';
            };

            const isFlag = (headerPart: string) => {
                const val = String(getVal([headerPart]) || '');
                const nVal = normalize(val);
                // Check for '1', 'x', 'true'
                return nVal === '1' || nVal === 'x' || nVal === 'true' || nVal === 'si' || nVal === 'yes';
            };

            // Handling merged cells simulation (if group is empty, use previous)
            let groupVal = String(getVal(['grupo', 'group']) || '');
            if (!groupVal && newTasks.length > 0) {
                // Simple logic for "merged" cells in Excel visualization - carry over from previous row
                // ONLY if it's likely a continuation (component is present)
                // This is a heuristic.
                groupVal = newTasks[newTasks.length - 1].group;
            }

            const task: MaintenanceTask = {
                id: `task-imported-${Date.now()}-${i}`,
                sequence: startSeq++,
                group: groupVal,
                component: String(getVal(['punto', 'component']) || ''), // Matches "Punto de intervencion"
                activity: String(getVal(['tipo', 'activity']) || ''), // Matches "Tipo de intervencion"
                referenceCode: String(getVal(['ref', 'cat. mtto']) || ''), // "Ref de interv", "Cat. Mtto"
                lubricantType: String(getVal(['tipo de lub', 'lubricante']) || ''),
                lubricantCode: String(getVal(['codigo', 'code']) || ''), // "Codigo" might be too generic? "Lubricant Code"
                estimatedTime: parseInt(String(getVal(['tiem', 'time', 'estim']))) || 0, // "Tiem. Estim min"
                actionFlags: {
                    clean: isFlag('clean') || isFlag('limpieza'),
                    inspect: isFlag('inspect') || isFlag('controlar') || isFlag('verificar'),
                    lubricate: isFlag('lubric') || isFlag('lubricacion'),
                    adjust: isFlag('adjust') || isFlag('regulacion') || isFlag('ajuste'),
                    refill: isFlag('refill') || isFlag('llenado') || isFlag('nivel'),
                    replace: isFlag('replace') || isFlag('sustitucion') || isFlag('cambio'),
                    mount: isFlag('mount') || isFlag('montaje')
                }
            };

            // Only add if it has component or activity (skip empty rows)
            if (task.component || task.activity) {
                newTasks.push(task);
            }
        });

        if (newTasks.length > 0) {
            setTasks(prev => [...prev, ...newTasks]);
            alert(`Se importaron ${newTasks.length} filas exitosamente.`);
        } else {
            alert('No se encontraron filas de datos válidas.');
        }
    };

    const parseExcel = (data: ArrayBuffer) => {
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Get JSON (array of objects)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Header: 1 returns array of arrays [row1, row2...]

        if (jsonData.length < 2) {
            alert('El archivo Excel parece vacío.');
            return;
        }

        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1);

        processImportedData(headers, rows);
    };

    const parseCSV = (csvText: string) => {
        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
            alert('El archivo CSV parece vacío.');
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim()); // Don't lowercase yet, processImportedData does it
        const rows = lines.slice(1).map(line => line.split(',').map(c => c.trim()));

        processImportedData(headers, rows);
    };

    return (
        <div className="flex flex-col h-full bg-industrial-900 text-white">
            {/* Header Toolbar */}
            <div className="p-4 border-b border-industrial-700 bg-industrial-800 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <FileText className="text-industrial-accent" size={20} />
                        Formulario de Intervención
                    </h3>
                    <p className="text-xs text-industrial-400">Tiempo Total Estimado: <span className="text-white font-mono font-bold text-sm">{totalTime} min</span> ({Math.floor(totalTime / 60)}h {totalTime % 60}m)</p>
                </div>
                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".csv, .xlsx, .xls"
                        onChange={handleFileUpload}
                    />
                    <button
                        onClick={handleImportClick}
                        className="flex items-center gap-1 px-3 py-1.5 bg-industrial-700 hover:bg-industrial-600 rounded text-sm transition-colors border border-industrial-600"
                        title="Importar CSV"
                    >
                        <Upload size={16} /> Importar
                    </button>
                    <button
                        onClick={addNewRow}
                        className="flex items-center gap-1 px-3 py-1.5 bg-industrial-700 hover:bg-industrial-600 rounded text-sm transition-colors"
                    >
                        <Plus size={16} /> Agregar Fila
                    </button>
                    <button
                        onClick={() => onSave(tasks)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-industrial-accent hover:bg-blue-600 rounded text-sm font-medium shadow transition-colors"
                    >
                        <Save size={16} /> Guardar
                    </button>
                </div>
            </div>

            {/* Datagrid Container */}
            <div className="flex-1 overflow-auto p-4">
                <div className="min-w-[1200px] border border-industrial-600 rounded-lg overflow-hidden bg-industrial-800 shadow-xl">
                    <table className="w-full text-xs box-border border-collapse">
                        <thead className="sticky top-0 bg-industrial-900 z-10 text-industrial-300">
                            <tr>
                                <th rowSpan={2} className="border border-industrial-600 p-2 w-10">Nº</th>
                                <th rowSpan={2} className="border border-industrial-600 p-2 w-32">Grupo</th>
                                <th rowSpan={2} className="border border-industrial-600 p-2 w-48">Punto de Intervención</th>
                                <th rowSpan={2} className="border border-industrial-600 p-2 w-48">Tipo de Intervención</th>

                                {/* Technical Data Group */}
                                <th colSpan={4} className="border border-industrial-600 p-1 bg-industrial-800 text-center font-bold">Datos Técnicos</th>

                                {/* Action Flags Group */}
                                <th colSpan={7} className="border border-industrial-600 p-1 bg-industrial-800 text-center font-bold">Matriz de Acciones</th>

                                <th rowSpan={2} className="border border-industrial-600 p-2 w-10"></th>
                            </tr>
                            <tr>
                                {/* Technical Sub-headers */}
                                <th className="border border-industrial-600 p-2 w-20" title="Referencia de Intervención">Código Ref.</th>
                                <th className="border border-industrial-600 p-2 w-16" title="Tipo de Lubricante">Tipo Lub.</th>
                                <th className="border border-industrial-600 p-2 w-16" title="Código de Lubricante">Código Lub.</th>
                                <th className="border border-industrial-600 p-2 w-16 text-yellow-500">Tiempo (m)</th>

                                {/* Flags Sub-headers (Vertical Text for space) */}
                                <th className="border border-industrial-600 p-1 w-8 rotate-text h-24"><div className="w-6 mx-auto writing-mode-vertical text-[10px]">Limpieza</div></th>
                                <th className="border border-industrial-600 p-1 w-8"><div className="w-6 mx-auto writing-mode-vertical text-[10px]">Controlar</div></th>
                                <th className="border border-industrial-600 p-1 w-8"><div className="w-6 mx-auto writing-mode-vertical text-[10px]">Lubricación</div></th>
                                <th className="border border-industrial-600 p-1 w-8"><div className="w-6 mx-auto writing-mode-vertical text-[10px]">Ajuste</div></th>
                                <th className="border border-industrial-600 p-1 w-8"><div className="w-6 mx-auto writing-mode-vertical text-[10px]">Llenado</div></th>
                                <th className="border border-industrial-600 p-1 w-8"><div className="w-6 mx-auto writing-mode-vertical text-[10px]">Sustitución</div></th>
                                <th className="border border-industrial-600 p-1 w-8"><div className="w-6 mx-auto writing-mode-vertical text-[10px]">Montaje</div></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-industrial-700">
                            {tasks.map((task, index) => (
                                <tr key={task.id} className="hover:bg-industrial-700/50 transition-colors group">
                                    {/* Sequence */}
                                    <td className="border border-industrial-600 p-1 text-center font-mono text-industrial-400">
                                        <input
                                            type="number"
                                            className="w-full bg-transparent text-center outline-none"
                                            value={task.sequence}
                                            onChange={(e) => updateTask(task.id, 'sequence', parseInt(e.target.value))}
                                        />
                                    </td>

                                    {/* Group */}
                                    <td className="border border-industrial-600 p-1 relative">
                                        <input
                                            type="text"
                                            className="w-full bg-transparent outline-none px-1"
                                            value={task.group}
                                            onChange={(e) => updateTask(task.id, 'group', e.target.value)}
                                            placeholder="System..."
                                        />
                                        {index > 0 && tasks[index - 1].group === task.group && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-industrial-600 opacity-50 block" title="Group continues"></div>
                                        )}
                                    </td>

                                    {/* Component */}
                                    <td className="border border-industrial-600 p-1">
                                        <input
                                            type="text"
                                            className="w-full bg-transparent outline-none px-1"
                                            value={task.component}
                                            onChange={(e) => updateTask(task.id, 'component', e.target.value)}
                                            placeholder="Component..."
                                        />
                                    </td>

                                    {/* Activity */}
                                    <td className="border border-industrial-600 p-1">
                                        <input
                                            type="text"
                                            className="w-full bg-transparent outline-none px-1"
                                            value={task.activity}
                                            onChange={(e) => updateTask(task.id, 'activity', e.target.value)}
                                            placeholder="Action desc..."
                                        />
                                    </td>

                                    {/* Technical Data */}
                                    <td className="border border-industrial-600 p-1">
                                        <input
                                            type="text"
                                            className="w-full bg-transparent outline-none px-1 font-mono text-center text-industrial-400"
                                            value={task.referenceCode || ''}
                                            onChange={(e) => updateTask(task.id, 'referenceCode', e.target.value)}
                                        />
                                    </td>
                                    <td className="border border-industrial-600 p-1">
                                        <input
                                            type="text"
                                            className="w-full bg-transparent outline-none px-1 text-center"
                                            value={task.lubricantType || ''}
                                            onChange={(e) => updateTask(task.id, 'lubricantType', e.target.value)}
                                        />
                                    </td>
                                    <td className="border border-industrial-600 p-1">
                                        <input
                                            type="text"
                                            className="w-full bg-transparent outline-none px-1 text-center"
                                            value={task.lubricantCode || ''}
                                            onChange={(e) => updateTask(task.id, 'lubricantCode', e.target.value)}
                                        />
                                    </td>
                                    <td className="border border-industrial-600 p-1">
                                        <input
                                            type="number"
                                            className="w-full bg-transparent outline-none px-1 text-center text-yellow-400 font-bold"
                                            value={task.estimatedTime}
                                            onChange={(e) => updateTask(task.id, 'estimatedTime', parseInt(e.target.value) || 0)}
                                        />
                                    </td>

                                    {/* Action Flags Checkboxes */}
                                    {(['clean', 'inspect', 'lubricate', 'adjust', 'refill', 'replace', 'mount'] as const).map(flag => (
                                        <td key={flag} className="border border-industrial-600 p-0 text-center hover:bg-white/5 cursor-pointer" onClick={() => updateActionFlag(task.id, flag)}>
                                            <div className="flex items-center justify-center h-full w-full py-2">
                                                <input
                                                    type="checkbox"
                                                    checked={task.actionFlags[flag]}
                                                    readOnly
                                                    className="cursor-pointer accent-industrial-accent w-4 h-4"
                                                />
                                            </div>
                                        </td>
                                    ))}

                                    {/* Tools */}
                                    <td className="border border-industrial-600 p-1 text-center">
                                        <button
                                            onClick={() => removeRow(task.id)}
                                            className="text-industrial-500 hover:text-red-500 p-1 rounded transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {tasks.length === 0 && (
                                <tr>
                                    <td colSpan={16} className="p-8 text-center text-industrial-500 italic">
                                        No hay tareas definidas. Haga clic en "Agregar Fila" para comenzar.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
        .writing-mode-vertical {
            writing-mode: vertical-rl;
            text-orientation: mixed;
            transform: rotate(180deg);
        }
      `}</style>
        </div>
    );
};
