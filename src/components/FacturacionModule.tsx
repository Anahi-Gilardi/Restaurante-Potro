import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  BadgeCheck,
  Calendar,
  CreditCard,
  Download,
  FileText,
  Filter,
  Plus,
  Printer,
  Receipt,
  Search,
  ScanLine,
  X,
  Check,
  ChevronRight,
  TrendingUp,
  PieChart,
  BarChart3,
  User,
  Info,
  CalendarDays,
  FileCheck2,
  Users
} from 'lucide-react';
import { Pedido, ProductoMenu, TicketData, TipoComprobante } from '../types';
import { facturacionService, Factura } from '../services/facturacionService';
import { pdfService } from '../services/pdfService';
import { ToastContainer, useToast } from './ToastContainer';
import {
  ArcaStatus,
  createArcaCreditNote,
  createArcaInvoice,
  CONDICIONES_IVA_RECEPTOR,
  getArcaStatus,
  testArcaConnection,
  type ArcaInvoiceResult,
} from '../services/arcaService';
import { useDebounce } from '../hooks/useDebounce';
import { fiscalVoucherPreview, MONOTRIBUTO_INVOICE_OPTIONS } from '../lib/fiscalVoucherPolicy';
import { DEFAULT_RESTAURANT_PROFILE } from '../lib/restaurantProfile';
import { calculatePedidoTotal, resolvePedidoItemUnitPrice } from '../lib/orderPricing';
import { parseFiscalCustomerDocument } from '../lib/fiscalCustomerDocument';
import { argentinaDateIso } from '../lib/argentinaDate';

interface FacturacionModuleProps {
  pedidos: Pedido[];
  productosMenu: ProductoMenu[];
  addLog: (tipo: 'pedido_creado' | 'descuento_stock' | 'alerta_stock' | 'comanda_estado' | 'merma_registrada' | 'sistema', mensaje: string) => void;
}

type FacturaExtendida = Factura & {
  tipo?: 'ticket' | 'A' | 'B' | 'C' | 'NC' | 'X';
  id_pedido?: number | null;
  observaciones?: string;
};

type TabKey = 'dashboard' | 'manual' | 'pagos' | 'archivo';
type EstadoFiltro = 'todos' | Factura['estado'];
type TipoFiltro = 'todos' | 'ticket' | 'A' | 'B' | 'C' | 'NC' | 'X';
type MedioFiltro = 'todos' | Factura['medio_pago'];

const DEFAULT_FACTURAS: FacturaExtendida[] = [];

const money = (value: number) => `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fiscalValidationUrl = (qrData?: string): string | null => {
  if (!qrData) return null;
  try {
    const validationUrl = qrData.startsWith('{')
      ? `https://www.arca.gob.ar/fe/qr/?p=${btoa(unescape(encodeURIComponent(qrData)))}`
      : qrData;
    return validationUrl;
  } catch {
    return null;
  }
};

function FiscalQrImage({ qrData }: { qrData?: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let active = true;
    const url = fiscalValidationUrl(qrData);
    if (!url) {
      setSrc('');
      return () => { active = false; };
    }
    QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 1, width: 256 })
      .then(value => { if (active) setSrc(value); })
      .catch(() => { if (active) setSrc(''); });
    return () => { active = false; };
  }, [qrData]);
  return src
    ? <img src={src} alt="Código QR fiscal de ARCA" className="w-full h-full object-contain" />
    : <span className="text-[8px] font-bold text-amber-700">QR no disponible</span>;
}

const calcIvaIncluido = (total: number, aplicaIva = true) => {
  if (!aplicaIva) return { neto: total, iva: 0 };
  const neto = Number((total / 1.21).toFixed(2));
  return { neto, iva: Number((total - neto).toFixed(2)) };
};

const facturaTipo = (f: FacturaExtendida): 'ticket' | 'A' | 'B' | 'C' | 'NC' | 'X' => {
  if (f.tipo) return f.tipo;
  if (f.nro_ticket.startsWith('A-')) return 'A';
  if (f.nro_ticket.startsWith('B-')) return 'B';
  if (f.nro_ticket.startsWith('NC-')) return 'NC';
  if (f.nro_ticket.startsWith('C-')) return 'C';
  if (f.nro_ticket.startsWith('X-')) return 'X';
  return 'ticket';
};

const tipoPrefix = (tipo: 'ticket' | 'A' | 'B' | 'C' | 'NC' | 'X') => (tipo === 'ticket' ? 'T' : tipo);

const nextNumber = (
  facturas: FacturaExtendida[],
  tipo: 'C' | 'X',
  puntoVenta: number | null | undefined,
) => fiscalVoucherPreview(tipo, puntoVenta, facturas.map(factura => factura.nro_ticket));

const medioLabel = (medio: Factura['medio_pago']) => ({
  efectivo: 'Efectivo',
  debito: 'Débito',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  mp_qr: 'QR MercadoPago',
  mixto: 'Mixto'
}[medio]);

export default function FacturacionModule({ pedidos, productosMenu, addLog }: FacturacionModuleProps) {
  const { toast, toasts, dismissToast } = useToast();
  const [facturas, setFacturas] = useState<FacturaExtendida[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  
  // Filtros de archivo fiscal
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>('todos');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('todos');
  const [medioFiltro, setMedioFiltro] = useState<MedioFiltro>('todos');
  
  // Emisión Manual
  const [manualTipo, setManualTipo] = useState<'C' | 'X'>('C');
  const [manualCliente, setManualCliente] = useState('Consumidor Final');
  const [manualCuit, setManualCuit] = useState('99-99999999-9');
  const [manualTotal, setManualTotal] = useState('0');
  const [manualMedio, setManualMedio] = useState<Factura['medio_pago']>('efectivo');
  const [manualCondicionIva, setManualCondicionIva] = useState(5);
  const [manualObs, setManualObs] = useState('');
  const [manualQuery, setManualQuery] = useState('');
  const [showManualSuggestions, setShowManualSuggestions] = useState(false);

  // Facturar pagos (Caja)
  const [selectedPedidos, setSelectedPedidos] = useState<number[]>([]);
  const [agruparPorMesa, setAgruparPorMesa] = useState(false);
  const [pagoSearch, setPagoSearch] = useState('');
  const [pagoTipo, setPagoTipo] = useState<'C' | 'X'>('C');
  const [pagoCliente, setPagoCliente] = useState('Consumidor Final');
  const [pagoCuit, setPagoCuit] = useState('99-99999999-9');
  const [pagoMedio, setPagoMedio] = useState<Factura['medio_pago']>('efectivo');
  const [pagoCondicionIva, setPagoCondicionIva] = useState(5);
  const [pagoQuery, setPagoQuery] = useState('');
  const [showPagoSuggestions, setShowPagoSuggestions] = useState(false);
  const [isEmitting, setIsEmitting] = useState(false);
  const [arcaStatus, setArcaStatus] = useState<ArcaStatus | null>(null);
  const [isTestingArca, setIsTestingArca] = useState(false);

  // Inspector Modal
  const [selectedFactura, setSelectedFactura] = useState<FacturaExtendida | null>(null);

  // Cargar facturas y clientes
  useEffect(() => {
    facturacionService.list()
      .then(data => setFacturas((data || DEFAULT_FACTURAS) as FacturaExtendida[]))
      .catch(() => {
        setFacturas(DEFAULT_FACTURAS);
        toast.warning('No se pudo conectar a Supabase. Mostrando archivo fiscal local.');
      });

    import('../services/clientesService')
      .then(({ clientesService }) => clientesService.list())
      .then(data => setClientes(data || []))
      .catch(err => console.error('Error cargando clientes:', err));

    getArcaStatus().then(status => {
      setArcaStatus(status);
      if (status.taxProfile === 'monotributo') {
        setManualTipo('C');
        setPagoTipo('C');
      }
    });
  }, []);

  const handleTestArca = async () => {
    setIsTestingArca(true);
    const result = await testArcaConnection();
    setArcaStatus(result.status);
    if (result.success) toast.success('Conexión fiscal con ARCA verificada.');
    else toast.error(`ARCA: ${result.error || 'no se pudo verificar la conexión.'}`);
    setIsTestingArca(false);
  };

  const pedidoTotal = (pedido: Pedido) => calculatePedidoTotal(pedido, productosMenu);

  const facturasActivas = facturas.filter(f => ['autorizado', 'observado'].includes(f.estado));
  const totalBruto = facturasActivas.reduce((acc, f) => acc + f.total, 0);
  const ivaTotal = facturasActivas.reduce((acc, f) => acc + f.iva_veintiuno, 0);
  const netoTotal = totalBruto - ivaTotal;
  const anuladas = facturas.filter(f => f.estado === 'nota_credito').length;

  // Analizar IDs de pedidos facturados (individuales y agrupados)
  const pedidosFacturadosIds = useMemo(() => {
    const ids = new Set<number>();
    facturas.forEach(f => {
      if (f.id_pedido) ids.add(f.id_pedido);
      if (f.observaciones) {
        const matches = f.observaciones.match(/#\d+/g);
        if (matches) {
          matches.forEach(m => ids.add(Number(m.replace('#', ''))));
        }
      }
    });
    return ids;
  }, [facturas]);

  // Pagos de caja pendientes de facturar
  const pagosPendientes = useMemo(() => {
    return pedidos
      .filter(p => p.estado_comanda !== 'entregado_cobrado' && p.estado_comanda !== 'cancelado')
      .filter(p => !pedidosFacturadosIds.has(p.id_pedido))
      .map(p => ({ pedido: p, total: pedidoTotal(p) }))
      .filter(p => p.total > 0);
  }, [pedidos, productosMenu, pedidosFacturadosIds]);

  // Filtrado de pendientes
  const filteredPendientes = useMemo(() => {
    const term = pagoSearch.trim().toLowerCase();
    return pagosPendientes.filter(p => 
      !term || 
      p.pedido.numero_mesa.toLowerCase().includes(term) ||
      p.pedido.mozo.toLowerCase().includes(term) ||
      p.pedido.id_pedido.toString().includes(term) ||
      p.pedido.items.some(i => i.nombre.toLowerCase().includes(term))
    );
  }, [pagosPendientes, pagoSearch]);

  // Agrupamiento por Mesa de pendientes
  const pendientesAgrupadosPorMesa = useMemo(() => {
    const groups: Record<string, { mesa: string; pedidos: typeof pagosPendientes; total: number }> = {};
    pagosPendientes.forEach(p => {
      const mesa = p.pedido.numero_mesa;
      if (!groups[mesa]) {
        groups[mesa] = { mesa, pedidos: [], total: 0 };
      }
      groups[mesa].pedidos.push(p);
      groups[mesa].total += p.total;
    });
    return Object.values(groups).sort((a, b) => a.mesa.localeCompare(b.mesa));
  }, [pagosPendientes]);

  // Filtrar facturas en el Archivo Fiscal
  const filteredFacturas = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return facturas.filter(f => {
      const tipo = facturaTipo(f);
      const matchesSearch = !term
        || f.cliente.toLowerCase().includes(term)
        || f.cuit.toLowerCase().includes(term)
        || f.nro_ticket.toLowerCase().includes(term)
        || f.medio_pago.toLowerCase().includes(term);
      const matchesTipo = tipoFiltro === 'todos' || tipo === tipoFiltro;
      const matchesEstado = estadoFiltro === 'todos' || f.estado === estadoFiltro;
      const matchesMedio = medioFiltro === 'todos' || f.medio_pago === medioFiltro;
      return matchesSearch && matchesTipo && matchesEstado && matchesMedio;
    });
  }, [facturas, debouncedSearch, tipoFiltro, estadoFiltro, medioFiltro]);

  // Sugerencias de Clientes al escribir nombre
  const manualSuggestions = useMemo(() => {
    if (!manualQuery.trim()) return [];
    return clientes.filter(c => 
      c.nombre.toLowerCase().includes(manualQuery.toLowerCase()) || 
      c.dni_cuit.includes(manualQuery)
    ).slice(0, 5);
  }, [manualQuery, clientes]);

  const pagoSuggestions = useMemo(() => {
    if (!pagoQuery.trim()) return [];
    return clientes.filter(c => 
      c.nombre.toLowerCase().includes(pagoQuery.toLowerCase()) || 
      c.dni_cuit.includes(pagoQuery)
    ).slice(0, 5);
  }, [pagoQuery, clientes]);

  // Validación de CUIT para alertas visuales
  const cuitManualValido = useMemo(() => {
    if (manualTipo === 'X') return true;
    try {
      parseFiscalCustomerDocument(manualCuit);
      return true;
    } catch {
      return false;
    }
  }, [manualCuit, manualTipo]);

  const cuitPagoValido = useMemo(() => {
    if (pagoTipo === 'X') return true;
    try {
      parseFiscalCustomerDocument(pagoCuit);
      return true;
    } catch {
      return false;
    }
  }, [pagoCuit, pagoTipo]);

  const validateClienteFiscal = (tipo: 'ticket' | 'A' | 'B' | 'C' | 'X', cliente: string, cuit: string) => {
    if (tipo === 'X' || tipo === 'ticket') return true;
    try {
      parseFiscalCustomerDocument(cuit);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'El documento del cliente no es válido.');
      return false;
    }
  };

  const persistFactura = async (factura: FacturaExtendida) => {
    setFacturas(prev => [factura, ...prev]);
    try {
      await facturacionService.create(factura);
      toast.success(`Comprobante ${factura.nro_ticket} registrado exitosamente.`);
    } catch (err) {
      console.warn('Factura persistida localmente:', err);
      toast.warning(`Comprobante guardado en caché local.`);
    }
  };

  // Emitir manual
  const emitManual = async () => {
    if (isEmitting) return;
    const total = Number(manualTotal);
    if (!Number.isFinite(total) || total <= 0) {
      toast.error('El total debe ser mayor a 0.');
      return;
    }
    if (!validateClienteFiscal(manualTipo, manualCliente, manualCuit)) return;

    setIsEmitting(true);
    try {
      const { iva } = calcIvaIncluido(total, false);
      const factura: FacturaExtendida = {
        id_factura: `fac_${Date.now()}`,
        nro_ticket: nextNumber(facturas, manualTipo, arcaStatus?.puntoVenta),
        cliente: manualCliente.trim() || 'Consumidor Final',
        cuit: manualCuit.trim() || '99-99999999-9',
        total,
        iva_veintiuno: iva,
        medio_pago: manualMedio,
        fecha: `${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs`,
        estado: 'borrador',
        tipo: manualTipo,
        id_pedido: null,
        observaciones: manualObs || 'Venta de salón / Varios manual',
        fecha_completa: new Date().toISOString(),
        condicion_iva_receptor: manualCondicionIva,
      };
      
      if (manualTipo === 'C') {
        const arcaResult = await emitToArca(factura);
        factura.afip_cae = arcaResult.CAE;
        factura.afip_vto = arcaResult.CAEFchVto;
        factura.afip_qr = arcaResult.qrData;
        factura.afip_resultado = arcaResult.resultado as 'A' | 'O';
        factura.arca_emission_id = arcaResult.emissionId;
        factura.afip_cbte_tipo = arcaResult.tipoComprobante;
        factura.afip_pto_vta = arcaResult.puntoVenta;
        factura.afip_cbte_nro = arcaResult.nroCmp;
        factura.afip_observaciones = arcaResult.observaciones || [];
        factura.arca_emisor = arcaResult.emitter;
        factura.estado = arcaResult.resultado === 'O' ? 'observado' : 'autorizado';
      }

      await persistFactura(factura);
      await downloadFacturaPdf(factura);
      addLog('sistema', `FACTURACION: Emisión manual ${factura.nro_ticket} por ${money(total)}. Medio: ${medioLabel(manualMedio)}.`);
      
      // Resetear campos
      setManualTotal('0');
      setManualObs('');
      setManualQuery('');
      setManualCliente('Consumidor Final');
      setManualCuit('99-99999999-9');
      setActiveTab('archivo');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'No se pudo emitir el comprobante.');
    } finally {
      setIsEmitting(false);
    }
  };

  // Emitir desde pagos (Soporte Consolidated/Batch)
  const emitFromSelectedPedidos = async () => {
    if (isEmitting) return;
    if (selectedPedidos.length === 0) {
      toast.error('Por favor, selecciona al menos un pedido.');
      return;
    }
    if (!validateClienteFiscal(pagoTipo, pagoCliente, pagoCuit)) return;

    setIsEmitting(true);
    try {
      const selectedItems = pagosPendientes.filter(p => selectedPedidos.includes(p.pedido.id_pedido));
      const totalConsolidado = selectedItems.reduce((acc, p) => acc + p.total, 0);
      const principalPedido = selectedItems[0].pedido;

      // Consolidar platos/items
      const mergedItemsMap: Record<string, { id_producto: string; nombre: string; cantidad: number; precio_unitario: number }> = {};
      selectedItems.forEach(p => {
        p.pedido.items.forEach(item => {
          const precio = resolvePedidoItemUnitPrice(item, productosMenu);
          if (mergedItemsMap[item.id_producto]) {
            mergedItemsMap[item.id_producto].cantidad += item.cantidad;
          } else {
            mergedItemsMap[item.id_producto] = {
              id_producto: item.id_producto,
              nombre: item.nombre,
              cantidad: item.cantidad,
              precio_unitario: precio
            };
          }
        });
      });

      const { iva } = calcIvaIncluido(totalConsolidado, pagoTipo !== 'C' && pagoTipo !== 'X');
      const prefixIdsStr = selectedItems.map(p => `#${p.pedido.id_pedido}`).join(', ');
      
      const factura: FacturaExtendida = {
        id_factura: `fac_${Date.now()}`,
        nro_ticket: nextNumber(facturas, pagoTipo, arcaStatus?.puntoVenta),
        cliente: pagoCliente.trim() || 'Consumidor Final',
        cuit: pagoCuit.trim() || '99-99999999-9',
        total: totalConsolidado,
        iva_veintiuno: iva,
        medio_pago: pagoMedio,
        fecha: `${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs`,
        estado: 'borrador',
        tipo: pagoTipo,
        id_pedido: principalPedido.id_pedido,
        observaciones: `Pedidos agrupados: ${prefixIdsStr} - Mesas: ${Array.from(new Set(selectedItems.map(p => p.pedido.numero_mesa))).join(', ')}`,
        fecha_completa: new Date().toISOString(),
        condicion_iva_receptor: pagoCondicionIva,
      };

      if (pagoTipo === 'C') {
        const arcaResult = await emitToArca(factura);
        factura.afip_cae = arcaResult.CAE;
        factura.afip_vto = arcaResult.CAEFchVto;
        factura.afip_qr = arcaResult.qrData;
        factura.afip_resultado = arcaResult.resultado as 'A' | 'O';
        factura.arca_emission_id = arcaResult.emissionId;
        factura.afip_cbte_tipo = arcaResult.tipoComprobante;
        factura.afip_pto_vta = arcaResult.puntoVenta;
        factura.afip_cbte_nro = arcaResult.nroCmp;
        factura.afip_observaciones = arcaResult.observaciones || [];
        factura.arca_emisor = arcaResult.emitter;
        factura.estado = arcaResult.resultado === 'O' ? 'observado' : 'autorizado';
      }

      // Preparar ítems para PDF
      const formattedItems = Object.values(mergedItemsMap).map(item => ({
        cantidad: item.cantidad,
        descripcion: item.nombre,
        precio_unitario: item.precio_unitario,
        subtotal: item.precio_unitario * item.cantidad
      }));

      // Emisión de PDF
      const ticketData: TicketData = {
        idPedido: principalPedido.id_pedido,
        nroComprobante: factura.nro_ticket,
        tipoComprobante: tipoToComprobante(pagoTipo),
        fechaHora: factura.fecha,
        mesa: Array.from(new Set(selectedItems.map(p => p.pedido.numero_mesa))).join(', '),
        mozo: Array.from(new Set(selectedItems.map(p => p.pedido.mozo))).join(', '),
        cajero: 'Caja Principal',
        nombreComercial: factura.arca_emisor?.tradeName || DEFAULT_RESTAURANT_PROFILE.nombreComercial,
        razonSocial: factura.arca_emisor?.legalName || DEFAULT_RESTAURANT_PROFILE.razonSocial,
        cuit: factura.arca_emisor?.cuit || DEFAULT_RESTAURANT_PROFILE.cuit,
        direccion: factura.arca_emisor?.commercialAddress || DEFAULT_RESTAURANT_PROFILE.direccion,
        telefono: DEFAULT_RESTAURANT_PROFILE.telefono,
        email: DEFAULT_RESTAURANT_PROFILE.email,
        ingresosBrutos: factura.arca_emisor?.grossIncomeNumber,
        inicioActividades: factura.arca_emisor?.activityStartDate,
        condicionIvaEmisor: 'Monotributo',
        condicionIvaReceptor: CONDICIONES_IVA_RECEPTOR.find(condition => condition.id === factura.condicion_iva_receptor)?.label,
        items: formattedItems,
        subtotal: totalConsolidado - iva,
        descuento: 0,
        propina: 0,
        iva,
        total: totalConsolidado,
        metodosPago: [{ metodo: medioLabel(pagoMedio), monto: totalConsolidado }],
        vuelto: 0,
        mensajePie: 'Gracias por elegir El Patrón. Comprobante de cuenta unificada.',
        clienteNombre: factura.cliente,
        clienteCuit: factura.cuit,
        cae: factura.afip_cae,
        vto: factura.afip_vto,
        qrData: factura.afip_qr
      };

      await pdfService.exportToPDF(ticketData);
      await persistFactura(factura);
      
      addLog('sistema', `FACTURACION: Pedidos [${prefixIdsStr}] unificados y facturados en ${factura.nro_ticket} por ${money(totalConsolidado)}.`);
      
      setSelectedPedidos([]);
      setPagoQuery('');
      setPagoCliente('Consumidor Final');
      setPagoCuit('99-99999999-9');
      setActiveTab('archivo');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error al emitir el comprobante unificado.');
    } finally {
      setIsEmitting(false);
    }
  };

  const handleNotaCredito = async (id: string) => {
    const original = facturas.find(f => f.id_factura === id);
    if (!original?.arca_emission_id || !original.afip_cae || !['autorizado', 'observado'].includes(original.estado)) {
      toast.error('Solo puede emitirse una Nota de Crédito sobre una Factura C autorizada por ARCA.');
      return;
    }
    if (!window.confirm(`Se emitirá una Nota de Crédito C real por ${money(original.total)} asociada a ${original.nro_ticket}. Esta operación fiscal no se puede deshacer. ¿Continuar?`)) return;
    setIsEmitting(true);
    try {
      const result = await createArcaCreditNote(original.arca_emission_id, `nc:${original.arca_emission_id}`);
      if (!result.success || !result.CAE || !result.nroCmp || !result.puntoVenta) throw new Error(result.error || 'ARCA no autorizó la Nota de Crédito C.');
      const note: FacturaExtendida = {
        ...original,
        id_factura: `nc_${result.emissionId || Date.now()}`,
        nro_ticket: `NC-${String(result.puntoVenta).padStart(4, '0')}-${String(result.nroCmp).padStart(8, '0')}`,
        tipo: 'NC',
        estado: 'nota_credito',
        fecha: `${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs`,
        fecha_completa: new Date().toISOString(),
        afip_cae: result.CAE,
        afip_vto: result.CAEFchVto,
        afip_qr: result.qrData,
        afip_resultado: result.resultado as 'A' | 'O',
        arca_emission_id: result.emissionId,
        afip_cbte_tipo: result.tipoComprobante,
        afip_pto_vta: result.puntoVenta,
        afip_cbte_nro: result.nroCmp,
        afip_observaciones: result.observaciones || [],
        arca_emisor: result.emitter,
        observaciones: `Nota de Crédito C asociada a ${original.nro_ticket}`,
      };
      await facturacionService.create(note);
      await facturacionService.markNotaCredito(original.id_factura);
      setFacturas(prev => [note, ...prev.map(f => f.id_factura === id ? { ...f, estado: 'nota_credito' as const } : f)]);
      setSelectedFactura(previous => previous?.id_factura === id ? { ...previous, estado: 'nota_credito' } : previous);
      await downloadFacturaPdf(note);
      addLog('sistema', `ARCA: Nota de Crédito C ${note.nro_ticket} autorizada con CAE ${result.CAE}, asociada a ${original.nro_ticket}.`);
      toast.success(`Nota de Crédito C ${note.nro_ticket} autorizada por ARCA.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo emitir la Nota de Crédito C.');
    } finally {
      setIsEmitting(false);
    }
  };

  const tipoToComprobante = (tipo: 'ticket' | 'A' | 'B' | 'C' | 'NC' | 'X'): TipoComprobante => {
    if (tipo === 'A') return 'factura_a';
    if (tipo === 'B') return 'factura_b';
    if (tipo === 'C') return 'factura_c';
    if (tipo === 'NC') return 'nota_credito_c';
    return 'ticket_consumo';
  };

  const emitToArca = async (factura: FacturaExtendida): Promise<ArcaInvoiceResult> => {
    const currentStatus = await getArcaStatus();
    setArcaStatus(currentStatus);
    if (!currentStatus.configured) throw new Error('ARCA no esta configurado. Cargue certificado y clave desde Sistema.');
    if (!currentStatus.legalDataComplete) throw new Error('Complete los datos legales del emisor en Sistema antes de facturar.');
    try {
      const tipoId = 11;
      
      const { neto, iva } = calcIvaIncluido(factura.total, factura.tipo !== 'C');
      const document = parseFiscalCustomerDocument(factura.cuit);

      const result = await createArcaInvoice({
        idempotencyKey: factura.id_factura,
        tipoComprobante: tipoId,
        puntoVenta: currentStatus.puntoVenta || undefined,
        cliente: {
          tipoDoc: document.documentType,
          nroDoc: document.documentNumber,
          nombre: factura.cliente,
          condicionIva: factura.condicion_iva_receptor || 5,
        },
        items: [{
          descripcion: `Venta Gastronómica según ${factura.nro_ticket}`,
          cantidad: 1,
          precioUnitario: factura.total,
          ivaId: 5,
          ivaBase: neto,
          ivaImporte: iva,
        }],
        total: factura.total,
        neto,
        ivaTotal: iva,
      });

      const cae = result?.CodAutorizacion || result?.CAE || '';
      const vto = result?.Vencimiento || result?.CAEFchVto || '';

      if (cae) {
        if (result.nroCmp && result.puntoVenta) {
          factura.nro_ticket = `${tipoPrefix(factura.tipo || 'ticket')}-${String(result.puntoVenta).padStart(4, '0')}-${String(result.nroCmp).padStart(8, '0')}`;
        }
        setArcaStatus({ ...currentStatus, connected: true, message: 'Última emisión autorizada correctamente.' });
        addLog('sistema', `ARCA: Comprobante electrónico autorizado. CAE: ${cae}`);
        return result;
      }
      throw new Error(result.error || 'ARCA rechazo el comprobante.');
    } catch (err: any) {
      console.error('[ARCA] Error:', err);
      setArcaStatus({ ...currentStatus, connected: false, message: err?.message || 'Error de conexión fiscal.' });
      throw err;
    }
  };

  const downloadFacturaPdf = async (factura: FacturaExtendida, pedido?: Pedido) => {
    const tipo = facturaTipo(factura);
    const { neto, iva } = calcIvaIncluido(factura.total, factura.iva_veintiuno > 0);
    
    let ticketItems = [];
    if (pedido && pedido.items.length > 0) {
      ticketItems = pedido.items.map(item => {
        const unit = resolvePedidoItemUnitPrice(item, productosMenu);
        return {
          cantidad: item.cantidad,
          descripcion: item.nombre,
          precio_unitario: unit,
          subtotal: unit * item.cantidad
        };
      });
    } else {
      ticketItems = [{
        cantidad: 1,
        descripcion: factura.observaciones || 'Venta Gastronómica Comercial',
        precio_unitario: neto,
        subtotal: neto
      }];
    }

    const ticketData: TicketData = {
      idPedido: factura.id_pedido || pedido?.id_pedido || 0,
      nroComprobante: factura.nro_ticket,
      tipoComprobante: tipoToComprobante(tipo),
      fechaHora: factura.fecha,
      mesa: pedido?.numero_mesa || 'Venta Directa',
      mozo: pedido?.mozo || 'Caja Central',
      cajero: 'Administración',
      nombreComercial: factura.arca_emisor?.tradeName || DEFAULT_RESTAURANT_PROFILE.nombreComercial,
      razonSocial: factura.arca_emisor?.legalName || DEFAULT_RESTAURANT_PROFILE.razonSocial,
      cuit: factura.arca_emisor?.cuit || DEFAULT_RESTAURANT_PROFILE.cuit,
      direccion: factura.arca_emisor?.commercialAddress || DEFAULT_RESTAURANT_PROFILE.direccion,
      telefono: DEFAULT_RESTAURANT_PROFILE.telefono,
      email: DEFAULT_RESTAURANT_PROFILE.email,
      ingresosBrutos: factura.arca_emisor?.grossIncomeNumber,
      inicioActividades: factura.arca_emisor?.activityStartDate,
      condicionIvaEmisor: 'Monotributo',
      condicionIvaReceptor: CONDICIONES_IVA_RECEPTOR.find(condition => condition.id === factura.condicion_iva_receptor)?.label,
      items: ticketItems,
      subtotal: neto,
      descuento: 0,
      propina: 0,
      iva,
      total: factura.total,
      metodosPago: [{ metodo: medioLabel(factura.medio_pago), monto: factura.total }],
      vuelto: 0,
      mensajePie: factura.afip_cae
        ? 'Gracias por su visita. Comprobante electrónico autorizado por ARCA.'
        : 'DOCUMENTO NO VALIDO COMO FACTURA.',
      clienteNombre: factura.cliente,
      clienteCuit: factura.cuit,
      cae: factura.afip_cae,
      vto: factura.afip_vto,
      qrData: factura.afip_qr
    };

    await pdfService.exportToPDF(ticketData);
  };

  // Formateo Avanzado de jsPDF para Libro IVA Ventas
  const downloadLibroIva = async () => {
    const reportRows = filteredFacturas.filter(factura =>
      Boolean(factura.afip_cae) && ['C', 'NC'].includes(facturaTipo(factura)),
    );
    if (reportRows.length === 0) {
      toast.warning('No hay comprobantes ARCA autorizados en el filtro actual para exportar.');
      return;
    }
    const reportTotal = reportRows.reduce(
      (sum, factura) => sum + (facturaTipo(factura) === 'NC' ? -factura.total : factura.total),
      0,
    );
    const emitter = reportRows.find(factura => factura.arca_emisor)?.arca_emisor;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Configuración estética
    const primaryColor = [98, 74, 62]; // Marrón El Patrón
    const textColor = [51, 51, 51];
    const lightGrey = [245, 245, 245];
    
    // Header Corporativo
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 38, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('EL PATRÓN RESTAURANTE', 14, 18);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`${emitter?.legalName || DEFAULT_RESTAURANT_PROFILE.razonSocial} | CUIT: ${emitter?.cuit || DEFAULT_RESTAURANT_PROFILE.cuit}`, 14, 25);
    doc.text(emitter?.commercialAddress || DEFAULT_RESTAURANT_PROFILE.direccion, 14, 30);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('LIBRO IVA VENTAS', 196, 22, { align: 'right' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}`, 196, 29, { align: 'right' });
    
    // Resumen Contable a 3 Columnas
    doc.setFillColor(lightGrey[0], lightGrey[1], lightGrey[2]);
    doc.roundedRect(14, 44, 182, 22, 3, 3, 'FD');
    
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL COMPROBANTES ARCA', 20, 52);
    doc.text('FACTURAS C / NC C', 80, 52);
    doc.text('IVA DISCRIMINADO', 140, 52);
    
    doc.setFontSize(13);
    doc.text(money(reportTotal), 20, 60);
    doc.text(String(reportRows.length), 80, 60);
    doc.text('$0,00 (Monotributo)', 140, 60);
    
    // Tabla de comprobantes
    let y = 78;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Historial de Comprobantes Fiscales Emitidos', 14, y);
    
    y += 6;
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(14, y, 182, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('Fecha', 16, y + 5.5);
    doc.text('Comprobante', 38, y + 5.5);
    doc.text('Cliente', 85, y + 5.5);
    doc.text('Medio Pago', 135, y + 5.5);
    doc.text('Total', 194, y + 5.5, { align: 'right' });
    
    y += 8;
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'normal');
    
    reportRows.forEach((f, index) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
        
        // Cabecera simplificada para hojas siguientes
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(14, y, 182, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('Fecha', 16, y + 5.5);
        doc.text('Comprobante', 38, y + 5.5);
        doc.text('Cliente', 85, y + 5.5);
        doc.text('Medio Pago', 135, y + 5.5);
        doc.text('Total', 194, y + 5.5, { align: 'right' });
        y += 8;
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFont('helvetica', 'normal');
      }
      
      // Fondo cebra
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(14, y, 182, 7, 'F');
      }
      
      const fechaCorta = f.fecha_completa ? new Date(f.fecha_completa).toLocaleDateString('es-AR') : f.fecha.slice(0, 10);
      doc.text(fechaCorta, 16, y + 5);
      doc.text(f.nro_ticket, 38, y + 5);
      doc.text(f.cliente.substring(0, 26), 85, y + 5);
      doc.text(medioLabel(f.medio_pago), 135, y + 5);
      
      if (f.estado === 'nota_credito') {
        doc.setTextColor(220, 38, 38);
        doc.text(`-${money(f.total)}`, 194, y + 5, { align: 'right' });
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      } else {
        doc.text(money(f.total), 194, y + 5, { align: 'right' });
      }
      
      y += 7;
    });
    
    doc.save(`libro_iva_ventas_${argentinaDateIso()}.pdf`);
  };

  const downloadCsv = () => {
    const header = ['comprobante', 'fecha', 'cliente', 'cuit', 'tipo', 'medio', 'estado', 'neto', 'iva', 'total'];
    const lines = filteredFacturas.map(f => {
      const { neto } = calcIvaIncluido(f.total, f.iva_veintiuno > 0);
      return [
        f.nro_ticket,
        f.fecha_completa ? new Date(f.fecha_completa).toLocaleString('es-AR') : f.fecha,
        f.cliente,
        f.cuit,
        facturaTipo(f),
        f.medio_pago,
        f.estado,
        neto.toFixed(2),
        f.iva_veintiuno.toFixed(2),
        f.total.toFixed(2)
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria_facturacion_${argentinaDateIso()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Datos para los gráficos SVG
  const chartData = useMemo(() => {
    // 1. Tendencia de 7 días
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return argentinaDateIso(d);
    });

    const dailyTotals = days.map(dayStr => {
      const total = facturasActivas
        .filter(f => {
          if (!f.fecha_completa) return false;
          return f.fecha_completa.startsWith(dayStr);
        })
        .reduce((sum, f) => sum + f.total, 0);
      
      const label = new Date(dayStr + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'narrow', day: 'numeric' });
      return { label, total };
    });

    // 2. Porcentaje por tipo de comprobante
    const typeCounts: Record<string, number> = { ticket: 0, A: 0, B: 0, C: 0, X: 0 };
    let totalTypeAmt = 0;
    facturasActivas.forEach(f => {
      const t = facturaTipo(f);
      typeCounts[t] = (typeCounts[t] || 0) + f.total;
      totalTypeAmt += f.total;
    });

    const typeDistribution = Object.keys(typeCounts).map(tipo => ({
      tipo,
      amount: typeCounts[tipo],
      percentage: totalTypeAmt > 0 ? (typeCounts[tipo] / totalTypeAmt) * 100 : 0
    }));

    // 3. Medios de pago
    const paymentMethods: Record<Factura['medio_pago'], number> = {
      efectivo: 0, debito: 0, tarjeta: 0, transferencia: 0, mp_qr: 0, mixto: 0
    };
    let totalPayAmt = 0;
    facturasActivas.forEach(f => {
      paymentMethods[f.medio_pago] = (paymentMethods[f.medio_pago] || 0) + f.total;
      totalPayAmt += f.total;
    });

    const paymentDistribution = Object.keys(paymentMethods).map(m => ({
      key: m as Factura['medio_pago'],
      label: medioLabel(m as Factura['medio_pago']),
      amount: paymentMethods[m as Factura['medio_pago']],
      percentage: totalPayAmt > 0 ? (paymentMethods[m as Factura['medio_pago']] / totalPayAmt) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);

    return { dailyTotals, typeDistribution, paymentDistribution };
  }, [facturasActivas]);

  // Selección de sugerencia de cliente (manual)
  const selectManualCliente = (c: any) => {
    setManualCliente(c.nombre);
    setManualCuit(c.dni_cuit);
    setManualQuery(c.nombre);
    setShowManualSuggestions(false);
    toast.success(`Cliente ${c.nombre} cargado.`);
  };

  // Selección de sugerencia de cliente (caja)
  const selectPagoCliente = (c: any) => {
    setPagoCliente(c.nombre);
    setPagoCuit(c.dni_cuit);
    setPagoQuery(c.nombre);
    setShowPagoSuggestions(false);
    toast.success(`Cliente ${c.nombre} cargado.`);
  };

  // Cambiar selección de checkboxes en pendientes
  const handleSelectPending = (id: number) => {
    setSelectedPedidos(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleSelectAllPending = () => {
    if (selectedPedidos.length === filteredPendientes.length) {
      setSelectedPedidos([]);
    } else {
      setSelectedPedidos(filteredPendientes.map(p => p.pedido.id_pedido));
    }
  };

  // Seleccionar mesa completa (agrupado)
  const handleSelectMesa = (pedidosMesa: typeof pagosPendientes, select: boolean) => {
    const idsMesa = pedidosMesa.map(p => p.pedido.id_pedido);
    if (select) {
      setSelectedPedidos(prev => Array.from(new Set([...prev, ...idsMesa])));
    } else {
      setSelectedPedidos(prev => prev.filter(id => !idsMesa.includes(id)));
    }
  };

  const isMesaSelected = (pedidosMesa: typeof pagosPendientes) => {
    return pedidosMesa.every(p => selectedPedidos.includes(p.pedido.id_pedido));
  };

  const isMesaPartiallySelected = (pedidosMesa: typeof pagosPendientes) => {
    const count = pedidosMesa.filter(p => selectedPedidos.includes(p.pedido.id_pedido)).length;
    return count > 0 && count < pedidosMesa.length;
  };

  const selectedTotal = useMemo(() => {
    return pagosPendientes
      .filter(p => selectedPedidos.includes(p.pedido.id_pedido))
      .reduce((sum, p) => sum + p.total, 0);
  }, [selectedPedidos, pagosPendientes]);

  const MetricCard = ({ label, value, tone = 'stone', icon: Icon }: { label: string; value: string; tone?: 'stone' | 'green' | 'brown' | 'rose', icon?: any }) => (
    <div className={`bg-white dark:bg-stone-900 p-5 rounded-2xl border shadow-xs transition-all duration-300 hover:shadow-md ${
      tone === 'green' ? 'border-l-4 border-l-emerald-600 border-stone-200' : 
      tone === 'rose' ? 'border-l-4 border-l-rose-500 border-stone-200' : 
      tone === 'brown' ? 'border-l-4 border-l-[#624A3E] border-stone-200' : 
      'border-stone-200 dark:border-stone-800'
    } flex items-center justify-between`}>
      <div className="text-left space-y-1">
        <span className="text-[10px] text-stone-400 dark:text-stone-300 font-bold uppercase tracking-wider block">{label}</span>
        <h4 className={`text-2xl font-black font-mono tracking-tight ${
          tone === 'green' ? 'text-emerald-600 dark:text-emerald-400' : 
          tone === 'brown' ? 'text-[#624A3E] dark:text-[#C8956A]' : 
          tone === 'rose' ? 'text-rose-600' : 
          'text-stone-900 dark:text-white'
        }`}>{value}</h4>
      </div>
      {Icon && (
        <div className={`p-3 rounded-xl ${
          tone === 'green' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' : 
          tone === 'brown' ? 'bg-[#624A3E]/10 text-[#624A3E] dark:text-[#C8956A]' : 
          tone === 'rose' ? 'bg-rose-50 text-rose-500' : 
          'bg-stone-50 dark:bg-stone-850 text-stone-400'
        }`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ARCA/AFIP Status Visualizer */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col sm:flex-row items-center gap-4 justify-between transition-all">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${
            arcaStatus?.connected
              ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
              : 'bg-amber-50 border-amber-100 text-amber-500'
          }`}>
            <ScanLine className={`w-5 h-5 ${arcaStatus?.connected ? 'animate-pulse' : ''}`} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
              Conexión Fiscal Electrónica (ARCA / AFIP)
              <span className={`w-2 h-2 rounded-full ${arcaStatus?.connected ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-300 mt-0.5">
              {arcaStatus?.configured
                ? `${arcaStatus.connected ? 'Operativo' : 'Configurado, pendiente de prueba'} - ${arcaStatus.environment === 'produccion' ? 'Producción' : 'Homologación'} (Pto Vta: ${String(arcaStatus.puntoVenta || 1).padStart(4, '0')} - CUIT: ${arcaStatus.cuitMasked})`
                : `${arcaStatus?.message || 'Firma digital no configurada.'} La emisión fiscal queda bloqueada; el comprobante X sigue disponible como documento interno.`
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {arcaStatus?.configured && (
            <button
              type="button"
              onClick={handleTestArca}
              disabled={isTestingArca}
              className="text-[10px] uppercase font-black px-3 py-1 rounded-full border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-50"
            >
              {isTestingArca ? 'Probando…' : 'Probar conexión'}
            </button>
          )}
          {arcaStatus?.connected ? (
            <span className="text-[10px] uppercase font-black px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-100 dark:border-emerald-900/50">
              Conectado
            </span>
          ) : (
            <span className="text-[10px] uppercase font-black px-3 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 rounded-full border border-amber-100 dark:border-amber-900/50">
              {arcaStatus?.configured ? 'Sin verificar' : 'No configurado'}
            </span>
          )}
        </div>
      </div>

      <div className="bg-sky-50 border border-sky-200 text-sky-900 rounded-2xl px-4 py-3 flex items-start gap-3" role="note">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <p className="text-[11px] font-semibold leading-relaxed">
          El emisor está configurado como monotributista: ARCA habilita Factura C. Factura A y Factura B se muestran como referencia, pero permanecen bloqueadas para evitar una emisión fiscal incompatible. El comprobante X es solo interno y no contiene CAE.
        </p>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <MetricCard label="Ventas autorizadas" value={money(netoTotal)} tone="stone" icon={CalendarDays} />
        <MetricCard label="IVA discriminado" value={money(ivaTotal)} tone="brown" icon={Receipt} />
        <MetricCard label="Total facturado" value={money(totalBruto)} tone="green" icon={TrendingUp} />
        <MetricCard label="Cuentas Pendientes" value={String(pagosPendientes.length)} tone={pagosPendientes.length ? 'rose' : 'stone'} icon={CreditCard} />
      </div>

      {/* Tabs de Navegación */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs p-2 flex flex-wrap gap-2">
        {[
          ['dashboard', 'Analíticas y Reportes', TrendingUp],
          ['manual', 'Emitir Comprobante Manual', Plus],
          ['pagos', 'Facturar Pendientes', CreditCard],
          ['archivo', 'Archivo Fiscal', Receipt]
        ].map(([key, label, Icon]) => {
          const ActiveIcon = Icon as typeof Receipt;
          return (
            <button
              key={key as string}
              onClick={() => setActiveTab(key as TabKey)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all ${
                activeTab === key 
                  ? 'bg-[#624A3E] text-white shadow-sm' 
                  : 'bg-stone-50 dark:bg-stone-850 text-stone-605 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              <ActiveIcon className="w-4 h-4" />
              {label as string}
            </button>
          );
        })}
      </div>

      {/* 1. TAB: DASHBOARD (Analíticas SVG) */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* Gráfico 7 Días */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-stone-400 dark:text-stone-300">Ventas - Últimos 7 Días</h3>
              <TrendingUp className="w-4 h-4 text-[#624A3E]" />
            </div>
            
            <div className="h-64 w-full relative flex items-end">
              {/* Gráfico SVG nativo */}
              <svg className="w-full h-full" viewBox="0 0 500 220">
                {/* Líneas horizontales de guía */}
                <line x1="40" y1="30" x2="480" y2="30" stroke="#f1f1f0" strokeWidth="1" strokeDasharray="3" />
                <line x1="40" y1="90" x2="480" y2="90" stroke="#f1f1f0" strokeWidth="1" strokeDasharray="3" />
                <line x1="40" y1="150" x2="480" y2="150" stroke="#f1f1f0" strokeWidth="1" strokeDasharray="3" />
                <line x1="40" y1="200" x2="480" y2="200" stroke="#d6d6d4" strokeWidth="1" />

                {/* Etiquetas de valores Y */}
                <text x="30" y="34" fontSize="8" textAnchor="end" fill="#999" fontFamily="monospace">
                  {money(Math.max(...chartData.dailyTotals.map(d => d.total), 100000) * 0.8)}
                </text>
                <text x="30" y="94" fontSize="8" textAnchor="end" fill="#999" fontFamily="monospace">
                  {money(Math.max(...chartData.dailyTotals.map(d => d.total), 100000) * 0.5)}
                </text>
                <text x="30" y="154" fontSize="8" textAnchor="end" fill="#999" fontFamily="monospace">
                  {money(Math.max(...chartData.dailyTotals.map(d => d.total), 100000) * 0.2)}
                </text>
                <text x="30" y="204" fontSize="8" textAnchor="end" fill="#999" fontFamily="monospace">$0</text>

                {/* Generar puntos de la curva */}
                {(() => {
                  const maxVal = Math.max(...chartData.dailyTotals.map(d => d.total), 1);
                  const points = chartData.dailyTotals.map((d, index) => {
                    const x = 50 + (index * 70);
                    // Mapeo inverso de Y (el origen 0 está arriba en SVG)
                    // Altura disponible = 170 (entre y=30 y y=200)
                    const valRatio = d.total / maxVal;
                    const y = 200 - (valRatio * 160);
                    return { x, y, label: d.label, amount: d.total };
                  });

                  const pathD = points.reduce((path, p, i) => 
                    i === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`, ''
                  );

                  const areaD = points.length > 0 
                    ? `${pathD} L ${points[points.length - 1].x} 200 L ${points[0].x} 200 Z` 
                    : '';

                  return (
                    <>
                      {/* Área rellena bajo la línea */}
                      {areaD && <path d={areaD} fill="url(#gradient-sales)" opacity="0.15" />}
                      
                      {/* Línea principal */}
                      {pathD && <path d={pathD} fill="none" stroke="#624A3E" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />}
                      
                      {/* Puntos y valores flotantes */}
                      {points.map((p, i) => (
                        <g key={i} className="group/dot cursor-pointer">
                          <circle cx={p.x} cy={p.y} r="5" fill="#624A3E" stroke="#fff" strokeWidth="2.5" />
                          <circle cx={p.x} cy={p.y} r="10" fill="#624A3E" opacity="0" className="hover:opacity-10 transition-opacity" />
                          
                          {/* Label en X */}
                          <text x={p.x} y="215" fontSize="8" textAnchor="middle" fill="#666" fontWeight="bold">
                            {p.label}
                          </text>

                          {/* Valor encima del punto */}
                          <text x={p.x} y={p.y - 10} fontSize="7" textAnchor="middle" fill="#333" fontWeight="black" className="opacity-0 group-hover/dot:opacity-100 transition-opacity font-mono bg-white">
                            {money(p.amount)}
                          </text>
                        </g>
                      ))}

                      {/* Definiciones de gradientes */}
                      <defs>
                        <linearGradient id="gradient-sales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#624A3E" />
                          <stop offset="100%" stopColor="#624A3E" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* Gráfico Tipo Comprobante */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-stone-400 dark:text-stone-300">Distribución de Comprobantes</h3>
                <PieChart className="w-4 h-4 text-[#624A3E]" />
              </div>
              <p className="text-[11px] text-stone-500">Monto total y porcentaje de facturación según tipo fiscal.</p>
            </div>

            {/* Barra apilada interactiva en SVG */}
            <div className="space-y-4">
              <div className="w-full h-8 rounded-xl overflow-hidden flex border border-stone-100">
                {chartData.typeDistribution.map((d, index) => {
                  const colors = ['bg-[#624A3E]', 'bg-[#8F7264]', 'bg-[#C8956A]', 'bg-stone-300'];
                  if (d.percentage === 0) return null;
                  return (
                    <div 
                      key={d.tipo} 
                      className={`${colors[index % colors.length]} h-full relative group`} 
                      style={{ width: `${d.percentage}%` }}
                      title={`${d.tipo === 'ticket' ? 'Ticket' : `Factura ${d.tipo}`}: ${money(d.amount)} (${d.percentage.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>

              <div className="space-y-2">
                {chartData.typeDistribution.map((d, index) => {
                  const textColors = ['text-[#624A3E]', 'text-[#8F7264]', 'text-[#C8956A]', 'text-stone-500'];
                  const dotColors = ['bg-[#624A3E]', 'bg-[#8F7264]', 'bg-[#C8956A]', 'bg-stone-300'];
                  return (
                    <div key={d.tipo} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${dotColors[index % dotColors.length]}`} />
                        <span className="font-extrabold uppercase text-stone-700 dark:text-stone-350">{d.tipo === 'ticket' ? 'Ticket Consumo' : `Factura ${d.tipo}`}</span>
                      </div>
                      <span className="font-mono font-bold text-stone-900 dark:text-white">
                        {money(d.amount)} <span className="text-[10px] text-stone-400 font-normal">({d.percentage.toFixed(1)}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Gráfico Medios de Pago */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs lg:col-span-3 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-stone-400 dark:text-stone-300">Recaudación por Medio de Pago</h3>
                <p className="text-[11px] text-stone-500 mt-1">Ranking de ingresos según la forma de cobro en caja.</p>
              </div>
              <BarChart3 className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chartData.paymentDistribution.map((p, index) => {
                const colors = ['bg-emerald-600', 'bg-sky-600', 'bg-indigo-600', 'bg-[#624A3E]', 'bg-amber-500', 'bg-purple-600'];
                return (
                  <div key={p.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-stone-750 dark:text-stone-200">{p.label}</span>
                      <span className="font-mono font-black text-stone-900 dark:text-white">
                        {money(p.amount)} <span className="text-[10px] text-stone-400 font-normal">({p.percentage.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                      <div 
                        className={`${colors[index % colors.length]} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${p.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. TAB: EMISION MANUAL (Autocomplete + CUIT Validation) */}
      {activeTab === 'manual' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs p-6 space-y-5 animate-fadeIn">
          <div>
            <h3 className="text-sm font-black text-stone-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#624A3E] dark:text-[#C8956A]" /> Emitir Comprobante Manual
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-300 font-semibold mt-1">Para ventas directas de mostrador, catering externo o ajustes manuales.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Tipo */}
            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-stone-400 dark:text-stone-300">Tipo de Comprobante</span>
              <select 
                value={manualTipo} 
                onChange={e => {
                  const val = e.target.value as 'C' | 'X';
                  setManualTipo(val);
                  setManualCliente('Consumidor Final');
                  setManualCuit('99-99999999-9');
                }} 
                className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-900 text-stone-700 dark:text-stone-200 text-xs font-bold"
              >
                {MONOTRIBUTO_INVOICE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Búsqueda Autocomplete de Clientes */}
            <div className="space-y-1.5 relative md:col-span-2 text-left">
              <span className="text-[10px] font-black uppercase text-stone-400 dark:text-stone-300">Razón Social / Cliente</span>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                <input 
                  type="text"
                  value={manualCliente} 
                  onChange={e => {
                    setManualCliente(e.target.value);
                    setManualQuery(e.target.value);
                    setShowManualSuggestions(true);
                  }}
                  onFocus={() => setShowManualSuggestions(true)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#624A3E]" 
                />
              </div>
              
              {/* Autocomplete Dropdown */}
              {showManualSuggestions && manualSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-lg z-20 overflow-hidden divide-y divide-stone-100 dark:divide-stone-850">
                  {manualSuggestions.map(c => (
                    <button
                      key={c.id_cliente}
                      type="button"
                      onClick={() => selectManualCliente(c)}
                      className="w-full text-left px-4 py-2 hover:bg-stone-50 dark:hover:bg-stone-850 text-xs flex justify-between items-center cursor-pointer"
                    >
                      <span className="font-bold text-stone-800 dark:text-stone-200">{c.nombre}</span>
                      <span className="text-[10px] font-mono text-stone-400">{c.dni_cuit}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* CUIT / DNI + Validador */}
            <label className="space-y-1.5 block text-left">
              <span className="text-[10px] font-black uppercase text-stone-400 dark:text-stone-300 flex items-center justify-between">
                CUIT / DNI
                {!cuitManualValido && (
                  <span className="text-[8px] text-amber-500 font-extrabold flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" /> Inválido
                  </span>
                )}
                {cuitManualValido && manualCuit !== '99-99999999-9' && (
                  <span className="text-[8px] text-emerald-600 font-extrabold flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" /> Válido ✓
                  </span>
                )}
              </span>
              <input 
                value={manualCuit} 
                onChange={e => setManualCuit(e.target.value)} 
                placeholder="20-38449102-1"
                className={`w-full p-2.5 rounded-xl border bg-stone-50/50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-xs font-mono font-bold ${
                  cuitManualValido ? 'border-stone-200 dark:border-stone-750' : 'border-amber-455 border-amber-500 ring-1 ring-amber-300/30'
                }`} 
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Medio de Pago */}
            <label className="space-y-1.5 block text-left">
              <span className="text-[10px] font-black uppercase text-stone-400 dark:text-stone-300">Medio de Pago</span>
              <select value={manualMedio} onChange={e => setManualMedio(e.target.value as Factura['medio_pago'])} className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-900 text-stone-700 dark:text-stone-200 text-xs font-bold">
                <option value="efectivo">Efectivo</option>
                <option value="debito">Tarjeta de Débito</option>
                <option value="tarjeta">Tarjeta de Crédito</option>
                <option value="transferencia">Transferencia Bancaria</option>
                <option value="mp_qr">QR MercadoPago</option>
                <option value="mixto">Mixto / Combinado</option>
              </select>
            </label>

            {/* Total */}
            <label className="space-y-1.5 block text-left">
              <span className="text-[10px] font-black uppercase text-stone-400 dark:text-stone-300">Total Final ($)</span>
              <input 
                type="number" 
                value={manualTotal} 
                onChange={e => setManualTotal(e.target.value)} 
                className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-xs font-mono font-black" 
              />
            </label>

            <label className="space-y-1.5 block text-left">
              <span className="text-[10px] font-black uppercase text-stone-400 dark:text-stone-300">Condicion IVA receptor</span>
              <select value={manualCondicionIva} onChange={e => setManualCondicionIva(Number(e.target.value))} className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-900 text-stone-700 dark:text-stone-200 text-xs font-bold">
                {CONDICIONES_IVA_RECEPTOR.map(condition => <option key={condition.id} value={condition.id}>{condition.label}</option>)}
              </select>
            </label>

            {/* Vista Previa */}
            <div className="p-3 bg-stone-50 dark:bg-stone-850 rounded-xl border border-stone-200 dark:border-stone-800 text-xs flex flex-col justify-between text-left">
              <div>
                <span className="text-[9px] uppercase font-black text-stone-400 dark:text-stone-300">Vista Previa de Comprobante</span>
                <p className="font-mono font-black text-stone-900 dark:text-white mt-1">{nextNumber(facturas, manualTipo, arcaStatus?.puntoVenta)}</p>
                {manualTipo === 'C' && (
                  <span className="text-[8px] font-bold text-stone-400">ARCA asigna el número definitivo al autorizar.</span>
                )}
              </div>
              <p className="text-stone-500 dark:text-stone-300 text-[10px] font-mono mt-1">
                IVA discriminado: {money(0)} | Total: {money(Number(manualTotal || 0))}
              </p>
            </div>
          </div>

          <textarea 
            value={manualObs} 
            onChange={e => setManualObs(e.target.value)} 
            placeholder="Observaciones adicionales, catering, forma de pago mixta detallada, etc..." 
            className="w-full h-20 p-3 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-xs" 
          />

          <div className="flex gap-2 justify-start">
            <button 
              disabled={isEmitting} 
              onClick={emitManual} 
              className="px-5 py-3 rounded-xl bg-[#624A3E] hover:bg-[#503C32] text-white text-xs font-black uppercase shadow disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              {isEmitting ? 'Emitiendo comprobante...' : 'Emitir y Descargar Factura PDF'}
            </button>
            {showManualSuggestions && (
              <button 
                type="button" 
                onClick={() => setShowManualSuggestions(false)} 
                className="px-4 py-2 text-stone-500 text-xs font-bold"
              >
                Cerrar Autocompletado
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. TAB: FACTURAR PAGOS PENDIENTES (Agrupación + Selección Lote) */}
      {activeTab === 'pagos' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs p-6 space-y-5 animate-fadeIn">
          
          {/* Cabecera / Buscador */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="text-left">
              <h3 className="text-sm font-black text-stone-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#624A3E] dark:text-[#C8956A]" /> Cobro y Facturación de Comandas
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-300 font-semibold mt-1">Factura pedidos individuales o fusiona comandas por lote / mesa en una sola cuenta.</p>
            </div>
            
            {/* Controles de Lote / Buscador */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar mesa, mozo, platos..."
                  value={pagoSearch}
                  onChange={e => setPagoSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-xs focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                />
              </div>

              {/* Toggle de Agrupamiento por Mesa */}
              <button
                onClick={() => {
                  setAgruparPorMesa(prev => !prev);
                  setSelectedPedidos([]);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all border cursor-pointer ${
                  agruparPorMesa 
                    ? 'bg-[#624A3E] text-white border-[#624A3E]' 
                    : 'bg-stone-50 dark:bg-stone-850 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:bg-stone-100'
                }`}
              >
                <Users className="w-4 h-4" />
                {agruparPorMesa ? 'Agrupado por Mesa (Fusión)' : 'Vista Individual'}
              </button>

              {/* Botón Seleccionar Todo */}
              {!agruparPorMesa && filteredPendientes.length > 0 && (
                <button
                  onClick={handleSelectAllPending}
                  className="px-3 py-2 rounded-xl text-xs font-bold border border-stone-200 dark:border-stone-850 bg-stone-50 hover:bg-stone-100 text-stone-700 cursor-pointer"
                >
                  {selectedPedidos.length === filteredPendientes.length ? 'Desmarcar Todo' : 'Seleccionar Todo'}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Listado de Pendientes (2 Columnas) */}
            <div className="lg:col-span-2 space-y-3 max-h-[500px] overflow-y-auto pr-1">
              
              {/* 3A. Modo Agrupado por Mesa */}
              {agruparPorMesa && (
                pendientesAgrupadosPorMesa.length === 0 ? (
                  <div className="p-8 text-center text-xs text-stone-400 border border-dashed rounded-2xl">
                    No hay mesas con comandas pendientes de facturación.
                  </div>
                ) : (
                  pendientesAgrupadosPorMesa.map(group => {
                    const selected = isMesaSelected(group.pedidos);
                    const partial = isMesaPartiallySelected(group.pedidos);
                    
                    return (
                      <div 
                        key={group.mesa}
                        onClick={() => handleSelectMesa(group.pedidos, !selected)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                          selected 
                            ? 'bg-[#624A3E]/5 border-[#624A3E]' 
                            : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-850 hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox"
                            checked={selected}
                            ref={el => {
                              if (el) el.indeterminate = partial;
                            }}
                            onChange={() => {}} // Se maneja en el click del card
                            className="w-4 h-4 accent-[#624A3E]"
                          />
                          <div className="text-left">
                            <span className="font-black text-sm text-stone-900 dark:text-white">{group.mesa}</span>
                            <span className="text-[10px] text-stone-400 block font-bold">
                              {group.pedidos.length} {group.pedidos.length === 1 ? 'pedido activo' : 'pedidos unificados'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-sm text-[#624A3E] dark:text-[#C8956A] block">{money(group.total)}</span>
                          <span className="text-[9px] text-stone-400 font-bold block">Consolidado</span>
                        </div>
                      </div>
                    );
                  })
                )
              )}

              {/* 3B. Modo Individual */}
              {!agruparPorMesa && (
                filteredPendientes.length === 0 ? (
                  <div className="p-8 text-center text-xs text-stone-400 border border-dashed rounded-2xl">
                    No se encontraron pagos pendientes para los filtros seleccionados.
                  </div>
                ) : (
                  filteredPendientes.map(({ pedido, total }) => {
                    const isSelected = selectedPedidos.includes(pedido.id_pedido);
                    
                    return (
                      <div
                        key={pedido.id_pedido}
                        onClick={() => handleSelectPending(pedido.id_pedido)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSelected 
                            ? 'bg-[#624A3E]/5 border-[#624A3E]' 
                            : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-850 hover:bg-stone-50/70'
                        }`}
                      >
                        <div className="flex items-start gap-3 text-left">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Controlado por el clic del div principal
                            className="w-4.5 h-4.5 accent-[#624A3E] mt-0.5 rounded cursor-pointer"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-stone-900 dark:text-white text-xs">Mesa: {pedido.numero_mesa}</span>
                              <span className="text-[9px] font-mono bg-stone-100 dark:bg-stone-800 text-stone-500 px-1.5 py-0.5 rounded">#{pedido.id_pedido}</span>
                            </div>
                            <span className="text-[10px] text-stone-400 font-bold block mt-0.5">Mozo: {pedido.mozo}</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {pedido.items.map(item => (
                                <span key={item.id_producto} className="text-[9px] px-1.5 py-0.5 bg-stone-50 dark:bg-stone-850 text-stone-600 dark:text-stone-300 rounded font-semibold">
                                  {item.cantidad}x {item.nombre}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col justify-center">
                          <span className="font-mono font-black text-stone-900 dark:text-white">{money(total)}</span>
                          <span className="text-[9px] text-stone-400 font-bold mt-0.5">
                            {pedido.fecha_hora ? new Date(pedido.fecha_hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs' : 'Sin Hora'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>

            {/* 3C. Panel de Cobro del Lote Seleccionado */}
            <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 rounded-2xl space-y-4">
              <div className="border-b border-stone-250 dark:border-stone-800 pb-3 text-left">
                <span className="text-[9px] uppercase font-black text-stone-450 dark:text-stone-300">Detalle de Emisión por Lote</span>
                <div className="flex justify-between items-end mt-1">
                  <h4 className="text-xs font-black uppercase text-stone-700 dark:text-stone-200">Seleccionados: {selectedPedidos.length}</h4>
                  <b className="font-mono text-lg text-emerald-600 dark:text-emerald-450">{money(selectedTotal)}</b>
                </div>
              </div>

              {selectedPedidos.length > 0 ? (
                <div className="space-y-4">
                  {/* Datos del Comprobante */}
                  <div className="space-y-3">
                    {/* Tipo */}
                    <label className="space-y-1 block text-left">
                      <span className="text-[10px] font-black uppercase text-stone-400 dark:text-stone-300">Tipo de Comprobante</span>
                      <select 
                        value={pagoTipo} 
                        onChange={e => {
                          const val = e.target.value as any;
                          setPagoTipo(val);
                          if (val === 'ticket' || val === 'C' || val === 'X') {
                            setPagoCliente('Consumidor Final');
                            setPagoCuit('99-99999999-9');
                          }
                        }} 
                        className="w-full p-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-xs font-bold text-stone-800 dark:text-stone-200"
                      >
                        {MONOTRIBUTO_INVOICE_OPTIONS.map(option => (
                          <option key={option.value} value={option.value} disabled={option.disabled}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    {/* Cliente Autocomplete */}
                    <div className="space-y-1 relative text-left">
                      <span className="text-[10px] font-black uppercase text-stone-400 dark:text-stone-300">Nombre / Razón Social</span>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2 top-2.5" />
                        <input
                          type="text"
                          value={pagoCliente}
                          onChange={e => {
                            setPagoCliente(e.target.value);
                            setPagoQuery(e.target.value);
                            setShowPagoSuggestions(true);
                          }}
                          onFocus={() => setShowPagoSuggestions(true)}
                          className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-stone-955 border border-stone-200 dark:border-stone-800 rounded-lg text-xs font-bold text-stone-800 dark:text-stone-100 focus:outline-none"
                        />
                      </div>
                      
                      {showPagoSuggestions && pagoSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg shadow-lg z-20 overflow-hidden divide-y divide-stone-100 dark:divide-stone-850">
                          {pagoSuggestions.map(c => (
                            <button
                              key={c.id_cliente}
                              type="button"
                              onClick={() => selectPagoCliente(c)}
                              className="w-full text-left px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-stone-850 text-[11px] flex justify-between cursor-pointer"
                            >
                              <span className="font-bold text-stone-800 dark:text-stone-200">{c.nombre}</span>
                              <span className="font-mono text-stone-400">{c.dni_cuit}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* CUIT / DNI */}
                    <label className="space-y-1 block text-left">
                      <span className="text-[10px] font-black uppercase text-stone-400 dark:text-stone-300 flex items-center justify-between">
                        CUIT / DNI
                        {!cuitPagoValido && <span className="text-[8px] text-amber-500 font-extrabold">Formato inválido</span>}
                        {cuitPagoValido && pagoCuit !== '99-99999999-9' && <span className="text-[8px] text-emerald-600 font-extrabold">Válido ✓</span>}
                      </span>
                      <input
                        type="text"
                        value={pagoCuit}
                        onChange={e => setPagoCuit(e.target.value)}
                        className={`w-full p-2 bg-white dark:bg-stone-955 border rounded-lg text-xs font-mono font-bold text-stone-800 dark:text-stone-100 ${
                          cuitPagoValido ? 'border-stone-200 dark:border-stone-800' : 'border-amber-400 border-amber-500'
                        }`}
                      />
                    </label>

                    <label className="space-y-1 block text-left">
                      <span className="text-[10px] font-black uppercase text-stone-400 dark:text-stone-300">Condicion IVA receptor</span>
                      <select value={pagoCondicionIva} onChange={e => setPagoCondicionIva(Number(e.target.value))} className="w-full p-2 bg-white dark:bg-stone-955 border border-stone-200 dark:border-stone-800 rounded-lg text-xs font-bold text-stone-800 dark:text-stone-200">
                        {CONDICIONES_IVA_RECEPTOR.map(condition => <option key={condition.id} value={condition.id}>{condition.label}</option>)}
                      </select>
                    </label>

                    {/* Medio Pago */}
                    <label className="space-y-1 block text-left">
                      <span className="text-[10px] font-black uppercase text-stone-400 dark:text-stone-300">Medio de Cobro</span>
                      <select value={pagoMedio} onChange={e => setPagoMedio(e.target.value as Factura['medio_pago'])} className="w-full p-2 bg-white dark:bg-stone-955 border border-stone-200 dark:border-stone-800 rounded-lg text-xs font-bold text-stone-800 dark:text-stone-200">
                        <option value="efectivo">Efectivo</option>
                        <option value="debito">Tarjeta de Débito</option>
                        <option value="tarjeta">Tarjeta de Crédito</option>
                        <option value="transferencia">Transferencia Bancaria</option>
                        <option value="mp_qr">QR MercadoPago</option>
                        <option value="mixto">Mixto</option>
                      </select>
                    </label>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 p-3 rounded-xl text-[10px] text-emerald-800 dark:text-emerald-300 font-bold text-left">
                    Se descargará el PDF del comprobante consolidado y las comandas seleccionadas se marcarán como cobradas.
                  </div>

                  <button
                    disabled={isEmitting}
                    onClick={emitFromSelectedPedidos}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow cursor-pointer disabled:opacity-60"
                  >
                    {isEmitting ? 'Cobrando Lote...' : 'Confirmar Cobro e Imprimir'}
                  </button>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-stone-400 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl">
                  Selecciona una mesa o pedidos individuales de la lista para emitir el cobro.
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 4. TAB: ARCHIVO FISCAL (Grid + Filtros + Descarga CSV/IVA + Modal Inspector) */}
      {activeTab === 'archivo' && (
        <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4 animate-fadeIn">
          
          {/* Barra de Búsqueda y Exportaciones */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
            <h3 className="text-sm font-black text-stone-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#624A3E] dark:text-[#C8956A]" />
              Archivo Fiscal y Registro de Ventas
            </h3>
            <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar cliente, CUIT, ticket o medio..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                />
              </div>
              <button onClick={downloadCsv} className="px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 text-stone-605 text-stone-600 dark:text-stone-300 font-black flex items-center justify-center gap-2 hover:bg-stone-100 cursor-pointer text-xs">
                <Download className="w-4 h-4" /> CSV
              </button>
              <button onClick={downloadLibroIva} className="px-3 py-2 rounded-xl bg-[#624A3E] text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer hover:bg-[#503C32]">
                <Calendar className="w-4 h-4" /> Libro IVA PDF
              </button>
            </div>
          </div>

          {/* Filtros de Búsqueda */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="space-y-1 block text-left">
              <span className="text-[10px] font-black uppercase text-stone-450 dark:text-stone-300 flex items-center gap-1"><Filter className="w-3 h-3" /> Tipo de Comprobante</span>
              <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value as TipoFiltro)} className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-900 text-stone-700 dark:text-stone-200 text-xs font-bold">
                <option value="todos">Todos</option>
                <option value="ticket">Ticket de Consumo</option>
                <option value="A">Factura A</option>
                <option value="B">Factura B</option>
                <option value="C">Factura C</option>
                <option value="NC">Nota de Crédito C</option>
                <option value="X">Comprobante X</option>
              </select>
            </label>
            <label className="space-y-1 block text-left">
              <span className="text-[10px] font-black uppercase text-stone-450 dark:text-stone-300">Estado</span>
              <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value as EstadoFiltro)} className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-900 text-stone-700 dark:text-stone-200 text-xs font-bold">
                <option value="todos">Todos</option>
                <option value="autorizado">Autorizados</option>
                <option value="observado">Autorizados con observaciones</option>
                <option value="borrador">Documentos X / borradores</option>
                <option value="rechazado">Rechazados</option>
                <option value="incierto">Resultado incierto</option>
                <option value="nota_credito">Notas de Crédito</option>
              </select>
            </label>
            <label className="space-y-1 block text-left">
              <span className="text-[10px] font-black uppercase text-stone-450 dark:text-stone-300">Medio de Pago</span>
              <select value={medioFiltro} onChange={e => setMedioFiltro(e.target.value as MedioFiltro)} className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-900 text-stone-700 dark:text-stone-200 text-xs font-bold">
                <option value="todos">Todos</option>
                <option value="efectivo">Efectivo</option>
                <option value="debito">Débito</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="mp_qr">QR MercadoPago</option>
                <option value="mixto">Mixto</option>
              </select>
            </label>
          </div>

          {/* Tabla de Resultados */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse responsive-table">
              <thead>
                <tr className="border-b border-stone-150 dark:border-stone-800 text-stone-400 dark:text-stone-300 uppercase text-[9px] font-black tracking-wider">
                  <th className="py-2.5 px-3">Número</th>
                  <th className="py-2.5 px-3">Fecha / Hora</th>
                  <th className="py-2.5 px-3">Cliente / CUIT</th>
                  <th className="py-2.5 px-3 text-right">Neto</th>
                  <th className="py-2.5 px-3 text-right">IVA (21%)</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredFacturas.map(f => {
                  const isNC = f.estado === 'nota_credito';
                  const { neto } = calcIvaIncluido(f.total, f.iva_veintiuno > 0);
                  const displayDate = f.fecha_completa 
                    ? new Date(f.fecha_completa).toLocaleDateString('es-AR') + ' ' + f.fecha.slice(0, 5)
                    : f.fecha;

                  return (
                    <tr 
                      key={f.id_factura} 
                      className={`border-b border-stone-100 dark:border-stone-850 hover:bg-stone-50/50 dark:hover:bg-stone-800/10 transition-colors cursor-pointer ${
                        isNC ? 'opacity-60 bg-red-50/10' : ''
                      }`}
                      onClick={() => setSelectedFactura(f)}
                    >
                      <td data-label="Número" className="py-3 px-3 font-mono font-bold text-stone-800 dark:text-stone-100">
                        {f.nro_ticket}
                        {f.afip_cae && <span className="block text-[8px] text-emerald-600 font-bold">CAE: {f.afip_cae}</span>}
                      </td>
                      <td data-label="Fecha" className="py-3 px-3 font-medium text-stone-400 dark:text-stone-300">{displayDate}</td>
                      <td data-label="Cliente" className="py-3 px-3 text-left">
                        <span className="font-extrabold text-stone-900 dark:text-white block text-left">{f.cliente}</span>
                        <span className="text-[10px] text-stone-400 dark:text-stone-300 font-mono text-left block">{f.cuit}</span>
                      </td>
                      <td data-label="Neto" className="py-3 px-3 text-right font-mono text-stone-500 dark:text-stone-300">{money(neto)}</td>
                      <td data-label="IVA" className="py-3 px-3 text-right font-mono text-stone-400">{money(f.iva_veintiuno)}</td>
                      <td data-label="Total" className={`py-3 px-3 text-right font-mono font-extrabold ${
                        isNC ? 'text-rose-500 line-through' : 'text-stone-900 dark:text-white'
                      }`}>{money(f.total)}</td>
                      <td data-label="Estado" className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          isNC ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                          f.afip_cae ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          'bg-stone-50 text-stone-700 border-stone-200'
                        }`}>
                          {f.tipo === 'NC' ? 'Nota Crédito C' : isNC ? 'Compensada por NC' : f.afip_cae ? 'CAE Fiscal ✓' : 'Documento X'}
                        </span>
                      </td>
                      <td data-label="Acciones" className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <button onClick={() => downloadFacturaPdf(f)} className="p-1.5 rounded-lg bg-stone-50 dark:bg-stone-850 hover:bg-[#624A3E]/10 text-stone-500 dark:text-stone-300 hover:text-[#624A3E] transition-all cursor-pointer" title="Descargar PDF">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => downloadFacturaPdf(f)} className="p-1.5 rounded-lg bg-stone-50 dark:bg-stone-850 hover:bg-[#624A3E]/10 text-stone-500 dark:text-stone-300 hover:text-[#624A3E] transition-all cursor-pointer" title="Reimprimir">
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {['autorizado', 'observado'].includes(f.estado) && f.tipo === 'C' && (
                          <button onClick={() => handleNotaCredito(f.id_factura)} className="p-1 px-2 text-[9px] font-black rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 transition-colors cursor-pointer" title="Anular con nota de crédito">
                            Anular
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {filteredFacturas.length === 0 && (
              <div className="p-8 text-center text-xs text-stone-550 text-stone-500">
                <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                Sin comprobantes para los filtros seleccionados.
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-3 border-t border-stone-100 dark:border-stone-855">
            <div className="text-[10px] text-stone-400 dark:text-stone-300 font-bold uppercase text-center sm:text-left">
              Punto de Venta {String(arcaStatus?.puntoVenta || 1).padStart(5, '0')} · La numeración fiscal se consulta en ARCA al emitir · Notas de crédito: {anuladas}
            </div>
            {filteredFacturas.length > 0 && (
              <button 
                onClick={async () => {
                  toast.info(`Generando descargas para ${filteredFacturas.length} comprobantes...`);
                  let ok = 0, fail = 0;
                  for (const f of filteredFacturas) {
                    try { await downloadFacturaPdf(f); ok++; }
                    catch { fail++; }
                    await new Promise(r => setTimeout(r, 250));
                  }
                  toast.success(`${ok} PDFs descargados correctamente.`);
                }} 
                className="touch-target px-3 py-2 bg-[#624A3E] hover:bg-[#503C32] text-white text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3 h-3" /> Descargar {filteredFacturas.length} PDFs en Lote
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. MODAL: DETALLE INSPECTOR DE COMPROBANTE */}
      {selectedFactura && (
        <div className="fixed inset-0 bg-stone-905 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-250 dark:border-stone-800 max-w-lg w-full overflow-hidden shadow-2xl animate-scaleUp">
            
            {/* Cabecera Modal */}
            <div className="bg-stone-50 dark:bg-stone-850 px-6 py-4 flex justify-between items-center border-b border-stone-150 dark:border-stone-800">
              <div className="text-left">
                <span className="text-[9px] uppercase font-black text-stone-400 block text-left">Detalle de Auditoría</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    selectedFactura.estado === 'nota_credito' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  }`}>
                    {selectedFactura.tipo === 'ticket' ? 'Ticket' : `Factura ${selectedFactura.tipo || 'B'}`}
                  </span>
                  <b className="font-mono text-xs text-stone-800 dark:text-white">{selectedFactura.nro_ticket}</b>
                </div>
              </div>
              <button 
                onClick={() => setSelectedFactura(null)}
                className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-5 text-left max-h-[450px] overflow-y-auto">
              
              {/* Info Cliente */}
              <div className="grid grid-cols-2 gap-4 text-xs text-left">
                <div className="text-left">
                  <span className="text-[9px] text-stone-400 uppercase font-black block text-left">Cliente / Razón Social</span>
                  <b className="text-stone-800 dark:text-white block mt-0.5 text-left">{selectedFactura.cliente}</b>
                </div>
                <div className="text-left">
                  <span className="text-[9px] text-stone-400 uppercase font-black block text-left">CUIT / DNI</span>
                  <b className="font-mono text-stone-800 dark:text-white block mt-0.5 text-left">{selectedFactura.cuit}</b>
                </div>
                <div className="text-left">
                  <span className="text-[9px] text-stone-400 uppercase font-black block text-left">Fecha / Hora de Registro</span>
                  <span className="text-stone-600 dark:text-stone-300 block mt-0.5 text-left">
                    {selectedFactura.fecha_completa ? new Date(selectedFactura.fecha_completa).toLocaleString('es-AR') : selectedFactura.fecha}
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-[9px] text-stone-400 uppercase font-black block text-left">Medio de Pago</span>
                  <span className="text-stone-600 dark:text-stone-300 block mt-0.5 font-bold text-left">{medioLabel(selectedFactura.medio_pago)}</span>
                </div>
              </div>

              {/* Detalle Observaciones / Pedidos Vinculados */}
              {selectedFactura.observaciones && (
                <div className="bg-stone-50 dark:bg-stone-850 p-3 rounded-xl border border-stone-150 dark:border-stone-800 text-xs text-left">
                  <span className="text-[9px] text-stone-400 uppercase font-black block mb-0.5 text-left">Asociación / Conceptos</span>
                  <p className="text-stone-700 dark:text-stone-200 font-semibold text-left">{selectedFactura.observaciones}</p>
                </div>
              )}

              {/* Desglose de Totales e Impuestos */}
              <div className="border border-stone-150 dark:border-stone-800 rounded-xl overflow-hidden text-xs">
                <div className="bg-stone-50 dark:bg-stone-850 px-3 py-1.5 text-[9px] font-black uppercase text-stone-400 text-left">Detalle Impositivo</div>
                <div className="p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Subtotal Neto Gravado (21%)</span>
                    <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                      {money(calcIvaIncluido(selectedFactura.total, selectedFactura.iva_veintiuno > 0).neto)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Alícuota IVA (21.00%)</span>
                    <span className="font-mono font-bold text-stone-800 dark:text-stone-200">{money(selectedFactura.iva_veintiuno)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-sm font-black">
                    <span className="text-stone-800 dark:text-white">Importe Total Facturado</span>
                    <span className={`font-mono ${selectedFactura.estado === 'nota_credito' ? 'text-rose-500 line-through' : 'text-stone-900 dark:text-white'}`}>
                      {money(selectedFactura.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Datos de AFIP y CAE */}
              {selectedFactura.afip_cae ? (
                <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/50 p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black text-xs text-left">
                    <FileCheck2 className="w-4 h-4 text-emerald-600" />
                    AUTORIZADO POR AFIP / ARCA
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-stone-600 dark:text-stone-300 text-left">
                    <div className="text-left">
                      <span className="text-[9px] text-stone-400 block font-bold text-left">CAE</span>
                      <b className="font-mono font-bold text-stone-800 dark:text-white text-left block">{selectedFactura.afip_cae}</b>
                    </div>
                    <div className="text-left">
                      <span className="text-[9px] text-stone-400 block font-bold text-left">VENCIMIENTO CAE</span>
                      <b className="font-mono font-bold text-stone-800 dark:text-white text-left block">{selectedFactura.afip_vto}</b>
                    </div>
                  </div>

                  {/* QR Oficial AFIP */}
                  <div className="pt-2 flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 bg-white p-2 rounded-lg border border-stone-200 flex items-center justify-center">
                      <FiscalQrImage qrData={selectedFactura.afip_qr} />
                    </div>
                    <span className="text-[8px] text-stone-450 dark:text-stone-400 font-bold mt-1 uppercase text-center block">Escanear para comprobar validez fiscal</span>
                  </div>
                </div>
              ) : (
                <div className="bg-stone-50 dark:bg-stone-850 p-4 rounded-xl border border-stone-150 dark:border-stone-800 flex items-center gap-3">
                  <Info className="w-5 h-5 text-amber-505 text-amber-500 shrink-0" />
                  <p className="text-[10px] text-stone-500 font-semibold leading-relaxed text-left">
                    Documento X interno sin CAE. No es una factura electrónica ni tiene validez fiscal.
                  </p>
                </div>
              )}

            </div>

            {/* Footer Acciones Modal */}
            <div className="bg-stone-50 dark:bg-stone-850 px-6 py-4 flex gap-2 justify-between border-t border-stone-150 dark:border-stone-800">
              <div>
                {['autorizado', 'observado'].includes(selectedFactura.estado) && selectedFactura.tipo === 'C' && (
                  <button 
                    onClick={() => handleNotaCredito(selectedFactura.id_factura)}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer border border-rose-100"
                  >
                    Emitir Nota de Crédito C
                  </button>
                )}
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => downloadFacturaPdf(selectedFactura)}
                  className="px-3 py-2 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Reimprimir
                </button>
                <button 
                  onClick={() => downloadFacturaPdf(selectedFactura)}
                  className="px-3 py-2 bg-[#624A3E] hover:bg-[#503C32] text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
