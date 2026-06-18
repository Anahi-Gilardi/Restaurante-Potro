import React, { useEffect, useMemo, useState } from 'react';
import { useToast, ToastContainer } from './ToastContainer';
import { X, Plus, Calendar } from 'lucide-react';
import { Mesa, Reserva } from '../types';
import { mesasService } from '../services/mesasService';
import { reservasService } from '../services/reservasService';

interface MesasProto1Props {
  mesas: Mesa[];
  onMesasChange: (mesas: Mesa[]) => void;
  addLog?: (tipo: 'sistema' | 'reserva' | 'mesa' | 'pedido_creado' | 'descuento_stock' | 'alerta_stock' | 'comanda_estado' | 'merma_registrada', mensaje: string) => void;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

// Mapa de mesas según el SVG. Cada entrada define el rectángulo del plano y la capacidad.
interface MesaSvgMap {
  id_mesa: number;
  svgId: string;
  numero: string;
  capacidad: number;
  zona: 'Comedor' | 'Salón';
  x: number;
  y: number;
  width: number;
  height: number;
}

const MESAS_SVG: MesaSvgMap[] = [
  { id_mesa: 8,  svgId: 'mesa-8-comedor-1', numero: 'Mesa 8',  capacidad: 8, zona: 'Comedor', x: 135, y: 60,  width: 80, height: 52 },
  { id_mesa: 4,  svgId: 'mesa-4-comedor-a', numero: 'Mesa 4',  capacidad: 4, zona: 'Comedor', x: 270, y: 60,  width: 64, height: 52 },
  { id_mesa: 5,  svgId: 'mesa-5-comedor-1', numero: 'Mesa 5',  capacidad: 5, zona: 'Comedor', x: 140, y: 145, width: 72, height: 52 },
  { id_mesa: 6,  svgId: 'mesa-4-comedor-b', numero: 'Mesa 6',  capacidad: 4, zona: 'Comedor', x: 270, y: 145, width: 64, height: 52 },
  { id_mesa: 7,  svgId: 'mesa-4-salon-c',  numero: 'Mesa 7',  capacidad: 4, zona: 'Salón',   x: 155, y: 325, width: 64, height: 52 },
  { id_mesa: 3,  svgId: 'mesa-3-salon-1',  numero: 'Mesa 3',  capacidad: 3, zona: 'Salón',   x: 285, y: 325, width: 52, height: 52 },
  { id_mesa: 9,  svgId: 'mesa-5-salon-b',  numero: 'Mesa 9',  capacidad: 5, zona: 'Salón',   x: 135, y: 415, width: 72, height: 52 },
  { id_mesa: 2,  svgId: 'mesa-2-salon-1',  numero: 'Mesa 2',  capacidad: 2, zona: 'Salón',   x: 285, y: 415, width: 52, height: 52 },
  { id_mesa: 1,  svgId: 'mesa-1-salon-1',  numero: 'Mesa 1',  capacidad: 1, zona: 'Salón',   x: 108, y: 495, width: 52, height: 52 },
];

const ESTADO_FILL = {
  libre: '#D4EDDA',
  ocupada: '#F8D7DA',
  reservada: '#FFF3CD',
  esperando_cuenta: '#d1fae5',
  limpiando: '#dbeafe',
};

const ESTADO_STROKE = {
  libre: '#28A745',
  ocupada: '#DC3545',
  reservada: '#FFC107',
  esperando_cuenta: '#10B981',
  limpiando: '#3B82F6',
};

const ESTADO_TEXT = {
  libre: '#28A745',
  ocupada: '#DC3545',
  reservada: '#B58900',
  esperando_cuenta: '#065F46',
  limpiando: '#1E40AF',
};

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

        // Si Supabase no tiene mesas, usar las del SVG mapeadas
        if (!mData.length) {
          const fallback = MESAS_SVG.map(m => ({
            id_mesa: m.id_mesa,
            numero_mesa: m.numero,
            capacidad: m.capacidad,
            sector: m.zona.toLowerCase() as Mesa['sector'],
            estado: 'libre' as const,
          }));
          setLocalMesas(fallback);
        } else {
          setLocalMesas(mData);
        }

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

  // Estado visual combinando mesa + reservas del día
  const mesasConEstado = useMemo(() => {
    return localMesas.map(m => {
      const reserva = reservasHoy.find(r => r.id_mesa === m.id_mesa && r.estado === 'confirmada');
      if (m.estado === 'ocupada') return m;
      if (reserva) return { ...m, estado: 'reservada' as const, reserva_cliente: reserva.nombre_cliente, reserva_hora: reserva.hora };
      return { ...m, estado: 'libre' as const };
    });
  }, [localMesas, reservasHoy]);

  const findMesaBySvgId = (svgId: string): Mesa | undefined => {
    const map = MESAS_SVG.find(m => m.svgId === svgId);
    if (!map) return undefined;
    return mesasConEstado.find(m => m.id_mesa === map.id_mesa && m.numero_mesa === map.numero);
  };

  const handleSvgClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const group = target.closest('[data-mesa-id]') as HTMLElement | null;
    if (!group) return;
    const svgId = group.dataset.mesaId;
    if (!svgId) return;
    const mesa = findMesaBySvgId(svgId);
    if (mesa) openModal(mesa);
  };

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
        await mesasService.update(selectedMesa.id_mesa, { estado: 'reservada' });
        addLog('reserva', `Nueva reserva en ${selectedMesa.numero_mesa}`);
        toast.success('Reserva creada');
      }

      const updated = reservasService.listByFecha ? await reservasService.listByFecha(today) : await reservasService.list();
      setReservasHoy((updated || []).filter((r: Reserva) =>
        (r.fecha === today || !r.fecha) && r.estado !== 'cancelada' && !r.lista_espera
      ));
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
      setReservasHoy((updated || []).filter((r: Reserva) =>
        (r.fecha === today || !r.fecha) && r.estado !== 'cancelada' && !r.lista_espera
      ));
      addLog('mesa', `${selectedMesa.numero_mesa} liberada`);
      toast.success('Mesa liberada');
      closeModal();
    } catch (err: any) {
      toast.error(err.message || 'Error al liberar');
    }
  };

  // Render del SVG con mesas interactivas y colores dinámicos
  const renderSvg = () => {
    const mesaElements = MESAS_SVG.map(m => {
      const mesaState = mesasConEstado.find(ms => ms.id_mesa === m.id_mesa && ms.numero_mesa === m.numero);
      const estado = (mesaState?.estado || 'libre') as keyof typeof ESTADO_FILL;
      const fill = ESTADO_FILL[estado];
      const stroke = ESTADO_STROKE[estado];
      const textColor = ESTADO_TEXT[estado];
      const capacidad = m.capacidad;

      return (
        <g key={m.svgId} data-mesa-id={m.svgId} className="cursor-pointer hover:opacity-90 transition-opacity"
           onClick={() => mesaState && openModal(mesaState)}
        >
          <rect x={m.x} y={m.y} width={m.width} height={m.height} rx={6}
                fill={fill} stroke={stroke} strokeWidth={2.5} />
          <text x={m.x + m.width / 2} y={m.y + m.height / 2 - 2} textAnchor="middle" fontSize={Math.min(18, m.width / 3.5)} fontWeight={700} fill={textColor} fontFamily="Arial, sans-serif">{capacidad}</text>
          <text x={m.x + m.width / 2} y={m.y + m.height / 2 + 14} textAnchor="middle" fontSize={9} fill={textColor} fontFamily="Arial, sans-serif" opacity={0.8}>Mesa</text>
        </g>
      );
    });

    return (
      <div className="w-full flex justify-center">
        <div className="w-full max-w-[260px] sm:max-w-[300px] aspect-[430/620]"
             onClick={handleSvgClick}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 430 620" preserveAspectRatio="xMidYMid meet" className="w-full h-full drop-shadow-xl"
          >
        <rect x="10" y="10" width="410" height="600" rx="4" fill="none" stroke="#3D2B1F" strokeWidth="3"/>
        <rect x="10" y="10" width="80" height="600" rx="4" fill="#2C1A0E"/>
        <text x="50" y="200" textAnchor="middle" fontSize="11" fill="#C9A96E" fontFamily="Georgia, serif" fontWeight="700" transform="rotate(-90, 50, 200)" letterSpacing="2">RESTAURANTE</text>
        <rect x="24" y="120" width="32" height="28" rx="6" fill="none" stroke="#C9A96E" strokeWidth="1.5" opacity="0.5"/>
        <rect x="24" y="175" width="32" height="28" rx="6" fill="none" stroke="#C9A96E" strokeWidth="1.5" opacity="0.5"/>
        <rect x="24" y="230" width="32" height="28" rx="6" fill="none" stroke="#C9A96E" strokeWidth="1.5" opacity="0.5"/>

        <rect x="90" y="10" width="330" height="255" fill="#EAE0CC"/>
        <text x="230" y="32" textAnchor="middle" fontSize="11" fontWeight="700" fill="#7A5C44" fontFamily="Arial, sans-serif" letterSpacing="3">COMEDOR</text>
        <line x1="90" y1="265" x2="420" y2="265" stroke="#3D2B1F" strokeWidth="2.5"/>

        <rect x="340" y="18" width="70" height="90" rx="4" fill="#D4C4A0" stroke="#8B6914" strokeWidth="2"/>
        <text x="375" y="60" textAnchor="middle" fontSize="10" fontWeight="700" fill="#5A3E10" fontFamily="Arial, sans-serif" letterSpacing="1">CAJA</text>
        <rect x="344" y="72" width="62" height="8" rx="3" fill="#8B6914" opacity="0.4"/>

        <rect x="90" y="265" width="330" height="345" fill="#EDE4D3"/>
        <text x="230" y="290" textAnchor="middle" fontSize="11" fontWeight="700" fill="#7A5C44" fontFamily="Arial, sans-serif" letterSpacing="3">SALÓN</text>

        <text x="50" y="530" textAnchor="middle" fontSize="9" fill="#C9A96E" fontFamily="Arial, sans-serif" letterSpacing="1" transform="rotate(-90, 50, 530)">PASILLO</text>

        <rect x="90" y="575" width="80" height="35" fill="#D4C4A0" stroke="#3D2B1F" strokeWidth="1.5"/>
        <text x="130" y="596" textAnchor="middle" fontSize="7" fill="#5A3E10" fontFamily="Arial, sans-serif" fontWeight="600">INGRESO</text>
        <text x="130" y="606" textAnchor="middle" fontSize="7" fill="#5A3E10" fontFamily="Arial, sans-serif">VEHICAL</text>

        <text x="418" y="140" textAnchor="middle" fontSize="9" fill="#7A5C44" fontFamily="Arial, sans-serif" transform="rotate(90, 418, 140)" letterSpacing="2" opacity="0.6">FACHADA</text>

        {mesaElements}

        {/* Sillas decorativas */}
        <g opacity="0.55">
          <circle cx="153" cy="48" r="7" fill="#28A745"/>
          <circle cx="175" cy="48" r="7" fill="#28A745"/>
          <circle cx="197" cy="48" r="7" fill="#28A745"/>
          <circle cx="153" cy="124" r="7" fill="#28A745"/>
          <circle cx="175" cy="124" r="7" fill="#28A745"/>
          <circle cx="197" cy="124" r="7" fill="#28A745"/>
          <circle cx="288" cy="48" r="7" fill="#DC3545"/>
          <circle cx="310" cy="48" r="7" fill="#DC3545"/>
          <circle cx="288" cy="124" r="7" fill="#DC3545"/>
          <circle cx="310" cy="124" r="7" fill="#DC3545"/>
          <circle cx="158" cy="133" r="7" fill="#28A745"/>
          <circle cx="180" cy="133" r="7" fill="#28A745"/>
          <circle cx="202" cy="133" r="7" fill="#28A745"/>
          <circle cx="158" cy="209" r="7" fill="#28A745"/>
          <circle cx="180" cy="209" r="7" fill="#28A745"/>
          <circle cx="288" cy="133" r="7" fill="#FFC107"/>
          <circle cx="310" cy="133" r="7" fill="#FFC107"/>
          <circle cx="288" cy="209" r="7" fill="#FFC107"/>
          <circle cx="310" cy="209" r="7" fill="#FFC107"/>
          <circle cx="173" cy="313" r="7" fill="#28A745"/>
          <circle cx="195" cy="313" r="7" fill="#28A745"/>
          <circle cx="173" cy="389" r="7" fill="#28A745"/>
          <circle cx="195" cy="389" r="7" fill="#28A745"/>
          <circle cx="303" cy="313" r="7" fill="#28A745"/>
          <circle cx="325" cy="313" r="7" fill="#28A745"/>
          <circle cx="303" cy="389" r="7" fill="#28A745"/>
          <circle cx="153" cy="403" r="7" fill="#DC3545"/>
          <circle cx="175" cy="403" r="7" fill="#DC3545"/>
          <circle cx="197" cy="403" r="7" fill="#DC3545"/>
          <circle cx="153" cy="479" r="7" fill="#DC3545"/>
          <circle cx="175" cy="479" r="7" fill="#DC3545"/>
          <circle cx="303" cy="403" r="7" fill="#28A745"/>
          <circle cx="325" cy="403" r="7" fill="#28A745"/>
          <circle cx="126" cy="483" r="7" fill="#28A745"/>
        </g>

        {/* Leyenda */}
        <rect x="170" y="580" width="14" height="14" rx="3" fill="#D4EDDA" stroke="#28A745" strokeWidth="2"/>
        <text x="188" y="591" fontSize="9" fill="#2C1A0E" fontFamily="Arial, sans-serif">Libre</text>
        <rect x="230" y="580" width="14" height="14" rx="3" fill="#F8D7DA" stroke="#DC3545" strokeWidth="2"/>
        <text x="248" y="591" fontSize="9" fill="#2C1A0E" fontFamily="Arial, sans-serif">Ocupado</text>
        <rect x="310" y="580" width="14" height="14" rx="3" fill="#FFF3CD" stroke="#FFC107" strokeWidth="2"/>
        <text x="328" y="591" fontSize="9" fill="#2C1A0E" fontFamily="Arial, sans-serif">Reservado</text>
      </svg>
        </div>
      </div>
    );
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
          <p className="text-xs text-stone-500 font-medium">Haz clic en una mesa para reservar o liberar</p>
        </div>
      </div>

      {/* Plano SVG */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-stone-200 shadow-sm">
        {renderSvg()}
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
