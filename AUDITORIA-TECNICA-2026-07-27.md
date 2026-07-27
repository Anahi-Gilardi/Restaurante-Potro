# Auditoría técnica de El Patrón

Fecha: 27 de julio de 2026

Este documento contrasta el prompt maestro de auditoría con el código publicado. No sustituye una revisión contable, tributaria ni una homologación formal de ARCA.

## Estado verificado

- TypeScript, pruebas, controles de despliegue y build ejecutados.
- Factura C con CAE, QR fiscal y PDF condicionados a una autorización real.
- Credenciales fiscales y `service_role` limitadas al backend.
- Cobro interno y persistencia de pagos protegidos contra doble envío.
- Caja conserva cierres pendientes y los reintenta cuando vuelve la conexión.
- Contraseñas nuevas con mínimo de 12 caracteres.
- Datos ficticios retirados de BI, proveedores, clientes, menú y cierres.
- Backups automáticos con autenticación de cron y validación previa.

## Correcciones de esta revisión

- BI no declara Rappi o PedidosYa “En línea” sin un health check real.
- La matriz comercial excluye productos sin receta o costos completos y muestra cobertura.
- Reservas inicia sin mesa elegida, no preselecciona mesas ocupadas y bloquea una selección que dejó de estar disponible.
- WhatsApp queda desactivado hasta que el operador confirme el consentimiento.
- Promociones no convierte combos o 2x1 en porcentajes ni inventa puntos de fidelidad.
- Tipo y vigencia informativa de promociones se persisten en Supabase.
- El reporte de errores del cliente usa un endpoint existente, autenticado y acotado.
- El componente reutilizable del logo ya no genera IDs HTML duplicados.

## Pendientes estructurales

### Prioridad crítica

1. Reemplazar el acceso RLS general de `authenticated` por permisos por acción y rol.
2. Crear un libro de caja inmutable y conciliación calculada en backend.
3. Diagnosticar y marcar cierres históricos con fechas o totales inconsistentes sin inventar datos.
4. Centralizar importes fiscales en una representación decimal exacta compartida.
5. Bloquear reservas concurrentes mediante una transacción o RPC de base de datos.

### Prioridad alta

1. Implementar un motor real de promociones con `buy_x_get_y`, combos, elegibilidad, horarios y acumulación.
2. Registrar cada transición KDS con usuario, terminal, hora y duración.
3. Completar el ledger de fidelización y las reversas por Nota de Crédito.
4. Convertir la simulación de sesión en impersonación temporal y auditada.
5. Incorporar pruebas E2E con Playwright y accesibilidad automática con axe.
6. Ejecutar una prueba controlada de restauración de backup y documentar rollback.

### Rendimiento y experiencia

1. Reducir el precache de la PWA y cargar PDF solamente cuando se necesita.
2. Dividir el módulo de Caja y revisar los imports mixtos de Reservas.
3. Medir LCP, INP y CLS en 390, 768 y 1440 píxeles.
4. Revisar foco, diálogos y navegación por teclado módulo por módulo.

## Estrategia de publicación

Los cambios de interfaz y observabilidad pueden publicarse juntos después de las pruebas. Las migraciones RLS, caja, promociones avanzadas y reservas concurrentes deben salir en entregas separadas, con copia de seguridad, prueba en un proyecto de ensayo y rollback documentado.
