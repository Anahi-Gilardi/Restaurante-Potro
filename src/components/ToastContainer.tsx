/**
 * ToastContainer.tsx
 * Sistema de notificaciones inline que reemplaza los alert() nativos.
 *
 * Uso:
 *   const { toasts, toast } = useToast();
 *   toast.success('Merma registrada correctamente');
 *   toast.error('Stock insuficiente para esa operacion');
 *   <ToastContainer toasts={toasts} onDismiss={dismissToast} />
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ToastMessage, ToastType } from '../types';

// ── Hook principal ────────────────────────────────────────────────────────────

export function useToast() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const counterRef = useRef(0);

  const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
        counterRef.current += 1;
        const id = `toast_${Date.now()}_${counterRef.current}`;
        setToasts(prev => [...prev, { id, type, message, duration }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
        success: (msg: string, dur?: number) => addToast('success', msg, dur),
        error:   (msg: string, dur?: number) => addToast('error',   msg, dur),
        warning: (msg: string, dur?: number) => addToast('warning', msg, dur),
        info:    (msg: string, dur?: number) => addToast('info',    msg, dur),
  };

  return { toasts, toast, dismissToast, removeToast: dismissToast };
}

// ── Item individual ───────────────────────────────────────────────────────────

interface ToastItemProps {
    toast: ToastMessage;
    onDismiss: (id: string) => void;
}

const ICON_MAP: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle  className="w-4 h-4 flex-shrink-0" />,
    error:   <XCircle      className="w-4 h-4 flex-shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 flex-shrink-0" />,
    info:    <Info          className="w-4 h-4 flex-shrink-0" />,
};

const STYLE_MAP: Record<ToastType, string> = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error:   'bg-red-50    border-red-200    text-red-800',
    warning: 'bg-amber-50  border-amber-200  text-amber-800',
    info:    'bg-blue-50   border-blue-200   text-blue-800',
};

const PROGRESS_COLOR: Record<ToastType, string> = {
    success: 'bg-emerald-400',
    error:   'bg-red-400',
    warning: 'bg-amber-400',
    info:    'bg-blue-400',
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
    const [visible, setVisible] = useState(false);
    const duration = toast.duration ?? 4000;

  // Fade-in on mount
  useEffect(() => {
        const t = setTimeout(() => setVisible(true), 10);
        return () => clearTimeout(t);
  }, []);

  // Auto-dismiss
  useEffect(() => {
        const t = setTimeout(() => {
                setVisible(false);
                setTimeout(() => onDismiss(toast.id), 300); // espera transition
        }, duration);
        return () => clearTimeout(t);
  }, [duration, toast.id, onDismiss]);

  return (
        <div
                role="alert"
                aria-live="assertive"
                className={`
                        flex items-start gap-3 px-4 py-3 rounded-xl border shadow-md
                                transition-all duration-300 ease-out w-80 max-w-full
                                        ${STYLE_MAP[toast.type]}
                                                ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
                                                      `}
              >
          {/* Icono */}
              <span className="mt-0.5">{ICON_MAP[toast.type]}</span>
        
          {/* Mensaje */}
              <p className="text-xs font-semibold flex-1 leading-snug">{toast.message}</p>
        
          {/* Botón cerrar */}
              <button
                        onClick={() => {
                                    setVisible(false);
                                    setTimeout(() => onDismiss(toast.id), 300);
                        }}
                        className="ml-auto opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
                        aria-label="Cerrar notificacion"
                      >
                      <X className="w-3.5 h-3.5" />
              </button>
        
          {/* Barra de progreso */}
              <div
                        className={`absolute bottom-0 left-0 h-0.5 rounded-bl-xl ${PROGRESS_COLOR[toast.type]}`}
                        style={{
                                    animation: `toast-shrink ${duration}ms linear forwards`,
                                    width: '100%',
                        }}
                      />
        </div>
      );
}

// ── Contenedor global (esquina superior derecha) ──────────────────────────────

interface ToastContainerProps {
    toasts: ToastMessage[];
    onDismiss?: (id: string) => void;
    removeToast?: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss, removeToast }: ToastContainerProps) {
    if (toasts.length === 0) return null;
    const dismiss = onDismiss || removeToast;
    if (!dismiss) return null;
  
    return (
          <>
            {/* Keyframes CSS inline para la barra de progreso */}
                <style>{`
                        @keyframes toast-shrink {
                                  from { width: 100%; }
                                            to   { width: 0%; }
                                                    }
                                                          `}</style>
          
                <div
                          aria-label="Notificaciones"
                          className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
                        >
                  {toasts.map(t => (
                                    <div key={t.id} className="pointer-events-auto relative overflow-hidden">
                                                <ToastItem toast={t} onDismiss={dismiss} />
                                    </div>
                                  ))}
                </div>
          </>
        );
}

export default ToastContainer;
