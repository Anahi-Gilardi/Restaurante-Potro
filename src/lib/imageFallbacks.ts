export const DEFAULT_PRODUCT_IMAGE = '/logo-el-patron-512.png';

const BROKEN_UNSPLASH_REPLACEMENTS: Record<string, string> = {
  'photo-1511181642675-9312b3e201c5': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80&auto=format&fit=crop',
  'photo-1592417817098-8f3d6eb19675': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80&auto=format&fit=crop',
  'photo-1582231317502-d45089c25373': 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=500&q=80&auto=format&fit=crop',
  'photo-1602489114881-2244463dfde3': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80&auto=format&fit=crop',
  'photo-1594212699903-ec8a3cee50f6': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80&auto=format&fit=crop',
  'photo-1608885898957-a599fb18ec3f': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80&auto=format&fit=crop',
  'photo-1551183053-f57a3e72c842': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=500&q=80&auto=format&fit=crop',
};

export function getSafeImageSrc(src?: string): string {
  if (!src) return DEFAULT_PRODUCT_IMAGE;
  const replacementKey = Object.keys(BROKEN_UNSPLASH_REPLACEMENTS).find(key => src.includes(key));
  return replacementKey ? BROKEN_UNSPLASH_REPLACEMENTS[replacementKey] : src;
}

