# El Patrón - Sistema Gestor Gastronómico

Aplicación web para administrar la operación diaria de un restaurante: menú principal, mesas, comandas, cocina, caja, inventario, recetas por escandallo, proveedores, promociones, reservas, facturación, tickets PDF, backups y sincronización opcional con Supabase.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS 4
- Supabase JS para persistencia remota opcional
- jsPDF para comprobantes descargables
- Datos iniciales locales para modo demo/offline

## Requisitos

- Node.js 20 o superior recomendado
- Proyecto Supabase opcional si se quiere sincronizar datos en la nube

## Instalación

```bash
npm install
```

## Configuración

La app puede ejecutarse sin Supabase usando los datos locales de demostración.

Para conectar Supabase:

1. Copiar `.env.example` a `.env.local`.
2. Completar:

```env
VITE_SUPABASE_URL="https://tu-proyecto.supabase.co"
VITE_SUPABASE_ANON_KEY="tu-anon-key"
```

3. Ejecutar la migración SQL ubicada en `supabase/migrations/20260612000000_create_schema.sql`.
4. Abrir el módulo `Sistema` dentro de la app para probar conexión, sembrar datos o descargar datos remotos.

## Desarrollo

```bash
npm run dev
```

La app levanta en:

```text
http://localhost:3000
```

Credenciales demo:

```text
Usuario: sistema
Contraseña: restaurante
```

## Verificación

```bash
npm run lint
npm run build
```

## Limpieza

```bash
npm run clean
```

## Módulos

- Menú principal operativo
- Mozo / Salón
- Cocina
- Caja y cierres
- Facturación y PDF
- Menú y carta
- Recetas / escandallos
- Inventario y movimientos
- Mesas
- Reservas
- Proveedores
- Promociones
- Reportes / BI
- Sistema y Supabase
- Backups

## Notas de seguridad

- No se incluyen credenciales reales en el repositorio.
- La conexión Supabase es opcional y no usa URL ni clave hardcodeada.
- Las políticas RLS de la migración son abiertas para desarrollo/demo. Para producción, restringirlas por usuario, rol y operación.
