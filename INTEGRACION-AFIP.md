# Integración AFIP (WSFEv1) — El Patrón Pro

## Arquitectura

```
MozoTerminal/CajaModule
  → FacturacionModule
    → services/afip/solicitarCae()  ← Cliente SOAP en TypeScript
      → POST /api/afip/login        ← Serverless Function (firma CMS)
      → POST /api/afip/emitir       ← Serverless Function (WSFEv1)
        → https://wsaahomo.afip.gov.ar (WSAA)
        → https://wswhomo.afip.gov.ar (WSFEv1)
```

## Estructura de archivos creada

```
src/services/afip/
  ├── index.ts        — Helpers (determinarTipoComprobante, parseCuit, calcularIva)
  ├── types.ts         — Interfaces (AfipConfig, AfipInvoiceRequest, ArcaQrData)
  ├── auth.ts          — WSAA: getAccessToken() con cache en localStorage (11 h)
  └── wsfe.ts          — WSFEv1: solicitarCae(), parseFeResponse(), generarQrData()

api/afip/
  ├── login.ts         — POST /api/afip/login  (firma CMS con crypto.createSign)
  └── emitir.ts        — POST /api/afip/emitir (FECAESolicitar SOAP → CAE)
```

## Dependencias

Ya instaladas en el proyecto:
- `@vercel/node` — tipos para API Routes
- `crypto` (built-in Node.js) — firma SHA256 con X.509

No requiere `soap` ni `afip.js`. Llamamos SOAP directamente con `fetch` + template strings XML.

## Configuración

### 1. Obtener certificados de AFIP (Homologación)

1. Ir a https://www.afip.gob.ar/ws/WSAA/
2. Generar clave privada y CSR:
```bash
openssl req -new -newkey rsa:2048 -days 365 -nodes -keyout clave.key -out csr.csr
```
3. Enviar CSR a AFIP para obtener el certificado `.crt`
4. Guardar en Vercel Environment Variables:
```
AFIP_CERT_BASE64=<base64 del .crt>
AFIP_KEY_BASE64=<base64 del .key>
AFIP_CUIT=20384491021
AFIP_ENV=homologacion
```

### 2. Pruebas en homologación

AFIP Homologación no valida CUITs reales. Usar:
- CUIT: `20384491021` (válido de prueba)
- Cliente: `Consumidor Final` → CUIT `99-99999999-9` → Factura B
- Cliente: `Siderar S.A.` → CUIT `30-50000732-5` → Factura A

## Implementación en FacturacionModule

Agregar botón "Emitir con AFIP" en el modal de emisión:

```typescript
import { solicitarCae, generarQrData, determinarTipoComprobante, parseCuit, calcularIva } from '../services/afip';
import { AFIP_ENDPOINTS } from '../services/afip/types';

const emitirConAfip = async (factura: FacturaExtendida) => {
  try {
    const config = {
      environment: (import.meta.env.VITE_AFIP_ENV as any) || 'homologacion',
      cuit: parseInt(import.meta.env.VITE_AFIP_CUIT || '20384491021'),
      certBase64: import.meta.env.VITE_AFIP_CERT || '',
      keyBase64: import.meta.env.VITE_AFIP_KEY || '',
    };

    const neto = parseFloat((factura.total / 1.21).toFixed(2));
    const iva = calcularIva(neto);
    const cbteTipo = determinarTipoComprobante(factura.cuit);

    const req = {
      Concepto: 1 as const,
      DocTipo: factura.cuit === '99-99999999-9' ? 99 : 80,
      DocNro: parseCuit(factura.cuit),
      CbteTipo: cbteTipo,
      PtoVta: 1,
      ImpTotal: factura.total,
      ImpNeto: neto,
      ImpIVA: iva,
      FechaCbte: new Date().toISOString().split('T')[0],
      Iva: [{ Id: 5, BaseImp: neto, Importe: iva }],
    };

    const result = await solicitarCae(config, req);

    // Guardar CAE en Supabase
    await supabase.from('facturas').update({
      afip_cae: result.CAE,
      afip_vto: result.CAEFchVto,
      afip_qr: generarQrData(config.cuit, 1, cbteTipo, 1, factura.total, result.CAE),
      afip_resultado: result.Resultado,
    }).eq('id_factura', factura.id_factura);

    toast.success(`CAE: ${result.CAE} - Vto: ${result.CAEFchVto}`);
  } catch (err: any) {
    toast.error(`AFIP: ${err.message}`);
  }
};
```

## Código QR

AFIP exige código QR en la factura PDF con este JSON:

```json
{
  "ver": 1,
  "fecha": "2026-06-15",
  "cuit": 20384491021,
  "ptoVta": 1,
  "tipoCmp": 1,
  "nroCmp": 1,
  "importe": 43200.00,
  "moneda": "PES",
  "ctz": 1,
  "tipoDocRec": 80,
  "nroDocRec": 38449102,
  "tipoCodAut": 1,
  "codAut": 74012345678901
}
```

Usar la función `generarQrData()` de `services/afip/wsfe.ts`.

## Deploy en Vercel

Las API Routes (`api/afip/login.ts` y `api/afip/emitir.ts`) **requieren Vercel Pro** porque el proyecto usa Vite (output estático). Sin Vercel Pro:

**Opción A**: Crear un servicio Node.js separado con Express que haga de proxy AFIP.

**Opción B**: Usar un WebSocket/Edge Function de Cloudflare.

**Opción C**: Integrar directamente con ARCA (el sucesor de AFIP) que ya está implementado en `services/arcaService.ts` y usa API REST moderna sin SOAP.
