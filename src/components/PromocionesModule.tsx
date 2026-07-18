import React, { useState, useEffect, useMemo } from 'react';
import { 
  Tag, 
  Calendar, 
  Plus, 
  ToggleLeft, 
  ToggleRight, 
  Sparkles, 
  Search, 
  Edit2, 
  Trash, 
  Check, 
  X, 
  Clock, 
  Calculator,
  Percent,
  Play,
  Lightbulb
} from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { promocionesService, Promocion } from '../services/promocionesService';
import { promocionSchema } from '../lib/validations';
import { ToastContainer, useToast } from './ToastContainer';
import { EventoLog } from '../types';

interface PromocionesModuleProps {
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

const TIPO_LABELS: Record<Promocion['tipo'], string> = {
  happy_hour: 'Happy Hour 🍻',
  combo: 'Combo / Menú 🍔',
  descuento_directo: 'Descuento Directo 💸',
};

const DIAS_OPCIONES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function PromocionesModule({ addLog }: PromocionesModuleProps) {
  const { toast, toasts, removeToast } = useToast();
  const [promos, setPromos] = useState<Promocion[]>([]);
  const [promosLoading, setPromosLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Formulario fields
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [descuento, setDescuento] = useState('');
  const [tipo, setTipo] = useState<Promocion['tipo']>('descuento_directo');
  const [vigencia, setVigencia] = useState('');
  const [desc, setDesc] = useState('');
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Campos para el programador visual
  const [selectedDays, setSelectedDays] = useState<string[]>(['Lun', 'Mar', 'Mié', 'Jue', 'Vie']);
  const [useTimeRange, setUseTimeRange] = useState(false);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('21:00');

  // Simulador de descuentos
  const [simSubtotal, setSimSubtotal] = useState('15000');
  const [simPromoId, setSimPromoId] = useState('');

  // Búsqueda con debounce
  const [searchPromo, setSearchPromo] = useState('');
  const debouncedSearch = useDebounce(searchPromo, 300);

  useEffect(() => {
    promocionesService.list()
      .then(data => setPromos(data || []))
      .catch(() => {
        setPromos([]);
        toast.error('No se pudieron cargar las promociones de Supabase. No se mostrarán campañas ficticias.');
      })
      .finally(() => setPromosLoading(false));
  }, []);

  // Compilar selección del programador visual en cadena de vigencia
  useEffect(() => {
    if (selectedDays.length === 0) {
      setVigencia('Ningún día seleccionado');
      return;
    }
    let label = '';
    if (selectedDays.length === 7) {
      label = 'Todos los días';
    } else if (selectedDays.length === 5 && !selectedDays.includes('Sáb') && !selectedDays.includes('Dom')) {
      label = 'Lun a Vie';
    } else if (selectedDays.length === 6 && !selectedDays.includes('Dom')) {
      label = 'Lun a Sáb';
    } else if (selectedDays.length === 2 && selectedDays.includes('Sáb') && selectedDays.includes('Dom')) {
      label = 'Sáb y Dom';
    } else {
      label = selectedDays.join(', ');
    }

    if (useTimeRange && startTime && endTime) {
      label += ` - ${startTime} a ${endTime}hs`;
    }
    setVigencia(label);
  }, [selectedDays, useTimeRange, startTime, endTime]);

  const filteredPromos = useMemo(
    () => promos.filter(p =>
      p.nombre.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.descripcion?.toLowerCase().includes(debouncedSearch.toLowerCase())
    ),
    [promos, debouncedSearch]
  );

  // Estadísticas KPI de Campañas
  const kpis = useMemo(() => {
    const total = promos.length;
    const activas = promos.filter(p => p.activo).length;
    const sumDescuento = promos.reduce((sum, p) => sum + p.descuento_porcentaje, 0);
    const promedio = total > 0 ? Math.round(sumDescuento / total) : 0;
    
    // Contar tipo dominante
    const counts = promos.reduce((acc, p) => {
      acc[p.tipo] = (acc[p.tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    let dominantType = 'Ninguno';
    let max = 0;
    Object.keys(counts).forEach(key => {
      if (counts[key] > max) {
        max = counts[key];
        dominantType = TIPO_LABELS[key as Promocion['tipo']] || key;
      }
    });

    return { total, activas, promedio, dominantType };
  }, [promos]);

  // Cálculos del simulador
  const simResults = useMemo(() => {
    const subtotal = parseFloat(simSubtotal) || 0;
    const promo = promos.find(p => p.id_promo === simPromoId);
    if (!promo || !promo.activo || subtotal <= 0) {
      return { descuentoMonto: 0, totalPagar: subtotal, puntosAcumulados: Math.round(subtotal * 0.01) };
    }
    const descuentoMonto = subtotal * (promo.descuento_porcentaje / 100);
    const totalPagar = subtotal - descuentoMonto;
    const puntosAcumulados = Math.round(totalPagar * 0.01); // 1% de fidelidad
    return { descuentoMonto, totalPagar, puntosAcumulados };
  }, [simSubtotal, simPromoId, promos]);

  const resetForm = () => {
    setNombre(''); setDescuento(''); setTipo('descuento_directo');
    setDesc(''); setFormErrors([]); setEditingId(null);
    setSelectedDays(['Lun', 'Mar', 'Mié', 'Jue', 'Vie']);
    setUseTimeRange(false);
  };

  const validateForm = (): boolean => {
    const result = promocionSchema.safeParse({
      nombre,
      descuento_porcentaje: parseInt(descuento, 10) || 0,
      tipo,
      vigencia: vigencia || undefined,
      descripcion: desc || undefined,
    });
    if (!result.success) {
      setFormErrors(result.error.issues.map(i => i.message));
      return false;
    }
    setFormErrors([]);
    return true;
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingAction) return;
    if (!validateForm()) return;

    const newPr: Promocion = {
      id_promo: `p_${Date.now()}`,
      nombre: nombre.trim(),
      descuento_porcentaje: parseInt(descuento, 10),
      tipo,
      dias_vigentes: vigencia.trim() || 'Todos los días',
      activo: true,
      descripcion: desc.trim() || 'Precios promocionales y combos especiales',
    };

    const previous = promos;
    setPendingAction('create');
    setPromos(prev => [newPr, ...prev]);
    resetForm();

    try {
      await promocionesService.create(newPr);
      toast.success(`Promoción "${newPr.nombre}" creada y sincronizada.`);
      addLog('sistema', `PROMOS: Nueva campaña "${newPr.nombre}" con ${newPr.descuento_porcentaje}% de descuento.`);
    } catch {
      setPromos(previous);
      toast.error('No se pudo crear la promoción.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleEditPromo = (p: Promocion) => {
    setEditingId(p.id_promo);
    setNombre(p.nombre);
    setDescuento(String(p.descuento_porcentaje));
    setTipo(p.tipo);
    setDesc(p.descripcion ?? '');
    setFormErrors([]);

    // Tratar de decodificar días de la semana y horas
    const rawVigencia = p.dias_vigentes ?? '';
    if (rawVigencia.includes('Todos los días')) {
      setSelectedDays(DIAS_OPCIONES);
    } else if (rawVigencia.includes('Lun a Vie')) {
      setSelectedDays(['Lun', 'Mar', 'Mié', 'Jue', 'Vie']);
    } else if (rawVigencia.includes('Lun a Sáb')) {
      setSelectedDays(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']);
    } else if (rawVigencia.includes('Sáb y Dom')) {
      setSelectedDays(['Sáb', 'Dom']);
    } else {
      const parts = rawVigencia.split(' - ')[0];
      const matchDays = DIAS_OPCIONES.filter(d => parts.includes(d));
      if (matchDays.length > 0) setSelectedDays(matchDays);
    }

    if (rawVigencia.includes('hs') && rawVigencia.includes(' a ')) {
      setUseTimeRange(true);
      const match = rawVigencia.match(/(\d{2}:\d{2})\s+a\s+(\d{2}:\d{2})/);
      if (match) {
        setStartTime(match[1]);
        setEndTime(match[2]);
      }
    } else {
      setUseTimeRange(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || pendingAction) return;
    if (!validateForm()) return;

    const updated: Promocion = {
      id_promo: editingId,
      nombre: nombre.trim(),
      descuento_porcentaje: parseInt(descuento, 10),
      tipo,
      dias_vigentes: vigencia.trim() || 'Todos los días',
      activo: promos.find(p => p.id_promo === editingId)?.activo ?? true,
      descripcion: desc.trim(),
    };

    const previous = promos;
    setPendingAction(`edit-${editingId}`);
    setPromos(prev => prev.map(p => p.id_promo === editingId ? updated : p));
    resetForm();

    try {
      await promocionesService.update(editingId, updated);
      toast.success(`Promoción "${updated.nombre}" actualizada.`);
      addLog('sistema', `PROMOS: Modificada promoción "${updated.nombre}".`);
    } catch {
      setPromos(previous);
      toast.error('No se pudo guardar la edición.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (pendingAction) return;
    const target = promos.find(p => p.id_promo === id);
    if (!target) return;

    const previous = promos;
    setPendingAction(`delete-${id}`);
    setPromos(prev => prev.filter(p => p.id_promo !== id));
    setDeleteConfirmId(null);

    try {
      await promocionesService.remove(id);
      toast.success(`Promoción "${target.nombre}" eliminada.`);
      addLog('sistema', `PROMOS: Eliminada promoción "${target.nombre}".`);
    } catch {
      setPromos(previous);
      toast.error('No se pudo eliminar la promoción.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleTogglePromo = async (id: string) => {
    if (pendingAction) return;
    const target = promos.find(p => p.id_promo === id);
    if (!target) return;

    const nextState = !target.activo;
    const previous = promos;
    setPendingAction(`toggle-${id}`);
    setPromos(prev => prev.map(p => p.id_promo === id ? { ...p, activo: nextState } : p));

    try {
      await promocionesService.update(id, { activo: nextState });
      addLog('sistema', `PROMOS: Campaña "${target.nombre}" → ${nextState ? 'ACTIVA' : 'INACTIVA'}.`);
    } catch {
      setPromos(previous);
      toast.error('No se pudo cambiar el estado.');
    } finally {
      setPendingAction(null);
    }
  };

  const toggleDaySelection = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a,b) => DIAS_OPCIONES.indexOf(a) - DIAS_OPCIONES.indexOf(b))
    );
  };

  return (
    <div className="space-y-6 text-left">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Tarjetas KPI de Campañas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-850 shadow-xs">
          <span className="text-[10px] text-stone-400 dark:text-stone-300 font-black uppercase tracking-wider block">Campañas Totales</span>
          <h4 className="text-2xl font-black text-stone-900 dark:text-white font-mono mt-1">{promosLoading ? '…' : kpis.total}</h4>
        </div>
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-850 shadow-xs">
          <span className="text-[10px] text-stone-400 dark:text-stone-300 font-black uppercase tracking-wider block">Campañas Activas</span>
          <h4 className="text-2xl font-black text-emerald-600 font-mono mt-1">{promosLoading ? '…' : kpis.activas}</h4>
        </div>
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-850 shadow-xs">
          <span className="text-[10px] text-stone-400 dark:text-stone-300 font-black uppercase tracking-wider block">Descuento Promedio</span>
          <h4 className="text-2xl font-black text-[#624A3E] dark:text-[#C8956A] font-mono mt-1">{promosLoading ? '…' : `${kpis.promedio}%`}</h4>
        </div>
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-850 shadow-[#624A3E]/5 border-l-4 border-l-[#624A3E]">
          <span className="text-[10px] text-stone-400 dark:text-stone-300 font-black uppercase tracking-wider block">Tipo Frecuente</span>
          <h4 className="text-xs font-black text-stone-700 dark:text-white mt-2 truncate">{promosLoading ? 'Consultando…' : kpis.dominantType}</h4>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* COLUMNA IZQUIERDA: Formulario */}
        <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs h-fit space-y-4 text-left">
          <h2 className="text-sm font-black text-stone-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#624A3E] dark:text-[#C8956A]" />
            <span>{editingId ? 'Editar Promoción' : 'Nueva Campaña'}</span>
          </h2>

          <form
            onSubmit={editingId ? (e => { e.preventDefault(); handleSaveEdit(); }) : handleCreatePromo}
            className="space-y-4"
          >
            {/* Errores de Zod */}
            {formErrors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl p-3 space-y-1">
                {formErrors.map((err, i) => (
                  <p key={i} className="text-[10px] text-red-700 dark:text-red-300 font-semibold">⚠ {err}</p>
                ))}
              </div>
            )}

            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Nombre Promoción *</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="w-full border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-955 text-stone-800 dark:text-stone-100 rounded-xl px-3 py-2 text-xs focus:outline-none font-bold"
                placeholder="Ej. Happy Hour 2x1 Copa Barda"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Descuento % *</label>
                <div className="relative">
                  <Percent className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-2.5" />
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={descuento}
                    onChange={e => setDescuento(e.target.value)}
                    className="w-full border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-955 text-stone-800 dark:text-stone-100 rounded-xl pl-3 pr-8 py-2 text-xs focus:outline-none font-bold font-mono"
                    placeholder="Ej. 20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Tipo de Descuento</label>
                <select
                  value={tipo}
                  onChange={e => setTipo(e.target.value as Promocion['tipo'])}
                  className="w-full border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-955 text-stone-700 dark:text-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none font-bold cursor-pointer"
                >
                  {(Object.keys(TIPO_LABELS) as Promocion['tipo'][]).map(t => (
                    <option key={t} value={t} className="bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100">{TIPO_LABELS[t]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* PROGRAMADOR SEMANALES DE DÍAS (VIGENCIA) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-stone-505 uppercase flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                Días de Vigencia
              </label>
              
              <div className="flex gap-1 justify-between bg-stone-55 dark:bg-stone-950 p-1.5 rounded-xl border border-stone-150 dark:border-stone-850">
                {DIAS_OPCIONES.map(d => {
                  const isSelected = selectedDays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDaySelection(d)}
                      className={`w-7 h-7 rounded-full text-[9px] font-black uppercase transition-all flex items-center justify-center cursor-pointer ${
                        isSelected 
                          ? 'bg-[#624A3E] text-white shadow-xs' 
                          : 'bg-stone-100 text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:bg-stone-900 dark:text-stone-605'
                      }`}
                    >
                      {d[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* HORA FELIZ RANGO */}
            <div className="space-y-2 bg-stone-50 dark:bg-stone-850 p-3 rounded-xl border border-stone-150 dark:border-stone-800">
              <div className="flex items-center justify-between">
                <label htmlFor="useTimeRange" className="text-[10px] font-black text-stone-600 dark:text-stone-300 uppercase flex items-center gap-1 cursor-pointer">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  Restringir por Horario
                </label>
                <input 
                  id="useTimeRange"
                  type="checkbox"
                  checked={useTimeRange}
                  onChange={e => setUseTimeRange(e.target.checked)}
                  className="rounded border-stone-300 text-[#624A3E] w-4 h-4 cursor-pointer"
                />
              </div>

              {useTimeRange && (
                <div className="grid grid-cols-2 gap-2 pt-1 animate-fadeIn">
                  <div>
                    <span className="text-[8px] font-black text-stone-400 uppercase">Inicio</span>
                    <input 
                      type="time" 
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full border border-stone-200 bg-white dark:bg-stone-900 text-stone-800 dark:text-white rounded-lg p-1 text-[10px] font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-stone-400 uppercase">Fin</span>
                    <input 
                      type="time" 
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="w-full border border-stone-200 bg-white dark:bg-stone-900 text-stone-800 dark:text-white rounded-lg p-1 text-[10px] font-bold focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Descripción corta</label>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                rows={2}
                className="w-full border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-955 text-stone-850 dark:text-stone-100 rounded-xl px-3 py-2 text-xs focus:outline-none resize-none font-semibold"
                placeholder="Condiciones del descuento..."
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!!pendingAction}
                className="flex-1 bg-[#624A3E] hover:bg-[#503C32] text-white text-xs font-black uppercase py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-[#624A3E]/10 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {editingId ? <><Check className="w-3.5 h-3.5" /> Guardar</> : <><Plus className="w-3.5 h-3.5" /> Crear Campaña</>}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-2 text-stone-500 dark:text-stone-300 border border-stone-200 dark:border-stone-800 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* COLUMNA CENTRAL Y DERECHA: Lista y Calculadora Simuladora (Span 3) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Simulador de Descuentos para Caja */}
          <div className="bg-[#FFFDF9] dark:bg-stone-900 p-5 rounded-2xl border border-[#FAF4EE] dark:border-stone-800 shadow-xs space-y-4">
            <h4 className="text-xs font-black text-[#624A3E] dark:text-[#C8956A] uppercase tracking-tight flex items-center gap-1.5">
              <Calculator className="w-4 h-4" />
              Simulador de Descuentos (Arqueo)
            </h4>
            <p className="text-[10px] text-stone-550 dark:text-stone-300 font-bold leading-normal">
              Selecciona una promoción activa e ingresa el consumo de la mesa para simular el cobro de la cuenta.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[9px] font-black text-stone-400 uppercase block mb-1">Elegir Campaña</label>
                <select
                  value={simPromoId}
                  onChange={e => setSimPromoId(e.target.value)}
                  className="w-full border border-stone-200 bg-white dark:bg-stone-950 text-stone-750 dark:text-stone-200 rounded-xl px-2.5 py-1.5 font-bold cursor-pointer focus:outline-none"
                >
                  <option value="">-- Sin promoción --</option>
                  {promos.filter(p => p.activo).map(p => (
                    <option key={p.id_promo} value={p.id_promo}>{p.nombre} (-{p.descuento_porcentaje}%)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black text-stone-400 uppercase block mb-1">Monto Subtotal ($)</label>
                <input
                  type="number"
                  value={simSubtotal}
                  onChange={e => setSimSubtotal(e.target.value)}
                  className="w-full border border-stone-200 bg-white dark:bg-stone-950 text-stone-900 dark:text-white rounded-xl px-2.5 py-1.5 font-bold font-mono focus:outline-none text-right"
                  placeholder="Subtotal"
                />
              </div>

              {/* Resultados */}
              <div className="bg-[#FAF4EE] dark:bg-stone-850 p-3 rounded-xl border border-[#FAF4EE] dark:border-stone-800 space-y-1.5 font-semibold">
                <div className="flex justify-between text-[10px] text-stone-500">
                  <span>Descuento aplicado:</span>
                  <span className="font-mono text-stone-800 dark:text-white">-${simResults.descuentoMonto.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between text-[10px] text-stone-550 dark:text-stone-300">
                  <span>Total Neto a Cobrar:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-450 font-black">${simResults.totalPagar.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between text-[9px] text-stone-400 border-t border-stone-200/50 pt-1">
                  <span>Puntos acumulados (Club):</span>
                  <span className="font-bold text-stone-600 dark:text-white">{simResults.puntosAcumulados} pts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Buscador y listado de promociones */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchPromo}
                onChange={e => setSearchPromo(e.target.value)}
                placeholder="Buscar promoción por nombre..."
                className="w-full pl-9 pr-4 py-2.5 text-xs border border-stone-200 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 focus:outline-none"
              />
            </div>

            {!promosLoading && filteredPromos.length === 0 && (
              <div className="text-center py-8 text-stone-400 dark:text-stone-500 bg-white dark:bg-stone-900 border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30 text-stone-400 dark:text-stone-500" />
                <p className="text-xs font-bold text-stone-500 dark:text-stone-400">{debouncedSearch ? 'Sin resultados para la búsqueda.' : 'No hay promociones creadas aún.'}</p>
              </div>
            )}

            <div className="space-y-3">
              {filteredPromos.map(p => {
                const isBusy = !!pendingAction;
                return (
                  <div
                    key={p.id_promo}
                    className={`bg-white dark:bg-stone-900 border rounded-2xl p-4 flex items-start gap-4 transition-all hover:shadow-sm ${
                      p.activo 
                        ? 'border-stone-200 dark:border-stone-800' 
                        : 'border-stone-100 dark:border-stone-870 opacity-60 bg-stone-50/10'
                    }`}
                  >
                    {/* Badge tipo */}
                    <div className="shrink-0 mt-0.5">
                      <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                        p.tipo === 'happy_hour' ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/50' :
                        p.tipo === 'combo' ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/50' :
                        'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/50'
                      }`}>
                        {p.tipo === 'happy_hour' ? 'HH' : p.tipo === 'combo' ? 'Combo' : 'Directo'}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-stone-900 dark:text-white text-xs">{p.nombre}</span>
                        <span className="bg-[#624A3E]/10 dark:bg-[#C8956A]/20 text-[#624A3E] dark:text-[#C8956A] font-black text-[10px] px-2 py-0.5 rounded-full">
                          -{p.descuento_porcentaje}%
                        </span>
                      </div>
                      
                      {p.descripcion && (
                        <p className="text-[11px] text-stone-500 dark:text-stone-300 mt-1 leading-relaxed">{p.descripcion}</p>
                      )}
                      
                      {p.dias_vigentes && (
                        <div className="flex items-center gap-1 mt-2.5">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          <span className="text-[10px] text-stone-600 dark:text-stone-400 font-semibold">{p.dias_vigentes}</span>
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="shrink-0 flex items-center gap-1">
                      <button
                        onClick={() => handleTogglePromo(p.id_promo)}
                        disabled={isBusy}
                        className="p-1 rounded-lg hover:bg-stone-105 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                        title={p.activo ? 'Desactivar' : 'Activar'}
                      >
                        {p.activo
                          ? <ToggleRight className="w-5 h-5 text-emerald-600" />
                          : <ToggleLeft className="w-5 h-5 text-stone-400 dark:text-stone-605" />}
                      </button>
                      
                      <button
                        onClick={() => handleEditPromo(p)}
                        disabled={isBusy}
                        className="p-1.5 rounded-lg hover:bg-stone-105 dark:hover:bg-stone-850 transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-stone-450 dark:text-stone-300" />
                      </button>
                      
                      {deleteConfirmId === p.id_promo ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeletePromo(p.id_promo)}
                            disabled={isBusy}
                            className="px-2 py-0.5 text-[9px] bg-red-600 text-white rounded-lg hover:bg-red-750 transition-colors cursor-pointer"
                          >
                            OK
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-0.5 text-[9px] border border-stone-200 dark:border-stone-850 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-850 transition-colors cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(p.id_promo)}
                          disabled={isBusy}
                          className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-stone-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash className="w-3.5 h-3.5 text-rose-450" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
