import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { Building, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { api } from '../lib/api';

// --- MOCK DATA ---
const globalLineData = [
  { name: 'Ene', tickets: 400, resueltos: 350 },
  { name: 'Feb', tickets: 300, resueltos: 320 },
  { name: 'Mar', tickets: 550, resueltos: 400 },
  { name: 'Abr', tickets: 480, resueltos: 450 },
  { name: 'May', tickets: 600, resueltos: 580 },
];

const globalPieData = [
  { name: 'Abierto', value: 30, color: '#1D6AE5' },
  { name: 'En progreso', value: 45, color: '#D97706' },
  { name: 'Pendiente', value: 15, color: '#7C3AED' },
  { name: 'Resuelto', value: 120, color: '#059669' },
];

const globalBarData = [
  { priority: 'Baja', atrasados: 5, aTiempo: 80 },
  { priority: 'Media', atrasados: 12, aTiempo: 110 },
  { priority: 'Alta', atrasados: 8, aTiempo: 45 },
  { priority: 'Crítica', atrasados: 2, aTiempo: 30 },
];

// --- COMPONENT ---
export default function AnalyticsDashboard() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [activeTenant, setActiveTenant] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarTenants();
  }, []);

  const cargarTenants = async () => {
    try {
      const { data } = await api.get("/api/v1/permissions/my-tenants");
      setTenants(data);
    } catch {} finally {
      // Simular tiempo de carga para el impacto visual
      setTimeout(() => setLoading(false), 600);
    }
  };

  // Simulación de filtro de data por empresa (Mocks dinámicos)
  const isGlobal = activeTenant === 'all';
  const multiplier = isGlobal ? 1 : 0.3; // Reduce los números para simular una sola empresa
  
  const lineData = globalLineData.map(d => ({ ...d, tickets: Math.round(d.tickets * multiplier), resueltos: Math.round(d.resueltos * multiplier) }));
  const pieData = globalPieData.map(d => ({ ...d, value: Math.round(d.value * multiplier) + 1 }));
  const barData = globalBarData.map(d => ({ ...d, aTiempo: Math.round(d.aTiempo * multiplier), atrasados: Math.round(d.atrasados * multiplier) }));

  if (loading) {
    return <div className="h-full flex items-center justify-center text-gray-500">Cargando métricas corporativas...</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER & SELECTOR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Analítico</h1>
          <p className="text-sm text-gray-500 mt-1">Métricas en tiempo real y rendimiento de la mesa de ayuda</p>
        </div>
        
        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200">
          <Building size={18} className="text-blue-600 ml-2" />
          <select 
            value={activeTenant} 
            onChange={e => setActiveTenant(e.target.value)}
            className="bg-transparent border-none text-sm font-semibold text-gray-800 outline-none cursor-pointer py-1 pr-4"
          >
            <option value="all">Filtro Global (Todas las Empresas)</option>
            {tenants.map(t => (
              <option key={t.tenant_id} value={t.tenant_id}>{t.tenant_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPIs SUPERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: "Tickets Totales", value: isGlobal ? "1,248" : "374", icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
          { title: "Resueltos este mes", value: isGlobal ? "84%" : "89%", icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
          { title: "TMD (Tiempo Medio)", value: isGlobal ? "4.2 hrs" : "2.1 hrs", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          { title: "SLAs Incumplidos", value: isGlobal ? "12" : "3", icon: Building, color: "text-red-600", bg: "bg-red-50" },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">{kpi.title}</p>
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <kpi.icon size={20} className={kpi.color} />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* GRAFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LÍNEAS: Volumen temporal */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-wider">Volumen de Tickets (Últimos 5 meses)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dx={-10} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} 
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" name="Nuevos" dataKey="tickets" stroke="#1D6AE5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" name="Resueltos" dataKey="resueltos" stroke="#059669" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DONUT: Estado actual */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-wider">Porcentaje por Estado</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
                <Legend iconType="circle" verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BARRAS: Rendimiento por Prioridad */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-3">
          <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-wider">Cumplimiento de SLA por Prioridad</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="priority" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dx={-10} />
                <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar name="A Tiempo (SLA Cumplido)" dataKey="aTiempo" stackId="a" fill="#10B981" radius={[0, 0, 4, 4]} />
                <Bar name="Atrasados (SLA Vencido)" dataKey="atrasados" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
