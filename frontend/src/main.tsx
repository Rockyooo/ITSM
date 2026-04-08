import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NuevoTicket from "./pages/NuevoTicket";
import Permisos from "./pages/Permisos";
import SupervisorView from "./pages/SupervisorView";
import { useAuthStore } from "./store/auth";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" />;
  return <>{children}</>;
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
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/permisos" element={<PrivateRoute><Permisos /></PrivateRoute>} />
        <Route path="/supervisor" element={<PrivateRoute><SupervisorView /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
