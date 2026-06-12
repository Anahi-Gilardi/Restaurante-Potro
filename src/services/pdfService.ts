import { jsPDF } from 'jspdf';
import { TicketData } from '../types';

export const pdfService = {
  exportToPDF(data: TicketData): void {
    const doc = this.generateTicketPDF(data);
    const filename = data.tipoComprobante.startsWith('factura')
      ? `factura-el-patron-${data.nroComprobante}.pdf`
      : `ticket-el-patron-pedido-${data.idPedido}.pdf`;
    doc.save(filename);
  },

  generateTicketPDF(data: TicketData): jsPDF {
    const isA4 = data.tipoComprobante === 'factura_a' || data.tipoComprobante === 'factura_b';

    if (isA4) {
      const doc = new jsPDF('p', 'mm', 'a4');
      const margin = 15;
      let y = 20;

      // Header Banner Box
      doc.setFillColor(98, 74, 62); // RGB for #624A3E (El Patrón dark brown)
      doc.rect(margin, y, 180, 25, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('EL PATRÓN RESTAURANTE', margin + 8, y + 17);
      
      // Invoice Type indicator
      doc.setFillColor(245, 241, 233); // Cream background
      doc.rect(margin + 140, y + 5, 30, 15, 'F');
      doc.setDrawColor(98, 74, 62);
      doc.setLineWidth(0.5);
      doc.rect(margin + 140, y + 5, 30, 15, 'D');
      
      doc.setTextColor(98, 74, 62);
      doc.setFontSize(18);
      const letter = data.tipoComprobante === 'factura_a' ? 'A' : 'B';
      doc.text(letter, margin + 152, y + 11.5);
      doc.setFontSize(7);
      doc.text('COD. 061', margin + 148, y + 16.5);

      y += 35;
      
      // Store Details & Metadata (Two Columns)
      doc.setTextColor(50, 50, 50);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      
      doc.text([
        `Razón Social: ${data.razonSocial}`,
        `CUIT: ${data.cuit}`,
        `Dirección: ${data.direccion}`,
        `Tel: ${data.telefono}`,
        `Email: ${data.email}`,
        'Condición IVA: Responsable Inscripto'
      ], margin, y);

      doc.text([
        `Comprobante: FACTURA ${letter}`,
        `Nro: ${data.nroComprobante}`,
        `Fecha de Emisión: ${data.fechaHora}`,
        `Mesa: ${data.mesa}`,
        `Mozo: ${data.mozo}`,
        `Cajero/a: ${data.cajero}`
      ], margin + 100, y);

      y += 35;

      // Customer Section
      doc.setFillColor(245, 241, 233);
      doc.rect(margin, y, 180, 12, 'F');
      doc.setTextColor(98, 74, 62);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(`CLIENTE: Consumidor Final`, margin + 4, y + 8);
      doc.setTextColor(80, 80, 80);
      doc.setFont('Helvetica', 'normal');
      doc.text(`CUIT/DNI: ${data.cuit.startsWith('99') ? 'Consumidor Final (DNI/CUIT)' : data.cuit}`, margin + 105, y + 8);

      y += 18;

      // Table Header Row
      doc.setFillColor(98, 74, 62);
      doc.rect(margin, y, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('CANT', margin + 3, y + 5.5);
      doc.text('DESCRIPCIÓN / PRODUCTO', margin + 18, y + 5.5);
      doc.text('P. UNITARIO', margin + 120, y + 5.5, { align: 'right' });
      doc.text('SUBTOTAL', margin + 175, y + 5.5, { align: 'right' });

      y += 8;

      // Table Body Rows
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      data.items.forEach((item, i) => {
        if (i % 2 === 1) {
          doc.setFillColor(249, 248, 246);
          doc.rect(margin, y, 180, 8, 'F');
        }
        
        doc.text(item.cantidad.toString(), margin + 3, y + 5.5);
        doc.text(item.descripcion, margin + 18, y + 5.5);
        doc.text(`$${item.precio_unitario.toLocaleString('es-AR')}`, margin + 120, y + 5.5, { align: 'right' });
        doc.text(`$${item.subtotal.toLocaleString('es-AR')}`, margin + 175, y + 5.5, { align: 'right' });
        
        y += 8;
      });

      // Bottom boundary line
      doc.setDrawColor(210, 205, 195);
      doc.line(margin, y, margin + 180, y);
      y += 6;

      // Totals Panel
      const finalX = margin + 120;
      doc.setFontSize(9.5);
      doc.setFont('Helvetica', 'normal');
      
      doc.text('Subtotal Neto:', finalX, y);
      doc.text(`$${data.subtotal.toLocaleString('es-AR')}`, margin + 175, y, { align: 'right' });
      y += 5.5;

      if (data.descuento > 0) {
        doc.text('Descuentos Aplicados:', finalX, y);
        doc.text(`-$${data.descuento.toLocaleString('es-AR')}`, margin + 175, y, { align: 'right' });
        y += 5.5;
      }

      if (data.propina > 0) {
        doc.text('Propina Sugerida:', finalX, y);
        doc.text(`$${data.propina.toLocaleString('es-AR')}`, margin + 175, y, { align: 'right' });
        y += 5.5;
      }

      doc.text('IVA Inscripto (21.0% inclu.):', finalX, y);
      doc.text(`$${data.iva.toLocaleString('es-AR')}`, margin + 175, y, { align: 'right' });
      y += 6.5;

      // Bold summary block
      doc.setFillColor(98, 74, 62);
      doc.rect(finalX - 3, y - 4.5, 63, 8.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('TOTAL FACTURA:', finalX, y + 1.5);
      doc.text(`$${data.total.toLocaleString('es-AR')}`, margin + 175, y + 1.5, { align: 'right' });

      y += 18;

      // Methods
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'bold');
      doc.text('DETALLE DE MEDIOS DE PAGO:', margin, y);
      y += 5;
      
      doc.setFont('Helvetica', 'normal');
      data.metodosPago.forEach(mp => {
        doc.text(`• ${mp.metodo.toUpperCase()}:  $${mp.monto.toLocaleString('es-AR')}`, margin + 3, y);
        y += 4.5;
      });
      if (data.vuelto > 0) {
        doc.text(`• VUELTO EFECTIVO: $${data.vuelto.toLocaleString('es-AR')}`, margin + 3, y);
        y += 4.5;
      }

      y += 12;

      // Legal AFIP footnotes
      doc.setDrawColor(98, 74, 62);
      doc.rect(margin, y, 18, 18);
      doc.setFontSize(5.5);
      doc.setTextColor(98, 74, 62);
      doc.text('FACTURA', margin + 2.5, y + 6);
      doc.text('HOMOLOGADA', margin + 1.5, y + 10);
      doc.text('AFIP QR', margin + 4.5, y + 14);
      
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 120);
      doc.text([
        `CAE Nº: 732049182390 • Vencimiento: 15/12/2026`,
        `Comprobante emitido según normativa fiscal vigente.`,
        data.mensajePie
      ], margin + 22, y + 5.5);

      return doc;
    } else {
      // 80mm compact Receipt layout
      const ticketHeight = Math.max(160, 90 + (data.items.length * 8) + (data.metodosPago.length * 5) + 35);
      // Create smaller format
      const doc = new jsPDF('p', 'mm', [80, ticketHeight]);
      let y = 10;
      doc.setFont('courier', 'normal');

      const printCenter = (text: string, size = 9, isBold = false) => {
        doc.setFontSize(size);
        doc.setFont('courier', isBold ? 'bold' : 'normal');
        const textWidth = doc.getTextWidth(text);
        const x = (80 - textWidth) / 2;
        doc.text(text, x, y);
        y += size * 0.45 + 1.2;
      };

      printCenter('==================================', 9, true);
      printCenter(data.nombreComercial.toUpperCase(), 11, true);
      printCenter('EL PATRÓN RESTAURANTE', 9, true);
      printCenter('==================================', 9, true);
      printCenter('Comprobante No Fiscal - Consumo', 7.5);
      printCenter(`CUIT: ${data.cuit}`, 7.5);
      printCenter(data.direccion, 7);
      printCenter(`Telf: ${data.telefono}`, 7);
      y += 2;

      doc.setFontSize(7.5);
      doc.setFont('courier', 'normal');
      doc.text(`TICKET Nº: ${data.nroComprobante}`, 5, y); y += 3.5;
      doc.text(`FECHA: ${data.fechaHora}`, 5, y); y += 3.5;
      doc.text(`MESA: ${data.mesa}`, 5, y); y += 3.5;
      doc.text(`MOZO: ${data.mozo} • CAJERO: ${data.cajero}`, 5, y); y += 3.5;
      doc.text(`TRANSACCIÓN ID: EP-${data.idPedido}`, 5, y); y += 4;

      printCenter('----------------------------------', 8);
      doc.setFont('courier', 'bold');
      doc.text('CANT  PRODUCTO                    TOTAL', 5, y); y += 3.5;
      printCenter('----------------------------------', 8);

      doc.setFont('courier', 'normal');
      doc.setFontSize(7.5);
      data.items.forEach(it => {
        let desc = it.descripcion;
        if (desc.length > 20) desc = desc.slice(0, 18) + '..';
        const line = `${it.cantidad.toString().padEnd(5.5)}${desc.padEnd(21)}${`$${it.subtotal}`.padStart(7)}`;
        doc.text(line, 5, y);
        y += 4;
      });

      printCenter('----------------------------------', 8);

      const printSum = (label: string, value: string, isBold = false) => {
        doc.setFont('courier', isBold ? 'bold' : 'normal');
        doc.text(label, 5, y);
        doc.text(value, 75, y, { align: 'right' });
        y += 3.8;
      };

      printSum('Subtotal Neto:', `$${data.subtotal.toLocaleString('es-AR')}`);
      if (data.descuento > 0) {
        printSum('Bonificación Manual:', `-$${data.descuento.toLocaleString('es-AR')}`);
      }
      if (data.propina > 0) {
        printSum('Propina Sugerida:', `$${data.propina.toLocaleString('es-AR')}`);
      }
      printSum('TOTAL A PAGAR:', `$${data.total.toLocaleString('es-AR')}`, true);

      y += 2;
      printCenter('- MEDIOS DE PAGO -', 7, true);
      data.metodosPago.forEach(mp => {
        printSum(`${mp.metodo.toUpperCase()}:`, `$${mp.monto.toLocaleString('es-AR')}`);
      });
      if (data.vuelto > 0) {
        printSum('VUELTO EFECTIVO:', `$${data.vuelto.toLocaleString('es-AR')}`);
      }

      y += 2.5;
      printCenter('----------------------------------', 8);
      printCenter(data.mensajePie, 7.5);
      printCenter('Gracias por su visita', 8, true);
      printCenter('==================================', 9, true);

      return doc;
    }
  }
};
