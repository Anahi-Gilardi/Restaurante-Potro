export type DiagnosticStorageTarget = 'local-cache' | 'supabase-cloud';

export const diagnosticTargetLabel = (target: DiagnosticStorageTarget): string => (
  target === 'local-cache' ? 'Cache local del navegador' : 'Supabase PostgreSQL (Cloud)'
);

export const latencyNeedleAngle = (milliseconds: number): number => {
  const bounded = Math.max(0, Math.min(milliseconds, 300));
  return (bounded / 300) * 180 - 90;
};

export const latencyRating = (milliseconds: number): 'Muy rapido' | 'Normal' | 'Lento' => {
  if (milliseconds < 60) return 'Muy rapido';
  if (milliseconds < 150) return 'Normal';
  return 'Lento';
};
