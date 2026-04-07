import { create } from "zustand";
import { api } from "../lib/api";

interface User { id: string; email: string; full_name: string; role: string; tenant_id: string; }

interface AuthStore {
  user: User | null; token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: localStorage.getItem("token"),
  login: async (email, password) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    const { data } = await api.post("/api/v1/auth/login", form);
    localStorage.setItem("token", data.access_token);
    set({ token: data.access_token });
  },
  logout: () => { localStorage.removeItem("token"); set({ user: null, token: null }); window.location.href = "/login"; },
  fetchMe: async () => { const { data } = await api.get("/api/v1/auth/me"); set({ user: data }); },
}));