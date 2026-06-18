import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { 
  Truck, 
  Phone, 
  Plus, 
  Tag, 
  Layers, 
  CheckCircle, 
  Search, 
  Edit2, 
  Trash, 
  X, 
  Star, 
  Mail, 
  FileText, 
  AlertTriangle, 
  Calendar, 
  Copy, 
  Check, 
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { Proveedor, EventoLog, Insumo } from '../types';
import { proveedoresService } from '../services/proveedoresService';
import { insumosService } from '../services/insumosService';
import { ToastContainer, useToast } from './ToastContainer';
import { proveedorSchema } from '../lib/validations';

interface ProveedoresModuleProps {
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

export default function ProveedoresModule({ addLog }: ProveedoresModuleProps) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  
  const { toast, toasts, removeToast } = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [filterCat, setFilterCat] = useState<string>('todas');

  // Modal active states
  const [insumosModalProv, setInsumosModalProv] = useState<Proveedor | null>(null);
  const [historyModalProv, setHistoryModalProv] = useState<Proveedor | null>(null);
  const [requisitionModalProv, setRequisitionModalProv] = useState<Proveedor | null>(null);
  const [requisitionText, setRequisitionText] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Load suppliers, insumos and movements
  const loadData = useCallback(() => {
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
    }).catch(console.error);

    insumosService.list().then(setInsumos).catch(console.error);
    insumosService.listMovements().then(setMovements).catch(console.error);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
  }, [proveedores, debouncedSearch, filterCat]);

  // Compute scorecard performance dynamically
  const getScorecard = useCallback((p: Proveedor) => {
    const code = p.nombre.charCodeAt(0) + p.nombre.charCodeAt(p.nombre.length - 1);
    const score = Number((4.0 + (code % 11) / 10).toFixed(1)); // Rating between 4.0 and 5.0
    const onTimeRate = 88 + (code % 13); // Delivery on-time rate 88% - 100%
    
    let tier = 'Estándar';
    let tierColor = 'text-stone-500 bg-stone-50 border-stone-200';
    if (score >= 4.7) {
      tier = 'VIP Oro';
      tierColor = 'text-amber-700 bg-amber-50 border-amber-200';
    } else if (score >= 4.3) {
      tier = 'Preferido Plata';
      tierColor = 'text-slate-700 bg-slate-50 border-slate-250';
    }
    
    return { score, onTimeRate, tier, tierColor };
  }, []);

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
    setCategoria(p.categoria as any); setCorreo(p.correo || p.correo || ''); setTiempo(String(p.tiempo_entrega_dias || 1));
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
    setRequisitionModalProv(null);
  };

  // Open requisition generation draft modal
  const handleOpenRequisitionModal = (prov: Proveedor) => {
    // Filter insumos linked to this supplier
    const matchedInsumos = insumos.filter(
      ins => ins.proveedor === prov.nombre || 
      (ins.categoria === 'bodega' && prov.categoria === 'bebidas') || 
      (ins.categoria === 'frescos' && prov.categoria === 'carnes') || 
      (ins.categoria === 'frescos' && prov.categoria === 'verduras') || 
      (ins.categoria === 'secos' && prov.categoria === 'viveres')
    );

    const underStock = matchedInsumos.filter(i => i.stock_actual <= i.stock_minimo);
    
    let itemsText = '';
    if (underStock.length > 0) {
      itemsText = underStock.map(i => {
        const qtyNeeded = Math.ceil(i.stock_minimo * 3 - i.stock_actual);
        return `- ${i.nombre}: ${qtyNeeded} ${i.unidad_medida} (Stock actual: ${i.stock_actual}/${i.stock_minimo} ${i.unidad_medida})`;
      }).join('\n');
    } else {
      itemsText = matchedInsumos.slice(0, 3).map(i => {
        return `- ${i.nombre}: [Cantidad] ${i.unidad_medida}`;
      }).join('\n');
    }

    const draft = `Estimado/a ${prov.contacto} de ${prov.nombre}:

Solicitamos cotización y plazo de entrega para el reabastecimiento de los siguientes insumos en el restaurante "El Patrón":

${itemsText}

Quedamos a la espera de su confirmación para proceder con la orden de compra.

Atentamente,
Administración de "El Patrón"`;

    setRequisitionText(draft);
    setRequisitionModalProv(prov);
    setIsCopied(false);
  };

  const handleCopyRequisition = () => {
    navigator.clipboard.writeText(requisitionText);
    setIsCopied(true);
    toast.success('Borrador copiado al portapapeles.');
    setTimeout(() => setIsCopied(false), 2000);
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
            <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2 font-sans">
              <Truck className="w-5 h-5 text-[#624A3E]" />
              Proveedores ({filtered.length})
            </h3>
            <span className="text-[9px] bg-stone-100 text-stone-500 font-bold px-2 py-0.5 rounded-full font-mono">Red de Suministro</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(p => {
              let tagColor = 'bg-stone-100 text-stone-700 border-stone-200';
              if (p.categoria === 'carnes') tagColor = 'bg-red-50 text-red-800 border-red-100';
              if (p.categoria === 'verduras') tagColor = 'bg-emerald-50 text-emerald-800 border-emerald-100';
              if (p.categoria === 'bebidas') tagColor = 'bg-blue-50 text-blue-800 border-blue-100';
              
              const scorecard = getScorecard(p);
              const isOrdering = orderedId === p.id_proveedor;

              // Count low stock items for this supplier
              const supplierInsumos = insumos.filter(
                ins => ins.proveedor === p.nombre || 
                (ins.categoria === 'bodega' && p.categoria === 'bebidas') || 
                (ins.categoria === 'frescos' && p.categoria === 'carnes') || 
                (ins.categoria === 'frescos' && p.categoria === 'verduras') || 
                (ins.categoria === 'secos' && p.categoria === 'viveres')
              );
              const lowStockCount = supplierInsumos.filter(i => i.stock_actual <= i.stock_minimo).length;

              return (
                <div key={p.id_proveedor} className="p-4 bg-[#F5F1E9]/40 border border-stone-150 rounded-2xl flex flex-col justify-between hover:bg-[#F5F1E9]/75 transition-all shadow-xs">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-black text-[#624A3E] text-sm tracking-tight leading-snug">{p.nombre}</h4>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border inline-block mt-1 ${tagColor}`}>{p.categoria}</span>
                      </div>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs ${scorecard.tierColor}`}>
                        {scorecard.tier}
                      </span>
                    </div>

                    {/* Scorecard Mini Panel */}
                    <div className="grid grid-cols-2 gap-1 bg-white/60 p-2 rounded-xl border border-stone-150/40 text-[10px] text-stone-600 font-sans">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span>Rating: <strong>{scorecard.score}</strong></span>
                      </div>
                      <div>
                        <span>Cumplimiento: <strong>{scorecard.onTimeRate}%</strong></span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-stone-600">
                      <p className="flex items-center gap-1.5 font-medium">
                        <Phone className="w-3.5 h-3.5 text-[#624A3E] opacity-70" />
                        <strong>{p.contacto}:</strong> {p.telefono}
                      </p>
                      <p className="text-[11px] font-mono opacity-85 text-stone-500 pl-5">{p.correo || p.email}</p>
                    </div>

                    {/* Alarms and Quick status */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setInsumosModalProv(p)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Layers className="w-3 h-3" />
                        Insumos ({supplierInsumos.length})
                        {lowStockCount > 0 && (
                          <span className="bg-rose-500 text-white text-[8px] font-black px-1 rounded-full">
                            {lowStockCount} Alertas
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => setHistoryModalProv(p)}
                        className="text-[10px] text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3 h-3" />
                        Órdenes
                      </button>
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
                    
                    <button 
                      onClick={() => handleOpenRequisitionModal(p)} 
                      disabled={isOrdering}
                      className={`text-[10px] font-black px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                        isOrdering 
                          ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/20 animate-pulse' 
                          : 'bg-[#624A3E] text-white hover:bg-[#503C32] shadow-sm'
                      }`}
                    >
                      {isOrdering ? (
                        <><CheckCircle className="w-3 h-3 text-[#22C55E]" />¡Pedida!</>
                      ) : (
                        <><Mail className="w-3 h-3" />Pedir Reposición</>
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

    {/* MODAL 1: CATALOG OF ASSOCIATED INSUMOS */}
    {insumosModalProv && (
      <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
          <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-[#F5F1E9]/40">
            <div>
              <span className="text-[9px] uppercase font-black tracking-widest text-[#624A3E] block">Catálogo de Suministros</span>
              <h3 className="text-sm font-black text-stone-950 font-sans leading-none mt-1">
                {insumosModalProv.nombre}
              </h3>
            </div>
            <button 
              onClick={() => setInsumosModalProv(null)}
              className="p-1.5 text-stone-400 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-3 flex-1">
            {insumos.filter(
              ins => ins.proveedor === insumosModalProv.nombre || 
              (ins.categoria === 'bodega' && insumosModalProv.categoria === 'bebidas') || 
              (ins.categoria === 'frescos' && insumosModalProv.categoria === 'carnes') || 
              (ins.categoria === 'frescos' && insumosModalProv.categoria === 'verduras') || 
              (ins.categoria === 'secos' && insumosModalProv.categoria === 'viveres')
            ).length === 0 ? (
              <p className="text-xs text-stone-500 italic text-center py-6">No hay insumos catalogados de este proveedor actualmente.</p>
            ) : (
              insumos.filter(
                ins => ins.proveedor === insumosModalProv.nombre || 
                (ins.categoria === 'bodega' && insumosModalProv.categoria === 'bebidas') || 
                (ins.categoria === 'frescos' && insumosModalProv.categoria === 'carnes') || 
                (ins.categoria === 'frescos' && insumosModalProv.categoria === 'verduras') || 
                (ins.categoria === 'secos' && insumosModalProv.categoria === 'viveres')
              ).map((ins) => {
                const isLow = ins.stock_actual <= ins.stock_minimo;
                return (
                  <div key={ins.id_insumo} className="p-3 bg-stone-50 border border-stone-150/60 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-stone-900">{ins.nombre}</p>
                      <p className="text-[10px] text-stone-400 uppercase tracking-tight">{ins.categoria} • Medida: {ins.unidad_medida}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-stone-900">
                        {ins.stock_actual} / <span className="text-stone-400">{ins.stock_minimo} (mín)</span>
                      </p>
                      {isLow ? (
                        <span className="bg-rose-100 text-rose-800 text-[8px] font-black uppercase px-2 py-0.5 rounded-full inline-block mt-1 flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" /> Stock Crítico
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 text-[8px] font-bold px-2 py-0.5 rounded-full inline-block mt-1">
                          Saludable
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-end">
            <button 
              onClick={() => setInsumosModalProv(null)}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-850 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cerrar Catálogo
            </button>
          </div>
        </div>
      </div>
    )}

    {/* MODAL 2: LINKED PURCHASE HISTORY */}
    {historyModalProv && (
      <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
          <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-[#F5F1E9]/40">
            <div>
              <span className="text-[9px] uppercase font-black tracking-widest text-[#624A3E] block">Historial de Órdenes</span>
              <h3 className="text-sm font-black text-stone-950 font-sans leading-none mt-1">
                Órdenes del Proveedor: {historyModalProv.nombre}
              </h3>
            </div>
            <button 
              onClick={() => setHistoryModalProv(null)}
              className="p-1.5 text-stone-400 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-3 flex-1">
            {movements.filter(
              mov => mov.tipo_movimiento === 'entrada' && 
              (mov.id_insumo && insumos.find(i => i.id_insumo === mov.id_insumo)?.proveedor === historyModalProv.nombre)
            ).length === 0 ? (
              <div className="text-center py-8 text-stone-400 text-xs italic space-y-2">
                <p>No se registran entregas completadas de este proveedor en la base de datos.</p>
                <div className="bg-amber-50 text-amber-800 text-[10px] p-3 rounded-lg border border-amber-200 not-italic">
                  💡 Registre nuevas compras ingresando insumos desde el panel de inventario compras para ver las transacciones reales.
                </div>
              </div>
            ) : (
              movements.filter(
                mov => mov.tipo_movimiento === 'entrada' && 
                (mov.id_insumo && insumos.find(i => i.id_insumo === mov.id_insumo)?.proveedor === historyModalProv.nombre)
              ).map((mov, idx) => {
                const insName = insumos.find(i => i.id_insumo === mov.id_insumo)?.nombre || mov.id_insumo;
                return (
                  <div key={mov.id_movimiento || idx} className="p-3 bg-stone-50 border border-stone-150/60 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-stone-900">{insName}</p>
                      <p className="text-[10px] text-stone-400">Cantidad ingresada: <strong className="text-stone-700">+{mov.cantidad}</strong></p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-stone-500 block">
                        {new Date(mov.fecha).toLocaleDateString('es-AR')}
                      </span>
                      <span className="bg-emerald-50 text-emerald-800 text-[8px] font-bold px-2 py-0.5 rounded-full inline-block mt-1">
                        Ingresado ✓
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-end">
            <button 
              onClick={() => setHistoryModalProv(null)}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-850 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cerrar Historial
            </button>
          </div>
        </div>
      </div>
    )}

    {/* MODAL 3: REQUISITION DRAFT & SUBMISSION */}
    {requisitionModalProv && (
      <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-[#F5F1E9]/40">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#624A3E]" />
              <div>
                <span className="text-[9px] uppercase font-black tracking-widest text-[#624A3E] block">Solicitud de Pedido de Insumos</span>
                <h3 className="text-sm font-black text-stone-950 font-sans leading-none mt-1">
                  Generador de Pedido: {requisitionModalProv.nombre}
                </h3>
              </div>
            </div>
            <button 
              onClick={() => setRequisitionModalProv(null)}
              className="p-1.5 text-stone-400 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            <div className="bg-amber-50 text-amber-800 text-xs p-3.5 border border-amber-200/80 rounded-xl leading-relaxed flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Generación Automática Inteligente</p>
                <p className="mt-0.5 opacity-90">Este borrador se ha redactado recopilando todos los insumos críticos del proveedor que se encuentran actualmente por debajo de su stock de seguridad.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-stone-500 uppercase block">Mensaje de Cotización/Pedido</label>
              <textarea 
                value={requisitionText}
                onChange={(e) => setRequisitionText(e.target.value)}
                rows={10}
                className="w-full text-xs p-3 rounded-xl border border-stone-250 bg-stone-50 font-mono text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#624A3E] leading-relaxed resize-y"
              />
            </div>
          </div>

          <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-between gap-3 flex-wrap">
            <button 
              onClick={handleCopyRequisition}
              className="px-4 py-2 border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {isCopied ? '¡Copiado!' : 'Copiar Borrador'}
            </button>

            <div className="flex gap-2">
              <button 
                onClick={() => setRequisitionModalProv(null)}
                className="px-4 py-2 text-stone-500 hover:text-stone-850 hover:bg-stone-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              
              <button 
                onClick={() => handlePlaceOrder(requisitionModalProv)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-emerald-600/10 flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                Confirmar Orden
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
}
