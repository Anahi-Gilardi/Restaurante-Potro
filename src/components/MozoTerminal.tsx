import React, { useState, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Plus, 
  Minus, 
  ShoppingBag, 
  AlertTriangle, 
  CheckCircle, 
  Bookmark, 
  Search, 
  Sparkles, 
  Coffee, 
  Pizza, 
  UtensilsCrossed, 
  Wine, 
  DollarSign, 
  Receipt,
  Mic,
  MicOff,
  Volume2,
  X,
  Tag,
  Clock,
  Link2,
  Scissors,
  AlertCircle,
  RotateCcw,
  Trash2,
  Edit3,
  Save,
  Loader2,
  Printer
} from 'lucide-react';
import { Mesa, Insumo, ProductoMenu, RecetaEscandallo, Pedido, PedidoItem } from '../types';
import { createMozoCartIdempotencyKey } from '../lib/mozoCartDraft';
import { calculatePedidoTotal, resolvePedidoItemUnitPrice } from '../lib/orderPricing';
import { promocionesService, Promocion } from '../services/promocionesService';
import { pedidosService } from '../services/pedidosService';
import { menuDiarioService, MenuDiarioDia, INITIAL_MENU_DIARIO } from '../services/menuDiarioService';
import { printComandaThermalTicket } from '../lib/comandaPrinter';
import { formatTicketTableName, isUnitedTable, formatUnitedTableName } from '../lib/tableUnions';
import { getTableActiveInfo, isTableOccupied, TableActiveInfo } from '../lib/tableOrders';
import { formatArgentinaDateTime, formatArgentinaTime } from '../lib/argentinaDate';
import { useToast, ToastContainer } from './ToastContainer';
import { useCategories } from '../hooks/useCategories';
import { mergeWithDefaultCategories } from '../services/categoriasService';
import { matchesProductSearch } from './MenuModule';

export const normalizeCategoryString = (str?: string | null): string => {
  return (str || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
};

export const isBodegaCategory = (catName?: string | null): boolean => {
  const norm = normalizeCategoryString(catName);
  return (
    norm.includes('bodega') ||
    norm.includes('vino') ||
    norm.includes('espumante') ||
    norm.includes('champagne') ||
    norm.includes('cava')
  );
};

export const getCategoryDisplayIcon = (icono?: string | null, nombre?: string): string => {
  if (icono && (/\p{Extended_Pictographic}/u.test(icono) || (icono.length <= 4 && !/^[a-zA-Z]+$/.test(icono)))) {
    return icono;
  }
  const target = ((icono || '') + ' ' + (nombre || '')).toLowerCase();
  if (target.includes('carne') || target.includes('beef') || target.includes('parrilla') || target.includes('corte')) return '🥩';
  if (target.includes('pasta') || target.includes('pizza') || target.includes('fideo')) return '🍝';
  if (target.includes('pescad') || target.includes('fish') || target.includes('marisco')) return '🐟';
  if (target.includes('criolla') || target.includes('empanada') || target.includes('locro')) return '🥟';
  if (target.includes('postre') || target.includes('dulce') || target.includes('flan') || target.includes('helado') || target.includes('torta')) return '🍮';
  if (target.includes('vino') || target.includes('bodega') || target.includes('wine')) return '🍷';
  if (target.includes('cerveza') || target.includes('alcohol') || target.includes('beer') || target.includes('trago')) return '🍺';
  if (target.includes('bebida') || target.includes('gaseosa') || target.includes('jugo') || target.includes('agua')) return '🥤';
  if (target.includes('cafe') || target.includes('coffee') || target.includes('te') || target.includes('infusion')) return '☕';
  if (target.includes('entrada') || target.includes('salad') || target.includes('verde') || target.includes('ensalada')) return '🥗';
  return '🍽️';
};

interface WineMapping {
  macro: 'tintas' | 'blancas' | 'champagne' | 'copas' | 'destilados' | null;
  varietales: string[];
}

function getWineMapping(p: ProductoMenu): WineMapping {
  const name = p.nombre.toLowerCase();
  const desc = (p.descripcion || '').toLowerCase();
  const sub = (p.subcategoria || '').toLowerCase();
  const cat = (p.categoria || '').toLowerCase();

  let macro: WineMapping['macro'] = null;
  const varietales: string[] = [];

  // Categorize based on category, subcategory or name
  if (p.categoria === 'Bodega' || isBodegaCategory(p.categoria)) {
    if (cat.includes('destilado') || cat.includes('trago') || cat.includes('coctel') || sub.includes('whisky') || sub.includes('gin') || sub.includes('fernet') || sub.includes('aperitivo') || sub.includes('vermut') || name.includes('whisky') || name.includes('gin') || name.includes('fernet') || name.includes('aperol') || name.includes('vermut')) {
      macro = 'destilados';
    } else if (sub.includes('espumantes') || sub.includes('champagne') || cat.includes('espumante') || name.includes('champagne') || name.includes('chandon') || name.includes('baron b') || name.includes('aluda') || name.includes('alyda') || name.includes('rosé') || name.includes('brut')) {
      macro = 'champagne';
    } else if (name.includes('copa') || name.includes('copas')) {
      macro = 'copas';
    } else if (
      cat.includes('blanco') || cat.includes('rosado') || sub.includes('blancos') || 
      name.includes('sauvignon blanc') || name.includes('sauvignon-blanc') || name.includes('sb') ||
      name.includes('chardonnay') || 
      name.includes('viognier') || 
      name.includes('torrontés') || name.includes('torrontes') || 
      name.includes('riesling') || 
      name.includes('gewurztraminer') || 
      name.includes('albariño')
    ) {
      macro = 'blancas';
    } else {
      macro = 'tintas';
    }
  } else if (p.categoria === 'Bebidas' || p.categoria === 'Bebidas con Alcohol' || p.categoria === 'Bebidas sin Alcohol') {
    if (sub.includes('whisky') || sub.includes('gin') || sub.includes('fernet') || sub.includes('aperitivos') || name.includes('macallan') || name.includes('gin') || name.includes('fernet') || name.includes('aperol') || name.includes('spritz')) {
      macro = 'destilados';
    }
  }

  if (macro === 'tintas') {
    // Malbec
    if (name.includes('malbec')) {
      varietales.push('Malbec');
    }

    // Cabernet Sauvignon
    if (name.includes('cabernet sauvignon') || name.includes('cab-sauv') || name.includes('cs')) {
      varietales.push('Cabernet Sauvignon');
    }

    // Cabernet Franc
    if (name.includes('cabernet franc') || name.includes('cf')) {
      varietales.push('Cabernet Franc');
    }

    // Merlot
    if (name.includes('merlot')) {
      varietales.push('Merlot');
    }

    // Pinot Noir
    if (name.includes('pinot noir') || name.includes('pinot')) {
      varietales.push('Pinot Noir');
    }

    // Red Blend
    if (name.includes('red blend') || name.includes('blend') || name.includes('gran reserva')) {
      varietales.push('Red Blend');
    }

    // Otros Varietales Tintos (Ancellotta, Tannat, Petit Verdot)
    if (
      name.includes('ancelotta') || 
      name.includes('tannat') || 
      name.includes('petit verdot') || 
      name.includes('ala colorada')
    ) {
      varietales.push('Otros Varietales Tintos');
    }
  }

  if (macro === 'blancas') {
    // Chardonnay
    if (
      name.includes('trumpeter doux') || name.includes('doux') ||
      name.includes('escorihuela') ||
      name.includes('st felicien') || name.includes('saint felicien') ||
      name.includes('angélica zapata') || name.includes('angelica zapata') ||
      name.includes('luca') ||
      name.includes('perdices reserva chardonnay') || name.includes('perdices chardonnay') || name.includes('perdices reserva') ||
      name.includes('exploración') || name.includes('exploracion') ||
      name.includes('salentein reserva chardonnay') || name.includes('reserva chardonnay')
    ) {
      varietales.push('Chardonnay');
    }

    // Sauvignon Blanc
    if (
      name.includes('escorihuela') ||
      name.includes('st felicien sauvignon') || name.includes('saint felicien sauvignon') ||
      name.includes('perdices sauvignon') || name.includes('perdices sb') ||
      name.includes('portillo sauvignon') || name.includes('portillo sb') ||
      name.includes('reserva sauvignon') ||
      name.includes('pyros sauvignon') || name.includes('pyros sb') ||
      name.includes('ala viognier')
    ) {
      varietales.push('Sauvignon Blanc');
    }

    // Torrontés
    if (name.includes('torrontés') || name.includes('torrontes')) {
      varietales.push('Torrontés');
    }

    // Riesling
    if (name.includes('riesling')) {
      varietales.push('Riesling');
    }

    // Gewurztraminer
    if (name.includes('gewurztraminer') || name.includes('gewürz')) {
      varietales.push('Gewurztraminer');
    }

    // Albariño
    if (name.includes('albariño') || name.includes('albarino')) {
      varietales.push('Albariño');
    }
  }

  if (macro === 'champagne') {
    if (name.includes('baron b')) {
      varietales.push('Baron B');
    } else if (name.includes('aluda') || name.includes('alyda')) {
      varietales.push('Alyda');
    } else if (name.includes('encuentro')) {
      varietales.push('Encuentro');
    } else if (name.includes('salentein')) {
      varietales.push('Salentein');
    } else if (name.includes('chandon')) {
      varietales.push('Chandon');
    }
  }

  if (macro === 'destilados') {
    if (name.includes('whisky') || name.includes('macallan') || name.includes('johnnie') || name.includes('daniel') || name.includes('jameson')) {
      varietales.push('Whisky');
    } else if (name.includes('gin') || name.includes('heráclito') || name.includes('heraclito') || name.includes('beefeater') || name.includes('bombay') || name.includes('spirito')) {
      varietales.push('Gin');
    } else if (name.includes('fernet') || name.includes('branca')) {
      varietales.push('Fernet');
    } else if (name.includes('aperol') || name.includes('spritz') || name.includes('aperitivo') || name.includes('gancia') || name.includes('campari') || name.includes('carpano') || name.includes('martini') || name.includes('vermut')) {
      varietales.push('Aperitivos');
    } else if (name.includes('vodka') || name.includes('sernova')) {
      varietales.push('Vodka');
    }
  }

  return { macro, varietales };
}

interface MozoTerminalProps {
  mesas: Mesa[];
  insumos: Insumo[];
  productosMenu: ProductoMenu[];
  recetas: RecetaEscandallo[];
  activeMozo: string;
  onMozoChange: (mozo: string) => void;
  onCrearPedido: (pedido: Omit<Pedido, 'id_pedido' | 'fecha_hora' | 'minutos_transcurridos' | 'origen'> & { origen?: 'Mozo'; comensales?: number; idempotency_key?: string }) => void | boolean | Promise<void | boolean>;
  onActualizarPedido?: (idPedido: number, updatedFields: Partial<Pedido>) => Promise<boolean | void> | boolean | void;
  pedidos: Pedido[];
  onFacturarMesa: (idPedido: number) => void;
  addLog: (tipo: 'pedido_creado' | 'descuento_stock' | 'alerta_stock' | 'comanda_estado' | 'sistema', mensaje: string) => void;
  permitirVentaSinStock?: boolean;
  onUnirMesas?: (idMesa1: number, idMesa2: number | number[]) => Promise<void> | void;
  onDesunirMesas?: (idMesa: number) => Promise<void> | void;
  onLiberarMesa?: (idMesa: number | string) => Promise<void> | void;
}

export default function MozoTerminal({
  mesas,
  insumos,
  productosMenu,
  recetas,
  activeMozo,
  onMozoChange,
  onCrearPedido,
  onActualizarPedido,
  pedidos,
  onFacturarMesa,
  addLog,
  permitirVentaSinStock = true,
  onUnirMesas,
  onDesunirMesas,
  onLiberarMesa
}: MozoTerminalProps) {
  const { toast, toasts, removeToast } = useToast();
  const { categories } = useCategories();
  const checkoutInFlightRef = useRef(false);
  // Waiter selections
  const [selectedMesaId, setSelectedMesaId] = useState<number | null>(null);
  const [isUniting, setIsUniting] = useState(false);
  const [targetUniteMesaIds, setTargetUniteMesaIds] = useState<number[]>([]);
  const [confirmLiberarMesaId, setConfirmLiberarMesaId] = useState<number | string | null>(null);
  const [comensales, setComensales] = useState<number>(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todo');

  // Estados para Edición de Pedidos en Mesa
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
  const [editingItems, setEditingItems] = useState<PedidoItem[]>([]);
  const [editingObservaciones, setEditingObservaciones] = useState<string>('');
  const [editProductSearch, setEditProductSearch] = useState<string>('');
  const [editCategoryFilter, setEditCategoryFilter] = useState<string>('todos');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const handleStartEditPedido = (pedidoToEdit: Pedido) => {
    setEditingPedido(pedidoToEdit);
    setEditingItems(pedidoToEdit.items.map(it => ({ ...it })));
    setEditingObservaciones(pedidoToEdit.observaciones || '');
    setEditProductSearch('');
    setEditCategoryFilter('todos');
  };

  const handleEditItemQuantity = (index: number, delta: number) => {
    setEditingItems(prev => {
      const next = [...prev];
      const target = next[index];
      if (!target) return prev;
      const nextQty = target.cantidad + delta;
      if (nextQty <= 0) {
        return next.filter((_, i) => i !== index);
      }
      next[index] = { ...target, cantidad: nextQty };
      return next;
    });
  };

  const handleEditRemoveItem = (index: number) => {
    setEditingItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditAddProduct = (prod: ProductoMenu) => {
    setEditingItems(prev => {
      const existingIdx = prev.findIndex(it => it.id_producto === prod.id_producto);
      if (existingIdx > -1) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          cantidad: next[existingIdx].cantidad + 1
        };
        return next;
      }
      const newItem: PedidoItem = {
        id_producto: prod.id_producto,
        nombre: prod.nombre,
        cantidad: 1,
        categoria: prod.categoria,
        precio_unitario: prod.precio_venta,
        estado: 'pendiente'
      };
      return [...prev, newItem];
    });
    toast.success(`'${prod.nombre}' agregado a la edición.`);
  };

  const editingTotal = useMemo(() => {
    if (!editingItems || editingItems.length === 0) return 0;
    return editingItems.reduce((acc, it) => {
      const price = resolvePedidoItemUnitPrice(it, productosMenu);
      return acc + (price * it.cantidad);
    }, 0);
  }, [editingItems, productosMenu]);

  const editCategoriesList = useMemo(() => {
    const set = new Set<string>();
    productosMenu.forEach(p => {
      if (p.categoria?.trim() && p.activo !== false) {
        set.add(p.categoria.trim());
      }
    });

    const preferredOrder = [
      'Entradas',
      'Parrilla',
      'Carnes',
      'Pastas',
      'Cocina',
      'Comidas Criollas',
      'Pescados',
      'Postres',
      'Bebidas sin Alcohol',
      'Bebidas con Alcohol',
      'Cervezas',
      'Bodega',
      'Vinos Tintos',
      'Vinos Blancos y Rosados',
      'Espumantes',
      'Destilados',
      'Tragos y Coctelería'
    ];

    const ordered: string[] = [];
    preferredOrder.forEach(cat => {
      const match = Array.from(set).find(c => normalizeCategoryString(c) === normalizeCategoryString(cat));
      if (match) {
        ordered.push(match);
        set.delete(match);
      }
    });

    const remaining = Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
    return ['Todos', ...ordered, ...remaining];
  }, [productosMenu]);

  const { filteredProductsForEdit, isCrossCategoryEditSearch } = useMemo(() => {
    const query = editProductSearch.trim();
    const isAll = !editCategoryFilter || editCategoryFilter.toLowerCase() === 'todos' || editCategoryFilter.toLowerCase() === 'todo';

    const matchesCat = (p: ProductoMenu, cat: string): boolean => {
      if (!cat || cat.toLowerCase() === 'todos' || cat.toLowerCase() === 'todo') return true;
      const normCat = normalizeCategoryString(cat);
      const pCatNorm = normalizeCategoryString(p.categoria);
      if (p.categoria === cat) return true;
      if (pCatNorm === normCat) return true;
      if (pCatNorm.includes(normCat) || normCat.includes(pCatNorm)) return true;
      if (normCat === 'parrilla' && (pCatNorm.includes('carne') || pCatNorm.includes('asado') || pCatNorm.includes('corte'))) return true;
      if (normCat === 'carnes' && (pCatNorm.includes('parrilla') || pCatNorm.includes('corte') || pCatNorm.includes('asado'))) return true;
      if (normCat === 'bodega' && (p.tipo === 'vino' || isBodegaCategory(p.categoria))) return true;
      if (normCat === 'bebidas' && (pCatNorm.includes('bebida') || p.tipo === 'bebida')) return true;
      return false;
    };

    const activeProducts = productosMenu.filter(p => p.activo !== false);

    if (!query) {
      const list = isAll ? activeProducts : activeProducts.filter(p => matchesCat(p, editCategoryFilter));
      return { filteredProductsForEdit: list, isCrossCategoryEditSearch: false };
    }

    if (isAll) {
      const allMatches = activeProducts.filter(p => matchesProductSearch(p, query));
      return { filteredProductsForEdit: allMatches, isCrossCategoryEditSearch: false };
    }

    const catMatches = activeProducts.filter(p => matchesCat(p, editCategoryFilter) && matchesProductSearch(p, query));
    if (catMatches.length > 0) {
      return { filteredProductsForEdit: catMatches, isCrossCategoryEditSearch: false };
    }

    // Fallback global inteligente si no hay en la categoría actual pero sí en otra parte del menú
    const globalMatches = activeProducts.filter(p => matchesProductSearch(p, query));
    return {
      filteredProductsForEdit: globalMatches,
      isCrossCategoryEditSearch: globalMatches.length > 0
    };
  }, [productosMenu, editCategoryFilter, editProductSearch]);

  const handleSaveEditPedido = async (andPrint = false) => {
    if (!editingPedido) return;
    if (editingItems.length === 0) {
      toast.warning('El pedido debe tener al menos un producto. Si desea cancelar toda la comanda, utilice la opción "Cancelar comanda y liberar mesa".');
      return;
    }

    setIsSavingEdit(true);
    try {
      const cleanObs = editingObservaciones.trim() || undefined;
      const updatedFields: Partial<Pedido> = {
        items: editingItems,
        observaciones: cleanObs
      };

      if (onActualizarPedido) {
        await onActualizarPedido(editingPedido.id_pedido, updatedFields);
      } else {
        await pedidosService.update(editingPedido.id_pedido, updatedFields);
      }

      if (andPrint) {
        const tableOrderName = selectedMesa ? selectedMesa.numero_mesa : (editingPedido.numero_mesa || `Mesa ${editingPedido.id_mesa}`);
        printComandaThermalTicket({
          mesa: formatTicketTableName(tableOrderName),
          mozo: editingPedido.mozo || activeMozo || 'Mozo',
          items: editingItems.map(i => ({
            nombre: i.nombre,
            cantidad: i.cantidad,
            observaciones: cleanObs,
          })),
          observaciones: cleanObs,
        });
        toast.success(`Pedido #${editingPedido.id_pedido} guardado y comanda emitida 🖨️`);
      } else {
        toast.success(`Pedido #${editingPedido.id_pedido} actualizado correctamente.`);
      }

      setEditingPedido(null);
    } catch (err: any) {
      console.error('Error al guardar edición del pedido:', err);
      toast.error(`Error al actualizar pedido: ${err?.message || err}`);
    } finally {
      setIsSavingEdit(false);
    }
  };
  
  // Dynamic Promociones State
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [promocionesLoading, setPromocionesLoading] = useState(true);

  // Dynamic categories combined: system fixed items + dynamic categories from Sheet/DB + loaded products
  const displayCategories = useMemo(() => {
    const fixed = [
      { id: 'todo', label: 'Todos 🍽️' },
      { id: 'MenuDelDia', label: 'Menú del Día 🌟' },
      { id: 'Promociones', label: `Promociones 🏷️ (${promociones.length})` }
    ];

    const base = mergeWithDefaultCategories(categories || []);
    const existingNames = new Set(base.map(c => c.nombre.toLowerCase().trim()));

    // Also include any category from loaded products if not present
    productosMenu.forEach(p => {
      if (!p.categoria) return;
      const catTrim = p.categoria.trim();
      if (!existingNames.has(catTrim.toLowerCase())) {
        existingNames.add(catTrim.toLowerCase());
        base.push({
          id: `cat_${normalizeCategoryString(catTrim)}`,
          nombre: catTrim,
          slug: normalizeCategoryString(catTrim),
          orden: 85,
          activa: true,
          icono: (p.tipo === 'vino' || catTrim.toLowerCase().includes('vino')) ? 'Wine' : 'UtensilsCrossed'
        });
      }
    });

    const dynamic = base
      .filter(c => c.activa !== false)
      .sort((a, b) => Number(a.orden || 99) - Number(b.orden || 99))
      .map(c => ({
        id: c.nombre,
        label: `${c.nombre} ${getCategoryDisplayIcon(c.icono, c.nombre)}`.trim()
      }));

    return [...fixed, ...dynamic];
  }, [categories, promociones.length, productosMenu]);

  React.useEffect(() => {
    let isMounted = true;
    promocionesService.list()
      .then(data => {
        if (isMounted) {
          setPromociones((data || []).filter(p => p.activo !== false));
          setPromocionesLoading(false);
        }
      })
      .catch(err => {
        console.warn('Error al cargar promociones en MozoTerminal:', err);
        if (isMounted) setPromocionesLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  // Dynamic Menu Diario State
  const [menuDiario, setMenuDiario] = useState<Record<string, MenuDiarioDia>>(INITIAL_MENU_DIARIO);
  const [menuDiarioLoading, setMenuDiarioLoading] = useState(true);

  React.useEffect(() => {
    let isMounted = true;
    menuDiarioService.list()
      .then(data => {
        if (isMounted) {
          setMenuDiario(data || INITIAL_MENU_DIARIO);
          setMenuDiarioLoading(false);
        }
      })
      .catch(err => {
        console.warn('Error al cargar menú diario en MozoTerminal:', err);
        if (isMounted) setMenuDiarioLoading(false);
      });
    return () => { isMounted = false; };
  }, []);
  
  // Bodega hierarchy states
  const [selectedWineMacro, setSelectedWineMacro] = useState<'tintas' | 'blancas' | 'champagne' | 'copas' | 'destilados' | 'todo'>('todo');
  const [selectedWineVarietal, setSelectedWineVarietal] = useState<string>('todo');
  
  // Current order cart
  const [cart, setCart] = useState<{ [id_producto: string]: number }>({});
  const [observaciones, setObservaciones] = useState('');

  // Voice Command States
  const [isListening, setIsListening] = useState(false);
  const [voiceResult, setVoiceResult] = useState<VoiceCommandResult | null>(null);
  const [voiceText, setVoiceText] = useState('');
  const recognitionRef = React.useRef<any>(null);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.warning('Tu navegador no soporta control por voz. Probá con Google Chrome.');
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = 'es-AR';
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setVoiceText(transcript);
        const parsed = parseVoiceCommand(transcript, productosMenu);
        setVoiceResult(parsed);
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error:', e);
        toast.warning('No se pudo escuchar con claridad. Por favor reintentá.');
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleConfirmVoiceCommand = () => {
    if (!voiceResult) return;

    // 1. If mesa is detected, set it as selected
    if (voiceResult.mesa !== null) {
      if (voiceResult.mesa === 'delivery') {
        setSelectedMesaId(999);
      } else {
        const targetMesa = mesas.find(m => parseInt(m.numero_mesa, 10) === voiceResult.mesa);
        if (targetMesa) {
          setSelectedMesaId(targetMesa.id_mesa);
        } else {
          toast.error(`La Mesa ${voiceResult.mesa} no existe o no está activa.`);
        }
      }
    }

    // 2. Add items to cart
    setCart(prev => {
      const next = { ...prev };
      voiceResult.items.forEach(item => {
        const prodId = item.product.id_producto;
        next[prodId] = (next[prodId] || 0) + item.quantity;
      });
      return next;
    });

    setVoiceResult(null);
  };

  // Bill splitting state
  const [splittingPedidoId, setSplittingPedidoId] = useState<number | null>(null);
  const [splitCount, setSplitCount] = useState<number>(2);
  const [splitItemsChecked, setSplitItemsChecked] = useState<{ [itemIdx: number]: boolean }>({});
  const [confirmCobrarId, setConfirmCobrarId] = useState<number | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (searchQuery) setSearchQuery('');
        if (splittingPedidoId !== null) {
          setSplittingPedidoId(null);
          setSplitItemsChecked({});
        }
        if (confirmCobrarId !== null) {
          setConfirmCobrarId(null);
        }
        if (confirmLiberarMesaId !== null) {
          setConfirmLiberarMesaId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery, splittingPedidoId, confirmCobrarId, confirmLiberarMesaId]);

  // Map of derived active info for all tables (occupancy, active orders, pax, labels)
  const mesasActiveInfoMap = useMemo(() => {
    const map = new Map<number, TableActiveInfo>();
    mesas.forEach(m => {
      map.set(m.id_mesa, getTableActiveInfo(m, pedidos));
    });
    return map;
  }, [mesas, pedidos]);

  const occupiedCount = useMemo(() => {
    return mesas.filter(m => isTableOccupied(m, pedidos)).length;
  }, [mesas, pedidos]);

  const selectedMesa = useMemo(() => {
    if (selectedMesaId === null) return null;
    return mesas.find(m => String(m.id_mesa) === String(selectedMesaId)) || null;
  }, [selectedMesaId, mesas]);

  const selectedMesaInfo = useMemo(() => {
    if (!selectedMesa) return null;
    return mesasActiveInfoMap.get(selectedMesa.id_mesa) || getTableActiveInfo(selectedMesa, pedidos);
  }, [selectedMesa, mesasActiveInfoMap, pedidos]);

  // Find active order of the selected table if any (to split or pay)
  const activePedidoDeMesa = useMemo(() => {
    if (!selectedMesa) return null;
    return selectedMesaInfo?.activeOrder || null;
  }, [selectedMesa, selectedMesaInfo]);

  // Emitir / Reimprimir comanda activa de cocina a la tiquetera
  const handleEmitirComanda = (pedidoToPrint?: Pedido | null) => {
    const p = pedidoToPrint || activePedidoDeMesa;
    if (!p) {
      toast.error('No hay comanda activa para emitir.');
      return;
    }

    const tableOrderName = selectedMesa ? selectedMesa.numero_mesa : (p.numero_mesa || `Mesa ${p.id_mesa}`);

    // Si la mesa tiene múltiples comandas, emitir todos los ítems vigentes de la mesa
    const allItems = selectedMesaInfo && selectedMesaInfo.activeOrders.length > 1
      ? selectedMesaInfo.activeOrders.flatMap(o => o.items)
      : p.items;

    const allObs = selectedMesaInfo && selectedMesaInfo.activeOrders.length > 1
      ? selectedMesaInfo.activeOrders.map(o => o.observaciones).filter(Boolean).join(' | ')
      : (p.observaciones || '');

    if (!allItems || allItems.length === 0) {
      toast.error('La comanda no contiene productos para emitir.');
      return;
    }

    printComandaThermalTicket({
      mesa: formatTicketTableName(tableOrderName),
      mozo: p.mozo || activeMozo || 'Mozo',
      items: allItems.map(i => ({
        nombre: i.nombre,
        cantidad: i.cantidad,
      })),
      observaciones: allObs ? allObs : undefined,
    });

    toast.success(`Comanda de ${tableOrderName} enviada a tiquetera 🖨️`);
  };

  // Filter products by category and search (with hierarchical wine/beverage browsing)
  const { filteredProducts, isCrossCategorySearch } = useMemo(() => {
    const query = searchQuery.trim();

    const matchesCategory = (p: ProductoMenu, cat: string): boolean => {
      if (cat === 'todo') return true;

      const normCat = normalizeCategoryString(cat);
      const pCatNorm = normalizeCategoryString(p.categoria);
      const mapping = getWineMapping(p);

      // Macro: Bodega / Bodega y Vinos
      if (normCat === 'bodega' || normCat === 'bodegayvinos') {
        const isWineOrSpirit = isBodegaCategory(p.categoria) || p.tipo === 'vino' || mapping.macro !== null;
        if (!isWineOrSpirit) return false;

        // Apply macro and varietal filters inside Bodega
        if (selectedWineMacro !== 'todo' && mapping.macro !== selectedWineMacro) {
          return false;
        }
        if (selectedWineVarietal !== 'todo' && !mapping.varietales.includes(selectedWineVarietal)) {
          return false;
        }
        return true;
      }

      // Specific wine categories
      if (normCat === 'vinostintos') {
        const isTinto = pCatNorm === 'vinostintos' || mapping.macro === 'tintas';
        if (!isTinto) return false;
        if (selectedWineVarietal !== 'todo' && !mapping.varietales.includes(selectedWineVarietal)) {
          return false;
        }
        return true;
      }

      if (normCat === 'vinosblancosyrosados' || normCat === 'vinosblancos') {
        const isBlanco = pCatNorm === 'vinosblancosyrosados' || pCatNorm === 'vinosblancos' || mapping.macro === 'blancas';
        if (!isBlanco) return false;
        if (selectedWineVarietal !== 'todo' && !mapping.varietales.includes(selectedWineVarietal)) {
          return false;
        }
        return true;
      }

      if (normCat === 'espumantes') {
        return pCatNorm === 'espumantes' || mapping.macro === 'champagne';
      }

      if (normCat === 'destilados') {
        return pCatNorm === 'destilados' || mapping.macro === 'destilados';
      }

      if (normCat === 'cervezas') {
        return pCatNorm === 'cervezas' || pCatNorm.includes('cerveza');
      }

      if (normCat === 'tragosycocteleria' || normCat === 'tragos' || normCat === 'cocteleria') {
        return pCatNorm === 'tragosycocteleria' || pCatNorm.includes('trago') || pCatNorm.includes('coctel');
      }

      // Macro: Bebidas con Alcohol
      if (normCat === 'bebidasconalcohol') {
        return (
          p.tipo === 'vino' ||
          pCatNorm.includes('vino') ||
          pCatNorm.includes('espumante') ||
          pCatNorm.includes('cerveza') ||
          pCatNorm.includes('destilado') ||
          pCatNorm.includes('trago') ||
          pCatNorm.includes('coctel') ||
          mapping.macro !== null
        );
      }

      // Macro: Bebidas sin Alcohol
      if (normCat === 'bebidassinalcohol') {
        const isAlcoholic = (
          p.tipo === 'vino' ||
          pCatNorm.includes('vino') ||
          pCatNorm.includes('espumante') ||
          pCatNorm.includes('cerveza') ||
          pCatNorm.includes('destilado') ||
          pCatNorm.includes('trago') ||
          pCatNorm.includes('coctel') ||
          mapping.macro !== null
        );
        if (isAlcoholic) return false;
        return pCatNorm.includes('bebida') || pCatNorm.includes('gaseosa') || pCatNorm.includes('agua') || pCatNorm.includes('cafe');
      }

      // Direct exact match
      if (p.categoria === cat) return true;

      // Normalized match
      if (pCatNorm && normCat && (pCatNorm === normCat || pCatNorm.includes(normCat) || normCat.includes(pCatNorm))) {
        return true;
      }

      // Synonymous food categories
      if (
        (normCat.includes('corte') || normCat.includes('parrilla')) && (pCatNorm.includes('carne') || pCatNorm.includes('asado')) ||
        (normCat.includes('carne') || normCat.includes('asado')) && (pCatNorm.includes('corte') || pCatNorm.includes('parrilla')) ||
        (normCat.includes('pescad') || normCat.includes('marisco')) && (pCatNorm.includes('pescad') || pCatNorm.includes('marisco')) ||
        (normCat.includes('criolla') || normCat.includes('empanada')) && (pCatNorm.includes('criolla') || pCatNorm.includes('empanada'))
      ) {
        return true;
      }

      return false;
    };

    if (!query) {
      const activeProducts = productosMenu.filter(p => p.activo && matchesCategory(p, selectedCategoria));
      return { filteredProducts: activeProducts, isCrossCategorySearch: false };
    }

    // When searching:
    if (selectedCategoria === 'todo') {
      const allMatches = productosMenu.filter(p => p.activo && matchesProductSearch(p, query));
      return { filteredProducts: allMatches, isCrossCategorySearch: false };
    }

    const catMatches = productosMenu.filter(
      p => p.activo && matchesCategory(p, selectedCategoria) && matchesProductSearch(p, query)
    );

    if (catMatches.length > 0) {
      return { filteredProducts: catMatches, isCrossCategorySearch: false };
    }

    // Fallback: search globally if 0 results in current category
    const globalMatches = productosMenu.filter(p => p.activo && matchesProductSearch(p, query));
    return {
      filteredProducts: globalMatches,
      isCrossCategorySearch: globalMatches.length > 0
    };
  }, [productosMenu, selectedCategoria, searchQuery, selectedWineMacro, selectedWineVarietal]);

  // Helper: check how much of an insumo would be required by the current cart
  const calculateCartInsumoRequirements = (tempCart: { [id_producto: string]: number }) => {
    const requirements: { [id_insumo: string]: number } = {};
    
    Object.keys(tempCart).forEach(prodId => {
      const qty = tempCart[prodId];
      if (qty <= 0) return;
      
      // Find recipes
      const productRecipes = recetas.filter(r => r.id_producto === prodId);
      productRecipes.forEach(rec => {
        if (!requirements[rec.id_insumo]) {
          requirements[rec.id_insumo] = 0;
        }
        requirements[rec.id_insumo] += rec.cantidad_a_descontar * qty;
      });
    });

    return requirements;
  };

  // Helper: evaluate if adding 1 unit of a product breaches current stock
  const evaluateStockAdd = (productoId: string): { allowed: boolean; warning?: string; isCritical: boolean } => {
    if (permitirVentaSinStock) {
      return { allowed: true, isCritical: false };
    }
    const nextCart = { ...cart, [productoId]: (cart[productoId] || 0) + 1 };
    const requirements = calculateCartInsumoRequirements(nextCart);

    for (const [insumoId, reqAmount] of Object.entries(requirements)) {
      const insumo = insumos.find(i => i.id_insumo === insumoId);
      if (!insumo) continue;

      if (insumo.stock_actual < reqAmount) {
        return { 
          allowed: false, 
          isCritical: true, 
          warning: `¡BLOQUEADO! Sin material suficiente de: "${insumo.nombre}". Se requiere ${reqAmount}${insumo.unidad_medida} y el stock actual es de ${insumo.stock_actual}${insumo.unidad_medida}.` 
        };
      }

      if (insumo.stock_actual - reqAmount <= insumo.stock_minimo) {
        return { 
          allowed: true, 
          isCritical: false, 
          warning: `Existencia cercana al Stock Mínimo de Seguridad para "${insumo.nombre}" (${insumo.stock_actual}${insumo.unidad_medida} disponibles).` 
        };
      }
    }

    return { allowed: true, isCritical: false };
  };

  // Quick check of remaining simulated capacity for UI tags
  const getSimulatedStockRemaining = (prod: ProductoMenu) => {
    if (permitirVentaSinStock) {
      return 999;
    }
    // Find recipes associated to this product
    const productRecipes = recetas.filter(r => r.id_producto === prod.id_producto);
    if (productRecipes.length === 0) {
      return 999;
    }
    let maxPlatesSimulated = 999;

    productRecipes.forEach(rec => {
      const insumo = insumos.find(i => i.id_insumo === rec.id_insumo);
      if (insumo) {
        const remainingForThis = Math.floor(insumo.stock_actual / rec.cantidad_a_descontar);
        if (remainingForThis < maxPlatesSimulated) {
          maxPlatesSimulated = remainingForThis;
        }
      }
    });

    return maxPlatesSimulated;
  };

  // Cart operations
  const handleAddToCart = (productoId: string) => {
    if (!selectedMesaId) {
      toast.warning("Por favor seleccione primero una mesa.");
      return;
    }
    const evalResult = evaluateStockAdd(productoId);
    if (!evalResult.allowed) {
      addLog('alerta_stock', `Cancelado intento de pedido: ${evalResult.warning}`);
      return;
    }
    
    setCart(prev => ({
      ...prev,
      [productoId]: (prev[productoId] || 0) + 1
    }));
  };

  const handleRemoveFromCart = (productoId: string) => {
    setCart(prev => {
      const updated = { ...prev };
      if (updated[productoId] > 1) {
        updated[productoId] -= 1;
      } else {
        delete updated[productoId];
      }
      return updated;
    });
  };

  const checkoutCart = async () => {
    if (checkoutInFlightRef.current || !selectedMesaId || Object.keys(cart).length === 0) return;
    checkoutInFlightRef.current = true;

    try {
      const requirements = calculateCartInsumoRequirements(cart);
      for (const [insumoId, reqAmount] of Object.entries(requirements)) {
        const insumo = insumos.find(i => i.id_insumo === insumoId);
        if (insumo && insumo.stock_actual < reqAmount) {
          throw new Error(`No es posible procesar la orden. Se agotó un insumo clave: ${insumo.nombre}`);
        }
      }

      const items: PedidoItem[] = Object.entries(cart).map(([prodId, qty]) => {
        const product = productosMenu.find(item => item.id_producto === prodId);
        if (product) {
          return {
            id_producto: prodId,
            nombre: product.nombre,
            cantidad: Number(qty),
            categoria: product.categoria,
            precio_unitario: product.precio_venta,
          };
        }
        const promo = promociones.find(item => item.id_promo === prodId);
        if (promo) {
          return {
            id_producto: prodId,
            nombre: `[PROMO ${promo.descuento_porcentaje > 0 ? `${promo.descuento_porcentaje}% OFF` : ''}] ${promo.nombre}`,
            cantidad: Number(qty),
            categoria: 'Promociones',
            precio_unitario: promo.precio && promo.precio > 0 ? promo.precio : 0,
          };
        }
        if (prodId.startsWith('menu_diario_')) {
          const dayKey = prodId.replace('menu_diario_', '');
          const diaItem = menuDiario[dayKey] || INITIAL_MENU_DIARIO[dayKey];
          return {
            id_producto: prodId,
            nombre: diaItem ? `[MENÚ DEL DÍA] ${diaItem.nombre}` : 'Menú del Día',
            cantidad: Number(qty),
            categoria: 'Menú del Día',
            precio_unitario: diaItem ? diaItem.precio : 8500,
          };
        }
        return {
          id_producto: prodId,
          nombre: 'Promoción Especial',
          cantidad: Number(qty),
          categoria: 'Promociones',
          precio_unitario: 0,
        };
      });

      const tableOrderName = selectedMesa ? selectedMesa.numero_mesa : `Mesa ${selectedMesaId}`;
      const cleanObs = observaciones.trim() || undefined;

      // Disparar la impresión INMEDIATAMENTE dentro del evento del click del usuario (0ms de latencia y sin bloqueo de popups)
      printComandaThermalTicket({
        mesa: formatTicketTableName(tableOrderName),
        mozo: activeMozo || 'Mozo',
        items: items.map(i => ({
          nombre: i.nombre,
          cantidad: i.cantidad,
          observaciones: cleanObs,
        })),
        observaciones: cleanObs,
      });

      // Limpiar de inmediato el carrito y observaciones para respuesta instantánea de la UI
      setCart({});
      setObservaciones('');

      const accepted = await onCrearPedido({
        id_mesa: selectedMesaId,
        numero_mesa: tableOrderName,
        mozo: activeMozo,
        estado_comanda: 'pendiente',
        items,
        observaciones: cleanObs,
        comensales,
        idempotency_key: createMozoCartIdempotencyKey(selectedMesaId),
      });

      if (accepted === false) return;

      addLog('pedido_creado', `Mozo ${activeMozo} envió e imprimió comanda para ${tableOrderName} con ${items.length} platos.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo enviar la comanda. El carrito permanece disponible.');
    } finally {
      checkoutInFlightRef.current = false;
    }
  };

  // Calculating totals
  const totalCartValue = useMemo(() => {
    return Object.entries(cart).reduce((total, [prodId, qty]) => {
      const p = productosMenu.find(item => item.id_producto === prodId);
      if (p) return total + (p.precio_venta * Number(qty));
      const promo = promociones.find(item => item.id_promo === prodId);
      if (promo && promo.precio && promo.precio > 0) {
        return total + (promo.precio * Number(qty));
      }
      if (prodId.startsWith('menu_diario_')) {
        const dayKey = prodId.replace('menu_diario_', '');
        const diaItem = menuDiario[dayKey] || INITIAL_MENU_DIARIO[dayKey];
        if (diaItem) return total + (diaItem.precio * Number(qty));
      }
      return total;
    }, 0);
  }, [cart, productosMenu, promociones, menuDiario]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="mozo-terminal-container">
      {/* LEFT COLUMN: Mesa Grid */}
      <div className="lg:col-span-4 space-y-6">

        {/* Mesas Selector Grid */}
        <div className="glass-panel rounded-3xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-[#8C6239] dark:text-stone-105 font-sans tracking-tight flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-[#C8956A] dark:text-[#C8956A]" />
              Distribución de Mesas
            </h3>
            <span className="text-[10px] font-sans bg-[#8C6239] text-white px-2.5 py-0.5 rounded-lg font-black uppercase tracking-wider shadow-sm">
              {occupiedCount} Ocupadas
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {mesas.length === 0 ? (
              <div className="col-span-4 py-8 flex flex-col items-center justify-center text-center text-stone-400 dark:text-stone-500">
                <UtensilsCrossed className="w-8 h-8 mb-2 opacity-50 animate-pulse text-[#8C6239]" />
                <p className="text-xs font-semibold text-stone-600 dark:text-stone-300">Cargando distribución de mesas...</p>
                <p className="text-[10px] text-stone-400 mt-0.5">Conectando con la base de datos</p>
              </div>
            ) : (
              mesas.map(m => {
              const isSelected = String(m.id_mesa) === String(selectedMesaId);
              const info = mesasActiveInfoMap.get(m.id_mesa) || getTableActiveInfo(m, pedidos);
              const isOcupada = info.isOcupada;
              const isInCuenta = info.isInCuenta;
              const isReservada = info.isReservada;
              const isUnidaHija = info.isUnidaHija;
              const isCombinada = info.isCombinada;
              const displayComensales = info.comensales;

              // Determine visual theme according to exact state specs (El Patrón warm design system)
              let stateClasses = "border-stone-250 dark:border-[#C8956A]/10 bg-[#FAF7F0]/40 dark:bg-[#1A110B]/85 hover:bg-[#FAF7F0] dark:hover:bg-[#251B12]/80 text-stone-750 dark:text-stone-300 hover:border-[#C8956A]/30";
              let labelText = info.labelText;

              if (isSelected) {
                stateClasses = "bg-[#8C6239] text-white border-[#C8956A] shadow-lg scale-[1.03] ring-4 ring-[#C8956A]/20 glow-gold";
                labelText = isUnidaHija ? "Unida" : isOcupada ? "Ocupada (Sel)" : isInCuenta ? "En Cuenta" : isReservada ? "Reservada" : isCombinada ? "Unida (Sel)" : "Libre";
              } else if (isUnidaHija) {
                stateClasses = "border-amber-400/40 bg-amber-400/10 text-amber-800 dark:text-amber-300 hover:bg-amber-400/20";
                labelText = "🔗 Unida";
              } else if (isReservada) {
                stateClasses = "border-fuchsia-750/30 bg-fuchsia-750/10 text-fuchsia-800 dark:text-fuchsia-300 hover:bg-fuchsia-750/15";
                labelText = "Reservada";
              } else if (isInCuenta) {
                stateClasses = "border-[#E8B800]/40 bg-[#E8B800]/10 text-amber-800 dark:text-amber-400 hover:bg-[#E8B800]/15 glow-gold";
                labelText = "En Cuenta";
              } else if (isOcupada) {
                // Warm, rich red/terracotta for occupied tables to match El Patron
                stateClasses = "border-[#9B2226]/35 bg-[#9B2226]/10 text-[#9B2226] dark:text-red-400 hover:bg-[#9B2226]/15";
                labelText = isCombinada ? "Unida (Ocup)" : "Ocupada";
              } else if (isCombinada) {
                stateClasses = "border-[#8C6239]/50 bg-[#8C6239]/10 text-[#8C6239] dark:text-[#C8956A] hover:bg-[#8C6239]/20";
                labelText = "🔗 Unida";
              }

              return (
                <button
                  key={m.id_mesa}
                  id={`mesa-btn-${m.id_mesa}`}
                  onClick={() => {
                    const targetId = m.estado === 'unida' && m.parent_id ? m.parent_id : m.id_mesa;
                    setSelectedMesaId(targetId);
                    setIsUniting(false);
                    setTargetUniteMesaIds([]);
                    // Prepopulate comensales if occupied
                    const targetInfo = mesasActiveInfoMap.get(targetId) || getTableActiveInfo(m, pedidos);
                    if (targetInfo.comensales) {
                      setComensales(targetInfo.comensales);
                    }
                  }}
                  className={`p-2.5 rounded-xl flex flex-col justify-between items-center transition-all aspect-square border cursor-pointer ${stateClasses}`}
                >
                  <span className={`text-xs font-black font-sans ${isSelected ? 'text-white' : 'text-[#8C6239] dark:text-stone-105'}`}>{m.numero_mesa}</span>
                  {isOcupada ? (
                    <div className="flex items-center gap-0.5 mt-2">
                      <Users className={`w-3 h-3 ${isSelected ? 'text-white font-black' : 'text-[#9B2226] dark:text-red-400'}`} />
                      <span className={`text-[10px] font-black ${isSelected ? 'text-white font-black' : 'text-[#9B2226] dark:text-red-400'}`}>{displayComensales}</span>
                    </div>
                  ) : isInCuenta ? (
                    <span className={`text-[8px] uppercase tracking-wider font-black ${isSelected ? 'text-white font-black' : 'text-amber-700 dark:text-amber-400'}`}>En Cuenta</span>
                  ) : (
                    <span className={`text-[8px] uppercase tracking-wider font-black ${isSelected ? 'text-white/80' : 'text-stone-600 dark:text-stone-400'}`}>{labelText}</span>
                  )}
                </button>
              );
            }))}
          </div>

          {selectedMesa && selectedMesaInfo && (
            <div className="mt-4 pt-4 border-t border-stone-200/30 dark:border-white/10 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-sm text-[#8C6239] dark:text-[#C8956A]">{selectedMesa.numero_mesa}</h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Estado: <span className={
                      selectedMesaInfo.isOcupada 
                        ? 'text-[#9B2226] font-bold dark:text-red-400' 
                        : selectedMesaInfo.isInCuenta
                        ? 'text-amber-700 font-bold dark:text-amber-400'
                        : selectedMesaInfo.isReservada
                        ? 'text-purple-700 font-bold dark:text-purple-400'
                        : selectedMesaInfo.isUnidaHija || selectedMesaInfo.isCombinada
                        ? 'text-[#8C6239] font-bold dark:text-[#C8956A]'
                        : 'text-[#3A5A40] dark:text-[#22C55E]'
                    }>
                      {selectedMesaInfo.isOcupada 
                        ? 'Ocupada / Con Pedido' 
                        : selectedMesaInfo.isInCuenta 
                        ? 'Esperando Cuenta' 
                        : selectedMesaInfo.isReservada 
                        ? 'Reservada' 
                        : selectedMesaInfo.isUnidaHija || selectedMesaInfo.isCombinada 
                        ? 'Mesa Unida' 
                        : 'Libre para comandar'}
                    </span>
                  </p>
                </div>
                {!selectedMesaInfo.isOcupada && !selectedMesaInfo.isInCuenta ? (
                  <div className="flex items-center bg-stone-100 dark:bg-stone-900/60 border border-stone-200 dark:border-white/10 rounded-lg p-1 gap-2">
                    <button 
                      onClick={() => setComensales(c => Math.max(1, c - 1))}
                      className="w-6 h-6 rounded bg-white dark:bg-white/10 border border-stone-200 dark:border-white/15 flex items-center justify-center text-stone-700 dark:text-stone-300 hover:bg-[#FAF7F0] dark:hover:bg-white/20 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-xs font-mono font-bold px-1 text-stone-850 dark:text-stone-105">{comensales}</span>
                    <button 
                      onClick={() => setComensales(c => c + 1)}
                      className="w-6 h-6 rounded bg-white dark:bg-white/10 border border-stone-200 dark:border-white/15 flex items-center justify-center text-stone-700 dark:text-stone-300 hover:bg-[#FAF7F0] dark:hover:bg-white/20 cursor-pointer"
                    >
                      +
                    </button>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400 mr-1">personas</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-[#9B2226]/10 dark:bg-red-950/30 text-[#9B2226] dark:text-red-400 px-2.5 py-1 rounded-lg border border-[#9B2226]/20 text-xs font-bold font-mono">
                    <Users className="w-3.5 h-3.5" />
                    <span>{selectedMesaInfo.comensales} {selectedMesaInfo.comensales === 1 ? 'persona' : 'personas'}</span>
                  </div>
                )}
              </div>

              {/* Botones de Unión / Desunión de Mesas */}
              <div className="pt-2 border-t border-stone-200/40 dark:border-white/10 space-y-2">
                {isUnitedTable(selectedMesa) ? (
                  <div className="space-y-2">
                    <button
                      onClick={async () => {
                        if (onDesunirMesas) {
                          await onDesunirMesas(selectedMesa.id_mesa);
                          setIsUniting(false);
                          setTargetUniteMesaIds([]);
                          toast.success(`Mesas desunidas. Vuelven a operar de forma individual.`);
                        }
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center justify-center gap-2 border border-amber-300 dark:border-amber-700 transition-colors shadow-sm cursor-pointer"
                    >
                      <Scissors className="w-3.5 h-3.5 text-red-500" />
                      ✂ Desunir Mesas
                    </button>

                    <button
                      onClick={() => {
                        setIsUniting(prev => !prev);
                        setTargetUniteMesaIds([]);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-[#8C6239] dark:text-[#C8956A] text-xs font-bold flex items-center justify-center gap-2 border border-[#8C6239]/20 transition-colors cursor-pointer"
                    >
                      <Link2 className="w-3.5 h-3.5 text-[#8C6239] dark:text-[#C8956A]" />
                      {isUniting ? 'Cancelar Unión' : '🔗 Unir con más mesas'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setIsUniting(prev => !prev);
                        setTargetUniteMesaIds([]);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-[#8C6239] dark:text-[#C8956A] text-xs font-bold flex items-center justify-center gap-2 border border-[#8C6239]/20 transition-colors cursor-pointer"
                    >
                      <Link2 className="w-3.5 h-3.5 text-[#8C6239] dark:text-[#C8956A]" />
                      {isUniting ? 'Cancelar Unión' : '🔗 Unir mesas'}
                    </button>
                  </div>
                )}

                {isUniting && (
                  <div className="p-3 bg-amber-50/90 dark:bg-[#251B12] rounded-xl border border-amber-200 dark:border-[#C8956A]/30 space-y-2.5 animate-fadeIn">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block">
                        Unir a {selectedMesa.numero_mesa}:
                      </label>
                      <span className="text-[10px] font-bold text-[#8C6239] dark:text-[#C8956A]">
                        {targetUniteMesaIds.length === 0
                          ? 'Elegí 1 o más mesas'
                          : `${targetUniteMesaIds.length} ${targetUniteMesaIds.length === 1 ? 'mesa agregada' : 'mesas agregadas'}`}
                      </span>
                    </div>

                    {/* Desplegable rápido */}
                    <select
                      value=""
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val && !targetUniteMesaIds.includes(val)) {
                          setTargetUniteMesaIds(prev => [...prev, val]);
                        }
                      }}
                      className="w-full p-2 text-xs rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-medium cursor-pointer"
                    >
                      <option value="">-- Seleccionar mesa a unir --</option>
                      {mesas
                        .filter(m => 
                          m.id_mesa !== selectedMesa.id_mesa && 
                          m.estado !== 'unida' &&
                          !targetUniteMesaIds.includes(m.id_mesa) &&
                          !selectedMesa.mesas_unidas?.includes(m.id_mesa)
                        )
                        .map(m => {
                          const candidateInfo = mesasActiveInfoMap.get(m.id_mesa) || getTableActiveInfo(m, pedidos);
                          const estadoDisplay = candidateInfo.isOcupada ? 'ocupada' : candidateInfo.isInCuenta ? 'en cuenta' : candidateInfo.isReservada ? 'reservada' : 'libre';
                          const cap = m.capacidad || 2;
                          return (
                            <option key={m.id_mesa} value={m.id_mesa}>
                              {m.numero_mesa} ({estadoDisplay}) - Cap: {cap} {cap === 1 ? 'persona' : 'personas'}
                            </option>
                          );
                        })}
                    </select>

                    {/* Lista interactiva de mesas con checkboxes */}
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {mesas
                        .filter(m => 
                          m.id_mesa !== selectedMesa.id_mesa && 
                          m.estado !== 'unida' &&
                          !selectedMesa.mesas_unidas?.includes(m.id_mesa)
                        )
                        .map(m => {
                          const isSelected = targetUniteMesaIds.includes(m.id_mesa);
                          const candidateInfo = mesasActiveInfoMap.get(m.id_mesa) || getTableActiveInfo(m, pedidos);
                          const estadoDisplay = candidateInfo.isOcupada ? 'ocupada' : candidateInfo.isInCuenta ? 'en cuenta' : candidateInfo.isReservada ? 'reservada' : 'libre';
                          const cap = m.capacidad || 2;

                          return (
                            <button
                              key={m.id_mesa}
                              type="button"
                              onClick={() => {
                                setTargetUniteMesaIds(prev =>
                                  prev.includes(m.id_mesa)
                                    ? prev.filter(id => id !== m.id_mesa)
                                    : [...prev, m.id_mesa]
                                );
                              }}
                              className={`w-full p-2 rounded-lg text-left text-xs flex items-center justify-between border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs'
                                  : 'bg-white dark:bg-stone-900/80 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                                  isSelected 
                                    ? 'bg-emerald-600 text-white font-black' 
                                    : 'border border-stone-300 dark:border-stone-600'
                                }`}>
                                  {isSelected ? '✓' : ''}
                                </div>
                                <span>{m.numero_mesa}</span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-bold ${
                                  candidateInfo.isOcupada 
                                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300' 
                                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                                }`}>
                                  {estadoDisplay}
                                </span>
                              </div>
                              <span className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">
                                Cap: {cap} {cap === 1 ? 'persona' : 'personas'}
                              </span>
                            </button>
                          );
                        })}
                    </div>

                    {/* Resumen de la unión en tiempo real */}
                    {targetUniteMesaIds.length > 0 && (() => {
                      const selectedMesasObjs = mesas.filter(m => targetUniteMesaIds.includes(m.id_mesa));
                      const totalCap = (selectedMesa.capacidad || 2) + selectedMesasObjs.reduce((s, m) => s + (m.capacidad || 2), 0);
                      const unitedTitle = formatUnitedTableName([selectedMesa.numero_mesa, ...selectedMesasObjs.map(m => m.numero_mesa)]);
                      return (
                        <div className="p-2.5 bg-white dark:bg-stone-900 rounded-lg border border-amber-300/80 dark:border-amber-700/60 space-y-1 text-[11px]">
                          <p className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1">
                            <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                            {unitedTitle}
                          </p>
                          <p className="text-[10px] text-stone-600 dark:text-stone-400">
                            Capacidad resultante: <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{totalCap} personas</strong> ({targetUniteMesaIds.length + 1} mesas en total)
                          </p>
                        </div>
                      );
                    })()}

                    {/* Botones de acción */}
                    <div className="flex gap-2 pt-1">
                      <button
                        disabled={targetUniteMesaIds.length === 0}
                        onClick={async () => {
                          if (targetUniteMesaIds.length === 0 || !onUnirMesas) return;
                          await onUnirMesas(selectedMesa.id_mesa, targetUniteMesaIds);
                          setIsUniting(false);
                          setTargetUniteMesaIds([]);
                          toast.success(`${targetUniteMesaIds.length + 1} mesas unidas con éxito.`);
                        }}
                        className="flex-1 py-2 px-3 rounded-lg bg-[#3A5A40] hover:bg-[#3A5A40]/90 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        Confirmar Unión {targetUniteMesaIds.length > 0 ? `(${targetUniteMesaIds.length + 1} mesas)` : ''}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsUniting(false);
                          setTargetUniteMesaIds([]);
                        }}
                        className="py-2 px-3 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-bold cursor-pointer hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>


              {/* ACTIVE ORDER CONTROLS (IF TABLE OCCUPIED) */}
              {activePedidoDeMesa && selectedMesaInfo ? (
                <div className="bg-stone-50 dark:bg-[#1E140E]/80 rounded-xl p-3 border border-stone-200 dark:border-white/5 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                        {selectedMesaInfo.activeOrders.length > 1
                          ? `Comandas (${selectedMesaInfo.activeOrders.length})`
                          : `Orden Activa #${activePedidoDeMesa.id_pedido}`}
                      </span>
                      {activePedidoDeMesa.fecha_hora && (
                        <span className="text-[10px] text-stone-500 dark:text-stone-400 flex items-center gap-0.5 font-mono">
                          <Clock className="w-2.5 h-2.5 text-stone-400" />
                          {formatArgentinaDateTime(activePedidoDeMesa.fecha_hora)}
                        </span>
                      )}
                      {selectedMesaInfo.activeOrders.length > 1 && (
                        <div className="flex items-center gap-1">
                          {selectedMesaInfo.activeOrders.map(o => (
                            <button
                              key={o.id_pedido}
                              type="button"
                              onClick={() => handleStartEditPedido(o)}
                              className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-850 dark:text-amber-300 font-bold hover:bg-amber-200 cursor-pointer border border-amber-300/40"
                              title={`Editar comanda #${o.id_pedido}`}
                            >
                              ✏️ #{o.id_pedido}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      activePedidoDeMesa.estado_comanda === 'listo' 
                        ? 'bg-[#3A5A40]/10 text-[#3A5A40] dark:text-[#22C55E] animate-pulse'
                        : activePedidoDeMesa.estado_comanda === 'en_cocina'
                        ? 'bg-amber-500/10 text-amber-855 dark:text-[#E8B800]'
                        : 'bg-stone-100 text-stone-700 dark:bg-white/10 dark:text-stone-300'
                    }`}>
                      {activePedidoDeMesa.estado_comanda === 'en_cocina' ? 'En Fuego 🔥' : activePedidoDeMesa.estado_comanda}
                    </span>
                  </div>
                  
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {selectedMesaInfo.activeOrders.flatMap(o => o.items).map((it, idx) => {
                      const unitPrice = resolvePedidoItemUnitPrice(it, productosMenu);
                      const lineTotal = unitPrice * it.cantidad;
                      return (
                        <div key={idx} className="flex justify-between items-center text-xs text-stone-750 dark:text-stone-300 font-medium">
                          <div className="min-w-0 pr-2 truncate">
                            <span>{it.cantidad}x {it.nombre}</span>
                            {it.cantidad > 1 && (
                              <span className="text-[10px] text-stone-400 dark:text-stone-500 font-mono ml-1.5">
                                (${unitPrice.toLocaleString('es-AR')} c/u)
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-stone-700 dark:text-stone-200 font-semibold shrink-0">
                            ${lineTotal.toLocaleString('es-AR')}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-stone-200/40 dark:border-white/10 flex justify-between items-center text-xs">
                    <span className="font-bold text-stone-600 dark:text-stone-400">Total Consumo:</span>
                    <span className="font-mono font-black text-[#8C6239] dark:text-[#E8B800] text-sm">
                      ${selectedMesaInfo.activeOrders.reduce((acc, o) => acc + calculatePedidoTotal(o, productosMenu), 0).toLocaleString('es-AR')}
                    </span>
                  </div>

                  {confirmCobrarId === activePedidoDeMesa.id_pedido ? (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-300 dark:border-amber-700 space-y-2">
                      <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200 text-center">
                        ¿Confirmar cobro y liberar {selectedMesa.numero_mesa}?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setConfirmCobrarId(null);
                            onFacturarMesa(activePedidoDeMesa.id_pedido);
                            toast.success(`Mesa ${selectedMesa.numero_mesa} cobrada y liberada.`);
                          }}
                          className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black cursor-pointer shadow-sm transition-colors text-center"
                        >
                          ✓ Sí, Cobrar
                        </button>
                        <button
                          onClick={() => setConfirmCobrarId(null)}
                          className="py-1.5 px-3 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEditPedido(activePedidoDeMesa)}
                          className="py-1.5 px-2 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                          Editar Pedido
                        </button>
                        <button
                          type="button"
                          onClick={() => setSplittingPedidoId(activePedidoDeMesa.id_pedido)}
                          className="py-1.5 px-2 bg-[#FAF7F0] dark:bg-[#251B12]/60 border border-[#C8956A]/20 hover:bg-[#F5F1E9] dark:hover:bg-[#8C6239]/40 text-[#8C6239] dark:text-[#C8956A] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Receipt className="w-3.5 h-3.5 text-[#8C6239] dark:text-[#C8956A]" />
                          Dividir Cuenta
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleEmitirComanda(activePedidoDeMesa)}
                        className="w-full py-1.5 px-2.5 bg-[#FAF7F0] dark:bg-[#251B12] hover:bg-[#F5F1E9] dark:hover:bg-[#322317] border border-[#C8956A]/40 text-[#8C6239] dark:text-[#E8B800] rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-98"
                        title="Reimprimir o emitir ticket de comanda para cocina"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#8C6239] dark:text-[#E8B800]" />
                        Emitir Comanda
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmCobrarId(activePedidoDeMesa.id_pedido)}
                        className="w-full py-2 px-2.5 bg-[#8C6239] dark:bg-[#C8956A] border border-transparent hover:bg-[#5d3a2e] dark:hover:bg-[#d8a478] text-[#FAF7F0] dark:text-[#8C6239] rounded-lg text-xs font-extrabold flex items-center justify-center gap-1 transition-colors shadow-sm cursor-pointer"
                      >
                        Cobrar Mesa
                      </button>

                      {String(confirmLiberarMesaId) === String(selectedMesa.id_mesa) ? (
                        <div className="p-2.5 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-300 dark:border-red-700 space-y-2">
                          <p className="text-[11px] font-bold text-red-900 dark:text-red-200 text-center">
                            ¿Cancelar comanda y liberar {selectedMesa.numero_mesa}?
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                const mesaId = selectedMesa.id_mesa;
                                setConfirmLiberarMesaId(null);
                                if (onLiberarMesa) {
                                  await onLiberarMesa(mesaId);
                                  toast.success(`${selectedMesa.numero_mesa} liberada y comanda cancelada.`);
                                }
                              }}
                              className="flex-1 py-1.5 px-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black cursor-pointer shadow-sm text-center transition-colors"
                            >
                              ✓ Sí, Liberar
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmLiberarMesaId(null)}
                              className="py-1.5 px-3 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-bold cursor-pointer"
                            >
                              Volver
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmLiberarMesaId(selectedMesa.id_mesa)}
                          className="w-full py-1 text-[11px] text-stone-500 hover:text-red-600 dark:text-stone-400 dark:hover:text-red-400 font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          Cancelar comanda y liberar mesa
                        </button>
                      )}
                    </>
                  )}
                </div>
              ) : selectedMesaInfo.isOcupada ? (
                <div className="bg-amber-50 dark:bg-amber-950/40 rounded-xl p-3 border border-amber-300 dark:border-amber-700 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="text-xs font-bold">Mesa marcada como ocupada</span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                    Esta mesa figura ocupada pero no posee comandas activas asociadas. Podés liberarla para volver a dejarla disponible.
                  </p>
                  {onLiberarMesa && (
                    <button
                      type="button"
                      onClick={async () => {
                        await onLiberarMesa(selectedMesa.id_mesa);
                        toast.success(`${selectedMesa.numero_mesa} liberada correctamente.`);
                      }}
                      className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Liberar {selectedMesa.numero_mesa}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#8C6239] dark:text-[#C8956A] font-serif-rustic italic bg-[#FAF7F0]/60 dark:bg-[#1E140E]/80 border border-[#C8956A]/25 p-3 text-center rounded-xl shadow-inner">
                  🍳 Mesa lista para recibir comandas. Agrega ítems a la canasta de la derecha.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CENTRAL COLUMN: Product Catalog */}
      <div className="lg:col-span-5 space-y-4">
        <div className="glass-panel rounded-3xl p-5 shadow-sm space-y-3.5">
          <div className="flex flex-col md:flex-row gap-3 justify-between items-center w-full">
            <h3 className="font-extrabold text-xs text-[#8C6239] dark:text-[#C8956A] tracking-wider uppercase">Filtro de Categorías Premium</h3>
            <div className="relative w-full md:w-56 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#C8956A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar plato o bebida..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 bg-white/60 dark:bg-[#1E140E]/50 border border-[#8C6239]/25 dark:border-[#C8956A]/20 rounded-xl text-xs text-[#8C6239] dark:text-stone-200 placeholder-[#8C6239]/55 dark:placeholder-stone-450 focus:outline-none focus:ring-1 focus:ring-[#C8956A] focus:border-[#C8956A] transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                    title="Limpiar búsqueda"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`px-3 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                  isListening 
                    ? 'bg-rose-600 text-white border-rose-600 animate-pulse' 
                    : 'bg-stone-50 dark:bg-white/5 text-stone-500 border-stone-200 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-white/10 hover:text-stone-700'
                }`}
                style={{ minHeight: '34px' }}
                title={isListening ? "Detener dictado por voz" : "Dictar comanda por voz"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-1.5 w-full overflow-x-auto py-1 scroll-smooth border-t border-stone-200/30 pt-3 pb-2.5">
            {displayCategories.map(cat => {
              const isActive = selectedCategoria === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategoria(cat.id);
                    const norm = normalizeCategoryString(cat.id);
                    if (norm === 'vinostintos') {
                      setSelectedWineMacro('tintas');
                      setSelectedWineVarietal('todo');
                    } else if (norm === 'vinosblancosyrosados' || norm === 'vinosblancos') {
                      setSelectedWineMacro('blancas');
                      setSelectedWineVarietal('todo');
                    } else if (norm === 'espumantes') {
                      setSelectedWineMacro('champagne');
                      setSelectedWineVarietal('todo');
                    } else if (norm === 'destilados') {
                      setSelectedWineMacro('destilados');
                      setSelectedWineVarietal('todo');
                    } else if (norm !== 'bodega' && norm !== 'bodegayvinos') {
                      setSelectedWineMacro('todo');
                      setSelectedWineVarietal('todo');
                    }
                  }}
                  className={`relative py-1.5 px-3 text-xs font-extrabold rounded-lg whitespace-nowrap transition-all duration-150 cursor-pointer active:scale-95 flex items-center gap-1 shrink-0 z-10 ${
                    isActive 
                      ? 'text-white font-black' 
                      : 'text-[#8C6239] dark:text-stone-200 bg-white/60 dark:bg-white/5 border border-[#8C6239]/25 dark:border-white/10 hover:bg-[#8C6239]/10 hover:text-white dark:hover:bg-white/15'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeCategoryIndicator"
                      className="absolute inset-0 bg-[#8C6239] rounded-lg -z-10 shadow-md border border-[#C8956A]/20"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  {cat.label}
                </button>
              );
            })}
          </div>

          {isCrossCategorySearch && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              <span>Sin coincidencias en <strong>{selectedCategoria}</strong>. Mostrando {filteredProducts.length} resultado(s) en todo el menú.</span>
              <button
                type="button"
                onClick={() => setSelectedCategoria('todo')}
                className="underline font-bold ml-2 hover:opacity-80 cursor-pointer"
              >
                Ver en Todos
              </button>
            </div>
          )}

          {/* HIERARCHICAL BODEGA/WINE BROWSER */}
          {(isBodegaCategory(selectedCategoria) || normalizeCategoryString(selectedCategoria) === 'destilados') && (
            <div className="space-y-2.5 pt-3 border-t border-stone-250/30 transition-all duration-300">
              {/* Macro categories */}
              {(normalizeCategoryString(selectedCategoria) === 'bodega' || normalizeCategoryString(selectedCategoria) === 'bodegayvinos') && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5">
                  {[
                    { id: 'todo', label: 'Todo Bodega 🍷' },
                    { id: 'tintas', label: 'Bodegas Tintas 🍷' },
                    { id: 'blancas', label: 'Bodegas Blancas 🥂' },
                    { id: 'copas', label: 'Copas de Vino 🍷' },
                    { id: 'champagne', label: 'Champagne & Espumantes 🍾' },
                    { id: 'destilados', label: 'Destilados & Aperitivos 🥃' }
                  ].map(macro => (
                    <button
                      key={macro.id}
                      onClick={() => {
                        setSelectedWineMacro(macro.id as any);
                        setSelectedWineVarietal('todo');
                      }}
                      className={`py-1 px-2.5 text-[10px] md:text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                        selectedWineMacro === macro.id
                          ? 'bg-[#8C6239] text-white shadow-sm'
                          : 'bg-white/60 dark:bg-white/5 text-[#8C6239] dark:text-stone-200 hover:bg-[#8C6239]/10 hover:text-[#8C6239] dark:hover:bg-white/15 border border-[#8C6239]/25 dark:border-white/10'
                      }`}
                    >
                      {macro.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Varietals sub-menu for Tintas and Blancas */}
              {(selectedWineMacro === 'tintas' || selectedWineMacro === 'blancas') && (
                <div className="space-y-2 bg-[#FAF7F0] dark:bg-[#1C140E] p-3 rounded-lg border border-stone-200 dark:border-[#C8956A]/10">
                  <div className="text-[11px] text-[#8C6239] dark:text-[#E8B800] font-black uppercase tracking-wider">
                    Filtrar por Varietal:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedWineVarietal('todo')}
                      className={`py-1.5 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        selectedWineVarietal === 'todo'
                          ? 'bg-[#8C6239] text-white border-[#8C6239] shadow-sm'
                          : 'bg-white/60 dark:bg-white/5 text-[#8C6239] dark:text-stone-200 border border-[#8C6239]/25 dark:border-white/10 hover:bg-[#8C6239]/10 hover:text-[#8C6239] dark:hover:bg-white/15'
                      }`}
                    >
                      Todos
                    </button>
                    {(selectedWineMacro === 'tintas'
                      ? ['Malbec', 'Cabernet Sauvignon', 'Red Blend', 'Cabernet Franc', 'Merlot', 'Pinot Noir', 'Otros Varietales Tintos']
                      : ['Chardonnay', 'Sauvignon Blanc', 'Torrontés', 'Riesling', 'Gewurztraminer', 'Albariño']
                    ).map(varName => (
                      <button
                        key={varName}
                        onClick={() => setSelectedWineVarietal(varName)}
                        className={`py-1.5 px-3 text-xs font-bold rounded-lg border whitespace-nowrap transition-all cursor-pointer ${
                          selectedWineVarietal === varName
                            ? 'bg-[#8C6239] text-white border-[#8C6239] shadow-sm'
                            : 'bg-white/60 dark:bg-white/5 text-[#8C6239] dark:text-stone-200 border border-[#8C6239]/25 dark:border-white/10 hover:bg-[#8C6239]/10 hover:text-[#8C6239] dark:hover:bg-white/15'
                        }`}
                      >
                        {varName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Product Cards Grid / Menú del Día Grid / Promociones Grid */}
        {selectedCategoria === 'MenuDelDia' ? (
          <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
            {(() => {
              const daysOrder = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
              const dayNames: Record<string, string> = {
                lunes: 'LUNES', martes: 'MARTES', miercoles: 'MIÉRCOLES', jueves: 'JUEVES', viernes: 'VIERNES', sabado: 'SÁBADO', domingo: 'DOMINGO'
              };
              const todayKey = daysOrder[new Date().getDay()];
              const todayData = menuDiario[todayKey] || INITIAL_MENU_DIARIO[todayKey];
              const todayCartQty = cart[`menu_diario_${todayKey}`] || 0;

              return (
                <div className="space-y-4">
                  {/* Hero Card Propuesta del Día Actual */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#5C1D24] to-[#8C6239] p-5 text-white shadow-md border border-[#C8956A]/30">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="inline-block px-2.5 py-0.5 bg-white/20 backdrop-blur-xs text-[10px] font-black uppercase tracking-wider rounded-md mb-1.5">
                          🌟 PROPUESTA DE HOY — {dayNames[todayKey]}
                        </span>
                        <h3 className="text-xl font-black font-serif-rustic capitalize">{todayData?.nombre}</h3>
                        <p className="text-xs text-white/90 mt-1 max-w-lg leading-relaxed font-sans">{todayData?.descripcion}</p>
                      </div>
                      <span className="text-2xl font-black font-mono bg-black/20 px-3 py-1 rounded-xl border border-white/20">
                        ${todayData?.precio ? todayData.precio.toLocaleString('es-AR') : '8.500'}
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between">
                      <span className="text-xs font-bold text-white/80">
                        Categoría: <strong className="text-white">{todayData?.categoria}</strong>
                      </span>
                      <div className="flex items-center gap-2">
                        {todayCartQty > 0 && (
                          <span className="text-xs font-black bg-white text-[#5C1D24] px-2.5 py-1 rounded-lg">
                            {todayCartQty} en pedido
                          </span>
                        )}
                        <button
                          onClick={() => handleAddToCart(`menu_diario_${todayKey}`)}
                          className="px-4 py-2 bg-white text-[#5C1D24] hover:bg-stone-100 font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" /> Añadir al Pedido
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Menú Semanal Completo Grid */}
                  <div className="bg-[#FAF7F0] dark:bg-[#1E140E] p-3 rounded-2xl border border-[#8C6239]/20 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#8C6239] dark:text-[#C8956A] uppercase tracking-wider">
                      📅 Rotación Semanal Completa (Lunes a Domingo)
                    </h4>
                    <span className="text-[10px] text-stone-500 font-semibold">Seleccionable para mesa</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map(day => {
                      const diaData = menuDiario[day] || INITIAL_MENU_DIARIO[day];
                      const isToday = day === todayKey;
                      const cartQty = cart[`menu_diario_${day}`] || 0;

                      return (
                        <div
                          key={day}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                            isToday
                              ? 'border-[#5C1D24] bg-[#5C1D24]/5 ring-1 ring-[#5C1D24]/20'
                              : 'bg-white dark:bg-[#251B12] border-stone-200 dark:border-stone-850'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                isToday ? 'bg-[#5C1D24] text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                              }`}>
                                {dayNames[day]} {isToday && '· (HOY)'}
                              </span>
                              <span className="font-mono font-bold text-xs text-[#8C6239] dark:text-stone-200">
                                ${diaData?.precio ? diaData.precio.toLocaleString('es-AR') : '8.500'}
                              </span>
                            </div>
                            <h5 className="font-bold text-xs text-stone-850 dark:text-stone-100 line-clamp-1">{diaData?.nombre}</h5>
                            <p className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-2 mt-0.5">{diaData?.descripcion}</p>
                          </div>

                          <div className="mt-3 pt-2 border-t border-stone-100 dark:border-white/5 flex justify-between items-center">
                            <span className="text-[10px] text-stone-400 font-semibold">{diaData?.categoria}</span>
                            <button
                              onClick={() => handleAddToCart(`menu_diario_${day}`)}
                              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                                isToday
                                  ? 'bg-[#5C1D24] text-white hover:bg-[#7a2730]'
                                  : 'bg-[#8C6239] text-white hover:bg-[#704d2c]'
                              }`}
                            >
                              <Plus className="w-3 h-3" /> {cartQty > 0 ? `(${cartQty}) Añadir` : 'Añadir'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : selectedCategoria === 'Promociones' ? (
          <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
            <div className="bg-[#FAF7F0] dark:bg-[#1E140E] p-4 rounded-2xl border border-[#8C6239]/20 dark:border-[#8C6239]/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-[#8C6239] dark:text-[#C8956A] uppercase tracking-widest block">
                  Ofertas & Descuentos
                </span>
                <h4 className="text-sm font-bold text-stone-850 dark:text-stone-100 font-serif-rustic">
                  Promociones Activas en el Sistema
                </h4>
              </div>
              <span className="px-3 py-1 bg-[#8C6239] text-white text-xs font-black rounded-xl shadow-xs">
                {promociones.length} Activas
              </span>
            </div>

            {promocionesLoading ? (
              <div className="text-center py-10 text-stone-400 font-bold text-xs animate-pulse">
                Cargando promociones del sistema...
              </div>
            ) : promociones.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {promociones.map(promo => {
                  const currentInCart = cart[promo.id_promo] || 0;
                  return (
                    <motion.div
                      key={promo.id_promo}
                      whileHover={{ scale: 1.02, translateY: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAddToCart(promo.id_promo)}
                      className={`group cursor-pointer rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 relative border flex flex-col justify-between ${
                        currentInCart > 0 
                          ? 'border-[#8C6239] bg-[#8C6239]/5 dark:bg-white/5 ring-1 ring-[#C8956A]/20' 
                          : 'bg-white dark:bg-[#251B12] border-stone-200/80 dark:border-stone-850'
                      }`}
                    >
                      {promo.imagen_url ? (
                        <div className="h-32 w-full relative overflow-hidden bg-stone-100 dark:bg-stone-900">
                          <img 
                            src={promo.imagen_url} 
                            alt={promo.nombre}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                            <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md text-white text-[9px] font-black uppercase rounded-full border border-white/20">
                              {promo.tipo === 'happy_hour' ? 'Happy Hour' : promo.tipo === 'combo' ? 'Combo' : 'Descuento Directo'}
                            </span>
                            {promo.descuento_porcentaje > 0 && (
                              <span className="px-2.5 py-0.5 bg-[#8C6239] text-white text-xs font-black rounded-lg shadow font-mono">
                                {promo.descuento_porcentaje}% OFF
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-gradient-to-r from-[#8C6239] to-[#C8956A] text-white flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {promo.tipo === 'happy_hour' ? 'Happy Hour' : promo.tipo === 'combo' ? 'Combo' : 'Descuento Directo'}
                          </span>
                          {promo.descuento_porcentaje > 0 && (
                            <span className="px-2 py-0.5 bg-black/30 text-white text-xs font-black rounded-lg font-mono">
                              {promo.descuento_porcentaje}% OFF
                            </span>
                          )}
                        </div>
                      )}

                      <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-extrabold text-stone-900 dark:text-white text-xs group-hover:text-[#8C6239] dark:group-hover:text-[#E8B800] transition-colors">
                              {promo.nombre}
                            </h4>
                            {promo.precio !== undefined && promo.precio > 0 && (
                              <span className="font-mono font-black text-[#8C6239] dark:text-[#E8B800] text-xs shrink-0">
                                ${promo.precio.toLocaleString('es-AR')}
                              </span>
                            )}
                          </div>
                          {promo.descripcion && (
                            <p className="text-[11px] text-stone-600 dark:text-stone-300 italic leading-relaxed">
                              {promo.descripcion}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                          <span className="flex items-center gap-1 text-[10px] font-bold text-stone-500 dark:text-stone-400">
                            <Clock className="w-3.5 h-3.5 text-[#8C6239]" />
                            {promo.dias_vigentes || 'Todos los días'}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(promo.id_promo);
                            }}
                            className="px-3 py-1.5 bg-[#8C6239] text-white hover:bg-[#C8956A] active:scale-95 transition-all text-xs font-black rounded-xl shadow flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{currentInCart > 0 ? `${currentInCart} en bolsa` : 'Añadir'}</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 bg-white dark:bg-[#251B12] rounded-2xl border border-stone-200 dark:border-stone-850 p-6 space-y-2">
                <Tag className="w-8 h-8 text-[#8C6239] mx-auto opacity-50" />
                <p className="text-xs font-bold text-stone-600 dark:text-stone-300">
                  No hay promociones activas registradas en este momento.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[550px] overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-center text-stone-400">
                <Search className="w-8 h-8 mb-2 opacity-40 text-[#8C6239]" />
                <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  No se encontraron productos
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {searchQuery ? `No hay resultados para "${searchQuery}".` : 'No hay productos activos en esta categoría.'}
                </p>
              </div>
            ) : (
              filteredProducts.map(p => {
                const stockRemaining = getSimulatedStockRemaining(p);
                const isOutOfStock = !permitirVentaSinStock && stockRemaining <= 0;
                const isLowStock = !permitirVentaSinStock && stockRemaining > 0 && stockRemaining <= 3;
                const currentInCart = cart[p.id_producto] || 0;

                return (
                  <motion.div
                    key={p.id_producto}
                    whileHover={{ scale: 1.02, translateY: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => !isOutOfStock && handleAddToCart(p.id_producto)}
                    className={`group cursor-pointer rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 relative border ${
                      isOutOfStock 
                        ? 'opacity-60 border-rose-100 pointer-events-none bg-stone-50 dark:bg-stone-900/40' 
                        : currentInCart > 0 
                          ? 'border-[#8C6239] bg-[#8C6239]/5 dark:bg-white/5 ring-1 ring-[#C8956A]/20' 
                          : 'glass-panel border-stone-200/80 dark:border-white/10'
                    }`}
                    style={{ contentVisibility: 'auto' }}
                  >
                    {/* Product Image */}
                    <div className="h-28 w-full bg-stone-50 dark:bg-stone-900/60 relative overflow-hidden">
                      <img
                        src={p.imagen}
                        alt={p.nombre}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={event => {
                          const image = event.currentTarget;
                          image.onerror = null;
                          image.src = '/logo-el-patron.jpeg';
                        }}
                      />
                      
                      {/* Category icon badge */}
                      <div className="absolute top-2 left-2 p-1.5 rounded-lg backdrop-blur-md bg-white/90 shadow-sm border border-stone-100">
                        {p.categoria.toLowerCase().includes('bebida') ? (
                          <Wine className="w-3.5 h-3.5 text-[#8C6239]" />
                        ) : (
                          <UtensilsCrossed className="w-3.5 h-3.5 text-[#8C6239]" />
                        )}
                      </div>

                      {/* Stock Tag Alert */}
                      {isOutOfStock ? (
                        <div className="absolute inset-0 bg-red-950/60 flex items-center justify-center text-center p-2">
                          <span className="bg-[#EF4444] text-white text-[10px] uppercase font-extrabold tracking-wider px-2 py-1 rounded-md shadow flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-white" />
                            Sin Stock
                          </span>
                        </div>
                      ) : isLowStock ? (
                        <div className="absolute top-2 right-2">
                          <span className="bg-amber-500/90 backdrop-blur-md text-white text-[9px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Últimas {stockRemaining}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Product Details */}
                    <div className="p-3 flex justify-between items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <h4 className="font-bold text-xs text-[#8C6239] dark:text-[#FAF7F0] truncate font-sans">
                            {p.nombre}
                          </h4>
                          {p.tipo === 'vino' && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 rounded font-bold">
                              Cava
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-stone-500 dark:text-stone-350 line-clamp-1 mt-0.5">
                          {p.descripcion || p.categoria}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-extrabold text-xs font-mono text-stone-850 dark:text-[#E8B800]">
                            ${p.precio_venta.toLocaleString('es-AR')}
                          </span>
                          {currentInCart > 0 && (
                            <span className="text-[10px] font-bold bg-[#8C6239] text-[#FAF7F0] px-1.5 py-0.2 rounded-full">
                              {currentInCart} en bolsa
                            </span>
                          )}
                        </div>
                      </div>

                      {/* elastic sum button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isOutOfStock) handleAddToCart(p.id_producto);
                        }}
                        className="w-8 h-8 rounded-full bg-[#8C6239] text-white hover:bg-[#C8956A] hover:text-[#8C6239] active:scale-90 transition-all duration-200 flex items-center justify-center font-bold shadow-md shadow-[#8C6239]/20 cursor-pointer border border-amber-950/10 shrink-0"
                        title="Añadir a comanda"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Active Comanda Cart Summary */}
      <div className="lg:col-span-3">
        <div className="glass-panel rounded-3xl p-5 shadow-sm flex flex-col h-[520px] sticky top-6">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/30">
            <h3 className="font-bold text-[#8C6239] dark:text-white text-sm font-sans flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#C8956A]" />
              Nueva Comanda
            </h3>
            {selectedMesa && (
              <span className="bg-[#8C6239] text-[#FAF7F0] border border-[#C8956A]/30 font-sans text-[10px] font-extrabold px-2 py-0.5 rounded-lg shadow-sm">
                {selectedMesa.numero_mesa}
              </span>
            )}
          </div>

          {!selectedMesaId ? (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
              <div className="w-12 h-12 bg-stone-100 dark:bg-white/5 text-stone-400 dark:text-stone-500 rounded-full flex items-center justify-center mb-3">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-[#8C6239] dark:text-white text-xs">Seleccione Mesa</h4>
              <p className="text-stone-600 dark:text-stone-400 text-[10px] mt-1 max-w-[180px] font-serif-rustic italic">
                Marque una mesa disponible en el plano izquierdo para iniciar la comanda.
              </p>
            </div>
          ) : Object.keys(cart).length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-4 bg-[#FAF7F0]/60 dark:bg-[#1E140E]/30 rounded-2xl border border-stone-200 dark:border-[#C8956A]/10 mt-4">
              <div className="w-12 h-12 bg-[#FAF7F0] dark:bg-[#8C6239]/55 text-[#C8956A] rounded-full flex items-center justify-center mb-3 shadow-inner border border-stone-200 dark:border-white/5">
                <Sparkles className="w-5 h-5 text-[#C8956A] dark:text-[#E8B800]" />
              </div>
              <h4 className="font-bold text-[#8C6239] dark:text-white text-xs">Comanda Vacía</h4>
              <p className="text-stone-600 dark:text-stone-400 text-[10px] mt-1 max-w-[180px] font-serif-rustic italic px-2 leading-relaxed">
                Toque los platos de la carta central para cargarlos a la mesa de forma interactiva.
              </p>
            </div>
          ) : (
            <>
              {/* CART ITEMS LIST */}
              <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
                {Object.entries(cart).map(([prodId, qty]) => {
                  const p = productosMenu.find(item => item.id_producto === prodId);
                  const promo = !p ? promociones.find(item => item.id_promo === prodId) : null;
                  const itemNombre = p ? p.nombre : promo ? `[PROMO] ${promo.nombre}` : 'Promoción Especial';
                  const itemSubtitle = p 
                    ? `$${p.precio_venta.toLocaleString('es-AR')} u.` 
                    : promo 
                    ? (promo.descuento_porcentaje > 0 ? `${promo.descuento_porcentaje}% OFF Aplicado` : 'Promoción Especial')
                    : 'Oferta Especial';

                  return (
                    <div key={prodId} className="flex justify-between items-center text-xs bg-stone-50 dark:bg-[#1E140E] p-2.5 rounded-xl border border-stone-200 dark:border-[#C8956A]/15 hover:border-[#C8956A]/45 transition-all">
                      <div className="flex-1 pr-1 font-sans">
                        <span className="font-bold text-[#8C6239] dark:text-[#FAF7F0] block">{itemNombre}</span>
                        <span className="text-[10px] text-stone-500 dark:text-stone-350 font-mono">{itemSubtitle}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleRemoveFromCart(prodId)}
                          className="w-5 h-5 bg-[#FAF7F0] dark:bg-[#251B12] text-stone-750 dark:text-stone-200 hover:bg-[#F5F1E9] dark:hover:bg-[#8C6239] rounded border border-stone-300 dark:border-white/10 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono text-xs font-bold w-4 text-center dark:text-stone-100">{qty}</span>
                        <button
                          onClick={() => handleAddToCart(prodId)}
                          className="w-5 h-5 bg-[#FAF7F0] dark:bg-[#251B12] text-stone-750 dark:text-stone-200 hover:bg-[#F5F1E9] dark:hover:bg-[#8C6239] rounded border border-stone-300 dark:border-white/10 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* OBSERVATIONS INPUT */}
              <div className="mt-2 space-y-1.5 pb-3">
                <label className="text-[10px] font-bold text-stone-600 dark:text-stone-350 uppercase tracking-wider flex items-center gap-1">
                  <Bookmark className="w-3 h-3 text-[#C8956A]" />
                  Observaciones de Comanda
                </label>
                <textarea
                  placeholder="Ej: Bife bien cocido, papas sin sal, agua a temperatura ambiente..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full text-xs bg-[#8C6239]/5 dark:bg-white/5 text-stone-850 dark:text-stone-200 p-2 border border-stone-200 dark:border-[#C8956A]/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C8956A] focus:border-[#C8956A] resize-none h-14"
                />
              </div>

              {/* FOOTER TOTAL & INJECT BTN */}
              <div className="pt-3 border-t border-stone-200/30 space-y-3">
                <div className="flex justify-between items-center text-sm font-sans font-semibold text-[#8C6239] dark:text-stone-300">
                  <span>Monto Total:</span>
                  <span className="font-mono font-black text-[#8C6239] dark:text-[#E8B800] text-base">
                    ${totalCartValue.toLocaleString('es-AR')}
                  </span>
                </div>

                <button
                  onClick={checkoutCart}
                  className="w-full py-2.5 px-4 btn-premium-primary text-xs font-black flex items-center justify-center gap-2 shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-350" />
                  Enviar comanda 🖨️
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* BILL SPLITTING MODAL (MODO DIVISION DE CUENTAS) */}
      {splittingPedidoId !== null && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="glass-panel rounded-3xl p-6 shadow-2xl max-w-md w-full border border-[#C8956A]/20">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100 font-sans tracking-tight flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Divisor de Cuentas Gastronómico
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-sans mt-0.5">
                  Mesa {pedidos.find(p => p.id_pedido === splittingPedidoId)?.numero_mesa} • Orden #{splittingPedidoId}
                </p>
              </div>
              <button
                onClick={() => {
                  setSplittingPedidoId(null);
                  setSplitItemsChecked({});
                }}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-205 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {(() => {
              const p = pedidos.find(o => o.id_pedido === splittingPedidoId);
              if (!p) return null;

              const orderTotal = calculatePedidoTotal(p, productosMenu);

              // Expand items list by their quantity for itemized selection
              const expandedItemsList: { item: PedidoItem; index: number; singlePrice: number }[] = [];
              let curIdx = 0;
              p.items.forEach(it => {
                const sPrice = resolvePedidoItemUnitPrice(it, productosMenu);
                for (let i = 0; i < it.cantidad; i++) {
                  expandedItemsList.push({ item: it, index: curIdx++, singlePrice: sPrice });
                }
              });

              // Selected items total
              const itemizedTotal = Object.entries(splitItemsChecked).reduce((total, [idxStr, checked]) => {
                if (!checked) return total;
                const idx = parseInt(idxStr);
                return total + (expandedItemsList[idx]?.singlePrice || 0);
              }, 0);

              return (
                <div className="space-y-4">
                  {/* Option A: Equitative Split */}
                  <div className="bg-[#8C6239]/5 dark:bg-white/5 p-3 rounded-xl border border-stone-200/50 dark:border-white/10">
                    <h4 className="text-xs font-bold text-[#8C6239] dark:text-[#C8956A] mb-2 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-stone-500" />
                      A. División Equitativa (Por Comensales)
                    </h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center bg-white dark:bg-[#8C6239]/80 border border-stone-200 dark:border-white/10 rounded-lg p-1.5 gap-2.5">
                        <button 
                          onClick={() => setSplitCount(c => Math.max(2, c - 1))}
                          className="w-5 h-5 rounded bg-stone-100 dark:bg-stone-850 text-stone-650 dark:text-stone-300 flex items-center justify-center font-bold text-xs cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold font-mono text-stone-850 dark:text-stone-100">{splitCount}</span>
                        <button 
                          onClick={() => setSplitCount(c => c + 1)}
                          className="w-5 h-5 rounded bg-stone-100 dark:bg-stone-850 text-stone-650 dark:text-stone-300 flex items-center justify-center font-bold text-xs cursor-pointer"
                        >
                          +
                        </button>
                        <span className="text-[10px] text-stone-400">personas</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-[#8C6239] dark:text-stone-400 font-medium">Equivale a:</p>
                        <p className="text-sm font-extrabold font-mono text-emerald-700 dark:text-emerald-400">
                          ${(orderTotal / splitCount).toLocaleString('es-AR', { maximumFractionDigits: 1 })} c/u
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Option B: Split by Select/Chair consumption */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[#8C6239] dark:text-[#C8956A] flex items-center gap-1">
                      <Receipt className="w-3.5 h-3.5 text-stone-500" />
                      B. Desglose Específico (Silla / Consumo Unitario)
                    </h4>
                    
                    <p className="text-[10px] text-stone-400 dark:text-stone-400 italic">
                      Tilde los platos que pagará este comensal de manera individual:
                    </p>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto border border-stone-200 dark:border-[#C8956A]/15 rounded-xl p-2 bg-[#FAF7F0] dark:bg-[#1C140E]">
                      {expandedItemsList.map(({ item, index, singlePrice }) => (
                        <label 
                          key={index}
                          className="flex items-center justify-between text-xs p-1.5 bg-stone-50 dark:bg-[#251B12] border border-stone-200 dark:border-white/10 rounded hover:bg-[#FAF7F0] dark:hover:bg-[#8C6239]/40 hover:border-[#C8956A]/30 cursor-pointer transition-all text-stone-750 dark:text-stone-200"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!splitItemsChecked[index]}
                              onChange={(e) => {
                                setSplitItemsChecked(prev => ({
                                  ...prev,
                                  [index]: e.target.checked
                                }));
                              }}
                              className="rounded border-stone-300 dark:border-white/20 text-[#8C6239] dark:text-[#C8956A] focus:ring-[#8C6239] w-3.5 h-3.5 cursor-pointer"
                            />
                            <span className="font-semibold text-stone-850 dark:text-stone-100">{item.nombre}</span>
                          </div>
                          <span className="font-mono text-[11px] text-stone-600 dark:text-stone-300 font-bold">${singlePrice.toLocaleString('es-AR')}</span>
                        </label>
                      ))}
                    </div>

                    {itemizedTotal > 0 && (
                      <div className="flex justify-between items-center bg-[#8C6239] text-[#FAF7F0] border border-[#C8956A]/20 rounded-xl p-3.5 shadow-md">
                        <div>
                          <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">Pago Seleccionado</span>
                          <h4 className="font-mono font-extrabold text-sm">${itemizedTotal.toLocaleString('es-AR')}</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">Sobrante Total</span>
                          <p className="font-mono text-[11px] font-semibold">${(orderTotal - itemizedTotal).toLocaleString('es-AR')}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Facturar Botonera */}
                  <div className="pt-3 border-t border-stone-200/30 flex gap-2">
                    <button
                      onClick={() => {
                        setSplittingPedidoId(null);
                        setSplitItemsChecked({});
                      }}
                      className="flex-1 py-2 text-xs bg-stone-100 dark:bg-white/10 hover:bg-stone-200 dark:hover:bg-white/15 text-stone-650 dark:text-stone-205 font-bold rounded-xl cursor-pointer transition-colors"
                    >
                      Volver
                    </button>
                    <button
                      onClick={() => {
                        const amntToPay = itemizedTotal > 0 ? itemizedTotal : orderTotal;
                        toast.success(`Se procesó el cobro de $${amntToPay.toLocaleString('es-AR')} para ${p.numero_mesa}.`);
                        
                        // If fully paid or equal split, complete it
                        if (itemizedTotal === 0 || itemizedTotal === orderTotal) {
                          onFacturarMesa(p.id_pedido);
                        } else {
                          // partial pay, we log it
                          addLog('sistema', `Mesa ${p.numero_mesa}: Cobro parcial de $${itemizedTotal.toLocaleString('es-AR')} recibido.`);
                        }
                        setSplittingPedidoId(null);
                        setSplitItemsChecked({});
                      }}
                      className="flex-1 py-2 text-xs bg-[#8C6239] hover:bg-[#5d3a2e] text-[#FAF7F0] border border-[#C8956A]/20 font-bold rounded-xl shadow flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Cobrar ${ (itemizedTotal > 0 ? itemizedTotal : orderTotal).toLocaleString('es-AR') }
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL EDITAR PEDIDO (COMANDAS ACTIVAS) */}
      {editingPedido !== null && (
        <div className="fixed inset-0 bg-stone-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 z-50 animate-fadeIn">
          <div className="rounded-3xl p-5 sm:p-7 shadow-2xl max-w-4xl lg:max-w-5xl w-full border-2 border-[#C8956A]/40 dark:border-[#C8956A]/30 max-h-[92vh] flex flex-col bg-[#FAF7F0] dark:bg-[#18110B] text-stone-900 dark:text-stone-100">
            {/* Header del Modal */}
            <div className="flex justify-between items-start pb-4 border-b-2 border-stone-200/70 dark:border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="font-black text-lg sm:text-2xl text-stone-900 dark:text-stone-50 font-sans tracking-tight flex items-center gap-2">
                    <Edit3 className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400 shrink-0" />
                    Editar Pedido #{editingPedido.id_pedido}
                  </h3>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-950 dark:text-amber-200 border border-amber-500/40 capitalize">
                    {editingPedido.estado_comanda === 'en_cocina' ? 'En Fuego 🔥' : editingPedido.estado_comanda}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 font-sans flex items-center gap-2 flex-wrap">
                  <span className="font-black text-[#8C6239] dark:text-[#E8B800] bg-[#8C6239]/15 dark:bg-[#C8956A]/20 px-2.5 py-0.5 rounded-lg border border-[#8C6239]/25 dark:border-[#C8956A]/30">
                    {editingPedido.numero_mesa || selectedMesa?.numero_mesa || 'Mesa'}
                  </span>
                  <span className="text-stone-400">•</span>
                  <span>Mozo: <strong className="text-stone-900 dark:text-white font-black">{editingPedido.mozo || activeMozo}</strong></span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPedido(null)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                title="Cerrar sin guardar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de comandas si la mesa tiene más de una activa */}
            {selectedMesaInfo && selectedMesaInfo.activeOrders.length > 1 && (
              <div className="pt-3 pb-2 flex items-center gap-2 overflow-x-auto border-b-2 border-stone-200/50 dark:border-white/10 scrollbar-none">
                <span className="text-xs font-black text-stone-700 dark:text-stone-200 uppercase tracking-wider shrink-0">
                  Comandas de la Mesa:
                </span>
                {selectedMesaInfo.activeOrders.map(ord => (
                  <button
                    key={ord.id_pedido}
                    type="button"
                    onClick={() => handleStartEditPedido(ord)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer shrink-0 ${
                      ord.id_pedido === editingPedido.id_pedido
                        ? 'bg-[#8C6239] text-white shadow-sm ring-2 ring-[#8C6239]/30'
                        : 'bg-white dark:bg-[#251B12] text-stone-700 dark:text-stone-200 border border-stone-300 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-white/10'
                    }`}
                  >
                    #{ord.id_pedido} ({ord.items.length} {ord.items.length === 1 ? 'ítem' : 'ítems'})
                  </button>
                ))}
              </div>
            )}

            {/* Cuerpo en 2 Columnas (md+) o Apilado (mobile) */}
            <div className="flex-1 overflow-y-auto py-4 pr-1">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                
                {/* COLUMNA IZQUIERDA (md:col-span-6): Platos actuales en la comanda + Observaciones */}
                <div className="md:col-span-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-white/80 dark:bg-[#22160E] p-2.5 rounded-xl border border-stone-200 dark:border-[#C8956A]/20 shadow-2xs">
                      <label className="text-xs sm:text-sm font-black text-[#8C6239] dark:text-[#E8B800] uppercase tracking-wider flex items-center gap-2">
                        <UtensilsCrossed className="w-4 h-4 text-[#8C6239] dark:text-[#E8B800]" />
                        Platos en Comanda ({editingItems.reduce((acc, it) => acc + it.cantidad, 0)} {editingItems.reduce((acc, it) => acc + it.cantidad, 0) === 1 ? 'ítem' : 'ítems'})
                      </label>
                      {editingItems.length > 0 && (
                        <span className="text-xs sm:text-sm text-stone-900 dark:text-stone-100 font-mono font-black bg-stone-100 dark:bg-white/10 px-2.5 py-0.5 rounded-md border border-stone-200 dark:border-white/10">
                          ${editingTotal.toLocaleString('es-AR')}
                        </span>
                      )}
                    </div>

                    {editingItems.length === 0 ? (
                      <div className="p-6 bg-amber-50 dark:bg-[#251B12] border-2 border-amber-300/80 dark:border-amber-600/40 rounded-2xl text-center space-y-2 shadow-sm">
                        <p className="text-sm font-black text-amber-950 dark:text-amber-200">
                          No hay platos en la comanda.
                        </p>
                        <p className="text-xs text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
                          Agregue productos desde el catálogo del menú a la derecha para completar el pedido.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[350px] sm:max-h-[390px] overflow-y-auto pr-1">
                        {editingItems.map((item, idx) => {
                          const unitPrice = resolvePedidoItemUnitPrice(item, productosMenu);
                          const lineTotal = unitPrice * item.cantidad;
                          return (
                            <div
                              key={`${item.id_producto}_${idx}`}
                              className="flex items-center justify-between p-3 rounded-2xl border-2 border-stone-200/90 dark:border-[#C8956A]/25 bg-white dark:bg-[#22160E] hover:border-amber-400/80 dark:hover:border-[#E8B800]/50 transition-all shadow-xs"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <p className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-white truncate">
                                  {item.nombre}
                                </p>
                                <p className="text-xs font-semibold text-stone-600 dark:text-stone-300 font-mono mt-0.5">
                                  ${unitPrice.toLocaleString('es-AR')} c/u • <span className="text-stone-500 dark:text-stone-400">{item.categoria || 'Carta'}</span>
                                </p>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                <div className="flex items-center bg-stone-100 dark:bg-[#18110B] border border-stone-300 dark:border-[#C8956A]/30 rounded-xl p-0.5 shadow-inner">
                                  <button
                                    type="button"
                                    onClick={() => handleEditItemQuantity(idx, -1)}
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-stone-800 dark:text-stone-100 hover:bg-stone-200 dark:hover:bg-[#322317] font-black cursor-pointer transition-colors"
                                    title={item.cantidad === 1 ? 'Quitar ítem' : 'Reducir cantidad'}
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-7 sm:w-8 text-center font-mono font-black text-stone-900 dark:text-white text-sm sm:text-base">
                                    {item.cantidad}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleEditItemQuantity(idx, 1)}
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-stone-800 dark:text-stone-100 hover:bg-stone-200 dark:hover:bg-[#322317] font-black cursor-pointer transition-colors"
                                    title="Aumentar cantidad"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <span className="w-20 sm:w-24 text-right font-mono font-black text-stone-900 dark:text-[#E8B800] text-sm sm:text-base">
                                  ${lineTotal.toLocaleString('es-AR')}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleEditRemoveItem(idx)}
                                  className="p-2 text-stone-400 hover:text-red-600 dark:text-stone-400 dark:hover:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
                                  title="Eliminar de la comanda"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Observaciones e Indicaciones de Cocina */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-stone-700 dark:text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5 text-[#8C6239] dark:text-[#C8956A]" />
                      Observaciones e Indicaciones de Cocina
                    </label>
                    <textarea
                      placeholder="Ej: Bife bien cocido, papas sin sal, salsa mixta en cazuela aparte..."
                      value={editingObservaciones}
                      onChange={e => setEditingObservaciones(e.target.value)}
                      className="w-full text-xs sm:text-sm p-3 rounded-2xl border-2 border-stone-300 dark:border-[#C8956A]/30 bg-white dark:bg-[#22160E] text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-400 focus:outline-none focus:border-[#C8956A] focus:ring-2 focus:ring-[#C8956A]/20 resize-none h-20 leading-relaxed font-medium"
                    />
                  </div>
                </div>

                {/* COLUMNA DERECHA (md:col-span-6): Catálogo para agregar platos */}
                <div className="md:col-span-6 space-y-3.5 bg-white/70 dark:bg-[#22160E]/70 p-4 sm:p-4.5 rounded-3xl border-2 border-stone-200/80 dark:border-[#C8956A]/25 shadow-xs">
                  <div className="flex justify-between items-center">
                    <label className="text-xs sm:text-sm font-black text-[#8C6239] dark:text-[#E8B800] uppercase tracking-wider flex items-center gap-2">
                      <Plus className="w-4 h-4 text-[#8C6239] dark:text-[#E8B800]" />
                      Agregar Plato o Bebida
                    </label>
                    <span className="text-xs text-stone-600 dark:text-stone-300 font-bold">
                      Catálogo del Menú
                    </span>
                  </div>

                  {/* Buscador */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#8C6239] dark:text-[#C8956A] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar plato, vino, postre o bebida..."
                      value={editProductSearch}
                      onChange={e => setEditProductSearch(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 bg-white dark:bg-[#18110B] border-2 border-stone-300 dark:border-[#C8956A]/35 rounded-xl text-xs sm:text-sm text-stone-900 dark:text-white placeholder-stone-500 dark:placeholder-stone-400 focus:outline-none focus:border-[#C8956A] focus:ring-2 focus:ring-[#C8956A]/20 transition-all font-medium"
                    />
                    {editProductSearch && (
                      <button
                        type="button"
                        onClick={() => setEditProductSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-white p-1 cursor-pointer"
                        title="Limpiar búsqueda"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Filtros de categorías dinámicas */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {editCategoriesList.map(cat => {
                      const isSelected = (cat === 'Todos' && (editCategoryFilter.toLowerCase() === 'todos' || editCategoryFilter.toLowerCase() === 'todo')) ||
                        normalizeCategoryString(editCategoryFilter) === normalizeCategoryString(cat);

                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setEditCategoryFilter(cat);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#8C6239] text-white shadow-sm ring-2 ring-[#8C6239]/40'
                              : 'bg-white dark:bg-[#18110B] text-stone-700 dark:text-stone-200 border border-stone-300/80 dark:border-[#C8956A]/20 hover:bg-stone-100 dark:hover:bg-[#2e1d13]'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>

                  {/* Aviso de búsqueda global */}
                  {isCrossCategoryEditSearch && (
                    <div className="flex items-center justify-between px-3 py-2 bg-amber-100/90 dark:bg-amber-950/60 border border-amber-400 dark:border-amber-700 text-amber-950 dark:text-amber-200 text-xs rounded-xl">
                      <span>
                        Sin resultados en <strong>{editCategoryFilter}</strong>. Mostrando {filteredProductsForEdit.length} plato(s) en todo el menú.
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditCategoryFilter('Todos')}
                        className="underline font-black ml-2 hover:opacity-80 cursor-pointer shrink-0"
                      >
                        Ver en Todos
                      </button>
                    </div>
                  )}

                  {/* Lista de productos para agregar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[380px] sm:max-h-[420px] overflow-y-auto pr-1">
                    {filteredProductsForEdit.length === 0 ? (
                      <div className="col-span-full text-center py-8 space-y-2 bg-white/60 dark:bg-[#18110B]/60 rounded-2xl border border-stone-200 dark:border-white/5">
                        <p className="text-sm font-bold text-stone-600 dark:text-stone-300">
                          No se encontraron productos coincidentes.
                        </p>
                        {editCategoryFilter !== 'Todos' && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditCategoryFilter('Todos');
                              setEditProductSearch('');
                            }}
                            className="text-xs text-[#8C6239] dark:text-[#E8B800] underline font-black cursor-pointer"
                          >
                            Restablecer a Todos los platos
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredProductsForEdit.map(prod => (
                        <button
                          key={prod.id_producto}
                          type="button"
                          onClick={() => handleEditAddProduct(prod)}
                          className="flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-[#18110B] border-2 border-stone-200/80 dark:border-[#C8956A]/20 hover:border-emerald-600 dark:hover:border-emerald-500/80 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 text-left transition-all cursor-pointer group shadow-2xs active:scale-98"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-white truncate group-hover:text-emerald-800 dark:group-hover:text-emerald-300">
                              {prod.nombre}
                            </p>
                            <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                              {prod.categoria}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-400">
                              ${prod.precio_venta.toLocaleString('es-AR')}
                            </span>
                            <span className="w-6 h-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center text-xs font-black shadow-xs group-hover:scale-110 transition-transform">
                              +
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Pie de acción del modal */}
            <div className="pt-4 border-t-2 border-stone-200/70 dark:border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/70 dark:bg-[#140D08]/90 -mx-5 sm:-mx-7 -mb-5 sm:-mb-7 p-4 sm:p-6 rounded-b-3xl mt-auto">
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                <span className="text-xs sm:text-sm font-black text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                  Nuevo Total:
                </span>
                <span className="font-mono font-black text-2xl sm:text-3xl text-[#8C6239] dark:text-[#E8B800]">
                  ${editingTotal.toLocaleString('es-AR')}
                </span>
              </div>

              <div className="flex gap-2.5 w-full sm:w-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => setEditingPedido(null)}
                  disabled={isSavingEdit}
                  className="flex-1 sm:flex-initial py-2.5 sm:py-3 px-4 sm:px-5 rounded-xl bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 text-xs sm:text-sm font-black transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEditPedido(true)}
                  disabled={isSavingEdit || editingItems.length === 0}
                  className="flex-1 sm:flex-initial py-2.5 sm:py-3 px-4 sm:px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                  title="Guardar los cambios y emitir la comanda actualizada a la tiquetera"
                >
                  <Printer className="w-4 h-4" />
                  Guardar y Emitir Comanda
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEditPedido(false)}
                  disabled={isSavingEdit || editingItems.length === 0}
                  className="flex-1 sm:flex-initial py-2.5 sm:py-3 px-5 sm:px-6 rounded-xl bg-[#8C6239] hover:bg-[#6e4623] text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voice Command Confirmation Modal */}
      {voiceResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-105">
            <div className="bg-[#624A3E] text-white p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-amber-300 animate-bounce" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm tracking-wider uppercase">Confirmar Comanda por Voz</h3>
                <p className="text-[10px] text-amber-200 font-medium">Revisá y confirmá los detalles interpretados</p>
              </div>
              <button 
                onClick={() => setVoiceResult(null)}
                className="ml-auto w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Transcribed Text */}
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-100">
                <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider block mb-1">Texto Dictado</span>
                <p className="text-xs text-stone-650 italic">"{voiceText}"</p>
              </div>

              {/* Detected Mesa */}
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <span className="text-xs font-bold text-stone-500">Mesa Detectada:</span>
                <span className="bg-stone-100 border border-stone-200 text-stone-700 font-extrabold text-xs px-3 py-1 rounded-xl">
                  {voiceResult.mesa !== null 
                    ? (voiceResult.mesa === 'delivery' ? 'Pedido Delivery' : `Mesa ${voiceResult.mesa}`) 
                    : selectedMesaId !== null 
                      ? (selectedMesaId === 999 ? 'Mesa Actual (DELIVERY)' : `Mesa Actual (${mesas.find(m => String(m.id_mesa) === String(selectedMesaId))?.numero_mesa})`) 
                      : 'Ninguna (Se aplicará a mesa seleccionada)'}
                </span>
              </div>

              {/* Detected Items */}
              <div>
                <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider block mb-2">Platos Interpretados</span>
                {voiceResult.items.length === 0 ? (
                  <div className="text-center py-4 text-xs text-stone-400 italic">No se detectaron platos válidos en el dictado.</div>
                ) : (
                  <div className="space-y-2">
                    {voiceResult.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-stone-50 border border-stone-205 p-3 rounded-2xl">
                        <div className="min-w-0 pr-2 col-span-1">
                          <span className="text-xs font-bold text-stone-750 block">{item.product.nombre}</span>
                          <span className="text-[10px] text-stone-450 block">${item.product.precio_venta} c/u</span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <button
                            onClick={() => {
                              setVoiceResult(prev => {
                                if (!prev) return null;
                                const updatedItems = [...prev.items];
                                if (updatedItems[idx].quantity > 1) {
                                  updatedItems[idx].quantity -= 1;
                                } else {
                                  updatedItems.splice(idx, 1);
                                }
                                return { ...prev, items: updatedItems };
                              });
                            }}
                            className="w-7 h-7 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center text-stone-550 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-black text-stone-850 w-5 text-center">{item.quantity}</span>
                          <button
                            onClick={() => {
                              setVoiceResult(prev => {
                                if (!prev) return null;
                                const updatedItems = [...prev.items];
                                updatedItems[idx].quantity += 1;
                                return { ...prev, items: updatedItems };
                              });
                            }}
                            className="w-7 h-7 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center text-stone-550 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Unrecognized items alert */}
              {voiceResult.unrecognized.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 p-3 rounded-2xl flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                  <div className="text-[10px] leading-relaxed">
                    <span className="font-bold block mb-0.5">Texto no reconocido:</span>
                    <p className="italic">"{voiceResult.unrecognized.join(', ')}"</p>
                    <p className="mt-1 text-stone-400">Verificá si el nombre del plato coincide exactamente con la carta.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-stone-100 bg-stone-50 flex gap-2.5 justify-end">
              <button
                onClick={() => setVoiceResult(null)}
                className="px-4 py-2 bg-stone-200 text-stone-650 rounded-xl text-xs font-extrabold hover:bg-stone-300 cursor-pointer transition-colors"
              >
                Descartar
              </button>
              <button
                onClick={handleConfirmVoiceCommand}
                disabled={voiceResult.items.length === 0}
                className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Confirmar y Cargar
              </button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export interface VoiceCommandResult {
  mesa: number | 'delivery' | null;
  items: { product: ProductoMenu; quantity: number }[];
  unrecognized: string[];
}

export const parseVoiceCommand = (text: string, productosMenu: ProductoMenu[]): VoiceCommandResult => {
  const lower = text.toLowerCase();
  
  // 1. Detect table number or delivery
  let mesa: number | 'delivery' | null = null;
  if (lower.includes('delivery') || lower.includes('envio') || lower.includes('envió') || lower.includes('para llevar')) {
    mesa = 'delivery';
  } else {
    const mesaMatch = lower.match(/\b(?:mesa|tabla)\s*(\d{1,2})\b/) || lower.match(/\b(?:mesa|tabla)\s*(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce)\b/);
    if (mesaMatch) {
      const rawVal = mesaMatch[1] || mesaMatch[2] || '';
      if (/^\d+$/.test(rawVal)) {
        mesa = parseInt(rawVal, 10);
      } else {
        const wordsMap: Record<string, number> = {
          uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
          once: 11, doce: 12, trece: 13, catorce: 14
        };
        mesa = wordsMap[rawVal] || null;
      }
    }
  }

  // 2. Helper to normalize name for comparison (removes accents, plurals, special characters)
  const normalizeName = (name: string): string => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/s\b/g, "")            // remove plural 's' at word boundaries
      .replace(/s$/g, "")             // remove trailing 's'
      .replace(/[^a-z0-9\s]/g, "")    // remove special chars
      .replace(/\s+/g, " ")           // collapse spaces
      .trim();
  };

  const numbersWordMap: Record<string, number> = {
    un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
    once: 11, doce: 12, trece: 13, catorce: 14
  };

  // Split sentence by connector words like "y", "," or "con"
  const segments = lower.split(/\b(?:y|,|con)\b/);
  const items: { product: ProductoMenu; quantity: number }[] = [];
  const unrecognized: string[] = [];

  segments.forEach(segment => {
    let cleanSegment = segment.trim();
    if (!cleanSegment) return;

    // Remove mesa or delivery prefix if present at start of segment (e.g. "mesa once dos bife de chorizo" -> "dos bife de chorizo")
    cleanSegment = cleanSegment.replace(/^\b(?:mesa|tabla)\s*(\d{1,2}|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce)\b\s*/i, '').trim();
    cleanSegment = cleanSegment.replace(/^\b(?:delivery|envio|envió|para llevar)\b\s*/i, '').trim();
    if (!cleanSegment) return;

    // Try to extract quantity at the beginning (only match numbers or known number words followed by a space)
    let qty = 1;
    const qtyMatch = cleanSegment.match(/^(\d+)\s+(.*)$/) || cleanSegment.match(/^(un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce)\s+(.*)$/i);
    let potentialProductName = cleanSegment;

    if (qtyMatch) {
      const potentialQty = qtyMatch[1].toLowerCase();
      const rest = qtyMatch[2];
      if (/^\d+$/.test(potentialQty)) {
        qty = parseInt(potentialQty, 10);
        potentialProductName = rest;
      } else if (numbersWordMap[potentialQty]) {
        qty = numbersWordMap[potentialQty];
        potentialProductName = rest;
      }
    }

    const cleanProdName = potentialProductName.trim();
    if (!cleanProdName) return;

    // Normalize target product query
    const targetNormalized = normalizeName(cleanProdName);
    if (!targetNormalized) return;

    // Search for best matching product
    let bestProduct: ProductoMenu | null = null;
    let maxMatchScore = 0;

    const segmentTokens = targetNormalized.split(/\s+/).filter(t => t.length > 1);

    productosMenu.forEach(p => {
      const pNormalized = normalizeName(p.nombre);
      
      // 1. Direct exact match (highest priority)
      if (pNormalized === targetNormalized) {
        bestProduct = p;
        maxMatchScore = 100;
        return;
      }
      
      // 2. Substring matching
      if (pNormalized.includes(targetNormalized) || targetNormalized.includes(pNormalized)) {
        const score = pNormalized.includes(targetNormalized) ? 90 : 85;
        if (score > maxMatchScore) {
          maxMatchScore = score;
          bestProduct = p;
        }
        return;
      }

      // 3. Token count matching (for partial dictations)
      const pTokens = pNormalized.split(/\s+/).filter(t => t.length > 1);
      let matchCount = 0;
      segmentTokens.forEach(t => {
        if (pNormalized.includes(t)) {
          matchCount++;
        }
      });

      if (pTokens.length > 0 && matchCount > 0) {
        const score = (matchCount / pTokens.length) * 80;
        if (score > maxMatchScore) {
          maxMatchScore = score;
          bestProduct = p;
        }
      }
    });

    if (bestProduct && maxMatchScore >= 35) {
      items.push({ product: bestProduct, quantity: qty });
    } else {
      unrecognized.push(cleanSegment);
    }
  });

  return { mesa, items, unrecognized };
};
