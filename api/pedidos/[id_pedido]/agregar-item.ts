import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const getSupabaseClient = () => {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase configuration missing on process.env');
  }
  return createClient(url, key);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  try {
    const id_pedido = Number(req.query.id_pedido || req.body.id_pedido);
    const { item } = req.body;

    if (!id_pedido || isNaN(id_pedido)) {
      return res.status(400).json({ error: "id_pedido inválido u obligatorio" });
    }
    if (!item || typeof item !== 'object') {
      return res.status(400).json({ error: "El objeto item es obligatorio" });
    }

    const supabase = getSupabaseClient();

    // 1. Validar: id_pedido debe existir y NO estar cobrado o cancelado
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_cabecera')
      .select('*')
      .eq('id_pedido', id_pedido)
      .maybeSingle();

    if (pedidoError) {
      return res.status(500).json({ error: "Error al verificar el pedido: " + pedidoError.message });
    }
    if (!pedido) {
      return res.status(404).json({ error: "El pedido especificado no existe" });
    }
    if (pedido.estado_comanda === 'entregado_cobrado' || pedido.estado_comanda === 'cancelado') {
      return res.status(400).json({ error: "El pedido ya se encuentra cobrado o cancelado" });
    }

    // 2. Intentar llamar a la función RPC agregar_item_a_pedido
    try {
      const { data, error: rpcError } = await supabase.rpc('agregar_item_a_pedido', {
        p_id_pedido: id_pedido,
        p_item: item
      });

      if (!rpcError) {
        return res.status(200).json(data);
      }
      console.warn("RPC agregar_item_a_pedido failed. Falling back to manual JS execution...", rpcError.message);
    } catch (rpcCatchError: any) {
      console.warn("RPC agregar_item_a_pedido catch error. Falling back to manual JS execution...", rpcCatchError.message);
    }

    // 3. FALLBACK MANUAL JS: Agregar item al pedido existente
    let currentItems: any[] = [];
    if (pedido.items) {
      try {
        currentItems = typeof pedido.items === 'string' ? JSON.parse(pedido.items) : pedido.items;
        if (!Array.isArray(currentItems)) currentItems = [];
      } catch {
        currentItems = [];
      }
    }

    // Sumar o insertar item
    const existingIdx = currentItems.findIndex((it: any) => it.id_producto === item.id_producto);
    if (existingIdx > -1) {
      currentItems[existingIdx].cantidad = Number(currentItems[existingIdx].cantidad) + Number(item.cantidad);
    } else {
      currentItems.push({ ...item });
    }

    // Actualizar cabecera en DB
    const { error: updateError } = await supabase
      .from('pedidos_cabecera')
      .update({
        items: JSON.stringify(currentItems),
        fecha_hora: new Date().toISOString()
      })
      .eq('id_pedido', id_pedido);

    if (updateError) {
      return res.status(500).json({ error: "Error al actualizar items en cabecera: " + updateError.message });
    }

    // Actualizar detalles en DB (Borrar y reinsertar)
    await supabase.from('pedido_detalle').delete().eq('id_pedido', id_pedido);
    const detailsToInsert = currentItems.map((it, idx) => ({
      id_detalle: `${id_pedido}_${String(idx).padStart(4, '0')}`,
      id_pedido: id_pedido,
      id_producto: it.id_producto,
      nombre: it.nombre,
      cantidad: it.cantidad,
      categoria: it.categoria
    }));
    if (detailsToInsert.length > 0) {
      await supabase.from('pedido_detalle').insert(detailsToInsert);
    }

    return res.status(200).json({ ...pedido, items: currentItems });
  } catch (error: any) {
    console.error("API error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
