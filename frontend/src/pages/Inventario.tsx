import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";

interface Asset {
  id: string;
  tenant_id: string;
  name: string;
  asset_type: string;
  serial_number: string;
  assigned_to: string;
  status: string;
  created_at: string;
}

export default function Inventario() {
  const { user, fetchMe } = useAuthStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Asset | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", asset_type: "Hardware", serial_number: "", assigned_to: "", status: "active" });

  useEffect(() => { fetchMe(); cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/v1/assets/");
      setAssets(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  const abrirCrear = () => { setEditando(null); setForm({ name: "", asset_type: "Hardware", serial_number: "", assigned_to: "", status: "active" }); setError(""); setShowForm(true); };
  const abrirEditar = (a: Asset) => { setEditando(a); setForm({ name: a.name, asset_type: a.asset_type || "Hardware", serial_number: a.serial_number || "", assigned_to: a.assigned_to || "", status: a.status || "active" }); setError(""); setShowForm(true); };

  const guardar = async () => {
    if (!form.name.trim()) { setError("El nombre es obligatorio"); return; }
    setSaving(true); setError("");
    try {
      if (editando) { await api.patch(`/api/v1/assets/${editando.id}`, form); }
      else { await api.post("/api/v1/assets/", form); }
      setShowForm(false); cargar();
    } catch (err: any) { setError(err?.response?.data?.detail ?? "Error al guardar"); }
    finally { setSaving(false); }
  };

  const eliminar = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar activo ${name}?`)) return;
    try {
      await api.delete(`/api/v1/assets/${id}`);
      cargar();
    } catch (err: any) { alert(err?.response?.data?.detail ?? "Error al eliminar"); }
  }

  const isSuperadmin = user?.role === "superadmin" || user?.role === "admin";

  return (
    <div style={{ display: "flex", backgroundColor: "#F9FAFB", fontFamily: "sans-serif", height: "100%" }}>
      <main style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ background:"#fff", borderBottom:"1px solid #E5E7EB", padding:"0 24px", height:"56px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div><h1 style={{ margin:0, fontSize:"16px", fontWeight:"700" }}>Inventario de Activos</h1><p style={{ margin:0, fontSize:"12px", color:"#9CA3AF" }}>{assets.length} activos registrados</p></div>
          {isSuperadmin && <button onClick={abrirCrear} style={{ padding:"8px 16px", background:"#1D6AE5", color:"#fff", border:"none", borderRadius:"8px", cursor:"pointer", fontSize:"13px", fontWeight:"600" }}>+ Nuevo activo</button>}
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"16px 24px" }}>
          {loading ? <div style={{ textAlign:"center", padding:"60px", color:"#9CA3AF" }}>Cargando...</div>
          : assets.length === 0 ? <div style={{ textAlign:"center", padding:"60px", background:"#fff", borderRadius:"12px", border:"1px dashed #E5E7EB" }}><p style={{ color:"#6B7280", margin:0 }}>No hay activos registrados</p></div>
          : (
            <div style={{ background:"#fff", borderRadius:"12px", border:"1px solid #E5E7EB", overflow:"hidden" }}>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 120px", padding:"10px 16px", background:"#F9FAFB", borderBottom:"1px solid #E5E7EB" }}>
                {["Nombre","Tipo","Serial","Estado","Acciones"].map(h => <span key={h} style={{ fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase" }}>{h}</span>)}
              </div>
              {assets.map((a, i) => (
                <div key={a.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 120px", padding:"12px 16px", alignItems:"center", borderBottom: i < assets.length-1 ? "1px solid #F3F4F6" : "none" }}>
                  <div style={{ fontWeight: "600", fontSize: "14px", color: "#111827" }}>{a.name}</div>
                  <div style={{ fontSize: "13px", color: "#6B7280" }}>{a.asset_type}</div>
                  <div style={{ fontSize: "13px", color: "#6B7280", fontFamily: "monospace" }}>{a.serial_number || "-"}</div>
                  <div><span style={{ fontSize: "11px", background: a.status === 'active' ? '#ECFDF5' : '#F3F4F6', color: a.status === 'active' ? '#059669' : '#6B7280', padding: '2px 8px', borderRadius: '20px' }}>{a.status === 'active' ? 'Activo' : 'Inactivo'}</span></div>
                  <div style={{ display:"flex", gap:"6px" }}>
                    {isSuperadmin && <button onClick={() => abrirEditar(a)} style={{ padding:"5px 12px", fontSize:"12px", color:"#1D6AE5", background:"#EEF4FF", border:"1px solid #BFDBFE", borderRadius:"6px", cursor:"pointer" }}>Editar</button>}
                    {isSuperadmin && <button onClick={() => eliminar(a.id, a.name)} style={{ padding:"5px 10px", fontSize:"12px", color:"#EF4444", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:"6px", cursor:"pointer" }}>x</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 }} onClick={() => setShowForm(false)}>
          <div style={{ background:"#fff", borderRadius:"16px", width:"100%", maxWidth:"420px", margin:"16px", overflow:"hidden" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:"18px 24px", borderBottom:"1px solid #E5E7EB", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <h2 style={{ margin:0, fontSize:"16px", fontWeight:"700" }}>{editando ? "Editar activo" : "Nuevo activo"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background:"none", border:"none", fontSize:"20px", cursor:"pointer", color:"#9CA3AF" }}>x</button>
            </div>
            <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:"14px" }}>
              {error && <div style={{ padding:"10px 14px", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:"8px", fontSize:"13px", color:"#DC2626" }}>{error}</div>}
              <div><label style={{ fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase" }}>Nombre del activo *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ej: Laptop DELL XPS 13" style={{ display:"block", width:"100%", marginTop:"4px", padding:"10px 14px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", outline:"none", boxSizing:"border-box" }} /></div>
              <div><label style={{ fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase" }}>Tipo</label><input value={form.asset_type} onChange={e => setForm({...form, asset_type: e.target.value})} placeholder="Hardware, Licencia..." style={{ display:"block", width:"100%", marginTop:"4px", padding:"10px 14px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", outline:"none", boxSizing:"border-box" }} /></div>
              <div><label style={{ fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase" }}>Nu mero de serie</label><input value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} style={{ display:"block", width:"100%", marginTop:"4px", padding:"10px 14px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", outline:"none", boxSizing:"border-box" }} /></div>
              <div>
                <label style={{ fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase" }}>Estado</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} style={{ display:"block", width:"100%", marginTop:"4px", padding:"10px 14px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", background:"#fff", outline:"none" }}>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="maintenance">E n mantenimiento</option>
                </select>
              </div>
            </div>
            <div style={{ padding:"14px 24px", borderTop:"1px solid #E5E7EB", background:"#F9FAFB", display:"flex", justifyContent:"flex-end", gap:"10px" }}>
              <button onClick={() => setShowForm(false)} style={{ padding:"9px 18px", background:"none", border:"1px solid #E5E7EB", borderRadius:"8px", fontSize:"13px", cursor:"pointer", color:"#374151" }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} style={{ padding:"9px 20px", background: saving ? "#93C5FD" : "#1D6AE5", color:"#fff", border:"none", borderRadius:"8px", fontSize:"13px", fontWeight:"600", cursor: saving ? "default" : "pointer" }}>{saving ? "Guardando..." : "Guardar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
