import React from 'react';
// Importamos el componente que acabamos de crear para la barra lateral
import TicketSidebar from '../components/TicketSidebar'; 
// Importamos el componente de la línea de tiempo
import TicketTimeline from '../components/TicketTimeline'; 

export default function TicketDetail() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      
      {/* Botón para volver atrás */}
      <div className="mb-6">
        <a href="/tickets" className="text-blue-600 hover:underline text-sm font-medium flex items-center gap-1">
          &larr; Volver a la lista de tickets
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Principal: La línea de tiempo (ocupa más espacio) */}
        <div className="lg:col-span-2">
          <TicketTimeline />
        </div>

        {/* Columna Lateral: Aquí ubicamos el TicketSidebar que creamos antes */}
        <div className="h-fit">
          <TicketSidebar />
        </div>

      </div>
    </div>
  );
}
