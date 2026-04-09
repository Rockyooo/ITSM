import React from 'react';
import { Sidebar } from './Sidebar';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans">
      <Sidebar />
      
      {/* Contenido principal. Se añade margen izquierdo equivalente al ancho del Sidebar (w-64 = 16rem = 256px) */}
      <main className="flex-1 ml-64 min-h-screen transition-all duration-300 ease-in-out">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
