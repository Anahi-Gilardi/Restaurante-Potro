import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Phone, 
  Mail, 
  UtensilsCrossed, 
  Award, 
  Sparkles, 
  ChefHat, 
  Wine, 
  ChevronRight, 
  CheckCircle,
  Menu,
  X,
  Flame,
  Pizza
} from 'lucide-react';

export interface RestaurantCoverTheme {
  accentColor: string;
  hoverAccentColor: string;
  heroBackground: string;
  heroBadge: string;
  heroTitleStart: string;
  heroTitleSub?: string;
  heroTitleHighlight: string;
  heroDescription: string;
  specSubtitle: string;
  specTitle: string;
}

export function getRestaurantCoverTheme(coverTab: 'parrilla' | 'pizzeria'): RestaurantCoverTheme {
  const accentColor = coverTab === 'parrilla' ? '#B45309' : '#9B2226';
  const hoverAccentColor = coverTab === 'parrilla' ? '#D97706' : '#B22226';

  const heroBackground = coverTab === 'parrilla' ? '/images/fachada_patron.jpg' : '/images/pizza_wood_oven.png';
  const heroBadge = coverTab === 'parrilla' ? 'Gastronomía familiar' : 'Pizzería & Horno Artesanal';
  const heroTitleStart = coverTab === 'parrilla' ? 'EL PATRÓN' : 'Pizzas de Masa Madre';
  const heroTitleSub = coverTab === 'parrilla' ? 'Casa de comidas y vinos' : undefined;
  const heroTitleHighlight = coverTab === 'parrilla' ? 'Cocina de hogar' : 'al Horno de Barro';
  const heroDescription = coverTab === 'parrilla' 
    ? 'Carnes seleccionadas, pastas con recetas originales de la abuela y amplia selección de bodega. Te invitamos a vivir la experiencia de El Patrón.'
    : 'Pizzas artesanales fermentadas por 48 horas, empanadas cocidas a leña y postres tradicionales criollos respetando el sabor auténtico.';

  const specSubtitle = coverTab === 'parrilla' ? 'Nuestra Carta' : 'El Horno de Barro';
  const specTitle = coverTab === 'parrilla' ? 'Especialidades de El Patrón' : 'Pizzas & Empanadas';

  return {
    accentColor,
    hoverAccentColor,
    heroBackground,
    heroBadge,
    heroTitleStart,
    heroTitleSub,
    heroTitleHighlight,
    heroDescription,
    specSubtitle,
    specTitle
  };
}

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

    const cleanPhone = '5493584373711'; // El Patron WhatsApp line
    const text = `*SOLICITUD DE RESERVA - EL PATRÓN*\n\n` +
      `Hola! Me gustaría solicitar una mesa para reservar:\n\n` +
      `• *Nombre:* ${bookingForm.nombre}\n` +
      `• *Teléfono:* ${bookingForm.telefono}\n` +
      `• *Comensales:* ${bookingForm.personas} ${parseInt(bookingForm.personas) === 1 ? 'persona' : 'personas'}\n` +
      `• *Fecha:* ${formattedDate}\n` +
      `• *Hora:* ${bookingForm.hora} hs\n\n` +
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

  const [coverTab, setCoverTab] = useState<'parrilla' | 'pizzeria'>('parrilla');

  const specialtiesParrilla = [
    {
      id: 'spec_1',
      title: 'Ojo de Bife Seleccionado',
      description: 'Corte de 400g de carne de vacuno seleccionado, servido con cremoso aligot y salsa criolla.',
      tag: 'El Favorito de la Casa',
      image: '/images/ojo_de_bife_grill.png'
    },
    {
      id: 'spec_2',
      title: 'Provoleta al Hierro',
      description: 'Queso provolone fundido con mermelada de tomate y pesto de albahaca.',
      tag: 'Entrada Caliente',
      image: '/images/provoleta_hierro.png'
    },
    {
      id: 'spec_3',
      title: 'Cinta ancha en tinta de sepia',
      description: 'Pasta fresca con tinta de sepia, salteada con crema de mariscos.',
      tag: 'Pasta de Autor',
      image: '/images/cintas_sepia_pasta.png'
    }
  ];

  const specialtiesPizzeria = [
    {
      id: 'spec_pizz_1',
      title: 'Pizza Margherita de Búfala',
      description: 'Salsa de tomates italianos, muzzarella de búfala premium, hojas de albahaca fresca y un toque de aceite de oliva virgen extra sobre masa madre.',
      tag: 'Especialidad al Horno',
      image: '/images/pizza_wood_oven.png'
    },
    {
      id: 'spec_pizz_2',
      title: 'Empanadas Criollas de Lomo',
      description: 'Relleno jugoso de lomo cortado a cuchillo, huevo de campo, cebolla de verdeo y especias criollas horneadas a leña.',
      tag: 'Clásico del Horno',
      image: '/images/empanadas.jpg'
    },
    {
      id: 'spec_pizz_3',
      title: 'Calzone Napolitano',
      description: 'Masa italiana rellena de jamón cocido premium, muzzarella hilada, tomates seleccionados, albahaca y oliva.',
      tag: 'Exclusivo del Horno',
      image: '/images/pizza_wood_oven.png'
    }
  ];

  const specialties = coverTab === 'parrilla' ? specialtiesParrilla : specialtiesPizzeria;

  const theme = getRestaurantCoverTheme(coverTab);
  const {
    accentColor,
    hoverAccentColor,
    heroBackground,
    heroBadge,
    heroTitleStart,
    heroTitleSub,
    heroTitleHighlight,
    heroDescription,
    specSubtitle,
    specTitle
  } = theme;

  return (
    <div className="min-h-screen bg-[#FAF7F0] dark:bg-[#1A110B] text-stone-900 dark:text-[#FAF7F0] font-sans selection:bg-[#8C6239] selection:text-white transition-colors duration-300">
      
      {/* 1. FLOATING HEADER */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#FAF7F0]/80 dark:bg-[#1A110B]/80 border-b border-[#8C6239]/15 dark:border-[#8C6239]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
          {/* Logo Brand */}
          <div onClick={onEnterSystem} className="flex items-center gap-3.5 cursor-pointer" title="El Patrón">
            <img src="/logo-el-patron.jpeg" alt="Logo El Patrón" className="w-20 h-20 object-cover rounded-full shadow-lg border border-[#8C6239]/15" />
            <span className="font-extrabold text-2xl tracking-widest font-display-serif text-[#8C6239] dark:text-[#8C6239]">
              EL PATRÓN
            </span>
          </div>

          {/* Desktop Navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-stone-600 dark:text-stone-300">
            <a href="#especialidades" className={`transition-colors ${coverTab === 'parrilla' ? 'hover:text-[#8C6239]' : 'hover:text-[#9B2226]'}`}>Especialidades</a>
            <a href="#experiencia" className={`transition-colors ${coverTab === 'parrilla' ? 'hover:text-[#8C6239]' : 'hover:text-[#9B2226]'}`}>Bodega</a>
            <a href="#reserva" className={`transition-colors ${coverTab === 'parrilla' ? 'hover:text-[#8C6239]' : 'hover:text-[#9B2226]'}`}>Reservas</a>
            <a href="#contacto" className={`transition-colors ${coverTab === 'parrilla' ? 'hover:text-[#8C6239]' : 'hover:text-[#9B2226]'}`}>Ubicación</a>
          </nav>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-2">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-stone-700 dark:text-stone-300 hover:bg-[#8C6239]/10"
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
            className="md:hidden w-full bg-[#FAF7F0] dark:bg-[#1C140E] border-b border-[#8C6239]/15 px-6 py-4 space-y-3 flex flex-col font-medium"
          >
            <a href="#especialidades" onClick={() => setMobileMenuOpen(false)} className="py-2 text-stone-700 dark:text-stone-300 border-b border-stone-100 dark:border-stone-850">Especialidades</a>
            <a href="#experiencia" onClick={() => setMobileMenuOpen(false)} className="py-2 text-stone-700 dark:text-stone-300 border-b border-stone-100 dark:border-stone-850">Bodega</a>
            <a href="#reserva" onClick={() => setMobileMenuOpen(false)} className="py-2 text-stone-700 dark:text-stone-300 border-b border-stone-100 dark:border-stone-850">Reservas</a>
            <a href="#contacto" onClick={() => setMobileMenuOpen(false)} className="py-2 text-stone-700 dark:text-stone-300">Ubicación</a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden py-24 lg:py-32 bg-[#1A110B] text-white flex items-center justify-center">
        {/* Background Image with Overlay */}
        <div 
          className={`absolute inset-0 bg-cover select-none pointer-events-none transition-all duration-700 ease-in-out ${coverTab === 'parrilla' ? 'opacity-90 bg-[position:center_30%]' : 'opacity-60 bg-center'}`}
          style={{ backgroundImage: `url('${heroBackground}')` }}
        />
        <div className="absolute inset-0 bg-black/55" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10 flex flex-col items-center text-center">
          <div className="max-w-3xl space-y-6 flex flex-col items-center">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-1.5 px-4.5 py-1.5 bg-black/45 border border-white/10 rounded-full text-stone-250 text-xs font-bold uppercase tracking-wider font-display-serif shadow-inner"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C8956A]" />
              {heroBadge}
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-7xl lg:text-8xl font-black font-display-serif leading-none tracking-widest text-[#8C6239] drop-shadow-2xl"
            >
              {heroTitleStart}
            </motion.h1>

            {heroTitleSub && (
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.12 }}
                className="text-2xl sm:text-3xl lg:text-4xl font-serif-rustic italic font-semibold text-[#FAF7F0] drop-shadow-md"
              >
                {heroTitleSub}
              </motion.h2>
            )}

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-2xl sm:text-3xl lg:text-4xl font-serif-rustic italic font-semibold text-[#FAF7F0]/90 drop-shadow-md"
            >
              {heroTitleHighlight}
            </motion.h2>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-stone-200 text-sm sm:text-base md:text-lg max-w-2xl font-serif-rustic italic leading-relaxed"
            >
              {heroDescription}
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-4 pt-4"
            >
              <a 
                href="#reserva"
                className="px-6 py-3.5 bg-[#8C6239] hover:bg-[#A0754B] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg hover:scale-[1.02] flex items-center gap-2"
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
      <section className="bg-[#FAF7F0] dark:bg-[#201710] py-8 border-y border-[#8C6239]/15 dark:border-[#8C6239]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {coverTab === 'parrilla' ? (
            <>
              <div className="flex flex-col items-center p-3 space-y-1">
                <Flame className="w-7 h-7 text-[#8C6239] dark:text-[#8C6239] animate-pulse" />
                <span className="font-extrabold text-sm uppercase text-[#8C6239] dark:text-[#C8956A] font-display-serif tracking-widest">Cortes seleccionados</span>
              </div>
              <div className="flex flex-col items-center p-3 space-y-1 border-y sm:border-y-0 sm:border-x border-stone-200 dark:border-stone-850">
                <ChefHat className="w-7 h-7 text-[#8C6239] dark:text-[#8C6239]" />
                <span className="font-extrabold text-sm uppercase text-[#8C6239] dark:text-[#C8956A] font-display-serif tracking-widest">Recetas tradicionales</span>
              </div>
              <div className="flex flex-col items-center p-3 space-y-1">
                <Wine className="w-7 h-7 text-[#C8956A]" />
                <span className="font-extrabold text-sm uppercase text-[#8C6239] dark:text-[#C8956A] font-display-serif tracking-widest">Cava Selecta</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center p-3 space-y-1">
                <Pizza className="w-7 h-7 text-[#9B2226] animate-bounce duration-[1500ms]" />
                <span className="font-extrabold text-sm uppercase text-[#9B2226] dark:text-red-400 font-display-serif tracking-widest">Horno de Barro</span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 font-serif-rustic italic">Pizzas de masa madre a la leña</span>
              </div>
              <div className="flex flex-col items-center p-3 space-y-1 border-y sm:border-y-0 sm:border-x border-stone-200 dark:border-stone-850">
                <Flame className="w-7 h-7 text-[#3A5A40]" />
                <span className="font-extrabold text-sm uppercase text-[#8C6239] dark:text-[#C8956A] font-display-serif tracking-widest">Tradición Criolla</span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 font-serif-rustic italic">Empanadas elaboradas a mano</span>
              </div>
              <div className="flex flex-col items-center p-3 space-y-1">
                <Wine className="w-7 h-7 text-[#C8956A]" />
                <span className="font-extrabold text-sm uppercase text-[#8C6239] dark:text-[#C8956A] font-display-serif tracking-widest">Maridaje Perfecto</span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 font-serif-rustic italic">Cerveza tirada y tragos artesanales</span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 4. SPECIALTIES SECTION */}
      <section id="especialidades" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs uppercase font-bold text-[#8C6239] dark:text-[#8C6239] tracking-widest font-display-serif">
            {specSubtitle}
          </span>
          <h2 className={`text-3xl sm:text-4xl font-bold tracking-wide font-serif-rustic transition-all ${coverTab === 'parrilla' ? 'text-[#8C6239] dark:text-[#FAF7F0]' : 'text-[#9B2226] dark:text-[#FAF7F0]'}`}>
            {specTitle}
          </h2>
          <div 
            className="w-16 h-1 mx-auto rounded-full transition-all duration-300"
            style={{ backgroundColor: accentColor }}
          />
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
                <span 
                  className="absolute top-4 left-4 px-3 py-1 text-[#FAF7F0] text-[10px] font-bold uppercase tracking-wider font-display-serif rounded-lg shadow transition-all duration-300"
                  style={{ backgroundColor: accentColor }}
                >
                  {spec.tag}
                </span>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className={`text-lg font-bold font-serif-rustic tracking-wide transition-all ${coverTab === 'parrilla' ? 'text-[#8C6239] dark:text-[#FAF7F0]' : 'text-[#9B2226] dark:text-[#FAF7F0]'}`}>
                    {spec.title}
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400 font-serif-rustic italic leading-relaxed">
                    {spec.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 5. WINE / CELLAR SECTION (EXPERIENCIA) */}
      <section id="experiencia" className="relative py-20 lg:py-24 bg-[#8C6239] text-stone-950 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-15 select-none pointer-events-none"
          style={{ backgroundImage: `url('/images/rutini_malbec_cellar.png')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#8C6239] via-[#8C6239]/90 to-[#8C6239]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 text-stone-950">
          <span className="text-xs uppercase font-bold text-stone-900 tracking-widest font-display-serif">Maridaje Seleccionado</span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-wide font-serif-rustic text-stone-950">
            La Cava de El Patrón
          </h2>
          <div className="w-12 h-1 bg-stone-900 rounded-full mx-auto" />
          <p className="text-stone-850 text-xs sm:text-sm font-serif-rustic italic leading-relaxed max-w-2xl mx-auto">
            Un buen corte merece ser maridado con un gran exponente. Por eso, diseñamos nuestra cava con una amplia colección de varietales argentinos.
          </p>
          <p className="text-stone-850 text-xs sm:text-sm font-serif-rustic italic leading-relaxed max-w-2xl mx-auto">
            Contamos con una amplia gama de etiquetas y varietales seleccionados para ofrecer el maridaje perfecto con nuestros platos, garantizando que cada copa sea una celebración para el paladar.
          </p>
        </div>
      </section>

      {/* 6. BOOKING WIDGET */}
      <section id="reserva" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs uppercase font-bold text-[#8C6239] dark:text-[#8C6239] tracking-widest font-display-serif">Planificá tu Visita</span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-wide font-serif-rustic text-[#8C6239] dark:text-[#FAF7F0]">
            Solicitud de Reserva Online
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-400 max-w-md mx-auto font-serif-rustic italic">
            Reserve su mesa con anticipación. Le enviaremos una confirmación de disponibilidad vía teléfono o WhatsApp a la brevedad.
          </p>
          <div className="w-16 h-1 bg-[#8C6239] dark:bg-[#8C6239] mx-auto rounded-full" />
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
                  className="w-full px-4 py-3 rounded-xl border border-stone-250 dark:border-stone-800 bg-[#FAF7F0] dark:bg-[#1E140E] text-stone-850 dark:text-white text-xs font-bold focus:outline-none focus:border-[#8C6239] dark:focus:border-[#8C6239]"
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
                  className="w-full px-4 py-3 rounded-xl border border-stone-250 dark:border-stone-800 bg-[#FAF7F0] dark:bg-[#1E140E] text-stone-850 dark:text-white text-xs font-bold focus:outline-none focus:border-[#8C6239] dark:focus:border-[#8C6239]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Comensales</label>
                <select 
                  value={bookingForm.personas}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, personas: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-250 dark:border-stone-800 bg-[#FAF7F0] dark:bg-[#1E140E] text-stone-850 dark:text-white text-xs font-bold focus:outline-none focus:border-[#8C6239] dark:focus:border-[#8C6239] cursor-pointer"
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
                  onClick={(e) => {
                    try {
                      (e.target as HTMLInputElement).showPicker?.();
                    } catch (err) {}
                  }}
                  onFocus={(e) => {
                    try {
                      (e.target as HTMLInputElement).showPicker?.();
                    } catch (err) {}
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-stone-250 dark:border-stone-800 bg-[#FAF7F0] dark:bg-[#1E140E] text-stone-850 dark:text-white text-xs font-bold focus:outline-none focus:border-[#8C6239] dark:focus:border-[#8C6239] cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Hora</label>
                <select 
                  value={bookingForm.hora}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, hora: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-250 dark:border-stone-800 bg-[#FAF7F0] dark:bg-[#1E140E] text-stone-850 dark:text-white text-xs font-bold focus:outline-none focus:border-[#8C6239] dark:focus:border-[#8C6239] cursor-pointer"
                >
                  <option value="12:00">12:00 hs (Almuerzo)</option>
                  <option value="13:00">13:00 hs (Almuerzo)</option>
                  <option value="13:30">13:30 hs (Almuerzo)</option>
                  <option value="20:00">20:00 hs (Cena)</option>
                  <option value="21:00">21:00 hs (Cena)</option>
                  <option value="21:30">21:30 hs (Cena)</option>
                  <option value="22:00">22:00 hs (Cena)</option>
                  <option value="22:30">22:30 hs (Cena)</option>
                  <option value="23:00">23:00 hs (Cena)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-[#8C6239] hover:bg-[#A0754B] dark:bg-[#8C6239] dark:hover:bg-[#A0754B] text-white dark:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              Solicitar Reservación
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>

      <footer id="contacto" className="bg-[#8C6239] text-stone-900 py-16 border-t border-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-12">
          
          {/* Logo & Brand description */}
          <div className="space-y-4">
            <div onClick={onEnterSystem} className="flex items-center gap-3.5 cursor-pointer" title="El Patrón">
              <img src="/logo-el-patron.jpeg" alt="Logo El Patrón" className="w-16 h-16 object-cover rounded-full border border-black/10" />
              <span className="font-extrabold text-xl tracking-widest text-stone-950 font-display-serif">EL PATRÓN</span>
            </div>
            <p className="text-xs text-stone-850 leading-relaxed">
              Gastronomía familiar, cocina de hogar, carnes seleccionadas, pastas caseras con recetas originales de la abuela y amplia selección de bodega.
            </p>
          </div>

          {/* Horarios */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase font-bold tracking-widest text-stone-950 font-display-serif">Nuestros Horarios</h4>
            <ul className="space-y-2 text-xs font-medium">
              <li className="flex justify-between border-b border-black/10 pb-1">
                <span>Martes a Domingo:</span>
                <span className="text-stone-950 font-display-serif">12:00 a 16:00 hs</span>
              </li>
              <li className="flex justify-between border-b border-black/10 pb-1">
                <span>Martes a Domingo:</span>
                <span className="text-stone-950 font-display-serif">20:00 a 00:00 hs</span>
              </li>
              <li className="flex justify-between">
                <span>Lunes:</span>
                <span className="text-stone-700 font-display-serif">Cerrado</span>
              </li>
            </ul>
          </div>

          {/* Contacto Info */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase font-bold tracking-widest text-stone-950 font-display-serif">Contacto & Reservas</h4>
            <ul className="space-y-3 text-xs">
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-stone-950 shrink-0 mt-0.5" />
                <span className="font-display-serif">+54 9 3584 37-3711</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-stone-950 shrink-0 mt-0.5" />
                <span>bellaoriana47@gmail.com</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-stone-950 shrink-0 mt-0.5" />
                <span>Fotheringham 33, Rio Cuarto, Córdoba</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copy bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-black/10 text-center text-xs text-stone-700">
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
                <h3 className="text-xl font-bold font-serif-rustic text-[#8C6239] dark:text-white tracking-wide">
                  ¡Solicitud Enviada!
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed font-serif-rustic italic">
                  Se ha generado tu solicitud de reserva para <strong>{bookingForm.personas} personas</strong> a las <strong>{bookingForm.hora} hs</strong>.
                </p>
                <p className="text-[11px] text-stone-400 font-serif-rustic italic">
                  Te hemos redirigido a WhatsApp para enviar el mensaje pre-completado de confirmación. ¡Muchas gracias!
                </p>
              </div>

              <button
                onClick={closeBookingSuccess}
                className="w-full py-3 bg-[#8C6239] hover:bg-[#A0754B] dark:bg-[#8C6239] dark:hover:bg-[#A0754B] text-white dark:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer font-display-serif"
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
