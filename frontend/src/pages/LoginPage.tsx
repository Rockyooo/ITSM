// ═══════════════════════════════════════════════════════════════
// frontend/src/pages/LoginPage.tsx
//
// Flujo completo: credenciales → opcional 2FA → dashboard
// Diseño: luxury/refined — oscuro con acento azul marino Fusion I.T.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/store/authStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, verifyTwoFactor, twofa_required, isAuthenticated } = useAuth();

  const [form, setForm] = useState({
    tenant_slug: "",
    email: "",
    password: "",
  });
  const [twoFACode, setTwoFACode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Si ya está autenticado, redirigir
  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form);
      // Si no requiere 2FA, el useEffect de arriba redirige
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ?? "Credenciales incorrectas"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verifyTwoFactor(twoFACode);
      navigate("/dashboard");
    } catch {
      setError("Código incorrecto o expirado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0f1e 0%, #111827 50%, #0d1526 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Fondo decorativo */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.04,
        backgroundImage: "radial-gradient(circle at 2px 2px, #4a7fd4 1px, transparent 0)",
        backgroundSize: "40px 40px",
      }} />
      <div style={{
        position: "absolute", top: "-20%", right: "-10%",
        width: "600px", height: "600px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)",
      }} />

      {/* Card principal */}
      <div style={{
        position: "relative", zIndex: 1,
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "24px",
        padding: "48px",
        width: "100%", maxWidth: "420px",
        boxShadow: "0 32px 64px rgba(0,0,0,0.4)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "12px",
            background: "rgba(37,99,235,0.1)",
            border: "1px solid rgba(37,99,235,0.2)",
            borderRadius: "12px", padding: "10px 20px",
          }}>
            <svg width="28" height="28" viewBox="0 0 40 40">
              <rect width="40" height="40" rx="10" fill="#1b2a5e"/>
              <text x="20" y="27" textAnchor="middle" fontSize="16" fontWeight="700" fill="white">F</text>
            </svg>
            <span style={{ color: "#e2e8f0", fontSize: "18px", fontWeight: "600", letterSpacing: "-0.3px" }}>
              Fusion I.T.
            </span>
          </div>
          <p style={{ color: "#64748b", fontSize: "14px", marginTop: "16px" }}>
            {twofa_required ? "Verificación de dos factores" : "Acceso al sistema de gestión"}
          </p>
        </div>

        {/* Formulario login o 2FA */}
        {!twofa_required ? (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "500", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                Empresa (slug)
              </label>
              <input
                value={form.tenant_slug}
                onChange={e => setForm(f => ({ ...f, tenant_slug: e.target.value }))}
                placeholder="fusion-it"
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "500", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="usuario@empresa.com"
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "500", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                Contraseña
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                required
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "8px", padding: "10px 14px",
                color: "#fca5a5", fontSize: "13px",
              }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={btnPrimaryStyle}>
              {loading ? "Verificando..." : "Iniciar sesión"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify2FA} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ color: "#94a3b8", fontSize: "14px", textAlign: "center" }}>
              Ingresa el código de tu aplicación de autenticación
            </p>
            <input
              value={twoFACode}
              onChange={e => setTwoFACode(e.target.value)}
              placeholder="000000"
              maxLength={6}
              required
              style={{ ...inputStyle, textAlign: "center", fontSize: "24px", letterSpacing: "8px" }}
            />
            {error && (
              <div style={{
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "8px", padding: "10px 14px",
                color: "#fca5a5", fontSize: "13px", textAlign: "center",
              }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} style={btnPrimaryStyle}>
              {loading ? "Verificando..." : "Confirmar código"}
            </button>
          </form>
        )}

        <p style={{ color: "#334155", fontSize: "12px", textAlign: "center", marginTop: "24px" }}>
          ITSM Fusion I.T. © 2026 · helpdesk@fusion-it.co
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", marginTop: "6px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px", padding: "11px 14px",
  color: "#e2e8f0", fontSize: "14px", outline: "none",
  transition: "border-color 0.2s",
  boxSizing: "border-box",
};

const btnPrimaryStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #1b2a5e, #2563eb)",
  color: "white", border: "none", borderRadius: "10px",
  padding: "12px", fontSize: "14px", fontWeight: "600",
  cursor: "pointer", marginTop: "8px",
  transition: "opacity 0.2s",
};
