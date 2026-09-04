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
    <tr style="border-bottom: 1px dashed #444;">
      <td style="font-weight: 900; font-size: 16px; width: 42px; vertical-align: top; padding: 4px 0;">${it.cantidad}x</td>
      <td style="font-size: 14px; font-weight: 800; padding: 4px 0;">
        ${it.nombre}
        ${it.observaciones ? `<div style="font-size: 12px; font-weight: normal; font-style: italic; color: #333; margin-top: 2px;">Obs: ${it.observaciones}</div>` : ''}
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
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 78mm;
            margin: 0 auto;
            padding: 10px 8px;
            color: #000;
            background: #fff;
          }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
          .title { font-size: 18px; font-weight: 900; letter-spacing: 1px; }
          .mesa-badge { font-size: 20px; font-weight: 900; margin-top: 4px; border: 2px solid #000; padding: 4px; display: inline-block; }
          .meta { font-size: 12px; font-weight: bold; margin-top: 6px; }
          .table { width: 100%; border-collapse: collapse; margin-top: 8px; text-align: left; }
          .obs-box { margin-top: 10px; padding: 6px; border: 1px solid #000; font-size: 12px; }
          .footer { border-top: 2px dashed #000; margin-top: 12px; padding-top: 6px; text-align: center; font-size: 11px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">*** COMANDA DE COCINA ***</div>
          <div class="mesa-badge">${params.mesa.toUpperCase()}</div>
          <div class="meta">MOZO: ${params.mozo.toUpperCase()}</div>
          <div style="font-size: 11px; margin-top: 2px;">FECHA: ${dateStr}</div>
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
            <strong>OBSERVACIONES GENERALES:</strong><br/>${params.observaciones}
          </div>
        `
            : ''
        }

        <div class="footer">
          >>> TICKET ENVIADO A TIQUETERA <<<
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 600);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
