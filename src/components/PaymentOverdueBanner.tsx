import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react';

/**
 * Interruptor maestro para activar/desactivar el cartel.
 * Mantener en 'false' para que el cartel permanezca completamente quitado.
 */
export const PAYMENT_BANNER_ACTIVE = false;

interface PaymentOverdueBannerProps {
  titulo?: string;
  mensaje?: string;
  contacto?: string;
}

export default function PaymentOverdueBanner({
  titulo = 'Aviso de Pago Pendiente',
  mensaje = 'El abono del servicio presenta una cuota pendiente de regularización.',
  contacto = 'Regularizar servicio'
}: PaymentOverdueBannerProps) {
  const [minimized, setMinimized] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  React.useEffect(() => {
    if (!PAYMENT_BANNER_ACTIVE && typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('el_patron_banner_pago');
      } catch {}
    }
  }, []);

  const isEnabled = PAYMENT_BANNER_ACTIVE;

  if (!isEnabled || dismissed) {
    return null;
  }

  return (
    <div
      className="fixed top-2.5 right-2.5 sm:top-3 sm:right-3 z-50 pointer-events-auto max-w-[220px] sm:max-w-[240px] w-full animate-fadeIn select-none opacity-80 hover:opacity-100 transition-opacity duration-200"
      role="alert"
    >
      <div className="bg-stone-950/40 backdrop-blur-md text-white border border-rose-500/40 rounded-xl p-2 shadow-lg shadow-black/30">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-lg bg-rose-500/20 border border-rose-400/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-3 h-3 text-rose-300" />
            </div>
            <div className="min-w-0">
              <span className="text-[8px] font-black uppercase tracking-wider text-rose-300/80 block leading-none">
                Estado de Cuenta
              </span>
              <h4 className="text-[10px] font-bold tracking-tight text-white leading-tight truncate">
                {titulo}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setMinimized(!minimized)}
              className="text-rose-300/80 hover:text-white p-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
              title={minimized ? 'Expandir aviso' : 'Minimizar aviso'}
            >
              {minimized ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-rose-300/60 hover:text-white p-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
              title="Cerrar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {!minimized && (
          <div className="mt-1.5 pt-1.5 border-t border-rose-500/20 space-y-1.5">
            <p className="text-[9.5px] text-rose-100/85 leading-snug font-normal">
              {mensaje}
            </p>
            {contacto && (
              <div className="flex items-center justify-between text-[9px] font-bold text-rose-200 bg-black/40 px-2 py-1 rounded border border-rose-500/20">
                <span>En observación</span>
                <span className="text-rose-300 underline underline-offset-2">{contacto}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
