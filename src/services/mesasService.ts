import { tryGetActiveSupabaseClient } from '../lib/supabaseClient';
import { sheetFetchTable, sheetUpsertRow, sheetDeleteRow } from '../lib/googleSheetsClient';
import { Mesa } from '../types';
import { hydrateTableUnions } from '../lib/tableUnions';

export const mesasService = {
  async list(forceFresh = false): Promise<Mesa[]> {
    // 1. Supabase como fuente primaria
    try {
      const supabase = tryGetActiveSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from('mesas').select('*').order('id_mesa', { ascending: true });
        if (!error && data && data.length > 0) {
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

    // 2. Fallback a Google Sheets
    try {
      const data = await sheetFetchTable('mesas', forceFresh);
      if (data && data.length > 0) {
        return hydrateTableUnions(data);
      }
    } catch (sheetErr) {
      console.warn('[mesasService.list] Error desde Google Sheets:', sheetErr);
    }

    return [];
  },

  async getById(id: number): Promise<Mesa | null> {
    const supabase = tryGetActiveSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('mesas').select('*').eq('id_mesa', id).single();
        if (!error && data) {
          return { ...data, comensales: data.comensales_actuales || data.comensales || undefined };
        }
      } catch {}
    }
    const all = await this.list();
    return all.find(m => m.id_mesa === id) || null;
  },

  async create(mesa: Mesa): Promise<Mesa> {
    const supabase = tryGetActiveSupabaseClient();
    const dbMesa = {
      id_mesa: mesa.id_mesa,
      numero_mesa: mesa.numero_mesa,
      estado: mesa.estado,
      comensales_actuales: mesa.comensales || null,
      capacidad: mesa.capacidad || 4,
      zona: mesa.zona || 'salon',
      mesas_unidas: mesa.mesas_unidas || [],
      parent_id: mesa.parent_id !== undefined && mesa.parent_id !== null ? Number(mesa.parent_id) : null
    };

    if (supabase) {
      try {
        await supabase.from('mesas').insert([dbMesa]);
      } catch (e) {
        console.warn('[mesasService.create] Supabase error:', e);
      }
    }

    // Backup a Google Sheets
    try {
      await sheetUpsertRow('mesas', {
        ...dbMesa,
        comensales: mesa.comensales || '',
        mesas_unidas: Array.isArray(mesa.mesas_unidas) ? JSON.stringify(mesa.mesas_unidas) : (mesa.mesas_unidas || ''),
        parent_id: mesa.parent_id !== undefined && mesa.parent_id !== null ? Number(mesa.parent_id) : ''
      });
    } catch (sheetErr) {
      console.error('[mesasService.create] Error en Google Sheets:', sheetErr);
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
      ? (Array.isArray(mesa.mesas_unidas) ? mesa.mesas_unidas : [])
      : (existing?.mesas_unidas || []);
    const resolvedParentId = mesa.parent_id !== undefined
      ? (mesa.parent_id !== null && !isNaN(Number(mesa.parent_id)) ? Number(mesa.parent_id) : null)
      : (existing?.parent_id ? Number(existing.parent_id) : null);

    const supabase = tryGetActiveSupabaseClient();
    if (supabase) {
      try {
        const updatePayload: any = {
          updated_at: new Date().toISOString()
        };
        if (mesa.numero_mesa !== undefined) updatePayload.numero_mesa = mesa.numero_mesa;
        if (mesa.estado !== undefined) updatePayload.estado = mesa.estado;
        if (mesa.capacidad !== undefined && mesa.capacidad !== null) updatePayload.capacidad = Number(mesa.capacidad);
        if (mesa.zona !== undefined) updatePayload.zona = mesa.zona;
        if (mesa.comensales !== undefined) {
          updatePayload.comensales_actuales = mesa.comensales ? Number(mesa.comensales) : null;
        }
        if (mesa.mesas_unidas !== undefined) {
          updatePayload.mesas_unidas = Array.isArray(mesa.mesas_unidas) ? mesa.mesas_unidas : [];
        }
        if (mesa.parent_id !== undefined) {
          updatePayload.parent_id = mesa.parent_id !== null && !isNaN(Number(mesa.parent_id)) ? Number(mesa.parent_id) : null;
        }

        const { data: updatedRows, error } = await supabase
          .from('mesas')
          .update(updatePayload)
          .eq('id_mesa', id)
          .select();

        if (error) {
          console.warn('[mesasService.update] Supabase error:', error);
        } else if (!updatedRows || updatedRows.length === 0) {
          // Fallback a upsert si la mesa aún no existía
          const supabasePayload: any = {
            id_mesa: id,
            numero_mesa: resolvedNumero,
            estado: mesa.estado || existing?.estado || 'libre',
            comensales_actuales: resolvedComensales !== '' ? Number(resolvedComensales) : null,
            capacidad: resolvedCapacidad,
            zona: resolvedZona,
            mesas_unidas: resolvedMesasUnidas,
            parent_id: resolvedParentId,
            updated_at: new Date().toISOString()
          };
          await supabase.from('mesas').upsert([supabasePayload]);
        }
      } catch (e) {
        console.warn('[mesasService.update] Supabase error:', e);
      }
    }

    const row: any = {
      id_mesa: id,
      numero_mesa: resolvedNumero,
      estado: mesa.estado || existing?.estado || 'libre',
      comensales: resolvedComensales,
      capacidad: resolvedCapacidad,
      zona: resolvedZona,
      mesas_unidas: Array.isArray(resolvedMesasUnidas) ? JSON.stringify(resolvedMesasUnidas) : resolvedMesasUnidas,
      parent_id: resolvedParentId ?? ''
    };
    try {
      await sheetUpsertRow('mesas', row);
    } catch (sheetErr) {
      console.warn('[mesasService.update] Error en Google Sheets:', sheetErr);
    }

    return row as Mesa;
  },

  async upsert(mesas: Mesa[]): Promise<Mesa[]> {
    const supabase = tryGetActiveSupabaseClient();
    if (supabase) {
      try {
        const mapped = mesas.map(m => ({
          id_mesa: m.id_mesa,
          numero_mesa: m.numero_mesa,
          estado: m.estado,
          comensales_actuales: m.comensales !== undefined && m.comensales !== null ? Number(m.comensales) : null,
          capacidad: m.capacidad || 4,
          zona: m.zona || 'salon',
          mesas_unidas: m.mesas_unidas || [],
          parent_id: m.parent_id !== undefined && m.parent_id !== null ? Number(m.parent_id) : null,
          updated_at: new Date().toISOString()
        }));
        const { error } = await supabase.from('mesas').upsert(mapped);
        if (error) {
          console.error('[mesasService.upsert] Supabase error:', error);
        }
      } catch (e) {
        console.warn('[mesasService.upsert] Supabase upsert error:', e);
      }
    }

    for (const m of mesas) {
      try {
        await sheetUpsertRow('mesas', {
          id_mesa: m.id_mesa,
          numero_mesa: m.numero_mesa,
          estado: m.estado,
          comensales: m.comensales || '',
          capacidad: m.capacidad || 4,
          zona: m.zona || 'salon',
          mesas_unidas: Array.isArray(m.mesas_unidas) ? JSON.stringify(m.mesas_unidas) : (m.mesas_unidas || ''),
          parent_id: m.parent_id !== undefined && m.parent_id !== null ? Number(m.parent_id) : ''
        });
      } catch (err) {
        console.warn('[mesasService.upsert] Google Sheets sync error:', err);
      }
    }

    return mesas;
  },

  async remove(id: number): Promise<boolean> {
    const supabase = tryGetActiveSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('mesas').delete().eq('id_mesa', id);
      } catch (e) {
        console.warn('[mesasService.remove] Supabase error:', e);
      }
    }
    try {
      await sheetDeleteRow('mesas', id);
    } catch (sheetErr) {
      console.warn('[mesasService.remove] Google Sheets error:', sheetErr);
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
