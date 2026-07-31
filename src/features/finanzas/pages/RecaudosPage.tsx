import { useState, useMemo } from 'react';
import { Plus, Download, Calendar, User, Hash, Building2, Wallet, DollarSign, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ExcelTable } from '@/components/shared/ExcelTable';
import { RecaudoDialog } from '@/features/finanzas/components/RecaudoDialog';
import { useData } from '@/contexts/DataContext';
import { Recaudo, ColumnConfig } from '@/types';
import * as XLSX from 'xlsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const availableYears = ['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'];

export default function RecaudosPage() {
  const { recaudos, updateRecaudo, deleteRecaudo, comerciales, lineas, proyectos, empresas, updateProyecto } = useData();
  const { isMarianaOrHector } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecaudo, setEditingRecaudo] = useState<Recaudo | null>(null);

  // Estados de filtro
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');

  const filteredRecaudos = useMemo(() => {
    return recaudos.filter(recaudo => {
      const rDate = new Date(recaudo.fecha);
      const rYear = rDate.getFullYear().toString();
      const rMonth = rDate.getMonth().toString(); // 0-11
      const rDateString = rDate.toISOString().split('T')[0];

      const matchYear = selectedYear === 'all' || rYear === selectedYear;
      const matchMonth = selectedMonth === 'all' || rMonth === selectedMonth;
      const matchDate = !selectedDate || rDateString === selectedDate;

      return matchYear && matchMonth && matchDate;
    }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [recaudos, selectedYear, selectedMonth, selectedDate]);

  const columns: ColumnConfig<Recaudo>[] = [
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
    {
      key: 'numeroRecaudo',
      header: (
        <span className="flex items-center gap-2">
          <Hash className="h-3.5 w-3.5 opacity-70" />
          # Recaudo
        </span>
      ),
      headerLabel: '# Recaudo',
      editable: !isMarianaOrHector
    },
    {
      key: 'valor',
      header: (
        <span className="flex items-center gap-2">
          <DollarSign className="h-3.5 w-3.5 opacity-70" />
          Valor Recaudo
        </span>
      ),
      headerLabel: 'Valor',
      format: (value) => `$${(value || 0).toLocaleString('es-CO')}`,
      type: 'number',
      editable: !isMarianaOrHector,
      render: (value) => <span className="font-bold text-emerald-600">${(value || 0).toLocaleString('es-CO')}</span>
    },
  ];

  const handleEdit = (recaudo: Recaudo) => {
    setEditingRecaudo(recaudo);
    setDialogOpen(true);
  };

  const handleDelete = async (recaudo: Recaudo) => {
    if (confirm(`¿Está seguro de eliminar el recaudo "${recaudo.numeroRecaudo}"?`)) {
      await deleteRecaudo(recaudo.id);
    }
  };

  const handleCellEdit = async (rowId: string, key: string, value: any) => {
    await updateRecaudo(rowId, { [key]: value });
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRecaudo(null);
  };

  const handleExportExcel = () => {
    const dataToExport = filteredRecaudos.map(recaudo => ({
      'Fecha': new Date(recaudo.fecha).toLocaleDateString('es-CO'),
      'Comercial': recaudo.comercial,
      'Línea': recaudo.linea,
      'Empresa': recaudo.empresaNombre,
      '# Factura': recaudo.numeroFactura,
      '# Recaudo': recaudo.numeroRecaudo,
      'Valor': recaudo.valor
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Recaudos");
    XLSX.writeFile(wb, `Reporte_Recaudos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const clearFilters = () => {
    setSelectedYear(new Date().getFullYear().toString());
    setSelectedMonth('all');
    setSelectedDate('');
  };

  const totalRecaudado = filteredRecaudos.reduce((sum, r) => sum + r.valor, 0);

  return (
    <div className="flex flex-col h-full gap-3 md:gap-4 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 shrink-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Recaudos</h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Gestione los ingresos y recaudos generales
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
              Nuevo Recaudo
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
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Recaudado: </span>
          <span className="text-sm font-bold text-emerald-600">${(totalRecaudado || 0).toLocaleString('es-CO')}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-card rounded-lg border border-border overflow-hidden">
        <ExcelTable
          data={filteredRecaudos}
          columns={columns}
          onEdit={!isMarianaOrHector ? handleEdit : undefined}
          onDelete={!isMarianaOrHector ? handleDelete : undefined}
          onCellEdit={!isMarianaOrHector ? handleCellEdit : undefined}
        />
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-2 shrink-0 pt-1">
        <div className="text-[10px] md:text-xs text-muted-foreground order-2 md:order-1">
          Mostrando <span className="font-medium text-foreground">{filteredRecaudos.length}</span> de <span className="font-medium text-foreground">{recaudos.length}</span> recaudos
        </div>
        <div className="lg:hidden bg-module/8 rounded-md px-3 py-1 border border-module/15 order-1 md:order-2 w-full text-center">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Recaudado: </span>
          <span className="text-sm font-bold text-emerald-600">${(totalRecaudado || 0).toLocaleString('es-CO')}</span>
        </div>
      </div>

      <RecaudoDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        recaudo={editingRecaudo}
      />
    </div>
  );
}
