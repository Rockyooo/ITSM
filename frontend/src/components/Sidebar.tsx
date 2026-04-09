import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Ticket, Users, Building, Settings, LogOut, Bell, ShieldCheck, Menu, X, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '../store/auth';

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Colapsar automaticamente en tablet
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setCollapsed(true);
      else setCollapsed(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { name: 'Dashboard', icon: Home, path: '/dashboard' },
    { name: 'Mis Tickets', icon: Ticket, path: '/tickets' },
  ];

  if (user?.role === 'supervisor' || user?.role === 'admin' || user?.role === 'superadmin') {
    menuItems.push(
      { name: 'Supervisor', icon: ShieldCheck, path: '/supervisor' },
      { name: 'Empresas', icon: Building, path: '/empresas' },
      { name: 'Usuarios', icon: Users, path: '/usuarios' },
      { name: 'Permisos', icon: Settings, path: '/permisos' }
    );
  }

  const sidebarWidth = collapsed ? '64px' : '240px';

  return (
    <>
      {/* Overlay mobile */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:40 }} />
      )}

      {/* Sidebar */}
      <aside style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'hidden',
        zIndex: 30,
        flexShrink: 0,
      }}>

        {/* Header */}
        <div style={{ padding: collapsed ? '16px 0' : '20px 16px 16px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'space-between', gap:'8px' }}>
          {!collapsed && (
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ width:'32px', height:'32px', background:'#2563eb', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ color:'#fff', fontWeight:'800', fontSize:'16px' }}>f</span>
              </div>
              <span style={{ fontWeight:'800', fontSize:'15px', background:'linear-gradient(135deg,#1e40af,#6366f1)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>FusionIT</span>
            </div>
          )}
          {collapsed && (
            <div style={{ width:'32px', height:'32px', background:'#2563eb', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ color:'#fff', fontWeight:'800', fontSize:'16px' }}>f</span>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)}
            style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:'4px', borderRadius:'6px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <ChevronLeft size={16} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding: collapsed ? '12px 8px' : '12px 8px', display:'flex', flexDirection:'column', gap:'2px', overflowY:'auto' }}>
          {!collapsed && <p style={{ fontSize:'10px', fontWeight:'700', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', padding:'4px 10px 8px' }}>Navegación</p>}
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink key={item.name} to={item.path}
                style={{
                  display:'flex', alignItems:'center', gap:'10px',
                  padding: collapsed ? '10px' : '9px 12px',
                  borderRadius:'10px',
                  textDecoration:'none',
                  fontSize:'13px', fontWeight: isActive ? '600' : '500',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  background: isActive ? '#eff6ff' : 'transparent',
                  color: isActive ? '#2563eb' : '#64748b',
                  transition: 'all 0.15s',
                }}>
                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                {!collapsed && item.name}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ borderTop:'1px solid #f1f5f9', padding: collapsed ? '12px 8px' : '12px' }}>
          {!collapsed && (
            <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', background:'#f8fafc', borderRadius:'12px', border:'1px solid #f1f5f9', marginBottom:'8px' }}>
              <div style={{ position:'relative', flexShrink:0 }}>
                <div style={{ width:'36px', height:'36px', background:'#e0e7ff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700', fontSize:'13px', color:'#4338ca' }}>
                  {user?.full_name?.substring(0,2).toUpperCase() || 'US'}
                </div>
                <div style={{ position:'absolute', top:0, right:0, width:'10px', height:'10px', background:'#22c55e', border:'2px solid #fff', borderRadius:'50%' }} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:'12px', fontWeight:'700', color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', margin:0 }}>{user?.full_name || 'Usuario'}</p>
                <p style={{ fontSize:'11px', color:'#94a3b8', margin:0, textTransform:'capitalize' }}>{user?.role}</p>
              </div>
              <button style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:'4px' }}>
                <Bell size={16} />
              </button>
            </div>
          )}
          {collapsed && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'8px' }}>
              <div style={{ width:'32px', height:'32px', background:'#e0e7ff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700', fontSize:'11px', color:'#4338ca' }}>
                {user?.full_name?.substring(0,2).toUpperCase() || 'US'}
              </div>
            </div>
          )}
          <button onClick={logout}
            style={{ display:'flex', alignItems:'center', gap:'8px', padding: collapsed ? '10px' : '9px 12px', width:'100%', background:'none', border:'none', cursor:'pointer', color:'#ef4444', borderRadius:'10px', fontSize:'13px', fontWeight:'500', justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <LogOut size={16} />
            {!collapsed && 'Cerrar Sesión'}
          </button>
        </div>
      </aside>
    </>
  );
}
