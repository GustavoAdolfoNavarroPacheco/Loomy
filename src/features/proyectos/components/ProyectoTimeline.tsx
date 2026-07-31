import { useMemo } from 'react';
import {
  Check,
  Circle,
  Search,
  Target,
  FileText,
  FileCheck,
  Rocket,
  Receipt,
  Package
} from 'lucide-react';
import { Proyecto } from '@/types';
import { cn } from '@/lib/utils';

interface ProyectoTimelineProps {
  proyecto: Proyecto;
}

const START_FASES = [
  { id: 'identificacion', label: 'Identificación', icon: Search },
  { id: 'alcances', label: 'Alcances', icon: Target },
  { id: 'propuesta', label: 'Propuesta', icon: FileText },
  { id: 'cierre', label: 'Cierre', icon: FileCheck },
];

export function ProyectoTimeline({ proyecto }: ProyectoTimelineProps) {

  const timelineItems = useMemo(() => {
    // 1. Start Phases (always static)
    const startItems = START_FASES.map(f => ({ ...f, type: 'start' }));

    // 2. Develop Phases (dynamic)
    const developPhases = proyecto.fasesOrden || [
      { id: 'kickoff', label: 'Kick Off', type: 'kickoff' },
      { id: 'factura1', label: 'Factura 1', type: 'factura' },
      { id: 'entrega1', label: 'Entrega 1', type: 'entrega' },
      { id: 'factura2', label: 'Factura 2', type: 'factura' },
      { id: 'entrega2', label: 'Entrega 2', type: 'entrega' },
      { id: 'factura3', label: 'Factura 3', type: 'factura' },
      { id: 'entrega3', label: 'Entrega 3', type: 'entrega' },
    ];

    const developItems = developPhases.map(f => {
      let icon = Circle;
      if (f.type === 'kickoff' || f.id === 'kickoff') icon = Rocket;
      else if (f.type === 'factura' || f.id.includes('factura')) icon = Receipt;
      else if (f.type === 'entrega' || f.id.includes('entrega')) icon = Package;

      return {
        id: f.id,
        label: f.label,
        type: 'develop',
        icon
      };
    });

    return [...startItems, ...developItems];
  }, [proyecto.fasesOrden]);

  const getStatus = (itemId: string) => {
    return proyecto.fechasFases?.[itemId] ? 'completed' : 'pending';
  };

  return (
    <div className="py-2 pl-2">
      <div className="flex flex-col">
        {timelineItems.map((item, index) => {
          const status = getStatus(item.id);
          const Icon = item.icon;
          const isLast = index === timelineItems.length - 1;

          return (
            <div key={item.id} className="flex flex-col">
              {/* Timeline Item */}
              <div className="flex items-start gap-4 group">
                {/* Icon Column */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                      status === 'completed' && "bg-primary border-primary text-primary-foreground shadow-sm",
                      status === 'pending' && "bg-background border-muted-foreground/30 text-muted-foreground"
                    )}
                  >
                    {status === 'completed' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>

                  {/* Vertical Line Connector (only if not last) */}
                  {!isLast && (
                    <div
                      className={cn(
                        "w-0.5 h-10 my-1 rounded-full transition-colors duration-500",
                        status === 'completed' ? "bg-primary" : "bg-muted"
                      )}
                    />
                  )}
                </div>

                {/* Text Content */}
                <div className={cn(
                  "pt-1 pb-8 flex flex-col transition-opacity duration-300",
                  status === 'pending' ? "opacity-60" : "opacity-100"
                )}>
                  <span className={cn(
                    "text-sm font-bold leading-none mb-1",
                    status === 'completed' && "text-foreground",
                    status === 'pending' && "text-muted-foreground"
                  )}>
                    {item.label}
                  </span>

                  {proyecto.fechasFases?.[item.id] && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      {new Date(proyecto.fechasFases[item.id]).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
