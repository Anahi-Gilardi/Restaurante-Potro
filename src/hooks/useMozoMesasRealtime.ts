import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { mesasService } from '../services/mesasService';
import type { Mesa } from '../types';

type MesaRealtimePayload = {
  eventType?: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: Partial<Mesa>;
  old?: Partial<Mesa>;
};

type RealtimeChannel = {
  unsubscribe?: () => Promise<'ok' | 'timed out' | 'error'> | void;
};

const normalizeMesaRow = (row: Partial<Mesa> | undefined): Mesa | null => {
  if (!row || typeof row.id_mesa !== 'number' || !row.numero_mesa || !row.estado) {
    return null;
  }

  return {
    id_mesa: row.id_mesa,
    numero_mesa: String(row.numero_mesa),
    estado: row.estado,
    comensales: row.comensales ?? undefined,
  };
};

export const useMozoMesasRealtime = (mesas: Mesa[]): [Mesa[], Dispatch<SetStateAction<Mesa[]>>] => {
  const [liveMesas, setLiveMesas] = useState<Mesa[]>(mesas);

  useEffect(() => {
    setLiveMesas(mesas);
  }, [mesas]);

  useEffect(() => {
    let channel: RealtimeChannel | undefined;

    try {
      channel = mesasService.subscribe((payload: MesaRealtimePayload) => {
        if (payload.eventType === 'DELETE') {
          const oldId = payload.old?.id_mesa;
          if (typeof oldId === 'number') {
            setLiveMesas(prev => prev.filter(mesa => mesa.id_mesa !== oldId));
          }
          return;
        }

        const nextMesa = normalizeMesaRow(payload.new);
        if (!nextMesa) return;

        setLiveMesas(prev => {
          const exists = prev.some(mesa => mesa.id_mesa === nextMesa.id_mesa);
          const next = exists
            ? prev.map(mesa => (mesa.id_mesa === nextMesa.id_mesa ? { ...mesa, ...nextMesa } : mesa))
            : [...prev, nextMesa];

          return next.sort((a, b) => a.id_mesa - b.id_mesa);
        });
      }) as RealtimeChannel;
    } catch (error) {
      console.warn('[MozoTerminal] Realtime de mesas no disponible:', error);
    }

    return () => {
      void channel?.unsubscribe?.();
    };
  }, []);

  return [liveMesas, setLiveMesas];
};
