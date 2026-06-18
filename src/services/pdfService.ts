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
    const isA4 = data.tipoComprobante === 'factura_a' || data.tipoComprobante === 'factura_b';

    if (isA4) {
      return this.generateA4Invoice(data, logo, qrImage);
    }

    return this.generateThermalTicket(data, logo);
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

  generateThermalTicket(data: TicketData, logo: string | null): jsPDF {
    const wrappedRows = data.items.map(item => ({
      item,
      lines: Math.max(1, Math.ceil(item.descripcion.length / 22))
    }));
    const ticketHeight = Math.max(
      205,
      118 + wrappedRows.reduce((sum, row) => sum + row.lines * 4.2 + 4, 0) + data.metodosPago.length * 5
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
      doc.setDrawColor(...BRAND.line);
      doc.line(5, y + offset, 75, y + offset);
      y += 3.5;
    };

    addLogo(doc, logo, 29, y, 22);
    y += logo ? 25 : 2;

    doc.setFillColor(...BRAND.brown);
    doc.rect(5, y, 70, 13, 'F');
    doc.setTextColor(255, 255, 255);
    y += 5;
    center(data.nombreComercial.toUpperCase(), 10, true);
    center('GESTION GASTRONOMICA PRO', 6.5, false);
    y += 5;

    doc.setTextColor(...BRAND.dark);
    center('Ticket de consumo', 8, true);
    center(data.razonSocial, 6.5);
    center(`CUIT ${data.cuit}`, 6.5);
    center(data.direccion.slice(0, 42), 6.2);
    center(`Tel. ${data.telefono}`, 6.2);
    y += 1.5;
    line();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Ticket: ${data.nroComprobante}`, 5, y);
    doc.text(`Mesa: ${data.mesa}`, 75, y, { align: 'right' });
    y += 4;
    doc.text(`Fecha: ${data.fechaHora}`, 5, y);
    y += 4;
    doc.text(`Mozo: ${data.mozo}`, 5, y);
    doc.text(`Caja: ${data.cajero}`, 75, y, { align: 'right' });
    y += 5;
    line();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('Cant.', 5, y);
    doc.text('Producto', 16, y);
    doc.text('Importe', 75, y, { align: 'right' });
    y += 3.5;
    line(-1);

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
    line();

    const sum = (label: string, value: string, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(bold ? 8.5 : 7);
      doc.text(label, 5, y);
      doc.text(value, 75, y, { align: 'right' });
      y += bold ? 5.5 : 4.5;
    };

    sum('Subtotal', money(data.subtotal));
    if (data.descuento > 0) sum('Descuento', `-${money(data.descuento)}`);
    if (data.propina > 0) sum('Propina', money(data.propina));
    sum('IVA 21% incluido', money(data.iva));

    doc.setFillColor(...BRAND.cream);
    doc.rect(5, y - 2, 70, 10, 'F');
    y += 5;
    doc.setTextColor(...BRAND.brown);
    sum('TOTAL', money(data.total), true);
    doc.setTextColor(...BRAND.dark);
    y += 2;
    line();

    center('Medios de pago', 7, true);
    data.metodosPago.forEach(mp => {
      sum(mp.metodo.toUpperCase(), money(mp.monto));
    });
    if (data.vuelto > 0) sum('Vuelto efectivo', money(data.vuelto));

    y += 2;
    line();
    center(data.mensajePie || 'Gracias por su visita.', 6.8);
    center('El Patron Restaurante', 7.5, true);
    center('Conserve este comprobante', 6.2);

    return doc;
  }
};
