import { useState, useEffect } from "react";
import { api } from "../lib/api";

interface Technician {
  id: number;
  full_name: string;
  email: string;
  role: string;
}

interface Props {
  ticketId: number;
  ticketNumber: string;
  currentAssigneeId?: number | null;
  isOpen: boolean;
  onClose: () => void;
  onAssigned: (technicianId: number, technicianName: string) => void;
}

export default function AssignTechnicianModal({
  ticketId, ticketNumber, currentAssigneeId, isOpen, onClose, onAssigned,
}: Props) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(currentAssigneeId ?? null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api.get("/users/technicians")
      .then((res) => { setTechnicians(res.data); setError(null); })
      .catch(() => setError("No se pudo cargar la lista de técnicos"))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleAssign = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await api.patch(`/tickets/${ticketId}/assign`, { assignee_id: selectedId });
      const tech = technicians.find((t) => t.id === selectedId);
      onAssigned(selectedId, tech?.full_name ?? "");
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Error al asignar técnico");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:"12px", width:"100%", maxWidth:"440px", margin:"0 16px", overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 24px", borderBottom:"1px solid #E5E7EB", background:"#F9FAFB" }}>
          <div>
            <div style={{ fontWeight:600, fontSize:"16px", color:"#111827" }}>Asignar Técnico</div>
            <div style={{ fontSize:"12px", color:"#6B7280" }}>{ticketNumber}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:"20px", cursor:"pointer", color:"#9CA3AF" }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding:"20px 24px" }}>
          {error && <div style={{ marginBottom:"12px", padding:"10px 14px", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:"8px", fontSize:"13px", color:"#DC2626" }}>{error}</div>}
          {loading ? (
            <div style={{ textAlign:"center", padding:"32px 0", color:"#9CA3AF" }}>Cargando técnicos...</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"8px", maxHeight:"256px", overflowY:"auto" }}>
              {technicians.length === 0 ? (
                <div style={{ textAlign:"center", padding:"32px 0", color:"#9CA3AF", fontSize:"13px" }}>No hay técnicos disponibles</div>
              ) : technicians.map((tech) => (
                <label key={tech.id} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"10px 12px", borderRadius:"8px", border: selectedId === tech.id ? "1.5px solid #2563EB" : "1px solid #E5E7EB", background: selectedId === tech.id ? "#EFF6FF" : "#fff", cursor:"pointer" }}>
                  <input type="radio" name="technician" checked={selectedId === tech.id} onChange={() => setSelectedId(tech.id)} style={{ accentColor:"#2563EB" }} />
                  <div style={{ width:"36px", height:"36px", borderRadius:"50%", background:"#DBEAFE", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, fontSize:"12px", color:"#1D4ED8", flexShrink:0 }}>
                    {tech.full_name.split(" ").map(n => n[0]).slice(0,2).join("").toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"13px", fontWeight:500, color:"#111827" }}>{tech.full_name}</div>
                    <div style={{ fontSize:"11px", color:"#9CA3AF", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tech.email}</div>
                  </div>
                  {tech.role === "admin" && <span style={{ fontSize:"10px", background:"#F3E8FF", color:"#7C3AED", padding:"2px 8px", borderRadius:"99px" }}>Admin</span>}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display:"flex", justifyContent:"flex-end", gap:"10px", padding:"14px 24px", borderTop:"1px solid #E5E7EB", background:"#F9FAFB" }}>
          <button onClick={onClose} disabled={saving} style={{ padding:"8px 16px", fontSize:"13px", background:"none", border:"none", cursor:"pointer", color:"#6B7280" }}>Cancelar</button>
          <button onClick={handleAssign} disabled={!selectedId || saving || loading}
            style={{ padding:"8px 20px", fontSize:"13px", fontWeight:500, color:"#fff", background: (!selectedId || saving) ? "#93C5FD" : "#2563EB", border:"none", borderRadius:"8px", cursor: (!selectedId || saving) ? "not-allowed" : "pointer" }}>
            {saving ? "Asignando..." : "Asignar"}
          </button>
        </div>
      </div>
    </div>
  );
}
