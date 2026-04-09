import React, { Suspense } from "react";
import "./index.css";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/auth";
import { Layout } from "./components/Layout";

const Login = React.lazy(() => import("./pages/Login"));
const TicketsPage = React.lazy(() => import("./pages/TicketsPage"));
const AnalyticsDashboard = React.lazy(() => import("./pages/AnalyticsDashboard"));
const NuevoTicket = React.lazy(() => import("./pages/NuevoTicket"));
const Permisos = React.lazy(() => import("./pages/Permisos"));
const SupervisorView = React.lazy(() => import("./pages/SupervisorView"));
const Empresas = React.lazy(() => import("./pages/Empresas"));
const Usuarios = React.lazy(() => import("./pages/Usuarios"));
const TicketDetail = React.lazy(() => import("./pages/TicketDetail"));
const Inventario = React.lazy(() => import("./pages/Inventario"));

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
}
function RoleRedirect() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" />;
  if (user.role === "supervisor") return <Navigate to="/supervisor" />;
  return <Navigate to="/dashboard" />;
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Suspense fallback={<div>Cargando...</div>}><Login /></Suspense>} />
        <Route path="/nuevo-ticket" element={<Suspense fallback={<div>Cargando...</div>}><NuevoTicket /></Suspense>} />
        <Route path="/" element={<PrivateRoute><RoleRedirect /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Suspense fallback={<div>Cargando panel...</div>}><AnalyticsDashboard /></Suspense></PrivateRoute>} />
        <Route path="/tickets" element={<PrivateRoute><Suspense fallback={<div>Cargando tickets...</div>}><TicketsPage /></Suspense></PrivateRoute>} />
        <Route path="/usuarios" element={<PrivateRoute><Suspense fallback={<div>Cargando...</div>}><Usuarios /></Suspense></PrivateRoute>} />
        <Route path="/empresas" element={<PrivateRoute><Suspense fallback={<div>Cargando...</div>}><Empresas /></Suspense></PrivateRoute>} />
        <Route path="/permisos" element={<PrivateRoute><Suspense fallback={<div>Cargando...</div>}><Permisos /></Suspense></PrivateRoute>} />
        <Route path="/supervisor" element={<PrivateRoute><Suspense fallback={<div>Cargando...</div>}><SupervisorView /></Suspense></PrivateRoute>} />
        <Route path="/ticket/:id" element={<PrivateRoute><Suspense fallback={<div>Cargando ticket...</div>}><TicketDetail /></Suspense></PrivateRoute>} />
        <Route path="/inventario" element={<PrivateRoute><Suspense fallback={<div>Cargando inventario...</div>}><Inventario /></Suspense></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);