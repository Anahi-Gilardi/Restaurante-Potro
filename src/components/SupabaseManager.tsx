import React, { useState, useEffect } from 'react';
import {
  Database,
  Server,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Unlock,
  Sliders,
  CloudLightning,
  Upload,
  Download,
  Zap,
  Sparkles,
  Info
} from 'lucide-react';
import {
  getSupabaseConfig,
  getSupabaseClient,
  resetSupabaseInstance,
  dbFetchUsuarios,
  dbFetchMesas,
  dbFetchInsumos,
  dbFetchProductosMenu,
  dbFetchRecetas,
  dbFetchPromociones,
  dbFetchProveedores,
  dbFetchReservas,
  dbUpsertUsuarios,
  dbUpsertMesas,
  dbUpsertInsumos,
  dbUpsertProductosMenu,
  dbUpsertRecetas,
  dbUpsertPromociones,
  dbUpsertProveedores,
  dbUpsertReservas,
  dbFetchPedidos,
  dbFetchMermas,
  dbUpsertMermas
} from '../supabase';
import {
  INITIAL_USUARIOS,
  INITIAL_MESAS,
  INITIAL_INSUMOS,
  INITIAL_PRODUCTOS_MENU,
  INITIAL_RECETAS_ESCANDALLO
} from '../data/initialData';

interface SupabaseManagerProps {
  onSyncComplete?: (data: {
    mesas?: any[];
    insumos?: any[];
    productosMenu?: any[];
    recetas?: any[];
    usuarios?: any[];
    pedidos?: any[];
    mermas?: any[];
  }) => void;
  // Current states to seed/push if needed
  currentMesas: any[];
  currentInsumos: any[];
  currentProductosMenu: any[];
  currentRecetas: any[];
  addLog: (tipo: any, mensaje: string) => void;
}

export default function SupabaseManager({
  onSyncComplete,
  currentMesas,
  currentInsumos,
  currentProductosMenu,
  currentRecetas,
  addLog
}: SupabaseManagerProps) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');

  // Statuses
  const [connectionStatus, setConnectionStatus] = useState<'not_configured' | 'testing' | 'connected' | 'error'>('not_configured');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  // Dynamic PostgreSQL scan states
  const [scannedTables, setScannedTables] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Interactive inspection grid states
  const [selectedTableForInspect, setSelectedTableForInspect] = useState<string | null>(null);
  const [inspectRows, setInspectRows] = useState<any[]>([]);
  const [inspectColumns, setInspectColumns] = useState<string[]>([]);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectError, setInspectError] = useState('');
  const [inspectFilter, setInspectFilter] = useState('');
  const [pageSize, setPageSize] = useState(5);
  const [pageIndex, setPageIndex] = useState(0);

  const candidateTables = [
    { name: 'usuarios', desc: 'Credenciales, roles y perfiles de operarios/as.', key: 'id_usuario' },
    { name: 'mesetas', desc: 'Configuración y estado actual de mesas físicas en salón.', key: 'id_mesa' },
    { name: 'mesas', desc: 'Nomenclatura alternativa para mesas físicas.', key: 'id_mesa' },
    { name: 'depósitos', desc: 'Historial y stock actual de insumos y materias primas.', key: 'id_insumo' },
    { name: 'insumos', desc: 'Nomenclatura alternativa para depósitos/insumos.', key: 'id_insumo' },
    { name: 'productos_menú', desc: 'Platos, tragos y artículos activos del catálogo de venta.', key: 'id_producto' },
    { name: 'productos', desc: 'Nomenclatura alternativa para productos.', key: 'id_producto' },
    { name: 'recetas_escandallo', desc: 'Asociación e ingredientes de platos con descuento para cocina.', key: 'id_receta' },
    { name: 'promociones', desc: 'Campañas de descuento Happy Hour o combos especiales.', key: 'id_promo' },
    { name: 'proveedores', desc: 'Directorio de suministro y plazos de entrega estimados.', key: 'id_proveedor' },
    { name: 'reservas', desc: 'Planillas de reservas, clientes y asignación de mesas.', key: 'id_reserva' },
    { name: 'mermas', desc: 'Mermas registradas por roturas o pérdidas de bodega.', key: 'id_merma' },
    { name: 'facturas', desc: 'Archivo fiscal e historial de facturación AFIP.', key: 'id_factura' },
    { name: 'pedidos_cabecera', desc: 'Cabecera de comandas vivas o terminadas del turno.', key: 'id_pedido' },
    { name: 'pedido_detalle', desc: 'Detalles de platillos asociados por cada comanda.', key: 'id_detalle' },
    { name: 'auditoria_eventos', desc: 'Trazabilidad y logs de auditoría técnica del software.', key: 'id' }
  ];

  useEffect(() => {
    // Initial load
    const config = getSupabaseConfig();
    setUrl(config.url);
    // Don't show fully truncated key in state literally
    setAnonKey(config.key === 'SUPABASE_ANON_KEY_TRUNCADA...' ? '' : config.key);

    // Auto-test if config looks fully valid
    if (config.url && config.key && !config.key.includes('...')) {
      testConnection(config.url, config.key);
    }
  }, []);

  const scanDatabaseTables = async (client: any) => {
    setIsScanning(true);
    const results: any[] = [];

    for (const cand of candidateTables) {
      try {
        const { data, count, error } = await client
          .from(cand.name)
          .select('*', { count: 'exact', head: true });

        if (error) {
          if (error.code === 'PGRST116' || error.message?.includes('not find') || error.code === '42P01') {
            results.push({ ...cand, status: 'missing', count: 'Sin Crear' });
          } else {
            results.push({ ...cand, status: 'forbidden', count: 'Restringida (RLS)', errorMsg: error.message });
          }
        } else {
          results.push({ ...cand, status: 'detected', count: count !== null ? count : (data?.length ?? 0) });
        }
      } catch (err: any) {
        results.push({ ...cand, status: 'missing', count: 'Sin Crear' });
      }
    }
    setScannedTables(results);
    setIsScanning(false);
  };

  const inspectTable = async (tableName: string) => {
    setSelectedTableForInspect(tableName);
    setIsInspecting(true);
    setInspectError('');
    setInspectRows([]);
    setInspectColumns([]);
    setPageIndex(0);

    const client = getSupabaseClient();
    if (!client) {
      setInspectError('Cliente Supabase no inicializado de forma correcta.');
      setIsInspecting(false);
      return;
    }

    try {
      const { data, error } = await client
        .from(tableName)
        .select('*')
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        setInspectRows(data);
        const columns = Object.keys(data[0]);
        setInspectColumns(columns);
      } else {
        setInspectRows([]);
        setInspectColumns([]);
      }
    } catch (err: any) {
      console.error(err);
      setInspectError(err.message || 'Error al recuperar registros de Supabase.');
    } finally {
      setIsInspecting(false);
    }
  };

  const testConnection = async (testUrl: string, testKey: string) => {
    if (!testUrl || !testKey) {
      setConnectionStatus('not_configured');
      setConnectionMessage('Faltan ingresar las credenciales de Supabase.');
      return;
    }

    setConnectionStatus('testing');
    setConnectionMessage('Estableciendo enlace de prueba...');

    try {
      // Temporarily store in local storage to initialize correct client instance
      localStorage.setItem('SUPABASE_URL', testUrl);
      localStorage.setItem('SUPABASE_ANON_KEY', testKey);
      resetSupabaseInstance();

      const client = getSupabaseClient();
      if (!client) {
        throw new Error('No se pudo inicializar el SDK con las llaves provistas.');
      }

      // Test reading tables
      const { data: userTest, error: userError } = await client.from('usuarios').select('count', { count: 'exact', head: true });

      if (userError && userError.code !== '42P01' && userError.code !== 'PGRST116') {
        throw userError;
      }

      setConnectionStatus('connected');
      setConnectionMessage('¡Conexión establecida con éxito a Supabase PostgreSQL!');
      addLog('sistema', 'SUPABASE: Conexión establecida con la nube de Supabase. Sincronización activa.');

      // Perform a full relational scan
      await scanDatabaseTables(client);

    } catch (err: any) {
      console.error(err);
      setConnectionStatus('error');
      setConnectionMessage(`Error de enlace: ${err.message || 'Verifique las llaves o políticas RLS en Supabase.'}`);
      addLog('sistema', `SUPABASE ERROR: Falló el enlace de prueba. ${err.message || ''}`);
    }
  };

  const handleSaveConfig = () => {
    if (!url || !anonKey) {
      alert("Por favor rellene la URL y la Anon Key de Supabase.");
      return;
    }
    testConnection(url, anonKey);
  };

  const handleClearConfig = () => {
    localStorage.removeItem('SUPABASE_URL');
    localStorage.removeItem('SUPABASE_ANON_KEY');
    setUrl('');
    setAnonKey('');
    resetSupabaseInstance();
    setConnectionStatus('not_configured');
    setConnectionMessage('Configuración removida. Volviendo a SQLite Local offline.');
    addLog('sistema', 'SUPABASE: Desconectado. Retornando a persistencia interna offline.');
    setScannedTables([]);
    setSelectedTableForInspect(null);
  };

  // Push seed data helper (from local UI state or files into Supabase!)
  const handleSeedDatabase = async () => {
    const client = getSupabaseClient();
    if (!client || connectionStatus !== 'connected') {
      alert('Debe establecer una conexión exitosa primero.');
      return;
    }

    if (!confirm('¿Desea subir los datos iniciales al servidor Supabase? Esto cargará/actualizará las tablas con el menú de muestra, mesas, recetas escandallo e insumos.')) {
      return;
    }

    setIsPushing(true);
    addLog('sistema', 'SUPABASE: Iniciando carga masiva de datos iniciales a las tablas en la nube...');

    try {
      const OLD_PRODUCT_IDS = [
        'prod_ent_burrata', 'prod_ent_mollejas', 'prod_ent_provoleta',
        'prod_pas_sorrentinos_cordero', 'prod_pas_ravioles_calabaza', 'prod_pas_gnocchis',
        'prod_car_bife_madurado', 'prod_car_costillar', 'prod_car_entrana', 'prod_car_matambrito',
        'prod_pes_abadejo', 'prod_pes_cazuela', 'prod_pes_merluza',
        'prod_cri_milanesa', 'prod_cri_hamburguesa', 'prod_cri_pastel_papa',
        'prod_pos_volcan', 'prod_pos_peras', 'prod_pos_panqueque'
      ];

      addLog('sistema', 'SUPABASE: Eliminando platos obsoletos (legacy) de la nube...');
      await client
        .from('recetas_escandallo')
        .delete()
        .in('id_producto', OLD_PRODUCT_IDS);

      await client
        .from('productos_menu')
        .delete()
        .in('id_producto', OLD_PRODUCT_IDS);

      // 1. Send usuarios
      await dbUpsertUsuarios(INITIAL_USUARIOS);

      // 2. Send mesas
      await dbUpsertMesas(currentMesas.length > 0 ? currentMesas : INITIAL_MESAS);

      // 3. Send insumos
      await dbUpsertInsumos(currentInsumos.length > 0 ? currentInsumos : INITIAL_INSUMOS);

      // 4. Send menu
      await dbUpsertProductosMenu(currentProductosMenu.length > 0 ? currentProductosMenu : INITIAL_PRODUCTOS_MENU);

      // 5. Send recetas
      await dbUpsertRecetas(currentRecetas.length > 0 ? currentRecetas : INITIAL_RECETAS_ESCANDALLO);

      addLog('sistema', 'SUPABASE: ¡Base de Datos sembrada con éxito! Todos los registros de inventario, recetas y mesas están sincronizados en el servidor.');
      alert('¡Base de Datos sembrada y sincronizada correctamente en Supabase! Las tablas ahora tienen registros operacionales.');

      // Refresh counts
      testConnection(url, anonKey);

    } catch (err: any) {
      alert(`Error al sembrar datos: ${err.message || err}`);
      addLog('sistema', `SUPABASE ERROR: Error al sembrar base de datos. ${err.message || ''}`);
    } finally {
      setIsPushing(false);
    }
  };

  // Pull data from Supabase to overwrite local React states
  const handlePullDatabase = async () => {
    const client = getSupabaseClient();
    if (!client || connectionStatus !== 'connected') {
      alert('Debe establecer una conexión exitosa primero.');
      return;
    }

    setIsPulling(true);
    addLog('sistema', 'SUPABASE: Solicitando descarga y sincronización de datos de producción...');

    try {
      const dbUsers = await dbFetchUsuarios();
      const dbMesas = await dbFetchMesas();
      const dbInsumos = await dbFetchInsumos();
      const dbProducts = await dbFetchProductosMenu();
      const dbRecipes = await dbFetchRecetas();
      const dbPedidos = await dbFetchPedidos();
      const dbMermas = await dbFetchMermas();

      // Assemble update object
      const syncedPayload: any = {};
      let pulledCount = 0;

      if (dbUsers && dbUsers.length > 0) {
        syncedPayload.usuarios = dbUsers;
        pulledCount++;
      }
      if (dbMesas && dbMesas.length > 0) {
        // Map from DB schema to app type if needed
        syncedPayload.mesas = dbMesas.map(m => ({
          id_mesa: m.id_mesa,
          numero_mesa: m.numero_mesa,
          estado: m.estado || 'libre',
          comensales: m.comensales || undefined
        }));
        pulledCount++;
      }
      if (dbInsumos && dbInsumos.length > 0) {
        syncedPayload.insumos = dbInsumos;
        pulledCount++;
      }
      if (dbProducts && dbProducts.length > 0) {
        syncedPayload.productosMenu = dbProducts;
        pulledCount++;
      }
      if (dbRecipes && dbRecipes.length > 0) {
        syncedPayload.recetas = dbRecipes;
        pulledCount++;
      }
      if (dbPedidos && dbPedidos.length > 0) {
        syncedPayload.pedidos = dbPedidos;
        pulledCount++;
      }
      if (dbMermas && dbMermas.length > 0) {
        syncedPayload.mermas = dbMermas;
        pulledCount++;
      }

      if (pulledCount > 0 && onSyncComplete) {
        onSyncComplete(syncedPayload);
        addLog('sistema', `SUPABASE: Descarga completa. Sincronizadas y actualizadas de manera segura en caliente.`);
        alert('¡Sincronización descendente completada con éxito! La interfaz se actualizó con los datos de Supabase.');
      } else {
        alert('Las tablas remotas parecen estar vacías. Utilice "Sembrar / Inicializar" para cargarlas por primera vez.');
      }

    } catch (err: any) {
      alert(`Error de sincronización descendente: ${err.message || err}`);
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4 font-sans" id="supabase-manager-widget">
      <div className="flex justify-between items-start">
        <div>
          <span className="bg-amber-600/10 border border-amber-600/20 text-amber-600 text-[9px] font-extrabold px-2 py-0.5 rounded-lg uppercase tracking-wider block w-fit mb-1.5">
            Integración Externa Síncrona
          </span>
          <h3 className="font-extrabold text-[#624A3E] font-sans tracking-tight flex items-center gap-2 text-sm md:text-base">
            <CloudLightning className="w-5 h-5 text-amber-500 animate-pulse" />
            Vincular Base de Datos Supabase
          </h3>
          <p className="text-[11px] text-slate-400">
            Conecte y sincronice este software gastronómico con sus tablas relacionales en la nube de Supabase.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
            connectionStatus === 'connected'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : connectionStatus === 'testing'
              ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
              : connectionStatus === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-slate-50 text-slate-500 border border-slate-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              connectionStatus === 'connected' ? 'bg-emerald-500' :
              connectionStatus === 'testing' ? 'bg-amber-500' :
              connectionStatus === 'error' ? 'bg-red-500' : 'bg-slate-400'
            }`} />
            {connectionStatus === 'connected' ? 'Enlazado Cloud' :
             connectionStatus === 'testing' ? 'Verificando...' :
             connectionStatus === 'error' ? 'Fallo Conexión' : ' SQLite Offline'}
          </span>
        </div>
      </div>

      {/* Input credentials panel */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
        <div className="md:col-span-4 space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Supabase App URL</label>
          <input
            type="text"
            placeholder="https://xxx.supabase.co"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full text-xs py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
          />
        </div>

        <div className="md:col-span-5 space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Supabase Client Anon Key</label>
          <input
            type="password"
            placeholder="SUPABASE_ANON_KEY"
            value={anonKey}
            onChange={(e) => setAnonKey(e.target.value)}
            className="w-full text-xs py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#624A3E] font-mono"
          />
        </div>

        <div className="md:col-span-3 flex items-end gap-2">
          <button
            onClick={handleSaveConfig}
            disabled={connectionStatus === 'testing'}
            className="flex-1 py-1.5 px-3 bg-[#624A3E] hover:bg-[#4E3930] text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${connectionStatus === 'testing' ? 'animate-spin' : ''}`} />
            Conectar
          </button>

          {(url || anonKey) && (
            <button
              onClick={handleClearConfig}
              className="py-1.5 px-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
              title="Desconectar y limpiar llaves"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {connectionMessage && (
        <div className={`p-3 rounded-lg text-[11px] leading-snug font-medium flex items-center gap-2 ${
          connectionStatus === 'connected'
            ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-800'
            : connectionStatus === 'error'
            ? 'bg-rose-500/10 border border-rose-500/25 text-rose-800'
            : 'bg-amber-500/10 border border-amber-500/25 text-amber-800'
        }`}>
          {connectionStatus === 'connected' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{connectionMessage}</span>
        </div>
      )}

      {/* Database stats and bi-directional synchronizer dashboard */}
      {connectionStatus === 'connected' && (
        <div className="space-y-6 mt-4 border-t border-slate-100 pt-4 animate-fadeIn">

          {/* Table List Scanner Grid */}
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block font-mono">Inventario de Objetos PostgreSQL</span>
                <p className="text-[11px] text-[#624A3E] font-bold">16 Tablas candidatas monitoreadas en tiempo real</p>
              </div>
              <button
                onClick={() => {
                  const client = getSupabaseClient();
                  if (client) scanDatabaseTables(client);
                }}
                disabled={isScanning}
                className="py-1 px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                Re-escanear
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 max-h-[220px] overflow-y-auto scrollbar-thin pr-1">
              {scannedTables.length > 0 ? (
                scannedTables.map((table, idx) => {
                  const isSelected = selectedTableForInspect === table.name;
                  const isDetected = table.status === 'detected';
                  const isForbidden = table.status === 'forbidden';

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#624A3E] bg-[#624A3E]/5 ring-1 ring-[#624A3E]/10'
                          : isDetected
                          ? 'border-slate-150 bg-white hover:bg-slate-50/50'
                          : 'border-slate-100 bg-slate-50/30 opacity-70'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-xs font-black text-slate-800 font-mono truncate" title={table.name}>
                            {table.name}
                          </span>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded shrink-0 ${
                            isDetected
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : isForbidden
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}>
                            {isDetected ? `${table.count} filas` : isForbidden ? 'RLS Guard' : 'No Creada'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          {table.desc}
                        </p>
                      </div>

                      {isDetected && (
                        <div className="mt-3 flex gap-1 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => inspectTable(table.name)}
                            className="flex-1 py-1 text-[10px] font-extrabold text-[#624A3E] bg-[#624A3E]/10 hover:bg-[#624A3E]/20 rounded-lg cursor-pointer text-center"
                          >
                            {isSelected && !isInspecting ? 'Examinando' : 'Examinar Filas'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-6 text-xs text-slate-400 font-medium">
                  {isScanning ? 'Mapeando estructura de tablas relacionales...' : 'Haga click en Conectar para listar las tablas.'}
                </div>
              )}
            </div>
          </div>

          {/* Interactive Row Viewer (Database Inspector DataGrid) */}
          {selectedTableForInspect && (
            <div className="bg-slate-900 text-slate-100 rounded-xl p-4 border border-slate-800 space-y-3 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2.5 border-b border-slate-800 gap-2">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded font-mono">
                    TABLA: {selectedTableForInspect.toUpperCase()}
                  </span>
                  <p className="text-[11px] text-slate-400">Inspección directa de registros en caliente</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={inspectFilter}
                    onChange={(e) => {
                      setInspectFilter(e.target.value);
                      setPageIndex(0);
                    }}
                    placeholder="Filtrar localmente..."
                    className="bg-slate-950 border border-slate-800 text-[11px] text-slate-200 px-2 py-1 rounded placeholder-slate-500 w-36 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                  />
                  <button
                    onClick={() => inspectTable(selectedTableForInspect)}
                    className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                    title="Actualizar datos"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSelectedTableForInspect(null)}
                    className="text-slate-400 hover:text-white font-extrabold text-xs px-1.5"
                  >
                    ✖
                  </button>
                </div>
              </div>

              {isInspecting ? (
                <div className="py-8 text-center text-xs text-slate-400 animate-pulse font-mono">
                  Consultando `SELECT * FROM {selectedTableForInspect}`...
                </div>
              ) : inspectError ? (
                <div className="p-3 bg-red-950/40 border border-red-900/40 rounded-lg text-xs text-red-300">
                  ⚠️ Error al consultar: {inspectError}
                </div>
              ) : inspectRows.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 font-mono">
                  Tabla vacía. No hay filas registradas en `{selectedTableForInspect}`.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {/* Rows count summary */}
                  {(() => {
                    const filtered = inspectRows.filter(row =>
                      JSON.stringify(row).toLowerCase().includes(inspectFilter.toLowerCase())
                    );
                    const totalPages = Math.ceil(filtered.length / pageSize);
                    const displayed = filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

                    return (
                      <>
                        {/* Table layout overflow holder */}
                        <div className="overflow-x-auto w-full border border-slate-800 rounded bg-slate-950/80 max-h-56 scrollbar-thin">
                          <table className="w-full text-left font-mono text-[10px] border-collapse">
                            <thead>
                              <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-850">
                                {inspectColumns.map((col, idx) => (
                                  <th key={idx} className="py-2 px-3 font-semibold whitespace-nowrap border-r border-slate-850">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {displayed.map((row, rIdx) => (
                                <tr key={rIdx} className="border-b border-slate-850 hover:bg-slate-900/45 text-slate-300">
                                  {inspectColumns.map((col, cIdx) => {
                                    const val = row[col];
                                    let strVal = '';
                                    if (val === null || val === undefined) {
                                      strVal = 'null';
                                    } else if (typeof val === 'object') {
                                      strVal = JSON.stringify(val);
                                    } else {
                                      strVal = String(val);
                                    }
                                    return (
                                      <td key={cIdx} className="py-1.5 px-3 border-r border-slate-850 max-w-xs truncate" title={strVal}>
                                        {strVal === 'null' ? (
                                          <span className="text-slate-600 italic">null</span>
                                        ) : (
                                          strVal
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination state bar */}
                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                          <span>
                            Mostrando {pageIndex * pageSize + 1}-{Math.min((pageIndex + 1) * pageSize, filtered.length)} de {filtered.length} filas coincidentes (de {inspectRows.length} examinadas)
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setPageIndex(p => Math.max(0, p - 1))}
                              disabled={pageIndex === 0}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded disabled:opacity-40"
                            >
                              Anterior
                            </button>
                            <span className="text-slate-300 font-bold">Pág {pageIndex + 1} de {totalPages || 1}</span>
                            <button
                              onClick={() => setPageIndex(p => Math.min(totalPages - 1, p + 1))}
                              disabled={pageIndex >= totalPages - 1}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded disabled:opacity-40"
                            >
                              Siguiente
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Sync operations actions bar */}
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="space-y-0.5 text-center md:text-left">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 justify-center md:justify-start">
                <Zap className="w-3.5 h-3.5 text-[#624A3E]" />
                Panel de Sincronización Bidireccional
              </span>
              <p className="text-[11px] text-slate-500">
                Llene su base de datos vacía o descargue los datos de producción en calidos flujos bidireccionales.
              </p>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <button
                onClick={handleSeedDatabase}
                disabled={isPushing}
                className="flex-1 md:flex-none py-1.5 px-3 bg-[#624A3E] hover:bg-[#4E3930] text-white rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                {isPushing ? 'Subiendo...' : 'Sembrar / Subir Locales'}
              </button>

              <button
                onClick={handlePullDatabase}
                disabled={isPulling}
                className="flex-1 md:flex-none py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {isPulling ? 'Sincronizando...' : 'Descargar remotos'}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-1.5 text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <p>
              <strong>Políticas de Acceso RLS:</strong> Asegúrese de habilitar los permisos de inserción, actualización y lectura para el rol de clave anónima (anon) en su consola de base de datos Supabase para habilitar la sync automática.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
