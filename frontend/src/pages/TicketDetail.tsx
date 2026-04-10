import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, GitMerge, Lock, Paperclip, Send, Unlock, Smile, X } from "lucide-react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";

type Ticket = {
  id: string; ticket_number: string; title: string; description?: string;
  status: string; priority: string; ticket_type: string; category?: string;
  assignee_name?: string; merged_into_id?: string; merged_into_ticket_number?: string;
  merged_at?: string; created_at: string;
};
type Message = {
  id: string; author_id?: string; author_name?: string; body: string;
  message_type?: string; is_internal: boolean; is_alert?: boolean; created_at: string;
  reactions?: Record<string, string[]>;
};
type Technician = { id: string; full_name: string };
type Attachment = { id: string; message_id: string; filename: string; file_url: string; content_type: string };

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open:        { label: "Abierto",     color: "#3b82f6", bg: "#eff6ff" },
  in_progress: { label: "En progreso", color: "#f59e0b", bg: "#fffbeb" },
  pending:     { label: "Pendiente",   color: "#8b5cf6", bg: "#f5f3ff" },
  resolved:    { label: "Resuelto",    color: "#10b981", bg: "#f0fdf4" },
  closed:      { label: "Cerrado",     color: "#6b7280", bg: "#f9fafb" },
};
const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Baja", color: "#10b981" }, medium: { label: "Media", color: "#f59e0b" },
  high: { label: "Alta", color: "#ef4444" }, Critical: { label: "Critica", color: "#7c3aed" },
};
const NEXT_STATUS: Record<string, string[]> = {
  open: ["in_progress", "closed"], in_progress: ["pending", "resolved", "closed"],
  pending: ["in_progress", "closed"], resolved: ["closed", "open"], closed: ["open"],
};
const TYPE_LABELS: Record<string, string> = {
  incident: "Incidente", request: "Requerimiento", change: "Cambio", problem: "Problema", query: "Consulta",
};

// Reacciones rapidas
const QUICK_REACTIONS = ["👍", "✅", "🔥", "⚠️", "🙏", "❤️", "😄", "👀"];

// Stickers de soporte profesional
const SUPPORT_STICKERS = [
  { id: "resolved",   emoji: "✅", label: "Resuelto",      color: "#10b981", bg: "#f0fdf4" },
  { id: "urgent",     emoji: "🚨", label: "Urgente",       color: "#ef4444", bg: "#fef2f2" },
  { id: "reviewing",  emoji: "🔍", label: "En revision",   color: "#3b82f6", bg: "#eff6ff" },
  { id: "waiting",    emoji: "⏳", label: "Esperando",     color: "#f59e0b", bg: "#fffbeb" },
  { id: "thanks",     emoji: "🙏", label: "Gracias",       color: "#8b5cf6", bg: "#f5f3ff" },
  { id: "approved",   emoji: "🎯", label: "Aprobado",      color: "#059669", bg: "#ecfdf5" },
  { id: "escalated",  emoji: "📈", label: "Escalado",      color: "#dc2626", bg: "#fff1f2" },
  { id: "scheduled",  emoji: "📅", label: "Programado",    color: "#0284c7", bg: "#f0f9ff" },
  { id: "testing",    emoji: "🧪", label: "En pruebas",    color: "#7c3aed", bg: "#faf5ff" },
  { id: "deployed",   emoji: "🚀", label: "Desplegado",    color: "#16a34a", bg: "#f0fdf4" },
  { id: "blocked",    emoji: "🚫", label: "Bloqueado",     color: "#b91c1c", bg: "#fef2f2" },
  { id: "info",       emoji: "ℹ️",  label: "Info",          color: "#0369a1", bg: "#f0f9ff" },
];

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [ticket, setTicket]           = useState<Ticket | null>(null);
  const [messages, setMessages]       = useState<Message[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [newMsg, setNewMsg]           = useState("");
  const [isInternal, setIsInternal]   = useState(false);
  const [sending, setSending]         = useState(false);
  const [showAssign, setShowAssign]   = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Reacciones y stickers
  const [reactions, setReactions]     = useState<Record<string, Record<string, string[]>>>({});
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [showStickers, setShowStickers]   = useState(false);
  const [hoverMsg, setHoverMsg]       = useState<string | null>(null);

  const attachmentsByMessage = useMemo(() => {
    return attachments.reduce<Record<string, Attachment[]>>((acc, item) => {
      if (!acc[item.message_id]) acc[item.message_id] = [];
      acc[item.message_id].push(item);
      return acc;
    }, {});
  }, [attachments]);

  useEffect(() => { if (id) void loadData(id); }, [id]);

  // Scroll al fondo cuando llegan mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    } catch { navigate("/tickets"); }
    finally { setLoading(false); }
  };

  const refreshMessages = async (ticketId: string) => {
    const [m, att] = await Promise.all([
      api.get(`/api/v1/tickets/${ticketId}/messages`),
      api.get(`/api/v1/tickets/${ticketId}/attachments`).catch(() => ({ data: [] as Attachment[] })),
    ]);
    setMessages(m.data);
    setAttachments(att.data);
  };

  const sendMessage = async (overrideBody?: string) => {
    if (!id || sending || (!newMsg.trim() && selectedFiles.length === 0 && !overrideBody)) return;
    setSending(true);
    try {
      const body = overrideBody || newMsg.trim() || "Adjunto";
      const created = await api.post(`/api/v1/tickets/${id}/messages`, { body, is_internal: isInternal });
      const messageId = created?.data?.id as string | undefined;
      if (messageId && selectedFiles.length > 0) {
        await Promise.all(selectedFiles.map(async (file) => {
          const form = new FormData();
          form.append("file", file);
          await api.post(`/api/v1/tickets/${id}/messages/${messageId}/attachments`, form, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }));
      }
      setNewMsg(""); setSelectedFiles([]);
      await refreshMessages(id);
    } finally { setSending(false); }
  };

  const sendSticker = async (sticker: typeof SUPPORT_STICKERS[0]) => {
    setShowStickers(false);
    const body = `${sticker.emoji} ${sticker.label}`;
    await sendMessage(body);
  };

  const toggleReaction = (msgId: string, emoji: string) => {
    setReactions(prev => {
      const msgReactions = { ...(prev[msgId] || {}) };
      const users = msgReactions[emoji] || [];
      const userId = user?.id || "me";
      if (users.includes(userId)) {
        msgReactions[emoji] = users.filter(u => u !== userId);
        if (msgReactions[emoji].length === 0) delete msgReactions[emoji];
      } else {
        msgReactions[emoji] = [...users, userId];
      }
      return { ...prev, [msgId]: msgReactions };
    });
    setShowReactions(null);
  };

  const changeStatus = async (status: string) => {
    if (!id) return;
    await api.patch(`/api/v1/tickets/${id}/status`, { status });
    setTicket(prev => prev ? { ...prev, status } : prev);
  };

  const assign = async (techId: string, techName: string) => {
    if (!id) return;
    await api.patch(`/api/v1/tickets/${id}/assign`, { assigned_to: techId });
    setTicket(prev => prev ? { ...prev, assignee_name: techName } : prev);
    setShowAssign(false);
  };

  if (loading) return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
      Cargando...
    </div>
  );
  if (!ticket) return null;

  const sc = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const pc = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
  const isMerged = Boolean(ticket.merged_into_id);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f8fafc" }}>
      {/* HEADER */}
      <div style={{ background: "#fff", borderBottom: "1px solid #f1f5f9", padding: "12px 20px", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        <button onClick={() => navigate("/tickets")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", gap: "5px", fontSize: "13px", padding: "5px 8px", borderRadius: "6px" }}>
          <ArrowLeft size={15} /> Tickets
        </button>
        <span style={{ color: "#e2e8f0" }}>|</span>
        <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>{ticket.ticket_number}</span>
        <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "99px", fontWeight: "600", background: sc.bg, color: sc.color }}>{sc.label}</span>
        <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "99px", fontWeight: "600", background: `${pc.color}18`, color: pc.color }}>{pc.label}</span>
        <h1 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#0f172a", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ticket.title}</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", flex: 1, overflow: "hidden" }}>
        {/* CHAT */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid #f1f5f9" }}>
          {/* Cambiar estado */}
          {NEXT_STATUS[ticket.status]?.length > 0 && !isMerged && (
            <div style={{ padding: "8px 16px", borderBottom: "1px solid #f8fafc", background: "#fff", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
              <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>Cambiar:</span>
              {NEXT_STATUS[ticket.status].map(s => (
                <button key={s} onClick={() => changeStatus(s)}
                  style={{ padding: "3px 10px", borderRadius: "99px", border: "1.5px solid", fontSize: "11px", fontWeight: "600", cursor: "pointer", background: STATUS_CONFIG[s]?.bg, borderColor: STATUS_CONFIG[s]?.color, color: STATUS_CONFIG[s]?.color }}>
                  {STATUS_CONFIG[s]?.label}
                </button>
              ))}
            </div>
          )}

          {/* Fusionado */}
          {isMerged && (
            <div style={{ margin: "12px 16px 0", padding: "10px 12px", borderRadius: "10px", border: "1px solid #ddd6fe", background: "#f5f3ff", color: "#5b21b6", fontSize: "12px" }}>
              Ticket fusionado en {ticket.merged_into_ticket_number || "otro ticket"}.
              <button onClick={() => navigate(`/ticket/${ticket.merged_into_id}`)}
                style={{ marginLeft: "8px", background: "#ede9fe", border: "1px solid #c4b5fd", color: "#5b21b6", borderRadius: "6px", padding: "4px 8px", fontSize: "11px", cursor: "pointer", fontWeight: "600" }}>
                Ir a {ticket.merged_into_ticket_number}
              </button>
            </div>
          )}

          {/* Mensajes */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "4px" }}
            onClick={() => { setShowReactions(null); setShowStickers(false); }}>

            {ticket.description && (
              <div style={{ background: "#f1f5f9", borderRadius: "10px", padding: "12px 14px", fontSize: "12px", color: "#475569", marginBottom: "8px" }}>
                <p style={{ margin: "0 0 3px", fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>Descripcion</p>
                <p style={{ margin: 0 }}>{ticket.description}</p>
              </div>
            )}

            {messages.map((m) => {
              const mine = m.author_id === user?.id;
              const displayAuthor = mine ? "Tu" : (m.author_name || "Usuario");
              const messageAttachments = attachmentsByMessage[m.id] || [];
              const timeStr = new Date(m.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
              const msgReactions = reactions[m.id] || {};
              const isHovered = hoverMsg === m.id;

              // Sticker mensaje
              const isSticker = SUPPORT_STICKERS.some(s => m.body === `${s.emoji} ${s.label}`);
              const stickerData = isSticker ? SUPPORT_STICKERS.find(s => m.body === `${s.emoji} ${s.label}`) : null;

              if (m.message_type === "merge") return (
                <div key={m.id} style={{ display: "flex", justifyContent: "center", margin: "10px 0" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", background: "#ede9fe", border: "1px solid #c4b5fd", color: "#6d28d9", padding: "5px 10px", borderRadius: "99px", fontWeight: "600" }}>
                    <GitMerge size={12} /> {m.body}
                  </span>
                </div>
              );

              if (m.message_type === "alert" || m.is_alert) return (
                <div key={m.id} style={{ display: "flex", justifyContent: "center", margin: "6px 0" }}>
                  <span style={{ fontSize: "11px", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "4px 12px", borderRadius: "99px", fontWeight: "600" }}>
                    🔴 {timeStr} — {m.body}
                  </span>
                </div>
              );

              if (m.is_internal) return (
                <div key={m.id} style={{ display: "flex", justifyContent: "center", margin: "6px 0" }}>
                  <span style={{ fontSize: "10px", background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", padding: "3px 10px", borderRadius: "99px" }}>
                    🔒 Nota interna · {timeStr}
                  </span>
                </div>
              );

              // STICKER
              if (stickerData) return (
                <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: "12px", position: "relative" }}
                  onMouseEnter={() => setHoverMsg(m.id)} onMouseLeave={() => setHoverMsg(null)}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
                    <span style={{ fontSize: "10px", color: "#64748b", marginBottom: "4px", padding: "0 4px" }}>{timeStr} — {displayAuthor}</span>
                    <div style={{ padding: "10px 16px", borderRadius: "12px", border: `2px solid ${stickerData.color}33`, background: stickerData.bg, display: "inline-flex", alignItems: "center", gap: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                      <span style={{ fontSize: "22px" }}>{stickerData.emoji}</span>
                      <span style={{ fontSize: "13px", fontWeight: "700", color: stickerData.color }}>{stickerData.label}</span>
                    </div>
                    {/* Reacciones del sticker */}
                    {Object.keys(msgReactions).length > 0 && (
                      <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
                        {Object.entries(msgReactions).map(([emoji, users]) => users.length > 0 && (
                          <button key={emoji} onClick={(e) => { e.stopPropagation(); toggleReaction(m.id, emoji); }}
                            style={{ background: users.includes(user?.id || "") ? "#ede9fe" : "#f1f5f9", border: `1px solid ${users.includes(user?.id || "") ? "#c4b5fd" : "#e2e8f0"}`, borderRadius: "99px", padding: "2px 7px", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}>
                            {emoji} <span style={{ fontSize: "10px", color: "#64748b" }}>{users.length}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Botón reacción en hover */}
                  {isHovered && !isMerged && (
                    <button onClick={(e) => { e.stopPropagation(); setShowReactions(showReactions === m.id ? null : m.id); }}
                      style={{ position: "absolute", top: "24px", [mine ? "left" : "right"]: "-32px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "50%", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.08)", zIndex: 10 }}>
                      <Smile size={13} color="#94a3b8" />
                    </button>
                  )}
                  {showReactions === m.id && (
                    <div onClick={e => e.stopPropagation()}
                      style={{ position: "absolute", top: "20px", [mine ? "left" : "right"]: "-8px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "8px 10px", display: "flex", gap: "4px", zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
                      {QUICK_REACTIONS.map(emoji => (
                        <button key={emoji} onClick={() => toggleReaction(m.id, emoji)}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", padding: "2px 3px", borderRadius: "6px", transition: "transform 0.1s" }}
                          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.3)")}
                          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );

              // MENSAJE NORMAL
              return (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", marginBottom: "8px", position: "relative" }}
                  onMouseEnter={() => setHoverMsg(m.id)} onMouseLeave={() => setHoverMsg(null)}>
                  <span style={{ fontSize: "10px", color: "#64748b", marginBottom: "3px", padding: "0 4px" }}>{timeStr} — {displayAuthor}</span>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", flexDirection: mine ? "row-reverse" : "row" }}>
                    {!mine && (
                      <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#e0e7ff", color: "#4338ca", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "11px", flexShrink: 0 }}>
                        {displayAuthor.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ maxWidth: "72%" }}>
                      <div style={{ padding: "10px 14px", borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px", fontSize: "13px", lineHeight: "1.5",
                        background: mine ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : "#fff",
                        color: mine ? "#fff" : "#334155",
                        border: mine ? "none" : "1px solid #f1f5f9",
                        boxShadow: mine ? "0 4px 12px rgba(79,70,229,0.2)" : "0 2px 6px rgba(0,0,0,0.04)" }}>
                        {m.body}
                        {messageAttachments.length > 0 && (
                          <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                            {messageAttachments.map(a => {
                              const isImage = a.content_type?.startsWith("image/") || a.filename.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i);
                              return isImage ? (
                                <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer"
                                  style={{ display: "block", borderRadius: "8px", overflow: "hidden", border: mine ? "1px solid rgba(255,255,255,0.2)" : "1px solid #e2e8f0", maxWidth: "220px" }}>
                                  <img src={a.file_url} alt={a.filename} style={{ display: "block", width: "100%", height: "auto" }} />
                                </a>
                              ) : (
                                <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer"
                                  style={{ fontSize: "11px", textDecoration: "none", color: mine ? "#fff" : "#4b5563", display: "flex", alignItems: "center", background: mine ? "rgba(255,255,255,0.15)" : "#f8fafc", border: mine ? "1px solid rgba(255,255,255,0.2)" : "1px solid #e2e8f0", padding: "5px 8px", borderRadius: "6px" }}>
                                  <Paperclip size={12} style={{ marginRight: "5px" }} /> {a.filename}
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Reacciones */}
                      {Object.keys(msgReactions).length > 0 && (
                        <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap", justifyContent: mine ? "flex-end" : "flex-start" }}>
                          {Object.entries(msgReactions).map(([emoji, users]) => users.length > 0 && (
                            <button key={emoji} onClick={(e) => { e.stopPropagation(); toggleReaction(m.id, emoji); }}
                              style={{ background: users.includes(user?.id || "") ? "#ede9fe" : "#f1f5f9", border: `1px solid ${users.includes(user?.id || "") ? "#c4b5fd" : "#e2e8f0"}`, borderRadius: "99px", padding: "2px 7px", fontSize: "11px", cursor: "pointer" }}>
                              {emoji} {users.length}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Botón emoji en hover */}
                    {isHovered && !isMerged && (
                      <button onClick={(e) => { e.stopPropagation(); setShowReactions(showReactions === m.id ? null : m.id); }}
                        style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "50%", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.08)", flexShrink: 0 }}>
                        <Smile size={13} color="#94a3b8" />
                      </button>
                    )}
                  </div>

                  {/* Panel de reacciones */}
                  {showReactions === m.id && (
                    <div onClick={e => e.stopPropagation()}
                      style={{ position: "absolute", bottom: "0", [mine ? "right" : "left"]: "0", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "8px 10px", display: "flex", gap: "4px", zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
                      {QUICK_REACTIONS.map(emoji => (
                        <button key={emoji} onClick={() => toggleReaction(m.id, emoji)}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", padding: "2px 3px", borderRadius: "6px" }}
                          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.3)")}
                          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8", fontSize: "13px" }}>Sin mensajes aun.</div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* CAJA DE RESPUESTA */}
          <div style={{ padding: "10px 14px", borderTop: "1px solid #f1f5f9", background: "#fff", flexShrink: 0, opacity: isMerged ? 0.65 : 1 }}>
            {/* Archivos seleccionados */}
            {selectedFiles.length > 0 && (
              <div style={{ marginBottom: "8px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {selectedFiles.map((f, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "3px 8px", background: "#e0e7ff", border: "1px solid #c7d2fe", borderRadius: "6px" }}>
                    <span style={{ fontSize: "11px", color: "#4338ca", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                    <button onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#818cf8", fontSize: "13px", display: "flex", alignItems: "center", padding: 0 }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Panel stickers */}
            {showStickers && (
              <div onClick={e => e.stopPropagation()}
                style={{ marginBottom: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "10px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                {SUPPORT_STICKERS.map(s => (
                  <button key={s.id} onClick={() => sendSticker(s)}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", padding: "8px 4px", background: s.bg, border: `1px solid ${s.color}33`, borderRadius: "10px", cursor: "pointer", transition: "transform 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
                    onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
                    <span style={{ fontSize: "20px" }}>{s.emoji}</span>
                    <span style={{ fontSize: "9px", color: s.color, fontWeight: "600", textAlign: "center", lineHeight: "1.2" }}>{s.label}</span>
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: "6px", alignItems: "flex-end", background: isInternal ? "#fffbeb" : "#f8fafc", borderRadius: "10px", border: `1.5px solid ${isInternal ? "#fde68a" : "#e2e8f0"}`, padding: "7px 10px" }}>
              <textarea value={newMsg} onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
                onPaste={e => {
                  if (e.clipboardData.files.length > 0) {
                    e.preventDefault();
                    const files = Array.from(e.clipboardData.files).map((f, i) =>
                      new File([f], `screenshot_${Date.now()}_${i}.${f.type.split("/")[1] || "png"}`, { type: f.type })
                    );
                    setSelectedFiles(prev => [...prev, ...files]);
                  }
                }}
                placeholder={isInternal ? "Nota interna (solo equipo)..." : "Escribe... Enter para enviar, Ctrl+V para pegar imagen"}
                disabled={isMerged}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", resize: "none", fontSize: "13px", color: "#374151", minHeight: "32px", maxHeight: "100px", fontFamily: "inherit", lineHeight: "1.4" }}
                rows={1}
              />
              <div style={{ display: "flex", gap: "3px", alignItems: "center", flexShrink: 0 }}>
                {/* Stickers */}
                <button onClick={(e) => { e.stopPropagation(); setShowStickers(!showStickers); setShowReactions(null); }}
                  disabled={isMerged}
                  title="Stickers de soporte"
                  style={{ background: "none", border: "none", cursor: "pointer", color: showStickers ? "#4f46e5" : "#94a3b8", padding: "3px", display: "flex", alignItems: "center" }}>
                  <Smile size={15} />
                </button>
                {/* Adjunto */}
                <label style={{ cursor: "pointer", color: selectedFiles.length > 0 ? "#4f46e5" : "#94a3b8", padding: "3px", display: "flex", alignItems: "center" }}>
                  <Paperclip size={15} />
                  <input ref={fileInputRef} type="file" multiple disabled={isMerged} style={{ display: "none" }}
                    onChange={e => { if (e.target.files) setSelectedFiles(prev => [...prev, ...Array.from(e.target.files || [])]); e.target.value = ""; }} />
                </label>
                {/* Nota interna */}
                <button disabled={isMerged} onClick={() => setIsInternal(!isInternal)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: isInternal ? "#f59e0b" : "#94a3b8", padding: "3px" }}>
                  {isInternal ? <Lock size={15} /> : <Unlock size={15} />}
                </button>
                {/* Enviar */}
                <button onClick={() => void sendMessage()}
                  disabled={isMerged || (newMsg.trim().length === 0 && selectedFiles.length === 0) || sending}
                  style={{ width: "30px", height: "30px", borderRadius: "7px", border: "none", cursor: newMsg.trim() || selectedFiles.length > 0 ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", background: newMsg.trim() || selectedFiles.length > 0 ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : "#e2e8f0", color: "#fff" }}>
                  <Send size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <div style={{ overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #f1f5f9", padding: "12px" }}>
            <p style={{ margin: "0 0 8px", fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Estado</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {Object.entries(STATUS_CONFIG).map(([key, s]) => (
                <button key={key} onClick={() => changeStatus(key)} disabled={isMerged}
                  style={{ fontSize: "10px", padding: "3px 9px", borderRadius: "99px", border: "1.5px solid", cursor: "pointer",
                    background: ticket.status === key ? s.bg : "transparent",
                    borderColor: ticket.status === key ? s.color : "#e2e8f0",
                    color: ticket.status === key ? s.color : "#94a3b8",
                    fontWeight: ticket.status === key ? "700" : "400" }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #f1f5f9", padding: "12px" }}>
            <p style={{ margin: "0 0 8px", fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Asignado a</p>
            {ticket.assignee_name ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", color: "#4338ca" }}>{ticket.assignee_name.charAt(0).toUpperCase()}</div>
                <div>
                  <p style={{ margin: 0, fontSize: "12px", fontWeight: "600", color: "#0f172a" }}>{ticket.assignee_name}</p>
                  <button disabled={isMerged} onClick={() => setShowAssign(!showAssign)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", color: "#4f46e5", padding: 0 }}>Cambiar</button>
                </div>
              </div>
            ) : (
              <button disabled={isMerged} onClick={() => setShowAssign(!showAssign)}
                style={{ width: "100%", padding: "7px", borderRadius: "7px", border: "1.5px dashed #c7d2fe", background: "#f5f3ff", color: "#4f46e5", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>
                + Asignar tecnico
              </button>
            )}
            {showAssign && !isMerged && (
              <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "3px", maxHeight: "140px", overflowY: "auto" }}>
                {technicians.map(t => (
                  <button key={t.id} onClick={() => void assign(t.id, t.full_name)}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", borderRadius: "7px", border: "1px solid #f1f5f9", background: "#fff", cursor: "pointer", textAlign: "left" }}>
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
                { label: "Tipo",      value: TYPE_LABELS[ticket.ticket_type] || ticket.ticket_type },
                { label: "Prioridad", value: pc.label, color: pc.color },
                { label: "Categoria", value: ticket.category || "-" },
                { label: "Mensajes",  value: String(messages.length) },
                { label: "Fusionado", value: ticket.merged_into_ticket_number || "-" },
                { label: "Creado",    value: new Date(ticket.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>{item.label}</span>
                  <span style={{ fontSize: "11px", fontWeight: "600", color: (item as any).color || "#475569" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stickers rapidos en sidebar */}
          <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #f1f5f9", padding: "12px" }}>
            <p style={{ margin: "0 0 8px", fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Stickers rapidos</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
              {SUPPORT_STICKERS.slice(0, 6).map(s => (
                <button key={s.id} onClick={() => sendSticker(s)} disabled={isMerged}
                  style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 7px", background: s.bg, border: `1px solid ${s.color}33`, borderRadius: "8px", cursor: "pointer", transition: "transform 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.03)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
                  <span style={{ fontSize: "14px" }}>{s.emoji}</span>
                  <span style={{ fontSize: "10px", color: s.color, fontWeight: "600" }}>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
