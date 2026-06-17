import React, { useEffect, useState } from 'react';
import { ChefHat, Hammer, Tag, AlertTriangle, Plus, Scale, Search, Trash, Edit2, Check, X } from 'lucide-react';
import { RecetaEscandallo, ProductoMenu, Insumo, EventoLog } from '../types';
import { recetasService } from '../services/recetasService';
import { DEFAULT_PRODUCT_IMAGE, getSafeImageSrc } from '../lib/imageFallbacks';
import { useToast, ToastContainer } from './ToastContainer';

interface RecetasModuleProps {
  recetas: RecetaEscandallo[];
  productosMenu: ProductoMenu[];
  insumos: Insumo[];
  onRecetasChange: (recetas: RecetaEscandallo[]) => void;
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

export default function RecetasModule({
  recetas,
  productosMenu,
  insumos,
  onRecetasChange,
  addLog
}: RecetasModuleProps) {
  const { toast, toasts, dismissToast } = useToast();
  const [activeTabRecipe, setActiveTabRecipe] = useState<string>(productosMenu[0]?.id_producto || '');
  const [searchProduct, setSearchProduct] = useState('');
  const [editCantidad, setEditCantidad] = useState<string | null>(null);
  const [editCantidadValue, setEditCantidadValue] = useState('');

  // Add ingredient state
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [cantidadUsar, setCantidadUsar] = useState('');
  const [localRecetas, setLocalRecetas] = useState<RecetaEscandallo[]>(recetas);

  useEffect(() => {
    setLocalRecetas(recetas);
  }, [recetas]);

  const filteredProducts = productosMenu.filter(p => p.nombre.toLowerCase().includes(searchProduct.toLowerCase()));
  const selectedProduct = filteredProducts.find(p => p.id_producto === activeTabRecipe);
  const currentRecipeItems = localRecetas.filter(r => r.id_producto === activeTabRecipe);

    // Costo calculado usando costo_unitario real del Insumo
  // Usa ?? 0 como fallback si el campo no esta definido
  const calculatedCost = currentRecipeItems.reduce((acc, recipe) => {
    const matchedInsumo = insumos.find(i => i.id_insumo === recipe.id_insumo);
    if (!matchedInsumo) return acc;
    const unitCost = matchedInsumo.costo_unitario ?? 0;
    return acc + recipe.cantidad_a_descontar * unitCost;
  }, 0);

  const handleAddIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    const cantidad = Number.parseFloat(cantidadUsar);

    if (!selectedInsumoId || !activeTabRecipe || !Number.isFinite(cantidad) || cantidad <= 0) {
      toast.warning('Seleccioná un insumo y una cantidad válida.');
      return;
    }

    const matchedIn = insumos.find(i => i.id_insumo === selectedInsumoId);
    if (!matchedIn) {
      toast.error('No se encontró el insumo seleccionado.');
      return;
    }

    const alreadyExists = localRecetas.some(r => r.id_producto === activeTabRecipe && r.id_insumo === selectedInsumoId);
    if (alreadyExists) {
      toast.warning('Ese insumo ya está en la receta. Editá la cantidad existente.');
      return;
    }

    const newRec: RecetaEscandallo = {
      id_receta: `rec_new_${Date.now()}`,
      id_producto: activeTabRecipe,
      id_insumo: selectedInsumoId,
      cantidad_a_descontar: cantidad
    };

    const previous = localRecetas;
    const next = [...previous, newRec];
    setLocalRecetas(next);
    onRecetasChange(next);

    recetasService.create(newRec).catch(err => {
      console.error(err);
      setLocalRecetas(previous);
      onRecetasChange(previous);
      toast.error('No se pudo guardar el ingrediente. Se revirtió el cambio.');
    });
    addLog('sistema', `ESCANDALLO: Agregado insumo ${matchedIn.nombre} (${cantidadUsar} ${matchedIn.unidad_medida}) a la receta de ${selectedProduct?.nombre}`);
    setCantidadUsar('');
    setSelectedInsumoId('');
    toast.success('Ingrediente vinculado a la receta.');
  };

  const handleRemoveRecipeItem = (id: string) => {
    const targetItem = localRecetas.find(r => r.id_receta === id);
    if (!targetItem) return;
    const matchedIn = insumos.find(i => i.id_insumo === targetItem.id_insumo);

    const previous = localRecetas;
    const next = previous.filter(r => r.id_receta !== id);
    setLocalRecetas(next);
    onRecetasChange(next);

    recetasService.remove(id).catch(err => {
      console.error(err);
      setLocalRecetas(previous);
      onRecetasChange(previous);
      toast.error('No se pudo eliminar el ingrediente. Se restauró la receta.');
    });
    addLog('sistema', `ESCANDALLO: Removido insumo ${matchedIn ? matchedIn.nombre : targetItem.id_insumo} de la receta de ${selectedProduct?.nombre}`);
    toast.success('Ingrediente eliminado de la receta.');
  };

  const handleUpdateRecipeQuantity = (id: string) => {
    const cantidad = Number.parseFloat(editCantidadValue);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      toast.warning('Ingresá una cantidad válida mayor a cero.');
      return;
    }

    const previous = localRecetas;
    const next = previous.map(r => r.id_receta === id ? { ...r, cantidad_a_descontar: cantidad } : r);
    setLocalRecetas(next);
    onRecetasChange(next);
    setEditCantidad(null);

    recetasService.update(id, { cantidad_a_descontar: cantidad }).catch(err => {
      console.error(err);
      setLocalRecetas(previous);
      onRecetasChange(previous);
      toast.error('No se pudo actualizar la cantidad. Se revirtió el cambio.');
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left col: list of dish recipes selection */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
          <h3 className="text-xs font-black text-stone-500 uppercase tracking-wider">Recetarios Habilitados</h3>
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input type="text" value={searchProduct} onChange={e => setSearchProduct(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full pl-8 pr-2 py-1.5 text-xs border border-stone-200 rounded-lg bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]" />
          </div>
          <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
            {filteredProducts.map(p => {
              const isSelected = activeTabRecipe === p.id_producto;
              const count = localRecetas.filter(r => r.id_producto === p.id_producto).length;

              return (
                <button
                  key={p.id_producto}
                  onClick={() => setActiveTabRecipe(p.id_producto)}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-[#624A3E] text-white border-[#5d3a2e] shadow-sm'
                      : 'bg-stone-50 hover:bg-[#F5F1E9]/50 text-stone-700 border-stone-200'
                  }`}
                >
                  <div className="min-w-0 flex items-center gap-2.5">
                    <img 
                      src={getSafeImageSrc(p.imagen)}
                      alt={p.nombre} 
                      loading="lazy" decoding="async"
                      referrerPolicy="no-referrer"
                      onError={(event) => { event.currentTarget.src = DEFAULT_PRODUCT_IMAGE; }}
                      className="w-8 h-8 rounded-lg object-cover shrink-0 border border-stone-200/50"
                    />
                    <div className="truncate">
                      <span className="text-[9px] font-bold block uppercase opacity-75">Producto base</span>
                      <strong className="text-xs font-extrabold truncate block">{p.nombre}</strong>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full font-mono ${isSelected ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-500'}`}>
                    {count} ing
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 2 cols: active recipe breakdown with escandallo controls */}
        {selectedProduct ? (
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs lg:col-span-2 space-y-4">
            
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <img 
                  src={getSafeImageSrc(selectedProduct.imagen)}
                  alt={selectedProduct.nombre} 
                  loading="lazy" decoding="async"
                  referrerPolicy="no-referrer"
                  onError={(event) => { event.currentTarget.src = DEFAULT_PRODUCT_IMAGE; }}
                  className="w-12 h-12 rounded-xl object-cover shrink-0 border border-stone-200"
                />
                <div>
                  <h4 className="text-sm font-black text-stone-900 tracking-tight leading-none">{selectedProduct.nombre}</h4>
                  <span className="text-[10px] text-stone-400 block mt-1">Precio sugerido de venta en mesa: <strong>${selectedProduct.precio_venta.toLocaleString('es-AR')}</strong></span>
                </div>
              </div>

              {/* Cost of Goods Sold (COGS) metric */}
              <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-right">
                <span className="text-[9px] text-stone-500 font-bold block uppercase leading-none">Costo Materia Prima</span>
                <strong className="text-sm font-black text-stone-900 font-mono tracking-tight">${calculatedCost.toFixed(2)}</strong>
                <span className="text-[8px] text-[#22C55E] block font-extrabold">% Margen: {(((selectedProduct.precio_venta - calculatedCost) / selectedProduct.precio_venta) * 100).toFixed(1)}%</span>
              </div>
            </div>

            {/* List of escandallos ingredients */}
            <div className="space-y-2">
              <h5 className="text-[10px] font-black text-stone-500 uppercase tracking-wider">Ingredientes Asociados</h5>
              {currentRecipeItems.length === 0 ? (
                <div className="p-6 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-1">
                  <ChefHat className="w-8 h-8 text-stone-300 mx-auto" />
                  <p className="text-xs font-bold text-stone-600">No hay escandallos asociados</p>
                  <p className="text-[10px] text-stone-400">Agregue mermas de stock por ingredientes abajo.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {currentRecipeItems.map(rec => {
                    const matchedInsumo = insumos.find(i => i.id_insumo === rec.id_insumo);
                    if (!matchedInsumo) return null;

                    return (
                      <div key={rec.id_receta} className="p-3 bg-stone-50/50 border border-stone-200 rounded-xl flex items-center justify-between text-xs hover:bg-[#F5F1E9]/30 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-[#624A3E]/10 rounded-lg flex items-center justify-center text-[#624A3E]">
                            <Scale className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-extrabold text-stone-800 block">{matchedInsumo.nombre}</span>
                            <span className="text-[10px] text-stone-400 uppercase font-mono">ID Insumo: {rec.id_insumo}</span>
                          </div>
                        </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              {editCantidad === rec.id_receta ? (
                                <div className="flex items-center gap-1">
                                  <input type="number" step="0.01" value={editCantidadValue} onChange={e => setEditCantidadValue(e.target.value)}
                                    className="w-16 text-xs p-1 border border-stone-300 rounded bg-white text-center font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#624A3E]" />
                                  <button onClick={() => handleUpdateRecipeQuantity(rec.id_receta)} className="p-1 rounded bg-emerald-50 text-emerald-600 cursor-pointer"><Check className="w-3 h-3" /></button>
                                  <button onClick={() => setEditCantidad(null)} className="p-1 rounded bg-stone-100 text-stone-500 cursor-pointer"><X className="w-3 h-3" /></button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-black text-stone-900 font-mono">{rec.cantidad_a_descontar} {matchedInsumo.unidad_medida}</span>
                                  <button onClick={() => { setEditCantidad(rec.id_receta); setEditCantidadValue(String(rec.cantidad_a_descontar)); }}
                                    className="p-1 rounded text-stone-400 hover:text-blue-500 cursor-pointer"><Edit2 className="w-3 h-3" /></button>
                                </div>
                              )}
                              <span className="text-[9px] text-stone-400 block font-bold leading-none">de descuento</span>
                            </div>
                            <button onClick={() => handleRemoveRecipeItem(rec.id_receta)}
                              className="p-1 px-2 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors cursor-pointer text-[10px] font-bold">
                              <Trash className="w-3 h-3" />
                            </button>
                          </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick add form */}
            <form onSubmit={handleAddIngredient} className="bg-[#F5F1E9]/30 p-4 rounded-xl border border-stone-200/60 space-y-3 pt-3">
              <span className="text-[10px] font-black text-stone-500 uppercase tracking-wider block">Asociar Materia Prima / Escandallo</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black text-stone-500 uppercase block mb-1">Insumo Base</label>
                  <select
                    value={selectedInsumoId}
                    onChange={e => setSelectedInsumoId(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#624A3E] cursor-pointer"
                    required
                  >
                    <option value="">-- Seleccionar --</option>
                    {insumos.map(ins => (
                      <option key={ins.id_insumo} value={ins.id_insumo}>{ins.nombre} ({ins.unidad_medida})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black text-stone-500 uppercase block mb-1">Cantidad a Descontar</label>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="Ej: 150"
                    value={cantidadUsar}
                    onChange={e => setCantidadUsar(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-2 bg-[#624A3E] hover:bg-[#503C32] text-white text-[11px] font-extrabold rounded-lg transition-all cursor-pointer"
              >
                Vincular Insumo a la Receta
              </button>
            </form>

          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl border border-stone-200 lg:col-span-2 text-center py-12">
            No se seleccionó platillo base.
          </div>
        )}

      </div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
