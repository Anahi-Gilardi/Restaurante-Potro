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
- Las reservas solapadas quedan bloqueadas por un trigger transaccional en PostgreSQL.
- Caja cuenta con un ledger append-only y vistas de conciliación calculadas en backend.
- Cada transición KDS persiste actor autenticado, terminal, estados y duración operativa.
- El precache PWA bajó de 8,8 MB a 2,24 MB y excluye PDF, canvas e imágenes pesadas.
- Supabase separa lectura y escritura por rol operativo; no quedan políticas amplias heredadas.
- Auditoría, backups, configuración y revisiones de integridad contable requieren rol administrativo.

## Diagnóstico histórico sin corrección automática

- Se detectaron 5 comprobantes históricos sin pagos conciliados: 1 Factura B, 2 Facturas C y 2 Notas de Crédito.
- Se detectaron 20 cierres con diferencia guardada inconsistente y 5 cierres con fechas inconsistentes.
- Estos registros se marcan para revisión, pero no se modifican ni se completan con datos inventados.
- Las protecciones de concurrencia de reservas y de inmutabilidad del ledger fueron probadas transaccionalmente y dejaron cero registros de prueba.

## Pendientes estructurales

### Prioridad crítica

1. Centralizar importes fiscales en una representación decimal exacta compartida.
2. Revisar contablemente los comprobantes y cierres marcados por las vistas de diagnóstico.

### Prioridad alta

1. Implementar un motor real de promociones con `buy_x_get_y`, combos, elegibilidad, horarios y acumulación.
2. Completar el ledger de fidelización y las reversas por Nota de Crédito.
3. Convertir la simulación de sesión en impersonación temporal y auditada.
4. Incorporar pruebas E2E con Playwright y accesibilidad automática con axe.
5. Ejecutar una prueba controlada de restauración de backup y documentar rollback.

### Rendimiento y experiencia

1. Dividir el módulo de Caja y revisar los imports mixtos de Reservas.
2. Medir LCP, INP y CLS en 390, 768 y 1440 píxeles.
3. Revisar foco, diálogos y navegación por teclado módulo por módulo.

## Estrategia de publicación

Las migraciones de seguridad RLS, concurrencia de reservas y ledger de caja se aplicaron por separado, con pruebas transaccionales y sin modificar registros históricos. Las próximas ampliaciones del motor de promociones y fidelización deben mantener esa misma estrategia de entrega controlada.
