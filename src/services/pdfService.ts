import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
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

    const response = await fetch('/logo-el-patron.jpeg?v=5');
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
        qrUrl = `https://www.arca.gob.ar/fe/qr/?p=${base64}`;
      } catch (e) {
        console.warn('Error converting QR JSON to Base64:', e);
      }
    }
    return await QRCode.toDataURL(qrUrl, { errorCorrectionLevel: 'M', margin: 1, width: 256 });
  } catch (err) {
    console.warn('No se pudo obtener el QR de AFIP/ARCA, usando fallback:', err);
    return null;
  }
};

const addLogo = (doc: jsPDF, logo: string | null, x: number, y: number, size: number) => {
  if (!logo) return;
  try {
    const isPng = logo.includes('iVBORw');
    const format = isPng ? 'PNG' : 'JPEG';
    doc.addImage(logo, format, x, y, size, size);
  } catch (err) {
    console.warn('No se pudo insertar el logo en PDF:', err);
  }
};

const sanitizeFile = (value: string) => value.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');

export const pdfService = {
  async exportToPDF(data: TicketData): Promise<void> {
    const doc = await this.generateTicketPDF(data);
    const filename = data.tipoComprobante.startsWith('factura') || data.tipoComprobante.startsWith('nota_credito')
      ? `factura-el-patron-${sanitizeFile(data.nroComprobante)}.pdf`
      : `ticket-el-patron-${sanitizeFile(data.nroComprobante || String(data.idPedido))}.pdf`;
    doc.save(filename);
  },

  async generateTicketPDF(data: TicketData): Promise<jsPDF> {
    const logo = await loadLogoDataUrl();
    const isFiscal = data.tipoComprobante.startsWith('factura') || data.tipoComprobante.startsWith('nota_credito');

    // Un QR fiscal solo puede generarse para una factura autorizada con CAE/CAEA real.
    const qrImage = isFiscal && data.cae ? await loadQrDataUrl(data.qrData) : null;

    if (isFiscal) {
      return this.generateA4Invoice(data, logo, qrImage);
    }

    // Los tickets de Caja son internos, térmicos y nunca reciben CAE ni QR fiscal.
    return this.generateThermalTicket(data, logo);
  },

  generateA4Invoice(data: TicketData, logo: string | null, qrImage: string | null): jsPDF {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 14;
    let y = 14;
    const compType = data.tipoComprobante as string;
    const letter = compType === 'factura_a' ? 'A' : (compType === 'factura_c' || compType === 'nota_credito_c' ? 'C' : 'B');
    const isCreditNoteC = compType === 'nota_credito_c';
    const cliente = data.clienteNombre || 'Consumidor Final';
    const clienteCuit = data.clienteCuit || (!data.cuit || data.cuit.startsWith('99') ? 'Consumidor Final' : data.cuit);

    // Top Brand Accent Line
    doc.setFillColor(...BRAND.brown);
    doc.rect(margin, y, 182, 1.5, 'F');
    y += 4;

    // Header Content Layout (Clean & Open)
    if (logo) {
      addLogo(doc, logo, margin, y, 22);
    }
    
    const detailsX = logo ? margin + 26 : margin;
    
    doc.setTextColor(...BRAND.brown);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(data.nombreComercial.toUpperCase(), detailsX, y + 5);
    
    doc.setTextColor(...BRAND.dark);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(data.razonSocial, detailsX, y + 10);
    
    doc.setTextColor(...BRAND.muted);
    doc.setFontSize(8);
    doc.text(`${data.direccion} | Tel: ${data.telefono}`, detailsX, y + 14);
    doc.text(`Email: ${data.email}`, detailsX, y + 18);

    // Invoice type letter badge on the right
    doc.setFillColor(...BRAND.cream);
    doc.rect(margin + 152, y, 30, 20, 'F');
    doc.setDrawColor(...BRAND.brown);
    doc.setLineWidth(0.3);
    doc.rect(margin + 152, y, 30, 20, 'D');

    doc.setTextColor(...BRAND.brown);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(letter, margin + 167, y + 11, { align: 'center' });
    doc.setTextColor(...BRAND.dark);
    doc.setFontSize(7);
    const codComprobante = compType === 'factura_a' ? 'COD. 001' : isCreditNoteC ? 'COD. 013' : (compType === 'factura_c' ? 'COD. 011' : 'COD. 006');
    doc.text(codComprobante, margin + 167, y + 16, { align: 'center' });

    y += 26;

    // Divider Line
    doc.setDrawColor(...BRAND.line);
    doc.setLineWidth(0.2);
    doc.line(margin, y, margin + 182, y);
    y += 6;

    // Two Columns for Emisor / Comprobante
    doc.setTextColor(...BRAND.dark);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL EMISOR', margin, y);
    doc.text('DATOS DEL COMPROBANTE', margin + 102, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.muted);
    doc.setFontSize(8.5);
    doc.text(`CUIT: ${data.cuit}`, margin, y);
    doc.text(`Comprobante: ${isCreditNoteC ? 'Nota de Crédito C' : `Factura ${letter}`}`, margin + 102, y);
    y += 4.5;
    doc.text(`IVA: ${data.condicionIvaEmisor || (letter === 'C' ? 'Monotributo' : 'Responsable Inscripto')}`, margin, y);
    doc.text(`Nro Comprobante: ${data.nroComprobante}`, margin + 102, y);
    y += 4.5;
    doc.text(`IIBB: ${data.ingresosBrutos || 'No informado'}`, margin, y);
    doc.text(`Fecha/Hora: ${data.fechaHora}`, margin + 102, y);
    y += 4.5;
    doc.text(`Inicio actividades: ${data.inicioActividades || 'No informado'}`, margin, y);
    doc.text(`Tipo: ${isCreditNoteC ? 'Nota de Crédito C' : `Factura ${letter}`}`, margin + 102, y);
    y += 4.5;
    doc.text(`Email: ${data.email}`, margin, y);
    doc.text(`Mesa: ${data.mesa} | Mozo: ${data.mozo}`, margin + 102, y);
    y += 8;

    // Customer Card
    doc.setFillColor(...BRAND.cream);
    doc.setDrawColor(...BRAND.line);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, 182, 16, 'FD');

    doc.setTextColor(...BRAND.brown);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('DATOS DEL RECEPTOR (CLIENTE)', margin + 4, y + 5);

    doc.setTextColor(...BRAND.dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`Cliente: ${cliente}`, margin + 4, y + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`CUIT/DNI: ${clienteCuit}`, margin + 105, y + 8);
    doc.setFontSize(7.5);
    doc.text(`IVA: ${data.condicionIvaReceptor || 'Consumidor Final'}`, margin + 105, y + 12.5);
    
    y += 22;

    // Items Table Header
    doc.setFillColor(...BRAND.brown);
    doc.rect(margin, y, 182, 7.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Cant.', margin + 4, y + 4.8);
    doc.text('Producto / Descripción', margin + 20, y + 4.8);
    doc.text('Precio Unit.', margin + 142, y + 4.8, { align: 'right' });
    doc.text('Subtotal', margin + 178, y + 4.8, { align: 'right' });
    y += 13;

    // Items List
    doc.setTextColor(...BRAND.dark);
    data.items.forEach((item, i) => {
      const rowHeight = 8;
      if (y > 245) {
        doc.addPage();
        y = 18;
        doc.setFillColor(...BRAND.brown);
        doc.rect(margin, y, 182, 7.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('Cant.', margin + 4, y + 4.8);
        doc.text('Producto / Descripción', margin + 20, y + 4.8);
        doc.text('Precio Unit.', margin + 142, y + 4.8, { align: 'right' });
        doc.text('Subtotal', margin + 178, y + 4.8, { align: 'right' });
        y += 13;
        doc.setTextColor(...BRAND.dark);
      }
      
      if (i % 2 === 1) {
        doc.setFillColor(250, 248, 245);
        doc.rect(margin, y - 5.5, 182, rowHeight, 'F');
      }
      
      doc.setDrawColor(...BRAND.line);
      doc.setLineWidth(0.1);
      doc.line(margin, y + rowHeight - 5.5, margin + 182, y + rowHeight - 5.5);

      doc.setFont('helvetica', 'bold');
      doc.text(String(item.cantidad), margin + 4, y);
      doc.setFont('helvetica', 'normal');
      doc.text(item.descripcion.slice(0, 58), margin + 20, y);
      doc.text(money(itemUnit(item)), margin + 142, y, { align: 'right' });
      doc.text(money(item.subtotal), margin + 178, y, { align: 'right' });
      y += rowHeight;
    });

    y += 4;
    if (y > 200) {
      doc.addPage();
      y = 18;
    }
    
    doc.setDrawColor(...BRAND.line);
    doc.setLineWidth(0.2);
    doc.line(margin, y, margin + 182, y);
    y += 8;

    // Totals Panel
    const totalX = margin + 116;
    const totalValueX = margin + 178;
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.dark);
    doc.setFont('helvetica', 'normal');
    doc.text(letter === 'C' ? 'Subtotal' : 'Subtotal Neto', totalX, y);
    doc.text(money(data.subtotal), totalValueX, y, { align: 'right' });
    y += 5.5;
    
    if (data.descuento > 0) {
      doc.text('Bonificación', totalX, y);
      doc.text(`-${money(data.descuento)}`, totalValueX, y, { align: 'right' });
      y += 5.5;
    }
    if (data.propina > 0) {
      doc.text('Propina Sugerida', totalX, y);
      doc.text(money(data.propina), totalValueX, y, { align: 'right' });
      y += 5.5;
    }
    if (letter !== 'C') {
      doc.text('IVA 21% Incluido', totalX, y);
      doc.text(money(data.iva), totalValueX, y, { align: 'right' });
      y += 8;
    } else {
      y += 3;
    }

    // Total Highlight Box
    doc.setFillColor(...BRAND.cream);
    doc.setDrawColor(...BRAND.brown);
    doc.setLineWidth(0.5);
    doc.rect(totalX - 4, y - 5, 66, 9.5, 'FD');
    doc.setTextColor(...BRAND.brown);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TOTAL GENERAL', totalX, y + 1.2);
    doc.text(money(data.total), totalValueX, y + 1.2, { align: 'right' });
    y += 18;

    if (y > 220) {
      doc.addPage();
      y = 18;
    }
    
    // Payment Methods
    doc.setTextColor(...BRAND.dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('MEDIOS DE PAGO', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    data.metodosPago.forEach(mp => {
      if (y > 245) {
        doc.addPage();
        y = 18;
      }
      doc.text(`${mp.metodo.toUpperCase()}: ${money(mp.monto)}`, margin, y);
      y += 4.5;
    });
    if (data.vuelto > 0) {
      if (y > 245) {
        doc.addPage();
        y = 18;
      }
      doc.text(`Vuelto entregado: ${money(data.vuelto)}`, margin, y);
      y += 4.5;
    }

    // AFIP/ARCA Footer CAE + QR
    y = 260;
    doc.setDrawColor(...BRAND.line);
    doc.setLineWidth(0.2);
    doc.line(margin, y - 2, margin + 182, y - 2);

    if (data.cae) {
      if (qrImage) {
        try {
          doc.addImage(qrImage, 'PNG', margin, y, 18, 18);
        } catch (err) {
          console.warn('No se pudo insertar el QR fiscal en el PDF:', err);
        }
      }
      doc.setTextColor(...BRAND.muted);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Comprobante electrónico autorizado por ARCA', margin + 24, y + 5);
      doc.text(`CAE Nro: ${data.cae} | Vto: ${data.vto || '-'}`, margin + 24, y + 10);
      doc.setTextColor(...BRAND.dark);
      doc.setFont('helvetica', 'italic');
      doc.text(data.mensajePie || 'Gracias por su visita.', margin + 24, y + 15);
    } else {
      doc.setDrawColor(190, 24, 24);
      doc.setTextColor(190, 24, 24);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('DOCUMENTO X - NO VALIDO COMO FACTURA', margin, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('Documento interno sin autorización ni CAE de ARCA.', margin, y + 12);
    }

    return doc;
  },

  generateThermalTicket(data: TicketData, logo: string | null): jsPDF {
    const rawConfig = typeof window !== 'undefined' ? localStorage.getItem('el_patron_printer_config') : null;
    let is58 = false;
    if (rawConfig) {
      try {
        const parsed = JSON.parse(rawConfig);
        if (parsed.paperWidth === '58mm') {
          is58 = true;
        }
      } catch (e) {
        // ignore
      }
    }

    const pageWidth = is58 ? 58 : 80;
    const margin = is58 ? 3 : 5;
    const rightAlignX = pageWidth - margin;
    const centerAlignX = pageWidth / 2;
    const wrapWidth = pageWidth - (margin * 2);

    // Dummy document to calculate dimensions precisely
    const dummy = new jsPDF('p', 'mm', [pageWidth, 300]);
    dummy.setFont('helvetica', 'bold');
    dummy.setFontSize(7.5);
    const wrappedRows = data.items.map(item => {
      const lines = dummy.splitTextToSize(item.descripcion, wrapWidth - 2) as string[];
      return lines.length;
    });

    const ticketHeight = Math.max(
      is58 ? 160 : 165,
      135 + (logo ? 24 : 0) + wrappedRows.reduce((sum, linesCount) => sum + linesCount * 3.8 + 8, 0) +
      data.metodosPago.length * 5,
    );

    const doc = new jsPDF('p', 'mm', [pageWidth, ticketHeight]);
    let y = 6;

    const center = (text: string, size = 8, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      const lines = String(text).split('\n');
      lines.forEach(lineText => {
        const wrapped = doc.splitTextToSize(lineText, wrapWidth) as string[];
        wrapped.forEach(wLine => {
          doc.text(wLine, centerAlignX, y, { align: 'center' });
          y += size * 0.45 + 1.2;
        });
      });
    };

    const line = (offset = 0) => {
      doc.setDrawColor(...BRAND.line);
      doc.setLineWidth(0.15);
      doc.line(margin, y + offset, rightAlignX, y + offset);
      y += 3;
    };

    if (logo) {
      const logoX = centerAlignX - 11;
      addLogo(doc, logo, logoX, y, 22);
      y += 24;
    } else {
      y += 2;
    }

    center(data.nombreComercial.toUpperCase(), 11, true);
    center('TICKET DE CONSUMO', 8, true);
    center('DOCUMENTO NO VALIDO COMO FACTURA', 6.5, false);
    y += 1.5;

    // El ticket interno de Caja no es un comprobante fiscal: no debe exponer
    // razon social, CUIT ni datos personales/fiscales del titular. Esos datos
    // se imprimen exclusivamente en generateA4Invoice para facturas reales.
    doc.setTextColor(...BRAND.dark);
    line();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(`TICKET Nº: ${data.nroComprobante}`, margin, y);
    y += 4;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.muted);
    doc.text(`Fecha: ${data.fechaHora}`, margin, y);
    y += 4;
    doc.text(`Mesa: ${data.mesa.toUpperCase()}`, margin, y);
    doc.text(`Mozo: ${data.mozo}`, rightAlignX, y, { align: 'right' });
    y += 4;
    doc.text(`Cajero: ${data.cajero}`, margin, y);
    doc.text(`Pedido ID: EP-${data.idPedido}`, rightAlignX, y, { align: 'right' });
    y += 4.5;
    line();

    // Table Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.dark);
    doc.text('Cant.  Producto', margin, y);
    doc.text('Importe', rightAlignX, y, { align: 'right' });
    y += 3.5;
    line(-1);

    // Items list
    doc.setFont('helvetica', 'normal');
    data.items.forEach((item) => {
      const { descripcion, cantidad, subtotal } = item;
      const unitPrice = itemUnit(item);
      
      // Draw product name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...BRAND.dark);
      
      const itemWrapWidth = wrapWidth - 2;
      const lines = doc.splitTextToSize(descripcion, itemWrapWidth) as string[];
      lines.forEach((text, index) => {
        doc.text(text, margin, y + index * 3.8);
      });
      y += (lines.length - 1) * 3.8;

      // Draw quantity and price details
      y += 3.8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(...BRAND.muted);
      
      const priceStr = `   ${cantidad} x ${money(unitPrice)}`;
      doc.text(priceStr, margin, y);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...BRAND.dark);
      doc.text(money(subtotal), rightAlignX, y, { align: 'right' });
      
      y += 5;
    });

    y += 1;
    line();

    const sum = (label: string, value: string, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(bold ? 8.5 : 7);
      doc.setTextColor(bold ? BRAND.brown[0] : BRAND.dark[0], bold ? BRAND.brown[1] : BRAND.dark[1], bold ? BRAND.brown[2] : BRAND.dark[2]);
      doc.text(label, margin, y);
      doc.text(value, rightAlignX, y, { align: 'right' });
      y += bold ? 5.5 : 4.5;
    };

    sum('Subtotal Neto:', money(data.subtotal));
    if (data.descuento > 0) sum('Bonificación:', `-${money(data.descuento)}`);
    if (data.propina > 0) sum('Propina Sugerida:', money(data.propina));
    y += 1;
    doc.setDrawColor(...BRAND.brown);
    doc.setLineWidth(0.4);
    doc.line(margin, y, rightAlignX, y);
    y += 4.5;
    
    sum('TOTAL GENERAL:', money(data.total), true);
    
    y += 1;
    doc.setDrawColor(...BRAND.brown);
    doc.setLineWidth(0.4);
    doc.line(margin, y, rightAlignX, y);
    y += 5;

    doc.setTextColor(...BRAND.dark);
    center('MEDIOS DE PAGO', 7, true);
    y += 1;
    
    data.metodosPago.forEach(mp => {
      sum(`  ${mp.metodo.toUpperCase()}:`, money(mp.monto));
    });
    if (data.vuelto > 0) {
      sum('  Vuelto Efectivo:', money(data.vuelto));
    }

    y += 2;
    line();

    center(data.mensajePie || 'Gracias por su visita.', 7);
    center('El Patron Restaurante', 7.5, true);
    center('Gracias por su visita.', 6.2);

    return doc;
  },

  async exportShiftClosePDF(data: any): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 14;
    let y = 14;

    const isReporteX = !data.fecha_cierre || data.fecha_cierre.toLowerCase().includes('curso');

    let nombreFantasia = 'El Patrón';
    let direccion = 'Fotheringham 33, Rio Cuarto, Córdoba';
    let telefono = '+54 9 3584 37-3711';
    let email = 'bellaoriana47@gmail.com';
    try {
      const saved = localStorage.getItem('el_patron_restaurante_info');
      if (saved) {
        const parsed = JSON.parse(saved);
        nombreFantasia = parsed.nombreComercial || nombreFantasia;
        direccion = parsed.direccion || direccion;
        telefono = parsed.telefono || telefono;
        email = parsed.email || email;
      }
    } catch (e) {}

    // Top Accent Line
    doc.setFillColor(...BRAND.brown);
    doc.rect(margin, y, 182, 1.5, 'F');
    y += 4;

    // Header Content
    const logo = await loadLogoDataUrl();
    if (logo) {
      addLogo(doc, logo, margin, y, 22);
    }
    
    const detailsX = logo ? margin + 26 : margin;

    doc.setTextColor(...BRAND.brown);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    const titleText = isReporteX 
      ? `${nombreFantasia.toUpperCase()} - REPORTE PARCIAL (X)` 
      : `${nombreFantasia.toUpperCase()} - CIERRE DE CAJA (Z)`;
    doc.text(titleText, detailsX, y + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.dark);
    doc.text(isReporteX ? 'ARQUEO PARCIAL DE CONTROL EN TURNO' : 'REPORTE CONTROL DE JORNADA FISCAL GASTRO', detailsX, y + 10);
    doc.setTextColor(...BRAND.muted);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}`, detailsX, y + 14);
    doc.text(`${direccion} | Tel: ${telefono}`, detailsX, y + 18);

    // Decorative Type Indicator
    doc.setFillColor(...BRAND.cream);
    doc.rect(margin + 152, y, 30, 20, 'F');
    doc.setDrawColor(...BRAND.brown);
    doc.setLineWidth(0.3);
    doc.rect(margin + 152, y, 30, 20, 'D');

    doc.setTextColor(...BRAND.brown);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(isReporteX ? 'X' : 'Z', margin + 167, y + 12, { align: 'center' });
    doc.setTextColor(...BRAND.dark);
    doc.setFontSize(6.5);
    doc.text(isReporteX ? 'PARCIAL' : 'FISCAL', margin + 167, y + 17, { align: 'center' });

    y += 26;
    doc.setDrawColor(...BRAND.line);
    doc.setLineWidth(0.2);
    doc.line(margin, y, margin + 182, y);
    y += 6;

    // Cajero info table
    doc.setTextColor(...BRAND.dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('DATOS DE LA SESIÓN DE CAJA', margin, y);
    y += 5;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.muted);
    doc.text(`Responsable Cajero: ${data.usuario_cajero}`, margin, y);
    doc.text(`ID Sesión: ${data.id_cierre}`, margin + 95, y);
    y += 4.5;
    doc.text(`Apertura Turno: ${data.fecha_apertura}`, margin, y);
    doc.text(`Cierre Turno: ${data.fecha_cierre || 'En curso (Reporte X)'}`, margin + 95, y);
    y += 8;

    // Balance summary
    const movimientos = data.movimientos_manuales || [];
    const sumIngresos = movimientos.filter((m: any) => m.tipo === 'ingreso').reduce((s: number, m: any) => s + m.monto, 0);
    const sumEgresos = movimientos.filter((m: any) => m.tipo === 'egreso').reduce((s: number, m: any) => s + m.monto, 0);
    const esperado = data.monto_apertura + data.monto_ventas + sumIngresos - sumEgresos;

    // Conciliación Box
    doc.setFillColor(...BRAND.cream);
    doc.setDrawColor(...BRAND.line);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, 182, 42, 'FD');
    
    doc.setTextColor(...BRAND.brown);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('CONCILIACIÓN Y ARQUEO DE VALORES', margin + 4, y + 6);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.dark);
    doc.text(`(+) Saldo Inicial Apertura Caja:`, margin + 4, y + 13);
    doc.text(`${money(data.monto_apertura)}`, margin + 178, y + 13, { align: 'right' });

    doc.text(`(+) Ventas Registradas en Turno:`, margin + 4, y + 19);
    doc.text(`${money(data.monto_ventas)}`, margin + 178, y + 19, { align: 'right' });

    doc.text(`(+) Ingresos Manuales (Caja Chica):`, margin + 4, y + 25);
    doc.text(`${money(sumIngresos)}`, margin + 178, y + 25, { align: 'right' });

    doc.text(`(-) Egresos Manuales (Caja Chica):`, margin + 4, y + 31);
    doc.text(`-${money(sumEgresos)}`, margin + 178, y + 31, { align: 'right' });

    doc.setDrawColor(...BRAND.line);
    doc.line(margin + 4, y + 34, margin + 178, y + 34);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.brown);
    doc.text(`(=) Saldo Teórico Esperado:`, margin + 4, y + 39);
    doc.text(`${money(esperado)}`, margin + 178, y + 39, { align: 'right' });

    y += 46;

    // Real cash count
    doc.setFillColor(250, 248, 245);
    doc.setDrawColor(...BRAND.line);
    doc.rect(margin, y, 182, 16, 'FD');
    
    doc.setTextColor(...BRAND.dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
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

    y += 22;

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
      doc.text('Fecha/Hora', margin + 4, y + 4.8);
      doc.text('Concepto / Descripción', margin + 45, y + 4.8);
      doc.text('Tipo', margin + 130, y + 4.8);
      doc.text('Monto ($)', margin + 178, y + 4.8, { align: 'right' });
      y += 12;

      doc.setTextColor(...BRAND.dark);
      doc.setFont('helvetica', 'normal');
      movimientos.forEach((m: any, idx: number) => {
        const rowHeight = 7;
        if (y > 270) {
          doc.addPage();
          y = 14;
          doc.setFillColor(...BRAND.brown);
          doc.rect(margin, y, 182, 7, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.text('Fecha/Hora', margin + 4, y + 4.8);
          doc.text('Concepto / Descripción', margin + 45, y + 4.8);
          doc.text('Tipo', margin + 130, y + 4.8);
          doc.text('Monto ($)', margin + 178, y + 4.8, { align: 'right' });
          y += 12;
          doc.setTextColor(...BRAND.dark);
          doc.setFont('helvetica', 'normal');
        }
        
        if (idx % 2 === 1) {
          doc.setFillColor(250, 248, 245);
          doc.rect(margin, y - 5, 182, rowHeight, 'F');
        }
        
        doc.setDrawColor(...BRAND.line);
        doc.setLineWidth(0.1);
        doc.line(margin, y + rowHeight - 5, margin + 182, y + rowHeight - 5);

        const timeStr = new Date(m.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs';
        doc.text(timeStr, margin + 4, y);
        doc.text(m.concepto.slice(0, 45), margin + 45, y);
        doc.text(m.tipo.toUpperCase(), margin + 130, y);
        doc.text(money(m.monto), margin + 178, y, { align: 'right' });
        y += rowHeight;
      });
      y += 6;
    }

    // Payment details if registers are present
    if (data.registros_totales) {
      if (y > 240) {
        doc.addPage();
        y = 14;
      }
      doc.setTextColor(...BRAND.dark);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Desglose de Ventas por Medio de Pago', margin, y);
      y += 5;

      doc.setFillColor(...BRAND.brown);
      doc.rect(margin, y, 182, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('Medio de Pago', margin + 4, y + 4.8);
      doc.text('Total Acumulado ($)', margin + 178, y + 4.8, { align: 'right' });
      y += 12;

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
        if (y > 270) {
          doc.addPage();
          y = 14;
          doc.setFillColor(...BRAND.brown);
          doc.rect(margin, y, 182, 7, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.text('Medio de Pago', margin + 4, y + 4.8);
          doc.text('Total Acumulado ($)', margin + 178, y + 4.8, { align: 'right' });
          y += 12;
          doc.setTextColor(...BRAND.dark);
          doc.setFont('helvetica', 'normal');
        }
        
        if (idx % 2 === 1) {
          doc.setFillColor(250, 248, 245);
          doc.rect(margin, y - 5, 182, rowHeight, 'F');
        }
        
        doc.setDrawColor(...BRAND.line);
        doc.setLineWidth(0.1);
        doc.line(margin, y + rowHeight - 5, margin + 182, y + rowHeight - 5);

        doc.text(m.label, margin + 4, y);
        doc.text(money(val), margin + 178, y, { align: 'right' });
        y += rowHeight;
      });
      y += 6;
    }

    // Resumen de Artículos / Comidas Vendidas
    if (data.desglose_productos && data.desglose_productos.length > 0) {
      if (y > 220) {
        doc.addPage();
        y = 14;
      }
      doc.setTextColor(...BRAND.dark);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Resumen de Artículos / Comidas Vendidas', margin, y);
      y += 5;

      doc.setFillColor(...BRAND.brown);
      doc.rect(margin, y, 182, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('Artículo / Producto', margin + 4, y + 4.8);
      doc.text('Cant.', margin + 130, y + 4.8, { align: 'right' });
      doc.text('Total Acumulado ($)', margin + 178, y + 4.8, { align: 'right' });
      y += 12;

      doc.setTextColor(...BRAND.dark);
      doc.setFont('helvetica', 'normal');
      data.desglose_productos.forEach((item: any, idx: number) => {
        const rowHeight = 7;
        if (y > 270) {
          doc.addPage();
          y = 14;
          doc.setFillColor(...BRAND.brown);
          doc.rect(margin, y, 182, 7, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.text('Artículo / Producto', margin + 4, y + 4.8);
          doc.text('Cant.', margin + 130, y + 4.8, { align: 'right' });
          doc.text('Total Acumulado ($)', margin + 178, y + 4.8, { align: 'right' });
          y += 12;
          doc.setTextColor(...BRAND.dark);
          doc.setFont('helvetica', 'normal');
        }
        
        if (idx % 2 === 1) {
          doc.setFillColor(250, 248, 245);
          doc.rect(margin, y - 5, 182, rowHeight, 'F');
        }
        
        doc.setDrawColor(...BRAND.line);
        doc.setLineWidth(0.1);
        doc.line(margin, y + rowHeight - 5, margin + 182, y + rowHeight - 5);

        doc.text(String(item.nombre).slice(0, 50), margin + 4, y);
        doc.text(String(item.cantidad), margin + 130, y, { align: 'right' });
        doc.text(money(item.total), margin + 178, y, { align: 'right' });
        y += rowHeight;
      });
      y += 6;
    }

    // Observations
    if (y > 220) {
      doc.addPage();
      y = 14;
    }
    
    doc.setTextColor(...BRAND.dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('OBSERVACIONES DE CIERRE', margin, y);
    y += 5;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.muted);
    const obsText = data.observaciones || 'Sin observaciones asentadas.';
    const splitObs = doc.splitTextToSize(obsText, 180);
    doc.text(splitObs, margin, y);
    
    y += (splitObs.length * 4) + 18;

    // Signature Lines
    if (y > 260) {
      doc.addPage();
      y = 30;
    }
    
    doc.setDrawColor(...BRAND.line);
    doc.setLineWidth(0.25);
    doc.line(margin + 10, y, margin + 70, y);
    doc.line(margin + 110, y, margin + 170, y);
    y += 4.5;
    
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.dark);
    doc.text(isReporteX ? 'Firma Supervisor Turno' : 'Firma Cajero Responsable', margin + 40, y, { align: 'center' });
    doc.text('Firma Gerente / Auditor', margin + 140, y, { align: 'center' });

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
      110,
      50 + wrappedRows.reduce((sum: number, row: any) => sum + row.lines * 4.2 + 8, 0)
    );
    
    const doc = new jsPDF('p', 'mm', [80, ticketHeight]);
    let y = 6;

    const center = (text: string, size = 8, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      const lines = String(text).split('\n');
      lines.forEach(lineText => {
        doc.text(lineText, 40, y, { align: 'center' });
        y += size * 0.45 + 1.2;
      });
    };

    const line = (offset = 0) => {
      doc.setDrawColor(219, 213, 204);
      doc.setLineWidth(0.15);
      doc.line(5, y + offset, 75, y + offset);
      y += 3;
    };

    // Clean framed header for comanda
    doc.setDrawColor(98, 74, 62);
    doc.setLineWidth(0.4);
    doc.rect(5, y, 70, 11, 'D');
    
    doc.setTextColor(98, 74, 62);
    y += 4;
    center('EL PATRÓN', 9, true);
    center(`COMANDA DE ${tipo.toUpperCase()}`, 7.5, false);
    y += 6;

    // Prominent Mesa Number
    doc.setTextColor(35, 31, 28);
    center(`MESA: ${pedido.numero_mesa}`, 15, true);
    center(`Pedido #${pedido.id_pedido}`, 8, false);
    y += 1.5;
    line();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 113, 108);
    doc.text(`Mozo: ${pedido.mozo}`, 5, y);
    doc.text(`Hora: ${new Date(pedido.fecha_hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs`, 75, y, { align: 'right' });
    y += 4;
    line();

    // Table Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(35, 31, 28);
    doc.text('Cant.  Producto / Descripción', 5, y);
    y += 3.5;
    line(-1);

    // Items list
    doc.setFont('helvetica', 'normal');
    filteredItems.forEach(({ nombre, cantidad, notas }: any) => {
      const lines = doc.splitTextToSize(nombre, 48) as string[];
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(`${cantidad}x`, 5, y);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      lines.forEach((text, index) => {
        doc.text(text, 16, y + index * 4);
      });
      y += Math.max(4, lines.length * 4);
      
      // If item has specific item-level notes/observaciones
      if (notas) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(190, 24, 24);
        doc.text(`   * ${notas}`, 16, y);
        y += 4.5;
        doc.setTextColor(35, 31, 28);
      } else {
        y += 1.5;
      }
    });

    // General order level observations highlighted in red warning box
    if (pedido.observaciones) {
      line();
      doc.setFillColor(250, 240, 240); // Soft red background
      doc.setDrawColor(190, 24, 24); // Red border
      doc.setLineWidth(0.2);
      
      const splitObs = doc.splitTextToSize(pedido.observaciones, 66);
      const boxHeight = splitObs.length * 4.2 + 6;
      doc.rect(5, y, 70, boxHeight, 'FD');
      
      doc.setTextColor(190, 24, 24);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('OBSERVACIONES GENERALES:', 7, y + 4.5);
      
      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(7.5);
      splitObs.forEach((lineText: string, idx: number) => {
        doc.text(lineText, 7, y + 9 + idx * 4.2);
      });
      y += boxHeight + 4;
    }

    doc.save(`comanda-${tipo}-${pedido.id_pedido}.pdf`);
  },

  async exportCierreCajaPDF(cierre: any, configRestaurante: any): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 14;
    let y = 14;
    
    // Header banner
    doc.setFillColor(98, 74, 62);
    doc.rect(margin, y, 182, 1.5, 'F');
    y += 8;

    doc.setTextColor(98, 74, 62);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('REPORTE DE ARQUEO Y CIERRE DE CAJA', margin, y);
    y += 6;

    doc.setTextColor(35, 31, 28);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Establecimiento: ${configRestaurante.nombreComercial || 'El Patrón'}`, margin, y);
    doc.text(`Cajero: ${cierre.usuario_cajero}`, margin + 100, y);
    y += 5;

    doc.text(`Fecha Apertura: ${new Date(cierre.fecha_apertura).toLocaleString('es-AR')}`, margin, y);
    doc.text(`Fecha Cierre: ${cierre.fecha_cierre ? new Date(cierre.fecha_cierre).toLocaleString('es-AR') : 'SESIÓN ABIERTA'}`, margin + 100, y);
    y += 8;

    doc.setDrawColor(219, 213, 204);
    doc.setLineWidth(0.2);
    doc.line(margin, y, margin + 182, y);
    y += 8;

    // Resumen financiero
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('RESUMEN FINANCIERO', margin, y);
    y += 6;

    const money = (val: number) => `$${Number(val || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Caja Inicial (Apertura):', margin, y);
    doc.setFont('helvetica', 'bold');
    doc.text(money(cierre.monto_apertura), margin + 60, y);

    doc.setFont('helvetica', 'normal');
    doc.text('Total Ventas Registradas:', margin + 100, y);
    doc.setFont('helvetica', 'bold');
    doc.text(money(cierre.monto_ventas), margin + 150, y);
    y += 6;

    // Manual movements calculation
    const movs = cierre.movimientos_manuales || [];
    const ingresos = movs.filter((m: any) => m.tipo === 'ingreso').reduce((s: number, m: any) => s + m.monto, 0);
    const egresos = movs.filter((m: any) => m.tipo === 'egreso').reduce((s: number, m: any) => s + m.monto, 0);

    doc.setFont('helvetica', 'normal');
    doc.text('Ingresos de Caja Chica (+):', margin, y);
    doc.text(money(ingresos), margin + 60, y);

    doc.text('Egresos de Caja Chica (-):', margin + 100, y);
    doc.text(money(egresos), margin + 150, y);
    y += 8;

    doc.line(margin, y, margin + 182, y);
    y += 8;

    const cajaEsperada = cierre.monto_apertura + cierre.monto_ventas + ingresos - egresos;
    doc.setFont('helvetica', 'bold');
    doc.text('Saldo Esperado en Caja:', margin, y);
    doc.text(money(cajaEsperada), margin + 60, y);

    if (cierre.fecha_cierre) {
      doc.text('Saldo Físico Registrado:', margin + 100, y);
      doc.text(money(cierre.monto_real || 0), margin + 150, y);
      y += 6;

      const dif = cierre.diferencia ?? 0;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(dif < 0 ? 220 : (dif > 0 ? 34 : 35), dif < 0 ? 53 : (dif > 0 ? 197 : 31), dif < 0 ? 69 : (dif > 0 ? 94 : 28));
      doc.text('Diferencia de Arqueo:', margin, y);
      doc.text(money(dif), margin + 60, y);
      doc.setTextColor(35, 31, 28);
    }
    y += 10;

    doc.line(margin, y, margin + 182, y);
    y += 8;

    // Desglose de pagos
    if (cierre.registros_totales) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('VENTAS POR MEDIO DE PAGO', margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const reg = cierre.registros_totales;
      doc.text(`Efectivo: ${money(reg.efectivo)}`, margin, y);
      doc.text(`Débito: ${money(reg.debito)}`, margin + 65, y);
      doc.text(`Crédito: ${money(reg.credito)}`, margin + 130, y);
      y += 6;
      doc.text(`Transferencia: ${money(reg.transferencia)}`, margin, y);
      doc.text(`MercadoPago/QR: ${money(reg.mercadopago)}`, margin + 65, y);
      y += 10;
      doc.line(margin, y, margin + 182, y);
      y += 8;
    }

    // Movimientos manuales detalle
    if (movs.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('MOVIMIENTOS DE CAJA CHICA', margin, y);
      y += 6;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Fecha', margin, y);
      doc.text('Tipo', margin + 35, y);
      doc.text('Concepto', margin + 60, y);
      doc.text('Monto', margin + 150, y);
      y += 4;
      doc.line(margin, y, margin + 182, y);
      y += 4;

      doc.setFont('helvetica', 'normal');
      movs.forEach((m: any) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const fTime = new Date(m.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs';
        doc.text(fTime, margin, y);
        doc.text(m.tipo.toUpperCase(), margin + 35, y);
        doc.text(m.concepto.substring(0, 45), margin + 60, y);
        doc.text(money(m.monto), margin + 150, y);
        y += 5;
      });
      y += 5;
      doc.line(margin, y, margin + 182, y);
      y += 8;
    }

    // Observaciones
    if (cierre.observaciones) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('OBSERVACIONES DEL CIERRE', margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const splitObs = doc.splitTextToSize(cierre.observaciones, 180);
      doc.text(splitObs, margin, y);
    }

    const filename = `cierre-caja-${cierre.id_cierre}.pdf`;
    doc.save(filename);
  }
};
