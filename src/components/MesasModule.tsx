import React, { useEffect, useMemo, useState } from 'react';
import { useToast, ToastContainer } from './ToastContainer';
import { X, Plus, Calendar, Pencil, Trash } from 'lucide-react';
import { Mesa, Reserva } from '../types';
import { mesasService } from '../services/mesasService';
import { reservasService } from '../services/reservasService';
import MesaAsistente, { LAYOUT_OFICIAL, procesarComando } from './MesaAsistente';

interface MesasModuleProps {
  mesas: Mesa[];
  onMesasChange: (mesas: Mesa[]) => void;
  addLog?: (tipo: 'sistema' | 'reserva' | 'mesa' | 'pedido_creado' | 'descuento_stock' | 'alerta_stock' | 'comanda_estado' | 'merma_registrada', mensaje: string) => void;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
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
  libre: 'url(#freeGrad)',
  ocupada: 'url(#occupiedGrad)',
  reservada: 'url(#reservedGrad)',
  esperando_cuenta: 'url(#waitingGrad)',
  limpiando: 'url(#cleaningGrad)',
  unida: 'url(#unitedGrad)',
  sucia: 'url(#dirtyGrad)',
};

const ESTADO_STROKE: Record<Mesa['estado'], string> = {
  libre: '#10B981', // Emerald green
  ocupada: '#EF4444', // Red
  reservada: '#F59E0B', // Amber
  esperando_cuenta: '#059669', // Dark Emerald
  limpiando: '#3B82F6', // Blue
  unida: '#9CA3AF', // Gray
  sucia: '#78716C', // Stone
};

const ESTADO_TEXT: Record<Mesa['estado'], string> = {
  libre: '#047857',
  ocupada: '#B91C1C',
  reservada: '#B45309',
  esperando_cuenta: '#065F46',
  limpiando: '#1D4ED8',
  unida: '#4B5563',
  sucia: '#44403C',
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
  const pasoX = width / (Math.min(capacidad, 4) + 1);

  const arriba = Math.min(capacidad, 4);
  for (let i = 1; i <= arriba; i++) {
    const cx = x + pasoX * i;
    sillas.push(
      <g key={`top-chair-${i}`} pointerEvents="none">
        {/* Cushion (Seat) */}
        <rect x={cx - 7} y={y - 11} width="14" height="8" rx="2" fill="#8C6D58" stroke="#4E3629" strokeWidth="1" />
        {/* Backrest */}
        <rect x={cx - 7} y={y - 14} width="14" height="3" rx="1" fill="#4E3629" />
      </g>
    );
  }
  const abajo = Math.max(0, capacidad - 4);
  for (let i = 1; i <= abajo; i++) {
    const cx = x + pasoX * i;
    sillas.push(
      <g key={`bottom-chair-${i}`} pointerEvents="none">
        {/* Cushion (Seat) */}
        <rect x={cx - 7} y={y + height + 3} width="14" height="8" rx="2" fill="#8C6D58" stroke="#4E3629" strokeWidth="1" />
        {/* Backrest */}
        <rect x={cx - 7} y={y + height + 11} width="14" height="3" rx="1" fill="#4E3629" />
      </g>
    );
  }
  return sillas;
}

export default function MesasModule({ mesas, onMesasChange, addLog = () => {} }: MesasModuleProps) {
  const { toast, toasts, removeToast } = useToast();
  const [visualMesas, setVisualMesas] = useState<MesaVisual[]>(POSICIONES_INICIALES);
  const [reservasHoy, setReservasHoy] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);

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

    // Apply Snapping (Magnetic Grid Snapping to 10px multiples)
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
      const reservaExistente = reservasHoy.find(r => r.id_mesa === selectedMesa.id_mesa && r.estado === 'confirmada');
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

  const renderSvg = () => {
    // 1. Draw connection lines between child tables and parents (united tables)
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
      const fill = ESTADO_FILL[m.estado];
      const stroke = ESTADO_STROKE[m.estado];
      const textColor = ESTADO_TEXT[m.estado];
      const isSelected = unionMode && selectedForUnion.some(s => s.id_mesa === m.id_mesa);
      const { x, y, width, height, rx } = m.posicion;

      return (
        <g key={m.id} data-mesa-id={m.id}
           className={`transition-opacity ${editorMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:opacity-95'}`}
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
            fill={fill} stroke={isSelected ? '#3B82F6' : stroke} strokeWidth={isSelected ? 4 : 2.5}
            pointerEvents="all"
            onMouseDown={(e: React.MouseEvent) => editorMode ? startDrag(m, e) : undefined}
            onTouchStart={(e: React.TouchEvent) => editorMode ? startDrag(m, e) : undefined}
          />
          <text x={x + width / 2} y={y + height / 2 - 2} textAnchor="middle" fontSize={Math.min(18, width / 3.5)} fontWeight={800} fill={textColor} fontFamily="Arial, sans-serif" pointerEvents="none">{m.numero_mesa}</text>
          <text x={x + width / 2} y={y + height / 2 + 14} textAnchor="middle" fontSize={9} fill={textColor} fontFamily="Arial, sans-serif" opacity={0.8} fontWeight={500} pointerEvents="none">Mesa</text>
          
          {/* Reservation calendar icon on table */}
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
      <div className="w-full flex justify-center py-2">
        <div className="w-full max-w-[360px] md:max-w-[550px] lg:max-w-[650px] aspect-[430/620] transition-all duration-300">
          <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 430 620" preserveAspectRatio="xMidYMid meet" className="w-full h-full drop-shadow-xl"
            onMouseMove={handleSvgMouseMove}
            onTouchMove={handleSvgTouchMove}
            onMouseUp={handleSvgMouseUp}
            onTouchEnd={handleSvgMouseUp}
            onMouseLeave={handleSvgMouseUp}
          >
            <defs>
              {/* Architectural Grid pattern */}
              <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="none" />
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#F1EFE9" strokeWidth="0.75" />
              </pattern>
              
              {/* Premium Gradients for Tables */}
              <linearGradient id="freeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ECFDF5" />
                <stop offset="100%" stopColor="#D1FAE5" />
              </linearGradient>
              <linearGradient id="occupiedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF5F5" />
                <stop offset="100%" stopColor="#FEE2E2" />
              </linearGradient>
              <linearGradient id="reservedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFBEB" />
                <stop offset="100%" stopColor="#FEF3C7" />
              </linearGradient>
              <linearGradient id="dirtyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FAFAF9" />
                <stop offset="100%" stopColor="#F5F5F4" />
              </linearGradient>
              <linearGradient id="cleaningGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EFF6FF" />
                <stop offset="100%" stopColor="#DBEAFE" />
              </linearGradient>
              <linearGradient id="waitingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F0FDF4" />
                <stop offset="100%" stopColor="#D1FAE5" />
              </linearGradient>
              <linearGradient id="unitedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F9FAFB" />
                <stop offset="100%" stopColor="#E5E7EB" />
              </linearGradient>
            </defs>

            {/* Layout Canvas border */}
            <rect x="10" y="10" width="410" height="600" rx="6" fill="none" stroke="#4E3629" strokeWidth="4.5"/>
            
            {/* Left Corridor (Pasillo) */}
            <rect x="10" y="10" width="80" height="600" rx="4" fill="#3D2B1F"/>
            <text x="50" y="200" textAnchor="middle" fontSize="11" fill="#C9A96E" fontFamily="Georgia, serif" fontWeight="700" transform="rotate(-90, 50, 200)" letterSpacing="3">RESTAURANTE</text>
            <rect x="24" y="120" width="32" height="28" rx="6" fill="none" stroke="#C9A96E" strokeWidth="1.5" opacity="0.4"/>
            <rect x="24" y="175" width="32" height="28" rx="6" fill="none" stroke="#C9A96E" strokeWidth="1.5" opacity="0.4"/>
            <rect x="24" y="230" width="32" height="28" rx="6" fill="none" stroke="#C9A96E" strokeWidth="1.5" opacity="0.4"/>
            <text x="50" y="510" textAnchor="middle" fontSize="9" fill="#C9A96E" fontFamily="Arial, sans-serif" letterSpacing="1.5" transform="rotate(-90, 50, 510)">PASILLO</text>

            {/* COMEDOR Zone */}
            <rect x="90" y="10" width="330" height="255" fill="#FAF8F5"/>
            <rect x="90" y="10" width="330" height="255" fill="url(#gridPattern)" opacity="0.75" />
            <text x="255" y="34" textAnchor="middle" fontSize="12" fontWeight="800" fill="#7A5C44" fontFamily="Arial, sans-serif" letterSpacing="3">COMEDOR</text>
            <line x1="90" y1="265" x2="420" y2="265" stroke="#4E3629" strokeWidth="3"/>

            {/* CAJA Module */}
            <rect x="340" y="18" width="70" height="90" rx="8" fill="#FFFDF9" stroke="#8C6D58" strokeWidth="2.5"/>
            <text x="375" y="55" textAnchor="middle" fontSize="10" fontWeight="800" fill="#624A3E" fontFamily="Arial, sans-serif" letterSpacing="1.5">CAJA</text>
            <rect x="346" y="72" width="58" height="8" rx="3.5" fill="#8C6D58" opacity="0.45"/>

            {/* SALÓN Zone */}
            <rect x="90" y="265" width="330" height="345" fill="#FAF7F0"/>
            <rect x="90" y="265" width="330" height="345" fill="url(#gridPattern)" opacity="0.75" />
            <text x="255" y="292" textAnchor="middle" fontSize="12" fontWeight="800" fill="#7A5C44" fontFamily="Arial, sans-serif" letterSpacing="3">SALÓN</text>

            {/* INGRESO Zone */}
            <rect x="90" y="575" width="80" height="35" fill="#FAF2E5" stroke="#4E3629" strokeWidth="2"/>
            <text x="130" y="596" textAnchor="middle" fontSize="7.5" fill="#624A3E" fontFamily="Arial, sans-serif" fontWeight="800" letterSpacing="0.5">INGRESO</text>
            
            {/* Architectural swing doors */}
            {/* Comedor doorway swing */}
            <path d="M 90 120 A 25 25 0 0 1 115 145" fill="none" stroke="#7A5C44" strokeWidth="1.5" strokeDasharray="3,3" />
            <line x1="90" y1="120" x2="90" y2="145" stroke="#7A5C44" strokeWidth="2.5" />
            
            {/* Salón doorway swing */}
            <path d="M 90 400 A 25 25 0 0 1 115 425" fill="none" stroke="#7A5C44" strokeWidth="1.5" strokeDasharray="3,3" />
            <line x1="90" y1="400" x2="90" y2="425" stroke="#7A5C44" strokeWidth="2.5" />
            
            {/* Entrance swing doors */}
            <path d="M 110 575 A 20 20 0 0 0 130 555" fill="none" stroke="#4E3629" strokeWidth="1.5" strokeDasharray="2.5,2" />
            <line x1="110" y1="575" x2="130" y2="575" stroke="#4E3629" strokeWidth="2.5" />
            <path d="M 150 575 A 20 20 0 0 1 130 555" fill="none" stroke="#4E3629" strokeWidth="1.5" strokeDasharray="2.5,2" />
            <line x1="150" y1="575" x2="130" y2="575" stroke="#4E3629" strokeWidth="2.5" />

            {/* Plants container decorations (plants in corners) */}
            {/* Top-Right Plant */}
            <g transform="translate(400, 25)">
              <circle cx="0" cy="0" r="10" fill="#DCFCE7" stroke="#10B981" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="6" fill="#10B981" />
              <path d="M -3 0 L 3 0 M 0 -3 L 0 3" stroke="#047857" strokeWidth="1" />
            </g>
            {/* Bottom-Right Plant */}
            <g transform="translate(400, 550)">
              <circle cx="0" cy="0" r="10" fill="#DCFCE7" stroke="#10B981" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="6" fill="#10B981" />
              <path d="M -3 0 L 3 0 M 0 -3 L 0 3" stroke="#047857" strokeWidth="1" />
            </g>

            <text x="418" y="140" textAnchor="middle" fontSize="9" fill="#7A5C44" fontFamily="Arial, sans-serif" transform="rotate(90, 418, 140)" letterSpacing="2" opacity="0.6">FACHADA</text>

            {unionConnectionLines}
            {mesaElements}

            {/* Leyenda */}
            <rect x="155" y="580" width="12" height="12" rx="3" fill="url(#freeGrad)" stroke="#10B981" strokeWidth="2"/>
            <text x="172" y="589" fontSize="8.5" fill="#44403C" fontWeight="700" fontFamily="Arial, sans-serif">Libre</text>
            <rect x="205" y="580" width="12" height="12" rx="3" fill="url(#occupiedGrad)" stroke="#EF4444" strokeWidth="2"/>
            <text x="222" y="589" fontSize="8.5" fill="#44403C" fontWeight="700" fontFamily="Arial, sans-serif">Ocupado</text>
            <rect x="255" y="580" width="12" height="12" rx="3" fill="url(#reservedGrad)" stroke="#F59E0B" strokeWidth="2"/>
            <text x="272" y="589" fontSize="8.5" fill="#44403C" fontWeight="700" fontFamily="Arial, sans-serif">Reserva</text>
            <rect x="305" y="580" width="12" height="12" rx="3" fill="url(#dirtyGrad)" stroke="#78716C" strokeWidth="2"/>
            <text x="322" y="589" fontSize="8.5" fill="#44403C" fontWeight="700" fontFamily="Arial, sans-serif">Sucia</text>
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
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-800 tracking-tight">Plano de Mesas</h2>
          <p className="text-xs text-stone-500 font-medium">Haz clic en una mesa para reservar o liberar</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setEditorMode(!editorMode); setUnionMode(false); setSelectedForUnion([]); }}
            className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
              editorMode ? 'bg-blue-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {editorMode ? 'Salir del editor' : 'Mover mesas'}
          </button>
          <button
            onClick={() => { setUnionMode(!unionMode); setEditorMode(false); setSelectedForUnion([]); }}
            className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
              unionMode ? 'bg-blue-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {unionMode ? 'Cancelar unión' : 'Unir mesas'}
          </button>
          {unionMode && selectedForUnion.length === 2 && (
            <button onClick={handleUnirMesas} className="px-3 py-2 rounded-xl text-xs font-bold bg-[#624A3E] text-white cursor-pointer hover:bg-[#503C32]">
              Confirmar unión
            </button>
          )}
        </div>
      </div>

      {editorMode && (
        <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-xl border border-blue-200">
          📱 Modo editor activo: arrastra las mesas dentro del plano. Alineación asistida a la cuadrícula activa.
        </div>
      )}

      {unionMode && (
        <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-xl border border-blue-200">
          Selecciona 2 mesas para unir. Capacidad resultante: {selectedForUnion.reduce((sum, m) => sum + (m.capacidad || 0), 0)} pax
        </div>
      )}

      {/* Plano SVG */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-stone-200 shadow-sm">
        {renderSvg()}
      </div>

      {/* Gestión de mesas */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-extrabold text-sm text-stone-800">Gestión de mesas</h3>
          <button
            onClick={() => { resetMesaForm(); setShowMesaForm(true); }}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-[#624A3E] text-white cursor-pointer hover:bg-[#503C32]"
          >
            + Agregar mesa
          </button>
        </div>

        {showMesaForm && (
          <form onSubmit={handleSaveMesa} className="bg-stone-50 rounded-xl p-4 space-y-3 border border-stone-100">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Número</label>
                <input type="text" value={nuevoNumero} onChange={e => setNuevoNumero(e.target.value)} placeholder="Ej. 10" required className="w-full px-3 py-2.5 text-xs border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#624A3E]" />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Capacidad</label>
                <select value={nuevaCapacidad} onChange={e => setNuevaCapacidad(e.target.value)} className="w-full px-3 py-2.5 text-xs border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#624A3E]">
                  {[1,2,3,4,5,6,7,8,10,12].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="col-span-1">
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Sector / Zona</label>
                <select value={nuevaZona} onChange={e => setNuevaZona(e.target.value as Zona)} className="w-full px-3 py-2.5 text-xs border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#624A3E]">
                  <option value="comedor">Zona Alta (Mesas 1-6 · 2 pax)</option>
                  <option value="salon">Zona Central/Baja (Mesas 7-11 · 4-5 pax) + VIP</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={resetMesaForm} className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold cursor-pointer">Cancelar</button>
              <button type="submit" className="flex-1 py-2.5 bg-[#624A3E] hover:bg-[#503C32] text-white rounded-xl text-xs font-bold cursor-pointer">{editingMesa ? 'Guardar cambios' : 'Agregar mesa'}</button>
            </div>
          </form>
        )}

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {visualMesas.map(m => (
            <div key={m.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100">
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${m.estado === 'ocupada' ? 'bg-red-500' : m.estado === 'reservada' ? 'bg-amber-400' : m.estado === 'unida' ? 'bg-gray-400' : 'bg-green-500'}`} />
                <div>
                  <p className="text-xs font-bold text-stone-800">Mesa {m.numero_mesa}</p>
                  <p className="text-[10px] text-stone-500">{capitalize(m.zona)} · {m.capacidad} pax · {m.estado}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={e => openEditMesa(m, e)} className="p-1.5 hover:bg-blue-50 text-stone-400 hover:text-blue-500 rounded-lg cursor-pointer transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={e => handleDeleteMesa(m, e)} className="p-1.5 hover:bg-rose-50 text-stone-400 hover:text-rose-500 rounded-lg cursor-pointer transition-colors">
                  <Trash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {selectedMesa && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[20px] sm:rounded-[20px] w-full max-w-md p-6 shadow-2xl border border-stone-200 animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-black text-stone-800">Mesa {selectedMesa.numero_mesa}</h3>
                <p className="text-xs text-stone-500 font-medium">{capitalize(selectedMesa.zona)} · Capacidad {selectedMesa.capacidad} pax · Estado: <span className="font-bold capitalize">{selectedMesa.estado}</span></p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-stone-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-stone-500" /></button>
            </div>

            {selectedMesa.estado === 'ocupada' ? (
              <div className="space-y-4">
                <p className="text-sm text-stone-600">La mesa está ocupada. Al liberar quedará marcada como Sucia/En Limpieza hasta que se limpie.</p>
                <button onClick={handleLiberarMesa} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer">Liberar mesa</button>
              </div>
            ) : selectedMesa.estado === 'sucia' ? (
              <div className="space-y-4">
                <p className="text-sm text-stone-600">La mesa está sucia o en limpieza. Marcala como libre cuando esté lista.</p>
                <button onClick={handleLimpiarMesa} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer">Mesa limpia</button>
              </div>
            ) : selectedMesa.estado === 'unida' ? (
              <div className="space-y-4">
                <p className="text-sm text-stone-600">Esta mesa está unida a otra. No se puede reservar individualmente.</p>
              </div>
            ) : selectedMesa.mesas_unidas && selectedMesa.mesas_unidas.length >= 2 ? (
              <div className="space-y-4">
                <p className="text-sm text-stone-600">Mesa unida: Mesa {selectedMesa.numero_mesa} · Capacidad {selectedMesa.capacidad} pax</p>
                <button onClick={handleSepararMesas} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold cursor-pointer">Separar mesas</button>
              </div>
            ) : (
              <form onSubmit={handleSaveReserva} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Fecha</label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-stone-450 absolute left-3 top-1/2 -translate-y-1/2" />
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
