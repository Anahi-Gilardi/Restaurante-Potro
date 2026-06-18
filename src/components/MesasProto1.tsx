import React, { useEffect, useMemo, useState } from 'react';
import { useToast, ToastContainer } from './ToastContainer';
import { X, Plus, Calendar, Pencil, Trash } from 'lucide-react';
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
  mesas_unidas?: number[];
  parent_id?: number;
}

const POSICIONES_INICIALES: MesaVisual[] = [
  { id: 'mesa-8-comedor-8', id_mesa: 8, numero_mesa: '8', capacidad: 8, zona: 'comedor', posicion: { x: 135, y: 60, width: 80, height: 52, rx: 6 }, estado: 'libre' },
  { id: 'mesa-4-comedor-4', id_mesa: 4, numero_mesa: '4', capacidad: 4, zona: 'comedor', posicion: { x: 270, y: 60, width: 64, height: 52, rx: 6 }, estado: 'libre' },
  { id: 'mesa-5-comedor-5', id_mesa: 5, numero_mesa: '5', capacidad: 5, zona: 'comedor', posicion: { x: 140, y: 145, width: 72, height: 52, rx: 6 }, estado: 'libre' },
  { id: 'mesa-4-comedor-6', id_mesa: 6, numero_mesa: '6', capacidad: 4, zona: 'comedor', posicion: { x: 270, y: 145, width: 64, height: 52, rx: 6 }, estado: 'libre' },
  { id: 'mesa-4-salon-7',  id_mesa: 7, numero_mesa: '7', capacidad: 4, zona: 'salon',   posicion: { x: 155, y: 325, width: 64, height: 52, rx: 6 }, estado: 'libre' },
  { id: 'mesa-3-salon-3',  id_mesa: 3, numero_mesa: '3', capacidad: 3, zona: 'salon',   posicion: { x: 285, y: 325, width: 52, height: 52, rx: 6 }, estado: 'libre' },
  { id: 'mesa-5-salon-9',  id_mesa: 9, numero_mesa: '9', capacidad: 5, zona: 'salon',   posicion: { x: 135, y: 415, width: 72, height: 52, rx: 6 }, estado: 'libre' },
  { id: 'mesa-2-salon-2',  id_mesa: 2, numero_mesa: '2', capacidad: 2, zona: 'salon',   posicion: { x: 285, y: 415, width: 52, height: 52, rx: 6 }, estado: 'libre' },
  { id: 'mesa-1-salon-1',  id_mesa: 1, numero_mesa: '1', capacidad: 1, zona: 'salon',   posicion: { x: 108, y: 495, width: 52, height: 52, rx: 6 }, estado: 'libre' },
];

const ESTADO_FILL: Record<Mesa['estado'], string> = {
  libre: '#D4EDDA',
  ocupada: '#F8D7DA',
  reservada: '#FFF3CD',
  esperando_cuenta: '#d1fae5',
  limpiando: '#dbeafe',
  unida: '#e5e7eb',
};

const ESTADO_STROKE: Record<Mesa['estado'], string> = {
  libre: '#28A745',
  ocupada: '#DC3545',
  reservada: '#FFC107',
  esperando_cuenta: '#10B981',
  limpiando: '#3B82F6',
  unida: '#6B7280',
};

const ESTADO_TEXT: Record<Mesa['estado'], string> = {
  libre: '#28A745',
  ocupada: '#DC3545',
  reservada: '#B58900',
  esperando_cuenta: '#065F46',
  limpiando: '#1E40AF',
  unida: '#374151',
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
      <circle key={`top-${i}`} cx={x + pasoX * i} cy={y - 12} r={radio} fill="#28A745" opacity="0.55" pointerEvents="none" />
    );
  }
  const abajo = Math.max(0, capacidad - 4);
  for (let i = 1; i <= abajo; i++) {
    sillas.push(
      <circle key={`bottom-${i}`} cx={x + pasoX * i} cy={y + height + 12} r={radio} fill="#28A745" opacity="0.55" pointerEvents="none" />
    );
  }
  return sillas;
}

export default function MesasProto1({ mesas, onMesasChange, addLog = () => {} }: MesasProto1Props) {
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

  // Formulario agregar/editar mesa
  const [showMesaForm, setShowMesaForm] = useState(false);
  const [editingMesa, setEditingMesa] = useState<MesaVisual | null>(null);
  const [nuevoNumero, setNuevoNumero] = useState('');
  const [nuevaCapacidad, setNuevaCapacidad] = useState('4');
  const [nuevaZona, setNuevaZona] = useState<Zona>('comedor');

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
      estado: m1.estado === 'ocupada' || m2.estado === 'ocupada' ? 'ocupada' : 'libre',
      mesas_unidas: [m1.id_mesa, m2.id_mesa],
    };

    try {
      await mesasService.update(m1.id_mesa, mesaUnida);
      await mesasService.update(m2.id_mesa, { parent_id: m1.id_mesa, estado: 'unida' });
      setVisualMesas(prev => prev.map(m => {
        if (m.id_mesa === m1.id_mesa) return { ...m, ...mesaUnida, zona: m1.zona, estado: mesaUnida.estado || 'libre' } as MesaVisual;
        if (m.id_mesa === m2.id_mesa) return { ...m, parent_id: m1.id_mesa, estado: 'unida' };
        return m;
      }));
      setSelectedForUnion([]);
      setUnionMode(false);
      addLog('mesa', `${m1.numero_mesa} unida con ${m2.numero_mesa}`);
      toast.success('Mesas unidas correctamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al unir mesas');
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
      await mesasService.update(selectedMesa.id_mesa, { estado: 'libre', comensales: 0, reserva_cliente: undefined, reserva_hora: undefined });
      const reservaExistente = reservasHoy.find(r => r.id_mesa === selectedMesa.id_mesa && r.estado === 'confirmada');
      if (reservaExistente) {
        await reservasService.update(reservaExistente.id_reserva, { estado: 'completada' });
      }
      setVisualMesas(prev => prev.map(m => m.id_mesa === selectedMesa.id_mesa ? { ...m, estado: 'libre' } : m));
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

  // Render del SVG con mesas dinámicas
  const renderSvg = () => {
    const mesaElements = visualMesas.map(m => {
      const reserva = reservasHoy.find(r => r.id_mesa === m.id_mesa && r.estado === 'confirmada');
      const estado = m.estado === 'ocupada' ? 'ocupada' : m.estado === 'unida' ? 'unida' : reserva ? 'reservada' : 'libre';
      const fill = ESTADO_FILL[estado];
      const stroke = ESTADO_STROKE[estado];
      const textColor = ESTADO_TEXT[estado];
      const isSelected = unionMode && selectedForUnion.some(s => s.id_mesa === m.id_mesa);
      const { x, y, width, height, rx } = m.posicion;

      return (
        <g key={m.id} data-mesa-id={m.id} className="cursor-pointer hover:opacity-90 transition-opacity"
           onClick={(e: React.MouseEvent) => {
             e.stopPropagation();
             if (unionMode) toggleUnionSelection(m);
             else openModal(m);
           }}
        >
          {renderSillas(m)}
          <rect x={x} y={y} width={width} height={height} rx={rx}
                fill={fill} stroke={isSelected ? '#3B82F6' : stroke} strokeWidth={isSelected ? 4 : 2.5} pointerEvents="all" />
          <text x={x + width / 2} y={y + height / 2 - 2} textAnchor="middle" fontSize={Math.min(18, width / 3.5)} fontWeight={700} fill={textColor} fontFamily="Arial, sans-serif" pointerEvents="none">{m.numero_mesa}</text>
          <text x={x + width / 2} y={y + height / 2 + 14} textAnchor="middle" fontSize={9} fill={textColor} fontFamily="Arial, sans-serif" opacity={0.8} pointerEvents="none">Mesa</text>
        </g>
      );
    });

    return (
      <div className="w-full flex justify-center">
        <div className="w-full max-w-[300px] sm:max-w-[360px] aspect-[430/620]"
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
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-800 tracking-tight">Plano de Mesas</h2>
          <p className="text-xs text-stone-500 font-medium">Haz clic en una mesa para reservar o liberar</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setUnionMode(!unionMode); setSelectedForUnion([]); }}
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

      {unionMode && (
        <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-xl border border-blue-200">
          Seleccioná 2 mesas para unir. Capacidad resultante: {selectedForUnion.reduce((sum, m) => sum + (m.capacidad || 0), 0)} pax
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
                <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Zona</label>
                <select value={nuevaZona} onChange={e => setNuevaZona(e.target.value as Zona)} className="w-full px-3 py-2.5 text-xs border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#624A3E]">
                  <option value="comedor">Comedor</option>
                  <option value="salon">Salón</option>
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
                <p className="text-sm text-stone-600">La mesa está ocupada. Podés liberarla cuando el cliente termine.</p>
                <button onClick={handleLiberarMesa} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer">Liberar mesa</button>
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
