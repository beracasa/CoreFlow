import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { PlanTier } from '../types';
import { Globe, Check } from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: (selectedPlan: PlanTier) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const { language, setLanguage, t } = useLanguage();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);

  const nextStep = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      if (!selectedPlan) return;
      setLoading(true);
      setTimeout(() => onComplete(selectedPlan), 1500); // Simulate SaaS provisioning
    }
  };

  return (
    <div className="min-h-screen bg-industrial-900 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-industrial-800 rounded-2xl shadow-2xl border border-industrial-700 overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 w-full bg-industrial-900">
          <div 
            className="h-full bg-industrial-accent transition-all duration-500" 
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">{step === 3 ? 'Select Your Plan' : 'Configure CoreFlow Environment'}</h1>
            <p className="text-industrial-500">Step {step} of 3</p>
          </div>

          <div className="min-h-[300px]">
            {step === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="text-center mb-6">
                    <h3 className="text-lg text-white font-medium flex items-center justify-center gap-2">
                        <Globe size={18} /> Select Language / Seleccionar Idioma
                    </h3>
                    <div className="flex justify-center gap-4 mt-4">
                        <button 
                            onClick={() => setLanguage('en')}
                            className={`px-6 py-3 rounded-lg border transition-all ${language === 'en' ? 'bg-industrial-accent border-industrial-accent text-white shadow-lg' : 'bg-industrial-900 border-industrial-600 text-industrial-400 hover:border-industrial-500'}`}
                        >
                            <span className="text-lg font-bold">English</span>
                        </button>
                        <button 
                            onClick={() => setLanguage('es')}
                            className={`px-6 py-3 rounded-lg border transition-all ${language === 'es' ? 'bg-industrial-accent border-industrial-accent text-white shadow-lg' : 'bg-industrial-900 border-industrial-600 text-industrial-400 hover:border-industrial-500'}`}
                        >
                            <span className="text-lg font-bold">Español</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-industrial-700">
                  <h3 className="text-lg text-white font-medium">{t('settings.metadata.title')}</h3>
                  <div className="space-y-2">
                    <label className="text-sm text-industrial-400">{t('settings.plantName')}</label>
                    <input type="text" className="w-full bg-industrial-900 border border-industrial-600 rounded p-3 text-white focus:border-industrial-accent outline-none" placeholder="e.g. Mexico City Main Plant" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-industrial-400">{t('settings.timezone')}</label>
                    <select className="w-full bg-industrial-900 border border-industrial-600 rounded p-3 text-white focus:border-industrial-accent outline-none">
                       <option>UTC-6 (Mexico City)</option>
                       <option>UTC-5 (New York / Bogota)</option>
                       <option>UTC-4 (Caribbean / Santo Domingo)</option>
                       <option>UTC+1 (Berlin)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-lg text-white font-medium">{t('assets.title')} (IoT)</h3>
                <p className="text-sm text-industrial-500 mb-4">Select protocol for Edge Gateway discovery.</p>
                <div className="grid grid-cols-2 gap-4">
                   <button className="p-4 border border-industrial-600 rounded hover:border-industrial-accent hover:bg-industrial-700 transition-all text-left group">
                      <span className="block text-white font-bold group-hover:text-industrial-accent">OPC-UA</span>
                      <span className="text-xs text-industrial-500">Standard for SACMI/MOSS</span>
                   </button>
                   <button className="p-4 border border-industrial-600 rounded hover:border-industrial-accent hover:bg-industrial-700 transition-all text-left group">
                      <span className="block text-white font-bold group-hover:text-industrial-accent">MQTT Broker</span>
                      <span className="text-xs text-industrial-500">Lightweight Pub/Sub</span>
                   </button>
                </div>
                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded text-xs text-blue-200">
                   Detected 3 devices on local subnet.
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-3 gap-4 mt-2">
                    {/* LIGHT PLAN */}
                    <div 
                        onClick={() => setSelectedPlan(PlanTier.LIGHT)}
                        className={`cursor-pointer border p-4 rounded-xl flex flex-col justify-between transition-all ${selectedPlan === PlanTier.LIGHT ? 'bg-industrial-800 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-industrial-900 border-industrial-600 opacity-70 hover:opacity-100'}`}
                    >
                        <div>
                            <h4 className="font-bold text-white text-lg">Light</h4>
                            <p className="text-xs text-industrial-400 mt-1">Funcionalidad Básica</p>
                            <ul className="mt-4 text-xs text-industrial-300 space-y-2">
                                <li className="flex gap-2"><Check size={14} className="text-emerald-500"/> Mantenimiento Prev.</li>
                                <li className="flex gap-2"><Check size={14} className="text-emerald-500"/> Correctivos</li>
                                <li className="flex gap-2"><Check size={14} className="text-emerald-500"/> Inventario</li>
                                <li className="text-industrial-600 flex gap-2"><div className="w-3 h-px bg-industrial-600 mt-2"/> Sin BI / Kanban</li>
                            </ul>
                        </div>
                    </div>

                    {/* PROFESSIONAL PLAN */}
                    <div 
                        onClick={() => setSelectedPlan(PlanTier.PROFESSIONAL)}
                        className={`cursor-pointer border-2 p-4 rounded-xl flex flex-col justify-between transition-all relative ${selectedPlan === PlanTier.PROFESSIONAL ? 'bg-industrial-800 border-industrial-accent shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-industrial-800 border-industrial-600'}`}
                    >
                         <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-industrial-accent text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">Most Popular</div>
                        <div>
                            <h4 className="font-bold text-white text-lg">Professional</h4>
                            <p className="text-xs text-industrial-400 mt-1">Gestión Avanzada</p>
                            <ul className="mt-4 text-xs text-industrial-300 space-y-2">
                                <li className="flex gap-2"><Check size={14} className="text-emerald-500"/> Todo Light +</li>
                                <li className="flex gap-2"><Check size={14} className="text-emerald-500"/> Tablero Kanban</li>
                                <li className="flex gap-2"><Check size={14} className="text-emerald-500"/> BI Analytics</li>
                                <li className="text-industrial-600 flex gap-2"><div className="w-3 h-px bg-industrial-600 mt-2"/> Sin Visual Plant</li>
                            </ul>
                        </div>
                    </div>

                    {/* BUSINESS PLAN */}
                    <div 
                        onClick={() => setSelectedPlan(PlanTier.BUSINESS)}
                        className={`cursor-pointer border p-4 rounded-xl flex flex-col justify-between transition-all ${selectedPlan === PlanTier.BUSINESS ? 'bg-industrial-800 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-industrial-900 border-industrial-600 opacity-70 hover:opacity-100'}`}
                    >
                        <div>
                            <h4 className="font-bold text-white text-lg">Business</h4>
                            <p className="text-xs text-industrial-400 mt-1">Plataforma Completa</p>
                            <ul className="mt-4 text-xs text-industrial-300 space-y-2">
                                <li className="flex gap-2"><Check size={14} className="text-purple-500"/> Todo Professional +</li>
                                <li className="flex gap-2"><Check size={14} className="text-purple-500"/> Visual Plant (Map)</li>
                                <li className="flex gap-2"><Check size={14} className="text-purple-500"/> IoT en Tiempo Real</li>
                                <li className="flex gap-2"><Check size={14} className="text-purple-500"/> Custom Maint. Specs</li>
                            </ul>
                        </div>
                    </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between mt-8 pt-6 border-t border-industrial-700">
            {step > 1 ? (
              <button 
                onClick={() => setStep(step - 1)}
                className="text-industrial-400 hover:text-white text-sm"
              >
                Back
              </button>
            ) : <div></div>}
            
            <button 
              onClick={nextStep}
              disabled={loading || (step === 3 && !selectedPlan)}
              className={`px-6 py-2 rounded shadow-lg transition-all flex items-center gap-2 ${
                  loading || (step === 3 && !selectedPlan) 
                  ? 'bg-industrial-700 text-industrial-500 cursor-not-allowed' 
                  : 'bg-industrial-accent hover:bg-blue-600 text-white shadow-blue-900/20'
              }`}
            >
              {loading ? 'Provisioning...' : step === 3 ? 'Launch CoreFlow' : 'Continue'}
              {!loading && step !== 3 && <span>→</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};