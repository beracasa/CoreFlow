import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../src/services/supabaseClient'; // Import supabase directly for signup
import { Lock, Mail, ArrowRight, AlertCircle, ShieldCheck, Hexagon, User } from 'lucide-react';
import { UserRole } from '../types';

export const Login: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState(''); // Success message
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/change-password`,
        });
        if (error) throw error;
        setMessage('Password recovery link sent to your email.');
      } else {
        // Handle Login
        await login(email, password);
        // Navigation handled by useEffect
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-industrial-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-industrial-accent/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl"></div>

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        ></div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-industrial-800/80 backdrop-blur-xl border border-industrial-600 rounded-2xl shadow-2xl relative z-10 overflow-hidden">
        {/* Header */}
        <div className="bg-industrial-900/50 p-8 text-center border-b border-industrial-700 flex flex-col items-center">
          <div className="relative mb-6 group">
            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full scale-150 group-hover:scale-175 transition-transform"></div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-industrial-800 to-industrial-900 rounded-2xl border border-industrial-600 flex items-center justify-center shadow-2xl">
              <Hexagon size={40} className="text-industrial-accent" strokeWidth={2} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">CoreFlow 4.0</h1>
          <p className="text-industrial-400 text-sm">Secure Industrial Access Gateway</p>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">



            <div className="space-y-2">
              <label className="text-xs font-bold text-industrial-400 uppercase tracking-wider ml-1">Corporate ID / Email</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-500 group-focus-within:text-industrial-accent transition-colors w-5 h-5" />
                <input
                  type="email"
                  required
                  className="w-full bg-industrial-900 border border-industrial-600 rounded-lg py-3 pl-10 pr-4 text-white placeholder-industrial-600 focus:border-industrial-accent focus:ring-1 focus:ring-industrial-accent outline-none transition-all"
                  placeholder="user@coreflow.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {!isForgotPassword && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-industrial-400 uppercase tracking-wider ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-500 group-focus-within:text-industrial-accent transition-colors w-5 h-5" />
                  <input
                    type="password"
                    required
                    className="w-full bg-industrial-900 border border-industrial-600 rounded-lg py-3 pl-10 pr-4 text-white placeholder-industrial-600 focus:border-industrial-accent focus:ring-1 focus:ring-industrial-accent outline-none transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            {message && (
              <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-3 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                <p className="text-sm text-green-200">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-industrial-accent hover:bg-blue-600 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-wait' : 'hover:translate-y-[-1px]'}`}
            >
              {isSubmitting ? (isForgotPassword ? 'Sending...' : 'Authenticating...') : (isForgotPassword ? 'Send Reset Link' : 'Sign In')}
              {!isSubmitting && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => { setIsForgotPassword(!isForgotPassword); setError(''); setMessage(''); }}
              className="text-sm text-industrial-400 hover:text-industrial-accent transition-colors"
            >
              {isForgotPassword ? 'Back to Sign In' : 'Forgot Password?'}
            </button>
          </div>
        </div>
      </div>

      <p className="absolute bottom-6 text-xs text-industrial-600 font-mono">
        Secured by Supabase • 256-bit Encryption
      </p>
    </div>
  );
};