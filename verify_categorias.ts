import { getActiveSupabaseClient } from './src/lib/supabaseClient';

async function verify() {
  console.log('Testing connectivity to the "categorias" table...');
  try {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('categorias').select('*').order('orden', { ascending: true });
    
    if (error) {
      console.error('[-] Table "categorias" is not available yet! Error:', error.message || error);
    } else {
      console.log('[+] Table "categorias" is fully connected!');
      console.log(`[+] Found ${data.length} categories in Supabase:`);
      data.forEach(c => console.log(`    - [${c.id}] ${c.nombre} (${c.slug})`));
    }
  } catch (err: any) {
    console.error('Unexpected error:', err.message || err);
  }
}

verify();
