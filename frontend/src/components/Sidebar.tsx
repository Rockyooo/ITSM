import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Ticket, 
  Users, 
  Building, 
  Settings, 
  LogOut,
  Bell,
  ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '../store/auth';

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  // Opciones base visibles para usuarios normales
  const menuItems = [
    { name: 'Dashboard', icon: Home, path: '/dashboard' },
    { name: 'Mis Tickets', icon: Ticket, path: '/tickets' },
  ];

  // Si es supervisor, agregamos más vistas
  if (user?.role === 'supervisor' || user?.role === 'admin') {
    menuItems.push(
      { name: 'Panel Supervisor', icon: ShieldCheck, path: '/supervisor' },
      { name: 'Empresas', icon: Building, path: '/empresas' },
      { name: 'Usuarios', icon: Users, path: '/usuarios' },
      { name: 'Permisos', icon: Settings, path: '/permisos' }
    );
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen fixed inset-y-0 left-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 font-sans">
      
      {/* Encabezado del Logo */}
      <div className="h-20 flex items-center px-8 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <span className="text-white font-bold text-lg leading-none mt-[-2px]">f</span>
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600">
            FusionIT
          </span>
        </div>
      </div>

      {/* Menú de Navegación principal */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 mt-2">
          Navegación
        </p>

        {menuItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-50 text-blue-700 font-semibold' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 mx-1 hover:mx-0'
              }`}
            >
              <item.icon 
                size={20} 
                className={isActive ? 'text-blue-600' : 'text-gray-400'} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Pie del Sidebar - Perfil de Usuario */}
      <div className="p-4 border-t border-gray-100">
        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 hover:border-blue-100 transition-colors flex items-center gap-3 mb-3 cursor-pointer">
          <div className="relative">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold shadow-sm">
              {user?.full_name?.substring(0, 2).toUpperCase() || 'US'}
            </div>
            <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 truncate">
              {user?.full_name || 'Usuario'}
            </p>
            <p className="text-xs text-gray-500 truncate capitalize">
              {user?.role?.replace('_', ' ') || 'Soporte'}
            </p>
          </div>
          <button className="text-gray-400 hover:text-blue-600 transition-colors">
            <Bell size={18} />
          </button>
        </div>

        <button 
          onClick={logout}
          className="flex items-center gap-3 px-4 py-2.5 w-full text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
        >
          <LogOut size={18} />
          Cerrar Sesión
        </button>
      </div>

    </aside>
  );
}
