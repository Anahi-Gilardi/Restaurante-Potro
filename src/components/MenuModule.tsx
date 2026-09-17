import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { UtensilsCrossed, Plus, Search, Edit2, Check, Copy, X, DollarSign, Image, AlertTriangle, Calendar, Camera, CheckCircle2 } from 'lucide-react';
import BulkPriceEditor from './BulkPriceEditor';
import MenuDiarioModule from './MenuDiarioModule';
import { CardSkeleton } from './Skeleton';
import { ProductoMenu, EventoLog, RecetaEscandallo, Insumo, Categoria } from '../types';
import { menuService } from '../services/menuService';
import { useCategories } from '../hooks/useCategories';
import { DEFAULT_CATEGORIAS, mergeWithDefaultCategories } from '../services/categoriasService';
import { menuItemSchema } from '../lib/validations';
import { ToastContainer, useToast } from './ToastContainer';
import { calculateRecipeCost, calculateMarginPct, getMarginLevel } from '../lib/recetas';
import { compressImageForUpload, saveMenuImage, getAllMenuImages, isValidImageData } from '../lib/imageStorage';

interface MenuModuleProps {
  productosMenu: ProductoMenu[];
  onProductosChange: (productos: ProductoMenu[]) => void;
  recetas: RecetaEscandallo[];
  insumos: Insumo[];
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

type PendingAction = 'create' | 'enable_all' | `toggle_${string}` | `edit_${string}` | `duplicate_${string}`;

const CATEGORIAS = ['Entradas', 'Pastas', 'Carnes', 'Pescados', 'Comidas Criollas', 'Postres', 'Bebidas con Alcohol', 'Bebidas sin Alcohol', 'Bodega'] as const;
const FILTER_CATEGORIAS = ['todos', ...CATEGORIAS] as const;

const ALLERGENS_LIST = [
  { id: 'gluten', label: 'Gluten 🌾' },
  { id: 'lactosa', label: 'Lácteos 🥛' },
  { id: 'huevo', label: 'Huevo 🥚' },
  { id: 'frutos_secos', label: 'Frutos Secos 🥜' },
  { id: 'pescado', label: 'Pescado 🐟' },
  { id: 'soja', label: 'Soja 🫘' }
];

const normalizeText = (value: string) => value.trim().toLowerCase();

export const normalizeSearchToken = (str: string): string => {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/gi, ' ')
    .trim();
};

export const getSearchVariants = (token: string): string[] => {
  const variants = [token];
  if (token.endsWith('es') && token.length > 3) {
    variants.push(token.slice(0, -2));
  } else if (token.endsWith('s') && token.length > 3) {
    variants.push(token.slice(0, -1));
  }

  if (token === 'vino' || token === 'vinos') {
    variants.push('bodega', 'malbec', 'cabernet', 'tinto', 'blanco', 'espumante', 'syrah', 'merlot', 'bonarda', 'chardonnay', 'sauvignon', 'cava');
  }
  if (token === 'tinto' || token === 'tintos') {
    variants.push('malbec', 'cabernet', 'merlot', 'bonarda', 'syrah', 'pinot');
  }
  if (token === 'blanco' || token === 'blancos') {
    variants.push('chardonnay', 'sauvignon', 'torrontes', 'viognier', 'semillon');
  }
  if (token === 'espumante' || token === 'espumantes' || token === 'champagne') {
    variants.push('baron', 'chandon', 'alyda', 'nature', 'brut');
  }
  if (token === 'cerveza' || token === 'cervezas') {
    variants.push('stella', 'corona', 'quilmes', 'andes', 'patagonia', 'lata', 'porron');
  }
  if (token === 'trago' || token === 'tragos' || token === 'coctel' || token === 'cocteles') {
    variants.push('cocteleria', 'fernet', 'gin', 'tonic', 'vermut', 'aperol', 'campari', 'gancia', 'martini');
  }
  if (token === 'destilado' || token === 'destilados') {
    variants.push('whisky', 'whiskey', 'gin', 'vodka', 'ron', 'tequila', 'licor');
  }
  if (token === 'carne' || token === 'carnes' || token === 'asado') {
    variants.push('bife', 'parrilla', 'ojo', 'lomo', 'bondiola', 'entraña', 'vacio', 'tira');
  }
  if (token === 'pasta' || token === 'pastas') {
    variants.push('fideo', 'tallarin', 'ravioles', 'noquis', 'sorrentinos', 'lasagna');
  }
  if (token === 'postre' || token === 'postres') {
    variants.push('flan', 'helado', 'tiramisu', 'dulce', 'panna cotta', 'tarta');
  }
  return variants;
};

export const matchesProductSearch = (item: ProductoMenu, rawQuery: string): boolean => {
  if (!rawQuery || !rawQuery.trim()) return true;

  const normalizedQuery = normalizeSearchToken(rawQuery);
  if (!normalizedQuery) return true;

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  const corpus = normalizeSearchToken(
    `${item.nombre} ${item.descripcion || ''} ${item.categoria || ''} ${item.subcategoria || ''} ${item.tipo || ''} ${item.unidad_medida || ''}`
  );

  return tokens.every(token => {
    const variants = getSearchVariants(token);
    return variants.some(v => corpus.includes(v));
  });
};

const inferTipo = (categoria: string): ProductoMenu['tipo'] => {
  const normalized = normalizeText(categoria);
  if (normalized.includes('vino') || normalized.includes('bodega') || normalized.includes('espumante')) return 'vino';
  if (normalized.includes('bebida') || normalized.includes('cerveza') || normalized.includes('destilado') || normalized.includes('trago') || normalized.includes('coctel')) return 'bebida';
  if (normalized.includes('postre')) return 'postre';
  return 'plato';
};

const getFallbackImage = (categoria: string) => {
  void categoria;
  return '/logo-el-patron.jpeg';
};

const MENU_PAGE_SIZE = 24;

export default function MenuModule({ productosMenu, onProductosChange, recetas, insumos, addLog }: MenuModuleProps) {
  const { categories } = useCategories(true);
  const [items, setItems] = useState<ProductoMenu[]>(productosMenu);
  const [page, setPage] = useState(1);
  const { toast, toasts, removeToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setItems(productosMenu);
    let mounted = true;
    getAllMenuImages().then(storedImgs => {
      if (!mounted || !storedImgs || Object.keys(storedImgs).length === 0) return;
      setItems(prev => {
        let changed = false;
        const next = prev.map(item => {
          const localImg = storedImgs[item.id_producto];
          if (localImg && item.imagen !== localImg) {
            changed = true;
            return { ...item, imagen: localImg };
          }
          return item;
        });
        if (changed) {
          onProductosChange(next);
        }
        return changed ? next : prev;
      });
    }).catch(() => {});
    return () => { mounted = false; };
  }, [productosMenu]);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todos');
  const [activeTab, setActiveTab] = useState<'catalogo' | 'masivos' | 'diario'>('catalogo');
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  // Form states for creating a new menu item
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState<string>('Entradas Criollas');
  const [imagenUrl, setImagenUrl] = useState('');
  const [tiempoPreparacion, setTiempoPreparacion] = useState('12');
  const [requiereCocina, setRequiereCocina] = useState(true);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);

  // Form states for editing an existing menu item
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrecio, setEditPrecio] = useState('');
  const [editNombre, setEditNombre] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editCategoria, setEditCategoria] = useState('');
  const [editImagen, setEditImagen] = useState('');
  const [editTiempoPreparacion, setEditTiempoPreparacion] = useState('12');
  const [editRequiereCocina, setEditRequiereCocina] = useState(true);
  const [editSelectedAllergens, setEditSelectedAllergens] = useState<string[]>([]);

  const normalizeCategorySlug = (cat: string): string => {
    const norm = (cat || '').toLowerCase().trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    if (norm.includes('tinto')) return 'vinos-tintos';
    if (norm.includes('blanco') || norm.includes('rosado') || norm.includes('rose')) return 'vinos-blancos-y-rosados';
    if (norm.includes('espumante') || norm.includes('champagne')) return 'espumantes';
    if (norm.includes('cerveza')) return 'cervezas';
    if (norm.includes('destilado')) return 'destilados';
    if (norm.includes('trago') || norm.includes('coctel') || norm.includes('cocteleria')) return 'tragos-y-cocteleria';

    if (norm.includes('entrada')) return 'entradas-criollas';
    if (norm.includes('carne') || norm.includes('parrilla') || norm.includes('corte') || norm.includes('bife') || norm.includes('lomo')) return 'cortes-a-la-parrilla';
    if (norm.includes('pasta') || norm.includes('lasana') || norm.includes('fideo') || norm.includes('noqui')) return 'pastas-artesanales';
    if (norm.includes('pescad') || norm.includes('marisc')) return 'pescados-y-mariscos';
    if (norm.includes('criolla') || norm.includes('locro') || norm.includes('humita') || norm.includes('guiso')) return 'comidas-criollas';
    if (norm.includes('postre') || norm.includes('dulce') || norm.includes('helado')) return 'postres-tradicionales';
    if (norm.includes('bodega') || norm.includes('vino')) return 'bodega-y-vinos';
    if (norm.includes('con-alcohol') || (norm.includes('alcohol') && !norm.includes('sin'))) return 'bebidas-con-alcohol';
    if (norm.includes('bebida') || norm.includes('gaseosa') || norm.includes('agua')) return 'bebidas-sin-alcohol';

    return norm;
  };

  const getCategorySlug = (catName: string) => {
    if (!catName) return '';
    const norm = catName.toLowerCase().trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const direct = categories.find(c => {
      const cNorm = c.nombre.toLowerCase().trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      return cNorm === norm || c.slug.toLowerCase() === norm;
    });

    return direct ? direct.slug.toLowerCase() : normalizeCategorySlug(catName);
  };

  const isCategoryMatch = (item: ProductoMenu, selectedCatSlug: string): boolean => {
    if (!selectedCatSlug || selectedCatSlug === 'todos') return true;

    const itemSlug = getCategorySlug(item.categoria).toLowerCase();
    const itemType = (item.tipo || '').toLowerCase();
    const itemCatNorm = (item.categoria || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Direct slug match
    if (itemSlug === selectedCatSlug.toLowerCase()) return true;

    // Macro: Bodega y Vinos -> matches all wines, espumantes, champagnes
    if (selectedCatSlug === 'bodega-y-vinos' || selectedCatSlug === 'bodega') {
      return (
        itemType === 'vino' ||
        itemSlug === 'vinos-tintos' ||
        itemSlug === 'vinos-blancos-y-rosados' ||
        itemSlug === 'espumantes' ||
        itemCatNorm.includes('vino') ||
        itemCatNorm.includes('bodega') ||
        itemCatNorm.includes('espumante') ||
        itemCatNorm.includes('champagne')
      );
    }

    // Macro: Bebidas con Alcohol -> matches wines, cervezas, destilados, tragos
    if (selectedCatSlug === 'bebidas-con-alcohol') {
      return (
        itemType === 'vino' ||
        itemSlug === 'cervezas' ||
        itemSlug === 'destilados' ||
        itemSlug === 'tragos-y-cocteleria' ||
        itemSlug === 'vinos-tintos' ||
        itemSlug === 'vinos-blancos-y-rosados' ||
        itemSlug === 'espumantes' ||
        itemSlug === 'bodega-y-vinos' ||
        itemCatNorm.includes('con alcohol') ||
        itemCatNorm.includes('cerveza') ||
        itemCatNorm.includes('destilado') ||
        itemCatNorm.includes('trago') ||
        itemCatNorm.includes('whisky') ||
        itemCatNorm.includes('gin') ||
        itemCatNorm.includes('fernet')
      );
    }

    // Macro: Bebidas sin Alcohol -> non-alcoholic only
    if (selectedCatSlug === 'bebidas-sin-alcohol') {
      const isAlcoholic = (
        itemType === 'vino' ||
        itemSlug === 'cervezas' ||
        itemSlug === 'destilados' ||
        itemSlug === 'tragos-y-cocteleria' ||
        itemSlug === 'vinos-tintos' ||
        itemSlug === 'vinos-blancos-y-rosados' ||
        itemSlug === 'espumantes' ||
        itemSlug === 'bodega-y-vinos' ||
        itemCatNorm.includes('con alcohol') ||
        itemCatNorm.includes('cerveza') ||
        itemCatNorm.includes('destilado') ||
        itemCatNorm.includes('trago') ||
        itemCatNorm.includes('whisky') ||
        itemCatNorm.includes('gin')
      );
      if (isAlcoholic) return false;
      return (
        itemSlug === 'bebidas-sin-alcohol' ||
        itemCatNorm.includes('sin alcohol') ||
        itemCatNorm.includes('gaseosa') ||
        itemCatNorm.includes('agua') ||
        itemCatNorm.includes('cafeteria') ||
        itemCatNorm.includes('cafe')
      );
    }

    return false;
  };

  // Ensure all categories (including new wines/destilados and any custom item categories) are displayed as buttons
  const displayCategories = useMemo(() => {
    const base = mergeWithDefaultCategories(categories);
    const existingSlugs = new Set(base.map(c => c.slug.toLowerCase()));

    items.forEach(p => {
      if (!p.categoria) return;
      const slug = getCategorySlug(p.categoria).toLowerCase();
      if (!existingSlugs.has(slug)) {
        existingSlugs.add(slug);
        base.push({
          id: `cat_${slug.replace(/-/g, '_')}`,
          nombre: p.categoria,
          slug: slug,
          orden: 85,
          activa: true,
          icono: (p.tipo === 'vino' || slug.includes('vino')) ? 'Wine' : 'UtensilsCrossed'
        });
      }
    });

    return base.sort((a, b) => Number(a.orden || 99) - Number(b.orden || 99));
  }, [categories, items]);

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
    setTiempoPreparacion('12');
    setRequiereCocina(true);
    setSelectedAllergens([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetEditForm = () => {
    setEditingId(null);
    setEditPrecio('');
    setEditNombre('');
    setEditDescripcion('');
    setEditCategoria('');
    setEditImagen('');
    setEditTiempoPreparacion('12');
    setEditRequiereCocina(true);
    setEditSelectedAllergens([]);
  };

  const hasDuplicateName = (name: string, excludedId?: string) => (
    items.some(item => item.id_producto !== excludedId && normalizeText(item.nombre) === normalizeText(name))
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditMode: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.info('Optimizando y preparando imagen...');
      const base64 = await compressImageForUpload(file);
      if (isEditMode) {
        setEditImagen(base64);
        if (editingId) {
          await saveMenuImage(editingId, base64);
        }
      } else {
        setImagenUrl(base64);
      }
      toast.success('Imagen lista para guardar.');
    } catch (err) {
      toast.error('Error al procesar la imagen. Intente con otra.');
    }
  };

  const handleDirectImageUpload = async (id_producto: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const lowerId = id_producto.toLowerCase();
    const target = items.find(it => it.id_producto === id_producto || it.id_producto?.toLowerCase() === lowerId);
    if (!target) return;

    try {
      toast.info('Optimizando y guardando imagen...');
      const base64 = await compressImageForUpload(file);

      await saveMenuImage(id_producto, base64);

      if (editingId === id_producto || editingId?.toLowerCase() === lowerId) {
        setEditImagen(base64);
      }

      const updatedList = items.map(it =>
        it.id_producto === id_producto || it.id_producto?.toLowerCase() === lowerId ? { ...it, imagen: base64 } : it
      );
      syncItems(updatedList);

      try {
        await menuService.update(id_producto, { imagen: base64 });
      } catch (cloudErr) {
        console.warn('Sync en la nube pendiente:', cloudErr);
      }

      toast.success(`Foto de '${target.nombre}' guardada con éxito.`);
      addLog('sistema', `MENU: Foto actualizada para '${target.nombre}'`);
    } catch (err) {
      console.error('Error al subir imagen directa:', err);
      toast.error('No se pudo procesar o guardar la imagen.');
    }
  };

  const handleAutoGenerateImage = (dishName: string, dishCategory: string, isEditMode: boolean) => {
    if (!dishName.trim()) {
      toast.warning('Ingrese primero el nombre del plato para buscar una imagen adecuada.');
      return;
    }
    
    // Generate a professional Gastronomic image query via Unsplash source fallback redirect urls
    const cleanName = encodeURIComponent(dishName.trim());
    const cleanCategory = encodeURIComponent(dishCategory.trim());
    // Using high quality featured source redirect based on culinary keywords
    const autoUrl = `https://images.unsplash.com/featured/500x500/?food,plated,${cleanCategory},${cleanName}`;
    
    if (isEditMode) {
      setEditImagen(autoUrl);
    } else {
      setImagenUrl(autoUrl);
    }
    toast.success('Imagen autogenerada con éxito.');
  };

  const buildMenuItem = (
    id: string,
    values: {
      nombre: string;
      descripcion: string;
      precio: string;
      categoria: string;
      imagen: string;
      tiempoPreparacion: string;
      requiereCocina: boolean;
      alergenos: string[];
      activo?: boolean;
    }
  ): ProductoMenu | null => {
    const rawPriceStr = String(values.precio || '').replace(/\$/g, '').trim();
    let cleanedPrice = rawPriceStr;
    if (/^\d{1,3}(\.\d{3})+$/.test(cleanedPrice)) {
      cleanedPrice = cleanedPrice.replace(/\./g, '');
    } else if (/^\d+,\d{1,2}$/.test(cleanedPrice)) {
      cleanedPrice = cleanedPrice.replace(',', '.');
    } else if (cleanedPrice.includes('.') && cleanedPrice.includes(',')) {
      cleanedPrice = cleanedPrice.replace(/\./g, '').replace(',', '.');
    }
    const parsedPrice = Number.parseFloat(cleanedPrice);

    const validation = menuItemSchema.safeParse({
      nombre: values.nombre,
      precio_venta: parsedPrice,
      categoria: values.categoria,
      descripcion: values.descripcion
    });

    if (!validation.success) {
      const errorMsg = validation.error.issues
        .map(i => (i.message === 'Invalid input' || !i.message ? `El campo '${i.path.join('.')}' contiene un valor inválido` : i.message))
        .join('. ');
      toast.error(errorMsg || 'Por favor revise los datos del producto.');
      return null;
    }

    const clean = validation.data;
    const tipo = inferTipo(clean.categoria);
    const reqCocina = values.requiereCocina && !(tipo === 'bebida' || tipo === 'vino');

    return {
      id_producto: id,
      nombre: clean.nombre,
      descripcion: clean.descripcion?.trim() || `${clean.nombre} elaborado con ingredientes selectos.`,
      precio_venta: clean.precio_venta,
      categoria: clean.categoria,
      activo: values.activo ?? true,
      imagen: values.imagen.trim() || getFallbackImage(clean.categoria),
      tipo,
      requiere_cocina: reqCocina,
      tiempo_preparacion_estimado: reqCocina ? (Number(values.tiempoPreparacion) || 12) : undefined,
      alergenos: values.alergenos
    };
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;

    const tempId = `prod_custom_${Date.now()}`;
    const newItem = buildMenuItem(tempId, {
      nombre,
      descripcion,
      precio,
      categoria,
      imagen: imagenUrl,
      tiempoPreparacion,
      requiereCocina,
      alergenos: selectedAllergens
    });
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
      if (saved.imagen && isValidImageData(saved.imagen)) {
        await saveMenuImage(saved.id_producto, saved.imagen);
      }
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

  const handleEnableAllItems = async () => {
    if (isBusy) return;
    const paused = items.filter(it => !it.activo);
    if (paused.length === 0) {
      toast.info('Todos los productos ya se encuentran habilitados.');
      return;
    }

    const previous = items;
    const allActive = items.map(it => ({ ...it, activo: true }));
    setPendingAction('enable_all');
    syncItems(allActive);

    try {
      toast.info(`Habilitando ${paused.length} productos...`);
      for (const item of paused) {
        await menuService.update(item.id_producto, { activo: true });
      }
      addLog('sistema', `MENU: Se habilitaron todos los productos de la carta (${items.length} activos)`);
      toast.success(`Se habilitaron todos los productos del menú (${items.length} activos).`);
    } catch (err) {
      console.error('Error al habilitar todos los productos:', err);
      syncItems(previous);
      toast.error('Ocurrió un error al habilitar los productos.');
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
    setEditTiempoPreparacion(item.tiempo_preparacion_estimado?.toString() || '12');
    setEditRequiereCocina(item.requiere_cocina ?? true);
    setEditSelectedAllergens(item.alergenos || []);
  };

  const handleSaveEdit = async (id: string) => {
    if (isBusy) return;
    const lowerId = id.toLowerCase();
    const target = items.find(item => item.id_producto === id || item.id_producto?.toLowerCase() === lowerId);
    if (!target) return;

    const updated = buildMenuItem(id, {
      nombre: editNombre,
      descripcion: editDescripcion,
      precio: editPrecio,
      categoria: editCategoria,
      imagen: editImagen,
      tiempoPreparacion: editTiempoPreparacion,
      requiereCocina: editRequiereCocina,
      alergenos: editSelectedAllergens,
      activo: target.activo
    });
    if (!updated) return;
    if (hasDuplicateName(updated.nombre, id)) {
      toast.warning('Ya existe otro producto con ese nombre.');
      return;
    }

    const previous = items;
    const optimistic = items.map(item => item.id_producto === id || item.id_producto?.toLowerCase() === lowerId ? { ...item, ...updated } : item);

    setPendingAction(`edit_${id}`);
    syncItems(optimistic);

    try {
      if (updated.imagen && isValidImageData(updated.imagen)) {
        await saveMenuImage(id, updated.imagen);
      }
      const saved = await menuService.update(id, updated);
      syncItems(optimistic.map(item => item.id_producto === id || item.id_producto?.toLowerCase() === lowerId ? { ...item, ...saved } : item));
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

  const { filtered, isCrossCategorySearch } = useMemo(() => {
    const query = debouncedSearch.trim();

    if (!query) {
      const result = items.filter(item => isCategoryMatch(item, selectedCategoria));
      return { filtered: result, isCrossCategorySearch: false };
    }

    // 1. If 'todos' is selected, search globally across all items
    if (selectedCategoria === 'todos') {
      const result = items.filter(item => matchesProductSearch(item, query));
      return { filtered: result, isCrossCategorySearch: false };
    }

    // 2. If a specific category is selected, first check matches within that category
    const catMatches = items.filter(
      item => isCategoryMatch(item, selectedCategoria) && matchesProductSearch(item, query)
    );

    if (catMatches.length > 0) {
      return { filtered: catMatches, isCrossCategorySearch: false };
    }

    // 3. Fallback: If 0 matches in current category, search across ALL products so user is not blocked
    const globalMatches = items.filter(item => matchesProductSearch(item, query));
    return {
      filtered: globalMatches,
      isCrossCategorySearch: globalMatches.length > 0
    };
  }, [items, debouncedSearch, selectedCategoria, displayCategories]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / MENU_PAGE_SIZE));
  const paginatedItems = useMemo(
    () => filtered.slice((page - 1) * MENU_PAGE_SIZE, page * MENU_PAGE_SIZE),
    [filtered, page],
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCategoria]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const toggleAllergen = (allergenId: string, isEdit: boolean) => {
    if (isEdit) {
      setEditSelectedAllergens(prev =>
        prev.includes(allergenId) ? prev.filter(x => x !== allergenId) : [...prev, allergenId]
      );
    } else {
      setSelectedAllergens(prev =>
        prev.includes(allergenId) ? prev.filter(x => x !== allergenId) : [...prev, allergenId]
      );
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="flex gap-2 overflow-x-auto pb-2.5">
        <button onClick={() => setActiveTab('catalogo')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer border shrink-0 ${
            activeTab === 'catalogo'
              ? 'bg-[#8C6239] dark:bg-[#C8956A] text-white dark:text-[#8C6239] border-[#8C6239] dark:border-[#C8956A] shadow-md'
              : 'bg-white/70 dark:bg-white/5 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-white/10 hover:bg-stone-50 dark:hover:bg-white/10'
          }`}>
          <UtensilsCrossed className="w-3.5 h-3.5 inline mr-1" /> Catálogo
        </button>
        <button onClick={() => setActiveTab('masivos')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer border shrink-0 ${
            activeTab === 'masivos'
              ? 'bg-[#8C6239] dark:bg-[#C8956A] text-white dark:text-[#8C6239] border-[#8C6239] dark:border-[#C8956A] shadow-md'
              : 'bg-white/70 dark:bg-white/5 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-white/10 hover:bg-stone-50 dark:hover:bg-white/10'
          }`}>
          <DollarSign className="w-3.5 h-3.5 inline mr-1" /> Precios masivos
        </button>
        <button onClick={() => setActiveTab('diario')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer border shrink-0 ${
            activeTab === 'diario'
              ? 'bg-[#8C6239] dark:bg-[#C8956A] text-white dark:text-[#8C6239] border-[#8C6239] dark:border-[#C8956A] shadow-md'
              : 'bg-white/70 dark:bg-white/5 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-white/10 hover:bg-stone-50 dark:hover:bg-white/10'
          }`}>
          <Calendar className="w-3.5 h-3.5 inline mr-1 text-amber-400" /> Menú diario
        </button>
      </div>

      {activeTab === 'diario' ? (
        <MenuDiarioModule addLog={addLog} />
      ) : activeTab === 'masivos' ? (
        <BulkPriceEditor items={items} onItemsChange={handleBulkItemsChange} addLog={addLog} />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="glass-panel p-4 sm:p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-black text-stone-850 dark:text-[#FAF7F0] uppercase tracking-tight flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#8C6239] dark:text-[#C8956A]" />
            Nuevo plato / bebida
          </h3>
          <form onSubmit={handleCreateItem} className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-stone-500 dark:text-stone-300 uppercase tracking-wider block mb-1">Nombre comercial</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej. Ojo de Bife Criollo"
                className="w-full min-h-11 text-sm p-2.5 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-white/5 text-stone-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C8956A]/30 dark:focus:ring-[#C8956A]/50 dark:placeholder-stone-400/60"
                disabled={isBusy}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 dark:text-stone-300 uppercase tracking-wider block mb-1">Precio de venta ($)</label>
              <input
                type="number"
                inputMode="decimal"
                value={precio}
                onChange={e => setPrecio(e.target.value)}
                placeholder="Ej. 18500"
                className="w-full min-h-11 text-sm p-2.5 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-white/5 text-stone-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C8956A]/30 dark:focus:ring-[#C8956A]/50 dark:placeholder-stone-400/60"
                disabled={isBusy}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 dark:text-stone-300 uppercase tracking-wider block mb-1">Descripcion</label>
              <textarea
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Ingredientes u observaciones..."
                rows={2}
                className="w-full text-sm p-2.5 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-white/5 text-stone-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C8956A]/30 dark:focus:ring-[#C8956A]/50 dark:placeholder-stone-400/60 resize-none"
                disabled={isBusy}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 dark:text-stone-300 uppercase tracking-wider block mb-1">Categoria</label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                className="w-full min-h-11 text-sm p-2.5 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-[#2e2015] text-stone-700 dark:text-[#FAF7F0] focus:outline-none focus:ring-2 focus:ring-[#C8956A]/30 dark:focus:ring-[#C8956A]/50 cursor-pointer font-bold"
                disabled={isBusy}
              >
                {categories.map(cat => <option key={cat.id} value={cat.nombre} className="dark:bg-[#2e2015] dark:text-[#FAF7F0]">{cat.nombre}</option>)}
              </select>
            </div>
            
            {/* Extended attributes: cooking time and kitchen requirement */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-black text-stone-500 dark:text-stone-300 uppercase tracking-wider block mb-1">Min. Prep.</label>
                <input
                  type="number"
                  value={tiempoPreparacion}
                  onChange={e => setTiempoPreparacion(e.target.value)}
                  placeholder="12"
                  className="w-full min-h-11 text-sm p-2.5 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-white/5 text-stone-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C8956A]/30 dark:focus:ring-[#C8956A]/50 dark:placeholder-stone-400/60"
                  disabled={isBusy || !requiereCocina}
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-1.5 min-h-11 cursor-pointer select-none font-bold text-stone-700 dark:text-stone-200 text-xs">
                  <input
                    type="checkbox"
                    checked={requiereCocina}
                    onChange={e => setRequiereCocina(e.target.checked)}
                    className="w-4 h-4 rounded text-[#8C6239] dark:text-[#C8956A] focus:ring-[#8C6239] dark:focus:ring-[#C8956A] bg-stone-50 dark:bg-white/5 border-stone-200 dark:border-white/10"
                    disabled={isBusy}
                  />
                  Cocina
                </label>
              </div>
            </div>

            {/* Allergen selector */}
            <div>
              <label className="text-[10px] font-black text-stone-500 dark:text-stone-300 uppercase tracking-wider block mb-1.5">Alérgenos</label>
              <div className="flex flex-wrap gap-1">
                {ALLERGENS_LIST.map(alg => {
                  const active = selectedAllergens.includes(alg.id);
                  return (
                    <button
                      type="button"
                      key={alg.id}
                      onClick={() => toggleAllergen(alg.id, false)}
                      className={`px-2 py-1 text-[9px] font-black rounded-lg border uppercase tracking-wide cursor-pointer transition-all ${
                        active
                          ? 'bg-rose-500 border-rose-600 text-white dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
                          : 'bg-stone-50 dark:bg-white/5 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-white/10'
                      }`}
                    >
                      {alg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Canvas express image resize and uploader */}
            <div>
              <label className="text-[10px] font-black text-stone-500 dark:text-stone-300 uppercase tracking-wider block mb-1">Imagen del plato (Manual / Auto)</label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={imagenUrl}
                  onChange={e => setImagenUrl(e.target.value)}
                  placeholder="Pegue una URL de imagen..."
                  className="w-full min-h-10 text-xs p-2.5 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/30 dark:bg-white/5 text-stone-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C8956A]/30 dark:placeholder-stone-400/60"
                  disabled={isBusy}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleImageUpload(e, false)}
                  ref={fileInputRef}
                  className="hidden"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 min-h-10 flex items-center justify-center gap-1 border border-dashed border-stone-300 dark:border-white/15 hover:border-stone-450 dark:hover:border-white/30 bg-stone-50 dark:bg-white/5 rounded-xl text-[11px] font-bold text-stone-600 dark:text-stone-300 cursor-pointer transition-colors"
                  >
                    <Image className="w-3.5 h-3.5 text-stone-450" />
                    Subir Archivo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAutoGenerateImage(nombre, categoria, false)}
                    className="flex-1 min-h-10 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100/80 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    🪄 Auto Generar
                  </button>
                </div>
                {imagenUrl && (
                  <div className="relative w-16 h-16 rounded-xl border border-stone-200 dark:border-white/10 overflow-hidden">
                    <img src={imagenUrl} className="w-full h-full object-cover" alt="Vista previa" />
                    <button
                      type="button"
                      onClick={() => setImagenUrl('')}
                      className="absolute -top-1 -right-1 bg-stone-850/80 text-white rounded-full p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isBusy}
              className="w-full min-h-11 py-2.5 bg-[#8C6239] hover:bg-[#5d3a2e] dark:bg-[#C8956A] dark:hover:bg-[#d5a67c] text-[#FAF7F0] dark:text-[#8C6239] border border-[#FAF7F0]/10 dark:border-[#C8956A]/20 transition-all font-extrabold text-xs rounded-xl shadow-md cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {pendingAction === 'create' ? 'Registrando...' : 'Registrar en carta'}
            </button>
          </form>
        </div>

        <div className="glass-panel p-4 sm:p-6 rounded-2xl shadow-sm lg:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-stone-100 dark:border-white/10">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-black text-stone-850 dark:text-[#FAF7F0] uppercase tracking-tight flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-[#8C6239] dark:text-[#C8956A]" />
                Catálogo de menú ({filtered.length})
              </h3>
              <button
                type="button"
                onClick={() => void handleEnableAllItems()}
                disabled={isBusy}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Habilitar todos los productos del catálogo"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{pendingAction === 'enable_all' ? 'Habilitando...' : 'Habilitar todos'}</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setSelectedCategoria('todos')}
                className={`px-2.5 py-1.5 text-[10px] font-black rounded-lg uppercase tracking-wide cursor-pointer transition-all border whitespace-nowrap ${
                  selectedCategoria === 'todos'
                    ? 'bg-[#8C6239] dark:bg-[#C8956A] text-white dark:text-[#8C6239] border-[#8C6239] dark:border-[#C8956A] shadow-xs'
                    : 'bg-stone-50 dark:bg-stone-850/80 text-stone-650 dark:text-stone-250 border-stone-200 dark:border-stone-750/80 hover:bg-[#F5F1E9] dark:hover:bg-stone-750/50'
                }`}
              >
                Todos
              </button>
              {displayCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoria(cat.slug.toLowerCase())}
                  className={`px-2.5 py-1.5 text-[10px] font-black rounded-lg uppercase tracking-wide cursor-pointer transition-all border whitespace-nowrap ${
                    selectedCategoria.toLowerCase() === cat.slug.toLowerCase()
                      ? 'bg-[#8C6239] dark:bg-[#C8956A] text-white dark:text-[#8C6239] border-[#8C6239] dark:border-[#C8956A] shadow-xs'
                      : 'bg-stone-50 dark:bg-stone-850/80 text-stone-650 dark:text-stone-250 border-stone-200 dark:border-stone-750/80 hover:bg-[#F5F1E9] dark:hover:bg-stone-750/50'
                  }`}
                >
                  {cat.nombre}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 dark:text-stone-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, bodega, vino, varietal o categoría..."
              className="w-full min-h-11 text-sm pl-9 pr-10 py-3 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-white/5 text-stone-800 dark:text-[#FAF7F0] focus:outline-none focus:ring-2 focus:ring-[#C8956A]/30 dark:focus:ring-[#C8956A]/50 dark:placeholder-stone-400/60"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer rounded-full transition-colors"
                title="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {isCrossCategorySearch && debouncedSearch.trim() && (
            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-900 dark:text-amber-200 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-base">🍷</span>
                <span>
                  No hay coincidencias en <strong>{displayCategories.find(c => c.slug.toLowerCase() === selectedCategoria.toLowerCase())?.nombre || selectedCategoria}</strong>. Mostrando <strong>{filtered.length}</strong> resultados en todo el catálogo.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCategoria('todos')}
                className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 dark:bg-amber-800 dark:hover:bg-amber-700 text-amber-950 dark:text-amber-100 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer"
              >
                Ver en Todos
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {loading ? <div className="col-span-3"><CardSkeleton count={6} /></div> : paginatedItems.map(item => {
              const itemBusy = pendingAction === `toggle_${item.id_producto}`
                || pendingAction === `edit_${item.id_producto}`
                || pendingAction === `duplicate_${item.id_producto}`;

              // Calculations for costs and margins
              const matchedRecipes = recetas.filter(r => r.id_producto === item.id_producto);
              const hasRecipe = matchedRecipes.length > 0;
              const recipeCost = hasRecipe ? calculateRecipeCost(matchedRecipes, insumos) : 0;
              const marginPct = hasRecipe ? calculateMarginPct(item, recipeCost) : null;
              const marginLevel = getMarginLevel(marginPct);

              return (
              <div
                key={item.id_producto}
                className={`p-3 bg-[#F5F1E9]/30 dark:bg-white/5 border rounded-2xl flex flex-col justify-between gap-3 transition-all hover:bg-[#F5F1E9]/60 dark:hover:bg-white/10 ${
                  item.activo 
                    ? 'border-stone-200 dark:border-white/10' 
                    : 'border-rose-200 bg-rose-50/15 dark:border-rose-950/30 dark:bg-rose-950/10 opacity-75'
                } ${itemBusy ? 'ring-2 ring-[#C8956A]/30' : ''}`}
              >
                <div className="flex gap-3">
                  <div className="relative group shrink-0 w-16 h-16 sm:w-20 sm:h-20">
                    <img
                      src={(editingId === item.id_producto && editImagen) ? editImagen : item.imagen}
                      alt={item.nombre}
                      loading="lazy" decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full rounded-xl object-cover bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-white/10"
                      onError={e => {
                        const image = e.currentTarget as HTMLImageElement;
                        image.onerror = null;
                        image.src = getFallbackImage(item.categoria);
                      }}
                    />
                    <label
                      title="Cambiar foto de este plato"
                      className="absolute inset-0 bg-black/50 hover:bg-black/65 rounded-xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity backdrop-blur-[1px]"
                    >
                      <Camera className="w-5 h-5 drop-shadow text-amber-200" />
                      <span className="text-[8px] font-bold mt-0.5 drop-shadow tracking-tight">Cambiar</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isBusy}
                        onChange={e => void handleDirectImageUpload(item.id_producto, e)}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black uppercase text-[#8C6239] dark:text-[#C8956A]">{item.categoria}</span>
                        {item.tiempo_preparacion_estimado && (
                          <span className="text-[8px] font-black text-stone-500 dark:text-stone-400 uppercase tracking-tight">⏱️ {item.tiempo_preparacion_estimado} min</span>
                        )}
                      </div>
                      <h4 className="text-sm font-extrabold text-stone-900 dark:text-white tracking-tight leading-snug break-words whitespace-normal" title={item.nombre}>{item.nombre}</h4>
                      {item.descripcion && (
                        <p className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-200 leading-snug line-clamp-2 mt-0.5" title={item.descripcion}>
                          {item.descripcion}
                        </p>
                      )}

                      {/* Display allergen badges if any */}
                      {item.alergenos && item.alergenos.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {item.alergenos.map(alg => (
                            <span key={alg} className="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded text-[7px] font-bold text-rose-600 dark:text-rose-450">
                              {ALLERGENS_LIST.find(x => x.id === alg)?.label || alg}
                            </span>
                          ))}
                        </div>
                      )}

                      {editingId === item.id_producto ? (
                        <div className="space-y-2 mt-1.5 border-t border-stone-250/20 pt-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-stone-700 dark:text-stone-300">$</span>
                            <input type="number" inputMode="decimal" value={editPrecio} onChange={e => setEditPrecio(e.target.value)}
                              disabled={isBusy}
                              className="w-20 text-sm p-1.5 border border-stone-350 dark:border-white/10 rounded bg-white dark:bg-white/5 text-stone-800 dark:text-[#FAF7F0] font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#C8956A] dark:placeholder-stone-400/60" />
                          </div>
                          <input type="text" value={editNombre} onChange={e => setEditNombre(e.target.value)}
                            disabled={isBusy}
                            className="w-full text-xs p-1.5 border border-stone-350 dark:border-white/10 rounded bg-white dark:bg-white/5 text-stone-800 dark:text-[#FAF7F0] focus:outline-none focus:ring-1 focus:ring-[#C8956A] dark:placeholder-stone-400/60" />
                          <textarea value={editDescripcion} onChange={e => setEditDescripcion(e.target.value)} rows={2}
                            disabled={isBusy}
                            className="w-full text-xs p-1.5 border border-stone-350 dark:border-white/10 rounded bg-white dark:bg-white/5 text-stone-800 dark:text-[#FAF7F0] resize-none focus:outline-none focus:ring-1 focus:ring-[#C8956A] dark:placeholder-stone-400/60" />
                          <div className="grid grid-cols-2 gap-1.5">
                            <select value={editCategoria} onChange={e => setEditCategoria(e.target.value)}
                              disabled={isBusy}
                              className="w-full text-xs p-1.5 border border-stone-350 dark:border-white/10 rounded bg-white dark:bg-[#2e2015] text-stone-800 dark:text-[#FAF7F0] focus:outline-none focus:ring-1 focus:ring-[#C8956A]">
                              {categories.map(cat => <option key={cat.id} value={cat.nombre} className="dark:bg-[#2e2015] dark:text-[#FAF7F0]">{cat.nombre}</option>)}
                            </select>
                            <input type="number" value={editTiempoPreparacion} onChange={e => setEditTiempoPreparacion(e.target.value)}
                              disabled={isBusy || !editRequiereCocina} placeholder="Minutos"
                              className="w-full text-xs p-1.5 border border-stone-350 dark:border-white/10 rounded bg-white dark:bg-white/5 text-stone-800 dark:text-[#FAF7F0] focus:outline-none focus:ring-1 focus:ring-[#C8956A] dark:placeholder-stone-400/60" />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-1 text-[10px] font-bold text-stone-650 dark:text-stone-300 cursor-pointer select-none">
                              <input type="checkbox" checked={editRequiereCocina} onChange={e => setEditRequiereCocina(e.target.checked)}
                                className="w-3.5 h-3.5 rounded text-[#8C6239] dark:text-[#C8956A] bg-white dark:bg-white/5 border-stone-350 dark:border-white/10" /> Cocina
                            </label>
                          </div>
                          
                          {/* Edit allergen tags */}
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-stone-500 dark:text-stone-400 uppercase">Alérgenos:</span>
                            <div className="flex flex-wrap gap-1">
                              {ALLERGENS_LIST.map(alg => {
                                const active = editSelectedAllergens.includes(alg.id);
                                return (
                                  <button
                                    type="button"
                                    key={alg.id}
                                    onClick={() => toggleAllergen(alg.id, true)}
                                    className={`px-1.5 py-0.5 text-[8px] font-bold rounded border uppercase tracking-wide transition-all cursor-pointer ${
                                      active
                                        ? 'bg-rose-500 border-rose-600 text-white dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 shadow-xs'
                                        : 'bg-stone-50 dark:bg-white/5 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-white/10'
                                    }`}
                                  >
                                    {alg.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Edit image handler (Base64 canvas & automated generator) */}
                          <div className="space-y-1.5">
                            <input
                              type="text"
                              value={editImagen}
                              onChange={e => setEditImagen(e.target.value)}
                              placeholder="URL de imagen..."
                              className="w-full text-xs p-1.5 border border-stone-350 dark:border-white/10 rounded bg-white dark:bg-white/5 text-stone-850 dark:text-[#FAF7F0] focus:outline-none focus:ring-1 focus:ring-[#C8956A] dark:placeholder-stone-400/60"
                              disabled={isBusy}
                            />
                            <div className="flex gap-1.5">
                              <label
                                className={`flex-1 py-1.5 bg-stone-50 dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/10 border border-stone-200 dark:border-white/10 rounded text-[10px] font-bold text-stone-650 dark:text-stone-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${isBusy ? 'opacity-50 pointer-events-none' : ''}`}
                              >
                                <Camera className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span>Subir foto</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={isBusy}
                                  onChange={e => void handleDirectImageUpload(item.id_producto, e)}
                                  className="hidden"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => handleAutoGenerateImage(editNombre, editCategoria, true)}
                                className="flex-1 py-1.5 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 rounded text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              >
                                🪄 Auto
                              </button>
                            </div>
                          </div>

                          <div className="flex gap-1.5 pt-1">
                            <button onClick={() => void handleSaveEdit(item.id_producto)} disabled={isBusy}
                              aria-label={`Guardar cambios de ${item.nombre}`}
                              className="p-1.5 rounded bg-[#22C55E]/15 hover:bg-[#22C55E]/20 text-[#22C55E] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={resetEditForm} disabled={isBusy}
                              aria-label={`Cancelar edición de ${item.nombre}`}
                              className="p-1.5 rounded bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 text-stone-500 dark:text-stone-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-stone-850 dark:text-[#FAF7F0] font-mono tracking-tight">${item.precio_venta.toLocaleString('es-AR')}</span>
                          <button onClick={() => handleStartEditing(item)} disabled={isBusy}
                            aria-label={`Editar ${item.nombre}`}
                            className="p-1.5 px-2 rounded hover:bg-stone-200/50 dark:hover:bg-white/5 text-stone-400 hover:text-stone-750 dark:hover:text-stone-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-[10px]">
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recipe escandallo margin visual flags */}
                {!editingId && (
                  <div className="mt-2 p-2 bg-stone-50 dark:bg-white/5 rounded-xl border border-stone-200/60 dark:border-white/10 flex items-center justify-between text-[9px] sm:text-[10px] font-bold text-stone-700 dark:text-stone-300">
                    {hasRecipe ? (
                      <>
                        <span className="text-stone-500 dark:text-stone-400">Costo: <strong className="font-mono text-stone-800 dark:text-stone-100">${recipeCost.toFixed(1)}</strong></span>
                        {marginPct !== null && (
                          <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase ${
                            marginLevel === 'high' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' :
                            marginLevel === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                          }`}>
                            Margen {marginPct.toFixed(0)}%
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Sin receta vinculada
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-stone-200/40 dark:border-white/10 mt-2">
                  <button onClick={() => void handleDuplicateItem(item)} disabled={isBusy}
                    className="text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded cursor-pointer transition-colors bg-stone-50 dark:bg-stone-850/80 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-750/80 hover:bg-[#F5F1E9] dark:hover:bg-stone-750/50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
                    <Copy className="w-3 h-3" /> {pendingAction === `duplicate_${item.id_producto}` ? 'Duplicando...' : 'Duplicar'}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] sm:text-[10px] font-bold ${item.activo ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-450'}`}>
                      {item.activo ? 'En carta' : 'Pausado'}
                    </span>
                    <button
                      onClick={() => void handleToggleActivo(item.id_producto)}
                      disabled={isBusy}
                      className={`text-[9px] sm:text-[10px] font-black px-2 py-1 rounded cursor-pointer transition-all border disabled:opacity-40 disabled:cursor-not-allowed ${
                        item.activo
                          ? 'bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border-rose-250/50 dark:border-rose-900/50'
                          : 'bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border-emerald-250/50 dark:border-emerald-900/50'
                      }`}
                    >
                      {pendingAction === `toggle_${item.id_producto}` ? 'Guardando...' : item.activo ? 'Retirar' : 'Habilitar'}
                    </button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPage(current => Math.max(1, current - 1))}
                disabled={page === 1}
                className="min-h-10 px-4 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-700 disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-xs font-bold text-stone-600" aria-live="polite">
                Página {page} de {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage(current => Math.min(pageCount, current + 1))}
                disabled={page === pageCount}
                className="min-h-10 px-4 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-700 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
