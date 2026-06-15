import React, { useState, useEffect, useMemo } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { UtensilsCrossed, Plus, Search, Edit2, Check, RefreshCw, Copy, X, DollarSign } from 'lucide-react';
import BulkPriceEditor from './BulkPriceEditor';
import { ProductoMenu, EventoLog } from '../types';
import { menuService } from '../services/menuService';

interface MenuModuleProps {
  productosMenu: ProductoMenu[];
  onProductosChange: (productos: ProductoMenu[]) => void;
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

export default function MenuModule({ productosMenu, onProductosChange, addLog }: MenuModuleProps) {
  const [items, setItems] = useState<ProductoMenu[]>(productosMenu);

  useEffect(() => {
    setItems(productosMenu);
  }, [productosMenu]);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todos');
  const [showBulkEditor, setShowBulkEditor] = useState(false);

  // Add Item state
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState<string>('Entradas');
  const [imagenUrl, setImagenUrl] = useState('');

  // Full edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrecio, setEditPrecio] = useState('');
  const [editNombre, setEditNombre] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editCategoria, setEditCategoria] = useState('');
  const [editImagen, setEditImagen] = useState('');

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(precio);
    if (!nombre.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0) return;

    const normalizedCategoria = categoria.toLowerCase();
    const fallbackImg = (normalizedCategoria === 'bebidas' || normalizedCategoria === 'bodega')
      ? 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80'
      : normalizedCategoria === 'postres'
        ? 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'
        : 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80';

    const tipo = normalizedCategoria === 'bebidas'
      ? 'bebida'
      : normalizedCategoria === 'bodega'
        ? 'vino'
        : normalizedCategoria === 'postres'
          ? 'postre'
          : 'plato';

    const requiere_cocina = !(normalizedCategoria === 'bebidas' || normalizedCategoria === 'bodega');

    const newItem: ProductoMenu = {
      id_producto: `prod_custom_${Date.now()}`,
      nombre,
      descripcion: descripcion || `${nombre} elaborado con ingredientes selectos.`,
      precio_venta: parsedPrice,
      categoria,
      activo: true,
      imagen: imagenUrl || fallbackImg,
      tipo,
      requiere_cocina,
      tiempo_preparacion_estimado: requiere_cocina ? 12 : undefined
    };

    setItems(prev => {
      const next = [newItem, ...prev];
      onProductosChange(next);
      return next;
    });
    menuService.create(newItem).catch(err => console.error(err));
    addLog('sistema', `MENÚ: Creado nuevo platillo/bebida '${nombre}' con precio de venta $${precio}`);
    setNombre('');
    setPrecio('');
    setImagenUrl('');
  };

  const handleToggleActivo = (id: string) => {
    setItems(prev => {
      const next = prev.map(item => {
      if (item.id_producto === id) {
        const nextState = !item.activo;
        menuService.update(id, { activo: nextState }).catch(err => console.error(err));
        addLog('sistema', `MENÚ: Cambiado estado de '${item.nombre}' a ${nextState ? 'ACTIVO' : 'INACTIVO'}`);
        return { ...item, activo: nextState };
      }
      return item;
      });
      onProductosChange(next);
      return next;
    });
  };

  const handleStartEditing = (item: ProductoMenu) => {
    setEditingId(item.id_producto);
    setEditPrecio(item.precio_venta.toString());
    setEditNombre(item.nombre);
    setEditDescripcion(item.descripcion || '');
    setEditCategoria(item.categoria);
    setEditImagen(item.imagen || '');
  };

  const handleSaveEdit = (id: string) => {
    const parsedPrice = parseFloat(editPrecio);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0 || !editNombre.trim()) return;

    setItems(prev => {
      const next = prev.map(item => {
      if (item.id_producto === id) {
        const updated: any = { precio_venta: parsedPrice, nombre: editNombre.trim(), descripcion: editDescripcion.trim(), categoria: editCategoria, imagen: editImagen };
        menuService.update(id, updated).catch(err => console.error(err));
        addLog('sistema', `MENÚ: Actualizado '${item.nombre}' → '${editNombre}' ($${parsedPrice})`);
        return { ...item, ...updated };
      }
      return item;
      });
      onProductosChange(next);
      return next;
    });
    setEditingId(null);
  };

  const handleDuplicateItem = (item: ProductoMenu) => {
    const dup: ProductoMenu = {
      ...item,
      id_producto: `prod_dup_${Date.now()}`,
      nombre: `${item.nombre} (copia)`,
      activo: true,
    };
    setItems(prev => {
      const next = [dup, ...prev];
      onProductosChange(next);
      return next;
    });
    menuService.create(dup).catch(err => console.error(err));
    addLog('sistema', `MENÚ: Duplicado '${item.nombre}' como '${dup.nombre}'`);
  };

  // Filter items
  const filtered = useMemo(() => items.filter(item => {
    const matchesSearch = item.nombre.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesCat = selectedCategoria === 'todos' || item.categoria === selectedCategoria;
    return matchesSearch && matchesCat;
  }), [items, debouncedSearch, selectedCategoria]);

  return (
    <div className="space-y-6">
      {/* Bulk editor toggle */}
      <div className="flex gap-2">
        <button onClick={() => setShowBulkEditor(false)}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer border ${
            !showBulkEditor ? 'bg-[#624A3E] text-white border-[#624A3E]' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
          <UtensilsCrossed className="w-3.5 h-3.5 inline mr-1" /> Catálogo
        </button>
        <button onClick={() => setShowBulkEditor(true)}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer border ${
            showBulkEditor ? 'bg-[#624A3E] text-white border-[#624A3E]' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
          <DollarSign className="w-3.5 h-3.5 inline mr-1" /> Precios Masivos
        </button>
      </div>

      {showBulkEditor ? (
        <BulkPriceEditor items={items} onItemsChange={onProductosChange} addLog={addLog} />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left col: Add new Item */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#624A3E]" />
            Nuevo Plato / Bebida
          </h3>
          <form onSubmit={handleCreateItem} className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">Nombre Comercial</label>
              <input 
                type="text" 
                value={nombre} 
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej. Ojo de Bife Criollo"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">Precio de Venta ($)</label>
              <input 
                type="number" 
                value={precio} 
                onChange={e => setPrecio(e.target.value)}
                placeholder="Ej. 18500"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">Descripción</label>
              <textarea 
                value={descripcion} 
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Ingredientes u observaciones..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E] resize-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">Categoría</label>
              <select 
                value={categoria} 
                onChange={e => setCategoria(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E] cursor-pointer font-bold text-stone-700"
              >
                <option value="Entradas">Entradas</option>
                <option value="Pastas">Pastas</option>
                <option value="Carnes">Carnes</option>
                <option value="Pescados">Pescados</option>
                <option value="Comidas Criollas">Comidas Criollas</option>
                <option value="Postres">Postres</option>
                <option value="Bebidas">Bebidas</option>
                <option value="Bodega">Bodega</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">URL de Imagen (Opcional)</label>
              <input 
                type="url" 
                value={imagenUrl} 
                onChange={e => setImagenUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
              />
            </div>
            <button 
              type="submit"
              className="w-full py-2.5 bg-[#624A3E] hover:bg-[#503C32] text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-[#624A3E]/10 cursor-pointer"
            >
              Registrar en Carta
            </button>
          </form>
        </div>

        {/* Right 3 cols: Filter list */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs lg:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-stone-100">
            <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-[#624A3E]" />
              Catálogo de Menú ({filtered.length})
            </h3>

            {/* Filter tags */}
            <div className="flex flex-wrap gap-1">
              {(['todos', 'Entradas', 'Pastas', 'Carnes', 'Pescados', 'Comidas Criollas', 'Postres', 'Bebidas', 'Bodega'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoria(cat)}
                  className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wide cursor-pointer transition-all border ${
                    selectedCategoria === cat
                      ? 'bg-[#624A3E] text-white border-[#5d3a2e]'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {cat === 'todos' ? 'Todos' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar platillo, vino o postre comercial..."
              className="w-full text-xs pl-9 pr-4 py-3 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(item => (
              <div 
                key={item.id_producto} 
                className={`p-3 bg-[#F5F1E9]/30 border rounded-2xl flex gap-3 transition-colors hover:bg-[#F5F1E9]/60 ${
                  item.activo ? 'border-stone-150' : 'border-rose-105 bg-rose-50/10 opacity-70'
                }`}
              >
                <img 
                  src={item.imagen} 
                  alt={item.nombre} 
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-xl object-cover shrink-0 bg-stone-100 border border-stone-200"
                />
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-black uppercase text-[#624A3E]">{item.categoria}</span>
                    <h4 className="text-xs font-extrabold text-stone-900 tracking-tight leading-snug truncate" title={item.nombre}>{item.nombre}</h4>
                    {item.descripcion && (
                      <p className="text-[10px] text-stone-500 leading-snug line-clamp-2 mt-0.5" title={item.descripcion}>
                        {item.descripcion}
                      </p>
                    )}
                    
                    {editingId === item.id_producto ? (
                      <div className="space-y-2 mt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-stone-700">$</span>
                          <input type="number" value={editPrecio} onChange={e => setEditPrecio(e.target.value)}
                            className="w-16 text-xs p-1 border border-stone-300 rounded bg-white text-stone-800 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#624A3E]" />
                        </div>
                        <input type="text" value={editNombre} onChange={e => setEditNombre(e.target.value)}
                          className="w-full text-[10px] p-1 border border-stone-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#624A3E]" />
                        <textarea value={editDescripcion} onChange={e => setEditDescripcion(e.target.value)} rows={2}
                          className="w-full text-[10px] p-1 border border-stone-300 rounded bg-white resize-none focus:outline-none focus:ring-1 focus:ring-[#624A3E]" />
                        <select value={editCategoria} onChange={e => setEditCategoria(e.target.value)}
                          className="w-full text-[10px] p-1 border border-stone-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#624A3E]">
                          {['Entradas','Pastas','Carnes','Pescados','Comidas Criollas','Postres','Bebidas','Bodega'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="flex gap-1.5">
                          <button onClick={() => handleSaveEdit(item.id_producto)}
                            className="p-1 rounded bg-[#22C55E]/15 hover:bg-[#22C55E]/20 text-[#22C55E] cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditingId(null)}
                            className="p-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-500 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-stone-850 font-mono tracking-tight">${item.precio_venta.toLocaleString('es-AR')}</span>
                        <button onClick={() => handleStartEditing(item)}
                          className="p-1 px-1.5 rounded hover:bg-stone-200/50 text-stone-400 hover:text-stone-750 transition-colors cursor-pointer text-[10px]">
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-200/40 mt-1">
                    <button onClick={() => handleDuplicateItem(item)}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors bg-stone-50 hover:bg-stone-100 text-stone-500 flex items-center gap-1">
                      <Copy className="w-2.5 h-2.5" /> Duplicar
                    </button>
                    <div className="flex items-center gap-1">
                    <span className={`text-[9px] font-bold ${item.activo ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {item.activo ? '● En carta' : '● Pausado'}
                    </span>
                    <button 
                      onClick={() => handleToggleActivo(item.id_producto)}
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                        item.activo 
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-600' 
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                      }`}
                    >
                      {item.activo ? 'Retirar' : 'Habilitar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            ))}
          </div>

        </div>

      </div>
      )}
    </div>
  );
}
