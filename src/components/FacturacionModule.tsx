import React, { useState, useEffect } from 'react';
import { useToast } from './ToastContainer';
import { Receipt, Search, Printer, DollarSign, Download, Percent } from 'lucide-react';
import { Pedido, EventoLog } from '../types';
import { facturacionService, Factura } from '../services/facturacionService';

interface FacturacionModuleProps {
  pedidos: Pedido[];
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

export default function FacturacionModule({
  pedidos,
  addLog
}: FacturacionModuleProps) {
  const { toast, toasts, dismissToast } = useToast();
  const [facturas, setFacturas] = useState<Factura[]>([]);

  useEffect(() => {
    facturacionService.list().then(data => {
      if (data && data.length > 0) {
        setFacturas(data);
      } else {
        const defaults: Factura[] = [
          { id_factura: 'f_101', nro_ticket: 'T-0001-00008321', cliente: 'Consumidor Final', cuit: '99-99999999-9', total: 18500.00, iva_veintiuno: 3210.33, medio_pago: 'efectivo', fecha: '21:05 hs', estado: 'emitido' },
          { id_factura: 'f_102', nro_ticket: 'T-0001-00008322', cliente: 'Agustín Colombo', cuit: '20-38449102-1', total: 43200.00, iva_veintiuno: 7497.52, medio_pago: 'tarjeta', fecha: '21:14 hs', estado: 'emitido' },
          { id_factura: 'f_103', nro_ticket: 'T-0001-00008323', cliente: 'Siderar S.A.', cuit: '30-50000732-5', total: 125000.00, iva_veintiuno: 21694.21, medio_pago: 'debito', fecha: '21:40 hs', estado: 'emitido' },
          { id_factura: 'f_104', nro_ticket: 'T-0001-00008324', cliente: 'Camila Galván', cuit: '27-40112833-2', total: 15400.00, iva_veintiuno: 2672.72, medio_pago: 'mp_qr', fecha: '21:55 hs', estado: 'emitido' },
        ];
        setFacturas(defaults);
      }
    }).catch(() => {});
  }, []);


  const [search, setSearch] = useState('');
  const [ticketActivo, setTicketActivo] = useState<Factura | null>(null);

  const filtered = facturas.filter(f => 
    f.cliente.toLowerCase().includes(search.toLowerCase()) || 
    f.nro_ticket.includes(search)
  );

  const handlePrint = (f: Factura) => {
    addLog('sistema', `SISTEMA: Comprobante impreso de forma remota #${f.nro_ticket}. Destino: Impresora fiscal Epson TM-T20.`);
    toast.success(`Comprobante #${f.nro_ticket} enviado a impresora fiscal — ${f.cliente}`);
  };

  const handleNotaCredito = (id: string) => {
    setFacturas(prev => prev.map(f => {
      if (f.id_factura === id) {
        addLog('sistema', `SISTEMA: Emitida Nota de Crédito fiscal anulando el ticket ${f.nro_ticket} por $${f.total}`);
        return { ...f, estado: 'nota_credito' };
      }
      return f;
    }));
  };

  const c_total = facturas.reduce((acc, f) => f.estado === 'emitido' ? acc + f.total : acc, 0);
  const c_iva = facturas.reduce((acc, f) => f.estado === 'emitido' ? acc + f.iva_veintiuno : acc, 0);

  return (
    <div className="space-y-6">
      
      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Facturado Neto Comercial</span>
          <h4 className="text-2xl font-black text-stone-904 font-mono mt-1">${(c_total - c_iva).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h4>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">I.V.A. Débito Fiscal (21%)</span>
          <h4 className="text-2xl font-black text-[#624A3E] font-mono mt-1">${c_iva.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h4>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs border-l-4 border-l-emerald-600">
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Total Recaudado Bruto</span>
          <h4 className="text-2xl font-black text-emerald-600 font-mono mt-1">${c_total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h4>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-stone-100">
          <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#624A3E]" />
            Auditoría de Comprobantes Emitidos A/B (Consola AFIP)
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input 
              type="text"
              placeholder="Buscar por cliente o ticket..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
            />
          </div>
        </div>

        {/* Invoices list */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-105 text-stone-400 uppercase text-[9px] font-black tracking-wider">
                <th className="py-2.5 px-3">Nro Ticket</th>
                <th className="py-2.5 px-3">Fecha</th>
                <th className="py-2.5 px-3">Cliente / CUIT</th>
                <th className="py-2.5 px-3 text-right">Monto Neto</th>
                <th className="py-2.5 px-3 text-right">I.V.A (21%)</th>
                <th className="py-2.5 px-3 text-right">Suma Total</th>
                <th className="py-2.5 px-3 text-center">F. Pago</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
                <th className="py-2.5 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => {
                const isNCD = f.estado === 'nota_credito';

                return (
                  <tr key={f.id_factura} className={`border-b border-stone-100 hover:bg-stone-50/50 transition-colors ${isNCD ? 'opacity-60 bg-red-50/10' : ''}`}>
                    <td className="py-3 px-3 font-mono font-bold text-stone-800">{f.nro_ticket}</td>
                    <td className="py-3 px-3 font-medium text-stone-400">{f.fecha}</td>
                    <td className="py-3 px-3">
                      <span className="font-extrabold text-stone-900 block">{f.cliente}</span>
                      <span className="text-[10px] text-stone-400 font-mono">{f.cuit}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-stone-550">${(f.total - f.iva_veintiuno).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-3 text-right font-mono text-stone-400">${f.iva_veintiuno.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td className={`py-3 px-3 text-right font-mono font-extrabold ${isNCD ? 'text-red-500 line-through' : 'text-stone-900'}`}>
                      ${f.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-center uppercase text-[9px] font-black text-[#624A3E]">
                      {f.medio_pago.replace('mp_', '')}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        isNCD 
                          ? 'bg-rose-50 text-rose-600 border-rose-100' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        {isNCD ? 'Anulado' : 'Válido'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                      <button 
                        onClick={() => handlePrint(f)}
                        className="p-1.5 rounded-lg bg-stone-50 hover:bg-[#624A3E]/10 text-stone-500 hover:text-[#624A3E] transition-all cursor-pointer"
                        title="Reimprimir Comprobante"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      {!isNCD && (
                        <button 
                          onClick={() => handleNotaCredito(f.id_factura)}
                          className="p-1 px-2 text-[9px] font-black rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-150 transition-colors cursor-pointer"
                          title="Volver Nota de Crédito"
                        >
                          Anular NC
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
  );
}
