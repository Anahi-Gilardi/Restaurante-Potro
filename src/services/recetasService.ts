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
    return readLocalRecetas();
  },

  async create(receta: RecetaEscandallo): Promise<RecetaEscandallo> {
    const local = readLocalRecetas();
    const updated = [...local.filter(r => r.id_receta !== receta.id_receta), receta];
    writeLocalRecetas(updated);
    return receta;
  },

  async update(id: string, receta: Partial<RecetaEscandallo>): Promise<RecetaEscandallo> {
    const local = readLocalRecetas();
    const updated = local.map(r => r.id_receta === id ? { ...r, ...receta } : r);
    writeLocalRecetas(updated);
    return updated.find(r => r.id_receta === id) as RecetaEscandallo;
  },

  async upsert(recetas: RecetaEscandallo[]): Promise<RecetaEscandallo[]> {
    writeLocalRecetas(recetas);
    return recetas;
  },

  async remove(id: string): Promise<boolean> {
    const local = readLocalRecetas();
    writeLocalRecetas(local.filter(r => r.id_receta !== id));
    return true;
  }
};
