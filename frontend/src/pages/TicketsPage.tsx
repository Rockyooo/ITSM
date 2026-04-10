import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import AssignTechnicianModal from "./AssignTechnicianModal";
import {
  Plus, X, Send, Lock, Unlock, ChevronDown,
  Clock, AlertTriangle, CheckCircle, Circle, Loader2,
  UserCheck, UserPlus, Hash, Tag, Layers, ArrowLeft, GitMerge
} from "lucide-react";

// ─── Config ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  open:        { label: "Abierto",     color: "#4f46e5", bg: "#eef2ff", ring: "#c7d2fe" },
  in_progress: { label: "En progreso", color: "#d97706", bg: "#fffbeb", ring: "#fde68a" },
  pending:     { label: "Pendiente",   color: "#7c3aed", bg: "#f5f3ff", ring: "#ddd6fe" },
  resolved:    { label: "Resuelto",    color: "#059669", bg: "#ecfdf5", ring: "#a7f3d0" },
  closed:      { label: "Cerrado",     color: "#6b7280", bg: "#f3f4f6", ring: "#e5e7eb" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string; bg: string }> = {
  low:      { label: "Baja",    color: "#6b7280", dot: "#9ca3af", bg: "#f3f4f6" },
  medium:   { label: "Media",   color: "#d97706", dot: "#f59e0b", bg: "#fffbeb" },
  high:     { label: "Alta",    color: "#dc2626", dot: "#ef4444", bg: "#fef2f2" },
  Critical: { label: "Crítica", color: "#7c3aed", dot: "#8b5cf6", bg: "#f5f3ff" },
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

const PRIORITY_ORDER: Record<string, number> = { Critical: 0, high: 1, medium: 2, low: 3 };

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Avatar({ name, size = 32, color = "#6366f1" }: { name: string; size?: number; color?: string }) {
  const initials = name?.substring(0, 2).toUpperCase() || "??";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${color}, ${color}cc)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: "700", fontSize: size * 0.35,
      boxShadow: `0 2px 8px ${color}40`,
    }}>{initials}</div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status];
  if (!c) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      fontSize: "11px", fontWeight: "600", padding: "3px 10px",
      borderRadius: "99px", background: c.bg, color: c.color,
      border: `1px solid ${c.ring}`,
    }}>{c.label}</span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const c = PRIORITY_CONFIG[priority];
  if (!c) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: c.color, fontWeight: "600" }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: c.dot, display: "inline-block", boxShadow: `0 0 4px ${c.dot}80` }} />
      {c.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TicketsPage() {
  const { user, fetchMe } = useAuthStore();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMerged, setFilterMerged] = useState<"all" | "active" | "merged">("all");
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", ticket_type: "incident", category: "" });
  const [tenants, setTenants] = useState<any[]>([]);
  const [activeTenant, setActiveTenant] = useState<string>("");
  const [assignModal, setAssignModal] = useState<{ open: boolean; ticketId: string | null; ticketNumber: string; currentAssigneeId: string | null }>(
    { open: false, ticketId: null, ticketNumber: "", currentAssigneeId: null }
  );
  const [mergeModal, setMergeModal] = useState<{ open: boolean; source: any | null; targetId: string; loading: boolean; error: string }>({
    open: false,
    source: null,
    targetId: "",
    loading: false,
    error: "",
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchMe(); cargarTenants(); }, []);
  useEffect(() => { if (activeTenant !== undefined) loadTickets(); }, [activeTenant]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

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

  const selectTicket = (t: any) => { navigate('/ticket/' + t.id); };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/api/v1/tickets", form);
    setShowForm(false);
    setForm({ title: "", description: "", priority: "medium", ticket_type: "incident", category: "" });
    loadTickets();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !selected || sendingMsg) return;
    setSendingMsg(true);
    try {
      await api.post(`/api/v1/tickets/${selected.id}/messages`, { body: newMsg, is_internal: isInternal });
      setNewMsg("");
      loadMessages(selected.id);
    } finally { setSendingMsg(false); }
  };

  const changeStatus = async (ticketId: string, status: string) => {
    await api.patch(`/api/v1/tickets/${ticketId}/status`, { status });
    await loadTickets();
    if (selected?.id === ticketId) setSelected((prev: any) => ({ ...prev, status }));
  };

  const openAssignModal = (ticketId: string, ticketNumber: string, currentAssigneeId?: string | null) => {
    setAssignModal({ open: true, ticketId, ticketNumber, currentAssigneeId: currentAssigneeId ?? null });
  };

  const handleAssigned = (technicianId: string, technicianName: string) => {
    setTickets(prev => prev.map(t =>
      t.id === assignModal.ticketId ? { ...t, assigned_to: technicianId, assignee_name: technicianName } : t
    ));
    if (selected?.id === assignModal.ticketId)
      setSelected((prev: any) => ({ ...prev, assigned_to: technicianId, assignee_name: technicianName }));
    setAssignModal({ open: false, ticketId: null, ticketNumber: "", currentAssigneeId: null });
  };

  const openMergeModal = (ticket: any) => {
    setMergeModal({ open: true, source: ticket, targetId: "", loading: false, error: "" });
  };

  const confirmMerge = async () => {
    if (!mergeModal.source || !mergeModal.targetId) return;
    setMergeModal((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      await api.post(`/api/v1/tickets/${mergeModal.source.id}/merge`, { target_ticket_id: mergeModal.targetId });
      setMergeModal({ open: false, source: null, targetId: "", loading: false, error: "" });
      await loadTickets();
    } catch (err: any) {
      setMergeModal((prev) => ({ ...prev, loading: false, error: err?.response?.data?.detail ?? "No se pudo fusionar el ticket" }));
    }
  };

  const filtered = useMemo(() => {
    let list = filterStatus === "all" ? tickets : tickets.filter(t => t.status === filterStatus);
    if (filterMerged !== "all") {
      list = list.filter((t) => (filterMerged === "merged" ? Boolean(t.merged_into_id) : !t.merged_into_id));
    }
    return list.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [tickets, filterStatus, filterMerged]);

  const kpis = [
    { label: "Total", value: tickets.length, color: "#6366f1", bg: "#eef2ff", icon: Layers },
    { label: "Abiertos", value: tickets.filter(t => t.status === "open").length, color: "#ef4444", bg: "#fef2f2", icon: AlertTriangle },
    { label: "En progreso", value: tickets.filter(t => t.status === "in_progress").length, color: "#d97706", bg: "#fffbeb", icon: Clock },
    { label: "Resueltos", value: tickets.filter(t => t.status === "resolved").length, color: "#059669", bg: "#ecfdf5", icon: CheckCircle },
  ];

  const isMyMessage = (m: any) => m.sender_id === user?.id || (!m.sender_id && true);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", height: "100vh", background: "#f5f6fa" }}>

      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #ede9fe",
        padding: "0 24px", height: "60px",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        boxShadow: "0 1px 0 #ede9fe",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {selected && (
            <button onClick={() => setSelected(null)} style={{
              background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "8px",
              padding: "6px 10px", cursor: "pointer", color: "#7c3aed",
              display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: "600",
            }}>
              <ArrowLeft size={14} /> Volver
            </button>
          )}
          <div>
            <h1 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#1e1b4b", letterSpacing: "-0.02em" }}>
              {selected ? selected.title : "Mis Tickets"}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "2px" }}>
              <p style={{ margin: 0, fontSize: "11px", color: "#a78bfa" }}>
                {selected ? selected.ticket_number : `${tickets.length} tickets registrados`}
              </p>
              {!selected && tenants.length > 1 && (
                <select 
                  value={activeTenant} 
                  onChange={e => setActiveTenant(e.target.value)}
                  style={{
                    padding: "2px 6px",
                    borderRadius: "6px", border: "1px solid #ede9fe",
                    fontSize: "11px", background: "#f5f3ff", color: "#6d28d9",
                    outline: "none", cursor: "pointer", fontWeight: "600"
                  }}
                >
                  <option value="">Todas las empresas</option>
                  {tenants.map((t: any) => (
                    <option key={t.tenant_id} value={t.tenant_id}>{t.tenant_name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} style={{
          display: "flex", alignItems: "center", gap: "7px",
          padding: "9px 18px",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          color: "#fff", border: "none", borderRadius: "10px",
          cursor: "pointer", fontSize: "13px", fontWeight: "700",
          boxShadow: "0 4px 12px rgba(99,102,241,0.35)",
          transition: "all 0.15s",
        }}>
          <Plus size={16} strokeWidth={2.5} /> Nuevo ticket
        </button>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Ticket List ──────────────────────────────────────────────────── */}
        <div style={{
          width: selected ? "360px" : "100%",
          borderRight: selected ? "1px solid #ede9fe" : "none",
          display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0,
          transition: "width 0.2s ease",
          background: "#fff",
        }}>

          {/* Status filters */}
          <div style={{
            padding: "10px 14px", borderBottom: "1px solid #f3f4f6",
            display: "flex", gap: "5px", overflowX: "auto", flexShrink: 0,
            background: "#fafafa",
          }}>
            {["all", "open", "in_progress", "pending", "resolved", "closed"].map(s => {
              const active = filterStatus === s;
              const cfg = STATUS_CONFIG[s];
              return (
                <button key={s} onClick={() => setFilterStatus(s)} style={{
                  padding: "5px 13px", borderRadius: "99px",
                  border: active ? `1.5px solid ${cfg?.ring || "#c7d2fe"}` : "1.5px solid #e5e7eb",
                  fontSize: "11px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap",
                  background: active ? (cfg?.bg || "#eef2ff") : "#fff",
                  color: active ? (cfg?.color || "#6366f1") : "#9ca3af",
                  transition: "all 0.15s",
                }}>
                  {s === "all" ? "Todos" : cfg?.label}
                </button>
              );
            })}
          </div>
          <div style={{ padding: "8px 14px", borderBottom: "1px solid #f3f4f6", display: "flex", gap: "6px", background: "#fafafa" }}>
            {[
              { key: "all", label: "Todos" },
              { key: "active", label: "No fusionados" },
              { key: "merged", label: "Fusionados" },
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => setFilterMerged(m.key as "all" | "active" | "merged")}
                style={{
                  padding: "4px 10px",
                  borderRadius: "99px",
                  border: `1px solid ${filterMerged === m.key ? "#a78bfa" : "#e5e7eb"}`,
                  background: filterMerged === m.key ? "#f5f3ff" : "#fff",
                  color: filterMerged === m.key ? "#6d28d9" : "#6b7280",
                  fontSize: "11px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* KPIs */}
          {!selected && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px", padding: "14px", borderBottom: "1px solid #f3f4f6", background: "#fafafa", flexShrink: 0 }}>
              {kpis.map(k => (
                <div key={k.label} style={{
                  background: "#fff", borderRadius: "12px", padding: "14px",
                  border: `1px solid ${k.bg === "#eef2ff" ? "#e0e7ff" : k.bg === "#fef2f2" ? "#fee2e2" : k.bg === "#fffbeb" ? "#fde68a" : "#a7f3d0"}`,
                  display: "flex", alignItems: "center", gap: "10px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <k.icon size={16} color={k.color} strokeWidth={2} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: k.color, lineHeight: 1 }}>{k.value}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#9ca3af", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: "12px", color: "#a78bfa" }}>
                <Loader2 size={28} style={{ animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: "13px", fontWeight: "500" }}>Cargando tickets...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎉</div>
                <p style={{ color: "#6b7280", fontSize: "14px", fontWeight: "500" }}>No hay tickets aquí</p>
                <p style={{ color: "#9ca3af", fontSize: "12px", marginTop: "4px" }}>Todo está al día</p>
              </div>
            ) : filtered.map(t => {
              const isActive = selected?.id === t.id;
              const pCfg = PRIORITY_CONFIG[t.priority];
              return (
                <div key={t.id} onClick={() => selectTicket(t)} style={{
                  padding: "13px 14px 12px", borderRadius: "12px", marginBottom: "5px",
                  cursor: "pointer", border: "1.5px solid",
                  transition: "all 0.15s",
                  background: isActive ? "#f5f3ff" : "#fff",
                  borderColor: isActive ? "#c4b5fd" : "#f0f0f0",
                  borderLeft: `3.5px solid ${pCfg?.dot || "#9ca3af"}`,
                  boxShadow: isActive ? "0 2px 8px rgba(99,102,241,0.1)" : "0 1px 3px rgba(0,0,0,0.04)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <span style={{ fontSize: "10px", color: "#a78bfa", fontFamily: "monospace", fontWeight: "700", background: "#f5f3ff", padding: "2px 6px", borderRadius: "4px" }}>
                      {t.ticket_number}
                    </span>
                    <StatusBadge status={t.status} />
                  </div>
                  <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: "700", color: "#1e1b4b", lineHeight: "1.4" }}>{t.title}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <PriorityDot priority={t.priority} />
                    <span style={{ color: "#e5e7eb", fontSize: "12px" }}>·</span>
                    <span style={{ fontSize: "11px", color: "#9ca3af", fontWeight: "500" }}>{TYPE_LABELS[t.ticket_type] || t.ticket_type}</span>
                    {t.category && <>
                      <span style={{ color: "#e5e7eb" }}>·</span>
                      <span style={{ fontSize: "11px", color: "#9ca3af" }}>{t.category}</span>
                    </>}
                    <span style={{ color: "#e5e7eb" }}>·</span>
                    {t.assignee_name ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#059669", fontWeight: "600" }}>
                        <UserCheck size={11} /> {t.assignee_name}
                      </span>
                    ) : (
                      <button onClick={e => { e.stopPropagation(); openAssignModal(t.id, t.ticket_number, null); }} style={{
                        fontSize: "11px", color: "#6366f1", background: "#eef2ff",
                        border: "1px solid #c7d2fe", borderRadius: "99px", padding: "1px 8px",
                        cursor: "pointer", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "3px",
                      }}>
                        <UserPlus size={10} /> Asignar
                      </button>
                    )}
                    {!t.merged_into_id && (
                      <button onClick={e => { e.stopPropagation(); openMergeModal(t); }} style={{
                        fontSize: "11px", color: "#7c3aed", background: "#f5f3ff",
                        border: "1px solid #ddd6fe", borderRadius: "99px", padding: "1px 8px",
                        cursor: "pointer", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "3px",
                      }}>
                        <GitMerge size={10} /> Fusionar
                      </button>
                    )}
                    {t.merged_into_id && (
                      <span style={{ fontSize: "11px", color: "#6b7280", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "99px", padding: "1px 8px", fontWeight: "600" }}>
                        Fusionado
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Ticket Detail / Chat ─────────────────────────────────────────── */}
        {selected && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#f7f7fb" }}>

            {/* Detail header */}
            <div style={{
              padding: "14px 20px", borderBottom: "1px solid #ede9fe",
              background: "#fff", flexShrink: 0,
              boxShadow: "0 1px 4px rgba(99,102,241,0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", color: "#a78bfa", fontFamily: "monospace", fontWeight: "700", background: "#f5f3ff", padding: "2px 8px", borderRadius: "5px" }}>
                  {selected.ticket_number}
                </span>
                <StatusBadge status={selected.status} />
                <PriorityDot priority={selected.priority} />
                {selected.assignee_name ? (
                  <button onClick={() => openAssignModal(selected.id, selected.ticket_number, selected.assigned_to)} style={{
                    display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px",
                    color: "#059669", background: "#ecfdf5", border: "1px solid #a7f3d0",
                    borderRadius: "99px", padding: "3px 10px", cursor: "pointer", fontWeight: "600",
                  }}>
                    <UserCheck size={11} /> {selected.assignee_name} · cambiar
                  </button>
                ) : (
                  <button onClick={() => openAssignModal(selected.id, selected.ticket_number, null)} style={{
                    display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px",
                    color: "#6366f1", background: "#eef2ff", border: "1px solid #c7d2fe",
                    borderRadius: "99px", padding: "3px 10px", cursor: "pointer", fontWeight: "600",
                  }}>
                    <UserPlus size={11} /> Asignar técnico
                  </button>
                )}
                <button onClick={() => setSelected(null)} style={{
                  marginLeft: "auto", background: "none", border: "none",
                  color: "#9ca3af", cursor: "pointer", padding: "4px", borderRadius: "6px",
                  display: "flex", alignItems: "center",
                }}>
                  <X size={18} />
                </button>
              </div>
              <h2 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: "800", color: "#1e1b4b" }}>{selected.title}</h2>
              {selected.description && (
                <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", lineHeight: "1.5" }}>{selected.description}</p>
              )}

              {/* Status change actions */}
              {NEXT_STATUS[selected.status]?.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #f3f4f6" }}>
                  <span style={{ fontSize: "11px", color: "#9ca3af", fontWeight: "600" }}>Mover a:</span>
                  {NEXT_STATUS[selected.status].map(s => {
                    const c = STATUS_CONFIG[s];
                    return (
                      <button key={s} onClick={() => changeStatus(selected.id, s)} style={{
                        padding: "4px 12px", borderRadius: "99px",
                        border: `1.5px solid ${c?.ring}`, fontSize: "11px", fontWeight: "600",
                        cursor: "pointer", background: c?.bg, color: c?.color, transition: "all 0.15s",
                      }}>
                        {c?.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Messages area */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {messages.length === 0 ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
                  <div style={{
                    width: "56px", height: "56px", borderRadius: "50%",
                    background: "linear-gradient(135deg, #ede9fe, #ddd6fe)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Send size={22} color="#8b5cf6" />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#4c1d95" }}>Sin mensajes aún</p>
                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#9ca3af" }}>Escribe el primer mensaje a continuación</p>
                  </div>
                </div>
              ) : messages.map((m, idx) => {
                const isMine = isMyMessage(m);
                const isNote = m.is_internal;
                const prevM = messages[idx - 1];
                const showDateSep = !prevM || new Date(m.created_at).toDateString() !== new Date(prevM.created_at).toDateString();
                const senderName = m.sender_name || (isMine ? user?.full_name : "Usuario") || "—";

                return (
                  <div key={m.id}>
                    {/* Date separator */}
                    {showDateSep && (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "12px 0" }}>
                        <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
                        <span style={{ fontSize: "10px", color: "#9ca3af", fontWeight: "600", whiteSpace: "nowrap" }}>
                          {new Date(m.created_at).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "long" })}
                        </span>
                        <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
                      </div>
                    )}

                    {/* Internal note — centered */}
                    {isNote ? (
                      <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
                        <div style={{
                          background: "#fffbeb", border: "1px solid #fde68a",
                          borderRadius: "99px", padding: "5px 14px",
                          display: "flex", alignItems: "center", gap: "6px",
                          maxWidth: "80%",
                        }}>
                          <Lock size={11} color="#d97706" />
                          <span style={{ fontSize: "11px", color: "#92400e", fontWeight: "600" }}>Nota interna</span>
                          <span style={{ fontSize: "11px", color: "#92400e" }}>— {m.body}</span>
                          <span style={{ fontSize: "10px", color: "#d97706", marginLeft: "4px" }}>
                            {new Date(m.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Regular message */
                      <div style={{
                        display: "flex", gap: "8px", marginBottom: "10px",
                        flexDirection: isMine ? "row-reverse" : "row",
                        alignItems: "flex-end",
                      }}>
                        <Avatar name={senderName} size={30} color={isMine ? "#6366f1" : "#7c3aed"} />
                        <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
                          <span style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "3px", fontWeight: "600" }}>
                            {senderName}
                          </span>
                          <div style={{
                            padding: "10px 14px", borderRadius: isMine ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                            background: isMine
                              ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                              : "#fff",
                            color: isMine ? "#fff" : "#374151",
                            fontSize: "13px", lineHeight: "1.55", fontWeight: "450",
                            boxShadow: isMine
                              ? "0 4px 14px rgba(99,102,241,0.3)"
                              : "0 1px 4px rgba(0,0,0,0.08)",
                          }}>
                            {m.body}
                          </div>
                          <span style={{ fontSize: "10px", color: "#9ca3af", marginTop: "3px" }}>
                            {new Date(m.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply box */}
            <div style={{
              padding: "12px 16px 16px", borderTop: "1px solid #ede9fe",
              background: "#fff", flexShrink: 0,
            }}>
              <form onSubmit={sendMessage}>
                <div style={{
                  borderRadius: "14px", overflow: "hidden",
                  border: isInternal ? "2px solid #fde68a" : "2px solid #ede9fe",
                  background: isInternal ? "#fffbeb" : "#fafafa",
                  transition: "border-color 0.2s, background 0.2s",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}>
                  <textarea
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e as any); } }}
                    placeholder={isInternal ? "✏️  Escribe una nota interna (solo visible para el equipo)..." : "✉️  Escribe una respuesta..."}
                    rows={3}
                    style={{
                      width: "100%", padding: "12px 14px 4px",
                      border: "none", outline: "none", resize: "none",
                      fontSize: "13px", color: "#374151", lineHeight: "1.6",
                      background: "transparent", fontFamily: "inherit",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px 10px 14px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: isInternal ? "#d97706" : "#9ca3af", cursor: "pointer", fontWeight: "600", userSelect: "none" }}>
                      <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} style={{ cursor: "pointer", accentColor: "#d97706" }} />
                      {isInternal ? <><Lock size={11} /> Nota interna</> : <><Unlock size={11} /> Respuesta pública</>}
                    </label>
                    <button type="submit" disabled={!newMsg.trim() || sendingMsg} style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "8px 16px",
                      background: newMsg.trim()
                        ? isInternal
                          ? "linear-gradient(135deg, #f59e0b, #d97706)"
                          : "linear-gradient(135deg, #6366f1, #8b5cf6)"
                        : "#e5e7eb",
                      color: newMsg.trim() ? "#fff" : "#9ca3af",
                      border: "none", borderRadius: "10px", cursor: newMsg.trim() ? "pointer" : "default",
                      fontSize: "12px", fontWeight: "700", transition: "all 0.15s",
                      boxShadow: newMsg.trim() ? "0 4px 10px rgba(99,102,241,0.3)" : "none",
                    }}>
                      {sendingMsg ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={13} strokeWidth={2.5} />}
                      {isInternal ? "Guardar nota" : "Enviar"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Nuevo Ticket ────────────────────────────────────────────── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,13,40,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#fff", borderRadius: "20px", padding: "28px", width: "520px", maxWidth: "92vw", boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#1e1b4b" }}>Nuevo ticket</h2>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#9ca3af" }}>Completa los detalles del problema o solicitud</p>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: "#f5f3ff", border: "none", borderRadius: "9px", padding: "8px", cursor: "pointer", color: "#7c3aed", display: "flex" }}>
                <X size={17} />
              </button>
            </div>
            <form onSubmit={createTicket}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "5px" }}>
                    Título del problema *
                  </label>
                  <input
                    placeholder="Ej: Pantalla azul en equipo de contabilidad"
                    required value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #e5e7eb", fontSize: "13px", outline: "none", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "5px" }}>
                    Descripción
                  </label>
                  <textarea
                    placeholder="Describe el problema con el mayor detalle posible..."
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #e5e7eb", fontSize: "13px", minHeight: "80px", resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "700", color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "5px" }}>Tipo</label>
                    <select value={form.ticket_type} onChange={e => setForm({ ...form, ticket_type: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #e5e7eb", fontSize: "13px", background: "#fff", outline: "none", fontFamily: "inherit" }}>
                      <option value="incident">Incidente</option>
                      <option value="request">Requerimiento</option>
                      <option value="change">Cambio</option>
                      <option value="problem">Problema</option>
                      <option value="query">Consulta</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "700", color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "5px" }}>Prioridad</label>
                    <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #e5e7eb", fontSize: "13px", background: "#fff", outline: "none", fontFamily: "inherit" }}>
                      <option value="low">Baja</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                      <option value="Critical">Crítica</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "5px" }}>Categoría</label>
                  <input
                    placeholder="Ej: Hardware, Red, Software, Impresora..."
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #e5e7eb", fontSize: "13px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "22px" }}>
                <button type="submit" style={{
                  flex: 1, padding: "12px",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer",
                  fontSize: "14px", fontWeight: "700", boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
                }}>
                  Crear ticket
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={{
                  padding: "12px 22px", background: "#f5f3ff", color: "#7c3aed",
                  border: "1.5px solid #ddd6fe", borderRadius: "12px", cursor: "pointer", fontSize: "14px", fontWeight: "600",
                }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Asignar Técnico ─────────────────────────────────────────── */}
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

      {/* ── Modal: Fusionar Ticket ─────────────────────────────────────────── */}
      {mergeModal.open && mergeModal.source && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,13,40,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "20px", width: "480px", maxWidth: "92vw", boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#1e1b4b" }}>Fusionar ticket</h3>
              <button onClick={() => setMergeModal({ open: false, source: null, targetId: "", loading: false, error: "" })} style={{ border: "none", background: "none", color: "#9ca3af", cursor: "pointer", fontSize: "18px" }}>x</button>
            </div>
            <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#6b7280" }}>
              Ticket origen: <strong>{mergeModal.source.ticket_number}</strong> - {mergeModal.source.title}
            </p>
            <label style={{ fontSize: "12px", color: "#6b7280", fontWeight: "600" }}>Selecciona ticket destino</label>
            <select
              value={mergeModal.targetId}
              onChange={(e) => setMergeModal((prev) => ({ ...prev, targetId: e.target.value }))}
              style={{ width: "100%", marginTop: "6px", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }}
            >
              <option value="">Seleccionar...</option>
              {tickets
                .filter((t) => t.id !== mergeModal.source.id && !t.merged_into_id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.ticket_number} - {t.title}
                  </option>
                ))}
            </select>
            {mergeModal.error && <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#dc2626" }}>{mergeModal.error}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
              <button onClick={() => setMergeModal({ open: false, source: null, targetId: "", loading: false, error: "" })} style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#fff", color: "#6b7280", cursor: "pointer" }}>
                Cancelar
              </button>
              <button
                onClick={confirmMerge}
                disabled={!mergeModal.targetId || mergeModal.loading}
                style={{ padding: "8px 14px", border: "none", borderRadius: "8px", background: !mergeModal.targetId ? "#e5e7eb" : "#7c3aed", color: "#fff", cursor: !mergeModal.targetId ? "default" : "pointer", fontWeight: "700" }}
              >
                {mergeModal.loading ? "Fusionando..." : "Confirmar fusion"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
