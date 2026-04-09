import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import {
  TrendingUp, CheckCircle, Clock, AlertTriangle,
  Building2, ChevronUp, ChevronDown, Ticket, Activity
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';

// ─── Config ──────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  open: '#6366f1', in_progress: '#f59e0b', pending: '#8b5cf6', resolved: '#10b981', closed: '#6b7280',
};
const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto', in_progress: 'En progreso', pending: 'Pendiente', resolved: 'Resuelto', closed: 'Cerrado',
};
const PRIORITY_COLORS: Record<string, string> = {
  low: '#10b981', medium: '#f59e0b', high: '#ef4444', Critical: '#8b5cf6',
};

// ─── Tooltip ─────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1px solid #ede9fe', borderRadius: '14px',
      padding: '12px 16px', boxShadow: '0 12px 28px rgba(99,102,241,0.12)',
    }}>
      <p style={{ fontSize: '11px', fontWeight: '700', color: '#a78bfa', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, boxShadow: `0 0 6px ${p.color}80` }} />
          <span style={{ fontSize: '12px', color: '#6b7280' }}>{p.name}:</span>
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e1b4b' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<any[]>([]);
  const [activeTenant, setActiveTenant] = useState<string>('all');
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => { loadTenants(); }, []);
  useEffect(() => { loadTickets(); }, [activeTenant]);

  const loadTenants = async () => {
    try {
      const { data } = await api.get('/api/v1/permissions/my-tenants');
      setTenants(data);
    } catch {}
  };

  const loadTickets = async () => {
    setLoading(true);
    try {
      const url = activeTenant && activeTenant !== 'all'
        ? `/api/v1/tickets?tenant_id=${activeTenant}`
        : '/api/v1/tickets';
      const { data } = await api.get(url);
      setTickets(data);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Derived data ────────────────────────────────────────────────────────────
  const total = tickets.length;
  const resolved = tickets.filter(t => t.status === 'resolved').length;
  const resolvedPct = total > 0 ? Math.round(resolved / total * 100) : 0;
  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;

  // Trend: last 7 days
  const tendencia = (() => {
    const days: { name: string; nuevos: number; resueltos: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days.push({
        name: d.toLocaleDateString('es-CO', { weekday: 'short' }),
        nuevos: tickets.filter(t => t.created_at?.startsWith(key)).length,
        resueltos: tickets.filter(t => t.resolved_at?.startsWith(key) || (t.status === 'resolved' && t.updated_at?.startsWith(key))).length,
      });
    }
    return days;
  })();

  // Pie by status
  const pieData = Object.entries(STATUS_COLORS)
    .map(([status, color]) => ({ name: STATUS_LABELS[status], value: tickets.filter(t => t.status === status).length, color }))
    .filter(d => d.value > 0);

  // Bar by priority
  const barData = [
    { priority: 'Baja', value: tickets.filter(t => t.priority === 'low').length, color: '#10b981' },
    { priority: 'Media', value: tickets.filter(t => t.priority === 'medium').length, color: '#f59e0b' },
    { priority: 'Alta', value: tickets.filter(t => t.priority === 'high').length, color: '#ef4444' },
    { priority: 'Crítica', value: tickets.filter(t => t.priority === 'Critical').length, color: '#8b5cf6' },
  ];

  // By type
  const tipoData = (() => {
    const types: Record<string, number> = {};
    const labels: Record<string, string> = { incident: 'Incidente', request: 'Requerimiento', change: 'Cambio', problem: 'Problema', query: 'Consulta' };
    tickets.forEach(t => { if (t.ticket_type) types[t.ticket_type] = (types[t.ticket_type] || 0) + 1; });
    return Object.entries(types).map(([k, v]) => ({ name: labels[k] || k, value: v }));
  })();

  const kpis = [
    { label: 'Tickets totales', value: total, sub: 'en el período', icon: Ticket, color: '#6366f1', bg: '#eef2ff', trend: 'up' as const },
    { label: 'Resueltos este mes', value: `${resolvedPct}%`, sub: `${resolved} de ${total}`, icon: CheckCircle, color: '#10b981', bg: '#ecfdf5', trend: 'up' as const },
    { label: 'En progreso', value: inProgressCount, sub: 'atención activa', icon: Clock, color: '#f59e0b', bg: '#fffbeb', trend: null },
    { label: 'Sin atender', value: openCount, sub: 'pendientes de asignar', icon: AlertTriangle, color: '#ef4444', bg: '#fef2f2', trend: openCount > 5 ? 'down' as const : null },
  ];

  const filtered = tickets; // alias for recent tickets section

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: '#f5f6fa' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: '3px solid #ede9fe', borderTopColor: '#6366f1', animation: 'spin 0.9s linear infinite' }} />
      <p style={{ fontSize: '14px', color: '#a78bfa', fontWeight: '600' }}>Cargando métricas...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: '#f5f6fa', minHeight: '100%' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#1e1b4b', letterSpacing: '-0.03em' }}>
            Dashboard Analítico
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9ca3af' }}>
            Bienvenido, <strong style={{ color: '#6366f1' }}>{user?.full_name}</strong> · Métricas en tiempo real
          </p>
        </div>
        {tenants.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#fff', border: '1.5px solid #ede9fe', borderRadius: '12px', padding: '8px 14px',
            boxShadow: '0 1px 4px rgba(99,102,241,0.08)',
          }}>
            <Building2 size={15} color='#8b5cf6' />
            <select
              value={activeTenant}
              onChange={e => setActiveTenant(e.target.value)}
              style={{ background: 'transparent', border: 'none', fontSize: '13px', fontWeight: '700', color: '#1e1b4b', outline: 'none', cursor: 'pointer' }}
            >
              <option value='all'>Todas las empresas</option>
              {tenants.map(t => <option key={t.tenant_id} value={t.tenant_id}>{t.tenant_name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        {kpis.map((k, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: '16px', padding: '20px',
            border: '1px solid #f0f0f8',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 0 0 1px rgba(99,102,241,0.04)',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Colored top stripe */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: k.color, borderRadius: '16px 16px 0 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div style={{
                width: '40px', height: '40px', background: k.bg, borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `inset 0 1px 3px ${k.color}20`,
              }}>
                <k.icon size={19} color={k.color} strokeWidth={2} />
              </div>
              {k.trend && (
                <div style={{ fontSize: '11px', fontWeight: '700', color: k.trend === 'up' ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  {k.trend === 'up' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '30px', fontWeight: '900', color: '#1e1b4b', letterSpacing: '-0.03em', lineHeight: 1 }}>{k.value}</p>
            <p style={{ margin: '6px 0 2px', fontSize: '13px', fontWeight: '700', color: '#374151' }}>{k.label}</p>
            <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* CHARTS ROW 1: Area + Pie */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>

        {/* Area chart */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '22px', border: '1px solid #f0f0f8', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#1e1b4b' }}>Volumen de tickets</h3>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#9ca3af' }}>Últimos 7 días · Nuevos vs Resueltos</p>
            </div>
            <div style={{ display: 'flex', gap: '14px' }}>
              {[{ color: '#6366f1', label: 'Nuevos' }, { color: '#10b981', label: 'Resueltos' }].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color, boxShadow: `0 0 5px ${l.color}80` }} />
                  <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width='100%' height={200}>
            <AreaChart data={tendencia} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id='gN' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='#6366f1' stopOpacity={0.2} />
                  <stop offset='95%' stopColor='#6366f1' stopOpacity={0} />
                </linearGradient>
                <linearGradient id='gR' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='#10b981' stopOpacity={0.2} />
                  <stop offset='95%' stopColor='#10b981' stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#f3f4f6' />
              <XAxis dataKey='name' axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Area type='monotone' name='Nuevos' dataKey='nuevos' stroke='#6366f1' strokeWidth={2.5} fill='url(#gN)' dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#6366f1' }} />
              <Area type='monotone' name='Resueltos' dataKey='resueltos' stroke='#10b981' strokeWidth={2.5} fill='url(#gR)' dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#10b981' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '22px', border: '1px solid #f0f0f8', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '800', color: '#1e1b4b' }}>Por estado</h3>
          <p style={{ margin: '0 0 14px', fontSize: '11px', color: '#9ca3af' }}>Distribución actual de tickets</p>
          {pieData.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '13px' }}>Sin tickets</div>
          ) : (
            <>
              <ResponsiveContainer width='100%' height={140}>
                <PieChart>
                  <Pie data={pieData} cx='50%' cy='50%' innerRadius={42} outerRadius={62} paddingAngle={4} dataKey='value'>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                {pieData.map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color, boxShadow: `0 0 5px ${d.color}80` }} />
                      <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e1b4b' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* CHARTS ROW 2: Bar + Type bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

        {/* Bar chart by priority */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '22px', border: '1px solid #f0f0f8', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '800', color: '#1e1b4b' }}>Por prioridad</h3>
          <p style={{ margin: '0 0 16px', fontSize: '11px', color: '#9ca3af' }}>Volumen por nivel de urgencia</p>
          <ResponsiveContainer width='100%' height={160}>
            <BarChart data={barData} margin={{ top: 0, right: 10, bottom: 0, left: -20 }} barSize={28}>
              <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#f3f4f6' />
              <XAxis dataKey='priority' axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Bar name='Tickets' dataKey='value' radius={[8, 8, 0, 0]}>
                {barData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Type breakdown */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '22px', border: '1px solid #f0f0f8', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '800', color: '#1e1b4b' }}>Por tipo</h3>
          <p style={{ margin: '0 0 14px', fontSize: '11px', color: '#9ca3af' }}>Categorización de solicitudes</p>
          {tipoData.length === 0 ? (
            <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '13px' }}>Sin datos</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tipoData.sort((a, b) => b.value - a.value).map((d, i) => {
                const pct = total > 0 ? Math.round(d.value / total * 100) : 0;
                const colors = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
                const c = colors[i % colors.length];
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12px', color: '#4b5563', fontWeight: '600' }}>{d.name}</span>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e1b4b' }}>
                        {d.value} <span style={{ color: '#9ca3af', fontWeight: '500' }}>({pct}%)</span>
                      </span>
                    </div>
                    <div style={{ height: '7px', background: '#f3f4f6', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: c, borderRadius: '99px', boxShadow: `0 0 6px ${c}60`, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RECENT TICKETS */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f0f0f8', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '8px' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f9f9fb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#1e1b4b' }}>Tickets recientes</h3>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#9ca3af' }}>Últimos {Math.min(filtered.length, 5)} registros</p>
          </div>
          <Activity size={16} color='#a78bfa' />
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>Sin tickets registrados</div>
        ) : (
          <div>
            {filtered.slice(-5).reverse().map((t, i) => {
              const sCfg = { open: { color: '#6366f1', bg: '#eef2ff' }, in_progress: { color: '#d97706', bg: '#fffbeb' }, pending: { color: '#7c3aed', bg: '#f5f3ff' }, resolved: { color: '#059669', bg: '#ecfdf5' }, closed: { color: '#6b7280', bg: '#f3f4f6' } } as any;
              const pCfg = { low: '#9ca3af', medium: '#f59e0b', high: '#ef4444', Critical: '#8b5cf6' } as any;
              const sc = sCfg[t.status] || { color: '#6b7280', bg: '#f3f4f6' };
              return (
                <div key={t.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 100px 80px 100px',
                  gap: '12px', padding: '13px 22px', alignItems: 'center',
                  borderBottom: i < 4 ? '1px solid #fafafa' : 'none',
                  transition: 'background 0.15s',
                }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#1e1b4b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#a78bfa', fontFamily: 'monospace', fontWeight: '700' }}>{t.ticket_number}</p>
                  </div>
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '99px', fontWeight: '600', textAlign: 'center', background: sc.bg, color: sc.color }}>
                    {{open:'Abierto',in_progress:'En progreso',pending:'Pendiente',resolved:'Resuelto',closed:'Cerrado'}[t.status as string] || t.status}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: pCfg[t.priority] || '#9ca3af', display: 'inline-block', boxShadow: `0 0 4px ${pCfg[t.priority] || '#9ca3af'}80` }} />
                    <span style={{ fontSize: '11px', color: pCfg[t.priority] || '#9ca3af', fontWeight: '600' }}>
                      {{ low: 'Baja', medium: 'Media', high: 'Alta', Critical: 'Crítica' }[t.priority as string] || t.priority}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'right', fontWeight: '500' }}>
                    {new Date(t.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
