import React, { useState, useEffect, useMemo } from 'react';
import { Tag, Calendar, Plus, ToggleLeft, ToggleRight, Sparkles, Search, Edit2, Trash, Check, X } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { promocionesService, Promocion } from '../services/promocionesService';
import { promocionSchema } from '../lib/validations';
import { ToastContainer, useToast } from './ToastContainer';
import { EventoLog } from '../types';

interface PromocionesModuleProps {
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

const TIPO_LABELS: Record<Promocion['tipo'], string> = {
  happy_hour: 'Happy Hour',
  combo: 'Combo',
  descuento_directo: 'Descuento Directo',
};

const DEFAULT_PROMOS: Promocion[] = [
  { id_promo: 'p_1', nombre: 'Happy Hour 2x1 Tragos & Cervezas', descuento_porcentaje: 50, tipo: 'happy_hour', dias_vigentes: 'Lun a Vie - 18 a 21hs', activo: true, descripcion: 'Aplica a vinos seleccionados y bebidas de línea comercial' },
  { id_promo: 'p_2', nombre: 'Combo Ejecutivo El Patrón', descuento_porcentaje: 20, tipo: 'combo', dias_vigentes: 'Lun a Sab - Almuerzo', activo: true, descripcion: 'Bife de chorizo completo + bebida sin alcohol con descuento integrado' },
  { id_promo: 'p_3', nombre: '15% Off Pago Efectivo / Arqueo', descuento_porcentaje: 15, tipo: 'descuento_directo', dias_vigentes: 'Todos los días - Completo', activo: true, descripcion: 'Descuento directo que aplica el cajero al cobrar en mostrador' },
  { id_promo: 'p_4', nombre: '25% Especial Cumpleañeros', descuento_porcentaje: 25, tipo: 'descuento_directo', dias_vigentes: 'Todos los días', activo: false, descripcion: 'Presentando documentación al mesero encargado' },
];

export default function PromocionesModule({ addLog }: PromocionesModuleProps) {
  const { toast, toasts, removeToast } = useToast();
  const [promos, setPromos] = useState<Promocion[]>([]);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    promocionesService.list()
      .then(data => setPromos(data && data.length > 0 ? data : DEFAULT_PROMOS))
      .catch(() => {
        setPromos(DEFAULT_PROMOS);
        toast.warning('No se pudieron cargar las promociones remotas. Mostrando datos locales.');
      });
  }, []);

  // ── Búsqueda con debounce ────────────────────────────────────────────────
  const [searchPromo, setSearchPromo] = useState('');
  const debouncedSearch = useDebounce(searchPromo, 300);

  const filteredPromos = useMemo(
    () => promos.filter(p =>
      p.nombre.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.descripcion?.toLowerCase().includes(debouncedSearch.toLowerCase())
    ),
    [promos, debouncedSearch]
  );

  // ── Estado del formulario ────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [descuento, setDescuento] = useState('');
  const [tipo, setTipo] = useState<Promocion['tipo']>('descuento_directo');
  const [vigencia, setVigencia] = useState('');
  const [desc, setDesc] = useState('');
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const resetForm = () => {
    setNombre(''); setDescuento(''); setTipo('descuento_directo');
    setVigencia(''); setDesc(''); setFormErrors([]); setEditingId(null);
  };

  // ── Validar con Zod ──────────────────────────────────────────────────────
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

  // ── Crear ────────────────────────────────────────────────────────────────
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
      toast.error('No se pudo crear la promoción. Se revirtió el cambio.');
    } finally {
      setPendingAction(null);
    }
  };

  // ── Iniciar edición ──────────────────────────────────────────────────────
  const handleEditPromo = (p: Promocion) => {
    setEditingId(p.id_promo);
    setNombre(p.nombre);
    setDescuento(String(p.descuento_porcentaje));
    setTipo(p.tipo);
    setVigencia(p.dias_vigentes ?? '');
    setDesc(p.descripcion ?? '');
    setFormErrors([]);
  };

  // ── Guardar edición ──────────────────────────────────────────────────────
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
      toast.error('No se pudo guardar la edición. Se revirtió el cambio.');
    } finally {
      setPendingAction(null);
    }
  };

  // ── Eliminar ─────────────────────────────────────────────────────────────
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
      toast.error('No se pudo eliminar la promoción. Se revirtió el cambio.');
    } finally {
      setPendingAction(null);
    }
  };

  // ── Toggle activo/inactivo ───────────────────────────────────────────────
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
      toast.error('No se pudo cambiar el estado. Se revirtió el cambio.');
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* ── Formulario ── */}
        <div className="bg-white dark:bg-[#1e1b18]/60 p-6 rounded-2xl border border-stone-200 dark:border-stone-830 shadow-xs h-fit space-y-4">
          <h2 className="text-sm font-black text-stone-800 dark:text-stone-100 uppercase tracking-tight flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#624A3E] dark:text-[#C8956A]" />
            <span>{editingId ? 'Editar Promocion' : 'Nueva Campana'}</span>
          </h2>

          <form
            onSubmit={editingId ? (e => { e.preventDefault(); handleSaveEdit(); }) : handleCreatePromo}
            className="space-y-3"
          >
            {/* Errores de validación */}
            {formErrors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3 space-y-1">
                {formErrors.map((err, i) => (
                  <p key={i} className="text-xs text-red-700 dark:text-red-300">{err}</p>
                ))}
              </div>
            )}

            <div>
              <label className="text-[10px] font-black text-stone-700 dark:text-stone-300 uppercase block mb-1">Nombre Promoción *</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="w-full border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30"
                placeholder="Ej: Happy Hour 2x1"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-stone-700 dark:text-stone-300 uppercase block mb-1">Descuento % *</label>
              <input
                type="number"
                min={1}
                max={100}
                value={descuento}
                onChange={e => setDescuento(e.target.value)}
                className="w-full border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30"
                placeholder="Ej: 20"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-stone-700 dark:text-stone-300 uppercase block mb-1">Tipo</label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value as Promocion['tipo'])}
                className="w-full border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30"
              >
                {(Object.keys(TIPO_LABELS) as Promocion['tipo'][]).map(t => (
                  <option key={t} value={t} className="bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100">{TIPO_LABELS[t]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-stone-700 dark:text-stone-300 uppercase block mb-1">Vigencia</label>
              <input
                type="text"
                value={vigencia}
                onChange={e => setVigencia(e.target.value)}
                className="w-full border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30"
                placeholder="Ej: Lun a Vie 18-21hs"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-stone-700 dark:text-stone-300 uppercase block mb-1">Descripción</label>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                rows={2}
                className="w-full border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30 resize-none"
                placeholder="Condiciones y alcance..."
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!!pendingAction}
                className="flex-1 bg-[#624A3E] text-white text-sm font-bold py-2 rounded-xl hover:bg-[#4e3a30] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                aria-label={editingId ? 'Guardar cambios de la promoción' : 'Crear nueva promoción'}
              >
                {editingId ? <><Check className="w-3.5 h-3.5" /> Guardar</> : <><Plus className="w-3.5 h-3.5" /> Crear</>}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-2 text-stone-500 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
                  aria-label="Cancelar edición"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── Lista de promociones ── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Barra de búsqueda */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchPromo}
              onChange={e => setSearchPromo(e.target.value)}
              placeholder="Buscar por nombre o descripción..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-stone-200 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30"
              aria-label="Buscar promociones"
            />
          </div>

          {filteredPromos.length === 0 && (
            <div className="text-center py-12 text-stone-400 dark:text-stone-500">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30 text-stone-400 dark:text-stone-500" />
              <p className="text-sm font-medium text-stone-500 dark:text-stone-400">{debouncedSearch ? 'Sin resultados para esa búsqueda.' : 'No hay promociones creadas aún.'}</p>
            </div>
          )}

          <div className="space-y-3">
            {filteredPromos.map(p => {
              const isBusy = !!pendingAction;
              return (
                <div
                  key={p.id_promo}
                  className={`bg-white dark:bg-[#1e1b18]/60 border rounded-2xl p-4 flex items-start gap-4 transition-all ${p.activo ? 'border-stone-200 dark:border-stone-830 shadow-xs' : 'border-stone-100 dark:border-stone-870 opacity-60'}`}
                >
                  {/* Badge tipo */}
                  <div className="shrink-0 mt-0.5">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                      p.tipo === 'happy_hour' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-900' :
                      p.tipo === 'combo' ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-900' :
                      'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                    }`}>
                      {TIPO_LABELS[p.tipo]}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-stone-800 text-sm">{p.nombre}</span>
                      <span className="bg-[#624A3E]/10 text-[#624A3E] font-black text-xs px-2 py-0.5 rounded-full">
                        -{p.descuento_porcentaje}%
                      </span>
                    </div>
                    {p.descripcion && (
                      <p className="text-xs text-stone-700 dark:text-stone-300 mt-0.5 line-clamp-2">{p.descripcion}</p>
                    )}
                    {p.dias_vigentes && (
                      <div className="flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3 text-stone-500 dark:text-stone-400" />
                        <span className="text-[11px] text-stone-600 dark:text-stone-400">{p.dias_vigentes}</span>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="shrink-0 flex items-center gap-1">
                    <button
                      onClick={() => handleTogglePromo(p.id_promo)}
                      disabled={isBusy}
                      className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors disabled:opacity-40"
                      aria-label={p.activo ? 'Desactivar promoción' : 'Activar promoción'}
                      title={p.activo ? 'Desactivar' : 'Activar'}
                    >
                      {p.activo
                        ? <ToggleRight className="w-5 h-5 text-emerald-600" />
                        : <ToggleLeft className="w-5 h-5 text-stone-400" />}
                    </button>
                    <button
                      onClick={() => handleEditPromo(p)}
                      disabled={isBusy}
                      className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors disabled:opacity-40"
                      aria-label={`Editar promoción ${p.nombre}`}
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4 text-stone-500" />
                    </button>
                    {deleteConfirmId === p.id_promo ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDeletePromo(p.id_promo)}
                          disabled={isBusy}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40"
                          aria-label="Confirmar eliminación"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 text-xs border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                          aria-label="Cancelar eliminación"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(p.id_promo)}
                        disabled={isBusy}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                        aria-label={`Eliminar promoción ${p.nombre}`}
                        title="Eliminar"
                      >
                        <Trash className="w-4 h-4 text-red-400" />
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
  );
}
