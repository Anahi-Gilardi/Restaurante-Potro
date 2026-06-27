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
  heroTitleHighlight: string;
  heroDescription: string;
  specSubtitle: string;
  specTitle: string;
}

export function getRestaurantCoverTheme(coverTab: 'parrilla' | 'pizzeria'): RestaurantCoverTheme {
  const accentColor = coverTab === 'parrilla' ? '#B45309' : '#9B2226';
  const hoverAccentColor = coverTab === 'parrilla' ? '#D97706' : '#B22226';

  const heroBackground = coverTab === 'parrilla' ? '/images/fachada_patron.jpg' : '/images/pizza_wood_oven.png';
  const heroBadge = coverTab === 'parrilla' ? 'Gastronomía familiar • Casa de comidas y vinos' : 'Pizzería & Horno Artesanal';
  const heroTitleStart = coverTab === 'parrilla' ? 'EL PATRÓN' : 'Pizzas de Masa Madre';
  const heroTitleHighlight = coverTab === 'parrilla' ? 'Cocina de hogar' : 'al Horno de Barro';
  const heroDescription = coverTab === 'parrilla' 
    ? 'Carnes seleccionadas, pastas con recetas originales de la abuela y amplia selección de bodega.'
    : 'Pizzas artesanales fermentadas por 48 horas, empanadas cocidas a leña y postres tradicionales criollos respetando el sabor auténtico.';

  const specSubtitle = coverTab === 'parrilla' ? 'Nuestra Carta' : 'El Horno de Barro';
  const specTitle = coverTab === 'parrilla' ? 'Especialidades de El Patrón' : 'Pizzas & Empanadas';

  return {
    accentColor,
    hoverAccentColor,
    heroBackground,
    heroBadge,
    heroTitleStart,
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

  const [coverTab, setCoverTab] = useState<'parrilla' | 'pizzeria'>('parrilla');

  const specialtiesParrilla = [
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
    heroTitleHighlight,
    heroDescription,
    specSubtitle,
    specTitle
  } = theme;

  return (
    <div className="min-h-screen bg-[#FAF7F0] dark:bg-[#1A110B] text-stone-900 dark:text-[#FAF7F0] font-sans selection:bg-[#624A3E] selection:text-white transition-colors duration-300">
      
      {/* 1. FLOATING HEADER */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#FAF7F0]/80 dark:bg-[#1A110B]/80 border-b border-[#624A3E]/10 dark:border-amber-900/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
          {/* Logo Brand */}
          <div className="flex items-center gap-3.5 cursor-pointer">
            <img src="/logo-el-patron.jpeg" alt="Logo El Patrón" className="w-20 h-20 object-cover rounded-full shadow-lg border border-[#624A3E]/10" />
            <span className="font-extrabold text-2xl tracking-widest font-display-serif text-[#4A2D1B] dark:text-amber-500">
              EL PATRÓN
            </span>
          </div>

          {/* Desktop Navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-stone-600 dark:text-stone-300">
            <a href="#especialidades" className={`transition-colors ${coverTab === 'parrilla' ? 'hover:text-[#624A3E]' : 'hover:text-[#9B2226]'}`}>Especialidades</a>
            <a href="#experiencia" className={`transition-colors ${coverTab === 'parrilla' ? 'hover:text-[#624A3E]' : 'hover:text-[#9B2226]'}`}>Bodega</a>
            <a href="#reserva" className={`transition-colors ${coverTab === 'parrilla' ? 'hover:text-[#624A3E]' : 'hover:text-[#9B2226]'}`}>Reservas</a>
            <a href="#contacto" className={`transition-colors ${coverTab === 'parrilla' ? 'hover:text-[#624A3E]' : 'hover:text-[#9B2226]'}`}>Ubicación</a>
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
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {heroBadge}
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-7xl lg:text-8xl font-black font-display-serif leading-none tracking-widest text-amber-500 drop-shadow-2xl"
            >
              {heroTitleStart}
            </motion.h1>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-2xl sm:text-3xl lg:text-4xl font-serif-rustic italic font-semibold text-[#FAF7F0] drop-shadow-md"
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
          {coverTab === 'parrilla' ? (
            <>
              <div className="flex flex-col items-center p-3 space-y-1">
                <Flame className="w-7 h-7 text-[#4A2D1B] dark:text-amber-500 animate-pulse" />
                <span className="font-extrabold text-sm uppercase text-[#4A2D1B] dark:text-amber-400 font-display-serif tracking-widest">Cortes Premium</span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 font-serif-rustic italic">Maduración controlada Dry Aged</span>
              </div>
              <div className="flex flex-col items-center p-3 space-y-1 border-y sm:border-y-0 sm:border-x border-stone-200 dark:border-stone-850">
                <ChefHat className="w-7 h-7 text-[#4A2D1B] dark:text-amber-500" />
                <span className="font-extrabold text-sm uppercase text-[#4A2D1B] dark:text-amber-400 font-display-serif tracking-widest">Cocina de Autor</span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 font-serif-rustic italic">Pastas frescas y recetas tradicionales</span>
              </div>
              <div className="flex flex-col items-center p-3 space-y-1">
                <Wine className="w-7 h-7 text-[#C8956A]" />
                <span className="font-extrabold text-sm uppercase text-[#4A2D1B] dark:text-amber-400 font-display-serif tracking-widest">Cava Selecta</span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 font-serif-rustic italic">Vinos de alta gama para maridajes</span>
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
                <span className="font-extrabold text-sm uppercase text-[#4A2D1B] dark:text-amber-400 font-display-serif tracking-widest">Tradición Criolla</span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 font-serif-rustic italic">Empanadas elaboradas a mano</span>
              </div>
              <div className="flex flex-col items-center p-3 space-y-1">
                <Wine className="w-7 h-7 text-[#C8956A]" />
                <span className="font-extrabold text-sm uppercase text-[#4A2D1B] dark:text-amber-400 font-display-serif tracking-widest">Maridaje Perfecto</span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 font-serif-rustic italic">Cerveza tirada y tragos artesanales</span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 4. SPECIALTIES SECTION */}
      <section id="especialidades" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs uppercase font-bold text-[#6B4A35] dark:text-amber-500 tracking-widest font-display-serif">
            {specSubtitle}
          </span>
          <h2 className={`text-3xl sm:text-4xl font-bold tracking-wide font-serif-rustic transition-all ${coverTab === 'parrilla' ? 'text-[#4A2D1B] dark:text-[#FAF7F0]' : 'text-[#9B2226] dark:text-[#FAF7F0]'}`}>
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
                  <h3 className={`text-lg font-bold font-serif-rustic tracking-wide transition-all ${coverTab === 'parrilla' ? 'text-[#4A2D1B] dark:text-[#FAF7F0]' : 'text-[#9B2226] dark:text-[#FAF7F0]'}`}>
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
      <section id="experiencia" className="relative py-20 lg:py-24 bg-[#1E130B] text-white overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-25 select-none pointer-events-none"
          style={{ backgroundImage: `url('/images/rutini_malbec_cellar.png')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-l from-[#1E130B] via-[#1E130B]/90 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs uppercase font-bold text-amber-400 tracking-widest font-display-serif">Maridaje Seleccionado</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-wide font-serif-rustic text-[#FAF7F0]">
              La Cava de El Patrón
            </h2>
            <div className="w-12 h-1 bg-amber-500 rounded-full" />
            <p className="text-stone-200 text-xs sm:text-sm font-serif-rustic italic leading-relaxed">
              Un buen corte merece ser maridado con un gran exponente. Por eso, diseñamos nuestra cava con una amplia colección de varietales argentinos.
            </p>
            <p className="text-stone-200 text-xs sm:text-sm font-serif-rustic italic leading-relaxed">
              Contamos con etiquetas exclusivas de la bodega <strong>Rutini</strong>, Malbecs mendocinos intensos con notas de ciruelas rojas y vainilla, y Cabernet Sauvignon madurados en barricas de roble francés, garantizando que cada bocado de carne sea una celebración para el paladar.
            </p>
            <div className="pt-2 flex items-center gap-4 text-xs font-bold text-amber-400 font-display-serif">
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
              <span className="text-[10px] uppercase font-bold text-amber-500 tracking-widest block font-display-serif">Recomendación Sommelier</span>
              <h4 className="text-xl font-bold font-serif-rustic text-[#FAF7F0] tracking-wide">Rutini Colección Malbec</h4>
              <p className="text-stone-200 text-xs font-serif-rustic italic leading-relaxed">
                De color rojo violáceo concentrado. Ofrece aromas frutados (arándanos, ciruelas) y toques de tabaco aportados por la madera. Excelente cuerpo y taninos maduros y dulces. Ideal para acompañar nuestro Ojo de Bife.
              </p>
              <div className="flex justify-between items-center pt-2 text-[10px] text-stone-400 font-bold border-t border-white/15 font-display-serif">
                <span>Servido a temperatura óptima: 16-18°C</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BOOKING WIDGET */}
      <section id="reserva" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs uppercase font-bold text-[#6B4A35] dark:text-amber-500 tracking-widest font-display-serif">Planificá tu Visita</span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-wide font-serif-rustic text-[#4A2D1B] dark:text-[#FAF7F0]">
            Solicitud de Reserva Online
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-400 max-w-md mx-auto font-serif-rustic italic">
            Reserve su mesa con anticipación. Le enviaremos una confirmación de disponibilidad vía teléfono o WhatsApp a la brevedad.
          </p>
          <div className="w-16 h-1 bg-[#4A2D1B] dark:bg-amber-500 mx-auto rounded-full" />
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
                  className="w-full px-4 py-3 rounded-xl border border-stone-250 dark:border-stone-800 bg-[#FAF7F0] dark:bg-[#1E140E] text-stone-850 dark:text-white text-xs font-bold focus:outline-none focus:border-[#4A2D1B] dark:focus:border-amber-500"
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
                  className="w-full px-4 py-3 rounded-xl border border-stone-250 dark:border-stone-800 bg-[#FAF7F0] dark:bg-[#1E140E] text-stone-850 dark:text-white text-xs font-bold focus:outline-none focus:border-[#4A2D1B] dark:focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Comensales</label>
                <select 
                  value={bookingForm.personas}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, personas: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-250 dark:border-stone-800 bg-[#FAF7F0] dark:bg-[#1E140E] text-stone-850 dark:text-white text-xs font-bold focus:outline-none focus:border-[#4A2D1B] dark:focus:border-amber-500 cursor-pointer"
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
                  className="w-full px-4 py-3 rounded-xl border border-stone-250 dark:border-stone-800 bg-[#FAF7F0] dark:bg-[#1E140E] text-stone-850 dark:text-white text-xs font-bold focus:outline-none focus:border-[#4A2D1B] dark:focus:border-amber-500 cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Hora</label>
                <select 
                  value={bookingForm.hora}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, hora: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-250 dark:border-stone-800 bg-[#FAF7F0] dark:bg-[#1E140E] text-stone-850 dark:text-white text-xs font-bold focus:outline-none focus:border-[#4A2D1B] dark:focus:border-amber-500 cursor-pointer"
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
              className="w-full py-4 bg-[#4A2D1B] hover:bg-[#6B4A35] dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-[#1A110B] rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md flex items-center justify-center gap-2"
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
            <div className="flex items-center gap-3.5">
              <img src="/logo-el-patron.jpeg" alt="Logo El Patrón" className="w-16 h-16 object-cover rounded-full border border-white/10" />
              <span className="font-extrabold text-xl tracking-widest text-white font-display-serif">EL PATRÓN</span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              Gastronomía familiar, cocina de hogar, carnes seleccionadas, pastas caseras con recetas originales de la abuela y amplia selección de bodega.
            </p>
          </div>

          {/* Horarios */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase font-bold tracking-widest text-white font-display-serif">Nuestros Horarios</h4>
            <ul className="space-y-2 text-xs font-medium">
              <li className="flex justify-between border-b border-[#FAF7F0]/10 pb-1">
                <span>Martes a Domingo:</span>
                <span className="text-white font-display-serif">12:00 a 16:00 hs</span>
              </li>
              <li className="flex justify-between border-b border-[#FAF7F0]/10 pb-1">
                <span>Martes a Domingo:</span>
                <span className="text-white font-display-serif">20:00 a 00:00 hs</span>
              </li>
              <li className="flex justify-between">
                <span>Lunes:</span>
                <span className="text-stone-500 font-display-serif">Cerrado</span>
              </li>
            </ul>
          </div>

          {/* Contacto Info */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase font-bold tracking-widest text-white font-display-serif">Contacto & Reservas</h4>
            <ul className="space-y-3 text-xs">
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span className="font-display-serif">+54 11 4802-9988</span>
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
            <h4 className="text-xs uppercase font-bold tracking-widest text-white font-display-serif">Área de Personal</h4>
            <p className="text-[11px] text-stone-400">
              Uso exclusivo para mozos, personal de cocina, cajeros y administración.
            </p>
            <button
              onClick={onEnterSystem}
              className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/15 text-white rounded-xl text-[10px] uppercase font-black tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 font-display-serif"
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
                <h3 className="text-xl font-bold font-serif-rustic text-[#4A2D1B] dark:text-white tracking-wide">
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
                className="w-full py-3 bg-[#4A2D1B] hover:bg-[#6B4A35] dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-[#1A110B] rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer font-display-serif"
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
