import React, { useState, useEffect, useMemo } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { Users, Plus, Trash, Edit2, Check, X, Search } from 'lucide-react';
import { Usuario, EventoLog } from '../types';
import { usuariosService } from '../services/usuariosService';
import { ToastContainer, useToast } from './ToastContainer';
import { usuarioSchema } from '../lib/validations';
import { ListSkeleton } from './Skeleton';

interface UsuariosModuleProps {
  usuarios: Usuario[];
  onUsuariosChange: (usuarios: Usuario[]) => void;
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

const isAdminRole = (rol: Usuario['rol']) => rol === 'superadmin' || rol === 'administrador';

const buildUsername = (nombre: string, apellido: string) => (
  `${nombre}.${apellido}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/(^\.|\.$)/g, '')
);

export default function UsuariosModule({ usuarios, onUsuariosChange, addLog }: UsuariosModuleProps) {
  const { toast, toasts, removeToast } = useToast();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [rol, setRol] = useState<Usuario['rol']>('administrador');

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editApellido, setEditApellido] = useState('');
  const [editRol, setEditRol] = useState<Usuario['rol']>('administrador');

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const filtered = useMemo(() => usuarios.filter(u =>
    `${u.nombre} ${u.apellido}`.toLowerCase().includes(debouncedSearch.toLowerCase())
  ), [usuarios, debouncedSearch]);

  const activeAdminCount = useMemo(
    () => usuarios.filter(u => isAdminRole(u.rol) && u.activo !== false).length,
    [usuarios]
  );

  const handleCreateUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingAction) return;

    const validation = usuarioSchema.safeParse({ nombre, apellido, rol });
    if (!validation.success) {
      const msgs = validation.error.issues.map(i => i.message).join('. ');
      toast.error(msgs);
      return;
    }

    const { nombre: normalizedNombre, apellido: normalizedApellido } = validation.data;
    const username = buildUsername(normalizedNombre, normalizedApellido);
    const fullName = `${normalizedNombre} ${normalizedApellido}`.trim().toLowerCase();

    const duplicate = usuarios.some(usuario => (
      usuario.username?.toLowerCase() === username
      || `${usuario.nombre} ${usuario.apellido}`.trim().toLowerCase() === fullName
    ));

    if (duplicate) {
      toast.warning('Ya existe un usuario con ese nombre operativo.');
      return;
    }

    const newUs: Usuario = {
      id_usuario: Math.max(0, ...usuarios.map(u => u.id_usuario)) + 1,
      nombre: normalizedNombre,
      apellido: normalizedApellido,
      username,
      password: '1234',
      rol,
      activo: true
    };

    const previous = usuarios;
    setPendingAction('create');
    onUsuariosChange([...previous, newUs]);
    try {
      await usuariosService.create(newUs);
      toast.success('Usuario creado y sincronizado.');
      addLog('sistema', `USUARIOS: Registrado nuevo usuario '${normalizedNombre} ${normalizedApellido}' con rol: ${rol.toUpperCase()}`);
      setNombre('');
      setApellido('');
    } catch {
      onUsuariosChange(previous);
      toast.error('No se pudo crear el usuario. Se revirtio el cambio.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleStartEdit = (u: Usuario) => {
    setEditingId(u.id_usuario);
    setEditNombre(u.nombre);
    setEditApellido(u.apellido);
    setEditRol(u.rol);
  };

  const handleSaveEdit = async (id: number) => {
    if (pendingAction) return;

    const target = usuarios.find(u => u.id_usuario === id);
    if (!target) return;

    const validation = usuarioSchema.safeParse({ nombre: editNombre, apellido: editApellido, rol: editRol });
    if (!validation.success) {
      toast.error(validation.error.issues.map(i => i.message).join('. '));
      return;
    }

    const { nombre: normalizedNombre, apellido: normalizedApellido } = validation.data;
    const username = buildUsername(normalizedNombre, normalizedApellido);
    const fullName = `${normalizedNombre} ${normalizedApellido}`.trim().toLowerCase();
    const duplicate = usuarios.some(usuario => (
      usuario.id_usuario !== id
      && (
        usuario.username?.toLowerCase() === username
        || `${usuario.nombre} ${usuario.apellido}`.trim().toLowerCase() === fullName
      )
    ));

    if (duplicate) {
      toast.warning('Ya existe otro usuario con ese nombre operativo.');
      return;
    }

    if (target.activo !== false && isAdminRole(target.rol) && !isAdminRole(editRol) && activeAdminCount <= 1) {
      toast.error('No se puede quitar el ultimo administrador activo.');
      return;
    }

    const previous = usuarios;
    const updated = previous.map(u => (
      u.id_usuario === id
        ? { ...u, nombre: normalizedNombre, apellido: normalizedApellido, username, rol: editRol }
        : u
    ));

    setPendingAction(`edit-${id}`);
    onUsuariosChange(updated);
    try {
      await usuariosService.update(id, { nombre: normalizedNombre, apellido: normalizedApellido, username, rol: editRol });
      addLog('sistema', `USUARIOS: Modificado usuario '${target.nombre} ${target.apellido}' -> '${normalizedNombre} ${normalizedApellido}' (${editRol})`);
      setEditingId(null);
      toast.success('Usuario actualizado correctamente.');
    } catch {
      onUsuariosChange(previous);
      toast.error('No se pudo guardar el usuario. Se revirtio el cambio.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleToggleActivo = async (id: number) => {
    if (pendingAction) return;

    const target = usuarios.find(u => u.id_usuario === id);
    if (!target) return;

    const nextActivo = target.activo === false;
    if (!nextActivo && isAdminRole(target.rol) && activeAdminCount <= 1) {
      toast.error('No se puede deshabilitar el ultimo administrador activo.');
      return;
    }

    const previous = usuarios;
    const updated = previous.map(u => (
      u.id_usuario === id ? { ...u, activo: nextActivo } : u
    ));

    setPendingAction(`toggle-${id}`);
    onUsuariosChange(updated);
    try {
      await usuariosService.update(id, { activo: nextActivo });
      addLog('sistema', `USUARIOS: Usuario '${target.nombre} ${target.apellido}' ${nextActivo ? 'habilitado' : 'deshabilitado'}`);
      toast.success(nextActivo ? 'Usuario habilitado.' : 'Usuario deshabilitado.');
    } catch {
      onUsuariosChange(previous);
      toast.error('No se pudo actualizar el estado. Se revirtio el cambio.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleDeleteUsuario = async (id: number) => {
    if (pendingAction) return;

    setDeleteConfirm(null);
    const target = usuarios.find(u => u.id_usuario === id);
    if (!target) return;

    if (isAdminRole(target.rol) && target.activo !== false && activeAdminCount <= 1) {
      toast.error('No se puede eliminar el ultimo administrador activo.');
      return;
    }

    const previous = usuarios;
    setPendingAction(`delete-${id}`);
    onUsuariosChange(previous.filter(u => u.id_usuario !== id));
    try {
      const removed = await usuariosService.remove(id);
      if (!removed) toast.warning('El usuario se quito localmente, pero no pudo sincronizarse.');
      addLog('sistema', `USUARIOS: Removido usuario '${target.nombre} ${target.apellido}' del sistema`);
    } catch {
      onUsuariosChange(previous);
      toast.error('No se pudo eliminar el usuario. Se revirtio el cambio.');
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <>
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative max-w-xs">
        <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar usuarios..."
          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#624A3E]" />
            Registrar Nuevo Personal
          </h3>
          <form onSubmit={handleCreateUsuario} className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">Nombre</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Ej. Juan"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]" required />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">Apellido</label>
              <input type="text" value={apellido} onChange={e => setApellido(e.target.value)}
                placeholder="Ej. Perez"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]" required />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">Rol Operativo</label>
              <select value={rol} onChange={e => setRol(e.target.value as Usuario['rol'])}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E] cursor-pointer font-bold text-stone-700">
                <option value="administrador">Administrador</option>
                <option value="superadmin">Super Admin</option>
                <option value="mozo">Mozo</option>
                <option value="cocina">Cocina</option>
              </select>
            </div>
            <button type="submit"
              disabled={pendingAction !== null}
              className="w-full py-2.5 bg-[#624A3E] hover:bg-[#503C32] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-[#624A3E]/10 cursor-pointer">
              {pendingAction === 'create' ? 'Registrando...' : 'Dar de alta en consola'}
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-stone-100">
            <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-[#624A3E]" />
              Usuarios Registrados ({filtered.length})
            </h3>
            <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-bold">Actividad en Vivo</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-2"><ListSkeleton count={4} /></div>
            ) : filtered.map(u => {
              let badgeColor = 'bg-stone-100 text-stone-700 border-stone-200';
              let desc = 'Soporte de salon y comandas tactiles';
              if (u.rol === 'superadmin') { badgeColor = 'bg-purple-50 text-purple-800 border-purple-100'; desc = 'Acceso total al sistema'; }
              else if (u.rol === 'administrador') { badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-100'; desc = 'Operaciones del negocio'; }

              const isEditing = editingId === u.id_usuario;

              return (
                <div key={u.id_usuario} className={`p-4 bg-[#F5F1E9]/40 border rounded-2xl flex flex-col justify-between transition-colors ${u.activo === false ? 'border-rose-200 opacity-70' : 'border-stone-200 hover:bg-[#F5F1E9]/70'}`}>
                  <div className="space-y-1">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input type="text" value={editNombre} onChange={e => setEditNombre(e.target.value)}
                          className="w-full text-xs p-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#624A3E]" />
                        <input type="text" value={editApellido} onChange={e => setEditApellido(e.target.value)}
                          className="w-full text-xs p-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#624A3E]" />
                        <select value={editRol} onChange={e => setEditRol(e.target.value as Usuario['rol'])}
                          className="w-full text-xs p-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#624A3E]">
                          <option value="administrador">Administrador</option>
                          <option value="superadmin">Super Admin</option>
                          <option value="mozo">Mozo</option>
                          <option value="cocina">Cocina</option>
                        </select>
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveEdit(u.id_usuario)}
                            disabled={pendingAction !== null}
                            className="flex-1 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer">
                            {pendingAction === `edit-${u.id_usuario}` ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button onClick={() => setEditingId(null)}
                            disabled={pendingAction !== null}
                            className="py-1.5 px-3 bg-stone-200 text-stone-600 text-xs font-bold rounded-xl hover:bg-stone-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start">
                          <h4 className="font-extrabold text-stone-900 text-sm tracking-tight">{u.nombre} {u.apellido}</h4>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${badgeColor}`}>{u.rol}</span>
                        </div>
                        <p className="text-[11px] text-stone-500 font-medium leading-snug">{desc}</p>
                      </>
                    )}
                  </div>
                  
                  {!isEditing && (
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-stone-200/50">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleToggleActivo(u.id_usuario)}
                          disabled={pendingAction !== null}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-lg transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${u.activo === false ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}>
                          {pendingAction === `toggle-${u.id_usuario}` ? 'Actualizando...' : u.activo === false ? 'Habilitar' : 'Deshabilitar'}
                        </button>
                        <button onClick={() => handleStartEdit(u)}
                          disabled={pendingAction !== null}
                          className="p-1 text-stone-400 hover:text-blue-500 rounded hover:bg-stone-200 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {deleteConfirm === u.id_usuario ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDeleteUsuario(u.id_usuario)}
                            disabled={pendingAction !== null}
                            className="p-1 text-red-500 hover:text-red-700 bg-red-50 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteConfirm(null)}
                            disabled={pendingAction !== null}
                            className="p-1 text-stone-400 hover:text-stone-600 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(u.id_usuario)}
                          disabled={pendingAction !== null}
                          className="p-1 text-stone-400 hover:text-red-500 rounded hover:bg-stone-200 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          title="Eliminar usuario">
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
}
