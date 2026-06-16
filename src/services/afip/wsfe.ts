import { AfipConfig, AfipInvoiceRequest, AfipInvoiceResponse, WsaaCredentials, AFIP_ENDPOINTS, ArcaQrData } from './types';
import { getAccessToken } from './auth';

function buildSoapEnvelope(body: string, service = 'wsfe'): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://ar.gov.afip.dif.FEV1/">
  <soap:Header/>
  <soap:Body>${body}</soap:Body>
</soap:Envelope>`;
}

function buildFeCompReq(req: AfipInvoiceRequest, auth: WsaaCredentials) {
  const ivaXml = (req.Iva || []).map(i =>
    `<AlicIva><Id>${i.Id}</Id><BaseImp>${i.BaseImp.toFixed(2)}</BaseImp><Importe>${i.Importe.toFixed(2)}</Importe></AlicIva>`
  ).join('');

  return `<FECAESolicitar>
    <Auth>
      <Token>${auth.token}</Token>
      <Sign>${auth.sign}</Sign>
      <Cuit>${auth.cuit}</Cuit>
    </Auth>
    <FeCAEReq>
      <FeCabReq>
        <CantReg>1</CantReg>
        <PtoVta>${req.PtoVta}</PtoVta>
        <CbteTipo>${req.CbteTipo}</CbteTipo>
      </FeCabReq>
      <FeDetReq>
        <FECAEDetRequest>
          <Concepto>${req.Concepto}</Concepto>
          <DocTipo>${req.DocTipo}</DocTipo>
          <DocNro>${req.DocNro}</DocNro>
          <CbteDesde>1</CbteDesde>
          <CbteHasta>1</CbteHasta>
          <CbteFch>${req.FechaCbte.replace(/-/g, '')}</CbteFch>
          <ImpTotal>${req.ImpTotal.toFixed(2)}</ImpTotal>
          <ImpNeto>${req.ImpNeto.toFixed(2)}</ImpNeto>
          <ImpIVA>${req.ImpIVA.toFixed(2)}</ImpIVA>
          <ImpTrib>${(req.ImpTrib || 0).toFixed(2)}</ImpTrib>
          <MonId>${req.MonId || 'PES'}</MonId>
          <MonCotiz>${req.MonCotiz || 1}</MonCotiz>
          ${ivaXml ? `<Iva>${ivaXml}</Iva>` : ''}
        </FECAEDetRequest>
      </FeDetReq>
    </FeCAEReq>
  </FECAESolicitar>`;
}

function parseFeResponse(xml: string): AfipInvoiceResponse {
  const getTag = (tag: string) => xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1] || '';
  const cae = getTag('CAE');
  const vto = getTag('CAEFchVto');
  const resultado = getTag('Resultado') as 'A' | 'O' | 'R';
  const obs: Array<{ Code: number; Msg: string }> = [];

  const obsTags = xml.match(/<Obs>(.*?)<\/Obs>/gs);
  if (obsTags) {
    obsTags.forEach(block => {
      const code = parseInt(block.match(/<Code>(\d+)<\/Code>/)?.[1] || '0');
      const msg = block.match(/<Msg>([^<]*)<\/Msg>/)?.[1] || '';
      if (code) obs.push({ code, msg });
    });
  }

  return { CAE: cae, CAEFchVto: vto, Resultado: resultado, Obs: obs, vto };
}

export async function solicitarCae(config: AfipConfig, req: AfipInvoiceRequest): Promise<AfipInvoiceResponse> {
  const auth = await getAccessToken(config);
  const body = buildFeCompReq(req, auth);
  const soap = buildSoapEnvelope(body);

  const endpoint = AFIP_ENDPOINTS[config.environment].wsfe;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': 'http://ar.gov.afip.dif.FEV1/FECAESolicitar' },
    body: soap,
  });

  if (!res.ok) throw new Error(`WSFE HTTP ${res.status}: ${await res.text()}`);

  const xml = await res.text();
  const result = parseFeResponse(xml);

  if (result.Resultado === 'R') {
    const msgs = (result.Obs || []).map(o => `[${o.Code}] ${o.Msg}`).join('; ');
    throw new Error(`AFIP rechazó la factura: ${msgs || 'Error desconocido'}`);
  }

  return result;
}

export function generarQrData(
  cuit: number, ptoVta: number, cbteTipo: number, nroCmp: number,
  importe: number, cae: string, tipoDocRec = 99, nroDocRec = 0
): string {
  const data: ArcaQrData = {
      ver: 1,
      fecha: new Date().toISOString().split('T')[0],
      cuit,
      ptoVta,
      tipoCmp: cbteTipo,
      nroCmp,
      importe,
      moneda: 'PES',
      ctz: 1,
      tipoDocRec,
      nroDocRec,
      tipoCodAut: 1,
      codAut: parseInt(cae),
  };
  return JSON.stringify(data);
}
