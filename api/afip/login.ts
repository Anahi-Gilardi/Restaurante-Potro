import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import https from "https";

const AFIP_URLS = {
  homologacion: {
    wsaa: "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
    wsfe: "https://wswhomo.afip.gov.ar/wsfev1/service.asmx",
  },
  produccion: {
    wsaa: "https://wsaa.afip.gov.ar/ws/services/LoginCms",
    wsfe: "https://servicios1.afip.gov.ar/wsfev1/service.asmx",
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { service, ticketReq, cert, key } = req.body;

    // Firmar el CMS con la clave privada (X.509)
    const sign = crypto.createSign("sha256");
    sign.update(ticketReq);
    sign.end();
    const signature = sign.sign({ key, passphrase: "" }, "base64");

    const cms = `-----BEGIN PKCS7-----\n${signature}\n-----END PKCS7-----`;

    const env = AFIP_URLS[req.body.cuit === "99999999999" ? "homologacion" : "produccion"];
    const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov.ar">
  <soap:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cms}</wsaa:in0>
    </wsaa:loginCms>
  </soap:Body>
</soap:Envelope>`;

    const response = await fetch(env.wsaa, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: "" },
      body: soap,
    });

    const xml = await response.text();
    res.setHeader("Content-Type", "text/xml");
    res.status(200).send(xml);
  } catch (err: any) {
    console.error("AFIP WSAA error:", err);
    res.status(500).json({ error: err.message });
  }
}
