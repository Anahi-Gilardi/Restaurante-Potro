import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { RecetaEscandallo } from '../types';
import { INITIAL_RECETAS_ESCANDALLO } from '../data/initialData';

const LOCAL_RECETAS_KEY = 'el_patron_recetas_escandallo';

const readLocalRecetas = (): RecetaEscandallo[] => {
  if (typeof window === 'undefined') return INITIAL_RECETAS_ESCANDALLO;
  try {
    const raw = window.localStorage.getItem(LOCAL_RECETAS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_RECETAS_ESCANDALLO;
};

const writeLocalRecetas = (recetas: RecetaEscandallo[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_RECETAS_KEY, JSON.stringify(recetas));
  } catch {}
};

export const recetasService = {
  async list(): Promise<RecetaEscandallo[]> {
    try {
      const supabase = getActiveSupabaseClient();
      const { data, error } = await supabase.from('recetas_escandallo').select('*').order('id_receta', { ascending: true });
      if (error) {
        console.warn('recetas_escandallo no disponible en Supabase, usando respaldo local:', error.message);
        return readLocalRecetas();
      }
      if (data && data.length > 0) {
        writeLocalRecetas(data);
        return data;
      }
      return readLocalRecetas();
    } catch {
      return readLocalRecetas();
    }
  },

  async create(receta: RecetaEscandallo): Promise<RecetaEscandallo> {
    const local = readLocalRecetas();
    writeLocalRecetas([...local.filter(r => r.id_receta !== receta.id_receta), receta]);
    try {
      const supabase = getActiveSupabaseClient();
      const { data, error } = await supabase.from('recetas_escandallo').insert([receta]).select().single();
      if (!error && data) return data;
    } catch {}
    return receta;
  },

  async update(id: string, receta: Partial<RecetaEscandallo>): Promise<RecetaEscandallo> {
    const local = readLocalRecetas();
    const updated = local.map(r => r.id_receta === id ? { ...r, ...receta } : r);
    writeLocalRecetas(updated);
    try {
      const supabase = getActiveSupabaseClient();
      const { data, error } = await supabase.from('recetas_escandallo').update(receta).eq('id_receta', id).select().single();
      if (!error && data) return data;
    } catch {}
    return updated.find(r => r.id_receta === id) as RecetaEscandallo;
  },

  async upsert(recetas: RecetaEscandallo[]): Promise<RecetaEscandallo[]> {
    writeLocalRecetas(recetas);
    try {
      const supabase = getActiveSupabaseClient();
      const { data, error } = await supabase.from('recetas_escandallo').upsert(recetas).select();
      if (!error && data) return data;
    } catch {}
    return recetas;
  },

  async remove(id: string): Promise<boolean> {
    const local = readLocalRecetas();
    writeLocalRecetas(local.filter(r => r.id_receta !== id));
    try {
      const supabase = getActiveSupabaseClient();
      await supabase.from('recetas_escandallo').delete().eq('id_receta', id);
    } catch {}
    return true;
  }
};
