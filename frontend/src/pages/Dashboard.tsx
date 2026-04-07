import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";

export default function Dashboard() {
  const { user, logout, fetchMe } = useAuthStore();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", ticket_type: "incident", category: "" });

  useEffect(() => { fetchMe(); loadTickets(); }, []);

  const loadTickets = async () => {
    try { const { data } = await api.get("/api/v1/tickets"); setTickets(data); }
    finally { setLoading(false); }
  };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/api/v1/tickets", form);
    setShowForm(false);
    setForm({ title: "", description: "", priority: "medium", ticket_type: "incident", category: "" });
    loadTickets();
  };

  const statusColor: Record<string,string> = { open:"#3b82f6", in_progress:"#f59e0b", pending:"#8b5cf6", resolved:"#10b981", closed:"#6b7280" };
  const priorityColor: Record<string,string> = { low:"#10b981", medium:"#f59e0b", high:"#ef4444", critical:"#dc2626" };

  return (
    <div style={{minHeight:"100vh",background:"#0f172a",color:"#fff"}}>
      <div style={{background:"#1e293b",padding:"1rem 2rem",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #334155"}}>
        <h1 style={{margin:0,fontSize:"1.25rem"}}>🎫 ITSM Fusion I.T.</h1>
        <div style={{display:"flex",alignItems:"center",gap:"1rem"}}>
          <span style={{color:"#94a3b8"}}>{user?.email}</span>
          <button onClick={logout} style={{padding:"0.5rem 1rem",background:"#334155",border:"none",borderRadius:"6px",color:"#fff",cursor:"pointer"}}>Salir</button>
        </div>
      </div>
      <div style={{padding:"2rem",maxWidth:"1200px",margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginBottom:"2rem"}}>
          {[
            {label:"Total",value:tickets.length,color:"#3b82f6"},
            {label:"Abiertos",value:tickets.filter(t=>t.status==="open").length,color:"#ef4444"},
            {label:"En progreso",value:tickets.filter(t=>t.status==="in_progress").length,color:"#f59e0b"},
            {label:"Resueltos",value:tickets.filter(t=>t.status==="resolved").length,color:"#10b981"},
          ].map(kpi=>(
            <div key={kpi.label} style={{background:"#1e293b",borderRadius:"12px",padding:"1.5rem",borderLeft:`4px solid ${kpi.color}`}}>
              <p style={{color:"#94a3b8",margin:"0 0 0.5rem",fontSize:"0.875rem"}}>{kpi.label}</p>
              <p style={{color:kpi.color,margin:0,fontSize:"2rem",fontWeight:"700"}}>{kpi.value}</p>
            </div>
          ))}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"1rem"}}>
          <h2 style={{margin:0}}>Tickets</h2>
          <button onClick={()=>setShowForm(!showForm)} style={{padding:"0.5rem 1.5rem",background:"#2563eb",border:"none",borderRadius:"8px",color:"#fff",cursor:"pointer",fontWeight:"600"}}>+ Nuevo ticket</button>
        </div>
        {showForm && (
          <form onSubmit={createTicket} style={{background:"#1e293b",borderRadius:"12px",padding:"1.5rem",marginBottom:"1.5rem"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
              <input placeholder="Título *" required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}
                style={{padding:"0.75rem",borderRadius:"8px",border:"1px solid #334155",background:"#0f172a",color:"#fff"}}/>
              <input placeholder="Categoría" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}
                style={{padding:"0.75rem",borderRadius:"8px",border:"1px solid #334155",background:"#0f172a",color:"#fff"}}/>
              <select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}
                style={{padding:"0.75rem",borderRadius:"8px",border:"1px solid #334155",background:"#0f172a",color:"#fff"}}>
                <option value="low">Baja</option><option value="medium">Media</option>
                <option value="high">Alta</option><option value="critical">Crítica</option>
              </select>
              <select value={form.ticket_type} onChange={e=>setForm({...form,ticket_type:e.target.value})}
                style={{padding:"0.75rem",borderRadius:"8px",border:"1px solid #334155",background:"#0f172a",color:"#fff"}}>
                <option value="incident">Incidente</option><option value="request">Requerimiento</option>
                <option value="change">Cambio</option><option value="problem">Problema</option>
                <option value="query">Consulta</option>
              </select>
            </div>
            <textarea placeholder="Descripción" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
              style={{width:"100%",marginTop:"1rem",padding:"0.75rem",borderRadius:"8px",border:"1px solid #334155",background:"#0f172a",color:"#fff",minHeight:"80px",boxSizing:"border-box"}}/>
            <div style={{display:"flex",gap:"1rem",marginTop:"1rem"}}>
              <button type="submit" style={{padding:"0.75rem 2rem",background:"#2563eb",border:"none",borderRadius:"8px",color:"#fff",cursor:"pointer",fontWeight:"600"}}>Crear ticket</button>
              <button type="button" onClick={()=>setShowForm(false)} style={{padding:"0.75rem 2rem",background:"#334155",border:"none",borderRadius:"8px",color:"#fff",cursor:"pointer"}}>Cancelar</button>
            </div>
          </form>
        )}
        {loading ? <p style={{color:"#94a3b8"}}>Cargando...</p> : tickets.length === 0 ? (
          <div style={{background:"#1e293b",borderRadius:"12px",padding:"3rem",textAlign:"center"}}>
            <p style={{color:"#94a3b8"}}>No hay tickets. ¡Crea el primero!</p>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
            {tickets.map(t=>(
              <div key={t.id} style={{background:"#1e293b",borderRadius:"12px",padding:"1.25rem",display:"flex",justifyContent:"space-between",alignItems:"center",borderLeft:`4px solid ${priorityColor[t.priority]||"#6b7280"}`}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"0.25rem"}}>
                    <span style={{color:"#64748b",fontSize:"0.75rem",fontFamily:"monospace"}}>{t.ticket_number}</span>
                    <span style={{background:statusColor[t.status],color:"#fff",padding:"0.125rem 0.5rem",borderRadius:"999px",fontSize:"0.75rem"}}>{t.status}</span>
                    <span style={{color:"#64748b",fontSize:"0.75rem"}}>{t.ticket_type}</span>
                  </div>
                  <p style={{margin:0,fontWeight:"600"}}>{t.title}</p>
                  {t.category&&<p style={{margin:"0.25rem 0 0",color:"#94a3b8",fontSize:"0.875rem"}}>{t.category}</p>}
                </div>
                <div style={{textAlign:"right"}}>
                  <span style={{color:priorityColor[t.priority],fontSize:"0.875rem",fontWeight:"600"}}>{t.priority}</span>
                  <p style={{margin:"0.25rem 0 0",color:"#64748b",fontSize:"0.75rem"}}>{new Date(t.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}