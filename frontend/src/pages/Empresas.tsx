import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";

interface Tenant {
  id: string; name: string; slug: string; domain: string;
  nit?: string; phone?: string; contact_email?: string; address?: string;
  logo_url?: string; is_active: boolean; created_at: string;
  total_users: number; total_tickets: number;
}

export default function Empresas() {
  const { user, fetchMe } = useAuthStore();
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Tenant | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", domain: "", nit: "", phone: "", contact_email: "", address: "" });

  useEffect(() => { fetchMe(); cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    try { const { data } = await api.get("/api/v1/tenants/"); setEmpresas(data); }
    catch {} finally { setLoading(false); }
  };
  const abrirCrear = () => { setEditando(null); setForm({ name: "", domain: "", nit: "", phone: "", contact_email: "", address: "" }); setError(""); setShowForm(true); };
  const abrirEditar = (t: Tenant) => { setEditando(t); setForm({ name: t.name, domain: t.domain, nit: t.nit || "", phone: t.phone || "", contact_email: t.contact_email || "", address: t.address || "" }); setError(""); setShowForm(true); };
  const guardar = async () => {
    if (!form.name.trim() || !form.domain.trim()) { setError("Nombre y dominio son obligatorios"); return; }
    setSaving(true); setError("");
    try {
      if (editando) { await api.patch(`/api/v1/tenants/${editando.id}`, form); }
      else { await api.post("/api/v1/tenants/", form); }
      setShowForm(false); cargar();
    } catch (err: any) { setError(err?.response?.data?.detail ?? "Error al guardar"); }
    finally { setSaving(false); }
  };
  const toggleActivo = async (t: Tenant) => {
    if (!confirm(`Deseas ${t.is_active ? "desactivar" : "activar"} la empresa "${t.name}"?`)) return;
    try { await api.patch(`/api/v1/tenants/${t.id}`, { is_active: !t.is_active }); cargar(); }
    catch (err: any) { alert(err?.response?.data?.detail ?? "Error"); }
  };
  const isSuperadmin = user?.role === "superadmin";

  return (
    <div style={{ padding:"24px", fontFamily:"DM Sans,-apple-system,sans-serif", color:"#111827", maxWidth:"1000px", margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"24px" }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"4px" }}>
            <button onClick={() => navigate("/dashboard")} style={{ background:"none", border:"none", color:"#9CA3AF", cursor:"pointer", fontSize:"13px", padding:0 }}>Dashboard</button>
            <span style={{ color:"#E5E7EB" }}>›</span>
            <span style={{ fontSize:"13px", color:"#111827", fontWeight:"600" }}>Empresas</span>
          </div>
          <h1 style={{ margin:"0 0 4px", fontSize:"20px", fontWeight:"700" }}>Empresas cliente</h1>
          <p style={{ margin:0, fontSize:"13px", color:"#9CA3AF" }}>{empresas.length} empresas registradas</p>
        </div>
        {isSuperadmin && (
          <button onClick={abrirCrear} style={{ padding:"9px 18px", background:"#1D6AE5", color:"#fff", border:"none", borderRadius:"8px", fontSize:"13px", fontWeight:"600", cursor:"pointer" }}>
            + Nueva empresa
          </button>
        )}
      </div>
      {loading ? (
        <div style={{ textAlign:"center", padding:"60px", color:"#9CA3AF" }}>Cargando...</div>
      ) : empresas.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px", background:"#F9FAFB", borderRadius:"12px", border:"1px dashed #E5E7EB" }}>
          <p style={{ color:"#6B7280", fontSize:"14px", margin:0 }}>Sin empresas registradas</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
          {empresas.map(t => (
            <div key={t.id} style={{ background:"#fff", borderRadius:"12px", border:"1px solid #E5E7EB", padding:"16px 20px", display:"flex", alignItems:"center", gap:"16px", opacity: t.is_active ? 1 : 0.6 }}>
              <div style={{ width:"44px", height:"44px", borderRadius:"10px", background: t.is_active ? "#EEF4FF" : "#F3F4F6", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"700", fontSize:"16px", color: t.is_active ? "#1D6AE5" : "#9CA3AF", flexShrink:0 }}>
                {t.name[0].toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px" }}>
                  <span style={{ fontWeight:"600", fontSize:"14px" }}>{t.name}</span>
                  <span style={{ fontSize:"11px", padding:"1px 8px", borderRadius:"99px", background: t.is_active ? "#ECFDF5" : "#F3F4F6", color: t.is_active ? "#059669" : "#9CA3AF" }}>
                    {t.is_active ? "Activa" : "Inactiva"}
                  </span>
                </div>
                <div style={{ display:"flex", gap:"16px", fontSize:"12px", color:"#6B7280", flexWrap:"wrap" }}>
                  <span>@{t.domain}</span>
                  {t.nit && <span>NIT: {t.nit}</span>}
                  {t.phone && <span>{t.phone}</span>}
                  <span>{t.total_users} usuarios</span>
                  <span>{t.total_tickets} tickets</span>
                </div>
              </div>
              <div style={{ display:"flex", gap:"8px", flexShrink:0 }}>
                <button onClick={() => abrirEditar(t)} style={{ padding:"6px 14px", fontSize:"12px", color:"#1D6AE5", background:"#EEF4FF", border:"1px solid #BFDBFE", borderRadius:"6px", cursor:"pointer" }}>Editar</button>
                {isSuperadmin && (
                  <button onClick={() => toggleActivo(t)} style={{ padding:"6px 14px", fontSize:"12px", color: t.is_active ? "#EF4444" : "#059669", background: t.is_active ? "#FEF2F2" : "#ECFDF5", border:`1px solid ${t.is_active ? "#FECACA" : "#A7F3D0"}`, borderRadius:"6px", cursor:"pointer" }}>
                    {t.is_active ? "Desactivar" : "Activar"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 }} onClick={() => setShowForm(false)}>
          <div style={{ background:"#fff", borderRadius:"14px", width:"100%", maxWidth:"460px", margin:"16px", overflow:"hidden" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:"18px 24px", borderBottom:"1px solid #E5E7EB", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <h2 style={{ margin:0, fontSize:"16px", fontWeight:"700" }}>{editando ? "Editar empresa" : "Nueva empresa"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background:"none", border:"none", fontSize:"20px", cursor:"pointer", color:"#9CA3AF" }}>x</button>
            </div>
            <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:"16px" }}>
              {error && <div style={{ padding:"10px 14px", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:"8px", fontSize:"13px", color:"#DC2626" }}>{error}</div>}
              <div>
                <label style={{ display:"block", fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"6px" }}>Nombre *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ej: Acme Corp"
                  style={{ display:"block", width:"100%", padding:"10px 14px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
              </div>
              <div>
                <label style={{ display:"block", fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"6px" }}>Dominio *</label>
                <div style={{ display:"flex", alignItems:"center", border:"1px solid #E5E7EB", borderRadius:"8px", overflow:"hidden" }}>
                  <span style={{ padding:"10px 12px", background:"#F9FAFB", borderRight:"1px solid #E5E7EB", fontSize:"13px", color:"#9CA3AF" }}>@</span>
                  <input value={form.domain} onChange={e => setForm({...form, domain: e.target.value})} placeholder="empresa.com"
                    style={{ flex:1, padding:"10px 14px", border:"none", fontSize:"13px", outline:"none", fontFamily:"inherit" }} />
                </div>
                <p style={{ margin:"4px 0 0", fontSize:"11px", color:"#9CA3AF" }}>Los usuarios con este dominio se asociaran automaticamente</p>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                <div>
                  <label style={{ display:"block", fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"6px" }}>NIT</label>
                  <input value={form.nit} onChange={e => setForm({...form, nit: e.target.value})} placeholder="900.123.456-7"
                    style={{ display:"block", width:"100%", padding:"10px 14px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"6px" }}>Telefono</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+57 300 000 0000"
                    style={{ display:"block", width:"100%", padding:"10px 14px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
                </div>
              </div>
              <div>
                <label style={{ display:"block", fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"6px" }}>Correo de contacto</label>
                <input value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} placeholder="contacto@empresa.com"
                  style={{ display:"block", width:"100%", padding:"10px 14px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
              </div>
              <div>
                <label style={{ display:"block", fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"6px" }}>Direccion</label>
                <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Calle 123 # 45-67, Bogota"
                  style={{ display:"block", width:"100%", padding:"10px 14px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
              </div>
            </div>
            <div style={{ padding:"14px 24px", borderTop:"1px solid #E5E7EB", background:"#F9FAFB", display:"flex", justifyContent:"flex-end", gap:"10px" }}>
              <button onClick={() => setShowForm(false)} style={{ padding:"9px 18px", background:"none", border:"1px solid #E5E7EB", borderRadius:"8px", fontSize:"13px", cursor:"pointer", color:"#374151" }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} style={{ padding:"9px 20px", background: saving ? "#93C5FD" : "#1D6AE5", color:"#fff", border:"none", borderRadius:"8px", fontSize:"13px", fontWeight:"600", cursor: saving ? "default" : "pointer" }}>
                {saving ? "Guardando..." : editando ? "Guardar cambios" : "Crear empresa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





