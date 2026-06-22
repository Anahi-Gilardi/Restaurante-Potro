import { jsPDF } from 'jspdf';
import { TicketData, TicketItem } from '../types';

let logoDataUrlCache: string | null | undefined;

const BRAND = {
  brown: [98, 74, 62] as const,
  dark: [35, 31, 28] as const,
  cream: [245, 241, 233] as const,
  muted: [120, 113, 108] as const,
  line: [219, 213, 204] as const
};

const money = (value: number) => `$${Number(value || 0).toLocaleString('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}`;

const itemUnit = (item: TicketItem) => item.precio_unitario ?? item.precioUnitario ?? 0;

const loadLogoDataUrl = async () => {
  if (logoDataUrlCache !== undefined) return logoDataUrlCache;

  try {
    if (typeof window !== 'undefined') {
      const customLogo = localStorage.getItem('el_potro_custom_logo');
      if (customLogo) {
        logoDataUrlCache = customLogo;
        return logoDataUrlCache;
      }
    }

    const response = await fetch('/logo-el-patron.jpeg');
    const blob = await response.blob();
    logoDataUrlCache = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('No se pudo cargar el logo para PDF:', err);
    logoDataUrlCache = null;
  }

  return logoDataUrlCache;
};

const loadQrDataUrl = async (qrDataText: string | undefined): Promise<string | null> => {
  if (!qrDataText) return null;
  try {
    let qrUrl = qrDataText;
    if (qrDataText.startsWith('{')) {
      try {
        const base64 = btoa(unescape(encodeURIComponent(qrDataText)));
        qrUrl = `https://www.afip.gob.ar/fe/qr/?p=${base64}`;
      } catch (e) {
        console.warn('Error converting QR JSON to Base64:', e);
      }
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(
      `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('No se pudo obtener el QR de AFIP/ARCA, usando fallback:', err);
    return null;
  }
};

const addLogo = (doc: jsPDF, logo: string | null, x: number, y: number, size: number) => {
  if (!logo) return;
  try {
    doc.addImage(logo, 'JPEG', x, y, size, size);
  } catch (err) {
    console.warn('No se pudo insertar el logo en PDF:', err);
  }
};

const sanitizeFile = (value: string) => value.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');

export const pdfService = {
  async exportToPDF(data: TicketData): Promise<void> {
    const doc = await this.generateTicketPDF(data);
    const filename = data.tipoComprobante.startsWith('factura')
      ? `factura-el-patron-${sanitizeFile(data.nroComprobante)}.pdf`
      : `ticket-el-patron-${sanitizeFile(data.nroComprobante || String(data.idPedido))}.pdf`;
    doc.save(filename);
  },

  async generateTicketPDF(data: TicketData): Promise<jsPDF> {
    const logo = await loadLogoDataUrl();
    const qrImage = await loadQrDataUrl(data.qrData);
    return this.generateThermalTicket(data, logo, qrImage);
  },

  generateA4Invoice(data: TicketData, logo: string | null, qrImage: string | null): jsPDF {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 14;
    let y = 14;
    const letter = data.tipoComprobante === 'factura_a' ? 'A' : 'B';
    const cliente = data.clienteNombre || 'Consumidor Final';
    const clienteCuit = data.clienteCuit || (data.cuit.startsWith('99') ? 'Consumidor Final' : data.cuit);

    doc.setFillColor(...BRAND.brown);
    doc.rect(margin, y, 182, 30, 'F');
    addLogo(doc, logo, margin + 4, y + 3, 24);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(data.nombreComercial.toUpperCase(), margin + 34, y + 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(data.razonSocial, margin + 34, y + 19);
    doc.text(`${data.direccion} | ${data.telefono}`, margin + 34, y + 24);

    doc.setFillColor(255, 255, 255);
    doc.rect(margin + 151, y + 5, 23, 20, 'F');
    doc.setTextColor(...BRAND.brown);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(letter, margin + 162.5, y + 14, { align: 'center' });
    doc.setFontSize(6.5);
    doc.text('COD. 061', margin + 162.5, y + 20, { align: 'center' });

    y += 40;

    doc.setTextColor(...BRAND.dark);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Datos del emisor', margin, y);
    doc.text('Datos del comprobante', margin + 105, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.muted);
    doc.text(`CUIT: ${data.cuit}`, margin, y);
    doc.text(`Factura ${letter}: ${data.nroComprobante}`, margin + 105, y);
    y += 5;
    doc.text('IVA: Responsable Inscripto', margin, y);
    doc.text(`Fecha: ${data.fechaHora}`, margin + 105, y);
    y += 5;
    doc.text(`Email: ${data.email}`, margin, y);
    doc.text(`Mesa: ${data.mesa} | Mozo: ${data.mozo}`, margin + 105, y);
    y += 9;

    doc.setFillColor(...BRAND.cream);
    doc.rect(margin, y, 182, 14, 'F');
    doc.setTextColor(...BRAND.dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Cliente: ${cliente}`, margin + 4, y + 6);
    doc.text(`CUIT/DNI: ${clienteCuit}`, margin + 4, y + 11);
    y += 22;

    doc.setFillColor(...BRAND.brown);
    doc.rect(margin, y, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('Cant.', margin + 3, y + 5.5);
    doc.text('Producto', margin + 20, y + 5.5);
    doc.text('Unitario', margin + 142, y + 5.5, { align: 'right' });
    doc.text('Subtotal', margin + 178, y + 5.5, { align: 'right' });
    y += 9;

    doc.setTextColor(...BRAND.dark);
    data.items.forEach((item, i) => {
      const rowHeight = 8;
      if (y > 245) {
        doc.addPage();
        y = 18;
      }
      if (i % 2 === 1) {
        doc.setFillColor(250, 248, 245);
        doc.rect(margin, y - 5.5, 182, rowHeight, 'F');
      }
      doc.setFont('helvetica', 'bold');
      doc.text(String(item.cantidad), margin + 3, y);
      doc.setFont('helvetica', 'normal');
      doc.text(item.descripcion.slice(0, 58), margin + 20, y);
      doc.text(money(itemUnit(item)), margin + 142, y, { align: 'right' });
      doc.text(money(item.subtotal), margin + 178, y, { align: 'right' });
      y += rowHeight;
    });

    y += 4;
    doc.setDrawColor(...BRAND.line);
    doc.line(margin, y, margin + 182, y);
    y += 8;

    const totalX = margin + 116;
    const totalValueX = margin + 178;
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.dark);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal', totalX, y);
    doc.text(money(data.subtotal), totalValueX, y, { align: 'right' });
    y += 6;
    if (data.descuento > 0) {
      doc.text('Descuentos', totalX, y);
      doc.text(`-${money(data.descuento)}`, totalValueX, y, { align: 'right' });
      y += 6;
    }
    if (data.propina > 0) {
      doc.text('Propina sugerida', totalX, y);
      doc.text(money(data.propina), totalValueX, y, { align: 'right' });
      y += 6;
    }
    doc.text('IVA 21% incluido', totalX, y);
    doc.text(money(data.iva), totalValueX, y, { align: 'right' });
    y += 8;

    doc.setFillColor(...BRAND.brown);
    doc.rect(totalX - 4, y - 5.5, 66, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TOTAL', totalX, y + 1);
    doc.text(money(data.total), totalValueX, y + 1, { align: 'right' });
    y += 18;

    doc.setTextColor(...BRAND.dark);
    doc.setFontSize(8.5);
    doc.text('Medios de pago', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    data.metodosPago.forEach(mp => {
      doc.text(`${mp.metodo.toUpperCase()}: ${money(mp.monto)}`, margin, y);
      y += 5;
    });
    if (data.vuelto > 0) {
      doc.text(`Vuelto efectivo: ${money(data.vuelto)}`, margin, y);
      y += 5;
    }

    if (qrImage) {
      try {
        doc.addImage(qrImage, 'PNG', margin, 262, 18, 18);
      } catch (err) {
        console.warn('Error inserting QR image, falling back to mock box:', err);
        doc.setDrawColor(...BRAND.brown);
        doc.rect(margin, 266, 18, 18);
        doc.setFontSize(5.5);
        doc.setTextColor(...BRAND.brown);
        doc.text('AFIP QR', margin + 5, 276);
      }
    } else {
      doc.setDrawColor(...BRAND.brown);
      doc.rect(margin, 266, 18, 18);
      doc.setFontSize(5.5);
      doc.setTextColor(...BRAND.brown);
      doc.text('AFIP QR', margin + 5, 276);
    }
    doc.setTextColor(...BRAND.muted);
    doc.setFontSize(7.5);
    doc.text(`CAE Nro: ${data.cae || '732049182390'} | Vto: ${data.vto || '15/12/2026'}`, margin + 24, 272);
    doc.text(data.mensajePie || 'Gracias por su visita.', margin + 24, 278);

    return doc;
  },

  generateThermalTicket(data: TicketData, logo: string | null, qrImage: string | null = null): jsPDF {
    const wrappedRows = data.items.map(item => ({
      item,
      lines: Math.max(1, Math.ceil(item.descripcion.length / 22))
    }));

    let extraHeight = 0;
    if (qrImage) extraHeight += 24;
    if (data.cae) extraHeight += 12;

    const ticketHeight = Math.max(
      205 + extraHeight,
      118 + extraHeight + wrappedRows.reduce((sum, row) => sum + row.lines * 4.2 + 4, 0) + data.metodosPago.length * 5
    );
    const doc = new jsPDF('p', 'mm', [80, ticketHeight]);
    let y = 7;

    const center = (text: string, size = 8, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      doc.text(text, 40, y, { align: 'center' });
      y += size * 0.45 + 1.3;
    };

    const line = (offset = 0, dotted = false) => {
      doc.setDrawColor(...BRAND.line);
      if (dotted) {
        doc.setLineDashPattern([0.8, 0.8], 0);
      }
      doc.line(5, y + offset, 75, y + offset);
      if (dotted) {
        doc.setLineDashPattern([], 0); // Reset
      }
      y += 3.5;
    };

    addLogo(doc, logo, 29, y, 22);
    y += logo ? 25 : 2;

    doc.setTextColor(...BRAND.dark);
    center(data.nombreComercial.toUpperCase(), 10, true);
    doc.setTextColor(...BRAND.muted);
    center(`Raz. Soc: ${data.razonSocial}`, 6.5);
    center(`CUIT ${data.cuit}`, 6.5);
    center(data.direccion.slice(0, 42), 6.2);
    center(`Telf: ${data.telefono}`, 6.2);
    y += 1.5;
    line(0, true);

    doc.setTextColor(...BRAND.dark);
    const comprobanteStr = data.tipoComprobante === 'factura_b' 
      ? 'FACTURA B-CONS. FINAL' 
      : (data.tipoComprobante === 'factura_a' ? 'FACTURA A-RESP. INS.' : 'TICKET INTERNO');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`COMPROB.: ${comprobanteStr}`, 5, y);
    y += 4;
    doc.text(`CLIENTE: ${data.clienteNombre.toUpperCase()}`, 5, y);
    y += 4;
    doc.text(`CUIT/DNI: ${data.clienteCuit}`, 5, y);
    y += 4;
    doc.text(`FECHA: ${data.fechaHora}`, 5, y);
    y += 4;
    doc.text(`MESA: ${data.mesa.toUpperCase()}`, 5, y);
    doc.text(`MOZO: ${data.mozo}`, 75, y, { align: 'right' });
    y += 4;
    doc.text(`CAJERO: ${data.cajero.toUpperCase()}`, 5, y);
    y += 5;
    line(0, true);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('DESCRIPCIÓN / CANT.', 5, y);
    doc.text('TOTAL ($)', 75, y, { align: 'right' });
    y += 3.5;
    line(-1, true);

    doc.setFont('helvetica', 'normal');
    data.items.forEach(({ descripcion, cantidad, subtotal }) => {
      const lines = doc.splitTextToSize(descripcion, 42) as string[];
      doc.setFont('helvetica', 'bold');
      doc.text(`${cantidad}x`, 5, y);
      doc.setFont('helvetica', 'normal');
      lines.forEach((text, index) => {
        doc.text(text, 16, y + index * 4);
      });
      doc.setFont('helvetica', 'bold');
      doc.text(money(subtotal), 75, y, { align: 'right' });
      y += Math.max(4, lines.length * 4) + 2.5;
    });

    y += 1;
    line(0, true);

    const sum = (label: string, value: string, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(bold ? 8.5 : 7);
      doc.text(label, 5, y);
      doc.text(value, 75, y, { align: 'right' });
      y += bold ? 5.5 : 4.5;
    };

    doc.setTextColor(...BRAND.dark);
    sum('Subtotal Neto:', money(data.subtotal));
    if (data.descuento > 0) sum('Descuento:', `-${money(data.descuento)}`);
    if (data.propina > 0) sum('Propina (10%):', money(data.propina));
    sum('IVA 21% incluido:', money(data.iva));

    doc.setFillColor(...BRAND.cream);
    doc.rect(5, y - 2, 70, 10, 'F');
    y += 5;
    doc.setTextColor(...BRAND.brown);
    sum('TOTAL CUENTA:', money(data.total), true);
    doc.setTextColor(...BRAND.dark);
    y += 2;
    line(0, true);

    center('Medios de pago', 7, true);
    data.metodosPago.forEach(mp => {
      sum(mp.metodo.toUpperCase(), money(mp.monto));
    });
    if (data.vuelto > 0) sum('Vuelto efectivo:', money(data.vuelto));

    y += 2;
    line(0, true);

    if (qrImage) {
      try {
        doc.addImage(qrImage, 'PNG', 31, y, 18, 18);
        y += 21;
      } catch (err) {
        console.warn('Error inserting QR in thermal PDF:', err);
      }
    }
    if (data.cae) {
      center(`CAE: ${data.cae}`, 6.5, true);
      center(`Vto CAE: ${data.vto || ''}`, 6.2);
      y += 2;
      line(0, true);
    }

    center(data.mensajePie || 'Gracias por su visita.', 6.8);
    center('El Patron Restaurante', 7.5, true);
    center('Conserve este comprobante', 6.2);

    return doc;
  },

  async exportShiftClosePDF(data: any): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 14;
    let y = 14;

    const isReporteX = !data.fecha_cierre || data.fecha_cierre.toLowerCase().includes('curso');

    // Header Box with Vintage Color
    doc.setFillColor(...BRAND.brown);
    doc.rect(margin, y, 182, 30, 'F');

    const logo = await loadLogoDataUrl();
    addLogo(doc, logo, margin + 4, y + 3, 24);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(isReporteX ? 'EL PATRÓN - REPORTE PARCIAL (REPORTE X)' : 'EL PATRÓN - CIERRE DE CAJA (REPORTE Z)', margin + 34, y + 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(isReporteX ? 'ARQUEO PARCIAL DE CONTROL EN TURNO' : 'REPORTE CONTROL DE JORNADA FISCAL GASTRO', margin + 34, y + 20);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}`, margin + 34, y + 25);

    y += 40;

    // Cajero info table
    doc.setTextColor(...BRAND.dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Datos de la Sesión', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.muted);
    doc.text(`Responsable Cajero: ${data.usuario_cajero}`, margin, y);
    doc.text(`ID Sesión: ${data.id_cierre}`, margin + 95, y);
    y += 5;
    doc.text(`Apertura Turno: ${data.fecha_apertura}`, margin, y);
    doc.text(`Cierre Turno: ${data.fecha_cierre || 'En curso (Reporte X)'}`, margin + 95, y);
    y += 9;

    // Balance summary
    const movimientos = data.movimientos_manuales || [];
    const sumIngresos = movimientos.filter((m: any) => m.tipo === 'ingreso').reduce((s: number, m: any) => s + m.monto, 0);
    const sumEgresos = movimientos.filter((m: any) => m.tipo === 'egreso').reduce((s: number, m: any) => s + m.monto, 0);
    const esperado = data.monto_apertura + data.monto_ventas + sumIngresos - sumEgresos;

    doc.setFillColor(...BRAND.cream);
    doc.rect(margin, y, 182, 44, 'F');
    doc.setTextColor(...BRAND.dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('CONCILIACIÓN Y ARQUEO DE VALORES', margin + 4, y + 6);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`(+) Saldo Inicial Apertura Caja:`, margin + 4, y + 13);
    doc.text(`${money(data.monto_apertura)}`, margin + 178, y + 13, { align: 'right' });

    doc.text(`(+) Ventas Registradas en Turno:`, margin + 4, y + 19);
    doc.text(`${money(data.monto_ventas)}`, margin + 178, y + 19, { align: 'right' });

    doc.text(`(+) Ingresos Manuales (Caja Chica):`, margin + 4, y + 25);
    doc.text(`${money(sumIngresos)}`, margin + 178, y + 25, { align: 'right' });

    doc.text(`(-) Egresos Manuales (Caja Chica):`, margin + 4, y + 31);
    doc.text(`-${money(sumEgresos)}`, margin + 178, y + 31, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(`(=) Saldo Teórico Esperado:`, margin + 4, y + 38);
    doc.text(`${money(esperado)}`, margin + 178, y + 38, { align: 'right' });

    y += 48;

    // Real cash count
    doc.setFillColor(250, 248, 245);
    doc.rect(margin, y, 182, 18, 'F');
    doc.setTextColor(...BRAND.dark);
    doc.setFont('helvetica', 'bold');
    doc.text(isReporteX ? `(=) Saldo Estimado Físico:` : `(=) Arqueo Físico Declarado:`, margin + 4, y + 6);
    doc.text(`${money(data.monto_real || esperado)}`, margin + 178, y + 6, { align: 'right' });

    const diff = isReporteX ? 0 : (data.diferencia ?? 0);
    const hasDiffErr = diff !== 0;
    if (hasDiffErr) {
      doc.setTextColor(190, 24, 24); // Red warning color
    } else {
      doc.setTextColor(21, 128, 61); // Green success color
    }
    doc.text(`(±) Diferencia Conciliación de Caja:`, margin + 4, y + 12);
    doc.text(`${diff > 0 ? '+' : ''}${money(diff)}`, margin + 178, y + 12, { align: 'right' });

    y += 24;

    // Petty Cash movements section
    if (movimientos.length > 0) {
      doc.setTextColor(...BRAND.dark);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Detalle de Movimientos de Caja Chica', margin, y);
      y += 5;

      doc.setFillColor(...BRAND.brown);
      doc.rect(margin, y, 182, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('Fecha/Hora', margin + 4, y + 5);
      doc.text('Concepto / Descripción', margin + 45, y + 5);
      doc.text('Tipo', margin + 130, y + 5);
      doc.text('Monto ($)', margin + 178, y + 5, { align: 'right' });
      y += 7;

      doc.setTextColor(...BRAND.dark);
      doc.setFont('helvetica', 'normal');
      movimientos.forEach((m: any, idx: number) => {
        const rowHeight = 7;
        if (idx % 2 === 1) {
          doc.setFillColor(250, 248, 245);
          doc.rect(margin, y, 182, rowHeight, 'F');
        }
        const timeStr = new Date(m.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs';
        doc.text(timeStr, margin + 4, y + 5);
        doc.text(m.concepto.slice(0, 45), margin + 45, y + 5);
        doc.text(m.tipo.toUpperCase(), margin + 130, y + 5);
        doc.text(money(m.monto), margin + 178, y + 5, { align: 'right' });
        y += rowHeight;
      });
      y += 6;
    }

    // Payment details if registers are present
    if (data.registros_totales) {
      doc.setTextColor(...BRAND.dark);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Desglose de Ventas por Medio de Pago', margin, y);
      y += 5;

      doc.setFillColor(...BRAND.brown);
      doc.rect(margin, y, 182, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('Medio de Pago', margin + 4, y + 5);
      doc.text('Total Acumulado ($)', margin + 178, y + 5, { align: 'right' });
      y += 7;

      doc.setTextColor(...BRAND.dark);
      doc.setFont('helvetica', 'normal');
      const medios = [
        { key: 'efectivo', label: 'Efectivo' },
        { key: 'debito', label: 'Tarjeta de Débito' },
        { key: 'credito', label: 'Tarjeta de Crédito' },
        { key: 'transferencia', label: 'Transferencia Bancaria' },
        { key: 'mercadopago', label: 'MercadoPago QR' }
      ];

      medios.forEach((m, idx) => {
        const val = (data.registros_totales as any)[m.key] || 0;
        const rowHeight = 7;
        if (idx % 2 === 1) {
          doc.setFillColor(250, 248, 245);
          doc.rect(margin, y, 182, rowHeight, 'F');
        }
        doc.text(m.label, margin + 4, y + 5);
        doc.text(money(val), margin + 178, y + 5, { align: 'right' });
        y += rowHeight;
      });
      y += 6;
    }

    // Observations
    doc.setTextColor(...BRAND.dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Observaciones:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.muted);
    const obsText = data.observaciones || 'Sin observaciones asentadas.';
    const splitObs = doc.splitTextToSize(obsText, 180);
    doc.text(splitObs, margin, y);
    
    y += (splitObs.length * 4) + 18;

    // Signature Lines
    doc.setDrawColor(...BRAND.line);
    doc.line(margin + 10, y, margin + 70, y);
    doc.line(margin + 110, y, margin + 170, y);
    y += 4;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.dark);
    doc.text(isReporteX ? 'Firma Cajero Supervisor' : 'Firma Cajero Responsable', margin + 40, y, { align: 'center' });
    doc.text('Firma Supervisor de Salón', margin + 140, y, { align: 'center' });

    const filename = isReporteX ? `reporte-x-caja-${data.id_cierre}.pdf` : `arqueo-cierre-caja-${data.id_cierre}.pdf`;
    doc.save(filename);
  },

  async exportPreparationTicketPDF(pedido: any, tipo: 'cocina' | 'barra'): Promise<void> {
    const isBarItem = (it: any) => {
      const cat = (it.categoria || '').toLowerCase();
      const nom = (it.nombre || '').toLowerCase();
      return (
        cat.includes('bebida') ||
        cat.includes('bodega') ||
        cat.includes('vino') ||
        nom.includes('vino') ||
        nom.includes('gaseosa') ||
        nom.includes('agua') ||
        nom.includes('cerveza')
      );
    };

    const filteredItems = pedido.items.filter((it: any) => {
      const isBar = isBarItem(it);
      return tipo === 'barra' ? isBar : !isBar;
    });

    if (filteredItems.length === 0) {
      throw new Error(`No hay productos de ${tipo === 'barra' ? 'Barra' : 'Cocina'} en este pedido.`);
    }

    const wrappedRows = filteredItems.map((item: any) => ({
      item,
      lines: Math.max(1, Math.ceil(item.nombre.length / 22))
    }));
    const ticketHeight = Math.max(
      120,
      60 + wrappedRows.reduce((sum: number, row: any) => sum + row.lines * 4.2 + 4, 0)
    );
    const doc = new jsPDF('p', 'mm', [80, ticketHeight]);
    let y = 7;

    const center = (text: string, size = 8, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      doc.text(text, 40, y, { align: 'center' });
      y += size * 0.45 + 1.3;
    };

    const line = (offset = 0) => {
      doc.setDrawColor(219, 213, 204);
      doc.line(5, y + offset, 75, y + offset);
      y += 3.5;
    };

    doc.setFillColor(98, 74, 62);
    doc.rect(5, y, 70, 13, 'F');
    doc.setTextColor(255, 255, 255);
    y += 5;
    center('EL PATRON', 10, true);
    center(`COMANDA DE ${tipo.toUpperCase()}`, 7, false);
    y += 5;

    doc.setTextColor(35, 31, 28);
    center(`MESA: ${pedido.numero_mesa}`, 11, true);
    center(`Pedido #${pedido.id_pedido}`, 7.5);
    y += 1.5;
    line();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Mozo: ${pedido.mozo}`, 5, y);
    doc.text(`Hora: ${new Date(pedido.fecha_hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs`, 75, y, { align: 'right' });
    y += 5;
    line();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Cant.', 5, y);
    doc.text('Producto / Descripción', 16, y);
    y += 3.5;
    line(-1);

    doc.setFont('helvetica', 'normal');
    filteredItems.forEach(({ nombre, cantidad }: any) => {
      const lines = doc.splitTextToSize(nombre, 42) as string[];
      doc.setFont('helvetica', 'bold');
      doc.text(`${cantidad}x`, 5, y);
      doc.setFont('helvetica', 'normal');
      lines.forEach((text, index) => {
        doc.text(text, 16, y + index * 4);
      });
      y += Math.max(4, lines.length * 4) + 2.5;
    });

    if (pedido.observaciones) {
      line();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('OBSERVACIONES:', 5, y);
      y += 3.5;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      const splitObs = doc.splitTextToSize(pedido.observaciones, 70);
      splitObs.forEach((lineText: string) => {
        doc.text(lineText, 5, y);
        y += 4;
      });
    }

    doc.save(`comanda-${tipo}-${pedido.id_pedido}.pdf`);
  }
};
