import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, ArrowRight, AlertCircle, ShieldCheck, Hexagon } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
    setIsSubmitting(true);
    try {
      await login(email, password);
      // Navigation handled by useEffect
    } catch (err) {
      setError('Invalid credentials. Access denied.');
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

            {error && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-industrial-accent hover:bg-blue-600 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-wait' : 'hover:translate-y-[-1px]'}`}
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In'}
              {!isSubmitting && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          {/* Demo Hint */}
          <div className="mt-8 pt-6 border-t border-industrial-700/50">
            <p className="text-xs text-center text-industrial-500 mb-3">Demo Credentials (Click to copy)</p>
            <div className="flex gap-2 justify-center flex-wrap">
              <button onClick={() => { setEmail('admin@coreflow.io'); setPassword('1234'); }} className="px-2 py-1 bg-industrial-900 border border-industrial-700 rounded text-[10px] text-industrial-400 hover:text-white hover:border-industrial-500 transition-colors">Admin</button>
              <button onClick={() => { setEmail('tech@coreflow.io'); setPassword('1234'); }} className="px-2 py-1 bg-industrial-900 border border-industrial-700 rounded text-[10px] text-industrial-400 hover:text-white hover:border-industrial-500 transition-colors">Tech</button>
              <button onClick={() => { setEmail('auditor@coreflow.io'); setPassword('1234'); }} className="px-2 py-1 bg-industrial-900 border border-industrial-700 rounded text-[10px] text-industrial-400 hover:text-white hover:border-industrial-500 transition-colors">Auditor</button>
            </div>
          </div>
        </div>
      </div>

      <p className="absolute bottom-6 text-xs text-industrial-600 font-mono">
        Secured by Supabase • 256-bit Encryption
      </p>
    </div>
  );
};