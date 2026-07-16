import type { VercelRequest, VercelResponse } from "../_types";
import {
  ApiAccessError,
  applyApiSecurityHeaders,
  requireAuthenticatedDataClient,
} from "../_security";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyApiSecurityHeaders(req, res, ['GET'])) {
    return res.status(403).json({ error: 'Origen no autorizado.' });
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).end();
  }

  try {
    const id_pedido = Number(req.query.id_pedido);

    if (!id_pedido || isNaN(id_pedido)) {
      return res.status(400).json({ error: "id_pedido inválido u obligatorio" });
    }

    const supabase = await requireAuthenticatedDataClient(req, ['superadmin', 'administrador', 'mozo', 'cocina']);

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
    if (error instanceof ApiAccessError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("API error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
