import React, { useState } from 'react';
import { Machine, MachineHourLog } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { Clock, History, Save } from 'lucide-react';

interface MachineHoursLogProps {
    machines: Machine[];
}

export const MachineHoursLog: React.FC<MachineHoursLogProps> = ({ machines }) => {
    const { t } = useLanguage();
    const [selectedMachineId, setSelectedMachineId] = useState<string>('');
    const [currentReading, setCurrentReading] = useState<number>(0);
    const [displayReading, setDisplayReading] = useState<string>('');

    // Searchable Dropdown State
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    // Mock history
    const [history, setHistory] = useState<MachineHourLog[]>([
        { id: '1', machineId: 'm1', date: '2023-10-20', hoursLogged: 12400, operator: 'John Doe' },
        { id: '2', machineId: 'm1', date: '2023-10-15', hoursLogged: 12350, operator: 'Jane Smith' },
    ]);

    const selectedMachine = machines.find(m => m.id === selectedMachineId);

    const handleLog = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMachine) return;

        // Validate that we have a reading
        if (currentReading <= 0) {
            alert("Please enter a valid reading.");
            return;
        }

        const newLog: MachineHourLog = {
            id: Date.now().toString(),
            machineId: selectedMachine.id,
            date: new Date().toISOString().split('T')[0],
            hoursLogged: currentReading,
            operator: 'Current User' // Auth context would go here
        };

        setHistory([newLog, ...history]);
        setCurrentReading(0);
        setDisplayReading('');
        setSearchTerm('');
        setSelectedMachineId('');
        alert("Hours logged successfully. Maintenance schedule updated.");
    };

    const handleReadingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;

        // Remove existing commas
        const rawValue = val.replace(/,/g, '');

        // Check if it's a valid number or empty
        if (rawValue === '') {
            setCurrentReading(0);
            setDisplayReading('');
            return;
        }

        // Validate strictly digits
        if (!/^\d+$/.test(rawValue)) return;

        const numValue = parseInt(rawValue, 10);
        setCurrentReading(numValue);

        // Format back to string with commas
        setDisplayReading(new Intl.NumberFormat('en-US').format(numValue));
    };

    return (
        <div className="h-full bg-industrial-900 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                        <Clock className="w-6 h-6 text-industrial-accent" /> {t('hours.title')}
                    </h2>
                    <p className="text-industrial-500 text-sm">{t('hours.subtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Entry Form */}
                <div className="bg-industrial-800 p-6 rounded-lg border border-industrial-700 shadow-xl">
                    <h3 className="text-white font-bold mb-4 border-b border-industrial-700 pb-2">{t('hours.log')}</h3>
                    <form onSubmit={handleLog} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs text-industrial-400 font-bold uppercase">{t('form.machine')}</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Buscar por Nombre, Alias o Matrícula..."
                                    className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white outline-none focus:border-emerald-500 transition-colors"
                                    value={searchTerm}
                                    onChange={e => {
                                        setSearchTerm(e.target.value);
                                        setSelectedMachineId('');
                                        setShowDropdown(true);
                                    }}
                                    onFocus={() => setShowDropdown(true)}
                                    // Delay blur to allow click on dropdown items
                                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                />
                                {showDropdown && (
                                    <div className="absolute z-10 w-full mt-1 bg-industrial-800 border border-industrial-600 rounded shadow-xl max-h-60 overflow-y-auto">
                                        {machines.filter(m =>
                                            m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            (m.alias && m.alias.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                            (m.plate && m.plate.toLowerCase().includes(searchTerm.toLowerCase()))
                                        ).length > 0 ? (
                                            machines.filter(m =>
                                                m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                (m.alias && m.alias.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                                (m.plate && m.plate.toLowerCase().includes(searchTerm.toLowerCase()))
                                            ).map(m => (
                                                <div
                                                    key={m.id}
                                                    className="px-4 py-2 hover:bg-industrial-700 cursor-pointer text-white text-sm border-b border-industrial-700/50 last:border-0"
                                                    onClick={() => {
                                                        setSelectedMachineId(m.id);
                                                        setSearchTerm(m.name + (m.plate ? ` (${m.plate})` : ''));
                                                        setShowDropdown(false);
                                                    }}
                                                >
                                                    <div className="font-bold text-emerald-400">{m.name}</div>
                                                    <div className="text-xs text-industrial-400">
                                                        {m.plate ? `Mat: ${m.plate}` : ''} {m.alias ? `• Alias: ${m.alias}` : ''}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-4 py-2 text-industrial-400 text-sm">No se encontraron equipos</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedMachine && (
                            <div className="bg-industrial-900/50 p-3 rounded border border-industrial-600 mb-4">
                                <span className="text-xs text-industrial-500 block">{t('hours.last')}</span>
                                <span className="text-xl font-mono text-white">{new Intl.NumberFormat('en-US').format(selectedMachine.runningHours)} h</span>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs text-industrial-400 font-bold uppercase">{t('hours.current')}</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white font-mono"
                                placeholder="e.g. 12,500"
                                value={displayReading}
                                onChange={handleReadingChange}
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-industrial-accent hover:bg-blue-600 text-white py-2 rounded font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            <Save size={16} /> {t('form.save')}
                        </button>
                    </form>
                </div>

                {/* History List */}
                <div className="lg:col-span-2 bg-industrial-800 rounded-lg border border-industrial-700 shadow-xl flex flex-col">
                    <div className="p-4 border-b border-industrial-700">
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <History size={16} /> History Log
                        </h3>
                    </div>
                    <div className="flex-1 overflow-auto p-0">
                        <table className="w-full text-left text-sm text-industrial-400">
                            <thead className="bg-industrial-900 text-xs uppercase font-bold text-industrial-500 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3">{t('form.date')}</th>
                                    <th className="px-6 py-3">{t('form.machine')}</th>
                                    <th className="px-6 py-3">Reading</th>
                                    <th className="px-6 py-3">Operator</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-industrial-700">
                                {history
                                    .filter(log => !selectedMachineId || log.machineId === selectedMachineId)
                                    .map(log => (
                                        <tr key={log.id} className="hover:bg-industrial-700/30">
                                            <td className="px-6 py-3">{log.date}</td>
                                            <td className="px-6 py-3 text-white">
                                                {machines.find(m => m.id === log.machineId)?.name || log.machineId}
                                            </td>
                                            <td className="px-6 py-3 font-mono text-industrial-accent">
                                                {new Intl.NumberFormat('en-US').format(log.hoursLogged)} h
                                            </td>
                                            <td className="px-6 py-3">{log.operator}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};