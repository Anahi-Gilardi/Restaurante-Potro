import { z } from 'zod';

// =============================================================================
// Schemas de validación Zod — Sistema Gestor Gastronómico "El Patrón"
// Usados en módulos de CRUD para validar inputs antes de persistir en Supabase.
// =============================================================================

// ── Usuarios ──────────────────────────────────────────────────────────────────
export const usuarioSchema = z.object({
    nombre:   z.string().trim().min(2, 'Nombre debe tener al menos 2 caracteres').max(50),
    apellido: z.string().trim().min(2, 'Apellido debe tener al menos 2 caracteres').max(50),
    rol:      z.enum(['superadmin', 'administrador', 'mozo', 'cocina']),
});

// ── Mesas ─────────────────────────────────────────────────────────────────────
export const mesaSchema = z.object({
    numero:  z.string().trim().min(1, 'Número de mesa requerido').max(20),
    sector:  z.enum(['comedor', 'salon', 'terraza', 'vip']),
    capacidad: z.number().int().min(1, 'Capacidad mínima 1').max(30).optional(),
});

// ── Proveedores ───────────────────────────────────────────────────────────────
export const proveedorSchema = z.object({
    nombre:              z.string().trim().min(2, 'Nombre del proveedor requerido').max(100),
    contacto:            z.string().trim().min(2, 'Nombre de contacto requerido').max(80),
    telefono:            z.string().trim().min(5, 'Teléfono requerido').max(30),
    correo:              z.string().email('Email inválido').optional().or(z.literal('')),
    categoria:           z.enum(['carnes', 'verduras', 'bebidas', 'viveres', 'descartables']),
    tiempo_entrega_dias: z.number().int().min(1).max(30),
});

// ── Reservas ──────────────────────────────────────────────────────────────────
export const reservaSchema = z.object({
    nombre_cliente: z.string().trim().min(2, 'Nombre del cliente requerido').max(80),
    telefono:       z.string().trim().min(5, 'Teléfono requerido').max(30),
    pax:            z.number().int().min(1, 'Mínimo 1 persona').max(50),
    hora:           z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (HH:MM)'),
    observaciones:  z.string().max(300).optional(),
    fecha:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha en formato YYYY-MM-DD').optional(),
});

// ── Promociones ───────────────────────────────────────────────────────────────
export const promocionSchema = z.object({
    nombre:               z.string().trim().min(2, 'Nombre de promoción requerido').max(100),
    descuento_porcentaje: z.number().int().min(1, 'Mínimo 1%').max(100, 'Máximo 100%'),
    tipo:                 z.enum(['happy_hour', 'combo', 'descuento_directo']),
    vigencia:             z.string().max(100).optional(),
    descripcion:          z.string().max(300).optional(),
});

// ── Items del menú ────────────────────────────────────────────────────────────
export const menuItemSchema = z.object({
    nombre:       z.string().trim().min(2, 'Nombre del producto requerido').max(80),
    precio_venta: z.number().positive('El precio debe ser mayor a 0'),
    categoria:    z.string().min(1, 'Categoría requerida'),
    descripcion:  z.string().max(300).optional(),
});

// ── Insumos de inventario ─────────────────────────────────────────────────────
export const insumoSchema = z.object({
    nombre:         z.string().trim().min(2, 'Nombre del insumo requerido').max(100),
    stock_actual:   z.number().min(0, 'El stock no puede ser negativo'),
    stock_minimo:   z.number().min(0, 'El stock mínimo no puede ser negativo'),
    unidad_medida:  z.enum(['unidades', 'g', 'ml']),
    categoria:      z.enum(['bodega', 'frescos', 'secos']),
    costo_unitario: z.number().min(0, 'El costo no puede ser negativo').optional(),
}).refine(
    data => data.stock_minimo <= data.stock_actual || data.stock_actual === 0,
  { message: 'El stock mínimo no puede superar al stock actual (a menos que sea 0)', path: ['stock_minimo'] }
  );

// ── Ítem de receta (escandallo) ───────────────────────────────────────────────
export const recetaItemSchema = z.object({
    id_producto:           z.string().min(1, 'Producto requerido'),
    id_insumo:             z.string().min(1, 'Insumo requerido'),
    cantidad_a_descontar:  z.number().positive('La cantidad debe ser mayor a 0'),
});

// ── Merma / descarte ──────────────────────────────────────────────────────────
export const mermaSchema = z.object({
    id_insumo: z.string().min(1, 'Insumo requerido'),
    cantidad:  z.number().positive('La cantidad debe ser mayor a 0'),
    motivo:    z.enum(['vencimiento', 'rotura', 'error_cocina', 'otro']),
});

// ── Cierre de caja ────────────────────────────────────────────────────────────
export const aperturaCajaSchema = z.object({
    monto_apertura: z.number().min(0, 'El monto inicial no puede ser negativo'),
    cajero:         z.string().trim().min(2, 'Nombre del cajero requerido').max(80),
});

// ── Helper genérico ───────────────────────────────────────────────────────────
/**
 * Valida datos contra un schema Zod.
 * Devuelve { success, data } o { success: false, errors: string[] }.
 */
export function validate<T>(
    schema: z.ZodSchema<T>,
    data: unknown
  ): { success: true; data: T } | { success: false; errors: string[] } {
    const result = schema.safeParse(data);
    if (result.success) return { success: true, data: result.data };
    return {
          success: false,
          errors: result.error.issues.map(i =>
                  i.path.length > 0 ? `${i.path.join('.')}: ${i.message}` : i.message
                                              ),
    };
}
