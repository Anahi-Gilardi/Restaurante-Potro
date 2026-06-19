import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

const URLS = {
  homologacion: {
    wsaa: "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
    wsfe: "https://wswhomo.afip.gov.ar/wsfev1/service.asmx",
  },
  produccion: {
    wsaa: "https://wsaa.afip.gov.ar/ws/services/LoginCms",
    wsfe: "https://servicios1.afip.gov.ar/wsfev1/service.asmx",
  },
};

// Genera el XML del Ticket de Requerimiento de Acceso (LTR)
function buildTicketReqXml(service: string): string {
  const uniqueId = Math.floor(Math.random() * 1000000).toString();
  const genTime = new Date(Date.now() - 2 * 60 * 1000).toISOString().replace(/[:\-]/g, '').slice(0, 14); // 2 minutos antes para evitar lag de reloj
  const expTime = new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString().replace(/[:\-]/g, '').slice(0, 14);

  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${genTime}</generationTime>
    <expirationTime>${expTime}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
}

// Firma el XML con el certificado y clave privada
function signTicket(xml: string, cert: string, key: string): string {
  const sign = crypto.createSign("sha256");
  sign.update(xml);
  sign.end();
  const signature = sign.sign({ key, passphrase: "" }, "base64");
  return `-----BEGIN PKCS7-----\n${signature}\n-----END PKCS7-----`;
}

// Obtiene el token y sign del WSAA
async function getWsaaToken(wsaaUrl: string, cms: string): Promise<{ token: string; sign: string }> {
  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov.ar">
  <soap:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cms}</wsaa:in0>
    </wsaa:loginCms>
  </soap:Body>
</soap:Envelope>`;

  const response = await fetch(wsaaUrl, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: "" },
    body: soap,
  });

  if (!response.ok) {
    throw new Error(`WSAA HTTP ${response.status}: ${await response.text()}`);
  }

  const xml = await response.text();
  const token = xml.match(/<token>([^<]+)<\/token>/)?.[1] || "";
  const sign = xml.match(/<sign>([^<]+)<\/sign>/)?.[1] || "";

  if (!token || !sign) {
    throw new Error("WSAA retornó credenciales vacías o inválidas");
  }

  return { token, sign };
}

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

    const envUrls = credentials.production ? URLS.produccion : URLS.homologacion;

    // 1. Obtener Token y Sign de WSAA
    const ltrXml = buildTicketReqXml("wsfe");
    const cms = signTicket(ltrXml, credentials.cert, credentials.key);
    const auth = await getWsaaToken(envUrls.wsaa, cms);

    if (action === "test") {
      return res.json({ success: true, message: "Conexión a ARCA establecida con éxito." });
    }

    if (action === "createInvoice") {
      if (!payload) {
        return res.status(400).json({ error: "Payload de factura faltante" });
      }

      // Obtener el último número de comprobante para el punto de venta y tipo
      const ptoVta = payload.puntoVenta || 1;
      const cbteTipo = payload.tipoComprobante || 6; // Factura B por defecto

      const soapLast = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:fe="http://ar.gov.afip.dif.FEV1/">
  <soap:Header/>
  <soap:Body>
    <fe:FECompUltimoAutorizado>
      <fe:Auth>
        <fe:Token>${auth.token}</fe:Token>
        <fe:Sign>${auth.sign}</fe:Sign>
        <fe:Cuit>${credentials.cuit}</fe:Cuit>
      </fe:Auth>
      <fe:PtoVta>${ptoVta}</fe:PtoVta>
      <fe:CbteTipo>${cbteTipo}</fe:CbteTipo>
    </fe:FECompUltimoAutorizado>
  </soap:Body>
</soap:Envelope>`;

      const responseLast = await fetch(envUrls.wsfe, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: "http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado",
        },
        body: soapLast,
      });

      if (!responseLast.ok) {
        throw new Error(`WSFE FECompUltimoAutorizado HTTP ${responseLast.status}`);
      }

      const xmlLast = await responseLast.text();
      const lastCbteNum = parseInt(xmlLast.match(/<CbteNro>(\d+)<\/CbteNro>/)?.[1] || "0");
      const nextCbteNum = lastCbteNum + 1;

      // Armar payload de IVA
      const itemsIva = payload.items || [];
      const baseImp = payload.neto || (payload.total / 1.21);
      const importeIva = payload.ivaTotal || (payload.total - baseImp);

      const soapInvoice = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:fe="http://ar.gov.afip.dif.FEV1/">
  <soap:Header/>
  <soap:Body>
    <fe:FECAESolicitar>
      <fe:Auth>
        <fe:Token>${auth.token}</fe:Token>
        <fe:Sign>${auth.sign}</fe:Sign>
        <fe:Cuit>${credentials.cuit}</fe:Cuit>
      </fe:Auth>
      <fe:FeCAEReq>
        <fe:FeCabReq>
          <fe:CantReg>1</fe:CantReg>
          <fe:PtoVta>${ptoVta}</fe:PtoVta>
          <fe:CbteTipo>${cbteTipo}</fe:CbteTipo>
        </fe:FeCabReq>
        <fe:FeDetReq>
          <fe:FECAEDetRequest>
            <fe:Concepto>1</fe:Concepto>
            <fe:DocTipo>${payload.cliente?.tipoDoc || 99}</fe:DocTipo>
            <fe:DocNro>${payload.cliente?.nroDoc || 0}</fe:DocNro>
            <fe:CbteDesde>${nextCbteNum}</fe:CbteDesde>
            <fe:CbteHasta>${nextCbteNum}</fe:CbteHasta>
            <fe:CbteFch>${new Date().toISOString().split('T')[0].replace(/-/g, "")}</fe:CbteFch>
            <fe:ImpTotal>${payload.total.toFixed(2)}</fe:ImpTotal>
            <fe:ImpTotConc>0.00</fe:ImpTotConc>
            <fe:ImpNeto>${baseImp.toFixed(2)}</fe:ImpNeto>
            <fe:ImpOpEx>0.00</fe:ImpOpEx>
            <fe:ImpTrib>0.00</fe:ImpTrib>
            <fe:ImpIVA>${importeIva.toFixed(2)}</fe:ImpIVA>
            <fe:MonId>PES</fe:MonId>
            <fe:MonCotiz>1</fe:MonCotiz>
            <fe:Iva>
              <fe:AlicIva>
                <fe:Id>5</fe:Id> <!-- 21% -->
                <fe:BaseImp>${baseImp.toFixed(2)}</fe:BaseImp>
                <fe:Importe>${importeIva.toFixed(2)}</fe:Importe>
              </fe:AlicIva>
            </fe:Iva>
          </fe:FECAEDetRequest>
        </fe:FeDetReq>
      </fe:FeCAEReq>
    </fe:FECAESolicitar>
  </soap:Body>
</soap:Envelope>`;

      const responseInvoice = await fetch(envUrls.wsfe, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: "http://ar.gov.afip.dif.FEV1/FECAESolicitar",
        },
        body: soapInvoice,
      });

      if (!responseInvoice.ok) {
        throw new Error(`WSFE FECAESolicitar HTTP ${responseInvoice.status}`);
      }

      const xmlInvoice = await responseInvoice.text();
      const getTag = (tag: string) => xmlInvoice.match(new RegExp(`<${tag}>([^<]*)<\\/${tag}>`))?.[1] || "";
      const cae = getTag("CAE");
      const vto = getTag("CAEFchVto");
      const resultado = getTag("Resultado");

      const obs: Array<{ code: number; msg: string }> = [];
      const obsBlocks = xmlInvoice.match(/<Obs>.*?<\/Obs>/gs) || [];
      obsBlocks.forEach((block) => {
        const code = parseInt(block.match(/<Code>(\d+)<\/Code>/)?.[1] || "0");
        const msg = block.match(/<Msg>([^<]*)<\/Msg>/)?.[1] || "";
        if (code) obs.push({ code, msg });
      });

      if (resultado === "R") {
        const errors = obs.map(o => `[${o.code}] ${o.msg}`).join("; ");
        return res.status(422).json({
          success: false,
          resultado,
          observaciones: obs,
          error: `ARCA rechazó la solicitud: ${errors || "Error de validación"}`
        });
      }

      return res.json({
        success: true,
        resultado,
        cae,
        vencimiento: vto,
        CodAutorizacion: cae,
        CAE: cae,
        Vencimiento: vto,
        CAEFchVto: vto,
        nroCmp: nextCbteNum
      });
    }

    return res.status(400).json({ error: `Acción '${action}' no soportada.` });
  } catch (err: any) {
    console.error("ARCA proxy handler error:", err);
    return res.status(500).json({ error: err.message || "Error interno del servidor en el proxy de ARCA" });
  }
}
