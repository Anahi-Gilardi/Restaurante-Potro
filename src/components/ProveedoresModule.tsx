import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { Truck, Phone, Plus, Tag, Layers, CheckCircle, Search, Edit2, Trash, X } from 'lucide-react';
import { Proveedor, EventoLog } from '../types';
import { proveedoresService } from '../services/proveedoresService';
import { ToastContainer, useToast } from './ToastContainer';
import { proveedorSchema } from '../lib/validations';

interface ProveedoresModuleProps {
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

export default function ProveedoresModule({ addLog }: ProveedoresModuleProps) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const { toast, toasts, removeToast } = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [filterCat, setFilterCat] = useState<string>('todas');

  useEffect(() => {
    proveedoresService.list().then(data => {
      if (data && data.length > 0) { setProveedores(data); }
      else {
        setProveedores([
          { id_proveedor: 'prov_1', nombre: 'Frigorífico Central Sur S.A.', contacto: 'Federico Balestra', telefono: '+54 11 4488-2993', categoria: 'carnes', correo: 'pedidos@frigorificosursas.com', tiempo_entrega_dias: 1 },
          { id_proveedor: 'prov_2', nombre: 'Distribuidora Agrícola Verde Fresco', contacto: 'Laura Benítez', telefono: '+54 9 11 3998-2831', categoria: 'verduras', correo: 'ventas@verdefrescodist.com', tiempo_entrega_dias: 1 },
          { id_proveedor: 'prov_3', nombre: 'Bebidas Unidas S.R.L. Bodegas', contacto: 'Esteban Rutini', telefono: '+54 11 5003-8822', categoria: 'bebidas', correo: 'erutini@bebidasunidas.com', tiempo_entrega_dias: 2 },
          { id_proveedor: 'prov_4', nombre: 'Almacén Mayorista El Trébol', contacto: 'Jorge Alvarenga', telefono: '+54 11 4055-1212', categoria: 'viveres', correo: 'j.alvarenga@trebolsecos.com.ar', tiempo_entrega_dias: 3 },
          { id_proveedor: 'prov_5', nombre: 'Envases & Descartables Oeste', contacto: 'Damián Sabor', telefono: '+54 9 11 6554-1010', categoria: 'descartables', correo: 'dsabor@envasesoeste.com', tiempo_entrega_dias: 2 },
        ]);
      }
    }).catch(() => {});
  }, []);

  const [nombre, setNombre] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [categoria, setCategoria] = useState<'carnes' | 'verduras' | 'bebidas' | 'viveres' | 'descartables'>('carnes');
  const [correo, setCorreo] = useState('');
  const [tiempo, setTiempo] = useState('1');
  const [orderedId, setOrderedId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return proveedores.filter(p => {
      const matchSearch = p.nombre.toLowerCase().includes(debouncedSearch.toLowerCase()) || p.contacto.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchCat = filterCat === 'todas' || p.categoria === filterCat;
      return matchSearch && matchCat;
    });
  }, [proveedores, search, filterCat]);

  const handleCreateProveedor = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = proveedorSchema.safeParse({ nombre, contacto, telefono, correo, categoria, tiempo_entrega_dias: parseInt(tiempo) || 1 });
    if (!validation.success) {
      const msgs = validation.error.issues.map(i => i.message).join('. ');
      toast.error(msgs);
      return;
    }
    const newProv: Proveedor = {
      id_proveedor: `prov_${Date.now()}`,
      nombre, contacto, telefono, categoria,
      correo: correo || 'contacto@proveedor.com',
      tiempo_entrega_dias: parseInt(tiempo) || 1
    };
    setProveedores(prev => [...prev, newProv]);
    proveedoresService.create(newProv).catch(() => toast.warning('El proveedor quedó disponible localmente, pero no pudo sincronizarse.'));
    addLog('sistema', `PROVEEDORES: Incorporado nuevo proveedor '${nombre}' categoría: ${categoria.toUpperCase()}`);
    setNombre(''); setContacto(''); setTelefono(''); setCorreo('');
  };

  const handleEdit = (p: Proveedor) => {
    setEditingId(p.id_proveedor);
    setNombre(p.nombre); setContacto(p.contacto); setTelefono(p.telefono);
    setCategoria(p.categoria as any); setCorreo(p.correo || ''); setTiempo(String(p.tiempo_entrega_dias || 1));
  };

  const handleSaveEdit = () => {
    if (!editingId || !nombre || !contacto) return;
    const updated = proveedores.map(p => {
      if (p.id_proveedor === editingId) {
        const changed = { ...p, nombre, contacto, telefono, categoria, correo: correo || p.correo, tiempo_entrega_dias: parseInt(tiempo) || 1 };
        proveedoresService.update(editingId, changed).catch(() => {});
        addLog('sistema', `PROVEEDORES: Modificado proveedor '${p.nombre}'`);
        return changed;
      }
      return p;
    });
    setProveedores(updated);
    setEditingId(null);
    setNombre(''); setContacto(''); setTelefono(''); setCorreo(''); setTiempo('1');
    toast.success('Proveedor actualizado.');
  };

  const handleDelete = (id: string) => {
    const target = proveedores.find(p => p.id_proveedor === id);
    if (!target) return;
    setProveedores(prev => prev.filter(p => p.id_proveedor !== id));
    proveedoresService.remove(id).catch(() => {});
    addLog('sistema', `PROVEEDORES: Eliminado proveedor '${target.nombre}'`);
    setDeleteConfirmId(null);
    toast.success('Proveedor eliminado.');
  };

  const handlePlaceOrder = (prov: Proveedor) => {
    setOrderedId(prov.id_proveedor);
    addLog('sistema', `REPOSICIÓN: Solicitud de reabastecimiento enviada a '${prov.nombre}'. Reaprovisionamiento estimado en ${prov.tiempo_entrega_dias} día(s).`);
    toast.success(`Solicitud enviada a ${prov.nombre}.`);
    setTimeout(() => setOrderedId(null), 3000);
  };

  const categories = ['carnes', 'verduras', 'bebidas', 'viveres', 'descartables'];

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar proveedor o contacto..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#624A3E]" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['todas', ...categories].map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase cursor-pointer border transition-all ${
                filterCat === c ? 'bg-[#624A3E] text-white border-[#624A3E]' : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4 h-fit">
          <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#624A3E]" />
            {editingId ? 'Editar Proveedor' : 'Adicionar Proveedor'}
          </h3>
          <form onSubmit={editingId ? (e => { e.preventDefault(); handleSaveEdit(); }) : handleCreateProveedor} className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Razón Social</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Ej. Frigorífico Central S.A."
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]" required />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Nombre de Contacto</label>
              <input type="text" value={contacto} onChange={e => setContacto(e.target.value)}
                placeholder="Ej. Federico Balestra"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]" required />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Teléfono Directo</label>
              <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)}
                placeholder="Ej. +54 11 4488-2993"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]" required />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Correo Electrónico</label>
              <input type="email" value={correo} onChange={e => setCorreo(e.target.value)}
                placeholder="pedidos@empresa.com"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]" />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Categoría</label>
              <select value={categoria} onChange={e => setCategoria(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none cursor-pointer focus:ring-1 focus:ring-[#624A3E] font-semibold text-stone-700">
                <option value="carnes">Cortes de Carnes y Frescos</option>
                <option value="verduras">Verduras y Frutas del Día</option>
                <option value="bebidas">Vinos, Agua y Gaseosas</option>
                <option value="viveres">Secos, Cereales y Especias</option>
                <option value="descartables">Laminados, Cajas y Packaging</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Plazo de Despacho</label>
              <select value={tiempo} onChange={e => setTiempo(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none cursor-pointer focus:ring-1 focus:ring-[#624A3E] font-semibold text-stone-700">
                <option value="1">Siguiente día (Inmediato)</option>
                <option value="2">48 Horas hábiles</option>
                <option value="3">72 Horas hábiles</option>
              </select>
            </div>
            <button type="submit"
              className="w-full py-2.5 bg-[#624A3E] hover:bg-[#503C32] text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer">
              {editingId ? 'Guardar Cambios' : 'Vincular Distribuidor'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setNombre(''); setContacto(''); setTelefono(''); setCorreo(''); setTiempo('1'); }}
                className="w-full py-2 text-xs font-bold text-stone-500 hover:text-stone-700 transition-colors cursor-pointer">
                Cancelar edición
              </button>
            )}
          </form>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs lg:col-span-3 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-stone-100">
            <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#624A3E]" />
              Proveedores ({filtered.length})
            </h3>
            <span className="text-[9px] bg-stone-100 text-stone-500 font-bold px-2 py-0.5 rounded-full">Red de Suministro</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(p => {
              let tagColor = 'bg-stone-100 text-stone-700 border-stone-210';
              if (p.categoria === 'carnes') tagColor = 'bg-red-50 text-red-800 border-red-100';
              if (p.categoria === 'verduras') tagColor = 'bg-emerald-50 text-emerald-800 border-emerald-100';
              if (p.categoria === 'bebidas') tagColor = 'bg-blue-50 text-blue-800 border-blue-100';
              const isOrdering = orderedId === p.id_proveedor;

              return (
                <div key={p.id_proveedor} className="p-4 bg-[#F5F1E9]/40 border border-stone-200 rounded-2xl flex flex-col justify-between hover:bg-[#F5F1E9]/70 transition-colors">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-extrabold text-[#624A3E] text-sm tracking-tight leading-none">{p.nombre}</h4>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${tagColor}`}>{p.categoria}</span>
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
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-stone-500 font-bold">Despacho: <strong>{p.tiempo_entrega_dias} d</strong></span>
                      <button onClick={() => handleEdit(p)} className="p-1 text-stone-400 hover:text-blue-500 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer" title="Editar">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      {deleteConfirmId === p.id_proveedor ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(p.id_proveedor)} className="p-1 text-red-500 hover:text-red-700 bg-red-50 rounded cursor-pointer"><CheckCircle className="w-3 h-3" /></button>
                          <button onClick={() => setDeleteConfirmId(null)} className="p-1 text-stone-400 rounded cursor-pointer"><X className="w-3 h-3" /></button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirmId(p.id_proveedor)} className="p-1 text-stone-400 hover:text-red-500 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer" title="Eliminar">
                          <Trash className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <button onClick={() => handlePlaceOrder(p)} disabled={isOrdering}
                      className={`text-[10px] font-black px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                        isOrdering ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/20 animate-pulse' : 'bg-[#624A3E] text-white hover:bg-[#503C32]'}`}>
                      {isOrdering ? <><CheckCircle className="w-3 h-3 text-[#22C55E]" />Orden Enviada!</> : 'Solicitar Reposición'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
}
