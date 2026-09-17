import { useEffect, useState, useCallback } from 'react';
import { Categoria } from '../types';
import { categoriasService, DEFAULT_CATEGORIAS, mergeWithDefaultCategories } from '../services/categoriasService';

function getInitialCategories(): Categoria[] {
  try {
    const cached = localStorage.getItem('el_patron_cache_categorias');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return mergeWithDefaultCategories(parsed);
      }
    }
  } catch {}
  return [...DEFAULT_CATEGORIAS];
}

// Global in-memory cache to prevent multiple mounts from firing multiple fetch requests simultaneously
let globalCategoriesCache: Categoria[] | null = null;
let globalCachePromise: Promise<Categoria[]> | null = null;

export function useCategories(isAdmin = false) {
  const [categories, setCategories] = useState<Categoria[]>(() => globalCategoriesCache ?? getInitialCategories());
  const [loading, setLoading] = useState<boolean>(() => !globalCategoriesCache && !localStorage.getItem('el_patron_cache_categorias'));
  const [error, setError] = useState<Error | null>(null);

  const fetchCategories = useCallback(async (force = false) => {
    if (globalCategoriesCache && !force) {
      setCategories(globalCategoriesCache);
      setLoading(false);
      return;
    }

    try {
      if (!globalCachePromise || force) {
        globalCachePromise = categoriasService.list();
      }
      const data = await globalCachePromise;
      globalCategoriesCache = data;
      setCategories(data);
      setError(null);
    } catch (err) {
      console.error('[useCategories] Failed to load categories:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      // Fallback is already handled inside the service (returns DEFAULT_CATEGORIAS)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // If the user is an admin, revalidate (refetch) every 5 minutes (300000 ms)
  useEffect(() => {
    if (!isAdmin) return;

    const intervalId = setInterval(() => {
      console.log('[useCategories] Admin revalidation interval triggered');
      fetchCategories(true);
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [isAdmin, fetchCategories]);

  const refetch = useCallback(() => {
    return fetchCategories(true);
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    refetch
  };
}
