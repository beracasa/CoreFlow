import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../src/services/supabaseClient';
import { Bell, AlertTriangle, Package, CheckSquare, Save, Loader2 } from 'lucide-react';

interface NotificationPreferences {
  work_order_alerts: boolean;
  low_stock_alerts: boolean;
  pending_approvals: boolean;
}

export const NotificationSettings = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    work_order_alerts: false,
    low_stock_alerts: false,
    pending_approvals: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('notification_settings')
          .eq('id', user.id)
          .single();

        if (!error && data?.notification_settings) {
          setPreferences({
            work_order_alerts: !!data.notification_settings.work_order_alerts,
            low_stock_alerts: !!data.notification_settings.low_stock_alerts,
            pending_approvals: !!data.notification_settings.pending_approvals,
          });
        }
      } catch (err) {
        console.error('Error fetching notification settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_settings: preferences })
        .eq('id', user.id);

      if (error) throw error;
      alert('Preferencias guardadas exitosamente.');
    } catch (err) {
      console.error('Error saving notification settings:', err);
      alert('Error al guardar preferencias.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 text-industrial-400">
        <Loader2 className="animate-spin mr-2" /> Cargando preferencias...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-6 animate-fadeIn">
      <div className="bg-industrial-800 border border-industrial-700 rounded-lg p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-industrial-700">
          <Bell className="text-industrial-accent" size={24} />
          <div>
            <h3 className="text-xl font-bold text-white">Preferencias de Notificaciones</h3>
            <p className="text-sm text-industrial-400">Configura qué alertas deseas recibir en tu correo electrónico ({user?.email})</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Work Orders */}
          <div className="flex items-center justify-between p-4 bg-industrial-900/50 rounded-lg border border-industrial-700/50">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-red-900/20 text-red-500 rounded">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="text-white font-medium">Alertas de Averías (R-MANT-05)</h4>
                <p className="text-sm text-industrial-400">Recibe un correo cuando se reporte una nueva avería tipo Correctivo.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={preferences.work_order_alerts}
                onChange={() => handleToggle('work_order_alerts')}
              />
              <div className="w-11 h-6 bg-industrial-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-industrial-accent"></div>
            </label>
          </div>

          {/* Spare Parts */}
          <div className="flex items-center justify-between p-4 bg-industrial-900/50 rounded-lg border border-industrial-700/50">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-orange-900/20 text-orange-500 rounded">
                <Package size={20} />
              </div>
              <div>
                <h4 className="text-white font-medium">Alertas de Bajo Stock</h4>
                <p className="text-sm text-industrial-400">Recibe una alerta cuando un repuesto llegue a su stock mínimo.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={preferences.low_stock_alerts}
                onChange={() => handleToggle('low_stock_alerts')}
              />
              <div className="w-11 h-6 bg-industrial-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-industrial-accent"></div>
            </label>
          </div>

          {/* Pending Approvals */}
          <div className="flex items-center justify-between p-4 bg-industrial-900/50 rounded-lg border border-industrial-700/50">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-900/20 text-blue-500 rounded">
                <CheckSquare size={20} />
              </div>
              <div>
                <h4 className="text-white font-medium">Órdenes Pendientes de Aprobación</h4>
                <p className="text-sm text-industrial-400">Recibe un recordatorio cuando haya órdenes esperando tu firma o cierre.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={preferences.pending_approvals}
                onChange={() => handleToggle('pending_approvals')}
              />
              <div className="w-11 h-6 bg-industrial-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-industrial-accent"></div>
            </label>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-industrial-accent hover:bg-blue-600 px-6 py-2.5 rounded text-white font-bold transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {isSaving ? 'Guardando...' : 'Guardar Preferencias'}
          </button>
        </div>
      </div>
    </div>
  );
};
