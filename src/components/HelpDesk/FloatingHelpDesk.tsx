import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import html2canvas from 'html2canvas';
import { HelpCircle, Headphones, X, Camera, Send, Ticket, PlusCircle, Trash2, RefreshCw } from 'lucide-react';
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
  
  // Selected Ticket & Message Tracking State
  const [selectedTicket, setSelectedTicket] = useState<HelpDeskTicket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'abiertos' | 'resueltos'>('todos');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchTickets();
    }
  }, [isOpen, user]);

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

  const fetchTicketMessages = async (ticketId: string) => {
    setIsFetchingMessages(true);
    try {
      const { data: msgs, error: msgsError } = await supabase
        .from('helpdesk_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .eq('visibility', 'publico')
        .order('created_at', { ascending: true });

      if (msgsError) throw msgsError;

      const { data: atts, error: attsError } = await supabase
        .from('helpdesk_attachments')
        .select('*')
        .eq('ticket_id', ticketId);

      if (attsError) throw attsError;

      const messagesWithAttachments = (msgs || []).map(msg => {
        const msgAttachments = (atts || []).filter(att => att.message_id === msg.id);
        return {
          ...msg,
          attachments: msgAttachments
        };
      });

      setMessages(messagesWithAttachments);
    } catch (err) {
      console.error('Error fetching ticket messages:', err);
    } finally {
      setIsFetchingMessages(false);
    }
  };

  const handleSelectTicket = (ticket: HelpDeskTicket) => {
    setSelectedTicket(ticket);
    setView('tickets');
    fetchTicketMessages(ticket.id);
  };

  const captureScreen = async () => {
    setIsCapturing(true);
    try {
      // Hide the entire modal overlay temporarily while capturing
      const overlay = document.getElementById('helpdesk-modal-overlay');
      if (overlay) overlay.style.display = 'none';
      
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        logging: false,
      });
      
      if (overlay) overlay.style.display = 'flex';
      
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
          body_text: fullDescription,
          sender_type: 'usuario',
          sender_name: user.full_name || 'Usuario Externo',
          sender_email: user.email
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
      
      // Refresh tickets list and auto-select new ticket
      await fetchTickets();
      handleSelectTicket(ticketData);
    } catch (err: any) {
      console.error('Error submitting ticket:', err);
      alert(`Error al enviar el reporte: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket || !user) return;
    setIsSubmittingReply(true);

    try {
      const { data: messageData, error: msgError } = await supabase
        .from('helpdesk_messages')
        .insert({
          ticket_id: selectedTicket.id,
          author_type: 'usuario',
          visibility: 'publico',
          source: 'widget',
          body_text: replyText.trim(),
          sender_type: 'usuario',
          sender_name: user.full_name || 'Usuario',
          sender_email: user.email
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Append message locally with empty attachments array
      setMessages(prev => [...prev, { ...messageData, attachments: [] }]);
      setReplyText('');
      
      // Refresh tickets list to update dates/ordering
      fetchTickets();
    } catch (err: any) {
      console.error('Error sending reply:', err);
      alert(`Error al enviar el mensaje: ${err.message}`);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    if (selectedTicket) {
      scrollToBottom();
    }
  }, [messages, selectedTicket]);

  const getFriendlyStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'nuevo': return 'Nuevo';
      case 'triage': return 'Evaluación';
      case 'abierto': return 'Abierto';
      case 'esperando_usuario': return 'Tu Turno';
      case 'en_progreso':
      case 'en proceso': return 'En Proceso';
      case 'resuelto':
      case 'resolviendo': return 'Resuelto';
      case 'cerrado': return 'Cerrado';
      case 'reabierto': return 'Reabierto';
      default: return status;
    }
  };

  // Search & Filter computation
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      (ticket.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.public_code || '').toLowerCase().includes(searchTerm.toLowerCase());
      
    if (!matchesSearch) return false;
    
    if (statusFilter === 'todos') return true;
    if (statusFilter === 'abiertos') {
      return !['resuelto', 'cerrado'].includes(ticket.status?.toLowerCase());
    }
    if (statusFilter === 'resueltos') {
      return ['resuelto', 'cerrado'].includes(ticket.status?.toLowerCase());
    }
    return true;
  });

  // Avoid rendering if the user is not authenticated
  if (!user) return null;

  return (
    <>
      {/* Floating Button (Bottom Right) */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 font-sans">
          <button 
            onClick={() => {
              setIsOpen(true);
              fetchTickets();
            }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full p-4 shadow-[0_8px_24px_rgba(37,99,235,0.4)] transition-all transform hover:scale-110 flex items-center justify-center group border border-blue-400/20"
            aria-label="Abrir Help Desk"
          >
            <Headphones size={32} className="group-hover:rotate-12 transition-transform" />
          </button>
        </div>
      )}

      {/* Centered Modal Backdrop */}
      {isOpen && (
        <div 
          id="helpdesk-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200 font-sans"
        >
          {/* Modal Container */}
          <div 
            id="helpdesk-widget-container"
            className="bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-[0_24px_50px_rgba(0,0,0,0.6)] w-full max-w-5xl h-[85vh] min-h-[550px] max-h-[780px] overflow-hidden border border-slate-800 flex flex-col transition-all duration-300 ease-in-out animate-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-950 text-white p-4 flex justify-between items-center border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/20 p-2 rounded-xl border border-blue-500/30">
                  <Headphones size={22} className="text-blue-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base md:text-lg tracking-tight flex items-center gap-2">
                    Soporte / Help Desk
                  </h3>
                  <p className="text-xs text-blue-200/80">Estamos aquí para ayudarte. Cuéntanos tu problema.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800/80">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-slate-300 font-medium truncate max-w-[150px]">
                    {user.full_name || user.email}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    setSelectedTicket(null);
                  }} 
                  className="bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white p-2 rounded-xl transition-colors border border-slate-700/50"
                  aria-label="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Split Layout Body */}
            <div className="flex flex-1 overflow-hidden flex-col md:flex-row min-h-0">
              {/* Left Sidebar: Ticket List */}
              <div className="w-full md:w-80 bg-slate-900/40 border-r border-slate-800/80 flex flex-col h-[40%] md:h-full shrink-0">
                {/* Actions & Filters */}
                <div className="p-4 border-b border-slate-800 flex flex-col gap-3 shrink-0">
                  <button
                    onClick={() => {
                      setView('nuevo');
                      setSelectedTicket(null);
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      view === 'nuevo' && !selectedTicket
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/25 border border-blue-500'
                        : 'bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750'
                    }`}
                  >
                    <PlusCircle size={16} />
                    Nuevo Reporte
                  </button>

                  {/* Search */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar tickets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-950/40 border border-slate-850 text-slate-200 placeholder-slate-500 rounded-lg py-1.5 pl-8 pr-3 text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <svg
                      className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>

                  {/* Quick Filter tabs */}
                  <div className="flex bg-slate-950/40 p-0.5 rounded-lg border border-slate-850 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <button
                      onClick={() => setStatusFilter('todos')}
                      className={`flex-1 py-1 rounded-md text-center transition-colors ${statusFilter === 'todos' ? 'bg-slate-800 text-white shadow' : 'hover:text-slate-200'}`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setStatusFilter('abiertos')}
                      className={`flex-1 py-1 rounded-md text-center transition-colors ${statusFilter === 'abiertos' ? 'bg-slate-800 text-white shadow' : 'hover:text-slate-200'}`}
                    >
                      Abiertos
                    </button>
                    <button
                      onClick={() => setStatusFilter('resueltos')}
                      className={`flex-1 py-1 rounded-md text-center transition-colors ${statusFilter === 'resueltos' ? 'bg-slate-800 text-white shadow' : 'hover:text-slate-200'}`}
                    >
                      Cerrados
                    </button>
                  </div>
                </div>

                {/* Tickets list */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                  {filteredTickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-600">
                      <Ticket size={32} className="mb-2 opacity-20" />
                      <p className="text-center text-xs font-medium">No se encontraron tickets</p>
                    </div>
                  ) : (
                    filteredTickets.map(ticket => {
                      const isSelected = selectedTicket?.id === ticket.id;
                      return (
                        <button
                          key={ticket.id}
                          onClick={() => handleSelectTicket(ticket)}
                          className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1.5 ${
                            isSelected
                              ? 'bg-slate-800/80 border-blue-500/80 shadow-md shadow-slate-950/30'
                              : 'bg-slate-900/30 border-slate-800/60 hover:bg-slate-850/30 hover:border-slate-750'
                          }`}
                        >
                          <div className="flex justify-between items-center w-full gap-2">
                            <span className="font-bold text-[10px] text-slate-400 font-mono truncate">
                              {ticket.public_code || ticket.id.substring(0, 8)}
                            </span>
                            <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${
                              ticket.status === 'nuevo' ? 'bg-blue-950/30 text-blue-400 border-blue-500/20' :
                              ticket.status === 'resuelto' ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20' : 
                              ticket.status === 'cerrado' ? 'bg-slate-950 text-slate-400 border-slate-800' :
                              'bg-amber-955 text-amber-400 border-amber-500/20'
                            }`}>
                              {getFriendlyStatusLabel(ticket.status)}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-200 line-clamp-1">
                            {ticket.subject}
                          </p>
                          <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                            <span className="bg-slate-950/40 px-1.5 py-0.5 rounded text-slate-400 font-medium">
                              {ticket.category}
                            </span>
                            <span className="flex items-center gap-1 font-mono text-[9px]">
                              {new Date(ticket.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Panel: Workspace */}
              <div className="flex-1 bg-slate-955 flex flex-col overflow-hidden h-[60%] md:h-full min-h-0">
                {selectedTicket ? (
                  /* Tracking / Chat Workspace */
                  <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                    {/* Header for Active Ticket */}
                    <div className="bg-slate-900/30 p-4 border-b border-slate-800 flex justify-between items-center gap-3 shrink-0">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-400 mb-1">
                          <span className="font-bold font-mono bg-slate-850 px-2 py-0.5 rounded text-slate-300">
                            {selectedTicket.public_code || selectedTicket.id.substring(0, 8)}
                          </span>
                          <span>&bull;</span>
                          <span>{selectedTicket.category}</span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1">
                            Prioridad: 
                            <span className={`font-semibold ${
                              selectedTicket.priority === 'Crítica' ? 'text-red-400' :
                              selectedTicket.priority === 'Alta' ? 'text-orange-400' :
                              selectedTicket.priority === 'Media' ? 'text-yellow-400' : 'text-slate-400'
                            }`}>
                              {selectedTicket.priority}
                            </span>
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-100 truncate">{selectedTicket.subject}</h4>
                      </div>
                      
                      <button
                        onClick={() => fetchTicketMessages(selectedTicket.id)}
                        disabled={isFetchingMessages}
                        className="p-2 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-750 transition-colors shrink-0 disabled:opacity-50"
                        title="Actualizar conversación"
                      >
                        <RefreshCw size={14} className={isFetchingMessages ? 'animate-spin' : ''} />
                      </button>
                    </div>

                    {/* Messages Scrollable List */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent min-h-0">
                      {isFetchingMessages && messages.length === 0 ? (
                        <div className="h-full flex flex-col justify-center items-center gap-3 text-slate-500 py-10">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                          <span className="text-xs">Cargando conversación...</span>
                        </div>
                      ) : (
                        messages.map((msg) => {
                          const isUser = msg.author_type === 'usuario';
                          const isAI = msg.author_type === 'ia';
                          const isSystem = msg.author_type === 'sistema';
                          
                          if (isSystem) {
                            return (
                              <div key={msg.id} className="flex justify-center my-2">
                                <span className="bg-slate-800/40 text-slate-500 text-[10px] px-3 py-1 rounded-full border border-slate-800/60 font-medium">
                                  {msg.body_text}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={msg.id}
                              className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                            >
                              {/* Avatar */}
                              <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-xs border ${
                                isUser 
                                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/10'
                                  : isAI
                                    ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white border-purple-500 shadow-md shadow-purple-500/10'
                                    : 'bg-slate-700 text-slate-200 border-slate-600'
                              }`}>
                                {isUser 
                                  ? 'U' 
                                  : isAI
                                    ? 'AI'
                                    : (msg.sender_name || 'S').substring(0, 1).toUpperCase()
                                }
                              </div>

                              {/* Message Content */}
                              <div className="flex flex-col gap-1 min-w-0">
                                <div className={`flex items-center gap-2 text-[10px] text-slate-500 ${isUser ? 'justify-end' : 'justify-start'}`}>
                                  <span className="font-semibold text-slate-400">
                                    {isUser 
                                      ? 'Tú' 
                                      : isAI
                                        ? 'Asistente IA'
                                        : (msg.sender_name || 'Soporte')
                                    }
                                  </span>
                                  <span>&bull;</span>
                                  <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>

                                <div className={`p-3 rounded-xl text-xs md:text-sm leading-relaxed border ${
                                  isUser
                                    ? 'bg-blue-600/90 text-white border-blue-500 rounded-tr-none'
                                    : isAI
                                      ? 'bg-slate-800 text-slate-100 border-purple-500/30 rounded-tl-none shadow-md shadow-purple-900/10'
                                      : 'bg-slate-800 text-slate-100 border-slate-700 rounded-tl-none'
                                }`}>
                                  <p className="whitespace-pre-wrap break-words">{msg.body_text}</p>
                                  
                                  {/* Screenshot / Attachments */}
                                  {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
                                      {msg.attachments.map((att: any) => {
                                        const { data: { publicUrl } } = supabase.storage
                                          .from(att.bucket)
                                          .getPublicUrl(att.path);
                                          
                                        const isImage = att.mime_type?.startsWith('image/');

                                        return (
                                          <div key={att.id} className="relative group/att">
                                            {isImage ? (
                                              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="block max-w-sm rounded-lg overflow-hidden border border-slate-700 bg-slate-950 shadow-inner group-hover/att:border-slate-500 transition-colors">
                                                <img src={publicUrl} alt={att.original_filename} className="w-full max-h-48 object-cover" />
                                                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur">Ver pantalla completa</div>
                                              </a>
                                            ) : (
                                              <a href={publicUrl} download target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-slate-950/50 rounded-lg text-xs text-blue-300 hover:text-blue-200 border border-slate-800 hover:border-slate-700 transition-all">
                                                <span className="underline truncate max-w-[200px]">{att.original_filename}</span>
                                              </a>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat Footer Reply / Status */}
                    {selectedTicket.status === 'cerrado' || selectedTicket.status === 'resuelto' ? (
                      <div className="p-3 bg-slate-900/30 border-t border-slate-800 flex justify-center items-center text-center text-[11px] text-slate-500 font-medium shrink-0">
                        {selectedTicket.status === 'cerrado' 
                          ? 'Este ticket ha sido cerrado y está en modo de solo lectura.'
                          : 'Este ticket está resuelto. Al enviar un mensaje nuevo se volverá a abrir automáticamente.'
                        }
                      </div>
                    ) : null}
                    
                    {selectedTicket.status !== 'cerrado' && (
                      <form onSubmit={handleSendReply} className="p-4 bg-slate-900/40 border-t border-slate-800 flex gap-3 items-end shrink-0">
                        <textarea
                          rows={2}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Escribe tu respuesta aquí..."
                          className="flex-1 bg-slate-950/60 border border-slate-850 text-slate-100 placeholder-slate-500 rounded-xl p-3 text-xs md:text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendReply(e);
                            }
                          }}
                        />
                        <button
                          type="submit"
                          disabled={isSubmittingReply || !replyText.trim()}
                          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white p-3 rounded-xl shadow-lg shadow-blue-500/10 transition-all shrink-0 flex items-center justify-center border border-blue-500"
                        >
                          {isSubmittingReply ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Send size={16} />
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                ) : view === 'nuevo' ? (
                  /* Create New Ticket Form */
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                    <div className="max-w-xl mx-auto space-y-5 py-2">
                      <div className="border-b border-slate-850 pb-3">
                        <h4 className="font-bold text-sm md:text-base text-slate-100">Crear un Nuevo Reporte</h4>
                        <p className="text-xs text-slate-400 mt-1">Completa los siguientes campos para reportar tu caso a soporte técnico.</p>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Asunto</label>
                          <input 
                            required 
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full bg-slate-950/60 border border-slate-850 text-slate-100 placeholder-slate-500 rounded-lg p-3 text-xs md:text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all" 
                            placeholder="Ej. Problema al guardar orden o pantalla en blanco"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Categoría</label>
                            <select 
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              className="w-full bg-slate-950/60 border border-slate-850 text-slate-100 rounded-lg p-3 text-xs md:text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
                            >
                              <option className="bg-slate-900 text-white">Nueva Funcionalidad</option>
                              <option className="bg-slate-900 text-white">Corrección</option>
                              <option className="bg-slate-900 text-white">Error Funcionalidad</option>
                              <option className="bg-slate-900 text-white">Error General</option>
                              <option className="bg-slate-900 text-white">Sugerencia</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Prioridad</label>
                            <select 
                              value={priority}
                              onChange={(e) => setPriority(e.target.value)}
                              className="w-full bg-slate-950/60 border border-slate-850 text-slate-100 rounded-lg p-3 text-xs md:text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
                            >
                              <option className="bg-slate-900 text-white">Baja</option>
                              <option className="bg-slate-900 text-white">Media</option>
                              <option className="bg-slate-900 text-white">Alta</option>
                              <option className="bg-slate-900 text-white">Crítica</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Descripción</label>
                          <textarea 
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4} 
                            className="w-full bg-slate-950/60 border border-slate-850 text-slate-100 placeholder-slate-500 rounded-lg p-3 text-xs md:text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                            placeholder="Describe en detalle los pasos para reproducir el problema o las especificaciones del requerimiento..."
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">Captura de pantalla</label>
                          {screenshotData ? (
                            <div className="relative inline-block group">
                              <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                 <span className="text-white text-[10px] font-medium bg-black/50 px-2 py-1 rounded">Vista Previa</span>
                              </div>
                              <img src={screenshotData} alt="Screenshot preview" className="h-24 w-auto rounded-lg border border-slate-700 shadow-md object-cover" />
                              <button 
                                type="button" 
                                onClick={() => setScreenshotData(null)}
                                className="absolute -top-2 -right-2 bg-red-505 hover:bg-red-600 text-white rounded-full p-1 shadow-lg transition-transform hover:scale-110"
                                title="Eliminar captura"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ) : (
                            <button 
                              type="button" 
                              onClick={captureScreen}
                              disabled={isCapturing}
                              className="w-full flex flex-col items-center justify-center gap-1.5 text-xs text-slate-300 bg-slate-950/40 border border-dashed border-slate-850 p-5 rounded-xl hover:bg-slate-900/40 hover:border-blue-500/50 hover:text-blue-400 transition-all group"
                            >
                              <Camera size={20} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                              <span className="font-medium">
                                {isCapturing ? 'Capturando pantalla...' : 'Hacer captura de pantalla'}
                              </span>
                            </button>
                          )}
                        </div>

                        <div className="pt-2">
                          <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-xl font-bold hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                          >
                            <Send size={16} />
                            {isSubmitting ? 'Enviando Reporte...' : 'Enviar Reporte'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                ) : (
                  /* Welcome Screen */
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
                    <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 mb-4 animate-bounce">
                      <HelpCircle size={30} className="text-blue-400" />
                    </div>
                    <h4 className="text-slate-200 font-bold text-sm md:text-base mb-1">Centro de Soporte Técnico</h4>
                    <p className="text-center text-xs text-slate-400 max-w-sm">
                      Selecciona un ticket de la lista lateral para ver la conversación y estado del ticket, o crea un nuevo reporte para recibir ayuda.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
