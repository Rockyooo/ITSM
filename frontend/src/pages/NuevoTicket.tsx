import { useState } from "react";
import { api } from "../lib/api";
import { 
  AlertCircle, Wrench, HelpCircle, UploadCloud, X, Check, Zap, 
  ArrowRight, ArrowLeft, Mail, User, AlignLeft, AlertTriangle 
} from "lucide-react";

const TIPOS = [
  { id: "incident", label: "Incidente", color: "#EF4444", bg: "#FEF2F2", border: "#FECACA", icon: AlertCircle, desc: "Algo no funciona y me impide trabajar de inmediato" },
  { id: "request",  label: "Requerimiento", color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", icon: Wrench, desc: "Necesito una nueva herramienta, acceso o configuración" },
  { id: "query",    label: "Consulta", color: "#3B82F6", bg: "#EFF6FF", border: "#BFDBFE", icon: HelpCircle, desc: "Tengo una duda o necesito información sobre un proceso" },
];

const CATEGORIAS: Record<string, string[]> = {
  incident: ["Equipo no enciende", "Internet sin conexión", "Fallo de Correo", "Problema de Impresora", "Sistema extremadamente lento", "Error de Software", "Otro"],
  request:  ["Instalación de software", "Solicitud de Nuevo equipo", "Gestión de Accesos", "Cambio de contraseña", "Otro"],
  query:    ["¿Cómo usar el sistema?", "Información general sobre herramientas", "Otro"],
};

const PASOS = ["Tipo", "Categoría", "Detalle", "Confirmación"];

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
    <div style={{ 
      minHeight:"100vh", 
      background:"linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)", 
      fontFamily:"'Inter', -apple-system, sans-serif", 
      display:"flex", 
      flexDirection:"column", 
      alignItems:"center", 
      padding:"40px 16px" 
    }}>
      <style>{`
        .step-btn { transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
        .step-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(99,102,241,0.2); }
        .step-btn:active:not(:disabled) { transform: translateY(0px); }
        
        .type-card { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); border: 2px solid transparent; }
        .type-card:hover { transform: translateY(-3px) scale(1.01); box-shadow: 0 12px 24px rgba(0,0,0,0.06); border-color: rgba(99,102,241,0.2) !important; }
        
        .cat-btn { transition: all 0.2s ease; border: 1.5px solid #E5E7EB; }
        .cat-btn:hover:not(.active) { background: #f8fafc; border-color: #cbd5e1; transform: translateY(-1px); }
        
        .input-field { transition: all 0.25s ease; border: 1.5px solid #e2e8f0; background: rgba(255,255,255,0.8); }
        .input-field:focus { outline: none; border-color: #6366f1; background: #fff; box-shadow: 0 0 0 4px rgba(99,102,241,0.1); }
        
        .glass-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02);
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade { animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {/* Header */}
      <div className="animate-fade" style={{ width:"100%", maxWidth:"600px", marginBottom:"36px", textAlign:"center" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:"10px", padding:"8px 16px", background:"#fff", borderRadius:"100px", boxShadow:"0 4px 12px rgba(0,0,0,0.03)", marginBottom:"16px" }}>
          <div style={{ width:"28px", height:"28px", background:"linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 8px rgba(99,102,241,0.4)" }}>
            <Zap size={16} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight:"800", fontSize:"14px", letterSpacing:"-0.02em", background:"linear-gradient(90deg, #1e1b4b, #4338ca)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            Fusion I.T.
          </span>
        </div>
        <h1 style={{ margin:"0 0 8px", fontSize:"28px", fontWeight:"800", color:"#0f172a", letterSpacing:"-0.03em" }}>Nuevo ticket de soporte</h1>
        <p style={{ margin:0, fontSize:"14px", color:"#64748b" }}>Completa los pasos para registrar tu solicitud y te ayudaremos enseguida.</p>
      </div>

      {/* Progreso (con animaciones y gradientes) */}
      {paso < 3 && (
        <div className="animate-fade" style={{ width:"100%", maxWidth:"600px", marginBottom:"32px", animationDelay:"0.1s" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"12px", position:"relative" }}>
            <div style={{ position:"absolute", top:"14px", left:"20px", right:"20px", height:"3px", background:"#e2e8f0", zIndex:0, borderRadius:"2px" }} />
            <div style={{ position:"absolute", top:"14px", left:"20px", right:"20px", height:"3px", background:"linear-gradient(90deg, #6366f1, #8b5cf6)", zIndex:1, borderRadius:"2px", width:`${(paso / 2) * 100}%`, transition:"width 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }} />
            
            {PASOS.map((p, i) => {
              const active = i <= paso;
              const current = i === paso;
              return (
                <div key={p} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"8px", zIndex:2 }}>
                  <div style={{ 
                    width:"32px", height:"32px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:"700", transition:"all 0.3s",
                    background: active ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#f1f5f9",
                    color: active ? "#fff" : "#94a3b8",
                    boxShadow: current ? "0 0 0 4px rgba(99,102,241,0.2)" : (active ? "0 2px 8px rgba(99,102,241,0.3)" : "none"),
                    border: active ? "none" : "2px solid #e2e8f0"
                  }}>
                    {i < paso ? <Check size={16} strokeWidth={3} /> : i + 1}
                  </div>
                  <span style={{ fontSize:"11px", color: current ? "#4338ca" : (active ? "#64748b" : "#94a3b8"), fontWeight: current ? "700" : "500", textTransform:"uppercase", letterSpacing:"0.05em" }}>{p}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="glass-card animate-fade" style={{ width:"100%", maxWidth:"600px", borderRadius:"24px", overflow:"hidden", animationDelay:"0.2s" }}>
        
        {/* PASO 0 - Tipo */}
        {paso === 0 && (
          <div style={{ padding:"40px 32px" }}>
            <h2 style={{ margin:"0 0 8px", fontSize:"22px", fontWeight:"800", color:"#0f172a", letterSpacing:"-0.02em" }}>¿Qué necesitas?</h2>
            <p style={{ margin:"0 0 28px", fontSize:"14px", color:"#64748b" }}>Selecciona el tipo de solicitud para enrutarla correctamente.</p>
            <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
              {TIPOS.map(t => {
                const isSelected = tipo === t.id;
                return (
                  <div key={t.id} onClick={() => setTipo(t.id)} className="type-card"
                    style={{ 
                      display:"flex", alignItems:"center", gap:"16px", padding:"20px", borderRadius:"16px", 
                      background: isSelected ? t.bg : "#fff", 
                      border: `2px solid ${isSelected ? t.color : "#e2e8f0"}`,
                      cursor:"pointer", position:"relative", overflow:"hidden",
                      boxShadow: isSelected ? `0 8px 24px ${t.color}20` : "0 2px 8px rgba(0,0,0,0.02)"
                    }}>
                    <div style={{ width:"48px", height:"48px", borderRadius:"14px", background: isSelected ? t.color : "#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.3s" }}>
                      <t.icon size={24} color={isSelected ? "#fff" : t.color} strokeWidth={isSelected ? 2.5 : 2} />
                    </div>
                    <div>
                      <div style={{ fontWeight:"800", fontSize:"16px", color:"#0f172a", marginBottom:"2px" }}>{t.label}</div>
                      <div style={{ fontSize:"13px", color:"#64748b", lineHeight:"1.4" }}>{t.desc}</div>
                    </div>
                    {isSelected && (
                      <div style={{ position:"absolute", right:"20px", top:"50%", transform:"translateY(-50%)", color:t.color }}>
                        <Check size={24} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PASO 1 - Categoría */}
        {paso === 1 && (
          <div className="animate-fade" style={{ padding:"40px 32px" }}>
            <h2 style={{ margin:"0 0 8px", fontSize:"22px", fontWeight:"800", color:"#0f172a", letterSpacing:"-0.02em" }}>¿Cuál es la categoría?</h2>
            <p style={{ margin:"0 0 28px", fontSize:"14px", color:"#64748b", display:"flex", alignItems:"center", gap:"6px" }}>
              Analizando: <span style={{ padding:"4px 10px", background:tipoActual?.bg, color:tipoActual?.color, borderRadius:"100px", fontWeight:"700", fontSize:"12px" }}>{tipoActual?.label}</span>
            </p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"10px", marginBottom:"32px" }}>
              {(CATEGORIAS[tipo] || []).map(cat => {
                const isSelected = categoria === cat;
                return (
                  <button key={cat} onClick={() => setCategoria(cat)} className={`cat-btn ${isSelected ? 'active' : ''}`}
                    style={{ 
                      padding:"10px 18px", borderRadius:"100px", fontSize:"14px", fontWeight: isSelected ? "700" : "500", cursor:"pointer",
                      background: isSelected ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#fff",
                      borderColor: isSelected ? "transparent" : "#e2e8f0",
                      color: isSelected ? "#fff" : "#475569",
                      boxShadow: isSelected ? "0 4px 12px rgba(99,102,241,0.3)" : "0 1px 3px rgba(0,0,0,0.02)"
                    }}>
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* URGENTE toggle con estilo premium */}
            <div style={{ padding:"20px", borderRadius:"16px", border:`2px solid ${urgente ? "#fca5a5" : "#e2e8f0"}`, background: urgente ? "linear-gradient(to right, #fef2f2, #fff)" : "#f8fafc", transition:"all 0.3s" }}>
              <label style={{ display:"flex", alignItems:"center", gap:"14px", cursor:"pointer" }}>
                <div style={{ position:"relative", width:"44px", height:"24px", background: urgente ? "#ef4444" : "#cbd5e1", borderRadius:"100px", transition:"all 0.3s", flexShrink:0 }}>
                  <div style={{ position:"absolute", top:"2px", left: urgente ? "22px" : "2px", width:"20px", height:"20px", background:"#fff", borderRadius:"50%", transition:"all 0.3s", boxShadow:"0 2px 4px rgba(0,0,0,0.1)" }} />
                </div>
                <input type="checkbox" checked={urgente} onChange={e => setUrgente(e.target.checked)} style={{ display:"none" }} />
                <div>
                  <div style={{ fontWeight:"800", fontSize:"14px", color: urgente ? "#b91c1c" : "#334155", display:"flex", alignItems:"center", gap:"6px" }}>
                    {urgente && <AlertTriangle size={16} strokeWidth={2.5} />}
                    Marcar como URGENTE
                  </div>
                  <div style={{ fontSize:"12px", color:"#64748b", marginTop:"2px" }}>Solo si el incidente detiene por completo la operatividad de la empresa.</div>
                </div>
              </label>
              
              {urgente && (
                <div className="animate-fade" style={{ marginTop:"16px" }}>
                  <textarea value={razonUrgente} onChange={e => setRazonUrgente(e.target.value)}
                    placeholder="Explica brevemente por qué esto debe priorizarse (mínimo 10 caracteres)..."
                    className="input-field"
                    style={{ width:"100%", padding:"14px", borderRadius:"12px", fontSize:"14px", resize:"none", minHeight:"80px", boxSizing:"border-box", fontFamily:"inherit", color:"#0f172a", borderColor:"#fca5a5" }} />
                  <div style={{ fontSize:"12px", color: razonUrgente.length >= 10 ? "#059669" : "#ef4444", textAlign:"right", marginTop:"4px", fontWeight:"600" }}>{razonUrgente.length} chars (mín 10)</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PASO 2 - Detalle */}
        {paso === 2 && (
          <div className="animate-fade" style={{ padding:"40px 32px" }}>
            <h2 style={{ margin:"0 0 8px", fontSize:"22px", fontWeight:"800", color:"#0f172a", letterSpacing:"-0.02em" }}>Cuéntanos el detalle</h2>
            <p style={{ margin:"0 0 28px", fontSize:"14px", color:"#64748b" }}>Ingresa tu información de contacto para que los analistas inicien soporte.</p>
            
            <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
              <div style={{ display:"flex", gap:"16px" }}>
                <div style={{ flex:1 }}>
                  <label style={{ display:"flex", alignItems:"center", gap:"6px", fontSize:"12px", fontWeight:"700", color:"#475569", marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                    <Mail size={14} /> Correo corporativo *
                  </label>
                  <input value={correo} onChange={e => setCorreo(e.target.value)} onBlur={buscarUsuario}
                    placeholder="nombre@tu-empresa.com" className="input-field"
                    style={{ display:"block", width:"100%", padding:"12px 16px", borderRadius:"12px", fontSize:"14px", boxSizing:"border-box", fontFamily:"inherit", color:"#0f172a" }} />
                  {buscandoUsuario && <div style={{ fontSize:"12px", color:"#6366f1", marginTop:"6px", fontWeight:"600", display:"flex", alignItems:"center", gap:"4px" }}><Zap size={12} /> Consultando BD...</div>}
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ display:"flex", alignItems:"center", gap:"6px", fontSize:"12px", fontWeight:"700", color:"#475569", marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                    <User size={14} /> Nombre completo *
                  </label>
                  <input value={nombre} onChange={e => setNombre(e.target.value)}
                    placeholder="Juan Pérez" className="input-field"
                    style={{ display:"block", width:"100%", padding:"12px 16px", borderRadius:"12px", fontSize:"14px", boxSizing:"border-box", fontFamily:"inherit", color:"#0f172a" }} />
                </div>
              </div>

              <div>
                <label style={{ display:"flex", alignItems:"center", gap:"6px", fontSize:"12px", fontWeight:"700", color:"#475569", marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                  <AlignLeft size={14} /> Descripción del problema *
                </label>
                <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
                  placeholder="Detalla lo máximo posible qué estabas intentando hacer, qué fallo ocurrió y en qué área..." className="input-field"
                  style={{ display:"block", width:"100%", padding:"16px", borderRadius:"12px", fontSize:"14px", minHeight:"120px", resize:"none", boxSizing:"border-box", fontFamily:"inherit", color:"#0f172a", lineHeight:"1.5" }} />
                <div style={{ fontSize:"12px", color: descripcion.length >= 20 ? "#059669" : "#94a3b8", textAlign:"right", marginTop:"6px", fontWeight:"600" }}>{descripcion.length} / 20 chars mínimos</div>
              </div>

              <div>
                <label style={{ fontSize:"12px", fontWeight:"700", color:"#475569", marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.05em", display:"block" }}>
                  Evidencia visual (Captura o Video)
                </label>
                <div style={{ padding:"24px", border:"2px dashed #cbd5e1", borderRadius:"16px", textAlign:"center", background:"#f8fafc", transition:"all 0.3s", position:"relative", overflow:"hidden" }}>
                  <input type="file" id="file-upload" accept="image/*,video/*" style={{ position:"absolute", inset:0, opacity:0, cursor:"pointer", width:"100%", height:"100%" }}
                    onChange={e => setArchivo(e.target.files?.[0] || null)} />
                  <div style={{ pointerEvents:"none" }}>
                    <UploadCloud size={32} color={archivo ? "#10b981" : "#94a3b8"} style={{ margin:"0 auto 12px" }} />
                    {archivo ? (
                      <div>
                         <div style={{ fontSize:"14px", color:"#059669", fontWeight:"800", marginBottom:"4px" }}>{archivo.name}</div>
                         <div style={{ fontSize:"12px", color:"#64748b" }}>{(archivo.size / 1024 / 1024).toFixed(2)} MB listos para enviar.</div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize:"14px", color:"#334155", fontWeight:"700", marginBottom:"4px" }}>Click o arrastra tu archivo aquí</div>
                        <div style={{ fontSize:"12px", color:"#94a3b8" }}>Soporta PNG, JPG, MP4 (máximo 5MB)</div>
                      </>
                    )}
                  </div>
                  {archivo && (
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setArchivo(null); }} style={{ position:"relative", zIndex:10, marginTop:"12px", fontSize:"12px", padding:"6px 12px", background:"#fee2e2", color:"#ef4444", border:"none", borderRadius:"100px", fontWeight:"700", cursor:"pointer" }}>
                      Quitar evidencia
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {error && (
              <div className="animate-fade" style={{ marginTop:"16px", padding:"12px 16px", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:"12px", fontSize:"14px", color:"#DC2626", display:"flex", alignItems:"center", gap:"10px", fontWeight:"600" }}>
                <AlertCircle size={18} /> {error}
              </div>
            )}
          </div>
        )}

        {/* PASO 3 - Confirmación */}
        {paso === 3 && ticketCreado && (
          <div className="animate-fade" style={{ padding:"50px 32px", textAlign:"center" }}>
            <div style={{ width:"80px", height:"80px", background:"linear-gradient(135deg, #10b981, #34d399)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", margin:"0 auto 24px", boxShadow:"0 12px 32px rgba(16,185,129,0.3)" }}>
              <Check size={40} strokeWidth={3} />
            </div>
            <h2 style={{ margin:"0 0 10px", fontSize:"26px", fontWeight:"800", color:"#0f172a", letterSpacing:"-0.03em" }}>¡Ticket Registrado!</h2>
            <p style={{ margin:"0 0 32px", fontSize:"15px", color:"#64748b", lineHeight:"1.5" }}>Hemos notificado a los analistas de tu requerimiento. Mantente atento a <strong>{correo}</strong> para actualizaciones.</p>
            
            <div style={{ background:"linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)", border:"1px solid #a7f3d0", borderRadius:"20px", padding:"28px", marginBottom:"32px", boxShadow:"0 4px 12px rgba(16,185,129,0.05)" }}>
              <div style={{ fontSize:"12px", color:"#059669", marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:"800" }}>Referencia de tu ticket</div>
              <div style={{ fontSize:"36px", fontWeight:"900", color:"#065f46", fontFamily:"monospace", letterSpacing:"2px" }}>{ticketCreado.ticket_number}</div>
              <div style={{ fontSize:"13px", color:"#10b981", marginTop:"10px", fontWeight:"500" }}>Guarda este código si necesitas consultar por el teléfono de soporte.</div>
            </div>
            
            <div style={{ background:"#f8fafc", borderRadius:"16px", padding:"20px 24px", marginBottom:"32px", textAlign:"left", border:"1px solid #e2e8f0" }}>
              <div style={{ fontSize:"13px", color:"#0f172a", marginBottom:"12px", fontWeight:"800", textTransform:"uppercase", letterSpacing:"0.05em" }}>Resumen rápido</div>
              <div style={{ display:"flex", flexDirection:"column", gap:"8px", fontSize:"14px", color:"#475569" }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:"#94a3b8" }}>Tipo:</span> <strong>{TIPOS.find(t => t.id === tipo)?.label}</strong></div>
                <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:"#94a3b8" }}>Categoría:</span> <strong>{categoria}</strong></div>
                {urgente && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:"#94a3b8" }}>Prioridad:</span> <span style={{ color:"#ef4444", fontWeight:"800", background:"#fef2f2", padding:"2px 8px", borderRadius:"6px" }}>🔥 URGENTE</span></div>}
              </div>
            </div>
            
            <button onClick={() => window.location.href = `/`} className="step-btn"
              style={{ width:"100%", padding:"16px", background:"#0f172a", color:"#fff", border:"none", borderRadius:"14px", fontSize:"16px", fontWeight:"700", cursor:"pointer" }}>
              Finalizar y Volver al Sistema
            </button>
          </div>
        )}

        {/* Footer navegación */}
        {paso < 3 && (
          <div style={{ padding:"20px 32px", borderTop:"1px solid #f1f5f9", background:"rgba(248, 250, 252, 0.8)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <button onClick={() => paso > 0 ? setPaso(paso - 1) : null} disabled={paso === 0} className="step-btn"
              style={{ padding:"12px 24px", background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:"12px", fontSize:"14px", fontWeight:"700", color: paso === 0 ? "#cbd5e1" : "#475569", cursor: paso === 0 ? "default" : "pointer", display:"flex", gap:"8px", alignItems:"center", boxShadow:"0 2px 4px rgba(0,0,0,0.02)" }}>
              <ArrowLeft size={16} /> Atrás
            </button>
            {paso < 2 ? (
              <button onClick={() => puedeAvanzar() && setPaso(paso + 1)} disabled={!puedeAvanzar()} className="step-btn"
                style={{ padding:"12px 28px", background: puedeAvanzar() ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#e2e8f0", color: puedeAvanzar() ? "#fff" : "#94a3b8", border:"none", borderRadius:"12px", fontSize:"14px", fontWeight:"700", cursor: puedeAvanzar() ? "pointer" : "default", display:"flex", gap:"8px", alignItems:"center", boxShadow: puedeAvanzar() ? "0 4px 12px rgba(99,102,241,0.3)" : "none" }}>
                Siguiente <ArrowRight size={16} />
              </button>
            ) : (
              <button onClick={enviar} disabled={!puedeAvanzar() || enviando} className="step-btn"
                style={{ padding:"12px 28px", background: puedeAvanzar() && !enviando ? "linear-gradient(135deg, #10b981, #059669)" : "#e2e8f0", color: puedeAvanzar() && !enviando ? "#fff" : "#94a3b8", border:"none", borderRadius:"12px", fontSize:"14px", fontWeight:"700", cursor: puedeAvanzar() && !enviando ? "pointer" : "default", display:"flex", alignItems:"center", gap:"8px", boxShadow: puedeAvanzar() && !enviando ? "0 4px 12px rgba(16,185,129,0.3)" : "none" }}>
                {enviando ? "Transmitiendo al NOC..." : "Enviar Solicitud"} <Check size={18} strokeWidth={3} />
              </button>
            )}
          </div>
        )}
      </div>

      <p style={{ marginTop:"32px", fontSize:"12px", color:"#94a3b8", fontWeight:"600", letterSpacing:"0.05em", textTransform:"uppercase" }}>
        © 2026 Fusion I.T. Mesa de Ayuda Corporativa
      </p>
    </div>
  );
}
