import type { VercelRequest, VercelResponse } from "../_types";
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
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }

  try {
    const id_pedido = Number(req.query.id_pedido);

    if (!id_pedido || isNaN(id_pedido)) {
      return res.status(400).json({ error: "id_pedido inválido u obligatorio" });
    }

    const supabase = getSupabaseClient();

    // Validar: id_pedido debe existir
    const { data: pedidoExists, error: existError } = await supabase
      .from('pedidos_cabecera')
      .select('id_pedido')
      .eq('id_pedido', id_pedido)
      .maybeSingle();

    if (existError) {
      return res.status(500).json({ error: "Error al verificar existencia del pedido: " + existError.message });
    }
    if (!pedidoExists) {
      return res.status(404).json({ error: "El pedido especificado no existe" });
    }

    // Llamar a la función obtener_pedido_completo
    const { data, error: rpcError } = await supabase.rpc('obtener_pedido_completo', {
      p_id_pedido: id_pedido
    });

    if (rpcError) {
      return res.status(500).json({ error: "Error en el procedimiento almacenado: " + rpcError.message });
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error("API error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
