import React from 'react';
import { User, Monitor, Tag, Clock, ChevronDown, Activity } from 'lucide-react';

export default function TicketSidebar() {
  return (
    <div className="space-y-4 font-sans">
      
      {/* Tarjeta 1: Acciones RÃ¡pidas y Estado */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">GestiÃ³n del Ticket</h3>
        
        <div className="space-y-3">
          {/* Selector de Estado simulado */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Estado</label>
            <button className="w-full flex justify-between items-center bg-amber-50 border border-amber-100 text-amber-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors">
              <span className="flex items-center gap-2"><Activity size={16} /> En progreso</span>
              <ChevronDown size={16} className="text-amber-500" />
            </button>
          </div>

          {/* Selector de AsignaciÃ³n */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Asignado a</label>
            <button className="w-full flex justify-between items-center border border-gray-200 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-600 rounded-full text-white flex items-center justify-center text-[10px]">TÃš</div>
                TÃº (Soporte N2)
              </span>
              <ChevronDown size={16} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Tarjeta 2: InformaciÃ³n del Solicitante */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Solicitante</h3>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">
            AL
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Ana LÃ³pez</p>
            <p className="text-xs text-gray-500">alopez@fusion-it.co</p>
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <p className="flex items-center gap-2"><User size={16} className="text-gray-400" /> Dpto. Contabilidad</p>
          <p className="flex items-center gap-2"><Tag size={16} className="text-gray-400" /> Sede Principal</p>
        </div>
      </div>

      {/* Tarjeta 3: Activo Afectado y ClasificaciÃ³n */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Contexto TÃ©cnico</h3>
        
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-start gap-3 cursor-pointer hover:bg-gray-100 transition-colors">
            <Monitor size={18} className="text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-gray-700">DELL-LATITUDE-004</p>
              <p className="text-xs text-gray-500">Laptop â€¢ Windows 11 Pro</p>
            </div>
          </div>

          <div className="pt-2 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">CategorÃ­a:</span>
              <span className="font-medium text-gray-800">Hardware</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Prioridad:</span>
              <span className="font-medium text-red-600">Alta</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta 4: SLAs */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Acuerdos de Nivel (SLA)</h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Tiempo de ResoluciÃ³n</span>
              <span className="font-bold text-amber-600">2h 15m restantes</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '65%' }}></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
