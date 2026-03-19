// ═══════════════════════════════════════════════════════════════
// frontend/src/main.tsx
// Punto de entrada — React 18, QueryClient, Router
// ═══════════════════════════════════════════════════════════════

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

// QueryClient con defaults conservadores para un VPS pequeño
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30s antes de considerar el dato "stale"
      staleTime: 30_000,
      // Reintentar 2 veces con backoff exponencial antes de mostrar error
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15_000),
      // Refetch al volver a la ventana solo si el dato tiene >60s
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0, // Las mutaciones NO se reintentan automáticamente
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);


// ═══════════════════════════════════════════════════════════════
// frontend/src/App.tsx
// Rutas principales con guard de autenticación
// ═══════════════════════════════════════════════════════════════

// (En un archivo separado App.tsx — se incluye aquí por compacidad)
export {};

/*
// frontend/src/App.tsx

import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/store/authStore";
import LoginPage from "@/pages/LoginPage";
import TicketsPage from "@/pages/TicketsPage";
import DashboardPage from "@/pages/DashboardPage";
import PortalPage from "@/pages/PortalPage";
import AppLayout from "@/components/AppLayout";

// Guard que redirige al login si no hay sesión activa
function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

// Guard inverso — si ya está autenticado, no mostrar login
function PublicOnlyRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

export default function App() {
  return (
    <Routes>
      // Rutas públicas
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      // Portal cliente — autenticación propia (magic link, sin JWT)
      <Route path="/portal/*" element={<PortalPage />} />

      // Rutas protegidas — requieren JWT válido
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/inventory" element={<div>Inventario — próximamente</div>} />
          <Route path="/knowledge" element={<div>Base de conocimiento — próximamente</div>} />
          <Route path="/settings" element={<div>Configuración — próximamente</div>} />
        </Route>
      </Route>

      // Fallback
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
*/


// ═══════════════════════════════════════════════════════════════
// frontend/src/index.css
// Variables CSS globales + reset mínimo para el tema oscuro
// ═══════════════════════════════════════════════════════════════

/*
:root {
  --color-bg-primary:    #0a0f1e;
  --color-bg-secondary:  #111827;
  --color-bg-card:       rgba(255, 255, 255, 0.02);
  --color-border:        rgba(255, 255, 255, 0.08);
  --color-text-primary:  #e2e8f0;
  --color-text-muted:    #64748b;
  --color-accent:        #2563eb;
  --color-accent-light:  #60a5fa;
  --color-brand-dark:    #1b2a5e;

  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-xl:   20px;

  --font-sans:   'DM Sans', system-ui, sans-serif;
  --font-mono:   'JetBrains Mono', monospace;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-sans);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  -webkit-font-smoothing: antialiased;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

// Scrollbar estilizado para tema oscuro
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
*/


// ═══════════════════════════════════════════════════════════════
// frontend/.env.example
// Variables de entorno del frontend
// ═══════════════════════════════════════════════════════════════

/*
# URL base del backend FastAPI
# En desarrollo local:
VITE_API_URL=http://localhost:8000

# URL WebSocket (mismo servidor, protocolo ws:// o wss://)
VITE_WS_URL=ws://localhost:8000

# En producción con dominio:
# VITE_API_URL=https://api.tudominio.com
# VITE_WS_URL=wss://api.tudominio.com

# Nombre de la empresa (aparece en el título del navegador)
VITE_APP_NAME=ITSM Fusion I.T.
*/


// ═══════════════════════════════════════════════════════════════
// frontend/vite.config.ts
// ═══════════════════════════════════════════════════════════════

/*
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // En desarrollo, redirigir /api al backend para evitar CORS
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    outDir: "dist",
    // Sourcemaps en producción para debugging sin exponer código
    sourcemap: false,
    rollupOptions: {
      output: {
        // Separar vendor chunks para mejor caché en navegador
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          query: ["@tanstack/react-query"],
          charts: ["recharts"],
        },
      },
    },
  },
});
*/


// ═══════════════════════════════════════════════════════════════
// frontend/package.json — dependencias clave
// ═══════════════════════════════════════════════════════════════

/*
{
  "name": "itsm-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.22.0",
    "@tanstack/react-query": "^5.28.0",
    "axios": "^1.6.8",
    "zustand": "^4.5.2",
    "recharts": "^2.12.2"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.4.2",
    "vite": "^5.2.0"
  }
}
*/
