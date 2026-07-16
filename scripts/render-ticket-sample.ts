import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pdfService } from '../src/services/pdfService';
import type { TicketData } from '../src/types';

const sample: TicketData = {
  idPedido: 8321,
  nroComprobante: 'T-00000042',
  tipoComprobante: 'ticket_consumo',
  fechaHora: '16/07/2026 21:34 hs',
  mesa: 'Mesa 1',
  mozo: 'Admin',
  cajero: 'Sofía Colombo',
  nombreComercial: 'El Patrón Restaurante',
  razonSocial: 'Bella Oriana',
  cuit: '27-42694613-6',
  direccion: 'Fotheringham 33, CP 5800, Río Cuarto, Córdoba',
  telefono: '+54 9 3584 37-3711',
  email: 'contacto@elpatron.example',
  items: [
    { cantidad: 1, descripcion: 'Aperol Spritz', precio_unitario: 4900, subtotal: 4900 },
    { cantidad: 1, descripcion: 'Gin Tonic Heráclito', precio_unitario: 4800, subtotal: 4800 },
  ],
  subtotal: 9700,
  descuento: 0,
  propina: 970,
  iva: 0,
  total: 10670,
  metodosPago: [{ metodo: 'Efectivo', monto: 10670 }],
  vuelto: 0,
  mensajePie: 'TICKET DE CONSUMO - DOCUMENTO NO VALIDO COMO FACTURA. Para factura electrónica solicítela en Facturación.',
  clienteNombre: 'Consumidor Final',
};

await mkdir('tmp/pdfs', { recursive: true });
const logo = `data:image/jpeg;base64,${(await readFile('public/logo-el-patron.jpeg')).toString('base64')}`;
const doc = pdfService.generateThermalTicket(sample, logo);
await writeFile('tmp/pdfs/caja-ticket-interno.pdf', Buffer.from(doc.output('arraybuffer')));
