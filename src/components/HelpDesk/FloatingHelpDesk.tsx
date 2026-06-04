import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import html2canvas from 'html2canvas';
import { HelpCircle, Headphones, X, Camera, Send, Ticket, PlusCircle, Trash2 } from 'lucide-react';
import { HelpDeskTicket } from '../../types/helpdesk';
import { useAuth } from '../../../contexts/AuthContext';

export const FloatingHelpDesk: React.FC = () => {
  const { user } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'nuevo' | 'tickets'>('nuevo');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Error Funcionalidad');
  const [priority, setPriority] = useState('Media');
  const [description, setDescription] = useState('');
  
  // Context & Screenshot
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  
  // Tickets State
  const [tickets, setTickets] = useState<HelpDeskTicket[]>([]);

  useEffect(() => {
    if (isOpen && view === 'tickets' && user) {
      fetchTickets();
    }
  }, [isOpen, view, user]);

  const fetchTickets = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('helpdesk_tickets')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setTickets(data as HelpDeskTicket[]);
    }
  };

  const captureScreen = async () => {
    setIsCapturing(true);
    try {
      // Hide the widget temporarily while capturing
      const widget = document.getElementById('helpdesk-widget-container');
      if (widget) widget.style.display = 'none';
      
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        logging: false,
      });
      
      if (widget) widget.style.display = 'flex';
      
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      setScreenshotData(imgData);
    } catch (err) {
      console.error('Error capturing screen:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!user || !user.id) {
        throw new Error('Sesión de usuario no encontrada. Por favor recargue la página.');
      }

      // 1. Context Capture
      const contextInfo = {
        pathname: window.location.pathname,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        userAgent: navigator.userAgent
      };

      const fullDescription = `${description}\n\n--- Context ---\nPath: ${contextInfo.pathname}\nViewport: ${contextInfo.viewport}\nBrowser: ${contextInfo.userAgent}`;

      // 2. Create Ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('helpdesk_tickets')
        .insert({
          created_by: user.id,
          requester_name: user.full_name || 'Usuario Externo',
          requester_email: user.email,
          customer_name: user.full_name || 'Usuario Externo',
          category,
          subject,
          priority,
          status: 'nuevo',
          public_code: `HDC-${Math.floor(Math.random() * 1000000)}` 
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // 3. Insert Initial Message
      const { data: messageData, error: msgError } = await supabase
        .from('helpdesk_messages')
        .insert({
          ticket_id: ticketData.id,
          author_type: 'usuario',
          visibility: 'publico',
          source: 'widget',
          body_text: fullDescription
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // 4. Upload Screenshot if exists
      if (screenshotData) {
        const res = await fetch(screenshotData);
        const blob = await res.blob();
        const fileName = `${ticketData.id}/screenshot-${Date.now()}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('helpdesk-attachments')
          .upload(fileName, blob, {
            contentType: 'image/jpeg'
          });
          
        if (!uploadError) {
          await supabase.from('helpdesk_attachments').insert({
            ticket_id: ticketData.id,
            message_id: messageData.id,
            bucket: 'helpdesk-attachments',
            path: fileName,
            original_filename: 'screenshot.jpg',
            mime_type: 'image/jpeg',
            source: 'widget'
          });
        }
      }

      // Reset form
      setSubject('');
      setDescription('');
      setScreenshotData(null);
      setView('tickets');
    } catch (err: any) {
      console.error('Error submitting ticket:', err);
      alert(`Error al enviar el reporte: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Avoid rendering if the user is not authenticated
  if (!user) return null;

  return (
    <div id="helpdesk-widget-container" className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {isOpen && (
        <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] w-[450px] mb-4 overflow-hidden border border-slate-700/50 flex flex-col transition-all duration-300 ease-in-out" style={{ height: '650px' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-5 flex justify-between items-center border-b border-white/10">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2 tracking-tight">
                <Headphones size={22} className="text-blue-300" />
                Soporte / Help Desk
              </h3>
              <p className="text-xs text-blue-200 mt-1 opacity-80">Estamos aquí para ayudarte</p>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="hover:bg-white/20 p-2 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-slate-800 text-sm bg-slate-900/50">
            <button 
              type="button"
              className={`flex-1 py-4 font-medium flex items-center justify-center gap-2 transition-colors ${view === 'nuevo' ? 'border-b-2 border-blue-500 text-blue-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
              onClick={() => setView('nuevo')}
            >
              <PlusCircle size={16} />
              Nuevo Reporte
            </button>
            <button 
              type="button"
              className={`flex-1 py-4 font-medium flex items-center justify-center gap-2 transition-colors ${view === 'tickets' ? 'border-b-2 border-blue-500 text-blue-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
              onClick={() => setView('tickets')}
            >
              <Ticket size={16} />
              Mis Tickets
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {view === 'nuevo' ? (
              <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Asunto</label>
                  <input 
                    required 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                    placeholder="Ej. Problema al guardar orden"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Categoría</label>
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700 text-slate-100 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option className="bg-slate-800 text-white">Nueva Funcionalidad</option>
                      <option className="bg-slate-800 text-white">Corrección</option>
                      <option className="bg-slate-800 text-white">Error Funcionalidad</option>
                      <option className="bg-slate-800 text-white">Error General</option>
                      <option className="bg-slate-800 text-white">Sugerencia</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Prioridad</label>
                    <select 
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700 text-slate-100 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option className="bg-slate-800 text-white">Baja</option>
                      <option className="bg-slate-800 text-white">Media</option>
                      <option className="bg-slate-800 text-white">Alta</option>
                      <option className="bg-slate-800 text-white">Crítica</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Descripción</label>
                  <textarea 
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5} 
                    className="w-full bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Describe el detalle del requerimiento o problema..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Captura de pantalla</label>
                  {screenshotData ? (
                    <div className="relative inline-block group">
                      <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">Vista Previa</span>
                      </div>
                      <img src={screenshotData} alt="Screenshot preview" className="h-24 w-auto rounded-lg border border-slate-600 shadow-md object-cover" />
                      <button 
                        type="button" 
                        onClick={() => setScreenshotData(null)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-transform hover:scale-110"
                        title="Eliminar captura"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      type="button" 
                      onClick={captureScreen}
                      disabled={isCapturing}
                      className="w-full flex flex-col items-center justify-center gap-2 text-sm text-slate-300 bg-slate-800/50 border-2 border-dashed border-slate-700 p-6 rounded-xl hover:bg-slate-800 hover:border-blue-500/50 hover:text-blue-400 transition-all group"
                    >
                      <Camera size={24} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                      <span className="font-medium">
                        {isCapturing ? 'Capturando pantalla...' : 'Click para tomar captura actual'}
                      </span>
                    </button>
                  )}
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3.5 rounded-xl font-bold hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Send size={18} />
                    {isSubmitting ? 'Enviando Reporte...' : 'Enviar Reporte'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {tickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                    <Ticket size={48} className="mb-4 opacity-20" />
                    <p className="text-center font-medium">No tienes tickets reportados.</p>
                  </div>
                ) : (
                  tickets.map(ticket => (
                    <div key={ticket.id} className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-sm flex flex-col gap-2 cursor-pointer hover:border-blue-500/50 hover:bg-slate-800 transition-all transform hover:-translate-y-0.5">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-sm text-slate-200 tracking-tight">{ticket.public_code || ticket.id.substring(0,8)}</span>
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full ${
                          ticket.status === 'nuevo' ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50' :
                          ticket.status === 'resuelto' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50' : 'bg-slate-700 text-slate-300 border border-slate-600'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-300 line-clamp-2">{ticket.subject}</p>
                      <div className="flex justify-between text-xs text-slate-500 mt-1 border-t border-slate-700/50 pt-2">
                        <span className="bg-slate-900/50 px-2 py-0.5 rounded text-slate-400">{ticket.category}</span>
                        <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full p-4 shadow-[0_8px_24px_rgba(37,99,235,0.4)] transition-all transform hover:scale-110 flex items-center justify-center group border border-blue-400/20"
          aria-label="Abrir Help Desk"
        >
          <Headphones size={32} className="group-hover:rotate-12 transition-transform" />
        </button>
      )}
    </div>
  );
};
