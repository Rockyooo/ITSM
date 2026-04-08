import { useState, useEffect } from "react";
import { api } from "../lib/api";

const TIPOS = [
  { id: "incident", label: "Incidente", color: "#EF4444", bg: "#FEF2F2", border: "#FECACA", desc: "Algo no funciona y me impide trabajar" },
  { id: "request",  label: "Requerimiento", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", desc: "Necesito algo nuevo o un cambio" },
  { id: "query",    label: "Consulta", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", desc: "Tengo una pregunta o duda" },
];

const CATEGORIAS: Record<string, string[]> = {
  incident: ["Equipo no enciende","Internet","Correo","Impresora","Sistema lento","Software","Otro"],
  request:  ["Instalacion de software","Nuevo equipo","Acceso a sistema","Cambio de contrasena","Otro"],
  query:    ["Como usar el sistema","Informacion general","Otro"],
};

const PASOS = ["Tipo","Categoria","Detalle","Confirmacion"];

export default function NuevoTicket() {
  const [paso, setPaso] = useState(0);
  const [tipo, setTipo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [urgente, setUrgente] = useState(false);
  const [razonUrgente, setRazonUrgente] = useState("");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [buscandoUsuario, setBuscandoUsuario] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [ticketCreado, setTicketCreado] = useState<any>(null);
  const [error, setError] = useState("");

  // Autocompletar nombre cuando el correo pierde foco
  const buscarUsuario = async () => {
    if (!correo.includes("@")) return;
    setBuscandoUsuario(true);
    try {
      const { data } = await api.get(`/api/v1/public/user-info?email=${correo}`);
      if (data.found && data.full_name) setNombre(data.full_name);
    } catch {}
    finally { setBuscandoUsuario(false); }
  };

  const puedeAvanzar = () => {
    if (paso === 0) return !!tipo;
    if (paso === 1) return !!categoria && (!urgente || razonUrgente.length >= 10);
    if (paso === 2) return nombre.trim().length > 0 && correo.includes("@") && descripcion.length >= 20;
    return true;
  };

  const enviar = async () => {
    setEnviando(true);
    setError("");
    try {
      const { data } = await api.post("/api/v1/public/tickets", {
        full_name: nombre,
        email: correo,
        ticket_type: tipo,
        category: categoria,
        description: descripcion,
        is_urgent: urgente,
        urgent_reason: urgente ? razonUrgente : null,
      });
      setTicketCreado(data);
      setPaso(3);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Error al crear el ticket. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const tipoActual = TIPOS.find(t => t.id === tipo);

  return (
    <div style={{ minHeight:"100vh", background:"#F8F9FC", fontFamily:"'DM Sans',-apple-system,sans-serif", display:"flex", flexDirection:"column", alignItems:"center", padding:"24px 16px" }}>

      {/* Header */}
      <div style={{ width:"100%", maxWidth:"560px", marginBottom:"32px", textAlign:"center" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:"8px", marginBottom:"8px" }}>
          <div style={{ width:"32px", height:"32px", background:"#1D6AE5", borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:"700", fontSize:"14px" }}>F</div>
          <span style={{ fontWeight:"700", fontSize:"15px", color:"#111827" }}>Fusion I.T.</span>
        </div>
        <h1 style={{ margin:"0 0 4px", fontSize:"22px", fontWeight:"700", color:"#111827" }}>Nuevo ticket de soporte</h1>
        <p style={{ margin:0, fontSize:"13px", color:"#9CA3AF" }}>Completa los pasos para registrar tu solicitud</p>
      </div>

      {/* Barra de progreso */}
      {paso < 3 && (
        <div style={{ width:"100%", maxWidth:"560px", marginBottom:"28px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"8px" }}>
            {PASOS.map((p, i) => (
              <div key={p} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"4px", flex:1 }}>
                <div style={{ width:"28px", height:"28px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:"700",
                  background: i < paso ? "#1D6AE5" : i === paso ? "#1D6AE5" : "#E5E7EB",
                  color: i <= paso ? "#fff" : "#9CA3AF" }}>
                  {i < paso ? "?" : i + 1}
                </div>
                <span style={{ fontSize:"10px", color: i <= paso ? "#1D6AE5" : "#9CA3AF", fontWeight: i === paso ? "600" : "400" }}>{p}</span>
              </div>
            ))}
          </div>
          <div style={{ height:"4px", background:"#E5E7EB", borderRadius:"4px", overflow:"hidden" }}>
            <div style={{ height:"100%", background:"#1D6AE5", borderRadius:"4px", width:`${(paso / 2) * 100}%`, transition:"width 0.3s" }} />
          </div>
        </div>
      )}

      {/* Card principal */}
      <div style={{ width:"100%", maxWidth:"560px", background:"#fff", borderRadius:"16px", boxShadow:"0 4px 24px rgba(0,0,0,0.08)", overflow:"hidden" }}>

        {/* PASO 0 � Tipo */}
        {paso === 0 && (
          <div style={{ padding:"28px 24px" }}>
            <h2 style={{ margin:"0 0 6px", fontSize:"17px", fontWeight:"700", color:"#111827" }}>�Que necesitas?</h2>
            <p style={{ margin:"0 0 20px", fontSize:"13px", color:"#9CA3AF" }}>Selecciona el tipo de solicitud</p>
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              {TIPOS.map(t => (
                <div key={t.id} onClick={() => setTipo(t.id)}
                  style={{ display:"flex", alignItems:"center", gap:"14px", padding:"14px 16px", borderRadius:"10px", border:`2px solid ${tipo === t.id ? t.color : "#E5E7EB"}`, background: tipo === t.id ? t.bg : "#fff", cursor:"pointer", transition:"all 0.15s" }}>
                  <div style={{ width:"12px", height:"12px", borderRadius:"50%", background:t.color, flexShrink:0 }} />
                  <div>
                    <div style={{ fontWeight:"600", fontSize:"14px", color:"#111827" }}>{t.label}</div>
                    <div style={{ fontSize:"12px", color:"#6B7280" }}>{t.desc}</div>
                  </div>
                  {tipo === t.id && <div style={{ marginLeft:"auto", color:t.color, fontWeight:"700" }}>?</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PASO 1 � Categoria */}
        {paso === 1 && (
          <div style={{ padding:"28px 24px" }}>
            <h2 style={{ margin:"0 0 6px", fontSize:"17px", fontWeight:"700", color:"#111827" }}>�Cual es la categoria?</h2>
            <p style={{ margin:"0 0 20px", fontSize:"13px", color:"#9CA3AF" }}>Tipo: <strong>{tipoActual?.label}</strong></p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", marginBottom:"20px" }}>
              {(CATEGORIAS[tipo] || []).map(cat => (
                <button key={cat} onClick={() => setCategoria(cat)}
                  style={{ padding:"8px 14px", borderRadius:"20px", border:"1.5px solid", fontSize:"13px", fontWeight:"500", cursor:"pointer", transition:"all 0.15s",
                    background: categoria === cat ? "#1D6AE5" : "#fff",
                    borderColor: categoria === cat ? "#1D6AE5" : "#E5E7EB",
                    color: categoria === cat ? "#fff" : "#374151" }}>
                  {cat}
                </button>
              ))}
            </div>

            {/* URGENTE */}
            <div style={{ padding:"14px 16px", borderRadius:"10px", border:"1.5px solid", borderColor: urgente ? "#EF4444" : "#E5E7EB", background: urgente ? "#FEF2F2" : "#F9FAFB" }}>
              <label style={{ display:"flex", alignItems:"center", gap:"10px", cursor:"pointer" }}>
                <input type="checkbox" checked={urgente} onChange={e => setUrgente(e.target.checked)} style={{ width:"16px", height:"16px", accentColor:"#EF4444" }} />
                <div>
                  <div style={{ fontWeight:"600", fontSize:"13px", color: urgente ? "#EF4444" : "#374151" }}>Marcar como URGENTE</div>
                  <div style={{ fontSize:"11px", color:"#9CA3AF" }}>Solo para situaciones que impiden completamente el trabajo</div>
                </div>
              </label>
              {urgente && (
                <div style={{ marginTop:"12px" }}>
                  <textarea value={razonUrgente} onChange={e => setRazonUrgente(e.target.value)}
                    placeholder="Describe por que es urgente (minimo 10 caracteres)..."
                    style={{ width:"100%", padding:"10px 12px", borderRadius:"8px", border:"1px solid #FECACA", fontSize:"13px", resize:"none", minHeight:"70px", boxSizing:"border-box", outline:"none", fontFamily:"inherit", background:"#fff" }} />
                  <div style={{ fontSize:"11px", color: razonUrgente.length >= 10 ? "#059669" : "#9CA3AF", textAlign:"right" }}>{razonUrgente.length}/10 min</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PASO 2 � Detalle */}
        {paso === 2 && (
          <div style={{ padding:"28px 24px" }}>
            <h2 style={{ margin:"0 0 6px", fontSize:"17px", fontWeight:"700", color:"#111827" }}>Cu�ntanos el detalle</h2>
            <p style={{ margin:"0 0 20px", fontSize:"13px", color:"#9CA3AF" }}>Completa tu informacion y describe el problema</p>
            <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
              <div>
                <label style={{ fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.05em" }}>Correo corporativo *</label>
                <input value={correo} onChange={e => setCorreo(e.target.value)} onBlur={buscarUsuario}
                  placeholder="usuario@empresa.com"
                  style={{ display:"block", width:"100%", marginTop:"4px", padding:"10px 14px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
                {buscandoUsuario && <div style={{ fontSize:"11px", color:"#9CA3AF", marginTop:"4px" }}>Buscando tu informacion...</div>}
              </div>
              <div>
                <label style={{ fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.05em" }}>Nombre completo *</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Tu nombre completo"
                  style={{ display:"block", width:"100%", marginTop:"4px", padding:"10px 14px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
              </div>
              <div>
                <label style={{ fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.05em" }}>Descripcion del problema *</label>
                <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
                  placeholder="Describe detalladamente que esta pasando..."
                  style={{ display:"block", width:"100%", marginTop:"4px", padding:"10px 14px", borderRadius:"8px", border:"1px solid #E5E7EB", fontSize:"13px", minHeight:"100px", resize:"none", outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
                <div style={{ fontSize:"11px", color: descripcion.length >= 20 ? "#059669" : "#9CA3AF", textAlign:"right", marginTop:"2px" }}>{descripcion.length}/20 min</div>
              </div>
              <div>
                <label style={{ fontSize:"11px", fontWeight:"600", color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.05em" }}>Evidencia (opcional)</label>
                <div style={{ marginTop:"4px", border:"1.5px dashed #E5E7EB", borderRadius:"8px", padding:"20px", textAlign:"center", background:"#F9FAFB" }}>
                  <input type="file" id="file-upload" accept="image/*,video/*" style={{ display:"none" }}
                    onChange={e => setArchivo(e.target.files?.[0] || null)} />
                  <label htmlFor="file-upload" style={{ cursor:"pointer" }}>
                    <div style={{ fontSize:"24px", marginBottom:"6px" }}>??</div>
                    <div style={{ fontSize:"13px", color:"#6B7280" }}>
                      {archivo ? <span style={{ color:"#059669", fontWeight:"600" }}>? {archivo.name}</span> : "Toca para subir foto o video (max 20 seg, 5MB)"}
                    </div>
                    {!archivo && <div style={{ fontSize:"11px", color:"#9CA3AF", marginTop:"4px" }}>Desde galeria o camara</div>}
                  </label>
                  {archivo && (
                    <button onClick={() => setArchivo(null)} style={{ marginTop:"8px", fontSize:"11px", color:"#EF4444", background:"none", border:"none", cursor:"pointer" }}>
                      Quitar archivo
                    </button>
                  )}
                </div>
              </div>
            </div>
            {error && <div style={{ marginTop:"14px", padding:"10px 14px", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:"8px", fontSize:"13px", color:"#DC2626" }}>{error}</div>}
          </div>
        )}

        {/* PASO 3 � Confirmacion */}
        {paso === 3 && ticketCreado && (
          <div style={{ padding:"40px 24px", textAlign:"center" }}>
            <div style={{ width:"64px", height:"64px", background:"#ECFDF5", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"28px", margin:"0 auto 16px" }}>?</div>
            <h2 style={{ margin:"0 0 8px", fontSize:"20px", fontWeight:"700", color:"#111827" }}>Ticket creado exitosamente</h2>
            <p style={{ margin:"0 0 24px", fontSize:"13px", color:"#6B7280" }}>Te notificaremos a <strong>{correo}</strong> cuando haya actualizaciones</p>
            <div style={{ background:"#F0FDF4", border:"1.5px solid #86EFAC", borderRadius:"12px", padding:"20px", marginBottom:"24px" }}>
              <div style={{ fontSize:"11px", color:"#6B7280", marginBottom:"4px", textTransform:"uppercase", letterSpacing:"0.05em" }}>Numero de ticket</div>
              <div style={{ fontSize:"28px", fontWeight:"700", color:"#059669", fontFamily:"monospace" }}>{ticketCreado.ticket_number}</div>
              <div style={{ fontSize:"12px", color:"#9CA3AF", marginTop:"4px" }}>Guarda este numero para consultar el estado</div>
            </div>
            <div style={{ background:"#F8F9FC", borderRadius:"10px", padding:"14px 16px", marginBottom:"24px", textAlign:"left" }}>
              <div style={{ fontSize:"12px", color:"#6B7280", marginBottom:"8px", fontWeight:"600" }}>Resumen</div>
              <div style={{ display:"flex", flexDirection:"column", gap:"4px", fontSize:"13px", color:"#374151" }}>
                <div><strong>Tipo:</strong> {TIPOS.find(t => t.id === tipo)?.label}</div>
                <div><strong>Categoria:</strong> {categoria}</div>
                {urgente && <div><strong>Prioridad:</strong> <span style={{ color:"#EF4444", fontWeight:"600" }}>URGENTE</span></div>}
              </div>
            </div>
            <button onClick={() => window.location.href = `/`}
              style={{ padding:"12px 28px", background:"#1D6AE5", color:"#fff", border:"none", borderRadius:"10px", fontSize:"14px", fontWeight:"600", cursor:"pointer" }}>
              Volver al inicio
            </button>
          </div>
        )}

        {/* Footer navegacion */}
        {paso < 3 && (
          <div style={{ padding:"16px 24px", borderTop:"1px solid #E5E7EB", background:"#F9FAFB", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <button onClick={() => paso > 0 ? setPaso(paso - 1) : null} disabled={paso === 0}
              style={{ padding:"10px 20px", background:"none", border:"1px solid #E5E7EB", borderRadius:"8px", fontSize:"13px", color: paso === 0 ? "#D1D5DB" : "#374151", cursor: paso === 0 ? "default" : "pointer" }}>
              Atras
            </button>
            {paso < 2 ? (
              <button onClick={() => puedeAvanzar() && setPaso(paso + 1)} disabled={!puedeAvanzar()}
                style={{ padding:"10px 24px", background: puedeAvanzar() ? "#1D6AE5" : "#E5E7EB", color: puedeAvanzar() ? "#fff" : "#9CA3AF", border:"none", borderRadius:"8px", fontSize:"13px", fontWeight:"600", cursor: puedeAvanzar() ? "pointer" : "default" }}>
                Siguiente
              </button>
            ) : (
              <button onClick={enviar} disabled={!puedeAvanzar() || enviando}
                style={{ padding:"10px 24px", background: puedeAvanzar() && !enviando ? "#059669" : "#E5E7EB", color: puedeAvanzar() && !enviando ? "#fff" : "#9CA3AF", border:"none", borderRadius:"8px", fontSize:"13px", fontWeight:"600", cursor: puedeAvanzar() && !enviando ? "pointer" : "default", display:"flex", alignItems:"center", gap:"8px" }}>
                {enviando ? "Enviando..." : "Enviar ticket"}
              </button>
            )}
          </div>
        )}
      </div>

      <p style={{ marginTop:"24px", fontSize:"11px", color:"#D1D5DB" }}>Fusion I.T. � Mesa de soporte</p>
    </div>
  );
}

