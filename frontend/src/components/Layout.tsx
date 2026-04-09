import React from 'react';
import { Sidebar } from './Sidebar';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", background:"#f8fafc" }}>
      <Sidebar />
      <main style={{ flex:1, marginLeft:"256px", height:"100vh", overflowY:"auto" }}>
        {children}
      </main>
    </div>
  );
}