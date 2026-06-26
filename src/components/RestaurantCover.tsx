import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Phone, 
  Mail, 
  ArrowRight, 
  UtensilsCrossed, 
  Award, 
  Sparkles, 
  ChefHat, 
  Wine, 
  ChevronRight, 
  CheckCircle,
  Menu,
  X
} from 'lucide-react';

interface RestaurantCoverProps {
  onEnterSystem: () => void;
}

export default function RestaurantCover({ onEnterSystem }: RestaurantCoverProps) {
  // Mobile Nav Drawer Toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Booking states
  const [bookingForm, setBookingForm] = useState({
    nombre: '',
    telefono: '',
    personas: '2',
    fecha: '',
    hora: '21:00'
  });
  const [showBookingSuccess, setShowBookingSuccess] = useState(false);

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.nombre || !bookingForm.telefono || !bookingForm.fecha) {
      alert('Por favor complete los campos obligatorios para solicitar su mesa.');
      return;
    }

    // Format date from YYYY-MM-DD to DD/MM/YYYY
    const parts = bookingForm.fecha.split('-');
    const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : bookingForm.fecha;

    const cleanPhone = '5491148029988'; // El Patron WhatsApp line
    const text = `¡Hola El Patrón! Me gustaría solicitar una reserva:\n\n` +
      `• Nombre: ${bookingForm.nombre}\n` +
      `• Teléfono: ${bookingForm.telefono}\n` +
      `• Comensales: ${bookingForm.personas} ${parseInt(bookingForm.personas) === 1 ? 'persona' : 'personas'}\n` +
      `• Fecha: ${formattedDate}\n` +
      `• Hora: ${bookingForm.hora} hs\n\n` +
      `¡Muchas gracias!`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');

    setShowBookingSuccess(true);
  };

  const closeBookingSuccess = () => {
    setShowBookingSuccess(false);
    setBookingForm({
      nombre: '',
      telefono: '',
      personas: '2',
      fecha: '',
      hora: '21:00'
    });
  };

  const specialties = [
    {
      id: 'spec_1',
      title: 'Ojo de Bife Madurado',
      description: 'Corte de 450g madurado en seco durante 28 días, asado a leña de quebracho colorado y servido con chimichurri casero.',
      tag: 'El Favorito de la Casa',
      image: '/images/ojo_de_bife_grill.png'
    },
    {
      id: 'spec_2',
      title: 'Provoleta al Hierro',
      description: 'Queso provolone fundido al crocante con oliva, orégano fresco, rodajas de tomate cherry y albahaca.',
      tag: 'Entrada Caliente',
      image: '/images/provoleta_hierro.png'
    },
    {
      id: 'spec_3',
      title: 'Cintas Caseras al Sepia',
      description: 'Pasta fresca amasada al huevo con tinta de calamar, salteada con langostinos al ajillo, tomates secos y vino blanco.',
      tag: 'Pasta de Autor',
      image: '/images/cintas_sepia_pasta.png'
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F0] dark:bg-[#1A110B] text-stone-900 dark:text-[#FAF7F0] font-sans selection:bg-[#624A3E] selection:text-white transition-colors duration-300">
      
      {/* 1. FLOATING HEADER */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#FAF7F0]/80 dark:bg-[#1A110B]/80 border-b border-[#624A3E]/10 dark:border-amber-900/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-9 h-9 bg-[#624A3E] dark:bg-amber-500 rounded-xl flex items-center justify-center shadow-md">
              <UtensilsCrossed className="w-5 h-5 text-white dark:text-[#1A110B]" />
            </div>
            <span className="font-extrabold text-lg tracking-tight font-sans text-[#624A3E] dark:text-amber-500">
              EL PATRÓN
            </span>
          </div>

          {/* Desktop Navigation links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-stone-600 dark:text-stone-300">
            <a href="#especialidades" className="hover:text-[#624A3E] dark:hover:text-amber-400 transition-colors">Especialidades</a>
            <a href="#experiencia" className="hover:text-[#624A3E] dark:hover:text-amber-400 transition-colors">Bodega</a>
            <a href="#reserva" className="hover:text-[#624A3E] dark:hover:text-amber-400 transition-colors">Reservas</a>
            <a href="#contacto" className="hover:text-[#624A3E] dark:hover:text-amber-400 transition-colors">Ubicación</a>
          </nav>

          {/* Action Gateway Button */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onEnterSystem}
              className="px-4 py-2 bg-[#624A3E] hover:bg-[#4A2D1B] dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-[#1A110B] rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg flex items-center gap-2"
            >
              Acceder al Sistema
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={onEnterSystem}
              className="px-3 py-1.5 bg-[#624A3E] dark:bg-amber-500 text-white dark:text-[#1A110B] rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
            >
              Acceder
            </button>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-stone-700 dark:text-stone-300 hover:bg-[#624A3E]/10"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden w-full bg-[#FAF7F0] dark:bg-[#1C140E] border-b border-[#624A3E]/10 px-6 py-4 space-y-3 flex flex-col font-medium"
          >
            <a href="#especialidades" onClick={() => setMobileMenuOpen(false)} className="py-2 text-stone-700 dark:text-stone-300 border-b border-stone-100 dark:border-stone-850">Especialidades</a>
            <a href="#experiencia" onClick={() => setMobileMenuOpen(false)} className="py-2 text-stone-700 dark:text-stone-300 border-b border-stone-100 dark:border-stone-850">Bodega</a>
            <a href="#reserva" onClick={() => setMobileMenuOpen(false)} className="py-2 text-stone-700 dark:text-stone-300 border-b border-stone-100 dark:border-stone-850">Reservas</a>
            <a href="#contacto" onClick={() => setMobileMenuOpen(false)} className="py-2 text-stone-700 dark:text-stone-300">Ubicación</a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden py-20 lg:py-28 bg-[#1A110B] text-white flex items-center">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 select-none pointer-events-none"
          style={{ backgroundImage: `url('/images/ojo_de_bife_grill.png')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1A110B] via-[#1A110B]/80 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
          <div className="max-w-2xl space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-bold uppercase tracking-wider"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Gastronomía de Autor & Fuegos Criollos
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black font-sans leading-tight tracking-tight text-[#FAF7F0]"
            >
              El Verdadero Sabor <br />
              <span className="text-amber-500">Del Fuego Criollo</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-stone-300 text-sm sm:text-base md:text-lg max-w-xl font-medium leading-relaxed"
            >
              Carnes seleccionadas maduradas en seco, pastas amasadas a mano diariamente y una exclusiva selección de bodega. Te invitamos a vivir la experiencia de El Patrón.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap items-center gap-4 pt-4"
            >
              <a 
                href="#reserva"
                className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-[#1A110B] rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg hover:scale-[1.02] flex items-center gap-2"
              >
                Solicitar Reserva
                <Calendar className="w-4 h-4" />
              </a>
              <a 
                href="#especialidades"
                className="px-6 py-3.5 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer hover:scale-[1.02]"
              >
                Ver Especialidades
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. CORE STATS / VALUES BAR */}
      <section className="bg-[#FAF7F0] dark:bg-[#201710] py-8 border-y border-[#624A3E]/10 dark:border-amber-900/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center p-3 space-y-1">
            <Award className="w-7 h-7 text-[#624A3E] dark:text-amber-500" />
            <span className="font-extrabold text-sm uppercase text-[#624A3E] dark:text-amber-400">Cortes Premium</span>
            <span className="text-[11px] text-stone-500 dark:text-stone-400">Maduración controlada Dry Aged</span>
          </div>
          <div className="flex flex-col items-center p-3 space-y-1 border-y sm:border-y-0 sm:border-x border-stone-200 dark:border-stone-800">
            <ChefHat className="w-7 h-7 text-[#624A3E] dark:text-amber-500" />
            <span className="font-extrabold text-sm uppercase text-[#624A3E] dark:text-amber-400">Cocina de Autor</span>
            <span className="text-[11px] text-stone-500 dark:text-stone-400">Pastas frescas y recetas tradicionales</span>
          </div>
          <div className="flex flex-col items-center p-3 space-y-1">
            <Wine className="w-7 h-7 text-[#624A3E] dark:text-amber-500" />
            <span className="font-extrabold text-sm uppercase text-[#624A3E] dark:text-amber-400">Cava Selecta</span>
            <span className="text-[11px] text-stone-500 dark:text-stone-400">Vinos de alta gama para maridajes</span>
          </div>
        </div>
      </section>

      {/* 4. SPECIALTIES SECTION */}
      <section id="especialidades" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs uppercase font-black text-amber-600 dark:text-amber-400 tracking-widest">Nuestra Carta</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-sans text-stone-900 dark:text-white">
            Especialidades de El Patrón
          </h2>
          <div className="w-16 h-1 bg-[#624A3E] dark:bg-amber-500 mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {specialties.map((spec) => (
            <motion.div
              key={spec.id}
              whileHover={{ y: -6 }}
              className="bg-white dark:bg-[#251B12] rounded-3xl overflow-hidden border border-stone-200/60 dark:border-stone-850 shadow-md flex flex-col h-full"
            >
              <div className="h-56 relative overflow-hidden bg-stone-100 dark:bg-stone-900">
                <img 
                  src={spec.image} 
                  alt={spec.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  onError={(e) => {
                    // Fallback to placeholder if local image fails
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600';
                  }}
                />
                <span className="absolute top-4 left-4 px-3 py-1 bg-[#624A3E] dark:bg-amber-500 text-white dark:text-[#1A110B] text-[10px] font-black uppercase rounded-lg shadow">
                  {spec.tag}
                </span>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-stone-900 dark:text-[#FAF7F0]">
                    {spec.title}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium leading-relaxed">
                    {spec.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 5. WINE / CELLAR SECTION (EXPERIENCIA) */}
      <section id="experiencia" className="relative py-20 lg:py-24 bg-[#1E130B] text-white overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-25 select-none pointer-events-none"
          style={{ backgroundImage: `url('/images/rutini_malbec_cellar.png')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-l from-[#1E130B] via-[#1E130B]/90 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs uppercase font-black text-amber-400 tracking-widest">Maridaje Seleccionado</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-sans text-[#FAF7F0]">
              La Cava de El Patrón
            </h2>
            <div className="w-12 h-1 bg-amber-500 rounded-full" />
            <p className="text-stone-300 text-xs sm:text-sm font-medium leading-relaxed">
              Un buen corte merece ser maridado con un gran exponente. Por eso, diseñamos nuestra cava con una amplia colección de varietales argentinos.
            </p>
            <p className="text-stone-300 text-xs sm:text-sm font-medium leading-relaxed">
              Contamos con etiquetas exclusivas de la bodega <strong>Rutini</strong>, Malbecs mendocinos intensos con notas de ciruelas rojas y vainilla, y Cabernet Sauvignon madurados en barricas de roble francés, garantizando que cada bocado de carne sea una celebración para el paladar.
            </p>
            <div className="pt-2 flex items-center gap-4 text-xs font-bold text-amber-400">
              <span className="flex items-center gap-1.5">
                <Wine className="w-4 h-4" /> Cabernet
              </span>
              <span className="w-1.5 h-1.5 bg-stone-500 rounded-full" />
              <span className="flex items-center gap-1.5">
                <Wine className="w-4 h-4" /> Malbec
              </span>
              <span className="w-1.5 h-1.5 bg-stone-500 rounded-full" />
              <span className="flex items-center gap-1.5">
                <Wine className="w-4 h-4" /> Blend de Selección
              </span>
            </div>
          </div>
          <div className="lg:col-span-6 flex justify-center">
            {/* Visual Glassmorphic Vineyard info card */}
            <div className="bg-white/5 backdrop-blur-md p-8 rounded-3xl border border-white/10 max-w-sm w-full space-y-4 shadow-2xl">
              <span className="text-[10px] uppercase font-black text-amber-500 tracking-widest block">Recomendación Sommelier</span>
              <h4 className="text-xl font-bold font-sans text-[#FAF7F0]">Rutini Colección Malbec</h4>
              <p className="text-stone-300 text-xs font-medium leading-relaxed">
                De color rojo violáceo concentrado. Ofrece aromas frutados (arándanos, ciruelas) y toques de tabaco aportados por la madera. Excelente cuerpo y taninos maduros y dulces. Ideal para acompañar nuestro Ojo de Bife.
              </p>
              <div className="flex justify-between items-center pt-2 text-[10px] text-stone-400 font-bold border-t border-white/15">
                <span>Servido a temperatura óptima: 16-18°C</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BOOKING WIDGET */}
      <section id="reserva" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs uppercase font-black text-amber-600 dark:text-amber-400 tracking-widest">Planificá tu Visita</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-sans text-stone-900 dark:text-white">
            Solicitud de Reserva Online
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
            Reserve su mesa con anticipación. Le enviaremos una confirmación de disponibilidad vía teléfono o correo a la brevedad.
          </p>
          <div className="w-16 h-1 bg-[#624A3E] dark:bg-amber-500 mx-auto rounded-full" />
        </div>

        <div className="max-w-2xl mx-auto bg-white dark:bg-[#251B12] rounded-3xl p-6 sm:p-10 border border-stone-200/60 dark:border-stone-850 shadow-lg">
          <form onSubmit={handleBookingSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Nombre Completo *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Juan Pérez"
                  value={bookingForm.nombre}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-250 dark:border-stone-800 bg-[#FAF7F0] dark:bg-[#1E140E] text-stone-850 dark:text-white text-xs font-bold focus:outline-none focus:border-[#624A3E] dark:focus:border-amber-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Teléfono de Contacto *</label>
                <input 
                  type="tel" 
                  required
                  placeholder="Ej: +54 9 11 1234-5678"
                  value={bookingForm.telefono}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, telefono: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-250 dark:border-stone-800 bg-[#FAF7F0] dark:bg-[#1E140E] text-stone-850 dark:text-white text-xs font-bold focus:outline-none focus:border-[#624A3E] dark:focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Comensales</label>
                <select 
                  value={bookingForm.personas}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, personas: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-250 dark:border-stone-800 bg-[#FAF7F0] dark:bg-[#1E140E] text-stone-850 dark:text-white text-xs font-bold focus:outline-none focus:border-[#624A3E] dark:focus:border-amber-500 cursor-pointer"
                >
                  <option value="1">1 Persona</option>
                  <option value="2">2 Personas</option>
                  <option value="3">3 Personas</option>
                  <option value="4">4 Personas</option>
                  <option value="5">5 Personas</option>
                  <option value="6">6+ Personas</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Fecha *</label>
                <input 
                  type="date" 
                  required
                  value={bookingForm.fecha}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, fecha: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-250 dark:border-stone-800 bg-[#FAF7F0] dark:bg-[#1E140E] text-stone-850 dark:text-white text-xs font-bold focus:outline-none focus:border-[#624A3E] dark:focus:border-amber-500 cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Hora</label>
                <select 
                  value={bookingForm.hora}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, hora: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-250 dark:border-stone-800 bg-[#FAF7F0] dark:bg-[#1E140E] text-stone-850 dark:text-white text-xs font-bold focus:outline-none focus:border-[#624A3E] dark:focus:border-amber-500 cursor-pointer"
                >
                  <option value="12:00">12:00 hs (Almuerzo)</option>
                  <option value="13:30">13:30 hs (Almuerzo)</option>
                  <option value="20:00">20:00 hs (Cena)</option>
                  <option value="21:00">21:00 hs (Cena)</option>
                  <option value="22:30">22:30 hs (Cena)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-[#624A3E] hover:bg-[#4D352B] dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-[#1A110B] rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              Solicitar Reservación
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>

      {/* 7. CONTACT & FOOTER */}
      <footer id="contacto" className="bg-[#1C140E] text-[#FAF7F0]/80 py-16 border-t border-[#624A3E]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
          
          {/* Logo & Brand description */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                <UtensilsCrossed className="w-4 h-4 text-[#1C140E]" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-white">EL PATRÓN</span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              El verdadero sabor del fuego y las tradiciones criollas, en el corazón de Buenos Aires. Cortes Dry Aged y Cava seleccionada.
            </p>
          </div>

          {/* Horarios */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase font-black tracking-wider text-white">Nuestros Horarios</h4>
            <ul className="space-y-2 text-xs font-medium">
              <li className="flex justify-between border-b border-[#FAF7F0]/10 pb-1">
                <span>Martes a Domingo:</span>
                <span className="text-white">12:00 a 16:00 hs</span>
              </li>
              <li className="flex justify-between border-b border-[#FAF7F0]/10 pb-1">
                <span>Martes a Domingo:</span>
                <span className="text-white">20:00 a 00:00 hs</span>
              </li>
              <li className="flex justify-between">
                <span>Lunes:</span>
                <span className="text-stone-500">Cerrado</span>
              </li>
            </ul>
          </div>

          {/* Contacto Info */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase font-black tracking-wider text-white">Contacto & Reservas</h4>
            <ul className="space-y-3 text-xs">
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>+54 11 4802-9988</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>contacto@elpatronrestaurante.com.ar</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Av. Figueroa Alcorta 3420, Palermo, CABA</span>
              </li>
            </ul>
          </div>

          {/* Acceso Staff */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase font-black tracking-wider text-white">Área de Personal</h4>
            <p className="text-[11px] text-stone-400">
              Uso exclusivo para mozos, personal de cocina, cajeros y administración.
            </p>
            <button
              onClick={onEnterSystem}
              className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/15 text-white rounded-xl text-[10px] uppercase font-black tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              🔑 Acceso Administrativo
            </button>
          </div>
        </div>

        {/* Copy bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-white/5 text-center text-xs text-stone-500">
          <p>© {new Date().getFullYear()} El Patrón Restaurante. Todos los derechos reservados. Diseñado por Antigravity.</p>
        </div>
      </footer>

      {/* 8. RESERVATION SUCCESS MODAL */}
      <AnimatePresence>
        {showBookingSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeBookingSuccess}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-[#251B12] max-w-md w-full rounded-3xl p-8 border border-stone-200 dark:border-stone-850 shadow-2xl text-center space-y-5"
            >
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-10 h-10" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-stone-900 dark:text-white">
                  ¡Solicitud Enviada!
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed font-medium">
                  Se ha generado tu solicitud de reserva para <strong>{bookingForm.personas} personas</strong> a las <strong>{bookingForm.hora} hs</strong>.
                </p>
                <p className="text-[11px] text-stone-400 italic">
                  Te hemos redirigido a WhatsApp para enviar el mensaje pre-completado de confirmación. ¡Muchas gracias!
                </p>
              </div>

              <button
                onClick={closeBookingSuccess}
                className="w-full py-3 bg-[#624A3E] hover:bg-[#4D352B] dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-[#1A110B] rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
