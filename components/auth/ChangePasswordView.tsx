import React, { useState } from 'react';
import { supabase } from '../../src/services/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Key, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';

export const ChangePasswordView: React.FC = () => {
    const { user, logout } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setIsLoading(true);

        try {
            // 1. Actualizar contraseña en Auth
            const { error: authError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (authError) throw authError;

            // 2. Actualizar perfil para quitar el flag
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ requires_password_change: false })
                .eq('id', user?.id);

            if (profileError) throw profileError;

            setIsSuccess(true);
            
            // Redirect after 2 seconds
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);

        } catch (err: any) {
            console.error('Error changing password:', err);
            setError(err.message || 'Error al cambiar la contraseña. Inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-industrial-900 flex items-center justify-center p-4">
                <div className="bg-industrial-800 border border-industrial-700 p-8 rounded-xl shadow-2xl max-w-md w-full text-center space-y-4">
                    <div className="flex justify-center">
                        <CheckCircle size={64} className="text-emerald-500 animate-bounce" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">¡Contraseña Actualizada!</h2>
                    <p className="text-industrial-400">Tu cuenta ahora es segura. Redirigiendo al panel principal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-industrial-900 flex items-center justify-center p-4">
            <div className="bg-industrial-800 border border-industrial-700 overflow-hidden rounded-xl shadow-2xl max-w-md w-full">
                <div className="bg-industrial-900/50 p-6 border-b border-industrial-700">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-blue-600/20 p-2 rounded-lg">
                            <Shield className="text-blue-500" size={24} />
                        </div>
                        <h1 className="text-xl font-bold text-white tracking-tight">Seguridad de Acceso</h1>
                    </div>
                    <p className="text-sm text-industrial-400">Por favor, define una contraseña permanente para tu cuenta de CoreFlow.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs text-industrial-500 font-bold uppercase tracking-wider">Nueva Contraseña</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-500" size={16} />
                                <input
                                    required
                                    type={showPassword ? 'text' : 'password'}
                                    className="w-full bg-industrial-900 border border-industrial-700 rounded-lg py-3 pl-10 pr-10 text-white placeholder-industrial-600 focus:border-blue-500 transition-colors outline-none"
                                    placeholder="Al menos 8 caracteres"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-industrial-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-industrial-500 font-bold uppercase tracking-wider">Confirmar Contraseña</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-500" size={16} />
                                <input
                                    required
                                    type={showPassword ? 'text' : 'password'}
                                    className="w-full bg-industrial-900 border border-industrial-700 rounded-lg py-3 pl-10 pr-10 text-white placeholder-industrial-600 focus:border-blue-500 transition-colors outline-none"
                                    placeholder="Repite la contraseña"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-xs leading-relaxed">
                            {error}
                        </div>
                    )}

                    <div className="space-y-3">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Establecer Contraseña'}
                        </button>
                        
                        <button
                            type="button"
                            onClick={() => logout()}
                            className="w-full text-industrial-500 hover:text-white text-xs py-2 transition-colors"
                        >
                            Cancelar y Cerrar Sesión
                        </button>
                    </div>
                </form>

                <div className="p-4 bg-industrial-900/30 border-t border-industrial-700 text-[10px] text-industrial-600 text-center uppercase tracking-widest font-bold">
                    Secure Industrial Infrastructure v4.0
                </div>
            </div>
        </div>
    );
};
