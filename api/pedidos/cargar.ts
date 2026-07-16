import type { VercelRequest, VercelResponse } from "../_types";
import {
  ApiAccessError,
  applyApiSecurityHeaders,
  requestBodyIsTooLarge,
  requireAuthenticatedDataClient,
} from "../_security.js";
import { isSafeOrderItems } from '../_orderValidation.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyApiSecurityHeaders(req, res, ['POST'])) {
    return res.status(403).json({ error: 'Origen no autorizado.' });
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).end();
  }
  if (requestBodyIsTooLarge(req)) {
    return res.status(413).json({ error: 'Solicitud demasiado grande.' });
  }

  try {
    const { id_mesa, restaurante_id, mozo_nombre, items, observaciones } = req.body;

    if (!id_mesa) {
      return res.status(400).json({ error: "id_mesa es obligatorio" });
    }
    if (!restaurante_id) {
      return res.status(400).json({ error: "restaurante_id es obligatorio" });
    }
    if (!mozo_nombre) {
      return res.status(400).json({ error: "mozo_nombre es obligatorio" });
    }
    if (!isSafeOrderItems(items)) {
      return res.status(400).json({ error: "La lista de items contiene datos inválidos" });
    }
    if (String(mozo_nombre).trim().length > 120 || String(observaciones ?? '').length > 1_000) {
      return res.status(400).json({ error: 'Los datos descriptivos exceden el límite permitido.' });
    }

    const supabase = await requireAuthenticatedDataClient(req, ['superadmin', 'administrador', 'mozo']);

    // 1. Validar: mesa debe existir
    const { data: mesa, error: mesaError } = await supabase
      .from('mesas')
      .select('id_mesa, numero_mesa')
      .eq('id_mesa', id_mesa)
      .maybeSingle();

    if (mesaError) {
      return res.status(500).json({ error: "Error al verificar la mesa: " + mesaError.message });
    }
    if (!mesa) {
      return res.status(400).json({ error: "La mesa especificada no existe" });
    }

    // 2. Intentar llamar a la función RPC cargar_pedido_mozo
    try {
      const { data, error: rpcError } = await supabase.rpc('cargar_pedido_mozo', {
        p_id_mesa: id_mesa,
        p_restaurante_id: restaurante_id,
        p_mozo_nombre: mozo_nombre,
        p_items: items,
        p_observaciones: observaciones || null
      });

      if (!rpcError) {
        return res.status(200).json(data);
      }
      console.warn("RPC cargar_pedido_mozo failed or missing. Falling back to manual JS execution...", rpcError.message);
    } catch (rpcCatchError: any) {
      console.warn("RPC cargar_pedido_mozo catch error. Falling back to manual JS execution...", rpcCatchError.message);
    }

    // 3. FALLBACK MANUAL JS: Buscar pedido activo para esa mesa
    const { data: activePedidos, error: activeError } = await supabase
      .from('pedidos_cabecera')
      .select('*')
      .eq('id_mesa', id_mesa)
      .not('estado_comanda', 'in', '("entregado_cobrado","cancelado")');

    if (activeError) {
      return res.status(500).json({ error: "Error al buscar pedido activo: " + activeError.message });
    }

    let activePedido = activePedidos?.[0] || null;

    if (activePedido) {
      // COMBINAR ITEMS
      let currentItems: any[] = [];
      if (activePedido.items) {
        try {
          currentItems = typeof activePedido.items === 'string' ? JSON.parse(activePedido.items) : activePedido.items;
          if (!Array.isArray(currentItems)) currentItems = [];
        } catch {
          currentItems = [];
        }
      }

      for (const newItem of items) {
        const existingIdx = currentItems.findIndex((it: any) => it.id_producto === newItem.id_producto);
        if (existingIdx > -1) {
          currentItems[existingIdx].cantidad = Number(currentItems[existingIdx].cantidad) + Number(newItem.cantidad);
        } else {
          currentItems.push({ ...newItem });
        }
      }

      // COMBINAR OBSERVACIONES
      const obsArray = [activePedido.observaciones, observaciones].map(o => o?.trim()).filter(Boolean);
      const mergedObs = obsArray.join(' | ') || null;

      // ACTUALIZAR CABECERA
      const updatePayload: any = {
        items: JSON.stringify(currentItems),
        observaciones: mergedObs,
        fecha_hora: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('pedidos_cabecera')
        .update(updatePayload)
        .eq('id_pedido', activePedido.id_pedido);

      if (updateError) {
        return res.status(500).json({ error: "Error al actualizar pedido activo: " + updateError.message });
      }

      // ACTUALIZAR DETALLES (Borrar anteriores e insertar combinados)
      await supabase.from('pedido_detalle').delete().eq('id_pedido', activePedido.id_pedido);
      const detailsToInsert = currentItems.map((it, idx) => ({
        id_detalle: `${activePedido.id_pedido}_${String(idx).padStart(4, '0')}`,
        id_pedido: activePedido.id_pedido,
        id_producto: it.id_producto,
        nombre: it.nombre,
        cantidad: it.cantidad,
        categoria: it.categoria
      }));
      if (detailsToInsert.length > 0) {
        await supabase.from('pedido_detalle').insert(detailsToInsert);
      }

      return res.status(200).json({ ...activePedido, items: currentItems, observaciones: mergedObs });
    } else {
      // CREAR NUEVO PEDIDO
      // Generar nuevo id_pedido sequential
      const { data: maxData, error: maxError } = await supabase
        .from('pedidos_cabecera')
        .select('id_pedido')
        .order('id_pedido', { ascending: false })
        .limit(1);

      if (maxError) {
        return res.status(500).json({ error: "Error al generar ID del pedido: " + maxError.message });
      }

      const nextId = maxData?.[0] ? Number(maxData[0].id_pedido) + 1 : 1000;

      const newPedido: any = {
        id_pedido: nextId,
        id_mesa: id_mesa,
        numero_mesa: mesa.numero_mesa || `Mesa ${id_mesa}`,
        mozo: mozo_nombre,
        estado_comanda: 'pendiente',
        observaciones: observaciones || null,
        fecha_hora: new Date().toISOString(),
        minutos_transcurridos: 0,
        origen: 'Mozo',
        items: JSON.stringify(items)
      };

      const { error: insertError } = await supabase
        .from('pedidos_cabecera')
        .insert([newPedido]);

      if (insertError) {
        return res.status(500).json({ error: "Error al insertar comanda: " + insertError.message });
      }

      // INSERTAR DETALLES
      const detailsToInsert = items.map((it, idx) => ({
        id_detalle: `${nextId}_${String(idx).padStart(4, '0')}`,
        id_pedido: nextId,
        id_producto: it.id_producto,
        nombre: it.nombre,
        cantidad: it.cantidad,
        categoria: it.categoria
      }));
      if (detailsToInsert.length > 0) {
        await supabase.from('pedido_detalle').insert(detailsToInsert);
      }

      return res.status(200).json(newPedido);
    }
  } catch (error: any) {
    if (error instanceof ApiAccessError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("API error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
