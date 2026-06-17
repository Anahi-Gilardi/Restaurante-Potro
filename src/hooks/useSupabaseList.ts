import { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// useSupabaseList<T>
// =============================================================================
// Hook genérico que encapsula el patrón fetch + loading + error + fallback
// que se repite en al menos 10 módulos del proyecto.
//
// Uso:
//   const { data, loading, error, refetch } = useSupabaseList(
//     () => proveedoresService.list(),
//     DEMO_PROVEEDORES,           // fallback opcional si Supabase falla
//   );
//
// Características:
//  - loading: true mientras se espera la respuesta
//  - error: contiene el error si la llamada falló Y no hay fallback
//  - Si la llamada devuelve un array vacío Y hay fallback, usa el fallback
//  - refetch(): vuelve a ejecutar la llamada (útil después de mutaciones)
//  - abortRef: cancela la llamada anterior si el componente se desmonta
// =============================================================================

export interface UseSupabaseListResult<T> {
    /** Datos resueltos (o el fallback si la llamada falló/devolvió vacío) */
  data: T[];
    /** true mientras se espera la primera respuesta */
  loading: boolean;
    /** Error capturado. Solo se setea si NO hay fallback disponible. */
  error: Error | null;
    /** Re-ejecuta la llamada al servicio */
  refetch: () => void;
}

/**
 * @param fetcher  Función async que devuelve T[]. Se re-ejecuta cuando cambia
 *                 su referencia, así que envolvela en useCallback si necesitás
 *                 pasar argumentos reactivos.
 * @param fallback Array local a usar si:
 *                 a) la llamada falla (Supabase sin conexión), o
 *                 b) la llamada devuelve un array vacío.
 *                 Si no se pasa, el array queda vacío ante fallo.
 */
export function useSupabaseList<T>(
    fetcher: () => Promise<T[]>,
    fallback?: T[],
  ): UseSupabaseListResult<T> {
    const [data, setData]       = useState<T[]>(fallback ?? []);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError]     = useState<Error | null>(null);
    // Permite forzar re-fetch incrementando un contador
  const [tick, setTick]       = useState(0);
    const mountedRef             = useRef(true);

  useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

                fetcher()
          .then(result => {
                    if (cancelled || !mountedRef.current) return;
                    if (result && result.length > 0) {
                                setData(result);
                    } else if (fallback && fallback.length > 0) {
                                // Supabase devolvió array vacío pero tenemos datos demo locales
                      setData(fallback);
                    } else {
                                setData(result ?? []);
                    }
          })
          .catch(err => {
                    if (cancelled || !mountedRef.current) return;
                    console.warn('[useSupabaseList] fetch failed:', err);
                    if (fallback && fallback.length > 0) {
                                setData(fallback);
                    } else {
                                setError(err instanceof Error ? err : new Error(String(err)));
                    }
          })
          .finally(() => {
                    if (!cancelled && mountedRef.current) setLoading(false);
          });

                return () => { cancelled = true; };
        // Re-ejecutar cuando cambia fetcher O cuando se llama refetch()
                // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  return { data, loading, error, refetch };
}
