import { useRef, useState } from 'react';
import { toast } from 'sonner';

interface UseUndoableDeleteOptions {
  /** Milisegundos antes de ejecutar el borrado real. Por defecto 5000. */
  delayMs?: number;
}

/**
 * Envuelve una función de borrado para que el registro desaparezca de inmediato de la vista
 * (vía `pendingIds`) pero solo se elimine de verdad tras una ventana de gracia, mostrando
 * un toast con acción "Deshacer" mientras tanto.
 */
export function useUndoableDelete(deleteFn: (id: string) => void, options?: UseUndoableDeleteOptions) {
  const delay = options?.delayMs ?? 5000;
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const timeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const scheduleDelete = (id: string, label: string) => {
    setPendingIds(prev => new Set(prev).add(id));

    const timeoutId = setTimeout(() => {
      deleteFn(id);
      timeouts.current.delete(id);
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, delay);
    timeouts.current.set(id, timeoutId);

    toast(`Se eliminó "${label}"`, {
      duration: delay,
      action: {
        label: 'Deshacer',
        onClick: () => {
          const pendingTimeout = timeouts.current.get(id);
          if (pendingTimeout) {
            clearTimeout(pendingTimeout);
            timeouts.current.delete(id);
          }
          setPendingIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          toast.success('Eliminación deshecha');
        },
      },
    });
  };

  return { pendingIds, scheduleDelete };
}
