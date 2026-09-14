import { tryGetActiveSupabaseClient } from '../lib/supabaseClient';
import { sheetFetchTable, sheetUpsertRow, sheetDeleteRow } from '../lib/googleSheetsClient';
import { Mesa } from '../types';
import { hydrateTableUnions } from '../lib/tableUnions';

export const mesasService = {
  async list(forceFresh = false): Promise<Mesa[]> {
    try {
      const data = await sheetFetchTable('mesas', forceFresh);
      if (data && data.length > 0) {
        return hydrateTableUnions(data);
      }
    } catch (sheetErr) {
      console.warn('[mesasService.list] Error desde Google Sheets:', sheetErr);
    }
    try {
      const supabase = tryGetActiveSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from('mesas').select('*').order('id_mesa', { ascending: true });
        if (!error && data) {
          const mapped = (data || []).map(m => ({
            ...m,
            comensales: m.comensales_actuales || m.comensales || undefined,
          }));
          return hydrateTableUnions(mapped);
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
    const row: any = {
      id_mesa: mesa.id_mesa,
      numero_mesa: mesa.numero_mesa,
      estado: mesa.estado,
      comensales: mesa.comensales || '',
      capacidad: mesa.capacidad || 4,
      zona: mesa.zona || 'salon',
      mesas_unidas: Array.isArray(mesa.mesas_unidas) ? JSON.stringify(mesa.mesas_unidas) : (mesa.mesas_unidas || ''),
      parent_id: mesa.parent_id !== undefined && mesa.parent_id !== null ? Number(mesa.parent_id) : ''
    };
    try {
      await sheetUpsertRow('mesas', row);
    } catch (sheetErr) {
      console.error('[mesasService.create] Error en Google Sheets:', sheetErr);
    }
    try {
      const supabase = tryGetActiveSupabaseClient();
      if (supabase) {
        const { mesas_unidas, parent_id, ...supabasePayload } = mesa;
        await supabase.from('mesas').insert([supabasePayload]);
      }
    } catch (e) {
      console.warn('[mesasService.create] Supabase omitido:', e);
    }
    return mesa;
  },

  async update(id: number, mesa: Partial<Mesa>): Promise<Mesa> {
    let existing: Mesa | undefined;
    try {
      const currentList = await this.list();
      existing = currentList.find(m => m.id_mesa === id);
    } catch {}

    const resolvedNumero = mesa.numero_mesa || existing?.numero_mesa || `Mesa ${id}`;
    const resolvedCapacidad = mesa.capacidad !== undefined && mesa.capacidad !== null && !isNaN(Number(mesa.capacidad))
      ? Number(mesa.capacidad)
      : (existing?.capacidad || 2);
    const resolvedZona = mesa.zona || existing?.zona || 'salon';
    const resolvedComensales = mesa.comensales !== undefined && mesa.comensales !== null && !isNaN(Number(mesa.comensales))
      ? Number(mesa.comensales)
      : (existing?.comensales !== undefined ? existing.comensales : '');
    const resolvedMesasUnidas = mesa.mesas_unidas !== undefined
      ? (Array.isArray(mesa.mesas_unidas) ? JSON.stringify(mesa.mesas_unidas) : mesa.mesas_unidas)
      : (existing?.mesas_unidas ? JSON.stringify(existing.mesas_unidas) : '');
    const resolvedParentId = mesa.parent_id !== undefined
      ? (mesa.parent_id !== null && !isNaN(Number(mesa.parent_id)) ? Number(mesa.parent_id) : '')
      : (existing?.parent_id ? Number(existing.parent_id) : '');

    const row: any = {
      id_mesa: id,
      numero_mesa: resolvedNumero,
      estado: mesa.estado || existing?.estado || 'libre',
      comensales: resolvedComensales,
      capacidad: resolvedCapacidad,
      zona: resolvedZona,
      mesas_unidas: resolvedMesasUnidas,
      parent_id: resolvedParentId
    };
    try {
      await sheetUpsertRow('mesas', row);
    } catch (sheetErr) {
      console.error('[mesasService.update] Error en Google Sheets:', sheetErr);
    }
    try {
      const supabase = tryGetActiveSupabaseClient();
      if (supabase) {
        const { mesas_unidas, parent_id, ...supabasePayload } = mesa;
        await supabase.from('mesas').update(supabasePayload).eq('id_mesa', id);
      }
    } catch (e) {
      console.warn('[mesasService.update] Supabase omitido:', e);
    }
    return row as Mesa;
  },

  async upsert(mesas: Mesa[]): Promise<Mesa[]> {
    await Promise.all(mesas.map(m => this.update(m.id_mesa, m)));
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
