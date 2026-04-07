// ═══════════════════════════════════════════════════════════════
// frontend/src/hooks/useTickets.ts
//
// Hooks de React Query para el módulo de tickets.
// React Query se eligió porque:
// - Caché automático — el mismo ticket no se refetch si está fresco
// - Invalidación selectiva — al crear un ticket solo se refresca
//   la lista, no todo el estado global
// - States de loading/error sin useState manual
// ═══════════════════════════════════════════════════════════════

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, PaginatedResponse } from "@/lib/api";

// ── Tipos ────────────────────────────────────────────────────────
export type TicketStatus =
  | "open"
  | "in_progress"
  | "pending_customer"
  | "resolved"
  | "closed";

export type TicketType =
  | "incident"
  | "request"
  | "change"
  | "problem"
  | "query"
  | "recurrence";

export type TicketPriority = "low" | "medium" | "high" | "critical";

export interface Ticket {
  id: string;
  display_id: string; // TKT-000001
  title: string;
  description: string;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  category?: string;
  assigned_to_id?: string;
  assigned_to_name?: string;
  requester_email?: string;
  requester_name?: string;
  created_at: string;
  updated_at: string;
  due_at?: string;
  closed_at?: string;
  sla_pct?: number; // 0-100, porcentaje de tiempo SLA consumido
  frt_minutes?: number;
  mttr_minutes?: number;
  satisfaction_score?: number;
  // IA
  ai_classification?: TicketType;
  ai_priority?: TicketPriority;
  ai_summary?: string;
  ai_suggested_solution?: string;
  ai_sentiment?: "positive" | "neutral" | "negative" | "frustrated";
  ai_confidence?: number;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  content: string;
  is_internal: boolean; // Las notas internas NO se envían al cliente
  author_name: string;
  author_role: string;
  created_at: string;
}

export interface CreateTicketPayload {
  title: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  category?: string;
  requester_email?: string;
  requester_name?: string;
  assigned_to_id?: string;
}

export interface TicketFilters {
  page?: number;
  page_size?: number;
  status?: TicketStatus;
  type?: TicketType;
  priority?: TicketPriority;
  assigned_to_id?: string;
  search?: string;
}

// ── Query Keys — centralizados para invalidación coherente ───────
export const ticketKeys = {
  all: ["tickets"] as const,
  lists: () => [...ticketKeys.all, "list"] as const,
  list: (filters: TicketFilters) =>
    [...ticketKeys.lists(), filters] as const,
  detail: (id: string) => [...ticketKeys.all, "detail", id] as const,
  messages: (id: string) => [...ticketKeys.all, "messages", id] as const,
};

// ── useTickets — lista paginada con filtros ──────────────────────
export const useTickets = (
  filters: TicketFilters = {},
  options?: UseQueryOptions<PaginatedResponse<Ticket>>
) => {
  return useQuery({
    queryKey: ticketKeys.list(filters),
    queryFn: () =>
      apiGet<PaginatedResponse<Ticket>>("/tickets", { params: filters }),
    staleTime: 30_000,  // 30s — tickets no cambian cada segundo
    ...options,
  });
};

// ── useTicket — detalle de un ticket ────────────────────────────
export const useTicket = (id: string) => {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: () => apiGet<Ticket>(`/tickets/${id}`),
    enabled: !!id,
    staleTime: 15_000,  // 15s — el detalle se actualiza más seguido
  });
};

// ── useTicketMessages — hilo de mensajes ────────────────────────
export const useTicketMessages = (ticketId: string) => {
  return useQuery({
    queryKey: ticketKeys.messages(ticketId),
    queryFn: () => apiGet<TicketMessage[]>(`/tickets/${ticketId}/messages`),
    enabled: !!ticketId,
    staleTime: 10_000,
  });
};

// ── useCreateTicket — mutación de creación ──────────────────────
export const useCreateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTicketPayload) =>
      apiPost<Ticket>("/tickets", payload),
    onSuccess: () => {
      // Invalida TODAS las listas de tickets — el nuevo aparece al instante
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
    },
  });
};

// ── useUpdateTicketStatus — cambio de estado ────────────────────
export const useUpdateTicketStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      comment,
    }: {
      id: string;
      status: TicketStatus;
      comment?: string;
    }) => apiPatch<Ticket>(`/tickets/${id}/status`, { status, comment }),
    onSuccess: (updatedTicket) => {
      // Actualización optimista en el caché del detalle
      queryClient.setQueryData(
        ticketKeys.detail(updatedTicket.id),
        updatedTicket
      );
      // Refrescar listas para que los filtros de estado sean correctos
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
    },
  });
};

// ── useAddMessage — agregar comentario ──────────────────────────
export const useAddMessage = (ticketId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      content,
      is_internal,
    }: {
      content: string;
      is_internal: boolean;
    }) =>
      apiPost<TicketMessage>(`/tickets/${ticketId}/messages`, {
        content,
        is_internal,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ticketKeys.messages(ticketId),
      });
    },
  });
};

// ── useAnalyzeWithAI — clasificación IA ─────────────────────────
export const useAnalyzeWithAI = () => {
  return useMutation({
    mutationFn: (payload: { title: string; description: string }) =>
      apiPost<{
        type: TicketType;
        priority: TicketPriority;
        category: string;
        sentiment: string;
        confidence: number;
        summary: string;
        suggested_solution: string;
      }>("/tickets/analyze", payload),
  });
};


// ═══════════════════════════════════════════════════════════════
// frontend/src/hooks/useDashboard.ts
// ═══════════════════════════════════════════════════════════════

export interface DashboardKPIs {
  open_tickets: number;
  in_progress: number;
  resolved_today: number;
  critical_tickets: number;
  avg_resolution_hours: number;
  sla_compliance_pct: number;
  avg_satisfaction: number;
  // Tendencia vs período anterior (delta porcentual)
  open_delta: number;
  resolved_delta: number;
  sla_delta: number;
}

export interface TechnicianStat {
  id: string;
  name: string;
  avatar_url?: string;
  resolved: number;
  documented: number;
  avg_satisfaction: number;
  sla_compliance_pct: number;
  score: number; // Score compuesto 0-100
}

export interface HeatmapCell {
  day: number;   // 0=Dom, 6=Sáb
  hour: number;  // 0-23
  count: number;
}

export interface PredictivePoint {
  date: string;
  predicted: number;
  min: number;
  max: number;
}

export const dashboardKeys = {
  kpis: ["dashboard", "kpis"] as const,
  technicians: ["dashboard", "technicians"] as const,
  heatmap: ["dashboard", "heatmap"] as const,
  predictive: ["dashboard", "predictive"] as const,
  gantt: ["dashboard", "gantt"] as const,
};

export const useDashboardKPIs = () =>
  useQuery({
    queryKey: dashboardKeys.kpis,
    queryFn: () => apiGet<DashboardKPIs>("/analytics/kpis"),
    staleTime: 60_000,  // 1 minuto — KPIs no necesitan tiempo real
    refetchInterval: 120_000,  // Refetch cada 2min en background
  });

export const useTechnicianStats = () =>
  useQuery({
    queryKey: dashboardKeys.technicians,
    queryFn: () => apiGet<TechnicianStat[]>("/analytics/technicians"),
    staleTime: 60_000,
  });

export const useHeatmap = () =>
  useQuery({
    queryKey: dashboardKeys.heatmap,
    queryFn: () => apiGet<HeatmapCell[]>("/analytics/heatmap"),
    staleTime: 300_000,  // 5min — heatmap cambia lentamente
  });

export const usePredictive = () =>
  useQuery({
    queryKey: dashboardKeys.predictive,
    queryFn: () => apiGet<PredictivePoint[]>("/analytics/predictive"),
    staleTime: 300_000,
  });


// ═══════════════════════════════════════════════════════════════
// frontend/src/hooks/usePortal.ts
// Hooks para el portal cliente (sin JWT — usa magic link token)
// ═══════════════════════════════════════════════════════════════

import { apiPost as portalPost, apiGet as portalGet } from "@/lib/api";

export interface PortalTicket {
  id: string;
  display_id: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  created_at: string;
  updated_at: string;
  sla_pct?: number;
  assigned_to_name?: string;
  last_message_at?: string;
}

export interface PortalMessage {
  id: string;
  content: string;
  author_name: string;
  is_from_client: boolean;
  created_at: string;
}

// El token de portal se guarda en sessionStorage (no persiste al cerrar tab)
const getPortalToken = () => sessionStorage.getItem("portal_token");
const getPortalHeaders = () => ({
  headers: { "X-Portal-Token": getPortalToken() ?? "" },
});

export const usePortalTickets = () =>
  useQuery({
    queryKey: ["portal", "tickets"],
    queryFn: () =>
      portalGet<PortalTicket[]>("/portal/tickets", getPortalHeaders()),
    enabled: !!getPortalToken(),
    staleTime: 30_000,
  });

export const usePortalTicketDetail = (ticketId: string) =>
  useQuery({
    queryKey: ["portal", "ticket", ticketId],
    queryFn: () =>
      portalGet<{ ticket: PortalTicket; messages: PortalMessage[] }>(
        `/portal/tickets/${ticketId}`,
        getPortalHeaders()
      ),
    enabled: !!ticketId && !!getPortalToken(),
  });

export const usePortalReply = (ticketId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      portalPost(
        `/portal/tickets/${ticketId}/reply`,
        { content },
        getPortalHeaders()
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["portal", "ticket", ticketId],
      });
    },
  });
};

export const usePortalCreateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      title: string;
      description: string;
      priority: TicketPriority;
    }) =>
      portalPost<PortalTicket>(
        "/portal/tickets",
        payload,
        getPortalHeaders()
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal", "tickets"] });
    },
  });
};

export const usePortalRequestAccess = () =>
  useMutation({
    mutationFn: ({
      email,
      tenant_slug,
    }: {
      email: string;
      tenant_slug: string;
    }) => portalPost("/portal/request-access", { email, tenant_slug }),
  });

export const usePortalVerifyToken = () =>
  useMutation({
    mutationFn: (token: string) =>
      portalPost<{ valid: boolean; email: string }>(
        "/portal/verify-token",
        { token }
      ).then((data) => {
        if (data.valid) {
          // Guardar en sessionStorage para las requests del portal
          sessionStorage.setItem("portal_token", token);
        }
        return data;
      }),
  });
