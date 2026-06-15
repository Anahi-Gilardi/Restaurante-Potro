import React, { useState, useEffect } from 'react';
import { Calendar, Phone, Plus, Check, Clock, User, Trash, Edit2, X, Search } from 'lucide-react';
import { Mesa, Reserva, EventoLog } from '../types';
import { reservasService } from '../services/reservasService';

interface ReservasModuleProps {
  mesas: Mesa[];
  onEstadoChange: (reserva: Reserva, estado: Reserva['estado']) => void;
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function ReservasModule({ mesas, onEstadoChange, addLog }: ReservasModuleProps) {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [search, setSearch] = useState('');

  useEffect(() => {
    reservasService.list().then(data => {
      if (data && data.length > 0) { setReservas(data); }
      else {
        setReservas([
          { id_reserva: 'r_1', nombre_cliente: 'Gisela Scaglia', telefono: '+54 11 9382-3844', pax: 4, nombre_mesa: 'VIP-1', hora: '21:00 hs', estado: 'confirmada', fecha: formatDate(new Date()) },
          { id_reserva: 'r_2', nombre_cliente: 'Mariano Closs', telefono: '+54 9 11 3881-2993', pax: 2, nombre_mesa: 'Mesa 1', hora: '21:30 hs', estado: 'confirmada', fecha: formatDate(new Date()) },
          { id_reserva: 'r_3', nombre_cliente: 'Romina Pereyra', telefono: '+54 11 6005-2810', pax: 3, nombre_mesa: 'Mesa 5', hora: '22:00 hs', estado: 'confirmada', fecha: formatDate(new Date()) },
          { id_reserva: 'r_4', nombre_cliente: 'Juan Román Riquelme', telefono: '+54 9 11 5010-1010', pax: 6, nombre_mesa: 'Terraza-3', hora: '22:30 hs', estado: 'confirmada', fecha: formatDate(new Date()) },
        ]);
      }
    }).catch(() => {});
  }, []);

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [pax, setPax] = useState('2');
  const [nombreMesa, setNombreMesa] = useState(mesas[0]?.numero_mesa || 'Mesa 1');
  const [hora, setHora] = useState('21:00');
  const [observaciones, setObservaciones] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);

  const reservasDelDia = reservas.filter(r => !r.fecha || r.fecha === selectedDate);
  const filtered = reservasDelDia.filter(r =>
    r.nombre_cliente.toLowerCase().includes(search.toLowerCase()) ||
    r.telefono.includes(search)
  );

  const handleCreateReserva = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !telefono) return;
    const selectedMesa = mesas.find(m => m.numero_mesa === nombreMesa);

    if (editingId) {
      setReservas(prev => prev.map(r => {
        if (r.id_reserva === editingId) {
          const updated = { ...r, nombre_cliente: nombre, telefono, pax: parseInt(pax) || 2, nombre_mesa: nombreMesa, id_mesa: selectedMesa?.id_mesa, hora: `${hora} hs`, observaciones: observaciones.trim() || undefined };
          addLog('sistema', `RESERVAS: Modificada reserva de '${nombre}'`);
          return updated;
        }
        return r;
      }));
      setEditingId(null);
    } else {
      const newRes: Reserva = {
        id_reserva: `r_${Date.now()}`,
        nombre_cliente: nombre, telefono, pax: parseInt(pax) || 2, nombre_mesa: nombreMesa,
        id_mesa: selectedMesa?.id_mesa, hora: `${hora} hs`, estado: 'confirmada',
        fecha: selectedDate, observaciones: observaciones.trim() || undefined,
      };
      setReservas(prev => [...prev, newRes]);
      reservasService.create(newRes).catch(err => console.error(err));
      addLog('sistema', `RESERVAS: Registrada nueva reserva para '${nombre}' para ${pax} personas el ${selectedDate} a las ${hora}hs en ${nombreMesa}`);
    }
    setNombre(''); setTelefono(''); setObservaciones('');
  };

  const handleEdit = (r: Reserva) => {
    setEditingId(r.id_reserva);
    setNombre(r.nombre_cliente); setTelefono(r.telefono);
    setPax(String(r.pax)); setNombreMesa(r.nombre_mesa);
    setHora(r.hora.replace(' hs', '')); setObservaciones(r.observaciones || '');
  };

  const handleChangeEstado = (id: string, nuevoEstado: Reserva['estado']) => {
    setReservas(prev => prev.map(r => {
      if (r.id_reserva === id) {
        reservasService.update(id, { estado: nuevoEstado }).catch(err => console.error(err));
        onEstadoChange(r, nuevoEstado);
        addLog('sistema', `RESERVAS: Reserva de '${r.nombre_cliente}' cambió a ${nuevoEstado.toUpperCase()}`);
        return { ...r, estado: nuevoEstado };
      }
      return r;
    }));
  };

  const handleDeleteReserva = (id: string) => {
    const target = reservas.find(r => r.id_reserva === id);
    if (!target) return;
    onEstadoChange(target, 'cancelada');
    setReservas(prev => prev.filter(r => r.id_reserva !== id));
    reservasService.remove(id).catch(err => console.error(err));
    addLog('sistema', `RESERVAS: Anulada la reserva de '${target.nombre_cliente}' de las ${target.hora}`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs h-fit space-y-4">
          <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#624A3E]" />
            {editingId ? 'Editar Reserva' : 'Nueva Reserva'}
          </h3>
          <form onSubmit={handleCreateReserva} className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Fecha</label>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]" required />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Nombre y Apellido</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Ej. Gisela Scaglia"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]" required />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Celular / WhatsApp</label>
              <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)}
                placeholder="Ej. +54 11 9382-3844"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]" required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Pax</label>
                <select value={pax} onChange={e => setPax(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none cursor-pointer focus:ring-1 focus:ring-[#624A3E] font-semibold text-stone-700">
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Persona' : 'Personas'}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Hora</label>
                <input type="time" value={hora} onChange={e => setHora(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]" required />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Mesa</label>
              <select value={nombreMesa} onChange={e => setNombreMesa(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none cursor-pointer focus:ring-1 focus:ring-[#624A3E] font-semibold text-stone-700">
                {mesas.map(m => <option key={m.id_mesa} value={m.numero_mesa}>{m.numero_mesa}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Observaciones</label>
              <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)}
                placeholder="Ej. Alergia al maní, mesa cerca de ventana..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E] resize-none" />
            </div>
            <button type="submit"
              className="w-full py-2.5 bg-[#624A3E] hover:bg-[#503C32] text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer">
              {editingId ? 'Guardar Cambios' : 'Confirmar Reserva'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setNombre(''); setTelefono(''); setObservaciones(''); }}
                className="w-full py-2 text-xs font-bold text-stone-500 hover:text-stone-700 transition-colors cursor-pointer">
                Cancelar edición
              </button>
            )}
          </form>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs lg:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-stone-100">
            <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#624A3E]" />
              Reservas ({filtered.length})
            </h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="pl-8 pr-2 py-1 text-[10px] border border-stone-200 rounded-lg bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#624A3E] w-32" />
              </div>
              <span className="text-[9px] bg-stone-100 text-stone-500 font-bold px-2 py-0.5 rounded-full">
                {selectedDate}
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {filtered.length === 0 ? (
              <p className="text-xs text-stone-400 italic text-center py-8">Sin reservas para esta fecha.</p>
            ) : (
              filtered.map(r => {
                let statusBg = 'bg-stone-50 text-stone-600 border-stone-201';
                if (r.estado === 'sentada') statusBg = 'bg-emerald-50 text-emerald-800 border-emerald-100';
                if (r.estado === 'confirmada') statusBg = 'bg-blue-50 text-blue-800 border-blue-100';
                if (r.estado === 'pendiente') statusBg = 'bg-amber-50 text-amber-800 border-amber-100';
                if (r.estado === 'completada') statusBg = 'bg-stone-100 text-stone-500 border-stone-200';

                return (
                  <div key={r.id_reserva} className="p-4 bg-[#F5F1E9]/40 border border-stone-150 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-[#F5F1E9]/70 transition-colors">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2.5">
                        <h4 className="font-extrabold text-stone-900 text-sm tracking-tight">{r.nombre_cliente}</h4>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${statusBg}`}>{r.estado}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 font-medium">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-stone-400" />{r.hora}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-stone-400" />{r.telefono}</span>
                        <span>•</span>
                        <span>{r.nombre_mesa} ({r.pax} pax)</span>
                      </div>
                      {r.observaciones && (
                        <p className="text-[10px] text-amber-700 italic mt-1">📝 {r.observaciones}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleEdit(r)}
                        className="p-1.5 rounded-lg bg-stone-50 hover:bg-blue-50 text-stone-400 hover:text-blue-500 transition-colors cursor-pointer" title="Editar">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {r.estado === 'confirmada' && (
                        <button onClick={() => handleChangeEstado(r.id_reserva, 'sentada')}
                          className="py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black cursor-pointer transition-colors">
                          Sentar
                        </button>
                      )}
                      {r.estado === 'sentada' && (
                        <button onClick={() => handleChangeEstado(r.id_reserva, 'completada')}
                          className="py-1 px-2.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 text-[10px] font-black cursor-pointer transition-colors">
                          Completar
                        </button>
                      )}
                      <button onClick={() => handleDeleteReserva(r.id_reserva)}
                        className="p-1.5 rounded-lg bg-stone-50 hover:bg-rose-50 text-stone-400 hover:text-rose-500 transition-colors cursor-pointer" title="Anular">
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
