import React, { useState, useEffect } from 'react';
import { Users, Shield, Plus, Check, Trash } from 'lucide-react';
import { Usuario, EventoLog } from '../types';
import { usuariosService } from '../services/usuariosService';
import { ToastContainer, useToast } from './ToastContainer';

interface UsuariosModuleProps {
  logs: EventoLog[];
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

export default function UsuariosModule({ logs, addLog }: UsuariosModuleProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const { toast, toasts, removeToast } = useToast();

  useEffect(() => {
    usuariosService.list().then(data => {
      if (data && data.length > 0) {
        setUsuarios(data);
      } else {
        // Fallback default seed if db empty
        setUsuarios([
          { id_usuario: 1, nombre: 'Enzo', apellido: 'Fernández', rol: 'mozo' },
          { id_usuario: 2, nombre: 'Micaela', apellido: 'Gómez', rol: 'mozo' },
          { id_usuario: 3, nombre: 'Damián', apellido: 'Martínez', rol: 'cocina' },
          { id_usuario: 4, nombre: 'Sofía', apellido: 'Alegre', rol: 'administrador' },
        ]);
      }
    }).catch(() => {
      setUsuarios([
        { id_usuario: 1, nombre: 'Enzo', apellido: 'Fernández', rol: 'mozo' },
        { id_usuario: 2, nombre: 'Micaela', apellido: 'Gómez', rol: 'mozo' },
        { id_usuario: 3, nombre: 'Damián', apellido: 'Martínez', rol: 'cocina' },
        { id_usuario: 4, nombre: 'Sofía', apellido: 'Alegre', rol: 'administrador' },
      ]);
    });
  }, []);

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [rol, setRol] = useState<'mozo' | 'cocina' | 'administrador'>('mozo');

  const handleCreateUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !apellido) return;

    const newUs: Usuario = {
      id_usuario: Math.max(0, ...usuarios.map(u => u.id_usuario)) + 1,
      nombre,
      apellido,
      rol,
    };

    setUsuarios(prev => [...prev, newUs]);
    usuariosService.create(newUs).catch(err => console.error(err));
    addLog('sistema', `USUARIOS: Registrado nuevo usuario '${nombre} ${apellido}' con rol: ${rol.toUpperCase()}`);
    setNombre('');
    setApellido('');
  };

  const handleDeleteUsuario = (id: number) => {
    const target = usuarios.find(u => u.id_usuario === id);
    if (!target) return;
    const activeAdmins = usuarios.filter(u => u.rol === 'administrador' && u.activo !== false);
    if (target.rol === 'administrador' && activeAdmins.length <= 1) {
      toast.error('No se puede eliminar el último administrador activo.');
      return;
    }
    setUsuarios(prev => prev.filter(u => u.id_usuario !== id));
    usuariosService.remove(id).then(removed => {
      if (!removed) toast.warning('El usuario se quitó localmente, pero no pudo sincronizarse.');
    });
    addLog('sistema', `USUARIOS: Removido usuario '${target.nombre} ${target.apellido}' del sistema`);
  };

  return (
    <>
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Add Form */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#624A3E]" />
            Registrar Nuevo Personal
          </h3>
          <form onSubmit={handleCreateUsuario} className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">Nombre</label>
              <input 
                type="text" 
                value={nombre} 
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej. Juan"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">Apellido</label>
              <input 
                type="text" 
                value={apellido} 
                onChange={e => setApellido(e.target.value)}
                placeholder="Ej. Pérez"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E]"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">Rol Operativo</label>
              <select 
                value={rol} 
                onChange={e => setRol(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-[#624A3E] cursor-pointer font-bold text-stone-700"
              >
                <option value="mozo">Mozo de Salón</option>
                <option value="cocina">Chef / Cocinero</option>
                <option value="administrador">Administrador / Cajero</option>
              </select>
            </div>
            <button 
              type="submit"
              className="w-full py-2.5 bg-[#624A3E] hover:bg-[#503C32] text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-[#624A3E]/10 cursor-pointer"
            >
              Dar de Alta en Consola
            </button>
          </form>
        </div>

        {/* Right columns: List */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-stone-100">
            <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-[#624A3E]" />
              Usuarios Registrados ({usuarios.length})
            </h3>
            <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-bold">Actividad en Vivo</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {usuarios.map(u => {
              let badgeColor = 'bg-stone-100 text-stone-700 border-stone-205';
              let desc = 'Soporte de salón y comandas táctiles';
              if (u.rol === 'mozo') {
                badgeColor = 'bg-blue-50 text-blue-800 border-blue-100';
              } else if (u.rol === 'cocina') {
                badgeColor = 'bg-orange-50 text-orange-850 border-orange-100';
                desc = 'Control y despacho de comandas en Cocina';
              } else if (u.rol === 'administrador') {
                badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-100';
                desc = 'Facturación, Arqueo de Caja y Escandallos';
              }

              return (
                <div key={u.id_usuario} className="p-4 bg-[#F5F1E9]/40 border border-stone-150 rounded-2xl flex flex-col justify-between hover:bg-[#F5F1E9]/70 transition-colors">
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-extrabold text-stone-900 text-sm tracking-tight">{u.nombre} {u.apellido}</h4>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${badgeColor}`}>
                        {u.rol}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 font-medium leading-snug">{desc}</p>
                  </div>
                  
                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-stone-200/50">
                    <span className="text-[9px] text-[#22C55E] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full animate-ping" />
                      Sesión activa
                    </span>
                    {usuarios.length > 2 && (
                      <button 
                        onClick={() => handleDeleteUsuario(u.id_usuario)}
                        className="p-1 text-stone-400 hover:text-red-500 rounded hover:bg-stone-150 transition-colors cursor-pointer"
                        title="Eliminar usuario"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
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
