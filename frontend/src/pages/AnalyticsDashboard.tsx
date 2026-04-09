import React, { useState, useEffect } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { TrendingUp, CheckCircle, Clock, AlertTriangle, Tag, Users, Building, ChevronUp, ChevronDown, BarChart2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
const STATUS_COLORS: Record<string,string> = { open:'#3b82f6', in_progress:'#f59e0b', pending:'#8b5cf6', resolved:'#10b981', closed:'#6b7280' };
const STATUS_LABELS: Record<string,string> = { open:'Abierto', in_progress:'En progreso', pending:'Pendiente', resolved:'Resuelto', closed:'Cerrado' };
const PRIORITY_COLORS: Record<string,string> = { low:'#10b981', medium:'#f59e0b', high:'#ef4444', Critical:'#7c3aed' };
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'12px', padding:'12px 16px', boxShadow:'0 10px 25px rgba(0,0,0,0.08)' }}>
      <p style={{ fontSize:'12px', fontWeight:'600', color:'#64748b', marginBottom:'8px' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:p.color }} />
          <span style={{ fontSize:'12px', color:'#374151' }}>{p.name}:</span>
          <span style={{ fontSize:'12px', fontWeight:'700', color:'#0f172a' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};
  if (loading) return (
    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontSize:'14px' }}>
      Cargando metricas...
    </div>
  );
  return (
    <div style={{ padding:'24px', display:'flex', flexDirection:'column', gap:'20px', background:'#f8fafc', minHeight:'100%' }}>

      {/* HEADER */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h1 style={{ margin:0, fontSize:'22px', fontWeight:'800', color:'#0f172a', letterSpacing:'-0.02em' }}>Panel de metricas</h1>
          <p style={{ margin:'4px 0 0', fontSize:'13px', color:'#94a3b8' }}>Bienvenido, <strong style={{ color:'#475569' }}>{user?.full_name}</strong> · Datos en tiempo real</p>
        </div>
        {tenants.length > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'#fff', border:'1px solid #e2e8f0', borderRadius:'10px', padding:'8px 12px' }}>
            <Building size={15} color='#3b82f6' />
            <select value={activeTenant} onChange={e => setActiveTenant(e.target.value)} style={{ background:'transparent', border:'none', fontSize:'13px', fontWeight:'600', color:'#374151', outline:'none', cursor:'pointer' }}>
              <option value='all'>Todas las empresas</option>
              {tenants.map(t => <option key={t.tenant_id} value={t.tenant_id}>{t.tenant_name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'14px' }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background:'#fff', borderRadius:'14px', padding:'18px 20px', border:'1px solid #f1f5f9', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
              <div style={{ width:'38px', height:'38px', background:k.bg, borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <k.icon size={18} color={k.color} />
              </div>
              {k.trend && <div style={{ fontSize:'11px', fontWeight:'600', color: k.trend==='up' ? '#10b981' : '#ef4444', display:'flex', alignItems:'center' }}>{k.trend==='up' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</div>}
            </div>
            <p style={{ margin:0, fontSize:'28px', fontWeight:'800', color:'#0f172a', letterSpacing:'-0.02em' }}>{k.value}</p>
            <p style={{ margin:'2px 0 0', fontSize:'12px', fontWeight:'600', color:'#64748b' }}>{k.label}</p>
            <p style={{ margin:'2px 0 0', fontSize:'11px', color:'#94a3b8' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* FILA 1 */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'14px' }}>
        <div style={{ background:'#fff', borderRadius:'14px', padding:'20px', border:'1px solid #f1f5f9', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
            <div><h3 style={{ margin:0, fontSize:'13px', fontWeight:'700', color:'#0f172a' }}>Actividad ultimos 7 dias</h3><p style={{ margin:'2px 0 0', fontSize:'11px', color:'#94a3b8' }}>Tickets nuevos vs resueltos</p></div>
            <div style={{ display:'flex', gap:'12px' }}>
              {[{ color:'#3b82f6', label:'Nuevos' }, { color:'#10b981', label:'Resueltos' }].map(l => (
                <div key={l.label} style={{ display:'flex', alignItems:'center', gap:'5px' }}><div style={{ width:'8px', height:'8px', borderRadius:'50%', background:l.color }} /><span style={{ fontSize:'11px', color:'#64748b' }}>{l.label}</span></div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width='100%' height={200}>
            <AreaChart data={tendencia} margin={{ top:5, right:10, bottom:0, left:-20 }}>
              <defs>
                <linearGradient id='gN' x1='0' y1='0' x2='0' y2='1'><stop offset='5%' stopColor='#3b82f6' stopOpacity={0.15}/><stop offset='95%' stopColor='#3b82f6' stopOpacity={0}/></linearGradient>
                <linearGradient id='gR' x1='0' y1='0' x2='0' y2='1'><stop offset='5%' stopColor='#10b981' stopOpacity={0.15}/><stop offset='95%' stopColor='#10b981' stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#f1f5f9' />
              <XAxis dataKey='name' axisLine={false} tickLine={false} tick={{ fill:'#94a3b8', fontSize:11 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill:'#94a3b8', fontSize:11 }} allowDecimals={false} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Area type='monotone' name='Nuevos' dataKey='nuevos' stroke='#3b82f6' strokeWidth={2.5} fill='url(#gN)' dot={{ r:3, fill:'#3b82f6', strokeWidth:0 }} />
              <Area type='monotone' name='Resueltos' dataKey='resueltos' stroke='#10b981' strokeWidth={2.5} fill='url(#gR)' dot={{ r:3, fill:'#10b981', strokeWidth:0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:'#fff', borderRadius:'14px', padding:'20px', border:'1px solid #f1f5f9', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 style={{ margin:'0 0 4px', fontSize:'13px', fontWeight:'700', color:'#0f172a' }}>Por estado</h3>
          <p style={{ margin:'0 0 12px', fontSize:'11px', color:'#94a3b8' }}>Distribucion actual</p>
          {pieData.length === 0 ? <div style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8' }}>Sin tickets</div> : (<>
            <ResponsiveContainer width='100%' height={140}>
              <PieChart><Pie data={pieData} cx='50%' cy='50%' innerRadius={40} outerRadius={60} paddingAngle={3} dataKey='value'>
                {pieData.map((e,i) => <Cell key={i} fill={e.color} />)}
              </Pie><RechartsTooltip content={<CustomTooltip />} /></PieChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', flexDirection:'column', gap:'5px', marginTop:'8px' }}>
              {pieData.map((d,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px' }}><div style={{ width:'7px', height:'7px', borderRadius:'50%', background:d.color }} /><span style={{ fontSize:'11px', color:'#64748b' }}>{d.name}</span></div>
                  <span style={{ fontSize:'11px', fontWeight:'700', color:'#0f172a' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </>)}
        </div>
      </div>

      {/* FILA 2 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
        <div style={{ background:'#fff', borderRadius:'14px', padding:'20px', border:'1px solid #f1f5f9', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 style={{ margin:'0 0 4px', fontSize:'13px', fontWeight:'700', color:'#0f172a' }}>Tickets por prioridad</h3>
          <p style={{ margin:'0 0 16px', fontSize:'11px', color:'#94a3b8' }}>Volumen actual por nivel</p>
          <ResponsiveContainer width='100%' height={160}>
            <BarChart data={barData} margin={{ top:0, right:10, bottom:0, left:-20 }} barSize={26}>
              <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#f1f5f9' />
              <XAxis dataKey='priority' axisLine={false} tickLine={false} tick={{ fill:'#94a3b8', fontSize:11 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill:'#94a3b8', fontSize:11 }} allowDecimals={false} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Bar name='Tickets' dataKey='value' radius={[6,6,0,0]}>{barData.map((e,i) => <Cell key={i} fill={e.color} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:'#fff', borderRadius:'14px', padding:'20px', border:'1px solid #f1f5f9', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 style={{ margin:'0 0 4px', fontSize:'13px', fontWeight:'700', color:'#0f172a' }}>Tickets por tipo</h3>
          <p style={{ margin:'0 0 12px', fontSize:'11px', color:'#94a3b8' }}>Categorizacion de solicitudes</p>
          {tipoData.length === 0 ? <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8' }}>Sin datos</div> : (
            <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginTop:'4px' }}>
              {tipoData.sort((a,b) => b.value - a.value).map((d,i) => {
                const pct = total > 0 ? Math.round(d.value/total*100) : 0;
                const colors = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444'];
                return (
                  <div key={i}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                      <span style={{ fontSize:'12px', color:'#475569', fontWeight:'500' }}>{d.name}</span>
                      <span style={{ fontSize:'12px', fontWeight:'700', color:'#0f172a' }}>{d.value} <span style={{ color:'#94a3b8', fontWeight:'400' }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height:'6px', background:'#f1f5f9', borderRadius:'99px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:pct+'%', background:colors[i%colors.length], borderRadius:'99px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* TICKETS RECIENTES */}
      <div style={{ background:'#fff', borderRadius:'14px', border:'1px solid #f1f5f9', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden', marginBottom:'8px' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #f8fafc', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div><h3 style={{ margin:0, fontSize:'13px', fontWeight:'700', color:'#0f172a' }}>Tickets recientes</h3><p style={{ margin:'2px 0 0', fontSize:'11px', color:'#94a3b8' }}>Ultimos {Math.min(filtered.length,5)} registros</p></div>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding:'40px', textAlign:'center', color:'#94a3b8', fontSize:'13px' }}>Sin tickets registrados</div>
        ) : (
          <div>
            {filtered.slice(-5).reverse().map((t,i) => (
              <div key={t.id} style={{ display:'grid', gridTemplateColumns:'1fr 90px 80px 100px', gap:'12px', padding:'11px 20px', alignItems:'center', borderBottom: i < 4 ? '1px solid #f8fafc' : 'none' }}>
                <div><p style={{ margin:0, fontSize:'13px', fontWeight:'600', color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</p><p style={{ margin:'2px 0 0', fontSize:'11px', color:'#94a3b8', fontFamily:'monospace' }}>{t.ticket_number}</p></div>
                <span style={{ fontSize:'11px', padding:'3px 8px', borderRadius:'99px', fontWeight:'500', textAlign:'center', background:STATUS_COLORS[t.status]+'18', color:STATUS_COLORS[t.status] }}>{STATUS_LABELS[t.status]}</span>
                <span style={{ fontSize:'11px', padding:'3px 8px', borderRadius:'99px', fontWeight:'500', textAlign:'center', background:PRIORITY_COLORS[t.priority]+'18', color:PRIORITY_COLORS[t.priority] }}>{t.priority==='Critical'?'Critica':t.priority==='high'?'Alta':t.priority==='medium'?'Media':'Baja'}</span>
                <span style={{ fontSize:'11px', color:'#94a3b8', textAlign:'right' }}>{new Date(t.created_at).toLocaleDateString('es-CO',{ day:'numeric', month:'short' })}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
