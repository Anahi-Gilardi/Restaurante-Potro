import React, { useEffect, useMemo, useState } from 'react';
import { useToast, ToastContainer } from './ToastContainer';
import { X, Plus, Calendar, Pencil, Trash, Sparkles } from 'lucide-react';
import { Mesa, Reserva } from '../types';
import { argentinaDateIso } from '../lib/argentinaDate';
import { mesasService } from '../services/mesasService';
import { reservasService } from '../services/reservasService';
import MesaAsistente, { sugerirAlojamiento, resumenSalon, procesarComando } from './MesaAsistente';

interface MesasProto1Props {
  mesas: Mesa[];
  onMesasChange: (mesas: Mesa[]) => void;
  addLog?: (tipo: 'sistema' | 'reserva' | 'mesa' | 'pedido_creado' | 'descuento_stock' | 'alerta_stock' | 'comanda_estado' | 'merma_registrada', mensaje: string) => void;
}

function formatDate(d: Date): string {
  return argentinaDateIso(d);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type Zona = 'comedor' | 'salon';

interface MesaPosicion {
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
}

interface MesaVisual {
  id: string;
  id_mesa: number;
  numero_mesa: string;
  capacidad: number;
  zona: Zona;
  posicion: MesaPosicion;
  estado: Mesa['estado'];
  comensales?: number;
  id_pedido?: number;
  mesas_unidas?: number[];
  parent_id?: number | null;
}

const POSICIONES_INICIALES: MesaVisual[] = [
  // ZONA ALTA: mesas 1-6 modulares de 2 pax
  { id: 'mesa-2-alta-1', id_mesa: 1, numero_mesa: '1', capacidad: 2, zona: 'comedor', posicion: { x: 135, y: 50, width: 60, height: 42, rx: 6 }, estado: 'libre' },
  { id: 'mesa-2-alta-2', id_mesa: 2, numero_mesa: '2', capacidad: 2, zona: 'comedor', posicion: { x: 210, y: 50, width: 60, height: 42, rx: 6 }, estado: 'libre' },
  { id: 'mesa-2-alta-3', id_mesa: 3, numero_mesa: '3', capacidad: 2, zona: 'comedor', posicion: { x: 285, y: 50, width: 60, height: 42, rx: 6 }, estado: 'libre' },
  { id: 'mesa-2-alta-4', id_mesa: 4, numero_mesa: '4', capacidad: 2, zona: 'comedor', posicion: { x: 360, y: 50, width: 60, height: 42, rx: 6 }, estado: 'libre' },
  { id: 'mesa-2-alta-5', id_mesa: 5, numero_mesa: '5', capacidad: 2, zona: 'comedor', posicion: { x: 135, y: 110, width: 60, height: 42, rx: 6 }, estado: 'libre' },
  { id: 'mesa-2-alta-6', id_mesa: 6, numero_mesa: '6', capacidad: 2, zona: 'comedor', posicion: { x: 210, y: 110, width: 60, height: 42, rx: 6 }, estado: 'libre' },

  // ZONA CENTRAL/BAJA: mesas redondas familiares 7-11
  { id: 'mesa-5-central-7',  id_mesa: 7, numero_mesa: '7',  capacidad: 5, zona: 'salon', posicion: { x: 200, y: 320, width: 58, height: 52, rx: 6 }, estado: 'libre' },
  { id: 'mesa-5-central-8',  id_mesa: 8, numero_mesa: '8',  capacidad: 5, zona: 'salon', posicion: { x: 130, y: 380, width: 58, height: 52, rx: 6 }, estado: 'libre' },
  { id: 'mesa-5-central-9',  id_mesa: 9, numero_mesa: '9',  capacidad: 5, zona: 'salon', posicion: { x: 270, y: 380, width: 58, height: 52, rx: 6 }, estado: 'libre' },
  { id: 'mesa-5-central-10', id_mesa: 10, numero_mesa: '10', capacidad: 5, zona: 'salon', posicion: { x: 130, y: 460, width: 58, height: 52, rx: 6 }, estado: 'libre' },
  { id: 'mesa-5-central-11', id_mesa: 11, numero_mesa: '11', capacidad: 5, zona: 'salon', posicion: { x: 270, y: 460, width: 58, height: 52, rx: 6 }, estado: 'libre' },

  // SECTOR VIP: mesa 12 para eventos
  { id: 'mesa-10-vip-12', id_mesa: 12, numero_mesa: '12', capacidad: 10, zona: 'salon', posicion: { x: 105, y: 540, width: 130, height: 62, rx: 8 }, estado: 'libre' },
];

const ESTADO_FILL: Record<Mesa['estado'], string> = {
  libre: '#ECFDF5', // emerald-50
  ocupada: '#FEF2F2', // red-50
  reservada: '#FFFBEB', // amber-50
  esperando_cuenta: '#EEF2FF', // indigo-50
  limpiando: '#FAFAF9', // stone-50
  unida: '#F3F4F6', // gray-100
  sucia: '#FAFAF9', // stone-50
};

const ESTADO_STROKE: Record<Mesa['estado'], string> = {
  libre: '#10B981', // emerald-500
  ocupada: '#EF4444', // red-500
  reservada: '#F59E0B', // amber-500
  esperando_cuenta: '#6366F1', // indigo-500
  limpiando: '#78716C', // stone-500
  unida: '#9CA3AF', // gray-400
  sucia: '#78716C', // stone-500
};

const ESTADO_TEXT: Record<Mesa['estado'], string> = {
  libre: '#065F46', // emerald-800
  ocupada: '#991B1B', // red-800
  reservada: '#92400E', // amber-800
  esperando_cuenta: '#3730A3', // indigo-800
  limpiando: '#44403C', // stone-800
  unida: '#374151', // gray-800
  sucia: '#44403C', // stone-800
};

function generarIdMesa(numero: string, capacidad: number, zona: Zona): string {
  return `mesa-${capacidad}-${zona}-${numero}`;
}

function parseNumeroMesa(valor: string): string {
  return valor.replace(/\D/g, '').trim();
}

function siguienteNumeroDisponible(mesas: MesaVisual[]): string {
  const numeros = mesas.map(m => parseInt(m.numero_mesa) || 0).filter(n => n > 0);
  let n = 1;
  while (numeros.includes(n)) n++;
  return String(n);
}

function generarPosicionNuevaMesa(zona: Zona, mesas: MesaVisual[]): MesaPosicion {
  const baseY = zona === 'comedor' ? 90 : 355;
  const mesasZona = mesas.filter(m => m.zona === zona);
  const idx = mesasZona.length;
  const cols = 2;
  const col = idx % cols;
  const row = Math.floor(idx / cols);
  const baseX = zona === 'comedor' ? 135 + col * 110 : 120 + col * 110;
  return { x: baseX, y: baseY + row * 70, width: 64, height: 52, rx: 6 };
}

function renderSillas(mesa: MesaVisual): React.ReactNode[] {
  const { x, y, width, height } = mesa.posicion;
  const capacidad = mesa.capacidad;
  const sillas: React.ReactNode[] = [];
  const radio = 7;
  const pasoX = width / (Math.min(capacidad, 4) + 1);

  const arriba = Math.min(capacidad, 4);
  for (let i = 1; i <= arriba; i++) {
    sillas.push(
      <circle key={`top-${i}`} cx={x + pasoX * i} cy={y - 12} r={radio} fill="#374151" opacity="0.65" pointerEvents="none" />
    );
  }
  const abajo = Math.max(0, capacidad - 4);
  for (let i = 1; i <= abajo; i++) {
    sillas.push(
      <circle key={`bottom-${i}`} cx={x + pasoX * i} cy={y + height + 12} r={radio} fill="#374151" opacity="0.65" pointerEvents="none" />
    );
  }
  return sillas;
}

export default function MesasProto1({ mesas, onMesasChange, addLog = () => {} }: MesasProto1Props) {
  const { toast, toasts, removeToast } = useToast();
  const [visualMesas, setVisualMesas] = useState<MesaVisual[]>(POSICIONES_INICIALES);
  const [reservasHoy, setReservasHoy] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);

  // Pestañas del panel lateral derecho
  const [rightPanelTab, setRightPanelTab] = useState<'asistente' | 'gestion'>('asistente');

  // Mesas resaltadas/hovered por sugerencias del asistente
  const [highlightedMesas, setHighlightedMesas] = useState<number[]>([]);

  // Modal reserva
  const [selectedMesa, setSelectedMesa] = useState<MesaVisual | null>(null);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [pax, setPax] = useState('2');
  const [hora, setHora] = useState('21:00');
  const [fecha, setFecha] = useState(formatDate(new Date()));
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);

  // Modo unir mesas
  const [unionMode, setUnionMode] = useState(false);
  const [selectedForUnion, setSelectedForUnion] = useState<MesaVisual[]>([]);

  // Modo editor de posiciones
  const [editorMode, setEditorMode] = useState(false);
  const [draggingMesa, setDraggingMesa] = useState<MesaVisual | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  // Formulario agregar/editar mesa
  const [showMesaForm, setShowMesaForm] = useState(false);
  const [editingMesa, setEditingMesa] = useState<MesaVisual | null>(null);
  const [nuevoNumero, setNuevoNumero] = useState('');
  const [nuevaCapacidad, setNuevaCapacidad] = useState('4');
  const [nuevaZona, setNuevaZona] = useState<Zona>('comedor');

  const updatePosition = (clientX: number, clientY: number) => {
    if (!editorMode || !draggingMesa || !svgRef.current) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    const width = draggingMesa.posicion.width;
    const height = draggingMesa.posicion.height;

    const rawX = svgP.x - width / 2;
    const rawY = svgP.y - height / 2;
    const snapX = Math.round(rawX / 10) * 10;
    const snapY = Math.round(rawY / 10) * 10;

    const newX = Math.max(15, Math.min(430 - width - 15, snapX));
    const newY = Math.max(15, Math.min(620 - height - 15, snapY));

    setVisualMesas(prev => prev.map(m => m.id_mesa === draggingMesa.id_mesa
      ? { ...m, posicion: { ...m.posicion, x: newX, y: newY } }
      : m
    ));
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    updatePosition(e.clientX, e.clientY);
  };

  const handleSvgTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    const touch = e.touches[0];
    if (touch) {
      updatePosition(touch.clientX, touch.clientY);
    }
  };

  const handleSvgMouseUp = async () => {
    if (!editorMode || !draggingMesa) {
      setDraggingMesa(null);
      return;
    }
    const mesaActualizada = visualMesas.find(m => m.id_mesa === draggingMesa.id_mesa);
    if (mesaActualizada) {
      try {
        await mesasService.update(mesaActualizada.id_mesa, {
          x: Math.round(mesaActualizada.posicion.x),
          y: Math.round(mesaActualizada.posicion.y),
          width: mesaActualizada.posicion.width,
          height: mesaActualizada.posicion.height,
        });
        addLog('mesa', `Mesa ${mesaActualizada.numero_mesa} reposicionada a x:${Math.round(mesaActualizada.posicion.x)}, y:${Math.round(mesaActualizada.posicion.y)}`);
      } catch (err: any) {
        toast.error(err.message || 'Error guardando posición');
      }
    }
    setDraggingMesa(null);
  };

  const startDrag = (m: MesaVisual, e: React.MouseEvent | React.TouchEvent) => {
    if (!editorMode) return;
    e.stopPropagation();
    setDraggingMesa(m);
  };

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

        if (mData.length > 0) {
          const merged = mData.map(m => {
            const existente = POSICIONES_INICIALES.find(p => p.id_mesa === m.id_mesa);
            const zona = (m.zona as Zona) || 'salon';
            const posicion = (m.x != null && m.y != null)
              ? { x: m.x, y: m.y, width: m.width || 64, height: m.height || 52, rx: m.rx || 6 }
              : (existente?.posicion || generarPosicionNuevaMesa(zona, POSICIONES_INICIALES));
            return {
              id: generarIdMesa(m.numero_mesa, m.capacidad || 4, zona),
              id_mesa: m.id_mesa,
              numero_mesa: m.numero_mesa,
              capacidad: m.capacidad || 4,
              zona,
              posicion,
              estado: m.estado,
              mesas_unidas: m.mesas_unidas,
              parent_id: m.parent_id,
            };
          });
          setVisualMesas(merged);
        } else {
          setVisualMesas(POSICIONES_INICIALES);
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
        setVisualMesas(prev => prev.map(m => m.id_mesa === payload.new.id_mesa ? { ...m, estado: payload.new.estado, mesas_unidas: payload.new.mesas_unidas, parent_id: payload.new.parent_id } : m));
      } else if (payload.eventType === 'INSERT' && payload.new) {
        const m = payload.new as Mesa;
        const zona = (m.zona as Zona) || 'salon';
        setVisualMesas(prevVisual => {
          const posicion = (m.x != null && m.y != null)
            ? { x: m.x, y: m.y, width: m.width || 64, height: m.height || 52, rx: m.rx || 6 }
            : generarPosicionNuevaMesa(zona, prevVisual);
          return [...prevVisual, {
            id: generarIdMesa(m.numero_mesa, m.capacidad || 4, zona),
            id_mesa: m.id_mesa,
            numero_mesa: m.numero_mesa,
            capacidad: m.capacidad || 4,
            zona,
            posicion,
            estado: m.estado,
            mesas_unidas: m.mesas_unidas,
            parent_id: m.parent_id,
          }];
        });
      } else if (payload.eventType === 'DELETE' && payload.old) {
        setVisualMesas(prev => prev.filter(m => m.id_mesa !== payload.old.id_mesa));
      }
    });
    return () => {
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    onMesasChange(visualMesas.map(m => ({
      id_mesa: m.id_mesa,
      numero_mesa: m.numero_mesa,
      capacidad: m.capacidad,
      zona: m.zona,
      estado: m.estado,
      x: m.posicion.x,
      y: m.posicion.y,
      width: m.posicion.width,
      height: m.posicion.height,
      rx: m.posicion.rx,
      mesas_unidas: m.mesas_unidas,
      parent_id: m.parent_id,
    })));
  }, [visualMesas, onMesasChange]);

  const openModal = (mesa: MesaVisual) => {
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

  const toggleUnionSelection = (mesa: MesaVisual) => {
    setSelectedForUnion(prev => {
      const exists = prev.some(m => m.id_mesa === mesa.id_mesa);
      if (exists) return prev.filter(m => m.id_mesa !== mesa.id_mesa);
      if (prev.length >= 2) return prev;
      return [...prev, mesa];
    });
  };

  const handleUnirMesas = async () => {
    if (selectedForUnion.length !== 2) return;
    const [m1, m2] = selectedForUnion;
    const capacidadUnida = (m1.capacidad || 0) + (m2.capacidad || 0);
    const mesaUnida: Partial<Mesa> = {
      numero_mesa: `${m1.numero_mesa} + ${m2.numero_mesa}`,
      capacidad: capacidadUnida,
      zona: m1.zona,
      estado: 'ocupada',
      mesas_unidas: [m1.id_mesa, m2.id_mesa],
    };

    try {
      await mesasService.update(m1.id_mesa, mesaUnida);
      await mesasService.update(m2.id_mesa, { parent_id: m1.id_mesa, estado: 'unida' });
      setVisualMesas(prev => prev.map(m => {
        if (m.id_mesa === m1.id_mesa) return { ...m, ...mesaUnida, zona: m1.zona, estado: 'ocupada' } as MesaVisual;
        if (m.id_mesa === m2.id_mesa) return { ...m, parent_id: m1.id_mesa, estado: 'unida' };
        return m;
      }));
      setSelectedForUnion([]);
      setUnionMode(false);
      addLog('mesa', `${m1.numero_mesa} unida con ${m2.numero_mesa} (ambas pasan a Ocupadas con mismo pedido)`);
      toast.success('Mesas unidas y marcadas como Ocupadas');
    } catch (err: any) {
      toast.error(err.message || 'Error al unir mesas');
    }
  };

  const handleAccionAsistente = async (accion: any) => {
    try {
      if (accion.accion === 'cambio_estado' && accion.mesa_id) {
        const ids = Array.isArray(accion.mesa_id) ? accion.mesa_id : [accion.mesa_id];
        const nuevoEstado = accion.nuevo_estado === 'Ocupada' ? 'ocupada' : accion.nuevo_estado === 'Reservada' ? 'reservada' : accion.nuevo_estado === 'Libre' ? 'libre' : 'sucia';
        for (const id of ids) {
          const mesa = visualMesas.find(m => m.id_mesa === id);
          if (!mesa) continue;
          if (nuevoEstado === 'ocupada' && mesa.estado !== 'libre' && mesa.estado !== 'reservada') {
            toast.error(`La Mesa ${mesa.numero_mesa} no está disponible (estado: ${mesa.estado})`);
            continue;
          }
          await mesasService.update(id, { estado: nuevoEstado, comensales: accion.comensales || mesa.comensales });
          setVisualMesas(prev => prev.map(m => m.id_mesa === id ? { ...m, estado: nuevoEstado, comensales: accion.comensales || m.comensales } : m));
        }
        addLog('mesa', `Asistente: ${accion.mensaje}`);
        toast.success(accion.mensaje);
      } else if (accion.accion === 'combinar_mesas' && Array.isArray(accion.mesa_id)) {
        const [id1, id2] = accion.mesa_id;
        const m1 = visualMesas.find(m => m.id_mesa === id1);
        const m2 = visualMesas.find(m => m.id_mesa === id2);
        if (m1 && m2) {
          setSelectedForUnion([m1, m2]);
          await handleUnirMesas();
        }
      } else if (accion.accion === 'resumen_salon') {
        toast.info(accion.mensaje);
      } else if (accion.accion === 'error') {
        toast.error(accion.mensaje);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error aplicando acción del asistente');
    }
  };

  const handleSepararMesas = async () => {
    if (!selectedMesa) return;
    const original = POSICIONES_INICIALES.find(p => p.id_mesa === selectedMesa.id_mesa);
    try {
      await mesasService.update(selectedMesa.id_mesa, {
        capacidad: original?.capacidad || selectedMesa.capacidad,
        mesas_unidas: [],
        numero_mesa: original?.numero_mesa || selectedMesa.numero_mesa,
        estado: 'libre',
      });
      if (selectedMesa.mesas_unidas) {
        for (const idHija of selectedMesa.mesas_unidas) {
          if (idHija === selectedMesa.id_mesa) continue;
          await mesasService.update(idHija, { parent_id: null, estado: 'libre' });
        }
      }
      setVisualMesas(prev => prev.map(m => {
        if (m.id_mesa === selectedMesa.id_mesa) {
          return { ...m, capacidad: original?.capacidad || m.capacidad, mesas_unidas: [], numero_mesa: original?.numero_mesa || m.numero_mesa, estado: 'libre' };
        }
        if (selectedMesa.mesas_unidas?.includes(m.id_mesa)) {
          return { ...m, parent_id: null, estado: 'libre' };
        }
        return m;
      }));
      addLog('mesa', `Mesas separadas: ${selectedMesa.numero_mesa}`);
      toast.success('Mesas separadas');
      closeModal();
    } catch (err: any) {
      toast.error(err.message || 'Error al separar mesas');
    }
  };

  const openEditMesa = (mesa: MesaVisual, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingMesa(mesa);
    setNuevoNumero(mesa.numero_mesa);
    setNuevaCapacidad(String(mesa.capacidad || 4));
    setNuevaZona(mesa.zona);
    setShowMesaForm(true);
  };

  const resetMesaForm = () => {
    setEditingMesa(null);
    setNuevoNumero(siguienteNumeroDisponible(visualMesas));
    setNuevaCapacidad('4');
    setNuevaZona('comedor');
    setShowMesaForm(false);
  };

  const handleSaveMesa = async (e: React.FormEvent) => {
    e.preventDefault();
    const numeroRaw = parseNumeroMesa(nuevoNumero);
    if (!numeroRaw) {
      toast.error('El número de mesa es obligatorio (solo números)');
      return;
    }

    const numeroExistente = visualMesas.some(m => m.numero_mesa === numeroRaw && m.id_mesa !== editingMesa?.id_mesa);
    if (numeroExistente) {
      const sugerido = siguienteNumeroDisponible(visualMesas);
      toast.error(`Ya existe la Mesa ${numeroRaw}. Siguiente disponible: Mesa ${sugerido}`);
      return;
    }

    const capacidad = parseInt(nuevaCapacidad) || 1;

    try {
      if (editingMesa) {
        const updated: Partial<Mesa> = {
          numero_mesa: numeroRaw,
          capacidad,
          zona: nuevaZona,
        };
        await mesasService.update(editingMesa.id_mesa, updated);
        setVisualMesas(prev => prev.map(m => m.id_mesa === editingMesa.id_mesa
          ? { ...m, id: generarIdMesa(numeroRaw, capacidad, nuevaZona), numero_mesa: numeroRaw, capacidad, zona: nuevaZona }
          : m
        ));
        addLog('mesa', `Mesa renombrada a ${numeroRaw}`);
        toast.success('Mesa actualizada');
      } else {
        const posicion = generarPosicionNuevaMesa(nuevaZona, visualMesas);
        const newMesa: Mesa = {
          id_mesa: Math.max(1, ...visualMesas.map(m => m.id_mesa)) + 1,
          numero_mesa: numeroRaw,
          capacidad,
          zona: nuevaZona,
          estado: 'libre',
        };
        const saved = await mesasService.create(newMesa);
        setVisualMesas(prev => [...prev, {
          id: generarIdMesa(saved.numero_mesa, saved.capacidad || capacidad, nuevaZona),
          id_mesa: saved.id_mesa,
          numero_mesa: saved.numero_mesa,
          capacidad: saved.capacidad || capacidad,
          zona: nuevaZona,
          posicion,
          estado: saved.estado,
        }]);
        addLog('mesa', `Nueva mesa agregada: ${numeroRaw}`);
        toast.success('Mesa agregada');
      }
      resetMesaForm();
    } catch (err: any) {
      toast.error(err.message || 'Error guardando mesa');
    }
  };

  const handleDeleteMesa = async (mesa: MesaVisual, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm(`¿Eliminar Mesa ${mesa.numero_mesa}?`)) return;
    try {
      await mesasService.remove(mesa.id_mesa);
      setVisualMesas(prev => prev.filter(m => m.id_mesa !== mesa.id_mesa));
      addLog('mesa', `Mesa eliminada: ${mesa.numero_mesa}`);
      toast.success('Mesa eliminada');
    } catch (err: any) {
      toast.error(err.message || 'Error eliminando mesa');
    }
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
        addLog('reserva', `Reserva actualizada en Mesa ${selectedMesa.numero_mesa}`);
        toast.success('Reserva actualizada');
      } else {
        const newRes: Reserva = {
          id_reserva: `r_${Date.now()}`,
          ...payload as Reserva,
        };
        await reservasService.create(newRes);
        await mesasService.update(selectedMesa.id_mesa, { estado: 'reservada' });
        addLog('reserva', `Nueva reserva en Mesa ${selectedMesa.numero_mesa}`);
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
      await mesasService.update(selectedMesa.id_mesa, { estado: 'sucia', comensales: 0, reserva_cliente: undefined, reserva_hora: undefined });
      const reservaExistente = reservasHoy.find(r => r.id_mesa === selectedMesa.id_mesa && (r.estado === 'confirmada' || r.estado === 'sentada'));
      if (reservaExistente) {
        await reservasService.update(reservaExistente.id_reserva, { estado: 'completada' });
      }
      setVisualMesas(prev => prev.map(m => m.id_mesa === selectedMesa.id_mesa ? { ...m, estado: 'sucia' } : m));
      const updated = reservasService.listByFecha ? await reservasService.listByFecha(today) : await reservasService.list();
      setReservasHoy((updated || []).filter((r: Reserva) =>
        (r.fecha === today || !r.fecha) && r.estado !== 'cancelada' && !r.lista_espera
      ));
      addLog('mesa', `${selectedMesa.numero_mesa} liberada y marcada como Sucia/En Limpieza`);
      toast.success('Mesa liberada - pendiente de limpieza');
      closeModal();
    } catch (err: any) {
      toast.error(err.message || 'Error al liberar');
    }
  };

  const handleLimpiarMesa = async () => {
    if (!selectedMesa) return;
    try {
      await mesasService.update(selectedMesa.id_mesa, { estado: 'libre', comensales: 0 });
      setVisualMesas(prev => prev.map(m => m.id_mesa === selectedMesa.id_mesa ? { ...m, estado: 'libre' } : m));
      addLog('mesa', `${selectedMesa.numero_mesa} limpiada y lista`);
      toast.success('Mesa limpiada');
      closeModal();
    } catch (err: any) {
      toast.error(err.message || 'Error al limpiar');
    }
  };

  // Mapeo dinámico de mesas a MesaEstado para MesaAsistente
  const mesasNormalizadasForAsistente = useMemo(() => {
    return visualMesas.map(m => ({
      id_mesa: m.id_mesa,
      numero_mesa: m.numero_mesa,
      capacidad: m.capacidad,
      zona: (m.zona === 'comedor' ? 'alta' : m.zona === 'salon' ? 'central' : 'vip') as 'alta' | 'central' | 'vip',
      estado: (m.estado === 'ocupada' ? 'Ocupada' : m.estado === 'reservada' ? 'Reservada' : m.estado === 'sucia' ? 'Sucia/En Limpieza' : 'Libre') as any,
      comensales: m.comensales,
      id_pedido: m.id_pedido,
      mesas_unidas: m.mesas_unidas
    }));
  }, [visualMesas]);

  const renderSvg = () => {
    const unionConnectionLines = visualMesas
      .filter(m => m.parent_id != null)
      .map(child => {
        const parent = visualMesas.find(p => p.id_mesa === child.parent_id);
        if (!parent) return null;
        const cx1 = child.posicion.x + child.posicion.width / 2;
        const cy1 = child.posicion.y + child.posicion.height / 2;
        const cx2 = parent.posicion.x + parent.posicion.width / 2;
        const cy2 = parent.posicion.y + parent.posicion.height / 2;
        return (
          <line
            key={`link-${child.id_mesa}-${parent.id_mesa}`}
            x1={cx1} y1={cy1} x2={cx2} y2={cy2}
            stroke="#4A5568" strokeWidth={3} strokeDasharray="5,4"
            pointerEvents="none" opacity="0.85"
          />
        );
      });

    const mesaElements = visualMesas.map(m => {
      const reserva = reservasHoy.find(r => r.id_mesa === m.id_mesa && r.estado === 'confirmada');
      const isSelected = unionMode && selectedForUnion.some(s => s.id_mesa === m.id_mesa);
      const isHighlighted = highlightedMesas.includes(m.id_mesa);

      const fill = isHighlighted ? '#DBEAFE' : ESTADO_FILL[m.estado];
      const stroke = isHighlighted ? '#2563EB' : (isSelected ? '#3B82F6' : ESTADO_STROKE[m.estado]);
      const textColor = isHighlighted ? '#1E40AF' : ESTADO_TEXT[m.estado];
      const { x, y, width, height, rx } = m.posicion;

      return (
        <g key={m.id} data-mesa-id={m.id}
           className={`transition-all duration-300 ${editorMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:opacity-90'}`}
           onClick={(e: React.MouseEvent) => {
             e.stopPropagation();
             if (editorMode || draggingMesa) return;
             if (unionMode) toggleUnionSelection(m);
             else openModal(m);
           }}
        >
          {renderSillas(m)}
          <rect
            x={x} y={y} width={width} height={height} rx={rx}
            fill={fill} stroke={stroke} strokeWidth={isHighlighted ? 5 : (isSelected ? 4 : 2.5)}
            className="transition-all duration-300"
            pointerEvents="all"
            onMouseDown={(e: React.MouseEvent) => editorMode ? startDrag(m, e) : undefined}
            onTouchStart={(e: React.TouchEvent) => editorMode ? startDrag(m, e) : undefined}
          />
          <text x={x + width / 2} y={y + height / 2 - 2} textAnchor="middle" fontSize={Math.min(18, width / 3.5)} fontWeight={700} fill={textColor} fontFamily="Arial, sans-serif" pointerEvents="none" className="transition-all duration-300">{m.numero_mesa}</text>
          <text x={x + width / 2} y={y + height / 2 + 14} textAnchor="middle" fontSize={9} fill={textColor} fontFamily="Arial, sans-serif" opacity={0.8} pointerEvents="none" className="transition-all duration-300">Mesa</text>
          
          {reserva && (
            <g transform={`translate(${x + 4}, ${y + 4})`} pointerEvents="none">
              <rect width="10" height="10" rx="2" fill="#D97706" />
              <path d="M2 3 h6 M3 2 v2 M7 2 v2" stroke="white" strokeWidth="1" />
            </g>
          )}

          {editorMode && (
            <g pointerEvents="none">
              <circle cx={x + width - 8} cy={y + 8} r={5} fill="#3B82F6" />
              <path d={`M${x + width - 10} ${y + 8} L${x + width - 6} ${y + 8} M${x + width - 8} ${y + 6} L${x + width - 8} ${y + 10}`} stroke="white" strokeWidth={1.5} />
            </g>
          )}
        </g>
      );
    });

    return (
      <div className="w-full flex justify-center">
        <div className="w-full max-w-[300px] sm:max-w-[360px] aspect-[430/620]">
          <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 430 620" preserveAspectRatio="xMidYMid meet" className="w-full h-full drop-shadow-xl"
            onMouseMove={handleSvgMouseMove}
            onTouchMove={handleSvgTouchMove}
            onMouseUp={handleSvgMouseUp}
            onTouchEnd={handleSvgMouseUp}
            onMouseLeave={handleSvgMouseUp}
          >
            <rect x="10" y="10" width="410" height="600" rx="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2"/>
            <line x1="10" y1="240" x2="420" y2="240" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="5,5" />

            {unionConnectionLines}
            {mesaElements}

            {/* Leyenda */}
            <rect x="155" y="580" width="12" height="12" rx="3" fill="#ECFDF5" stroke="#10B981" strokeWidth="2"/>
            <text x="172" y="590" fontSize="8" fill="#1E293B" fontFamily="Arial, sans-serif">Libre</text>
            <rect x="205" y="580" width="12" height="12" rx="3" fill="#FEF2F2" stroke="#EF4444" strokeWidth="2"/>
            <text x="222" y="590" fontSize="8" fill="#1E293B" fontFamily="Arial, sans-serif">Ocupado</text>
            <rect x="255" y="580" width="12" height="12" rx="3" fill="#FFFBEB" stroke="#F59E0B" strokeWidth="2"/>
            <text x="272" y="590" fontSize="8" fill="#1E293B" fontFamily="Arial, sans-serif">Reserva</text>
            <rect x="305" y="580" width="12" height="12" rx="3" fill="#FAFAF9" stroke="#78716C" strokeWidth="2"/>
            <text x="322" y="590" fontSize="8" fill="#1E293B" fontFamily="Arial, sans-serif">Sucia</text>
          </svg>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-stone-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DF3B20] mr-3" />
        Cargando plano de mesas...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left p-1 sm:p-2" id="mesas-salon-module">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-800 dark:text-white tracking-tight uppercase">Plano de Mesas</h2>
          <p className="text-xs text-stone-500 font-medium">Haz clic en una mesa para reservar, ocupar o liberar mesas en tiempo real.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setEditorMode(!editorMode); setUnionMode(false); setSelectedForUnion([]); }}
            className={`px-3 py-2 rounded-xl text-xs font-black uppercase cursor-pointer transition-colors ${
              editorMode ? 'bg-blue-600 text-white shadow-md' : 'bg-stone-100 dark:bg-stone-850 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            {editorMode ? 'Salir Editor' : 'Mover Mesas 📐'}
          </button>
          <button
            onClick={() => { setUnionMode(!unionMode); setEditorMode(false); setSelectedForUnion([]); }}
            className={`px-3 py-2 rounded-xl text-xs font-black uppercase cursor-pointer transition-colors ${
              unionMode ? 'bg-blue-600 text-white shadow-md' : 'bg-stone-100 dark:bg-stone-850 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            {unionMode ? 'Cancelar Unión' : 'Unir Mesas 🔗'}
          </button>
          {unionMode && selectedForUnion.length === 2 && (
            <button onClick={handleUnirMesas} className="px-3 py-2 rounded-xl text-xs font-black uppercase bg-emerald-600 text-white cursor-pointer hover:bg-emerald-500 shadow-md shadow-emerald-600/10">
              Confirmar unión
            </button>
          )}
        </div>
      </div>

      {editorMode && (
        <div className="bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 text-xs p-3 rounded-xl border border-blue-200 dark:border-blue-900/50">
          📱 Modo editor activo: arrastra las mesas dentro del plano. Alineación asistida a la cuadrícula activa (Snapping).
        </div>
      )}

      {unionMode && (
        <div className="bg-blue-50 dark:bg-blue-955/20 text-blue-800 dark:text-blue-300 text-xs p-3 rounded-xl border border-blue-200 dark:border-blue-900/50">
          Selecciona 2 mesas vecinas para unirlas. Capacidad resultante: {selectedForUnion.reduce((sum, m) => sum + (m.capacidad || 0), 0)} pax
        </div>
      )}

      {/* Cockpit de Recepción de Dos Columnas */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Columna Izquierda: Plano SVG (Span 7) */}
        <div className="xl:col-span-7 bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-850 shadow-xs flex flex-col items-center">
          {renderSvg()}
        </div>

        {/* Columna Derecha: Asistente / Gestión (Span 5) */}
        <div className="xl:col-span-5 space-y-5">
          
          {/* Selector de pestañas */}
          <div className="flex bg-stone-105 dark:bg-stone-955 p-0.5 rounded-xl border border-stone-200 dark:border-stone-800">
            <button 
              onClick={() => setRightPanelTab('asistente')}
              className={`flex-1 py-2 text-[10.5px] font-black uppercase rounded-lg cursor-pointer transition-all ${
                rightPanelTab === 'asistente' 
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs' 
                  : 'text-stone-500 dark:text-stone-400'
              }`}
            >
              Asistente Inteligente 🔮
            </button>
            <button 
              onClick={() => setRightPanelTab('gestion')}
              className={`flex-1 py-2 text-[10.5px] font-black uppercase rounded-lg cursor-pointer transition-all ${
                rightPanelTab === 'gestion' 
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs' 
                  : 'text-stone-500 dark:text-stone-400'
              }`}
            >
              Gestión de Salón 🛠️
            </button>
          </div>

          {/* TAB 1: Asistente natural de salón */}
          {rightPanelTab === 'asistente' && (
            <MesaAsistente 
              mesas={mesasNormalizadasForAsistente} 
              onAccion={handleAccionAsistente} 
              onHoverSuggestion={setHighlightedMesas}
            />
          )}

          {/* TAB 2: Gestión tradicional de mesas */}
          {rightPanelTab === 'gestion' && (
            <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-850 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-stone-105 dark:border-stone-800">
                <h3 className="font-black text-xs text-stone-800 dark:text-white uppercase">Mesas Físicas</h3>
                <button
                  onClick={() => { resetMesaForm(); setShowMesaForm(true); }}
                  className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-[#624A3E] text-white cursor-pointer hover:bg-[#503C32]"
                >
                  + Agregar mesa
                </button>
              </div>

              {showMesaForm && (
                <form onSubmit={handleSaveMesa} className="bg-stone-50 dark:bg-stone-950 rounded-xl p-4 space-y-3 border border-stone-150 dark:border-stone-850">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] font-black text-stone-500 dark:text-stone-400 uppercase block mb-1">Número</label>
                      <input type="text" value={nuevoNumero} onChange={e => setNuevoNumero(e.target.value)} placeholder="Ej. 10" required className="w-full px-2 py-1.5 text-xs border border-stone-200 dark:border-stone-750 bg-white dark:bg-stone-900 text-stone-800 dark:text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-[#624A3E]" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-stone-500 dark:text-stone-400 uppercase block mb-1">Pax</label>
                      <select value={nuevaCapacidad} onChange={e => setNuevaCapacidad(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-stone-200 dark:border-stone-750 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 rounded-xl focus:outline-none cursor-pointer focus:ring-1 focus:ring-[#624A3E]">
                        {[1,2,3,4,5,6,7,8,10,12].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-stone-500 dark:text-stone-400 uppercase block mb-1">Zona</label>
                      <select value={nuevaZona} onChange={e => setNuevaZona(e.target.value as Zona)} className="w-full px-2 py-1.5 text-xs border border-stone-200 dark:border-stone-750 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 rounded-xl focus:outline-none cursor-pointer focus:ring-1 focus:ring-[#624A3E]">
                        <option value="comedor">Comedor</option>
                        <option value="salon">Salón principal</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={resetMesaForm} className="flex-1 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-305 rounded-xl text-[10px] font-bold cursor-pointer">Cancelar</button>
                    <button type="submit" className="flex-1 py-2 bg-[#624A3E] text-white rounded-xl text-[10px] font-black uppercase cursor-pointer hover:bg-[#503C32]">{editingMesa ? 'Guardar' : 'Crear'}</button>
                  </div>
                </form>
              )}

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {visualMesas.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-950 rounded-xl border border-stone-150 dark:border-stone-850">
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        m.estado === 'ocupada' 
                          ? 'bg-rose-500' 
                          : m.estado === 'reservada' 
                            ? 'bg-amber-500' 
                            : m.estado === 'unida' 
                              ? 'bg-gray-400' 
                              : 'bg-emerald-500'
                      }`} />
                      <div>
                        <p className="text-xs font-bold text-stone-805 dark:text-white">Mesa {m.numero_mesa}</p>
                        <p className="text-[9.5px] text-stone-500 dark:text-stone-400">{capitalize(m.zona)} · {m.capacidad} pax · {m.estado}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={e => openEditMesa(m, e)} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-[#624A3E] dark:hover:text-[#C8956A] rounded-lg cursor-pointer transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={e => handleDeleteMesa(m, e)} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-stone-400 hover:text-rose-500 rounded-lg cursor-pointer transition-colors">
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modal de Asignación / Registro de Reserva */}
      {selectedMesa && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 text-left">
          <div className="bg-white dark:bg-stone-900 rounded-t-[20px] sm:rounded-[20px] w-full max-w-md p-6 shadow-2xl border border-stone-200 dark:border-stone-800 animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-black text-stone-805 dark:text-white">Mesa {selectedMesa.numero_mesa}</h3>
                <p className="text-xs text-stone-550 dark:text-stone-300 font-medium">{capitalize(selectedMesa.zona)} · Capacidad {selectedMesa.capacidad} comensales · Estado: <span className="font-black capitalize">{selectedMesa.estado}</span></p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full cursor-pointer"><X className="w-5 h-5 text-stone-500" /></button>
            </div>

            {selectedMesa.estado === 'ocupada' ? (
              <div className="space-y-4">
                <p className="text-xs text-stone-600 dark:text-stone-300 font-semibold leading-relaxed">La mesa está ocupada por comensales. Al liberarla quedará marcada como "Sucia/En Limpieza" hasta que el mozo o fajinador confirme la limpieza.</p>
                <button onClick={handleLiberarMesa} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all shadow-md shadow-emerald-600/10">Liberar mesa y enviar a Limpieza</button>
              </div>
            ) : selectedMesa.estado === 'sucia' ? (
              <div className="space-y-4">
                <p className="text-xs text-stone-600 dark:text-stone-300 font-semibold leading-relaxed">La mesa está sucia o en limpieza. Confirma que la mesa está limpia y lista para recibir nuevos clientes.</p>
                <button onClick={handleLimpiarMesa} className="w-full py-2.5 bg-[#624A3E] hover:bg-[#503C32] text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all shadow-md shadow-[#624A3E]/10">Confirmar Limpieza de Mesa</button>
              </div>
            ) : selectedMesa.estado === 'unida' ? (
              <div className="space-y-4">
                <p className="text-xs text-stone-600 dark:text-stone-300 italic font-semibold leading-relaxed">Esta mesa está unida a otra. Por favor modifique la mesa combinada principal para realizar operaciones.</p>
              </div>
            ) : selectedMesa.mesas_unidas && selectedMesa.mesas_unidas.length >= 2 ? (
              <div className="space-y-4">
                <p className="text-xs text-stone-600 dark:text-stone-300 font-semibold leading-relaxed">Mesa combinada: Mesa {selectedMesa.numero_mesa} · Capacidad {selectedMesa.capacidad} pax</p>
                <button onClick={handleSepararMesas} className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase cursor-pointer transition-all shadow-sm">Separar Mesas Combinadas</button>
              </div>
            ) : (
              <form onSubmit={handleSaveReserva} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Fecha</label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-stone-450 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} required className="w-full pl-9 pr-2 py-2 text-xs border border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-955 text-stone-800 dark:text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-[#624A3E] font-bold" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Hora</label>
                    <input type="time" value={hora} onChange={e => setHora(e.target.value)} required className="w-full px-3 py-2 text-xs border border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-955 text-stone-800 dark:text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-[#624A3E] font-bold" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Nombre y Apellido</label>
                  <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Carlos Tevez" required className="w-full px-3 py-2 text-xs border border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-955 text-stone-800 dark:text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-[#624A3E] font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Celular</label>
                    <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+54 11..." className="w-full px-3 py-2 text-xs border border-stone-200 dark:border-stone-755 bg-stone-50 dark:bg-stone-955 text-stone-800 dark:text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-[#624A3E] font-semibold" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Pax</label>
                    <select value={pax} onChange={e => setPax(e.target.value)} className="w-full px-3 py-2 text-xs border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-955 text-stone-700 dark:text-stone-200 rounded-xl focus:outline-none cursor-pointer focus:ring-1 focus:ring-[#624A3E] font-bold">
                      {[1,2,3,4,5,6,7,8,9,10,12,14,16].map(n => <option key={n} value={n} className="bg-white dark:bg-stone-900">{n}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Observaciones</label>
                  <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} placeholder="Alergias, ubicación preferida..." className="w-full px-3 py-2 text-xs border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-955 text-stone-800 dark:text-white rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-[#624A3E] font-semibold" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeModal} className="flex-1 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-305 rounded-xl font-bold cursor-pointer">Cancelar</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-[#624A3E] hover:bg-[#503C32] text-white rounded-xl font-black uppercase cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
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
