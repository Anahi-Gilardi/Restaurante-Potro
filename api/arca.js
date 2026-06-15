// Vercel Serverless Function — ARCA invoice proxy
// This runs on Node.js server-side, so @arcasdk/core works

const { Arca } = require('@arcasdk/core');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action, credentials, payload } = req.body || {};

    if (!credentials?.key || !credentials?.cert || !credentials?.cuit) {
      return res.status(400).json({ error: 'Faltan credenciales ARCA (key, cert, cuit)' });
    }

    const arca = new Arca({
      key: credentials.key,
      cert: credentials.cert,
      cuit: Number(credentials.cuit),
      production: credentials.production === true,
    });

    if (action === 'createInvoice') {
      if (!payload) return res.status(400).json({ error: 'Faltan datos' });

      const pad = (n) => String(n).padStart(8, '0');
      const now = new Date();
      const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;

      const invoicePayload = {
        CantReg: 1,
        PtoVta: payload.puntoVenta || 1,
        CbteTipo: payload.tipoComprobante,
        Concepto: payload.concepto || 1,
        DocTipo: payload.docTipo || 99,
        DocNro: payload.docNro || 0,
        CbteDesde: 1,
        CbteHasta: 1,
        CbteFch: date,
        ImpTotal: payload.total,
        ImpTotConc: 0,
        ImpNeto: payload.neto,
        ImpOpEx: 0,
        ImpIVA: payload.ivaTotal || 0,
        ImpTrib: 0,
        MonId: 'PES',
        MonCotiz: 1,
        CondicionIVAReceptorId: payload.condicionIva || 5,
      };

      if (payload.ivaItems?.length > 0) {
        invoicePayload.Iva = payload.ivaItems;
      }

      const result = await arca.electronicBillingService.createInvoice(invoicePayload);

      return res.status(200).json({
        success: true,
        cae: result?.CodAutorizacion || result?.CAE || '',
        vencimiento: result?.Vencimiento || result?.CAEFchVto || '',
        data: result,
      });
    }

    if (action === 'test') {
      return res.status(200).json({ success: true, message: 'ARCA API funcionando' });
    }

    return res.status(400).json({ error: `Acción desconocida: ${action}` });
  } catch (err) {
    console.error('[ARCA API]', err);
    return res.status(500).json({
      error: err.message || 'Error interno',
    });
  }
};
