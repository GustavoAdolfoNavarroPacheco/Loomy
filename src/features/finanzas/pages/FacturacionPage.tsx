import { useState, useMemo } from 'react';
import { Plus, Download, Calendar, User, Hash, Building2, FileText, Package, DollarSign, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ExcelTable } from '@/components/shared/ExcelTable';
import { FacturaDialog } from '@/features/finanzas/components/FacturaDialog';
import { useData } from '@/contexts/DataContext';
import { Factura, ColumnConfig } from '@/types';
import * as XLSX from 'xlsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const availableYears = ['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'];

export default function FacturacionPage() {
  const { facturas, updateFactura, deleteFactura, comerciales, lineas } = useData();
  const { isMarianaOrHector } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFactura, setEditingFactura] = useState<Factura | null>(null);

  // Estados de filtro
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');

  const filteredFacturas = useMemo(() => {
    return facturas.filter(factura => {
      const fDate = new Date(factura.fecha);
      const fYear = fDate.getFullYear().toString();
      const fMonth = fDate.getMonth().toString(); // 0-11
      const fDateString = fDate.toISOString().split('T')[0];

      const matchYear = selectedYear === 'all' || fYear === selectedYear;
      const matchMonth = selectedMonth === 'all' || fMonth === selectedMonth;
      const matchDate = !selectedDate || fDateString === selectedDate;

      return matchYear && matchMonth && matchDate;
    });
  }, [facturas, selectedYear, selectedMonth, selectedDate]);

  const columns: ColumnConfig<Factura>[] = [
    {
      key: 'fecha',
      header: (
        <span className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 opacity-70" />
          Fecha
        </span>
      ),
      headerLabel: 'Fecha',
      type: 'date',
      format: (value) => new Date(value).toLocaleDateString('es-CO'),
    },
    {
      key: 'comercial',
      header: (
        <span className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 opacity-70" />
          Comercial
        </span>
      ),
      headerLabel: 'Comercial',
      editable: !isMarianaOrHector,
      type: 'select',
      options: comerciales.map(c => ({ value: c.nombre, label: c.nombre }))
    },
    { 
      key: 'linea', 
      header: 'Línea', 
      editable: !isMarianaOrHector,
      type: 'select',
      options: lineas.map(l => ({ value: l.nombre, label: l.nombre }))
    },
    {
      key: 'nit',
      header: (
        <span className="flex items-center gap-2">
          <Hash className="h-3.5 w-3.5 opacity-70" />
          NIT
        </span>
      ),
      headerLabel: 'NIT',
      editable: !isMarianaOrHector
    },
    {
      key: 'empresaNombre',
      header: (
        <span className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 opacity-70" />
          Empresa
        </span>
      ),
      headerLabel: 'Empresa',
      editable: !isMarianaOrHector
    },
    {
      key: 'descripcion',
      header: (
        <span className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 opacity-70" />
          Descripción
        </span>
      ),
      headerLabel: 'Descripción',
      editable: !isMarianaOrHector
    },
    {
      key: 'cantidad',
      header: (
        <span className="flex items-center gap-2">
          <Package className="h-3.5 w-3.5 opacity-70" />
          Cant.
        </span>
      ),
      headerLabel: 'Cantidad',
      type: 'number',
      editable: !isMarianaOrHector
    },
    {
      key: 'precioUnitario',
      header: 'P. Unitario',
      format: (value) => `$${(value || 0).toLocaleString('es-CO')}`,
      type: 'number',
      editable: !isMarianaOrHector,
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
      format: (value) => `$${(value || 0).toLocaleString('es-CO')}`,
      render: (value) => <span className="font-bold text-foreground">${(value || 0).toLocaleString('es-CO')}</span>
    },
    {
      key: 'numeroFactura',
      header: (
        <span className="flex items-center gap-2">
          <Hash className="h-3.5 w-3.5 opacity-70" />
          # Factura
        </span>
      ),
      headerLabel: '# Factura',
      editable: !isMarianaOrHector
    },
  ];

  const handleEdit = (factura: Factura) => {
    setEditingFactura(factura);
    setDialogOpen(true);
  };

  const handleDelete = (factura: Factura) => {
    if (confirm(`¿Está seguro de eliminar la factura "${factura.numeroFactura}"?`)) {
      deleteFactura(factura.id);
    }
  };

  const handleCellEdit = (rowId: string, key: string, value: any) => {
    const factura = facturas.find(f => f.id === rowId);
    if (!factura) return;

    const updates: Partial<Factura> = { [key]: value };

    if (key === 'cantidad' || key === 'precioUnitario') {
      const cantidad = key === 'cantidad' ? value : factura.cantidad;
      const precioUnitario = key === 'precioUnitario' ? value : factura.precioUnitario;
      updates.valorTotal = (cantidad || 0) * (precioUnitario || 0);
    }

    updateFactura(rowId, updates);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingFactura(null);
  };

  const handleExportExcel = () => {
    const dataToExport = filteredFacturas.map(factura => ({
      'Fecha': new Date(factura.fecha).toLocaleDateString('es-CO'),
      'Comercial': factura.comercial,
      'Línea': factura.linea,
      'NIT': factura.nit,
      'Empresa': factura.empresaNombre,
      'Descripción': factura.descripcion,
      'Cantidad': factura.cantidad,
      'Precio Unitario': factura.precioUnitario,
      'Valor Total': factura.valorTotal,
      '# Factura': factura.numeroFactura,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Facturación");

    XLSX.writeFile(wb, `Reporte_Facturacion_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const clearFilters = () => {
    setSelectedYear(new Date().getFullYear().toString());
    setSelectedMonth('all');
    setSelectedDate('');
  };

  const totalFacturado = filteredFacturas.reduce((sum, f) => sum + f.valorTotal, 0);

  return (
    <div className="flex flex-col h-full gap-3 md:gap-4 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 shrink-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Facturación</h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Gestione las facturas generales del sistema
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-8 text-xs">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Exportar
          </Button>

          {!isMarianaOrHector && (
            <Button size="sm" onClick={() => setDialogOpen(true)} className="h-8 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Nueva Factura
            </Button>
          )}
        </div>
      </div>

      {/* Panel de Filtros */}
      <div className="bg-card p-2 md:p-3 rounded-lg border border-border shadow-sm flex flex-wrap items-end gap-2 md:gap-4 shrink-0">
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Año</label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[80px] md:w-[100px] h-8 bg-background text-xs">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Mes</label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[90px] md:w-[120px] h-8 bg-background text-xs">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {meses.map((mes, index) => (
                <SelectItem key={index} value={index.toString()}>{mes}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Fecha</label>
          <div className="relative">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-[120px] md:w-[140px] h-8 bg-background pr-7 text-xs"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {(selectedYear !== new Date().getFullYear().toString() || selectedMonth !== 'all' || selectedDate) && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs text-muted-foreground">
            Limpiar
          </Button>
        )}

        <div className="ml-auto hidden lg:flex items-center gap-2 bg-module/8 px-3 py-1.5 rounded-md border border-module/15">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total: </span>
          <span className="text-sm font-bold text-module">${(totalFacturado || 0).toLocaleString('es-CO')}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-card rounded-lg border border-border overflow-hidden">
        <ExcelTable
          data={filteredFacturas}
          columns={columns}
          onEdit={!isMarianaOrHector ? handleEdit : undefined}
          onDelete={!isMarianaOrHector ? handleDelete : undefined}
          onCellEdit={!isMarianaOrHector ? handleCellEdit : undefined}
        />
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-2 shrink-0 pt-1">
        <div className="text-[10px] md:text-xs text-muted-foreground order-2 md:order-1">
          Mostrando <span className="font-medium text-foreground">{filteredFacturas.length}</span> de <span className="font-medium text-foreground">{facturas.length}</span> facturas
        </div>
        <div className="lg:hidden bg-module/8 rounded-md px-3 py-1 border border-module/15 order-1 md:order-2 w-full text-center">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Facturado: </span>
          <span className="text-sm font-bold text-module">${(totalFacturado || 0).toLocaleString('es-CO')}</span>
        </div>
      </div>

      <FacturaDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        factura={editingFactura}
      />
    </div>
  );
}
