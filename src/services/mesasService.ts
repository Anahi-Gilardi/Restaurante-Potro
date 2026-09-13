import { tryGetActiveSupabaseClient } from '../lib/supabaseClient';
import { sheetFetchTable, sheetUpsertRow, sheetDeleteRow } from '../lib/googleSheetsClient';
import { Mesa } from '../types';

export const mesasService = {
  async list(): Promise<Mesa[]> {
    try {
      const data = await sheetFetchTable('mesas');
      if (data && data.length > 0) {
        return data.map(m => ({
          ...m,
          id_mesa: Number(m.id_mesa || 1),
          comensales: m.comensales || m.comensales_actuales ? Number(m.comensales || m.comensales_actuales) : undefined,
          capacidad: Number(m.capacidad || 4),
        }));
      }
    } catch (sheetErr) {
      console.warn('[mesasService.list] Error desde Google Sheets:', sheetErr);
    }
    try {
      const supabase = tryGetActiveSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from('mesas').select('*').order('id_mesa', { ascending: true });
        if (!error && data) {
          return (data || []).map(m => ({
            ...m,
            comensales: m.comensales_actuales || undefined,
          }));
        }
      }
    } catch (e) {
      console.warn('[mesasService.list] Supabase error:', e);
    }
    return [];
  },

  async getById(id: number): Promise<Mesa | null> {
    const all = await this.list();
    return all.find(m => m.id_mesa === id) || null;
  },

  async create(mesa: Mesa): Promise<Mesa> {
    const row = {
      id_mesa: mesa.id_mesa,
      numero_mesa: mesa.numero_mesa,
      estado: mesa.estado,
      comensales: mesa.comensales || 0,
      capacidad: mesa.capacidad || 4,
      zona: mesa.zona || 'salon',
    };
    try {
      await sheetUpsertRow('mesas', row);
    } catch (sheetErr) {
      console.error('[mesasService.create] Error en Google Sheets:', sheetErr);
    }
    try {
      const supabase = tryGetActiveSupabaseClient();
      if (supabase) {
        await supabase.from('mesas').insert([row]);
      }
    } catch (e) {
      console.warn('[mesasService.create] Supabase omitido:', e);
    }
    return mesa;
  },

  async update(id: number, mesa: Partial<Mesa>): Promise<Mesa> {
    const row: any = { id_mesa: id, ...mesa };
    try {
      await sheetUpsertRow('mesas', row);
    } catch (sheetErr) {
      console.error('[mesasService.update] Error en Google Sheets:', sheetErr);
    }
    try {
      const supabase = tryGetActiveSupabaseClient();
      if (supabase) {
        await supabase.from('mesas').update(mesa).eq('id_mesa', id);
      }
    } catch (e) {
      console.warn('[mesasService.update] Supabase omitido:', e);
    }
    return row as Mesa;
  },

  async upsert(mesas: Mesa[]): Promise<Mesa[]> {
    for (const m of mesas) {
      await this.update(m.id_mesa, m);
    }
    return mesas;
  },

  async remove(id: number): Promise<boolean> {
    try {
      await sheetDeleteRow('mesas', id);
    } catch (sheetErr) {
      console.error('[mesasService.remove] Error en Google Sheets:', sheetErr);
    }
    try {
      const supabase = tryGetActiveSupabaseClient();
      if (supabase) {
        await supabase.from('mesas').delete().eq('id_mesa', id);
      }
    } catch (e) {
      console.warn('[mesasService.remove] Supabase omitido:', e);
    }
    return true;
  },

  // Realtime subscription helper
  subscribe(callback: (payload: any) => void) {
    try {
      const supabase = tryGetActiveSupabaseClient();
      if (supabase) {
        return supabase
          .channel('realtime:mesas')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, callback)
          .subscribe();
      }
    } catch (e) {
      console.warn('Realtime fallback');
    }
    return null;
  }
};
