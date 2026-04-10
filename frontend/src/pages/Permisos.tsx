import { useState, useEffect } from "react";
import { api } from "../lib/api";

const PERMISOS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  view_tickets:    { label: "Ver tickets",      color: "#1D6AE5", bg: "#EEF4FF" },
  manage_tickets:  { label: "Gestionar tickets", color: "#D97706", bg: "#FFFBEB" },
  view_inventory:  { label: "Ver inventario",   color: "#7C3AED", bg: "#F5F3FF" },
  view_reports:    { label: "Ver reportes",      color: "#059669", bg: "#ECFDF5" },
  post_comments:   { label: "Comentar/Alertas", color: "#6B7280", bg: "#F3F4F6" },
};

export default function Permisos() {
  const [permisos, setPermisos]     = useState<any[]>([]);
  const [usuarios, setUsuarios]     = useState<any[]>([]);
  const [tenants, setTenants]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [form, setForm] = useState({
    user_id: "", tenant_id: "",
    permissions: [] as string[],
  });

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [p, u, t] = await Promise.all([
        api.get("/api/v1/permissions/"),
        api.get("/api/v1/users/"),
        api.get("/api/v1/permissions/my-tenants"),
      ]);
      setPermisos(p.data);
      setUsuarios(u.data.filter((u: any) => ["technician","supervisor"].includes(u.role)));
      setTenants(t.data);
    } catch {}
    finally { setLoading(false); }
  };

  const togglePermiso = (perm: string) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const guardar = async () => {
    if (!form.user_id || !form.tenant_id || form.permissions.length === 0) {
      setError("Selecciona usuario, empresa y al menos un permiso");
      return;
    }
    setSaving(true); setError("");
    try {
      await api.post("/api/v1/permissions/", form);
      setShowForm(false);
      setForm({ user_id: "", tenant_id: "", permissions: [] });
      cargarDatos();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Error al guardar");
    } finally { setSaving(false); }
  };

  const revocar = async (id: string, nombre: string) => {
    if (!confirm(`Revocar todos los permisos de ${nombre}?`)) return;
    await api.delete(`/api/v1/permissions/${id}`);
    cargarDatos();
  };

  const usuarioSeleccionado = usuarios.find(u => u.id === form.user_id);
  const permisosDisponibles = usuarioSeleccionado?.role === "supervisor"
    ? ["view_tickets", "view_reports", "post_comments"]
    : Object.keys(PERMISOS_LABELS);

  return (
    <div style={{ padding:"24px", fontFamily:"'DM Sans',-apple-system,sans-serif", color:"#111827", maxWidth:"900px", margin:"0 auto" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"24px" }}>
        <div>
          <h1 style={{ margin:"0 0 4px", fontSize:"20px", fontWeight:"700" }}>Control de acceso por empresa</h1>
          <p style={{ margin:0, fontSize:"13px", color:"#9CA3AF" }}>Asigna que empresas puede ver cada tecnico o supervisor</p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ padding:"9px 18px", background:"#1D6AE5", color:"#fff", border:"none", borderRadius:"8px", fontSize:"13px", fontWeight:"600", cursor:"pointer" }}>
          + Asignar acceso
        </button>
      </div>

      {/* Tabla de permisos */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"40px", color:"#9CA3AF" }}>Cargando...</div>
      ) : permisos.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px", background:"#F9FAFB", borderRadius:"12px", border:"1px dashed #E5E7EB" }}>
          <div style={{ fontSize:"32px", marginBottom:"8px" }}>🔒</div>
          <p style={{ color:"#6B7280", fontSize:"14px", margin:0 }}>Sin permisos asignados aún</p>
          <p style={{ color:"#9CA3AF", fontSize:"12px", margin:"4px 0 0" }}>Usa el botón para asignar acceso a un técnico o supervisor</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
          {permisos.map(p => (
            <div key={p.id} style={{ background:"#fff", borderRadius:"10px", border:"1px solid #E5E7EB", padding:"14px 16px", display:"flex", alignItems:"center", gap:"14px" }}>
              {/* Avatar */}
              <div style={{ width:"38px", height:"38px", borderRadius:"50%", background:"#EEF4FF", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"700", fontSize:"13px", color:"#1D6AE5", flexShrink:0 }}>
                {(p.user_name || "?").split(" ").map((n: string) => n[0]).slice(0,2).join("").toUpperCase()}
              </div>
              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"6px" }}>
                  <span style={{ fontWeight:"600", fontSize:"13px" }}>{p.user_name}</span>
                  <span style={{ fontSize:"11px", color:"#9CA3AF" }}>{p.user_email}</span>
                  <span style={{ fontSize:"11px", background:"#F3F4F6", color:"#6B7280", padding:"1px 8px", borderRadius:"99px" }}>
                    {p.tenant_name}
                  </span>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"4px" }}>
                  {(p.permissions || []).map((perm: string) => (
                    <span key={perm} style={{ fontSize:"11px", padding:"2px 8px", borderRadius:"99px",
                      background: PERMISOS_LABELS[perm]?.bg || "#F3F4F6",
                      color: PERMISOS_LABELS[perm]?.color || "#6B7280" }}>
                      {PERMISOS_LABELS[perm]?.label || perm}
                    </span>
                  ))}
                </div>
              </div>
              {/* Acciones */}
              <button onClick={() => revocar(p.id, p.user_name)}
                style={{ padding:"6px 12px", fontSize:"12px", color:"#EF4444", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:"6px", cursor:"pointer" }}>
                Revocar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal asignar */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 }}
          onClick={() => setShowForm(false)}>
          <div style={{ background:"#fff", borderRadius:"14px", width:"100%", maxWidth:"480px", margin:"16px", overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}
            onClick={e => e.stopPropagation()}>

            {/* Header modal */}
            <div style={{ padding:"18px 24px", borderBottom:"1px solid #E5E7EB", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <h2 style={{ margin:0, fontSize:"16px", fontWeight:"700" }}>Asignar acceso</h2>
              <button onClick={() => setShowForm(false)} style={{ background:"none", border:"none", fontSize:"20px", cursor:"pointer", color:"#9CA3AF" }}>x</button>
            </div>

            {/* Body modal */}
            <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:"16px" }}>
              {error && <div style={{ padding:"10px 14px", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:"8px", fontSize:"13px", color:"#DC2626" }}>{error}</div>}

              <div>
                <label style={{ fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.05em" }}>Usuario *</label>
                <select value={form.user_id} onChange={e => setForm({...form, user_id: e.target.value, permissions: []})}
                  style={{ display:"block", width:"100%", marginTop:"4px", padding:"10px 14px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", background:"#fff", outline:"none" }}>
                  <option value="">Selecciona un usuario...</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.role}) � {u.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.05em" }}>Empresa *</label>
                <select value={form.tenant_id} onChange={e => setForm({...form, tenant_id: e.target.value})}
                  style={{ display:"block", width:"100%", marginTop:"4px", padding:"10px 14px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", background:"#fff", outline:"none" }}>
                  <option value="">Selecciona una empresa...</option>
                  {tenants.map(t => (
                    <option key={t.tenant_id} value={t.tenant_id}>{t.tenant_name} ({t.domain})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:"8px" }}>
                  Permisos *
                  {usuarioSeleccionado?.role === "supervisor" && (
                    <span style={{ marginLeft:"8px", color:"#D97706", fontWeight:"400", textTransform:"none" }}>
                      (supervisor � solo lectura + comentarios)
                    </span>
                  )}
                </label>
                <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                  {permisosDisponibles.map(perm => (
                    <label key={perm} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"8px 12px", borderRadius:"8px", border:"1.5px solid",
                      borderColor: form.permissions.includes(perm) ? PERMISOS_LABELS[perm]?.color : "#E5E7EB",
                      background: form.permissions.includes(perm) ? PERMISOS_LABELS[perm]?.bg : "#fff",
                      cursor:"pointer" }}>
                      <input type="checkbox" checked={form.permissions.includes(perm)} onChange={() => togglePermiso(perm)}
                        style={{ accentColor: PERMISOS_LABELS[perm]?.color }} />
                      <span style={{ fontSize:"13px", fontWeight:"500", color: form.permissions.includes(perm) ? PERMISOS_LABELS[perm]?.color : "#374151" }}>
                        {PERMISOS_LABELS[perm]?.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer modal */}
            <div style={{ padding:"14px 24px", borderTop:"1px solid #E5E7EB", background:"#F9FAFB", display:"flex", justifyContent:"flex-end", gap:"10px" }}>
              <button onClick={() => setShowForm(false)} style={{ padding:"9px 18px", background:"none", border:"1px solid #E5E7EB", borderRadius:"8px", fontSize:"13px", cursor:"pointer", color:"#374151" }}>
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving}
                style={{ padding:"9px 20px", background: saving ? "#93C5FD" : "#1D6AE5", color:"#fff", border:"none", borderRadius:"8px", fontSize:"13px", fontWeight:"600", cursor: saving ? "default" : "pointer" }}>
                {saving ? "Guardando..." : "Guardar acceso"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

