import React, { useEffect, useMemo, useState } from 'react';
import { Tag, Calendar, Plus, ToggleLeft, ToggleRight, Search, Edit2, Trash, Check, X } from 'lucide-react';
import { promocionesService, Promocion } from '../services/promocionesService';
import { EventoLog } from '../types';
import { promocionSchema } from '../lib/validations';
import { ToastContainer, useToast } from './ToastContainer';

interface PromocionesModuleProps {
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

type TipoPromocion = Promocion['tipo'];
type PendingAction = 'create' | `edit_${string}` | `toggle_${string}` | `delete_${string}`;

const DEFAULT_PROMOS: Promocion[] = [
  {
    id_promo: 'p_1',
    nombre: 'Happy Hour 2x1 Tragos y Cervezas',
    descuento_porcentaje: 50,
    tipo: 'happy_hour',
    dias_vigentes: 'Lun a Vie - 18 a 21 hs',
    activo: true,
    descripcion: 'Aplica a vinos seleccionados y bebidas de linea comercial'
  },
  {
    id_promo: 'p_2',
    nombre: 'Combo Ejecutivo El Patron',
    descuento_porcentaje: 20,
    tipo: 'combo',
    dias_vigentes: 'Lun a Sab - Almuerzo',
    activo: true,
    descripcion: 'Principal completo mas bebida sin alcohol con descuento integrado'
  },
  {
    id_promo: 'p_3',
    nombre: '15% Off Pago Efectivo',
    descuento_porcentaje: 15,
    tipo: 'descuento_directo',
    dias_vigentes: 'Todos los dias',
    activo: true,
    descripcion: 'Descuento directo para aplicar al cierre de caja'
  },
  {
    id_promo: 'p_4',
    nombre: '25% Especial Cumpleanos',
    descuento_porcentaje: 25,
    tipo: 'descuento_directo',
    dias_vigentes: 'Todos los dias',
    activo: false,
    descripcion: 'Requiere validacion del encargado antes de cobrar'
  },
];

const emptyForm = {
  nombre: '',
  descuento: '',
  tipo: 'descuento_directo' as TipoPromocion,
  vigencia: '',
  desc: ''
};

const normalizeText = (value: string) => value.trim().toLowerCase();

const getTipoLabel = (tipo: TipoPromocion) => {
  if (tipo === 'happy_hour') return 'Happy hour';
  if (tipo === 'combo') return 'Combo';
  return 'Descuento directo';
};

export default function PromocionesModule({ addLog }: PromocionesModuleProps) {
  const [promos, setPromos] = useState<Promocion[]>([]);
  const [searchPromo, setSearchPromo] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [nombre, setNombre] = useState(emptyForm.nombre);
  const [descuento, setDescuento] = useState(emptyForm.descuento);
  const [tipo, setTipo] = useState<TipoPromocion>(emptyForm.tipo);
  const [vigencia, setVigencia] = useState(emptyForm.vigencia);
  const [desc, setDesc] = useState(emptyForm.desc);
  const { toast, toasts, removeToast } = useToast();

  useEffect(() => {
    let mounted = true;

    promocionesService.list()
      .then(data => {
        if (!mounted) return;
        setPromos(data.length > 0 ? data : DEFAULT_PROMOS);
      })
      .catch(() => {
        if (!mounted) return;
        setPromos(DEFAULT_PROMOS);
        toast.warning('No se pudieron cargar promociones remotas. Se muestran datos locales.');
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredPromos = useMemo(() => {
    const query = normalizeText(searchPromo);
    if (!query) return promos;
    return promos.filter(p => (
      normalizeText(p.nombre).includes(query)
      || normalizeText(p.descripcion).includes(query)
      || normalizeText(getTipoLabel(p.tipo)).includes(query)
    ));
  }, [promos, searchPromo]);

  const activeCount = promos.filter(p => p.activo).length;
  const isBusy = pendingAction !== null;

  const resetForm = () => {
    setEditingId(null);
    setNombre(emptyForm.nombre);
    setDescuento(emptyForm.descuento);
    setTipo(emptyForm.tipo);
    setVigencia(emptyForm.vigencia);
    setDesc(emptyForm.desc);
  };

  const buildPromoFromForm = (id: string, activo = true): Promocion | null => {
    const validation = promocionSchema.safeParse({
      nombre,
      descuento_porcentaje: Number.parseInt(descuento, 10),
      tipo,
      vigencia,
      descripcion: desc
    });

    if (!validation.success) {
      toast.error(validation.error.issues.map(issue => issue.message).join('. '));
      return null;
    }

    const clean = validation.data;
    return {
      id_promo: id,
      nombre: clean.nombre,
      descuento_porcentaje: clean.descuento_porcentaje,
      tipo: clean.tipo,
      dias_vigentes: clean.vigencia?.trim() || 'Todos los dias',
      activo,
      descripcion: clean.descripcion?.trim() || 'Precios promocionales y combos especiales'
    };
  };

  const hasDuplicateName = (name: string, excludedId?: string) => (
    promos.some(p => p.id_promo !== excludedId && normalizeText(p.nombre) === normalizeText(name))
  );

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;

    const tempId = `p_${Date.now()}`;
    const newPromo = buildPromoFromForm(tempId);
    if (!newPromo) return;
    if (hasDuplicateName(newPromo.nombre)) {
      toast.warning('Ya existe una promocion con ese nombre.');
      return;
    }

    setPendingAction('create');
    setPromos(prev => [newPromo, ...prev]);

    try {
      const savedPromo = await promocionesService.create(newPromo);
      setPromos(prev => prev.map(p => (p.id_promo === tempId ? savedPromo : p)));
      addLog('sistema', `PROMOS: Nueva promocion '${newPromo.nombre}' publicada con ${newPromo.descuento_porcentaje}% de descuento`);
      toast.success('Promocion publicada correctamente.');
      resetForm();
    } catch {
      setPromos(prev => prev.filter(p => p.id_promo !== tempId));
      toast.error('No se pudo publicar la promocion. Se revirtio el cambio.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleEditPromo = (p: Promocion) => {
    if (isBusy) return;
    setEditingId(p.id_promo);
    setDeleteConfirmId(null);
    setNombre(p.nombre);
    setDescuento(String(p.descuento_porcentaje));
    setTipo(p.tipo);
    setVigencia(p.dias_vigentes || '');
    setDesc(p.descripcion || '');
  };

  const handleSaveEdit = async () => {
    if (!editingId || isBusy) return;

    const current = promos.find(p => p.id_promo === editingId);
    if (!current) return;

    const updated = buildPromoFromForm(editingId, current.activo);
    if (!updated) return;
    if (hasDuplicateName(updated.nombre, editingId)) {
      toast.warning('Ya existe otra promocion con ese nombre.');
      return;
    }

    setPendingAction(`edit_${editingId}`);
    setPromos(prev => prev.map(p => (p.id_promo === editingId ? updated : p)));

    try {
      await promocionesService.update(editingId, updated);
      addLog('sistema', `PROMOS: Promocion '${updated.nombre}' actualizada`);
      toast.success('Promocion actualizada.');
      resetForm();
    } catch {
      setPromos(prev => prev.map(p => (p.id_promo === editingId ? current : p)));
      toast.error('No se pudo guardar la promocion. Se revirtio el cambio.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (isBusy) return;
    const target = promos.find(p => p.id_promo === id);
    if (!target) return;

    const previousPromos = promos;
    setPendingAction(`delete_${id}`);
    setDeleteConfirmId(null);
    setPromos(prev => prev.filter(p => p.id_promo !== id));

    try {
      const removed = await promocionesService.remove(id);
      if (!removed) throw new Error('delete failed');
      addLog('sistema', `PROMOS: Promocion '${target.nombre}' eliminada`);
      toast.success('Promocion eliminada.');
    } catch {
      setPromos(previousPromos);
      toast.error('No se pudo eliminar la promocion. Se restauro la lista.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleTogglePromo = async (id: string) => {
    if (isBusy) return;
    const target = promos.find(p => p.id_promo === id);
    if (!target) return;

    const nextState = !target.activo;
    setPendingAction(`toggle_${id}`);
    setPromos(prev => prev.map(p => (p.id_promo === id ? { ...p, activo: nextState } : p)));

    try {
      await promocionesService.update(id, { activo: nextState });
      addLog('sistema', `PROMOS: Campana '${target.nombre}' cambiada a ${nextState ? 'activa' : 'pausada'}`);
      toast.success(nextState ? 'Promocion activada.' : 'Promocion pausada.');
    } catch {
      setPromos(prev => prev.map(p => (p.id_promo === id ? target : p)));
      toast.error('No se pudo cambiar el estado. Se revirtio el cambio.');
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs h-fit space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#624A3E]" />
              {editingId ? 'Editar promocion' : 'Nueva campana'}
            </h3>
            <p className="text-[11px] text-stone-500 font-medium">
              Configura descuentos visibles para caja, mozos y comandas.
            </p>
          </div>

          <form onSubmit={editingId ? (e => { e.preventDefault(); void handleSaveEdit(); }) : handleCreatePromo} className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1" htmlFor="promo-nombre">Nombre promocion</label>
              <input
                id="promo-nombre"
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej. Viernes de amigos"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30 focus:border-[#624A3E]"
                disabled={isBusy}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1" htmlFor="promo-descuento">Descuento (%)</label>
              <input
                id="promo-descuento"
                type="number"
                value={descuento}
                onChange={e => setDescuento(e.target.value)}
                placeholder="Ej. 15"
                min="1"
                max="100"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30 focus:border-[#624A3E]"
                disabled={isBusy}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1" htmlFor="promo-tipo">Tipo de descuento</label>
              <select
                id="promo-tipo"
                value={tipo}
                onChange={e => setTipo(e.target.value as TipoPromocion)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30 focus:border-[#624A3E] cursor-pointer font-semibold text-stone-700"
                disabled={isBusy}
              >
                <option value="descuento_directo">Descuento directo %</option>
                <option value="happy_hour">Happy hour 2x1 / tragos</option>
                <option value="combo">Combo ejecutivo combinado</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1" htmlFor="promo-vigencia">Vigencia</label>
              <input
                id="promo-vigencia"
                type="text"
                value={vigencia}
                onChange={e => setVigencia(e.target.value)}
                placeholder="Ej. Viernes de 18 a 22 hs"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30 focus:border-[#624A3E]"
                disabled={isBusy}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1" htmlFor="promo-descripcion">Descripcion breve</label>
              <textarea
                id="promo-descripcion"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Detalle de platos o condiciones..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30 focus:border-[#624A3E]"
                disabled={isBusy}
              />
            </div>

            <button
              type="submit"
              disabled={isBusy}
              className="w-full py-2.5 bg-[#624A3E] hover:bg-[#503C32] disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-xl transition-all active:scale-[0.98] cursor-pointer"
            >
              {pendingAction === 'create' ? 'Publicando...' : editingId ? 'Guardar cambios' : 'Publicar descuento'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                disabled={isBusy}
                className="w-full py-2 text-xs font-bold text-stone-500 hover:text-stone-700 disabled:text-stone-300 cursor-pointer"
              >
                Cancelar edicion
              </button>
            )}
          </form>
        </aside>

        <section className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs lg:col-span-3 space-y-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 pb-2 border-b border-stone-100">
            <div>
              <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#624A3E]" />
                Campanas de descuentos y promociones ({promos.length})
              </h3>
              <p className="text-[11px] text-stone-500 font-semibold">
                {activeCount} activas. Pausa promociones sin borrarlas del historial operativo.
              </p>
            </div>
            <span className="text-[9px] bg-stone-100 text-stone-500 font-bold px-2 py-0.5 rounded-full w-fit">
              Politicas de incentivo de consumo
            </span>
          </div>

          <div className="relative max-w-xs">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchPromo}
              onChange={e => setSearchPromo(e.target.value)}
              placeholder="Buscar promocion, tipo o detalle..."
              className="w-full pl-8 pr-2 py-1.5 text-xs border border-stone-200 rounded-lg bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30 focus:border-[#624A3E]"
            />
          </div>

          {filteredPromos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 p-8 text-center">
              <p className="text-sm font-black text-stone-700">No hay promociones para esa busqueda.</p>
              <p className="text-xs text-stone-500 mt-1">Prueba con otro nombre, tipo o condicion comercial.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPromos.map(p => {
                const togglePending = pendingAction === `toggle_${p.id_promo}`;
                const deletePending = pendingAction === `delete_${p.id_promo}`;
                const editPending = pendingAction === `edit_${p.id_promo}`;

                return (
                  <article
                    key={p.id_promo}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      p.activo
                        ? 'border-stone-200 bg-[#F5F1E9]/30 shadow-sm'
                        : 'border-stone-200 bg-stone-50/50 opacity-70'
                    } ${editPending || deletePending || togglePending ? 'ring-2 ring-[#624A3E]/20' : ''}`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-extrabold text-stone-900 text-sm tracking-tight leading-snug">{p.nombre}</h4>
                          <span className="text-[9px] font-black uppercase tracking-wide text-stone-500">
                            {getTipoLabel(p.tipo)}
                          </span>
                        </div>
                        <span className="text-xs font-black text-[#624A3E] font-mono tracking-tight bg-[#624A3E]/10 px-2 py-1 rounded-lg shrink-0">
                          -{p.descuento_porcentaje}%
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-stone-500 leading-normal">{p.descripcion}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-6 pt-3 border-t border-stone-200/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[9px] text-stone-500 font-bold flex items-center gap-1 font-mono truncate">
                          <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          {p.dias_vigentes}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleEditPromo(p)}
                          disabled={isBusy}
                          className="p-1 text-stone-400 hover:text-blue-500 rounded hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          aria-label={`Editar promocion ${p.nombre}`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        {deleteConfirmId === p.id_promo ? (
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => void handleDeletePromo(p.id_promo)}
                              disabled={isBusy}
                              className="p-1 text-red-600 bg-red-50 rounded disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              aria-label={`Confirmar eliminacion de ${p.nombre}`}
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              disabled={isBusy}
                              className="p-1 text-stone-400 rounded disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              aria-label="Cancelar eliminacion"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(p.id_promo)}
                            disabled={isBusy}
                            className="p-1 text-stone-400 hover:text-red-500 rounded hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            aria-label={`Eliminar promocion ${p.nombre}`}
                          >
                            <Trash className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleTogglePromo(p.id_promo)}
                        disabled={isBusy}
                        className="flex items-center gap-1.5 text-stone-500 hover:text-stone-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
                      >
                        {p.activo ? (
                          <span className="text-[9px] font-black text-emerald-600 uppercase flex items-center gap-1">
                            {togglePending ? 'Sincronizando' : 'Activo'} <ToggleRight className="w-5 h-5" />
                          </span>
                        ) : (
                          <span className="text-[9px] font-black text-stone-400 uppercase flex items-center gap-1">
                            {togglePending ? 'Sincronizando' : 'Pausado'} <ToggleLeft className="w-5 h-5" />
                          </span>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
