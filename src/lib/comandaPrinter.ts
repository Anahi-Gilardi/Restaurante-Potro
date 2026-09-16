/**
 * lib/comandaPrinter.ts — Impresión directa de comandas para tiquetera térmica (80mm/58mm).
 */

export interface ComandaPrintItem {
  nombre: string;
  cantidad: number;
  observaciones?: string;
}

export interface ComandaPrintParams {
  mesa: string;
  mozo: string;
  items: ComandaPrintItem[];
  observaciones?: string;
}

export function printComandaThermalTicket(params: ComandaPrintParams): void {
  if (typeof window === 'undefined') return;

  const dateStr = new Date().toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const printWindow = window.open('', '_blank', 'width=380,height=600');
  if (!printWindow) {
    alert('Por favor autorice la apertura de ventanas emergentes para la impresión automática de comanda en la tiquetera.');
    return;
  }

  const itemsHtml = params.items
    .map(
      it => `
    <tr style="border-bottom: 1px dashed #000;">
      <td style="font-weight: 900; font-size: 16px; width: 44px; vertical-align: top; padding: 5px 0;">${it.cantidad}x</td>
      <td style="font-size: 15px; font-weight: 900; padding: 5px 0;">
        <div style="font-weight: 900;">${it.nombre}</div>
        ${it.observaciones ? `<div style="font-size: 13px; font-weight: 900; color: #000; margin-top: 2px;">OBS: ${it.observaciones.toUpperCase()}</div>` : ''}
      </td>
    </tr>
  `
    )
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Comanda - ${params.mesa}</title>
        <style>
          @page { size: auto; margin: 0mm; }
          * {
            box-sizing: border-box;
            font-weight: 900 !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-weight: 900;
            width: 78mm;
            margin: 0 auto;
            padding: 10px 8px;
            color: #000;
            background: #fff;
          }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
          .title { font-size: 18px; font-weight: 900; letter-spacing: 1px; }
          .mesa-badge { font-size: 22px; font-weight: 900; margin-top: 4px; border: 2px solid #000; padding: 4px 8px; display: inline-block; }
          .meta { font-size: 13px; font-weight: 900; margin-top: 6px; }
          .fecha { font-size: 12px; font-weight: 900; margin-top: 3px; }
          .table { width: 100%; border-collapse: collapse; margin-top: 8px; text-align: left; }
          .obs-box { margin-top: 10px; padding: 6px; border: 2px solid #000; font-size: 13px; font-weight: 900; }
          .footer { border-top: 2px dashed #000; margin-top: 12px; padding-top: 6px; text-align: center; font-size: 12px; font-weight: 900; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">*** COMANDA DE COCINA ***</div>
          <div class="mesa-badge">${params.mesa.toUpperCase()}</div>
          <div class="meta">MOZO: ${params.mozo.toUpperCase()}</div>
          <div class="fecha">FECHA: ${dateStr}</div>
        </div>

        <table class="table">
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        ${
          params.observaciones
            ? `
          <div class="obs-box">
            <div style="font-weight: 900; text-decoration: underline;">OBSERVACIONES GENERALES:</div>
            <div style="font-weight: 900; margin-top: 4px;">${params.observaciones.toUpperCase()}</div>
          </div>
        `
            : ''
        }

        <div class="footer">
          >>> TICKET ENVIADO A TIQUETERA <<<
        </div>

        <script>
          window.onload = function() {
            try {
              window.focus();
            } catch (e) {}
            window.print();
            setTimeout(function() {
              window.close();
            }, 800);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
