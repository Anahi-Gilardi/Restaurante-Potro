import { tryGetActiveSupabaseClient } from '../lib/supabaseClient';
import { Cliente } from '../types';

const LOCAL_STORAGE_KEY = 'el_patron_clientes';
const LEGACY_DEMO_CLIENT_IDS = new Set(['cli_001', 'cli_002']);

const removeLegacyDemoClientes = (clientes: Cliente[]) => clientes.filter(cliente => (
  !LEGACY_DEMO_CLIENT_IDS.has(cliente.id_cliente)
));

const getLocalClientes = (): Cliente[] => {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw).map((c: any) => ({
      ...c,
      fecha_registro: new Date(c.fecha_registro)
    }));
    const sanitized = removeLegacyDemoClientes(parsed);
    if (sanitized.length !== parsed.length) saveLocalClientes(sanitized);
    return sanitized;
  } catch {
    return [];
  }
};

let supabaseClientesTableMissing = false;

const isMissingTableError = (error: any): boolean => {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('could not find the table') ||
    msg.includes('relation "public.clientes" does not exist')
  );
};

const saveLocalClientes = (clientes: Cliente[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clientes));
  } catch {}
};

export const clientesService = {
  async list(): Promise<Cliente[]> {
    const supabase = tryGetActiveSupabaseClient();
    if (!supabase || supabaseClientesTableMissing) {
      return getLocalClientes();
    }

    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) {
        if (isMissingTableError(error)) {
          supabaseClientesTableMissing = true;
          return getLocalClientes();
        }
        return getLocalClientes();
      }

      if (data) {
        const mapped = data.map((c: any) => ({
          ...c,
          fecha_registro: new Date(c.fecha_registro)
        }));
        const sanitized = removeLegacyDemoClientes(mapped);
        saveLocalClientes(sanitized);
        return sanitized;
      }
    } catch {
      return getLocalClientes();
    }
    return getLocalClientes();
  },

  async getByDniCuit(dniCuit: string): Promise<Cliente | null> {
    const local = getLocalClientes();
    const foundLocal = local.find(c => c.dni_cuit === dniCuit) || null;

    const supabase = tryGetActiveSupabaseClient();
    if (!supabase || supabaseClientesTableMissing) return foundLocal;

    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('dni_cuit', dniCuit)
        .maybeSingle();

      if (error) {
        if (isMissingTableError(error)) {
          supabaseClientesTableMissing = true;
        }
        return foundLocal;
      }

      if (data) {
        const mapped: Cliente = {
          ...data,
          fecha_registro: new Date(data.fecha_registro)
        };
        // Update item in local storage cache
        const updatedLocal = local.filter(c => c.id_cliente !== mapped.id_cliente);
        updatedLocal.push(mapped);
        saveLocalClientes(updatedLocal);
        return mapped;
      }
    } catch {
      return foundLocal;
    }
    return foundLocal;
  },

  async create(cliente: Omit<Cliente, 'fecha_registro'>): Promise<Cliente> {
    const newCliente: Cliente = {
      ...cliente,
      fecha_registro: new Date()
    };

    // Save locally first
    const local = getLocalClientes();
    const updatedLocal = [...local.filter(c => c.id_cliente !== newCliente.id_cliente), newCliente];
    saveLocalClientes(updatedLocal);

    const supabase = tryGetActiveSupabaseClient();
    if (!supabase || supabaseClientesTableMissing) return newCliente;

    try {
      const payload = {
        ...newCliente,
        fecha_registro: newCliente.fecha_registro instanceof Date
          ? newCliente.fecha_registro.toISOString()
          : new Date(newCliente.fecha_registro).toISOString()
      };
      const { data, error } = await supabase
        .from('clientes')
        .insert([payload])
        .select()
        .single();

      if (error) {
        if (isMissingTableError(error)) {
          supabaseClientesTableMissing = true;
        }
        return newCliente;
      }

      if (data) {
        const mapped: Cliente = {
          ...data,
          fecha_registro: new Date(data.fecha_registro)
        };
        return mapped;
      }
    } catch {
      return newCliente;
    }
    return newCliente;
  },

  async updatePuntos(idCliente: string, nuevosPuntos: number): Promise<void> {
    // Update locally first
    const local = getLocalClientes();
    const updatedLocal = local.map(c => {
      if (c.id_cliente === idCliente) {
        return { ...c, puntos: nuevosPuntos };
      }
      return c;
    });
    saveLocalClientes(updatedLocal);

    const supabase = tryGetActiveSupabaseClient();
    if (!supabase || supabaseClientesTableMissing) return;

    try {
      const { error } = await supabase
        .from('clientes')
        .update({ puntos: nuevosPuntos })
        .eq('id_cliente', idCliente);

      if (error && isMissingTableError(error)) {
        supabaseClientesTableMissing = true;
      }
    } catch {}
  }
};
