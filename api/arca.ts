import type { VercelRequest, VercelResponse } from "@vercel/node";
import arcaSdk from "@arcasdk/core";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  try {
    const { action, credentials, payload } = req.body;

    if (!credentials || !credentials.cuit || !credentials.key || !credentials.cert) {
      return res.status(400).json({ error: "Credenciales de ARCA incompletas o faltantes" });
    }

    const key = credentials.key.replace(/\\n/g, "\n");
    const cert = credentials.cert.replace(/\\n/g, "\n");
    const cuit = Number(credentials.cuit);
    const production = !!credentials.production;

    // Instanciar la clase Arca del SDK
    const ArcaClass = (arcaSdk as any).Arca || arcaSdk;
    const arca = new ArcaClass({
      cuit,
      key,
      cert,
      production,
      useHttpsAgent: true
    });

    const billing = arca.electronicBillingService;

    if (action === "test") {
      const status = await billing.getServerStatus();
      return res.json({ success: true, status, message: "Conexión a ARCA establecida con éxito." });
    }

    if (action === "createInvoice") {
      const tipoComprobante = payload.tipoComprobante || 6; // Factura B por defecto
      const ptoVta = payload.puntoVenta || 1;
      
      const docTipo = payload.cliente?.tipoDoc ?? 99;
      const docNro = payload.cliente?.nroDoc ?? 0;
      const total = Number(payload.total);
      const neto = Number(payload.neto || (total / 1.21));
      const iva = Number(payload.ivaTotal || (total - neto));
      
      // Llamar al SDK para crear el comprobante
      const result = await billing.createNextInvoice({
        CantReg: 1,
        PtoVta: ptoVta,
        CbteTipo: tipoComprobante,
        Concepto: 1, // Productos
        DocTipo: docTipo,
        DocNro: docNro,
        CbteFch: new Date().toISOString().split('T')[0].replace(/-/g, ""),
        ImpTotal: Number(total.toFixed(2)),
        ImpTotConc: 0.00,
        ImpNeto: Number(neto.toFixed(2)),
        ImpOpEx: 0.00,
        ImpTrib: 0.00,
        ImpIVA: Number(iva.toFixed(2)),
        MonId: "PES",
        MonCotiz: 1,
        Iva: [
          {
            Id: 5, // 21%
            BaseImp: Number(neto.toFixed(2)),
            Importe: Number(iva.toFixed(2))
          }
        ]
      });

      // Si hay errores de AFIP
      if (result.response?.Errors?.Err && result.response.Errors.Err.length > 0) {
        const errorMsg = result.response.Errors.Err.map((e: any) => `[${e.Code}] ${e.Msg}`).join("; ");
        return res.status(422).json({
          success: false,
          error: errorMsg
        });
      }

      // Si fue aprobado con observaciones o rechazado sin CAE
      if (!result.cae) {
        const obsMsg = result.response?.Body?.FECAESolicitarResponse?.FECAESolicitarResult?.FeDetResp?.FECAEDetResponse?.Observaciones?.Obs?.map((o: any) => `[${o.Code}] ${o.Msg}`).join("; ") || "Rechazado por AFIP";
        return res.status(422).json({
          success: false,
          error: obsMsg
        });
      }

      // Retornar en el mismo formato esperado por el frontend
      return res.json({
        success: true,
        resultado: "A",
        cae: result.cae,
        vencimiento: result.caeFchVto,
        CodAutorizacion: result.cae,
        CAE: result.cae,
        Vencimiento: result.caeFchVto,
        CAEFchVto: result.caeFchVto,
        nroCmp: result.response?.Body?.FECAESolicitarResponse?.FECAESolicitarResult?.FeDetResp?.FECAEDetResponse?.CbteDesde || 1
      });
    }

    return res.status(400).json({ error: `Acción '${action}' no soportada.` });
  } catch (err: any) {
    console.error("ARCA handler error:", err);
    return res.status(500).json({ error: err.message || "Error interno de ARCA" });
  }
}
