
import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { SignaturePad } from '../shared/SignaturePad';
import { User, BadgeCheck, Mail, Briefcase, Award, X, Send } from 'lucide-react';
import { useUserStore } from '../../src/stores/useUserStore';
import { UserSupabaseService } from '../../src/services/UserSupabaseService';

interface UserProfileProps {
   user: UserProfile;
}

export const UserProfileView: React.FC<UserProfileProps> = ({ user }) => {
   const [signature, setSignature] = useState<string | undefined>(user.signature_url);
   const [isEditing, setIsEditing] = useState(false);
   const [showSkillModal, setShowSkillModal] = useState(false);
   const [requestedSkill, setRequestedSkill] = useState('');
   const [isSubmitting, setIsSubmitting] = useState(false);
   const { roles } = useUserStore();

   const roleName = roles.find(r => r.id === user.role || r.name === user.role)?.name || user.role;

   // Mock Specialties if empty
   const specialties = user.specialties || ['General Mechanic', 'LOTO Safety', 'Hydraulics L1'];

   const handleSaveSignature = (base64: string) => {
      // In a real app, this would be a Server Action: await uploadSignature(base64)
      setSignature(base64);
      alert("¡Firma guardada en el perfil!");
      setIsEditing(false);
   };

   const handleSubmitSkillRequest = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!requestedSkill.trim()) return;

      setIsSubmitting(true);
      try {
         await UserSupabaseService.createSkillRequest(user.id, requestedSkill.trim());
         alert("✅ Solicitud enviada exitosamente a la administración.");
         setRequestedSkill('');
         setShowSkillModal(false);
      } catch (error: any) {
         alert(`❌ Error al enviar la solicitud: ${error.message}`);
      } finally {
         setIsSubmitting(false);
      }
   };

   return (
      <div className="h-full bg-industrial-900 p-6 overflow-y-auto">
         <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <User className="text-industrial-accent" /> Mi Perfil Técnico
         </h2>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">

            {/* ID Card */}
            <div className="bg-industrial-800 rounded-xl border border-industrial-700 p-8 shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Briefcase size={120} className="text-white" />
               </div>

               <div className="flex items-start gap-6 relative z-10">
                  <div className="w-24 h-24 rounded-full bg-industrial-700 border-4 border-industrial-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                     {user.full_name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                     <h3 className="text-2xl font-bold text-white">{user.full_name}</h3>
                     <p className="text-industrial-accent font-medium mb-1">{user.job_title}</p>
                     <p className="text-sm text-industrial-400 flex items-center gap-2">
                        <Mail size={12} /> {user.email}
                     </p>
                     <div className="mt-4 flex gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${user.status === 'ACTIVE' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-yellow-900/30 text-yellow-400 border-yellow-800'}`}>
                           {user.status}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-900/30 text-blue-400 border border-blue-800">
                           {roleName}
                        </span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Specialties */}
            <div className="bg-industrial-800 rounded-xl border border-industrial-700 p-6 shadow-xl">
               <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Award size={18} className="text-yellow-500" /> Certificaciones y Especialidades
               </h4>
               <div className="flex flex-wrap gap-2">
                  {specialties.map((spec, idx) => (
                     <span key={idx} className="px-3 py-1.5 rounded-full bg-industrial-900 border border-industrial-600 text-industrial-300 text-sm flex items-center gap-1.5">
                        <BadgeCheck size={14} className="text-industrial-accent" /> {spec}
                     </span>
                  ))}
                  <button
                     onClick={() => setShowSkillModal(true)}
                     className="px-3 py-1.5 rounded-full border border-dashed border-industrial-500 text-industrial-500 text-sm hover:text-white hover:border-white transition-colors"
                  >
                     + Solicitar Habilidad
                  </button>
               </div>
            </div>

            {/* Digital Signature */}
            <div className="lg:col-span-2 bg-industrial-800 rounded-xl border border-industrial-700 p-6 shadow-xl">
               <div className="flex justify-between items-start mb-4">
                  <div>
                     <h4 className="text-lg font-bold text-white flex items-center gap-2">Firma Digital</h4>
                     <p className="text-xs text-industrial-500">Usada para la validación de reportes R-MANT-02 y R-MANT-05.</p>
                  </div>
                  {!isEditing && (
                     <button
                        onClick={() => setIsEditing(true)}
                        className="text-xs bg-industrial-700 hover:bg-industrial-600 text-white px-3 py-1.5 rounded transition-colors"
                     >
                        Actualizar Firma
                     </button>
                  )}
               </div>

               <div className="flex flex-col items-center justify-center p-6 bg-industrial-900/50 rounded-lg border border-industrial-800">
                  {isEditing ? (
                     <div className="w-full flex flex-col items-center">
                        <SignaturePad
                           initialSignature={signature}
                           onSave={handleSaveSignature}
                           onClear={() => setSignature(undefined)}
                        />
                        <button onClick={() => setIsEditing(false)} className="mt-4 text-xs text-industrial-500 underline">Cancelar</button>
                     </div>
                  ) : (
                     signature ? (
                        <img src={signature} alt="Signature" className="h-24 object-contain filter invert opacity-80" />
                     ) : (
                        <div className="text-industrial-600 text-sm italic py-8">Ninguna firma configurada</div>
                     )
                  )}
               </div>
            </div>

         </div>

         {/* Modal para Solicitar Habilidad */}
         {showSkillModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
               <div className="bg-industrial-800 border border-industrial-700 rounded-xl w-full max-w-md shadow-2xl relative">
                  <div className="p-6 border-b border-industrial-700 flex justify-between items-center">
                     <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Award className="text-yellow-500" />
                        Solicitar Nueva Habilidad
                     </h3>
                     <button
                        onClick={() => setShowSkillModal(false)}
                        className="text-industrial-400 hover:text-white transition-colors"
                        disabled={isSubmitting}
                     >
                        <X size={20} />
                     </button>
                  </div>
                  <form onSubmit={handleSubmitSkillRequest} className="p-6">
                     <div className="mb-6">
                        <label className="block text-sm font-medium text-industrial-300 mb-2">
                           Nombre de la Certificación o Habilidad
                        </label>
                        <input
                           type="text"
                           required
                           className="w-full bg-industrial-900 border border-industrial-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-industrial-500 placeholder-industrial-600"
                           placeholder="Ej. Operador de Montacargas Nivel 2"
                           value={requestedSkill}
                           onChange={(e) => setRequestedSkill(e.target.value)}
                           disabled={isSubmitting}
                        />
                        <p className="mt-2 text-xs text-industrial-500">
                           Esta solicitud será enviada al Gerente de Planta o Administrador de Sistema para su revisión y aprobación.
                        </p>
                     </div>
                     <div className="flex justify-end gap-3">
                        <button
                           type="button"
                           onClick={() => setShowSkillModal(false)}
                           className="px-4 py-2 rounded-lg text-sm font-medium text-industrial-300 hover:text-white transition-colors border border-industrial-700"
                           disabled={isSubmitting}
                        >
                           Cancelar
                        </button>
                        <button
                           type="submit"
                           disabled={isSubmitting}
                           className="bg-industrial-accent hover:bg-industrial-500 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                           {isSubmitting ? 'Enviando...' : (
                              <>
                                 <Send size={16} /> Enviar Solicitud
                              </>
                           )}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
};
