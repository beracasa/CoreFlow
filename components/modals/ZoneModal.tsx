import React, { useState, useEffect } from 'react';
import { X, Layers, Plus, Trash2, Palette } from 'lucide-react';
import { ZoneStructure } from '../../types';

interface ZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (zone: ZoneStructure) => Promise<void> | void;
  zone?: ZoneStructure | null;
}

export const ZONE_COLOR_OPTIONS = [
  { id: 'slate', label: 'Gris Industrial', hex: '#64748b', borderClass: 'border-slate-500', bgClass: 'bg-slate-500/10' },
  { id: 'blue', label: 'Azul Eléctrico', hex: '#3b82f6', borderClass: 'border-blue-500', bgClass: 'bg-blue-500/10' },
  { id: 'emerald', label: 'Verde Esmeralda', hex: '#10b981', borderClass: 'border-emerald-500', bgClass: 'bg-emerald-500/10' },
  { id: 'amber', label: 'Ámbar Alerta', hex: '#f59e0b', borderClass: 'border-amber-500', bgClass: 'bg-amber-500/10' },
  { id: 'purple', label: 'Púrpura Tecnológico', hex: '#8b5cf6', borderClass: 'border-purple-500', bgClass: 'bg-purple-500/10' },
  { id: 'red', label: 'Rojo Crítico', hex: '#ef4444', borderClass: 'border-red-500', bgClass: 'bg-red-500/10' },
  { id: 'cyan', label: 'Cian Neón', hex: '#06b6d4', borderClass: 'border-cyan-500', bgClass: 'bg-cyan-500/10' },
];

export const ZoneModal: React.FC<ZoneModalProps> = ({ isOpen, onClose, onSave, zone }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('slate');
  const [lines, setLines] = useState<string[]>([]);
  const [newLineName, setNewLineName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (zone) {
        setName(zone.name || '');
        setColor(zone.color || 'slate');
        setLines(zone.lines ? [...zone.lines] : []);
      } else {
        setName('');
        setColor('slate');
        setLines([]);
      }
      setNewLineName('');
    }
  }, [isOpen, zone]);

  if (!isOpen) return null;

  const handleAddLine = () => {
    const trimmed = newLineName.trim();
    if (trimmed && !lines.includes(trimmed)) {
      setLines([...lines, trimmed]);
      setNewLineName('');
    }
  };

  const handleRemoveLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      if (zone) {
        await onSave({
          ...zone,
          name: name.trim(),
          color,
          lines
        });
      } else {
        const newZone: ZoneStructure = {
          id: `zone-${Date.now()}`,
          name: name.trim(),
          color,
          lines,
          x: 15,
          y: 15,
          width: 25,
          height: 25
        };
        await onSave(newZone);
      }
      onClose();
    } catch (err) {
      console.error('Error saving zone:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-industrial-800 rounded-xl border border-industrial-600 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-industrial-700 flex justify-between items-center bg-industrial-900/60">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Layers className="w-5 h-5 text-industrial-accent" />
            <span>{zone ? 'Editar Línea y Formato' : 'Crear Nueva Línea'}</span>
          </h3>
          <button onClick={onClose} className="text-industrial-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Line Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-industrial-300 mb-2">
              Nombre de la Línea *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Línea 1, Línea de Envasado, Línea A..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-industrial-900 border border-industrial-600 rounded-lg px-4 py-2.5 text-white placeholder-industrial-500 focus:outline-none focus:border-industrial-accent text-sm"
            />
          </div>

          {/* Color & Format Theme */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-industrial-300 mb-2 flex items-center gap-2">
              <Palette size={14} className="text-industrial-accent" />
              <span>Color y Formato en el Mapa</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ZONE_COLOR_OPTIONS.map((opt) => {
                const isSelected = color === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setColor(opt.id)}
                    className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs font-medium transition-all ${
                      isSelected
                        ? `${opt.borderClass} ${opt.bgClass} text-white shadow-md ring-1 ring-white/20`
                        : 'border-industrial-700 bg-industrial-900/40 text-industrial-400 hover:text-white hover:bg-industrial-700/50'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: opt.hex }}
                    />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Areas list */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-industrial-300 mb-2">
              Áreas de Producción en esta Línea
            </label>

            {/* Add Area Input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Nombre del área (ej: Producción, Empaque, Sellado...)"
                value={newLineName}
                onChange={(e) => setNewLineName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLine();
                  }
                }}
                className="flex-1 bg-industrial-900 border border-industrial-600 rounded-lg px-3 py-2 text-white placeholder-industrial-500 focus:outline-none focus:border-industrial-accent text-xs"
              />
              <button
                type="button"
                onClick={handleAddLine}
                className="px-3 py-2 bg-industrial-700 hover:bg-industrial-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus size={14} />
                <span>Agregar Área</span>
              </button>
            </div>

            {/* Areas List */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {lines.length === 0 ? (
                <p className="text-xs text-industrial-500 italic p-2 bg-industrial-900/30 rounded border border-industrial-800">
                  No hay áreas registradas aún. Puedes agregar áreas para subdividir los equipos de la línea.
                </p>
              ) : (
                lines.map((line, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-industrial-900/60 border border-industrial-700/60 text-xs text-white"
                  >
                    <span className="font-mono font-medium">{line}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      className="text-industrial-400 hover:text-red-400 transition-colors p-1"
                      title="Eliminar Área"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-industrial-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-xs font-bold text-industrial-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-industrial-accent hover:bg-industrial-accent/80 text-white transition-all disabled:opacity-50 shadow-lg shadow-industrial-accent/20 flex items-center gap-2"
            >
              {isSaving ? 'Guardando...' : zone ? 'Guardar Cambios' : 'Crear Línea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
