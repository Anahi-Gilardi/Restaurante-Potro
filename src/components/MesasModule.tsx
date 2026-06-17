import React, { useEffect, useMemo, useState } from 'react';
import { useToast, ToastContainer } from './ToastContainer';
import {
  Sofa, List, Link2, Unlink, Plus, Check, Trash, Edit2, X,
  MapPin, Users, AlertCircle, Search, LayoutGrid, Unlock
} from 'lucide-react';
import { Mesa, EventoLog } from '../types';
import { mesasService } from '../services/mesasService';

interface MesasModuleProps {
  mesas: Mesa[];
  onMesasChange: (mesas: Mesa[]) => void;
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

const ESTADOS: { key: Mesa['estado']; label: string; color: string; bg: string; border: string }[] = [
  { key: 'libre', label: 'Libre', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { key: 'ocupada', label: 'Ocupada', color: 'text-[#624A3E]', bg: 'bg-[#624A3E]/10', border: 'border-[#624A3E]/40' },
  { key: 'esperando_cuenta', label: 'Espera cuenta', color: 'text-emerald-800', bg: 'bg-emerald-100', border: 'border-emerald-400' },
  { key: 'reservada', label: 'Reservada', color: 'text-amber-800', bg: 'bg-amber-100', border: 'border-amber-300' },
  { key: 'limpiando', label: 'Limpieza', color: 'text-blue-800', bg: 'bg-blue-100', border: 'border-blue-300' },
];

const ESTADO_POR_KEY = Object.fromEntries(ESTADOS.map(e => [e.key, e]));
const ESTADO_ORDER: Mesa['estado'][] = ['libre', 'ocupada', 'esperando_cuenta', 'reservada', 'limpiando'];

/** Posiciones aproximadas basadas en el plano enviado. El plano es vertical; 0,0 = arriba-izquierda. */
const MESAS_INICIALES_PLANO: Partial<Mesa>[] = [
  // Comedor (sector superior, 4 mesas rectangulares)
  { id_mesa: 1, numero_mesa: 'Mesa 1', sector: 'comedor', capacidad: 4, forma: 'rectangular', x: 61, y: 16 },
  { id_mesa: 2, numero_mesa: 'Mesa 2', sector: 'comedor', capacidad: 5, forma: 'rectangular', x: 22, y: 16 },
  { id_mesa: 3, numero_mesa: 'Mesa 3', sector: 'comedor', capacidad: 5, forma: 'rectangular', x: 22, y: 27 },
  { id_mesa: 4, numero_mesa: 'Mesa 4', sector: 'comedor', capacidad: 4, forma: 'rectangular', x: 61, y: 27 },

  // Salón (sector inferior, 6 mesas redondas)
  { id_mesa: 5, numero_mesa: 'Mesa 5', sector: 'salon', capacidad: 4, forma: 'redonda', x: 41, y: 58 },
  { id_mesa: 6, numero_mesa: 'Mesa 6', sector: 'salon', capacidad: 4, forma: 'redonda', x: 22, y: 70 },
  { id_mesa: 7, numero_mesa: 'Mesa 7', sector: 'salon', capacidad: 3, forma: 'redonda', x: 61, y: 70 },
  { id_mesa: 8, numero_mesa: 'Mesa 8', sector: 'salon', capacidad: 4, forma: 'redonda', x: 22, y: 84 },
  { id_mesa: 9, numero_mesa: 'Mesa 9', sector: 'salon', capacidad: 2, forma: 'redonda', x: 61, y: 84 },
  { id_mesa: 10, numero_mesa: 'Mesa 10', sector: 'salon', capacidad: 4, forma: 'redonda', x: 41, y: 84 },
];

export default function MesasModule({ mesas, onMesasChange, addLog }: MesasModuleProps) {
  const { toast, toasts, removeToast } = useToast();

  // Normalizar mesas entrantes: si no tienen plano, les asignamos las posiciones iniciales.
  const normalizedMesas = useMemo(() => {
    return mesas.map(m => {
      const plano = MESAS_INICIALES_PLANO.find(p => p.id_mesa === m.id_mesa);
      return {
        ...plano,
        ...m,
        estado: m.estado || 'libre',
        capacidad: m.capacidad ?? plano?.capacidad ?? 4,
        sector: m.sector ?? plano?.sector ?? 'salon',
        forma: m.forma ?? plano?.forma ?? 'redonda',
        x: m.x ?? plano?.x ?? 50,
        y: m.y ?? plano?.y ?? 50,
        mesas_unidas: m.mesas_unidas ?? [],
        parent_id: m.parent_id ?? null,
      };
    });
  }, [mesas]);

  const [localMesas, setLocalMesas] = useState<Mesa[]>(normalizedMesas);
  const [viewMode, setViewMode] = useState<'plano' | 'lista'>('plano');
  const [filterSector, setFilterSector] = useState<'todos' | NonNullable<Mesa['sector']>>('todos');
  const [filterEstado, setFilterEstado] = useState<'todos' | Mesa['estado']>('todos');
  const [search, setSearch] = useState('');

  // Formulario nueva mesa
  const [numeroMesa, setNumeroMesa] = useState('');
  const [sector, setSector] = useState<NonNullable<Mesa['sector']>>('salon');
  const [capacidad, setCapacidad] = useState(4);
  const [forma, setForma] = useState<NonNullable<Mesa['forma']>>('redonda');

  // Edición
  const [editingMesaId, setEditingMesaId] = useState<number | null>(null);
  const [editNumero, setEditNumero] = useState('');
  const [editSector, setEditSector] = useState<NonNullable<Mesa['sector']>>('salon');
  const [editCapacidad, setEditCapacidad] = useState(4);
  const [editForma, setEditForma] = useState<NonNullable<Mesa['forma']>>('redonda');

  // Unión
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [unionMode, setUnionMode] = useState(false);
  const [activeMesaId, setActiveMesaId] = useState<number | null>(null);
  const [busyMesaId, setBusyMesaId] = useState<number | null>(null);

  // Confirmación eliminación
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    setLocalMesas(normalizedMesas);
  }, [normalizedMesas]);

  useEffect(() => {
    if (activeMesaId && !localMesas.some(m => m.id_mesa === activeMesaId)) {
      setActiveMesaId(null);
    }
  }, [activeMesaId, localMesas]);

  const persist = (next: Mesa[]) => {
    setLocalMesas(next);
    onMesasChange(next);
  };

  const handleCreateMesa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroMesa.trim()) return;
    const formattedName = numeroMesa.trim();
    if (localMesas.some(m => m.numero_mesa.toLowerCase() === formattedName.toLowerCase())) {
      toast.error('La mesa ya existe.');
      return;
    }

    const nextId = Date.now() + Math.floor(Math.random() * 100);
    const newMesa: Mesa = {
      id_mesa: nextId,
      numero_mesa: formattedName,
      estado: 'libre',
      capacidad,
      sector,
      forma,
      x: 10 + Math.random() * 70,
      y: 10 + Math.random() * 70,
      mesas_unidas: [],
      parent_id: null,
    };

    const next = [...localMesas, newMesa];
    persist(next);
    mesasService.create(newMesa).catch(() => {
      toast.warning('La mesa quedó disponible localmente, pero no pudo sincronizarse.');
    });
    addLog('sistema', `MESAS: Creada nueva mesa '${formattedName}' (${capacidad} pax) en ${sector.toUpperCase()}`);
    setNumeroMesa('');
    setCapacidad(4);
  };

  const getComensalesForEstado = (m: Mesa, estado: Mesa['estado']) => {
    if (estado === 'ocupada' || estado === 'esperando_cuenta') {
      return m.comensales || Math.min(m.capacidad || 2, 2);
    }
    return undefined;
  };

  const buildMesaEstado = (m: Mesa, estado: Mesa['estado']): Mesa => ({
    ...m,
    estado,
    comensales: getComensalesForEstado(m, estado),
    reserva_cliente: estado === 'reservada' ? m.reserva_cliente : undefined,
    reserva_hora: estado === 'reservada' ? m.reserva_hora : undefined,
  });

  const handleSetEstadoMesa = async (id: number, nextEstado: Mesa['estado']) => {
    const mesa = localMesas.find(m => m.id_mesa === id);
    if (!mesa) return;
    if (mesa.parent_id) {
      toast.error('No se puede editar una mesa que está unida a otra. Separala primero.');
      return;
    }

    const changedIds = new Set([id, ...(mesa.mesas_unidas || [])]);
    const changedMesas: Mesa[] = [];
    const next = localMesas.map(m => {
      if (!changedIds.has(m.id_mesa)) return m;
      const updated = buildMesaEstado(m, nextEstado);
      changedMesas.push(updated);
      return updated;
    });

    persist(next);
    setBusyMesaId(id);
    setActiveMesaId(id);

    try {
      await Promise.all(changedMesas.map(m => mesasService.update(m.id_mesa, m)));
      const label = getEstadoStyle(nextEstado).label;
      toast.success(`${mesa.numero_mesa}: ${label}.`);
      addLog('sistema', `MESAS: '${mesa.numero_mesa}' a ${nextEstado.toUpperCase()}`);
    } catch (error) {
      toast.warning('El estado cambió localmente, pero no pudo sincronizarse.');
      console.error('Error sincronizando mesa:', error);
    } finally {
      setBusyMesaId(null);
    }
  };

  const handleToggleEstadoMesa = (id: number) => {
    const mesa = localMesas.find(m => m.id_mesa === id);
    if (!mesa) return;
    const currentIdx = ESTADO_ORDER.indexOf(mesa.estado);
    const nextEstado = ESTADO_ORDER[(currentIdx + 1) % ESTADO_ORDER.length];
    handleSetEstadoMesa(id, nextEstado);
  };

  const handleLiberarMesa = (id: number) => {
    handleSetEstadoMesa(id, 'libre');
  };

  const handleStartEdit = (m: Mesa) => {
    setEditingMesaId(m.id_mesa);
    setEditNumero(m.numero_mesa);
    setEditSector(m.sector || 'salon');
    setEditCapacidad(m.capacidad || 4);
    setEditForma(m.forma || 'redonda');
  };

  const handleSaveEdit = () => {
    if (!editingMesaId || !editNumero.trim()) return;
    const duplicate = localMesas.find(m => m.numero_mesa.toLowerCase() === editNumero.trim().toLowerCase() && m.id_mesa !== editingMesaId);
    if (duplicate) {
      toast.error('Ya existe otra mesa con ese nombre.');
      return;
    }

    const next = localMesas.map(m => {
      if (m.id_mesa === editingMesaId) {
        const updated: Mesa = { ...m, numero_mesa: editNumero.trim(), sector: editSector, capacidad: editCapacidad, forma: editForma };
        mesasService.update(editingMesaId, updated).catch(() => { });
        addLog('sistema', `MESAS: Modificada mesa a '${editNumero.trim()}'`);
        return updated;
      }
      return m;
    });
    persist(next);
    setEditingMesaId(null);
    toast.success('Mesa actualizada.');
  };

  const handleDeleteMesa = (id: number) => {
    const next = localMesas
      .filter(m => m.id_mesa !== id)
      .map(m => ({
        ...m,
        mesas_unidas: m.mesas_unidas?.filter(uid => uid !== id) || [],
        parent_id: m.parent_id === id ? null : m.parent_id,
      }));
    persist(next);
    mesasService.remove(id).catch(() => { });
    addLog('sistema', `MESAS: Mesa eliminada del sistema`);
    setDeleteConfirmId(null);
    setSelectedIds(prev => prev.filter(sid => sid !== id));
  };

  const toggleSelectForUnion = (id: number) => {
    setSelectedIds(prev => {
      const exists = prev.includes(id);
      if (exists) return prev.filter(x => x !== id);
      if (prev.length >= 3) {
        toast.error('Máximo 3 mesas por unión.');
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleUnirMesas = () => {
    if (selectedIds.length < 2) {
      toast.error('Seleccioná al menos 2 mesas para unir.');
      return;
    }
    const seleccionadas = localMesas.filter(m => selectedIds.includes(m.id_mesa));
    if (seleccionadas.some(m => m.parent_id || (m.mesas_unidas?.length ?? 0) > 0)) {
      toast.error('Alguna mesa seleccionada ya pertenece a otra unión.');
      return;
    }

    const principal = seleccionadas[0];
    const hijas = seleccionadas.slice(1);
    const capacidadTotal = seleccionadas.reduce((sum, m) => sum + (m.capacidad || 0), 0);

    const next = localMesas.map(m => {
      if (m.id_mesa === principal.id_mesa) {
        return {
          ...m,
          capacidad: capacidadTotal,
          mesas_unidas: [...(m.mesas_unidas || []), ...hijas.map(h => h.id_mesa)],
          numero_mesa: `${m.numero_mesa} +${hijas.length}`,
        };
      }
      if (selectedIds.includes(m.id_mesa)) {
        return { ...m, parent_id: principal.id_mesa, estado: principal.estado };
      }
      return m;
    });
    persist(next);
    addLog('sistema', `MESAS: Unidas ${selectedIds.length} mesas en '${principal.numero_mesa} +${hijas.length}' (${capacidadTotal} pax)`);
    setSelectedIds([]);
    setUnionMode(false);
    toast.success(`Mesas unidas. Capacidad total: ${capacidadTotal} pax.`);
  };

  const handleSepararMesas = (parentId: number) => {
    const parent = localMesas.find(m => m.id_mesa === parentId);
    if (!parent?.mesas_unidas?.length) return;

    const hijas = parent.mesas_unidas;
    const next = localMesas.map(m => {
      if (m.id_mesa === parentId) {
        const plano = MESAS_INICIALES_PLANO.find(p => p.id_mesa === parentId);
        return {
          ...m,
          capacidad: plano?.capacidad || m.capacidad ? Math.round(m.capacidad / ((hijas.length || 0) + 1)) : 4,
          mesas_unidas: [],
          numero_mesa: plano?.numero_mesa || m.numero_mesa.replace(/\s*\+\d+$/, ''),
        };
      }
      if (hijas.includes(m.id_mesa)) {
        const plano = MESAS_INICIALES_PLANO.find(p => p.id_mesa === m.id_mesa);
        return { ...m, parent_id: null, estado: 'libre' as const, capacidad: plano?.capacidad || m.capacidad };
      }
      return m;
    });
    persist(next);
    addLog('sistema', `MESAS: Separadas mesas de '${parent.numero_mesa}'`);
    toast.success('Mesas separadas.');
  };

  const filteredMesas = useMemo(() => {
    return localMesas.filter(m => {
      if (filterSector !== 'todos' && m.sector !== filterSector) return false;
      if (filterEstado !== 'todos' && m.estado !== filterEstado) return false;
      if (search && !m.numero_mesa.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [localMesas, filterSector, filterEstado, search]);

  const mesasVisiblesEnPlano = useMemo(() => {
    return filteredMesas.filter(m => !m.parent_id || selectedIds.includes(m.id_mesa));
  }, [filteredMesas, selectedIds]);

  const freeCount = localMesas.filter(m => m.estado === 'libre' && !m.parent_id).length;
  const occupiedCount = localMesas.filter(m => m.estado === 'ocupada' && !m.parent_id).length;
  const capacidadTotal = localMesas.filter(m => !m.parent_id).reduce((s, m) => s + (m.capacidad || 0), 0);
  const paxOcupados = localMesas.filter(m => m.estado === 'ocupada' && !m.parent_id).reduce((s, m) => s + (m.comensales || m.capacidad || 0), 0);

  const getEstadoStyle = (estado: Mesa['estado']) => ESTADO_POR_KEY[estado] || ESTADO_POR_KEY['libre'];
  const activeMesa = useMemo(
    () => localMesas.find(m => m.id_mesa === activeMesaId) || null,
    [activeMesaId, localMesas]
  );

  return (
    <div className="space-y-5">

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Total Mesas</span>
          <h4 className="text-2xl font-black text-stone-950 font-mono mt-1">{localMesas.filter(m => !m.parent_id).length}</h4>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Libres</span>
          <h4 className="text-2xl font-black text-emerald-600 font-mono mt-1">{freeCount}</h4>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Ocupadas</span>
          <h4 className="text-2xl font-black text-[#624A3E] font-mono mt-1">{occupiedCount}</h4>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-[#624A3E]/5 border-l-4 border-l-[#624A3E]">
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Capacidad / Ocupación</span>
          <h4 className="text-2xl font-black text-amber-700 font-mono mt-1">
            {paxOcupados}<span className="text-sm text-stone-400 font-normal">/{capacidadTotal} pax</span>
          </h4>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Left pane: form + filters */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4 h-fit">
          <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#624A3E]" />
            Nueva Mesa
          </h3>
          <form onSubmit={handleCreateMesa} className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Nombre / Número</label>
              <input
                type="text"
                value={numeroMesa}
                onChange={e => setNumeroMesa(e.target.value)}
                placeholder="Ej. Mesa 11, Barra 1"
                className="w-full text-xs min-h-11 px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Sector</label>
                <select
                  value={sector}
                  onChange={e => setSector(e.target.value as NonNullable<Mesa['sector']>)}
                  className="w-full text-xs min-h-11 px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E] cursor-pointer text-stone-700 font-semibold"
                >
                  <option value="comedor">Comedor</option>
                  <option value="salon">Salón</option>
                  <option value="terraza">Terraza</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Capacidad</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={capacidad}
                  onChange={e => setCapacidad(parseInt(e.target.value) || 1)}
                  className="w-full text-xs min-h-11 px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Forma en plano</label>
              <select
                value={forma}
                onChange={e => setForma(e.target.value as NonNullable<Mesa['forma']>)}
                className="w-full text-xs min-h-11 px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E] cursor-pointer text-stone-700 font-semibold"
              >
                <option value="redonda">Redonda</option>
                <option value="rectangular">Rectangular</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full min-h-11 py-2.5 bg-[#624A3E] hover:bg-[#503C32] text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer"
            >
              Agregar Mesa
            </button>
          </form>

          <hr className="border-stone-100" />

          <div className="space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar mesa..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full text-xs min-h-10 pl-8 pr-3 py-2 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={filterSector}
                onChange={e => setFilterSector(e.target.value as any)}
                className="text-xs min-h-10 px-2 py-2 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none cursor-pointer"
              >
                <option value="todos">Todos los sectores</option>
                <option value="comedor">Comedor</option>
                <option value="salon">Salón</option>
                <option value="terraza">Terraza</option>
                <option value="vip">VIP</option>
              </select>
              <select
                value={filterEstado}
                onChange={e => setFilterEstado(e.target.value as any)}
                className="text-xs min-h-10 px-2 py-2 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none cursor-pointer"
              >
                <option value="todos">Todos los estados</option>
                {ESTADOS.map(e => (
                  <option key={e.key} value={e.key}>{e.label}</option>
                ))}
              </select>
            </div>
          </div>

          <hr className="border-stone-100" />

          <div className="space-y-2">
            <button
              onClick={() => { setUnionMode(v => !v); setSelectedIds([]); }}
              className={`w-full min-h-10 flex items-center justify-center gap-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                unionMode ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
              }`}
            >
              <Link2 className="w-4 h-4" />
              {unionMode ? 'Cancelar unión' : 'Unir mesas'}
            </button>
            {unionMode && (
              <>
                <p className="text-[10px] text-stone-500 text-center">Seleccioná 2 o 3 mesas y confirmá.</p>
                <button
                  onClick={handleUnirMesas}
                  disabled={selectedIds.length < 2}
                  className="w-full min-h-10 flex items-center justify-center gap-2 text-xs font-extrabold rounded-xl bg-[#624A3E] text-white disabled:opacity-40 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Confirmar unión ({selectedIds.length})
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right pane: plano / lista */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-stone-200 shadow-xs xl:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-stone-100">
            <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#624A3E]" />
              Distribución del Salón
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('plano')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${viewMode === 'plano' ? 'bg-[#624A3E] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Plano
              </button>
              <button
                onClick={() => setViewMode('lista')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${viewMode === 'lista' ? 'bg-[#624A3E] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              >
                <List className="w-3.5 h-3.5" /> Lista
              </button>
            </div>
          </div>

          {/* Leyenda de estados */}
          <div className="flex flex-wrap gap-2">
            {ESTADOS.map(e => (
              <div key={e.key} className="flex items-center gap-1.5 text-[10px] font-bold text-stone-500">
                <span className={`w-2.5 h-2.5 rounded-full ${e.bg} ${e.border} border`} />
                {e.label}
              </div>
            ))}
          </div>

          {viewMode === 'plano' ? (
            <div className="relative w-full aspect-[3/5] sm:aspect-[4/5] md:aspect-[3/4] bg-[#F5F1E9] rounded-2xl border-2 border-stone-200 overflow-hidden shadow-inner">
              {/* Fondo con sectores aproximados */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[2%] left-[5%] right-[5%] h-[34%] border-2 border-dashed border-stone-300/60 rounded-xl bg-stone-100/40" />
                <span className="absolute top-[4%] left-[8%] text-[10px] font-black text-stone-400 uppercase tracking-widest">Comedor</span>
                <div className="absolute top-[44%] left-[5%] right-[5%] h-[50%] border-2 border-dashed border-stone-300/60 rounded-xl bg-stone-100/40" />
                <span className="absolute top-[46%] left-[8%] text-[10px] font-black text-stone-400 uppercase tracking-widest">Salón</span>
                <div className="absolute top-[84%] left-[62%] right-[5%] h-[14%] border-2 border-dashed border-stone-300/60 rounded-xl bg-stone-100/40 flex items-center justify-center">
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Barra</span>
                </div>
              </div>

              {/* Mesas posicionadas */}
              {mesasVisiblesEnPlano.map(m => {
                const estilo = getEstadoStyle(m.estado);
                const isSelected = selectedIds.includes(m.id_mesa);
                const isActive = activeMesaId === m.id_mesa;
                const isParent = (m.mesas_unidas?.length ?? 0) > 0;
                const isBusy = busyMesaId === m.id_mesa;
                return (
                  <div
                    key={m.id_mesa}
                    onClick={() => {
                      if (unionMode) {
                        if (!m.parent_id) toggleSelectForUnion(m.id_mesa);
                        else toast.error('No podés unir una mesa que ya pertenece a otra unión.');
                      } else {
                        setActiveMesaId(m.id_mesa);
                      }
                    }}
                    style={{ left: `${m.x}%`, top: `${m.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center cursor-pointer transition-all select-none ${
                      m.forma === 'rectangular' ? 'w-16 h-10 sm:w-20 sm:h-12 rounded-lg' : 'w-12 h-12 sm:w-14 sm:h-14 rounded-full'
                    } ${estilo.bg} ${estilo.border} border-2 ${estilo.color} ${
                      isSelected || isActive ? 'ring-2 ring-offset-2 ring-[#624A3E] z-20 scale-105' : 'hover:scale-105 z-10'
                    }`}
                  >
                    <span className="text-[9px] sm:text-[10px] font-black leading-none">{m.numero_mesa}</span>
                    <span className="text-[8px] sm:text-[9px] font-semibold opacity-90 leading-none">{m.capacidad} pax</span>
                    {isBusy && (
                      <span className="absolute inset-0 rounded-[inherit] bg-white/70 text-[#624A3E] text-[9px] font-black flex items-center justify-center">
                        Guardando
                      </span>
                    )}
                    {isParent && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#624A3E] text-white rounded-full text-[8px] font-black flex items-center justify-center">
                        +{m.mesas_unidas?.length}
                      </span>
                    )}
                  </div>
                );
              })}

              {mesasVisiblesEnPlano.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-stone-400 text-sm font-medium">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  No hay mesas que coincidan con los filtros.
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredMesas.map(m => {
                const estilo = getEstadoStyle(m.estado);
                const isParent = (m.mesas_unidas?.length ?? 0) > 0;
                const isChild = !!m.parent_id;
                return (
                  <div
                    key={m.id_mesa}
                    onClick={() => setActiveMesaId(m.id_mesa)}
                    className={`relative group bg-white border rounded-xl p-3 shadow-xs hover:shadow-sm transition-all cursor-pointer ${
                      activeMesaId === m.id_mesa ? 'border-[#624A3E] ring-2 ring-[#624A3E]/15' : 'border-stone-200'
                    }`}
                  >
                    {editingMesaId === m.id_mesa ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editNumero}
                          onChange={e => setEditNumero(e.target.value)}
                          className="w-full text-xs p-1.5 border border-stone-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                        />
                        <div className="grid grid-cols-3 gap-1">
                          <select value={editSector} onChange={e => setEditSector(e.target.value as NonNullable<Mesa['sector']>)} className="text-[10px] p-1 border border-stone-300 rounded-lg">
                            <option value="comedor">Comedor</option>
                            <option value="salon">Salón</option>
                            <option value="terraza">Terraza</option>
                            <option value="vip">VIP</option>
                          </select>
                          <input type="number" min={1} value={editCapacidad} onChange={e => setEditCapacidad(parseInt(e.target.value) || 1)} className="text-[10px] p-1 border border-stone-300 rounded-lg" />
                          <select value={editForma} onChange={e => setEditForma(e.target.value as NonNullable<Mesa['forma']>)} className="text-[10px] p-1 border border-stone-300 rounded-lg">
                            <option value="redonda">Redonda</option>
                            <option value="rectangular">Rect.</option>
                          </select>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={handleSaveEdit} className="flex-1 min-h-8 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg cursor-pointer">Guardar</button>
                          <button onClick={() => setEditingMesaId(null)} className="min-h-8 py-1 px-2 bg-stone-200 text-stone-600 text-[10px] rounded-lg cursor-pointer">X</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${estilo.bg} ${estilo.color}`}>
                              <Sofa className="w-4 h-4" />
                            </div>
                            <div>
                              <strong className="text-sm font-black text-stone-800 block">{m.numero_mesa}</strong>
                              <span className="text-[10px] text-stone-500 font-semibold uppercase">{m.sector}</span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${estilo.bg} ${estilo.color} border ${estilo.border}`}>
                            {estilo.label}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-stone-600">
                            <Users className="w-3.5 h-3.5" />
                            <span className="font-semibold">{m.capacidad} pax</span>
                            {isParent && <span className="text-[9px] text-[#624A3E] font-bold ml-1">(+{m.mesas_unidas?.length})</span>}
                            {isChild && <span className="text-[9px] text-stone-400 font-bold ml-1">(unida)</span>}
                          </div>
                          {!isChild && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleLiberarMesa(m.id_mesa); }}
                                disabled={m.estado === 'libre' || busyMesaId === m.id_mesa}
                                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 cursor-pointer"
                              >
                                Liberar
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleToggleEstadoMesa(m.id_mesa); }}
                                disabled={busyMesaId === m.id_mesa}
                                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 disabled:opacity-40 cursor-pointer"
                              >
                                Cambiar
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="mt-2 flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStartEdit(m); }}
                            className="p-1.5 rounded-lg bg-stone-100 text-stone-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {isParent ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSepararMesas(m.id_mesa); }}
                              className="p-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer"
                              title="Separar mesas"
                            >
                              <Unlink className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <>
                              {deleteConfirmId === m.id_mesa ? (
                                <>
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteMesa(m.id_mesa); }} className="p-1.5 rounded-lg bg-red-500 text-white cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                                  <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} className="p-1.5 rounded-lg bg-stone-200 text-stone-600 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                                </>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(m.id_mesa); }}
                                  className="p-1.5 rounded-lg bg-stone-100 text-stone-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeMesa && !unionMode && (
            <div className="rounded-2xl border border-stone-200 bg-[#F5F1E9]/60 p-4 shadow-inner">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-stone-500">Mesa seleccionada</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-black text-stone-900">{activeMesa.numero_mesa}</h4>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${getEstadoStyle(activeMesa.estado).bg} ${getEstadoStyle(activeMesa.estado).border} ${getEstadoStyle(activeMesa.estado).color}`}>
                      {getEstadoStyle(activeMesa.estado).label}
                    </span>
                    <span className="text-xs font-semibold text-stone-500">{activeMesa.capacidad || 0} pax</span>
                    {busyMesaId === activeMesa.id_mesa && (
                      <span className="text-[10px] font-black uppercase text-amber-700">Guardando...</span>
                    )}
                  </div>
                  {activeMesa.estado === 'reservada' && (
                    <p className="mt-1 text-xs text-amber-800">
                      Reserva activa{activeMesa.reserva_cliente ? ` de ${activeMesa.reserva_cliente}` : ''}{activeMesa.reserva_hora ? ` a las ${activeMesa.reserva_hora}` : ''}.
                    </p>
                  )}
                  {activeMesa.parent_id && (
                    <p className="mt-1 text-xs text-stone-500">Esta mesa está unida a otra. Separala antes de editar su estado.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                  <button
                    onClick={() => handleLiberarMesa(activeMesa.id_mesa)}
                    disabled={activeMesa.estado === 'libre' || !!activeMesa.parent_id || busyMesaId === activeMesa.id_mesa}
                    className="min-h-10 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white shadow-sm transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Unlock className="mr-1 inline h-3.5 w-3.5" />
                    Liberar mesa
                  </button>
                  {ESTADOS.filter(e => e.key !== activeMesa.estado && e.key !== 'libre').map(e => (
                    <button
                      key={e.key}
                      onClick={() => handleSetEstadoMesa(activeMesa.id_mesa, e.key)}
                      disabled={!!activeMesa.parent_id || busyMesaId === activeMesa.id_mesa}
                      className={`min-h-10 rounded-xl border px-3 py-2 text-xs font-black transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 ${e.bg} ${e.border} ${e.color}`}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
