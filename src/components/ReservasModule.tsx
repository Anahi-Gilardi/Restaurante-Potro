import React, { useState, useEffect } from 'react';
import { Calendar, Phone, Plus, Check, Clock, User, Trash } from 'lucide-react';
import { Mesa, Reserva, EventoLog } from '../types';
import { reservasService } from '../services/reservasService';

interface ReservasModuleProps {
  mesas: Mesa[];
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

export default function ReservasModule({ mesas, addLog }: ReservasModuleProps) {
  const [reservas, setReservas] = useState<Reserva[]>([]);

  useEffect(() => {
    reservasService.list().then(data => {
      if (data && data.length > 0) {
        setReservas(data);
      } else {
        const defaults: Reserva[] = [
          { id_reserva: 'r_1', nombre_cliente: 'Gisela Scaglia', telefono: '+54 11 9382-3844', pax: 4, nombre_mesa: 'VIP-1', hora: '21:00 hs', estado: 'confirmada' },
          { id_reserva: 'r_2', nombre_cliente: 'Mariano Closs', telefono: '+54 9 11 3881-2993', pax: 2, nombre_mesa: 'Mesa 1', hora: '21:30 hs', estado: 'confirmada' },
          { id_reserva: 'r_3', nombre_cliente: 'Romina Pereyra', telefono: '+54 11 6005-2810', pax: 3, nombre_mesa: 'Mesa 5', hora: '22:00 hs', estado: 'confirmada' },
          { id_reserva: 'r_4', nombre_cliente: 'Juan Román Riquelme', telefono: '+54 9 11 5010-1010', pax: 6, nombre_mesa: 'Terraza-3', hora: '22:30 hs', estado: 'confirmada' },
        ];
        setReservas(defaults);
      }
    }).catch(() => {});
  }, []);


  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [pax, setPax] = useState('2');
  const [nombreMesa, setNombreMesa] = useState(mesas[0]?.numero_mesa || 'Mesa 1');
  const [hora, setHora] = useState('21:00');

  const handleCreateReserva = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !telefono) return;
    const selectedMesa = mesas.find(m => m.numero_mesa === nombreMesa);

    const newRes: Reserva = {
      id_reserva: `r_${Date.now()}`,
      nombre_cliente: nombre,
      telefono,
      pax: parseInt(pax) || 2,
      nombre_mesa: nombreMesa,
      id_mesa: selectedMesa?.id_mesa,
      hora: `${hora} hs`,
      estado: 'confirmada'
    };

    setReservas(prev => [...prev, newRes]);
    reservasService.create(newRes).catch(err => console.error(err));
    addLog('sistema', `RESERVAS: Registrada nueva reserva para '${nombre}' para ${pax} personas hoy a las ${hora}hs en mesa ${nombreMesa}`);
    setNombre('');
    setTelefono('');
  };

  const handleChangeEstado = (id: string, nuevoEstado: Reserva['estado']) => {
    setReservas(prev => prev.map(r => {
      if (r.id_reserva === id) {
        reservasService.update(id, { estado: nuevoEstado }).catch(err => console.error(err));
        addLog('sistema', `RESERVAS: Reserva de '${r.nombre_cliente}' cambió de estado a ${nuevoEstado.toUpperCase()}`);
        return { ...r, estado: nuevoEstado };
      }
      return r;
    }));
  };

  const handleDeleteReserva = (id: string) => {
    const target = reservas.find(r => r.id_reserva === id);
    if (!target) return;
    setReservas(prev => prev.filter(r => r.id_reserva !== id));
    reservasService.remove(id).catch(err => console.error(err));
    addLog('sistema', `RESERVAS: Anulada la reserva de '${target.nombre_cliente}' de las ${target.hora}`);
  };

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left column: Add booking */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs h-fit space-y-4">
          <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#624A3E]" />
            Nueva Reserva Hoy
          </h3>
          <form onSubmit={handleCreateReserva} className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Nombre y Apellido</label>
              <input 
                type="text" 
                value={nombre} 
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej. Gisela Scaglia"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Celular / WhatsApp</label>
              <input 
                type="text" 
                value={telefono} 
                onChange={e => setTelefono(e.target.value)}
                placeholder="Ej. +54 11 9382-3844"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Pax (Personas)</label>
                <select 
                  value={pax} 
                  onChange={e => setPax(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none cursor-pointer focus:ring-1 focus:ring-[#624A3E] font-semibold text-stone-700"
                >
                  <option value="1">1 Persona</option>
                  <option value="2">2 Personas</option>
                  <option value="3">3 Personas</option>
                  <option value="4">4 Personas</option>
                  <option value="5">5 Personas</option>
                  <option value="6">6 Personas</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Hora de Cita</label>
                <input 
                  type="time" 
                  value={hora} 
                  onChange={e => setHora(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Mesa Reservada</label>
              <select 
                value={nombreMesa} 
                onChange={e => setNombreMesa(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none cursor-pointer focus:ring-1 focus:ring-[#624A3E] font-semibold text-stone-700"
              >
                {mesas.map(m => (
                  <option key={m.id_mesa} value={m.numero_mesa}>{m.numero_mesa}</option>
                ))}
              </select>
            </div>

            <button 
              type="submit"
              className="w-full py-2.5 bg-[#624A3E] hover:bg-[#503C32] text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer"
            >
              Confirmar Reserva
            </button>
          </form>
        </div>

        {/* Right 3 cols: active schedules */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs lg:col-span-3 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-stone-100">
            <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#624A3E]" />
              Cronograma de Reservas de Hoy ({reservas.length})
            </h3>
            <span className="text-[9px] bg-stone-100 text-stone-500 font-bold px-2 py-0.5 rounded-full">Recepción de Salón</span>
          </div>

          <div className="space-y-2.5">
            {reservas.map(r => {
              let statusBg = 'bg-stone-50 text-stone-600 border-stone-201';
              if (r.estado === 'sentada') statusBg = 'bg-emerald-50 text-emerald-800 border-emerald-100';
              if (r.estado === 'confirmada') statusBg = 'bg-blue-50 text-blue-800 border-blue-100';

              return (
                <div key={r.id_reserva} className="p-4 bg-[#F5F1E9]/40 border border-stone-150 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-[#F5F1E9]/70 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h4 className="font-extrabold text-stone-900 text-sm tracking-tight">{r.nombre_cliente}</h4>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${statusBg}`}>
                        {r.estado}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        {r.hora}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3.5 h-3.5 text-stone-400" />
                        {r.telefono}
                      </span>
                      <span>•</span>
                      <span>Lugar: <strong>{r.nombre_mesa}</strong> ({r.pax} pax)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {r.estado === 'confirmada' && (
                      <button
                        onClick={() => handleChangeEstado(r.id_reserva, 'sentada')}
                        className="py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black cursor-pointer transition-colors"
                      >
                        Sentar en Mesa
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteReserva(r.id_reserva)}
                      className="p-1.5 rounded-lg bg-stone-50 hover:bg-rose-50 text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Anular reserva"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
}
