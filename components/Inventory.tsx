import React, { useState } from 'react';
import { SparePart } from '../types';
import { X, Package, DollarSign, Layers } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface InventoryProps {
  parts: SparePart[];
  onAddPart: (part: SparePart) => void;
}

export const Inventory: React.FC<InventoryProps> = ({ parts, onAddPart }) => {
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [newPart, setNewPart] = useState<Partial<SparePart>>({
    name: '',
    sku: '',
    category: 'MECHANICAL',
    currentStock: 0,
    minimumStock: 0,
    unitCost: 0,
    supplier: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPart.name || !newPart.sku) return;

    const part: SparePart = {
      id: `sp-${Date.now()}`,
      name: newPart.name,
      sku: newPart.sku,
      category: newPart.category as any,
      currentStock: Number(newPart.currentStock) || 0,
      minimumStock: Number(newPart.minimumStock) || 0,
      unitCost: Number(newPart.unitCost) || 0,
      supplier: newPart.supplier || 'Internal',
      leadTimeDays: 5, // Default
    };

    onAddPart(part);
    setShowModal(false);
    // Reset form
    setNewPart({
        name: '',
        sku: '',
        category: 'MECHANICAL',
        currentStock: 0,
        minimumStock: 0,
        unitCost: 0,
        supplier: '',
    });
  };

  return (
    <div className="h-full bg-industrial-900 p-6 overflow-auto relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">{t('inventory.title')}</h2>
          <p className="text-industrial-500 text-sm">{t('inventory.subtitle')}</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-industrial-accent hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors shadow-lg shadow-blue-900/20 flex items-center gap-2"
        >
          <Package className="w-4 h-4" />
          {t('inventory.add')}
        </button>
      </div>

      <div className="bg-industrial-800 rounded-lg border border-industrial-700 overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-industrial-400">
          <thead className="bg-industrial-900 text-xs uppercase font-bold text-industrial-500">
            <tr>
              <th className="px-6 py-4">{t('inventory.col.sku')}</th>
              <th className="px-6 py-4">{t('inventory.col.status')}</th>
              <th className="px-6 py-4 text-right">{t('inventory.col.stock')}</th>
              <th className="px-6 py-4 text-right">{t('inventory.col.reorder')}</th>
              <th className="px-6 py-4 text-right">{t('inventory.col.cost')}</th>
              <th className="px-6 py-4">{t('inventory.col.supplier')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-industrial-700">
            {parts.map((part) => {
              const stockPercentage = (part.currentStock / (part.minimumStock * 2)) * 100;
              const isLowStock = part.currentStock <= part.minimumStock;

              return (
                <tr key={part.id} className="hover:bg-industrial-700/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-white font-medium group-hover:text-industrial-accent transition-colors">{part.name}</span>
                      <span className="text-xs font-mono opacity-50">{part.sku}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {isLowStock ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-900">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        {t('inventory.status.low')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-900/30 text-emerald-400 border border-emerald-900">
                        {t('inventory.status.ok')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <span className={`font-mono font-bold ${isLowStock ? 'text-red-400' : 'text-white'}`}>
                        {part.currentStock}
                      </span>
                      {/* Simple visual bar */}
                      <div className="w-16 h-1.5 bg-industrial-900 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${isLowStock ? 'bg-red-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-industrial-500">
                    {part.minimumStock}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-white">
                    ${part.unitCost.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-white">
                    {part.supplier}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL - Add Part */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-industrial-800 rounded-lg border border-industrial-600 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-industrial-700 flex justify-between items-center bg-industrial-900/50">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Package className="w-4 h-4 text-industrial-accent" />
                {t('inventory.modal.title')}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-industrial-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-industrial-400 font-medium uppercase tracking-wider">{t('inventory.modal.name')}</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm focus:border-industrial-accent outline-none transition-colors"
                    placeholder="e.g. Servo Motor Axis-X"
                    value={newPart.name}
                    onChange={e => setNewPart({...newPart, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-industrial-400 font-medium uppercase tracking-wider">{t('inventory.modal.sku')}</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm focus:border-industrial-accent outline-none font-mono transition-colors"
                    placeholder="e.g. SRV-001"
                    value={newPart.sku}
                    onChange={e => setNewPart({...newPart, sku: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-industrial-400 font-medium uppercase tracking-wider">{t('inventory.modal.category')}</label>
                <div className="relative">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-industrial-500" />
                  <select 
                    className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 pl-9 text-white text-sm focus:border-industrial-accent outline-none appearance-none cursor-pointer transition-colors"
                    value={newPart.category}
                    onChange={e => setNewPart({...newPart, category: e.target.value as any})}
                  >
                    <option value="MECHANICAL">MECHANICAL</option>
                    <option value="ELECTRICAL">ELECTRICAL</option>
                    <option value="HYDRAULIC">HYDRAULIC</option>
                    <option value="PNEUMATIC">PNEUMATIC</option>
                    <option value="CONSUMABLE">CONSUMABLE</option>
                    <option value="SENSOR">SENSOR</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                   <label className="text-xs text-industrial-400 font-medium uppercase tracking-wider">{t('inventory.modal.stock')}</label>
                   <input 
                     type="number" 
                     className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm focus:border-industrial-accent outline-none font-mono"
                     value={newPart.currentStock}
                     onChange={e => setNewPart({...newPart, currentStock: Number(e.target.value)})}
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-xs text-industrial-400 font-medium uppercase tracking-wider">{t('inventory.modal.reorder')}</label>
                   <input 
                     type="number" 
                     className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm focus:border-industrial-accent outline-none font-mono"
                     value={newPart.minimumStock}
                     onChange={e => setNewPart({...newPart, minimumStock: Number(e.target.value)})}
                   />
                </div>
                 <div className="space-y-1">
                   <label className="text-xs text-industrial-400 font-medium uppercase tracking-wider">{t('inventory.modal.cost')}</label>
                   <input 
                     type="number" 
                     className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm focus:border-industrial-accent outline-none font-mono"
                     value={newPart.unitCost}
                     onChange={e => setNewPart({...newPart, unitCost: Number(e.target.value)})}
                   />
                </div>
              </div>

              <div className="space-y-1">
                  <label className="text-xs text-industrial-400 font-medium uppercase tracking-wider">{t('inventory.modal.supplier')}</label>
                  <input 
                    type="text" 
                    className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-white text-sm focus:border-industrial-accent outline-none transition-colors"
                    placeholder="e.g. Siemens Automation"
                    value={newPart.supplier}
                    onChange={e => setNewPart({...newPart, supplier: e.target.value})}
                  />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-industrial-700 mt-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="px-4 py-2 rounded text-sm text-industrial-300 hover:text-white hover:bg-industrial-700 transition-colors"
                >
                  {t('inventory.modal.cancel')}
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded text-sm bg-industrial-accent text-white font-medium hover:bg-blue-600 transition-colors shadow-lg shadow-blue-900/20"
                >
                  {t('inventory.modal.confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};