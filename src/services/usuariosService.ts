import { getActiveSupabaseClient } from '../lib/supabaseClient';
import { Usuario } from '../types';

const LOCAL_USERS_KEY = 'el_patron_usuarios_locales';

const readLocalUsers = (): Usuario[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
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
  local.forEach(usuario => merged.set(usuario.id_usuario, usuario));
  remote.forEach(usuario => merged.set(usuario.id_usuario, usuario));
  return Array.from(merged.values()).sort((a, b) => a.id_usuario - b.id_usuario);
};

const cacheUsuario = (usuario: Usuario) => {
  writeLocalUsers(mergeUsuarios([], [...readLocalUsers(), usuario]));
};

export const usuariosService = {
  async list(): Promise<Usuario[]> {
    const local = readLocalUsers();
    try {
      const supabase = getActiveSupabaseClient();
      const { data, error } = await supabase.from('usuarios').select('*').order('id_usuario', { ascending: true });
      if (error) throw error;
      const merged = mergeUsuarios(data || [], local);
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
      const supabase = getActiveSupabaseClient();
      const { data, error } = await supabase.from('usuarios').select('*').eq('id_usuario', id).single();
      if (error) throw error;
      if (data) cacheUsuario(data);
      return data || local;
    } catch {
      return local;
    }
  },

  async create(user: Usuario): Promise<Usuario> {
    cacheUsuario(user);
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('usuarios').insert([user]).select().single();
    if (error) {
      console.error('Error creating usuario:', error);
      throw error;
    }
    cacheUsuario(data);
    return data;
  },

  async update(id: number, user: Partial<Usuario>): Promise<Usuario> {
    const current = readLocalUsers().find(usuario => usuario.id_usuario === id);
    if (current) cacheUsuario({ ...current, ...user });

    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('usuarios').update(user).eq('id_usuario', id).select().single();
    if (error) {
      console.error('Error updating usuario:', error);
      throw error;
    }
    cacheUsuario(data);
    return data;
  },

  async upsert(users: Usuario[]): Promise<Usuario[]> {
    writeLocalUsers(mergeUsuarios([], [...readLocalUsers(), ...users]));
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase.from('usuarios').upsert(users).select();
    if (error) {
      console.error('Error upserting usuarios:', error);
      throw error;
    }
    const merged = mergeUsuarios(data || [], readLocalUsers());
    writeLocalUsers(merged);
    return merged;
  },

  async remove(id: number): Promise<boolean> {
    writeLocalUsers(readLocalUsers().filter(usuario => usuario.id_usuario !== id));
    try {
      const supabase = getActiveSupabaseClient();
      const { error } = await supabase.from('usuarios').delete().eq('id_usuario', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.warn('Usuario eliminado localmente, pero no se pudo borrar en Supabase.', error);
      return false;
    }
  }
};
