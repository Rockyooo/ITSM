import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { Building2, Users, Ticket, Mail, Phone, UploadCloud, Edit3, PowerOff, CheckCircle2, Globe, FileSpreadsheet } from "lucide-react";

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
  const [importing, setImporting] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<any>(null);

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

  const importarExcel = async (tenantId: string, file: File) => {
    setImporting(tenantId); setImportResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const { data } = await api.post(`/api/v1/import/users/${tenantId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setImportResult(data); cargar();
    } catch (err: any) {
      setImportResult({ ok: false, mensaje: err?.response?.data?.detail ?? "Error al importar" });
    } finally { setImporting(null); }
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
        <div style={{ display:"grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap:"16px" }}>
          {empresas.map(t => (
            <div 
              key={t.id} 
              style={{ 
                background:"#fff", 
                borderRadius:"16px", 
                border:"1px solid #f1f5f9", 
                padding:"20px", 
                display:"flex", 
                flexDirection: "column",
                gap:"16px", 
                opacity: t.is_active ? 1 : 0.6,
                boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(79,70,229,0.08)'; e.currentTarget.style.borderColor = '#e0e7ff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = '#f1f5f9'; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width:"50px", height:"50px", borderRadius:"12px", background: t.is_active ? "linear-gradient(135deg, #4f46e5, #7c3aed)" : "#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"800", fontSize:"20px", color: t.is_active ? "#fff" : "#94a3b8", flexShrink:0, boxShadow: t.is_active ? "0 4px 10px rgba(79,70,229,0.3)" : "none" }}>
                  {t.name[0].toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px" }}>
                    <span style={{ fontWeight:"700", fontSize:"15px", color: "#0f172a" }}>{t.name}</span>
                    <span style={{ fontSize:"10px", padding:"2px 8px", borderRadius:"99px", background: t.is_active ? "#ecfdf5" : "#f1f5f9", color: t.is_active ? "#059669" : "#64748b", fontWeight: "600", display: "flex", alignItems: "center", gap: "3px" }}>
                      {t.is_active ? <><CheckCircle2 size={10} /> Activa</> : "Inactiva"}
                    </span>
                  </div>
                  <div style={{ display:"flex", alignItems: "center", gap:"6px", fontSize:"12px", color:"#64748b" }}>
                    <Globe size={12} /> {t.domain}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", background: "#f8fafc", borderRadius: "10px", padding: "10px", gap: "12px", border: "1px solid #f1f5f9" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>Usuarios</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: "600", color: "#334155" }}><Users size={14} color="#6366f1" /> {t.total_users}</div>
                </div>
                <div style={{ width: "1px", background: "#e2e8f0" }}></div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>Tickets</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: "600", color: "#334155" }}><Ticket size={14} color="#ec4899" /> {t.total_tickets}</div>
                </div>
                {t.nit && (
                  <>
                    <div style={{ width: "1px", background: "#e2e8f0" }}></div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>NIT</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: "600", color: "#334155" }}>{t.nit}</div>
                    </div>
                  </>
                )}
              </div>

              <div style={{ display:"flex", gap:"8px", marginTop: "auto" }}>
                <label style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding:"8px", fontSize:"12px", color:"#4f46e5", background:"#e0e7ff", borderRadius:"8px", cursor:"pointer", transition: "all 0.2s", fontWeight: "600" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#c7d2fe'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#e0e7ff'; }}
                >
                  <FileSpreadsheet size={14} />
                  {importing === t.id ? "..." : "Importar"}
                  <input type="file" accept=".xlsx,.xls" style={{ display:"none" }}
                    onChange={e => { if (e.target.files?.[0]) importarExcel(t.id, e.target.files[0]); (e.target as HTMLInputElement).value = ""; }} />
                </label>

                <button 
                  onClick={() => abrirEditar(t)} 
                  style={{ width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center", color:"#475569", background:"transparent", border:"1px solid #e2e8f0", borderRadius:"8px", cursor:"pointer", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
                  title="Editar Empresa"
                >
                  <Edit3 size={15} />
                </button>

                {isSuperadmin && (
                  <button 
                    onClick={() => toggleActivo(t)} 
                    style={{ width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center", color: t.is_active ? "#ef4444" : "#10b981", background: t.is_active ? "#fef2f2" : "#f0fdf4", border:`1px solid ${t.is_active ? "#fecaca" : "#a7f3d0"}`, borderRadius:"8px", cursor:"pointer", transition: "all 0.2s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.95)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
                    title={t.is_active ? "Desactivar Empresa" : "Activar Empresa"}
                  >
                    <PowerOff size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {importResult && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 }} onClick={() => setImportResult(null)}>
          <div style={{ background:"#fff", borderRadius:"14px", width:"100%", maxWidth:"460px", margin:"16px", padding:"24px", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"16px" }}>
              <div style={{ width:"44px", height:"44px", borderRadius:"50%", background: importResult.ok ? "#ECFDF5" : "#FEF2F2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", fontWeight:"700", color: importResult.ok ? "#059669" : "#EF4444" }}>
                {importResult.ok ? "OK" : "!"}
              </div>
              <div>
                <div style={{ fontWeight:"700", fontSize:"15px" }}>{importResult.ok ? "Importacion exitosa" : "Error"}</div>
                <div style={{ fontSize:"13px", color:"#6B7280" }}>{importResult.mensaje}</div>
              </div>
            </div>
            {importResult.ok && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"16px" }}>
                {[
                  { label:"Usuarios creados", value: importResult.creados, color:"#059669" },
                  { label:"Actualizados", value: importResult.actualizados, color:"#1D6AE5" },
                  { label:"Total procesados", value: importResult.total_procesados, color:"#111827" },
                  { label:"Errores", value: importResult.errores?.length || 0, color:"#EF4444" },
                ].map(k => (
                  <div key={k.label} style={{ padding:"12px", background:"#F9FAFB", borderRadius:"8px", border:"1px solid #E5E7EB" }}>
                    <div style={{ fontSize:"11px", color:"#9CA3AF", marginBottom:"2px" }}>{k.label}</div>
                    <div style={{ fontSize:"22px", fontWeight:"700", color:k.color }}>{k.value}</div>
                  </div>
                ))}
              </div>
            )}
            {importResult.ok && <div style={{ fontSize:"12px", color:"#9CA3AF", marginBottom:"16px" }}>Contrasena temporal: <strong>Cambiar2026!</strong></div>}
            {importResult.errores?.length > 0 && (
              <div style={{ padding:"10px", background:"#FEF2F2", borderRadius:"8px", fontSize:"12px", color:"#DC2626", marginBottom:"16px" }}>
                {importResult.errores.slice(0,3).map((e: string, i: number) => <div key={i}>{e}</div>)}
              </div>
            )}
            <button onClick={() => setImportResult(null)} style={{ width:"100%", padding:"10px", background:"#1D6AE5", color:"#fff", border:"none", borderRadius:"8px", fontSize:"13px", fontWeight:"600", cursor:"pointer" }}>Cerrar</button>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 }} onClick={() => setShowForm(false)}>
          <div style={{ background:"#fff", borderRadius:"14px", width:"100%", maxWidth:"460px", margin:"16px", overflow:"hidden", maxHeight:"90vh", overflowY:"auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:"18px 24px", borderBottom:"1px solid #E5E7EB", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:"#fff" }}>
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
            <div style={{ padding:"14px 24px", borderTop:"1px solid #E5E7EB", background:"#F9FAFB", display:"flex", justifyContent:"flex-end", gap:"10px", position:"sticky", bottom:0 }}>
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