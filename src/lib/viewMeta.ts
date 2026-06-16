import type { AppView } from './permissions';

export const APP_VIEW_META: Record<AppView, { title: string; description: string }> = {
  home: {
    title: 'Menú principal y centro operativo',
    description: 'Acceso rápido a las áreas de salón, cocina, caja, inventario y administración.'
  },
  panel: {
    title: 'Panel de control del turno',
    description: 'Métricas clave, alertas operativas y bitácora del servicio en tiempo real.'
  },
  mozo: {
    title: 'Terminal de mozos',
    description: 'Gestión de mesas, comensales y envío de comandas a cocina.'
  },
  cocina: {
    title: 'Cocina',
    description: 'Seguimiento de comandas, tiempos de preparación y producción por receta.'
  },
  caja: {
    title: 'Caja y cierres',
    description: 'Cobros, medios de pago, facturación y control de cierre del turno.'
  },
  reportes: {
    title: 'Analíticas de desempeño y BI',
    description: 'Indicadores visuales para facturación, demanda, rentabilidad y operación histórica.'
  },
  usuarios: {
    title: 'Personal y usuarios',
    description: 'Roles operativos, usuarios activos y trazabilidad básica del equipo.'
  },
  menu: {
    title: 'Menú y carta',
    description: 'Oferta comercial, precios, categorías y disponibilidad de productos.'
  },
  recetas: {
    title: 'Recetas y escandallos',
    description: 'Asociación de ingredientes, rendimiento, costos y márgenes por producto.'
  },
  mesas: {
    title: 'Mesas del salón',
    description: 'Distribución del salón, ocupación, capacidad y estados de servicio.'
  },
  inventario: {
    title: 'Inventario e insumos',
    description: 'Stock actual, reposiciones, recetas asociadas y registro de mermas.'
  },
  proveedores: {
    title: 'Proveedores',
    description: 'Contactos comerciales, condiciones de entrega y abastecimiento.'
  },
  promociones: {
    title: 'Promociones',
    description: 'Campañas, descuentos y beneficios vigentes para impulsar ventas.'
  },
  reservas: {
    title: 'Reservas',
    description: 'Agenda de visitas, comensales reservados y asignación de mesas.'
  },
  facturacion: {
    title: 'Facturación',
    description: 'Historial de comprobantes, IVA, notas de crédito y registros fiscales.'
  },
  sistema: {
    title: 'Configuración del sistema',
    description: 'Estado de Supabase, variables de entorno, sincronización y herramientas de soporte.'
  },
  backups: {
    title: 'Copias de seguridad',
    description: 'Respaldo de datos, descargas JSON y restauración de puntos de control.'
  }
};
