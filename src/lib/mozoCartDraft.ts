export type MozoCart = Record<string, number>;

export interface MozoCartDraft {
  cart: MozoCart;
  observaciones: string;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const STORAGE_PREFIX = 'mozo_cart_draft_v1';

export function getMozoCartDraftKey(mesaId: number): string {
  return `${STORAGE_PREFIX}:${mesaId}`;
}

export function sanitizeMozoCart(value: unknown): MozoCart {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, unknown>).reduce<MozoCart>((acc, [productId, qty]) => {
    const parsed = Number(qty);
    if (productId && Number.isFinite(parsed) && parsed > 0) {
      acc[productId] = Math.floor(parsed);
    }
    return acc;
  }, {});
}

export function readMozoCartDraft(mesaId: number, storage: StorageLike | null | undefined = getBrowserStorage()): MozoCartDraft {
  if (!storage) return { cart: {}, observaciones: '' };

  try {
    const raw = storage.getItem(getMozoCartDraftKey(mesaId));
    if (!raw) return { cart: {}, observaciones: '' };

    const parsed = JSON.parse(raw) as Partial<MozoCartDraft>;
    return {
      cart: sanitizeMozoCart(parsed.cart),
      observaciones: typeof parsed.observaciones === 'string' ? parsed.observaciones : '',
    };
  } catch {
    return { cart: {}, observaciones: '' };
  }
}

export function writeMozoCartDraft(
  mesaId: number,
  draft: MozoCartDraft,
  storage: StorageLike | null | undefined = getBrowserStorage(),
): void {
  if (!storage) return;

  const cleanDraft: MozoCartDraft = {
    cart: sanitizeMozoCart(draft.cart),
    observaciones: draft.observaciones.trim(),
  };

  const isEmpty = Object.keys(cleanDraft.cart).length === 0 && cleanDraft.observaciones.length === 0;
  try {
    if (isEmpty) {
      storage.removeItem(getMozoCartDraftKey(mesaId));
      return;
    }

    storage.setItem(getMozoCartDraftKey(mesaId), JSON.stringify(cleanDraft));
  } catch {
    // El POS debe seguir operativo aunque localStorage falle por cuota o modo privado.
  }
}

export function clearMozoCartDraft(mesaId: number, storage: StorageLike | null | undefined = getBrowserStorage()): void {
  try {
    storage?.removeItem(getMozoCartDraftKey(mesaId));
  } catch {
    // No bloquear la operación principal por un fallo de almacenamiento local.
  }
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}
