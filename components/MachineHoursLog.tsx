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
  
  // Mock history
  const [history, setHistory] = useState<MachineHourLog[]>([
    { id: '1', machineId: 'm1', date: '2023-10-20', hoursLogged: 12400, operator: 'John Doe' },
    { id: '2', machineId: 'm1', date: '2023-10-15', hoursLogged: 12350, operator: 'Jane Smith' },
  ]);

  const selectedMachine = machines.find(m => m.id === selectedMachineId);

  const handleLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachine) return;
    
    const newLog: MachineHourLog = {
      id: Date.now().toString(),
      machineId: selectedMachine.id,
      date: new Date().toISOString().split('T')[0],
      hoursLogged: currentReading,
      operator: 'Current User' // Auth context would go here
    };
    
    setHistory([newLog, ...history]);
    setCurrentReading(0);
    alert("Hours logged successfully. Maintenance schedule updated.");
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
                    <select 
                        className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white"
                        value={selectedMachineId}
                        onChange={(e) => setSelectedMachineId(e.target.value)}
                    >
                        <option value="">-- Select --</option>
                        {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>

                {selectedMachine && (
                    <div className="bg-industrial-900/50 p-3 rounded border border-industrial-600 mb-4">
                        <span className="text-xs text-industrial-500 block">{t('hours.last')}</span>
                        <span className="text-xl font-mono text-white">{selectedMachine.runningHours} h</span>
                    </div>
                )}

                <div className="space-y-1">
                    <label className="text-xs text-industrial-400 font-bold uppercase">{t('hours.current')}</label>
                    <input 
                        type="number" 
                        required
                        className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white font-mono"
                        placeholder="e.g. 12500"
                        value={currentReading || ''}
                        onChange={e => setCurrentReading(Number(e.target.value))}
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
                                <td className="px-6 py-3 font-mono text-industrial-accent">{log.hoursLogged} h</td>
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