export type MozoCart = Record<string, number>;

export interface MozoCartDraft {
  cart: MozoCart;
  observaciones: string;
  mesaId: number;
  mozo?: string;
  createdAt: number;
  updatedAt: number;
  idempotencyKey: string;
  schemaVersion: 2;
}

export interface MozoCartDraftInput {
  cart: MozoCart;
  observaciones: string;
  mozo?: string;
  now?: number;
  idempotencyKey?: string;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const STORAGE_PREFIX = 'mozo_cart_draft_v1';
export const MOZO_CART_DRAFT_TTL_MS = 45 * 60 * 1000;

export function getMozoCartDraftKey(mesaId: number): string {
  return `${STORAGE_PREFIX}:${mesaId}`;
}

export function createMozoCartIdempotencyKey(mesaId: number, now = Date.now()): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `mozo-${mesaId}-${now}-${randomPart}`;
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

export function isMozoCartDraftExpired(draft: Pick<MozoCartDraft, 'updatedAt'>, now = Date.now()): boolean {
  return now - draft.updatedAt > MOZO_CART_DRAFT_TTL_MS;
}

export function readMozoCartDraft(
  mesaId: number,
  storage: StorageLike | null | undefined = getBrowserStorage(),
  now = Date.now(),
): MozoCartDraft | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(getMozoCartDraftKey(mesaId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<MozoCartDraft>;
    const createdAt = typeof parsed.createdAt === 'number' ? parsed.createdAt : now;
    const updatedAt = typeof parsed.updatedAt === 'number' ? parsed.updatedAt : createdAt;
    const draft: MozoCartDraft = {
      cart: sanitizeMozoCart(parsed.cart),
      observaciones: typeof parsed.observaciones === 'string' ? parsed.observaciones : '',
      mesaId,
      mozo: typeof parsed.mozo === 'string' ? parsed.mozo : undefined,
      createdAt,
      updatedAt,
      idempotencyKey: typeof parsed.idempotencyKey === 'string'
        ? parsed.idempotencyKey
        : createMozoCartIdempotencyKey(mesaId, createdAt),
      schemaVersion: 2,
    };

    if (isMozoCartDraftExpired(draft, now)) {
      clearMozoCartDraft(mesaId, storage);
      return null;
    }

    return draft;
  } catch {
    return null;
  }
}

export function writeMozoCartDraft(
  mesaId: number,
  draft: MozoCartDraftInput,
  storage: StorageLike | null | undefined = getBrowserStorage(),
): void {
  if (!storage) return;

  const now = draft.now ?? Date.now();
  const existing = readMozoCartDraft(mesaId, storage, now);
  const cleanDraft: MozoCartDraft = {
    cart: sanitizeMozoCart(draft.cart),
    observaciones: draft.observaciones.trim(),
    mesaId,
    mozo: draft.mozo,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    idempotencyKey: draft.idempotencyKey ?? existing?.idempotencyKey ?? createMozoCartIdempotencyKey(mesaId, now),
    schemaVersion: 2,
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
