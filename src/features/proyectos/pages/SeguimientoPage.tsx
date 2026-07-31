import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Plus, Receipt, Box, Trash2, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useData } from '@/contexts/DataContext';
import { EtapaProyecto, FaseStart } from '@/types';
import { FaseIdentificacion } from '@/features/proyectos/components/fases/FaseIdentificacion';
import { FaseTrazabilidad } from '@/features/proyectos/components/fases/FaseTrazabilidad';
import { FaseAlcances } from '@/features/proyectos/components/fases/FaseAlcances';
import { FaseCotizacion } from '@/features/proyectos/components/fases/FaseCotizacion';
import { FasePropuesta } from '@/features/proyectos/components/fases/FasePropuesta';
import { FaseCierre } from '@/features/proyectos/components/fases/FaseCierre';
import { FaseKickOff } from '@/features/proyectos/components/fases/FaseKickOff';
import { FaseFactura } from '@/features/proyectos/components/fases/FaseFactura';
import { FaseEntrega } from '@/features/proyectos/components/fases/FaseEntrega';
import { FaseProyeccion } from '@/features/proyectos/components/fases/FaseProyeccion';
import { FaseRecaudos } from '@/features/proyectos/components/fases/FaseRecaudos';
import { ProyectoTimeline } from '@/features/proyectos/components/ProyectoTimeline';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const fasesStartDefault: { id: FaseStart; label: string }[] = [
  { id: 'proyeccion', label: 'Proyección' },
  { id: 'trazabilidad', label: 'Trazabilidad' },
  { id: 'identificacion', label: 'Identificación' },
  { id: 'alcances', label: 'Alcances' },
  { id: 'cotizacion', label: 'Cotización' },
  { id: 'propuesta', label: 'Propuesta' },
  { id: 'cierre', label: 'Cierre' },
];

const fasesDevelopDefault: { id: string; label: string; type: 'kickoff' | 'factura' | 'entrega' }[] = [
  { id: 'kickoff', label: 'Kick Off', type: 'kickoff' },
  { id: 'factura1', label: 'Factura 1', type: 'factura' },
  { id: 'entrega1', label: 'Entrega 1', type: 'entrega' },
  { id: 'factura2', label: 'Factura 2', type: 'factura' },
  { id: 'entrega2', label: 'Entrega 2', type: 'entrega' },
  { id: 'factura3', label: 'Factura 3', type: 'factura' },
  { id: 'entrega3', label: 'Entrega 3', type: 'entrega' },
];

export default function SeguimientoPage() {
  const { proyectoId } = useParams<{ proyectoId: string }>();
  const navigate = useNavigate();
  const { proyectos, empresas, updateProyecto } = useData();
  const { isCotizador } = useAuth();
  const { toast } = useToast();
  const proyecto = proyectos.find(p => p.id === proyectoId);
  const [activeFase, setActiveFase] = useState<string>(isCotizador ? 'cotizacion' : (proyecto?.faseActual || 'proyeccion'));
  const [activeEtapa, setActiveEtapa] = useState<EtapaProyecto>(isCotizador ? 'START' : (proyecto?.etapaActual || 'START'));
  const [timelineOpen, setTimelineOpen] = useState(false);

  const fasesStart = isCotizador 
    ? [{ id: 'cotizacion' as FaseStart, label: 'Cotización' }]
    : fasesStartDefault;

  // Determine active phases for DEVELOP stage
  const fasesDevelop = useMemo(() => {
    if (!proyecto) return [];
    let maxPhaseWithData = 0;
    (proyecto.facturas || []).forEach(f => {
      // Identificar si la factura pertenece a la fase 1 (f1), fase 2 (f2), etc.
      if (f && f.id) {
        const match = f.id.match(/^(?:f|factura)(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxPhaseWithData) maxPhaseWithData = num;
        }
      }
    });

    // Si una pestaña está vacía (no hay facturas), no la generamos, SALVO la siguiente disponible.
    // Por default debe quedar mínimo una (Factura 1), y siempre un máximo de "la actual + 1" vacía para poder agregar.
    const maxFacturas = Math.max(1, maxPhaseWithData + 1);

    // Bases fijas
    const dynamicFases: typeof fasesDevelopDefault = [
      { id: 'kickoff', label: 'Kick Off', type: 'kickoff' },
    ];

    // Generar slots de Factura/Entrega correlativos de forma dinámica
    for (let i = 1; i <= maxFacturas; i++) {
      dynamicFases.push({ id: `factura${i}`, label: `Factura ${i}`, type: 'factura' });
      dynamicFases.push({ id: `entrega${i}`, label: `Entrega ${i}`, type: 'entrega' });
    }

    // Preservar fases especiales que el usuario haya añadido manualmente (no estándar)
    if (Array.isArray(proyecto.fasesOrden) && proyecto.fasesOrden.length > 0) {
      const specialFases = proyecto.fasesOrden.filter(fo => !fo.id.startsWith('factura') && !fo.id.startsWith('entrega') && fo.id !== 'recaudos' && fo.id !== 'kickoff' && fo.id !== 'proyeccion');
      return [...dynamicFases, ...specialFases] as typeof fasesDevelopDefault;
    }

    return dynamicFases;
  }, [proyecto?.fasesOrden, proyecto?.facturas]);

  // Totales financieros para el resumen
  const finanzas = useMemo(() => {
    if (!proyecto) return null;
    const year = new Date().getFullYear().toString();
    const proyeccionAnual = Object.values(proyecto.proyeccion?.[year] || {}).reduce((acc: number, val) => acc + (val as number), 0);
    const facturadoAnual = (proyecto.facturas || []).reduce((acc, f) => acc + f.valor, 0);

    return {
      year,
      proyeccionAnual,
      facturadoAnual,
      pendiente: Math.max(0, proyeccionAnual - facturadoAnual)
    };
  }, [proyecto?.proyeccion, proyecto?.facturas]);

  // If no project, return not found view
  if (!proyecto) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Proyecto no encontrado</p>
        <Button variant="link" onClick={() => navigate('/proyectos')}>
          Volver a proyectos
        </Button>
      </div>
    );
  }

  const handleEtapaChange = (etapa: EtapaProyecto) => {
    const primeraFase = etapa === 'START' ? 'proyeccion' : 'recaudos';
    setActiveEtapa(etapa);
    setActiveFase(primeraFase);
  };

  const handleFaseChange = (fase: string) => {
    setActiveFase(fase);
  };


  const handleAddFase = async (tipo: 'factura' | 'entrega') => {
    const currentFases = proyecto.fasesOrden || [...fasesDevelopDefault];

    // Calculate new index for labeling
    const count = currentFases.filter(f => f.type === tipo).length + 1;
    const label = tipo === 'factura' ? `Factura ${count}` : `Entrega ${count}`;
    const id = `${tipo}${Math.random().toString(36).substr(2, 5)}`; // Random ID to allow duplicates/reordering in future

    const newFase = {
      id,
      label,
      type: tipo
    };

    const now = new Date();
    try {
      await updateProyecto(proyecto.id, {
        fasesOrden: [...currentFases, newFase],
        faseActual: id as any,
        faseGuardada: id as any,
        fechasFases: {
          ...proyecto.fechasFases,
          [id]: now
        }
      });
    } catch (error) {
      console.error('Error adding fase:', error);
    }
  };

  const handleDeleteFase = (faseId: string) => {
    const currentFases = proyecto.fasesOrden || [...fasesDevelopDefault];

    if (currentFases.length <= 1) return;

    const newFases = currentFases.filter(f => f.id !== faseId);

    let newActiveFase = proyecto.faseActual;
    if (proyecto.faseActual === faseId) {
      const index = currentFases.findIndex(f => f.id === faseId);
      const newIndex = index > 0 ? index - 1 : 0;
      newActiveFase = newFases[newIndex]?.id as any;
    }

    updateProyecto(proyecto.id, {
      fasesOrden: newFases,
      faseActual: newActiveFase
    });
  };

  const renderFaseContent = () => {
    if (activeEtapa === 'START') {
      switch (activeFase) {
        case 'proyeccion':
          return <FaseProyeccion proyecto={proyecto} />;
        case 'trazabilidad':
          return <FaseTrazabilidad proyecto={proyecto} />;
        case 'identificacion':
          return <FaseIdentificacion proyecto={proyecto} />;
        case 'alcances':
          return <FaseAlcances proyecto={proyecto} />;
        case 'cotizacion':
          return <FaseCotizacion proyecto={proyecto} />;
        case 'propuesta':
          return <FasePropuesta proyecto={proyecto} />;
        case 'cierre':
          return <FaseCierre proyecto={proyecto} />;
        default:
          return null;
      }
    } else {
      // Find the current active phase object
      const activeFaseObj = fasesDevelop.find(f => f.id === activeFase);

      // Legacy fallback logic
      if (!activeFaseObj) {
        // If for some reason we are in a phase that's not in the list, try to guess
        if (activeFase === 'kickoff') return <FaseKickOff proyecto={proyecto} />;
        if (['factura1', 'factura2', 'factura3'].includes(activeFase as string)) return <FaseFactura proyecto={proyecto} faseId={activeFase as string} />;
        if (['entrega1', 'entrega2', 'entrega3'].includes(activeFase as string)) return <FaseEntrega proyecto={proyecto} faseId={activeFase as string} />;
        return null;
      }

      if (activeFaseObj.type === 'kickoff' || activeFaseObj.id === 'kickoff') {
        return <FaseKickOff proyecto={proyecto} />;
      }


      // Check type or ID pattern for legacy compatibility
      const isFactura = activeFaseObj.type === 'factura' || activeFaseObj.id.includes('factura');
      const isEntrega = activeFaseObj.type === 'entrega' || activeFaseObj.id.includes('entrega');

      if (isFactura) {
        return <FaseFactura proyecto={proyecto} faseId={activeFaseObj.id} />;
      }

      if (isEntrega) {
        return <FaseEntrega proyecto={proyecto} faseId={activeFaseObj.id} />;
      }

      return <div>Fase desconocida</div>;
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden">
      <div className="shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/proyectos')} className="h-7 w-7 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Breadcrumb>
              <BreadcrumbList className="text-[11px] sm:text-xs">
                <BreadcrumbItem>
                  <BreadcrumbLink href="/proyectos" onClick={(e) => { e.preventDefault(); navigate('/proyectos'); }}>
                    Proyectos
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{proyecto.nombre}</BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Seguimiento</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <Button variant="outline" size="sm" onClick={() => setTimelineOpen(true)} className="h-7 text-[10px] px-2 shadow-sm">
            <Clock className="h-3 w-3 mr-1.5" />
            Línea del Tiempo
          </Button>
        </div>

        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-baseline gap-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground truncate max-w-[250px] sm:max-w-[400px] leading-none mb-1">{proyecto.nombre}</h2>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 border px-2 py-0.5 rounded-full">
              <span className="font-semibold text-primary">{proyecto.empresaNombre || empresas.find(e => e.id === proyecto.empresaId)?.nombre || 'Empresa'}</span>
              <span>•</span>
              <span>Seguimiento</span>
            </div>
          </div>

          <div className="flex gap-1.5 bg-muted/30 p-1 rounded-md border">
            {!isCotizador && (
              <>
                <Button
                  variant={activeEtapa === 'START' ? 'default' : 'ghost'}
                  onClick={() => handleEtapaChange('START')}
                  className={`w-28 h-7 text-xs font-bold transition-all ${activeEtapa === 'START' ? 'shadow-sm' : ''}`}
                >
                  START
                </Button>
                <Button
                  variant={activeEtapa === 'DEVELOP' ? 'default' : 'ghost'}
                  onClick={() => handleEtapaChange('DEVELOP')}
                  className={`w-28 h-7 text-xs font-bold transition-all ${activeEtapa === 'DEVELOP' ? 'shadow-sm' : ''}`}
                >
                  DEVELOP
                </Button>
              </>
            )}
            {isCotizador && (
              <Badge className="px-4 py-1.5 bg-purple-100 text-purple-800 border-purple-200">
                ⭐ Modo de Estimación  
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pt-0.5">
          <Tabs
            value={activeFase}
            onValueChange={handleFaseChange}
            className="w-full"
          >
            <TabsList className="w-full h-11 gap-1 bg-muted/50 p-1 justify-start overflow-x-auto scrollbar-hide">
              {(activeEtapa === 'START' ? fasesStart : fasesDevelop).map(fase => (
                <ContextMenu key={fase.id}>
                  <ContextMenuTrigger>
                    <TabsTrigger
                      value={fase.id}
                      className="text-sm font-semibold h-9 px-4 whitespace-nowrap"
                    >
                      {fase.label}
                    </TabsTrigger>
                  </ContextMenuTrigger>
                  {activeEtapa === 'DEVELOP' && (
                    <ContextMenuContent>
                      <ContextMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDeleteFase(fase.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </ContextMenuItem>
                    </ContextMenuContent>
                  )}
                </ContextMenu>
              ))}

              {activeEtapa === 'DEVELOP' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="ml-1 px-2 h-7" title="Agregar Fase">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => handleAddFase('factura')}>
                      <Receipt className="h-4 w-4 mr-2" />
                      Factura
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddFase('entrega')}>
                      <Box className="h-4 w-4 mr-2" />
                      Entrega
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto pt-2 pr-2">
        <div key={`${proyecto.id}-${activeFase}`} className="h-full">
          {renderFaseContent()}
        </div>
      </div>
      <Dialog open={timelineOpen} onOpenChange={setTimelineOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Línea del Tiempo - {proyecto.nombre}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto pr-2">
            <ProyectoTimeline proyecto={proyecto} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

