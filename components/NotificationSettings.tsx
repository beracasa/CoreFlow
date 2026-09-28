import React, { useState, useEffect, useMemo } from 'react';
import { UserSupabaseService } from '../src/services/UserSupabaseService';
import { UserProfile } from '../types';
import { 
  Bell, 
  AlertTriangle, 
  Package, 
  CheckSquare, 
  Save, 
  Loader2, 
  Search,
  User as UserIcon,
  Check,
  Wrench
} from 'lucide-react';

type AlertType = 'alerts_rmant02' | 'alerts_rmant05' | 'low_stock' | 'pending_approvals';

interface AlertSectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  users: UserProfile[];
  selectedIds: Set<string>;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onToggleUser: (userId: string) => void;
}

const AlertSection = ({ 
  title, 
  description, 
  icon, 
  iconBg, 
  iconColor, 
  users, 
  selectedIds, 
  searchTerm, 
  onSearchChange, 
  onToggleUser 
}: AlertSectionProps) => {
  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return users.filter(u => 
      u.full_name.toLowerCase().includes(term) || 
      u.email.toLowerCase().includes(term) ||
      (u.roleName && u.roleName.toLowerCase().includes(term))
    );
  }, [users, searchTerm]);

  return (
    <div className="bg-industrial-900/60 border border-industrial-700/60 rounded-2xl overflow-hidden shadow-xl transition-all duration-200 hover:border-industrial-600 flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-industrial-700/50 flex items-start gap-4">
        <div className={`p-3.5 ${iconBg} ${iconColor} rounded-xl shadow-inner shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-white font-bold text-lg tracking-tight truncate">{title}</h4>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 transition-colors ${
              selectedIds.size > 0 
                ? 'bg-industrial-accent/20 text-industrial-accent border border-industrial-accent/30' 
                : 'bg-industrial-800 text-industrial-400 border border-industrial-700'
            }`}>
              {selectedIds.size} {selectedIds.size === 1 ? 'destinatario' : 'destinatarios'}
            </span>
          </div>
          <p className="text-sm text-industrial-400 mt-1.5 leading-relaxed">{description}</p>
        </div>
      </div>
      
      {/* Search & List */}
      <div className="p-5 bg-industrial-950/40 flex-1 flex flex-col justify-between">
        <div className="relative mb-3.5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-industrial-500" size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre, correo o cargo..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-industrial-900 border border-industrial-700 rounded-xl py-2.5 pl-10 pr-9 text-sm text-white placeholder-industrial-500 focus:border-industrial-accent focus:ring-1 focus:ring-industrial-accent outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-industrial-500 hover:text-white text-xs p-1"
            >
              ✕
            </button>
          )}
        </div>

        <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1.5 pr-1 flex-1">
          {filteredUsers.length > 0 ? (
            filteredUsers.map(user => {
              const isSelected = selectedIds.has(user.id);
              return (
                <div 
                  key={user.id}
                  onClick={() => onToggleUser(user.id)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-150 ${
                    isSelected 
                      ? 'bg-industrial-accent/15 border border-industrial-accent/40 shadow-sm' 
                      : 'hover:bg-industrial-800/80 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-3">
                    <div className="w-9 h-9 rounded-full bg-industrial-800/90 flex items-center justify-center text-industrial-400 border border-industrial-700/80 shrink-0">
                      <UserIcon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white truncate">{user.full_name}</div>
                      <div className="text-xs text-industrial-400 truncate">
                        {user.email}
                        {user.roleName ? ` • ${user.roleName}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? 'bg-industrial-accent border-industrial-accent text-white scale-105'
                      : 'border-industrial-600 bg-industrial-900'
                  }`}>
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-industrial-500 italic text-sm">
              No se encontraron usuarios coincidentes.
            </div>
          )}
        </div>

        <div className="mt-3.5 pt-3 border-t border-industrial-800/60 flex items-center justify-between text-xs text-industrial-400">
          <span>{filteredUsers.length} de {users.length} usuarios</span>
          <span className="font-medium text-industrial-300">
            {selectedIds.size} activo{selectedIds.size === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>
  );
};

export const NotificationSettings = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [initialData, setInitialData] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selections, setSelections] = useState<Record<AlertType, Set<string>>>({
    alerts_rmant02: new Set(),
    alerts_rmant05: new Set(),
    low_stock: new Set(),
    pending_approvals: new Set(),
  });

  const [searchTerms, setSearchTerms] = useState<Record<AlertType, string>>({
    alerts_rmant02: '',
    alerts_rmant05: '',
    low_stock: '',
    pending_approvals: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const allUsers = await UserSupabaseService.getUsersWithPreferences();
        // Ocultar al usuario administrador principal (Admin CoreFlow / beracasa@gmail.com)
        const visibleUsers = allUsers.filter(u => 
          u.email?.toLowerCase().trim() !== 'beracasa@gmail.com' &&
          u.full_name?.toLowerCase().trim() !== 'admin coreflow'
        );
        setUsers(visibleUsers);
        setInitialData(JSON.parse(JSON.stringify(visibleUsers))); // Clone for comparison

        // Initialize selections from DB
        const newSelections = {
          alerts_rmant02: new Set<string>(),
          alerts_rmant05: new Set<string>(),
          low_stock: new Set<string>(),
          pending_approvals: new Set<string>(),
        };

        visibleUsers.forEach(u => {
          if (u.notification_preferences?.alerts_rmant02) newSelections.alerts_rmant02.add(u.id);
          if (u.notification_preferences?.alerts_rmant05) newSelections.alerts_rmant05.add(u.id);
          if (u.notification_preferences?.low_stock) newSelections.low_stock.add(u.id);
          if (u.notification_preferences?.pending_approvals) newSelections.pending_approvals.add(u.id);
        });

        setSelections(newSelections);
      } catch (err) {
        console.error('Error loading users:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleToggleUser = (type: AlertType, userId: string) => {
    setSelections(prev => {
      const next = new Set(prev[type]);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return { ...prev, [type]: next };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: { userId: string, preferences: any }[] = [];

      // For every user, check if their consolidated preferences changed
      users.forEach(user => {
        const newPrefs = {
          alerts_rmant02: selections.alerts_rmant02.has(user.id),
          alerts_rmant05: selections.alerts_rmant05.has(user.id),
          low_stock: selections.low_stock.has(user.id),
          pending_approvals: selections.pending_approvals.has(user.id)
        };

        const oldPrefs = initialData.find(u => u.id === user.id)?.notification_preferences || {
          alerts_rmant02: false,
          alerts_rmant05: false,
          low_stock: false,
          pending_approvals: false
        };

        const changed = 
          newPrefs.alerts_rmant02 !== oldPrefs.alerts_rmant02 ||
          newPrefs.alerts_rmant05 !== oldPrefs.alerts_rmant05 ||
          newPrefs.low_stock !== oldPrefs.low_stock ||
          newPrefs.pending_approvals !== oldPrefs.pending_approvals;

        if (changed) {
          updates.push({ userId: user.id, preferences: newPrefs });
        }
      });

      if (updates.length > 0) {
        await UserSupabaseService.bulkUpdateNotificationPreferences(updates);
        // Sync initial data with saved state
        setInitialData(JSON.parse(JSON.stringify(users.map(u => ({
          ...u,
          notification_preferences: {
            alerts_rmant02: selections.alerts_rmant02.has(u.id),
            alerts_rmant05: selections.alerts_rmant05.has(u.id),
            low_stock: selections.low_stock.has(u.id),
            pending_approvals: selections.pending_approvals.has(u.id)
          }
        })))));
        alert(`Se han actualizado ${updates.length} perfiles exitosamente.`);
      } else {
        alert('No se detectaron cambios para guardar.');
      }
    } catch (err) {
      console.error('Error saving masive updates:', err);
      alert('Error al guardar los cambios masivos.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 text-industrial-400">
        <Loader2 className="animate-spin mb-4" size={40} />
        <span className="font-medium">Cargando gestión de notificaciones...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto mt-6 animate-fadeIn pb-20">
      <div className="bg-industrial-800 border border-industrial-700 rounded-2xl p-8 shadow-2xl relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-industrial-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-industrial-accent/20 text-industrial-accent rounded-xl">
              <Bell size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">Gestión Administrativa de Alertas</h3>
              <p className="text-industrial-400 mt-1">Asigna qué empleados recibirán cada tipo de notificación del sistema.</p>
            </div>
          </div>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 bg-industrial-accent hover:bg-blue-600 px-8 py-3 rounded-xl text-white font-bold transition-all shadow-lg hover:shadow-industrial-accent/20 disabled:opacity-50 active:scale-95"
          >
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {isSaving ? 'Aplicando cambios masivos...' : 'Guardar Preferencias'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AlertSection
            title="Preventivo (R-MANT-02)"
            description="Reciben una alerta cuando se programa o genera un mantenimiento preventivo. El personal asignado como ejecutante también recibirá la notificación."
            icon={<Wrench size={24} />}
            iconBg="bg-emerald-900/40"
            iconColor="text-emerald-400"
            users={users}
            selectedIds={selections.alerts_rmant02}
            searchTerm={searchTerms.alerts_rmant02}
            onSearchChange={(val) => setSearchTerms(s => ({ ...s, alerts_rmant02: val }))}
            onToggleUser={(id) => handleToggleUser('alerts_rmant02', id)}
          />

          <AlertSection
            title="Correctivo (R-MANT-05)"
            description="Reciben una alerta cuando se genera una solicitud de un mantenimiento correctivo. El personal asignado como ejecutante también recibirá la notificación."
            icon={<AlertTriangle size={24} />}
            iconBg="bg-red-900/40"
            iconColor="text-red-400"
            users={users}
            selectedIds={selections.alerts_rmant05}
            searchTerm={searchTerms.alerts_rmant05}
            onSearchChange={(val) => setSearchTerms(s => ({ ...s, alerts_rmant05: val }))}
            onToggleUser={(id) => handleToggleUser('alerts_rmant05', id)}
          />

          <AlertSection
            title="Bajo Stock"
            description="Reciben avisos cuando un repuesto crítico está por debajo del mínimo."
            icon={<Package size={24} />}
            iconBg="bg-orange-900/40"
            iconColor="text-orange-400"
            users={users}
            selectedIds={selections.low_stock}
            searchTerm={searchTerms.low_stock}
            onSearchChange={(val) => setSearchTerms(s => ({ ...s, low_stock: val }))}
            onToggleUser={(id) => handleToggleUser('low_stock', id)}
          />

          <AlertSection
            title="Firmas y Aprobaciones"
            description="Reciben recordatorios de órdenes que esperan cierre o validación técnica."
            icon={<CheckSquare size={24} />}
            iconBg="bg-blue-900/40"
            iconColor="text-blue-400"
            users={users}
            selectedIds={selections.pending_approvals}
            searchTerm={searchTerms.pending_approvals}
            onSearchChange={(val) => setSearchTerms(s => ({ ...s, pending_approvals: val }))}
            onToggleUser={(id) => handleToggleUser('pending_approvals', id)}
          />
        </div>

        {isSaving && (
          <div className="absolute inset-0 bg-industrial-950/60 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl">
            <div className="bg-industrial-800 p-8 rounded-xl border border-industrial-700 shadow-2xl flex flex-col items-center">
              <Loader2 className="animate-spin text-industrial-accent mb-4" size={48} />
              <h4 className="text-white font-bold text-lg">Guardando cambios masivos</h4>
              <p className="text-industrial-400 text-sm mt-2">Estamos actualizando las preferencias de los usuarios en la base de datos...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
