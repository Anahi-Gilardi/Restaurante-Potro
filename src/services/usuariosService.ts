import { getActiveSupabaseClient, tryGetActiveSupabaseClient } from '../lib/supabaseClient';
import { sheetFetchTable, sheetUpsertRow, sheetDeleteRow } from '../lib/googleSheetsClient';
import { Usuario } from '../types';

const LOCAL_USERS_KEY = 'el_patron_usuarios_locales';
const SAFE_USER_COLUMNS = 'id_usuario,nombre,apellido,username,rol,activo,auth_user_id,mail';

const sanitizeUsuario = (usuario: Usuario): Usuario => ({
  id_usuario: Number(usuario.id_usuario),
  nombre: String(usuario.nombre || ''),
  apellido: String(usuario.apellido || ''),
  username: String(usuario.username || ''),
  password: '',
  auth_user_id: usuario.auth_user_id ?? null,
  mail: usuario.mail ?? null,
  rol: usuario.rol,
  activo: usuario.activo !== false,
});

const readLocalUsers = (): Usuario[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map(sanitizeUsuario) : [];
  } catch {
    return [];
  }
};

const writeLocalUsers = (usuarios: Usuario[]) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(usuarios));
};

export const mergeUsuarios = (remote: Usuario[], local: Usuario[]): Usuario[] => {
  const merged = new Map<number, Usuario>();
  local.forEach(usuario => merged.set(usuario.id_usuario, sanitizeUsuario(usuario)));
  remote.forEach(usuario => merged.set(usuario.id_usuario, sanitizeUsuario(usuario)));
  return Array.from(merged.values()).sort((a, b) => a.id_usuario - b.id_usuario);
};

const cacheUsuario = (usuario: Usuario) => {
  writeLocalUsers(mergeUsuarios([], [...readLocalUsers(), usuario]));
};

export const usuariosService = {
  async list(): Promise<Usuario[]> {
    const local = readLocalUsers();
    try {
      const sheetUsers = await sheetFetchTable('usuarios');
      if (Array.isArray(sheetUsers) && sheetUsers.length > 0) {
        const remote: Usuario[] = sheetUsers.map((u: any) => ({
          id_usuario: Number(u.id_usuario || 1),
          nombre: String(u.nombre || ''),
          apellido: String(u.apellido || ''),
          username: String(u.username || ''),
          password: String(u.password || ''),
          auth_user_id: u.auth_user_id ?? null,
          mail: u.mail ?? null,
          rol: (u.rol || 'mozo') as Usuario['rol'],
          activo: u.activo !== false && String(u.activo).toLowerCase() !== 'false',
          pin: u.pin ? String(u.pin) : null,
        }));
        const merged = mergeUsuarios(remote, local);
        writeLocalUsers(merged);
        return merged;
      }
    } catch (sheetErr) {
      console.warn('[usuariosService.list] Fallback desde Google Sheets:', sheetErr);
    }

    try {
      const supabase = tryGetActiveSupabaseClient();
      if (!supabase) return local;
      const { data, error } = await supabase.from('usuarios').select(SAFE_USER_COLUMNS).order('id_usuario', { ascending: true });
      if (error) throw error;
      const remote = (data || []).map(usuario => sanitizeUsuario(usuario as Usuario));
      const merged = mergeUsuarios(remote, local);
      writeLocalUsers(merged);
      return merged;
    } catch (error) {
      console.warn('No se pudieron leer usuarios remotos; usando copia local.', error);
      return local;
    }
  },

  async getById(id: number): Promise<Usuario | null> {
    const local = readLocalUsers().find(usuario => usuario.id_usuario === id) || null;
    try {
      const all = await this.list();
      const found = all.find(u => u.id_usuario === id);
      if (found) {
        cacheUsuario(found);
        return found;
      }
    } catch {}
    return local;
  },

  async create(user: Usuario): Promise<Usuario> {
    cacheUsuario(user);
    try {
      await sheetUpsertRow('usuarios', user);
    } catch (sheetErr) {
      console.warn('[usuariosService.create] Google Sheets:', sheetErr);
    }

    try {
      const supabase = tryGetActiveSupabaseClient();
      if (supabase) {
        await supabase.from('usuarios').insert([user]);
      }
    } catch (e) {
      console.warn('[usuariosService.create] Supabase omitido:', e);
    }
    return user;
  },

  async update(id: number, user: Partial<Usuario>): Promise<Usuario> {
    const current = readLocalUsers().find(usuario => usuario.id_usuario === id);
    const updated = { ...(current || {}), ...user, id_usuario: id } as Usuario;
    cacheUsuario(updated);

    try {
      await sheetUpsertRow('usuarios', updated);
    } catch (sheetErr) {
      console.warn('[usuariosService.update] Google Sheets:', sheetErr);
    }

    try {
      const supabase = tryGetActiveSupabaseClient();
      if (supabase) {
        await supabase.from('usuarios').update(user).eq('id_usuario', id);
      }
    } catch (e) {
      console.warn('[usuariosService.update] Supabase omitido:', e);
    }
    return updated;
  },

  async upsert(users: Usuario[]): Promise<Usuario[]> {
    writeLocalUsers(mergeUsuarios([], [...readLocalUsers(), ...users]));
    for (const u of users) {
      await this.update(u.id_usuario, u);
    }
    return users;
  },

  async remove(id: number): Promise<boolean> {
    writeLocalUsers(readLocalUsers().filter(usuario => usuario.id_usuario !== id));
    try {
      await sheetDeleteRow('usuarios', id);
    } catch (sheetErr) {
      console.warn('[usuariosService.remove] Google Sheets:', sheetErr);
    }
    try {
      const supabase = tryGetActiveSupabaseClient();
      if (supabase) {
        await supabase.from('usuarios').delete().eq('id_usuario', id);
      }
    } catch (e) {
      console.warn('[usuariosService.remove] Supabase omitido:', e);
    }
    return true;
  }
};
