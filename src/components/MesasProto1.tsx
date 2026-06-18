import React, { useEffect, useMemo, useState } from 'react';
import { useToast, ToastContainer } from './ToastContainer';
import { Users, X, Plus, Calendar } from 'lucide-react';
import { Mesa, Reserva } from '../types';
import { mesasService } from '../services/mesasService';
import { reservasService } from '../services/reservasService';

interface MesasProto1Props {
  mesas: Mesa[];
  onMesasChange: (mesas: Mesa[]) => void;
  addLog?: (tipo: 'sistema' | 'reserva' | 'mesa' | 'pedido_creado' | 'descuento_stock' | 'alerta_stock' | 'comanda_estado' | 'merma_registrada', mensaje: string) => void;
}

type Zona = 'Patio' | 'Comedor' | 'Salón' | 'Sector VIP';

const ZONAS: Zona[] = ['Patio', 'Comedor', 'Salón', 'Sector VIP'];

const COLORES_ZONA: Record<Zona, string> = {
  'Patio': 'bg-stone-100/60 border-stone-200',
  'Comedor': 'bg-stone-100/60 border-stone-200',
  'Salón': 'bg-stone-100/60 border-stone-200',
  'Sector VIP': 'bg-[#F5E6D3]/60 border-[#D4A574]',
};

const ESTADO_STYLES = {
  libre: 'bg-[#D4A574] text-white border-[#B08050] shadow-[#D4A574]/30',
  ocupada: 'bg-[#8B5A2B] text-white border-[#6B4223] shadow-[#8B5A2B]/40',
  reservada: 'bg-amber-400 text-amber-950 border-amber-500 shadow-amber-400/40',
  esperando_cuenta: 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-600/40',
  limpiando: 'bg-blue-400 text-white border-blue-500 shadow-blue-400/40',
};

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function MesasProto1({ mesas, onMesasChange, addLog = () => {} }: MesasProto1Props) {
  const { toast, toasts, removeToast } = useToast();
  const [localMesas, setLocalMesas] = useState<Mesa[]>(mesas);
  const [reservasHoy, setReservasHoy] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal reserva
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [pax, setPax] = useState('2');
  const [hora, setHora] = useState('21:00');
  const [fecha, setFecha] = useState(formatDate(new Date()));
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);

  const today = formatDate(new Date());

  // Cargar mesas y reservas del día
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [mData, rData] = await Promise.all([
          mesasService.list(),
          reservasService.listByFecha ? await reservasService.listByFecha(today) : await reservasService.list()
        ]);
        if (!mounted) return;
        setLocalMesas(mData.length ? mData : mesas);
        const reservasFiltradas = (rData || []).filter((r: Reserva) =>
          (r.fecha === today || !r.fecha) && r.estado !== 'cancelada' && !r.lista_espera
        );
        setReservasHoy(reservasFiltradas);
      } catch (err) {
        console.error(err);
        toast.error('Error cargando datos de mesas');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [mesas, today]);

  // Realtime mesas
  useEffect(() => {
    const channel = mesasService.subscribe((payload: any) => {
      if (payload.eventType === 'UPDATE' && payload.new) {
        setLocalMesas(prev => prev.map(m => m.id_mesa === payload.new.id_mesa ? { ...m, ...payload.new } : m));
      } else if (payload.eventType === 'INSERT' && payload.new) {
        setLocalMesas(prev => [...prev, payload.new as Mesa]);
      } else if (payload.eventType === 'DELETE' && payload.old) {
        setLocalMesas(prev => prev.filter(m => m.id_mesa !== payload.old.id_mesa));
      }
    });
    return () => {
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    onMesasChange(localMesas);
  }, [localMesas, onMesasChange]);

  // Calcular estado visual combinando mesa + reservas del día
  const mesasConEstado = useMemo(() => {
    return localMesas.map(m => {
      const reserva = reservasHoy.find(r => r.id_mesa === m.id_mesa && r.estado === 'confirmada');
      if (m.estado === 'ocupada') return m;
      if (reserva) return { ...m, estado: 'reservada' as const, reserva_cliente: reserva.nombre_cliente, reserva_hora: reserva.hora };
      return { ...m, estado: 'libre' as const };
    });
  }, [localMesas, reservasHoy]);

  const mesasPorZona = (zona: Zona) => mesasConEstado.filter(m => {
    const s = (m.sector || 'salon').toLowerCase();
    if (zona === 'Sector VIP') return s === 'vip';
    if (zona === 'Salón') return s === 'salon';
    return s === zona.toLowerCase();
  });

  const openModal = (mesa: Mesa) => {
    setSelectedMesa(mesa);
    const reservaExistente = reservasHoy.find(r => r.id_mesa === mesa.id_mesa && r.estado === 'confirmada');
    if (reservaExistente) {
      setNombre(reservaExistente.nombre_cliente);
      setTelefono(reservaExistente.telefono);
      setPax(String(reservaExistente.pax));
      setHora(reservaExistente.hora.replace(' hs', ''));
      setFecha(reservaExistente.fecha || today);
      setObservaciones(reservaExistente.observaciones || '');
    } else {
      setNombre('');
      setTelefono('');
      setPax(String(mesa.capacidad || 2));
      setHora('21:00');
      setFecha(today);
      setObservaciones('');
    }
  };

  const closeModal = () => {
    setSelectedMesa(null);
    setSaving(false);
  };

  const handleSaveReserva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMesa) return;
    setSaving(true);

    try {
      const reservaExistente = reservasHoy.find(r => r.id_mesa === selectedMesa.id_mesa && r.estado === 'confirmada');
      const payload: Partial<Reserva> = {
        nombre_cliente: nombre.trim(),
        telefono: telefono.trim(),
        pax: parseInt(pax) || 1,
        hora: `${hora} hs`,
        fecha,
        id_mesa: selectedMesa.id_mesa,
        nombre_mesa: selectedMesa.numero_mesa,
        observaciones: observaciones.trim() || undefined,
        estado: 'confirmada',
      };

      if (reservaExistente) {
        await reservasService.update(reservaExistente.id_reserva, payload);
        addLog('reserva', `Reserva actualizada en ${selectedMesa.numero_mesa}`);
        toast.success('Reserva actualizada');
      } else {
        const newRes: Reserva = {
          id_reserva: `r_${Date.now()}`,
          ...payload as Reserva,
        };
        await reservasService.create(newRes);
        // Actualizar estado de mesa a reservada
        await mesasService.update(selectedMesa.id_mesa, { estado: 'reservada' });
        addLog('reserva', `Nueva reserva en ${selectedMesa.numero_mesa}`);
        toast.success('Reserva creada');
      }

      // Refrescar reservas
      const updated = reservasService.listByFecha ? await reservasService.listByFecha(today) : await reservasService.list();
      setReservasHoy((updated || []).filter((r: Reserva) => (r.fecha === today || !r.fecha) && r.estado !== 'cancelada' && !r.lista_espera));
      closeModal();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error guardando reserva');
      setSaving(false);
    }
  };

  const handleLiberarMesa = async () => {
    if (!selectedMesa) return;
    try {
      await mesasService.update(selectedMesa.id_mesa, { estado: 'libre', comensales: 0, reserva_cliente: undefined, reserva_hora: undefined });
      const reservaExistente = reservasHoy.find(r => r.id_mesa === selectedMesa.id_mesa && r.estado === 'confirmada');
      if (reservaExistente) {
        await reservasService.update(reservaExistente.id_reserva, { estado: 'completada' });
      }
      setLocalMesas(prev => prev.map(m => m.id_mesa === selectedMesa.id_mesa ? { ...m, estado: 'libre', comensales: 0 } : m));
      const updated = reservasService.listByFecha ? await reservasService.listByFecha(today) : await reservasService.list();
      setReservasHoy((updated || []).filter((r: Reserva) => (r.fecha === today || !r.fecha) && r.estado !== 'cancelada' && !r.lista_espera));
      addLog('mesa', `${selectedMesa.numero_mesa} liberada`);
      toast.success('Mesa liberada');
      closeModal();
    } catch (err: any) {
      toast.error(err.message || 'Error al liberar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-stone-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#624A3E] mr-3" />
        Cargando plano de mesas...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-800 tracking-tight">Plano de Mesas</h2>
          <p className="text-xs text-stone-500 font-medium">Prototipo 1 · Sectores · Estado en tiempo real</p>
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#D4A574]" />Libre</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#8B5A2B]" />Ocupada</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400" />Reservada</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-600" />Espera cuenta</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400" />Limpieza</span>
        </div>
      </div>

      {/* Plano por zonas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {ZONAS.map(zona => {
          const mesasZona = mesasPorZona(zona);
          return (
            <div key={zona} className={`rounded-2xl border p-5 ${COLORES_ZONA[zona]} ${zona === 'Sector VIP' ? 'md:col-span-2' : ''}`}>
              <h3 className="text-xs font-black text-stone-600 uppercase tracking-widest mb-4 text-center">{zona}</h3>
              {mesasZona.length === 0 ? (
                <p className="text-center text-xs text-stone-400 italic">Sin mesas en esta zona</p>
              ) : (
                <div className="flex flex-wrap justify-center gap-4">
                  {mesasZona.map(m => {
                    const estilo = ESTADO_STYLES[m.estado] || ESTADO_STYLES.libre;
                    return (
                      <button
                        key={m.id_mesa}
                        onClick={() => openModal(m)}
                        className={`group relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 ${estilo} shadow-lg hover:scale-105 transition-all flex flex-col items-center justify-center cursor-pointer`}
                        title={`${m.numero_mesa} · ${m.estado}`}
                      >
                        <span className="text-[10px] sm:text-xs font-black uppercase opacity-80">{m.numero_mesa}</span>
                        <div className="flex items-center gap-0.5 text-[10px] font-bold">
                          <Users className="w-3 h-3" />
                          {m.capacidad || '-'}
                        </div>
                        {m.estado === 'reservada' && m.reserva_hora && (
                          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-amber-700 whitespace-nowrap bg-white/80 px-1.5 py-0.5 rounded-full border border-amber-200">
                            {m.reserva_hora}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {selectedMesa && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[20px] sm:rounded-[20px] w-full max-w-md p-6 shadow-2xl border border-stone-200 animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-black text-stone-800">{selectedMesa.numero_mesa}</h3>
                <p className="text-xs text-stone-500 font-medium">{selectedMesa.sector} · Capacidad {selectedMesa.capacidad} pax · Estado: <span className="font-bold capitalize">{selectedMesa.estado}</span></p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-stone-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-stone-500" /></button>
            </div>

            {selectedMesa.estado === 'ocupada' ? (
              <div className="space-y-4">
                <p className="text-sm text-stone-600">La mesa está ocupada. Podés liberarla cuando el cliente termine.</p>
                <button onClick={handleLiberarMesa} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer">Liberar mesa</button>
              </div>
            ) : (
              <form onSubmit={handleSaveReserva} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Fecha</label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} required className="w-full pl-9 pr-2 py-2.5 text-xs border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#624A3E]" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Hora</label>
                    <input type="time" value={hora} onChange={e => setHora(e.target.value)} required className="w-full px-3 py-2.5 text-xs border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#624A3E]" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Nombre y Apellido</label>
                  <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Carlos Tevez" required className="w-full px-3 py-2.5 text-xs border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#624A3E]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Celular</label>
                    <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+54 11..." className="w-full px-3 py-2.5 text-xs border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#624A3E]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Pax</label>
                    <select value={pax} onChange={e => setPax(e.target.value)} className="w-full px-3 py-2.5 text-xs border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#624A3E]">
                      {[1,2,3,4,5,6,7,8,9,10,12,14,16].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Observaciones</label>
                  <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} placeholder="Alergias, ubicación preferida..." className="w-full px-3 py-2.5 text-xs border border-stone-200 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-[#624A3E]" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeModal} className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold cursor-pointer">Cancelar</button>
                  <button type="submit" disabled={saving} className="flex-1 py-3 bg-[#624A3E] hover:bg-[#503C32] text-white rounded-xl font-bold cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                    {reservasHoy.some(r => r.id_mesa === selectedMesa.id_mesa && r.estado === 'confirmada') ? 'Guardar' : 'Reservar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
