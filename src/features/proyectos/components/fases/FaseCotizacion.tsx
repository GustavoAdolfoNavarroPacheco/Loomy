import { useState, useMemo } from 'react';
import { Proyecto, CotizacionItem, EstadoCotizacion } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Save, ChevronDown, ChevronRight, Calculator, FilePlus, FolderPlus, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface FaseCotizacionProps {
  proyecto: Proyecto;
}

const CARGA_LABORAL = 1.405; // 1 + 0.18 + 0.225
const HORAS_MENSUALES = 156.36923076923077;
const JORNADA = 8;
const HOUR_FACTOR = 1 / JORNADA;
const COSTOS_FIJOS = 520000;
const SALARIO_MINIMO = 1750905;
const AUXILIO_TRANSPORTE = 249095;
const MONTH_COLS = Array.from({ length: 12 }, (_, i) => `M${i + 1}`);

const ROLES_COTIZACION = [
  { id: 'DB', label: 'DB', fullLabel: 'DB, Lider, Arquitecto, Scrum', basico: 6480000, bono: 1080000, otros: 0 },
  { id: 'UX', label: 'UX', fullLabel: 'Diseño UI/UX', basico: 3240000, bono: 540000, otros: 0 },
  { id: 'FM', label: 'FM', fullLabel: 'FrontEnd Medium', basico: 3240000, bono: 540000, otros: 0 },
  { id: 'BS', label: 'BS', fullLabel: 'BackEnd Senior', basico: 4320000, bono: 1620000, otros: 0 },
  { id: 'BM', label: 'BM', fullLabel: 'BackEnd Semi-Senior', basico: 3780000, bono: 1080000, otros: 0 },
  { id: 'QA', label: 'QA', fullLabel: 'QA, Test', basico: 2700000, bono: 1080000, otros: 54000 },
  { id: 'IM', label: 'IM', fullLabel: 'Implementación, Capacitación', basico: 2700000, bono: 1080000, otros: 0 },
  { id: 'MS', label: 'MS', fullLabel: 'Mobile Semi-Senior', basico: 8100000, bono: 2160000, otros: 132000 },
  { id: 'MM', label: 'MM', fullLabel: 'Mobile Medium', basico: 3240000, bono: 1080000, otros: 132000 },
  { id: 'IA', label: 'IA', fullLabel: 'BackEnd IA', basico: 3240000, bono: 1080000, otros: 0 },
];

const getValorHora = (roleId: string) => {
  const role = ROLES_COTIZACION.find(r => r.id === roleId);
  if (!role) return 0;

  const aplicaAuxilio = role.basico <= (SALARIO_MINIMO * 2);
  const valorAuxilio = aplicaAuxilio ? AUXILIO_TRANSPORTE : 0;

  const costoMensual = (role.basico * CARGA_LABORAL) + role.bono + role.otros + COSTOS_FIJOS + valorAuxilio;
  return costoMensual / HORAS_MENSUALES;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatUSD = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};


export function FaseCotizacion({ proyecto }: FaseCotizacionProps) {
  const { updateProyecto, environment, empresas } = useData();
  const { isCotizador, isMarianaOrHector, isHector, isGabriela } = useAuth();
  const { toast } = useToast();

  const canEditRolesAndPhases = isMarianaOrHector || isHector || isCotizador || isGabriela;
  const [items, setItems] = useState<CotizacionItem[]>(() => {
    if (proyecto.cotizacion && proyecto.cotizacion.length > 0) return proyecto.cotizacion;
    return [
      { id: Math.random().toString(36).substr(2, 9), nombre: 'Estructura del proyecto', fase: '1', isOpen: true, dias: {}, children: [] },
      { id: Math.random().toString(36).substr(2, 9), nombre: 'UX y esquema del proyecto', fase: '2', isOpen: true, dias: {}, children: [] },
      { id: Math.random().toString(36).substr(2, 9), nombre: 'Implementación y entrega del sistema', fase: '3', isOpen: true, dias: {}, children: [] },
      { id: Math.random().toString(36).substr(2, 9), nombre: 'Estructura del agente IA', fase: '4', isOpen: true, dias: {}, children: [] },
      { id: Math.random().toString(36).substr(2, 9), nombre: 'QA General', fase: '5', isOpen: true, dias: {}, children: [] },
    ];
  });
  const [margen, setMargen] = useState<number>(proyecto.margenCotizacion || 40);
  const [trm, setTrm] = useState<number>(proyecto.trmCotizacion || 4000);
  const [observaciones, setObservaciones] = useState(proyecto.observacionesCotizacion || '');
  
  // PDF Export States
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState<'COP' | 'USD' | 'BOTH'>('COP');
  const [exportUnit, setExportUnit] = useState<'dias' | 'horas'>('dias');
  const [selectedExportItems, setSelectedExportItems] = useState<string[]>([]);
  const [viewUnit, setViewUnit] = useState<'dias' | 'horas'>('dias');
  const [estadoCotizacion, setEstadoCotizacion] = useState<EstadoCotizacion>(proyecto.estadoCotizacion || 'sin_cotizar');
  const [isSaving, setIsSaving] = useState(false);

  const HOUR_FACTOR = 0.175;

  const rolesValorHora = useMemo(() => {
    const map: Record<string, number> = {};
    ROLES_COTIZACION.forEach(r => {
      map[r.id] = getValorHora(r.id);
    });
    return map;
  }, []);

  const handleAddItem = (parentId: string | null = null) => {
    const newItem: CotizacionItem = {
      id: Math.random().toString(36).substr(2, 9),
      nombre: 'Nuevo Elemento',
      fase: '',
      dias: {},
      children: [],
      isOpen: true,
    };

    if (!parentId) {
      setItems([...items, newItem]);
      return;
    }

    const addChildDeep = (nodes: CotizacionItem[]): CotizacionItem[] => {
      return nodes.map(node => {
        if (node.id === parentId) {
          return {
            ...node,
            isOpen: true,
            children: [...(node.children || []), newItem]
          };
        }
        if (node.children) {
          return { ...node, children: addChildDeep(node.children) };
        }
        return node;
      });
    };

    setItems(addChildDeep(items));
  };

  const handleRemoveItem = (idToRemove: string) => {
    const removeDeep = (nodes: CotizacionItem[]): CotizacionItem[] => {
      return nodes.filter(node => node.id !== idToRemove).map(node => {
        if (node.children) {
          return { ...node, children: removeDeep(node.children) };
        }
        return node;
      });
    };
    setItems(removeDeep(items));
  };

  const handleUpdateItem = (id: string, field: string, value: string | number | boolean) => {
    const updateDeep = (nodes: CotizacionItem[]): CotizacionItem[] => {
      return nodes.map(node => {
        if (node.id === id) {
          if (ROLES_COTIZACION.some(r => r.id === field)) {
            let numValue = typeof value === 'string' ? parseFloat(value) || 0 : typeof value === 'number' ? value : 0;

            // Si la unidad de vista es horas, convertimos a días antes de guardar
            if (viewUnit === 'horas') {
              numValue = numValue * HOUR_FACTOR;
            }

            return {
              ...node,
              dias: {
                ...node.dias,
                [field]: numValue
              }
            };
          }
          return { ...node, [field]: value };
        }
        if (node.children) {
          return { ...node, children: updateDeep(node.children) };
        }
        return node;
      });
    };
    setItems(updateDeep(items));
  };

  const handleUpdateMonth = (id: string, month: string) => {
    if (!canEditRolesAndPhases) return;
    const updateDeep = (nodes: CotizacionItem[]): CotizacionItem[] => {
      return nodes.map(node => {
        if (node.id === id) {
          const newMeses = { ...(node.meses || {}) };
          newMeses[month] = !newMeses[month];
          return { ...node, meses: newMeses };
        }
        if (node.children) {
          return { ...node, children: updateDeep(node.children) };
        }
        return node;
      });
    };
    setItems(updateDeep(items));
  };

  const calcNodeStats = (node: CotizacionItem): { costo: number, totalesRoles: Record<string, number>, totalDias: number } => {
    let costoPropio = 0;
    let totalDiasPropio = 0;
    const totalesRoles: Record<string, number> = {};
    
    ROLES_COTIZACION.forEach(rol => {
      const d = node.dias?.[rol.id] || 0;
      totalesRoles[rol.id] = d;
      totalDiasPropio += d;
      if (d > 0) costoPropio += d * JORNADA * rolesValorHora[rol.id];
    });

    let costoAcumulado = costoPropio;
    let totalDiasAcumulado = totalDiasPropio;

    // Children cost
    if (node.children) {
      node.children.forEach(child => {
        const childStats = calcNodeStats(child);
        costoAcumulado += childStats.costo;
        totalDiasAcumulado += childStats.totalDias;
        ROLES_COTIZACION.forEach(rol => {
          totalesRoles[rol.id] += childStats.totalesRoles[rol.id];
        });
      });
    }

    return { costo: costoAcumulado, totalesRoles, totalDias: totalDiasAcumulado };
  };

  const totales = useMemo(() => {
    let totalCosto = 0;
    const totalesRoles: Record<string, number> = {};

    ROLES_COTIZACION.forEach(rol => totalesRoles[rol.id] = 0);

    items.forEach(item => {
      const stats = calcNodeStats(item);
      totalCosto += stats.costo;
      ROLES_COTIZACION.forEach(rol => {
        totalesRoles[rol.id] += stats.totalesRoles[rol.id];
      });
    });

    // Precio estimado = Coste Total / (1 - Margen / 100)
    const factorMargen = 1 - (margen / 100);
    const precioEstimado = factorMargen > 0 ? totalCosto / factorMargen : 0;

    return {
      totalCosto,
      precioEstimado,
      totalesRoles
    };
  }, [items, rolesValorHora, margen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProyecto(proyecto.id, {
        cotizacion: items,
        margenCotizacion: margen,
        trmCotizacion: trm,
        observacionesCotizacion: observaciones,
        estadoCotizacion
      });
      toast({
        title: 'Cotización guardada',
        description: 'Se han actualizado los datos correctamente.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la cotización.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getFlattenedRows = (nodes: CotizacionItem[], level = 0): (CotizacionItem & { level: number })[] => {
    let result: any[] = [];
    nodes.forEach(node => {
      result.push({ ...node, level });
      if (node.isOpen !== false && node.children && node.children.length > 0) {
        result = result.concat(getFlattenedRows(node.children, level + 1));
      }
    });
    return result;
  };

  const flattenedRows = getFlattenedRows(items);

  const openExportModal = (mode: 'COP' | 'USD' | 'BOTH') => {
    setExportMode(mode);
    setExportUnit(viewUnit); // Sync with current view unit by default
    // Select all top-level items by default
    setSelectedExportItems(items.map(i => i.id));
    setIsExportModalOpen(true);
  };

  const generatePDF = async (mode: 'COP' | 'USD' | 'BOTH' = 'BOTH', filteredItemIds?: string[], unit: 'dias' | 'horas' = 'dias') => {
    const doc = new jsPDF();
    const factorMargen = 1 - (margen / 100);
    const showCOP = mode === 'COP' || mode === 'BOTH';
    const showUSD = (mode === 'USD' || mode === 'BOTH') && environment === 'international';

    // Filter items if requested
    let rowsToExport = flattenedRows;
    if (filteredItemIds && filteredItemIds.length > 0) {
      // Find the items and their descendants
      const selectedTopLevel = items.filter(i => filteredItemIds.includes(i.id));
      rowsToExport = getFlattenedRows(selectedTopLevel);
    }
    
    // Recalculate totals for the PDF based only on selected items
    let filteredTotalCosto = 0;
    const calculateFilteredCosto = (nodes: CotizacionItem[]) => {
      let total = 0;
      nodes.forEach(node => {
        if (filteredItemIds ? filteredItemIds.includes(node.id) : true) {
          const stats = calcNodeStats(node);
          total += stats.costo;
        }
      });
      return total;
    };
    const exportTotalCosto = filteredItemIds 
      ? calculateFilteredCosto(items.filter(i => filteredItemIds.includes(i.id)))
      : totales.totalCosto;
      
    const exportPrecioVenta = exportTotalCosto / factorMargen;

    // Colors
    const DARK_BLUE = [30, 58, 138]; // #1e3a8a
    const TEXT_GRAY = [60, 60, 60];
    const LIGHT_GRAY = [245, 247, 250];
    const ACCENT_BLUE = [59, 130, 246];

    // --- HEADER: BRANDING ---
    // Dark Blue Accent Bar at the top
    doc.setFillColor(DARK_BLUE[0], DARK_BLUE[1], DARK_BLUE[2]);
    doc.rect(0, 0, 210, 15, 'F');

    // Logo
    const logoUrl = '/logo.png';
    const img = new Image();
    img.src = logoUrl;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });

    const logoMaxWidth = 40;
    const logoMaxHeight = 20;
    let logoWidth = logoMaxWidth;
    let logoHeight = img.height > 0 ? (img.height * logoWidth) / img.width : 15;
    if (logoHeight > logoMaxHeight) {
      logoHeight = logoMaxHeight;
      logoWidth = (img.width * logoHeight) / img.height;
    }

    doc.addImage(img, 'PNG', 15, 20, logoWidth, logoHeight);

    // Company Info (Right Aligned in Header Area)
    doc.setTextColor(DARK_BLUE[0], DARK_BLUE[1], DARK_BLUE[2]);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CAMPUSLANDS S.A.S BIC', 195, 28, { align: 'right' });
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('NIT: 901.393.686', 195, 33, { align: 'right' });
    doc.text('Zona Franca Santander, Edificio Zenith, piso 6', 195, 37, { align: 'right' });
    doc.text('Floridablanca, Santander, Colombia', 195, 41, { align: 'right' });

    // Document Title
    doc.setTextColor(DARK_BLUE[0], DARK_BLUE[1], DARK_BLUE[2]);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('COTIZACIÓN COMERCIAL', 15, 55);
    
    doc.setDrawColor(DARK_BLUE[0], DARK_BLUE[1], DARK_BLUE[2]);
    doc.setLineWidth(1.5);
    doc.line(15, 58, 80, 58);

    // --- CLIENT & PROJECT INFO SECTION ---
    const sectionY = 65;
    doc.setFillColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
    doc.roundedRect(15, sectionY, 180, 30, 2, 2, 'F');

    // Labels
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(DARK_BLUE[0], DARK_BLUE[1], DARK_BLUE[2]);
    doc.text('INFORMACIÓN DEL CLIENTE', 25, sectionY + 8);
    doc.text('DETALLES DEL PROYECTO', 110, sectionY + 8);

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(105, sectionY + 5, 105, sectionY + 25);

    // Values
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
    const empresaCliente = empresas.find(e => e.id === proyecto.empresaId);
    doc.text(`Nombre: ${empresaCliente?.nombre || proyecto.empresaNombre || 'N/A'}`, 25, sectionY + 15);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-CO')}`, 25, sectionY + 20);
    
    doc.text(`Proyecto: ${proyecto.nombre}`, 110, sectionY + 15);
    doc.text(`Moneda: ${mode === 'BOTH' ? 'COP & USD' : mode}`, 110, sectionY + 20);

    // --- TABLE SECTION ---
    const tableStartY = 105;

    // Table Data
    const tableRows = rowsToExport.map(item => {
      const stats = calcNodeStats(item);
      const saleValue = stats.costo / factorMargen;
      const indentation = '  '.repeat(item.level);

      const timeVal = unit === 'horas' ? (stats.totalDias / HOUR_FACTOR) : stats.totalDias;
      const timeLabel = `${timeVal.toFixed(1)} ${unit === 'horas' ? 'h' : 'd'}`;

      const row = [
        `${indentation}${item.nombre}`, 
        item.fase || '-',
        timeLabel
      ];

      // Only show value for top-level modules (level 0)
      if (showCOP) {
        row.push(item.level === 0 ? formatCurrency(saleValue) : '-');
      }
      if (showUSD) {
        row.push(item.level === 0 ? formatUSD(saleValue / trm) : '-');
      }

      return row;
    });

    const columns = [
      { header: 'Módulo / Tarea', dataKey: 'nombre' },
      { header: 'Fase', dataKey: 'fase' },
      { header: `Tiempo (${unit === 'horas' ? 'H' : 'D'})`, dataKey: 'tiempo' },
    ];

    if (showCOP) columns.push({ header: `Valor ${showUSD ? 'COP' : ''}`, dataKey: 'valor' });
    if (showUSD) columns.push({ header: `Valor ${showCOP ? 'USD' : ''}`, dataKey: 'usd' });

    // Footer/Totals Data
    const totalCols = columns.length;
    const tableFoot = [];
    if (showCOP) {
      tableFoot.push([
        { 
          content: 'TOTAL INVERSIÓN COP', 
          colSpan: 3, 
          styles: { halign: 'right', fontStyle: 'bold' } 
        },
        { 
          content: formatCurrency(exportPrecioVenta), 
          colSpan: totalCols - 3, 
          styles: { halign: 'right', fontStyle: 'bold' } 
        }
      ]);
    }
    if (showUSD) {
      tableFoot.push([
        { 
          content: 'TOTAL INVERSIÓN USD', 
          colSpan: 3, 
          styles: { halign: 'right', fontStyle: 'bold' } 
        },
        { 
          content: formatUSD(exportPrecioVenta / trm), 
          colSpan: totalCols - 3, 
          styles: { halign: 'right', fontStyle: 'bold' } 
        }
      ]);
    }

    autoTable(doc, {
      startY: tableStartY,
      head: [columns.map(c => c.header)],
      body: tableRows,
      foot: tableFoot,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 9
      },
      footStyles: {
        fillColor: [240, 245, 255],
        textColor: [30, 58, 138],
        fontSize: 10,
        lineWidth: 0.2
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        font: 'helvetica',
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'center', cellWidth: 12 },
        2: { halign: 'center', cellWidth: 22 },
        3: { halign: 'right', cellWidth: 33 },
        4: { halign: 'right', cellWidth: 33 }
      },
      alternateRowStyles: { fillColor: [252, 252, 252] }
    });

    // Final Y position after table
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    let currentY = finalY;

    // Observations Section
    if (observaciones) {
      const obsY = currentY;
      if (obsY < 270) { // Check if it fits on page
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('OBSERVACIONES Y NOTAS:', 15, obsY);

        doc.setDrawColor(DARK_BLUE[0], DARK_BLUE[1], DARK_BLUE[2]);
        doc.setLineWidth(0.5);
        doc.line(15, obsY + 2, 40, obsY + 2);

        doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        const splitObs = doc.splitTextToSize(observaciones, 180);
        doc.text(splitObs, 15, obsY + 8);
      }
    }

    // Footer Page Number and Note
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.2);
    doc.line(15, 280, 195, 280);

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text('CAMPUSLANDS S.A.S BIC - Este documento es una cotización formal generada automáticamente.', 15, 285);
    doc.text('Página 1 de 1', 195, 285, { align: 'right' });

    doc.save(`Cotizacion_${proyecto.nombre.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-md border shadow-sm p-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold">Cotizador</h3>
          <p className="text-sm text-muted-foreground">Calcula el costo por especialidad y el precio final según el margen.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Estado de Cotización Selector (Visible a todos, opciones restringidas para no cotizadores) */}
          <div className="flex items-center gap-2 bg-muted/50 p-1.5 px-3 rounded-md border min-w-44">
            <label className="text-sm font-semibold flex items-center text-muted-foreground">
              Estado:
            </label>
            <Select value={estadoCotizacion} onValueChange={(val: EstadoCotizacion) => setEstadoCotizacion(val)}>
              <SelectTrigger className="h-8 font-bold border-0 bg-transparent text-foreground shadow-none focus:ring-0">
                <SelectValue placeholder="Estado..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sin_cotizar" className="font-bold">🔴 Sin Cotizar</SelectItem>
                <SelectItem value="solo_estructura" className="font-bold">🟡 Solo Estructura</SelectItem>

                {/* Opciones restringidas a Mariana, Hector o Gabriela, a menos que el estado actual ya sea uno de estos */}
                {(isMarianaOrHector || isHector || isGabriela || estadoCotizacion === 'en_proceso') && (
                  <SelectItem value="en_proceso" className="font-bold">🟠 En Proceso</SelectItem>
                )}
                {(isMarianaOrHector || isHector || isGabriela || estadoCotizacion === 'cotizado') && (
                  <SelectItem value="cotizado" className="font-bold">🟢 Cotizado</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 bg-muted/50 p-1.5 px-3 rounded-md border">
            <label className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" /> Unidad
            </label>
            <Select value={viewUnit} onValueChange={(val: 'dias' | 'horas') => setViewUnit(val)}>
              <SelectTrigger className="h-8 w-24 font-bold border-0 bg-transparent text-foreground shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dias">Días</SelectItem>
                <SelectItem value="horas">Horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 bg-muted/50 p-1.5 px-3 rounded-md border">
            <label className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground">
              <Calculator className="h-4 w-4" /> Margen (%)
            </label>
            <Input
              type="number"
              value={margen}
              onChange={(e) => setMargen(parseFloat(e.target.value) || 0)}
              className="h-8 w-20 text-right font-bold"
              min="0"
              max="99"
              disabled={!canEditRolesAndPhases}
            />
          </div>

          {environment === 'international' && (
            <div className="flex items-center gap-2 bg-muted/50 p-1.5 px-3 rounded-md border">
              <label className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground">
                <DollarSign className="h-4 w-4" /> TRM ($)
              </label>
              <Input
                type="number"
                value={trm}
                onChange={(e) => setTrm(parseFloat(e.target.value) || 0)}
                className="h-8 w-24 text-right font-bold"
                min="1"
                disabled={!canEditRolesAndPhases}
              />
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/5">
                <FileDown className="h-4 w-4" />
                Exportar PDF
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openExportModal('COP')}>Exportar en COP</DropdownMenuItem>
              {environment === 'international' && (
                <>
                  <DropdownMenuItem onClick={() => openExportModal('USD')}>Exportar en USD</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openExportModal('BOTH')}>Exportar en COP y USD</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => handleAddItem(null)} className="gap-2">
            <Plus className="h-4 w-4" />
            Módulo Principal
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-md border relative">
        <Table>
          <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-[350px] align-middle border-r font-bold">Nombre de Tarea / Módulo</TableHead>
              {ROLES_COTIZACION.map(rol => (
                <TableHead
                  key={rol.id}
                  className="bg-purple-950 text-white text-center w-14 px-1 text-xs border-r border-purple-900/50"
                  title={rol.fullLabel}
                >
                  {rol.label}
                </TableHead>
              ))}
              <TableHead className="w-24 text-center align-middle border-l font-bold">Fase</TableHead>
              <TableHead className="w-32 text-right align-middle border-l font-bold">Costo COP</TableHead>
              {environment === 'international' && (
                <TableHead className="w-32 text-right align-middle border-l font-bold bg-blue-50/50">Costo USD</TableHead>
              )}
              <TableHead className="w-24 text-center align-middle border-l font-bold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flattenedRows.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              const stats = calcNodeStats(item);
              const paddingLeft = item.level * 24 + 10;

              return (
                <TableRow key={item.id} className={hasChildren ? 'bg-muted/10' : ''}>
                  <TableCell className="p-2" style={{ paddingLeft: `${paddingLeft}px` }}>
                    <div className="flex items-center gap-2">
                      {hasChildren ? (
                        <button
                          onClick={() => handleUpdateItem(item.id, 'isOpen', !item.isOpen)}
                          className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center shrink-0"
                        >
                          {item.isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      ) : (
                        <div className="h-5 w-5 shrink-0" />
                      )}
                      <Input
                        value={item.nombre}
                        onChange={(e) => handleUpdateItem(item.id, 'nombre', e.target.value)}
                        className={`h-8 w-full border-0 focus-visible:ring-1 bg-transparent px-1 ${hasChildren ? 'font-bold' : 'font-medium'}`}
                        placeholder="Nombre..."
                      />
                    </div>
                  </TableCell>

                  {ROLES_COTIZACION.map(rol => {
                    const storedVal = item.dias?.[rol.id] || 0;
                    const displayVal = viewUnit === 'horas' ? (storedVal / HOUR_FACTOR) : storedVal;

                    return (
                      <TableCell key={rol.id} className="p-2 text-center px-1">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          disabled={!canEditRolesAndPhases}
                          value={displayVal > 0 ? parseFloat(displayVal.toFixed(2)) : ''}
                          onChange={(e) => handleUpdateItem(item.id, rol.id, e.target.value)}
                          className={`h-8 w-12 text-center mx-auto transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${storedVal > 0 ? 'bg-primary/10 border-primary/30 font-semibold text-primary' : 'bg-transparent border-dashed border-muted/60'}`}
                        />
                      </TableCell>
                    );
                  })}

                  <TableCell className="p-2">
                    <Input
                      value={item.fase || ''}
                      onChange={(e) => handleUpdateItem(item.id, 'fase', e.target.value)}
                      className="h-8 text-center bg-transparent"
                      placeholder="Fase"
                      disabled={!canEditRolesAndPhases}
                    />
                  </TableCell>

                  <TableCell className="p-2 text-right font-semibold bg-muted/20">
                    {stats.costo > 0 ? formatCurrency(stats.costo) : '-'}
                  </TableCell>

                  {environment === 'international' && (
                    <TableCell className="p-2 text-right font-semibold bg-blue-50/30 text-blue-700">
                      {stats.costo > 0 ? formatUSD(stats.costo / trm) : '-'}
                    </TableCell>
                  )}

                  <TableCell className="p-2">
                    <div className="flex gap-1 justify-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary" onClick={() => handleAddItem(item.id)} title="Agregar Sub-tarea">
                        <FolderPlus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => handleRemoveItem(item.id)} title="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={ROLES_COTIZACION.length + 4} className="h-32 text-center text-muted-foreground">
                  No hay módulos ni tareas. Haz clic en "Módulo Principal" para comenzar a cotizar.
                </TableCell>
              </TableRow>
            )}

            {/* Totales Row */}
            {items.length > 0 && (
              <>
                <TableRow className="bg-muted hover:bg-muted font-bold text-[13px]">
                  <TableCell className="text-right p-3">Total {viewUnit === 'horas' ? 'Horas' : 'Días'} Estimados</TableCell>
                  {ROLES_COTIZACION.map(rol => {
                    const totalStored = totales.totalesRoles[rol.id] || 0;
                    const totalDisplay = viewUnit === 'horas' ? (totalStored / HOUR_FACTOR) : totalStored;

                    return (
                      <TableCell key={`total-${rol.id}`} className="p-3 text-center text-primary">
                        {totalDisplay > 0 ? parseFloat(totalDisplay.toFixed(2)) : '-'}
                      </TableCell>
                    );
                  })}
                  <TableCell className="p-3 text-right">Costo Interno:</TableCell>
                  <TableCell className="p-3 text-right text-rose-600 bg-rose-500/10 text-sm">
                    {formatCurrency(totales.totalCosto)}
                  </TableCell>
                  {environment === 'international' && (
                    <TableCell className="p-3 text-right text-rose-700 bg-rose-500/5 text-sm border-l">
                      {formatUSD(totales.totalCosto / trm)}
                    </TableCell>
                  )}
                  <TableCell className="p-3"></TableCell>
                </TableRow>

                <TableRow className="bg-primary text-primary-foreground font-bold">
                  <TableCell colSpan={ROLES_COTIZACION.length + 2} className="bg-primary text-right p-4 uppercase tracking-wider text-sm">
                    Precio Sugerido Venta ({margen}% Margen)
                  </TableCell>
                  <TableCell className="bg-primary p-4 text-right text-base border-l border-primary-foreground/20">
                    <div className="flex flex-col items-end">
                      <span>{formatCurrency(totales.precioEstimado)}</span>
                      {environment === 'international' && (
                        <span className="text-xs opacity-80 font-medium">
                          {formatUSD(totales.precioEstimado / trm)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="p-4 bg-primary"></TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <label className="text-sm font-bold text-muted-foreground flex items-center gap-2">
          <FilePlus className="h-4 w-4" /> Observaciones y Notas de la Cotización
        </label>
        <Textarea
          placeholder="Escribe aquí notas internas, consideraciones especiales o detalles del alcance..."
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          className="min-h-[100px] bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary"
          disabled={!canEditRolesAndPhases}
        />
      </div>

      {/* Tabla de Tiempos */}
      <div className="mt-8 flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Tabla de Tiempos
          </h3>
          <p className="text-sm text-muted-foreground">Estima la duración en meses y distribuye los módulos en el tiempo.</p>
        </div>
        <div className="flex-1 overflow-auto rounded-md border relative bg-card">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[350px] align-middle border-r font-bold">Módulo / Tarea</TableHead>
                {MONTH_COLS.map(m => (
                  <TableHead key={m} className="w-10 text-center font-bold px-1 border-r border-muted/50 text-xs">
                    {m}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {flattenedRows.map((item) => {
                const paddingLeft = item.level * 24 + 10;
                return (
                  <TableRow key={`timeline-${item.id}`} className={item.children && item.children.length > 0 ? 'bg-muted/10' : ''}>
                    <TableCell className="p-2 border-r font-medium border-muted/50" style={{ paddingLeft: `${paddingLeft}px` }}>
                      {item.nombre || 'Sin nombre'}
                    </TableCell>
                    {MONTH_COLS.map(m => {
                      const isAssigned = item.meses?.[m];
                      return (
                        <TableCell
                          key={m}
                          className={cn(
                            "p-0 border-r border-muted/50 text-center transition-colors cursor-pointer",
                            isAssigned ? "bg-primary/20" : "hover:bg-muted/30"
                          )}
                          onClick={() => handleUpdateMonth(item.id, m)}
                        >
                          <div className={cn(
                            "w-full h-8 flex items-center justify-center",
                            canEditRolesAndPhases ? "" : "pointer-events-none"
                          )}>
                            {isAssigned && <div className="w-full h-full bg-blue-500 rounded-sm scale-90 transition-transform" />}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={MONTH_COLS.length + 1} className="h-32 text-center text-muted-foreground">
                    No hay módulos. Agrega elementos a la cotización primero.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Export Module Selection Modal */}
      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="h-5 w-5 text-primary" />
              Seleccionar Módulos para PDF
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3">
              Selecciona qué módulos principales deseas incluir y la unidad de tiempo.
            </p>

            <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-md border">
              <label className="text-sm font-bold flex items-center gap-2">
                <Clock className="h-4 w-4" /> Unidad de Tiempo:
              </label>
              <div className="flex bg-background border rounded-md p-1">
                <button
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-sm transition-all",
                    exportUnit === 'dias' ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"
                  )}
                  onClick={() => setExportUnit('dias')}
                >
                  Días
                </button>
                <button
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-sm transition-all",
                    exportUnit === 'horas' ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"
                  )}
                  onClick={() => setExportUnit('horas')}
                >
                  Horas
                </button>
              </div>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {items.map((item) => (
                <div 
                  key={item.id} 
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-md border transition-colors cursor-pointer hover:bg-muted/50",
                    selectedExportItems.includes(item.id) ? "border-primary bg-primary/5" : "border-muted"
                  )}
                  onClick={() => {
                    if (selectedExportItems.includes(item.id)) {
                      setSelectedExportItems(prev => prev.filter(id => id !== item.id));
                    } else {
                      setSelectedExportItems(prev => [...prev, item.id]);
                    }
                  }}
                >
                  <Checkbox 
                    id={`export-${item.id}`} 
                    checked={selectedExportItems.includes(item.id)}
                    onCheckedChange={() => {}} // Handled by div onClick
                  />
                  <div className="flex flex-col">
                    <label htmlFor={`export-${item.id}`} className="text-sm font-bold leading-none cursor-pointer">
                      {item.nombre}
                    </label>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {item.children?.length || 0} sub-tareas incluidas
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsExportModalOpen(false)}>Cancelar</Button>
            <Button 
              className="gap-2"
              disabled={selectedExportItems.length === 0}
              onClick={() => {
                generatePDF(exportMode, selectedExportItems, exportUnit);
                setIsExportModalOpen(false);
              }}
            >
              <Check className="h-4 w-4" />
              Generar Cotización PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
