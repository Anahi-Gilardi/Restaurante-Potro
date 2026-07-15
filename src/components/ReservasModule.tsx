import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Calendar, Phone, Plus, Check, Clock, User, Trash, Edit2, X, Search,
  ChevronLeft, ChevronRight, CalendarDays, List, AlertCircle, ArrowRight,
  Users, Armchair, Loader2, CalendarClock, AlertTriangle, Send, CheckCircle2
} from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { Mesa, Reserva, EventoLog } from '../types';
import { reservasService } from '../services/reservasService';
import { reservaSchema } from '../lib/validations';
import { ToastContainer, useToast } from './ToastContainer';
import { argentinaDateIso } from '../lib/argentinaDate';

interface ReservasModuleProps {
  mesas: Mesa[];
  onEstadoChange: (reserva: Reserva, estado: Reserva['estado']) => void;
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

function formatDate(d: Date): string {
  return argentinaDateIso(d);
}
function parseTimeToMin(t?: string | null): number {
  const match = String(t ?? '').match(/(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : 0;
}
function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}
function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);
  start.setDate(start.getDate() - ((firstDay.getDay() + 6) % 7));
  const cells: Date[] = [];
  for (let w = 0; w < 6; w++) {
    for (let d = 0; d < 7; d++) {
      cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d));
    }
  }
  return cells;
}
function monthLabel(d: Date): string {
  return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}
function weekRangeLabel(start: Date): string {
  const end = addDays(start, 6);
  const s = start.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  const e = end.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  return `${s} - ${e}`;
}

// Generador de enlaces con plantillas de WhatsApp
function getWhatsAppLink(
  nombre: string,
  telefono: string,
  fecha: string,
  hora: string,
  pax: number,
  template: 'standard' | 'recordatorio' | 'espera',
  mesaNombre?: string
): string {
  const cleanPhone = telefono.replace(/[^\d+]/g, '');
  let message = '';
  const dateFormatted = new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });

  if (template === 'standard') {
    message = `¡Hola ${nombre}! 🌟 Te confirmamos tu reserva en *El Patrón* para el día *${dateFormatted}* a las *${hora}* para *${pax}* ${pax === 1 ? 'persona' : 'personas'} (${mesaNombre || 'Mesa asignada'}). ¡Te esperamos para compartir una hermosa experiencia criolla! 🍷🥩`;
  } else if (template === 'recordatorio') {
    message = `¡Hola ${nombre}! 😊 Te recordamos tu reserva de hoy en *El Patrón* a las *${hora}* para *${pax}* ${pax === 1 ? 'persona' : 'personas'} (${mesaNombre || 'Mesa asignada'}). ¿Nos confirmas tu asistencia? ¡Te esperamos! 🍷🥩`;
  } else if (template === 'espera') {
    message = `¡Hola ${nombre}! 👋 Te informamos que ingresaste a la *Lista de Espera* de *El Patrón* para el día *${dateFormatted}* a las *${hora}* para *${pax}* ${pax === 1 ? 'persona' : 'personas'}. Te notificaremos inmediatamente en cuanto se libere una mesa. ¡Muchas gracias! ⏳🍷`;
  }

  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
}

type PendingAction = 'create' | `edit_${string}` | `status_${string}` | `delete_${string}` | `assign_${string}`;
const SUPABASE_TIMEOUT_MS = 12000;

function withTimeout<T>(promise: Promise<T>, message = 'La operación tardó demasiado. Revisa la conexión e intenta de nuevo.'): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), SUPABASE_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function sortReservas(a: Reserva, b: Reserva): number {
  return (a.fecha || '').localeCompare(b.fecha || '') || parseTimeToMin(a.hora) - parseTimeToMin(b.hora);
}

export default function ReservasModule({ mesas, onEstadoChange, addLog = () => {} }: ReservasModuleProps) {
  const { toast, toasts, removeToast } = useToast();

  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loadingReservas, setLoadingReservas] = useState(false);
  const fetchRequestRef = useRef(0);
  const pendingActionRef = useRef<PendingAction | null>(null);

  const beginAction = useCallback((action: PendingAction): boolean => {
    if (pendingActionRef.current) return false;
    pendingActionRef.current = action;
    setPendingAction(action);
    return true;
  }, []);

  const finishAction = useCallback(() => {
    pendingActionRef.current = null;
    setPendingAction(null);
  }, []);

  const fetchReservasDelDia = useCallback(async (fecha: string): Promise<boolean> => {
    const requestId = ++fetchRequestRef.current;
    setLoadingReservas(true);
    try {
      const data = await withTimeout(reservasService.list(), 'No pudimos actualizar las reservas. La conexión está lenta.');
      if (requestId !== fetchRequestRef.current) return false;
      setReservas(data);
      return true;
    } catch (err) {
      if (requestId === fetchRequestRef.current) {
        console.error('Error cargando reservas del día:', err);
        toast.error('No pudimos actualizar las reservas. Conservamos la información local.');
      }
      return false;
    } finally {
      if (requestId === fetchRequestRef.current) setLoadingReservas(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReservasDelDia(selectedDate);
  }, [selectedDate, fetchReservasDelDia]);

  // Filtros
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
  });
  const [tab, setTab] = useState<'reservas' | 'espera'>('reservas');

  const reservasDelDia = useMemo(() => (
    reservas.filter(r => r.fecha === selectedDate && r.estado !== 'cancelada' && !r.lista_espera)
  ), [reservas, selectedDate]);

  // Formulario States
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [pax, setPax] = useState('2');
  const [nombreMesa, setNombreMesa] = useState(mesas[0]?.numero_mesa || 'Mesa 1');
  const [hora, setHora] = useState('21:00');
  const [observaciones, setObservaciones] = useState('');
  const [formularioDate, setFormularioDate] = useState(formatDate(new Date()));
  const [forceEspera, setForceEspera] = useState(false);
  const [enviarWhatsApp, setEnviarWhatsApp] = useState(true);
  const [waTemplate, setWaTemplate] = useState<'standard' | 'recordatorio' | 'espera'>('standard');

  // Auditor de colisión horaria en vivo (2 horas de margen)
  const liveConflict = useMemo(() => {
    if (!formularioDate || !hora || !nombreMesa || forceEspera) return null;
    const targetMin = parseTimeToMin(hora);
    const selectedMesa = mesas.find(m => m.numero_mesa === nombreMesa);
    if (!selectedMesa) return null;

    const overlapping = reservas.filter(r => 
      r.fecha === formularioDate && 
      r.id_mesa === selectedMesa.id_mesa && 
      r.estado !== 'cancelada' && 
      r.id_reserva !== editingId &&
      !r.lista_espera
    );

    for (const r of overlapping) {
      const rMin = parseTimeToMin(r.hora);
      if (Math.abs(rMin - targetMin) < 120) {
        return {
          cliente: r.nombre_cliente,
          hora: r.hora,
          mesa: selectedMesa.numero_mesa
        };
      }
    }
    return null;
  }, [formularioDate, hora, nombreMesa, forceEspera, reservas, mesas, editingId]);

  // Helpers de disponibilidad
  const reservasEnFecha = useCallback((fecha: string, excluirId?: string) => {
    return reservas.filter(r => r.fecha === fecha && r.estado !== 'cancelada' && r.id_reserva !== excluirId && !r.lista_espera);
  }, [reservas]);

  const mesasDisponiblesEnFechaHora = useCallback((fecha: string, horaStr: string, paxReq: number, excluirId?: string): Mesa[] => {
    const targetMin = parseTimeToMin(horaStr);
    const ocupadosIds = new Set<number>();

    reservasEnFecha(fecha, excluirId).forEach(r => {
      const rMin = parseTimeToMin(r.hora);
      if (Math.abs(rMin - targetMin) <= 120) {
        if (r.id_mesa) ocupadosIds.add(r.id_mesa);
      }
    });

    return mesas.filter(m => {
      if (m.estado === 'ocupada') return false;
      if (ocupadosIds.has(m.id_mesa)) return false;
      if (m.comensales && m.comensales < paxReq) {
        const capOk = (m.comensales ?? 0) >= paxReq || paxReq <= (m.comensales ?? 0) + 2;
        if (!capOk) return false;
      }
      return true;
    });
  }, [mesas, reservasEnFecha]);

  const resetForm = () => {
    setNombre(''); setTelefono(''); setObservaciones('');
    setPax('2'); setHora('21:00'); setForceEspera(false);
    setEditingId(null);
    setDeleteConfirmId(null);
    setWaTemplate('standard');
  };

  const handleCreateReserva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingActionRef.current) return;

    const validation = reservaSchema.safeParse({ nombre_cliente: nombre, telefono, pax: parseInt(pax, 10) || 2, hora, observaciones });
    if (!validation.success) {
      const msgs = validation.error.issues.map(i => i.message).join('. ');
      addLog('sistema', 'RESERVAS: Error de validación: ' + msgs);
      toast.error(msgs);
      return;
    }

    const capPax = parseInt(pax, 10) || 2;
    const selectedMesa = mesas.find(m => m.numero_mesa === nombreMesa);
    let idMesaAsignada = selectedMesa?.id_mesa;
    let nombreMesaAsignada = nombreMesa;
    let enviarEspera = forceEspera;

    if (!forceEspera && selectedMesa) {
      const disponibles = mesasDisponiblesEnFechaHora(formularioDate, hora, capPax, editingId ?? undefined);
      if (!disponibles.some(m => m.id_mesa === selectedMesa.id_mesa)) {
        enviarEspera = true;
        toast.warning('La mesa elegida ya está reservada u ocupada. Se enviará a lista de espera.');
      }
    } else if (!forceEspera) {
      const disponibles = mesasDisponiblesEnFechaHora(formularioDate, hora, capPax, editingId ?? undefined);
      if (disponibles.length === 0) {
        enviarEspera = true;
        toast.info('No hay mesas disponibles. Se enviará a lista de espera.');
      } else {
        idMesaAsignada = disponibles[0].id_mesa;
        nombreMesaAsignada = disponibles[0].numero_mesa;
      }
    }

    if (editingId) {
      const current = reservas.find(r => r.id_reserva === editingId);
      if (!current) return;

      const updated: Reserva = {
        ...current,
        nombre_cliente: nombre,
        telefono,
        pax: capPax,
        nombre_mesa: enviarEspera ? 'En espera' : nombreMesaAsignada,
        id_mesa: enviarEspera ? null : idMesaAsignada,
        hora: `${hora} hs`,
        observaciones: observaciones.trim() || undefined,
        fecha: formularioDate,
        estado: enviarEspera ? 'pendiente' : (current.estado === 'pendiente' ? 'confirmada' : current.estado),
        lista_espera: enviarEspera,
        prioridad_espera: enviarEspera ? (current.prioridad_espera ?? Date.now()) : undefined,
      };

      if (!beginAction(`edit_${editingId}`)) return;
      setReservas(prev => prev.map(r => r.id_reserva === editingId ? updated : r));

      try {
        await withTimeout(reservasService.update(editingId, updated));
        void fetchReservasDelDia(selectedDate);
        if (!enviarEspera && updated.id_mesa) onEstadoChange(updated, updated.estado);
        addLog('sistema', `RESERVAS: Modificada reserva de '${updated.nombre_cliente}'`);
        toast.success('Reserva actualizada correctamente.');
        if (enviarWhatsApp && updated.telefono) {
          const url = getWhatsAppLink(updated.nombre_cliente, updated.telefono, updated.fecha, updated.hora, updated.pax, waTemplate, updated.nombre_mesa);
          window.open(url, '_blank');
        }
        resetForm();
      } catch {
        setReservas(prev => prev.map(r => r.id_reserva === editingId ? current : r));
        toast.error('No se pudo guardar la reserva. Se revirtió el cambio.');
      } finally {
        finishAction();
      }
      return;
    }

    const newRes: Reserva = {
      id_reserva: `r_${Date.now()}`,
      nombre_cliente: nombre,
      telefono,
      pax: capPax,
      nombre_mesa: enviarEspera ? 'En espera' : nombreMesaAsignada,
      id_mesa: enviarEspera ? null : idMesaAsignada,
      hora: `${hora} hs`,
      estado: enviarEspera ? 'pendiente' : 'confirmada',
      fecha: formularioDate,
      observaciones: observaciones.trim() || undefined,
      lista_espera: enviarEspera,
      prioridad_espera: enviarEspera ? Date.now() : undefined,
      entrada_lista_espera: enviarEspera ? new Date().toISOString() : undefined,
    };

    if (!beginAction('create')) return;
    setReservas(prev => [...prev, newRes]);

    try {
      const saved = await withTimeout(reservasService.create(newRes));
      setReservas(prev => prev.map(r => r.id_reserva === newRes.id_reserva ? saved : r));
      void fetchReservasDelDia(formularioDate);
      addLog('sistema', `RESERVAS: Registrada nueva reserva para '${saved.nombre_cliente}'`);
      if (!enviarEspera && saved.id_mesa) onEstadoChange(saved, 'confirmada');
      if (enviarWhatsApp && saved.telefono) {
        const url = getWhatsAppLink(saved.nombre_cliente, saved.telefono, saved.fecha, saved.hora, saved.pax, enviarEspera ? 'espera' : waTemplate, saved.nombre_mesa);
        window.open(url, '_blank');
      }
      resetForm();
      toast.success(enviarEspera ? 'Cliente agregado a la lista de espera.' : 'Reserva confirmada exitosamente.');
    } catch {
      setReservas(prev => prev.filter(r => r.id_reserva !== newRes.id_reserva));
      toast.error('No se pudo crear la reserva.');
    } finally {
      finishAction();
    }
  };

  const handleEdit = (r: Reserva) => {
    if (pendingActionRef.current) return;
    setEditingId(r.id_reserva);
    setDeleteConfirmId(null);
    setNombre(r.nombre_cliente);
    setTelefono(r.telefono);
    setPax(String(r.pax));
    setNombreMesa(r.nombre_mesa === 'En espera' ? (mesas[0]?.numero_mesa || 'Mesa 1') : r.nombre_mesa);
    setHora(r.hora.replace(' hs', ''));
    setObservaciones(r.observaciones || '');
    setFormularioDate(r.fecha || formatDate(new Date()));
    setForceEspera(r.lista_espera ?? false);
    setWaTemplate(r.lista_espera ? 'espera' : 'standard');
    setTab('reservas');
  };

  const handleChangeEstado = async (id: string, nuevoEstado: Reserva['estado']) => {
    if (pendingActionRef.current) return;
    const target = reservas.find(r => r.id_reserva === id);
    if (!target) return;

    const updated = { ...target, estado: nuevoEstado };
    if (!beginAction(`status_${id}`)) return;
    setReservas(prev => prev.map(r => r.id_reserva === id ? updated : r));

    try {
      await withTimeout(reservasService.update(id, { estado: nuevoEstado }));
      void fetchReservasDelDia(selectedDate);
      onEstadoChange(updated, nuevoEstado);
      addLog('sistema', `RESERVAS: Reserva de '${target.nombre_cliente}' cambió a ${nuevoEstado.toUpperCase()}`);
      toast.success('Estado de reserva actualizado.');
    } catch {
      setReservas(prev => prev.map(r => r.id_reserva === id ? target : r));
      toast.error('No se pudo actualizar el estado.');
    } finally {
      finishAction();
    }
  };

  const handleDeleteReserva = async (id: string) => {
    if (pendingActionRef.current) return;
    const target = reservas.find(r => r.id_reserva === id);
    if (!target) return;

    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      toast.info(`Pulse de nuevo para confirmar la anulación.`);
      return;
    }

    if (!beginAction(`delete_${id}`)) return;
    setReservas(prev => prev.filter(r => r.id_reserva !== id));

    try {
      const ok = await withTimeout(reservasService.remove(id));
      if (!ok) throw new Error('No se pudo eliminar');
      if (target.id_mesa) onEstadoChange(target, 'cancelada');
      void fetchReservasDelDia(selectedDate);
      addLog('sistema', `RESERVAS: Anulada la reserva de '${target.nombre_cliente}'`);
      toast.success('Reserva anulada.');
      setDeleteConfirmId(null);
    } catch (err) {
      setReservas(prev => prev.some(r => r.id_reserva === id) ? prev : [...prev, target].sort(sortReservas));
      toast.error('No se pudo eliminar la reserva.');
    } finally {
      finishAction();
    }
  };

  const handleAsignarMesa = async (reservaId: string, mesaId: number) => {
    if (pendingActionRef.current) return;
    const mesa = mesas.find(m => m.id_mesa === mesaId);
    const target = reservas.find(r => r.id_reserva === reservaId);
    if (!mesa || !target) return;

    const updated: Reserva = {
      ...target,
      id_mesa: mesa.id_mesa,
      nombre_mesa: mesa.numero_mesa,
      estado: 'confirmada',
      lista_espera: false,
      prioridad_espera: undefined,
      entrada_lista_espera: undefined,
    };

    if (!beginAction(`assign_${reservaId}`)) return;
    setReservas(prev => prev.map(r => r.id_reserva === reservaId ? updated : r));

    try {
      await withTimeout(reservasService.update(reservaId, updated));
      void fetchReservasDelDia(selectedDate);
      onEstadoChange(updated, 'confirmada');
      addLog('sistema', `RESERVAS: '${target.nombre_cliente}' asignado a ${mesa.numero_mesa} desde espera.`);
      toast.success(`Mesa ${mesa.numero_mesa} asignada.`);
    } catch {
      setReservas(prev => prev.map(r => r.id_reserva === reservaId ? target : r));
      toast.error('No se pudo asignar la mesa.');
    } finally {
      finishAction();
    }
  };

  // Filtro
  const filtered = useMemo(() => reservasDelDia.filter(
    r => r.nombre_cliente.toLowerCase().includes(debouncedSearch.toLowerCase()) || r.telefono.includes(debouncedSearch)
  ), [reservasDelDia, debouncedSearch]);

  const listaEsperaGlobal = useMemo(() =>
    reservas.filter(r => r.lista_espera && r.estado === 'pendiente').sort(
      (a, b) => (a.prioridad_espera ?? 0) - (b.prioridad_espera ?? 0)
    ),
    [reservas]
  );

  // Calendario helpers
  const mesasOcupadasEnFecha = (fechaStr: string): number => {
    const ocupados = new Set<number>();
    reservas.forEach(r => {
      if (r.fecha === fechaStr && r.estado !== 'cancelada' && !r.lista_espera && r.id_mesa) {
        ocupados.add(r.id_mesa);
      }
    });
    return ocupados.size;
  };

  const totalReservasDia = (fechaStr: string) =>
    reservas.filter(r => r.fecha === fechaStr && r.estado !== 'cancelada').length;

  const disponiblesHoy = useMemo(() => {
    const ocupados = new Set(
      reservas
        .filter(r => r.fecha === selectedDate && r.estado !== 'cancelada' && !r.lista_espera && r.id_mesa)
        .map(r => r.id_mesa!)
    );
    return mesas.filter(m => !ocupados.has(m.id_mesa) && m.estado !== 'ocupada');
  }, [mesas, reservas, selectedDate]);

  const todayStr = formatDate(new Date());
  const formBusy = pendingAction === 'create' || (editingId ? pendingAction === `edit_${editingId}` : false);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) days.push(addDays(weekStart, i));
    return days;
  }, [weekStart]);

  const isCurrentMonth = (d: Date) => d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();

  return (
    <div className="space-y-6 text-left" id="reservas-module">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 text-left">

        {/* ═══════════════════════════════
            COLUMNA IZQUIERDA: Formulario (Span 3)
            ═══════════════════════════════ */}
        <div className="xl:col-span-3 space-y-5">
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs h-fit space-y-4">
            <h3 className="text-sm font-black text-stone-850 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#624A3E] dark:text-[#C8956A]" />
              {editingId ? 'Editar Reserva' : 'Nueva Reserva'}
            </h3>
            
            <form onSubmit={handleCreateReserva} className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Fecha</label>
                <input 
                  type="date" 
                  value={formularioDate} 
                  onChange={e => setFormularioDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-955 text-stone-800 dark:text-stone-100 focus:outline-none" 
                  required 
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Cliente (Nombre completo)</label>
                <input 
                  type="text" 
                  value={nombre} 
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej. Gisela Scaglia"
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-955 text-stone-800 dark:text-stone-100 focus:outline-none font-bold" 
                  required 
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">WhatsApp / Celular</label>
                <input 
                  type="text" 
                  value={telefono} 
                  onChange={e => setTelefono(e.target.value)}
                  placeholder="Ej. 341 5928811"
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-955 text-stone-800 dark:text-stone-100 focus:outline-none font-semibold" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Pax</label>
                  <select 
                    value={pax} 
                    onChange={e => setPax(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-955 text-stone-700 dark:text-stone-200 focus:outline-none cursor-pointer font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map(n => (
                      <option key={n} value={n} className="bg-white dark:bg-stone-900">
                        {n} {n === 1 ? 'Persona' : 'Personas'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Hora</label>
                  <input 
                    type="time" 
                    value={hora} 
                    onChange={e => setHora(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-955 text-stone-800 dark:text-stone-100 focus:outline-none font-bold" 
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Mesa Preferida</label>
                <select 
                  value={nombreMesa} 
                  onChange={e => setNombreMesa(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-955 text-stone-700 dark:text-stone-200 focus:outline-none cursor-pointer font-bold"
                >
                  {mesas.map(m => (
                    <option key={m.id_mesa} value={m.numero_mesa} className="bg-white dark:bg-stone-900">
                      {m.numero_mesa} ({m.comensales ?? '?'} pax)
                    </option>
                  ))}
                </select>
              </div>

              {/* Auditor en Vivo de colisiones horarias */}
              {liveConflict && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/50 rounded-xl text-[10px] text-amber-800 dark:text-amber-300 space-y-1">
                  <span className="font-extrabold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Advertencia de Solapamiento
                  </span>
                  <p className="leading-relaxed font-semibold">
                    La {liveConflict.mesa} está reservada por <strong className="text-amber-900 dark:text-white">"{liveConflict.cliente}"</strong> a las <strong className="font-mono">{liveConflict.hora}</strong> (sugerido 2 horas de margen).
                  </p>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Observaciones</label>
                <textarea 
                  value={observaciones} 
                  onChange={e => setObservaciones(e.target.value)}
                  placeholder="Ej. Celíaco, festejo aniversario, etc..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-955 text-stone-850 dark:text-stone-100 focus:outline-none resize-none font-semibold" 
                />
              </div>

              {/* WhatsApp Template Selector */}
              <div className="space-y-2 border-t border-stone-100 dark:border-stone-800 pt-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-stone-505 uppercase">Aviso por WhatsApp</span>
                  <input 
                    type="checkbox" 
                    checked={enviarWhatsApp} 
                    onChange={e => setEnviarWhatsApp(e.target.checked)} 
                    className="rounded border-stone-300 text-[#624A3E] focus:ring-offset-white cursor-pointer w-4 h-4"
                  />
                </div>
                
                {enviarWhatsApp && (
                  <div>
                    <label className="text-[9px] font-black text-stone-400 uppercase block mb-1">Plantilla de Mensaje</label>
                    <select
                      value={waTemplate}
                      onChange={e => setWaTemplate(e.target.value as any)}
                      className="w-full text-[10px] p-2 rounded-xl border border-stone-150 bg-stone-50 text-stone-700 dark:bg-stone-900 dark:text-stone-305 font-bold cursor-pointer focus:outline-none"
                    >
                      <option value="standard">Confirmación Estándar 🍷</option>
                      <option value="recordatorio">Recordatorio de Visita 🥩</option>
                      <option value="espera">Aviso de Lista de Espera ⏳</option>
                    </select>
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                disabled={pendingAction !== null}
                className="w-full py-2.5 bg-[#624A3E] hover:bg-[#503C32] disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-xs font-black uppercase rounded-xl transition-all cursor-pointer shadow-md shadow-[#624A3E]/10"
              >
                {formBusy ? 'Sincronizando...' : editingId ? 'Guardar Cambios' : 'Confirmar Reserva'}
              </button>
              
              {editingId && (
                <button 
                  type="button" 
                  onClick={resetForm} 
                  disabled={pendingAction !== null}
                  className="w-full py-2 text-xs font-bold text-stone-500 hover:text-stone-750 transition-colors cursor-pointer block text-center"
                >
                  Cancelar Edición
                </button>
              )}
            </form>
          </div>

          {/* Mini panel disponibilidad */}
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
            <h4 className="text-xs font-black text-stone-800 dark:text-white uppercase flex items-center gap-2">
              <Armchair className="w-4 h-4 text-[#624A3E] dark:text-[#C8956A]" /> Disponibilidad Hoy
            </h4>
            
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-stone-500">Fecha activa:</span>
              <span className="font-bold text-stone-800 dark:text-white font-mono">{selectedDate}</span>
            </div>
            
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-stone-500">Mesas Libres:</span>
              <span className="font-bold text-emerald-600">{disponiblesHoy.length} / {mesas.length}</span>
            </div>
            
            <div className="pt-2.5 border-t border-stone-100 dark:border-stone-800 flex flex-wrap gap-1">
              {mesas.map(m => {
                const estaLibre = disponiblesHoy.some(d => d.id_mesa === m.id_mesa);
                const estaReservada = reservas.some(
                  r => r.fecha === selectedDate && r.id_mesa === m.id_mesa && r.estado !== 'cancelada' && !r.lista_espera
                );
                
                let bg = 'bg-stone-105 text-stone-400 border-stone-150 dark:bg-stone-950 dark:border-stone-850';
                if (estaLibre) bg = 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-350 dark:border-emerald-900/40';
                else if (estaReservada) bg = 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-955/20 dark:text-amber-350 dark:border-amber-900/40';
                
                return (
                  <span key={m.id_mesa} className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-md border ${bg}`}>
                    {m.numero_mesa}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════
            COLUMNA CENTRAL: Calendario + Lista (Span 6)
            ═══════════════════════════════ */}
        <div className="xl:col-span-6 space-y-5">

          {/* Cabecera calendario */}
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h3 className="text-sm font-black text-stone-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#624A3E] dark:text-[#C8956A]" />
                {calendarView === 'month' ? monthLabel(currentMonth) : weekRangeLabel(weekStart)}
              </h3>
              
              <div className="flex items-center gap-2">
                <div className="flex bg-stone-100 dark:bg-stone-955 p-0.5 rounded-xl border border-stone-200 dark:border-stone-800">
                  <button 
                    onClick={() => setCalendarView('month')}
                    className={`px-3 py-1 text-[9px] font-black rounded-lg cursor-pointer transition-all uppercase ${
                      calendarView === 'month' 
                        ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs' 
                        : 'text-stone-500 dark:text-stone-400 hover:text-stone-900'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5 inline mr-1" />Mes
                  </button>
                  
                  <button 
                    onClick={() => setCalendarView('week')}
                    className={`px-3 py-1 text-[9px] font-black rounded-lg cursor-pointer transition-all uppercase ${
                      calendarView === 'week' 
                        ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs' 
                        : 'text-stone-500 dark:text-stone-400 hover:text-stone-900'
                    }`}
                  >
                    <List className="w-3.5 h-3.5 inline mr-1" />Semana
                  </button>
                </div>

                <div className="flex gap-0.5">
                  <button 
                    onClick={() => {
                      if (calendarView === 'month') {
                        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                      } else {
                        setWeekStart(prev => addDays(prev, -7));
                      }
                    }} 
                    className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-850 text-stone-600 dark:text-stone-300 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <button 
                    onClick={() => {
                      if (calendarView === 'month') {
                        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                      } else {
                        setWeekStart(prev => addDays(prev, 7));
                      }
                    }} 
                    className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-850 text-stone-600 dark:text-stone-300 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* ============ VISTA MENSUAL ============ */}
            {calendarView === 'month' && (
              <div>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                    <div key={d} className="text-center text-[10px] font-black text-stone-400 uppercase py-1">{d}</div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {getMonthGrid(currentMonth.getFullYear(), currentMonth.getMonth()).map((cellDate, idx) => {
                    const cellStr = formatDate(cellDate);
                    const isToday = cellStr === todayStr;
                    const isSelected = cellStr === selectedDate;
                    const isCurrent = isCurrentMonth(cellDate);
                    const count = totalReservasDia(cellStr);
                    const ocupadas = mesasOcupadasEnFecha(cellStr);
                    
                    return (
                      <button 
                        key={idx} 
                        onClick={() => setSelectedDate(cellStr)}
                        className={`relative h-14 rounded-xl border text-left p-1.5 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected 
                            ? 'bg-[#624A3E] text-white border-[#624A3E] shadow-sm' 
                            : isToday 
                              ? 'bg-stone-100 border-[#624A3E] dark:bg-stone-850 text-stone-900 dark:text-white' 
                              : isCurrent 
                                ? 'bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-850 hover:bg-stone-50 dark:hover:bg-stone-900 text-stone-800' 
                                : 'bg-stone-50/50 border-stone-100 dark:bg-stone-900/20 dark:border-stone-950 text-stone-300'
                        }`}
                      >
                        <span className={`text-[10px] font-black leading-none ${isSelected ? 'text-white' : 'text-stone-605 text-stone-600 dark:text-stone-400'}`}>
                          {cellDate.getDate()}
                        </span>
                        
                        {count > 0 && (
                          <div className="flex flex-wrap gap-0.5 mt-auto">
                            {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
                              <span key={i} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/70' : 'bg-[#624A3E] dark:bg-[#C8956A]'}`} />
                            ))}
                          </div>
                        )}
                        
                        {count > 0 && (
                          <span className={`absolute top-1 right-1 text-[8px] font-black ${isSelected ? 'text-white/80' : 'text-stone-450 dark:text-stone-300'}`}>
                            {count}
                          </span>
                        )}
                        
                        {ocupadas === mesas.length && isCurrent && (
                          <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500" title="Casa llena (sin mesas)" />
                        )}
                      </button>
                    );
                  })}
                </div>
                
                <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800">
                  <span className="flex items-center gap-1.5 text-[9px] text-stone-500 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#624A3E] dark:bg-[#C8956A]" /> Reserva Activa
                  </span>
                  <span className="flex items-center gap-1.5 text-[9px] text-stone-500 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Sin disponibilidad
                  </span>
                </div>
              </div>
            )}

            {/* ============ VISTA SEMANAL ============ */}
            {calendarView === 'week' && (
              <div className="space-y-2">
                {weekDays.map(d => {
                  const ds = formatDate(d);
                  const dayReservas = reservas.filter(r => r.fecha === ds && r.estado !== 'cancelada' && !r.lista_espera);
                  const isSel = ds === selectedDate;
                  
                  return (
                    <button 
                      key={ds} 
                      onClick={() => setSelectedDate(ds)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer text-left ${
                        isSel 
                          ? 'bg-[#624A3E] text-white border-[#624A3E]' 
                          : d.getDay() === 0 || d.getDay() === 6 
                            ? 'bg-stone-50 border-stone-200 dark:bg-stone-950 dark:border-stone-850 text-stone-700 dark:text-stone-200' 
                            : 'bg-white border-stone-200 dark:bg-stone-900 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-850 text-stone-800'
                      }`}
                    >
                      <div className="w-10 text-center shrink-0">
                        <span className="text-[9px] font-bold uppercase block opacity-70">
                          {d.toLocaleDateString('es-AR', { weekday: 'short' })}
                        </span>
                        <span className="text-sm font-extrabold block">{d.getDate()}</span>
                      </div>
                      
                      <div className="flex-1">
                        {dayReservas.length === 0 ? (
                          <span className={`text-[10px] font-medium ${isSel ? 'text-white/70' : 'text-stone-400 dark:text-stone-500 italic'}`}>Sin reservas</span>
                        ) : (
                          <div className="flex gap-1.5 flex-wrap">
                            {dayReservas.slice(0, 5).map(r => (
                              <span key={r.id_reserva} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${isSel ? 'bg-white/15 border-white/30 text-white' : 'bg-stone-100 border-stone-200 text-stone-700 dark:bg-stone-850 dark:border-stone-750 dark:text-stone-300'}`}>
                                {r.hora} &middot; {r.nombre_cliente.split(' ')[0]}
                              </span>
                            ))}
                            {dayReservas.length > 5 && (
                              <span className={`text-[9px] font-bold ${isSel ? 'text-white/80' : 'text-stone-400'}`}>
                                +{dayReservas.length - 5}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {dayReservas.length > 0 && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSel ? 'bg-white/20 text-white' : 'bg-stone-105 text-stone-600 dark:bg-stone-800 dark:text-stone-300'}`}>
                          {dayReservas.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hoy / Mañana rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[todayStr, formatDate(addDays(new Date(), 1))].map((dStr, i) => {
              const count = totalReservasDia(dStr);
              const ocupadas = mesasOcupadasEnFecha(dStr);
              const isSelected = selectedDate === dStr;
              
              return (
                <button 
                  key={dStr} 
                  onClick={() => setSelectedDate(dStr)}
                  className={`p-4 rounded-2xl border transition-all text-left cursor-pointer ${
                    isSelected 
                      ? 'bg-[#624A3E] text-white border-[#624A3E] shadow-sm' 
                      : 'bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-850 border-stone-200 dark:border-stone-800 text-stone-800'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-[9px] font-black uppercase tracking-wider ${isSelected ? 'text-white/80' : 'text-stone-450 dark:text-stone-300'}`}>
                      {i === 0 ? 'Hoy' : 'Mañana'}
                    </span>
                    <CalendarClock className={`w-4 h-4 ${isSelected ? 'text-white/70' : 'text-stone-400'}`} />
                  </div>
                  <div className="mt-2 space-y-0.5">
                    <p className={`text-lg font-black ${isSelected ? 'text-white' : 'text-stone-900 dark:text-white'}`}>
                      {count} reserva{count !== 1 ? 's' : ''}
                    </p>
                    <p className={`text-[10px] font-semibold ${isSelected ? 'text-white/75' : 'text-stone-500'}`}>
                      {disponiblesHoy.length} mesas libres
                    </p>
                    {ocupadas === mesas.length && (
                      <p className={`text-[10px] font-bold ${isSelected ? 'text-amber-200 animate-pulse' : 'text-rose-500 animate-pulse'}`}>
                        Completamente reservado
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Reservas del Día Seleccionado */}
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-stone-105 dark:border-stone-800">
              <h3 className="text-sm font-black text-stone-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#624A3E] dark:text-[#C8956A]" />
                Visitas el {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} ({reservasDelDia.length})
              </h3>
              
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar comensal..."
                  className="pl-8 pr-2 py-1 text-[10px] border border-stone-200 dark:border-stone-750 rounded-lg bg-stone-50 dark:bg-stone-955 text-stone-800 dark:text-stone-100 focus:outline-none w-36" 
                />
              </div>
            </div>

            <div className="space-y-3 mt-3 min-h-[120px]">
              {loadingReservas ? (
                <div className="flex items-center justify-center py-10 gap-2 text-stone-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-xs font-semibold">Sincronizando reservas...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 bg-stone-50/30 dark:bg-stone-950/10 rounded-2xl border border-dashed border-stone-150 dark:border-stone-850">
                  <Calendar className="w-8 h-8 text-stone-300 dark:text-stone-700" />
                  <p className="text-xs text-stone-450 dark:text-stone-300 italic">No hay reservas programadas para este día.</p>
                </div>
              ) : (
                filtered.map(r => {
                  let statusColor = 'text-stone-400 border-stone-200';
                  let activeStep = 0;
                  if (r.estado === 'confirmada') { statusColor = 'text-blue-500 border-blue-200'; activeStep = 1; }
                  else if (r.estado === 'sentada') { statusColor = 'text-emerald-500 border-emerald-200'; activeStep = 2; }
                  else if (r.estado === 'completada') { statusColor = 'text-stone-500 border-stone-200'; activeStep = 3; }

                  return (
                    <div 
                      key={r.id_reserva} 
                      onClick={() => handleEdit(r)}
                      className="p-4 bg-[#F5F1E9]/30 dark:bg-stone-855/20 border border-stone-150 dark:border-stone-800 rounded-2xl flex flex-col justify-between gap-3 hover:bg-[#F5F1E9]/60 dark:hover:bg-stone-850/40 transition-colors cursor-pointer"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-stone-900 dark:text-white text-sm tracking-tight">{r.nombre_cliente}</h4>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600 dark:text-stone-300 font-semibold">
                            <span className="flex items-center gap-1 font-mono"><Clock className="w-3.5 h-3.5 text-stone-400" />{r.hora}</span>
                            <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-stone-400" />{r.telefono || '-'}</span>
                            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-stone-400" />{r.pax} pax</span>
                            <span className="flex items-center gap-1"><Armchair className="w-3.5 h-3.5 text-stone-400" />{r.nombre_mesa}</span>
                          </div>
                        </div>
                        
                        {/* WhatsApp / Acciones rápidas */}
                        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                          {r.telefono && (
                            <button
                              onClick={() => {
                                const url = getWhatsAppLink(r.nombre_cliente, r.telefono, r.fecha || '', r.hora, r.pax, 'recordatorio', r.nombre_mesa);
                                window.open(url, '_blank');
                              }}
                              title="Re-enviar recordatorio WhatsApp"
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-150 transition-colors cursor-pointer flex items-center justify-center text-xs"
                            >
                              📲 Aviso
                            </button>
                          )}
                          <button 
                            onClick={() => handleEdit(r)} 
                            title="Editar" 
                            disabled={pendingAction !== null}
                            className="p-1.5 rounded-lg bg-stone-50 dark:bg-stone-850 hover:bg-blue-50 text-stone-400 hover:text-blue-500 transition-colors cursor-pointer border border-stone-200 dark:border-stone-800"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteReserva(r.id_reserva)} 
                            title="Anular" 
                            disabled={pendingAction !== null}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
                              deleteConfirmId === r.id_reserva 
                                ? 'bg-rose-100 text-rose-700 border-rose-200' 
                                : 'bg-stone-50 dark:bg-stone-850 hover:bg-rose-50 text-stone-400 hover:text-rose-500 border-stone-200 dark:border-stone-800'
                            }`}
                          >
                            {pendingAction === `delete_${r.id_reserva}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {r.observaciones && (
                        <p className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold bg-amber-50/50 dark:bg-amber-950/20 px-2 py-1 rounded-lg border border-amber-100 dark:border-amber-900/50">
                          📌 {r.observaciones}
                        </p>
                      )}

                      {/* Timeline de flujo de estado interactivo */}
                      <div className="flex items-center justify-between pt-2 border-t border-stone-200/50 dark:border-stone-800 gap-2">
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-stone-400">
                          {/* Step 1: Confirmada */}
                          <span className={`${activeStep >= 1 ? 'text-blue-600 font-extrabold' : ''}`}>Confirmada</span>
                          <ArrowRight className="w-3 h-3 text-stone-300" />
                          {/* Step 2: Sentada */}
                          <span className={`${activeStep >= 2 ? 'text-emerald-600 font-extrabold' : ''}`}>En mesa</span>
                          <ArrowRight className="w-3 h-3 text-stone-300" />
                          {/* Step 3: Completada */}
                          <span className={`${activeStep >= 3 ? 'text-stone-500 font-extrabold' : ''}`}>Completada</span>
                        </div>

                        {/* Botones de acción del timeline */}
                        <div onClick={e => e.stopPropagation()}>
                          {r.estado === 'confirmada' && (
                            <button 
                              onClick={() => handleChangeEstado(r.id_reserva, 'sentada')} 
                              disabled={pendingAction !== null}
                              className="px-2.5 py-1 rounded-lg bg-emerald-650 bg-emerald-600 hover:bg-emerald-500 text-white text-[9.5px] font-black uppercase cursor-pointer transition-all shadow-xs flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Sentar Cliente
                            </button>
                          )}
                          {r.estado === 'sentada' && (
                            <button 
                              onClick={() => handleChangeEstado(r.id_reserva, 'completada')} 
                              disabled={pendingAction !== null}
                              className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[9.5px] font-black uppercase cursor-pointer transition-all shadow-xs"
                            >
                              Completar Visita
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════
            COLUMNA DERECHA: Lista de Espera + Próximas (Span 3)
            ═══════════════════════════════ */}
        <div className="xl:col-span-3 space-y-5 text-left">

          {/* Tabs */}
          <div className="flex bg-stone-105 dark:bg-stone-955 p-0.5 rounded-xl border border-stone-200 dark:border-stone-800">
            <button 
              onClick={() => setTab('reservas')}
              className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg cursor-pointer transition-all ${
                tab === 'reservas' 
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs' 
                  : 'text-stone-500 dark:text-stone-400'
              }`}
            >
              Próximas
            </button>
            
            <button 
              onClick={() => setTab('espera')}
              className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                tab === 'espera' 
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs' 
                  : 'text-stone-500 dark:text-stone-400'
              }`}
            >
              En Espera
              {listaEsperaGlobal.length > 0 && (
                <span className="bg-amber-500 text-white text-[8px] w-4.5 h-4.5 flex items-center justify-center rounded-full font-black animate-pulse">
                  {listaEsperaGlobal.length}
                </span>
              )}
            </button>
          </div>

          {/* TAB: Lista de Espera */}
          {tab === 'espera' && (
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs p-5 space-y-3">
              <h4 className="text-xs font-black text-stone-850 dark:text-white uppercase flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" /> Lista de Espera ({listaEsperaGlobal.length})
              </h4>
              <p className="text-[10px] text-stone-500 leading-snug">Asigna una mesa vacía al comensal para confirmar su reserva.</p>

              <div className="space-y-2.5">
                {listaEsperaGlobal.length === 0 ? (
                  <div className="py-6 flex flex-col items-center gap-2 bg-stone-50/50 dark:bg-stone-950/20 rounded-xl border border-dashed border-stone-150">
                    <Users className="w-8 h-8 text-stone-300 dark:text-stone-700" />
                    <p className="text-xs text-stone-400 italic">Lista de espera vacía.</p>
                  </div>
                ) : (
                  listaEsperaGlobal.map((r, idx) => (
                    <div key={r.id_reserva} className="p-3 bg-[#F5F1E9]/30 dark:bg-stone-855/10 border border-stone-150 dark:border-stone-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <h5 className="text-xs font-extrabold text-stone-900 dark:text-white">{r.nombre_cliente}</h5>
                        </div>
                        <span className="text-[9px] font-black text-stone-700 bg-stone-150 px-1.5 py-0.5 rounded">
                          {r.pax} pax
                        </span>
                      </div>
                      
                      <div className="text-[10px] text-stone-600 dark:text-stone-300 flex items-center gap-3 font-semibold">
                        <span className="flex items-center gap-1 font-mono"><Calendar className="w-3.5 h-3.5" />{r.fecha}</span>
                        <span className="flex items-center gap-1 font-mono"><Clock className="w-3.5 h-3.5" />{r.hora}</span>
                      </div>

                      {/* Lista de mesas para asignación rápida */}
                      <div className="border-t border-stone-155 dark:border-stone-800 pt-2">
                        <p className="text-[8.5px] font-black text-stone-450 uppercase mb-1.5">Asignación Directa:</p>
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const disp = mesasDisponiblesEnFechaHora(r.fecha || todayStr, r.hora.replace(' hs', ''), r.pax, r.id_reserva);
                            return disp.length === 0 ? (
                              <span className="text-[9px] text-rose-500 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Sin capacidad libre
                              </span>
                            ) : (
                              disp.map(m => (
                                <button 
                                  key={m.id_mesa} 
                                  onClick={() => handleAsignarMesa(r.id_reserva, m.id_mesa)} 
                                  disabled={pendingAction !== null}
                                  className="text-[8.5px] font-black px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer"
                                >
                                  {pendingAction === `assign_${r.id_reserva}` ? '...' : m.numero_mesa}
                                </button>
                              ))
                            );
                          })()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button 
                          onClick={() => handleEdit(r)} 
                          disabled={pendingAction !== null}
                          className="text-[9px] font-black text-stone-400 hover:text-stone-605 hover:text-stone-600 underline cursor-pointer"
                        >
                          Editar
                        </button>
                        
                        <button 
                          onClick={() => handleDeleteReserva(r.id_reserva)} 
                          disabled={pendingAction !== null}
                          className={`text-[9px] font-black underline cursor-pointer ${
                            deleteConfirmId === r.id_reserva ? 'text-rose-700 font-extrabold' : 'text-rose-550 hover:text-rose-700'
                          }`}
                        >
                          {deleteConfirmId === r.id_reserva ? 'Confirmar' : 'Anular'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: Próximas reservas (Resumen Agenda) */}
          {tab === 'reservas' && (
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs p-5 space-y-3">
              <h4 className="text-xs font-black text-stone-850 dark:text-white uppercase flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#624A3E] dark:text-[#C8956A]" /> Agenda de Reservas
              </h4>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {reservas
                  .filter(r => !r.lista_espera && r.estado !== 'cancelada' && r.estado !== 'completada' && r.fecha >= todayStr)
                  .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '') || parseTimeToMin(a.hora) - parseTimeToMin(b.hora))
                  .slice(0, 8)
                  .map(r => (
                    <button 
                      key={r.id_reserva} 
                      onClick={() => { setSelectedDate(r.fecha || todayStr); setTab('reservas'); }}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-stone-50 dark:bg-stone-955 hover:bg-stone-100/60 dark:hover:bg-stone-800 border border-stone-100 dark:border-stone-850 transition-all cursor-pointer text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#624A3E] dark:bg-[#C8956A] text-white flex items-center justify-center text-[10px] font-black shrink-0 font-mono">
                        {r.fecha?.slice(8)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-stone-800 dark:text-stone-105 truncate leading-tight">{r.nombre_cliente}</p>
                        <p className="text-[9px] text-stone-450 dark:text-stone-300 mt-0.5 flex items-center gap-1 font-semibold font-mono">
                          {r.hora} &middot; {r.nombre_mesa} &middot; {r.pax} pax
                        </p>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Quick stats globales */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs p-5 space-y-3">
            <h4 className="text-xs font-black text-stone-805 dark:text-white uppercase tracking-tight">Estadísticas de Agenda</h4>
            
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-stone-50 dark:bg-stone-950 p-2.5 rounded-xl border border-stone-100 dark:border-stone-850">
                <span className="text-base font-black text-stone-900 dark:text-white font-mono">
                  {reservas.filter(r => r.estado === 'confirmada' && !r.lista_espera).length}
                </span>
                <p className="text-[9px] text-stone-500 dark:text-stone-400 font-bold mt-0.5 uppercase">Confirmadas</p>
              </div>
              
              <div className="bg-stone-50 dark:bg-stone-950 p-2.5 rounded-xl border border-stone-100 dark:border-stone-850">
                <span className="text-base font-black text-stone-900 dark:text-white font-mono">
                  {listaEsperaGlobal.length}
                </span>
                <p className="text-[9px] text-stone-500 dark:text-stone-400 font-bold mt-0.5 uppercase">En Espera</p>
              </div>
              
              <div className="bg-stone-50 dark:bg-stone-950 p-2.5 rounded-xl border border-stone-100 dark:border-stone-850">
                <span className="text-base font-black text-stone-900 dark:text-white font-mono">
                  {reservas.filter(r => r.estado === 'sentada' && !r.lista_espera).length}
                </span>
                <p className="text-[9px] text-stone-500 dark:text-stone-400 font-bold mt-0.5 uppercase">Sentadas</p>
              </div>
              
              <div className="bg-stone-50 dark:bg-stone-950 p-2.5 rounded-xl border border-stone-100 dark:border-stone-850">
                <span className="text-base font-black text-stone-900 dark:text-white font-mono">
                  {reservas.filter(r => r.estado === 'cancelada').length}
                </span>
                <p className="text-[9px] text-stone-500 dark:text-stone-400 font-bold mt-0.5 uppercase">Anuladas</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
