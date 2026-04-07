// ═══════════════════════════════════════════════════════════════
// frontend/src/store/authStore.ts
//
// Estado global de autenticación con Zustand.
// Zustand se eligió sobre Context + useReducer porque:
// - Sin re-renders innecesarios (selector granular)
// - Persistencia en localStorage en una línea
// - Accesible fuera de React (en interceptores de Axios)
// ═══════════════════════════════════════════════════════════════

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { apiPost } from "@/lib/api";

// ── Tipos ────────────────────────────────────────────────────────
export type UserRole = "admin" | "supervisor" | "technician" | "client";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
  avatar_url?: string;
  two_factor_enabled: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenant_slug: string;
}

export interface TwoFactorPayload {
  temp_token: string;
  code: string;
}

interface AuthState {
  user: AuthUser | null;
  access_token: string | null;
  refresh_token: string | null;
  // Estado del flujo 2FA
  twofa_required: boolean;
  twofa_temp_token: string | null;
  // Acciones
  login: (credentials: LoginCredentials) => Promise<void>;
  verifyTwoFactor: (code: string) => Promise<void>;
  logout: () => void;
  // Helpers
  isAuthenticated: boolean;
  hasRole: (roles: UserRole[]) => boolean;
}

// ── Store ────────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      access_token: null,
      refresh_token: null,
      twofa_required: false,
      twofa_temp_token: null,
      isAuthenticated: false,

      login: async (credentials) => {
        const data = await apiPost<{
          access_token?: string;
          refresh_token?: string;
          user?: AuthUser;
          requires_2fa?: boolean;
          temp_token?: string;
        }>("/auth/login", credentials);

        if (data.requires_2fa) {
          // Primer factor OK — mostrar pantalla de 2FA
          set({
            twofa_required: true,
            twofa_temp_token: data.temp_token ?? null,
          });
          return;
        }

        // Login completo sin 2FA
        _setSession(set, data.access_token!, data.refresh_token!, data.user!);
      },

      verifyTwoFactor: async (code) => {
        const { twofa_temp_token } = get();
        if (!twofa_temp_token) throw new Error("No hay sesión 2FA pendiente");

        const data = await apiPost<{
          access_token: string;
          refresh_token: string;
          user: AuthUser;
        }>("/auth/2fa/verify", {
          temp_token: twofa_temp_token,
          code,
        });

        set({ twofa_required: false, twofa_temp_token: null });
        _setSession(set, data.access_token, data.refresh_token, data.user);
      },

      logout: () => {
        // Notificar al backend para invalidar el refresh token
        const { refresh_token } = get();
        if (refresh_token) {
          apiPost("/auth/logout", { refresh_token }).catch(() => {
            // Si falla, igual limpiamos localmente
          });
        }
        set({
          user: null,
          access_token: null,
          refresh_token: null,
          twofa_required: false,
          twofa_temp_token: null,
          isAuthenticated: false,
        });
        // Limpiar tokens del localStorage también (usados por Axios)
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("tenant_slug");
      },

      hasRole: (roles) => {
        const { user } = get();
        return user ? roles.includes(user.role) : false;
      },
    }),
    {
      name: "itsm-auth",
      storage: createJSONStorage(() => localStorage),
      // Solo persistir lo necesario — no el estado temporal de 2FA
      partialize: (state) => ({
        user: state.user,
        access_token: state.access_token,
        refresh_token: state.refresh_token,
        isAuthenticated: state.isAuthenticated,
      }),
      // Al rehidratar, sincronizar tokens con localStorage
      // para que el interceptor de Axios los encuentre
      onRehydrateStorage: () => (state) => {
        if (state?.access_token) {
          localStorage.setItem("access_token", state.access_token);
        }
        if (state?.refresh_token) {
          localStorage.setItem("refresh_token", state.refresh_token);
        }
        if (state?.user?.tenant_slug) {
          localStorage.setItem("tenant_slug", state.user.tenant_slug);
        }
      },
    }
  )
);

// ── Helper privado ───────────────────────────────────────────────
function _setSession(
  set: (state: Partial<AuthState>) => void,
  access_token: string,
  refresh_token: string,
  user: AuthUser
) {
  // Guardar en localStorage para el interceptor de Axios
  localStorage.setItem("access_token", access_token);
  localStorage.setItem("refresh_token", refresh_token);
  localStorage.setItem("tenant_slug", user.tenant_slug);

  set({
    user,
    access_token,
    refresh_token,
    isAuthenticated: true,
    twofa_required: false,
    twofa_temp_token: null,
  });
}

// ── Hook simplificado para componentes ──────────────────────────
export const useAuth = () => {
  const store = useAuthStore();
  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    twofa_required: store.twofa_required,
    login: store.login,
    verifyTwoFactor: store.verifyTwoFactor,
    logout: store.logout,
    hasRole: store.hasRole,
    isAdmin: store.user?.role === "admin",
    isTechnician:
      store.user?.role === "technician" || store.user?.role === "admin",
  };
};
