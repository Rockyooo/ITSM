import React from "react";
import "./index.css";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import TicketsPage from "./pages/TicketsPage";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import NuevoTicket from "./pages/NuevoTicket";
import Permisos from "./pages/Permisos";
import SupervisorView from "./pages/SupervisorView";
import Empresas from "./pages/Empresas";
import Usuarios from "./pages/Usuarios";
import TicketDetail from "./pages/TicketDetail";
import { useAuthStore } from "./store/auth";
import { Layout } from "./components/Layout";

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
        <Route path="/login" element={<Login />} />
        <Route path="/nuevo-ticket" element={<NuevoTicket />} />
        <Route path="/" element={<PrivateRoute><RoleRedirect /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><AnalyticsDashboard /></PrivateRoute>} />
        <Route path="/tickets" element={<PrivateRoute><TicketsPage /></PrivateRoute>} />
        <Route path="/usuarios" element={<PrivateRoute><Usuarios /></PrivateRoute>} />
        <Route path="/empresas" element={<PrivateRoute><Empresas /></PrivateRoute>} />
        <Route path="/permisos" element={<PrivateRoute><Permisos /></PrivateRoute>} />
        <Route path="/supervisor" element={<PrivateRoute><SupervisorView /></PrivateRoute>} />
        <Route path="/ticket/:id" element={<PrivateRoute><TicketDetail /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);