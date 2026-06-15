import React, { useState } from 'react';
import { Users, Plus, Trash, Edit2, Check, X, Search } from 'lucide-react';
import { Usuario, EventoLog } from '../types';
import { usuariosService } from '../services/usuariosService';
import { ToastContainer, useToast } from './ToastContainer';

interface UsuariosModuleProps {
  usuarios: Usuario[];
  onUsuariosChange: (usuarios: Usuario[]) => void;
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

export default function UsuariosModule({ usuarios, onUsuariosChange, addLog }: UsuariosModuleProps) {
  const { toast, toasts, removeToast } = useToast();
  const [search, setSearch] = useState('');

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [rol, setRol] = useState<'mozo' | 'cocina' | 'administrador'>('mozo');

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editApellido, setEditApellido] = useState('');
  const [editRol, setEditRol] = useState<'mozo' | 'cocina' | 'administrador'>('mozo');

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const filtered = usuarios.filter(u =>
    `${u.nombre} ${u.apellido}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedNombre = nombre.trim();
    const normalizedApellido = apellido.trim();
    if (!normalizedNombre || !normalizedApellido) return;
    if (usuarios.some(usuario => usuario.nombre.toLowerCase() === normalizedNombre.toLowerCase())) {
      toast.warning('Ya existe un usuario con ese nombre operativo.');
      return;
    }

    const newUs: Usuario = {
      id_usuario: Math.max(0, ...usuarios.map(u => u.id_usuario)) + 1,
      nombre: normalizedNombre,
      apellido: normalizedApellido,
      rol,
      activo: true
    };

    onUsuariosChange([...usuarios, newUs]);
    try {
      await usuariosService.create(newUs);
      toast.success('Usuario creado y sincronizado.');
    } catch {
      toast.warning('Usuario creado en la sesión actual, pero no pudo sincronizarse.');
    }
    addLog('sistema', `USUARIOS: Registrado nuevo usuario '${normalizedNombre} ${normalizedApellido}' con rol: ${rol.toUpperCase()}`);
    setNombre('');
    setApellido('');
  };

  const handleStartEdit = (u: Usuario) => {
    setEditingId(u.id_usuario);
    setEditNombre(u.nombre);
    setEditApellido(u.apellido);
    setEditRol(u.rol);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editNombre.trim() || !editApellido.trim()) return;
    const updated = usuarios.map(u => {
      if (u.id_usuario === id) {
        const changed = { ...u, nombre: editNombre.trim(), apellido: editApellido.trim(), rol: editRol };
        usuariosService.update(id, { nombre: editNombre.trim(), apellido: editApellido.trim(), rol: editRol }).catch(() => {});
        addLog('sistema', `USUARIOS: Modificado usuario '${u.nombre} ${u.apellido}' → '${editNombre} ${editApellido}' (${editRol})`);
        return changed;
      }
      return u;
    });
    onUsuariosChange(updated);
    setEditingId(null);
    toast.success('Usuario actualizado correctamente.');
  };

  const handleToggleActivo = (id: number) => {
    const target = usuarios.find(u => u.id_usuario === id);
    if (!target) return;
    const nextActivo = target.activo === false ? true : false;
    const updated = usuarios.map(u => {
      if (u.id_usuario === id) {
        usuariosService.update(id, { activo: nextActivo }).catch(() => {});
        addLog('sistema', `USUARIOS: Usuario '${u.nombre} ${u.apellido}' ${nextActivo ? 'habilitado' : 'deshabilitado'}`);
        return { ...u, activo: nextActivo };
      }
      return u;
    });
    onUsuariosChange(updated);
  };

  const handleDeleteUsuario = async (id: number) => {
    setDeleteConfirm(null);
    const target = usuarios.find(u => u.id_usuario === id);
    if (!target) return;
    const activeAdmins = usuarios.filter(u => u.rol === 'administrador' && u.activo !== false);
    if (target.rol === 'administrador' && activeAdmins.length <= 1) {
      toast.error('No se puede eliminar el último administrador activo.');
      return;
    }
    onUsuariosChange(usuarios.filter(u => u.id_usuario !== id));
    const removed = await usuariosService.remove(id);
    if (!removed) toast.warning('El usuario se quitó localmente, pero no pudo sincronizarse.');
    addLog('sistema', `USUARIOS: Removido usuario '${target.nombre} ${target.apellido}' del sistema`);
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
                placeholder="Ej. Pérez"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]" required />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">Rol Operativo</label>
              <select value={rol} onChange={e => setRol(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E] cursor-pointer font-bold text-stone-700">
                <option value="mozo">Mozo de Salón</option>
                <option value="cocina">Chef / Cocinero</option>
                <option value="administrador">Administrador / Cajero</option>
              </select>
            </div>
            <button type="submit"
              className="w-full py-2.5 bg-[#624A3E] hover:bg-[#503C32] text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-[#624A3E]/10 cursor-pointer">
              Dar de Alta en Consola
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
            {filtered.map(u => {
              let badgeColor = 'bg-stone-100 text-stone-700 border-stone-205';
              let desc = 'Soporte de salón y comandas táctiles';
              if (u.rol === 'mozo') { badgeColor = 'bg-blue-50 text-blue-800 border-blue-100'; }
              else if (u.rol === 'cocina') { badgeColor = 'bg-orange-50 text-orange-850 border-orange-100'; desc = 'Control y despacho de comandas en Cocina'; }
              else if (u.rol === 'administrador') { badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-100'; desc = 'Facturación, Arqueo de Caja y Escandallos'; }

              const isEditing = editingId === u.id_usuario;

              return (
                <div key={u.id_usuario} className={`p-4 bg-[#F5F1E9]/40 border rounded-2xl flex flex-col justify-between transition-colors ${u.activo === false ? 'border-rose-200 opacity-70' : 'border-stone-150 hover:bg-[#F5F1E9]/70'}`}>
                  <div className="space-y-1">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input type="text" value={editNombre} onChange={e => setEditNombre(e.target.value)}
                          className="w-full text-xs p-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#624A3E]" />
                        <input type="text" value={editApellido} onChange={e => setEditApellido(e.target.value)}
                          className="w-full text-xs p-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#624A3E]" />
                        <select value={editRol} onChange={e => setEditRol(e.target.value as any)}
                          className="w-full text-xs p-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#624A3E]">
                          <option value="mozo">Mozo</option>
                          <option value="cocina">Cocina</option>
                          <option value="administrador">Administrador</option>
                        </select>
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveEdit(u.id_usuario)}
                            className="flex-1 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-500 transition-colors cursor-pointer">Guardar</button>
                          <button onClick={() => setEditingId(null)}
                            className="py-1.5 px-3 bg-stone-200 text-stone-600 text-xs font-bold rounded-xl hover:bg-stone-300 transition-colors cursor-pointer">Cancelar</button>
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
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${u.activo === false ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}>
                          {u.activo === false ? 'Habilitar' : 'Deshabilitar'}
                        </button>
                        <button onClick={() => handleStartEdit(u)}
                          className="p-1 text-stone-400 hover:text-blue-500 rounded hover:bg-stone-150 transition-colors cursor-pointer">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {deleteConfirm === u.id_usuario ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDeleteUsuario(u.id_usuario)}
                            className="p-1 text-red-500 hover:text-red-700 bg-red-50 rounded-lg cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteConfirm(null)}
                            className="p-1 text-stone-400 hover:text-stone-600 rounded-lg cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(u.id_usuario)}
                          className="p-1 text-stone-400 hover:text-red-500 rounded hover:bg-stone-150 transition-colors cursor-pointer"
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
