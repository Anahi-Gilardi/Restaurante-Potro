import { TicketData, PrinterConfig } from '../types';

export interface BridgeStatus {
  online: boolean;
  service?: string;
  defaultPrinter?: string;
  resolvedPrinter?: string;
  availablePrinters?: string[];
  paperWidth?: string;
  charWidth?: number;
}

export const printerService = {
  getDefaultConfig(): PrinterConfig {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('el_patron_printer_config') : null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const loadedCopies = Number(parsed.copies);
          // Si el navegador tenía 1 copia guardada de versiones previas, migrar automáticamente a 2 copias
          const finalCopies = (!loadedCopies || loadedCopies < 2) ? 2 : loadedCopies;
          const config: PrinterConfig = {
            printerName: parsed.printerName || 'POS58 Printer',
            paperWidth: parsed.paperWidth || '58mm',
            autoCut: parsed.autoCut ?? true,
            openDrawer: parsed.openDrawer ?? true,
            copies: finalCopies
          };
          if (typeof localStorage !== 'undefined' && (!loadedCopies || loadedCopies < 2)) {
            localStorage.setItem('el_patron_printer_config', JSON.stringify(config));
          }
          return config;
        }
      } catch {
        // ignore
      }
    }
    // Global TP-POS58-USB conectada por defecto en USB001 (2 copias: Cliente + Dueño)
    return {
      printerName: 'POS58 Printer',
      paperWidth: '58mm',
      autoCut: true,
      openDrawer: true,
      copies: 2
    };
  },

  saveConfig(config: PrinterConfig): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('el_patron_printer_config', JSON.stringify(config));
  },

  /**
   * Consulta el estado del servicio puente local en http://127.0.0.1:8012/status
   */
  async checkBridgeStatus(): Promise<BridgeStatus> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);
      const res = await fetch('http://127.0.0.1:8012/status', {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        return { online: true, ...data };
      }
    } catch {
      // safe bypass
    }
    return { online: false };
  },

  /**
   * Genera el texto ESC/POS para una copia individual de ticket (cliente, dueño o estándar).
   */
  generateSingleTicketEscPos(
    data: TicketData,
    config: PrinterConfig,
    copyType: 'cliente' | 'dueno' | 'standard' = 'standard',
    openDrawer: boolean = config.openDrawer,
  ): string {
    const is80 = config.paperWidth === '80mm';
    const charWidth = is80 ? 42 : 32;

    const padLeftRight = (left: string, right: string): string => {
      const neededSpaces = charWidth - left.length - right.length;
      if (neededSpaces <= 0) {
        const truncatedLeft = left.slice(0, Math.max(0, charWidth - right.length - 1));
        return `${truncatedLeft} ${right}`;
      }
      return left + ' '.repeat(neededSpaces) + right;
    };

    const separator = '-'.repeat(charWidth);
    const doubleSeparator = '='.repeat(charWidth);

    let esc = '';
    
    // Apertura de gaveta: solo en la copia que lo habilita
    if (openDrawer) {
      esc += '[ESC/POS: KICK OUT DRAWER_PORT1]\n';
    }
    
    esc += '[ESC/POS: ALIGN CENTER]\n';
    esc += '[ESC/POS: TEXT FONT_DOUBLE_SIZE]\n';
    esc += `${data.nombreComercial.toUpperCase()}\n`;
    esc += '[ESC/POS: TEXT FONT_NORMAL]\n';
    esc += 'TICKET DE CONSUMO\n';
    esc += 'DOCUMENTO NO VALIDO COMO FACTURA\n';

    if (copyType === 'cliente') {
      esc += '*** ORIGINAL - CLIENTE ***\n';
    } else if (copyType === 'dueno') {
      esc += '*** DUPLICADO - CONTROL DUEÑO ***\n';
    }

    esc += `${doubleSeparator}\n`;
    
    esc += '[ESC/POS: ALIGN LEFT]\n';
    esc += `TICKET Nº: ${data.nroComprobante}\n`;
    esc += `FECHA: ${data.fechaHora}\n`;
    esc += `MESA: ${data.mesa.toUpperCase()}\n`;
    esc += `MOZO: ${data.mozo}\n`;
    esc += `CAJERO: ${data.cajero}\n`;
    esc += `PEDIDO ID: EP-${data.idPedido}\n`;

    if (copyType === 'cliente') {
      esc += 'DESTINO: COMPROBANTE CLIENTE\n';
    } else if (copyType === 'dueno') {
      esc += 'DESTINO: CONTROL CAJA / DUEÑO\n';
    }

    esc += `${separator}\n`;
    
    esc += padLeftRight('CANT  PRODUCTO', 'SUBTOTAL') + '\n';
    esc += `${separator}\n`;
    
    data.items.forEach(it => {
      const desc = it.descripcion;
      esc += `${desc}\n`;
      const unitPrice = it.precio_unitario ?? it.precioUnitario ?? 0;
      const qtyStr = `  ${it.cantidad} x $${Math.round(unitPrice).toLocaleString('es-AR')}`;
      const subtotalStr = `$${Math.round(it.subtotal).toLocaleString('es-AR')}`;
      esc += padLeftRight(qtyStr, subtotalStr) + '\n';
    });
    
    esc += `${separator}\n`;
    esc += padLeftRight('Subtotal Neto:', `$${Math.round(data.subtotal).toLocaleString('es-AR')}`) + '\n';
    if (data.descuento > 0) {
      esc += padLeftRight('Bonificación:', `-$${Math.round(data.descuento).toLocaleString('es-AR')}`) + '\n';
    }
    if (data.propina > 0) {
      esc += padLeftRight('Propina Sugerida:', `$${Math.round(data.propina).toLocaleString('es-AR')}`) + '\n';
    }
    esc += `${separator}\n`;
    
    esc += '[ESC/POS: TEXT FONT_DOUBLE_SIZE]\n';
    esc += padLeftRight('TOTAL:', `$${Math.round(data.total).toLocaleString('es-AR')}`) + '\n';
    esc += '[ESC/POS: TEXT FONT_NORMAL]\n';
    
    esc += `${doubleSeparator}\n`;
    esc += '[ESC/POS: ALIGN CENTER]\n';
    esc += 'MEDIOS DE PAGO:\n';
    data.metodosPago.forEach(mp => {
      esc += padLeftRight(`   ${mp.metodo.toUpperCase()}:`, `$${Math.round(mp.monto).toLocaleString('es-AR')}`) + '\n';
    });
    if (data.vuelto > 0) {
      esc += padLeftRight('   VUELTO:', `$${Math.round(data.vuelto).toLocaleString('es-AR')}`) + '\n';
    }
    esc += `${separator}\n`;
    if (data.mensajePie) {
      esc += `${data.mensajePie}\n`;
    }

    if (copyType === 'dueno') {
      esc += '-- COPIA CONTROL CAJA / DUEÑO --\n';
    } else {
      esc += '¡Muchas gracias por su visita!\n';
    }

    esc += 'El Patron Restaurante\n';
    esc += `${doubleSeparator}\n`;
    
    // Avance de líneas generoso para que el ticket supere la barra de corte manual de 58 mm
    esc += '\n\n\n\n\n';
    if (config.autoCut) {
      esc += '[ESC/POS: PARTIAL_CUT_FEED_3LINES]\n';
    }
    esc += '\n\n';
    
    return esc;
  },

  /**
   * Genera texto formateado a 32 columnas (58 mm) o 42 columnas (80 mm)
   * con etiquetas virtuales ESC/POS compatibles con el bridge USB.
   * Si copies >= 2, emite 1 ticket para el cliente y 1 ticket para el dueño.
   */
  generateEscPosText(data: TicketData, config: PrinterConfig): string {
    const copies = config.copies !== undefined ? Number(config.copies) : 2;
    if (copies === 1) {
      return this.generateSingleTicketEscPos(data, config, 'standard', config.openDrawer);
    }

    // Copia 1: Cliente (dispara cajón si está configurado)
    const ticketCliente = this.generateSingleTicketEscPos(data, config, 'cliente', config.openDrawer);
    // Copia 2: Dueño (no vuelve a disparar cajón)
    const ticketDueno = this.generateSingleTicketEscPos(data, config, 'dueno', false);

    let fullEsc = ticketCliente + '\n\n' + ticketDueno;

    for (let i = 3; i <= copies; i++) {
      fullEsc += '\n\n' + this.generateSingleTicketEscPos(data, config, 'standard', false);
    }

    return fullEsc;
  },

  /**
   * Respaldo nativo de navegador: inyecta un documento HTML optimizado para papel de 58 mm
   * y llama al diálogo de impresión del navegador seleccionando la impresora predeterminada.
   */
  async printThermalViaBrowser(data: TicketData, config: PrinterConfig): Promise<{ success: boolean; message: string }> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return { success: false, message: 'Entorno sin ventana disponible para impresión.' };
    }

    try {
      const is58 = config.paperWidth === '58mm';
      const printableWidth = is58 ? '48mm' : '72mm';
      const pageWidth = is58 ? '58mm' : '80mm';

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.id = 'thermal-print-iframe';

      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('No se pudo acceder al documento de impresión.');
      }

      const itemsHtml = data.items.map(it => {
        const unit = it.precio_unitario ?? it.precioUnitario ?? 0;
        return `
          <div style="margin-bottom: 3px;">
            <div style="font-weight: bold; word-break: break-word;">${it.descripcion}</div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #222;">
              <span>&nbsp;&nbsp;${it.cantidad} x $${Math.round(unit).toLocaleString('es-AR')}</span>
              <span style="font-weight: bold;">$${Math.round(it.subtotal).toLocaleString('es-AR')}</span>
            </div>
          </div>
        `;
      }).join('');

      const pagosHtml = data.metodosPago.map(mp => `
        <div style="display: flex; justify-content: space-between; font-size: 10px;">
          <span>${mp.metodo.toUpperCase()}:</span>
          <span>$${Math.round(mp.monto).toLocaleString('es-AR')}</span>
        </div>
      `).join('');

      const copies = Math.max(1, config.copies ?? 2);

      const renderTicketBody = (copyType: 'cliente' | 'dueno' | 'standard') => {
        let copyBadge = '';
        let destinoLine = '';
        let footerText = '¡Muchas gracias por su visita!<br><strong>El Patron Restaurante</strong>';

        if (copyType === 'cliente') {
          copyBadge = '<div class="subtitle bold" style="font-size: 10px; margin: 3px 0; border: 1px dashed #000; padding: 2px 0;">*** ORIGINAL - CLIENTE ***</div>';
          destinoLine = '<div class="row"><span>DESTINO:</span><span class="bold">COMPROBANTE CLIENTE</span></div>';
        } else if (copyType === 'dueno') {
          copyBadge = '<div class="subtitle bold" style="font-size: 10px; margin: 3px 0; border: 1px dashed #000; padding: 2px 0; background: #eee;">*** DUPLICADO - CONTROL DUEÑO ***</div>';
          destinoLine = '<div class="row"><span>DESTINO:</span><span class="bold">CONTROL CAJA / DUEÑO</span></div>';
          footerText = '-- COPIA CONTROL CAJA / DUEÑO --<br><strong>El Patron Restaurante</strong>';
        }

        return `
          <div class="ticket-instance" style="margin-bottom: 6mm;">
            <div class="center">
              <div class="title">${data.nombreComercial.toUpperCase()}</div>
              <div class="subtitle">TICKET DE CONSUMO</div>
              <div style="font-size: 8px;">DOCUMENTO NO VALIDO COMO FACTURA</div>
              ${copyBadge}
            </div>
            <div class="double-divider"></div>
            
            <div class="row"><span>TICKET Nº:</span><span class="bold">${data.nroComprobante}</span></div>
            <div class="row"><span>FECHA:</span><span>${data.fechaHora}</span></div>
            <div class="row"><span>MESA:</span><span class="bold">${data.mesa.toUpperCase()}</span></div>
            <div class="row"><span>MOZO:</span><span>${data.mozo}</span></div>
            <div class="row"><span>CAJERO:</span><span>${data.cajero}</span></div>
            <div class="row"><span>PEDIDO ID:</span><span>EP-${data.idPedido}</span></div>
            ${destinoLine}
            
            <div class="divider"></div>
            <div class="row bold"><span>CANT PRODUCTO</span><span>SUBTOTAL</span></div>
            <div class="divider"></div>
            
            ${itemsHtml}
            
            <div class="divider"></div>
            <div class="row"><span>Subtotal Neto:</span><span>$${Math.round(data.subtotal).toLocaleString('es-AR')}</span></div>
            ${data.descuento > 0 ? `<div class="row"><span>Bonificación:</span><span>-$${Math.round(data.descuento).toLocaleString('es-AR')}</span></div>` : ''}
            ${data.propina > 0 ? `<div class="row"><span>Propina Sugerida:</span><span>$${Math.round(data.propina).toLocaleString('es-AR')}</span></div>` : ''}
            
            <div class="double-divider"></div>
            <div class="total-row"><span>TOTAL:</span><span>$${Math.round(data.total).toLocaleString('es-AR')}</span></div>
            <div class="double-divider"></div>
            
            <div class="center bold" style="font-size: 10px; margin-top: 3px;">MEDIOS DE PAGO</div>
            ${pagosHtml}
            ${data.vuelto > 0 ? `<div class="row bold"><span>VUELTO:</span><span>$${Math.round(data.vuelto).toLocaleString('es-AR')}</span></div>` : ''}
            
            <div class="divider"></div>
            <div class="center" style="margin-top: 4px; font-size: 10px;">
              ${footerText}
            </div>
            <div class="double-divider"></div>
          </div>
        `;
      };

      let bodyTicketsHtml = '';
      if (copies === 1) {
        bodyTicketsHtml = renderTicketBody('standard');
      } else {
        const cutSeparator = `
          <div style="page-break-after: always; text-align: center; margin: 8mm 0; border-top: 2px dashed #444; padding-top: 2mm; font-size: 8px; font-weight: bold;">
            ✂ CORTE DE TICKET (ORIGINAL CLIENTE / DUPLICADO DUEÑO) ✂
          </div>
        `;
        bodyTicketsHtml = renderTicketBody('cliente') + cutSeparator + renderTicketBody('dueno');
        for (let i = 3; i <= copies; i++) {
          bodyTicketsHtml += cutSeparator + renderTicketBody('standard');
        }
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Ticket ${data.nroComprobante}</title>
          <style>
            @page {
              size: ${pageWidth} auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: ${printableWidth};
              margin: 0 auto;
              padding: 2mm 1mm;
              color: #000;
              background: #fff;
              font-size: 11px;
              line-height: 1.25;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .title { font-size: 14px; font-weight: 900; margin-bottom: 2px; }
            .subtitle { font-size: 10px; font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 4px 0; }
            .double-divider { border-bottom: 2px solid #000; margin: 4px 0; }
            .row { display: flex; justify-content: space-between; font-size: 10px; }
            .total-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: 900; margin: 4px 0; }
          </style>
        </head>
        <body>
          ${bodyTicketsHtml}
          <div style="height: 15mm;"></div>
        </body>
        </html>
      `;

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      await new Promise(resolve => setTimeout(resolve, 300));
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();

      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {
          // ignore
        }
      }, 3000);

      return { success: true, message: 'Ticket térmico de 58 mm enviado al motor de impresión del navegador.' };
    } catch (err: any) {
      return { success: false, message: `Error en impresión de navegador: ${err.message}` };
    }
  },

  getFailedPrints(): { id: string; data: TicketData; timestamp: string }[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('el_patron_failed_prints') || '[]');
    } catch {
      return [];
    }
  },

  saveFailedPrints(queue: any[]): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('el_patron_failed_prints', JSON.stringify(queue));
  },

  clearFailedPrints(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem('el_patron_failed_prints');
  },

  /**
   * Envía a la ticketera física térmica Global TP-POS58-USB.
   * Capa 1: Intenta comunicación directa por Bridge USB (win32print en puerto 8012).
   * Capa 2: Si el bridge no responde, activa la impresión térmica web por navegador en 58 mm.
   */
  async sendToPrinter(data: TicketData, config: PrinterConfig): Promise<{
    success: boolean;
    message: string;
    methodUsed: string;
    rawText: string;
  }> {
    // Garantizar que en caja siempre se impriman al menos 2 copias (Cliente + Dueño) salvo configuración superior
    const effectiveCopies = (!config.copies || Number(config.copies) < 2) ? 2 : Number(config.copies);
    const effectiveConfig: PrinterConfig = { ...config, copies: effectiveCopies };
    const rawText = this.generateEscPosText(data, effectiveConfig);

    // 1. Intentar Puente USB Local en puerto 8012
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2500);

      // Si se solicitan 2 copias (1 Cliente + 1 Dueño), despachamos dos trabajos físicos discretos
      // para que el cabezal de 58 mm corte/avance cada uno por separado y no se superpongan
      if (effectiveConfig.copies === 2) {
        const rawCliente = this.generateSingleTicketEscPos(data, effectiveConfig, 'cliente', effectiveConfig.openDrawer);
        const rawDueno = this.generateSingleTicketEscPos(data, effectiveConfig, 'dueno', false);

        const resp1 = await fetch('http://127.0.0.1:8012/print', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText: rawCliente, config: effectiveConfig }),
          signal: controller.signal
        });

        if (resp1.ok) {
          // Breve pausa para que el cabezal térmico de 58 mm finalice el avance del primer ticket antes de enviar el segundo
          await new Promise(r => setTimeout(r, 400));

          await fetch('http://127.0.0.1:8012/print', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawText: rawDueno, config: { ...effectiveConfig, openDrawer: false } }),
            signal: controller.signal
          });

          clearTimeout(id);
          return {
            success: true,
            message: `2 tickets emitidos con éxito (1 Original Cliente + 1 Duplicado Dueño) en ${effectiveConfig.printerName}.`,
            methodUsed: 'UsbPrintBridge',
            rawText
          };
        }
      } else {
        const response = await fetch('http://127.0.0.1:8012/print', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText, config: effectiveConfig }),
          signal: controller.signal
        });

        clearTimeout(id);

        if (response.ok) {
          const json = await response.json();
          return {
            success: true,
            message: `Tickets emitidos en impresora térmica USB (${json.printerUsed || effectiveConfig.printerName}).`,
            methodUsed: 'UsbPrintBridge',
            rawText
          };
        }
      }
      clearTimeout(id);
    } catch {
      // continuar a Capa 2
    }

    // 2. Capa 2: Respaldo Térmico de Navegador (58 mm)
    const browserPrintRes = await this.printThermalViaBrowser(data, effectiveConfig);
    if (browserPrintRes.success) {
      return {
        success: true,
        message: '2 tickets enviados a la impresora térmica mediante el navegador (58 mm).',
        methodUsed: 'BrowserThermal58mm',
        rawText
      };
    }

    // 3. Fallback: Registrar en cola de tickets pendientes
    const failedItem = {
      id: `print_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      data,
      timestamp: new Date().toISOString()
    };
    const queue = this.getFailedPrints();
    queue.push(failedItem);
    this.saveFailedPrints(queue);

    return {
      success: false,
      message: `No se pudo comunicar con la impresora térmica ni con el navegador. Ticket guardado en cola local.`,
      methodUsed: 'QueueThermalTicket',
      rawText
    };
  },

  async retryFailedPrints(config: PrinterConfig): Promise<{ successCount: number; failedCount: number }> {
    const queue = this.getFailedPrints();
    if (queue.length === 0) return { successCount: 0, failedCount: 0 };

    let successCount = 0;
    let failedCount = 0;
    const remaining: any[] = [];

    for (const item of queue) {
      const res = await this.sendToPrinter(item.data, config);
      if (res.success) {
        successCount++;
      } else {
        failedCount++;
        remaining.push(item);
      }
    }

    this.saveFailedPrints(remaining);
    return { successCount, failedCount };
  },

  /**
   * Genera y envía un ticket de prueba rápido para la Global TP-POS58-USB
   */
  async printTestTicket(config: PrinterConfig): Promise<{ success: boolean; message: string }> {
    const testData: TicketData = {
      nombreComercial: 'El Patron Restaurante',
      razonSocial: 'El Patron S.R.L.',
      cuit: '30-71829340-9',
      direccion: 'Ruta 148 Km 9.5',
      telefono: '+54 9 3584 37-3711',
      email: 'contacto@elpatron.com.ar',
      nroComprobante: 'TEST-58MM-001',
      idPedido: 9999,
      mesa: 'TEST 1',
      mozo: 'Sistema',
      cajero: 'Admin',
      fechaHora: new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      items: [
        { cantidad: 1, descripcion: 'Prueba Cabezal Termico 58mm', precio_unitario: 100, subtotal: 100 },
        { cantidad: 2, descripcion: 'Empanadas de Carne a Cuchillo', precio_unitario: 4500, subtotal: 9000 },
        { cantidad: 1, descripcion: 'Ojo de bife al aligot', precio_unitario: 38600, subtotal: 38600 }
      ],
      subtotal: 47700,
      descuento: 0,
      propina: 0,
      iva: 0,
      total: 47700,
      metodosPago: [{ metodo: 'efectivo', monto: 47700 }],
      vuelto: 0,
      tipoComprobante: 'ticket_consumo',
      mensajePie: 'IMPRESORA GLOBAL TP-POS58-USB OK'
    };

    return await this.sendToPrinter(testData, config);
  }
};
