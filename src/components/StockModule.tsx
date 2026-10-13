import React, { useState, useMemo } from 'react';
import { 
  Wine, 
  GlassWater, 
  Beer, 
  Sparkles, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Package, 
  TrendingDown, 
  SlidersHorizontal, 
  X, 
  Save,
  Check,
  Flame,
  Coffee
} from 'lucide-react';
import { ProductoMenu } from '../types';
import { menuService } from '../services/menuService';
import { useToast } from './ToastContainer';

interface StockModuleProps {
  productosMenu: ProductoMenu[];
  onProductosChange: React.Dispatch<React.SetStateAction<ProductoMenu[]>>;
  addLog: (
    tipo: 'pedido_creado' | 'descuento_stock' | 'alerta_stock' | 'comanda_estado' | 'merma_registrada' | 'sistema', 
    mensaje: string
  ) => void;
}

type BeverageCategoryFilter = 
  | 'todos' 
  | 'vinos_tintos' 
  | 'vinos_blancos' 
  | 'champagne' 
  | 'tragos' 
  | 'gaseosas' 
  | 'cervezas';

type StockStatusFilter = 'todos' | 'ok' | 'bajo' | 'agotado';

export default function StockModule({
  productosMenu,
  onProductosChange,
  addLog
}: StockModuleProps) {
  const { toast } = useToast();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<BeverageCategoryFilter>('todos');
  const [statusFilter, setStatusFilter] = useState<StockStatusFilter>('todos');

  // Modals state
  const [editingProduct, setEditingProduct] = useState<ProductoMenu | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductoMenu | null>(null);

  // New product form initial state
  const [newForm, setNewForm] = useState<Partial<ProductoMenu>>({
    nombre: '',
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    precio_venta: 12500,
    stock_actual: 6,
    stock_minimo: 2,
    unidad_medida: 'Botella 750ml',
    tipo: 'vino',
    controla_stock: true,
    activo: true
  });

  // Filter ONLY beverages (wines, champagnes, spirits, cocktails, soft drinks, beers, waters)
  const isBeverage = (p: ProductoMenu): boolean => {
    const cat = (p.categoria || '').toLowerCase();
    const sub = (p.subcategoria || '').toLowerCase();
    const nom = (p.nombre || '').toLowerCase();
    const tip = (p.tipo || '').toLowerCase();
    const id = (p.id_producto || '').toLowerCase();

    return (
      tip === 'vino' ||
      tip === 'bebida' ||
      cat.includes('bodega') ||
      cat.includes('bebida') ||
      cat.includes('vino') ||
      cat.includes('gaseosa') ||
      cat.includes('agua') ||
      sub.includes('vino') ||
      sub.includes('champagne') ||
      sub.includes('espumante') ||
      sub.includes('trago') ||
      sub.includes('gaseosa') ||
      sub.includes('cerveza') ||
      sub.includes('destilado') ||
      sub.includes('aperitivo') ||
      sub.includes('agua') ||
      sub.includes('saborizada') ||
      id.startsWith('prod_vin_') ||
      id.startsWith('prod_beb_') ||
      id.startsWith('prod_champ_') ||
      id.startsWith('prod_trag_') ||
      id.startsWith('prod_sin_') ||
      id.startsWith('prod_cerv_') ||
      nom.includes('malbec') ||
      nom.includes('cabernet') ||
      nom.includes('coca') ||
      nom.includes('fanta') ||
      nom.includes('sprite') ||
      nom.includes('tonica') ||
      nom.includes('pomelo') ||
      nom.includes('soda') ||
      nom.includes('agua') ||
      nom.startsWith('s. ') ||
      nom.includes('s. ') ||
      nom.startsWith('s.') ||
      nom.includes('saborizada') ||
      nom.includes('cerveza') ||
      nom.includes('stella') ||
      nom.includes('fernet')
    );
  };

  // Classify beverage category
  const getBeverageGroup = (p: ProductoMenu): BeverageCategoryFilter => {
    const sub = (p.subcategoria || '').toLowerCase();
    const nom = (p.nombre || '').toLowerCase();
    const id = (p.id_producto || '').toLowerCase();

    if (sub.includes('champagne') || sub.includes('espumante') || nom.includes('champagne') || nom.includes('brut') || nom.includes('nature') || id.startsWith('prod_champ_')) {
      return 'champagne';
    }
    if (sub.includes('cerveza') || nom.includes('stella') || nom.includes('cerveza') || id.startsWith('prod_cerv_') || nom.includes('gancia sin alcohol')) {
      return 'cervezas';
    }
    if (
      sub.includes('gaseosa') || 
      sub.includes('agua') || 
      sub.includes('saborizada') ||
      nom.includes('coca') || 
      nom.includes('sprite') || 
      nom.includes('fanta') || 
      nom.includes('tonica') || 
      nom.includes('pomelo') || 
      nom.includes('saborizada') || 
      nom.includes('soda') ||
      nom.includes('agua') ||
      nom.startsWith('s. ') ||
      nom.includes('s. ') ||
      nom.startsWith('s.') ||
      nom.includes('s. limonada') ||
      nom.includes('s. pera') ||
      nom.includes('s. naranja') ||
      nom.includes('s. pomelo') ||
      nom.includes('s. manzana') ||
      id.startsWith('prod_sin_')
    ) {
      return 'gaseosas';
    }
    if (sub.includes('tinto') || nom.includes('malbec') || nom.includes('cabernet') || nom.includes('merlot') || nom.includes('pinot noir') || nom.includes('syrah') || nom.includes('bonarda') || nom.includes('tannat') || nom.includes('ancellotta') || nom.includes('blend')) {
      return 'vinos_tintos';
    }
    if (sub.includes('blanco') || sub.includes('rosado') || nom.includes('chardonnay') || nom.includes('sauvignon') || nom.includes('torrontes') || nom.includes('viognier') || nom.includes('albarino') || nom.includes('riesling') || nom.includes('rose') || nom.includes('rosado')) {
      return 'vinos_blancos';
    }
    return 'tragos';
  };

  // Extract all beverages
  const allBeverages = useMemo(() => {
    return productosMenu.filter(isBeverage);
  }, [productosMenu]);

  // Counts per category tab
  const categoryTabCounts = useMemo(() => {
    const counts: Record<string, number> = {
      todos: allBeverages.length,
      vinos_tintos: 0,
      vinos_blancos: 0,
      champagne: 0,
      tragos: 0,
      gaseosas: 0,
      cervezas: 0
    };
    for (const b of allBeverages) {
      const g = getBeverageGroup(b);
      if (counts[g] !== undefined) {
        counts[g]++;
      }
    }
    return counts;
  }, [allBeverages]);

  // Products belonging to the selected category tab (before status & search filter)
  const categoryBeverages = useMemo(() => {
    if (categoryFilter === 'todos') return allBeverages;
    return allBeverages.filter(item => getBeverageGroup(item) === categoryFilter);
  }, [allBeverages, categoryFilter]);

  // Status counts inside the current category tab
  const categoryCounts = useMemo(() => {
    const total = categoryBeverages.length;
    const ok = categoryBeverages.filter(p => (p.stock_actual ?? 0) > 0).length;
    const bajo = categoryBeverages.filter(p => (p.stock_actual ?? 0) > 0 && (p.stock_actual ?? 0) <= (p.stock_minimo ?? 2)).length;
    const agotado = categoryBeverages.filter(p => (p.stock_actual ?? 0) <= 0).length;
    return { total, ok, bajo, agotado };
  }, [categoryBeverages]);

  // Apply filters
  const filteredBeverages = useMemo(() => {
    return categoryBeverages.filter(item => {
      // Stock status filter
      const currentStock = item.stock_actual ?? 0;
      const minStock = item.stock_minimo ?? 2;

      if (statusFilter === 'agotado' && currentStock > 0) return false;
      if (statusFilter === 'bajo' && (currentStock <= 0 || currentStock > minStock)) return false;
      if (statusFilter === 'ok' && currentStock <= 0) return false;

      // Text search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = (item.nombre || '').toLowerCase().includes(query);
        const matchesSub = (item.subcategoria || '').toLowerCase().includes(query);
        const matchesCat = (item.categoria || '').toLowerCase().includes(query);
        const matchesDesc = (item.descripcion || '').toLowerCase().includes(query);
        if (!matchesName && !matchesSub && !matchesCat && !matchesDesc) return false;
      }

      return true;
    });
  }, [categoryBeverages, statusFilter, searchTerm]);

  // KPI Metrics
  const stats = useMemo(() => {
    const totalItems = allBeverages.length;
    const totalUnits = allBeverages.reduce((sum, p) => sum + (p.stock_actual ?? 0), 0);
    const lowStockItems = allBeverages.filter(p => (p.stock_actual ?? 0) <= (p.stock_minimo ?? 2) && (p.stock_actual ?? 0) > 0).length;
    const outOfStockItems = allBeverages.filter(p => (p.stock_actual ?? 0) <= 0).length;

    return { totalItems, totalUnits, lowStockItems, outOfStockItems };
  }, [allBeverages]);

  // Quick stock adjustment (+1, -1, +6, +12)
  const handleQuickAdjust = async (product: ProductoMenu, delta: number) => {
    const prevStock = product.stock_actual ?? 0;
    const newStock = Math.max(0, prevStock + delta);
    
    if (prevStock === newStock && delta < 0) return;

    const updated: ProductoMenu = {
      ...product,
      stock_actual: newStock,
      controla_stock: true
    };

    // Optimistic UI update
    onProductosChange(prev => prev.map(p => p.id_producto === product.id_producto ? updated : p));

    try {
      await menuService.save(updated);
      addLog(
        delta < 0 ? 'descuento_stock' : 'sistema',
        `Ajuste de stock: ${product.nombre} ${delta > 0 ? `+${delta}` : delta} (Ahora: ${newStock} uds.)`
      );
      toast.success(`${product.nombre}: ${newStock} en stock (${delta > 0 ? `+${delta}` : delta})`);
    } catch (err) {
      console.error('Error guardando stock:', err);
      onProductosChange(prev => prev.map(p => p.id_producto === product.id_producto ? product : p));
      toast.error('No se pudo guardar el cambio de stock en Supabase.');
    }
  };

  // Direct edit save
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const targetId = editingProduct.id_producto;
    const originalProduct = productosMenu.find(p => p.id_producto === targetId) || editingProduct;

    try {
      const updated: ProductoMenu = {
        ...editingProduct,
        stock_actual: Number(editingProduct.stock_actual ?? 0),
        stock_minimo: Number(editingProduct.stock_minimo ?? 2),
        precio_venta: Number(editingProduct.precio_venta ?? 0),
        controla_stock: true
      };

      onProductosChange(prev => prev.map(p => p.id_producto === targetId ? updated : p));
      await menuService.save(updated);
      addLog('sistema', `Bebida editada: ${updated.nombre} (Stock: ${updated.stock_actual}, Precio: $${updated.precio_venta})`);
      toast.success(`Producto "${updated.nombre}" actualizado.`);
      setEditingProduct(null);
    } catch (err) {
      console.error('Error al editar producto:', err);
      onProductosChange(prev => prev.map(p => p.id_producto === targetId ? originalProduct : p));
      toast.error('Error al guardar los cambios.');
    }
  };

  // Delete product
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    const name = productToDelete.nombre;
    const id = productToDelete.id_producto;
    const toDelete = productToDelete;

    try {
      onProductosChange(prev => prev.filter(p => p.id_producto !== id));
      await menuService.delete(id);
      addLog('sistema', `Bebida eliminada del menú/stock: ${name}`);
      toast.success(`"${name}" ha sido eliminado.`);
      setProductToDelete(null);
    } catch (err) {
      console.error('Error al eliminar producto:', err);
      onProductosChange(prev => [...prev, toDelete]);
      toast.error('No se pudo eliminar el producto.');
    }
  };

  // Create new beverage
  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.nombre?.trim()) {
      toast.warning('Por favor ingresa un nombre para la bebida.');
      return;
    }

    const cleanSlug = newForm.nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)+/g, '')
      .slice(0, 40);

    const newProd: ProductoMenu = {
      id_producto: `prod_beb_${cleanSlug}_${Date.now().toString().slice(-4)}`,
      nombre: newForm.nombre.trim(),
      descripcion: newForm.descripcion || `${newForm.subcategoria || ''}. Control de stock en góndola.`,
      precio_venta: Number(newForm.precio_venta || 0),
      categoria: newForm.categoria || 'Bodega',
      subcategoria: newForm.subcategoria || 'Vinos tintos',
      stock_actual: Number(newForm.stock_actual || 0),
      stock_minimo: Number(newForm.stock_minimo || 2),
      unidad_medida: newForm.unidad_medida || 'Botella 750ml',
      tipo: newForm.tipo || 'vino',
      controla_stock: true,
      activo: true,
      requiere_cocina: false,
      imagen: newForm.imagen || 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80'
    };

    try {
      onProductosChange(prev => [newProd, ...prev]);
      await menuService.save(newProd);
      addLog('sistema', `Nueva bebida agregada al stock: ${newProd.nombre} (${newProd.stock_actual} uds.)`);
      toast.success(`"${newProd.nombre}" agregada con éxito.`);
      setIsCreatingNew(false);
      setNewForm({
        nombre: '',
        categoria: 'Bodega',
        subcategoria: 'Vinos tintos',
        precio_venta: 12500,
        stock_actual: 6,
        stock_minimo: 2,
        unidad_medida: 'Botella 750ml',
        tipo: 'vino',
        controla_stock: true,
        activo: true
      });
    } catch (err) {
      console.error('Error creando bebida:', err);
      toast.error('No se pudo guardar la nueva bebida.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16 text-left">
      {/* 1. Header Banner & Title */}
      <div className="bg-gradient-to-br from-[#624A3E] via-[#8C6239] to-[#2E190E] rounded-3xl p-6 md:p-8 text-white shadow-xl border border-[#C8956A]/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-white/10 rounded-2xl border border-white/20 shadow-inner">
              <Wine className="w-6 h-6 text-[#FFFDF8]" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-200 bg-black/20 px-3 py-1 rounded-full border border-white/10">
              Módulo de Stock Exclusivo
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[#FFFDF8] font-sans">
            Stock de Bebidas
          </h2>
          <p className="text-sm md:text-base text-[#FAF4EE]/90 max-w-2xl font-medium">
            Control físico directo de botellas, latas, vinos de cava, coctelería y gaseosas. Reposición rápida, alertas y edición en tiempo real.
          </p>
        </div>

        <button
          onClick={() => setIsCreatingNew(true)}
          className="px-5 py-3 rounded-2xl bg-[#FFFDF8] text-[#624A3E] hover:bg-amber-100 font-extrabold text-sm flex items-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>+ Nueva Bebida</span>
        </button>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <button
          onClick={() => { setCategoryFilter('todos'); setStatusFilter('todos'); }}
          className="text-left bg-white dark:bg-[#1E130C] p-4 md:p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between hover:border-[#8C6239] transition-all hover:scale-[1.02] cursor-pointer"
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">Total Bebidas</span>
            <span className="text-2xl md:text-3xl font-black text-stone-900 dark:text-stone-100 font-mono mt-1 block">
              {stats.totalItems}
            </span>
            <span className="text-[10px] text-stone-500 font-medium">artículos registrados</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('ok')}
          className="text-left bg-white dark:bg-[#1E130C] p-4 md:p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between hover:border-emerald-500 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">Botellas en Stock</span>
            <span className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
              {stats.totalUnits}
            </span>
            <span className="text-[10px] text-stone-500 font-medium">unidades físicas listas</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('bajo')}
          className="text-left bg-white dark:bg-[#1E130C] p-4 md:p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between hover:border-amber-500 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">Stock Bajo</span>
            <span className="text-2xl md:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1 block">
              {stats.lowStockItems}
            </span>
            <span className="text-[10px] text-stone-500 font-medium">próximos a reponer</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('agotado')}
          className="text-left bg-white dark:bg-[#1E130C] p-4 md:p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between hover:border-rose-500 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 block">Agotados (0)</span>
            <span className="text-2xl md:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono mt-1 block">
              {stats.outOfStockItems}
            </span>
            <span className="text-[10px] text-stone-500 font-medium">sin existencia</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
        </button>
      </div>

      {/* 3. Category Filter Tabs with dynamic counters */}
      <div className="bg-white dark:bg-[#1E130C] p-2 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex gap-1.5 overflow-x-auto scrollbar-none">
        {[
          { id: 'todos', label: 'Todas las Bebidas', icon: Wine, count: categoryTabCounts.todos },
          { id: 'vinos_tintos', label: 'Vinos Tintos', icon: Wine, count: categoryTabCounts.vinos_tintos },
          { id: 'vinos_blancos', label: 'Vinos Blancos & Rosados', icon: Sparkles, count: categoryTabCounts.vinos_blancos },
          { id: 'champagne', label: 'Champagne & Espumantes', icon: Sparkles, count: categoryTabCounts.champagne },
          { id: 'tragos', label: 'Tragos & Aperitivos', icon: Flame, count: categoryTabCounts.tragos },
          { id: 'gaseosas', label: 'Gaseosas & Aguas', icon: GlassWater, count: categoryTabCounts.gaseosas },
          { id: 'cervezas', label: 'Cervezas', icon: Beer, count: categoryTabCounts.cervezas },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = categoryFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setCategoryFilter(tab.id as BeverageCategoryFilter);
                setStatusFilter('todos');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#8C6239] text-white shadow-md shadow-[#8C6239]/20'
                  : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/60'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                isActive ? 'bg-white/20 text-white' : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Search and Status Chips */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por marca, variedad, tamaño..."
            className="w-full pl-9.5 pr-4 py-2.5 bg-white dark:bg-[#1E130C] border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-semibold text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#8C6239]"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Chips with category counts */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'todos', label: `Todos (${categoryCounts.total})` },
            { id: 'ok', label: `🟢 En Stock (${categoryCounts.ok})` },
            { id: 'bajo', label: `🟡 Stock Bajo (${categoryCounts.bajo})` },
            { id: 'agotado', label: `🔴 Agotados (${categoryCounts.agotado})` }
          ].map(chip => (
            <button
              key={chip.id}
              onClick={() => setStatusFilter(chip.id as StockStatusFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === chip.id
                  ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-sm'
                  : 'bg-white dark:bg-[#1E130C] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:border-stone-300'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Helpful banner if a status filter is hiding products */}
      {statusFilter !== 'todos' && categoryCounts.total > filteredBeverages.length && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Mostrando {filteredBeverages.length} de {categoryCounts.total} productos de esta categoría. Hay {categoryCounts.total - filteredBeverages.length} producto(s) no mostrados por el filtro activo ({statusFilter === 'ok' ? 'En Stock' : statusFilter === 'bajo' ? 'Stock Bajo' : 'Agotados'}).
            </span>
          </div>
          <button 
            onClick={() => setStatusFilter('todos')} 
            className="ml-3 px-3 py-1 bg-[#8C6239] text-white hover:bg-[#624A3E] rounded-lg font-bold cursor-pointer shrink-0 transition-colors shadow-sm"
          >
            Ver todos ({categoryCounts.total})
          </button>
        </div>
      )}

      {/* 5. Beverage Table / Cards Grid */}
      <div className="bg-white dark:bg-[#1E130C] rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
        {filteredBeverages.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Wine className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto" />
            <h4 className="text-base font-black text-stone-700 dark:text-stone-300">No se encontraron bebidas</h4>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              Intenta cambiar los filtros de categoría o el término de búsqueda para ver más productos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40 text-[11px] font-black uppercase text-stone-500 tracking-wider">
                  <th className="py-3.5 px-4">Bebida / Variedad</th>
                  <th className="py-3.5 px-3">Categoría</th>
                  <th className="py-3.5 px-3 text-right">Precio</th>
                  <th className="py-3.5 px-4 text-center">Stock Actual</th>
                  <th className="py-3.5 px-4 text-center">Ajuste Rápido</th>
                  <th className="py-3.5 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-150 dark:divide-stone-800/60 text-xs">
                {filteredBeverages.map(item => {
                  const stock = item.stock_actual ?? 0;
                  const min = item.stock_minimo ?? 2;
                  const isLow = stock > 0 && stock <= min;
                  const isZero = stock <= 0;

                  return (
                    <tr 
                      key={item.id_producto}
                      className="hover:bg-stone-50/80 dark:hover:bg-stone-900/30 transition-colors"
                    >
                      {/* Name & Subtitle */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800/80 p-0.5 border border-stone-200 dark:border-stone-700 overflow-hidden shrink-0 flex items-center justify-center">
                            {item.imagen ? (
                              <img src={item.imagen} alt={item.nombre} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <Wine className="w-4 h-4 text-[#8C6239]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-extrabold text-stone-900 dark:text-stone-100 block text-xs truncate max-w-[240px] md:max-w-xs">
                              {item.nombre}
                            </span>
                            <span className="text-[10px] text-stone-400 font-semibold block truncate">
                              {item.subcategoria || item.unidad_medida || 'Unidad estándar'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3 text-stone-600 dark:text-stone-300 font-semibold text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 text-[10px] font-bold">
                          {item.categoria}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-3 text-right font-mono font-black text-stone-900 dark:text-stone-100 text-xs">
                        ${item.precio_venta.toLocaleString('es-AR')}
                      </td>

                      {/* Stock with status pill */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-mono font-black border ${
                            isZero
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                              : isLow
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                          }`}>
                            {stock} {item.unidad_medida ? item.unidad_medida.split(' ')[0].toLowerCase() : 'uds'}
                          </span>
                          <span className="text-[9px] text-stone-400 font-medium mt-0.5">
                            Mínimo: {min}
                          </span>
                        </div>
                      </td>

                      {/* Quick Adjust Buttons */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-stone-100 dark:bg-stone-900 p-1 rounded-xl border border-stone-200 dark:border-stone-800">
                          <button
                            onClick={() => handleQuickAdjust(item, -1)}
                            disabled={stock <= 0}
                            title="Restar 1 unidad"
                            className="w-7 h-7 rounded-lg bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-40 font-black text-xs flex items-center justify-center cursor-pointer shadow-xs"
                          >
                            -1
                          </button>
                          <button
                            onClick={() => handleQuickAdjust(item, 1)}
                            title="Sumar 1 unidad"
                            className="w-7 h-7 rounded-lg bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 font-black text-xs flex items-center justify-center cursor-pointer shadow-xs"
                          >
                            +1
                          </button>
                          <button
                            onClick={() => handleQuickAdjust(item, 6)}
                            title="Sumar pack de 6"
                            className="px-1.5 h-7 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-black text-[10px] flex items-center justify-center cursor-pointer"
                          >
                            +6
                          </button>
                          <button
                            onClick={() => handleQuickAdjust(item, 12)}
                            title="Sumar caja de 12"
                            className="px-1.5 h-7 rounded-lg bg-[#8C6239]/15 hover:bg-[#8C6239]/25 text-[#8C6239] dark:text-[#C8956A] font-black text-[10px] flex items-center justify-center cursor-pointer"
                          >
                            +12
                          </button>
                        </div>
                      </td>

                      {/* Actions (Edit / Delete) */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setEditingProduct(item)}
                            title="Editar detalles y stock"
                            className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:text-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setProductToDelete(item)}
                            title="Eliminar bebida"
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. MODAL: EDITAR BEBIDA */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1E130C] w-full max-w-lg rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-150 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-[#8C6239]/10 text-[#8C6239] rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </span>
                <h3 className="text-base font-black text-stone-900 dark:text-stone-100 font-sans">
                  Editar Bebida y Stock
                </h3>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-[11px] font-black uppercase text-stone-500 block mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={editingProduct.nombre}
                  onChange={e => setEditingProduct({ ...editingProduct, nombre: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-750 rounded-xl text-xs font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#8C6239]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-stone-500 block mb-1">Categoría</label>
                  <select
                    value={editingProduct.categoria}
                    onChange={e => setEditingProduct({ ...editingProduct, categoria: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-750 rounded-xl text-xs font-bold text-stone-900 dark:text-stone-100"
                  >
                    <option value="Bodega">Bodega</option>
                    <option value="Bebidas con Alcohol">Bebidas con Alcohol</option>
                    <option value="Bebidas sin Alcohol">Bebidas sin Alcohol</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-stone-500 block mb-1">Variedad / Subcategoría</label>
                  <input
                    type="text"
                    value={editingProduct.subcategoria || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, subcategoria: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-750 rounded-xl text-xs font-bold text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-stone-500 block mb-1">Stock Actual</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingProduct.stock_actual ?? 0}
                    onChange={e => setEditingProduct({ ...editingProduct, stock_actual: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-750 rounded-xl text-xs font-mono font-black text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-stone-500 block mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingProduct.stock_minimo ?? 2}
                    onChange={e => setEditingProduct({ ...editingProduct, stock_minimo: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-750 rounded-xl text-xs font-mono font-black text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-stone-500 block mb-1">Precio Venta ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={editingProduct.precio_venta}
                    onChange={e => setEditingProduct({ ...editingProduct, precio_venta: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-750 rounded-xl text-xs font-mono font-black text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-stone-500 block mb-1">Unidad de Medida Comercial</label>
                <input
                  type="text"
                  value={editingProduct.unidad_medida || 'Botella 750ml'}
                  onChange={e => setEditingProduct({ ...editingProduct, unidad_medida: e.target.value })}
                  placeholder="Ej: Botella 750ml, Lata 350cc, Medida..."
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-750 rounded-xl text-xs font-bold text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-150 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-extrabold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#8C6239] hover:bg-[#6F4E37] text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: NUEVA BEBIDA */}
      {isCreatingNew && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1E130C] w-full max-w-lg rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-150 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </span>
                <h3 className="text-base font-black text-stone-900 dark:text-stone-100 font-sans">
                  Agregar Nueva Bebida
                </h3>
              </div>
              <button
                onClick={() => setIsCreatingNew(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNew} className="space-y-4">
              <div>
                <label className="text-[11px] font-black uppercase text-stone-500 block mb-1">Nombre Comercial de la Bebida</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Rutini Cabernet Franc, Corona 330ml..."
                  value={newForm.nombre || ''}
                  onChange={e => setNewForm({ ...newForm, nombre: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-750 rounded-xl text-xs font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#8C6239]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-stone-500 block mb-1">Categoría</label>
                  <select
                    value={newForm.categoria || 'Bodega'}
                    onChange={e => setNewForm({ ...newForm, categoria: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-750 rounded-xl text-xs font-bold text-stone-900 dark:text-stone-100"
                  >
                    <option value="Bodega">Bodega (Vinos & Espumantes)</option>
                    <option value="Bebidas con Alcohol">Bebidas con Alcohol (Cervezas & Tragos)</option>
                    <option value="Bebidas sin Alcohol">Bebidas sin Alcohol (Gaseosas & Aguas)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-stone-500 block mb-1">Variedad / Subcategoría</label>
                  <input
                    type="text"
                    value={newForm.subcategoria || ''}
                    placeholder="Ej: Malbec, Gin, Gaseosas..."
                    onChange={e => setNewForm({ ...newForm, subcategoria: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-750 rounded-xl text-xs font-bold text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-stone-500 block mb-1">Stock Inicial</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newForm.stock_actual ?? 0}
                    onChange={e => setNewForm({ ...newForm, stock_actual: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-750 rounded-xl text-xs font-mono font-black text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-stone-500 block mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newForm.stock_minimo ?? 2}
                    onChange={e => setNewForm({ ...newForm, stock_minimo: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-750 rounded-xl text-xs font-mono font-black text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-stone-500 block mb-1">Precio Venta ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={newForm.precio_venta ?? 0}
                    onChange={e => setNewForm({ ...newForm, precio_venta: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-750 rounded-xl text-xs font-mono font-black text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-stone-500 block mb-1">Presentación / Unidad Comercial</label>
                <input
                  type="text"
                  value={newForm.unidad_medida || 'Botella 750ml'}
                  onChange={e => setNewForm({ ...newForm, unidad_medida: e.target.value })}
                  placeholder="Botella 750ml, Lata 350cc, Medida..."
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-750 rounded-xl text-xs font-bold text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-150 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-extrabold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Crear y Guardar Bebida</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL: CONFIRMACIÓN DE ELIMINACIÓN */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1E130C] w-full max-w-md rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-3 bg-rose-500/10 text-rose-600 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-base font-black text-stone-900 dark:text-stone-100 font-sans">
                  Eliminar Bebida
                </h3>
                <p className="text-xs text-stone-500">Esta acción retirará el producto del catálogo y del stock.</p>
              </div>
            </div>

            <p className="text-xs text-stone-700 dark:text-stone-300 font-medium">
              ¿Estás seguro de que deseas eliminar permanentemente <strong className="text-stone-950 dark:text-white">"{productToDelete.nombre}"</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-extrabold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
