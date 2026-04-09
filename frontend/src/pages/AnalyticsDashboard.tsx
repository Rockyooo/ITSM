import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, LabelList
} from 'recharts';
import {
  CheckCircle2, Clock, AlertTriangle, Building,
  ChevronUp, ChevronDown, Tag, BarChart2, TrendingUp,
  ArrowUpRight, Zap, Users, Timer, RefreshCw
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';

// ─── Paleta ──────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  open: '#6366f1', in_progress: '#f59e0b', pending: '#8b5cf6',
  resolved: '#10b981', closed: '#6b7280',
};
const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto', in_progress: 'En progreso', pending: 'Pendiente',
  resolved: 'Resuelto', closed: 'Cerrado',
};
const PRIORITY_COLORS: Record<string, string> = {
  low: '#10b981', medium: '#f59e0b', high: '#ef4444', Critical: '#8b5cf6',
};
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baja', medium: 'Media', high: 'Alta', Critical: 'Crítica',
};
const TYPE_LABELS: Record<string, string> = {
  incident: 'Incidente', request: 'Requerimiento', change: 'Cambio',
  problem: 'Problema', query: 'Consulta',
};

// ─── Tooltip ─────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1.5px solid #ede9fe', borderRadius: '14px',
      padding: '12px 16px', boxShadow: '0 16px 32px rgba(99,102,241,0.14)',
    }}>
      <p style={{ fontSize: '10px', fontWeight: '800', color: '#a78bfa', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: i < payload.length - 1 ? '5px' : 0 }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: '#6b7280' }}>{p.name}:</span>
          <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e1b4b' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Donut label central ──────────────────────────────────────────────────────
const DonutCenter = ({ cx, cy, total }: any) => (
  <g>
    <text x={cx} y={cy - 7} textAnchor="middle" fill="#1e1b4b" fontSize="22" fontWeight="900" fontFamily="Inter, sans-serif">{total}</text>
    <text x={cx} y={cy + 12} textAnchor="middle" fill="#9ca3af" fontSize="10" fontWeight="600" fontFamily="Inter, sans-serif">TICKETS</text>
  </g>
);

// ─── Period tabs ──────────────────────────────────────────────────────────────
function PeriodTabs({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: '3px', background: '#f5f3ff', borderRadius: '8px', padding: '3px' }}>
      {[7, 30, 90].map(d => (
        <button key={d} onClick={() => onChange(d)} style={{
          padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
          fontSize: '11px', fontWeight: '700',
          background: value === d ? '#6366f1' : 'transparent',
          color: value === d ? '#fff' : '#8b5cf6',
          transition: 'all 0.15s',
        }}>{d}d</button>
      ))}
    </div>
  );
}

// ─── Badge de tendencia ───────────────────────────────────────────────────────
function TrendBadge({ trend }: { trend: 'up' | 'down' | null }) {
  if (!trend) return null;
  const up = trend === 'up';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '2px',
      fontSize: '11px', fontWeight: '700', padding: '2px 7px', borderRadius: '99px',
      background: up ? '#ecfdf5' : '#fef2f2',
      color: up ? '#059669' : '#dc2626',
    }}>
      {up ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      {up ? '+12%' : '+8%'}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 28, bg = '#6366f1' }: { name: string; size?: number; bg?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${bg}, ${bg}bb)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: '800', fontSize: size * 0.34,
      boxShadow: `0 2px 6px ${bg}40`,
    }}>{name?.substring(0, 2).toUpperCase() || '??'}</div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [activeTenant, setActiveTenant] = useState<string>('all');
  const [tickets, setTickets] = useState<any[]>([]);
  const [period, setPeriod] = useState(7);

  useEffect(() => { loadTenants(); }, []);
  useEffect(() => { loadTickets(); }, [activeTenant]);

  const loadTenants = async () => {
    try {
      const { data } = await api.get('/api/v1/permissions/my-tenants');
      setTenants(data);
    } catch {}
  };

  const loadTickets = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const url = activeTenant && activeTenant !== 'all'
        ? `/api/v1/tickets?tenant_id=${activeTenant}`
        : '/api/v1/tickets';
      const { data } = await api.get(url);
      setTickets(data);
    } catch { setTickets([]); }
    finally { setLoading(false); setRefreshing(false); }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const total = tickets.length;
  const resolved = tickets.filter(t => t.status === 'resolved').length;
  const resolvedPct = total > 0 ? Math.round(resolved / total * 100) : 0;
  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const closedCount = tickets.filter(t => t.status === 'closed').length;

  // Avg resolution time (fake if no data — shows 0 otherwise)
  const avgResolutionHrs = useMemo(() => {
    const withRes = tickets.filter(t => t.status === 'resolved' && t.created_at && t.updated_at);
    if (!withRes.length) return null;
    const avg = withRes.reduce((sum, t) => {
      const diff = new Date(t.updated_at).getTime() - new Date(t.created_at).getTime();
      return sum + diff / 3600000;
    }, 0) / withRes.length;
    return avg.toFixed(1);
  }, [tickets]);

  // Trend data by period
  const tendencia = useMemo(() => {
    const days: { name: string; nuevos: number; resueltos: number }[] = [];
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = period <= 7
        ? d.toLocaleDateString('es-CO', { weekday: 'short' })
        : d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
      days.push({
        name: label,
        nuevos: tickets.filter(t => t.created_at?.startsWith(key)).length,
        resueltos: tickets.filter(t =>
          (t.status === 'resolved' || t.status === 'closed') && t.updated_at?.startsWith(key)
        ).length,
      });
    }
    return days;
  }, [tickets, period]);

  // Pie
  const pieData = Object.entries(STATUS_COLORS)
    .map(([s, color]) => ({ name: STATUS_LABELS[s], value: tickets.filter(t => t.status === s).length, color }))
    .filter(d => d.value > 0);

  // Bar priority
  const barData = [
    { priority: 'Baja', value: tickets.filter(t => t.priority === 'low').length, color: '#10b981' },
    { priority: 'Media', value: tickets.filter(t => t.priority === 'medium').length, color: '#f59e0b' },
    { priority: 'Alta', value: tickets.filter(t => t.priority === 'high').length, color: '#ef4444' },
    { priority: 'Crítica', value: tickets.filter(t => t.priority === 'Critical').length, color: '#8b5cf6' },
  ];

  // Type bars
  const tipoData = useMemo(() => {
    const map: Record<string, number> = {};
    tickets.forEach(t => { if (t.ticket_type) map[t.ticket_type] = (map[t.ticket_type] || 0) + 1; });
    return Object.entries(map)
      .map(([k, v]) => ({ name: TYPE_LABELS[k] || k, value: v }))
      .sort((a, b) => b.value - a.value);
  }, [tickets]);

  // KPIs
  const kpis = [
    { label: 'Tickets totales', value: total, sub: `${openCount} sin atender`, icon: Tag, color: '#6366f1', bg: '#eef2ff', grad: 'linear-gradient(135deg,#6366f1,#818cf8)', trend: 'up' as const },
    { label: 'Tasa de resolución', value: `${resolvedPct}%`, sub: `${resolved} resueltos de ${total}`, icon: CheckCircle2, color: '#10b981', bg: '#ecfdf5', grad: 'linear-gradient(135deg,#10b981,#34d399)', trend: resolvedPct > 50 ? 'up' as const : 'down' as const },
    { label: 'TMR promedio', value: avgResolutionHrs ? `${avgResolutionHrs}h` : 'N/A', sub: 'tiempo medio de resolución', icon: Timer, color: '#f59e0b', bg: '#fffbeb', grad: 'linear-gradient(135deg,#f59e0b,#fbbf24)', trend: null },
    { label: 'Sin atender', value: openCount, sub: `${inProgressCount} en progreso`, icon: AlertTriangle, color: '#ef4444', bg: '#fef2f2', grad: 'linear-gradient(135deg,#ef4444,#f87171)', trend: openCount > 5 ? 'down' as const : null },
  ];

  // Loading screen
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: '#f5f6fa' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: '3px solid #ede9fe', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontSize: '14px', color: '#a78bfa', fontWeight: '600' }}>Cargando métricas...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '22px', background: '#f5f6fa', minHeight: '100%' }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#1e1b4b', letterSpacing: '-0.03em' }}>
              Dashboard Analítico
            </h1>
            {refreshing && (
              <RefreshCw size={15} color='#a78bfa' style={{ animation: 'spin 0.8s linear infinite' }} />
            )}
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
            Bienvenido, <strong style={{ color: '#6366f1', fontWeight: '700' }}>{user?.full_name}</strong>
            <span style={{ margin: '0 8px', color: '#ddd6fe' }}>·</span>
            Métricas en tiempo real
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {tenants.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#fff', border: '1.5px solid #ede9fe', borderRadius: '12px', padding: '8px 14px',
              boxShadow: '0 1px 4px rgba(99,102,241,0.08)',
            }}>
              <Building size={14} color='#8b5cf6' />
              <select value={activeTenant} onChange={e => setActiveTenant(e.target.value)}
                style={{ background: 'transparent', border: 'none', fontSize: '13px', fontWeight: '700', color: '#1e1b4b', outline: 'none', cursor: 'pointer' }}>
                <option value='all'>Todas las empresas</option>
                {tenants.map(t => <option key={t.tenant_id} value={t.tenant_id}>{t.tenant_name}</option>)}
              </select>
            </div>
          )}
          <button onClick={() => loadTickets(true)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none',
            borderRadius: '11px', padding: '9px 16px', cursor: 'pointer',
            color: '#fff', fontSize: '12px', fontWeight: '700',
            boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
          }}>
            <RefreshCw size={13} /> Actualizar
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {kpis.map((k, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: '18px', padding: '20px',
            border: '1px solid #f0f0f8',
            boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            overflow: 'hidden', position: 'relative',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}>
            {/* Top accent bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: k.grad }} />
            {/* BG blob decorativo */}
            <div style={{ position: 'absolute', right: '-16px', top: '-16px', width: '72px', height: '72px', borderRadius: '50%', background: k.bg, opacity: 0.7 }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', position: 'relative' }}>
              <div style={{
                width: '42px', height: '42px', background: k.bg, borderRadius: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 12px ${k.color}25`,
              }}>
                <k.icon size={20} color={k.color} strokeWidth={2} />
              </div>
              <TrendBadge trend={k.trend} />
            </div>

            <p style={{ margin: '0 0 3px', fontSize: '32px', fontWeight: '900', color: '#1e1b4b', letterSpacing: '-0.03em', lineHeight: 1 }}>{k.value}</p>
            <p style={{ margin: '5px 0 2px', fontSize: '13px', fontWeight: '700', color: '#374151' }}>{k.label}</p>
            <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af', fontWeight: '500' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── ROW: Área + Donut ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>

        {/* Área */}
        <div style={{ background: '#fff', borderRadius: '18px', padding: '22px', border: '1px solid #f0f0f8', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: '0 0 3px', fontSize: '14px', fontWeight: '800', color: '#1e1b4b' }}>Volumen de tickets</h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>Nuevos vs Resueltos · últimos {period} días</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {[{ color: '#6366f1', label: 'Nuevos' }, { color: '#10b981', label: 'Resueltos' }].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color }} />
                  <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600' }}>{l.label}</span>
                </div>
              ))}
              <PeriodTabs value={period} onChange={setPeriod} />
            </div>
          </div>
          <ResponsiveContainer width='100%' height={210}>
            <AreaChart data={tendencia} margin={{ top: 5, right: 6, bottom: 0, left: -22 }}>
              <defs>
                <linearGradient id='gN' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='#6366f1' stopOpacity={0.18} />
                  <stop offset='95%' stopColor='#6366f1' stopOpacity={0} />
                </linearGradient>
                <linearGradient id='gR' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='#10b981' stopOpacity={0.15} />
                  <stop offset='95%' stopColor='#10b981' stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#f3f4f6' />
              <XAxis dataKey='name' axisLine={false} tickLine={false}
                tick={{ fill: '#9ca3af', fontSize: period > 30 ? 9 : 11, fontWeight: 600 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Area type='monotone' name='Nuevos' dataKey='nuevos'
                stroke='#6366f1' strokeWidth={2.5} fill='url(#gN)'
                dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 7, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} />
              <Area type='monotone' name='Resueltos' dataKey='resueltos'
                stroke='#10b981' strokeWidth={2.5} fill='url(#gR)'
                dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 7, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Donut */}
        <div style={{ background: '#fff', borderRadius: '18px', padding: '22px', border: '1px solid #f0f0f8', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 3px', fontSize: '14px', fontWeight: '800', color: '#1e1b4b' }}>Por estado</h3>
          <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#9ca3af' }}>Distribución actual</p>
          {pieData.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '13px' }}>Sin datos</div>
          ) : (
            <>
              <ResponsiveContainer width='100%' height={170}>
                <PieChart>
                  <Pie data={pieData} cx='50%' cy='50%' innerRadius={48} outerRadius={70}
                    paddingAngle={3} dataKey='value' startAngle={90} endAngle={-270}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <DonutCenter cx='50%' cy={85} total={total} />
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginTop: '8px' }}>
                {pieData.map((d, i) => {
                  const pct = total > 0 ? Math.round(d.value / total * 100) : 0;
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>{d.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '50px', height: '4px', background: '#f3f4f6', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: d.color, borderRadius: '99px' }} />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#1e1b4b', minWidth: '22px', textAlign: 'right' }}>{d.value}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── ROW: Prioridad + Tipo + Velocidad ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>

        {/* Bar prioridad */}
        <div style={{ background: '#fff', borderRadius: '18px', padding: '22px', border: '1px solid #f0f0f8', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <h3 style={{ margin: '0 0 3px', fontSize: '14px', fontWeight: '800', color: '#1e1b4b' }}>Por prioridad</h3>
          <p style={{ margin: '0 0 16px', fontSize: '11px', color: '#9ca3af' }}>Tickets activos por urgencia</p>
          <ResponsiveContainer width='100%' height={160}>
            <BarChart data={barData} margin={{ top: 10, right: 6, bottom: 0, left: -24 }} barSize={26}>
              <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#f3f4f6' />
              <XAxis dataKey='priority' axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} allowDecimals={false} />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f5f3ff' }} />
              <Bar name='Tickets' dataKey='value' radius={[8, 8, 0, 0]}>
                {barData.map((e, i) => <Cell key={i} fill={e.color} />)}
                <LabelList dataKey='value' position='top' style={{ fontSize: '11px', fontWeight: '800', fill: '#374151' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tipo */}
        <div style={{ background: '#fff', borderRadius: '18px', padding: '22px', border: '1px solid #f0f0f8', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <h3 style={{ margin: '0 0 3px', fontSize: '14px', fontWeight: '800', color: '#1e1b4b' }}>Por tipo</h3>
          <p style={{ margin: '0 0 16px', fontSize: '11px', color: '#9ca3af' }}>Categorización de solicitudes</p>
          {tipoData.length === 0 ? (
            <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '13px' }}>Sin datos</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
              {tipoData.map((d, i) => {
                const pct = total > 0 ? Math.round(d.value / total * 100) : 0;
                const colors = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
                const c = colors[i % colors.length];
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12px', color: '#374151', fontWeight: '600' }}>{d.name}</span>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e1b4b' }}>
                        {d.value} <span style={{ color: '#9ca3af', fontWeight: '500', fontSize: '11px' }}>({pct}%)</span>
                      </span>
                    </div>
                    <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: '99px', transition: 'width 0.6s cubic-bezier(.4,0,.2,1)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div style={{ background: '#fff', borderRadius: '18px', padding: '22px', border: '1px solid #f0f0f8', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 3px', fontSize: '14px', fontWeight: '800', color: '#1e1b4b' }}>Indicadores clave</h3>
            <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>Salud del servicio</p>
          </div>
          {[
            { label: 'Ticket más reciente', value: tickets.length > 0 ? new Date(tickets[tickets.length-1]?.created_at).toLocaleDateString('es-CO',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—', icon: Zap, color: '#6366f1', bg: '#eef2ff' },
            { label: 'Resueltos hoy', value: tickets.filter(t => t.status === 'resolved' && t.updated_at?.startsWith(new Date().toISOString().split('T')[0])).length, icon: CheckCircle2, color: '#10b981', bg: '#ecfdf5' },
            { label: 'Cerrados totales', value: closedCount, icon: TrendingUp, color: '#8b5cf6', bg: '#f5f3ff' },
            { label: 'Ratio resolución', value: `${resolvedPct}%`, icon: ArrowUpRight, color: resolvedPct >= 60 ? '#10b981' : '#ef4444', bg: resolvedPct >= 60 ? '#ecfdf5' : '#fef2f2' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: '#fafafa', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <s.icon size={15} color={s.color} strokeWidth={2.5} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '10px', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                <p style={{ margin: '1px 0 0', fontSize: '14px', fontWeight: '800', color: '#1e1b4b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(s.value)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RECENT TICKETS TABLE ── */}
      <div style={{ background: '#fff', borderRadius: '18px', border: '1px solid #f0f0f8', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', marginBottom: '8px' }}>
        <div style={{ padding: '18px 22px 16px', borderBottom: '1px solid #f5f3ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#1e1b4b' }}>Actividad reciente</h3>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#9ca3af' }}>Últimos {Math.min(tickets.length, 5)} tickets registrados</p>
          </div>
          <BarChart2 size={16} color='#a78bfa' />
        </div>

        {/* Table header */}
        {tickets.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 120px 90px 90px 100px', gap: '12px', padding: '8px 22px', background: '#fafafa', borderBottom: '1px solid #f5f3ff' }}>
            {['Ticket', 'Estado', 'Prioridad', 'Tipo', 'Fecha'].map(h => (
              <span key={h} style={{ fontSize: '10px', fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</span>
            ))}
          </div>
        )}

        {tickets.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>🎉</div>
            <p style={{ color: '#6b7280', fontSize: '14px', fontWeight: '600' }}>Sin tickets registrados</p>
          </div>
        ) : (
          <div>
            {[...tickets].reverse().slice(0, 5).map((t, i) => {
              const sc = { open: { color: '#6366f1', bg: '#eef2ff' }, in_progress: { color: '#d97706', bg: '#fffbeb' }, pending: { color: '#7c3aed', bg: '#f5f3ff' }, resolved: { color: '#059669', bg: '#ecfdf5' }, closed: { color: '#6b7280', bg: '#f3f4f6' } } as any;
              const c = sc[t.status] || { color: '#6b7280', bg: '#f3f4f6' };
              const pc = PRIORITY_COLORS[t.priority] || '#9ca3af';
              const avatarColors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
              return (
                <div key={t.id} style={{
                  display: 'grid', gridTemplateColumns: '2fr 120px 90px 90px 100px',
                  gap: '12px', padding: '12px 22px', alignItems: 'center',
                  borderBottom: i < 4 ? '1px solid #fafafa' : 'none',
                  transition: 'background 0.15s',
                }} onMouseEnter={e => (e.currentTarget.style.background = '#fafafe')}
                   onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <Avatar name={t.title} size={30} bg={avatarColors[i % avatarColors.length]} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#1e1b4b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                      <p style={{ margin: '1px 0 0', fontSize: '10px', color: '#a78bfa', fontFamily: 'monospace', fontWeight: '700' }}>{t.ticket_number}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '99px', fontWeight: '700', background: c.bg, color: c.color, textAlign: 'center', display: 'inline-block' }}>
                    {STATUS_LABELS[t.status] || t.status}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: pc, display: 'inline-block', boxShadow: `0 0 4px ${pc}80` }} />
                    <span style={{ fontSize: '11px', color: pc, fontWeight: '700' }}>{PRIORITY_LABELS[t.priority] || t.priority}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>{TYPE_LABELS[t.ticket_type] || t.ticket_type}</span>
                  <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', textAlign: 'right' }}>
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
