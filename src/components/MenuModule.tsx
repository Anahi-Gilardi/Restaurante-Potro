import React, { useState, useEffect } from 'react';
import { 
  UtensilsCrossed, Plus, Search, Edit2, Check, RefreshCw, 
  Cloud, Lock, Unlock, Copy, ExternalLink, ShieldCheck, Database, Terminal
} from 'lucide-react';
import { ProductoMenu } from '../types';
import { getSupabaseConfig, dbFetchProductosMenu, dbUpsertProductosMenu, getSupabaseClient } from '../supabase';

interface MenuModuleProps {
  productosMenu: ProductoMenu[];
  setProductosMenu?: (items: ProductoMenu[]) => void;
  addLog: (tipo: any, mensaje: string) => void;
}

export default function MenuModule({ productosMenu, setProductosMenu, addLog }: MenuModuleProps) {
  const [items, setItems] = useState<ProductoMenu[]>(productosMenu);
  const [search, setSearch] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<'todos' | 'cocina' | 'bebidas' | 'postres'>('todos');
  
  // Loading & statuses
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'not_configured' | 'error'>('connected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // Form states for creating a new product
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState<'cocina' | 'bebidas' | 'postres'>('cocina');
  const [imagenUrl, setImagenUrl] = useState('');

  // Editing states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrecio, setEditPrecio] = useState('');

  // 1. Fetch products automatically from Supabase on mount
  const loadSupabaseMenu = async () => {
    const client = getSupabaseClient();
    if (!client) {
      setDbStatus('not_configured');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await dbFetchProductosMenu();
      if (data && data.length > 0) {
        const mapped: ProductoMenu[] = data.map(sp => ({
          id_producto: sp.id_producto || `prod_supa_${Math.random().toString(36).substr(2, 9)}`,
          nombre: sp.nombre || 'Producto sin nombre',
          precio_venta: parseFloat(sp.precio_venta) || 0,
          categoria: sp.categoria || 'cocina',
          activo: sp.activo !== undefined ? sp.activo : true,
          imagen: sp.imagen || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80'
        }));
        setItems(mapped);
        if (setProductosMenu) {
          setProductosMenu(mapped);
        }
        setDbStatus('connected');
        addLog('sistema', `SUPABASE: Cargados correctamente ${mapped.length} productos directamente del menú.`);
      } else if (data === null) {
        setDbStatus('error');
        setErrorMessage('No se encontró la tabla "productos_menu" en su base de datos o falló la conexión.');
      } else {
        // Table successfully queried but empty
        setDbStatus('connected');
        addLog('sistema', 'SUPABASE: Tabla inicializada correctamente pero sin productos en la carta.');
      }
    } catch (err: any) {
      setDbStatus('error');
      setErrorMessage(err.message || 'Error al conectar con Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSupabaseMenu();
  }, []);

  // Sync if parent updates
  useEffect(() => {
    if (productosMenu && productosMenu.length > 0) {
      setItems(productosMenu);
    }
  }, [productosMenu]);

  // SQL Script Helper for RLS
  const handleCopySQL = () => {
    const sql = `-- COMANDOS SQL PARA HABILITAR INSERCIÓN Y EDICIÓN EN LA TABLA PRODUCTOS_MENU
-- Ejecute esto en el "SQL Editor" de su portal de Supabase en un solo clic:

-- OPCIÓN A: Desactivar RLS por completo (Recomendado y más simple para pruebas/desarrollo)
-- Esto permite lectura, escritura e inserción desde el modal sin restricciones.
ALTER TABLE public.productos_menu DISABLE ROW LEVEL SECURITY;

-- OPCIÓN B: Si prefiere mantener RLS habilitado, permita inserciones, lecturas y actualizaciones públicas:
-- DROP POLICY IF EXISTS "Permitir todo a anonimos" ON public.productos_menu;
-- CREATE POLICY "Permitir todo a anonimos" ON public.productos_menu FOR ALL TO anon USING (true) WITH CHECK (true);
`;
    navigator.clipboard.writeText(sql);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2000);
    addLog('sistema', 'SUPABASE: Copiado comandos SQL de inserción y permisos al portapapeles.');
  };

  // 2. Handle Creation & automatically save to Supabase
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !precio) return;

    const fallbackImg = categoria === 'bebidas' 
      ? 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80'
      : categoria === 'postres'
        ? 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'
        : 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80';

    const newItem: ProductoMenu = {
      id_producto: `prod_custom_${Date.now()}`,
      nombre,
      precio_venta: parseFloat(precio),
      categoria,
      activo: true,
      imagen: imagenUrl || fallbackImg
    };

    // Optimistic UI updates
    const updated = [newItem, ...items];
    setItems(updated);
    if (setProductosMenu) {
      setProductosMenu(updated);
    }

    setNombre('');
    setPrecio('');
    setImagenUrl('');

    // Persistence directly to Supabase
    try {
      await dbUpsertProductosMenu([newItem]);
      addLog('sistema', `SUPABASE: Guardado nuevo plato '${nombre}' con precio de $${newItem.precio_venta} directamente en la base de datos.`);
    } catch (err: any) {
      console.error(err);
      addLog('sistema', `SUPABASE ERROR: No se pudo verificar la tabla. Revise permisos RLS.`);
    }
  };

  // 3. Handle Active/Inactive State & save to Supabase
  const handleToggleActivo = async (id: string) => {
    let targetItem: ProductoMenu | null = null;
    const updated = items.map(item => {
      if (item.id_producto === id) {
        const nextState = !item.activo;
        targetItem = { ...item, activo: nextState };
        return targetItem;
      }
      return item;
    });

    setItems(updated);
    if (setProductosMenu) {
      setProductosMenu(updated);
    }

    if (targetItem) {
      addLog('sistema', `MENÚ: Cambiado estado de '${(targetItem as ProductoMenu).nombre}' a ${(targetItem as ProductoMenu).activo ? 'ACTIVO' : 'INACTIVO'}`);
      try {
        await dbUpsertProductosMenu([targetItem]);
      } catch (err) {
        addLog('sistema', `SUPABASE ERROR: Falló guardar el estado en el servidor.`);
      }
    }
  };

  const handleStartEditing = (id: string, currentPrice: number) => {
    setEditingId(id);
    setEditPrecio(currentPrice.toString());
  };

  // 4. Handle Price edit & write directly to Supabase
  const handleSavePrecio = async (id: string) => {
    let targetItem: ProductoMenu | null = null;
    const updated = items.map(item => {
      if (item.id_producto === id) {
        targetItem = { ...item, precio_venta: parseFloat(editPrecio) };
        return targetItem;
      }
      return item;
    });

    setItems(updated);
    if (setProductosMenu) {
      setProductosMenu(updated);
    }
    setEditingId(null);

    if (targetItem) {
      addLog('sistema', `MENÚ: Precio actualizado para '${(targetItem as ProductoMenu).nombre}' a $${(targetItem as ProductoMenu).precio_venta}`);
      try {
        await dbUpsertProductosMenu([targetItem]);
      } catch (err) {
        addLog('sistema', `SUPABASE ERROR: No se pudo persistir el precio editado.`);
      }
    }
  };

  // Filter lists
  const filtered = items.filter(item => {
    const matchesSearch = item.nombre.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategoria === 'todos' || item.categoria === selectedCategoria;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      
      {/* STATUS BANNER */}
      <div className="bg-stone-50 border border-stone-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
            dbStatus === 'connected' ? 'bg-emerald-600' : dbStatus === 'error' ? 'bg-rose-500' : 'bg-amber-500'
          }`}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-stone-850 uppercase tracking-tight">Estatus de Base de Datos</h4>
            <p className="text-[11px] text-stone-500 font-sans mt-0.5">
              {dbStatus === 'connected' && `Conectado a Supabase. Todos los productos se guardan directamente en tiempo real.`}
              {dbStatus === 'not_configured' && `Usando base de datos local temporal. Configure las credenciales en la pestaña "Sistema".`}
              {dbStatus === 'error' && `${errorMessage}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSqlGuide(!showSqlGuide)}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-black rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <Terminal className="w-3.5 h-3.5" />
            Soporte SQL/Permisos RLS
          </button>
          
          <button
            onClick={loadSupabaseMenu}
            disabled={loading}
            className="px-3.5 py-1.5 bg-white hover:bg-stone-100 text-stone-700 text-[11px] font-extrabold rounded-xl border border-stone-200 cursor-pointer shadow-1 flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Recargando...' : 'Actualizar Tabla'}
          </button>
        </div>
      </div>

      {/* SQL COLLAPSIBLE GUIDE BANNER IF EXPANDED OR ON ERROR */}
      {showSqlGuide && (
        <div className="bg-amber-50/75 border border-amber-200 rounded-2xl p-4.5 space-y-3 animate-fadeIn">
          <div className="flex items-start gap-3">
            <Unlock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-amber-900 leading-snug">Habilitar permisos en Supabase</h4>
              <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                Si tiene un error de conexión, asegúrese de haber creado la tabla <code className="bg-amber-100 px-1 py-0.2 rounded font-bold font-mono">productos_menu</code> y haberle desactivado el control estricto de seguridad RLS en su portal para permitir agregar o editar platos.
              </p>
            </div>
          </div>

          <div className="bg-stone-900 rounded-xl p-3.5 relative font-mono text-[10px] text-stone-200 shadow-inner">
            <pre className="overflow-x-auto whitespace-pre leading-relaxed pr-24 text-left">
{`-- Ejecute esto en el SQL Editor de su portal de Supabase:

-- Opción 1: Desactivar RLS por completo (Recomendado/Más rápido)
ALTER TABLE public.productos_menu DISABLE ROW LEVEL SECURITY;

-- Opción 2: O crear una política permisiva si desea mantener RLS activo
CREATE POLICY "Permitir todo a anonimos" ON public.productos_menu
FOR ALL TO anon USING (true) WITH CHECK (true);`}
            </pre>
            <button
              onClick={handleCopySQL}
              className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded border border-white/10 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors animate-pulse"
            >
              {sqlCopied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copiar SQL
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TWO COLUMNS MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left col: Add new Item */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#624A3E]" />
              Nuevo Plato / Bebida
            </h3>
            <span className="text-[9px] font-black uppercase text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100 flex items-center gap-1">
              <Cloud className="w-2.5 h-2.5" />
              Supabase
            </span>
          </div>

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
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">Categoría</label>
              <select 
                value={categoria} 
                onChange={e => setCategoria(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E] cursor-pointer font-bold text-stone-700"
              >
                <option value="cocina">Cocina (Platos calientes/Ensaladas)</option>
                <option value="bebidas">Bebidas (Vinos, gaseosas)</option>
                <option value="postres">Postres (Dulces, pastelería)</option>
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
              className="w-full py-2.5 bg-[#624A3E] hover:bg-[#503C32] text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-[#624A3E]/10 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Guardar en Supabase
            </button>
          </form>
        </div>

        {/* Right 3 cols: Filter list */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs lg:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-stone-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 w-full">
              <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-[#624A3E]" />
                Carta del Restaurante ({filtered.length})
              </h3>

              {/* Filter tags */}
              <div className="flex flex-wrap gap-1">
                {(['todos', 'cocina', 'bebidas', 'postres'] as const).map(cat => (
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

          {/* Catalog grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(item => (
              <div 
                key={item.id_producto} 
                className={`p-3 bg-[#F5F1E9]/30 border rounded-2xl flex gap-3 transition-all hover:bg-[#F5F1E9]/60 ${
                  item.activo ? 'border-stone-150 shadow-xs' : 'border-rose-105 bg-rose-50/10 opacity-70'
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
                    
                    {editingId === item.id_producto ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs font-bold text-stone-700">$</span>
                        <input 
                          type="number" 
                          value={editPrecio}
                          onChange={e => setEditPrecio(e.target.value)}
                          className="w-16 text-xs p-1 border border-stone-300 rounded bg-white text-stone-800 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                        />
                        <button 
                          onClick={() => handleSavePrecio(item.id_producto)}
                          className="p-1 rounded bg-[#22C55E]/15 hover:bg-[#22C55E]/20 text-[#22C55E] cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-stone-850 font-mono tracking-tight">${item.precio_venta.toLocaleString('es-AR')}</span>
                        <button 
                          onClick={() => handleStartEditing(item.id_producto, item.precio_venta)}
                          className="p-1 px-1.5 rounded hover:bg-stone-200/50 text-stone-400 hover:text-stone-750 transition-colors cursor-pointer text-[10px]"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-200/40 mt-1">
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
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-stone-400 text-xs">
              No se han encontrado platos registrados. Cree uno nuevo a la izquierda para cargarlo en su Base de Datos.
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
