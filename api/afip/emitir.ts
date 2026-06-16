import type { VercerRequest, VercerResponse } from "@vercel/node";

const AFIP_URLS = {
  homologacion: "https://wswhomo.afip.gov.ar/wsfev1/service.asmx",
  produccion: "https://servicios1.afip.gov.ar/wsfev1/service.asmx",
};

export default async function handler(req: VercerRequest, res: VercerResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { token, sign, cuit, invoice } = req.body;

    const ivaXml = (invoice.iva || []).map((i: any) =>
      `<AlicIva><Id>${i.id}</Id><BaseImp>${i.baseImp.toFixed(2)}</BaseImp><Importe>${i.importe.toFixed(2)}</Importe></AlicIva>`
    ).join("");

    const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:fe="http://ar.gov.afip.dif.FEV1/">
  <soap:Header/>
  <soap:Body>
    <fe:FECAESolicitar>
      <fe:Auth>
        <fe:Token>${token}</fe:Token>
        <fe:Sign>${sign}</fe:Sign>
        <fe:Cuit>${cuit}</fe:Cuit>
      </fe:Auth>
      <fe:FeCAEReq>
        <fe:FeCabReq>
          <fe:CantReg>1</fe:CantReg>
          <fe:PtoVta>${invoice.ptoVta}</fe:PtoVta>
          <fe:CbteTipo>${invoice.cbteTipo}</fe:CbteTipo>
        </fe:FeCabReq>
        <fe:FeDetReq>
          <fe:FECAEDetRequest>
            <fe:Concepto>${invoice.concepto}</fe:Concepto>
            <fe:DocTipo>${invoice.docTipo}</fe:DocTipo>
            <fe:DocNro>${invoice.docNro}</fe:DocNro>
            <fe:CbteDesde>1</fe:CbteDesde>
            <fe:CbteHasta>1</fe:CbteHasta>
            <fe:CbteFch>${invoice.fecha.replace(/-/g, "")}</fe:CbteFch>
            <fe:ImpTotal>${invoice.impTotal.toFixed(2)}</fe:ImpTotal>
            <fe:ImpNeto>${invoice.impNeto.toFixed(2)}</fe:ImpNeto>
            <fe:ImpIVA>${invoice.impIVA.toFixed(2)}</fe:ImpIVA>
            <fe:ImpTrib>${(invoice.impTrib || 0).toFixed(2)}</fe:ImpTrib>
            <fe:MonId>PES</fe:MonId>
            <fe:MonCotiz>1</fe:MonCotiz>
            ${ivaXml ? `<fe:Iva>${ivaXml}</fe:Iva>` : ""}
          </fe:FECAEDetRequest>
        </fe:FeDetReq>
      </fe:FeCAEReq>
    </fe:FECAESolicitar>
  </soap:Body>
</soap:Envelope>`;

    const env = cuit === 99999999999 ? AFIP_URLS.homologacion : AFIP_URLS.produccion;
    const response = await fetch(env, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "http://ar.gov.afip.dif.FEV1/FECAESolicitar",
      },
      body: soap,
    });

    const xml = await response.text();
    const getTag = (tag: string) => xml.match(new RegExp(`<${tag}>([^<]*)<\\/${tag}>`))?.[1] || "";
    const cae = getTag("CAE");
    const vto = getTag("CAEFchVto");
    const resultado = getTag("Resultado");

    const obs: Array<{ code: number; msg: string }> = [];
    const obsBlocks = xml.match(/<Obs>.*?<\/Obs>/gs) || [];
    obsBlocks.forEach((block) => {
      const code = parseInt(block.match(/<Code>(\d+)<\/Code>/)?.[1] || "0");
      const msg = block.match(/<Msg>([^<]*)<\/Msg>/)?.[1] || "";
      if (code) obs.push({ code, msg });
    });

    if (resultado === "R") {
      return res.status(422).json({ resultado, observaciones: obs, message: "AFIP rechazó la factura" });
    }

    res.json({ cae, vto: vto, resultado, observaciones: obs });
  } catch (err: any) {
    console.error("AFIP WSFEv1 error:", err);
    res.status(500).json({ error: err.message });
  }
}
