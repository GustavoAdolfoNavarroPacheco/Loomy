import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SEGUIMIENTO_STAGES } from '@/types/seguimiento';

interface SeguimientoStepperProps {
  /** -1 = Sin Contacto, 0..SEGUIMIENTO_STAGES.length-1 = etapa alcanzada (progreso real) */
  currentIndex: number;
  onSelect: (index: number) => void;
  /** Etapa que se está "viendo" (p.ej. al navegar notas sin mover el progreso real). Por defecto = currentIndex. */
  highlightIndex?: number;
}

const NODE_COLORS = ['#94a3b8', '#3b82f6', '#0ea5e9', '#f59e0b', '#8b5cf6', '#10b981'];

const NODES = [
  { idx: -1, label: 'Sin Contacto' },
  ...SEGUIMIENTO_STAGES.map((stage, i) => ({ idx: i, label: stage.etapa })),
];

export function SeguimientoStepper({ currentIndex, onSelect, highlightIndex }: SeguimientoStepperProps) {
  const highlight = highlightIndex ?? currentIndex;

  return (
    <div className="flex items-start w-full">
      {NODES.map((node, i) => {
        const color = NODE_COLORS[node.idx + 1];
        const isFilled = node.idx <= currentIndex;
        const isFrontier = node.idx === currentIndex;
        const isViewing = node.idx === highlight;
        const isUpcoming = node.idx > currentIndex;
        const isPassedNotViewing = node.idx < currentIndex && !isViewing;
        const nextNode = NODES[i + 1];

        return (
          <div
            key={node.idx}
            className={cn('flex items-center min-w-0', nextNode ? 'flex-1' : 'shrink-0')}
          >
            <button
              type="button"
              onClick={() => onSelect(node.idx)}
              className="flex flex-col items-center gap-1.5 shrink-0 min-w-0 px-0.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 group"
              title={node.idx < currentIndex ? `Ver / volver a "${node.label}"` : isFrontier ? `Etapa actual: ${node.label}` : `Avanzar a "${node.label}"`}
              aria-current={isFrontier ? 'step' : undefined}
              aria-label={
                node.idx < currentIndex
                  ? `Etapa "${node.label}", completada. Presione para ver o volver a ella.`
                  : isFrontier
                  ? `Etapa "${node.label}", actual.`
                  : `Etapa "${node.label}", pendiente. Presione para avanzar.`
              }
            >
              <span
                key={isViewing ? `viewing-${node.idx}` : `inactive-${node.idx}`}
                className={cn(
                  'relative flex items-center justify-center h-8 w-8 rounded-full border-2 transition-all duration-300 ease-out group-hover:scale-105 shrink-0',
                  isViewing && 'scale-110 shadow-md animate-in zoom-in-75 fade-in duration-300',
                  isPassedNotViewing && 'scale-90',
                  isUpcoming && 'opacity-40'
                )}
                style={{
                  backgroundColor: isFilled ? color : 'transparent',
                  borderColor: color,
                }}
              >
                {isViewing && (
                  <span
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ backgroundColor: color, opacity: 0.35 }}
                  />
                )}
                {isFilled && !isFrontier ? (
                  <Check className="h-3.5 w-3.5 text-white relative" />
                ) : (
                  <span
                    className="text-[11px] font-bold relative"
                    style={{ color: isFilled ? '#fff' : color }}
                  >
                    {i}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  'text-[10px] font-semibold text-center leading-tight break-words max-w-[70px] transition-all duration-300',
                  isPassedNotViewing && 'line-through opacity-50 text-muted-foreground',
                  isUpcoming && 'opacity-50 text-muted-foreground'
                )}
                style={{ color: (isViewing || isFrontier) ? color : undefined }}
              >
                {node.label}
              </span>
            </button>

            {nextNode && (
              <div
                className="h-0.5 flex-1 min-w-[6px] mx-0.5 mt-[14px] rounded-full transition-colors duration-500"
                style={{ backgroundColor: currentIndex >= nextNode.idx ? NODE_COLORS[nextNode.idx + 1] : '#e2e8f0' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
