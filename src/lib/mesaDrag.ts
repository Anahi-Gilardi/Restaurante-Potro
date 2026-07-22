export interface MesaDragPositionInput {
  pointerX: number;
  pointerY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  snap?: number;
}

export interface MesaDragPosition {
  x: number;
  y: number;
}

const MAP_WIDTH = 430;
const MAP_HEIGHT = 620;
const MAP_PADDING = 15;

export function calculateMesaDragPosition({
  pointerX,
  pointerY,
  offsetX,
  offsetY,
  width,
  height,
  snap = 1,
}: MesaDragPositionInput): MesaDragPosition {
  const safeSnap = Number.isFinite(snap) && snap > 1 ? snap : 1;
  const rawX = pointerX - offsetX;
  const rawY = pointerY - offsetY;
  const snappedX = Math.round(rawX / safeSnap) * safeSnap;
  const snappedY = Math.round(rawY / safeSnap) * safeSnap;

  return {
    x: Math.max(MAP_PADDING, Math.min(MAP_WIDTH - width - MAP_PADDING, snappedX)),
    y: Math.max(MAP_PADDING, Math.min(MAP_HEIGHT - height - MAP_PADDING, snappedY)),
  };
}
