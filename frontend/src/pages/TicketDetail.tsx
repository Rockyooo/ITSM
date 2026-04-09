import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, GitMerge, Lock, Paperclip, Send, Unlock } from "lucide-react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";

type Ticket = {
  id: string;
  ticket_number: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  ticket_type: string;
  category?: string;
  assignee_name?: string;
  merged_into_id?: string;
  merged_into_ticket_number?: string;
  merged_at?: string;
  created_at: string;
};

type Message = {
  id: string;
  author_id?: string;
  body: string;
  message_type?: string;
  is_internal: boolean;
  created_at: string;
};

type Technician = { id: string; full_name: string };
type Attachment = {
  id: string;
  message_id: string;
  filename: string;
  file_url: string;
  content_type: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: "Abierto", color: "#3b82f6", bg: "#eff6ff" },
  in_progress: { label: "En progreso", color: "#f59e0b", bg: "#fffbeb" },
  pending: { label: "Pendiente", color: "#8b5cf6", bg: "#f5f3ff" },
  resolved: { label: "Resuelto", color: "#10b981", bg: "#f0fdf4" },
  closed: { label: "Cerrado", color: "#6b7280", bg: "#f9fafb" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Baja", color: "#10b981" },
  medium: { label: "Media", color: "#f59e0b" },
  high: { label: "Alta", color: "#ef4444" },
  Critical: { label: "Critica", color: "#7c3aed" },
};

const NEXT_STATUS: Record<string, string[]> = {
  open: ["in_progress", "closed"],
  in_progress: ["pending", "resolved", "closed"],
  pending: ["in_progress", "closed"],
  resolved: ["closed", "open"],
  closed: ["open"],
};

const TYPE_LABELS: Record<string, string> = {
  incident: "Incidente",
  request: "Requerimiento",
  change: "Cambio",
  problem: "Problema",
  query: "Consulta",
};

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMsg, setNewMsg] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const attachmentsByMessage = useMemo(() => {
    return attachments.reduce<Record<string, Attachment[]>>((acc, item) => {
      if (!acc[item.message_id]) acc[item.message_id] = [];
      acc[item.message_id].push(item);
      return acc;
    }, {});
  }, [attachments]);

  useEffect(() => {
    if (id) void loadData(id);
  }, [id]);

  const loadData = async (ticketId: string) => {
    setLoading(true);
    try {
      const [t, m, tech, att] = await Promise.all([
        api.get(`/api/v1/tickets/${ticketId}`),
        api.get(`/api/v1/tickets/${ticketId}/messages`),
        api.get("/api/v1/users/technicians").catch(() => ({ data: [] as Technician[] })),
        api.get(`/api/v1/tickets/${ticketId}/attachments`).catch(() => ({ data: [] as Attachment[] })),
      ]);
      setTicket(t.data);
      setMessages(m.data);
      setTechnicians(tech.data);
      setAttachments(att.data);
    } catch {
      navigate("/tickets");
    } finally {
      setLoading(false);
    }
  };

  const refreshMessages = async (ticketId: string) => {
    const [m, att] = await Promise.all([
      api.get(`/api/v1/tickets/${ticketId}/messages`),
      api.get(`/api/v1/tickets/${ticketId}/attachments`).catch(() => ({ data: [] as Attachment[] })),
    ]);
    setMessages(m.data);
    setAttachments(att.data);
  };

  const sendMessage = async () => {
    if (!id || sending || (!newMsg.trim() && selectedFiles.length === 0)) return;
    setSending(true);
    try {
      const messageBody = newMsg.trim() || "Adjunto";
      const created = await api.post(`/api/v1/tickets/${id}/messages`, {
        body: messageBody,
        is_internal: isInternal,
      });
      const messageId = created?.data?.id as string | undefined;

      if (messageId && selectedFiles.length > 0) {
        await Promise.all(
          selectedFiles.map(async (file) => {
            const form = new FormData();
            form.append("file", file);
            await api.post(`/api/v1/tickets/${id}/messages/${messageId}/attachments`, form, {
              headers: { "Content-Type": "multipart/form-data" },
            });
          }),
        );
      }

      setNewMsg("");
      setSelectedFiles([]);
      await refreshMessages(id);
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (status: string) => {
    if (!id) return;
    await api.patch(`/api/v1/tickets/${id}/status`, { status });
    setTicket((prev) => (prev ? { ...prev, status } : prev));
  };

  const assign = async (techId: string, techName: string) => {
    if (!id) return;
    await api.patch(`/api/v1/tickets/${id}/assign`, { assigned_to: techId });
    setTicket((prev) => (prev ? { ...prev, assignee_name: techName } : prev));
    setShowAssign(false);
  };

  if (loading) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
        }}
      >
        Cargando...
      </div>
    );
  }

  if (!ticket) return null;

  const sc = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const pc = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
  const isMergedOrigin = Boolean(ticket.merged_into_id);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f8fafc" }}>
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #f1f5f9",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => navigate("/tickets")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "13px",
            padding: "5px 8px",
            borderRadius: "6px",
          }}
        >
          <ArrowLeft size={15} /> Tickets
        </button>
        <span style={{ color: "#e2e8f0" }}>|</span>
        <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>{ticket.ticket_number}</span>
        <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "99px", fontWeight: "600", background: sc.bg, color: sc.color }}>{sc.label}</span>
        <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "99px", fontWeight: "600", background: `${pc.color}18`, color: pc.color }}>{pc.label}</span>
        <h1
          style={{
            margin: 0,
            fontSize: "14px",
            fontWeight: "700",
            color: "#0f172a",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {ticket.title}
        </h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", flex: 1, overflow: "hidden" }}>
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid #f1f5f9" }}>
          {NEXT_STATUS[ticket.status]?.length > 0 && !isMergedOrigin && (
            <div style={{ padding: "8px 16px", borderBottom: "1px solid #f8fafc", background: "#fff", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
              <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>Cambiar:</span>
              {NEXT_STATUS[ticket.status].map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  style={{ padding: "3px 10px", borderRadius: "99px", border: "1.5px solid", fontSize: "11px", fontWeight: "600", cursor: "pointer", background: STATUS_CONFIG[s]?.bg, borderColor: STATUS_CONFIG[s]?.color, color: STATUS_CONFIG[s]?.color }}
                >
                  {STATUS_CONFIG[s]?.label}
                </button>
              ))}
            </div>
          )}

          {isMergedOrigin && (
            <div style={{ margin: "12px 16px 0", padding: "10px 12px", borderRadius: "10px", border: "1px solid #ddd6fe", background: "#f5f3ff", color: "#5b21b6", fontSize: "12px" }}>
              Este ticket fue fusionado en {ticket.merged_into_ticket_number || "otro ticket"} y quedo en modo solo lectura.
              <button
                onClick={() => navigate(`/ticket/${ticket.merged_into_id}`)}
                style={{ marginLeft: "8px", background: "#ede9fe", border: "1px solid #c4b5fd", color: "#5b21b6", borderRadius: "6px", padding: "4px 8px", fontSize: "11px", cursor: "pointer", fontWeight: "600" }}
              >
                Ir a {ticket.merged_into_ticket_number || "ticket destino"}
              </button>
            </div>
          )}

          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {ticket.description && (
              <div style={{ background: "#f1f5f9", borderRadius: "10px", padding: "12px 14px", fontSize: "12px", color: "#475569" }}>
                <p style={{ margin: "0 0 3px", fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>Descripcion</p>
                <p style={{ margin: 0 }}>{ticket.description}</p>
              </div>
            )}

            {messages.map((m) => {
              const mine = m.author_id === user?.id;
              const messageAttachments = attachmentsByMessage[m.id] || [];
              if (m.message_type === "merge") {
                return (
                  <div key={m.id} style={{ display: "flex", justifyContent: "center" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", background: "#ede9fe", border: "1px solid #c4b5fd", color: "#6d28d9", padding: "5px 10px", borderRadius: "99px", fontWeight: "600" }}>
                      <GitMerge size={12} /> Evento de fusion - {m.body}
                    </span>
                  </div>
                );
              }

              if (m.is_internal) {
                return (
                  <div key={m.id} style={{ display: "flex", justifyContent: "center" }}>
                    <span style={{ fontSize: "10px", background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", padding: "3px 10px", borderRadius: "99px" }}>
                      Nota interna {new Date(m.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                );
              }

              return (
                <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", gap: "6px", alignItems: "flex-end" }}>
                  <div style={{ maxWidth: "70%" }}>
                    <div
                      style={{
                        padding: "9px 13px",
                        borderRadius: mine ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                        fontSize: "13px",
                        lineHeight: "1.5",
                        background: mine ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : "#fff",
                        color: mine ? "#fff" : "#374151",
                        border: mine ? "none" : "1px solid #f1f5f9",
                        boxShadow: mine ? "0 2px 8px rgba(79,70,229,0.25)" : "0 1px 2px rgba(0,0,0,0.05)",
                      }}
                    >
                      {m.body}
                      {messageAttachments.length > 0 && (
                        <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                          {messageAttachments.map((a) => (
                            <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer" style={{ fontSize: "11px", textDecoration: "none", color: mine ? "#dbeafe" : "#4f46e5" }}>
                              <Paperclip size={11} style={{ verticalAlign: "text-bottom", marginRight: "4px" }} />
                              {a.filename}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <p style={{ margin: "2px 4px 0", fontSize: "10px", color: "#94a3b8", textAlign: mine ? "right" : "left" }}>
                      {new Date(m.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}

            {messages.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8", fontSize: "13px" }}>Sin mensajes aun.</div>}
          </div>

          <div style={{ padding: "10px 14px", borderTop: "1px solid #f1f5f9", background: "#fff", flexShrink: 0, opacity: isMergedOrigin ? 0.65 : 1 }}>
            <div style={{ display: "flex", gap: "6px", alignItems: "flex-end", background: "#f8fafc", borderRadius: "10px", border: "1.5px solid #e2e8f0", padding: "7px 10px" }}>
              <textarea
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder={isInternal ? "Nota interna..." : "Escribe... (Enter envia)"}
                disabled={isMergedOrigin}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", resize: "none", fontSize: "13px", color: "#374151", minHeight: "32px", maxHeight: "100px", fontFamily: "inherit", lineHeight: "1.4" }}
                rows={1}
              />
              <div style={{ display: "flex", gap: "4px", alignItems: "center", flexShrink: 0 }}>
                <label style={{ cursor: "pointer", color: selectedFiles.length > 0 ? "#4f46e5" : "#94a3b8", padding: "3px", display: "flex", alignItems: "center" }}>
                  <Paperclip size={15} />
                  <input
                    type="file"
                    multiple
                    disabled={isMergedOrigin}
                    style={{ display: "none" }}
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                  />
                </label>
                <button disabled={isMergedOrigin} onClick={() => setIsInternal(!isInternal)} style={{ background: "none", border: "none", cursor: "pointer", color: isInternal ? "#f59e0b" : "#94a3b8", padding: "3px" }}>
                  {isInternal ? <Lock size={15} /> : <Unlock size={15} />}
                </button>
                <button
                  onClick={() => void sendMessage()}
                  disabled={isMergedOrigin || (newMsg.trim().length === 0 && selectedFiles.length === 0) || sending}
                  style={{ width: "30px", height: "30px", borderRadius: "7px", border: "none", cursor: newMsg.trim() || selectedFiles.length > 0 ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", background: newMsg.trim() || selectedFiles.length > 0 ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : "#e2e8f0", color: "#fff" }}
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
            {selectedFiles.length > 0 && (
              <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#64748b" }}>
                {selectedFiles.length} archivo(s) seleccionado(s)
              </p>
            )}
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #f1f5f9", padding: "12px" }}>
            <p style={{ margin: "0 0 8px", fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Asignado a</p>
            {ticket.assignee_name ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", color: "#4338ca" }}>{ticket.assignee_name.charAt(0).toUpperCase()}</div>
                <div>
                  <p style={{ margin: 0, fontSize: "12px", fontWeight: "600", color: "#0f172a" }}>{ticket.assignee_name}</p>
                  <button disabled={isMergedOrigin} onClick={() => setShowAssign(!showAssign)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", color: "#4f46e5", padding: 0 }}>Cambiar</button>
                </div>
              </div>
            ) : (
              <button
                disabled={isMergedOrigin}
                onClick={() => setShowAssign(!showAssign)}
                style={{ width: "100%", padding: "7px", borderRadius: "7px", border: "1.5px dashed #c7d2fe", background: "#f5f3ff", color: "#4f46e5", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}
              >
                + Asignar tecnico
              </button>
            )}
            {showAssign && !isMergedOrigin && (
              <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "3px", maxHeight: "140px", overflowY: "auto" }}>
                {technicians.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => void assign(t.id, t.full_name)}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", borderRadius: "7px", border: "1px solid #f1f5f9", background: "#fff", cursor: "pointer", textAlign: "left" }}
                  >
                    <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: "700", color: "#4338ca" }}>{t.full_name.charAt(0).toUpperCase()}</div>
                    <span style={{ fontSize: "12px", color: "#374151" }}>{t.full_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #f1f5f9", padding: "12px" }}>
            <p style={{ margin: "0 0 8px", fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Detalle</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {[
                { label: "Tipo", value: TYPE_LABELS[ticket.ticket_type] || ticket.ticket_type },
                { label: "Prioridad", value: pc.label, color: pc.color },
                { label: "Categoria", value: ticket.category || "-" },
                { label: "Mensajes", value: String(messages.length) },
                { label: "Fusionado en", value: ticket.merged_into_ticket_number || "-" },
                { label: "Creado", value: new Date(ticket.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>{item.label}</span>
                  <span style={{ fontSize: "11px", fontWeight: "600", color: item.color || "#475569" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
