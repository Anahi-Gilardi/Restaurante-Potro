import React, { useState, useEffect } from 'react';
import { Tag, Calendar, Plus, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';
import { promocionesService, Promocion } from '../services/promocionesService';
import { EventoLog } from '../types';

interface PromocionesModuleProps {
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

export default function PromocionesModule({ addLog }: PromocionesModuleProps) {
  const [promos, setPromos] = useState<Promocion[]>([]);

  useEffect(() => {
    promocionesService.list().then(data => {
      if (data && data.length > 0) {
        setPromos(data);
      } else {
        const defaults: Promocion[] = [
          { id_promo: 'p_1', nombre: 'Happy Hour 2x1 Tragos & Cervezas', descuento_porcentaje: 50, tipo: 'happy_hour', dias_vigentes: 'Lun a Vie - 18 a 21hs', activo: true, descripcion: 'Aplica a vinos seleccionados y bebidas de línea comercial' },
          { id_promo: 'p_2', nombre: 'Combo Ejecutivo El Patrón', descuento_porcentaje: 20, tipo: 'combo', dias_vigentes: 'Lun a Sab - Almuerzo', activo: true, descripcion: 'Bife de chorizo completo + bebida sin alcohol con descuento integrado' },
          { id_promo: 'p_3', nombre: '15% Off Pago Efectivo / Arqueo', descuento_porcentaje: 15, tipo: 'descuento_directo', dias_vigentes: 'Todos los días - Completo', activo: true, descripcion: 'Descuento directo que aplica el cajero al cobrar en mostrador' },
          { id_promo: 'p_4', nombre: '25% Especial Cumpleañeros', descuento_porcentaje: 25, tipo: 'descuento_directo', dias_vigentes: 'Todos los días', activo: false, descripcion: 'Presentando documentación al mesero encargado' },
        ];
        setPromos(defaults);
      }
    }).catch(() => {});
  }, []);


  const [nombre, setNombre] = useState('');
  const [descuento, setDescuento] = useState('');
  const [tipo, setTipo] = useState<'happy_hour' | 'combo' | 'descuento_directo'>('descuento_directo');
  const [vigencia, setVigencia] = useState('');
  const [desc, setDesc] = useState('');

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !descuento) return;

    const newPr: Promocion = {
      id_promo: `p_${Date.now()}`,
      nombre,
      descuento_porcentaje: parseInt(descuento),
      tipo,
      dias_vigentes: vigencia || 'Todos los días',
      activo: true,
      descripcion: desc || 'Precios promocionales y combos especiales'
    };

    setPromos(prev => [newPr, ...prev]);
    promocionesService.create(newPr).catch(err => console.error(err));
    addLog('sistema', `SISTEMA: Habilitada nueva campaña promocional comercial '${nombre}' con descuento del ${descuento}%`);
    setNombre('');
    setDescuento('');
    setVigencia('');
    setDesc('');
  };

  const handleTogglePromo = (id: string) => {
    setPromos(prev => prev.map(p => {
      if (p.id_promo === id) {
        const nextState = !p.activo;
        promocionesService.update(id, { activo: nextState }).catch(err => console.error(err));
        addLog('sistema', `SISTEMA: Campaña '${p.nombre}' cambiada a: ${nextState ? 'ACTIVA' : 'INACTIVA'}`);
        return { ...p, activo: nextState };
      }
      return p;
    }));
  };

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left col: Add Promo campaign */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs h-fit space-y-4">
          <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#624A3E]" />
            Nueva Campaña Comercial
          </h3>
          <form onSubmit={handleCreatePromo} className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Nombre Promoción</label>
              <input 
                type="text" 
                value={nombre} 
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej. Promo Viernes de Amigos"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Descuento (%)</label>
              <input 
                type="number" 
                value={descuento} 
                onChange={e => setDescuento(e.target.value)}
                placeholder="Ej. 15"
                min="1"
                max="100"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Tipo de Descuento</label>
              <select 
                value={tipo} 
                onChange={e => setTipo(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E] cursor-pointer font-semibold text-stone-700"
              >
                <option value="descuento_directo">Descuento Directo %</option>
                <option value="happy_hour">Happy Hour 2x1 / Tragos</option>
                <option value="combo">Combo Ejecutivo Combinado</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Vigencia Temporal</label>
              <input 
                type="text" 
                value={vigencia} 
                onChange={e => setVigencia(e.target.value)}
                placeholder="Ej. Viernes de 18 a 22hs"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Descripción Breve</label>
              <textarea 
                value={desc} 
                onChange={e => setDesc(e.target.value)}
                placeholder="Detalle de platos cubiertos..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
              />
            </div>

            <button 
              type="submit"
              className="w-full py-2.5 bg-[#624A3E] hover:bg-[#503C32] text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer"
            >
              Publicar Descuento
            </button>
          </form>
        </div>

        {/* Right 3 cols: active campaign cards */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs lg:col-span-3 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-stone-100">
            <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#624A3E]" />
              Campañas de Descuentos & Promociones ({promos.length})
            </h3>
            <span className="text-[9px] bg-stone-100 text-stone-500 font-bold px-2 py-0.5 rounded-full">Políticas de Incentivo de Consumo</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {promos.map(p => (
              <div key={p.id_promo} className={`p-4 rounded-2xl border transition-colors flex flex-col justify-between ${
                p.activo 
                  ? 'border-stone-200 bg-[#F5F1E9]/30' 
                  : 'border-stone-150 bg-stone-50/50 opacity-60'
              }`}>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-extrabold text-stone-900 text-sm tracking-tight leading-snug">{p.nombre}</h4>
                    <span className="text-xs font-black text-[#624A3E] font-mono tracking-tight bg-[#624A3E]/10 px-2 py-1 rounded-lg shrink-0">
                      -{p.descuento_porcentaje}%
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-stone-500 leading-normal">{p.descripcion}</p>
                </div>

                <div className="flex justify-between items-center mt-6 pt-3 border-t border-stone-200/50">
                  <span className="text-[9px] text-stone-500 font-bold flex items-center gap-1 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    Vigencia: {p.dias_vigentes}
                  </span>
                  
                  <button 
                    onClick={() => handleTogglePromo(p.id_promo)}
                    className="flex items-center gap-1.5 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
                    title={p.activo ? 'Desactivar campaña' : 'Habilitar campaña'}
                  >
                    {p.activo ? (
                      <span className="text-[9px] font-black text-emerald-600 uppercase flex items-center gap-1">
                        ● Activo 
                        <ToggleRight className="w-5 h-5" />
                      </span>
                    ) : (
                      <span className="text-[9px] font-black text-stone-400 uppercase flex items-center gap-1">
                        Pausado
                        <ToggleLeft className="w-5 h-5" />
                      </span>
                    )}
                  </button>
                </div>

              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}
