import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Ticket, Users, Building2, Settings,
  LogOut, Bell, ShieldCheck, ChevronLeft, Zap
} from 'lucide-react';
import { useAuthStore } from '../store/auth';

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) setCollapsed(true);
      else setCollapsed(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Mis Tickets', icon: Ticket, path: '/tickets' },
  ];

  if (user?.role === 'supervisor') { menuItems.push({ name: 'Supervisor', icon: ShieldCheck, path: '/supervisor' }); }
  if (user?.role === 'admin' || user?.role === 'superadmin') {
    menuItems.push(

      { name: 'Empresas', icon: Building2, path: '/empresas' },
      { name: 'Usuarios', icon: Users, path: '/usuarios' },
      { name: 'Permisos', icon: Settings, path: '/permisos' }
    );
  }

  const W = collapsed ? '68px' : '230px';
  const initials = user?.full_name?.substring(0, 2).toUpperCase() || 'US';

  return (
    <>
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40, backdropFilter: 'blur(2px)' }}
        />
      )}

      <aside style={{
        width: W, minWidth: W,
        background: 'linear-gradient(175deg, #1a1535 0%, #231b54 45%, #1e1b4b 100%)',
        display: 'flex', flexDirection: 'column',
        height: '100vh', position: 'sticky', top: 0,
        transition: 'width 0.25s cubic-bezier(.4,0,.2,1), min-width 0.25s cubic-bezier(.4,0,.2,1)',
        overflow: 'hidden', zIndex: 30, flexShrink: 0,
        boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
      }}>

        {/* Logo */}
        <div style={{
          padding: collapsed ? '18px 0' : '20px 16px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between', gap: '8px',
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px', height: '34px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 16px rgba(99,102,241,0.5)',
                flexShrink: 0,
              }}>
                <Zap size={18} color="#fff" strokeWidth={2.5} />
              </div>
              <div>
                <span style={{
                  fontWeight: '800', fontSize: '15px', letterSpacing: '-0.02em',
                  background: 'linear-gradient(90deg, #c7d2fe, #e0e7ff)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>FusionIT</span>
                <p style={{ margin: 0, fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>Mesa de ayuda</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div style={{
              width: '34px', height: '34px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(99,102,241,0.4)',
            }}>
              <Zap size={18} color="#fff" strokeWidth={2.5} />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: '5px',
              borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.15s',
            }}>
            <ChevronLeft size={14} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{
          flex: 1, padding: collapsed ? '14px 8px' : '14px 10px',
          display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto',
        }}>
          {!collapsed && (
            <p style={{
              fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.25)',
              textTransform: 'uppercase', letterSpacing: '0.1em', padding: '2px 8px 10px',
            }}>Navegación</p>
          )}
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink key={item.name} to={item.path} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: collapsed ? '10px 0' : '9px 12px',
                borderRadius: '10px', textDecoration: 'none',
                fontSize: '13px', fontWeight: isActive ? '600' : '500',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: isActive ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.55)',
                transition: 'all 0.15s',
                position: 'relative',
              }}>
                {isActive && (
                  <span style={{
                    position: 'absolute', left: 0, top: '20%', bottom: '20%',
                    width: '3px', borderRadius: '0 3px 3px 0',
                    background: 'linear-gradient(180deg, #818cf8, #6366f1)',
                  }} />
                )}
                <item.icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                {!collapsed && item.name}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: collapsed ? '12px 8px' : '12px 10px' }}>
          {!collapsed && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
              background: 'rgba(255,255,255,0.06)', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)', marginBottom: '8px',
            }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: '34px', height: '34px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '700', fontSize: '12px', color: '#fff',
                }}>
                  {initials}
                </div>
                <div style={{
                  position: 'absolute', bottom: '1px', right: '1px',
                  width: '9px', height: '9px', background: '#22c55e',
                  border: '2px solid #1e1b4b', borderRadius: '50%',
                }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.9)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0,
                }}>{user?.full_name || 'Usuario'}</p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: 0, textTransform: 'capitalize' }}>{user?.role}</p>
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: '4px' }}>
                <Bell size={15} />
              </button>
            </div>
          )}
          {collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{
                width: '32px', height: '32px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '700', fontSize: '11px', color: '#fff',
              }}>
                {initials}
              </div>
            </div>
          )}
          <button onClick={logout} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: collapsed ? '10px 0' : '9px 12px', width: '100%',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(248,113,113,0.75)', borderRadius: '10px',
            fontSize: '13px', fontWeight: '500',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'all 0.15s',
          }}>
            <LogOut size={16} />
            {!collapsed && 'Cerrar Sesión'}
          </button>
        </div>
      </aside>
    </>
  );
}
