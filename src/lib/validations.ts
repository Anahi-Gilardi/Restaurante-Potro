import { z } from 'zod';

export const usuarioSchema = z.object({
  nombre: z.string().trim().min(2, 'Nombre debe tener al menos 2 caracteres').max(50),
  apellido: z.string().trim().min(2, 'Apellido debe tener al menos 2 caracteres').max(50),
  rol: z.enum(['mozo', 'cocina', 'administrador']),
});

export const mesaSchema = z.object({
  numero: z.string().trim().min(1, 'Número de mesa requerido').max(20),
  sector: z.enum(['salon', 'terraza', 'vip']),
});

export const proveedorSchema = z.object({
  nombre: z.string().trim().min(2, 'Nombre del proveedor requerido').max(100),
  contacto: z.string().trim().min(2, 'Nombre de contacto requerido').max(80),
  telefono: z.string().trim().min(5, 'Teléfono requerido').max(30),
  correo: z.string().email('Email inválido').optional().or(z.literal('')),
  categoria: z.enum(['carnes', 'verduras', 'bebidas', 'viveres', 'descartables']),
  tiempo_entrega_dias: z.number().int().min(1).max(30),
});

export const reservaSchema = z.object({
  nombre_cliente: z.string().trim().min(2, 'Nombre del cliente requerido').max(80),
  telefono: z.string().trim().min(5, 'Teléfono requerido').max(30),
  pax: z.number().int().min(1, 'Mínimo 1 persona').max(50),
  hora: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido'),
  observaciones: z.string().max(300).optional(),
});

export const promocionSchema = z.object({
  nombre: z.string().trim().min(2, 'Nombre de promoción requerido').max(100),
  descuento_porcentaje: z.number().int().min(1, 'Mínimo 1%').max(100, 'Máximo 100%'),
  tipo: z.enum(['happy_hour', 'combo', 'descuento_directo']),
  vigencia: z.string().max(100).optional(),
  descripcion: z.string().max(300).optional(),
});

export const menuItemSchema = z.object({
  nombre: z.string().trim().min(2, 'Nombre del producto requerido').max(80),
  precio_venta: z.number().positive('Precio debe ser mayor a 0'),
  categoria: z.string().min(1),
  descripcion: z.string().max(300).optional(),
});

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: string[] } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    errors: result.error.issues.map(i => i.message),
  };
}
