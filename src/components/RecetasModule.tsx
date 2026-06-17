import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ChefHat, Hammer, Tag, Plus, Scale, Search, Trash, Edit2, Check, X } from 'lucide-react';
import { RecetaEscandallo, ProductoMenu, Insumo, EventoLog } from '../types';
import { recetasService } from '../services/recetasService';
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
    const { toast, toasts, removeToast } = useToast();

  const [activeTabRecipe, setActiveTabRecipe] = useState<string>(productosMenu[0]?.id_producto ?? '');
    const [searchProduct, setSearchProduct]     = useState('');
    const [localRecetas, setLocalRecetas]       = useState<RecetaEscandallo[]>(recetas);
    const [pendingAction, setPendingAction]     = useState<string | null>(null);

  // Edición inline de cantidad
  const [editCantidadId, setEditCantidadId]       = useState<string | null>(null);
    const [editCantidadValue, setEditCantidadValue] = useState('');

  // Nuevo ingrediente
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
    const [cantidadUsar, setCantidadUsar]           = useState('');

  useEffect(() => { setLocalRecetas(recetas); }, [recetas]);

  // Asegura que el tab activo siga siendo válido si cambia el menú
  useEffect(() => {
        if (!productosMenu.some(p => p.id_producto === activeTabRecipe)) {
                setActiveTabRecipe(productosMenu[0]?.id_producto ?? '');
        }
  }, [productosMenu, activeTabRecipe]);

  const filteredProducts = useMemo(
        () => productosMenu.filter(p => p.nombre.toLowerCase().includes(searchProduct.toLowerCase())),
        [productosMenu, searchProduct]
      );

  const selectedProduct    = filteredProducts.find(p => p.id_producto === activeTabRecipe);
    const currentRecipeItems = localRecetas.filter(r => r.id_producto === activeTabRecipe);

  // Costo total calculado desde costo_unitario real del insumo
  const calculatedCost = useMemo(
        () => currentRecipeItems.reduce((acc, recipe) => {
                const ins = insumos.find(i => i.id_insumo === recipe.id_insumo);
                return acc + recipe.cantidad_a_descontar * (ins?.costo_unitario ?? 0);
        }, 0),
        [currentRecipeItems, insumos]
      );

  // Margen estimado del plato seleccionado
  const marginPct = useMemo(() => {
        if (!selectedProduct || calculatedCost === 0) return null;
        return ((selectedProduct.precio_venta - calculatedCost) / selectedProduct.precio_venta * 100).toFixed(1);
  }, [selectedProduct, calculatedCost]);

  // ── Agregar ingrediente ───────────────────────────────────────────────────
  const handleAddIngredient = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (pendingAction || !selectedInsumoId || !cantidadUsar || !activeTabRecipe) return;

                                              const parsedCantidad = parseFloat(cantidadUsar);
        if (!Number.isFinite(parsedCantidad) || parsedCantidad <= 0) {
                toast.error('La cantidad debe ser un número positivo.');
                return;
        }

                                              const matchedIn = insumos.find(i => i.id_insumo === selectedInsumoId);
        if (!matchedIn) return;

                                              // No permitir duplicar el mismo insumo en la misma receta
                                              if (currentRecipeItems.some(r => r.id_insumo === selectedInsumoId)) {
                                                      toast.warning(`"${matchedIn.nombre}" ya está en esta receta. Editá la cantidad existente.`);
                                                      return;
                                              }

                                              const newRec: RecetaEscandallo = {
                                                      id_receta: `rec_new_${Date.now()}`,
                                                      id_producto: activeTabRecipe,
                                                      id_insumo: selectedInsumoId,
                                                      cantidad_a_descontar: parsedCantidad,
                                                      unidad_medida: matchedIn.unidad_medida,
                                              };

                                              const previous = localRecetas;
        setPendingAction('add');
        const next = [...localRecetas, newRec];
        setLocalRecetas(next);
        onRecetasChange(next);
        setCantidadUsar('');
        setSelectedInsumoId('');

                                              try {
                                                      await recetasService.create(newRec);
                                                      toast.success(`"${matchedIn.nombre}" agregado a la receta.`);
                                                      addLog('sistema', `ESCANDALLO: Agregado "${matchedIn.nombre}" (${parsedCantidad} ${matchedIn.unidad_medida}) a "${selectedProduct?.nombre}".`);
                                              } catch {
                                                      setLocalRecetas(previous);
                                                      onRecetasChange(previous);
                                                      toast.error('No se pudo guardar el ingrediente. Se revirtió el cambio.');
                                              } finally {
                                                      setPendingAction(null);
                                              }
  }, [pendingAction, selectedInsumoId, cantidadUsar, activeTabRecipe, insumos, currentRecipeItems, localRecetas, onRecetasChange, selectedProduct, addLog, toast]);

  // ── Iniciar edición de cantidad ───────────────────────────────────────────
  const handleStartEditCantidad = (rec: RecetaEscandallo) => {
        setEditCantidadId(rec.id_receta);
        setEditCantidadValue(String(rec.cantidad_a_descontar));
  };

  // ── Guardar edición de cantidad ───────────────────────────────────────────
  const handleSaveEditCantidad = useCallback(async (rec: RecetaEscandallo) => {
        if (pendingAction) return;
        const parsed = parseFloat(editCantidadValue);
        if (!Number.isFinite(parsed) || parsed <= 0) {
                toast.error('Ingresá una cantidad válida mayor a 0.');
                return;
        }
        if (parsed === rec.cantidad_a_descontar) {
                setEditCantidadId(null);
                return;
        }

                                                 const updated = { ...rec, cantidad_a_descontar: parsed };
        const previous = localRecetas;
        setPendingAction(`edit-${rec.id_receta}`);
        const next = localRecetas.map(r => r.id_receta === rec.id_receta ? updated : r);
        setLocalRecetas(next);
        onRecetasChange(next);
        setEditCantidadId(null);

                                                 try {
                                                         await recetasService.update(rec.id_receta, { cantidad_a_descontar: parsed });
                                                         const ins = insumos.find(i => i.id_insumo === rec.id_insumo);
                                                         toast.success(`Cantidad actualizada: ${parsed} ${ins?.unidad_medida ?? ''}`);
                                                         addLog('sistema', `ESCANDALLO: Cantidad de "${ins?.nombre ?? rec.id_insumo}" actualizada a ${parsed} en "${selectedProduct?.nombre}".`);
                                                 } catch {
                                                         setLocalRecetas(previous);
                                                         onRecetasChange(previous);
                                                         toast.error('No se pudo actualizar la cantidad. Se revirtió el cambio.');
                                                 } finally {
                                                         setPendingAction(null);
                                                 }
  }, [pendingAction, editCantidadValue, localRecetas, onRecetasChange, insumos, selectedProduct, addLog, toast]);

  // ── Eliminar ingrediente ──────────────────────────────────────────────────
  const handleRemoveRecipeItem = useCallback(async (id: string) => {
        if (pendingAction) return;
        const target = localRecetas.find(r => r.id_receta === id);
        if (!target) return;
        const ins = insumos.find(i => i.id_insumo === target.id_insumo);

                                                 const previous = localRecetas;
        setPendingAction(`remove-${id}`);
        const next = localRecetas.filter(r => r.id_receta !== id);
        setLocalRecetas(next);
        onRecetasChange(next);

                                                 try {
                                                         await recetasService.remove(id);
                                                         addLog('sistema', `ESCANDALLO: Removido "${ins?.nombre ?? target.id_insumo}" de "${selectedProduct?.nombre}".`);
                                                 } catch {
                                                         setLocalRecetas(previous);
                                                         onRecetasChange(previous);
                                                         toast.error('No se pudo eliminar el ingrediente. Se revirtió el cambio.');
                                                 } finally {
                                                         setPendingAction(null);
                                                 }
  }, [pendingAction, localRecetas, onRecetasChange, insumos, selectedProduct, addLog, toast]);

  return (
        <div className="space-y-6">
              <ToastContainer toasts={toasts} onDismiss={removeToast} />
        
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
                {/* ── Selector de producto ── */}
                      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                                <h3 className="text-xs font-black text-stone-500 uppercase tracking-wider">Recetarios Habilitados</h3>
                                <div className="relative mb-2">
                                            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                            <input
                                                            type="text"
                                                            value={searchProduct}
                                                            onChange={e => setSearchProduct(e.target.value)}
                                                            placeholder="Buscar producto..."
                                                            className="w-full pl-8 pr-2 py-1.5 text-xs border border-stone-200 rounded-lg bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                                                            aria-label="Buscar producto en recetario"
                                                          />
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
                                                              aria-pressed={isSelected}
                                                            >
                                                            <div className="min-w-0 flex items-center gap-2.5">
                                                                                <img
                                                                                                        src={p.imagen}
                                                                                                        alt={p.nombre}
                                                                                                        loading="lazy"
                                                                                                        className="w-8 h-8 rounded-lg object-cover shrink-0 border border-stone-200/50"
                                                                                                        onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=80&q=60'; }}
                                                                                                      />
                                                                                <span className="text-xs font-semibold truncate">{p.nombre}</span>
                                                            </div>
                                                            <span className={`text-[10px] font-black shrink-0 ml-2 px-1.5 py-0.5 rounded-full ${
                                                                                  isSelected ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'
                                                            }`}>
                                                              {count}
                                                            </span>
                                          </button>
                                        );
        })}
                                </div>
                      </div>
              
                {/* ── Panel derecho: receta + formulario ── */}
                      <div className="lg:col-span-2 space-y-4">
                      
                        {/* Encabezado del plato seleccionado */}
                        {selectedProduct && (
                      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-4">
                                    <img
                                                      src={selectedProduct.imagen}
                                                      alt={selectedProduct.nombre}
                                                      className="w-14 h-14 rounded-xl object-cover border border-stone-200"
                                                      onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=80&q=60'; }}
                                                    />
                                    <div className="flex-1 min-w-0">
                                                    <h2 className="font-black text-stone-900 text-base">{selectedProduct.nombre}</h2>
                                                    <p className="text-xs text-stone-500">{selectedProduct.categoria}</p>
                                    </div>
                                    <div className="text-right shrink-0 space-y-0.5">
                                                    <div className="text-xs text-stone-400">Precio venta</div>
                                                    <div className="font-black text-stone-900 font-mono text-sm">
                                                                      ${selectedProduct.precio_venta.toLocaleString('es-AR')}
                                                    </div>
                                                    <div className="text-xs text-stone-400">Costo estimado</div>
                                                    <div className={`font-black font-mono text-sm ${calculatedCost > 0 ? 'text-amber-700' : 'text-stone-400'}`}>
                                                                      ${calculatedCost.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                      {marginPct !== null && (
                                          <div className={`text-xs font-bold ${parseFloat(marginPct) >= 60 ? 'text-emerald-600' : parseFloat(marginPct) >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                                                              Margen: {marginPct}%
                                          </div>
                                                    )}
                                    </div>
                      </div>
                                )}
                      
                        {/* Lista de ingredientes */}
                                <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                                            <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
                                                          <h3 className="text-xs font-black text-stone-600 uppercase tracking-wider flex items-center gap-2">
                                                                          <Scale className="w-3.5 h-3.5" /> Ingredientes ({currentRecipeItems.length})
                                                          </h3>
                                            </div>
                                
                                  {currentRecipeItems.length === 0 ? (
                        <div className="py-10 text-center text-stone-400">
                                        <Hammer className="w-7 h-7 mx-auto mb-2 opacity-30" />
                                        <p className="text-xs">Sin ingredientes. Agregá el primero abajo.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-stone-50">
                          {currentRecipeItems.map(rec => {
                                            const ins        = insumos.find(i => i.id_insumo === rec.id_insumo);
                                            const stockOk    = ins ? ins.stock_actual >= rec.cantidad_a_descontar : false;
                                            const isEditing  = editCantidadId === rec.id_receta;
                                            const isBusy     = !!pendingAction;
                          
                                            return (
                                                                  <div key={rec.id_receta} className="px-5 py-3 flex items-center gap-3 hover:bg-stone-50/50 transition-colors">
                                                                    {/* Indicador de stock */}
                                                                                        <div className={`w-2 h-2 rounded-full shrink-0 ${ins ? (stockOk ? 'bg-emerald-500' : 'bg-red-400') : 'bg-stone-300'}`}
                                                                                                                     title={ins ? (stockOk ? 'Stock OK' : 'Stock insuficiente') : 'Insumo no encontrado'} />
                                                                  
                                                                                        <div className="flex-1 min-w-0">
                                                                                                                <p className="text-sm font-semibold text-stone-800 truncate">{ins?.nombre ?? rec.id_insumo}</p>
                                                                                          {ins && (
                                                                                              <p className="text-[11px] text-stone-400">
                                                                                                                          Stock: {ins.stock_actual} {ins.unidad_medida}
                                                                                                {ins.costo_unitario ? ` · $${ins.costo_unitario}/u` : ''}
                                                                                                </p>
                                                                                                                )}
                                                                                          </div>
                                                                  
                                                                    {/* Cantidad — editable inline */}
                                                                    {isEditing ? (
                                                                                            <div className="flex items-center gap-1 shrink-0">
                                                                                                                      <input
                                                                                                                                                    type="number"
                                                                                                                                                    min="0.01"
                                                                                                                                                    step="any"
                                                                                                                                                    value={editCantidadValue}
                                                                                                                                                    onChange={e => setEditCantidadValue(e.target.value)}
                                                                                                                                                    onKeyDown={e => {
                                                                                                                                                                                    if (e.key === 'Enter') handleSaveEditCantidad(rec);
                                                                                                                                                                                    if (e.key === 'Escape') setEditCantidadId(null);
                                                                                                                                                      }}
                                                                                                                                                    autoFocus
                                                                                                                                                    className="w-20 px-2 py-1 text-xs border border-[#624A3E]/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                                                                                                                                                    aria-label={`Editar cantidad de ${ins?.nombre ?? rec.id_insumo}`}
                                                                                                                                                  />
                                                                                                                      <span className="text-[10px] text-stone-500">{ins?.unidad_medida}</span>
                                                                                                                      <button
                                                                                                                                                    onClick={() => handleSaveEditCantidad(rec)}
                                                                                                                                                    disabled={isBusy}
                                                                                                                                                    className="p-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 transition-colors disabled:opacity-40"
                                                                                                                                                    aria-label="Confirmar cantidad"
                                                                                                                                                  >
                                                                                                                                                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                                                                                                                        </button>
                                                                                                                      <button
                                                                                                                                                    onClick={() => setEditCantidadId(null)}
                                                                                                                                                    className="p-1 rounded-lg hover:bg-stone-100 transition-colors"
                                                                                                                                                    aria-label="Cancelar edición"
                                                                                                                                                  >
                                                                                                                                                  <X className="w-3.5 h-3.5 text-stone-400" />
                                                                                                                        </button>
                                                                                              </div>
                                                                                          ) : (
                                                                                            <div className="flex items-center gap-2 shrink-0">
                                                                                                                      <span className="text-sm font-mono font-bold text-stone-700">
                                                                                                                        {rec.cantidad_a_descontar} {ins?.unidad_medida ?? rec.unidad_medida ?? ''}
                                                                                                                        </span>
                                                                                                                      <button
                                                                                                                                                    onClick={() => handleStartEditCantidad(rec)}
                                                                                                                                                    disabled={isBusy}
                                                                                                                                                    className="p-1 rounded-lg hover:bg-stone-100 transition-colors disabled:opacity-40"
                                                                                                                                                    aria-label={`Editar cantidad de ${ins?.nombre ?? rec.id_insumo}`}
                                                                                                                                                    title="Editar cantidad"
                                                                                                                                                  >
                                                                                                                                                  <Edit2 className="w-3.5 h-3.5 text-stone-400" />
                                                                                                                        </button>
                                                                                                                      <button
                                                                                                                                                    onClick={() => handleRemoveRecipeItem(rec.id_receta)}
                                                                                                                                                    disabled={isBusy}
                                                                                                                                                    className="p-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                                                                                                                                                    aria-label={`Eliminar ${ins?.nombre ?? rec.id_insumo} de la receta`}
                                                                                                                                                    title="Eliminar ingrediente"
                                                                                                                                                  >
                                                                                                                                                  <Trash className="w-3.5 h-3.5 text-red-400" />
                                                                                                                        </button>
                                                                                              </div>
                                                                                        )}
                                                                  </div>
                                                                );
                        })}
                        </div>
                                            )}
                                </div>
                      
                        {/* Formulario agregar ingrediente */}
                                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                                            <h4 className="text-xs font-black text-stone-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                          <Plus className="w-3.5 h-3.5" /> Agregar ingrediente
                                            </h4>
                                            <form onSubmit={handleAddIngredient} className="flex flex-wrap gap-2 items-end">
                                                          <div className="flex-1 min-w-[160px]">
                                                                          <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Insumo</label>
                                                                          <select
                                                                                              value={selectedInsumoId}
                                                                                              onChange={e => setSelectedInsumoId(e.target.value)}
                                                                                              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30"
                                                                                              aria-label="Seleccionar insumo"
                                                                                            >
                                                                                            <option value="">Seleccionar insumo…</option>
                                                                            {insumos.map(ins => (
                                                                                                                  <option key={ins.id_insumo} value={ins.id_insumo}>
                                                                                                                    {ins.nombre} ({ins.stock_actual} {ins.unidad_medida} disponibles)
                                                                                                                    </option>
                                                                                                                ))}
                                                                          </select>
                                                          </div>
                                                          <div>
                                                                          <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Cantidad</label>
                                                                          <input
                                                                                              type="number"
                                                                                              min="0.01"
                                                                                              step="any"
                                                                                              value={cantidadUsar}
                                                                                              onChange={e => setCantidadUsar(e.target.value)}
                                                                                              placeholder="0"
                                                                                              className="w-28 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30"
                                                                                              aria-label="Cantidad del insumo"
                                                                                            />
                                                          </div>
                                                          <button
                                                                            type="submit"
                                                                            disabled={!!pendingAction || !selectedInsumoId || !cantidadUsar}
                                                                            className="bg-[#624A3E] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#4e3a30] transition-colors disabled:opacity-50 flex items-center gap-2"
                                                                            aria-label="Agregar ingrediente a la receta"
                                                                          >
                                                                          <Plus className="w-4 h-4" /> Agregar
                                                          </button>
                                            </form>
                                </div>
                      </div>
              </div>
        </div>
      );
}
