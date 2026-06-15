import React, { useState, useMemo, useCallback } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Percent, Search, CheckCircle, X, Eye, Save, AlertTriangle } from 'lucide-react';
import { ProductoMenu } from '../types';
import { menuService } from '../services/menuService';

interface BulkPriceEditorProps {
  items: ProductoMenu[];
  onItemsChange: (items: ProductoMenu[]) => void;
  addLog: (tipo: any, mensaje: string) => void;
}

type AdjustmentType = 'percentage' | 'fixed';

export default function BulkPriceEditor({ items, onItemsChange, addLog }: BulkPriceEditorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('percentage');
  const [adjustmentValue, setAdjustmentValue] = useState('');
  const [isIncrease, setIsIncrease] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.categoria));
    return ['todas', ...Array.from(cats)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return selectedCategory === 'todas'
      ? items.filter(i => i.activo !== false)
      : items.filter(i => i.categoria === selectedCategory && i.activo !== false);
  }, [items, selectedCategory]);

  const previewItems = useMemo(() => {
    if (!adjustmentValue || isNaN(Number(adjustmentValue))) return filteredItems;
    const val = Number(adjustmentValue);
    return filteredItems.map(item => {
      let newPrice: number;
      if (adjustmentType === 'percentage') {
        const factor = isIncrease ? (1 + val / 100) : (1 - val / 100);
        newPrice = Math.round(item.precio_venta * factor);
      } else {
        newPrice = isIncrease ? item.precio_venta + val : Math.max(0, item.precio_venta - val);
      }
      return { ...item, precio_venta: newPrice };
    });
  }, [filteredItems, adjustmentValue, adjustmentType, isIncrease]);

  const handleApply = useCallback(async () => {
    if (previewItems.length === 0) return;
    setSaving(true);
    const updates = previewItems.map(item => ({
      id: item.id_producto,
      precio_venta: item.precio_venta
    }));

    try {
      await menuService.bulkUpdatePrices(updates);
      onItemsChange(items.map(orig => {
        const updated = previewItems.find(p => p.id_producto === orig.id_producto);
        return updated ? { ...orig, precio_venta: updated.precio_venta } : orig;
      }));
      const mode = adjustmentType === 'percentage' ? `${adjustmentValue}%` : `$${adjustmentValue}`;
      const dir = isIncrease ? 'aumento' : 'descuento';
      addLog('sistema', `PRECIOS: Actualización masiva (${dir} ${mode}) aplicada a ${updates.length} productos.`);
      setShowPreview(false);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [previewItems, items, onItemsChange, adjustmentType, adjustmentValue, isIncrease, addLog]);

  if (showPreview) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black text-stone-800 uppercase tracking-tight flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#624A3E]" />
            Vista Previa ({previewItems.length} productos)
          </h4>
          <button onClick={() => setShowPreview(false)}
            className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-500 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[400px] overflow-y-auto space-y-1.5 border border-stone-200 rounded-xl">
          {previewItems.map(item => {
            const original = items.find(i => i.id_producto === item.id_producto)!;
            const diff = item.precio_venta - original.precio_venta;
            const diffPct = ((diff / original.precio_venta) * 100).toFixed(1);
            return (
              <div key={item.id_producto} className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100 last:border-0 hover:bg-stone-50/50">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-stone-800 block truncate">{item.nombre}</span>
                  <span className="text-[9px] text-stone-400 uppercase">{item.categoria}</span>
                </div>
                <div className="flex items-center gap-3 text-right shrink-0">
                  <span className="text-xs font-mono text-stone-400 line-through">${original.precio_venta.toLocaleString('es-AR')}</span>
                  <span className="text-xs font-black font-mono text-stone-900">${item.precio_venta.toLocaleString('es-AR')}</span>
                  <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${diff > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {diff > 0 ? '+' : ''}{diffPct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={() => setShowPreview(false)}
            className="flex-1 py-2.5 border border-stone-200 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-50 cursor-pointer transition-colors">
            Cancelar
          </button>
          <button onClick={handleApply} disabled={saving}
            className="flex-1 py-2.5 bg-[#624A3E] hover:bg-[#503C32] disabled:bg-stone-300 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-colors">
            <Save className="w-4 h-4" />
            {saving ? 'Aplicando...' : `Confirmar ${previewItems.length} cambios`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50/40 border border-amber-200/60 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-amber-100 rounded-lg">
          <DollarSign className="w-4 h-4 text-amber-700" />
        </div>
        <div>
          <h4 className="text-sm font-black text-stone-800 uppercase tracking-tight">Actualización Masiva de Precios</h4>
          <p className="text-[10px] text-stone-500">Aplica cambios porcentuales o montos fijos por categoría</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="text-[9px] font-black text-stone-500 uppercase block mb-1">Categoría</label>
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
            className="w-full text-xs p-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#624A3E] cursor-pointer font-bold text-stone-700">
            {categories.map(c => <option key={c} value={c}>{c === 'todas' ? 'Todas las categorías' : c}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[9px] font-black text-stone-500 uppercase block mb-1">Tipo</label>
          <div className="flex rounded-xl border border-stone-200 overflow-hidden">
            <button onClick={() => setAdjustmentType('percentage')}
              className={`flex-1 py-2 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${adjustmentType === 'percentage' ? 'bg-[#624A3E] text-white' : 'bg-white text-stone-600 hover:bg-stone-50'}`}>
              <Percent className="w-3 h-3" /> %
            </button>
            <button onClick={() => setAdjustmentType('fixed')}
              className={`flex-1 py-2 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${adjustmentType === 'fixed' ? 'bg-[#624A3E] text-white' : 'bg-white text-stone-600 hover:bg-stone-50'}`}>
              <DollarSign className="w-3 h-3" /> Fijo
            </button>
          </div>
        </div>

        <div>
          <label className="text-[9px] font-black text-stone-500 uppercase block mb-1">Dirección</label>
          <div className="flex rounded-xl border border-stone-200 overflow-hidden">
            <button onClick={() => setIsIncrease(true)}
              className={`flex-1 py-2 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${isIncrease ? 'bg-emerald-600 text-white' : 'bg-white text-stone-600 hover:bg-stone-50'}`}>
              <TrendingUp className="w-3 h-3" /> + Subir
            </button>
            <button onClick={() => setIsIncrease(false)}
              className={`flex-1 py-2 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${!isIncrease ? 'bg-red-600 text-white' : 'bg-white text-stone-600 hover:bg-stone-50'}`}>
              <TrendingDown className="w-3 h-3" /> - Bajar
            </button>
          </div>
        </div>

        <div>
          <label className="text-[9px] font-black text-stone-500 uppercase block mb-1">
            {adjustmentType === 'percentage' ? 'Valor %' : 'Monto $'}
          </label>
          <input type="number" value={adjustmentValue} onChange={e => setAdjustmentValue(e.target.value)}
            placeholder={adjustmentType === 'percentage' ? 'Ej: 10' : 'Ej: 500'}
            className="w-full text-xs p-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#624A3E]" />
        </div>

        <div className="flex items-end">
          <button onClick={() => setShowPreview(true)} disabled={!adjustmentValue || filteredItems.length === 0}
            className="w-full py-2 bg-[#624A3E] hover:bg-[#503C32] disabled:bg-stone-300 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 h-[34px]">
            <Eye className="w-4 h-4" />
            Previsualizar
          </button>
        </div>
      </div>

      <p className="text-[10px] text-stone-400 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3 text-amber-500" />
        {filteredItems.length} productos afectados. Siempre podrás previsualizar antes de guardar.
      </p>
    </div>
  );
}
