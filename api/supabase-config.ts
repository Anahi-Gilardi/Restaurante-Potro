import type { VercelRequest, VercelResponse } from "./_types";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }

  let url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  let key = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  // Si las variables de entorno en Vercel aún apuntan al proyecto anterior (ya eliminado) o están vacías,
  // usar las credenciales oficiales del nuevo Supabase.
  if (!url || !key || url.includes('sqczmyaoqplrmrgyczjy') || key.includes('sqczmyaoqplrmrgyczjy')) {
    url = 'https://extglaaqlsleibsbtwup.supabase.co';
    key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4dGdsYWFxbHNsZWlic2J0d3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNDE5MDMsImV4cCI6MjEwNDkxNzkwM30.EDwlqgMIpniRG9bHCNiSoP5PF9w_-zJmjRc0FvPUeeg';
  }

  return res.status(200).json({
    SUPABASE_URL: url,
    SUPABASE_ANON_KEY: key
  });
}
