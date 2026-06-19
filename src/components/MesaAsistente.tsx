import React, { useState, useMemo } from 'react';
import { Send, Users, Table2, Sparkles, AlertCircle } from 'lucide-react';

// Mapa oficial LAYOUT 1 según especificación del negocio
export const LAYOUT_OFICIAL: Record<number, { zona: 'alta' | 'central' | 'vip'; capacidad: number; vecinas: number[] }> = {
  1: { zona: 'alta', capacidad: 2, vecinas: [2] },
  2: { zona: 'alta', capacidad: 2, vecinas: [1, 3] },
  3: { zona: 'alta', capacidad: 2, vecinas: [2, 4] },
  4: { zona: 'alta', capacidad: 2, vecinas: [3, 5] },
  5: { zona: 'alta', capacidad: 2, vecinas: [4, 6] },
  6: { zona: 'alta', capacidad: 2, vecinas: [5] },
  7: { zona: 'central', capacidad: 5, vecinas: [] },
  8: { zona: 'central', capacidad: 5, vecinas: [9, 10] },
  9: { zona: 'central', capacidad: 5, vecinas: [8, 11] },
  10: { zona: 'central', capacidad: 5, vecinas: [8, 11] },
  11: { zona: 'central', capacidad: 5, vecinas: [9, 10] },
  12: { zona: 'vip', capacidad: 10, vecinas: [] },
};

type EstadoMesa = 'Libre' | 'Ocupada' | 'Reservada' | 'Sucia/En Limpieza';

interface MesaEstado {
  id_mesa: number;
  numero_mesa: string;
  capacidad: number;
  zona: 'alta' | 'central' | 'vip';
  estado: EstadoMesa;
  comensales?: number;
  id_pedido?: number;
  mesas_unidas?: number[];
}

interface AccionJson {
  accion: 'cambio_estado' | 'sugerencia' | 'resumen_salon' | 'combinar_mesas' | 'error';
  mesa_id?: number | number[];
  nuevo_estado?: EstadoMesa;
  comensales?: number;
  mensaje?: string;
  sugerencias?: Array<{ tipo: 'unir' | 'mesa_grande'; descripcion: string; mesas?: number[]; mesa_id?: number }>;
}

interface MesaAsistenteProps {
  mesas: MesaEstado[];
  onAccion?: (accion: AccionJson) => void;
}

const parseIntents = (text: string) => {
  const lower = text.toLowerCase();
  const numeros = (lower.match(/\b(mesa\s*)?(\d{1,2})\b/g) || [])
    .map(n => parseInt(n.replace(/\D/g, ''), 10))
    .filter(n => LAYOUT_OFICIAL[n]);
  const personasMatch = lower.match(/(\d+)\s*(personas?|pax|comensales?)/);
  const personas = personasMatch ? parseInt(personasMatch[1], 10) : undefined;

  const intent = lower.includes('sentar') || lower.includes('ocupar') || lower.includes('asignar')
    ? 'sentar'
    : lower.includes('liberar') || lower.includes('libre') || lower.includes('liberada')
    ? 'liberar'
    : lower.includes('reserv') || lower.includes('reserva')
    ? 'reservar'
    : lower.includes('suci') || lower.includes('limpi') || lower.includes('limpieza')
    ? 'limpiar'
    : lower.includes('estado') || lower.includes('salón') || lower.includes('resumen')
    ? 'resumen'
    : lower.includes('unir') || lower.includes('juntar') || lower.includes('combinar')
    ? 'unir'
    : 'desconocido';

  return { numeros, personas, intent };
};

export function sugerirAlojamiento(mesaId: number, personas: number, mesas: MesaEstado[]): AccionJson {
  const meta = LAYOUT_OFICIAL[mesaId];
  if (!meta) return { accion: 'error', mensaje: `La mesa ${mesaId} no existe en el plano oficial.` };

  // Si entra perfectamente
  if (personas <= meta.capacidad) {
    const mesa = mesas.find(m => m.id_mesa === mesaId);
    if (mesa && mesa.estado !== 'Libre' && mesa.estado !== 'Reservada') {
      return {
        accion: 'error',
        mensaje: `La Mesa ${mesaId} tiene capacidad para ${personas} personas, pero está en estado "${mesa.estado}". No se puede ocupar.`,
        mesa_id: mesaId,
      };
    }
    return {
      accion: 'cambio_estado',
      mesa_id: mesaId,
      nuevo_estado: 'Ocupada',
      comensales: personas,
      mensaje: `Perfecto. La Mesa ${mesaId} (${meta.zona}) tiene capacidad para ${meta.capacidad} personas. Asignada a ${personas} comensales.`,
    };
  }

  // Si excede en zona alta, sugerir unión con vecina libre
  if (meta.zona === 'alta') {
    const sugerencias: AccionJson['sugerencias'] = [];
    for (const vecinaId of meta.vecinas) {
      const vecina = mesas.find(m => m.id_mesa === vecinaId);
      if (vecina && (vecina.estado === 'Libre' || vecina.estado === 'Reservada')) {
        sugerencias.push({
          tipo: 'unir',
          descripcion: `Unir Mesa ${mesaId} + Mesa ${vecinaId} (capacidad combinada: ${meta.capacidad + LAYOUT_OFICIAL[vecinaId].capacidad} pax)`,
          mesas: [mesaId, vecinaId],
        });
      }
    }
    sugerencias.push({
      tipo: 'mesa_grande',
      descripcion: 'Usar Mesa 7 central (hasta 5 pax) o Mesa 12 VIP (hasta 10 pax)',
    });

    return {
      accion: 'sugerencia',
      mesa_id: mesaId,
      comensales: personas,
      mensaje: `La Mesa ${mesaId} solo admite ${meta.capacidad} personas. Para ${personas} comensales te sugiero:`,
      sugerencias,
    };
  }

  // Zona central o VIP
  if (personas <= meta.capacidad) {
    return {
      accion: 'cambio_estado',
      mesa_id: mesaId,
      nuevo_estado: 'Ocupada',
      comensales: personas,
      mensaje: `Mesa ${mesaId} asignada a ${personas} comensales.`,
    };
  }

  return {
    accion: 'sugerencia',
    mesa_id: mesaId,
    comensales: personas,
    mensaje: `La Mesa ${mesaId} admite hasta ${meta.capacidad} personas. Para ${personas} comensales te sugiero usar la Mesa 12 VIP (hasta 10 pax) o dividir en dos mesas.`,
    sugerencias: [
      { tipo: 'mesa_grande', descripcion: 'Usar Mesa 12 VIP (hasta 10 pax)', mesa_id: 12 },
    ],
  };
}

export function resumenSalon(mesas: MesaEstado[]): AccionJson {
  const libres = mesas.filter(m => m.estado === 'Libre').length;
  const ocupadas = mesas.filter(m => m.estado === 'Ocupada').length;
  const reservadas = mesas.filter(m => m.estado === 'Reservada').length;
  const sucias = mesas.filter(m => m.estado === 'Sucia/En Limpieza').length;
  return {
    accion: 'resumen_salon',
    mensaje: `Estado actual del salón: ${libres} libres, ${ocupadas} ocupadas, ${reservadas} reservadas, ${sucias} sucias/en limpieza. Total: ${mesas.length} mesas.`,
  };
}

export function procesarComando(texto: string, mesas: MesaEstado[]): AccionJson {
  const { numeros, personas, intent } = parseIntents(texto);

  if (intent === 'resumen') {
    return resumenSalon(mesas);
  }

  if (intent === 'sentar' && numeros.length > 0 && personas !== undefined) {
    return sugerirAlojamiento(numeros[0], personas, mesas);
  }

  if (intent === 'sentar' && numeros.length > 0 && personas === undefined) {
    return {
      accion: 'error',
      mensaje: `Indicame cuántas personas van a sentarse en la Mesa ${numeros[0]}. Ejemplo: "Sentar 4 personas en la mesa 3".`,
    };
  }

  if (intent === 'liberar' && numeros.length > 0) {
    return {
      accion: 'cambio_estado',
      mesa_id: numeros,
      nuevo_estado: 'Sucia/En Limpieza',
      mensaje: `Mesa${numeros.length > 1 ? 's' : ''} ${numeros.join(', ')} liberada${numeros.length > 1 ? 's' : ''} y marcada como Sucia/En Limpieza hasta que se limpie.`,
    };
  }

  if (intent === 'reservar' && numeros.length > 0) {
    const mesa = mesas.find(m => m.id_mesa === numeros[0]);
    if (mesa && mesa.estado !== 'Libre') {
      return { accion: 'error', mensaje: `La Mesa ${numeros[0]} no está libre, no se puede reservar.` };
    }
    return {
      accion: 'cambio_estado',
      mesa_id: numeros[0],
      nuevo_estado: 'Reservada',
      mensaje: `Mesa ${numeros[0]} reservada.`,
    };
  }

  if (intent === 'limpiar' && numeros.length > 0) {
    return {
      accion: 'cambio_estado',
      mesa_id: numeros,
      nuevo_estado: 'Libre',
      mensaje: `Mesa${numeros.length > 1 ? 's' : ''} ${numeros.join(', ')} limpia${numeros.length > 1 ? 's' : ''} y lista para usar.`,
    };
  }

  if (intent === 'unir' && numeros.length >= 2) {
    const capacidadTotal = numeros.reduce((sum, id) => sum + (LAYOUT_OFICIAL[id]?.capacidad || 0), 0);
    return {
      accion: 'combinar_mesas',
      mesa_id: numeros,
      nuevo_estado: 'Ocupada',
      comensales: capacidadTotal,
      mensaje: `Mesas ${numeros.join(' + ')} unidas. Capacidad combinada: ${capacidadTotal} personas. Ambas pasan a Ocupada con el mismo ID de pedido.`,
    };
  }

  return {
    accion: 'error',
    mensaje: 'No entendí el comando. Probá con: "Sentar 4 personas en la mesa 3", "Mesa 5 libre", "Estado actual del salón" o "Unir mesa 1 y 2".',
  };
}

export default function MesaAsistente({ mesas, onAccion }: MesaAsistenteProps) {
  const [input, setInput] = useState('');
  const [historial, setHistorial] = useState<{ tipo: 'user' | 'bot'; texto: string; json?: string }[]>([
    {
      tipo: 'bot',
      texto: 'Hola, soy el asistente de mesas. Decime qué necesitás: "Sentar 4 personas en la mesa 3", "Mesa 5 libre", "Estado actual del salón", etc.',
    },
  ]);

  const mesasNormalizadas = useMemo<MesaEstado[]>(() => {
    return mesas.map(m => ({
      id_mesa: m.id_mesa,
      numero_mesa: m.numero_mesa,
      capacidad: m.capacidad || LAYOUT_OFICIAL[m.id_mesa]?.capacidad || 4,
      zona: (m.zona as MesaEstado['zona']) || LAYOUT_OFICIAL[m.id_mesa]?.zona || 'central',
      estado: (m.estado === 'Ocupada' ? 'Ocupada' : m.estado === 'Reservada' ? 'Reservada' : m.estado === 'Sucia/En Limpieza' ? 'Sucia/En Limpieza' : 'Libre') as EstadoMesa,
      comensales: m.comensales,
      id_pedido: m.id_pedido,
      mesas_unidas: m.mesas_unidas,
    }));
  }, [mesas]);

  const enviar = () => {
    if (!input.trim()) return;
    const respuesta = procesarComando(input, mesasNormalizadas);
    const jsonString = JSON.stringify(respuesta, null, 2);
    setHistorial(prev => [
      ...prev,
      { tipo: 'user', texto: input },
      { tipo: 'bot', texto: respuesta.mensaje || 'Acción procesada.', json: jsonString },
    ]);
    onAccion?.(respuesta);
    setInput('');
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
        <Sparkles className="w-5 h-5 text-amber-600" />
        <h3 className="font-black text-stone-800 text-sm uppercase tracking-wider">Asistente de Mesas</h3>
      </div>

      <div className="h-64 overflow-y-auto space-y-3 pr-1">
        {historial.map((h, i) => (
          <div key={i} className={`flex ${h.tipo === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] rounded-xl p-3 text-xs ${
              h.tipo === 'user'
                ? 'bg-[#624A3E] text-white'
                : 'bg-stone-50 text-stone-700 border border-stone-100'
            }`}>
              <p className="leading-relaxed">{h.texto}</p>
              {h.json && (
                <pre className="mt-2 p-2 bg-stone-900 text-emerald-400 rounded-lg text-[10px] overflow-x-auto font-mono">
                  {h.json}
                </pre>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && enviar()}
            placeholder="Ej: sentar 4 personas en mesa 3"
            className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
          />
          <Users className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
        <button
          onClick={enviar}
          className="px-4 py-2.5 bg-[#624A3E] hover:bg-[#503C32] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          Enviar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px] text-stone-500">
        <button onClick={() => setInput('Estado actual del salón')} className="text-left p-2 bg-stone-50 rounded-lg hover:bg-stone-100 cursor-pointer">
          <Table2 className="w-3.5 h-3.5 mb-1 text-stone-400" /> Estado del salón
        </button>
        <button onClick={() => setInput('Sentar 4 personas en la mesa 3')} className="text-left p-2 bg-stone-50 rounded-lg hover:bg-stone-100 cursor-pointer">
          <AlertCircle className="w-3.5 h-3.5 mb-1 text-stone-400" /> Validar capacidad
        </button>
      </div>
    </div>
  );
}
