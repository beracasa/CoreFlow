import React from 'react';
import { MaintenanceTask } from '../types';

interface ProtocolViewerProps {
    tasks: MaintenanceTask[];
    readOnly?: boolean;
    onToggle?: (taskId: string, action: string) => void;
    className?: string;
}

export const ProtocolViewer: React.FC<ProtocolViewerProps> = ({ tasks, readOnly = false, onToggle, className = '' }) => {
    console.log('DEBUG: ProtocolViewer Render', { readOnly, tasksCount: tasks.length, hasOnToggle: !!onToggle });

    // Helper to calculate rowspans for the 'Group' column
    const getRowSpan = (taskIndex: number) => {
        const currentGroup = tasks[taskIndex].group;
        // If previous row has same group, rowspan is 0 (hidden)
        if (taskIndex > 0 && tasks[taskIndex - 1].group === currentGroup) {
            return 0;
        }
        // Count forward to find how many rows share this group
        let count = 1;
        for (let i = taskIndex + 1; i < tasks.length; i++) {
            if (tasks[i].group === currentGroup) {
                count++;
            } else {
                break;
            }
        }
        return count;
    };

    const renderFlag = (task: MaintenanceTask, actionKey: string) => {
        // Defensive check for actionFlags
        if (!task.actionFlags) return null;

        const isRequired = task.actionFlags[actionKey as keyof typeof task.actionFlags];
        const isChecked = task.checks?.[actionKey] || false;

        if (!isRequired) return null;

        if (readOnly) {
            return isChecked ? (
                <div className="w-full h-full flex items-center justify-center">
                    <span className="text-black font-bold text-xs">X</span>
                </div>
            ) : <div className="w-full h-full flex items-center justify-center"><div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div></div>;
        }

        return (
            <>
                <button
                    type="button"
                    className={`w-full h-full flex items-center justify-center cursor-pointer transition-colors focus:outline-none relative z-10 ${isChecked ? 'bg-emerald-100/50 hover:bg-emerald-200/50' : 'hover:bg-gray-50'}`}
                    onClick={(e) => {
                        // e.stopPropagation(); // Try removing stopPropagation in case it interferes with some global handler, though unlikely.
                        console.log('DEBUG: ProtocolViewer Button Clicked', { id: task.id, actionKey, readOnly });
                        if (onToggle) onToggle(task.id, actionKey);
                    }}
                >
                    {isChecked ? (
                        <span className="text-emerald-700 font-bold text-lg leading-none transform scale-110 pointer-events-none">X</span>
                    ) : (
                        <div className="w-5 h-5 border-2 border-industrial-400 rounded-sm bg-white hover:border-emerald-500 transition-colors pointer-events-none"></div>
                    )}
                </button>
                {/* Native Checkbox for Debugging */}
                {
                    !readOnly && (
                        <input
                            type="checkbox"
                            className="absolute top-0 right-0 h-4 w-4 z-50 opacity-50 cursor-pointer"
                            checked={isChecked}
                            onChange={() => {
                                console.log('DEBUG: Native Checkbox Changed');
                                if (onToggle) onToggle(task.id, actionKey);
                            }}
                        />
                    )
                }
            </>
        );
    };

    return (
        <div className={`overflow-x-auto ${className}`}>
            <table className="w-full border-collapse bg-white text-black text-xs font-sans border-2 border-black">
                <thead>
                    <tr className="bg-gray-200">
                        {/* Headers match the R-MANT-02 format exactly */}
                        <th rowSpan={2} className="border border-black p-2 w-10 text-center">Nº</th>
                        <th rowSpan={2} className="border border-black p-2 w-32 text-center font-bold">Grupo</th>
                        <th rowSpan={2} className="border border-black p-2 text-center font-bold">Punto de intervención</th>
                        <th rowSpan={2} className="border border-black p-2 text-center font-bold">Tipo de intervención</th>

                        {/* Technical Specs */}
                        <th className="border border-black p-1 w-20 text-center font-bold text-[10px]">Ref de interv.</th>
                        <th className="border border-black p-1 w-16 text-center font-bold text-[10px]">Tipo de Lub.</th>
                        <th className="border border-black p-1 w-16 text-center font-bold text-[10px]">Codigo</th>
                        <th className="border border-black p-1 w-16 text-center font-bold text-[10px]">Tiem. min</th>

                        {/* Action Matrix Headers (Vertical) */}
                        <th className="border border-black p-1 w-8"><div className="w-4 mx-auto rotate-180 writing-mode-vertical text-[9px] font-bold">Limpieza</div></th>
                        <th className="border border-black p-1 w-8"><div className="w-4 mx-auto rotate-180 writing-mode-vertical text-[9px] font-bold">Controlar</div></th>
                        <th className="border border-black p-1 w-8"><div className="w-4 mx-auto rotate-180 writing-mode-vertical text-[9px] font-bold">Lubricacion</div></th>
                        <th className="border border-black p-1 w-8"><div className="w-4 mx-auto rotate-180 writing-mode-vertical text-[9px] font-bold">Regulacion</div></th>
                        <th className="border border-black p-1 w-8"><div className="w-4 mx-auto rotate-180 writing-mode-vertical text-[9px] font-bold">Llenado</div></th>
                        <th className="border border-black p-1 w-8"><div className="w-4 mx-auto rotate-180 writing-mode-vertical text-[9px] font-bold">Sustitucion</div></th>
                        <th className="border border-black p-1 w-8"><div className="w-4 mx-auto rotate-180 writing-mode-vertical text-[9px] font-bold">Montaje</div></th>
                    </tr>
                    {/* The second row of headers is implicitly merged or empty for single headers in rowspan=2 */}
                    <tr className="bg-gray-200 h-0">
                        {/* Hidden empty cells or just handled by rowspan above */}
                        <th className="hidden"></th><th className="hidden"></th><th className="hidden"></th><th className="hidden"></th>
                        <th className="hidden"></th><th className="hidden"></th><th className="hidden"></th><th className="hidden"></th>
                        <th className="hidden"></th><th className="hidden"></th><th className="hidden"></th><th className="hidden"></th>
                        <th className="hidden"></th><th className="hidden"></th><th className="hidden"></th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.map((task, index) => {
                        const rowSpan = getRowSpan(index);
                        return (
                            <tr key={task.id} className="border-b border-black hover:bg-gray-50">
                                {/* Sequence */}
                                <td className="border border-black p-1 text-center font-bold">{task.sequence}</td>

                                {/* Group with Rowspan */}
                                {rowSpan > 0 && (
                                    <td rowSpan={rowSpan} className="border border-black p-2 text-center font-bold bg-gray-50 align-middle">
                                        {task.group}
                                    </td>
                                )}

                                {/* Main Content */}
                                <td className="border border-black p-1.5 px-2 align-middle">{task.component}</td>
                                <td className="border border-black p-1.5 px-2 align-middle">{task.activity}</td>

                                {/* Specs */}
                                <td className="border border-black p-1 text-center font-mono text-[10px]">{task.referenceCode}</td>
                                <td className="border border-black p-1 text-center text-[10px]">{task.lubricantType}</td>
                                <td className="border border-black p-1 text-center text-[10px]">{task.lubricantCode}</td>
                                <td className="border border-black p-1 text-center font-bold">{task.estimatedTime}</td>

                                {/* Grid Checkboxes - Added explicit handlers on TDs for debugging */}
                                <td
                                    className="border border-black p-0 h-10 w-10 relative"
                                    onClick={() => console.log('DEBUG: TD Clean Clicked')}
                                >
                                    {renderFlag(task, 'clean')}
                                </td>
                                <td className="border border-black p-0 h-10 w-10 relative">{renderFlag(task, 'inspect')}</td>
                                <td className="border border-black p-0 h-10 w-10 relative">{renderFlag(task, 'lubricate')}</td>
                                <td className="border border-black p-0 h-10 w-10 relative">{renderFlag(task, 'adjust')}</td>
                                <td className="border border-black p-0 h-10 w-10 relative">{renderFlag(task, 'refill')}</td>
                                <td className="border border-black p-0 h-10 w-10 relative">{renderFlag(task, 'replace')}</td>
                                <td className="border border-black p-0 h-10 w-10 relative">{renderFlag(task, 'mount')}</td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="bg-gray-100 border-t-2 border-black">
                        <td colSpan={7} className="p-2 text-right font-bold">Total Tiempo Estimado:</td>
                        <td className="p-2 text-center font-bold border border-black bg-white">
                            {tasks.reduce((acc, t) => acc + (t.estimatedTime || 0), 0)} min
                        </td>
                        <td colSpan={7} className="bg-gray-200 border border-black"></td>
                    </tr>
                </tfoot>
            </table>
            <style>{`
                .writing-mode-vertical {
                    writing-mode: vertical-rl;
                    text-orientation: mixed;
                }
            `}</style>
        </div >
    );
};
