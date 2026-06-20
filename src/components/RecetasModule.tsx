import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ChefHat, Hammer, Tag, Plus, Scale, Search, Trash, Edit2, Check, X, Camera } from 'lucide-react';
import { RecetaEscandallo, ProductoMenu, Insumo, EventoLog } from '../types';
import { recetasService } from '../services/recetasService';
import { menuService } from '../services/menuService';
import { useToast, ToastContainer } from './ToastContainer';
import {
  buildRecipeDraft,
  calculateMarginPct,
  calculateRecipeCost,
  countRecipeItemsByProduct,
  getMarginLevel,
  getRecipeItemsForProduct,
  parsePositiveQuantity,
  recipeContainsIngredient,
} from '../lib/recetas';

const marginToneClass = {
  high: 'text-emerald-600',
  medium: 'text-amber-600',
  low: 'text-red-500',
} as const;

function parseMinutesFromText(text: string): number | null {
  const regex = /(\d+)\s*(?:minutos|min|m\b)/i;
  const match = text.match(regex);
  if (match) {
    const mins = parseInt(match[1], 10);
    if (!isNaN(mins) && mins > 0) return mins;
  }
  return null;
}

function StepTimer({ text }: { text: string }) {
  const minutes = useMemo(() => parseMinutesFromText(text), [text]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (minutes === null) return null;

  const startTimer = () => {
    if (isRunning) return;
    const duration = timeLeft !== null ? timeLeft : minutes * 60;
    setTimeLeft(duration);
    setIsRunning(true);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setIsRunning(false);
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
            oscillator.connect(audioCtx.destination);
            oscillator.start();
            setTimeout(() => oscillator.stop(), 500);
          } catch (e) {
            console.error('AudioContext error:', e);
          }
          alert(`⏰ ¡Tiempo cumplido!: "${text}"`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const pauseTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
  };

  const resetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
    setTimeLeft(null);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="mt-1.5 flex items-center gap-2 bg-stone-150/40 p-1.5 rounded-lg border border-stone-200 w-fit shrink-0">
      <span className="text-[10px] font-bold text-stone-600 flex items-center gap-1 font-mono">
        ⏱️ {timeLeft !== null ? formatTime(timeLeft) : `${minutes} min`}
      </span>
      <div className="flex gap-1">
        {!isRunning ? (
          <button
            type="button"
            onClick={startTimer}
            className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors cursor-pointer"
          >
            Iniciar
          </button>
        ) : (
          <button
            type="button"
            onClick={pauseTimer}
            className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded-md transition-colors cursor-pointer"
          >
            Pausar
          </button>
        )}
        {timeLeft !== null && (
          <button
            type="button"
            onClick={resetTimer}
            className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-stone-400 hover:bg-stone-500 text-white rounded-md transition-colors cursor-pointer"
          >
            Reiniciar
          </button>
        )}
      </div>
    </div>
  );
}

interface RecetasModuleProps {
    recetas: RecetaEscandallo[];
    productosMenu: ProductoMenu[];
    insumos: Insumo[];
    onRecetasChange: (recetas: RecetaEscandallo[]) => void;
    onProductosChange: (productos: ProductoMenu[]) => void;
    addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

export default function RecetasModule({
    recetas,
    productosMenu,
    insumos,
    onRecetasChange,
    onProductosChange,
    addLog
}: RecetasModuleProps) {
    const { toast, toasts, removeToast } = useToast();

    const [activeTabRecipe, setActiveTabRecipe] = useState<string>(productosMenu[0]?.id_producto ?? '');
    
    const selectedProduct = useMemo(
        () => productosMenu.find(p => p.id_producto === activeTabRecipe),
        [productosMenu, activeTabRecipe]
    );
    
    // Subida de imagen con redimensionamiento
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [pendingImage, setPendingImage] = useState<string | null>(null);

    const handleImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Por favor, selecciona un archivo de imagen válido.');
            return;
        }

        setIsUploadingImage(true);
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const maxDim = 500;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxDim) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    }
                } else {
                    if (height > maxDim) {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                    setPendingImage(dataUrl);
                    toast.success('Imagen lista. Presione "Guardar Foto" para confirmar.');
                } else {
                    toast.error('No se pudo procesar la imagen.');
                }
                setIsUploadingImage(false);
            };
            img.onerror = () => {
                toast.error('Error al cargar la imagen.');
                setIsUploadingImage(false);
            };
            img.src = event.target?.result as string;
        };

        reader.onerror = () => {
            toast.error('Error al leer el archivo.');
            setIsUploadingImage(false);
        };

        reader.readAsDataURL(file);
    }, [toast]);

    const handleSavePendingImage = useCallback(async () => {
        if (!pendingImage || !selectedProduct) return;

        setIsUploadingImage(true);
        try {
            const idProducto = selectedProduct.id_producto;
            await menuService.update(idProducto, { imagen: pendingImage });
            
            const updatedProducts = productosMenu.map(p => 
                p.id_producto === idProducto ? { ...p, imagen: pendingImage } : p
            );
            onProductosChange(updatedProducts);
            
            toast.success('Foto del plato guardada con éxito.');
            addLog('sistema', `MENU: Foto de plato guardada para el producto ID ${idProducto}`);
            setPendingImage(null);
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar la foto en la base de datos.');
        } finally {
            setIsUploadingImage(false);
        }
    }, [pendingImage, selectedProduct, productosMenu, onProductosChange, toast, addLog]);

    const [searchProduct, setSearchProduct]     = useState('');
    const [localRecetas, setLocalRecetas]       = useState<RecetaEscandallo[]>(recetas);
    const [pendingAction, setPendingAction]     = useState<string | null>(null);

  // Edición inline de cantidad y rendimiento
  const [editCantidadId, setEditCantidadId]       = useState<string | null>(null);
    const [editCantidadValue, setEditCantidadValue] = useState('');
    const [editRendimientoValue, setEditRendimientoValue] = useState('100');

  // Nuevo ingrediente
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
    const [cantidadUsar, setCantidadUsar]           = useState('');
    const [rendimientoUsar, setRendimientoUsar]   = useState('100');

  // Simulador e Ingeniería de Menú
  const [targetMarginInput, setTargetMarginInput] = useState('70');
  const [portionsInput, setPortionsInput] = useState('10');

  useEffect(() => { setLocalRecetas(recetas); }, [recetas]);
  
  // Limpiar imagen pendiente al cambiar de plato
  useEffect(() => {
    setPendingImage(null);
  }, [activeTabRecipe]);

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
    const currentRecipeItems = useMemo(
        () => getRecipeItemsForProduct(localRecetas, activeTabRecipe),
        [localRecetas, activeTabRecipe]
      );
    const recipeCountByProduct = useMemo(
        () => countRecipeItemsByProduct(localRecetas),
        [localRecetas]
      );

  // Costo total calculado desde costo_unitario real del insumo
  const calculatedCost = useMemo(
        () => calculateRecipeCost(currentRecipeItems, insumos),
        [currentRecipeItems, insumos]
      );

  // Margen estimado del plato seleccionado
  const marginPct = useMemo(() => {
        return calculateMarginPct(selectedProduct, calculatedCost);
  }, [selectedProduct, calculatedCost]);
  const marginLevel = getMarginLevel(marginPct);

  // ── Agregar ingrediente ───────────────────────────────────────────────────
  const handleAddIngredient = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (pendingAction || !selectedInsumoId || !cantidadUsar || !activeTabRecipe) return;

                                              const parsedCantidad = parsePositiveQuantity(cantidadUsar);
        if (parsedCantidad === null) {
                toast.error('La cantidad debe ser un número positivo.');
                return;
        }

                                              const parsedRendimiento = parsePositiveQuantity(rendimientoUsar) ?? 100;
        if (parsedRendimiento <= 0 || parsedRendimiento > 100) {
                toast.error('El rendimiento debe estar entre 1% y 100%.');
                return;
        }

                                              const matchedIn = insumos.find(i => i.id_insumo === selectedInsumoId);
        if (!matchedIn) return;

                                              // No permitir duplicar el mismo insumo en la misma receta
                                              if (recipeContainsIngredient(localRecetas, activeTabRecipe, selectedInsumoId)) {
                                                      toast.warning(`"${matchedIn.nombre}" ya está en esta receta. Editá la cantidad existente.`);
                                                      return;
                                              }

                                              const newRec = buildRecipeDraft(activeTabRecipe, matchedIn, parsedCantidad, parsedRendimiento);

                                              const previous = localRecetas;
        setPendingAction('add');
        const next = [...localRecetas, newRec];
        setLocalRecetas(next);
        onRecetasChange(next);
        setCantidadUsar('');
        setRendimientoUsar('100');
        setSelectedInsumoId('');

                                              try {
                                                      await recetasService.create(newRec);
                                                      toast.success(`"${matchedIn.nombre}" agregado a la receta.`);
                                                      addLog('sistema', `ESCANDALLO: Agregado "${matchedIn.nombre}" (${parsedCantidad} ${matchedIn.unidad_medida}) con rendimiento ${parsedRendimiento}% a "${selectedProduct?.nombre}".`);
                                              } catch {
                                                      setLocalRecetas(previous);
                                                      onRecetasChange(previous);
                                                      toast.error('No se pudo guardar el ingrediente. Se revirtió el cambio.');
                                              } finally {
                                                      setPendingAction(null);
                                              }
  }, [pendingAction, selectedInsumoId, cantidadUsar, rendimientoUsar, activeTabRecipe, insumos, localRecetas, onRecetasChange, selectedProduct, addLog, toast]);

  // ── Iniciar edición de cantidad ───────────────────────────────────────────
  const handleStartEditCantidad = (rec: RecetaEscandallo) => {
        setEditCantidadId(rec.id_receta);
        setEditCantidadValue(String(rec.cantidad_a_descontar));
        setEditRendimientoValue(String(rec.rendimiento ?? 100));
  };

  // ── Guardar edición de cantidad ───────────────────────────────────────────
  const handleSaveEditCantidad = useCallback(async (rec: RecetaEscandallo) => {
        if (pendingAction) return;
        const parsed = parsePositiveQuantity(editCantidadValue);
        if (parsed === null) {
                toast.error('Ingresá una cantidad válida mayor a 0.');
                return;
        }

        const parsedRend = parsePositiveQuantity(editRendimientoValue) ?? 100;
        if (parsedRend <= 0 || parsedRend > 100) {
                toast.error('El rendimiento debe estar entre 1% y 100%.');
                return;
        }

        if (parsed === rec.cantidad_a_descontar && parsedRend === (rec.rendimiento ?? 100)) {
                setEditCantidadId(null);
                return;
        }

                                                 const updated = { ...rec, cantidad_a_descontar: parsed, rendimiento: parsedRend };
        const previous = localRecetas;
        setPendingAction(`edit-${rec.id_receta}`);
        const next = localRecetas.map(r => r.id_receta === rec.id_receta ? updated : r);
        setLocalRecetas(next);
        onRecetasChange(next);
        setEditCantidadId(null);

                                                 try {
                                                         await recetasService.update(rec.id_receta, { cantidad_a_descontar: parsed, rendimiento: parsedRend });
                                                         const ins = insumos.find(i => i.id_insumo === rec.id_insumo);
                                                         toast.success(`Ingrediente actualizado.`);
                                                         addLog('sistema', `ESCANDALLO: Insumo "${ins?.nombre ?? rec.id_insumo}" actualizado (cant: ${parsed}, rend: ${parsedRend}%) en "${selectedProduct?.nombre}".`);
                                                 } catch {
                                                         setLocalRecetas(previous);
                                                         onRecetasChange(previous);
                                                         toast.error('No se pudo actualizar el ingrediente. Se revirtió el cambio.');
                                                 } finally {
                                                         setPendingAction(null);
                                                 }
  }, [pendingAction, editCantidadValue, editRendimientoValue, localRecetas, onRecetasChange, insumos, selectedProduct, addLog, toast]);

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

  const suggestedPrice = useMemo(() => {
    const margin = parseFloat(targetMarginInput) || 70;
    if (margin >= 100) return calculatedCost;
    return Math.round(calculatedCost / (1 - margin / 100));
  }, [calculatedCost, targetMarginInput]);

  const handleApplySuggestedPrice = async () => {
    if (!selectedProduct) return;
    try {
      await menuService.update(selectedProduct.id_producto, { precio_venta: suggestedPrice });
      const updated = productosMenu.map(p => p.id_producto === selectedProduct.id_producto ? { ...p, precio_venta: suggestedPrice } : p);
      onProductosChange(updated);
      toast.success(`Precio de "${selectedProduct.nombre}" actualizado a $${suggestedPrice.toLocaleString('es-AR')}`);
      addLog('sistema', `MENU: Precio de venta del plato "${selectedProduct.nombre}" modificado a $${suggestedPrice} según simulación de margen.`);
    } catch (err: any) {
      toast.error('Error al actualizar el precio de venta.');
    }
  };

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
                        const count = recipeCountByProduct[p.id_producto] ?? 0;
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
                                    <div className="relative group w-14 h-14 rounded-xl overflow-hidden border border-stone-200 shrink-0 cursor-pointer shadow-xs" title="Haga clic para subir una foto real del plato">
                                                    <img
                                                                      src={pendingImage || selectedProduct.imagen}
                                                                      alt={selectedProduct.nombre}
                                                                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                                      onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=80&q=60'; }}
                                                                    />
                                                    <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                                    <Camera className="w-4 h-4 text-white" />
                                                                    <span className="text-[8px] text-white font-black mt-0.5 tracking-wider uppercase">Subir</span>
                                                                    <input 
                                                                                    type="file" 
                                                                                    accept="image/*" 
                                                                                    onChange={handleImageChange} 
                                                                                    disabled={isUploadingImage}
                                                                                    className="hidden" 
                                                                                  />
                                                    </label>
                                      {isUploadingImage && (
                                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                                          <div className="w-4 h-4 border-2 border-[#624A3E] border-t-transparent rounded-full animate-spin" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                                    <h2 className="font-black text-stone-900 text-base">{selectedProduct.nombre}</h2>
                                                    <p className="text-xs text-stone-500 mb-1">{selectedProduct.categoria}</p>
                                                    {pendingImage && (
                                                      <div className="flex gap-1.5 mt-1">
                                                        <button
                                                          onClick={handleSavePendingImage}
                                                          disabled={isUploadingImage}
                                                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                                                        >
                                                          <Check className="w-3 h-3" /> Guardar Foto
                                                        </button>
                                                        <button
                                                          onClick={() => setPendingImage(null)}
                                                          disabled={isUploadingImage}
                                                          className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                                        >
                                                          Cancelar
                                                        </button>
                                                      </div>
                                                    )}
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
                                      {marginPct !== null && marginLevel !== null && (
                                          <div className={`text-xs font-bold ${marginToneClass[marginLevel]}`}>
                                                              Margen: {marginPct.toFixed(1)}%
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
                                                                  
                                                                    {/* Cantidad y Rendimiento — editable inline */}
                                                                    {isEditing ? (
                                                                                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                                                                                                      <div className="flex items-center gap-0.5">
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
                                                                                                                                                      className="w-16 px-1.5 py-1 text-xs border border-[#624A3E]/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                                                                                                                                                      aria-label={`Editar cantidad de ${ins?.nombre ?? rec.id_insumo}`}
                                                                                                                                                    />
                                                                                                                        <span className="text-[9px] text-stone-500">{ins?.unidad_medida}</span>
                                                                                                                      </div>

                                                                                                                      <div className="flex items-center gap-0.5">
                                                                                                                        <span className="text-[9px] text-stone-400">Rend:</span>
                                                                                                                        <input
                                                                                                                                                      type="number"
                                                                                                                                                      min="1"
                                                                                                                                                      max="100"
                                                                                                                                                      value={editRendimientoValue}
                                                                                                                                                      onChange={e => setEditRendimientoValue(e.target.value)}
                                                                                                                                                      onKeyDown={e => {
                                                                                                                                                                                      if (e.key === 'Enter') handleSaveEditCantidad(rec);
                                                                                                                                                                                      if (e.key === 'Escape') setEditCantidadId(null);
                                                                                                                                                        }}
                                                                                                                                                      className="w-12 px-1.5 py-1 text-xs border border-[#624A3E]/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#624A3E] font-mono text-center"
                                                                                                                                                      placeholder="100"
                                                                                                                                                    />
                                                                                                                        <span className="text-[9px] text-stone-550">%</span>
                                                                                                                      </div>

                                                                                                                      <button
                                                                                                                                                    onClick={() => handleSaveEditCantidad(rec)}
                                                                                                                                                    disabled={isBusy}
                                                                                                                                                    className="p-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 transition-colors disabled:opacity-40"
                                                                                                                                                    aria-label="Confirmar"
                                                                                                                                                  >
                                                                                                                                                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                                                                                                                        </button>
                                                                                                                      <button
                                                                                                                                                    onClick={() => setEditCantidadId(null)}
                                                                                                                                                    className="p-1 rounded-lg hover:bg-stone-100 transition-colors"
                                                                                                                                                    aria-label="Cancelar"
                                                                                                                                                  >
                                                                                                                                                  <X className="w-3.5 h-3.5 text-stone-400" />
                                                                                                                        </button>
                                                                                            </div>
                                                                                          ) : (
                                                                                            <div className="flex items-center gap-2 shrink-0">
                                                                                                                      <span className="text-sm font-mono font-bold text-stone-700">
                                                                                                                        {rec.cantidad_a_descontar} {ins?.unidad_medida ?? rec.unidad_medida ?? ''}
                                                                                                                      </span>
                                                                                                                      <span className="text-[10px] font-mono text-stone-500 bg-stone-100 rounded px-1.5 py-0.5" title="Rendimiento culinario de la materia prima">
                                                                                                                        Rend: {rec.rendimiento ?? 100}%
                                                                                                                      </span>
                                                                                                                      <button
                                                                                                                                                    onClick={() => handleStartEditCantidad(rec)}
                                                                                                                                                    disabled={isBusy}
                                                                                                                                                    className="p-1 rounded-lg hover:bg-stone-100 transition-colors disabled:opacity-40"
                                                                                                                                                    aria-label={`Editar ${ins?.nombre ?? rec.id_insumo}`}
                                                                                                                                                    title="Editar ingrediente"
                                                                                                                                                  >
                                                                                                                                                  <Edit2 className="w-3.5 h-3.5 text-stone-400" />
                                                                                                                        </button>
                                                                                                                      <button
                                                                                                                                                    onClick={() => handleRemoveRecipeItem(rec.id_receta)}
                                                                                                                                                    disabled={isBusy}
                                                                                                                                                    className="p-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                                                                                                                                                    aria-label={`Eliminar ${ins?.nombre ?? rec.id_insumo}`}
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
                                                                                              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30 cursor-pointer"
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
                                                                                              className="w-24 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30"
                                                                                              aria-label="Cantidad del insumo"
                                                                                            />
                                                          </div>
                                                          <div>
                                                                          <label className="text-[10px] font-black text-stone-500 uppercase block mb-1">Rend. %</label>
                                                                          <input
                                                                                              type="number"
                                                                                              min="1"
                                                                                              max="100"
                                                                                              value={rendimientoUsar}
                                                                                              onChange={e => setRendimientoUsar(e.target.value)}
                                                                                              placeholder="100"
                                                                                              className="w-20 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30"
                                                                                              aria-label="Rendimiento del insumo"
                                                                                            />
                                                          </div>
                                                          <button
                                                                            type="submit"
                                                                            disabled={!!pendingAction || !selectedInsumoId || !cantidadUsar}
                                                                            className="bg-[#624A3E] hover:bg-[#4e3a30] text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                                                            aria-label="Agregar ingrediente a la receta"
                                                                          >
                                                                          <Plus className="w-4 h-4" /> Agregar
                                                          </button>
                                            </form>
                                </div>

                                {/* SIMULADOR DE MARGEN Y PRECIO SUGERIDO */}
                                {selectedProduct && calculatedCost > 0 && (
                                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3.5">
                                    <h3 className="text-xs font-black text-[#624A3E] uppercase tracking-wider flex items-center gap-2 border-b border-stone-100 pb-2">
                                      📊 Simulador de Precios e Ingeniería de Menú
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                      <div>
                                        <span className="text-[10px] font-bold text-stone-550 block mb-1 uppercase">Costo Receta Neto</span>
                                        <span className="text-base font-black text-stone-900 font-mono">
                                          ${calculatedCost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-bold text-stone-550 block mb-1 uppercase">Margen Objetivo %</label>
                                        <div className="flex items-center gap-1.5">
                                          <input
                                            type="number"
                                            min="10"
                                            max="95"
                                            value={targetMarginInput}
                                            onChange={e => setTargetMarginInput(e.target.value)}
                                            className="w-16 px-2.5 py-1.5 text-xs font-bold border border-stone-200 rounded-lg bg-stone-50 text-stone-700 font-mono"
                                          />
                                          <span className="text-xs text-stone-550 font-bold">%</span>
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-[10px] font-bold text-stone-550 block mb-1 uppercase">Precio Sugerido Venta</span>
                                        <span className="text-base font-black text-emerald-750 font-mono">
                                          ${suggestedPrice.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </span>
                                      </div>
                                    </div>
                                    <button
                                      onClick={handleApplySuggestedPrice}
                                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                                    >
                                      Aplicar Precio Sugerido al Menú
                                    </button>
                                  </div>
                                )}

                                {/* CALCULADORA DE PRODUCCIÓN / ABASTECIMIENTO */}
                                {selectedProduct && currentRecipeItems.length > 0 && (
                                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                                    <h3 className="text-xs font-black text-[#624A3E] uppercase tracking-wider flex items-center gap-2 border-b border-stone-100 pb-2">
                                      🍳 Calculadora de Abastecimiento de Producción
                                    </h3>
                                    <div className="flex items-center gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200/50">
                                      <div className="flex-1">
                                        <label className="text-[10px] font-black text-stone-550 block mb-1 uppercase">Cantidad de Porciones a Preparar</label>
                                        <input
                                          type="number"
                                          min="1"
                                          value={portionsInput}
                                          onChange={e => setPortionsInput(e.target.value)}
                                          className="w-full px-3 py-2 text-xs font-bold border border-stone-200 rounded-lg bg-white text-stone-700"
                                          placeholder="Ej: 50"
                                        />
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <span className="text-[10px] font-bold text-stone-500 uppercase block">Necesidad de Ingredientes Consolidada</span>
                                      <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden text-xs">
                                        {currentRecipeItems.map(rec => {
                                          const ins = insumos.find(i => i.id_insumo === rec.id_insumo);
                                          const portions = parseInt(portionsInput) || 0;
                                          const rend = rec.rendimiento ?? 100;
                                          const factorRend = rend > 0 ? 100 / rend : 1;
                                          
                                          const netQtyPerPortion = rec.cantidad_a_descontar;
                                          const grossQtyPerPortion = netQtyPerPortion * factorRend;
                                          
                                          const totalGrossNeeded = grossQtyPerPortion * portions;
                                          const stock = ins?.stock_actual ?? 0;
                                          const buyNeeded = Math.max(0, totalGrossNeeded - stock);
                                          
                                          return (
                                            <div key={rec.id_receta} className="p-3 bg-white flex justify-between items-center hover:bg-stone-50/40">
                                              <div>
                                                <p className="font-bold text-stone-850">{ins?.nombre ?? rec.id_insumo}</p>
                                                <p className="text-[10px] text-stone-400">
                                                  Por porción: {netQtyPerPortion} {ins?.unidad_medida} (Bruto: {grossQtyPerPortion.toFixed(1)} {ins?.unidad_medida})
                                                </p>
                                              </div>
                                              <div className="text-right">
                                                <p className="font-semibold text-stone-700">Requerido: <span className="font-mono font-bold">{totalGrossNeeded.toLocaleString('es-AR', { maximumFractionDigits: 1 })} {ins?.unidad_medida}</span></p>
                                                {buyNeeded > 0 ? (
                                                  <p className="text-[10px] text-rose-600 font-bold">
                                                    Faltante: {buyNeeded.toLocaleString('es-AR', { maximumFractionDigits: 1 })} {ins?.unidad_medida} (Comprar)
                                                  </p>
                                                ) : (
                                                  <p className="text-[10px] text-emerald-600 font-bold">Stock suficiente</p>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* ── Ficha Técnica del Chef ── */}
                                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                                  <h3 className="text-xs font-black text-[#624A3E] uppercase tracking-wider flex items-center gap-2 border-b border-stone-100 pb-2">
                                    📖 Ficha Técnica y Pasos de Cocina
                                  </h3>
                                  
                                  {selectedProduct ? (
                                    <div className="space-y-4 font-sans text-sm text-stone-700">
                                      {/* Alérgenos */}
                                      <div>
                                        <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1.5">
                                          ⚠️ Alérgenos Declarados
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                          {['Gluten', 'Lácteos', 'Huevo', 'Frutos Secos', 'Pescado', 'Mariscos', 'Maní', 'Sésamo'].map(al => {
                                            const hasAl = (selectedProduct.alergenos || []).includes(al);
                                            return (
                                              <button
                                                key={al}
                                                type="button"
                                                onClick={async () => {
                                                  const nextAls = hasAl
                                                    ? (selectedProduct.alergenos || []).filter(item => item !== al)
                                                    : [...(selectedProduct.alergenos || []), al];
                                                  try {
                                                    await menuService.update(selectedProduct.id_producto, { alergenos: nextAls });
                                                    const updated = productosMenu.map(p => p.id_producto === selectedProduct.id_producto ? { ...p, alergenos: nextAls } : p);
                                                    onProductosChange(updated);
                                                    toast.success(`Alérgenos de "${selectedProduct.nombre}" actualizados.`);
                                                  } catch (err: any) {
                                                    toast.error('Error al guardar alérgenos: ' + err.message);
                                                  }
                                                }}
                                                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                                  hasAl
                                                    ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-sm font-black'
                                                    : 'bg-stone-50 border-stone-200 text-stone-450 hover:bg-stone-100'
                                                }`}
                                              >
                                                {al}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      {/* Consejos de emplatado */}
                                      <div>
                                        <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">
                                          🍽️ Sugerencia de Emplatado y Vajilla
                                        </label>
                                        <textarea
                                          rows={2}
                                          value={selectedProduct.consejo_emplatado || ''}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            const updatedLocal = productosMenu.map(p => p.id_producto === selectedProduct.id_producto ? { ...p, consejo_emplatado: val } : p);
                                            onProductosChange(updatedLocal);
                                          }}
                                          onBlur={async (e) => {
                                            try {
                                              await menuService.update(selectedProduct.id_producto, { consejo_emplatado: e.target.value });
                                              toast.success('Consejo de emplatado guardado.');
                                            } catch (err: any) {
                                              toast.error('Error al guardar consejo de emplatado.');
                                            }
                                          }}
                                          placeholder="Ej: Servir en plato plano precalentado con un ramito de romero fresco a la derecha..."
                                          className="w-full text-xs p-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30 bg-stone-50 text-stone-850"
                                        />
                                      </div>

                                      {/* Pasos de preparación */}
                                      <div>
                                        <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-2">
                                          🍳 Instrucciones de Cocción Paso a Paso
                                        </label>
                                        <div className="space-y-2.5">
                                          {(selectedProduct.pasos_preparacion || []).map((step, idx) => (
                                            <div key={idx} className="flex gap-2.5 items-start text-xs bg-stone-50 p-2.5 rounded-xl border border-stone-150">
                                              <span className="w-5 h-5 rounded-full bg-[#624A3E] text-white flex items-center justify-center shrink-0 font-bold text-[10px] font-mono">
                                                {idx + 1}
                                              </span>
                                              <span className="flex-1 leading-relaxed text-stone-750 font-medium">
                                                {step}
                                                <StepTimer text={step} />
                                              </span>
                                              <button
                                                type="button"
                                                onClick={async () => {
                                                  const nextSteps = (selectedProduct.pasos_preparacion || []).filter((_, sidx) => sidx !== idx);
                                                  try {
                                                    await menuService.update(selectedProduct.id_producto, { pasos_preparacion: nextSteps });
                                                    const updated = productosMenu.map(p => p.id_producto === selectedProduct.id_producto ? { ...p, pasos_preparacion: nextSteps } : p);
                                                    onProductosChange(updated);
                                                    toast.success('Paso de cocción eliminado.');
                                                  } catch (err: any) {
                                                    toast.error('Error al eliminar paso.');
                                                  }
                                                }}
                                                className="text-stone-400 hover:text-red-500 font-bold transition-colors text-[10px] uppercase font-sans tracking-wider shrink-0 cursor-pointer"
                                              >
                                                Borrar
                                              </button>
                                            </div>
                                          ))}

                                          <form
                                            onSubmit={async (e) => {
                                              e.preventDefault();
                                              const input = (e.target as any).elements.nuevoPasoInput;
                                              const stepVal = input.value.trim();
                                              if (!stepVal) return;
                                              
                                              const nextSteps = [...(selectedProduct.pasos_preparacion || []), stepVal];
                                              try {
                                                await menuService.update(selectedProduct.id_producto, { pasos_preparacion: nextSteps });
                                                const updated = productosMenu.map(p => p.id_producto === selectedProduct.id_producto ? { ...p, pasos_preparacion: nextSteps } : p);
                                                onProductosChange(updated);
                                                input.value = '';
                                                toast.success('Paso de cocción agregado.');
                                              } catch (err: any) {
                                                toast.error('Error al agregar paso.');
                                              }
                                            }}
                                            className="flex gap-2"
                                          >
                                            <input
                                              type="text"
                                              name="nuevoPasoInput"
                                              placeholder="Ej: Sellar a fuego fuerte por 3 minutos..."
                                              className="flex-1 text-xs px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30 bg-white"
                                            />
                                            <button
                                              type="submit"
                                              className="bg-[#624A3E] text-white text-xs font-black px-4 py-2 rounded-xl hover:bg-[#4e3a30] transition-colors shrink-0 cursor-pointer"
                                            >
                                              + Añadir Paso
                                            </button>
                                          </form>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-stone-400 text-xs italic">Seleccione un producto para ver su ficha técnica.</p>
                                  )}
                                </div>
                      </div>
              </div>
        </div>
      );
}
