import React, { useEffect, useMemo, useState } from 'react';
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
  Search
} from 'lucide-react';
import { Pedido, ProductoMenu, TicketData, TipoComprobante } from '../types';
import { facturacionService, Factura } from '../services/facturacionService';
import { pdfService } from '../services/pdfService';
import { ToastContainer, useToast } from './ToastContainer';

interface FacturacionModuleProps {
  pedidos: Pedido[];
  productosMenu: ProductoMenu[];
  addLog: (tipo: 'pedido_creado' | 'descuento_stock' | 'alerta_stock' | 'comanda_estado' | 'merma_registrada' | 'sistema', mensaje: string) => void;
}

type FacturaExtendida = Factura & {
  tipo?: 'ticket' | 'A' | 'B' | 'X';
  id_pedido?: number | null;
  observaciones?: string;
};

type TabKey = 'manual' | 'pagos' | 'archivo';
type EstadoFiltro = 'todos' | 'emitido' | 'nota_credito';
type TipoFiltro = 'todos' | 'ticket' | 'A' | 'B' | 'X';
type MedioFiltro = 'todos' | Factura['medio_pago'];

const DEFAULT_FACTURAS: FacturaExtendida[] = [
  { id_factura: 'f_101', nro_ticket: 'T-0001-00008321', cliente: 'Consumidor Final', cuit: '99-99999999-9', total: 18500, iva_veintiuno: 3210.33, medio_pago: 'efectivo', fecha: '21:05 hs', estado: 'emitido', tipo: 'ticket' },
  { id_factura: 'f_102', nro_ticket: 'B-0001-00008322', cliente: 'Agustin Colombo', cuit: '20-38449102-1', total: 43200, iva_veintiuno: 7497.52, medio_pago: 'tarjeta', fecha: '21:14 hs', estado: 'emitido', tipo: 'B' },
  { id_factura: 'f_103', nro_ticket: 'A-0001-00008323', cliente: 'Siderar S.A.', cuit: '30-50000732-5', total: 125000, iva_veintiuno: 21694.21, medio_pago: 'debito', fecha: '21:40 hs', estado: 'emitido', tipo: 'A' },
  { id_factura: 'f_104', nro_ticket: 'T-0001-00008324', cliente: 'Camila Galvan', cuit: '27-40112833-2', total: 15400, iva_veintiuno: 2672.72, medio_pago: 'mp_qr', fecha: '21:55 hs', estado: 'emitido', tipo: 'ticket' }
];

const money = (value: number) => `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const calcIvaIncluido = (total: number, aplicaIva = true) => {
  if (!aplicaIva) return { neto: total, iva: 0 };
  const neto = Number((total / 1.21).toFixed(2));
  return { neto, iva: Number((total - neto).toFixed(2)) };
};

const facturaTipo = (f: FacturaExtendida): 'ticket' | 'A' | 'B' | 'X' => {
  if (f.tipo) return f.tipo;
  if (f.nro_ticket.startsWith('A-')) return 'A';
  if (f.nro_ticket.startsWith('B-')) return 'B';
  if (f.nro_ticket.startsWith('X-')) return 'X';
  return 'ticket';
};

const tipoPrefix = (tipo: 'ticket' | 'A' | 'B' | 'X') => (tipo === 'ticket' ? 'T' : tipo);

const nextNumber = (facturas: FacturaExtendida[], tipo: 'ticket' | 'A' | 'B' | 'X') => {
  const prefix = `${tipoPrefix(tipo)}-0001-`;
  const last = facturas
    .filter(f => f.nro_ticket.startsWith(prefix))
    .map(f => Number(f.nro_ticket.split('-').pop() || 0))
    .reduce((max, n) => Math.max(max, Number.isFinite(n) ? n : 0), 8320);
  return `${prefix}${String(last + 1).padStart(8, '0')}`;
};

const medioLabel = (medio: Factura['medio_pago']) => ({
  efectivo: 'Efectivo',
  debito: 'Debito',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  mp_qr: 'QR',
  mixto: 'Mixto'
}[medio]);

export default function FacturacionModule({ pedidos, productosMenu, addLog }: FacturacionModuleProps) {
  const { toast, toasts, dismissToast } = useToast();
  const [facturas, setFacturas] = useState<FacturaExtendida[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('archivo');
  const [search, setSearch] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>('todos');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('todos');
  const [medioFiltro, setMedioFiltro] = useState<MedioFiltro>('todos');
  const [manualTipo, setManualTipo] = useState<'ticket' | 'A' | 'B' | 'X'>('B');
  const [manualCliente, setManualCliente] = useState('Consumidor Final');
  const [manualCuit, setManualCuit] = useState('99-99999999-9');
  const [manualTotal, setManualTotal] = useState('0');
  const [manualMedio, setManualMedio] = useState<Factura['medio_pago']>('efectivo');
  const [manualIva, setManualIva] = useState(true);
  const [manualObs, setManualObs] = useState('');
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<number | null>(null);
  const [pagoTipo, setPagoTipo] = useState<'ticket' | 'A' | 'B' | 'X'>('ticket');
  const [pagoCliente, setPagoCliente] = useState('Consumidor Final');
  const [pagoCuit, setPagoCuit] = useState('99-99999999-9');
  const [isEmitting, setIsEmitting] = useState(false);

  useEffect(() => {
    facturacionService.list()
      .then(data => setFacturas((data && data.length > 0 ? data : DEFAULT_FACTURAS) as FacturaExtendida[]))
      .catch(() => {
        setFacturas(DEFAULT_FACTURAS);
        toast.warning('No se pudo leer Supabase. Se muestra el archivo fiscal local de respaldo.');
      });
  }, []);

  const pedidoTotal = (pedido: Pedido) => pedido.items.reduce((sum, item) => {
    const producto = productosMenu.find(p => p.id_producto === item.id_producto);
    return sum + (producto ? producto.precio_venta * item.cantidad : 0);
  }, 0);

  const facturasActivas = facturas.filter(f => f.estado === 'emitido');
  const totalBruto = facturasActivas.reduce((acc, f) => acc + f.total, 0);
  const ivaTotal = facturasActivas.reduce((acc, f) => acc + f.iva_veintiuno, 0);
  const netoTotal = totalBruto - ivaTotal;
  const anuladas = facturas.filter(f => f.estado === 'nota_credito').length;

  const pedidosFacturados = new Set(
    facturas
      .map(f => f.id_pedido)
      .filter((id): id is number => typeof id === 'number')
  );

  const pagosPendientes = useMemo(() => pedidos
    .filter(p => p.estado_comanda !== 'cancelado')
    .filter(p => !pedidosFacturados.has(p.id_pedido))
    .map(p => ({ pedido: p, total: pedidoTotal(p) }))
    .filter(p => p.total > 0), [pedidos, productosMenu, facturas]);

  const filtered = facturas.filter(f => {
    const term = search.trim().toLowerCase();
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

  const resumenPorTipo = (['ticket', 'A', 'B', 'X'] as const).map(tipo => {
    const subset = facturasActivas.filter(f => facturaTipo(f) === tipo);
    return { tipo, cantidad: subset.length, total: subset.reduce((acc, f) => acc + f.total, 0) };
  });

  const resumenPorMedio = (['efectivo', 'debito', 'tarjeta', 'transferencia', 'mp_qr', 'mixto'] as Factura['medio_pago'][]).map(medio => {
    const subset = facturasActivas.filter(f => f.medio_pago === medio);
    return { medio, cantidad: subset.length, total: subset.reduce((acc, f) => acc + f.total, 0) };
  });

  const selectedPending = pagosPendientes.find(p => p.pedido.id_pedido === pedidoSeleccionado) || pagosPendientes[0];

  useEffect(() => {
    if (!pedidoSeleccionado && pagosPendientes[0]) {
      setPedidoSeleccionado(pagosPendientes[0].pedido.id_pedido);
    }
  }, [pagosPendientes, pedidoSeleccionado]);

  const validateClienteFiscal = (tipo: 'ticket' | 'A' | 'B' | 'X', cliente: string, cuit: string) => {
    if (tipo !== 'A') return true;
    if (!cuit.trim() || cliente.trim().toLowerCase() === 'consumidor final') {
      toast.error('Para Factura A carga CUIT y razon social del cliente.');
      return false;
    }
    return true;
  };

  const persistFactura = async (factura: FacturaExtendida) => {
    setFacturas(prev => [factura, ...prev]);
    try {
      await facturacionService.create(factura);
      toast.success(`Comprobante ${factura.nro_ticket} guardado y PDF descargado.`);
    } catch (err) {
      console.warn('Factura guardada en modo local/demo:', err);
      toast.warning(`PDF descargado. ${factura.nro_ticket} quedo guardado en esta sesion local.`);
    }
  };

  const emitManual = async () => {
    if (isEmitting) return;
    const total = Number(manualTotal);
    if (!Number.isFinite(total) || total <= 0) {
      toast.error('El total debe ser mayor a cero.');
      return;
    }
    if (!validateClienteFiscal(manualTipo, manualCliente, manualCuit)) return;

    setIsEmitting(true);
    try {
      const { iva } = calcIvaIncluido(total, manualIva);
      const factura: FacturaExtendida = {
        id_factura: `fac_${Date.now()}`,
        nro_ticket: nextNumber(facturas, manualTipo),
        cliente: manualCliente.trim() || 'Consumidor Final',
        cuit: manualCuit.trim() || '99-99999999-9',
        total,
        iva_veintiuno: iva,
        medio_pago: manualMedio,
        fecha: `${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs`,
        estado: 'emitido',
        tipo: manualTipo,
        id_pedido: null,
        observaciones: manualObs
      };
      await downloadFacturaPdf(factura);
      await persistFactura(factura);
      addLog('sistema', `FACTURACION: Comprobante manual ${factura.nro_ticket} emitido por ${money(total)}.`);
      setManualTotal('0');
      setManualObs('');
      setActiveTab('archivo');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo emitir el PDF del comprobante.');
    } finally {
      setIsEmitting(false);
    }
  };

  const emitFromPedido = async () => {
    if (isEmitting) return;
    if (!selectedPending) return;
    if (!validateClienteFiscal(pagoTipo, pagoCliente, pagoCuit)) return;

    setIsEmitting(true);
    try {
      const { iva } = calcIvaIncluido(selectedPending.total, pagoTipo !== 'X');
      const factura: FacturaExtendida = {
        id_factura: `fac_${Date.now()}`,
        nro_ticket: nextNumber(facturas, pagoTipo),
        cliente: pagoCliente.trim() || 'Consumidor Final',
        cuit: pagoCuit.trim() || '99-99999999-9',
        total: selectedPending.total,
        iva_veintiuno: iva,
        medio_pago: 'efectivo',
        fecha: `${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs`,
        estado: 'emitido',
        tipo: pagoTipo,
        id_pedido: selectedPending.pedido.id_pedido,
        observaciones: `Pedido #${selectedPending.pedido.id_pedido} - ${selectedPending.pedido.numero_mesa}`
      };
      await downloadFacturaPdf(factura, selectedPending.pedido);
      await persistFactura(factura);
      addLog('sistema', `FACTURACION: Pedido #${selectedPending.pedido.id_pedido} convertido en ${factura.nro_ticket}.`);
      setActiveTab('archivo');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo emitir el comprobante del pedido.');
    } finally {
      setIsEmitting(false);
    }
  };

  const handleNotaCredito = (id: string) => {
    setFacturas(prev => prev.map(f => {
      if (f.id_factura === id) {
        addLog('sistema', `FACTURACION: Nota de credito fiscal anulando ${f.nro_ticket} por ${money(f.total)}.`);
        facturacionService.markNotaCredito(id).catch(err => console.error(err));
        toast.success(`Nota de credito aplicada a ${f.nro_ticket}.`);
        return { ...f, estado: 'nota_credito' };
      }
      return f;
    }));
  };

  const tipoToComprobante = (tipo: 'ticket' | 'A' | 'B' | 'X'): TipoComprobante => {
    if (tipo === 'A') return 'factura_a';
    if (tipo === 'B') return 'factura_b';
    return 'ticket_consumo';
  };

  const downloadFacturaPdf = async (factura: FacturaExtendida, pedido?: Pedido) => {
    const tipo = facturaTipo(factura);
    const { neto } = calcIvaIncluido(factura.total, factura.iva_veintiuno > 0);
    const ticketItems = pedido && pedido.items.length > 0
      ? pedido.items.map(item => {
        const prod = productosMenu.find(p => p.id_producto === item.id_producto);
        const unit = prod ? prod.precio_venta : 0;
        return {
          cantidad: item.cantidad,
          descripcion: item.nombre,
          precio_unitario: unit,
          subtotal: unit * item.cantidad
        };
      })
      : [{
        cantidad: 1,
        descripcion: factura.observaciones || 'Venta gastronomica segun detalle comercial',
        precio_unitario: neto,
        subtotal: neto
      }];

    const ticketData: TicketData = {
      idPedido: factura.id_pedido || pedido?.id_pedido || 0,
      nroComprobante: factura.nro_ticket,
      tipoComprobante: tipoToComprobante(tipo),
      fechaHora: factura.fecha,
      mesa: pedido?.numero_mesa || 'Venta manual',
      mozo: pedido?.mozo || 'Caja',
      cajero: 'Caja',
      nombreComercial: 'El Patron Restaurante',
      razonSocial: 'Gastronomia El Patron S.A.S.',
      cuit: '30-71649251-4',
      direccion: 'Av. Pres. Figueroa Alcorta 3420, CABA',
      telefono: '+54 11 4802-9988',
      email: 'facturas@elpatronrestaurante.com.ar',
      items: ticketItems,
      subtotal: neto,
      descuento: 0,
      propina: 0,
      iva: factura.iva_veintiuno,
      total: factura.total,
      metodosPago: [{ metodo: medioLabel(factura.medio_pago), monto: factura.total }],
      vuelto: 0,
      mensajePie: 'Gracias por su visita. Comprobante generado por El Patron Gestion Gastronomica Pro.',
      clienteNombre: factura.cliente,
      clienteCuit: factura.cuit
    };

    await pdfService.exportToPDF(ticketData);
  };

  const downloadLibroIva = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Libro IVA Ventas', 14, 18);
    doc.setFontSize(9);
    doc.text(`Generado: ${new Date().toLocaleString('es-AR')}`, 14, 25);
    doc.text(`Neto: ${money(netoTotal)} | IVA: ${money(ivaTotal)} | Total: ${money(totalBruto)}`, 14, 33);

    let y = 46;
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha', 14, y);
    doc.text('Comprobante', 38, y);
    doc.text('Cliente', 88, y);
    doc.text('Total', 188, y, { align: 'right' });
    y += 8;
    doc.setFont('helvetica', 'normal');
    filtered.forEach(f => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(f.fecha.slice(0, 10), 14, y);
      doc.text(f.nro_ticket, 38, y);
      doc.text(f.cliente.slice(0, 34), 88, y);
      doc.text(money(f.total), 188, y, { align: 'right' });
      y += 7;
    });
    doc.save(`libro_iva_ventas_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const downloadCsv = () => {
    const header = ['comprobante', 'fecha', 'cliente', 'cuit', 'tipo', 'medio', 'estado', 'neto', 'iva', 'total'];
    const lines = filtered.map(f => {
      const { neto } = calcIvaIncluido(f.total, f.iva_veintiuno > 0);
      return [
        f.nro_ticket,
        f.fecha,
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
    link.download = 'auditoria_comprobantes.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const Metric = ({ label, value, tone = 'stone' }: { label: string; value: string; tone?: 'stone' | 'green' | 'brown' | 'rose' }) => (
    <div className={`bg-white p-5 rounded-2xl border shadow-xs ${tone === 'green' ? 'border-l-4 border-l-emerald-600' : tone === 'rose' ? 'border-rose-100' : 'border-stone-200'}`}>
      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">{label}</span>
      <h4 className={`text-2xl font-black font-mono mt-1 ${tone === 'green' ? 'text-emerald-600' : tone === 'brown' ? 'text-[#624A3E]' : tone === 'rose' ? 'text-rose-600' : 'text-stone-900'}`}>{value}</h4>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Metric label="Neto mes" value={money(netoTotal)} />
        <Metric label="IVA debito fiscal" value={money(ivaTotal)} tone="brown" />
        <Metric label="Total recaudado bruto" value={money(totalBruto)} tone="green" />
        <Metric label="Pagos sin comprobante" value={String(pagosPendientes.length)} tone={pagosPendientes.length ? 'rose' : 'stone'} />
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-2 flex flex-wrap gap-2">
        {[
          ['manual', 'Emitir manual', Plus],
          ['pagos', 'Facturar pagos', CreditCard],
          ['archivo', 'Archivo fiscal', Receipt]
        ].map(([key, label, Icon]) => {
          const ActiveIcon = Icon as typeof Receipt;
          return (
            <button
              key={key as string}
              onClick={() => setActiveTab(key as TabKey)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all ${activeTab === key ? 'bg-[#624A3E] text-white shadow' : 'bg-stone-50 text-stone-600 hover:bg-stone-100'}`}
            >
              <ActiveIcon className="w-4 h-4" />
              {label as string}
            </button>
          );
        })}
      </div>

      {activeTab === 'manual' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-5">
          <div>
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#624A3E]" /> Emitir comprobante manual
            </h3>
            <p className="text-xs text-stone-500 font-semibold mt-1">Para ventas externas, ajustes comerciales o comprobantes no asociados a una mesa.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase text-stone-500">Tipo</span>
              <select value={manualTipo} onChange={e => setManualTipo(e.target.value as any)} className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-bold">
                <option value="ticket">Ticket</option>
                <option value="B">Factura B</option>
                <option value="A">Factura A</option>
                <option value="X">Comprobante X</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase text-stone-500">Cliente</span>
              <input value={manualCliente} onChange={e => setManualCliente(e.target.value)} className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-bold" />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase text-stone-500">CUIT / DNI</span>
              <input value={manualCuit} onChange={e => setManualCuit(e.target.value)} className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-mono font-bold" />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase text-stone-500">Medio</span>
              <select value={manualMedio} onChange={e => setManualMedio(e.target.value as Factura['medio_pago'])} className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-bold">
                <option value="efectivo">Efectivo</option>
                <option value="debito">Debito</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="mp_qr">QR</option>
                <option value="mixto">Mixto</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase text-stone-500">Total final</span>
              <input type="number" value={manualTotal} onChange={e => setManualTotal(e.target.value)} className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-mono font-black" />
            </label>
            <label className="flex items-center gap-2 pt-6 text-xs font-bold text-stone-600">
              <input type="checkbox" checked={manualIva} onChange={e => setManualIva(e.target.checked)} className="accent-[#624A3E]" />
              Calcular IVA 21% incluido
            </label>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
              <span className="text-[10px] uppercase font-black text-stone-400">Vista previa</span>
              <p className="font-mono font-black text-stone-900">{nextNumber(facturas, manualTipo)}</p>
              <p className="text-stone-500">IVA: {money(calcIvaIncluido(Number(manualTotal || 0), manualIva).iva)}</p>
            </div>
          </div>
          <textarea value={manualObs} onChange={e => setManualObs(e.target.value)} placeholder="Observaciones, pedido externo, forma de pago detallada..." className="w-full h-20 p-3 rounded-xl border border-stone-200 text-xs" />
          <button disabled={isEmitting} onClick={emitManual} className="w-full md:w-auto px-5 py-3 rounded-xl bg-[#624A3E] text-white text-xs font-black uppercase shadow disabled:opacity-60 disabled:cursor-not-allowed">
            {isEmitting ? 'Emitiendo comprobante...' : 'Emitir y descargar comprobante PDF'}
          </button>
        </div>
      )}

      {activeTab === 'pagos' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-stone-900 uppercase tracking-tight flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#624A3E]" /> Facturar pagos de caja
              </h3>
              <p className="text-xs text-stone-500 font-semibold mt-1">Convierte pedidos/pagos disponibles en ticket o factura con PDF descargable.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="px-4 py-2 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-[9px] block font-black uppercase text-stone-400">Pendientes</span>
                <b className="font-mono">{pagosPendientes.length}</b>
              </div>
              <div className="px-4 py-2 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-[9px] block font-black uppercase text-stone-400">Importe</span>
                <b className="font-mono">{money(pagosPendientes.reduce((s, p) => s + p.total, 0))}</b>
              </div>
            </div>
          </div>

          {selectedPending ? (
            <>
              <select value={selectedPending.pedido.id_pedido} onChange={e => setPedidoSeleccionado(Number(e.target.value))} className="w-full p-3 rounded-xl border border-stone-200 text-xs font-bold">
                {pagosPendientes.map(({ pedido, total }) => (
                  <option key={pedido.id_pedido} value={pedido.id_pedido}>
                    Pedido #{pedido.id_pedido} - {pedido.numero_mesa} - {pedido.mozo} - {money(total)}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-stone-200 overflow-hidden">
                  <div className="bg-stone-50 px-3 py-2 text-[10px] font-black uppercase text-stone-500">Detalle del pago</div>
                  {selectedPending.pedido.items.map(item => {
                    const prod = productosMenu.find(p => p.id_producto === item.id_producto);
                    const unit = prod ? prod.precio_venta : 0;
                    return (
                      <div key={`${selectedPending.pedido.id_pedido}-${item.id_producto}`} className="px-3 py-2 border-t border-stone-100 flex justify-between text-xs">
                        <span><b>{item.cantidad}x</b> {item.nombre}</span>
                        <b className="font-mono">{money(unit * item.cantidad)}</b>
                      </div>
                    );
                  })}
                  <div className="px-3 py-3 border-t border-stone-200 flex justify-between text-sm font-black">
                    <span>Total</span>
                    <span className="font-mono">{money(selectedPending.total)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-stone-500">Tipo</span>
                      <select value={pagoTipo} onChange={e => setPagoTipo(e.target.value as any)} className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-bold">
                        <option value="ticket">Ticket</option>
                        <option value="B">Factura B</option>
                        <option value="A">Factura A</option>
                        <option value="X">Comprobante X</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-stone-500">Cliente</span>
                      <input value={pagoCliente} onChange={e => setPagoCliente(e.target.value)} className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-bold" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-stone-500">CUIT</span>
                      <input value={pagoCuit} onChange={e => setPagoCuit(e.target.value)} className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-mono font-bold" />
                    </label>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 font-bold">
                    Al emitir se descarga el PDF y el comprobante queda en Archivo fiscal.
                  </div>
                  <button disabled={isEmitting} onClick={emitFromPedido} className="w-full px-5 py-3 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase shadow disabled:opacity-60 disabled:cursor-not-allowed">
                    {isEmitting ? 'Emitiendo comprobante...' : 'Emitir comprobante desde pago'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 rounded-xl border border-dashed border-stone-200 bg-stone-50 text-center">
              <BadgeCheck className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
              <p className="text-xs font-black uppercase text-stone-700">No hay pagos pendientes de facturar.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'archivo' && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 pb-3 border-b border-stone-100">
            <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#624A3E]" />
              Archivo fiscal y auditoria de comprobantes
            </h3>
            <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar cliente, CUIT, ticket o medio..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                />
              </div>
              <button onClick={downloadCsv} className="px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-black flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> CSV
              </button>
              <button onClick={downloadLibroIva} className="px-3 py-2 rounded-xl bg-[#624A3E] text-white text-xs font-black flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4" /> Libro IVA PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase text-stone-500 flex items-center gap-1"><Filter className="w-3 h-3" /> Tipo</span>
              <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value as TipoFiltro)} className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-bold">
                <option value="todos">Todos</option>
                <option value="ticket">Ticket</option>
                <option value="A">Factura A</option>
                <option value="B">Factura B</option>
                <option value="X">Comprobante X</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase text-stone-500">Estado</span>
              <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value as EstadoFiltro)} className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-bold">
                <option value="todos">Todos</option>
                <option value="emitido">Validos</option>
                <option value="nota_credito">Anulados / NC</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase text-stone-500">Medio</span>
              <select value={medioFiltro} onChange={e => setMedioFiltro(e.target.value as MedioFiltro)} className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-bold">
                <option value="todos">Todos</option>
                <option value="efectivo">Efectivo</option>
                <option value="debito">Debito</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="mp_qr">QR</option>
                <option value="mixto">Mixto</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded-xl border border-stone-200 overflow-hidden">
              <div className="bg-stone-50 px-3 py-2 text-[10px] font-black uppercase text-stone-500">Resumen por tipo</div>
              {resumenPorTipo.map(r => (
                <div key={r.tipo} className="px-3 py-2 border-t border-stone-100 flex justify-between text-xs">
                  <span>{r.tipo === 'ticket' ? 'Ticket' : `Factura ${r.tipo}`}</span>
                  <b className="font-mono">{r.cantidad} - {money(r.total)}</b>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-stone-200 overflow-hidden">
              <div className="bg-stone-50 px-3 py-2 text-[10px] font-black uppercase text-stone-500">Resumen por medio</div>
              {resumenPorMedio.map(r => (
                <div key={r.medio} className="px-3 py-2 border-t border-stone-100 flex justify-between text-xs">
                  <span>{medioLabel(r.medio)}</span>
                  <b className="font-mono">{r.cantidad} - {money(r.total)}</b>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse responsive-table">
              <thead>
                <tr className="border-b border-stone-150 text-stone-400 uppercase text-[9px] font-black tracking-wider">
                  <th className="py-2.5 px-3">Nro</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Cliente / CUIT</th>
                  <th className="py-2.5 px-3 text-right">Neto</th>
                  <th className="py-2.5 px-3 text-right">IVA</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => {
                  const isNCD = f.estado === 'nota_credito';
                  const { neto } = calcIvaIncluido(f.total, f.iva_veintiuno > 0);
                  return (
                    <tr key={f.id_factura} className={`border-b border-stone-100 hover:bg-stone-50/50 transition-colors ${isNCD ? 'opacity-60 bg-red-50/10' : ''}`}>
                      <td data-label="Nro" className="py-3 px-3 font-mono font-bold text-stone-800">{f.nro_ticket}</td>
                      <td data-label="Fecha" className="py-3 px-3 font-medium text-stone-400">{f.fecha}</td>
                      <td data-label="Cliente" className="py-3 px-3">
                        <span className="font-extrabold text-stone-900 block">{f.cliente}</span>
                        <span className="text-[10px] text-stone-400 font-mono">{f.cuit}</span>
                      </td>
                      <td data-label="Neto" className="py-3 px-3 text-right font-mono text-stone-550">{money(neto)}</td>
                      <td data-label="IVA" className="py-3 px-3 text-right font-mono text-stone-400">{money(f.iva_veintiuno)}</td>
                      <td data-label="Total" className={`py-3 px-3 text-right font-mono font-extrabold ${isNCD ? 'text-red-500 line-through' : 'text-stone-900'}`}>{money(f.total)}</td>
                      <td data-label="Estado" className="py-3 px-3 text-center">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${isNCD ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                          {isNCD ? 'Anulado' : 'Valido'}
                        </span>
                      </td>
                      <td data-label="Acciones" className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <button onClick={() => downloadFacturaPdf(f)} className="p-1.5 rounded-lg bg-stone-50 hover:bg-[#624A3E]/10 text-stone-500 hover:text-[#624A3E] transition-all" title="Descargar PDF">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => downloadFacturaPdf(f)} className="p-1.5 rounded-lg bg-stone-50 hover:bg-[#624A3E]/10 text-stone-500 hover:text-[#624A3E] transition-all" title="Reimprimir">
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {!isNCD && (
                          <button onClick={() => handleNotaCredito(f.id_factura)} className="p-1 px-2 text-[9px] font-black rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors" title="Anular con nota de credito">
                            Anular
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-8 text-center text-xs text-stone-500">
                <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                Sin comprobantes para los filtros seleccionados.
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <div className="text-[10px] text-stone-400 font-bold uppercase">
              Numeracion fiscal PV 0001 - Ticket {nextNumber(facturas, 'ticket')} - A {nextNumber(facturas, 'A')} - B {nextNumber(facturas, 'B')} - X {nextNumber(facturas, 'X')} - Anulados {anuladas}
            </div>
            {filtered.length > 0 && (
              <button onClick={async () => {
                toast.info(`Descargando ${filtered.length} comprobantes...`);
                let ok = 0, fail = 0;
                for (const f of filtered) {
                  try {
                    await downloadFacturaPdf(f);
                    ok++;
                  } catch { fail++; }
                  await new Promise(r => setTimeout(r, 300));
                }
                toast.success(`${ok} PDFs descargados${fail > 0 ? `, ${fail} fallaron` : ''}.`);
              }} className="px-3 py-1.5 bg-[#624A3E] hover:bg-[#503C32] text-white text-[10px] font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1.5">
                <Download className="w-3 h-3" /> Descargar {filtered.length} PDFs
              </button>
            )}
          </div>
        </div>
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
