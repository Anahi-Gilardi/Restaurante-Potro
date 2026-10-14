import React, { useState, useEffect } from 'react';
import { Save, Upload, Sparkles, Image as ImageIcon, Trash2 } from 'lucide-react';
import { menuDiarioService, MenuDiarioDia, INITIAL_MENU_DIARIO } from '../services/menuDiarioService';
import { useToast, ToastContainer } from './ToastContainer';
import { EventoLog } from '../types';

interface MenuDiarioModuleProps {
  addLog: (tipo: EventoLog['tipo'], mensaje: string) => void;
}

const DIAS_KEYS: MenuDiarioDia['dia'][] = ['miercoles', 'jueves', 'viernes'];

const DEFAULT_TITLES: Record<MenuDiarioDia['dia'], string> = {
  lunes: 'Menú Ejecutivo Lunes',
  martes: 'Menú Ejecutivo Martes',
  miercoles: 'Menú Ejecutivo Miércoles',
  jueves: 'Menú Ejecutivo Jueves',
  viernes: 'Menú Ejecutivo Viernes',
  sabado: 'Menú Ejecutivo Sábado',
  domingo: 'Menú Ejecutivo Domingo'
};

function parseCleanPrice(raw: string | number): number {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? Math.round(raw) : 0;
  const trimmed = String(raw || '').trim();
  if (!trimmed) return 0;
  // Si escribieron 24.300 con punto de miles, quitamos todos los caracteres no numéricos
  const digitsOnly = trimmed.replace(/[^0-9]/g, '');
  if (!digitsOnly) return 0;
  return parseInt(digitsOnly, 10) || 0;
}

export default function MenuDiarioModule({ addLog }: MenuDiarioModuleProps) {
  const { toast, toasts, removeToast } = useToast();
  const [semana, setSemana] = useState<Record<string, MenuDiarioDia>>(INITIAL_MENU_DIARIO);
  const [selectedDia, setSelectedDia] = useState<MenuDiarioDia['dia']>('miercoles');
  const [, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states for active day (solo Imagen + Precio + Estado Activo)
  const activeItem = semana[selectedDia] || INITIAL_MENU_DIARIO[selectedDia];
  const [precio, setPrecio] = useState(activeItem.precio > 0 ? String(activeItem.precio) : '');
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
    setPrecio(cur.precio > 0 ? String(cur.precio) : '');
    setImagenUrl(cur.imagen_url || '');
    setActivo(cur.activo);
  }, [selectedDia, semana]);

  // Image compressor for HD vertical flyer uploads (preserves full aspect ratio and crisp text)
  const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1280;
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
          resolve(canvas.toDataURL('image/jpeg', 0.88));
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
      toast.info('Procesando imagen del menú...');
      const base64 = await processImageFile(file);
      setImagenUrl(base64);
      toast.success('Imagen cargada correctamente.');
    } catch {
      toast.error('No se pudo procesar la imagen.');
    }
  };

  const buildUpdatedDay = (): MenuDiarioDia => {
    const parsedPrecio = parseCleanPrice(precio);
    const defaultTitle = DEFAULT_TITLES[selectedDia] || `Menú Ejecutivo ${activeItem.nombre_dia}`;
    return {
      dia: selectedDia,
      nombre_dia: activeItem.nombre_dia,
      activo,
      nombre: defaultTitle,
      categoria: 'Menú Ejecutivo',
      precio: parsedPrecio,
      descripcion: 'Entrada, plato principal y postre del día.',
      imagen_url: imagenUrl.trim() || undefined
    };
  };

  const handleSaveActiveDay = async () => {
    setSaving(true);
    const updatedDia = buildUpdatedDay();
    setPrecio(updatedDia.precio > 0 ? String(updatedDia.precio) : '');

    const newSemana = { ...semana, [selectedDia]: updatedDia };
    setSemana(newSemana);

    try {
      await menuDiarioService.saveDay(updatedDia);
      toast.success(`Menú del ${updatedDia.nombre_dia} guardado correctamente.`);
      addLog('sistema', `MENÚ DIARIO: Actualizado flyer y precio para ${updatedDia.nombre_dia} ($${updatedDia.precio.toLocaleString('es-AR')}).`);
    } catch (err) {
      console.error('Error al guardar día:', err);
      toast.error('No se pudo guardar el menú en la base de datos.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSemanaCompleta = async () => {
    setSaving(true);
    const updatedActiveDia = buildUpdatedDay();
    setPrecio(updatedActiveDia.precio > 0 ? String(updatedActiveDia.precio) : '');

    const newSemana = { ...semana, [selectedDia]: updatedActiveDia };
    setSemana(newSemana);

    try {
      await menuDiarioService.saveAll(newSemana);
      toast.success('¡Menús ejecutivos guardados y sincronizados correctamente!');
      addLog('sistema', 'MENÚ DIARIO: Guardada y sincronizada la rotación de Miércoles a Viernes.');
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
            Pizarra & Menú del Día (Miércoles a Viernes)
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-400 italic font-serif-rustic max-w-2xl">
            Cargue el flyer vertical del día y su precio promocional. Se visualizará completo en la Portada Publicitaria y en la terminal del Mozo.
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
            <span>GUARDAR DÍAS ACTIVOS</span>
          </button>
        </div>
      </div>

      {/* STRIP BARRAS DE DÍAS (MIÉRCOLES A VIERNES) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {DIAS_KEYS.map(diaKey => {
          const item = semana[diaKey] || INITIAL_MENU_DIARIO[diaKey];
          const isSelected = selectedDia === diaKey;

          return (
            <button
              key={diaKey}
              type="button"
              onClick={() => setSelectedDia(diaKey)}
              className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between h-24 ${
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
                  {item.imagen_url ? '📷 Flyer cargado' : 'Menú Ejecutivo'}
                </p>
                <p className={`text-xs font-mono font-black ${isSelected ? 'text-amber-400' : 'text-[#8C6239] dark:text-[#C8956A]'}`}>
                  ${(item.precio || 0).toLocaleString('es-AR')}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* TARJETA DE EDICIÓN DEL DÍA SELECCIONADO (SOLO IMAGEN + PRECIO) */}
      <div className="bg-[#FAF7F0] dark:bg-[#1E140E] p-6 rounded-3xl border border-[#8C6239]/20 shadow-md space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-200/80 dark:border-stone-800">
          <div>
            <span className="text-[10px] font-black text-[#8C6239] dark:text-[#C8956A] uppercase tracking-widest block">
              EDICIÓN DE MENÚ — {activeItem.nombre_dia}
            </span>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 font-serif-rustic">
              Menú Ejecutivo · {activeItem.nombre_dia}
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

        {/* SECCIÓN DE CARGA (IZQUIERDA) Y VISTA PREVIA COMPLETA DEL FLYER (DERECHA) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUMNA IZQUIERDA: PRECIO + CARGA DE IMAGEN */}
          <div className="lg:col-span-5 space-y-5">
            {/* PRECIO PROMOCIONAL */}
            <div className="bg-white dark:bg-[#251B12] p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-2">
              <label className="text-[11px] font-black text-stone-700 dark:text-stone-200 uppercase block">
                PRECIO PROMOCIONAL ($ ARS) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-black text-[#8C6239] font-mono">
                  $
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={precio}
                  onChange={e => {
                    // Permite escribir números limpios sin cero adelante
                    const clean = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '');
                    setPrecio(clean);
                  }}
                  placeholder="Ej: 24300"
                  className="w-full border border-stone-300 dark:border-stone-700 bg-[#FAF7F0] dark:bg-[#1E140E] text-stone-900 dark:text-stone-100 rounded-xl pl-9 pr-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#8C6239] font-black font-mono"
                  required
                />
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                Valor a cobrar en Salón / Mozo: <strong className="text-[#8C6239] dark:text-[#C8956A] font-mono">${parseCleanPrice(precio).toLocaleString('es-AR')}</strong>
              </p>
            </div>

            {/* CARGAR IMAGEN DEL FLYER */}
            <div className="bg-white dark:bg-[#251B12] p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-stone-700 dark:text-stone-200 uppercase block">
                  IMAGEN DEL MENÚ (FLYER VERTICAL)
                </label>
                {imagenUrl && (
                  <button
                    type="button"
                    onClick={() => setImagenUrl('')}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Quitar imagen
                  </button>
                )}
              </div>

              <div className="p-6 bg-[#FAF7F0] dark:bg-[#1E140E] rounded-2xl border-2 border-dashed border-[#8C6239]/40 text-center space-y-3">
                <ImageIcon className="w-8 h-8 text-[#8C6239] mx-auto" />
                <span className="text-[11px] font-black uppercase text-[#8C6239] dark:text-[#C8956A] block">
                  CARGAR FLYER DESDE CELULAR / PC
                </span>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  La imagen se mostrará completa sin recortes en la sección publicitaria.
                </p>
                <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#8C6239] hover:bg-[#624A3E] text-white text-xs font-black rounded-xl cursor-pointer transition-all shadow-md">
                  <Upload className="w-4 h-4" />
                  <span>Seleccionar imagen</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase block mb-1">
                  O pegar URL de imagen (opcional)
                </label>
                <input
                  type="text"
                  value={imagenUrl.startsWith('data:') ? '' : imagenUrl}
                  onChange={e => setImagenUrl(e.target.value)}
                  placeholder="https://servidor/imagen.jpg"
                  className="w-full border border-stone-200 dark:border-stone-700 bg-[#FAF7F0] dark:bg-[#1E140E] text-stone-900 dark:text-stone-100 rounded-xl px-3.5 py-2 text-xs focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: VISTA PREVIA COMPLETA (SIN RECORTAR) */}
          <div className="lg:col-span-7 space-y-2">
            <label className="text-[11px] font-black text-stone-700 dark:text-stone-200 uppercase block">
              VISTA PREVIA COMPLETA (ASÍ SE VERÁ EN LA PARTE PUBLICITARIA)
            </label>
            <div className="w-full rounded-3xl overflow-hidden border border-[#8C6239]/30 bg-[#1A110B] p-4 sm:p-6 shadow-xl flex items-center justify-center min-h-[380px]">
              {imagenUrl ? (
                <img
                  src={imagenUrl}
                  alt={`Menú Ejecutivo ${activeItem.nombre_dia}`}
                  className="w-full max-w-[360px] h-auto max-h-[580px] object-contain rounded-2xl shadow-2xl border border-white/10 mx-auto block"
                  onError={() => setImagenUrl('')}
                />
              ) : (
                <div className="text-center p-8 space-y-2">
                  <ImageIcon className="w-12 h-12 text-stone-500 mx-auto opacity-60" />
                  <p className="text-xs font-bold text-stone-300">Sin imagen cargada para {activeItem.nombre_dia}</p>
                  <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
                    Suba el flyer vertical del día para visualizarlo completo aquí y en la portada publicitaria.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PIE Y BOTÓN FINAL */}
        <div className="pt-4 border-t border-stone-200/80 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-stone-500 italic">
            * Al guardar, la imagen completa y el precio de {activeItem.nombre_dia} se actualizan inmediatamente en la Portada Publicitaria y en el módulo Mozo.
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
