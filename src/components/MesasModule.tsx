import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Armchair,
  CalendarClock,
  Check,
  Clock3,
  CreditCard,
  Grid,
  MapPin,
  Plus,
  ReceiptText,
  Sparkles,
  Unlock,
  Users,
} from 'lucide-react';
import { useToast, ToastContainer } from './ToastContainer';
import { EventoLog, Mesa } from '../types';
import { mesasService } from '../services/mesasService';

interface MesasModuleProps {
  mesas: Mesa[];
  onMesasChange: (mesas: Mesa[]) => void;
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

type MesaEstado = Mesa['estado'];
type Sector = 'salon' | 'terraza' | 'vip';
type MesaMeta = Pick<Mesa, 'reserva_cliente' | 'reserva_hora' | 'ocupada_desde'>;
type MesaMetaById = Record<number, MesaMeta>;

const MESA_META_STORAGE_KEY = 'el_patron_mesas_meta_v1';

const STATE_COPY: Record<MesaEstado, {
  label: string;
  helper: string;
  badgeClass: string;
  cardClass: string;
  dotClass: string;
  icon: React.ReactNode;
}> = {
  libre: {
    label: 'Mesa Disponible',
    helper: 'Lista para recibir clientes.',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cardClass: 'border-emerald-200 bg-emerald-50/60 text-emerald-950 hover:border-emerald-400',
    dotClass: 'bg-emerald-500',
    icon: <Check className="w-4 h-4" />,
  },
  reservada: {
    label: 'Reservada',
    helper: 'Reserva confirmada para el turno.',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    cardClass: 'border-sky-200 bg-sky-50/70 text-sky-950 hover:border-sky-400',
    dotClass: 'bg-sky-500',
    icon: <CalendarClock className="w-4 h-4" />,
  },
  ocupada: {
    label: 'Ocupada',
    helper: 'Mesa con comensales activos.',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    cardClass: 'border-orange-200 bg-orange-50/70 text-orange-950 hover:border-orange-400',
    dotClass: 'bg-orange-500',
    icon: <Users className="w-4 h-4" />,
  },
  esperando_cuenta: {
    label: 'Cuenta Solicitada',
    helper: 'Pendiente de cobro o cierre de caja.',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    cardClass: 'border-purple-200 bg-purple-50/80 text-purple-950 hover:border-purple-400',
    dotClass: 'bg-purple-500',
    icon: <ReceiptText className="w-4 h-4" />,
  },
};

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const loadMesaMeta = (): MesaMetaById => {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(MESA_META_STORAGE_KEY);
    return raw ? JSON.parse(raw) as MesaMetaById : {};
  } catch {
    return {};
  }
};

const persistMesaMeta = (meta: MesaMetaById) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(MESA_META_STORAGE_KEY, JSON.stringify(meta));
};

const mergeMeta = (mesas: Mesa[], meta: MesaMetaById) => {
  return mesas.map(mesa => ({ ...mesa, ...(meta[mesa.id_mesa] ?? {}) }));
};

const clearMesaOperationalData = (mesa: Mesa): Mesa => ({
  ...mesa,
  estado: 'libre',
  comensales: undefined,
  reserva_cliente: undefined,
  reserva_hora: undefined,
  ocupada_desde: undefined,
});

const getSectorLabel = (mesa: Mesa) => {
  if (mesa.numero_mesa.toLowerCase().includes('vip')) return 'VIP';
  if (mesa.numero_mesa.toLowerCase().includes('terraza')) return 'Terraza';
  return 'Salón';
};

const getElapsedLabel = (mesa: Mesa) => {
  if (!mesa.ocupada_desde) return 'Turno activo';
  const elapsedMs = Date.now() - new Date(mesa.ocupada_desde).getTime();
  const minutes = Math.max(0, Math.floor(elapsedMs / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min`;
};

export default function MesasModule({ mesas, onMesasChange, addLog }: MesasModuleProps) {
  const { toast, toasts, removeToast } = useToast();
  const [mesaMeta, setMesaMeta] = useState<MesaMetaById>(() => loadMesaMeta());
  const [localMesas, setLocalMesas] = useState<Mesa[]>(() => mergeMeta(mesas, mesaMeta));
  const [selectedMesaId, setSelectedMesaId] = useState<number | null>(mesas[0]?.id_mesa ?? null);
  const [numeroMesa, setNumeroMesa] = useState('');
  const [sector, setSector] = useState<Sector>('salon');
  const [editEstado, setEditEstado] = useState<MesaEstado>('libre');
  const [editComensales, setEditComensales] = useState(2);
  const [editReservaCliente, setEditReservaCliente] = useState('');
  const [editReservaHora, setEditReservaHora] = useState('21:00');

  useEffect(() => {
    setLocalMesas(mergeMeta(mesas, mesaMeta));
  }, [mesas, mesaMeta]);

  const selectedMesa = useMemo(() => {
    return localMesas.find(mesa => mesa.id_mesa === selectedMesaId) ?? localMesas[0] ?? null;
  }, [localMesas, selectedMesaId]);

  useEffect(() => {
    if (!selectedMesa) return;
    setEditEstado(selectedMesa.estado);
    setEditComensales(selectedMesa.comensales ?? 2);
    setEditReservaCliente(selectedMesa.reserva_cliente ?? '');
    setEditReservaHora(selectedMesa.reserva_hora ?? '21:00');
  }, [selectedMesa]);

  const syncMesas = (nextMesas: Mesa[]) => {
    setLocalMesas(nextMesas);
    onMesasChange(nextMesas);
  };

  const saveMeta = (nextMesas: Mesa[]) => {
    const nextMeta = nextMesas.reduce<MesaMetaById>((acc, mesa) => {
      if (mesa.reserva_cliente || mesa.reserva_hora || mesa.ocupada_desde) {
        acc[mesa.id_mesa] = {
          reserva_cliente: mesa.reserva_cliente,
          reserva_hora: mesa.reserva_hora,
          ocupada_desde: mesa.ocupada_desde,
        };
      }
      return acc;
    }, {});

    setMesaMeta(nextMeta);
    persistMesaMeta(nextMeta);
  };

  const updateMesa = (mesaId: number, updater: (mesa: Mesa) => Mesa, logMessage: string) => {
    const next = localMesas.map(mesa => (mesa.id_mesa === mesaId ? updater(mesa) : mesa));
    syncMesas(next);
    saveMeta(next);

    const updatedMesa = next.find(mesa => mesa.id_mesa === mesaId);
    if (updatedMesa) {
      mesasService.update(mesaId, updatedMesa).catch(() => {
        toast.warning('El cambio quedó aplicado localmente, pero no pudo sincronizarse con Supabase.');
      });
    }

    addLog('sistema', logMessage);
  };

  const handleCreateMesa = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanNumero = numeroMesa.trim();
    if (!cleanNumero) return;

    const formattedName = sector === 'vip'
      ? `VIP-${cleanNumero}`
      : sector === 'terraza'
        ? `Terraza-${cleanNumero}`
        : `Mesa ${cleanNumero}`;

    if (localMesas.some(mesa => mesa.numero_mesa.toLowerCase() === formattedName.toLowerCase())) {
      toast.error('La mesa ya existe en el plano.');
      return;
    }

    const newMesa: Mesa = {
      id_mesa: Date.now() + Math.floor(Math.random() * 100),
      numero_mesa: formattedName,
      estado: 'libre',
    };

    const next = [...localMesas, newMesa];
    syncMesas(next);
    saveMeta(next);
    mesasService.create(newMesa).catch(() => {
      toast.warning('La mesa quedó disponible en esta sesión, pero no pudo sincronizarse.');
    });

    addLog('sistema', `MESAS: Se habilitó ${formattedName} en el sector ${sector.toUpperCase()}.`);
    toast.success(`${formattedName} agregada al plano.`);
    setNumeroMesa('');
    setSelectedMesaId(newMesa.id_mesa);
  };

  const applyEditorChanges = () => {
    if (!selectedMesa) return;

    updateMesa(selectedMesa.id_mesa, mesa => {
      if (editEstado === 'libre') return clearMesaOperationalData(mesa);

      if (editEstado === 'reservada') {
        return {
          ...mesa,
          estado: 'reservada',
          comensales: undefined,
          reserva_cliente: editReservaCliente.trim() || 'Cliente sin nombre',
          reserva_hora: editReservaHora,
          ocupada_desde: undefined,
        };
      }

      if (editEstado === 'ocupada') {
        return {
          ...mesa,
          estado: 'ocupada',
          comensales: Math.max(1, editComensales),
          reserva_cliente: undefined,
          reserva_hora: undefined,
          ocupada_desde: mesa.ocupada_desde ?? new Date().toISOString(),
        };
      }

      return {
        ...mesa,
        estado: 'esperando_cuenta',
        comensales: Math.max(1, editComensales),
      };
    }, `MESAS: ${selectedMesa.numero_mesa} cambió a ${STATE_COPY[editEstado].label}.`);

    toast.success(`${selectedMesa.numero_mesa}: cambios guardados.`);
  };

  const liberarMesa = (mesa: Mesa, manual = true) => {
    if (manual && !window.confirm(`¿Deseas liberar la ${mesa.numero_mesa} manualmente?`)) return;

    updateMesa(
      mesa.id_mesa,
      current => clearMesaOperationalData(current),
      manual
        ? `MESAS: ${mesa.numero_mesa} fue liberada manualmente.`
        : `CAJA: Pago recibido. ${mesa.numero_mesa} quedó libre automáticamente.`
    );

    toast.success(`${mesa.numero_mesa} quedó libre.`);
  };

  const solicitarCuenta = (mesa: Mesa) => {
    updateMesa(
      mesa.id_mesa,
      current => ({
        ...current,
        estado: 'esperando_cuenta',
        comensales: current.comensales ?? editComensales,
        ocupada_desde: current.ocupada_desde ?? new Date().toISOString(),
      }),
      `MESAS: ${mesa.numero_mesa} solicitó la cuenta.`
    );
    toast.info(`${mesa.numero_mesa}: cuenta solicitada.`);
  };

  const sentarReserva = (mesa: Mesa) => {
    updateMesa(
      mesa.id_mesa,
      current => ({
        ...current,
        estado: 'ocupada',
        comensales: Math.max(1, editComensales),
        reserva_cliente: undefined,
        reserva_hora: undefined,
        ocupada_desde: new Date().toISOString(),
      }),
      `MESAS: Reserva de ${mesa.numero_mesa} convertida en mesa ocupada.`
    );
    toast.success(`${mesa.numero_mesa}: reserva sentada.`);
  };

  const simulatePagoRecibido = (mesaId: number) => {
    const mesa = localMesas.find(item => item.id_mesa === mesaId);
    if (!mesa) return;
    liberarMesa(mesa, false);
  };

  const counts = useMemo(() => {
    return {
      total: localMesas.length,
      libre: localMesas.filter(mesa => mesa.estado === 'libre').length,
      reservada: localMesas.filter(mesa => mesa.estado === 'reservada').length,
      ocupada: localMesas.filter(mesa => mesa.estado === 'ocupada').length,
      esperando_cuenta: localMesas.filter(mesa => mesa.estado === 'esperando_cuenta').length,
    };
  }, [localMesas]);

  const occupancyRate = counts.total ? Math.round(((counts.ocupada + counts.esperando_cuenta) / counts.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          { label: 'Total de Mesas', value: `${counts.total}`, className: 'text-stone-950', icon: <Grid className="w-4 h-4" /> },
          { label: 'Disponibles', value: `${counts.libre}`, className: 'text-emerald-600', icon: <Check className="w-4 h-4" /> },
          { label: 'Reservadas', value: `${counts.reservada}`, className: 'text-sky-600', icon: <CalendarClock className="w-4 h-4" /> },
          { label: 'Ocupadas', value: `${counts.ocupada}`, className: 'text-orange-600', icon: <Users className="w-4 h-4" /> },
          { label: 'Cuenta solicitada', value: `${counts.esperando_cuenta}`, className: 'text-purple-600', icon: <ReceiptText className="w-4 h-4" /> },
        ].map(card => (
          <div key={card.label} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">{card.label}</span>
              <span className="text-stone-400">{card.icon}</span>
            </div>
            <h4 className={`text-2xl font-black font-mono mt-1 ${card.className}`}>{card.value}</h4>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <aside className="xl:col-span-4 space-y-4">
          <section className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#624A3E]" />
              Ampliar Salón
            </h3>
            <form onSubmit={handleCreateMesa} className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Número o código</label>
                <input
                  type="text"
                  value={numeroMesa}
                  onChange={event => setNumeroMesa(event.target.value)}
                  placeholder="Ej. 14, B-3, terraza-6"
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-[#624A3E]/20 focus:border-[#624A3E]"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Sector</label>
                <select
                  value={sector}
                  onChange={event => setSector(event.target.value as Sector)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-[#624A3E]/20 focus:border-[#624A3E] cursor-pointer text-stone-700 font-semibold"
                >
                  <option value="salon">Salón Comedor</option>
                  <option value="terraza">Terraza</option>
                  <option value="vip">Sector VIP</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-[#624A3E] hover:bg-[#503C32] active:scale-95 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer"
              >
                Habilitar Mesa en Plano
              </button>
            </form>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight">Panel de Mesa</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Edita estado, reserva y liberación manual desde un solo lugar.
                </p>
              </div>
              {selectedMesa && (
                <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${STATE_COPY[selectedMesa.estado].badgeClass}`}>
                  {STATE_COPY[selectedMesa.estado].label}
                </span>
              )}
            </div>

            {selectedMesa ? (
              <div className="space-y-4">
                <div className="rounded-2xl bg-stone-50 border border-stone-100 p-4">
                  <p className="text-[10px] uppercase tracking-wider font-black text-stone-400">{getSectorLabel(selectedMesa)}</p>
                  <h4 className="text-xl font-black text-stone-950 mt-1">{selectedMesa.numero_mesa}</h4>
                  <p className="text-xs text-stone-500 mt-1">{STATE_COPY[selectedMesa.estado].helper}</p>
                </div>

                <div>
                  <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Estado manual</label>
                  <select
                    value={editEstado}
                    onChange={event => setEditEstado(event.target.value as MesaEstado)}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#624A3E]/20 focus:border-[#624A3E] font-semibold text-stone-700"
                  >
                    <option value="libre">Mesa Disponible</option>
                    <option value="reservada">Reservada</option>
                    <option value="ocupada">Ocupada</option>
                    <option value="esperando_cuenta">Cuenta Solicitada</option>
                  </select>
                </div>

                {editEstado === 'reservada' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Cliente</label>
                      <input
                        value={editReservaCliente}
                        onChange={event => setEditReservaCliente(event.target.value)}
                        placeholder="Nombre del cliente"
                        className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Hora</label>
                      <input
                        type="time"
                        value={editReservaHora}
                        onChange={event => setEditReservaHora(event.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400"
                      />
                    </div>
                  </div>
                )}

                {(editEstado === 'ocupada' || editEstado === 'esperando_cuenta') && (
                  <div>
                    <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Comensales</label>
                    <input
                      type="number"
                      min={1}
                      value={editComensales}
                      onChange={event => setEditComensales(Number(event.target.value) || 1)}
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={applyEditorChanges}
                    className="py-2.5 rounded-xl bg-[#624A3E] text-white text-xs font-black hover:bg-[#503C32] active:scale-95 transition-all"
                  >
                    Guardar Cambios
                  </button>
                  <button
                    type="button"
                    onClick={() => liberarMesa(selectedMesa)}
                    className="py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-black hover:bg-emerald-100 active:scale-95 transition-all"
                  >
                    Liberar Mesa
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => solicitarCuenta(selectedMesa)}
                    disabled={selectedMesa.estado === 'libre'}
                    className="py-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 text-xs font-black hover:bg-purple-100 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Marcar Cuenta Solicitada
                  </button>
                  <button
                    type="button"
                    onClick={() => simulatePagoRecibido(selectedMesa.id_mesa)}
                    disabled={selectedMesa.estado === 'libre'}
                    className="py-2.5 rounded-xl bg-stone-900 text-white text-xs font-black hover:bg-stone-800 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Simular Pago Recibido
                  </button>
                </div>

                {selectedMesa.estado === 'reservada' && (
                  <button
                    type="button"
                    onClick={() => sentarReserva(selectedMesa)}
                    className="w-full py-2.5 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 text-xs font-black hover:bg-sky-100 active:scale-95 transition-all"
                  >
                    Sentar Reserva
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-stone-200 p-6 text-center text-sm text-stone-500">
                Selecciona una mesa para editarla.
              </div>
            )}
          </section>
        </aside>

        <section className="xl:col-span-8 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pb-2 border-b border-stone-100">
            <div>
              <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
                <Grid className="w-5 h-5 text-[#624A3E]" />
                Plano de Distribución de Mesas
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Vista operativa del salón con estados en tiempo real y acciones rápidas.
              </p>
            </div>
            <span className="text-[10px] bg-stone-100 text-stone-600 font-black px-3 py-1 rounded-full">
              Ocupación {occupancyRate}%
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-3">
            {localMesas.map(mesa => {
              const state = STATE_COPY[mesa.estado];
              const isSelected = mesa.id_mesa === selectedMesa?.id_mesa;

              return (
                <button
                  key={mesa.id_mesa}
                  type="button"
                  onClick={() => setSelectedMesaId(mesa.id_mesa)}
                  className={`group min-h-44 rounded-3xl border p-4 text-left transition-all active:scale-[0.98] ${state.cardClass} ${
                    isSelected ? 'ring-4 ring-[#624A3E]/15 border-[#624A3E]/50 shadow-lg shadow-stone-900/5' : 'shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] font-black opacity-60">{getSectorLabel(mesa)}</p>
                      <h4 className="text-lg font-black text-stone-950 mt-1">{mesa.numero_mesa}</h4>
                    </div>
                    <span className={`w-3 h-3 rounded-full ${state.dotClass} shadow-sm`} />
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white/80 border border-white shadow-sm flex items-center justify-center text-current">
                      <Armchair className="w-5 h-5" />
                    </div>
                    <div>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black ${state.badgeClass}`}>
                        {state.icon}
                        {state.label}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2 text-xs">
                    {mesa.estado === 'reservada' && (
                      <>
                        <p className="flex items-center gap-2 font-bold text-sky-950">
                          <CalendarClock className="w-3.5 h-3.5" />
                          {mesa.reserva_cliente || 'Cliente reservado'}
                        </p>
                        <p className="flex items-center gap-2 text-sky-700">
                          <Clock3 className="w-3.5 h-3.5" />
                          {mesa.reserva_hora || 'Hora por confirmar'}
                        </p>
                      </>
                    )}

                    {mesa.estado === 'ocupada' && (
                      <>
                        <p className="flex items-center gap-2 font-bold">
                          <Users className="w-3.5 h-3.5" />
                          {mesa.comensales ?? 2} comensales
                        </p>
                        <p className="flex items-center gap-2 text-orange-700">
                          <Clock3 className="w-3.5 h-3.5" />
                          {getElapsedLabel(mesa)}
                        </p>
                      </>
                    )}

                    {mesa.estado === 'esperando_cuenta' && (
                      <>
                        <p className="flex items-center gap-2 font-bold">
                          <ReceiptText className="w-3.5 h-3.5" />
                          Cuenta solicitada
                        </p>
                        <p className="flex items-center gap-2 text-purple-700">
                          <CreditCard className="w-3.5 h-3.5" />
                          Esperando pago
                        </p>
                      </>
                    )}

                    {mesa.estado === 'libre' && (
                      <p className="flex items-center gap-2 text-emerald-700 font-bold">
                        <Sparkles className="w-3.5 h-3.5" />
                        Mesa disponible para asignar
                      </p>
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <span className="rounded-xl bg-white/70 border border-white/80 px-2 py-1.5 text-[10px] font-black text-center">
                      Editar
                    </span>
                    <span className="rounded-xl bg-white/70 border border-white/80 px-2 py-1.5 text-[10px] font-black text-center">
                      Acciones
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-xs font-black text-stone-800">Simulación de sincronización con caja</p>
              <p className="text-xs text-stone-500 mt-1">
                Al presionar “Simular Pago Recibido”, se ejecuta <code className="font-mono">simulatePagoRecibido(mesaId)</code>:
                la mesa pasa automáticamente a “Mesa Disponible” y se limpian comensales, reserva y tiempo de ocupación.
              </p>
            </div>
          </div>
        </section>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
