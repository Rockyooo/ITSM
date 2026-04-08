import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open:        { label: "Abierto",     color: "#1D6AE5", bg: "#EEF4FF" },
  in_progress: { label: "En progreso", color: "#B45309", bg: "#FFFBEB" },
  pending:     { label: "Pendiente",   color: "#7C3AED", bg: "#F5F3FF" },
  resolved:    { label: "Resuelto",    color: "#065F46", bg: "#ECFDF5" },
  closed:      { label: "Cerrado",     color: "#374151", bg: "#F3F4F6" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low:      { label: "Baja",    color: "#6B7280" },
  medium:   { label: "Media",   color: "#D97706" },
  high:     { label: "Alta",    color: "#DC2626" },
  Critical: { label: "Critica", color: "#7C3AED" },
};

export default function SupervisorView() {
  const { user, logout } = useAuthStore();
  const [tickets, setTickets]       = useState<any[]>([]);
  const [selected, setSelected]     = useState<any>(null);
  const [messages, setMessages]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [newMsg, setNewMsg]         = useState("");
  const [isAlert, setIsAlert]       = useState(false);
  const [sending, setSending]       = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => { cargarTickets(); }, []);

  const cargarTickets = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/v1/tickets");
      setTickets(data);
    } catch {}
    finally { setLoading(false); }
  };

  const cargarMensajes = async (ticketId: string) => {
    const { data } = await api.get(`/api/v1/tickets/${ticketId}/messages`);
    setMessages(data);
  };

  const seleccionar = (t: any) => { setSelected(t); cargarMensajes(t.id); };

  const enviarComentario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !selected) return;
    setSending(true); setError("");
    try {
      await api.post(`/api/v1/tickets/${selected.id}/messages`, {
        body: newMsg,
        is_internal: true,
        is_alert: isAlert,
      });
      setNewMsg(""); setIsAlert(false);
      cargarMensajes(selected.id);
    } catch {
      setError("No se pudo enviar el comentario");
    } finally { setSending(false); }
  };

  const filtered = filterStatus === "all" ? tickets : tickets.filter(t => t.status === filterStatus);

  const kpis = [
    { label: "Total",       value: tickets.length,                                          color: "#1D6AE5" },
    { label: "Abiertos",    value: tickets.filter(t => t.status === "open").length,         color: "#EF4444" },
    { label: "En progreso", value: tickets.filter(t => t.status === "in_progress").length,  color: "#D97706" },
    { label: "Resueltos",   value: tickets.filter(t => t.status === "resolved").length,     color: "#059669" },
  ];

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'DM Sans',-apple-system,sans-serif", background:"#F8F9FC", color:"#111827" }}>

      {/* SIDEBAR */}
      <aside style={{ width:"220px", background:"#fff", borderRight:"1px solid #E5E7EB", display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"20px 16px 16px", borderBottom:"1px solid #E5E7EB" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <div style={{ width:"32px", height:"32px", background:"#059669", borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:"700", fontSize:"14px" }}>S</div>
            <div>
              <div style={{ fontWeight:"700", fontSize:"13px", color:"#111827" }}>Supervisor</div>
              <div style={{ fontSize:"11px", color:"#6B7280" }}>Vista de seguimiento</div>
            </div>
          </div>
        </div>
        <div style={{ padding:"16px", flex:1 }}>
          <div style={{ padding:"10px 12px", borderRadius:"8px", background:"#ECFDF5", color:"#059669", fontSize:"13px", fontWeight:"600", marginBottom:"4px" }}>
            Mis tickets
          </div>
          <div style={{ padding:"10px 12px", borderRadius:"8px", color:"#9CA3AF", fontSize:"13px" }}>
            Reportes
          </div>
        </div>
        {/* KPIs sidebar */}
        <div style={{ padding:"12px 16px", borderTop:"1px solid #E5E7EB", borderBottom:"1px solid #E5E7EB" }}>
          <div style={{ fontSize:"10px", color:"#9CA3AF", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"8px" }}>Resumen</div>
          {kpis.map(k => (
            <div key={k.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"4px" }}>
              <span style={{ fontSize:"12px", color:"#6B7280" }}>{k.label}</span>
              <span style={{ fontSize:"13px", fontWeight:"700", color:k.color }}>{k.value}</span>
            </div>
          ))}
        </div>
        <div style={{ padding:"12px 8px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"8px 10px" }}>
            <div style={{ width:"28px", height:"28px", borderRadius:"50%", background:"#059669", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", fontWeight:"700" }}>
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex:1, overflow:"hidden" }}>
              <div style={{ fontSize:"12px", fontWeight:"600", color:"#111827", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{user?.full_name}</div>
              <div style={{ fontSize:"11px", color:"#9CA3AF" }}>Supervisor</div>
            </div>
            <button onClick={logout} style={{ background:"none", border:"none", color:"#9CA3AF", cursor:"pointer", fontSize:"16px" }} title="Salir">x</button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Topbar */}
        <div style={{ background:"#fff", borderBottom:"1px solid #E5E7EB", padding:"0 24px", height:"56px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <h1 style={{ margin:0, fontSize:"16px", fontWeight:"700" }}>Seguimiento de tickets</h1>
            <p style={{ margin:0, fontSize:"12px", color:"#9CA3AF" }}>Solo lectura � puedes comentar y generar alertas</p>
          </div>
          <div style={{ padding:"6px 14px", background:"#ECFDF5", border:"1px solid #A7F3D0", borderRadius:"20px", fontSize:"12px", color:"#059669", fontWeight:"600" }}>
            Modo supervisor
          </div>
        </div>

        <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

          {/* Lista tickets */}
          <div style={{ width: selected ? "360px" : "100%", borderRight: selected ? "1px solid #E5E7EB" : "none", display:"flex", flexDirection:"column", overflow:"hidden", flexShrink:0 }}>

            {/* Filtros */}
            <div style={{ padding:"12px 16px", borderBottom:"1px solid #E5E7EB", background:"#fff", display:"flex", gap:"6px", overflowX:"auto" }}>
              {["all","open","in_progress","pending","resolved","closed"].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  style={{ padding:"4px 12px", borderRadius:"20px", border:"1px solid", fontSize:"12px", fontWeight:"500", cursor:"pointer", whiteSpace:"nowrap",
                    background: filterStatus === s ? "#059669" : "#fff",
                    borderColor: filterStatus === s ? "#059669" : "#E5E7EB",
                    color: filterStatus === s ? "#fff" : "#6B7280" }}>
                  {s === "all" ? "Todos" : STATUS_CONFIG[s]?.label}
                </button>
              ))}
            </div>

            {/* Lista */}
            <div style={{ flex:1, overflowY:"auto", padding:"8px" }}>
              {loading ? (
                <div style={{ textAlign:"center", padding:"40px", color:"#9CA3AF" }}>Cargando...</div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign:"center", padding:"40px", color:"#9CA3AF" }}>Sin tickets</div>
              ) : filtered.map(t => (
                <div key={t.id} onClick={() => seleccionar(t)}
                  style={{ padding:"12px 14px", borderRadius:"10px", marginBottom:"4px", cursor:"pointer", border:"1px solid",
                    background: selected?.id === t.id ? "#F0FDF4" : "#fff",
                    borderColor: selected?.id === t.id ? "#059669" : "#E5E7EB" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
                    <span style={{ fontSize:"11px", color:"#9CA3AF", fontFamily:"monospace" }}>{t.ticket_number}</span>
                    <span style={{ fontSize:"11px", padding:"2px 8px", borderRadius:"20px", fontWeight:"500",
                      background: STATUS_CONFIG[t.status]?.bg, color: STATUS_CONFIG[t.status]?.color }}>
                      {STATUS_CONFIG[t.status]?.label}
                    </span>
                  </div>
                  <p style={{ margin:"0 0 4px", fontSize:"13px", fontWeight:"600", color:"#111827" }}>{t.title}</p>
                  <span style={{ fontSize:"11px", color: PRIORITY_CONFIG[t.priority]?.color }}>
                    {PRIORITY_CONFIG[t.priority]?.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Detalle ticket */}
          {selected && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

              {/* Header detalle */}
              <div style={{ padding:"16px 24px", borderBottom:"1px solid #E5E7EB", background:"#fff", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"6px", flexWrap:"wrap" }}>
                    <span style={{ fontSize:"12px", color:"#9CA3AF", fontFamily:"monospace" }}>{selected.ticket_number}</span>
                    <span style={{ fontSize:"12px", padding:"2px 10px", borderRadius:"20px", fontWeight:"500",
                      background: STATUS_CONFIG[selected.status]?.bg, color: STATUS_CONFIG[selected.status]?.color }}>
                      {STATUS_CONFIG[selected.status]?.label}
                    </span>
                    <span style={{ fontSize:"11px", color: PRIORITY_CONFIG[selected.priority]?.color, fontWeight:"600" }}>
                      {PRIORITY_CONFIG[selected.priority]?.label}
                    </span>
                    {/* Badge solo lectura */}
                    <span style={{ fontSize:"11px", background:"#ECFDF5", color:"#059669", border:"1px solid #A7F3D0", borderRadius:"20px", padding:"1px 8px" }}>
                      Solo lectura
                    </span>
                  </div>
                  <h2 style={{ margin:0, fontSize:"16px", fontWeight:"700" }}>{selected.title}</h2>
                  {selected.description && <p style={{ margin:"6px 0 0", fontSize:"13px", color:"#6B7280" }}>{selected.description}</p>}
                </div>
                <button onClick={() => setSelected(null)} style={{ background:"none", border:"none", color:"#9CA3AF", cursor:"pointer", fontSize:"20px", padding:"0 0 0 16px" }}>x</button>
              </div>

              {/* Mensajes */}
              <div style={{ flex:1, overflowY:"auto", padding:"16px 24px", display:"flex", flexDirection:"column", gap:"12px" }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"40px", color:"#9CA3AF", fontSize:"13px" }}>Sin comentarios aun</div>
                ) : messages.map(m => (
                  <div key={m.id} style={{ display:"flex", gap:"10px", alignItems:"flex-start" }}>
                    <div style={{ width:"30px", height:"30px", borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:"700",
                      background: m.is_alert ? "#FEF2F2" : m.is_internal ? "#F3F4F6" : "#EEF4FF",
                      color: m.is_alert ? "#EF4444" : m.is_internal ? "#6B7280" : "#1D6AE5" }}>
                      {m.is_alert ? "!" : m.is_internal ? "N" : "T"}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px" }}>
                        <span style={{ fontSize:"12px", fontWeight:"600", color:"#111827" }}>
                          {m.is_alert ? "Alerta supervisor" : m.is_internal ? "Nota interna" : "Tecnico"}
                        </span>
                        {m.is_alert && <span style={{ fontSize:"11px", background:"#FEF2F2", color:"#EF4444", border:"1px solid #FECACA", padding:"1px 6px", borderRadius:"4px" }}>ALERTA</span>}
                        <span style={{ fontSize:"11px", color:"#9CA3AF" }}>{new Date(m.created_at).toLocaleString()}</span>
                      </div>
                      <div style={{ background: m.is_alert ? "#FEF2F2" : m.is_internal ? "#FFFBEB" : "#fff",
                        border: `1px solid ${m.is_alert ? "#FECACA" : m.is_internal ? "#FDE68A" : "#E5E7EB"}`,
                        borderRadius:"8px", padding:"10px 14px", fontSize:"13px", color:"#374151", lineHeight:"1.6" }}>
                        {m.body}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Caja comentario supervisor */}
              <div style={{ padding:"16px 24px", borderTop:"1px solid #E5E7EB", background:"#fff" }}>
                <div style={{ marginBottom:"8px", padding:"8px 12px", background:"#F0FDF4", borderRadius:"8px", fontSize:"12px", color:"#059669", border:"1px solid #A7F3D0" }}>
                  Como supervisor puedes comentar y generar alertas al equipo tecnico. No puedes cambiar el estado del ticket.
                </div>
                {error && <div style={{ marginBottom:"8px", padding:"8px 12px", background:"#FEF2F2", borderRadius:"8px", fontSize:"12px", color:"#EF4444" }}>{error}</div>}
                <form onSubmit={enviarComentario}>
                  <textarea value={newMsg} onChange={e => setNewMsg(e.target.value)}
                    placeholder={isAlert ? "Describe la alerta para el equipo tecnico..." : "Escribe un comentario de seguimiento..."}
                    style={{ width:"100%", minHeight:"72px", padding:"10px 14px", borderRadius:"8px", fontSize:"13px", resize:"none", boxSizing:"border-box", outline:"none", fontFamily:"inherit",
                      border: isAlert ? "1.5px solid #FECACA" : "1px solid #E5E7EB",
                      background: isAlert ? "#FEF2F2" : "#fff" }} />
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"8px" }}>
                    <label style={{ display:"flex", alignItems:"center", gap:"6px", fontSize:"12px", cursor:"pointer",
                      color: isAlert ? "#EF4444" : "#6B7280" }}>
                      <input type="checkbox" checked={isAlert} onChange={e => setIsAlert(e.target.checked)} style={{ accentColor:"#EF4444" }} />
                      Marcar como ALERTA al equipo
                    </label>
                    <button type="submit" disabled={!newMsg.trim() || sending}
                      style={{ padding:"8px 20px", border:"none", borderRadius:"8px", fontSize:"13px", fontWeight:"600", cursor: newMsg.trim() ? "pointer" : "default",
                        background: isAlert ? (newMsg.trim() ? "#EF4444" : "#E5E7EB") : (newMsg.trim() ? "#059669" : "#E5E7EB"),
                        color: newMsg.trim() ? "#fff" : "#9CA3AF" }}>
                      {sending ? "Enviando..." : isAlert ? "Enviar alerta" : "Comentar"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

