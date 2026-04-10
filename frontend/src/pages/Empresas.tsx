import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { Building2, Users, Ticket, Mail, Phone, UploadCloud, Edit3, PowerOff, CheckCircle2, Globe, FileSpreadsheet, MapPin, Plus, X, Loader2 } from "lucide-react";

interface Tenant {
  id: string; name: string; slug: string; domain: string;
  nit?: string; phone?: string; contact_email?: string; address?: string;
  logo_url?: string; is_active: boolean; created_at: string;
  total_users: number; total_tickets: number;
}

interface Sede {
  id: string; tenant_id: string; name: string;
  city: string; address?: string; phone?: string;
  is_main: boolean; is_active: boolean;
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

  // SEDES ESTADO
  const [showSedesModal, setShowSedesModal] = useState<Tenant | null>(null);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loadingSedes, setLoadingSedes] = useState(false);
  const [savingSede, setSavingSede] = useState(false);
  const [sedeForm, setSedeForm] = useState({ id: "", name: "", city: "", address: "", phone: "", is_main: false });
  const [showSedeForm, setShowSedeForm] = useState(false);

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
    if (!confirm(`¿Deseas ${t.is_active ? "desactivar" : "activar"} la empresa "${t.name}"?`)) return;
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

  // FUNCIONES DE SEDES
  const administrarSedes = async (t: Tenant) => {
    setShowSedesModal(t); setShowSedeForm(false);
    setLoadingSedes(true);
    try {
      const { data } = await api.get(`/api/v1/tenants/${t.id}/sedes`);
      setSedes(data);
    } catch (error) { console.error(error); }
    finally { setLoadingSedes(false); }
  };

  const guardarSede = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSedesModal) return;
    setSavingSede(true);
    try {
      if (sedeForm.id) {
        await api.patch(`/api/v1/tenants/${showSedesModal.id}/sedes/${sedeForm.id}`, sedeForm);
      } else {
        await api.post(`/api/v1/tenants/${showSedesModal.id}/sedes`, sedeForm);
      }
      setShowSedeForm(false);
      // recargar sedes
      const { data } = await api.get(`/api/v1/tenants/${showSedesModal.id}/sedes`);
      setSedes(data);
    } catch (error: any) {
      alert("Error al guardar sede: " + (error?.response?.data?.detail || "Desconocido"));
    } finally {
      setSavingSede(false);
    }
  };

  const eliminarSede = async (sedeId: string) => {
    if (!showSedesModal || !confirm("¿Eliminar sede?")) return;
    try {
      await api.delete(`/api/v1/tenants/${showSedesModal.id}/sedes/${sedeId}`);
      setSedes(sedes.filter(s => s.id !== sedeId));
    } catch (error) { alert("No se pudo eliminar"); }
  };

  const isSuperadmin = user?.role === "superadmin" || user?.role === "admin";

  return (
    <div style={{ padding:"24px", fontFamily:"'DM Sans',-apple-system,sans-serif", color:"#1e1b4b", maxWidth:"1100px", margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"30px" }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"6px" }}>
            <button onClick={() => navigate("/dashboard")} style={{ background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:"13px", padding:0, fontWeight:"600", transition:"color 0.2s" }} onMouseEnter={e=>e.currentTarget.style.color="#1e1b4b"} onMouseLeave={e=>e.currentTarget.style.color="#9ca3af"}>Dashboard</button>
            <span style={{ color:"#e5e7eb" }}>/</span>
            <span style={{ fontSize:"13px", color:"#1e1b4b", fontWeight:"700", background:"#f5f3ff", padding:"4px 10px", borderRadius:"6px", color:"#6d28d9" }}>Empresas</span>
          </div>
          <h1 style={{ margin:"0 0 6px", fontSize:"26px", fontWeight:"800", letterSpacing:"-0.02em" }}>Cuentas empresariales</h1>
          <p style={{ margin:0, fontSize:"14px", color:"#6b7280" }}>Hay {empresas.length} empresas registradas en la plataforma</p>
        </div>
        {isSuperadmin && (
          <button onClick={abrirCrear} style={{ 
            display:"flex", alignItems:"center", gap:"8px",
            padding:"10px 20px", background:"linear-gradient(135deg, #6366f1, #8b5cf6)", 
            color:"#fff", border:"none", borderRadius:"12px", fontSize:"14px", fontWeight:"700", 
            cursor:"pointer", boxShadow:"0 4px 14px rgba(99,102,241,0.3) ", transition:"transform 0.15s, box-shadow 0.15s" 
          }}
          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 6px 20px rgba(99,102,241,0.4)";}}
          onMouseLeave={e=>{e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="0 4px 14px rgba(99,102,241,0.3)";}}
          >
            <Building2 size={18} strokeWidth={2.5} /> Nueva empresa
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:"80px", color:"#a78bfa", display:"flex", flexDirection:"column", alignItems:"center", gap:"10px" }}>
          <Loader2 size={32} style={{ animation:"spin 1s linear infinite" }} />
          <span style={{ fontWeight:"600" }}>Cargando directorio...</span>
        </div>
      ) : empresas.length === 0 ? (
        <div style={{ textAlign:"center", padding:"80px", background:"#fff", borderRadius:"20px", border:"1.5px dashed #e5e7eb" }}>
          <Building2 size={48} color="#cbd5e1" style={{ marginBottom:"16px" }} />
          <h3 style={{ margin:"0 0 8px", color:"#1e1b4b", fontSize:"18px" }}>Directorio vacío</h3>
          <p style={{ color:"#6b7280", fontSize:"14px", margin:0 }}>Comienza agregando tu primera empresa cliente.</p>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap:"20px" }}>
          {empresas.map(t => (
            <div 
              key={t.id} 
              style={{ 
                background:"#fff", 
                borderRadius:"20px", 
                border:"1px solid #f3f4f6", 
                padding:"24px", 
                display:"flex", 
                flexDirection: "column",
                gap:"20px", 
                opacity: t.is_active ? 1 : 0.65,
                boxShadow: "0 4px 6px rgba(0,0,0,0.02)",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(99,102,241,0.08)'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = '#f3f4f6'; }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                <div style={{ 
                  width:"56px", height:"56px", borderRadius:"14px", 
                  background: t.is_active ? "linear-gradient(135deg, #eef2ff, #f5f3ff)" : "#f1f5f9", 
                  display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"800", fontSize:"22px", 
                  color: t.is_active ? "#6366f1" : "#94a3b8", flexShrink:0, border: t.is_active ? "1px solid #c7d2fe" : "none" 
                }}>
                  {t.name[0].toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px" }}>
                    <span style={{ fontWeight:"800", fontSize:"17px", color: "#1e1b4b", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.name}</span>
                    <span style={{ fontSize:"10px", padding:"3px 8px", borderRadius:"99px", background: t.is_active ? "#ecfdf5" : "#f1f5f9", color: t.is_active ? "#059669" : "#64748b", fontWeight: "700", display: "flex", alignItems: "center", gap: "3px", border: t.is_active ? "1px solid #a7f3d0" : "1px solid #e2e8f0" }}>
                      {t.is_active ? <><CheckCircle2 size={10} strokeWidth={3} /> ACTIVA</> : "INACTIVA"}
                    </span>
                  </div>
                  <div style={{ display:"flex", alignItems: "center", gap:"6px", fontSize:"13px", color:"#6b7280", fontWeight:"500" }}>
                    <Globe size={14} color="#a78bfa" /> {t.domain}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns:"1fr 1fr", gap: "10px" }}>
                <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "12px 14px", border: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase", letterSpacing:"0.05em", marginBottom:"4px" }}>Usuarios</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "16px", fontWeight: "800", color: "#1e1b4b" }}>
                    <Users size={16} color="#3b82f6" /> {t.total_users}
                  </div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "12px 14px", border: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase", letterSpacing:"0.05em", marginBottom:"4px" }}>Tickets</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "16px", fontWeight: "800", color: "#1e1b4b" }}>
                    <Ticket size={16} color="#ec4899" /> {t.total_tickets}
                  </div>
                </div>
              </div>

              <div style={{ display:"flex", gap:"8px", marginTop: "auto" }}>
                {isSuperadmin && (
                  <>
                    <button 
                      onClick={() => administrarSedes(t)} 
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding:"10px", fontSize:"13px", color:"#4f46e5", background:"#eef2ff", border:"1px solid #c7d2fe", borderRadius:"10px", cursor:"pointer", transition: "all 0.2s", fontWeight: "700" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#e0e7ff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#eef2ff'; }}
                    >
                      <MapPin size={16} /> Sedes
                    </button>
                    <label style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding:"10px", fontSize:"13px", color:"#059669", background:"#ecfdf5", border:"1px solid #a7f3d0", borderRadius:"10px", cursor:"pointer", transition: "all 0.2s", fontWeight: "700" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#d1fae5'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#ecfdf5'; }}
                    >
                      <FileSpreadsheet size={16} />
                      {importing === t.id ? "..." : "Excel AD"}
                      <input type="file" accept=".xlsx,.xls" style={{ display:"none" }}
                        onChange={e => { if (e.target.files?.[0]) importarExcel(t.id, e.target.files[0]); (e.target as HTMLInputElement).value = ""; }} />
                    </label>

                    <button 
                      onClick={() => abrirEditar(t)} 
                      style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", color:"#475569", background:"transparent", border:"1px solid #e2e8f0", borderRadius:"10px", cursor:"pointer", transition: "all 0.2s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                      title="Editar Empresa"
                    >
                      <Edit3 size={16} strokeWidth={2.5} />
                    </button>

                    <button 
                      onClick={() => toggleActivo(t)} 
                      style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", color: t.is_active ? "#ef4444" : "#10b981", background: t.is_active ? "#fef2f2" : "#f0fdf4", border:`1px solid ${t.is_active ? "#fecaca" : "#a7f3d0"}`, borderRadius:"10px", cursor:"pointer", transition: "all 0.2s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.95)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
                      title={t.is_active ? "Desactivar Empresa" : "Activar Empresa"}
                    >
                      <PowerOff size={16} strokeWidth={2.5} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RESULTADO IMPORTACION */}
      {importResult && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:60, backdropFilter:"blur(4px)" }} onClick={() => setImportResult(null)}>
          <div style={{ background:"#fff", borderRadius:"20px", width:"100%", maxWidth:"460px", margin:"16px", padding:"32px", boxShadow:"0 24px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", gap:"16px", marginBottom:"24px" }}>
              <div style={{ width:"56px", height:"56px", borderRadius:"16px", background: importResult.ok ? "#ECFDF5" : "#FEF2F2", display:"flex", alignItems:"center", justifyContent:"center", color: importResult.ok ? "#059669" : "#EF4444" }}>
                {importResult.ok ? <CheckCircle2 size={32} /> : "!"}
              </div>
              <div>
                <h3 style={{ margin:"0 0 4px", fontWeight:"800", fontSize:"20px", color:"#1e1b4b" }}>{importResult.ok ? "Importación exitosa" : "Error de sincronización"}</h3>
                <p style={{ margin:0, fontSize:"14px", color:"#6b7280" }}>{importResult.mensaje}</p>
              </div>
            </div>
            {importResult.ok && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"24px" }}>
                {[
                  { label:"Usuarios creados", value: importResult.creados, color:"#059669", bg:"#ecfdf5" },
                  { label:"Actualizados", value: importResult.actualizados, color:"#2563eb", bg:"#eff6ff" },
                  { label:"Procesados total", value: importResult.total_procesados, color:"#1e1b4b", bg:"#f1f5f9" },
                  { label:"Bajas/Errores", value: importResult.errores?.length || 0, color:"#ef4444", bg:"#fef2f2" },
                ].map(k => (
                  <div key={k.label} style={{ padding:"16px", background:k.bg, borderRadius:"16px" }}>
                    <div style={{ fontSize:"28px", fontWeight:"800", color:k.color, lineHeight:1, marginBottom:"6px" }}>{k.value}</div>
                    <div style={{ fontSize:"12px", color:"#64748b", fontWeight:"600", textTransform:"uppercase" }}>{k.label}</div>
                  </div>
                ))}
              </div>
            )}
            {importResult.ok && <div style={{ fontSize:"13px", color:"#475569", background:"#f8fafc", padding:"12px 16px", borderRadius:"10px", marginBottom:"24px", border:"1px solid #e2e8f0" }}>Contraseña temporal generada para nuevos: <strong style={{ color:"#1e1b4b" }}>Cambiar2026!</strong></div>}
            <button onClick={() => setImportResult(null)} style={{ width:"100%", padding:"14px", background:"#1e1b4b", color:"#fff", border:"none", borderRadius:"12px", fontSize:"15px", fontWeight:"700", cursor:"pointer" }}>Cerrar reporte</button>
          </div>
        </div>
      )}

      {/* FORMULARIO EMPRESA */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:60, backdropFilter:"blur(4px)" }} onClick={() => setShowForm(false)}>
          <div style={{ background:"#fff", borderRadius:"24px", width:"100%", maxWidth:"500px", margin:"16px", overflow:"hidden", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:"24px", borderBottom:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:"#fff", zIndex:10 }}>
              <div>
                <h2 style={{ margin:"0 0 4px", fontSize:"20px", fontWeight:"800", color:"#1e1b4b" }}>{editando ? "Editar empresa" : "Registrar empresa"}</h2>
                <p style={{ margin:0, fontSize:"13px", color:"#64748b" }}>Información comercial y facturación</p>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background:"#f1f5f9", border:"none", width:"36px", height:"36px", borderRadius:"50%", cursor:"pointer", color:"#64748b", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={18} /></button>
            </div>
            <div style={{ padding:"24px", display:"flex", flexDirection:"column", gap:"16px" }}>
              {error && <div style={{ padding:"12px 16px", background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"12px", fontSize:"13px", color:"#dc2626", fontWeight:"500" }}>{error}</div>}
              <div>
                <label style={{ display:"block", fontSize:"11px", fontWeight:"700", color:"#6366f1", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"6px" }}>Nombre Oficial *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ej: Acme Corp S.A."
                  style={{ display:"block", width:"100%", padding:"12px 16px", borderRadius:"12px", border:"1.5px solid #e2e8f0", fontSize:"14px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
              </div>
              <div>
                <label style={{ display:"block", fontSize:"11px", fontWeight:"700", color:"#6366f1", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"6px" }}>Dominio corporativo *</label>
                <div style={{ display:"flex", alignItems:"center", border:"1.5px solid #e2e8f0", borderRadius:"12px", overflow:"hidden" }}>
                  <span style={{ padding:"12px 16px", background:"#f8fafc", borderRight:"1.5px solid #e2e8f0", fontSize:"14px", color:"#94a3b8", fontWeight:"800" }}>@</span>
                  <input value={form.domain} onChange={e => setForm({...form, domain: e.target.value})} placeholder="empresa.com"
                    style={{ flex:1, padding:"12px 16px", border:"none", fontSize:"14px", outline:"none", fontFamily:"inherit" }} />
                </div>
                <p style={{ margin:"6px 0 0", fontSize:"11px", color:"#94a3b8", fontWeight:"500" }}>Los tickets desde este dominio se auto-asignarán aquí.</p>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
                <div>
                  <label style={{ display:"block", fontSize:"11px", fontWeight:"700", color:"#6366f1", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"6px" }}>NIT / Identificación</label>
                  <input value={form.nit} onChange={e => setForm({...form, nit: e.target.value})} placeholder="900.123.456-7"
                    style={{ display:"block", width:"100%", padding:"12px 16px", borderRadius:"12px", border:"1.5px solid #e2e8f0", fontSize:"14px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:"11px", fontWeight:"700", color:"#6366f1", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"6px" }}>Teléfono Principal</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+57 ..."
                    style={{ display:"block", width:"100%", padding:"12px 16px", borderRadius:"12px", border:"1.5px solid #e2e8f0", fontSize:"14px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
                </div>
              </div>
              <div>
                <label style={{ display:"block", fontSize:"11px", fontWeight:"700", color:"#6366f1", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"6px" }}>Correo Facturación / Contacto</label>
                <input value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} placeholder="administracion@empresa.com"
                  style={{ display:"block", width:"100%", padding:"12px 16px", borderRadius:"12px", border:"1.5px solid #e2e8f0", fontSize:"14px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
              </div>
              <div>
                <label style={{ display:"block", fontSize:"11px", fontWeight:"700", color:"#6366f1", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"6px" }}>Dirección corporativa</label>
                <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Calle Principal 123..."
                  style={{ display:"block", width:"100%", padding:"12px 16px", borderRadius:"12px", border:"1.5px solid #e2e8f0", fontSize:"14px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
              </div>
            </div>
            <div style={{ padding:"20px 24px", borderTop:"1px solid #f1f5f9", background:"#f8fafc", display:"flex", justifyContent:"flex-end", gap:"12px", position:"sticky", bottom:0 }}>
              <button onClick={() => setShowForm(false)} style={{ padding:"12px 24px", background:"#fff", border:"1px solid #cbd5e1", borderRadius:"12px", fontSize:"14px", cursor:"pointer", color:"#475569", fontWeight:"600" }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} style={{ padding:"12px 24px", background: saving ? "#818cf8" : "linear-gradient(135deg, #6366f1, #8b5cf6)", color:"#fff", border:"none", borderRadius:"12px", fontSize:"14px", fontWeight:"700", cursor: saving ? "default" : "pointer", boxShadow:"0 4px 14px rgba(99,102,241,0.2)" }}>
                {saving ? "Guardando..." : "Confirmar datos"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SEDES */}
      {showSedesModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:60, backdropFilter:"blur(4px)" }} onClick={() => {setShowSedesModal(null); setShowSedeForm(false);}}>
          <div style={{ background:"#fff", borderRadius:"24px", width:"100%", maxWidth:"600px", margin:"16px", overflow:"hidden", maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 24px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:"24px", borderBottom:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <h2 style={{ margin:"0 0 4px", fontSize:"20px", fontWeight:"800", color:"#1e1b4b", display:"flex", alignItems:"center", gap:"8px" }}><MapPin size={22} color="#6366f1" /> Sedes de la Empresa</h2>
                <p style={{ margin:0, fontSize:"14px", color:"#64748b" }}>{showSedesModal.name} · {sedes.length} sucursales físicas</p>
              </div>
              <button onClick={() => setShowSedesModal(null)} style={{ background:"#f1f5f9", border:"none", width:"36px", height:"36px", borderRadius:"50%", cursor:"pointer", color:"#64748b", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={18} /></button>
            </div>
            
            <div style={{ padding:"20px 24px", flex: 1, overflowY: "auto", background:"#f8fafc" }}>
              {loadingSedes ? (
                <div style={{ padding: "40px", textAlign: "center", color:"#94a3b8" }}><Loader2 size={24} style={{ animation:"spin 1s linear infinite", margin:"0 auto" }} /></div>
              ) : sedes.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color:"#64748b", background:"#fff", borderRadius:"16px", border:"1.5px dashed #cbd5e1" }}>No hay sedes creadas para esta empresa.</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                  {sedes.map(s => (
                    <div key={s.id} style={{ background:"#fff", padding:"16px", borderRadius:"16px", border:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"center", boxShadow:"0 2px 4px rgba(0,0,0,0.02)" }}>
                      <div>
                        <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px" }}>
                          <strong style={{ fontSize:"15px", color:"#1e1b4b" }}>{s.name}</strong>
                          {s.is_main && <span style={{ fontSize:"10px", background:"#fef3c7", color:"#b45309", padding:"2px 8px", borderRadius:"20px", fontWeight:"700" }}>SEDE PRINCIPAL</span>}
                        </div>
                        <div style={{ fontSize:"13px", color:"#64748b" }}>{s.city} {s.address && `· ${s.address}`} {s.phone && `· ${s.phone}`}</div>
                      </div>
                      <div style={{ display:"flex", gap:"6px" }}>
                        <button onClick={() => { setSedeForm({ id: s.id, name: s.name, city: s.city, address: s.address || "", phone: s.phone || "", is_main: s.is_main }); setShowSedeForm(true); }} style={{ padding:"8px", background:"#eef2ff", color:"#4f46e5", border:"none", borderRadius:"8px", cursor:"pointer" }}><Edit3 size={16} /></button>
                        <button onClick={() => eliminarSede(s.id)} style={{ padding:"8px", background:"#fef2f2", color:"#ef4444", border:"none", borderRadius:"8px", cursor:"pointer" }}><X size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulario de nueva Sede IN-LINE */}
              {showSedeForm && (
                <form onSubmit={guardarSede} style={{ marginTop:"20px", background:"#fff", border:"1.5px solid #c7d2fe", borderRadius:"16px", padding:"20px", boxShadow:"0 8px 20px rgba(99,102,241,0.1)" }}>
                  <h4 style={{ margin:"0 0 16px", color:"#1e1b4b", fontSize:"15px", fontWeight:"800" }}>{sedeForm.id ? "Editando Sede" : "Agregando Nueva Sede"}</h4>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
                    <div>
                      <label style={{ fontSize:"11px", fontWeight:"700", color:"#64748b", display:"block", marginBottom:"4px" }}>Nombre Sede *</label>
                      <input required value={sedeForm.name} onChange={e=>setSedeForm({...sedeForm, name: e.target.value})} placeholder="Ej: Oficina Central Norte" style={{ width:"100%", padding:"10px", borderRadius:"8px", border:"1px solid #cbd5e1", outline:"none", boxSizing:"border-box" }} />
                    </div>
                    <div>
                      <label style={{ fontSize:"11px", fontWeight:"700", color:"#64748b", display:"block", marginBottom:"4px" }}>Ciudad *</label>
                      <input required value={sedeForm.city} onChange={e=>setSedeForm({...sedeForm, city: e.target.value})} placeholder="Bogotá" style={{ width:"100%", padding:"10px", borderRadius:"8px", border:"1px solid #cbd5e1", outline:"none", boxSizing:"border-box" }} />
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:"12px", marginBottom:"16px" }}>
                    <div>
                      <label style={{ fontSize:"11px", fontWeight:"700", color:"#64748b", display:"block", marginBottom:"4px" }}>Dirección</label>
                      <input value={sedeForm.address} onChange={e=>setSedeForm({...sedeForm, address: e.target.value})} placeholder="Avenida..." style={{ width:"100%", padding:"10px", borderRadius:"8px", border:"1px solid #cbd5e1", outline:"none", boxSizing:"border-box" }} />
                    </div>
                    <div>
                      <label style={{ fontSize:"11px", fontWeight:"700", color:"#64748b", display:"block", marginBottom:"4px" }}>Teléfono</label>
                      <input value={sedeForm.phone} onChange={e=>setSedeForm({...sedeForm, phone: e.target.value})} placeholder="+57..." style={{ width:"100%", padding:"10px", borderRadius:"8px", border:"1px solid #cbd5e1", outline:"none", boxSizing:"border-box" }} />
                    </div>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <label style={{ display:"flex", alignItems:"center", gap:"6px", fontSize:"13px", fontWeight:"600", color:"#475569", cursor:"pointer" }}>
                      <input type="checkbox" checked={sedeForm.is_main} onChange={e=>setSedeForm({...sedeForm, is_main: e.target.checked})} style={{ accentColor:"#6366f1", width:"16px", height:"16px" }} /> Identificar como Sede Principal
                    </label>
                    <div style={{ display:"flex", gap:"8px" }}>
                      <button type="button" onClick={() => setShowSedeForm(false)} style={{ padding:"8px 16px", background:"none", border:"1px solid #cbd5e1", borderRadius:"8px", color:"#475569", fontWeight:"600", cursor:"pointer" }}>Cancelar</button>
                      <button type="submit" disabled={savingSede} style={{ padding:"8px 16px", background:"#6366f1", color:"#fff", border:"none", borderRadius:"8px", fontWeight:"700", cursor:"pointer" }}>{savingSede ? "Guardando..." : "Guardar sede"}</button>
                    </div>
                  </div>
                </form>
              )}
            </div>

            <div style={{ padding:"20px", borderTop:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between" }}>
              <button onClick={() => {setSedeForm({ id: "", name: "", city: "", address: "", phone: "", is_main: false }); setShowSedeForm(true);}} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"10px 16px", background:"#eef2ff", color:"#4f46e5", border:"none", borderRadius:"10px", fontWeight:"700", cursor:"pointer" }}>
                <Plus size={16} /> Agregar sede
              </button>
              <button onClick={() => {setShowSedesModal(null); setShowSedeForm(false);}} style={{ padding:"10px 24px", background:"#1e1b4b", color:"#fff", border:"none", borderRadius:"10px", fontWeight:"700", cursor:"pointer" }}>
                Cerrar Administrador
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}