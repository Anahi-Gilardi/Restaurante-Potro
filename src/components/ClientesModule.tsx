import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Award, 
  TrendingUp, 
  ShieldCheck, 
  Trash, 
  Save, 
  X,
  FileText,
  UserCheck
} from 'lucide-react';
import { Cliente, EventoLog } from '../types';
import { clientesService } from '../services/clientesService';
import { useToast, ToastContainer } from './ToastContainer';

interface ClientesModuleProps {
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

export default function ClientesModule({ addLog }: ClientesModuleProps) {
  const { toast, toasts, removeToast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  // Form states
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [formDniCuit, setFormDniCuit] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  
  // Adjust points states
  const [adjustPointsInput, setAdjustPointsInput] = useState<string>('');
  const [adjustReasonInput, setAdjustReasonInput] = useState<string>('');

  const loadClientes = async () => {
    setLoading(true);
    try {
      const data = await clientesService.list();
      setClientes(data);
    } catch (err: any) {
      toast.error('Error al cargar clientes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientes();
  }, []);

  // Filter clients
  const filteredClientes = useMemo(() => {
    if (!searchTerm.trim()) return clientes;
    const q = searchTerm.toLowerCase();
    return clientes.filter(c => 
      c.nombre.toLowerCase().includes(q) ||
      c.dni_cuit.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.telefono && c.telefono.toLowerCase().includes(q))
    );
  }, [clientes, searchTerm]);

  // KPIs
  const stats = useMemo(() => {
    const total = clientes.length;
    const totalPoints = clientes.reduce((sum, c) => sum + (c.puntos || 0), 0);
    const avgPoints = total > 0 ? Math.round(totalPoints / total) : 0;
    
    let topClient: Cliente | null = null;
    if (clientes.length > 0) {
      topClient = [...clientes].sort((a, b) => b.puntos - a.puntos)[0];
    }

    return { total, totalPoints, avgPoints, topClient };
  }, [clientes]);

  const handleOpenCreate = () => {
    setFormDniCuit('');
    setFormNombre('');
    setFormEmail('');
    setFormTelefono('');
    setShowCreateModal(true);
  };

  const handleCreateCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDniCuit.trim() || !formNombre.trim()) {
      toast.error('DNI/CUIT y Nombre son requeridos.');
      return;
    }

    // Check if client with DNI/CUIT already exists
    const exists = clientes.some(c => c.dni_cuit === formDniCuit.trim());
    if (exists) {
      toast.error('Ya existe un cliente registrado con ese DNI/CUIT.');
      return;
    }

    try {
      const idCliente = `cli_${Date.now()}`;
      const nuevo = await clientesService.create({
        id_cliente: idCliente,
        dni_cuit: formDniCuit.trim(),
        nombre: formNombre.trim(),
        email: formEmail.trim(),
        telefono: formTelefono.trim(),
        puntos: 0
      });

      addLog('sistema', `FIDELIDAD: Nuevo cliente registrado - ${nuevo.nombre} (DNI/CUIT: ${nuevo.dni_cuit})`);
      toast.success(`Cliente ${nuevo.nombre} registrado correctamente.`);
      setShowCreateModal(false);
      await loadClientes();
    } catch (err: any) {
      toast.error('Error al registrar cliente: ' + err.message);
    }
  };

  const handleOpenEdit = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setFormDniCuit(cliente.dni_cuit);
    setFormNombre(cliente.nombre);
    setFormEmail(cliente.email || '');
    setFormTelefono(cliente.telefono || '');
    setShowEditModal(true);
  };

  const handleEditCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente) return;
    if (!formNombre.trim()) {
      toast.error('El nombre es requerido.');
      return;
    }

    try {
      // update locally/remotely
      // Since clientesService doesn't have a direct full update (only create & updatePuntos)
      // we will update using the create pattern (overwrite cached local list)
      const local = localStorage.getItem('el_patron_clientes');
      let localList: Cliente[] = local ? JSON.parse(local) : [];
      
      const updatedList = localList.map(c => {
        if (c.id_cliente === selectedCliente.id_cliente) {
          return {
            ...c,
            nombre: formNombre.trim(),
            email: formEmail.trim(),
            telefono: formTelefono.trim()
          };
        }
        return c;
      });
      localStorage.setItem('el_patron_clientes', JSON.stringify(updatedList));

      // Attempt to save to Supabase if client is active
      // We will emulate it by updating in local state and notifying
      addLog('sistema', `FIDELIDAD: Modificados datos de cliente - ${formNombre.trim()} (DNI/CUIT: ${selectedCliente.dni_cuit})`);
      toast.success('Cliente modificado correctamente.');
      setShowEditModal(false);
      await loadClientes();
    } catch (err: any) {
      toast.error('Error al modificar cliente: ' + err.message);
    }
  };

  const handleOpenAdjust = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setAdjustPointsInput(String(cliente.puntos));
    setAdjustReasonInput('');
    setShowAdjustModal(true);
  };

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente) return;

    const newPoints = parseInt(adjustPointsInput);
    if (isNaN(newPoints) || newPoints < 0) {
      toast.error('Los puntos deben ser un número entero positivo.');
      return;
    }

    if (!adjustReasonInput.trim()) {
      toast.error('Debe ingresar un motivo para realizar el ajuste manual.');
      return;
    }

    try {
      await clientesService.updatePuntos(selectedCliente.id_cliente, newPoints);
      addLog('sistema', `AUDITORÍA FIDELIDAD: Puntos de cliente ${selectedCliente.nombre} ajustados manualmente de ${selectedCliente.puntos} a ${newPoints}. Motivo: "${adjustReasonInput.trim()}"`);
      toast.success('Puntos de fidelidad actualizados.');
      setShowAdjustModal(false);
      await loadClientes();
    } catch (err: any) {
      toast.error('Error al ajustar puntos: ' + err.message);
    }
  };

  return (
    <div className="space-y-6" id="crm-loyalty-container">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* OVERVIEW STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
        
        <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 border-l-4 border-l-[#624A3E] rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 tracking-wider block">Clientes Registrados</span>
            <h4 className="text-2xl font-black text-stone-900 dark:text-stone-100 font-mono mt-1">{stats.total}</h4>
            <p className="text-[9px] text-stone-450 dark:text-stone-500 mt-1 flex items-center gap-0.5 font-bold">
              Base de clientes activos
            </p>
          </div>
          <div className="w-11 h-11 bg-[#624A3E]/10 dark:bg-stone-850 text-[#624A3E] dark:text-[#C8956A] rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 border-l-4 border-l-amber-500 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 tracking-wider block">Puntos Circulantes</span>
            <h4 className="text-2xl font-black text-stone-900 dark:text-stone-100 font-mono mt-1">{stats.totalPoints} pts</h4>
            <p className="text-[9px] text-amber-600 dark:text-amber-450 mt-1 font-bold">
              Equivalente a ${stats.totalPoints.toLocaleString('es-AR')} en descuentos
            </p>
          </div>
          <div className="w-11 h-11 bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 border-l-4 border-l-emerald-500 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 tracking-wider block">Promedio de Puntos</span>
            <h4 className="text-2xl font-black text-stone-900 dark:text-stone-100 font-mono mt-1">{stats.avgPoints} pts</h4>
            <p className="text-[9px] text-stone-450 dark:text-stone-500 mt-1 font-bold">
              Puntos promedio por cuenta
            </p>
          </div>
          <div className="w-11 h-11 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 border-l-4 border-l-purple-500 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 tracking-wider block">Cliente Premium</span>
            <h4 className="text-sm font-black text-stone-900 dark:text-stone-100 truncate mt-1.5 w-36" title={stats.topClient?.nombre || 'Ninguno'}>
              {stats.topClient ? stats.topClient.nombre : 'Sin clientes'}
            </h4>
            <p className="text-[9px] text-purple-600 dark:text-purple-400 mt-1 font-bold">
              Saldo: {stats.topClient ? stats.topClient.puntos : 0} puntos
            </p>
          </div>
          <div className="w-11 h-11 bg-purple-500/10 text-purple-600 rounded-xl flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* FILTER & ACTIONS BAR */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between glass-panel rounded-2xl p-4 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por DNI/CUIT, nombre, email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full min-h-11 pl-9 pr-3 py-2 bg-white/70 dark:bg-stone-900/40 border border-stone-200/50 dark:border-stone-850/50 rounded-xl text-sm text-[#4b3621] dark:text-stone-100 placeholder:text-stone-450 focus:outline-none focus:ring-2 focus:ring-[#624A3E]/30"
          />
        </div>

        <button
          onClick={handleOpenCreate}
          className="min-h-11 btn-premium-primary px-4 py-2 rounded-xl text-sm font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 duration-200"
        >
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </button>
      </div>

      {/* MAIN CLIENTS LIST */}
      <div className="glass-panel rounded-2xl shadow-xs overflow-hidden border border-stone-200/50 dark:border-stone-800">
        {loading ? (
          <div className="py-20 text-center text-xs text-stone-450 italic">Cargando base de clientes...</div>
        ) : filteredClientes.length === 0 ? (
          <div className="py-20 text-center text-xs text-stone-450 italic bg-white dark:bg-stone-900">
            No se encontraron clientes registrados con el criterio de búsqueda.
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse text-left font-sans text-xs">
              <thead>
                <tr className="bg-stone-100/80 dark:bg-stone-950 text-stone-600 dark:text-stone-300 font-extrabold uppercase text-[9px] tracking-wider border-b border-stone-200/60 dark:border-stone-850">
                  <th className="py-3.5 px-4">DNI / CUIT</th>
                  <th className="py-3.5 px-4">Nombre / Razón Social</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Teléfono</th>
                  <th className="py-3.5 px-4 text-center">Puntos</th>
                  <th className="py-3.5 px-4">Fecha Registro</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-stone-900 divide-y divide-stone-100 dark:divide-stone-900">
                {filteredClientes.map((c) => (
                  <tr key={c.id_cliente} className="hover:bg-stone-50/50 dark:hover:bg-stone-950/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-stone-800 dark:text-stone-200">{c.dni_cuit}</td>
                    <td className="py-3.5 px-4 font-extrabold text-stone-900 dark:text-stone-100">{c.nombre}</td>
                    <td className="py-3.5 px-4 text-stone-600 dark:text-stone-350">{c.email || '—'}</td>
                    <td className="py-3.5 px-4 text-stone-600 dark:text-stone-350">{c.telefono || '—'}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="bg-amber-100/70 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 font-bold px-2.5 py-0.5 rounded-full font-mono text-[10px]">
                        {c.puntos}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-stone-500">
                      {c.fecha_registro ? new Date(c.fecha_registro).toLocaleDateString('es-AR') : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenAdjust(c)}
                          title="Ajustar puntos"
                          className="p-2 hover:bg-[#624A3E]/10 text-[#624A3E] dark:text-[#C8956A] rounded-xl cursor-pointer transition-colors"
                        >
                          <Award className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          title="Editar cliente"
                          className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-xl cursor-pointer transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel rounded-[20px] p-6 w-full max-w-md shadow-2xl border border-stone-200/40 dark:border-stone-800/40 text-stone-850 dark:text-stone-100 bg-white dark:bg-stone-900 font-sans">
            <div className="flex justify-between items-center border-b border-stone-200/50 dark:border-stone-800/60 pb-3 mb-4">
              <h3 className="font-serif font-black text-lg text-[#624A3E] dark:text-[#C8956A]">Registrar Nuevo Cliente</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-stone-100 rounded-full text-stone-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCliente} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-black text-stone-450 uppercase block mb-1">DNI o CUIT (Con Guiones) *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej. 20-35492817-9"
                  value={formDniCuit}
                  onChange={e => setFormDniCuit(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-1 focus:ring-[#624A3E] bg-stone-50 dark:bg-stone-950 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-stone-450 uppercase block mb-1">Nombre Completo o Razón Social *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej. Juan Pérez"
                  value={formNombre}
                  onChange={e => setFormNombre(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-1 focus:ring-[#624A3E] bg-stone-50 dark:bg-stone-950 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-stone-450 uppercase block mb-1">Correo Electrónico (Opcional)</label>
                <input 
                  type="email" 
                  placeholder="Ej. juan.perez@email.com"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-1 focus:ring-[#624A3E] bg-stone-50 dark:bg-stone-950"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-stone-450 uppercase block mb-1">Teléfono de Contacto (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ej. +54 11 5555-1234"
                  value={formTelefono}
                  onChange={e => setFormTelefono(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-1 focus:ring-[#624A3E] bg-stone-50 dark:bg-stone-950"
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold uppercase rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 btn-premium-primary text-[#FAF7F0] font-bold uppercase rounded-xl shadow-md cursor-pointer active:scale-95 transition-all"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && selectedCliente && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel rounded-[20px] p-6 w-full max-w-md shadow-2xl border border-stone-200/40 dark:border-stone-800/40 text-stone-850 dark:text-stone-100 bg-white dark:bg-stone-900 font-sans">
            <div className="flex justify-between items-center border-b border-stone-200/50 dark:border-stone-800/60 pb-3 mb-4">
              <h3 className="font-serif font-black text-lg text-[#624A3E] dark:text-[#C8956A]">Modificar Cliente</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-stone-100 rounded-full text-stone-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditCliente} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-black text-stone-450 uppercase block mb-1">DNI o CUIT (Lectura)</label>
                <input 
                  type="text" 
                  disabled
                  value={formDniCuit}
                  className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 font-mono font-bold text-stone-500 opacity-60 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-stone-450 uppercase block mb-1">Nombre Completo o Razón Social *</label>
                <input 
                  type="text" 
                  required
                  value={formNombre}
                  onChange={e => setFormNombre(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-1 focus:ring-[#624A3E] bg-stone-50 dark:bg-stone-950 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-stone-450 uppercase block mb-1">Correo Electrónico</label>
                <input 
                  type="email" 
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-1 focus:ring-[#624A3E] bg-stone-50 dark:bg-stone-950"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-stone-450 uppercase block mb-1">Teléfono de Contacto</label>
                <input 
                  type="text" 
                  value={formTelefono}
                  onChange={e => setFormTelefono(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-1 focus:ring-[#624A3E] bg-stone-50 dark:bg-stone-950"
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="w-1/2 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold uppercase rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 btn-premium-primary text-[#FAF7F0] font-bold uppercase rounded-xl shadow-md cursor-pointer active:scale-95 transition-all"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST POINTS MODAL */}
      {showAdjustModal && selectedCliente && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel rounded-[20px] p-6 w-full max-w-md shadow-2xl border border-stone-200/40 dark:border-stone-800/40 text-stone-850 dark:text-stone-100 bg-white dark:bg-stone-900 font-sans">
            <div className="flex justify-between items-center border-b border-stone-200/50 dark:border-stone-800/60 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <h3 className="font-serif font-black text-lg text-[#624A3E] dark:text-[#C8956A]">Ajuste Manual de Puntos</h3>
              </div>
              <button onClick={() => setShowAdjustModal(false)} className="p-1 hover:bg-stone-100 rounded-full text-stone-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 bg-amber-500/5 border border-amber-500/20 p-3.5 rounded-xl text-xs text-stone-700 dark:text-stone-300">
              <p className="font-bold">Cliente: <span className="font-normal text-stone-900 dark:text-stone-100">{selectedCliente.nombre}</span></p>
              <p className="font-bold mt-1">Saldo de Puntos Actual: <span className="font-mono bg-amber-100 dark:bg-amber-500/10 px-2 py-0.5 rounded text-amber-800 dark:text-amber-400 font-extrabold">{selectedCliente.puntos} pts</span></p>
            </div>

            <form onSubmit={handleAdjustPoints} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-black text-stone-450 uppercase block mb-1">Nuevo Balance de Puntos *</label>
                <input 
                  type="number" 
                  required
                  placeholder="Ej. 500"
                  value={adjustPointsInput}
                  onChange={e => setAdjustPointsInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-1 focus:ring-[#624A3E] bg-stone-50 dark:bg-stone-950 font-mono font-black"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-stone-450 uppercase block mb-1">Motivo o Justificación del Ajuste *</label>
                <textarea 
                  required
                  placeholder="Ej. Compensación por demora en la entrega del pedido #1254"
                  value={adjustReasonInput}
                  onChange={e => setAdjustReasonInput(e.target.value)}
                  className="w-full h-20 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-1 focus:ring-[#624A3E] bg-stone-50 dark:bg-stone-950 text-xs"
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="w-1/2 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold uppercase rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold uppercase rounded-xl shadow-md cursor-pointer active:scale-95 transition-all"
                >
                  Aplicar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
