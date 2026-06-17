import React, { useEffect, useMemo, useState } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { UtensilsCrossed, Plus, Search, Edit2, Check, Copy, X, DollarSign } from 'lucide-react';
import BulkPriceEditor from './BulkPriceEditor';
import { CardSkeleton } from './Skeleton';
import { ProductoMenu, EventoLog } from '../types';
import { menuService } from '../services/menuService';
import { menuItemSchema } from '../lib/validations';
import { ToastContainer, useToast } from './ToastContainer';

interface MenuModuleProps {
  productosMenu: ProductoMenu[];
  onProductosChange: (productos: ProductoMenu[]) => void;
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

type PendingAction = 'create' | `toggle_${string}` | `edit_${string}` | `duplicate_${string}`;

const CATEGORIAS = ['Entradas', 'Pastas', 'Carnes', 'Pescados', 'Comidas Criollas', 'Postres', 'Bebidas', 'Bodega'] as const;
const FILTER_CATEGORIAS = ['todos', ...CATEGORIAS] as const;

const normalizeText = (value: string) => value.trim().toLowerCase();

const inferTipo = (categoria: string): ProductoMenu['tipo'] => {
  const normalized = normalizeText(categoria);
  if (normalized === 'bebidas') return 'bebida';
  if (normalized === 'bodega') return 'vino';
  if (normalized === 'postres') return 'postre';
  return 'plato';
};

const getFallbackImage = (categoria: string) => {
  const normalized = normalizeText(categoria);
  if (normalized === 'bebidas' || normalized === 'bodega') {
    return 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80';
  }
  if (normalized === 'postres') {
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80';
  }
  return 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80';
};

export default function MenuModule({ productosMenu, onProductosChange, addLog }: MenuModuleProps) {
  const [items, setItems] = useState<ProductoMenu[]>(productosMenu);
  const { toast, toasts, removeToast } = useToast();

  useEffect(() => {
    setItems(productosMenu);
  }, [productosMenu]);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todos');
  const [showBulkEditor, setShowBulkEditor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState<string>('Entradas');
  const [imagenUrl, setImagenUrl] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrecio, setEditPrecio] = useState('');
  const [editNombre, setEditNombre] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editCategoria, setEditCategoria] = useState('');
  const [editImagen, setEditImagen] = useState('');

  const isBusy = pendingAction !== null;

  const syncItems = (next: ProductoMenu[]) => {
    setItems(next);
    onProductosChange(next);
  };

  const resetCreateForm = () => {
    setNombre('');
    setDescripcion('');
    setPrecio('');
    setImagenUrl('');
    setCategoria('Entradas');
  };

  const resetEditForm = () => {
    setEditingId(null);
    setEditPrecio('');
    setEditNombre('');
    setEditDescripcion('');
    setEditCategoria('');
    setEditImagen('');
  };

  const hasDuplicateName = (name: string, excludedId?: string) => (
    items.some(item => item.id_producto !== excludedId && normalizeText(item.nombre) === normalizeText(name))
  );

  const buildMenuItem = (
    id: string,
    values: {
      nombre: string;
      descripcion: string;
      precio: string;
      categoria: string;
      imagen: string;
      activo?: boolean;
    }
  ): ProductoMenu | null => {
    const parsedPrice = Number.parseFloat(values.precio);
    const validation = menuItemSchema.safeParse({
      nombre: values.nombre,
      precio_venta: parsedPrice,
      categoria: values.categoria,
      descripcion: values.descripcion
    });

    if (!validation.success) {
      toast.error(validation.error.issues.map(i => i.message).join('. '));
      return null;
    }

    const clean = validation.data;
    const tipo = inferTipo(clean.categoria);
    const requiereCocina = !(tipo === 'bebida' || tipo === 'vino');

    return {
      id_producto: id,
      nombre: clean.nombre,
      descripcion: clean.descripcion?.trim() || `${clean.nombre} elaborado con ingredientes selectos.`,
      precio_venta: clean.precio_venta,
      categoria: clean.categoria,
      activo: values.activo ?? true,
      imagen: values.imagen.trim() || getFallbackImage(clean.categoria),
      tipo,
      requiere_cocina: requiereCocina,
      tiempo_preparacion_estimado: requiereCocina ? 12 : undefined
    };
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;

    const tempId = `prod_custom_${Date.now()}`;
    const newItem = buildMenuItem(tempId, { nombre, descripcion, precio, categoria, imagen: imagenUrl });
    if (!newItem) return;
    if (hasDuplicateName(newItem.nombre)) {
      toast.warning('Ya existe un producto con ese nombre en la carta.');
      return;
    }

    const previous = items;
    setPendingAction('create');
    syncItems([newItem, ...items]);

    try {
      const saved = await menuService.create(newItem);
      syncItems([saved, ...items]);
      addLog('sistema', `MENU: Creado '${saved.nombre}' con precio de venta $${saved.precio_venta}`);
      toast.success('Producto registrado en carta.');
      resetCreateForm();
    } catch {
      syncItems(previous);
      toast.error('No se pudo registrar el producto. Se revirtio el cambio.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleToggleActivo = async (id: string) => {
    if (isBusy) return;
    const target = items.find(item => item.id_producto === id);
    if (!target) return;

    const previous = items;
    const nextState = !target.activo;
    const optimistic = items.map(item => item.id_producto === id ? { ...item, activo: nextState } : item);

    setPendingAction(`toggle_${id}`);
    syncItems(optimistic);

    try {
      const saved = await menuService.update(id, { activo: nextState });
      syncItems(optimistic.map(item => item.id_producto === id ? { ...item, ...saved } : item));
      addLog('sistema', `MENU: '${target.nombre}' ${nextState ? 'habilitado' : 'retirado'} de la carta`);
      toast.success(nextState ? 'Producto habilitado.' : 'Producto retirado de la carta.');
    } catch {
      syncItems(previous);
      toast.error('No se pudo cambiar el estado del producto. Se revirtio el cambio.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleStartEditing = (item: ProductoMenu) => {
    if (isBusy) return;
    setEditingId(item.id_producto);
    setEditPrecio(item.precio_venta.toString());
    setEditNombre(item.nombre);
    setEditDescripcion(item.descripcion || '');
    setEditCategoria(item.categoria);
    setEditImagen(item.imagen || '');
  };

  const handleSaveEdit = async (id: string) => {
    if (isBusy) return;
    const target = items.find(item => item.id_producto === id);
    if (!target) return;

    const updated = buildMenuItem(id, {
      nombre: editNombre,
      descripcion: editDescripcion,
      precio: editPrecio,
      categoria: editCategoria,
      imagen: editImagen,
      activo: target.activo
    });
    if (!updated) return;
    if (hasDuplicateName(updated.nombre, id)) {
      toast.warning('Ya existe otro producto con ese nombre.');
      return;
    }

    const previous = items;
    const optimistic = items.map(item => item.id_producto === id ? { ...item, ...updated } : item);

    setPendingAction(`edit_${id}`);
    syncItems(optimistic);

    try {
      const saved = await menuService.update(id, updated);
      syncItems(optimistic.map(item => item.id_producto === id ? { ...item, ...saved } : item));
      addLog('sistema', `MENU: Actualizado '${target.nombre}' a '${saved.nombre}' ($${saved.precio_venta})`);
      toast.success('Producto actualizado.');
      resetEditForm();
    } catch {
      syncItems(previous);
      toast.error('No se pudo guardar el producto. Se revirtio el cambio.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleDuplicateItem = async (item: ProductoMenu) => {
    if (isBusy) return;
    const dup: ProductoMenu = {
      ...item,
      id_producto: `prod_dup_${Date.now()}`,
      nombre: `${item.nombre} (copia)`,
      activo: true,
    };

    if (hasDuplicateName(dup.nombre)) {
      dup.nombre = `${item.nombre} (copia ${new Date().getHours()}${new Date().getMinutes()})`;
    }

    const previous = items;
    setPendingAction(`duplicate_${item.id_producto}`);
    syncItems([dup, ...items]);

    try {
      const saved = await menuService.create(dup);
      syncItems([saved, ...items]);
      addLog('sistema', `MENU: Duplicado '${item.nombre}' como '${saved.nombre}'`);
      toast.success('Producto duplicado.');
    } catch {
      syncItems(previous);
      toast.error('No se pudo duplicar el producto. Se revirtio el cambio.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleBulkItemsChange = (next: ProductoMenu[]) => {
    syncItems(next);
  };

  const filtered = useMemo(() => items.filter(item => {
    const matchesSearch = item.nombre.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesCat = selectedCategoria === 'todos' || item.categoria === selectedCategoria;
    return matchesSearch && matchesCat;
  }), [items, debouncedSearch, selectedCategoria]);

  return (
    <div className="space-y-4 md:space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setShowBulkEditor(false)}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer border shrink-0 ${
            !showBulkEditor ? 'bg-[#624A3E] text-white border-[#624A3E]' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
          <UtensilsCrossed className="w-3.5 h-3.5 inline mr-1" /> Catalogo
        </button>
        <button onClick={() => setShowBulkEditor(true)}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer border shrink-0 ${
            showBulkEditor ? 'bg-[#624A3E] text-white border-[#624A3E]' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
          <DollarSign className="w-3.5 h-3.5 inline mr-1" /> Precios masivos
        </button>
      </div>

      {showBulkEditor ? (
        <BulkPriceEditor items={items} onItemsChange={handleBulkItemsChange} addLog={addLog} />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#624A3E]" />
            Nuevo plato / bebida
          </h3>
          <form onSubmit={handleCreateItem} className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">Nombre comercial</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej. Ojo de Bife Criollo"
                className="w-full min-h-11 text-sm p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30"
                disabled={isBusy}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">Precio de venta ($)</label>
              <input
                type="number"
                inputMode="decimal"
                value={precio}
                onChange={e => setPrecio(e.target.value)}
                placeholder="Ej. 18500"
                className="w-full min-h-11 text-sm p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30"
                disabled={isBusy}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">Descripcion</label>
              <textarea
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Ingredientes u observaciones..."
                rows={2}
                className="w-full text-sm p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30 resize-none"
                disabled={isBusy}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">Categoria</label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                className="w-full min-h-11 text-sm p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30 cursor-pointer font-bold text-stone-700"
                disabled={isBusy}
              >
                {CATEGORIAS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">URL de imagen (opcional)</label>
              <input
                type="url"
                value={imagenUrl}
                onChange={e => setImagenUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full min-h-11 text-sm p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30"
                disabled={isBusy}
              />
            </div>
            <button
              type="submit"
              disabled={isBusy}
              className="w-full min-h-11 py-2.5 bg-[#624A3E] hover:bg-[#503C32] disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-[#624A3E]/10 cursor-pointer active:scale-[0.98]"
            >
              {pendingAction === 'create' ? 'Registrando...' : 'Registrar en carta'}
            </button>
          </form>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-stone-200 shadow-xs lg:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-stone-100">
            <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-[#624A3E]" />
              Catalogo de menu ({filtered.length})
            </h3>

            <div className="flex flex-wrap gap-1">
              {FILTER_CATEGORIAS.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoria(cat)}
                  className={`px-2.5 py-1.5 text-[10px] font-black rounded-lg uppercase tracking-wide cursor-pointer transition-all border ${
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

          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar platillo, vino o postre..."
              className="w-full min-h-11 text-sm pl-9 pr-4 py-3 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {loading ? <div className="col-span-3"><CardSkeleton count={6} /></div> : filtered.map(item => {
              const itemBusy = pendingAction === `toggle_${item.id_producto}`
                || pendingAction === `edit_${item.id_producto}`
                || pendingAction === `duplicate_${item.id_producto}`;

              return (
              <div
                key={item.id_producto}
                className={`p-3 bg-[#F5F1E9]/30 border rounded-2xl flex gap-3 transition-colors hover:bg-[#F5F1E9]/60 ${
                  item.activo ? 'border-stone-150' : 'border-rose-105 bg-rose-50/10 opacity-70'
                } ${itemBusy ? 'ring-2 ring-[#624A3E]/20' : ''}`}
              >
                <img
                  src={item.imagen}
                  alt={item.nombre}
                  loading="lazy" decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 bg-stone-100 border border-stone-200"
                  onError={e => { (e.currentTarget as HTMLImageElement).src = getFallbackImage(item.categoria); }}
                />
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-black uppercase text-[#624A3E]">{item.categoria}</span>
                    <h4 className="text-sm font-extrabold text-stone-900 tracking-tight leading-snug truncate" title={item.nombre}>{item.nombre}</h4>
                    {item.descripcion && (
                      <p className="text-[10px] sm:text-xs text-stone-500 leading-snug line-clamp-2 mt-0.5" title={item.descripcion}>
                        {item.descripcion}
                      </p>
                    )}

                    {editingId === item.id_producto ? (
                      <div className="space-y-2 mt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-stone-700">$</span>
                          <input type="number" inputMode="decimal" value={editPrecio} onChange={e => setEditPrecio(e.target.value)}
                            disabled={isBusy}
                            className="w-20 text-sm p-1.5 border border-stone-300 rounded bg-white text-stone-800 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#624A3E]" />
                        </div>
                        <input type="text" value={editNombre} onChange={e => setEditNombre(e.target.value)}
                          disabled={isBusy}
                          className="w-full text-xs p-1.5 border border-stone-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#624A3E]" />
                        <textarea value={editDescripcion} onChange={e => setEditDescripcion(e.target.value)} rows={2}
                          disabled={isBusy}
                          className="w-full text-xs p-1.5 border border-stone-300 rounded bg-white resize-none focus:outline-none focus:ring-1 focus:ring-[#624A3E]" />
                        <select value={editCategoria} onChange={e => setEditCategoria(e.target.value)}
                          disabled={isBusy}
                          className="w-full text-xs p-1.5 border border-stone-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#624A3E]">
                          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="flex gap-1.5">
                          <button onClick={() => void handleSaveEdit(item.id_producto)} disabled={isBusy}
                            className="p-1.5 rounded bg-[#22C55E]/15 hover:bg-[#22C55E]/20 text-[#22C55E] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={resetEditForm} disabled={isBusy}
                            className="p-1.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-stone-850 font-mono tracking-tight">${item.precio_venta.toLocaleString('es-AR')}</span>
                        <button onClick={() => handleStartEditing(item)} disabled={isBusy}
                          className="p-1.5 px-2 rounded hover:bg-stone-200/50 text-stone-400 hover:text-stone-750 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-[10px]">
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-200/40 mt-1">
                    <button onClick={() => void handleDuplicateItem(item)} disabled={isBusy}
                      className="text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded cursor-pointer transition-colors bg-stone-50 hover:bg-stone-100 text-stone-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
                      <Copy className="w-3 h-3" /> {pendingAction === `duplicate_${item.id_producto}` ? 'Duplicando...' : 'Duplicar'}
                    </button>
                    <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] sm:text-[10px] font-bold ${item.activo ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {item.activo ? 'En carta' : 'Pausado'}
                    </span>
                    <button
                      onClick={() => void handleToggleActivo(item.id_producto)}
                      disabled={isBusy}
                      className={`text-[9px] sm:text-[10px] font-black px-2 py-1 rounded cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        item.activo
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-600'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                      }`}
                    >
                      {pendingAction === `toggle_${item.id_producto}` ? 'Guardando...' : item.activo ? 'Retirar' : 'Habilitar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
              );
            })}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
