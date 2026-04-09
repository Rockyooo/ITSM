import React from 'react';
import { Sidebar } from './Sidebar';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      <Sidebar />
      <main className="flex-1 ml-64 h-screen overflow-auto">
        {children}
      </main>
    </div>
  );
}