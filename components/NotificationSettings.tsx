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
  Check
} from 'lucide-react';

type AlertType = 'alerts_rmant05' | 'low_stock' | 'pending_approvals';

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
      u.email.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  return (
    <div className="bg-industrial-900/50 border border-industrial-700/50 rounded-xl overflow-hidden shadow-lg transition-all hover:border-industrial-600">
      <div className="p-5 border-b border-industrial-700/50 flex items-start gap-4">
        <div className={`p-3 ${iconBg} ${iconColor} rounded-lg shadow-inner`}>
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="text-white font-bold text-lg">{title}</h4>
          <p className="text-sm text-industrial-400 mt-1">{description}</p>
        </div>
      </div>
      
      <div className="p-4 bg-industrial-950/30">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-500" size={16} />
          <input
            type="text"
            placeholder="Buscar usuario por nombre o correo..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-industrial-900 border border-industrial-700 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:border-industrial-accent outline-none transition-all"
          />
        </div>

        <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 pr-1">
          {filteredUsers.length > 0 ? (
            filteredUsers.map(user => (
              <div 
                key={user.id}
                onClick={() => onToggleUser(user.id)}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedIds.has(user.id) 
                    ? 'bg-industrial-accent/10 border border-industrial-accent/30' 
                    : 'hover:bg-industrial-800 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-industrial-800 flex items-center justify-center text-industrial-400 border border-industrial-700">
                    <UserIcon size={14} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{user.full_name}</div>
                    <div className="text-xs text-industrial-500">{user.email}</div>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                  selectedIds.has(user.id)
                    ? 'bg-industrial-accent border-industrial-accent text-white scale-110'
                    : 'border-industrial-600 bg-industrial-900'
                }`}>
                  {selectedIds.has(user.id) && <Check size={14} strokeWidth={3} />}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-industrial-500 italic text-sm">
              No se encontraron usuarios.
            </div>
          )}
        </div>
        <div className="mt-3 text-right pr-2">
          <span className="text-xs font-mono text-industrial-500">
            {selectedIds.size} usuarios seleccionados
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
    alerts_rmant05: new Set(),
    low_stock: new Set(),
    pending_approvals: new Set(),
  });

  const [searchTerms, setSearchTerms] = useState<Record<AlertType, string>>({
    alerts_rmant05: '',
    low_stock: '',
    pending_approvals: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const allUsers = await UserSupabaseService.getUsersWithPreferences();
        setUsers(allUsers);
        setInitialData(JSON.parse(JSON.stringify(allUsers))); // Clone for comparison

        // Initialize selections from DB
        const newSelections = {
          alerts_rmant05: new Set<string>(),
          low_stock: new Set<string>(),
          pending_approvals: new Set<string>(),
        };

        allUsers.forEach(u => {
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
          alerts_rmant05: selections.alerts_rmant05.has(user.id),
          low_stock: selections.low_stock.has(user.id),
          pending_approvals: selections.pending_approvals.has(user.id)
        };

        const oldPrefs = initialData.find(u => u.id === user.id)?.notification_preferences || {
          alerts_rmant05: false,
          low_stock: false,
          pending_approvals: false
        };

        const changed = 
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
    <div className="max-w-6xl mx-auto mt-6 animate-fadeIn pb-20">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AlertSection
            title="Averías (R-MANT-05)"
            description="Reciben una alerta cuando se reporta una falla correctiva urgente."
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
