import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Interruptor maestro para activar/desactivar el cartel.
 * Por defecto está en 'false'. Cuando el usuario indique activarlo,
 * basta con cambiar este valor a 'true' o usar window.localStorage.setItem('el_patron_banner_pago', 'true').
 */
export const PAYMENT_BANNER_ACTIVE = true;

interface PaymentOverdueBannerProps {
  titulo?: string;
  mensaje?: string;
  contacto?: string;
}

export default function PaymentOverdueBanner({
  titulo = 'Aviso de Pago Pendiente',
  mensaje = 'El abono del servicio presenta una cuota pendiente de regularización. Por favor comuníquese con administración.',
  contacto = 'Regularizar servicio'
}: PaymentOverdueBannerProps) {
  const [minimized, setMinimized] = useState(false);

  // Verificamos si está activo por código o por localStorage para pruebas rápidas
  const isEnabled = PAYMENT_BANNER_ACTIVE || (typeof window !== 'undefined' && window.localStorage.getItem('el_patron_banner_pago') === 'true');

  if (!isEnabled) {
    return null;
  }

  return (
    <div
      className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 pointer-events-auto max-w-[320px] sm:max-w-sm w-full animate-fadeIn select-none"
      role="alert"
    >
      <div className="bg-gradient-to-br from-rose-900/95 via-rose-950/95 to-stone-950/95 backdrop-blur-md text-white border-2 border-rose-500/80 rounded-2xl p-3.5 shadow-2xl shadow-rose-950/50 ring-2 ring-rose-500/20">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-300 animate-pulse" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-rose-300/90 block">
                Estado de Cuenta
              </span>
              <h4 className="text-xs font-black tracking-tight text-white leading-tight">
                {titulo}
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMinimized(!minimized)}
            className="text-rose-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title={minimized ? 'Expandir aviso' : 'Minimizar aviso'}
          >
            {minimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {!minimized && (
          <div className="mt-2.5 pt-2.5 border-t border-rose-500/30 space-y-2">
            <p className="text-[11px] text-rose-100/90 leading-snug font-medium">
              {mensaje}
            </p>
            {contacto && (
              <div className="flex items-center justify-between text-[10px] font-extrabold text-rose-200 bg-black/30 px-2.5 py-1.5 rounded-lg border border-rose-500/30">
                <span>⚠️ Servicio en observación</span>
                <span className="text-rose-300 underline underline-offset-2">{contacto}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
