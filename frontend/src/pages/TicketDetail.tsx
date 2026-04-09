import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Lock, Unlock } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
const STATUS_CONFIG: Record<string,{label:string;color:string;bg:string}> = {
  open:        { label:'Abierto',     color:'#3b82f6', bg:'#eff6ff' },
  in_progress: { label:'En progreso', color:'#f59e0b', bg:'#fffbeb' },
  pending:     { label:'Pendiente',   color:'#8b5cf6', bg:'#f5f3ff' },
  resolved:    { label:'Resuelto',    color:'#10b981', bg:'#f0fdf4' },
  closed:      { label:'Cerrado',     color:'#6b7280', bg:'#f9fafb' },
};
const PRIORITY_CONFIG: Record<string,{label:string;color:string}> = {
  low:{ label:'Baja', color:'#10b981' }, medium:{ label:'Media', color:'#f59e0b' },
  high:{ label:'Alta', color:'#ef4444' }, Critical:{ label:'Critica', color:'#7c3aed' },
};
const NEXT_STATUS: Record<string,string[]> = {
  open:['in_progress','closed'], in_progress:['pending','resolved','closed'],
  pending:['in_progress','closed'], resolved:['closed','open'], closed:['open'],
};
const TYPE_LABELS: Record<string,string> = {
  incident:'Incidente', request:'Requerimiento', change:'Cambio', problem:'Problema', query:'Consulta'
};
export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [ticket, setTicket]           = useState<any>(null);
  const [messages, setMessages]       = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [newMsg, setNewMsg]           = useState('');
  const [isInternal, setIsInternal]   = useState(false);
  const [sending, setSending]         = useState(false);
  const [showAssign, setShowAssign]   = useState(false);
  useEffect(() => { if (id) cargar(); }, [id]);
  const cargar = async () => {
    setLoading(true);
    try {
      const [t, m, tech] = await Promise.all([
        api.get(/api/v1/tickets/),
        api.get(/api/v1/tickets//messages),
        api.get('/api/v1/users/technicians').catch(() => ({ data: [] })),
      ]);
      setTicket(t.data); setMessages(m.data); setTechnicians(tech.data);
    } catch { navigate('/tickets'); }
    finally { setLoading(false); }
  };
  const enviar = async () => {
    if (!newMsg.trim() || sending) return;
    setSending(true);
    try {
      await api.post(/api/v1/tickets//messages, { body: newMsg, is_internal: isInternal });
      setNewMsg('');
      const { data } = await api.get(/api/v1/tickets//messages);
      setMessages(data);
    } finally { setSending(false); }
  };
  const cambiarEstado = async (status: string) => {
    await api.patch(/api/v1/tickets//status, { status });
    setTicket((p: any) => ({ ...p, status }));
  };
  const asignar = async (techId: number, techName: string) => {
    await api.patch(/api/v1/tickets//assign, { assignee_id: techId });
    setTicket((p: any) => ({ ...p, assignee_id: techId, assignee_name: techName }));
    setShowAssign(false);
  };
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
  };
  if (loading) return <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8' }}>Cargando...</div>;
  if (!ticket) return null;
  const sc = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const pc = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#f8fafc' }}>
      <div style={{ background:'#fff', borderBottom:'1px solid #f1f5f9', padding:'12px 20px', display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
        <button onClick={() => navigate('/tickets')} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex', alignItems:'center', gap:'5px', fontSize:'13px', padding:'5px 8px', borderRadius:'6px' }}>
          <ArrowLeft size={15}/> Tickets
        </button>
        <span style={{ color:'#e2e8f0' }}>|</span>
        <span style={{ fontSize:'11px', color:'#94a3b8', fontFamily:'monospace' }}>{ticket.ticket_number}</span>
        <span style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'99px', fontWeight:'600', background:sc.bg, color:sc.color }}>{sc.label}</span>
        <span style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'99px', fontWeight:'600', background:pc.color+'18', color:pc.color }}>{pc.label}</span>
        <h1 style={{ margin:0, fontSize:'14px', fontWeight:'700', color:'#0f172a', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ticket.title}</h1>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', flex:1, overflow:'hidden' }}>
        <div style={{ display:'flex', flexDirection:'column', overflow:'hidden', borderRight:'1px solid #f1f5f9' }}>
          {NEXT_STATUS[ticket.status]?.length > 0 && (
            <div style={{ padding:'8px 16px', borderBottom:'1px solid #f8fafc', background:'#fff', display:'flex', alignItems:'center', gap:'6px', flexShrink:0 }}>
              <span style={{ fontSize:'10px', color:'#94a3b8', fontWeight:'700', textTransform:'uppercase' }}>Cambiar:</span>
              {NEXT_STATUS[ticket.status].map(s => (
                <button key={s} onClick={() => cambiarEstado(s)}
                  style={{ padding:'3px 10px', borderRadius:'99px', border:'1.5px solid', fontSize:'11px', fontWeight:'600', cursor:'pointer', background:STATUS_CONFIG[s]?.bg, borderColor:STATUS_CONFIG[s]?.color, color:STATUS_CONFIG[s]?.color }}>
                  {STATUS_CONFIG[s]?.label}
                </button>
              ))}
            </div>
          )}
          <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:'10px' }}>
            {ticket.description && (
              <div style={{ background:'#f1f5f9', borderRadius:'10px', padding:'12px 14px', fontSize:'12px', color:'#475569' }}>
                <p style={{ margin:'0 0 3px', fontSize:'10px', fontWeight:'700', color:'#94a3b8', textTransform:'uppercase' }}>Descripcion</p>
                <p style={{ margin:0 }}>{ticket.description}</p>
              </div>
            )}
            {messages.map((m: any) => {
              const esPropio = m.author_id === user?.id;
              if (m.is_internal) return (
                <div key={m.id} style={{ display:'flex', justifyContent:'center' }}>
                  <span style={{ fontSize:'10px', background:'#fffbeb', border:'1px solid #fde68a', color:'#92400e', padding:'3px 10px', borderRadius:'99px' }}>
                    Nota interna {new Date(m.created_at).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}
                  </span>
                </div>
              );
              return (
                <div key={m.id} style={{ display:'flex', justifyContent: esPropio ? 'flex-end' : 'flex-start', gap:'6px', alignItems:'flex-end' }}>
                  {!esPropio && <div style={{ width:'26px', height:'26px', borderRadius:'50%', background:'#e0e7ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:'700', color:'#4338ca', flexShrink:0 }}>{(m.author_name||'T').charAt(0).toUpperCase()}</div>}
                  <div style={{ maxWidth:'70%' }}>
                    <div style={{ padding:'9px 13px', borderRadius: esPropio ? '14px 14px 3px 14px' : '14px 14px 14px 3px', fontSize:'13px', lineHeight:'1.5',
                      background: esPropio ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#fff',
                      color: esPropio ? '#fff' : '#374151',
                      border: esPropio ? 'none' : '1px solid #f1f5f9',
                      boxShadow: esPropio ? '0 2px 8px rgba(79,70,229,0.25)' : '0 1px 2px rgba(0,0,0,0.05)' }}>
                      {m.body}
                    </div>
                    <p style={{ margin:'2px 4px 0', fontSize:'10px', color:'#94a3b8', textAlign: esPropio ? 'right' : 'left' }}>
                      {new Date(m.created_at).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}
                    </p>
                  </div>
                </div>
              );
            })}
            {messages.length === 0 && <div style={{ textAlign:'center', padding:'40px', color:'#94a3b8', fontSize:'13px' }}>Sin mensajes aun.</div>}
          </div>
          <div style={{ padding:'10px 14px', borderTop:'1px solid #f1f5f9', background:'#fff', flexShrink:0 }}>
            <div style={{ display:'flex', gap:'6px', alignItems:'flex-end', background:'#f8fafc', borderRadius:'10px', border:1.5px solid , padding:'7px 10px' }}>
              <textarea value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={handleKey}
                placeholder={isInternal ? 'Nota interna...' : 'Escribe... (Enter envia)'}
                style={{ flex:1, background:'transparent', border:'none', outline:'none', resize:'none', fontSize:'13px', color:'#374151', minHeight:'32px', maxHeight:'100px', fontFamily:'inherit', lineHeight:'1.4' }} rows={1}/>
              <div style={{ display:'flex', gap:'4px', alignItems:'center', flexShrink:0 }}>
                <button onClick={() => setIsInternal(!isInternal)} style={{ background:'none', border:'none', cursor:'pointer', color: isInternal ? '#f59e0b' : '#94a3b8', padding:'3px' }}>
                  {isInternal ? <Lock size={15}/> : <Unlock size={15}/>}
                </button>
                <button onClick={enviar} disabled={!newMsg.trim()||sending}
                  style={{ width:'30px', height:'30px', borderRadius:'7px', border:'none', cursor: newMsg.trim()?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', background: newMsg.trim()?'linear-gradient(135deg,#4f46e5,#7c3aed)':'#e2e8f0', color:'#fff' }}>
                  <Send size={13}/>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div style={{ overflowY:'auto', padding:'14px', display:'flex', flexDirection:'column', gap:'10px' }}>
          <div style={{ background:'#fff', borderRadius:'10px', border:'1px solid #f1f5f9', padding:'12px' }}>
            <p style={{ margin:'0 0 8px', fontSize:'10px', fontWeight:'700', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em' }}>Estado</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
              {Object.entries(STATUS_CONFIG).map(([key, s]) => (
                <button key={key} onClick={() => cambiarEstado(key)}
                  style={{ fontSize:'10px', padding:'3px 9px', borderRadius:'99px', border:'1.5px solid', cursor:'pointer',
                    background: ticket.status===key ? s.bg : 'transparent',
                    borderColor: ticket.status===key ? s.color : '#e2e8f0',
                    color: ticket.status===key ? s.color : '#94a3b8',
                    fontWeight: ticket.status===key ? '700' : '400' }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ background:'#fff', borderRadius:'10px', border:'1px solid #f1f5f9', padding:'12px' }}>
            <p style={{ margin:'0 0 8px', fontSize:'10px', fontWeight:'700', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em' }}>Asignado a</p>
            {ticket.assignee_name ? (
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'#e0e7ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'700', color:'#4338ca' }}>{ticket.assignee_name.charAt(0).toUpperCase()}</div>
                <div><p style={{ margin:0, fontSize:'12px', fontWeight:'600', color:'#0f172a' }}>{ticket.assignee_name}</p>
                  <button onClick={() => setShowAssign(!showAssign)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'10px', color:'#4f46e5', padding:0 }}>Cambiar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAssign(!showAssign)}
                style={{ width:'100%', padding:'7px', borderRadius:'7px', border:'1.5px dashed #c7d2fe', background:'#f5f3ff', color:'#4f46e5', fontSize:'11px', fontWeight:'600', cursor:'pointer' }}>
                + Asignar tecnico
              </button>
            )}
            {showAssign && (
              <div style={{ marginTop:'6px', display:'flex', flexDirection:'column', gap:'3px', maxHeight:'140px', overflowY:'auto' }}>
                {technicians.map((t: any) => (
                  <button key={t.id} onClick={() => asignar(t.id, t.full_name)}
                    style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 8px', borderRadius:'7px', border:'1px solid #f1f5f9', background:'#fff', cursor:'pointer', textAlign:'left' }}>
                    <div style={{ width:'22px', height:'22px', borderRadius:'50%', background:'#e0e7ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', fontWeight:'700', color:'#4338ca' }}>{t.full_name.charAt(0).toUpperCase()}</div>
                    <span style={{ fontSize:'12px', color:'#374151' }}>{t.full_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ background:'#fff', borderRadius:'10px', border:'1px solid #f1f5f9', padding:'12px' }}>
            <p style={{ margin:'0 0 8px', fontSize:'10px', fontWeight:'700', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em' }}>Detalle</p>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {[
                { label:'Tipo',      value: TYPE_LABELS[ticket.ticket_type]||ticket.ticket_type },
                { label:'Prioridad', value: pc.label, color: pc.color },
                { label:'Categoria', value: ticket.category||'-' },
                { label:'Mensajes',  value: String(messages.length) },
                { label:'Creado',    value: new Date(ticket.created_at).toLocaleDateString('es-CO',{day:'numeric',month:'short',year:'numeric'}) },
              ].map(item => (
                <div key={item.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:'11px', color:'#94a3b8' }}>{item.label}</span>
                  <span style={{ fontSize:'11px', fontWeight:'600', color:(item as any).color||'#475569' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
