import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  superadmin:  { label: "Superadmin",  color: "#7C3AED", bg: "#F5F3FF" },
  admin:       { label: "Admin",       color: "#1D6AE5", bg: "#EEF4FF" },
  technician:  { label: "Tecnico",     color: "#D97706", bg: "#FFFBEB" },
  supervisor:  { label: "Supervisor",  color: "#059669", bg: "#ECFDF5" },
  user:        { label: "Usuario",     color: "#6B7280", bg: "#F3F4F6" },
};
const ROLES_CREABLES = ["admin", "technician", "supervisor", "user"];
interface Usuario { id: string; full_name: string; email: string; role: string; is_active: boolean; tenant_id?: string; phone?: string; position?: string; created_at: string; }
interface FormData { full_name: string; email: string; password: string; role: string; phone: string; position: string; tenant_id: string; is_active: boolean; }
const FORM_INICIAL: FormData = { full_name: "", email: "", password: "", role: "technician", phone: "", position: "", tenant_id: "", is_active: true };
export default function Usuarios() {
  const { user, fetchMe, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
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
  useEffect(() => { fetchMe(); cargar(); }, []);
  const cargar = async () => {
    setLoading(true);
    try {
      const [u, t] = await Promise.all([api.get("/api/v1/users/"), api.get("/api/v1/tenants/")]);
      setUsuarios(u.data); setTenants(t.data);
    } catch {} finally { setLoading(false); }
  };
  const abrirCrear = () => { setEditando(null); setForm(FORM_INICIAL); setError(""); setShowForm(true); };
  const abrirEditar = (u: Usuario) => {
    setEditando(u);
    setForm({ full_name: u.full_name, email: u.email, password: "", role: u.role, phone: u.phone || "", position: u.position || "", tenant_id: u.tenant_id || "", is_active: u.is_active });
    setError(""); setShowForm(true);
  };
  const guardar = async () => {
    if (!form.full_name.trim() || !form.email.trim()) { setError("Nombre y email son obligatorios"); return; }
    if (!editando && !form.password.trim()) { setError("La contrasena es obligatoria"); return; }
    setSaving(true); setError("");
    try {
      const payload: any = { full_name: form.full_name, email: form.email, role: form.role, phone: form.phone || null, position: form.position || null, tenant_id: form.tenant_id || null, is_active: form.is_active };
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
  const eliminar = async (u: Usuario) => {
    try { await api.delete(`/api/v1/users/${u.id}`); setConfirmDelete(null); cargar(); }
    catch (err: any) { alert(err?.response?.data?.detail ?? "No se pudo eliminar"); }
  };
  const filtrados = usuarios.filter(u => filtroRol === "all" || u.role === filtroRol).filter(u => busqueda === "" || u.full_name.toLowerCase().includes(busqueda.toLowerCase()) || u.email.toLowerCase().includes(busqueda.toLowerCase()));
  const kpis = [
    { label: "Total", value: usuarios.length, color: "#1D6AE5" },
    { label: "Activos", value: usuarios.filter(u => u.is_active).length, color: "#059669" },
    { label: "Tecnicos", value: usuarios.filter(u => u.role === "technician").length, color: "#D97706" },
    { label: "Supervisores", value: usuarios.filter(u => u.role === "supervisor").length, color: "#7C3AED" },
  ];
  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#F9FAFB", fontFamily: "sans-serif" }}>
      <main style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ background:"#fff", borderBottom:"1px solid #E5E7EB", padding:"0 24px", height:"56px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div><h1 style={{ margin:0, fontSize:"16px", fontWeight:"700" }}>Usuarios</h1><p style={{ margin:0, fontSize:"12px", color:"#9CA3AF" }}>{usuarios.length} usuarios registrados</p></div>
          <button onClick={abrirCrear} style={{ padding:"8px 16px", background:"#1D6AE5", color:"#fff", border:"none", borderRadius:"8px", cursor:"pointer", fontSize:"13px", fontWeight:"600" }}>+ Nuevo usuario</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"12px", padding:"16px 24px", borderBottom:"1px solid #E5E7EB" }}>
          {kpis.map(k => (
            <div key={k.label} style={{ background:"#fff", borderRadius:"10px", padding:"14px 16px", border:"1px solid #E5E7EB" }}>
              <p style={{ margin:"0 0 4px", fontSize:"11px", color:"#9CA3AF", fontWeight:"500", textTransform:"uppercase" }}>{k.label}</p>
              <p style={{ margin:0, fontSize:"26px", fontWeight:"700", color:k.color }}>{k.value}</p>
            </div>
          ))}
        </div>
        <div style={{ padding:"12px 24px", borderBottom:"1px solid #E5E7EB", background:"#fff", display:"flex", gap:"10px", alignItems:"center" }}>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre o email..." style={{ flex:1, maxWidth:"300px", padding:"8px 12px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", outline:"none" }} />
          <div style={{ display:"flex", gap:"6px" }}>
            {["all",...ROLES_CREABLES,"superadmin"].map(r => (
              <button key={r} onClick={() => setFiltroRol(r)} style={{ padding:"5px 12px", borderRadius:"20px", border:"1px solid", fontSize:"12px", cursor:"pointer", background: filtroRol===r ? "#1D6AE5" : "#fff", borderColor: filtroRol===r ? "#1D6AE5" : "#E5E7EB", color: filtroRol===r ? "#fff" : "#6B7280" }}>
                {r === "all" ? "Todos" : ROLE_CONFIG[r]?.label ?? r}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"16px 24px" }}>
          {loading ? <div style={{ textAlign:"center", padding:"60px", color:"#9CA3AF" }}>Cargando...</div>
          : filtrados.length === 0 ? <div style={{ textAlign:"center", padding:"60px", background:"#fff", borderRadius:"12px", border:"1px dashed #E5E7EB" }}><p style={{ color:"#6B7280", margin:0 }}>No hay usuarios que coincidan</p></div>
          : (
            <div style={{ background:"#fff", borderRadius:"12px", border:"1px solid #E5E7EB", overflow:"hidden" }}>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr 120px", padding:"10px 16px", background:"#F9FAFB", borderBottom:"1px solid #E5E7EB" }}>
                {["Usuario","Email","Rol","Empresa","Estado","Acciones"].map(h => <span key={h} style={{ fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase" }}>{h}</span>)}
              </div>
              {filtrados.map((u, i) => {
                const tenant = tenants.find(t => t.id === u.tenant_id);
                return (
                  <div key={u.id} style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr 120px", padding:"12px 16px", alignItems:"center", borderBottom: i < filtrados.length-1 ? "1px solid #F3F4F6" : "none", background: !u.is_active ? "#FAFAFA" : "#fff" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                      <div style={{ width:"34px", height:"34px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:"700", background: u.is_active ? "#EEF4FF" : "#F3F4F6", color: u.is_active ? "#1D6AE5" : "#9CA3AF" }}>
                        {u.full_name.split(" ").map((n: string) => n[0]).slice(0,2).join("").toUpperCase()}
                      </div>
                      <div><div style={{ fontSize:"13px", fontWeight:"600", color: u.is_active ? "#111827" : "#9CA3AF" }}>{u.full_name}</div>{u.position && <div style={{ fontSize:"11px", color:"#9CA3AF" }}>{u.position}</div>}</div>
                    </div>
                    <div style={{ fontSize:"13px", color:"#6B7280", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.email}</div>
                    <div><span style={{ fontSize:"11px", padding:"2px 10px", borderRadius:"99px", fontWeight:"500", background: ROLE_CONFIG[u.role]?.bg ?? "#F3F4F6", color: ROLE_CONFIG[u.role]?.color ?? "#6B7280" }}>{ROLE_CONFIG[u.role]?.label ?? u.role}</span></div>
                    <div style={{ fontSize:"12px", color:"#6B7280" }}>{tenant?.name ?? "-"}</div>
                    <div>
                      <button onClick={() => toggleActivo(u)} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"4px 10px", borderRadius:"99px", border:"1px solid", fontSize:"11px", cursor:"pointer", background: u.is_active ? "#ECFDF5" : "#F3F4F6", borderColor: u.is_active ? "#A7F3D0" : "#E5E7EB", color: u.is_active ? "#059669" : "#9CA3AF" }}>
                        <span style={{ width:"6px", height:"6px", borderRadius:"50%", background: u.is_active ? "#059669" : "#D1D5DB", display:"inline-block" }}></span>
                        {u.is_active ? "Activo" : "Inactivo"}
                      </button>
                    </div>
                    <div style={{ display:"flex", gap:"6px" }}>
                      <button onClick={() => abrirEditar(u)} style={{ padding:"5px 12px", fontSize:"12px", color:"#1D6AE5", background:"#EEF4FF", border:"1px solid #BFDBFE", borderRadius:"6px", cursor:"pointer" }}>Editar</button>
                      {u.id !== user?.id && <button onClick={() => setConfirmDelete(u)} style={{ padding:"5px 10px", fontSize:"12px", color:"#EF4444", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:"6px", cursor:"pointer" }}>x</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 }} onClick={() => setShowForm(false)}>
          <div style={{ background:"#fff", borderRadius:"16px", width:"100%", maxWidth:"520px", margin:"16px", overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:"18px 24px", borderBottom:"1px solid #E5E7EB", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div><h2 style={{ margin:0, fontSize:"16px", fontWeight:"700" }}>{editando ? "Editar usuario" : "Nuevo usuario"}</h2>{editando && <p style={{ margin:"2px 0 0", fontSize:"12px", color:"#9CA3AF" }}>{editando.email}</p>}</div>
              <button onClick={() => setShowForm(false)} style={{ background:"none", border:"none", fontSize:"20px", cursor:"pointer", color:"#9CA3AF" }}>x</button>
            </div>
            <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:"14px", maxHeight:"70vh", overflowY:"auto" }}>
              {error && <div style={{ padding:"10px 14px", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:"8px", fontSize:"13px", color:"#DC2626" }}>{error}</div>}
              <div><label style={{ fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase" }}>Nombre completo *</label><input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="Ej: Carlos Ramirez" style={{ display:"block", width:"100%", marginTop:"4px", padding:"10px 14px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", outline:"none", boxSizing:"border-box" }} /></div>
              <div><label style={{ fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase" }}>Email *</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="usuario@empresa.com" style={{ display:"block", width:"100%", marginTop:"4px", padding:"10px 14px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", outline:"none", boxSizing:"border-box" }} /></div>
              <div><label style={{ fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase" }}>{editando ? "Contrasena (vacio = no cambiar)" : "Contrasena *"}</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder={editando ? "........" : "Min. 8 caracteres"} style={{ display:"block", width:"100%", marginTop:"4px", padding:"10px 14px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", outline:"none", boxSizing:"border-box" }} /></div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                <div><label style={{ fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase" }}>Rol *</label><select value={form.role} onChange={e => setForm({...form, role: e.target.value})} style={{ display:"block", width:"100%", marginTop:"4px", padding:"10px 14px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", background:"#fff", outline:"none" }}>{ROLES_CREABLES.map(r => <option key={r} value={r}>{ROLE_CONFIG[r]?.label ?? r}</option>)}</select></div>
                <div><label style={{ fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase" }}>Empresa</label><select value={form.tenant_id} onChange={e => setForm({...form, tenant_id: e.target.value})} style={{ display:"block", width:"100%", marginTop:"4px", padding:"10px 14px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", background:"#fff", outline:"none" }}><option value="">Sin empresa</option>{tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                <div><label style={{ fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase" }}>Telefono</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+57 300 000 0000" style={{ display:"block", width:"100%", marginTop:"4px", padding:"10px 14px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", outline:"none", boxSizing:"border-box" }} /></div>
                <div><label style={{ fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase" }}>Cargo</label><input value={form.position} onChange={e => setForm({...form, position: e.target.value})} placeholder="Ej: Tecnico N1" style={{ display:"block", width:"100%", marginTop:"4px", padding:"10px 14px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", outline:"none", boxSizing:"border-box" }} /></div>
              </div>
              <label style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 14px", borderRadius:"8px", border:"1.5px solid", borderColor: form.is_active ? "#A7F3D0" : "#E5E7EB", background: form.is_active ? "#F0FDF4" : "#F9FAFB", cursor:"pointer" }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} style={{ accentColor:"#059669", width:"16px", height:"16px" }} />
                <div><div style={{ fontSize:"13px", fontWeight:"600", color: form.is_active ? "#059669" : "#6B7280" }}>{form.is_active ? "Usuario activo" : "Usuario inactivo"}</div><div style={{ fontSize:"11px", color:"#9CA3AF" }}>{form.is_active ? "Puede iniciar sesion" : "No puede acceder"}</div></div>
              </label>
              {form.role === "supervisor" && <div style={{ padding:"10px 14px", background:"#ECFDF5", border:"1px solid #A7F3D0", borderRadius:"8px", fontSize:"12px", color:"#059669" }}><strong>Supervisor:</strong> Ve tickets, comenta y envia cotizaciones. Ideal para contabilidad.</div>}
            </div>
            <div style={{ padding:"14px 24px", borderTop:"1px solid #E5E7EB", background:"#F9FAFB", display:"flex", justifyContent:"flex-end", gap:"10px" }}>
              <button onClick={() => setShowForm(false)} style={{ padding:"9px 18px", background:"none", border:"1px solid #E5E7EB", borderRadius:"8px", fontSize:"13px", cursor:"pointer", color:"#374151" }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} style={{ padding:"9px 20px", background: saving ? "#93C5FD" : "#1D6AE5", color:"#fff", border:"none", borderRadius:"8px", fontSize:"13px", fontWeight:"600", cursor: saving ? "default" : "pointer" }}>{saving ? "Guardando..." : editando ? "Guardar cambios" : "Crear usuario"}</button>
            </div>
          </div>
        </div>
      )}
      {confirmDelete && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 }} onClick={() => setConfirmDelete(null)}>
          <div style={{ background:"#fff", borderRadius:"14px", width:"100%", maxWidth:"400px", margin:"16px", padding:"24px", boxShadow:"0 20px 60px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin:"0 0 8px", fontSize:"16px", fontWeight:"700", textAlign:"center" }}>Eliminar usuario?</h3>
            <p style={{ margin:"0 0 20px", fontSize:"13px", color:"#6B7280", textAlign:"center" }}>Se eliminara <strong>{confirmDelete.full_name}</strong> permanentemente.</p>
            <div style={{ display:"flex", gap:"10px" }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex:1, padding:"10px", background:"#F3F4F6", color:"#374151", border:"none", borderRadius:"8px", fontSize:"13px", cursor:"pointer" }}>Cancelar</button>
              <button onClick={() => eliminar(confirmDelete)} style={{ flex:1, padding:"10px", background:"#EF4444", color:"#fff", border:"none", borderRadius:"8px", fontSize:"13px", fontWeight:"600", cursor:"pointer" }}>Si, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
