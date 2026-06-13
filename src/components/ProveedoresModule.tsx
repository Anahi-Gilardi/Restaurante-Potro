import React, { useState, useEffect } from 'react';
import { Truck, Phone, Plus, Tag, Layers, CheckCircle } from 'lucide-react';
import { Proveedor, EventoLog } from '../types';
import { proveedoresService } from '../services/proveedoresService';

interface ProveedoresModuleProps {
  onRestockTodo: () => void;
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

export default function ProveedoresModule({
  onRestockTodo,
  addLog
}: ProveedoresModuleProps) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  useEffect(() => {
    proveedoresService.list().then(data => {
      if (data && data.length > 0) {
        setProveedores(data);
      } else {
        // Default seeding
        const defaults: Proveedor[] = [
          { id_proveedor: 'prov_1', nombre: 'Frigorífico Central Sur S.A.', contacto: 'Federico Balestra', telefono: '+54 11 4488-2993', categoria: 'carnes', correo: 'pedidos@frigorificosursas.com', tiempo_entrega_dias: 1 },
          { id_proveedor: 'prov_2', nombre: 'Distribuidora Agrícola Verde Fresco', contacto: 'Laura Benítez', telefono: '+54 9 11 3998-2831', categoria: 'verduras', correo: 'ventas@verdefrescodist.com', tiempo_entrega_dias: 1 },
          { id_proveedor: 'prov_3', nombre: 'Bebidas Unidas S.R.L. Bodegas', contacto: 'Esteban Rutini', telefono: '+54 11 5003-8822', categoria: 'bebidas', correo: 'erutini@bebidasunidas.com', tiempo_entrega_dias: 2 },
          { id_proveedor: 'prov_4', nombre: 'Almacén Mayorista El Trébol', contacto: 'Jorge Alvarenga', telefono: '+54 11 4055-1212', categoria: 'viveres', correo: 'j.alvarenga@trebolsecos.com.ar', tiempo_entrega_dias: 3 },
          { id_proveedor: 'prov_5', nombre: 'Envases & Descartables Oeste', contacto: 'Damián Sabor', telefono: '+54 9 11 6554-1010', categoria: 'descartables', correo: 'dsabor@envasesoeste.com', tiempo_entrega_dias: 2 },
        ];
        setProveedores(defaults);
      }
    }).catch(() => {
      // Fallback
    });
  }, []);


  const [nombre, setNombre] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [categoria, setCategoria] = useState<'carnes' | 'verduras' | 'bebidas' | 'viveres' | 'descartables'>('carnes');
  const [correo, setCorreo] = useState('');
  const [tiempo, setTiempo] = useState('1');

  const [orderedId, setOrderedId] = useState<string | null>(null);

  const handleCreateProveedor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !contacto || !telefono) return;

    const newProv: Proveedor = {
      id_proveedor: `prov_${Date.now()}`,
      nombre,
      contacto,
      telefono,
      categoria,
      correo: correo || 'contacto@proveedor.com',
      tiempo_entrega_dias: parseInt(tiempo) || 1
    };

    setProveedores(prev => [...prev, newProv]);
    proveedoresService.create(newProv).catch(err => console.error(err));
    addLog('sistema', `PROVEEDORES: Incorporado nuevo proveedor de materia prima '${nombre}' para categoría: ${categoria.toUpperCase()}`);
    setNombre('');
    setContacto('');
    setTelefono('');
    setCorreo('');
  };

  const handlePlaceOrder = (prov: Proveedor) => {
    setOrderedId(prov.id_proveedor);
    addLog('sistema', `REPOSICIÓN: Solicitud de reabastecimiento enviada por API-Rest a '${prov.nombre}'. Reaprovisionamiento estimado en ${prov.tiempo_entrega_dias} día(s).`);
    
    // Simulate stock fill
    onRestockTodo();

    setTimeout(() => {
      setOrderedId(null);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left col: Add new Supplier */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4 h-fit">
          <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#624A3E]" />
            Adicionar Proveedor
          </h3>
          <form onSubmit={handleCreateProveedor} className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Razón Social</label>
              <input 
                type="text" 
                value={nombre} 
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej. Frigorífico Central S.A."
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Nombre de Contacto</label>
              <input 
                type="text" 
                value={contacto} 
                onChange={e => setContacto(e.target.value)}
                placeholder="Ej. Federico Balestra"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Teléfono Directo</label>
              <input 
                type="text" 
                value={telefono} 
                onChange={e => setTelefono(e.target.value)}
                placeholder="Ej. +54 11 4488-2993"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Correo Electrónico</label>
              <input 
                type="email" 
                value={correo} 
                onChange={e => setCorreo(e.target.value)}
                placeholder="pedidos@empresa.com"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Categoría de Entrega</label>
              <select 
                value={categoria} 
                onChange={e => setCategoria(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none cursor-pointer focus:ring-1 focus:ring-[#624A3E] font-semibold text-stone-700"
              >
                <option value="carnes">Cortes de Carnes y Frescos</option>
                <option value="verduras">Verduras y Frutas del Día</option>
                <option value="bebidas">Vinos, Agua y Gaseosas</option>
                <option value="viveres">Secos, Cereales y Especias</option>
                <option value="descartables">Laminados, Cajas y Packaging</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Plazo de Despacho (Días)</label>
              <select 
                value={tiempo} 
                onChange={e => setTiempo(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none cursor-pointer focus:ring-1 focus:ring-[#624A3E] font-semibold text-stone-700"
              >
                <option value="1">Siguiente día (Inmediato)</option>
                <option value="2">48 Horas hábiles</option>
                <option value="3">72 Horas hábiles</option>
              </select>
            </div>

            <button 
              type="submit"
              className="w-full py-2.5 bg-[#624A3E] hover:bg-[#503C32] text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer"
            >
              Vincular Distribuidor
            </button>
          </form>
        </div>

        {/* Right 3 cols: active suppliers */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs lg:col-span-3 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-stone-100">
            <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#624A3E]" />
              Proveedores e Integraciones de Suministro ({proveedores.length})
            </h3>
            <span className="text-[9px] bg-stone-100 text-stone-500 font-bold px-2 py-0.5 rounded-full">Red de Compra de Alimentos</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {proveedores.map(p => {
              let tagColor = 'bg-stone-100 text-stone-700 border-stone-210';
              if (p.categoria === 'carnes') tagColor = 'bg-red-50 text-red-800 border-red-100';
              if (p.categoria === 'verduras') tagColor = 'bg-emerald-50 text-emerald-800 border-emerald-100';
              if (p.categoria === 'bebidas') tagColor = 'bg-blue-50 text-blue-800 border-blue-100';

              const isOrdering = orderedId === p.id_proveedor;

              return (
                <div key={p.id_proveedor} className="p-4 bg-[#F5F1E9]/40 border border-stone-150 rounded-2xl flex flex-col justify-between hover:bg-[#F5F1E9]/70 transition-colors">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-extrabold text-[#624A3E] text-sm tracking-tight leading-none">{p.nombre}</h4>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${tagColor}`}>
                        {p.categoria}
                      </span>
                    </div>

                    <div className="space-y-1 pt-1 text-xs text-stone-600">
                      <p className="flex items-center gap-1.5 font-medium">
                        <Phone className="w-3.5 h-3.5 text-stone-400" />
                        <strong>{p.contacto}:</strong> {p.telefono}
                      </p>
                      <p className="text-[11px] font-mono opacity-85 text-stone-500 pl-5">{p.correo}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-5 pt-3 border-t border-stone-200/50">
                    <span className="text-[10px] text-stone-500 font-bold">
                      Despacho: <strong>{p.tiempo_entrega_dias} d</strong>
                    </span>
                    <button
                      onClick={() => handlePlaceOrder(p)}
                      disabled={isOrdering}
                      className={`text-[10px] font-black px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                        isOrdering
                          ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/20 animate-pulse'
                          : 'bg-[#624A3E] text-white hover:bg-[#503C32]'
                      }`}
                    >
                      {isOrdering ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-[#22C55E]" />
                          Orden Enviada!
                        </>
                      ) : (
                        'Solicitar Reposición'
                      )}
                    </button>
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
