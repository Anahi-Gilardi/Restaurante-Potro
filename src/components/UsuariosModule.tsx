import React, { useState, useEffect, useMemo } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { 
  Users, 
  Plus, 
  Trash, 
  Edit2, 
  Check, 
  X, 
  Search, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  UserCheck, 
  Lock, 
  Activity, 
  Smartphone,
  ChefHat,
  Shield
} from 'lucide-react';
import { Usuario, EventoLog } from '../types';
import { userAdminService } from '../services/userAdminService';
import { ToastContainer, useToast } from './ToastContainer';
import { usuarioSchema } from '../lib/validations';
import { ListSkeleton } from './Skeleton';

interface UsuariosModuleProps {
  usuarios: Usuario[];
  onUsuariosChange: (usuarios: Usuario[]) => void;
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
  activeUser?: Usuario;
  onActiveUserChange?: (nombre: string) => void;
}

export default function UsuariosModule({ 
  usuarios, 
  onUsuariosChange, 
  addLog, 
  activeUser, 
  onActiveUserChange 
}: UsuariosModuleProps) {
  const { toast, toasts, removeToast } = useToast();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Form State
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [username, setUsername] = useState('');
  const [rol, setRol] = useState<Usuario['rol']>('mozo');
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editApellido, setEditApellido] = useState('');
  const [editRol, setEditRol] = useState<Usuario['rol']>('mozo');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Delete Confirm State
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    let result = usuarios;
    if (activeUser?.rol === 'administrador') {
      result = result.filter(u => u.rol !== 'superadmin');
    }
    return result.filter(u =>
      `${u.nombre} ${u.apellido}`.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [usuarios, debouncedSearch, activeUser]);

  const handleCreateUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rol === 'superadmin' && activeUser?.rol !== 'superadmin') {
      toast.error('No tenés permisos para registrar usuarios con rol Super Admin.');
      return;
    }

    // Validación básica del PIN
    if (!password.trim() || password.length < 4) {
      toast.error('La clave o PIN debe tener al menos 4 caracteres.');
      return;
    }

    const validation = usuarioSchema.safeParse({ nombre, apellido, rol });
    if (!validation.success) {
      const msgs = validation.error.issues.map(i => i.message).join('. ');
      toast.error(msgs);
      return;
    }

    const { nombre: normalizedNombre, apellido: normalizedApellido } = validation.data;
    const normalizedUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,40}$/.test(normalizedUsername)) {
      toast.error('El usuario debe tener entre 3 y 40 caracteres: letras, números, punto, guion o guion bajo.');
      return;
    }
    try {
      const created = await userAdminService.create({
        nombre: normalizedNombre,
        apellido: normalizedApellido,
        username: normalizedUsername,
        password,
        rol,
      });
      onUsuariosChange([...usuarios.filter(u => u.id_usuario !== created.id_usuario), created]);
      toast.success('Usuario creado en Supabase Auth.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear el usuario.');
      return;
    }

    addLog('sistema', `USUARIOS: Alta de personal '${normalizedNombre} ${normalizedApellido}' como ${rol.toUpperCase()}`);
    setNombre('');
    setApellido('');
    setUsername('');
    setPassword('');
    setShowPasswordInput(false);
  };

  const handleStartEdit = (u: Usuario) => {
    if (u.rol === 'superadmin' && activeUser?.rol !== 'superadmin') {
      toast.error('No tenés permisos para editar un usuario Super Admin.');
      return;
    }
    setEditingId(u.id_usuario);
    setEditNombre(u.nombre);
    setEditApellido(u.apellido);
    setEditRol(u.rol);
    setEditPassword('');
  };

  const handleSaveEdit = async (id: number) => {
    if (!editNombre.trim() || !editApellido.trim()) {
      toast.error('El nombre y apellido son campos requeridos.');
      return;
    }
    if (editPassword && editPassword.length < 4) {
      toast.error('La nueva contraseña debe tener mínimo 4 caracteres.');
      return;
    }

    const target = usuarios.find(u => u.id_usuario === id);
    if (target?.rol === 'superadmin' && activeUser?.rol !== 'superadmin') {
      toast.error('No tenés permisos para modificar un usuario Super Admin.');
      return;
    }
    if (editRol === 'superadmin' && activeUser?.rol !== 'superadmin') {
      toast.error('No tenés permisos para asignar el rol Super Admin.');
      return;
    }

    try {
      const changed = await userAdminService.update(id, {
          nombre: editNombre.trim(), 
          apellido: editApellido.trim(), 
          rol: editRol,
      });
      if (editPassword) await userAdminService.changePassword(id, editPassword);
      onUsuariosChange(usuarios.map(u => u.id_usuario === id ? changed : u));
      addLog('sistema', `USUARIOS: Modificado personal '${target?.nombre} ${target?.apellido}' → '${editNombre} ${editApellido}' (${editRol})`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el usuario.');
      return;
    }
    setEditingId(null);
    setShowEditPassword(false);
    toast.success('Usuario actualizado correctamente.');
  };

  const handleToggleActivo = async (id: number) => {
    const target = usuarios.find(u => u.id_usuario === id);
    if (!target) return;
    if (target.rol === 'superadmin' && activeUser?.rol !== 'superadmin') {
      toast.error('No tenés permisos para modificar un usuario Super Admin.');
      return;
    }

    const nextActivo = target.activo !== false ? false : true;
    try {
      const updatedUser = await userAdminService.setActive(id, nextActivo);
      onUsuariosChange(usuarios.map(u => u.id_usuario === id ? updatedUser : u));
      addLog('sistema', `USUARIOS: Personal '${target.nombre} ${target.apellido}' ${nextActivo ? 'habilitado' : 'deshabilitado'}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cambiar el estado del usuario.');
    }
  };

  const handleDeleteUsuario = async (id: number) => {
    setDeleteConfirm(null);
    const target = usuarios.find(u => u.id_usuario === id);
    if (!target) return;
    if (target.rol === 'superadmin' && activeUser?.rol !== 'superadmin') {
      toast.error('No tenés permisos para eliminar un usuario Super Admin.');
      return;
    }
    
    // Evitar quedarse sin administradores
    const activeAdmins = usuarios.filter(u => (u.rol === 'superadmin' || u.rol === 'administrador') && u.activo !== false);
    if ((target.rol === 'superadmin' || target.rol === 'administrador') && activeAdmins.length <= 1) {
      toast.error('No se puede eliminar el último administrador activo del sistema.');
      return;
    }

    try {
      await userAdminService.remove(id);
      onUsuariosChange(usuarios.filter(u => u.id_usuario !== id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el usuario.');
      return;
    }
    
    addLog('sistema', `USUARIOS: Personal eliminado '${target.nombre} ${target.apellido}'`);
  };

  // Obtener iniciales para avatar
  const getInitials = (n: string, a: string) => {
    return `${n[0] || ''}${a[0] || ''}`.toUpperCase();
  };

  // Estilos de avatar por rol
  const getAvatarStyles = (rol: Usuario['rol']) => {
    switch (rol) {
      case 'superadmin':
        return {
          gradient: 'from-purple-500 to-indigo-650',
          badge: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-900/50',
          icon: ShieldAlert,
          desc: 'Acceso total y administración de auditorías'
        };
      case 'administrador':
        return {
          gradient: 'from-emerald-500 to-teal-600',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/50',
          icon: Shield,
          desc: 'Operaciones comerciales, caja e inventario'
        };
      case 'mozo':
        return {
          gradient: 'from-sky-400 to-blue-600',
          badge: 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/20 dark:text-sky-300 dark:border-sky-900/50',
          icon: Smartphone,
          desc: 'Servicio de salón y comandas en terminal'
        };
      case 'cocina':
        return {
          gradient: 'from-orange-400 to-amber-600',
          badge: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/50',
          icon: ChefHat,
          desc: 'Despacho de comandas y control de escandallos'
        };
    }
  };

  return (
    <>
    <div className="space-y-6">
      {/* Banner de Sesión Activa Simulada */}
      {activeUser && (
        <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-3 text-left">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarStyles(activeUser.rol).gradient} flex items-center justify-center text-white text-xs font-black`}>
              {getInitials(activeUser.nombre, activeUser.apellido)}
            </div>
            <div>
              <span className="text-[9px] uppercase font-black text-stone-400 block leading-none">Operador Actual Activo</span>
              <span className="text-xs font-black text-stone-900 dark:text-white mt-0.5 block">
                {activeUser.nombre} {activeUser.apellido} 
                <span className="font-medium text-stone-400 dark:text-stone-300 ml-1.5 font-mono">({activeUser.rol.toUpperCase()})</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Consola en Directo</span>
          </div>
        </div>
      )}

      {/* Barra de Búsqueda */}
      <div className="relative max-w-xs text-left">
        <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar personal..."
          className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-750 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#624A3E] text-stone-800 dark:text-stone-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* Formulario de Registro */}
        <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4 h-fit">
          <h3 className="text-sm font-black text-stone-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#624A3E]" />
            Registrar Personal
          </h3>
          
          <form onSubmit={handleCreateUsuario} className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">Nombre</label>
              <input 
                type="text" 
                value={nombre} 
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej. Sofía"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-950 text-stone-800 dark:text-stone-100 focus:outline-none" 
                required 
              />
            </div>
            
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">Apellido</label>
              <input 
                type="text" 
                value={apellido} 
                onChange={e => setApellido(e.target.value)}
                placeholder="Ej. Gilardi"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-955 text-stone-800 dark:text-stone-100 focus:outline-none" 
                required 
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">Usuario de acceso</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase())}
                placeholder="Ej. sofia"
                autoComplete="off"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-950 text-stone-800 dark:text-stone-100 font-mono focus:outline-none"
                required
              />
              <span className="text-[9px] text-stone-400 block mt-1">No necesita correo electrónico ni cuenta de Gmail.</span>
            </div>
            
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">Rol en Negocio</label>
              <select 
                value={rol} 
                onChange={e => setRol(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-955 text-stone-700 dark:text-stone-200 focus:outline-none cursor-pointer font-bold"
              >
                <option value="mozo">Mozo (Salón / Comandas)</option>
                <option value="cocina">Cocina (Monitor de Platos)</option>
                <option value="administrador">Administrador (Caja / Stock)</option>
                {activeUser?.rol === 'superadmin' && (
                  <option value="superadmin">Super Admin (Completo)</option>
                )}
              </select>
            </div>

            {/* Contraseña inicial */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider flex justify-between">
                Contraseña inicial
                <button 
                  type="button" 
                  onClick={() => setShowPasswordInput(!showPasswordInput)} 
                  className="text-stone-400 hover:text-stone-600 transition-colors"
                >
                  {showPasswordInput ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                <input 
                  type={showPasswordInput ? 'text' : 'password'} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  autoComplete="new-password"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-955 text-stone-800 dark:text-stone-100 font-mono font-bold focus:outline-none" 
                  required 
                />
              </div>
              <span className="text-[9px] text-stone-400 block font-bold">Se cifra en Supabase y no podrá volver a visualizarse.</span>
            </div>

            <button 
              type="submit"
              className="w-full py-2.5 bg-[#624A3E] hover:bg-[#503C32] text-white text-xs font-black uppercase rounded-xl transition-all shadow-md shadow-[#624A3E]/10 cursor-pointer"
            >
              Dar de Alta Personal
            </button>
          </form>
        </div>

        {/* Listado de Usuarios */}
        <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-stone-100 dark:border-stone-800">
            <h3 className="text-sm font-black text-stone-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-[#624A3E]" />
              Plantel Registrado ({filtered.length})
            </h3>
            <span className="text-[10px] bg-stone-50 dark:bg-stone-850 text-stone-605 text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-full font-bold">Consola Operativa</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-2"><ListSkeleton count={4} /></div>
            ) : filtered.map(u => {
              const styles = getAvatarStyles(u.rol);
              const isEditing = editingId === u.id_usuario;
              const RoleIcon = styles.icon;

              return (
                <div 
                  key={u.id_usuario} 
                  className={`p-4 bg-[#F5F1E9]/30 dark:bg-stone-850/20 border rounded-2xl flex flex-col justify-between transition-all duration-200 hover:shadow-sm ${
                    u.activo === false 
                      ? 'border-rose-200 dark:border-rose-950 opacity-60 bg-rose-50/5' 
                      : 'border-stone-150 dark:border-stone-800 hover:bg-[#F5F1E9]/60 dark:hover:bg-stone-850/40'
                  }`}
                >
                  <div className="space-y-3">
                    {isEditing ? (
                      <div className="space-y-2">
                        <label className="block">
                          <span className="text-[9px] uppercase font-black text-stone-400">Nombre</span>
                          <input 
                            type="text" 
                            value={editNombre} 
                            onChange={e => setEditNombre(e.target.value)}
                            className="w-full text-xs p-2 rounded-xl border border-stone-200 dark:border-stone-750 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 focus:outline-none" 
                          />
                        </label>
                        <label className="block">
                          <span className="text-[9px] uppercase font-black text-stone-400">Apellido</span>
                          <input 
                            type="text" 
                            value={editApellido} 
                            onChange={e => setEditApellido(e.target.value)}
                            className="w-full text-xs p-2 rounded-xl border border-stone-200 dark:border-stone-750 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 focus:outline-none" 
                          />
                        </label>
                        <label className="block">
                          <span className="text-[9px] uppercase font-black text-stone-400">Rol</span>
                          <select 
                            value={editRol} 
                            onChange={e => setEditRol(e.target.value as any)}
                            className="w-full text-xs p-2 rounded-xl border border-stone-200 dark:border-stone-750 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 focus:outline-none"
                          >
                            <option value="mozo">Mozo</option>
                            <option value="cocina">Cocina</option>
                            <option value="administrador">Administrador</option>
                            {activeUser?.rol === 'superadmin' && (
                              <option value="superadmin">Super Admin</option>
                            )}
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-[9px] uppercase font-black text-stone-400 flex justify-between">
                            Nueva contraseña (opcional)
                            <button 
                              type="button" 
                              onClick={() => setShowEditPassword(!showEditPassword)} 
                              className="text-stone-400"
                            >
                              {showEditPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </span>
                          <input 
                            type={showEditPassword ? 'text' : 'password'} 
                            value={editPassword} 
                            onChange={e => setEditPassword(e.target.value)}
                            placeholder="Dejar vacío para conservar"
                            autoComplete="new-password"
                            className="w-full text-xs p-2 rounded-xl border border-stone-200 dark:border-stone-750 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 font-mono font-bold focus:outline-none" 
                          />
                        </label>
                        <div className="flex gap-2 pt-1">
                          <button 
                            onClick={() => handleSaveEdit(u.id_usuario)}
                            className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase rounded-xl transition-colors cursor-pointer"
                          >
                            Guardar
                          </button>
                          <button 
                            onClick={() => {
                              setEditingId(null);
                              setShowEditPassword(false);
                            }}
                            className="py-1.5 px-3 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-605 text-stone-600 dark:text-stone-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Cabecera Tarjeta: Avatar Initials + Nombre + Badge */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${styles.gradient} flex items-center justify-center text-white text-xs font-black shadow-xs`}>
                              {getInitials(u.nombre, u.apellido)}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-stone-900 dark:text-white text-sm tracking-tight">{u.nombre} {u.apellido}</h4>
                              <span className="text-[9px] font-mono text-stone-400 block">Usuario: {u.username}</span>
                            </div>
                          </div>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1 ${styles.badge}`}>
                            <RoleIcon className="w-2.5 h-2.5" />
                            {u.rol}
                          </span>
                        </div>
                        
                        {/* Descripción de Rol */}
                        <p className="text-[11px] text-stone-500 dark:text-stone-300 font-medium leading-relaxed">{styles.desc}</p>
                        
                        {/* Estado de credencial */}
                        <div className="p-2 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-150 dark:border-stone-800 flex items-center text-xs">
                          <div className="flex items-center gap-1.5 text-stone-400">
                            <Lock className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">Credencial protegida en Supabase</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Acciones de pie */}
                  {!isEditing && (
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-stone-200/50 dark:border-stone-800">
                      
                      {/* Estado y Simulación */}
                      <div className="flex items-center gap-2">
                        {u.activo !== false && activeUser?.id_usuario !== u.id_usuario && onActiveUserChange && (
                          <button 
                            onClick={() => {
                              onActiveUserChange(u.nombre);
                              toast.info(`Simulando sesión del rol ${u.rol.toUpperCase()}: ${u.nombre}`);
                            }}
                            className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-[#624A3E]/10 hover:bg-[#624A3E] text-[#624A3E] hover:text-white dark:text-[#C8956A] dark:hover:bg-[#C8956A]/20 transition-all cursor-pointer"
                            title="Probar pantalla con este usuario"
                          >
                            Simular Sesión
                          </button>
                        )}
                        {activeUser?.id_usuario === u.id_usuario && (
                          <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-200">
                            Sesión Activa
                          </span>
                        )}
                      </div>

                      {/* Habilitar/Editar/Eliminar */}
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleToggleActivo(u.id_usuario)}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                            u.activo === false 
                              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100' 
                              : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100'
                          }`}
                        >
                          {u.activo === false ? 'Habilitar' : 'Deshabilitar'}
                        </button>
                        <button 
                          onClick={() => handleStartEdit(u)}
                          className="p-1 text-stone-400 hover:text-blue-500 rounded hover:bg-stone-150 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {deleteConfirm === u.id_usuario ? (
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => handleDeleteUsuario(u.id_usuario)}
                              className="p-1 text-red-500 hover:text-red-750 hover:text-red-700 bg-red-50 rounded-lg cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirm(null)}
                              className="p-1 text-stone-400 hover:text-stone-600 rounded-lg cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setDeleteConfirm(u.id_usuario)}
                            className="p-1 text-stone-400 hover:text-red-500 rounded hover:bg-stone-150 transition-colors cursor-pointer"
                            title="Eliminar usuario"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

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
