// ═══════════════════════════════════════════════════════════════
// frontend/src/pages/TicketsPage.tsx
//
// Lista de tickets con filtros, paginación, modal de creación
// y actualización en tiempo real via WebSocket.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useTickets,
  useCreateTicket,
  useUpdateTicketStatus,
  useAnalyzeWithAI,
  ticketKeys,
  Ticket,
  TicketFilters,
  TicketType,
  TicketPriority,
  TicketStatus,
} from "@/hooks";
import { useAuth } from "@/store/authStore";

// ── Configuración de colores por tipo/estado/prioridad ───────────
const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  open:             { label: "Abierto",     color: "#60a5fa", bg: "rgba(96,165,250,0.1)" },
  in_progress:      { label: "En proceso",  color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
  pending_customer: { label: "En espera",   color: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
  resolved:         { label: "Resuelto",    color: "#34d399", bg: "rgba(52,211,153,0.1)" },
  closed:           { label: "Cerrado",     color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  low:      { label: "Baja",     color: "#6b7280" },
  medium:   { label: "Media",    color: "#fbbf24" },
  high:     { label: "Alta",     color: "#f97316" },
  critical: { label: "Crítica",  color: "#ef4444" },
};

const TYPE_LABELS: Record<TicketType, string> = {
  incident:   "Incidente",
  request:    "Requerimiento",
  change:     "Cambio",
  problem:    "Problema",
  query:      "Consulta",
  recurrence: "Reincidencia",
};

// ── Componente principal ─────────────────────────────────────────
export default function TicketsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Filtros
  const [filters, setFilters] = useState<TicketFilters>({
    page: 1, page_size: 20,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Queries y mutaciones
  const { data, isLoading, isError } = useTickets(filters);
  const createTicket = useCreateTicket();
  const updateStatus = useUpdateTicketStatus();

  // WebSocket para actualizaciones en tiempo real
  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    const wsUrl = `${import.meta.env.VITE_WS_URL ?? "ws://localhost:8000"}/ws/tickets`;
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const ws = new WebSocket(`${wsUrl}?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "ticket_updated" || msg.type === "ticket_created") {
          // Invalidar solo la lista activa — sin recargar toda la página
          queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
        }
      } catch { /* ignorar mensajes malformados */ }
    };

    ws.onerror = () => {}; // Silencioso — el sistema funciona igual sin WS
    return () => ws.close();
  }, [queryClient]);

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ color: "#e2e8f0", fontSize: "22px", fontWeight: "700", margin: 0 }}>
            Tickets
          </h1>
          <p style={{ color: "#64748b", fontSize: "14px", margin: "4px 0 0" }}>
            {data?.total ?? "—"} tickets en total
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            background: "linear-gradient(135deg, #1b2a5e, #2563eb)",
            color: "white", border: "none", borderRadius: "10px",
            padding: "10px 20px", fontSize: "14px", fontWeight: "600",
            cursor: "pointer",
          }}
        >
          + Nuevo ticket
        </button>
      </div>

      {/* Filtros */}
      <div style={{
        display: "flex", gap: "12px", marginBottom: "20px",
        background: "rgba(255,255,255,0.02)", borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.06)", padding: "12px",
      }}>
        <input
          placeholder="Buscar tickets..."
          value={filters.search ?? ""}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
          style={{
            flex: 1, background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px", padding: "8px 12px",
            color: "#e2e8f0", fontSize: "14px", outline: "none",
          }}
        />
        <FilterSelect
          value={filters.status ?? ""}
          onChange={v => setFilters(f => ({ ...f, status: v as TicketStatus || undefined, page: 1 }))}
          options={[
            { value: "", label: "Todos los estados" },
            ...Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label })),
          ]}
        />
        <FilterSelect
          value={filters.type ?? ""}
          onChange={v => setFilters(f => ({ ...f, type: v as TicketType || undefined, page: 1 }))}
          options={[
            { value: "", label: "Todos los tipos" },
            ...Object.entries(TYPE_LABELS).map(([v, l]) => ({ value: v, label: l })),
          ]}
        />
        <FilterSelect
          value={filters.priority ?? ""}
          onChange={v => setFilters(f => ({ ...f, priority: v as TicketPriority || undefined, page: 1 }))}
          options={[
            { value: "", label: "Todas las prioridades" },
            ...Object.entries(PRIORITY_CONFIG).map(([v, c]) => ({ value: v, label: c.label })),
          ]}
        />
      </div>

      {/* Tabla */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => queryClient.invalidateQueries({ queryKey: ticketKeys.lists() })} />
      ) : (
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "16px", overflow: "hidden",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["ID", "Título", "Tipo", "Prioridad", "Estado", "Técnico", "SLA", "Creado"].map(h => (
                  <th key={h} style={{
                    padding: "12px 16px", textAlign: "left",
                    color: "#64748b", fontSize: "11px", fontWeight: "600",
                    textTransform: "uppercase", letterSpacing: "0.5px",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.items.map((ticket) => (
                <TicketRow
                  key={ticket.id}
                  ticket={ticket}
                  onClick={() => setSelectedTicket(ticket)}
                />
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: "48px", textAlign: "center", color: "#64748b" }}>
                    No hay tickets con los filtros actuales
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Paginación */}
          {data && data.pages > 1 && (
            <div style={{
              display: "flex", justifyContent: "center", gap: "8px",
              padding: "16px", borderTop: "1px solid rgba(255,255,255,0.06)",
            }}>
              {Array.from({ length: data.pages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setFilters(f => ({ ...f, page: p }))}
                  style={{
                    width: "32px", height: "32px", borderRadius: "8px",
                    border: p === filters.page
                      ? "1px solid #2563eb"
                      : "1px solid rgba(255,255,255,0.1)",
                    background: p === filters.page ? "rgba(37,99,235,0.2)" : "transparent",
                    color: p === filters.page ? "#60a5fa" : "#64748b",
                    cursor: "pointer", fontSize: "13px",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal crear ticket */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => setShowCreateModal(false)}
        />
      )}

      {/* Panel lateral detalle */}
      {selectedTicket && (
        <TicketDetailPanel
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onStatusChange={(status) => {
            updateStatus.mutate({ id: selectedTicket.id, status });
            setSelectedTicket(null);
          }}
        />
      )}
    </div>
  );
}

// ── Fila de ticket ───────────────────────────────────────────────
function TicketRow({ ticket, onClick }: { ticket: Ticket; onClick: () => void }) {
  const status = STATUS_CONFIG[ticket.status];
  const priority = PRIORITY_CONFIG[ticket.priority];

  return (
    <tr
      onClick={onClick}
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        cursor: "pointer", transition: "background 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      <td style={{ padding: "12px 16px" }}>
        <span style={{ color: "#2563eb", fontSize: "12px", fontWeight: "600", fontFamily: "monospace" }}>
          {ticket.display_id}
        </span>
      </td>
      <td style={{ padding: "12px 16px", maxWidth: "260px" }}>
        <p style={{ color: "#e2e8f0", fontSize: "14px", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {ticket.title}
        </p>
        {ticket.requester_name && (
          <p style={{ color: "#64748b", fontSize: "12px", margin: "2px 0 0" }}>{ticket.requester_name}</p>
        )}
      </td>
      <td style={{ padding: "12px 16px" }}>
        <span style={{ color: "#94a3b8", fontSize: "12px" }}>{TYPE_LABELS[ticket.type]}</span>
      </td>
      <td style={{ padding: "12px 16px" }}>
        <span style={{ color: priority.color, fontSize: "12px", fontWeight: "600" }}>
          {priority.label}
        </span>
      </td>
      <td style={{ padding: "12px 16px" }}>
        <span style={{
          background: status.bg, color: status.color,
          padding: "3px 10px", borderRadius: "20px",
          fontSize: "12px", fontWeight: "500",
        }}>
          {status.label}
        </span>
      </td>
      <td style={{ padding: "12px 16px" }}>
        <span style={{ color: "#94a3b8", fontSize: "13px" }}>
          {ticket.assigned_to_name ?? "—"}
        </span>
      </td>
      <td style={{ padding: "12px 16px", minWidth: "100px" }}>
        {ticket.sla_pct !== undefined ? (
          <div>
            <div style={{
              height: "4px", borderRadius: "2px",
              background: "rgba(255,255,255,0.1)", overflow: "hidden",
            }}>
              <div style={{
                height: "100%", borderRadius: "2px",
                width: `${Math.min(ticket.sla_pct, 100)}%`,
                background: ticket.sla_pct >= 90 ? "#ef4444"
                  : ticket.sla_pct >= 70 ? "#fbbf24" : "#34d399",
                transition: "width 0.3s",
              }} />
            </div>
            <span style={{ color: "#64748b", fontSize: "11px" }}>{Math.round(ticket.sla_pct)}%</span>
          </div>
        ) : <span style={{ color: "#374151" }}>—</span>}
      </td>
      <td style={{ padding: "12px 16px" }}>
        <span style={{ color: "#64748b", fontSize: "12px" }}>
          {new Date(ticket.created_at).toLocaleDateString("es-CO")}
        </span>
      </td>
    </tr>
  );
}

// ── Modal creación de ticket con IA ──────────────────────────────
function CreateTicketModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const createTicket = useCreateTicket();
  const analyzeAI = useAnalyzeWithAI();
  const [form, setForm] = useState({
    title: "", description: "", type: "incident" as TicketType,
    priority: "medium" as TicketPriority,
    requester_name: "", requester_email: "", category: "",
  });
  const [aiResult, setAIResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!form.title || !form.description) return;
    try {
      const result = await analyzeAI.mutateAsync({
        title: form.title,
        description: form.description,
      });
      setAIResult(result);
      // Auto-completar con sugerencia de IA
      setForm(f => ({
        ...f,
        type: result.type,
        priority: result.priority,
        category: result.category,
      }));
    } catch {
      /* IA opcional — no bloquear el formulario */
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await createTicket.mutateAsync(form);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Error al crear el ticket");
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{
        background: "#111827", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "20px", padding: "32px", width: "100%", maxWidth: "600px",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ color: "#e2e8f0", fontSize: "18px", fontWeight: "700", margin: 0 }}>Nuevo ticket</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "20px" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <Label>Nombre del solicitante</Label>
              <Input value={form.requester_name} onChange={v => setForm(f => ({ ...f, requester_name: v }))} placeholder="Juan Pérez" />
            </div>
            <div>
              <Label>Email del solicitante</Label>
              <Input value={form.requester_email} onChange={v => setForm(f => ({ ...f, requester_email: v }))} placeholder="juan@empresa.com" type="email" />
            </div>
          </div>

          <div>
            <Label>Título del ticket *</Label>
            <Input value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="Describe el problema brevemente" required />
          </div>

          <div>
            <Label>Descripción detallada *</Label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Explica el problema con el mayor detalle posible..."
              required
              rows={4}
              style={{
                width: "100%", background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px",
                padding: "10px 14px", color: "#e2e8f0", fontSize: "14px",
                outline: "none", resize: "vertical", boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Botón analizar con IA */}
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzeAI.isPending || !form.title || !form.description}
            style={{
              background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)",
              borderRadius: "10px", padding: "10px", color: "#a78bfa",
              fontSize: "13px", fontWeight: "600", cursor: "pointer",
            }}
          >
            {analyzeAI.isPending ? "⏳ Analizando..." : "🤖 Analizar con IA (clasificación automática)"}
          </button>

          {/* Resultado IA */}
          {aiResult && (
            <div style={{
              background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)",
              borderRadius: "12px", padding: "16px",
            }}>
              <p style={{ color: "#a78bfa", fontSize: "12px", fontWeight: "600", margin: "0 0 8px" }}>
                IA sugiere — Confianza: {Math.round((aiResult.confidence ?? 0) * 100)}%
              </p>
              {aiResult.suggested_solution && (
                <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>
                  💡 {aiResult.suggested_solution}
                </p>
              )}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <div>
              <Label>Clasificación *</Label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as TicketType }))}
                style={selectStyle}
              >
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Prioridad *</Label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as TicketPriority }))}
                style={selectStyle}
              >
                {Object.entries(PRIORITY_CONFIG).map(([v, c]) => (
                  <option key={v} value={v}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Categoría</Label>
              <Input value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} placeholder="Hardware, Red..." />
            </div>
          </div>

          {error && (
            <div style={{
              background: "rgba(239,68,68,0.1)", borderRadius: "8px",
              padding: "10px 14px", color: "#fca5a5", fontSize: "13px",
            }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px",
              padding: "12px", color: "#94a3b8", cursor: "pointer",
            }}>
              Cancelar
            </button>
            <button type="submit" disabled={createTicket.isPending} style={{
              flex: 2, background: "linear-gradient(135deg, #1b2a5e, #2563eb)",
              border: "none", borderRadius: "10px", padding: "12px",
              color: "white", fontWeight: "600", cursor: "pointer",
            }}>
              {createTicket.isPending ? "Creando..." : "Crear ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Panel lateral detalle ────────────────────────────────────────
function TicketDetailPanel({
  ticket, onClose, onStatusChange,
}: {
  ticket: Ticket;
  onClose: () => void;
  onStatusChange: (status: TicketStatus) => void;
}) {
  const { useTicketMessages, useAddMessage } = require("@/hooks");
  const { data: messages } = useTicketMessages(ticket.id);
  const addMsg = useAddMessage(ticket.id);
  const [newMsg, setNewMsg] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const nextStatuses: TicketStatus[] = (() => {
    const map: Record<TicketStatus, TicketStatus[]> = {
      open: ["in_progress"],
      in_progress: ["pending_customer", "resolved"],
      pending_customer: ["in_progress", "resolved"],
      resolved: ["closed"],
      closed: [],
    };
    return map[ticket.status] ?? [];
  })();

  return (
    <div style={{
      position: "fixed", right: 0, top: 0, bottom: 0, zIndex: 50,
      width: "480px", background: "#0f172a",
      borderLeft: "1px solid rgba(255,255,255,0.08)",
      display: "flex", flexDirection: "column",
      boxShadow: "-24px 0 64px rgba(0,0,0,0.4)",
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      }}>
        <div>
          <span style={{ color: "#2563eb", fontSize: "12px", fontWeight: "600", fontFamily: "monospace" }}>
            {ticket.display_id}
          </span>
          <h3 style={{ color: "#e2e8f0", fontSize: "16px", fontWeight: "600", margin: "4px 0 0" }}>
            {ticket.title}
          </h3>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "18px" }}>✕</button>
      </div>

      {/* Acciones de estado */}
      {nextStatuses.length > 0 && (
        <div style={{ padding: "12px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: "8px" }}>
          {nextStatuses.map(s => (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              style={{
                background: STATUS_CONFIG[s].bg,
                border: `1px solid ${STATUS_CONFIG[s].color}30`,
                borderRadius: "8px", padding: "6px 14px",
                color: STATUS_CONFIG[s].color, fontSize: "12px",
                fontWeight: "600", cursor: "pointer",
              }}
            >
              → {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      )}

      {/* Mensajes */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {messages?.map((msg: any) => (
          <div key={msg.id} style={{
            background: msg.is_internal ? "rgba(251,191,36,0.06)" : "rgba(255,255,255,0.03)",
            border: msg.is_internal ? "1px solid rgba(251,191,36,0.15)" : "1px solid rgba(255,255,255,0.06)",
            borderRadius: "12px", padding: "12px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "600" }}>{msg.author_name}</span>
              {msg.is_internal && (
                <span style={{ color: "#fbbf24", fontSize: "10px", background: "rgba(251,191,36,0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                  Nota interna
                </span>
              )}
            </div>
            <p style={{ color: "#cbd5e1", fontSize: "13px", margin: 0, lineHeight: "1.5" }}>{msg.content}</p>
          </div>
        ))}
      </div>

      {/* Caja de respuesta */}
      <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          <button
            onClick={() => setIsInternal(false)}
            style={{
              padding: "4px 12px", borderRadius: "6px", fontSize: "12px", cursor: "pointer",
              background: !isInternal ? "rgba(37,99,235,0.2)" : "transparent",
              border: !isInternal ? "1px solid rgba(37,99,235,0.4)" : "1px solid rgba(255,255,255,0.1)",
              color: !isInternal ? "#60a5fa" : "#64748b",
            }}
          >
            Respuesta pública
          </button>
          <button
            onClick={() => setIsInternal(true)}
            style={{
              padding: "4px 12px", borderRadius: "6px", fontSize: "12px", cursor: "pointer",
              background: isInternal ? "rgba(251,191,36,0.1)" : "transparent",
              border: isInternal ? "1px solid rgba(251,191,36,0.3)" : "1px solid rgba(255,255,255,0.1)",
              color: isInternal ? "#fbbf24" : "#64748b",
            }}
          >
            Nota interna
          </button>
        </div>
        <textarea
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && e.ctrlKey && newMsg.trim()) {
              addMsg.mutate({ content: newMsg, is_internal: isInternal });
              setNewMsg("");
            }
          }}
          placeholder={`Escribe una ${isInternal ? "nota interna" : "respuesta"}... (Ctrl+Enter para enviar)`}
          rows={3}
          style={{
            width: "100%", background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px",
            padding: "10px 12px", color: "#e2e8f0", fontSize: "13px",
            outline: "none", resize: "none", boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />
      </div>
    </div>
  );
}

// ── Helpers de componentes reutilizables ─────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.5px" }}>
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder, type = "text", required }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <input
      type={type} value={value} placeholder={placeholder} required={required}
      onChange={e => onChange(e.target.value)}
      style={{
        width: "100%", marginTop: "6px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "10px", padding: "10px 14px",
        color: "#e2e8f0", fontSize: "14px", outline: "none",
        boxSizing: "border-box",
      }}
    />
  );
}

function FilterSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={selectStyle}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{
          height: "52px", borderRadius: "8px",
          background: "rgba(255,255,255,0.03)",
          animation: "pulse 1.5s ease-in-out infinite",
        }} />
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{
      textAlign: "center", padding: "64px",
      color: "#64748b",
    }}>
      <p style={{ marginBottom: "16px" }}>Error al cargar los tickets</p>
      <button onClick={onRetry} style={{
        background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)",
        borderRadius: "8px", padding: "8px 20px", color: "#60a5fa",
        cursor: "pointer", fontSize: "13px",
      }}>
        Reintentar
      </button>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px", padding: "8px 12px",
  color: "#e2e8f0", fontSize: "13px", outline: "none",
  cursor: "pointer",
};
