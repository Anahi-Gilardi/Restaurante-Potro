import { mkdir, readFile, writeFile } from 'node:fs/promises';
import QRCode from 'qrcode';
import { pdfService } from '../src/services/pdfService';
import type { TicketData } from '../src/types';

const items = Array.from({ length: 18 }, (_, index) => ({
  cantidad: index % 3 === 0 ? 2 : 1,
  descripcion: index === 4
    ? 'Ojo de bife con aligot de papa, salsa de la casa y vegetales asados'
    : `Producto gastronomico de muestra ${index + 1}`,
  precio_unitario: 1000,
  subtotal: index % 3 === 0 ? 2000 : 1000,
}));
const total = items.reduce((sum, item) => sum + item.subtotal, 0);
const qrImage = await QRCode.toDataURL('MUESTRA DE DISENO SIN VALOR FISCAL', { margin: 1, width: 256 });
const sample: TicketData = {
  idPedido: 1,
  nroComprobante: 'C-00002-00000042',
  tipoComprobante: 'factura_c',
  fechaHora: '2026-07-21T21:30:00.000Z',
  fechaEmision: '2026-07-21T21:30:00.000Z',
  mesa: 'Mesa 1',
  mozo: 'Mozo',
  cajero: 'Caja',
  nombreComercial: 'El Patron Restaurante',
  razonSocial: 'Titular fiscal de muestra',
  cuit: '00-00000000-0',
  direccion: 'Domicilio comercial configurado en ARCA',
  telefono: '+54 000 0000000',
  email: 'contacto@example.com',
  ingresosBrutos: '000000000',
  inicioActividades: '2026-01-01',
  condicionIvaEmisor: 'Monotributo',
  condicionIvaReceptor: 'Consumidor Final',
  items,
  subtotal: total,
  descuento: 0,
  propina: 0,
  iva: 0,
  total,
  metodosPago: [{ metodo: 'Efectivo', monto: total }],
  vuelto: 0,
  mensajePie: 'Muestra visual de desarrollo. No es un comprobante fiscal.',
  clienteNombre: 'CONSUMIDOR FINAL',
  clienteDocumentoTipo: 'Consumidor Final',
  cae: '00000000000000',
  vto: '20260731',
  puntoVenta: 2,
  numeroFiscal: 42,
  moneda: 'PES',
  copia: 'ORIGINAL',
  resultadoArca: 'A',
};

await mkdir('tmp/pdfs', { recursive: true });
const logo = `data:image/jpeg;base64,${(await readFile('public/logo-el-patron.jpeg')).toString('base64')}`;
const doc = pdfService.generateA4Invoice(sample, logo, qrImage);
for (let page = 1; page <= doc.getNumberOfPages(); page += 1) {
  doc.setPage(page);
  doc.setTextColor(190, 24, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('MUESTRA SIN VALOR FISCAL', 105, 150, { align: 'center', angle: 35 });
}
await writeFile('tmp/pdfs/factura-c-original-muestra.pdf', Buffer.from(doc.output('arraybuffer')));
