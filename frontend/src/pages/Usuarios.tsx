import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { Camera, X, Eye, EyeOff, ChevronDown, Search, UserPlus, Edit3, PowerOff, CheckCircle2 } from "lucide-react";

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  superadmin: { label: "Superadmin", color: "#7C3AED", bg: "#F5F3FF" },
  admin:      { label: "Admin",      color: "#1D6AE5", bg: "#EEF4FF" },
  manager:    { label: "Manager",    color: "#0891B2", bg: "#ECFEFF" },
  technician: { label: "Tecnico",    color: "#D97706", bg: "#FFFBEB" },
  supervisor: { label: "Supervisor", color: "#059669", bg: "#ECFDF5" },
  user:       { label: "Usuario",    color: "#6B7280", bg: "#F3F4F6" },
};

const ROLES_CREABLES = ["admin", "manager", "technician", "supervisor", "user"];

interface Usuario {
  id: string; full_name: string; last_name?: string; email: string; role: string;
  is_active: boolean; tenant_id?: string; phone?: string; position?: string;
  cedula?: string; photo_url?: string; signature?: string; created_at: string;
}
interface FormData {
  full_name: string; last_name: string; email: string; password: string;
  role: string; phone: string; position: string; cedula: string;
  signature: string; photo_url: string; tenant_id: string; is_active: boolean;
}

const FORM_INICIAL: FormData = {
  full_name: "", last_name: "", email: "", password: "", role: "technician",
  phone: "", position: "", cedula: "", signature: "", photo_url: "", tenant_id: "", is_active: true,
};

export default function Usuarios() {
  const { user, fetchMe } = useAuthStore();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("all");
  const [form, setForm] = useState<FormData>(FORM_INICIAL);
  const [confirmDelete, setConfirmDelete] = useState<Usuario | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "profile" | "signature">("basic");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchMe(); cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const [u, t] = await Promise.all([api.get("/api/v1/users/"), api.get("/api/v1/tenants/")]);
      setUsuarios(u.data); setTenants(t.data);
    } catch {} finally { setLoading(false); }
  };

  const abrirCrear = () => {
    setEditando(null);
    setForm({ ...FORM_INICIAL, tenant_id: user?.tenant_id || "" });
    setError(""); setActiveTab("basic"); setShowForm(true);
  };

  const abrirEditar = (u: Usuario) => {
    setEditando(u);
    setForm({
      full_name: u.full_name, last_name: u.last_name || "", email: u.email,
      password: "", role: u.role, phone: u.phone || "", position: u.position || "",
      cedula: u.cedula || "", signature: u.signature || "", photo_url: u.photo_url || "",
      tenant_id: u.tenant_id || "", is_active: u.is_active,
    });
    setError(""); setActiveTab("basic"); setShowForm(true);
  };

  const guardar = async () => {
    if (!form.full_name.trim() || !form.email.trim()) { setError("Nombre y email son obligatorios"); return; }
    if (!editando && !form.password.trim()) { setError("La contrasena es obligatoria al crear"); return; }
    setSaving(true); setError("");
    try {
      const payload: any = {
        full_name: form.full_name, last_name: form.last_name || null,
        email: form.email, role: form.role,
        phone: form.phone || null, position: form.position || null,
        cedula: form.cedula || null, signature: form.signature || null,
        photo_url: form.photo_url || null,
        tenant_id: user?.role === "superadmin" ? (form.tenant_id || null) : undefined,
        is_active: form.is_active,
      };
      if (!editando || form.password.trim()) payload.password = form.password;
      if (editando) { await api.patch(`/api/v1/users/${editando.id}`, payload); }
      else { await api.post("/api/v1/users/", payload); }
      setShowForm(false); cargar();
    } catch (err: any) { setError(err?.response?.data?.detail ?? "Error al guardar"); }
    finally { setSaving(false); }
  };

  const toggleActivo = async (u: Usuario) => {
    try {
      await api.patch(`/api/v1/users/${u.id}`, { is_active: !u.is_active });
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !u.is_active } : x));
    } catch {}
  };

  const usuariosFiltrados = usuarios.filter(u => {
    const q = busqueda.toLowerCase();
    const matchQ = !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchR = filtroRol === "all" || u.role === filtroRol;
    return matchQ && matchR;
  });

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: "8px",
    border: "1px solid #e2e8f0", background: "#f8fafc",
    fontSize: "13px", color: "#1e293b", outline: "none",
    boxSizing: "border-box", fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: "600",
    color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "5px",
  };

  return (
    <div style={{ padding: "24px", height: "100%", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#0f172a" }}>Usuarios</h1>
          <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#94a3b8" }}>{usuariosFiltrados.length} usuario{usuariosFiltrados.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={abrirCrear}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", border: "none", borderRadius: "9px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
          <UserPlus size={15} /> Nuevo usuario
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre o email..."
            style={{ ...inputStyle, paddingLeft: "32px" }} />
        </div>
        <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)}
          style={{ ...inputStyle, width: "160px", cursor: "pointer" }}>
          <option value="all">Todos los roles</option>
          {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>Cargando...</div>
      ) : (
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #f1f5f9", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                {["Usuario", "Cargo", "Empresa", "Rol", "Estado", "Acciones"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map(u => {
                const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.user;
                const tenant = tenants.find(t => t.id === u.tenant_id);
                return (
                  <tr key={u.id} style={{ borderBottom: "1px solid #f8fafc", transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {u.photo_url ? (
                          <img src={u.photo_url} alt="" style={{ width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover", border: "2px solid #e0e7ff" }} />
                        ) : (
                          <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: `${rc.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700", color: rc.color, flexShrink: 0 }}>
                            {u.full_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{u.full_name} {u.last_name || ""}</p>
                          <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>{u.email}</p>
                          {u.cedula && <p style={{ margin: 0, fontSize: "10px", color: "#cbd5e1" }}>CC: {u.cedula}</p>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: "12px", color: "#475569" }}>{u.position || "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: "12px", color: "#475569" }}>{tenant?.name || "—"}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: "11px", padding: "3px 9px", borderRadius: "99px", fontWeight: "600", background: rc.bg, color: rc.color }}>{rc.label}</span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: "11px", padding: "3px 9px", borderRadius: "99px", fontWeight: "600", background: u.is_active ? "#f0fdf4" : "#f9fafb", color: u.is_active ? "#16a34a" : "#9ca3af" }}>
                        {u.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => abrirEditar(u)} title="Editar"
                          style={{ background: "#f1f5f9", border: "none", borderRadius: "6px", padding: "5px 8px", cursor: "pointer", color: "#475569", display: "flex", alignItems: "center" }}>
                          <Edit3 size={13} />
                        </button>
                        <button onClick={() => toggleActivo(u)} title={u.is_active ? "Desactivar" : "Activar"}
                          style={{ background: u.is_active ? "#fef2f2" : "#f0fdf4", border: "none", borderRadius: "6px", padding: "5px 8px", cursor: "pointer", color: u.is_active ? "#dc2626" : "#16a34a", display: "flex", alignItems: "center" }}>
                          {u.is_active ? <PowerOff size={13} /> : <CheckCircle2 size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {usuariosFiltrados.length === 0 && (
                <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No hay usuarios que coincidan</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL FORMULARIO */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "#fff", borderRadius: "16px", width: "100%", maxWidth: "560px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            {/* Header modal */}
            <div style={{ padding: "20px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#0f172a" }}>
                {editando ? "Editar usuario" : "Nuevo usuario"}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "4px", borderRadius: "6px", display: "flex" }}>
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "4px", padding: "16px 24px 0", borderBottom: "1px solid #f1f5f9" }}>
              {([["basic", "Datos básicos"], ["profile", "Perfil"], ["signature", "Firma"]] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{ padding: "7px 14px", borderRadius: "8px 8px 0 0", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "600",
                    background: activeTab === tab ? "#fff" : "transparent",
                    color: activeTab === tab ? "#4f46e5" : "#94a3b8",
                    borderBottom: activeTab === tab ? "2px solid #4f46e5" : "2px solid transparent" }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ padding: "20px 24px" }}>
              {/* TAB: Datos básicos */}
              {activeTab === "basic" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={labelStyle}>Nombre *</label>
                      <input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                        placeholder="Nombre" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Apellido</label>
                      <input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                        placeholder="Apellido" style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Email *</label>
                    <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="usuario@empresa.com" style={inputStyle} />
                  </div>
                  <div style={{ position: "relative" }}>
                    <label style={labelStyle}>{editando ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña *"}</label>
                    <input type={showPassword ? "text" : "password"} value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      placeholder={editando ? "••••••••" : "Mínimo 8 caracteres"} style={{ ...inputStyle, paddingRight: "40px" }} />
                    <button onClick={() => setShowPassword(!showPassword)}
                      style={{ position: "absolute", right: "10px", top: "28px", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center" }}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={labelStyle}>Rol *</label>
                      <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                        style={{ ...inputStyle, cursor: "pointer" }}>
                        {ROLES_CREABLES.map(r => (
                          <option key={r} value={r}>{ROLE_CONFIG[r]?.label || r}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Empresa</label>
                      <select value={form.tenant_id} onChange={e => setForm(p => ({ ...p, tenant_id: e.target.value }))}
                        style={{ ...inputStyle, cursor: "pointer" }}
                        disabled={user?.role !== "superadmin"}>
                        <option value="">Sin empresa</option>
                        {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: form.is_active ? "#f0fdf4" : "#f9fafb", borderRadius: "8px", border: `1px solid ${form.is_active ? "#bbf7d0" : "#e2e8f0"}` }}>
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                      style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#16a34a" }} />
                    <div>
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: form.is_active ? "#16a34a" : "#6b7280" }}>
                        {form.is_active ? "Usuario activo" : "Usuario inactivo"}
                      </p>
                      <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>
                        {form.is_active ? "Puede iniciar sesion" : "No puede iniciar sesion"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Perfil */}
              {activeTab === "profile" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {/* Foto */}
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "3px solid #c7d2fe", flexShrink: 0 }}>
                      {form.photo_url ? (
                        <img src={form.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: "24px", fontWeight: "700", color: "#4338ca" }}>
                          {form.full_name.charAt(0).toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    <div>
                      <p style={{ margin: "0 0 6px", fontSize: "12px", fontWeight: "600", color: "#475569" }}>Foto de perfil</p>
                      <input value={form.photo_url} onChange={e => setForm(p => ({ ...p, photo_url: e.target.value }))}
                        placeholder="URL de la imagen" style={{ ...inputStyle, fontSize: "11px" }} />
                      <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#94a3b8" }}>JPG, PNG, WebP max 2MB</p>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "6px", padding: "5px 10px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer", fontSize: "11px", color: "#475569" }}>
                        <Camera size={13}/> Subir archivo
                        <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file || file.size > 2*1024*1024) return;
                          const reader = new FileReader();
                          reader.onload = ev => setForm(p => ({ ...p, photo_url: ev.target?.result as string }));
                          reader.readAsDataURL(file);
                        }}/>
                      </label>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={labelStyle}>Cedula / Documento</label>
                      <input value={form.cedula} onChange={e => setForm(p => ({ ...p, cedula: e.target.value }))}
                        placeholder="1234567890" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Telefono</label>
                      <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="+57 300 000 0000" style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Cargo / Posicion</label>
                    <input value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))}
                      placeholder="Ej: Tecnico N1, Analista IT" style={inputStyle} />
                  </div>
                  {/* Descripcion del rol */}
                  <div style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                    <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: "700", color: ROLE_CONFIG[form.role]?.color || "#475569" }}>
                      {ROLE_CONFIG[form.role]?.label || form.role}
                    </p>
                    <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>
                      {form.role === "superadmin" && "Acceso total al sistema y todas las empresas."}
                      {form.role === "admin" && "Administra usuarios, tickets y configuracion de la empresa."}
                      {form.role === "manager" && "Ve metricas del equipo, genera reportes y envia cotizaciones."}
                      {form.role === "supervisor" && "Ve y comenta tickets del equipo asignado."}
                      {form.role === "technician" && "Atiende y resuelve tickets asignados."}
                      {form.role === "user" && "Crea y hace seguimiento de sus propios tickets."}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB: Firma */}
              {activeTab === "signature" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={labelStyle}>Firma automatica para respuestas</label>
                    <textarea value={form.signature} onChange={e => setForm(p => ({ ...p, signature: e.target.value }))}
                      placeholder={"Ej:\n---\nJuan Perez | Tecnico N1\nFusion IT - Mesa de Ayuda\nTel: +57 300 000 0000"}
                      rows={5} style={{ ...inputStyle, resize: "vertical", lineHeight: "1.5" }} />
                    <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#94a3b8" }}>Se adjuntara automaticamente al final de cada respuesta de ticket.</p>
                  </div>
                  {form.signature && (
                    <div>
                      <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: "600", color: "#475569" }}>Vista previa:</p>
                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 14px", fontSize: "12px", color: "#475569", whiteSpace: "pre-line", lineHeight: "1.6", borderLeft: "3px solid #4f46e5" }}>
                        {form.signature}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div style={{ marginTop: "12px", padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "13px", color: "#dc2626" }}>
                  {error}
                </div>
              )}

              {/* Acciones */}
              <div style={{ display: "flex", gap: "10px", marginTop: "20px", justifyContent: "flex-end" }}>
                <button onClick={() => setShowForm(false)}
                  style={{ padding: "9px 18px", background: "#f1f5f9", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer", color: "#475569" }}>
                  Cancelar
                </button>
                <button onClick={guardar} disabled={saving}
                  style={{ padding: "9px 20px", background: saving ? "#a5b4fc" : "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: saving ? "default" : "pointer" }}>
                  {saving ? "Guardando..." : editando ? "Guardar cambios" : "Crear usuario"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
