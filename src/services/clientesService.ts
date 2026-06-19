import { tryGetActiveSupabaseClient } from '../lib/supabaseClient';
import { Cliente } from '../types';

const LOCAL_STORAGE_KEY = 'el_patron_clientes';

// Default seed data for offline/testing mode
const DEFAULT_CLIENTES: Cliente[] = [
  {
    id_cliente: 'cli_001',
    dni_cuit: '20-35492817-9',
    nombre: 'Juan Carlos Perez',
    email: 'juan.perez@email.com',
    telefono: '+54 11 5555-1234',
    puntos: 150,
    fecha_registro: new Date('2026-01-15T12:00:00.000Z')
  },
  {
    id_cliente: 'cli_002',
    dni_cuit: '27-40283948-4',
    nombre: 'Maria Laura Rodriguez',
    email: 'maria.rodriguez@email.com',
    telefono: '+54 11 4444-5678',
    puntos: 320,
    fecha_registro: new Date('2026-02-10T14:30:00.000Z')
  },
  {
    id_cliente: 'cli_003',
    dni_cuit: '30-71649251-4',
    nombre: 'Gastronomia El Patron SAS',
    email: 'administracion@elpatron.com',
    telefono: '+54 11 4802-9988',
    puntos: 1200,
    fecha_registro: new Date('2026-03-01T09:00:00.000Z')
  }
];

const getLocalClientes = (): Cliente[] => {
  if (typeof window === 'undefined') return DEFAULT_CLIENTES;
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_CLIENTES));
    return DEFAULT_CLIENTES;
  }
  try {
    return JSON.parse(raw).map((c: any) => ({
      ...c,
      fecha_registro: new Date(c.fecha_registro)
    }));
  } catch {
    return DEFAULT_CLIENTES;
  }
};

const saveLocalClientes = (clientes: Cliente[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clientes));
};

export const clientesService = {
  async list(): Promise<Cliente[]> {
    const supabase = tryGetActiveSupabaseClient();
    if (!supabase) {
      return getLocalClientes();
    }

    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) {
        console.warn('Error fetching clientes from Supabase, returning local cache:', error);
        return getLocalClientes();
      }

      if (data) {
        const mapped = data.map((c: any) => ({
          ...c,
          fecha_registro: new Date(c.fecha_registro)
        }));
        saveLocalClientes(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('Network error fetching clientes, returning local cache:', err);
    }
    return getLocalClientes();
  },

  async getByDniCuit(dniCuit: string): Promise<Cliente | null> {
    const local = getLocalClientes();
    const foundLocal = local.find(c => c.dni_cuit === dniCuit) || null;

    const supabase = tryGetActiveSupabaseClient();
    if (!supabase) return foundLocal;

    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('dni_cuit', dniCuit)
        .maybeSingle();

      if (error) {
        console.warn(`Error fetching customer ${dniCuit} from Supabase, returning local match:`, error);
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
    } catch (err) {
      console.warn(`Network error fetching customer ${dniCuit}, returning local match:`, err);
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
    if (!supabase) return newCliente;

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
        console.warn('Could not persist new customer to Supabase (saved locally):', error);
        return newCliente;
      }

      if (data) {
        const mapped: Cliente = {
          ...data,
          fecha_registro: new Date(data.fecha_registro)
        };
        return mapped;
      }
    } catch (err) {
      console.warn('Network error creating customer, saved locally in cache:', err);
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
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('clientes')
        .update({ puntos: nuevosPuntos })
        .eq('id_cliente', idCliente);

      if (error) {
        console.warn(`Could not update customer points ${idCliente} on Supabase (saved locally):`, error);
      }
    } catch (err) {
      console.warn(`Network error updating customer points for ${idCliente}, saved locally:`, err);
    }
  }
};
