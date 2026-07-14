# Integración de Factura Electrónica ARCA (WSFEv1)

## Arquitectura implementada

```text
Caja / Facturación (React)
  → POST /api/arca, sin certificados ni claves privadas
  → Vercel Function (Node.js + node-forge)
      → WSAA: firma CMS y obtiene Token/Sign
      → WSFEv1: consulta último número y solicita CAE
  ← CAE, vencimiento, número oficial y datos del QR
```

La clave privada y el certificado fiscal **no se guardan en localStorage ni en
variables `VITE_*`**. El panel Sistema los envía al backend, que valida CUIT,
vigencia y correspondencia criptográfica, y guarda un paquete cifrado con
AES-256-GCM en `arca_config`. La clave maestra solamente existe en Vercel y
ninguna API devuelve el contenido de los archivos al navegador.

Las acciones `test` y `createInvoice` exigen un token de sesión válido de
Supabase. Guardar, consultar metadatos o eliminar la firma exige además rol
`superadmin`. El estado público solo devuelve entorno, punto de venta y una
CUIT enmascarada.

## Variables de entorno de Vercel

Configurar en Project Settings → Environment Variables:

```env
SUPABASE_SERVICE_ROLE_KEY=<service role exclusiva del servidor>
ARCA_CONFIG_ENCRYPTION_KEY=<salida de openssl rand -base64 32>
```

Ejecutar también la migración
`supabase/migrations/20260714000000_create_secure_arca_config.sql`. Luego un
superadministrador puede abrir **Sistema**, seleccionar Producción, CUIT
`27426946136`, punto de venta `1`, subir `.crt` y `.key`, guardar y probar la
conexión.

Como alternativa heredada se admiten variables privadas de Vercel:

```env
ARCA_CUIT=27426946136
ARCA_PUNTO_VENTA=1
ARCA_ENV=produccion
ARCA_CERT_BASE64=<certificado .crt codificado en base64>
ARCA_KEY_BASE64=<clave privada .key codificada en base64>
```

Para producción usar `ARCA_ENV=produccion`. También se admiten `ARCA_CERT` y
`ARCA_KEY` con PEM completo, pero base64 evita problemas con saltos de línea.
Tras cambiar variables en Vercel es obligatorio volver a desplegar.

Nunca configurar `VITE_ARCA_KEY`, `VITE_ARCA_CERT`, `VITE_AFIP_KEY` ni
`VITE_AFIP_CERT`: Vite incorpora esas variables al JavaScript público.

## Uso

El módulo Facturación muestra tres estados:

- **No configurado:** faltan secretos; los documentos son borradores locales.
- **Sin verificar:** los secretos existen y se puede ejecutar “Probar conexión”.
- **Conectado:** WSAA y WSFE respondieron correctamente.

Al emitir, ARCA devuelve el número de comprobante oficial, CAE, vencimiento y
los datos del QR. El PDF solo muestra leyenda fiscal y QR cuando existe un CAE
real. Si ARCA rechaza o no responde, el sistema conserva un borrador marcado
explícitamente como **sin validez fiscal**.

## Configuración obligatoria en ARCA

1. Crear una clave RSA de 2048 bits y un CSR para la CUIT.
2. Subir el CSR en “Administración de Certificados Digitales” y descargar `.crt`.
3. Crear un punto de venta de tipo “RECE para aplicativo y web services”.
4. Asociar el alias del certificado al servicio “Facturación Electrónica” (`wsfe`).
5. Probar primero en homologación y recién después habilitar producción.

## Seguridad operacional

- Restringir el módulo de Facturación a usuarios autorizados.
- Rotar certificado y clave si alguna vez fueron publicados en una variable
  `VITE_*`, un commit, un log o el almacenamiento del navegador.
- No reutilizar números locales: el proxy consulta `FECompUltimoAutorizado` y
  devuelve el número efectivamente solicitado a ARCA.
- Conservar CAE, vencimiento, resultado y QR en la tabla `facturas`.
