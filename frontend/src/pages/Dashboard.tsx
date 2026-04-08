import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import AssignTechnicianModal from "./AssignTechnicianModal";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open:        { label: "Abierto",      color: "#1D6AE5", bg: "#EEF4FF" },
  in_progress: { label: "En progreso",  color: "#B45309", bg: "#FFFBEB" },
  pending:     { label: "Pendiente",    color: "#7C3AED", bg: "#F5F3FF" },
  resolved:    { label: "Resuelto",     color: "#065F46", bg: "#ECFDF5" },
  closed:      { label: "Cerrado",      color: "#374151", bg: "#F3F4F6" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  low:      { label: "Baja",     color: "#6B7280", dot: "#9CA3AF" },
  medium:   { label: "Media",    color: "#D97706", dot: "#F59E0B" },
  high:     { label: "Alta",     color: "#DC2626", dot: "#EF4444" },
  Critical: { label: "Critica",  color: "#7C3AED", dot: "#8B5CF6" },
};

const TYPE_LABELS: Record<string, string> = {
  incident: "Incidente", request: "Requerimiento", change: "Cambio",
  problem: "Problema", query: "Consulta",
};

const NEXT_STATUS: Record<string, string[]> = {
  open: ["in_progress", "closed"],
  in_progress: ["pending", "resolved", "closed"],
  pending: ["in_progress", "closed"],
  resolved: ["closed", "open"],
  closed: ["open"],
};

export default function Dashboard() {
  const { user, logout, fetchMe } = useAuthStore();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", ticket_type: "incident", category: "" });
  const navigate = useNavigate();
  const location = useLocation();
  const [tenants, setTenants] = useState<any[]>([]);
  const [activeTenant, setActiveTenant] = useState<string>("");
  const [assignModal, setAssignModal] = useState<{ open: boolean; ticketId: number | null; ticketNumber: string; currentAssigneeId: number | null }>
    ({ open: false, ticketId: null, ticketNumber: "", currentAssigneeId: null });

  useEffect(() => { fetchMe(); cargarTenants(); }, []);
  useEffect(() => { if (activeTenant !== undefined) loadTickets(); }, [activeTenant]);

  const cargarTenants = async () => {
    try {
      const { data } = await api.get("/api/v1/permissions/my-tenants");
      setTenants(data);
      if (data.length > 0 && !activeTenant) setActiveTenant(data[0].tenant_id);
    } catch {}
  };

  const loadTickets = async () => {
    setLoading(true);
    try {
      const url = activeTenant ? `/api/v1/tickets?tenant_id=${activeTenant}` : "/api/v1/tickets";
      const { data } = await api.get(url);
      setTickets(data);
    } finally { setLoading(false); }
  };

  const loadMessages = async (ticketId: string) => {
    const { data } = await api.get(`/api/v1/tickets/${ticketId}/messages`);
    setMessages(data);
  };

  const selectTicket = (t: any) => { setSelected(t); loadMessages(t.id); };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/api/v1/tickets", form);
    setShowForm(false);
    setForm({ title: "", description: "", priority: "medium", ticket_type: "incident", category: "" });
    loadTickets();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !selected) return;
    await api.post(`/api/v1/tickets/${selected.id}/messages`, { body: newMsg, is_internal: isInternal });
    setNewMsg("");
    loadMessages(selected.id);
  };

  const changeStatus = async (ticketId: string, status: string) => {
    await api.patch(`/api/v1/tickets/${ticketId}/status`, { status });
    await loadTickets();
    if (selected?.id === ticketId) setSelected((prev: any) => ({ ...prev, status }));
  };

  const openAssignModal = (ticketId: number, ticketNumber: string, currentAssigneeId?: number | null) => {
    setAssignModal({ open: true, ticketId, ticketNumber, currentAssigneeId: currentAssigneeId ?? null });
  };

  const handleAssigned = (technicianId: number, technicianName: string) => {
    setTickets(prev => prev.map(t =>
      t.id === assignModal.ticketId ? { ...t, assignee_id: technicianId, assignee_name: technicianName } : t
    ));
    if (selected?.id === assignModal.ticketId)
      setSelected((prev: any) => ({ ...prev, assignee_id: technicianId, assignee_name: technicianName }));
    setAssignModal({ open: false, ticketId: null, ticketNumber: "", currentAssigneeId: null });
  };

  const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const filtered = (filterStatus === "all" ? tickets : tickets.filter(t => t.status === filterStatus))
    .sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'DM Sans', -apple-system, sans-serif", background: "#F8F9FC", color: "#111827" }}>

      {/* SIDEBAR */}
      <aside style={{ width: "220px", background: "#fff", borderRight: "1px solid #E5E7EB", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #E5E7EB" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: tenants.length > 1 ? "12px" : "0" }}>
            <div style={{ width: "32px", height: "32px", background: "#1D6AE5", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "700", fontSize: "14px" }}>F</div>
            <div>
              <div style={{ fontWeight: "700", fontSize: "13px", color: "#111827" }}>Fusion I.T.</div>
              <div style={{ fontSize: "11px", color: "#6B7280" }}>Mesa de ayuda</div>
            </div>
          </div>
          {tenants.length > 1 && (
            <div>
              <div style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Empresa</div>
              <select value={activeTenant} onChange={e => setActiveTenant(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "12px", color: "#111827", background: "#F9FAFB", outline: "none", cursor: "pointer" }}>
                <option value="">Todas las empresas</option>
                {tenants.map((t: any) => (
                  <option key={t.tenant_id} value={t.tenant_id}>{t.tenant_name}</option>
                ))}
              </select>
            </div>
          )}
          {tenants.length === 1 && (
            <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "4px" }}>
              {tenants[0]?.tenant_name}
            </div>
          )}
        </div>
        <nav style={{ padding: "12px 8px", flex: 1 }}>
          {[
            { icon: "?", label: "Dashboard",            route: "/",         active: location.pathname === "/" },
            { icon: "?", label: "Tickets",              route: "/",         active: false },
            { icon: "?", label: "Inventario",           route: "/",         active: false },
            { icon: "?", label: "Usuarios",             route: "/permisos", active: location.pathname === "/permisos" },
            { icon: "?", label: "Base de conocimiento", route: "/",         active: false },
            { icon: "?", label: "Reportes",             route: "/",         active: false },
          ].map(item => (
            <div key={item.label} onClick={() => item.route && navigate(item.route)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "8px", marginBottom: "2px", background: item.active ? "#EEF4FF" : "transparent", color: item.active ? "#1D6AE5" : "#6B7280", fontSize: "13px", fontWeight: item.active ? "600" : "400", cursor: "pointer" }}>
              <span style={{ fontSize: "14px" }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>
        <div style={{ padding: "12px 8px", borderTop: "1px solid #E5E7EB" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#1D6AE5", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700" }}>
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.full_name}</div>
              <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{user?.role}</div>
            </div>
            <button onClick={logout} style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: "16px" }} title="Salir">?</button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Topbar */}
        <div style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "0 24px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#111827" }}>Tickets</h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#9CA3AF" }}>{tickets.length} tickets en total</p>
          </div>
          <button onClick={() => setShowForm(true)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "#1D6AE5", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
            + Nuevo ticket
          </button>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* Ticket list */}
          <div style={{ width: selected ? "380px" : "100%", borderRight: selected ? "1px solid #E5E7EB" : "none", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>

            {/* Filters */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E7EB", background: "#fff", display: "flex", gap: "6px", overflowX: "auto" }}>
              {["all", "open", "in_progress", "pending", "resolved", "closed"].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  style={{ padding: "4px 12px", borderRadius: "20px", border: "1px solid", fontSize: "12px", fontWeight: "500", cursor: "pointer", whiteSpace: "nowrap",
                    background: filterStatus === s ? "#1D6AE5" : "#fff",
                    borderColor: filterStatus === s ? "#1D6AE5" : "#E5E7EB",
                    color: filterStatus === s ? "#fff" : "#6B7280" }}>
                  {s === "all" ? "Todos" : STATUS_CONFIG[s]?.label}
                </button>
              ))}
            </div>

            {/* KPIs */}
            {!selected && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", padding: "16px", background: "#F8F9FC", borderBottom: "1px solid #E5E7EB" }}>
                {[
                  { label: "Total", value: tickets.length, color: "#1D6AE5" },
                  { label: "Abiertos", value: tickets.filter(t => t.status === "open").length, color: "#EF4444" },
                  { label: "En progreso", value: tickets.filter(t => t.status === "in_progress").length, color: "#D97706" },
                  { label: "Resueltos", value: tickets.filter(t => t.status === "resolved").length, color: "#059669" },
                ].map(kpi => (
                  <div key={kpi.label} style={{ background: "#fff", borderRadius: "10px", padding: "14px 16px", border: "1px solid #E5E7EB" }}>
                    <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#9CA3AF", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.05em" }}>{kpi.label}</p>
                    <p style={{ margin: 0, fontSize: "26px", fontWeight: "700", color: kpi.color }}>{kpi.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
              {loading ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#9CA3AF" }}>Cargando...</div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>??</div>
                  <p style={{ color: "#6B7280", fontSize: "14px" }}>No hay tickets aqu?</p>
                </div>
              ) : filtered.map(t => (
                <div key={t.id} onClick={() => selectTicket(t)}
                  style={{ padding: "12px 14px", borderRadius: "10px", marginBottom: "4px", cursor: "pointer", border: "1px solid", transition: "all 0.15s",
                    background: selected?.id === t.id ? "#EEF4FF" : "#fff",
                    borderColor: selected?.id === t.id ? "#1D6AE5" : "#E5E7EB" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <span style={{ fontSize: "11px", color: "#9CA3AF", fontFamily: "monospace" }}>{t.ticket_number}</span>
                    <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", fontWeight: "500",
                      background: STATUS_CONFIG[t.status]?.bg, color: STATUS_CONFIG[t.status]?.color }}>
                      {STATUS_CONFIG[t.status]?.label}
                    </span>
                  </div>
                  <p style={{ margin: "0 0 6px", fontSize: "13px", fontWeight: "600", color: "#111827", lineHeight: "1.4" }}>{t.title}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: PRIORITY_CONFIG[t.priority]?.color }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: PRIORITY_CONFIG[t.priority]?.dot, display: "inline-block" }}></span>
                      {PRIORITY_CONFIG[t.priority]?.label}
                    </span>
                    <span style={{ color: "#E5E7EB" }}>?</span>
                    <span style={{ fontSize: "11px", color: "#9CA3AF" }}>{TYPE_LABELS[t.ticket_type]}</span>
                    {t.category && <><span style={{ color: "#E5E7EB" }}>?</span><span style={{ fontSize: "11px", color: "#9CA3AF" }}>{t.category}</span></>}
                    <span style={{ color: "#E5E7EB" }}>?</span>
                    {t.assignee_name ? (
                      <span style={{ display:"inline-flex", alignItems:"center", gap:"4px", fontSize:"11px", color:"#059669" }}>
                        <span style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#059669", display:"inline-block" }}></span>
                        {t.assignee_name}
                      </span>
                    ) : (
                      <button onClick={e => { e.stopPropagation(); openAssignModal(t.id, t.ticket_number, null); }}
                        style={{ fontSize:"11px", color:"#1D6AE5", background:"none", border:"1px solid #BFDBFE", borderRadius:"20px", padding:"1px 8px", cursor:"pointer" }}>
                        + Asignar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ticket detail */}
          {selected && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

              {/* Detail header */}
              <div style={{ padding: "16px 24px", borderBottom: "1px solid #E5E7EB", background: "#fff", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "12px", color: "#9CA3AF", fontFamily: "monospace" }}>{selected.ticket_number}</span>
                    <span style={{ fontSize: "12px", padding: "2px 10px", borderRadius: "20px", fontWeight: "500",
                      background: STATUS_CONFIG[selected.status]?.bg, color: STATUS_CONFIG[selected.status]?.color }}>
                      {STATUS_CONFIG[selected.status]?.label}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: PRIORITY_CONFIG[selected.priority]?.color }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: PRIORITY_CONFIG[selected.priority]?.dot, display: "inline-block" }}></span>
                      {PRIORITY_CONFIG[selected.priority]?.label}
                    </span>
                    {/* Asignaci?n en header del detalle */}
                    {selected.assignee_name ? (
                      <button onClick={() => openAssignModal(selected.id, selected.ticket_number, selected.assignee_id)}
                        style={{ display:"inline-flex", alignItems:"center", gap:"4px", fontSize:"11px", color:"#059669", background:"#ECFDF5", border:"1px solid #A7F3D0", borderRadius:"20px", padding:"2px 10px", cursor:"pointer" }}>
                        ?? {selected.assignee_name} ? cambiar
                      </button>
                    ) : (
                      <button onClick={() => openAssignModal(selected.id, selected.ticket_number, null)}
                        style={{ fontSize:"11px", color:"#1D6AE5", background:"#EEF4FF", border:"1px solid #BFDBFE", borderRadius:"20px", padding:"2px 10px", cursor:"pointer" }}>
                        + Asignar t?cnico
                      </button>
                    )}
                  </div>
                  <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#111827" }}>{selected.title}</h2>
                  {selected.description && <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#6B7280" }}>{selected.description}</p>}
                </div>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: "20px", lineHeight: 1, padding: "0 0 0 16px" }}>?</button>
              </div>

              {/* Status actions */}
              {NEXT_STATUS[selected.status]?.length > 0 && (
                <div style={{ padding: "10px 24px", borderBottom: "1px solid #E5E7EB", background: "#F8F9FC", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", color: "#6B7280", fontWeight: "500" }}>Cambiar a:</span>
                  {NEXT_STATUS[selected.status].map(s => (
                    <button key={s} onClick={() => changeStatus(selected.id, s)}
                      style={{ padding: "4px 12px", borderRadius: "6px", border: "1px solid", fontSize: "12px", fontWeight: "500", cursor: "pointer",
                        background: STATUS_CONFIG[s]?.bg, borderColor: STATUS_CONFIG[s]?.color, color: STATUS_CONFIG[s]?.color }}>
                      {STATUS_CONFIG[s]?.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "#9CA3AF", fontSize: "13px" }}>
                    Sin mensajes a?n. Escribe el primero.
                  </div>
                ) : messages.map(m => (
                  <div key={m.id} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: m.is_internal ? "#F3F4F6" : "#EEF4FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", color: m.is_internal ? "#6B7280" : "#1D6AE5", flexShrink: 0 }}>
                      {m.is_internal ? "??" : "T"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "600", color: "#111827" }}>
                          {m.is_internal ? "Nota interna" : "T?cnico"}
                        </span>
                        {m.is_internal && <span style={{ fontSize: "11px", padding: "1px 6px", background: "#F3F4F6", color: "#6B7280", borderRadius: "4px" }}>Interno</span>}
                        <span style={{ fontSize: "11px", color: "#9CA3AF" }}>{new Date(m.created_at).toLocaleString()}</span>
                      </div>
                      <div style={{ background: m.is_internal ? "#FFFBEB" : "#fff", border: `1px solid ${m.is_internal ? "#FDE68A" : "#E5E7EB"}`, borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#374151", lineHeight: "1.6" }}>
                        {m.body}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply box */}
              <div style={{ padding: "16px 24px", borderTop: "1px solid #E5E7EB", background: "#fff" }}>
                <form onSubmit={sendMessage}>
                  <textarea value={newMsg} onChange={e => setNewMsg(e.target.value)}
                    placeholder={isInternal ? "Escribe una nota interna..." : "Escribe una respuesta..."}
                    style={{ width: "100%", minHeight: "80px", padding: "10px 14px", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "13px", color: "#111827", resize: "none", boxSizing: "border-box", outline: "none", fontFamily: "inherit", background: isInternal ? "#FFFBEB" : "#fff" }}/>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#6B7280", cursor: "pointer" }}>
                      <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} style={{ cursor: "pointer" }}/>
                      Nota interna (no visible al cliente)
                    </label>
                    <button type="submit" disabled={!newMsg.trim()}
                      style={{ padding: "8px 20px", background: newMsg.trim() ? "#1D6AE5" : "#E5E7EB", color: newMsg.trim() ? "#fff" : "#9CA3AF", border: "none", borderRadius: "8px", cursor: newMsg.trim() ? "pointer" : "default", fontSize: "13px", fontWeight: "600" }}>
                      {isInternal ? "Agregar nota" : "Responder"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL NUEVO TICKET */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "520px", maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Nuevo ticket</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: "20px" }}>?</button>
            </div>
            <form onSubmit={createTicket}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <input placeholder="T?tulo del ticket *" required value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "13px", outline: "none", fontFamily: "inherit" }}/>
                <textarea placeholder="Descripci?n del problema..." value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "13px", minHeight: "80px", resize: "none", outline: "none", fontFamily: "inherit" }}/>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tipo</label>
                    <select value={form.ticket_type} onChange={e => setForm({...form, ticket_type: e.target.value})}
                      style={{ width: "100%", marginTop: "4px", padding: "10px 14px", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "13px", background: "#fff", outline: "none" }}>
                      <option value="incident">Incidente</option>
                      <option value="request">Requerimiento</option>
                      <option value="change">Cambio</option>
                      <option value="problem">Problema</option>
                      <option value="query">Consulta</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Prioridad</label>
                    <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}
                      style={{ width: "100%", marginTop: "4px", padding: "10px 14px", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "13px", background: "#fff", outline: "none" }}>
                      <option value="low">Baja</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                      <option value="Critical">Cr?tica</option>
                    </select>
                  </div>
                </div>
                <input placeholder="Categor?a (ej: Hardware, Red, Software)" value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "13px", outline: "none", fontFamily: "inherit" }}/>
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button type="submit" style={{ flex: 1, padding: "10px", background: "#1D6AE5", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
                  Crear ticket
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: "10px 20px", background: "#F3F4F6", color: "#374151", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ASIGNAR T?CNICO */}
      {assignModal.open && assignModal.ticketId && (
        <AssignTechnicianModal
          ticketId={assignModal.ticketId}
          ticketNumber={assignModal.ticketNumber}
          currentAssigneeId={assignModal.currentAssigneeId}
          isOpen={assignModal.open}
          onClose={() => setAssignModal({ open: false, ticketId: null, ticketNumber: "", currentAssigneeId: null })}
          onAssigned={handleAssigned}
        />
      )}
    </div>
  );
}











