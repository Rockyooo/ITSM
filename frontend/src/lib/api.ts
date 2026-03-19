// ═══════════════════════════════════════════════════════════════
// frontend/src/lib/api.ts
//
// Cliente HTTP centralizado con Axios.
// Decisiones clave:
// - Un interceptor de request adjunta el JWT automáticamente.
// - Un interceptor de response detecta 401 y refresca el token
//   de forma transparente — el usuario nunca ve el error.
// - Cola de requests pendientes mientras se refresca el token:
//   si 3 requests fallan simultáneamente por JWT expirado,
//   solo se hace UNA llamada a /refresh, las otras 2 esperan.
// ═══════════════════════════════════════════════════════════════

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

// ── Tipos base de respuesta ──────────────────────────────────────
export interface ApiError {
  detail: string;
  code?: string;
  field?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ── Configuración base ───────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// Cola para requests que llegaron mientras se estaba refrescando el token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// ── Instancia principal ──────────────────────────────────────────
export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Interceptor REQUEST — adjunta JWT y tenant header ────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("access_token");
    const tenantSlug = localStorage.getItem("tenant_slug");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // El backend usa este header para resolver el tenant
    // sin depender del subdominio (útil en desarrollo local)
    if (tenantSlug) {
      config.headers["X-Tenant-Slug"] = tenantSlug;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ── Interceptor RESPONSE — refresco transparente de JWT ──────────
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // Solo interceptar 401 y solo una vez por request
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Si ya estamos refrescando, encolar este request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${token}`,
        };
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) throw new Error("No refresh token");

      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });

      const newToken = data.access_token;
      localStorage.setItem("access_token", newToken);
      if (data.refresh_token) {
        localStorage.setItem("refresh_token", data.refresh_token);
      }

      processQueue(null, newToken);
      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${newToken}`,
      };

      return api(originalRequest);
    } catch (refreshError) {
      // Refresh falló — limpiar sesión y redirigir al login
      processQueue(refreshError, null);
      localStorage.clear();
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ── Helpers tipados ──────────────────────────────────────────────
export const apiGet = <T>(url: string, config?: AxiosRequestConfig) =>
  api.get<T>(url, config).then((r) => r.data);

export const apiPost = <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
) => api.post<T>(url, data, config).then((r) => r.data);

export const apiPatch = <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
) => api.patch<T>(url, data, config).then((r) => r.data);

export const apiDelete = <T>(url: string, config?: AxiosRequestConfig) =>
  api.delete<T>(url, config).then((r) => r.data);
