import React, { useState, useEffect } from 'react';
import { Save, Upload, Check, AlertCircle, Sparkles, Image as ImageIcon } from 'lucide-react';
import { menuDiarioService, MenuDiarioDia, INITIAL_MENU_DIARIO } from '../services/menuDiarioService';
import { useToast, ToastContainer } from './ToastContainer';
import { EventoLog } from '../types';

interface MenuDiarioModuleProps {
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

const DIAS_KEYS: MenuDiarioDia['dia'][] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

const CATEGORIAS_OPCIONES = [
  'Minutas & Especiales',
  'Entradas',
  'Pastas',
  'Carnes',
  'Pescados',
  'Comidas Criollas',
  'Postres',
  'Bebidas con Alcohol',
  'Bebidas sin Alcohol',
  'Bodega'
];

export default function MenuDiarioModule({ addLog }: MenuDiarioModuleProps) {
  const { toast, toasts, removeToast } = useToast();
  const [semana, setSemana] = useState<Record<string, MenuDiarioDia>>(INITIAL_MENU_DIARIO);
  const [selectedDia, setSelectedDia] = useState<MenuDiarioDia['dia']>('lunes');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states for active day
  const activeItem = semana[selectedDia] || INITIAL_MENU_DIARIO[selectedDia];
  const [nombre, setNombre] = useState(activeItem.nombre);
  const [categoria, setCategoria] = useState(activeItem.categoria);
  const [precio, setPrecio] = useState(String(activeItem.precio));
  const [descripcion, setDescripcion] = useState(activeItem.descripcion);
  const [imagenUrl, setImagenUrl] = useState(activeItem.imagen_url || '');
  const [activo, setActivo] = useState(activeItem.activo);

  useEffect(() => {
    menuDiarioService.list()
      .then(data => {
        setSemana(data);
        setLoading(false);
      })
      .catch(err => {
        console.warn('Error al cargar menú diario:', err);
        setLoading(false);
      });
  }, []);

  // Update local form state when selected day changes
  useEffect(() => {
    const cur = semana[selectedDia] || INITIAL_MENU_DIARIO[selectedDia];
    setNombre(cur.nombre);
    setCategoria(cur.categoria);
    setPrecio(String(cur.precio));
    setDescripcion(cur.descripcion);
    setImagenUrl(cur.imagen_url || '');
    setActivo(cur.activo);
  }, [selectedDia, semana]);

  // Image compressor for HD photo uploads
  const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor seleccione un archivo de imagen válido.');
      return;
    }
    try {
      toast.info('Procesando foto...');
      const base64 = await processImageFile(file);
      setImagenUrl(base64);
      toast.success('Foto cargada correctamente.');
    } catch {
      toast.error('No se pudo procesar la imagen.');
    }
  };

  const handleSaveActiveDay = async () => {
    setSaving(true);
    const parsedPrecio = parseFloat(precio) || 0;
    const updatedDia: MenuDiarioDia = {
      dia: selectedDia,
      nombre_dia: activeItem.nombre_dia,
      activo,
      nombre: nombre.trim(),
      categoria,
      precio: parsedPrecio,
      descripcion: descripcion.trim(),
      imagen_url: imagenUrl.trim() || undefined
    };

    const newSemana = { ...semana, [selectedDia]: updatedDia };
    setSemana(newSemana);

    try {
      await menuDiarioService.saveDay(updatedDia);
      toast.success(`Menú del ${updatedDia.nombre_dia} guardado correctamente.`);
      addLog('sistema', `MENÚ DIARIO: Actualizada propuesta para el día ${updatedDia.nombre_dia} ("${updatedDia.nombre}" - $${updatedDia.precio}).`);
    } catch (err) {
      console.error('Error al guardar día:', err);
      toast.error('No se pudo guardar el menú en la base de datos.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSemanaCompleta = async () => {
    setSaving(true);
    const parsedPrecio = parseFloat(precio) || 0;
    const updatedActiveDia: MenuDiarioDia = {
      dia: selectedDia,
      nombre_dia: activeItem.nombre_dia,
      activo,
      nombre: nombre.trim(),
      categoria,
      precio: parsedPrecio,
      descripcion: descripcion.trim(),
      imagen_url: imagenUrl.trim() || undefined
    };

    const newSemana = { ...semana, [selectedDia]: updatedActiveDia };
    setSemana(newSemana);

    try {
      await menuDiarioService.saveAll(newSemana);
      toast.success('¡Semana completa guardada y sincronizada correctamente!');
      addLog('sistema', 'MENÚ DIARIO: Guardada y sincronizada la rotación completa de Lunes a Domingo.');
    } catch (err) {
      console.error('Error al guardar semana:', err);
      toast.error('No se pudo guardar la semana completa.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left animate-fadeIn">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* HEADER PRINCIPAL DE CONFIGURACIÓN */}
      <div className="bg-[#FAF7F0] dark:bg-[#1E140E] p-6 rounded-3xl border border-[#8C6239]/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-black text-[#8C6239] dark:text-[#C8956A] uppercase tracking-widest block font-sans">
            Configuración de Rotación Diaria & Portada
          </span>
          <h2 className="text-xl md:text-2xl font-black text-stone-900 dark:text-stone-100 font-serif-rustic">
            Pizarra & Menú del Día Semanal (Lunes a Domingo)
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-400 italic font-serif-rustic max-w-2xl">
            Configure las propuestas del día para cada día de la semana. Se sincronizan automáticamente con el POS del Mozo y la Portada Publicitaria.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleSaveActiveDay}
            disabled={saving}
            className="px-4 py-2.5 bg-[#4A2B1D] text-white hover:bg-[#624A3E] active:scale-95 transition-all text-xs font-black rounded-xl shadow-md flex items-center gap-2 cursor-pointer border border-[#8C6239]/30"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>GUARDAR ({activeItem.nombre_dia})</span>
          </button>

          <button
            type="button"
            onClick={handleSaveSemanaCompleta}
            disabled={saving}
            className="px-4 py-2.5 bg-black text-white hover:bg-stone-900 active:scale-95 transition-all text-xs font-black rounded-xl shadow-md flex items-center gap-2 cursor-pointer border border-white/20"
          >
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>GUARDAR SEMANA COMPLETA</span>
          </button>
        </div>
      </div>

      {/* STRIP BARRAS DE DÍAS (LUNES A DOMINGO) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {DIAS_KEYS.map(diaKey => {
          const item = semana[diaKey] || INITIAL_MENU_DIARIO[diaKey];
          const isSelected = selectedDia === diaKey;

          return (
            <button
              key={diaKey}
              type="button"
              onClick={() => setSelectedDia(diaKey)}
              className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between h-24 ${
                isSelected
                  ? 'bg-[#4A2B1D] text-white border-[#8C6239] shadow-lg ring-2 ring-[#C8956A]/40 scale-[1.02]'
                  : 'bg-white dark:bg-[#251B12] text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-850 hover:border-[#8C6239]/50 hover:bg-[#FAF7F0]'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className={`text-xs font-black tracking-wider ${isSelected ? 'text-amber-300' : 'text-stone-900 dark:text-stone-100'}`}>
                  {item.nombre_dia}
                </span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                  item.activo 
                    ? (isSelected ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300') 
                    : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                }`}>
                  {item.activo ? 'ON' : 'OFF'}
                </span>
              </div>

              <div className="space-y-0.5 min-w-0">
                <p className={`text-[11px] font-bold truncate leading-tight ${isSelected ? 'text-stone-100' : 'text-stone-700 dark:text-stone-300'}`}>
                  {item.nombre || 'Sin plato assignado'}
                </p>
                <p className={`text-[10px] font-mono font-black ${isSelected ? 'text-amber-400' : 'text-[#8C6239] dark:text-[#C8956A]'}`}>
                  ${item.precio.toLocaleString('es-AR')}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* TARJETA DE EDICIÓN DEL DÍA SELECCIONADO */}
      <div className="bg-[#FAF7F0] dark:bg-[#1E140E] p-6 rounded-3xl border border-[#8C6239]/20 shadow-md space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-stone-200/80 dark:border-stone-800">
          <div>
            <span className="text-[10px] font-black text-[#8C6239] dark:text-[#C8956A] uppercase tracking-widest block">
              EDICIÓN DE MENÚ — {activeItem.nombre_dia}
            </span>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 font-serif-rustic capitalize">
              {nombre || 'Plato sin título'}
            </h3>
          </div>

          <div className="flex items-center gap-3 bg-white dark:bg-[#251B12] px-4 py-2 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs">
            <span className="text-xs font-black text-stone-700 dark:text-stone-300 uppercase tracking-wider">
              ESTADO DEL DÍA:
            </span>
            <button
              type="button"
              onClick={() => setActivo(!activo)}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                activo 
                  ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                  : 'bg-stone-300 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
              }`}
            >
              <span>{activo ? 'ACTIVO [ON]' : 'INACTIVO [OFF]'}</span>
            </button>
          </div>
        </div>

        {/* CAMPOS DE FORMULARIO DE 3 COLUMNAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-black text-stone-600 dark:text-stone-300 uppercase block mb-1.5">
              NOMBRE / TÍTULO DEL PLATO *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej. Canelones con salsa mixta"
              className="w-full border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#251B12] text-stone-900 dark:text-stone-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#8C6239] font-bold"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-stone-600 dark:text-stone-300 uppercase block mb-1.5">
              TIPO DE MENÚ / CATEGORÍA *
            </label>
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
              className="w-full border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#251B12] text-stone-900 dark:text-stone-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#8C6239] font-bold cursor-pointer"
            >
              {CATEGORIAS_OPCIONES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-stone-600 dark:text-stone-300 uppercase block mb-1.5">
              PRECIO PROMOCIONAL ($ ARS) *
            </label>
            <input
              type="number"
              min={0}
              step={100}
              value={precio}
              onChange={e => setPrecio(e.target.value)}
              placeholder="Ej. 8500"
              className="w-full border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#251B12] text-stone-900 dark:text-stone-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#8C6239] font-bold font-mono text-center"
              required
            />
          </div>
        </div>

        {/* DESCRIPCIÓN */}
        <div>
          <label className="text-[10px] font-black text-stone-600 dark:text-stone-300 uppercase block mb-1.5">
            DESCRIPCIÓN DE LA PROPUESTA *
          </label>
          <textarea
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            rows={3}
            placeholder="Los rellenos más tradicionales incluyen espinaca o acelga con ricota y nuez moscada, pollo desmenuzado..."
            className="w-full border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#251B12] text-stone-900 dark:text-stone-100 rounded-2xl p-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#8C6239] font-medium resize-none leading-relaxed"
            required
          />
        </div>

        {/* SECCIÓN DE FOTO Y VISTA PREVIA (2 COLUMNAS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* UPLOAD FOTO */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-stone-600 dark:text-stone-300 uppercase block">
              IMAGEN REPRESENTATIVA (URL O CARGAR FOTO HD)
            </label>

            <input
              type="text"
              value={imagenUrl}
              onChange={e => setImagenUrl(e.target.value)}
              placeholder="https://servidor/imagen.jpg"
              className="w-full border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#251B12] text-stone-900 dark:text-stone-100 rounded-xl px-3.5 py-2 text-xs focus:outline-none font-mono"
            />

            <div className="p-4 bg-white dark:bg-[#251B12] rounded-2xl border border-dashed border-[#8C6239]/40 text-center space-y-2">
              <span className="text-[10px] font-black uppercase text-[#8C6239] dark:text-[#C8956A] block flex items-center justify-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" />
                CARGAR FOTO HD DESDE CELULAR / PC
              </span>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#8C6239] hover:bg-[#624A3E] text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-xs">
                <Upload className="w-3.5 h-3.5" />
                <span>Seleccionar archivo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* VISTA PREVIA */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-stone-600 dark:text-stone-300 uppercase block">
              VISTA PREVIA (PUBLICIDAD Y MENÚ)
            </label>
            <div className="h-36 w-full rounded-2xl overflow-hidden border border-stone-300 dark:border-stone-800 bg-stone-100 dark:bg-stone-900 relative shadow-inner flex items-center justify-center">
              {imagenUrl ? (
                <img
                  src={imagenUrl}
                  alt={nombre}
                  className="w-full h-full object-cover"
                  onError={() => setImagenUrl('')}
                />
              ) : (
                <div className="text-center p-4 space-y-1">
                  <ImageIcon className="w-8 h-8 text-stone-400 mx-auto" />
                  <p className="text-[10px] font-bold text-stone-400">Sin vista previa disponible</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PIE Y BOTÓN FINAL */}
        <div className="pt-4 border-t border-stone-200/80 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-stone-500 italic">
            * Cambios guardados para {activeItem.nombre_dia} impactan inmediatamente en el menú del día.
          </p>

          <button
            type="button"
            onClick={handleSaveActiveDay}
            disabled={saving}
            className="w-full sm:w-auto px-6 py-3 bg-[#4A2B1D] text-white hover:bg-[#624A3E] active:scale-95 transition-all text-xs font-black rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer border border-[#8C6239]/40"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>GUARDAR MENÚ DE {activeItem.nombre_dia}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
