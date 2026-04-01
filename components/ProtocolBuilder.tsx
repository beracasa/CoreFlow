import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { MaintenanceTask } from '../types';
import { Plus, Trash2, Save, FileText, Upload, Loader2 } from 'lucide-react';
import { useRef } from 'react';
import * as XLSX from 'xlsx';

interface ProtocolBuilderProps {
    initialTasks?: MaintenanceTask[];
    onSave: (tasks: MaintenanceTask[]) => Promise<any>;
}

// Memoized Row Component to prevent unnecessary re-renders of the entire table
const TaskRow = memo(({ 
    task, 
    index, 
    isFirstGroupRow, 
    onUpdateTask, 
    onUpdateActionFlag, 
    onRemoveRow 
}: { 
    task: MaintenanceTask; 
    index: number; 
    isFirstGroupRow: boolean;
    onUpdateTask: (id: string, field: keyof MaintenanceTask, value: any) => void;
    onUpdateActionFlag: (id: string, flag: keyof MaintenanceTask['actionFlags']) => void;
    onRemoveRow: (id: string) => void;
}) => {
    return (
        <tr className="hover:bg-industrial-700/50 transition-colors group">
            {/* Sequence */}
            <td className="border border-industrial-600 p-1 text-center font-mono text-industrial-400">
                <input
                    type="number"
                    className="w-full bg-transparent text-center outline-none"
                    value={task.sequence}
                    onChange={(e) => onUpdateTask(task.id, 'sequence', parseInt(e.target.value))}
                />
            </td>

            {/* Group */}
            <td className="border border-industrial-600 p-1 relative">
                <input
                    type="text"
                    className="w-full bg-transparent outline-none px-1"
                    value={task.group}
                    onChange={(e) => onUpdateTask(task.id, 'group', e.target.value)}
                    placeholder="System..."
                />
                {!isFirstGroupRow && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-industrial-600 opacity-50 block" title="Group continues"></div>
                )}
            </td>

            {/* Component */}
            <td className="border border-industrial-600 p-1">
                <input
                    type="text"
                    className="w-full bg-transparent outline-none px-1"
                    value={task.component}
                    onChange={(e) => onUpdateTask(task.id, 'component', e.target.value)}
                    placeholder="Component..."
                />
            </td>

            {/* Activity */}
            <td className="border border-industrial-600 p-1">
                <input
                    type="text"
                    className="w-full bg-transparent outline-none px-1"
                    value={task.activity}
                    onChange={(e) => onUpdateTask(task.id, 'activity', e.target.value)}
                    placeholder="Action desc..."
                />
            </td>

            {/* Technical Data */}
            <td className="border border-industrial-600 p-1">
                <input
                    type="text"
                    className="w-full bg-transparent outline-none px-1 font-mono text-center text-industrial-400"
                    value={task.referenceCode || ''}
                    onChange={(e) => onUpdateTask(task.id, 'referenceCode', e.target.value)}
                />
            </td>
            <td className="border border-industrial-600 p-1">
                <input
                    type="text"
                    className="w-full bg-transparent outline-none px-1 text-center"
                    value={task.lubricantType || ''}
                    onChange={(e) => onUpdateTask(task.id, 'lubricantType', e.target.value)}
                />
            </td>
            <td className="border border-industrial-600 p-1">
                <input
                    type="text"
                    className="w-full bg-transparent outline-none px-1 text-center"
                    value={task.lubricantCode || ''}
                    onChange={(e) => onUpdateTask(task.id, 'lubricantCode', e.target.value)}
                />
            </td>
            <td className="border border-industrial-600 p-1">
                <input
                    type="number"
                    className="w-full bg-transparent outline-none px-1 text-center text-yellow-400 font-bold"
                    value={task.estimatedTime}
                    onChange={(e) => onUpdateTask(task.id, 'estimatedTime', parseInt(e.target.value) || 0)}
                />
            </td>

            {/* Action Flags Checkboxes */}
            {(['clean', 'inspect', 'lubricate', 'adjust', 'refill', 'replace', 'mount'] as const).map(flag => (
                <td key={flag} className="border border-industrial-600 p-0 text-center hover:bg-white/5 cursor-pointer" onClick={() => onUpdateActionFlag(task.id, flag)}>
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
                    onClick={() => onRemoveRow(task.id)}
                    className="text-industrial-500 hover:text-red-500 p-1 rounded transition-colors"
                >
                    <Trash2 size={14} />
                </button>
            </td>
        </tr>
    );
});

TaskRow.displayName = 'TaskRow';

export const ProtocolBuilder: React.FC<ProtocolBuilderProps> = ({ initialTasks, onSave }) => {
    const [tasks, setTasks] = useState<MaintenanceTask[]>(initialTasks || []);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Calculate total time - Memoized to prevent recalculation on every render
    const totalTime = useMemo(() => 
        tasks.reduce((acc, t) => acc + (t.estimatedTime || 0), 0)
    , [tasks]);

    const addNewRow = useCallback(() => {
        setTasks(prev => {
            const lastTask = prev[prev.length - 1];
            const newSeq = (lastTask?.sequence || 0) + 1;

            const newTask: MaintenanceTask = {
                id: `task-${Date.now()}`,
                sequence: newSeq,
                group: lastTask?.group || '', 
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
            return [...prev, newTask];
        });
    }, []);

    const removeRow = useCallback((id: string) => {
        setTasks(prev => prev.filter(t => t.id !== id));
    }, []);

    const updateTask = useCallback((id: string, field: keyof MaintenanceTask, value: any) => {
        setTasks(prev => prev.map(t => {
            if (t.id === id) {
                return { ...t, [field]: value };
            }
            return t;
        }));
    }, []);

    const updateActionFlag = useCallback((id: string, flag: keyof MaintenanceTask['actionFlags']) => {
        setTasks(prev => prev.map(t => {
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
    }, []);

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

        // Smart Header Detection
        let activeHeaders = rawHeaders;
        let activeRows = rows;

        const hasGroupHeader = rawHeaders.some(h => {
            const n = normalize(String(h));
            return n.includes('grupo') || n.includes('group');
        });

        if (!hasGroupHeader) {
            let headerRowIndex = -1;
            for (let i = 0; i < Math.min(rows.length, 20); i++) {
                const row = rows[i];
                const rowValues = Array.isArray(row) ? row : Object.keys(row);
                const rowStr = rowValues.map(v => normalize(String(v || ''))).join(' ');
                if (rowStr.includes('grupo') && (rowStr.includes('punto') || rowStr.includes('component'))) {
                    headerRowIndex = i;
                    break;
                }
            }

            if (headerRowIndex !== -1) {
                activeHeaders = (rows[headerRowIndex] as any[]).map(String);
                activeRows = rows.slice(headerRowIndex + 1);
            }
        }

        const lowerHeaders = activeHeaders.map(normalize);
        const requiredKeywords = ['grupo', 'punto', 'tipo'];
        const missing = requiredKeywords.filter(keyword => !lowerHeaders.some(h => h.includes(keyword)));

        if (missing.length > 0) {
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
            const getVal = (possibleKeys: string[]) => {
                const normKeys = possibleKeys.map(normalize);
                const headerIndex = activeHeaders.findIndex(h => {
                    const normH = normalize(String(h));
                    return normKeys.some(k => normH.includes(k));
                });

                if (headerIndex >= 0) return row[headerIndex];
                return '';
            };

            const isFlag = (headerPart: string) => {
                const val = String(getVal([headerPart]) || '');
                const nVal = normalize(val);
                return nVal === '1' || nVal === 'x' || nVal === 'true' || nVal === 'si' || nVal === 'yes';
            };

            let groupVal = String(getVal(['grupo', 'group']) || '');
            if (!groupVal && newTasks.length > 0) {
                groupVal = newTasks[newTasks.length - 1].group;
            }

            const task: MaintenanceTask = {
                id: `task-imported-${Date.now()}-${i}`,
                sequence: startSeq++,
                group: groupVal,
                component: String(getVal(['punto', 'component']) || ''),
                activity: String(getVal(['tipo', 'activity']) || ''),
                referenceCode: String(getVal(['ref', 'cat. mtto']) || ''),
                lubricantType: String(getVal(['tipo de lub', 'lubricante']) || ''),
                lubricantCode: String(getVal(['codigo', 'code']) || ''),
                estimatedTime: parseInt(String(getVal(['tiem', 'time', 'estim']))) || 0,
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
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

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

        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1).map(line => line.split(',').map(c => c.trim()));
        processImportedData(headers, rows);
    };

    const handleSave = async () => {
        setIsSaving(true);
        // Delay processing to allow interaction paint
        setTimeout(async () => {
            try {
                await onSave(tasks);
            } catch (error) {
                console.error("Save failed:", error);
                alert("Error al guardar los cambios.");
            } finally {
                setIsSaving(false);
            }
        }, 50);
    };

    return (
        <div className="flex flex-col h-full bg-industrial-900 text-white">
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
                        disabled={isSaving}
                        className="flex items-center gap-1 px-3 py-1.5 bg-industrial-700 hover:bg-industrial-600 rounded text-sm transition-colors border border-industrial-600 disabled:opacity-50"
                        title="Importar CSV"
                    >
                        <Upload size={16} /> Importar
                    </button>
                    <button
                        onClick={addNewRow}
                        disabled={isSaving}
                        className="flex items-center gap-1 px-3 py-1.5 bg-industrial-700 hover:bg-industrial-600 rounded text-sm transition-colors disabled:opacity-50"
                    >
                        <Plus size={16} /> Agregar Fila
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-1.5 bg-industrial-accent hover:bg-blue-600 rounded text-sm font-medium shadow transition-colors disabled:opacity-50 min-w-[100px] justify-center"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Guardando</span>
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                <span>Guardar</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
                <div className="min-w-[1200px] border border-industrial-600 rounded-lg overflow-hidden bg-industrial-800 shadow-xl">
                    <table className="w-full text-xs box-border border-collapse">
                        <thead className="sticky top-0 bg-industrial-900 z-10 text-industrial-300">
                            <tr>
                                <th rowSpan={2} className="border border-industrial-600 p-2 w-10">Nº</th>
                                <th rowSpan={2} className="border border-industrial-600 p-2 w-32">Grupo</th>
                                <th rowSpan={2} className="border border-industrial-600 p-2 w-48">Punto de Intervención</th>
                                <th rowSpan={2} className="border border-industrial-600 p-2 w-48">Tipo de Intervención</th>
                                <th colSpan={4} className="border border-industrial-600 p-1 bg-industrial-800 text-center font-bold">Datos Técnicos</th>
                                <th colSpan={7} className="border border-industrial-600 p-1 bg-industrial-800 text-center font-bold">Matriz de Acciones</th>
                                <th rowSpan={2} className="border border-industrial-600 p-2 w-10"></th>
                            </tr>
                            <tr>
                                <th className="border border-industrial-600 p-2 w-20">Código Ref.</th>
                                <th className="border border-industrial-600 p-2 w-16">Tipo Lub.</th>
                                <th className="border border-industrial-600 p-2 w-16">Código Lub.</th>
                                <th className="border border-industrial-600 p-2 w-16 text-yellow-500">Tiempo (m)</th>
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
                                <TaskRow 
                                    key={task.id}
                                    task={task}
                                    index={index}
                                    isFirstGroupRow={index === 0 || tasks[index - 1].group !== task.group}
                                    onUpdateTask={updateTask}
                                    onUpdateActionFlag={updateActionFlag}
                                    onRemoveRow={removeRow}
                                />
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
