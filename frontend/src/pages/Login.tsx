import { useState } from "react";
import { useAuthStore } from "../store/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      window.location.href = "/";
    } catch {
      setError("Credenciales incorrectas");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a" }}>
      <div style={{ background: "#1e293b", padding: "2rem", borderRadius: "12px", width: "360px" }}>
        <h1 style={{ color: "#fff", marginBottom: "0.5rem", fontSize: "1.5rem" }}>ITSM Fusion I.T.</h1>
        <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>Inicia sesión para continuar</p>
        <form onSubmit={handleSubmit}>
          <input
            type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: "0.75rem", marginBottom: "1rem", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "#fff", boxSizing: "border-box" }}
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: "0.75rem", marginBottom: "1rem", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "#fff", boxSizing: "border-box" }}
          />
          {error && <p style={{ color: "#ef4444", marginBottom: "1rem" }}>{error}</p>}
          <button type="submit" style={{ width: "100%", padding: "0.75rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
