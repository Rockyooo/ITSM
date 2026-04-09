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
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteDescription, setQuoteDescription] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteFile, setQuoteFile] = useState<File | null>(null);

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
        message_type: isAlert ? "alert" : "comment",
      });
      setNewMsg(""); setIsAlert(false);
      cargarMensajes(selected.id);
    } catch {
      setError("No se pudo enviar el comentario");
    } finally { setSending(false); }
  };

  const enviarCotizacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (!quoteDescription.trim() || !quoteAmount.trim()) {
      setError("La descripcion y el monto son obligatorios para la cotizacion");
      return;
    }

    setSending(true);
    setError("");
    try {
      const body = `Cotizacion\nMonto: ${quoteAmount}\nDetalle: ${quoteDescription}`;
      const created = await api.post(`/api/v1/tickets/${selected.id}/messages`, {
        body,
        is_internal: true,
        is_alert: false,
        message_type: "quote",
      });

      const messageId = created?.data?.id;
      if (messageId && quoteFile) {
        const formData = new FormData();
        formData.append("file", quoteFile);
        await api.post(`/api/v1/tickets/${selected.id}/messages/${messageId}/attachments`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setShowQuoteModal(false);
      setQuoteDescription("");
      setQuoteAmount("");
      setQuoteFile(null);
      await cargarMensajes(selected.id);
    } catch {
      setError("No se pudo enviar la cotizacion");
    } finally {
      setSending(false);
    }
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
      <main style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Topbar */}
        <div style={{ background:"#fff", borderBottom:"1px solid #E5E7EB", padding:"0 24px", height:"56px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <h1 style={{ margin:0, fontSize:"16px", fontWeight:"700" }}>Seguimiento de tickets</h1>
            <p style={{ margin:0, fontSize:"12px", color:"#9CA3AF" }}>Solo lectura - puedes comentar, alertar y crear cotizaciones</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding:"6px 14px", background:"#ECFDF5", border:"1px solid #A7F3D0", borderRadius:"20px", fontSize:"12px", color:"#059669", fontWeight:"600" }}>
              Modo supervisor
            </div>
            <button onClick={logout} style={{ background:"#fff", border:"1px solid #E5E7EB", color:"#6B7280", cursor:"pointer", fontSize:"12px", borderRadius:"8px", padding:"6px 10px" }}>
              Salir
            </button>
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
                          {m.message_type === "quote" ? "Cotizacion" : m.is_alert ? "Alerta supervisor" : m.is_internal ? "Nota interna" : "Tecnico"}
                        </span>
                        {m.message_type === "quote" && (
                          <span style={{ fontSize:"11px", background:"#EEF4FF", color:"#1D6AE5", border:"1px solid #BFDBFE", padding:"1px 6px", borderRadius:"4px" }}>QUOTE</span>
                        )}
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
                  Como supervisor puedes comentar, generar alertas y registrar cotizaciones. No puedes cambiar el estado del ticket.
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
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button type="button" onClick={() => setShowQuoteModal(true)} disabled={!selected || sending}
                        style={{ padding:"8px 14px", border:"1px solid #BFDBFE", borderRadius:"8px", fontSize:"12px", fontWeight:"600", cursor:"pointer", background:"#EEF4FF", color:"#1D6AE5" }}>
                        Nueva cotizacion
                      </button>
                      <button type="submit" disabled={!newMsg.trim() || sending}
                        style={{ padding:"8px 20px", border:"none", borderRadius:"8px", fontSize:"13px", fontWeight:"600", cursor: newMsg.trim() ? "pointer" : "default",
                          background: isAlert ? (newMsg.trim() ? "#EF4444" : "#E5E7EB") : (newMsg.trim() ? "#059669" : "#E5E7EB"),
                          color: newMsg.trim() ? "#fff" : "#9CA3AF" }}>
                        {sending ? "Enviando..." : isAlert ? "Enviar alerta" : "Comentar"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      {showQuoteModal && selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:60 }} onClick={() => setShowQuoteModal(false)}>
          <div style={{ background:"#fff", borderRadius:"14px", width:"100%", maxWidth:"520px", margin:"16px", overflow:"hidden" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid #E5E7EB", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <h3 style={{ margin:0, fontSize:"16px", fontWeight:"700" }}>Nueva cotizacion</h3>
                <p style={{ margin:"4px 0 0", fontSize:"12px", color:"#9CA3AF" }}>{selected.ticket_number}</p>
              </div>
              <button onClick={() => setShowQuoteModal(false)} style={{ background:"none", border:"none", color:"#9CA3AF", cursor:"pointer", fontSize:"20px" }}>x</button>
            </div>
            <form onSubmit={enviarCotizacion} style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:"12px" }}>
              <div>
                <label style={{ display:"block", fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase", marginBottom:"6px" }}>Descripcion *</label>
                <textarea value={quoteDescription} onChange={e => setQuoteDescription(e.target.value)} required
                  placeholder="Detalle de la cotizacion para el cliente"
                  style={{ width:"100%", minHeight:"84px", padding:"10px 12px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", boxSizing:"border-box", resize:"vertical", fontFamily:"inherit", outline:"none" }} />
              </div>
              <div>
                <label style={{ display:"block", fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase", marginBottom:"6px" }}>Monto *</label>
                <input type="text" value={quoteAmount} onChange={e => setQuoteAmount(e.target.value)} required
                  placeholder="$ 0.00"
                  style={{ width:"100%", padding:"10px 12px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", boxSizing:"border-box", fontFamily:"inherit", outline:"none" }} />
              </div>
              <div>
                <label style={{ display:"block", fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase", marginBottom:"6px" }}>Adjunto PDF (opcional)</label>
                <input type="file" accept=".pdf" onChange={e => setQuoteFile(e.target.files?.[0] ?? null)}
                  style={{ width:"100%", padding:"10px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"12px", boxSizing:"border-box" }} />
              </div>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:"8px", marginTop:"4px" }}>
                <button type="button" onClick={() => setShowQuoteModal(false)} style={{ padding:"8px 14px", border:"1px solid #E5E7EB", borderRadius:"8px", background:"#fff", color:"#6B7280", cursor:"pointer" }}>Cancelar</button>
                <button type="submit" disabled={sending} style={{ padding:"8px 16px", border:"none", borderRadius:"8px", background:"#1D6AE5", color:"#fff", fontWeight:"600", cursor:"pointer" }}>
                  {sending ? "Enviando..." : "Guardar cotizacion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

