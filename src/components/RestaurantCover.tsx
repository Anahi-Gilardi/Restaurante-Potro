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
  Pizza,
  Tag,
  Heart,
  Send
} from 'lucide-react';
import { argentinaDateIso } from '../lib/argentinaDate';
import { buildReservationWhatsAppUrl, validatePublicReservation } from '../lib/publicReservation';
import { promocionesService, type Promocion } from '../services/promocionesService';
import { menuDiarioService, type MenuDiarioDia, INITIAL_MENU_DIARIO } from '../services/menuDiarioService';

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
  promociones?: Promocion[];
}

export default function RestaurantCover({ onEnterSystem, promociones: initialPromociones }: RestaurantCoverProps) {
  // Dynamic Promociones State
  const [promociones, setPromociones] = useState<Promocion[]>(initialPromociones || []);
  const [loadingPromos, setLoadingPromos] = useState(!initialPromociones);

  React.useEffect(() => {
    let isMounted = true;
    promocionesService.list()
      .then(list => {
        if (isMounted) {
          setPromociones((list || []).filter(p => p.activo !== false));
          setLoadingPromos(false);
        }
      })
      .catch(err => {
        console.warn('No se pudieron cargar promociones para la portada:', err);
        if (isMounted) setLoadingPromos(false);
      });
    return () => { isMounted = false; };
  }, []);

  // Dynamic Menu Diario State
  const [menuDiario, setMenuDiario] = useState<Record<string, MenuDiarioDia>>(INITIAL_MENU_DIARIO);
  const [loadingMenuDiario, setLoadingMenuDiario] = useState(true);

  React.useEffect(() => {
    let isMounted = true;
    menuDiarioService.list()
      .then(data => {
        if (isMounted) {
          setMenuDiario(data || INITIAL_MENU_DIARIO);
          setLoadingMenuDiario(false);
        }
      })
      .catch(err => {
        console.warn('No se pudo cargar el menú diario en la portada:', err);
        if (isMounted) setLoadingMenuDiario(false);
      });
    return () => { isMounted = false; };
  }, []);

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
    const validationError = validatePublicReservation(bookingForm, argentinaDateIso());
    if (validationError) {
      alert(validationError);
      return;
    }

    const url = buildReservationWhatsAppUrl(bookingForm, '5493584303541');
    window.open(url, '_blank', 'noopener,noreferrer');

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
          <button
            type="button"
            onClick={onEnterSystem}
            className="flex items-center gap-3.5 cursor-pointer bg-transparent border-0 p-0 text-left"
            aria-label="Ingresar al sistema El Patrón"
            title="El Patrón"
          >
            <img src="/logo-el-patron.jpeg" alt="Logo El Patrón" className="w-20 h-20 object-cover rounded-full shadow-lg border border-[#8C6239]/15" />
            <span className="font-extrabold text-2xl tracking-widest font-display-serif text-[#8C6239] dark:text-[#8C6239]">
              EL PATRÓN
            </span>
          </button>

          {/* Desktop Navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-stone-600 dark:text-stone-300">
            <a href="#especialidades" className={`transition-colors ${coverTab === 'parrilla' ? 'hover:text-[#8C6239]' : 'hover:text-[#9B2226]'}`}>Especialidades</a>
            <a href="#experiencia" className={`transition-colors ${coverTab === 'parrilla' ? 'hover:text-[#8C6239]' : 'hover:text-[#9B2226]'}`}>Bodega</a>
            <a href="#inauguracion" className={`transition-colors ${coverTab === 'parrilla' ? 'hover:text-[#8C6239]' : 'hover:text-[#9B2226]'}`}>Inauguración</a>
            <a href="#reserva" className={`transition-colors ${coverTab === 'parrilla' ? 'hover:text-[#8C6239]' : 'hover:text-[#9B2226]'}`}>Reservas</a>
            <a href="#contacto" className={`transition-colors ${coverTab === 'parrilla' ? 'hover:text-[#8C6239]' : 'hover:text-[#9B2226]'}`}>Ubicación</a>
          </nav>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-2">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-stone-700 dark:text-stone-300 hover:bg-[#8C6239]/10"
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={mobileMenuOpen}
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
            <a href="#inauguracion" onClick={() => setMobileMenuOpen(false)} className="py-2 text-stone-700 dark:text-stone-300 border-b border-stone-100 dark:border-stone-850">Inauguración</a>
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

      {/* 4. MENU DEL DIA SECTION */}
      <section id="especialidades" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs uppercase font-bold text-[#8C6239] dark:text-[#C8956A] tracking-widest font-display-serif">
            Propuesta Diaria
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-wide font-serif-rustic transition-all text-[#8C6239] dark:text-[#FAF7F0]">
            Menu del Dia
          </h2>
          <div 
            className="w-16 h-1 mx-auto rounded-full transition-all duration-300"
            style={{ backgroundColor: accentColor }}
          />
        </div>

        {(() => {
          const daysOrder = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
          const dayNames: Record<string, string> = {
            lunes: 'LUNES', martes: 'MARTES', miercoles: 'MIÉRCOLES', jueves: 'JUEVES', viernes: 'VIERNES', sabado: 'SÁBADO', domingo: 'DOMINGO'
          };
          const todayKey = daysOrder[new Date().getDay()];
          const todayMenu = menuDiario[todayKey] || INITIAL_MENU_DIARIO[todayKey];

          return (
            <div className="space-y-10">
              {/* Tarjeta Destacada del Menú del Día de Hoy */}
              <div className="max-w-4xl mx-auto">
                <motion.div
                  whileHover={{ y: -4 }}
                  className="bg-white dark:bg-[#251B12] rounded-3xl overflow-hidden border border-stone-200/60 dark:border-stone-850 shadow-xl flex flex-col md:flex-row"
                >
                  <div className="md:w-1/2 h-72 md:h-auto relative overflow-hidden bg-stone-100 dark:bg-stone-900">
                    <img 
                      src={todayMenu?.imagen_url || '/images/ojo_de_bife_grill.png'} 
                      alt={todayMenu?.nombre || 'Menú del Día'}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/ojo_de_bife_grill.png';
                      }}
                    />
                    <span 
                      className="absolute top-4 left-4 px-3.5 py-1.5 text-[#FAF7F0] text-xs font-bold uppercase tracking-wider font-display-serif rounded-xl shadow-lg backdrop-blur-xs"
                      style={{ backgroundColor: accentColor }}
                    >
                      🌟 PROPUESTA DE HOY — {dayNames[todayKey]}
                    </span>
                  </div>

                  <div className="p-8 md:w-1/2 flex flex-col justify-between space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#8C6239] dark:text-[#C8956A]">
                          {todayMenu?.categoria || 'Minutas & Especiales'}
                        </span>
                      </div>

                      <h3 className="text-2xl font-bold font-serif-rustic tracking-wide text-[#8C6239] dark:text-[#FAF7F0] capitalize">
                        {todayMenu?.nombre}
                      </h3>

                      <p className="text-sm text-stone-600 dark:text-stone-300 font-serif-rustic italic leading-relaxed">
                        {todayMenu?.descripcion}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-stone-100 dark:border-stone-850 flex items-center justify-between">
                      <span className="text-xs text-stone-500 dark:text-stone-400 font-semibold">
                        Servido con pan fresco y aderezos caseros
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          );
        })()}
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
          <p className="text-stone-950 text-xs sm:text-base font-serif-rustic font-bold italic leading-relaxed max-w-2xl mx-auto">
            Un buen corte merece ser maridado con un gran exponente. Por eso, diseñamos nuestra cava con una amplia colección de varietales argentinos.
          </p>
          <p className="text-stone-950 text-xs sm:text-base font-serif-rustic font-bold italic leading-relaxed max-w-2xl mx-auto">
            Contamos con una amplia gama de etiquetas y varietales seleccionados para ofrecer el maridaje perfecto con nuestros platos, garantizando que cada copa sea una celebración para el paladar.
          </p>
        </div>
      </section>

      {/* 5.b GRAN INAUGURACIÓN & PLATOS DESTACADOS SECTION */}
      <section id="inauguracion" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative scroll-mt-20">
        <span id="promociones" className="sr-only" aria-hidden="true" />
        
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] uppercase font-black tracking-widest bg-[#8C6239]/10 text-[#8C6239] dark:text-[#C8956A] border border-[#8C6239]/25 font-display-serif">
            <Sparkles className="w-3.5 h-3.5 text-[#8C6239] animate-pulse" />
            Gran Inauguración · Nueva Apertura
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-wide font-serif-rustic text-[#8C6239] dark:text-[#FAF7F0]">
            El Patrón Restaurante
          </h2>
          <p className="text-sm sm:text-base font-bold text-stone-700 dark:text-stone-200 max-w-2xl mx-auto font-serif-rustic italic leading-relaxed">
            Te damos la bienvenida a nuestra nueva casa. Una propuesta pensada para los amantes del buen comer, fusionando carnes de primera selección, pastas artesanales de autor y un salón distinguido de época.
          </p>
          <div className="w-20 h-1 bg-[#8C6239] mx-auto rounded-full" />
        </div>

        {/* 3 FEATURED CARDS SHOWCASING THE RESTAURANT DISHES & AMBIENCE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: Pera asada con queso azul y nueces */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-[#251B12] rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-xl overflow-hidden flex flex-col group hover:-translate-y-1.5 transition-all duration-300"
          >
            <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-stone-100 dark:bg-stone-900">
              <img 
                src="/images/inauguracion/pera_asada_roquefort.jpg" 
                alt="Pera asada al horno con queso azul fundido y nueces"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-4 left-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/65 backdrop-blur-md text-[#FAF7F0] text-[10px] font-black uppercase tracking-wider rounded-full border border-white/20 font-sans">
                  <UtensilsCrossed className="w-3 h-3 text-[#C8956A]" />
                  Cocina de Autor
                </span>
              </div>
              <div className="absolute bottom-3 left-4 right-4 text-white">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#E8C288] block font-bold">Entrada Destacada</span>
                <p className="text-base font-serif-rustic font-bold leading-tight">Pera Asada & Queso Azul</p>
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between space-y-4 font-serif-rustic">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-[#8C6239] dark:text-[#FAF7F0] leading-snug">
                  Pera Asada, Gorgonzola & Nueces
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed italic">
                  Pera tiernizada al horno con corazón de queso azul fundido, crocante de nueces seleccionadas y emulsión suave sobre bouquet de hojas verdes frescas.
                </p>
              </div>

              <div className="pt-3 border-t border-stone-150 dark:border-stone-800/80 flex items-center justify-between text-[11px] font-sans">
                <span className="font-bold text-[#8C6239] dark:text-[#C8956A] flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Especialidad de la Casa
                </span>
                <span className="font-semibold text-stone-400">Carta de Autor</span>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Pastas y Salmón rosado con vegetales */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white dark:bg-[#251B12] rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-xl overflow-hidden flex flex-col group hover:-translate-y-1.5 transition-all duration-300"
          >
            <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-stone-100 dark:bg-stone-900">
              <img 
                src="/images/inauguracion/pastas_y_salmon_grillado.jpg" 
                alt="Cintas caseras al huevo con panceta y salmón rosado grillado con vegetales"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-4 left-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/65 backdrop-blur-md text-[#FAF7F0] text-[10px] font-black uppercase tracking-wider rounded-full border border-white/20 font-sans">
                  <UtensilsCrossed className="w-3 h-3 text-[#C8956A]" />
                  Platos Principales
                </span>
              </div>
              <div className="absolute bottom-3 left-4 right-4 text-white">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#E8C288] block font-bold">Pastas & Pescados</span>
                <p className="text-base font-serif-rustic font-bold leading-tight">Cintas al Huevo & Salmón Grillé</p>
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between space-y-4 font-serif-rustic">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-[#8C6239] dark:text-[#FAF7F0] leading-snug">
                  Cintas con Panceta & Salmón a la Plancha
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed italic">
                  Pastas frescas amasadas a mano salteadas con panceta crocante dorada, acompañadas de corte fresco de salmón rosado a la plancha con papines andinos y espárragos.
                </p>
              </div>

              <div className="pt-3 border-t border-stone-150 dark:border-stone-800/80 flex items-center justify-between text-[11px] font-sans">
                <span className="font-bold text-[#8C6239] dark:text-[#C8956A] flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Elaboración Artesanal
                </span>
                <span className="font-semibold text-stone-400">Cocina al Momento</span>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Salón y ambientación histórica */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white dark:bg-[#251B12] rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-xl overflow-hidden flex flex-col group hover:-translate-y-1.5 transition-all duration-300"
          >
            <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-stone-100 dark:bg-stone-900">
              <img 
                src="/images/inauguracion/salon_patron_vitral.jpg" 
                alt="Ambiente del salón de El Patrón con vitrales artísticos y maderas nobles"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-4 left-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/65 backdrop-blur-md text-[#FAF7F0] text-[10px] font-black uppercase tracking-wider rounded-full border border-white/20 font-sans">
                  <Heart className="w-3 h-3 text-[#C8956A]" />
                  La Experiencia
                </span>
              </div>
              <div className="absolute bottom-3 left-4 right-4 text-white">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#E8C288] block font-bold">Nuestro Salón</span>
                <p className="text-base font-serif-rustic font-bold leading-tight">Tradición & Distinción</p>
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between space-y-4 font-serif-rustic">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-[#8C6239] dark:text-[#FAF7F0] leading-snug">
                  Espacio Cálido & Vitrales de Época
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed italic">
                  Un salón decorado con mobiliario en roble, vitrales históricos, aromaterapia artesanal y una cuidada acústica para que cada almuerzo o cena sea memorable.
                </p>
              </div>

              <div className="pt-3 border-t border-stone-150 dark:border-stone-800/80 flex items-center justify-between text-[11px] font-sans">
                <span className="font-bold text-[#8C6239] dark:text-[#C8956A] flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Climatización & Confort
                </span>
                <span className="font-semibold text-stone-400">Salón & Cava</span>
              </div>
            </div>
          </motion.div>

        </div>

        {/* INVITATION & RESERVATION BANNER */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#8C6239] via-[#6f4e2c] to-[#8C6239] text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="space-y-2 text-center md:text-left max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-bold font-sans uppercase tracking-widest text-amber-200">
              <Calendar className="w-3.5 h-3.5" /> ¡Puertas Abiertas!
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold font-serif-rustic tracking-wide">
              Sé parte de nuestra Gran Inauguración
            </h3>
            <p className="text-xs sm:text-sm text-amber-100/90 font-serif-rustic italic leading-relaxed">
              Vení a descubrir nuestra gastronomía y viví una experiencia única. Te recomendamos reservar tu mesa con anticipación para asegurar tu lugar.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
            <a
              href="#reserva"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#FAF7F0] hover:bg-white text-[#8C6239] font-black text-xs uppercase tracking-wider font-sans transition-all shadow-md text-center hover:scale-105 active:scale-95 cursor-pointer no-underline"
            >
              Reservar Mesa Online
            </a>
            <a
              href="#especialidades"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/15 hover:bg-white/25 text-[#FAF7F0] font-bold text-xs uppercase tracking-wider font-sans transition-all border border-white/30 text-center cursor-pointer no-underline"
            >
              Ver Nuestra Carta
            </a>
          </div>
        </motion.div>
      </section>

      {/* 6. BOOKING WIDGET */}
      <section id="reserva" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs uppercase font-bold text-[#8C6239] dark:text-[#8C6239] tracking-widest font-display-serif">Planificá tu Visita</span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-wide font-serif-rustic text-[#8C6239] dark:text-[#FAF7F0]">
            Solicitud de Reserva Online
          </h2>
          <p className="text-sm sm:text-base font-bold text-stone-850 dark:text-stone-200 max-w-lg mx-auto font-serif-rustic italic">
            Reserve su mesa con anticipación. Le enviaremos una confirmación de disponibilidad vía teléfono o WhatsApp a la brevedad.
          </p>
          <div className="w-16 h-1 bg-[#8C6239] dark:bg-[#8C6239] mx-auto rounded-full" />
        </div>

        <div className="max-w-2xl mx-auto bg-white dark:bg-[#251B12] rounded-3xl p-6 sm:p-10 border border-stone-200/60 dark:border-stone-850 shadow-lg">
          <form onSubmit={handleBookingSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Nombre y Apellido *</label>
                <input 
                  type="text" 
                  required
                  value={bookingForm.nombre}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-250 dark:border-stone-800 bg-[#FAF7F0] dark:bg-[#1E140E] text-stone-850 dark:text-white text-xs font-bold focus:outline-none focus:border-[#8C6239] dark:focus:border-[#8C6239]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Número de Teléfono *</label>
                <input 
                  type="tel" 
                  required
                  inputMode="tel"
                  maxLength={25}
                  value={bookingForm.telefono}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, telefono: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-250 dark:border-stone-800 bg-[#FAF7F0] dark:bg-[#1E140E] text-stone-850 dark:text-white text-xs font-bold focus:outline-none focus:border-[#8C6239] dark:focus:border-[#8C6239]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Cantidad de Comensales *</label>
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
                  min={argentinaDateIso()}
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
                <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Horario *</label>
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
              Solicitar Reserva por WhatsApp (358-4303541)
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>

      <footer id="contacto" className="bg-[#8C6239] text-stone-900 py-16 border-t border-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-12">
          
          {/* Logo & Brand description */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={onEnterSystem}
              className="flex items-center gap-3.5 cursor-pointer bg-transparent border-0 p-0 text-left"
              aria-label="Ingresar al sistema El Patrón"
              title="El Patrón"
            >
              <img src="/logo-el-patron.jpeg" alt="Logo El Patrón" className="w-16 h-16 object-cover rounded-full border border-black/10" />
              <span className="font-extrabold text-xl tracking-widest text-stone-950 font-display-serif">EL PATRÓN</span>
            </button>
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
                <span className="font-display-serif">+54 9 358 430-3541</span>
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
              
              <div className="space-y-3 text-left bg-stone-50 dark:bg-stone-900/40 p-4 rounded-2xl border border-stone-200/60 dark:border-stone-800">
                <h3 className="text-lg font-bold font-serif-rustic text-center text-[#8C6239] dark:text-white tracking-wide">
                  ¡Solicitud de Reserva Lista!
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-300 text-center font-serif-rustic italic">
                  Se generó el mensaje automático para tomar tu pedido de reserva:
                </p>
                <div className="text-[11px] space-y-1 text-stone-700 dark:text-stone-300 border-t border-stone-200/60 dark:border-stone-800 pt-2 font-mono">
                  <div><strong>Cliente:</strong> {bookingForm.nombre}</div>
                  <div><strong>Teléfono:</strong> {bookingForm.telefono}</div>
                  <div><strong>Comensales:</strong> {bookingForm.personas} personas</div>
                  <div><strong>Fecha:</strong> {bookingForm.fecha}</div>
                  <div><strong>Horario:</strong> {bookingForm.hora} hs</div>
                  <div><strong>Destino:</strong> WhatsApp (3584303541)</div>
                </div>
              </div>

              <div className="space-y-2">
                <a
                  href={buildReservationWhatsAppUrl(bookingForm, '5493584303541')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Enviar a WhatsApp (358-4303541)
                </a>

                <button
                  type="button"
                  onClick={closeBookingSuccess}
                  className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border border-stone-250 dark:border-stone-700"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
