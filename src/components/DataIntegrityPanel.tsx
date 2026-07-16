import { AlertTriangle, CheckCircle, DatabaseZap, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import type { DataIntegrityReport } from '../lib/dataIntegrity';

interface DataIntegrityPanelProps {
  report: DataIntegrityReport | null;
  loading: boolean;
  cleaning: boolean;
  error: string;
  onRefresh: () => void;
  onCleanup: () => void;
}

export default function DataIntegrityPanel({
  report,
  loading,
  cleaning,
  error,
  onRefresh,
  onCleanup,
}: DataIntegrityPanelProps) {
  const statusStyle = report?.status === 'critical'
    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900'
    : report?.status === 'attention'
      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900';

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4" data-testid="supabase-integrity-panel">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3 text-left">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#8C6239]/10 text-[#8C6239] dark:text-[#C8956A]">
            <DatabaseZap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider text-stone-400 block">PostgreSQL relacional</span>
            <h3 className="font-extrabold text-[#8C6239] dark:text-[#C8956A] text-sm uppercase tracking-tight mt-0.5">Limpieza e integridad de Supabase</h3>
            <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
              Verifica relaciones, cantidades, duplicados y trazabilidad sin borrar ventas ni modificar stock físico.
            </p>
          </div>
        </div>
        <span className={`self-start px-2.5 py-1 rounded-full text-[8px] font-black uppercase border ${loading ? 'bg-stone-50 text-stone-500 border-stone-200 dark:bg-stone-850 dark:border-stone-700' : statusStyle}`}>
          {loading ? 'Analizando...' : report?.status === 'critical' ? 'Requiere corrección' : report?.status === 'attention' ? 'Revisión manual' : 'Integridad correcta'}
        </span>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-rose-100 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/10 p-3 text-center">
              <b className="block font-mono text-lg text-rose-600">{report.summary.critical}</b>
              <span className="text-[8px] font-black uppercase text-rose-700 dark:text-rose-400">Críticos</span>
            </div>
            <div className="rounded-xl border border-amber-100 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/10 p-3 text-center">
              <b className="block font-mono text-lg text-amber-600">{report.summary.warnings}</b>
              <span className="text-[8px] font-black uppercase text-amber-700 dark:text-amber-400">Advertencias</span>
            </div>
            <div className="rounded-xl border border-sky-100 dark:border-sky-900/50 bg-sky-50/50 dark:bg-sky-950/10 p-3 text-center">
              <b className="block font-mono text-lg text-sky-600">{report.summary.information}</b>
              <span className="text-[8px] font-black uppercase text-sky-700 dark:text-sky-400">Informativos</span>
            </div>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {report.issues.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 p-3 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle className="w-4 h-4 shrink-0" />
                No se detectaron inconsistencias operativas.
              </div>
            ) : report.issues.map(issue => (
              <div key={issue.code} className="rounded-xl border border-stone-150 dark:border-stone-800 p-3 text-left bg-stone-50/50 dark:bg-stone-950/30">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`text-[9px] font-black uppercase ${issue.severity === 'critical' ? 'text-rose-600' : issue.severity === 'warning' ? 'text-amber-600' : 'text-sky-600'}`}>{issue.title}</span>
                    <p className="text-[9px] text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">{issue.description}</p>
                  </div>
                  <span className="font-mono text-[9px] font-black px-2 py-1 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-750 shrink-0">{issue.count}</span>
                </div>
                {issue.sampleIds.length > 0 && (
                  <p className="text-[8px] font-mono text-stone-400 mt-1.5 truncate" title={issue.sampleIds.join(', ')}>IDs: {issue.sampleIds.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 p-3 text-[9px] font-semibold text-rose-800 dark:text-rose-300">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button type="button" onClick={onRefresh} disabled={loading || cleaning} className="py-2.5 px-4 rounded-xl border border-stone-200 dark:border-stone-750 text-stone-700 dark:text-stone-200 text-[9px] font-black uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 hover:bg-stone-50 dark:hover:bg-stone-850">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Reanalizar
        </button>
        <button type="button" onClick={onCleanup} disabled={loading || cleaning} className="py-2.5 px-4 rounded-xl bg-[#624A3E] hover:bg-[#503B32] text-white text-[9px] font-black uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
          {cleaning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          Limpieza segura
        </button>
      </div>
    </div>
  );
}
