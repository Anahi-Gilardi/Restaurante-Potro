-- Migración para comandas acumulativas cabecera-detalle

-- 1. Asegurar que pedidos_cabecera tenga el estado 'abierta' disponible y por defecto
ALTER TABLE IF EXISTS public.pedidos_cabecera 
    DROP CONSTRAINT IF EXISTS chk_estado_comanda;

ALTER TABLE public.pedidos_cabecera 
    ADD CONSTRAINT chk_estado_comanda 
    CHECK (estado_comanda IN ('pendiente', 'en_cocina', 'completado', 'entregado_cobrado', 'cancelado', 'abierta', 'finalizada', 'archivada'));

-- 2. Crear tabla de detalles si no existe para almacenar ítems de forma atómica y relacional
CREATE TABLE IF NOT EXISTS public.pedido_detalle (
    id_detalle TEXT PRIMARY KEY,
    id_pedido BIGINT NOT NULL REFERENCES public.pedidos_cabecera(id_pedido) ON DELETE CASCADE,
    id_producto TEXT NOT NULL,
    nombre TEXT NOT NULL,
    cantidad INT NOT NULL CONSTRAINT chk_cantidad_positiva CHECK (cantidad > 0),
    categoria TEXT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente'
        CONSTRAINT chk_estado_detalle CHECK (estado IN ('pendiente', 'en_cocina', 'listo', 'entregado', 'cancelado')),
    fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Índices para optimizar el acceso concurrente
CREATE INDEX IF NOT EXISTS idx_cabecera_mesa_activa 
ON public.pedidos_cabecera (id_mesa) 
WHERE (estado_comanda = 'abierta');

CREATE INDEX IF NOT EXISTS idx_detalle_pedido 
ON public.pedido_detalle (id_pedido);
