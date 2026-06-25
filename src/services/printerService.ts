import { TicketData, PrinterConfig } from '../types';

export const printerService = {
  getDefaultConfig(): PrinterConfig {
    const raw = localStorage.getItem('el_patron_printer_config');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // ignore
      }
    }
    return {
      printerName: 'Epson TM-T20 Thermal',
      paperWidth: '80mm',
      autoCut: true,
      openDrawer: true,
      copies: 1
    };
  },

  saveConfig(config: PrinterConfig): void {
    localStorage.setItem('el_patron_printer_config', JSON.stringify(config));
  },

  /**
   * Translates unified TicketData into a raw virtual ESC/POS receipt stream text (with support for cutting and kickouts).
   */
  generateEscPosText(data: TicketData, config: PrinterConfig): string {
    const is80 = config.paperWidth === '80mm';
    const charWidth = is80 ? 42 : 32;

    const padLeftRight = (left: string, right: string): string => {
      const spaceLength = charWidth - left.length - right.length;
      if (spaceLength <= 0) return `${left.slice(0, charWidth - right.length - 2)}.. ${right}`;
      return left + ' '.repeat(spaceLength) + right;
    };

    const separator = '-'.repeat(charWidth);
    const doubleSeparator = '='.repeat(charWidth);

    let esc = '';
    
    // ESC/POS Commands (Virtual tags representation)
    if (config.openDrawer) {
      esc += '[ESC/POS: KICK OUT DRAWER_PORT1]\n';
    }
    
    esc += '[ESC/POS: ALIGN CENTER]\n';
    esc += '[ESC/POS: TEXT FONT_DOUBLE_SIZE]\n';
    esc += `${data.nombreComercial.toUpperCase()}\n`;
    esc += '[ESC/POS: TEXT FONT_NORMAL]\n';
    esc += `${data.razonSocial}\n`;
    esc += `CUIT: ${data.cuit}\n`;
    esc += `${data.direccion}\n`;
    esc += `Tel: ${data.telefono}\n`;
    esc += `Email: ${data.email}\n`;
    esc += `${doubleSeparator}\n`;
    
    esc += '[ESC/POS: ALIGN LEFT]\n';
    esc += `TICKET Nº: ${data.nroComprobante}\n`;
    esc += `FECHA: ${data.fechaHora}\n`;
    esc += `MESA: ${data.mesa.toUpperCase()}\n`;
    esc += `MOZO: ${data.mozo}  |  CAJERO: ${data.cajero}\n`;
    esc += `PEDIDO ID: EP-${data.idPedido}\n`;
    esc += `${separator}\n`;
    
    esc += padLeftRight('CANT  PRODUCTO', 'SUBTOTAL') + '\n';
    esc += `${separator}\n`;
    
    data.items.forEach(it => {
      let desc = it.descripcion;
      esc += `${desc}\n`;
      const unitPrice = it.precio_unitario ?? it.precioUnitario ?? 0;
      const qtyStr = `  ${it.cantidad} x $${unitPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
      const subtotalStr = `$${it.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
      esc += padLeftRight(qtyStr, subtotalStr) + '\n';
    });
    
    esc += `${separator}\n`;
    esc += padLeftRight('Subtotal Neto:', `$${data.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`) + '\n';
    if (data.descuento > 0) {
      esc += padLeftRight('Bonificación:', `-$${data.descuento.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`) + '\n';
    }
    if (data.propina > 0) {
      esc += padLeftRight('Propina Sugerida:', `$${data.propina.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`) + '\n';
    }
    esc += padLeftRight('IVA (21.0% incl.):', `$${data.iva.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`) + '\n';
    esc += `${separator}\n`;
    
    esc += '[ESC/POS: TEXT FONT_DOUBLE_SIZE]\n';
    esc += padLeftRight('TOTAL:', `$${data.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`) + '\n';
    esc += '[ESC/POS: TEXT FONT_NORMAL]\n';
    
    esc += `${doubleSeparator}\n`;
    esc += '[ESC/POS: ALIGN CENTER]\n';
    esc += 'MEDIOS DE PAGO:\n';
    data.metodosPago.forEach(mp => {
      esc += padLeftRight(`   ${mp.metodo.toUpperCase()}:`, `$${mp.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`) + '\n';
    });
    if (data.vuelto > 0) {
      esc += padLeftRight('   VUELTO ENTREGADO:', `$${data.vuelto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`) + '\n';
    }
    esc += `${separator}\n`;
    esc += `${data.mensajePie}\n`;
    esc += 'Muchas gracias por su visita.\n';
    esc += 'Conserve este comprobante.\n';
    esc += `${doubleSeparator}\n`;
    
    if (config.autoCut) {
      esc += '[ESC/POS: PARTIAL_CUT_FEED_3LINES]\n';
    }
    
    return esc;
  },

  /**
   * Secure integration layer for remote thermal printings.
   * If there is no physical local socket, it returns a descriptive simulation outcome allowing PDF falling back.
   */
  async sendToPrinter(data: TicketData, config: PrinterConfig): Promise<{
    success: boolean;
    message: string;
    methodUsed: string;
    rawText: string;
  }> {
    const rawText = this.generateEscPosText(data, config);
    console.log(`Print Dispatch Triggered: Printer "${config.printerName}" width=${config.paperWidth}. Output:\n`, rawText);

    // Simulated network or physical bridges check
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 100); // very fast check
      
      const response = await fetch('http://localhost:8012/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, config }),
        signal: controller.signal
      }).catch(() => null);

      clearTimeout(id);

      if (response && response.ok) {
        return {
          success: true,
          message: `Ticket enviado exitosamente a la impresora física térmica local por puerto bridge IP (${config.printerName}).`,
          methodUsed: 'EspPosLocalBridge',
          rawText
        };
      }
    } catch {
      // safe bypass
    }

    // Default Fallback
    return {
      success: false,
      message: `La ticketera física "${config.printerName}" no está enlazada o levantada en red en este momento. Se utilizará el sistema de descarga limpia en PDF de 80mm o la terminal virtual del navegador.`,
      methodUsed: 'FallbackSystemPDF',
      rawText
    };
  }
};
