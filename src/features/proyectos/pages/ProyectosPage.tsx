import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Briefcase, Building2, Activity, DollarSign, Layers, Tag, Archive, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExcelTable } from '@/components/shared/ExcelTable';
import { ProyectoDialog } from '@/features/proyectos/components/ProyectoDialog';
import { useData } from '@/contexts/DataContext';
import { Proyecto, ColumnConfig, EstadoProyecto } from '@/types';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { useProyectoStats } from '@/features/proyectos/hooks/useProyectStats';
import { useAuth } from '@/contexts/AuthContext';

const estadoColors: Record<EstadoProyecto, string> = {
  activo: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  pausado: 'bg-amber-100 text-amber-800 border-amber-200',
  cerrado: 'bg-slate-100 text-slate-800 border-slate-200',
  cancelado: 'bg-rose-100 text-rose-800 border-rose-200',
  cancelada: 'bg-rose-100 text-rose-800 border-rose-200',
  perdido: 'bg-rose-100 text-rose-800 border-rose-200',
  perdida: 'bg-rose-100 text-rose-800 border-rose-200',
  archivado: 'bg-slate-100 text-slate-500 border-slate-200',
  archivada: 'bg-slate-100 text-slate-500 border-slate-200',
};

const estadoIndicatorColors: Record<EstadoProyecto, string> = {
  activo: 'bg-emerald-500',
  pausado: 'bg-amber-500',
  cerrado: 'bg-slate-500',
  cancelado: 'bg-rose-500',
  cancelada: 'bg-rose-500',
  perdido: 'bg-rose-500',
  perdida: 'bg-rose-500',
  archivado: 'bg-slate-300',
  archivada: 'bg-slate-300',
};

const faseLabels: Record<string, string> = {
  trazabilidad: 'Trazabilidad',
  identificacion: 'Identificación',
  alcances: 'Alcances',
  propuesta: 'Propuesta',
  cierre: 'Cierre',
  kickoff: 'Kick Off',
  factura1: 'Factura 1',
  entrega1: 'Entrega 1',
  factura2: 'Factura 2',
  entrega2: 'Entrega 2',
  factura3: 'Factura 3',
  entrega3: 'Entrega 3',
};

export default function ProyectosPage() {
  const navigate = useNavigate();
  const { proyectos, empresas, categorias, updateProyecto, deleteProyecto } = useData();
  const { isCotizador, isMarianaOrHector } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProyecto, setEditingProyecto] = useState<Proyecto | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const { stats } = useProyectoStats();

  const filteredProyectos = useMemo(() => {
    return proyectos.filter(p => {
      const estado = p.estado?.toLowerCase() || '';
      const isArchived = estado.includes('archivado') || 
                         estado.includes('archivada') || 
                         estado.includes('perdido') || 
                         estado.includes('perdida') || 
                         estado.includes('cancelado') || 
                         estado.includes('cancelada');
      
      return showArchived ? isArchived : !isArchived;
    });
  }, [proyectos, showArchived]);

  // Archivar automáticamente proyectos perdidos o cancelados en la base de datos
  useEffect(() => {
    const aArchivar = proyectos.filter(p => {
      const estado = p.estado?.toLowerCase() || '';
      return estado.includes('perdido') || 
             estado.includes('perdida') || 
             estado.includes('cancelado') || 
             estado.includes('cancelada');
    });
    
    if (aArchivar.length > 0) {
      aArchivar.forEach(p => {
        updateProyecto(p.id, { estado: 'archivado' });
      });
    }
  }, [proyectos, updateProyecto]);

  const getEmpresaNombre = (empresaId: string) => {
    return empresas.find(e => e.id === empresaId)?.nombre || '-';
  };

  const getCategoriaNombre = (categoriaId: string) => {
    return categorias.find(c => c.id === categoriaId)?.nombre || '-';
  };

  const calcularMargen = (proyecto: Proyecto) => {
    const year = new Date().getFullYear().toString();
    const sumProyeccion = Object.values(proyecto.proyeccion?.[year] || {}).reduce((sum: number, val) => sum + (val as number), 0);
    const valorTotal = proyecto.valorFinal || proyecto.valorAproximado || sumProyeccion;
    if (!valorTotal || !proyecto.costo) return 0;
    return Math.round(((valorTotal - proyecto.costo) / valorTotal) * 100);
  };

  const getCotizacionStatus = (proyecto: Proyecto) => {
    switch (proyecto.estadoCotizacion) {
      case 'cotizado':
        return { label: 'Cotizado', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' };
      case 'en_proceso':
        return { label: 'En Proceso', color: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500' };
      case 'solo_estructura':
        return { label: 'Solo Estructura', color: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' };
      case 'sin_cotizar':
      default:
        return { label: 'Sin Cotizar', color: 'bg-slate-100 text-slate-800 border-slate-200', dot: 'bg-slate-400' };
    }
  };

  let columns: ColumnConfig<Proyecto>[] = [
    {
      key: 'nombre',
      header: (
        <span className="flex items-center gap-2">
          <Briefcase className="h-3.5 w-3.5 opacity-70" />
          Nombre
        </span>
      ),
      headerLabel: 'Nombre',
      editable: !isMarianaOrHector
    },
    {
      key: 'empresaId',
      header: (
        <span className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 opacity-70" />
          Empresa
        </span>
      ),
      headerLabel: 'Empresa',
      render: (value) => getEmpresaNombre(value),
    },
    {
      key: 'categoriaId',
      header: (
        <span className="flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 opacity-70" />
          Categoría
        </span>
      ),
      headerLabel: 'Categoría',
      render: (value) => getCategoriaNombre(value),
    },
    {
      key: 'estado',
      header: (
        <span className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 opacity-70" />
          Estado
        </span>
      ),
      headerLabel: 'Estado',
      render: (value: EstadoProyecto) => (
        <Badge
          className={cn(estadoColors[value] || 'bg-gray-100 text-gray-800', "px-2 py-0.5 rounded-full font-semibold flex items-center gap-1.5 w-fit")}
          variant="outline"
        >
          <div className={cn("h-1.5 w-1.5 rounded-full", estadoIndicatorColors[value] || 'bg-gray-500')} />
          {(value || 'desconocido').charAt(0).toUpperCase() + (value || 'desconocido').slice(1)}
        </Badge>
      ),
    },
    {
      key: 'cotizacion', // Dummy key for semaforo
      header: 'Est. Cotización',
      render: (_, row: Proyecto) => {
        const status = getCotizacionStatus(row);
        return (
          <Badge className={cn("px-2 font-bold", status.color)} variant="outline">
            <div className={cn("h-2 w-2 rounded-full mr-1.5", status.dot)} />
            {status.label}
          </Badge>
        );
      }
    },
    {
      key: 'valorTotal',
      header: (
        <span className="flex items-center gap-2">
          <DollarSign className="h-3.5 w-3.5 opacity-70" />
          Valor Total
        </span>
      ),
      headerLabel: 'Valor Total',
      render: (_, row) => {
        const year = new Date().getFullYear().toString();
        const sumProyeccion = Object.values(row.proyeccion?.[year] || {}).reduce((sum: number, val) => sum + (val as number), 0);
        const valorBase = row.valorFinal > 0 ? row.valorFinal : (row.valorAproximado || 0);
        const valor = valorBase > 0 ? valorBase : sumProyeccion;
        return <span className="font-semibold text-foreground">${(valor || 0).toLocaleString('es-CO')}</span>;
      },
    },
    {
      key: 'porcentajeCierre',
      header: '% Cierre',
      editable: !isMarianaOrHector,
      type: 'percentage',
      format: (value) => value ? `${value}%` : '-',
    },
    {
      key: 'costo',
      header: 'Costo',
      format: (value) => `$${(value || 0).toLocaleString('es-CO')}`,
      editable: !isMarianaOrHector,
      type: 'number',
    },
    {
      key: 'margen',
      header: '% Margen',
      render: (_, row) => {
        const margen = calcularMargen(row);
        return (
          <span className={cn(
            "font-bold",
            margen > 30 ? "text-emerald-600" : margen > 15 ? "text-amber-600" : "text-rose-600"
          )}>
            {margen}%
          </span>
        );
      },
    },
    {
      key: 'etapaActual',
      header: (
        <span className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 opacity-70" />
          Etapa
        </span>
      ),
      headerLabel: 'Etapa',
      render: (_, row) => row.etapaGuardada || row.etapaActual
    },
    {
      key: 'faseActual',
      header: 'Fase',
      render: (_, row) => {
        const fase = row.faseGuardada || row.faseActual;
        return <span className="text-muted-foreground italic">{faseLabels[fase] || fase}</span>;
      },
    },
  ];

  if (isCotizador) {
    // Hide financial columns for Cotizador (they only care about making the cost structure, or they care but the user requested ONLY seeing projects)
    // Actually let's just make sure the Semaforo is visible, it's injected above.
  }

  const handleRowClick = (proyecto: Proyecto) => {
    navigate(`/proyectos/${proyecto.id}/seguimiento`);
  };

  const handleEdit = (proyecto: Proyecto) => {
    setEditingProyecto(proyecto);
    setDialogOpen(true);
  };

  const handleDelete = (proyecto: Proyecto) => {
    if (confirm(`¿Está seguro de eliminar el proyecto "${proyecto.nombre}"?`)) {
      deleteProyecto(proyecto.id);
    }
  };

  const handleCellEdit = (rowId: string, key: string, value: any) => {
    updateProyecto(rowId, { [key]: value });
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProyecto(null);
  };

  const handleExportExcel = () => {
    const dataToExport = proyectos.map(proyecto => ({
      'Nombre': proyecto.nombre,
      'Empresa': getEmpresaNombre(proyecto.empresaId),
      'Categoría': getCategoriaNombre(proyecto.categoriaId),
      'Estado': proyecto.estado,
      'Valor Total': proyecto.valorFinal || proyecto.valorAproximado,
      '% Cierre': `${proyecto.porcentajeCierre || 0}%`,
      'Costo': proyecto.costo,
      'Margen': `${calcularMargen(proyecto)}%`,
      'Etapa': proyecto.etapaActual,
      'Fase': faseLabels[proyecto.faseActual] || proyecto.faseActual,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Proyectos");
    XLSX.writeFile(wb, `Proyectos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Proyectos</h2>
          <p className="text-muted-foreground text-sm">
            Haz clic en un proyecto para ver su seguimiento ({filteredProyectos.length} en total)
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={showArchived ? "secondary" : "outline"}
            size="sm" 
            onClick={() => setShowArchived(!showArchived)}
            className={cn(showArchived ? "bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200" : "")}
          >
            {showArchived ? <Activity className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
            {showArchived ? 'Ver Proyectos Activos' : 'Ver Proyectos Archivados'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
          {!isMarianaOrHector && (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Proyecto
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ExcelTable
          data={filteredProyectos}
          columns={columns}
          onRowClick={handleRowClick}
          onEdit={!isMarianaOrHector ? handleEdit : undefined}
          onDelete={!isMarianaOrHector ? handleDelete : undefined}
          onCellEdit={!isMarianaOrHector ? handleCellEdit : undefined}
          getRowIndicatorColor={(row) => estadoIndicatorColors[row.estado] || 'bg-gray-400'}
        />
      </div>

      <ProyectoDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        proyecto={editingProyecto}
      />
    </div>
  );
}
