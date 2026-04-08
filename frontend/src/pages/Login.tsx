import { useState } from "react";
import { useAuthStore } from "../store/auth";

// ---------------------------------------------
// BRANDING — edita estas variables para personalizar
// Reemplaza /logo.png por tu archivo en frontend/public/
// ---------------------------------------------
const BRANDING = {
  logoUrl: "/logo.png",           // ruta del logo en public/
  logoFallback: "F",              // letra si no hay logo
  appName: "Fusion I.T.",
  appSubtitle: "Mesa de soporte",
  primaryColor: "#1D6AE5",
  bgColor: "#0F172A",
  cardColor: "#1E293B",
  accentColor: "#334155",
};

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [logoError, setLogoError] = useState(false);
  const login = useAuthStore((s) => s.login);
  const { user } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(email, password);
      // Leer el rol directo del token decodificado
      const token = localStorage.getItem("token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.role === "supervisor") {
          window.location.href = "/supervisor";
        } else {
          window.location.href = "/dashboard";
        }
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Credenciales incorrectas. Verifica tu email y contrasena.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "8px",
    border: "1px solid #334155",
    background: "#0F172A",
    color: "#F1F5F9",
    boxSizing: "border-box" as const,
    fontSize: "14px",
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.2s",
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", fontFamily:"'DM Sans',-apple-system,sans-serif", background: BRANDING.bgColor }}>

      {/* Panel izquierdo — decorativo */}
      <div style={{ display:"none", flex:1, background:`linear-gradient(135deg, ${BRANDING.primaryColor}22 0%, ${BRANDING.bgColor} 100%)`,
        alignItems:"center", justifyContent:"center", padding:"48px",
        borderRight:"1px solid #1E293B" }}
        className="left-panel">
        <div style={{ maxWidth:"320px" }}>
          <div style={{ fontSize:"32px", fontWeight:"800", color:"#F1F5F9", marginBottom:"16px", lineHeight:"1.2" }}>
            Soporte TI<br />
            <span style={{ color: BRANDING.primaryColor }}>simplificado.</span>
          </div>
          <p style={{ color:"#94A3B8", fontSize:"15px", lineHeight:"1.7" }}>
            Gestiona tickets, inventario y equipos desde un solo lugar. Disenhado para empresas que necesitan mas que GLPI.
          </p>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"24px" }}>
        <div style={{ width:"100%", maxWidth:"400px" }}>

          {/* Logo y nombre */}
          <div style={{ textAlign:"center", marginBottom:"32px" }}>
            <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
              width:"64px", height:"64px", borderRadius:"16px",
              background: logoError ? BRANDING.primaryColor : "transparent",
              marginBottom:"12px", overflow:"hidden" }}>
              {!logoError ? (
                <img
                  src={BRANDING.logoUrl}
                  alt={BRANDING.appName}
                  onError={() => setLogoError(true)}
                  style={{ width:"64px", height:"64px", objectFit:"contain" }}
                />
              ) : (
                <span style={{ fontSize:"13px", fontWeight:"800", color:"#fff", textAlign:"center", padding:"0 6px", lineHeight:"1.2" }}>
                  {BRANDING.appName}
                </span>
              )}
            </div>
            <div style={{ fontSize:"22px", fontWeight:"700", color:"#F1F5F9", marginBottom:"4px" }}>
              {BRANDING.appName}
            </div>
            <div style={{ fontSize:"13px", color:"#64748B" }}>{BRANDING.appSubtitle}</div>
          </div>

          {/* Card formulario */}
          <div style={{ background: BRANDING.cardColor, borderRadius:"16px", padding:"28px 28px 24px",
            border:"1px solid #1E293B", boxShadow:"0 25px 50px rgba(0,0,0,0.4)" }}>

            <h2 style={{ margin:"0 0 4px", fontSize:"17px", fontWeight:"700", color:"#F1F5F9" }}>
              Bienvenido
            </h2>
            <p style={{ margin:"0 0 24px", fontSize:"13px", color:"#64748B" }}>
              Ingresa tus credenciales para continuar
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom:"14px" }}>
                <label style={{ display:"block", fontSize:"11px", fontWeight:"600", color:"#94A3B8",
                  textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"6px" }}>
                  Correo electronico
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com" required
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = BRANDING.primaryColor}
                  onBlur={e => e.target.style.borderColor = "#334155"}
                />
              </div>

              <div style={{ marginBottom:"20px" }}>
                <label style={{ display:"block", fontSize:"11px", fontWeight:"600", color:"#94A3B8",
                  textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"6px" }}>
                  Contrasena
                </label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = BRANDING.primaryColor}
                  onBlur={e => e.target.style.borderColor = "#334155"}
                />
              </div>

              {error && (
                <div style={{ marginBottom:"16px", padding:"10px 14px", background:"#450A0A",
                  border:"1px solid #7F1D1D", borderRadius:"8px", fontSize:"13px", color:"#FCA5A5" }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{ width:"100%", padding:"12px", background: loading ? "#1E3A8A" : BRANDING.primaryColor,
                  color:"#fff", border:"none", borderRadius:"8px", cursor: loading ? "default" : "pointer",
                  fontSize:"14px", fontWeight:"600", letterSpacing:"0.02em",
                  transition:"background 0.2s", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
                {loading ? (
                  <>
                    <span style={{ width:"14px", height:"14px", border:"2px solid #ffffff44",
                      borderTop:"2px solid #fff", borderRadius:"50%",
                      display:"inline-block", animation:"spin 0.8s linear infinite" }} />
                    Ingresando...
                  </>
                ) : "Iniciar sesion"}
              </button>
            </form>
          </div>

          {/* Link wizard publico */}
          <div style={{ textAlign:"center", marginTop:"20px" }}>
            <a href="/nuevo-ticket" style={{ fontSize:"12px", color:"#64748B", textDecoration:"none" }}>
              Reportar un problema sin iniciar sesion ?
            </a>
          </div>

          {/* Footer */}
          <div style={{ textAlign:"center", marginTop:"32px", fontSize:"11px", color:"#334155" }}>
            {BRANDING.appName} — Mesa de soporte TI
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 768px) {
          .left-panel { display: flex !important; }
        }
      `}</style>
    </div>
  );
}


