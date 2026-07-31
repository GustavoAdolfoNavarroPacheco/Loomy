import React, { useMemo } from 'react';
import { ExcelTable } from '@/components/shared/ExcelTable';
import { ColumnConfig } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Layers, Package, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ProbabilityLegend, getProbabilityStyle, PROBABILITIES } from '@/features/proyectos/components/ProbabilityLegend';
import { ProbabilitySelect } from '@/features/proyectos/components/ProbabilitySelect';
import { Settings2, LayoutGrid } from 'lucide-react';
import { useProyeccion, ProyeccionRow, ProductoRow } from '@/features/proyectos/hooks/useProyeccion';

const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const availableYears = ['2025', '2026', '2027', '2028', '2029', '2030'];

export default function ProyeccionPage() {
    const {
        selectedYear, setSelectedYear,
        selectedColorFilter, setSelectedColorFilter,
        viewMode, setViewMode,
        expandedMonth,
        isCreateOpen, setIsCreateOpen,
        newProduct, setNewProduct,
        hiddenColumns,
        toggleMonth,
        toggleColumnVisibility,
        tableData,
        productTableData,
        handleProjectCellEdit,
        handleProductCellEdit,
        handleSaveProduct,
        handleExportExcel,
        setHiddenColumns
    } = useProyeccion();

    const columns: ColumnConfig<ProyeccionRow>[] = useMemo(() => {
        const all = [
            {
                key: 'empresa',
                header: 'Empresa',
                width: '120px',
                sticky: true,
                render: (value: any, row: ProyeccionRow) => (
                    <span className={row.isTotal ? "font-black text-primary text-base uppercase" : "font-semibold truncate block"}>
                        {value}
                    </span>
                )
            },
            {
                key: 'proyecto',
                header: 'Proyecto',
                width: '150px',
                sticky: true,
                render: (value: any, row: ProyeccionRow) => (
                    <span className={cn("truncate block", row.isTotal ? "font-bold" : "")}>{value}</span>
                )
            },
            ...meses.map((mes): ColumnConfig<ProyeccionRow> => ({
                key: mes,
                header: mes.substring(0, 3),
                width: '100px',
                editable: true,
                type: 'number' as const,
                render: (value: any, row: ProyeccionRow) => {
                    const facturado = row[mes + '_facturado'] as number;
                    const isMatch = facturado > 0;
                    const isOverride = row[mes + '_is_override'];
                    const probabilidad = row[mes + '_probabilidad'] as number | undefined;
                    const probStyle = getProbabilityStyle(probabilidad, isMatch);

                    const formatted = new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        maximumFractionDigits: 0
                    }).format(value || 0);

                    return (
                        <div className={cn(
                            "flex flex-col h-full w-full p-2 min-h-[48px] justify-between group transition-colors",
                            row.isTotal ? "" : (probStyle?.color || "bg-transparent"),
                            isMatch ? "bg-emerald-600/20" : ""
                        )}>
                            <span className={cn(
                                "text-[10px] leading-tight",
                                row.isTotal ? "font-bold text-[11px]" : "font-semibold tracking-tight",
                                row.isTotal && isOverride ? "text-blue-600 underline decoration-dotted underline-offset-4" : row.isTotal ? "text-foreground" : "",
                                isMatch ? "text-emerald-900 font-black" : (probStyle?.textColor || "")
                            )}>
                                {formatted}
                            </span>
                            
                            {!row.isTotal && (
                                <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                    <ProbabilitySelect 
                                        value={probabilidad} 
                                        onChange={(val) => handleProjectCellEdit(row.id as string, `PROB_${mes}`, val)}
                                        isFacturado={isMatch}
                                    />
                                </div>
                            )}
                        </div>
                    );
                }
            })),
            {
                key: 'total',
                header: 'Total',
                width: '110px',
                className: 'font-bold text-primary',
                render: (_: any, row: ProyeccionRow) => {
                    const total = meses.reduce((acc, mes) => acc + (row[mes] as number), 0);
                    return (
                        <span className={row.isTotal ? "font-black text-lg border-t-2 border-primary pt-1" : ""}>
                            {new Intl.NumberFormat('es-CO', {
                                style: 'currency',
                                currency: 'COP',
                                maximumFractionDigits: 0
                            }).format(total)}
                        </span>
                    );
                }
            }
        ];
        return all.filter(c => !hiddenColumns.includes(String(c.key)));
    }, [selectedYear, hiddenColumns, handleProjectCellEdit]);

    const productColumns: ColumnConfig<ProductoRow>[] = useMemo(() => {
        const base = [
            {
                key: 'nombre',
                header: 'Producto',
                width: '150px',
                editable: true,
                className: 'font-semibold',
            },
            {
                key: 'ticketPromedio',
                header: 'Ticket $',
                width: '110px',
                editable: true,
                type: 'number' as const,
                format: (val: any) => `$ ${val?.toLocaleString('es-CO') || 0}`
            }
        ];

        const monthCols = (() => {
            const visibleMonths = meses.filter(m => !hiddenColumns.includes(m));
            const sortedMonths = expandedMonth
                ? [expandedMonth, ...visibleMonths.filter(m => m !== expandedMonth)]
                : visibleMonths;

            return sortedMonths.flatMap((mes): ColumnConfig<ProductoRow>[] => {
                const isExpanded = expandedMonth === mes;
                const shortMes = mes.substring(0, 3);

                if (!isExpanded) {
                    return [{
                        key: `${mes}_total`,
                        header: (
                            <div
                                className="flex items-center gap-1 cursor-pointer hover:text-white/80 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleMonth(mes);
                                }}
                            >
                                <ChevronRight className="h-4 w-4" />
                                {shortMes}
                            </div>
                        ),
                        width: '100px',
                        editable: true,
                        type: 'number' as const,
                        render: (val: any, row: ProductoRow) => {
                            const isOverride = row[`${mes}_is_override`];
                            return (
                                <span className={cn(
                                    "font-bold",
                                    row.isTotal && isOverride ? "text-blue-600 underline decoration-dotted underline-offset-4" : "text-slate-700"
                                )}>
                                    $ {Number(val)?.toLocaleString('es-CO') || 0}
                                </span>
                            );
                        },
                        className: 'font-bold text-slate-700 bg-slate-50 cursor-pointer',
                    }];
                }

                return [
                    {
                        key: `${mes}_cantidad`,
                        header: (
                            <div
                                className="flex items-center gap-1 cursor-pointer hover:text-white/80 transition-colors font-bold"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleMonth(mes);
                                }}
                            >
                                <ChevronDown className="h-4 w-4" />
                                {shortMes} #
                            </div>
                        ),
                        width: '70px',
                        editable: true,
                        type: 'number' as const,
                        className: 'bg-primary/5 border-l-2 border-primary/20 font-medium text-center'
                    },
                    {
                        key: `${mes}_real`,
                        header: `${shortMes} R`,
                        width: '70px',
                        editable: true,
                        type: 'number' as const,
                        className: 'bg-emerald-50 text-emerald-700 font-medium text-center'
                    },
                    {
                        key: `${mes}_total`,
                        header: (
                            <div
                                className="flex items-center gap-1 cursor-pointer hover:text-white/80 transition-colors font-bold text-center"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleMonth(mes);
                                }}
                            >
                                <ChevronDown className="h-4 w-4" />
                                {shortMes} $
                            </div>
                        ),
                        width: '110px',
                        editable: true,
                        type: 'number' as const,
                        render: (val: any, row: ProductoRow) => {
                            const isOverride = row[`${mes}_is_override`];
                            const probabilidad = row[`${mes}_probabilidad`] as number | undefined;
                            const probStyle = getProbabilityStyle(probabilidad);

                            return (
                                <div className={cn(
                                    "flex flex-col h-full w-full p-2 min-h-[48px] justify-between group transition-colors",
                                    row.isTotal ? "bg-primary/5" : (probStyle?.color || "bg-transparent")
                                )}>
                                    <span className={cn(
                                        "font-bold text-[10px] leading-tight",
                                        row.isTotal && isOverride ? "text-blue-600 underline decoration-dotted underline-offset-4" : "text-slate-900",
                                        !row.isTotal && (probStyle?.textColor || "")
                                    )}>
                                        $ {Number(val)?.toLocaleString('es-CO') || 0}
                                    </span>

                                    {!row.isTotal && (
                                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                            <ProbabilitySelect 
                                                value={probabilidad} 
                                                onChange={(newProb) => handleProductCellEdit(row.id, `${mes}_probabilidad`, newProb)}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        },
                        className: 'font-bold text-slate-800 border-r-2 border-primary/20'
                    },
                ];
            });
        })();

        const final = [
            ...base.filter(c => !hiddenColumns.includes(String(c.key))),
            ...monthCols,
            {
                key: 'total_anual',
                header: 'Sumatoria Anual',
                width: '120px',
                className: 'font-bold text-primary border-l-2 text-right',
                render: (_: any, row: ProductoRow) => {
                    let total = 0;
                    meses.forEach(mes => {
                        const val = row[`${mes}_total`];
                        if (typeof val === 'number') total += val;
                    });

                    return (
                        <span className={row.isTotal ? "font-black text-lg" : ""}>
                            {new Intl.NumberFormat('es-CO', {
                                style: 'currency',
                                currency: 'COP',
                                maximumFractionDigits: 0
                            }).format(total)}
                        </span>
                    );
                }
            }
        ];
        
        return final.filter(c => !hiddenColumns.includes(String(c.key)));
    }, [selectedYear, expandedMonth, hiddenColumns, handleProductCellEdit, toggleMonth]);

    return (
        <div className="flex flex-col h-full gap-4 overflow-hidden">
            <div className="flex flex-col xl:flex-row xl:justify-between xl:items-baseline gap-4 shrink-0">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Proyección Anual</h2>
                    <p className="text-xs md:text-sm text-muted-foreground">
                        Resumen de proyecciones mensuales por empresa y proyecto.
                    </p>
                </div>
                
                <div className="hidden md:block">
                    <ProbabilityLegend />
                </div>

                <div className="flex flex-wrap items-center gap-2 md:gap-4 shrink-0">
                    <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as any)} className="bg-muted p-0.5 rounded-lg shrink-0">
                        <ToggleGroupItem value="project" aria-label="Por Proyecto" className="text-[10px] md:text-xs h-8 px-2">
                            <Layers className="h-3 w-3 mr-1.5" />
                            Proyectos
                        </ToggleGroupItem>
                        <ToggleGroupItem value="product" aria-label="Por Producto" className="text-[10px] md:text-xs h-8 px-2">
                            <Package className="h-3 w-3 mr-1.5" />
                            Productos
                        </ToggleGroupItem>
                    </ToggleGroup>

                    {viewMode === 'product' && (
                        <Button size="sm" onClick={() => setIsCreateOpen(true)} className="h-8 text-xs shrink-0">
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Agregar
                        </Button>
                    )}

                    <div className="flex gap-2 shrink-0">
                        <Select value={selectedColorFilter} onValueChange={setSelectedColorFilter}>
                            <SelectTrigger className="w-[130px] md:w-[150px] h-8 text-xs">
                                <SelectValue placeholder="Probabilidad" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las prob.</SelectItem>
                                {PROBABILITIES.map(p => (
                                    <SelectItem key={p.value} value={p.value.toString()}>
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-2 h-2 rounded-full", p.color)} />
                                            <span className="text-[10px]">{p.label}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="w-[85px] md:w-[100px] h-8 text-xs">
                                <SelectValue placeholder="Año" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(y => (
                                    <SelectItem key={y} value={y}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-8 text-xs">
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            Exportar
                        </Button>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 text-xs">
                                    <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                                    Columnas
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-4" align="end">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <h4 className="font-bold text-sm">Gestionar Columnas</h4>
                                        <Settings2 className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Generales</div>
                                        {[
                                            { key: 'empresa', label: 'Empresa' },
                                            { key: 'proyecto', label: 'Proyecto' },
                                            { key: 'total', label: 'Total General' }
                                        ].map(col => (
                                            <div key={col.key} className="flex items-center gap-2 hover:bg-muted/50 p-1 rounded transition-colors">
                                                <Checkbox 
                                                    id={`col-${col.key}`} 
                                                    checked={!hiddenColumns.includes(col.key)} 
                                                    onCheckedChange={() => toggleColumnVisibility(col.key)}
                                                />
                                                <Label htmlFor={`col-${col.key}`} className="text-xs cursor-pointer flex-1">{col.label}</Label>
                                            </div>
                                        ))}
                                        
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-3 mb-1">Meses</div>
                                        {meses.map(mes => (
                                            <div key={mes} className="flex items-center gap-2 hover:bg-muted/50 p-1 rounded transition-colors">
                                                <Checkbox 
                                                    id={`col-${mes}`} 
                                                    checked={!hiddenColumns.includes(mes)} 
                                                    onCheckedChange={() => toggleColumnVisibility(mes)}
                                                />
                                                <Label htmlFor={`col-${mes}`} className="text-xs cursor-pointer flex-1">{mes}</Label>
                                            </div>
                                        ))}

                                        {viewMode === 'product' && (
                                            <>
                                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-3 mb-1">Producto</div>
                                                <div className="flex items-center gap-2 hover:bg-muted/50 p-1 rounded transition-colors">
                                                    <Checkbox 
                                                        id="col-ticketPromedio" 
                                                        checked={!hiddenColumns.includes('ticketPromedio')} 
                                                        onCheckedChange={() => toggleColumnVisibility('ticketPromedio')}
                                                    />
                                                    <Label htmlFor="col-ticketPromedio" className="text-xs cursor-pointer flex-1">Ticket Promedio</Label>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="w-full text-[10px] h-7 text-primary hover:text-primary hover:bg-primary/5"
                                        onClick={() => setHiddenColumns([])}
                                    >
                                        Restablecer todas
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>

            <Card className="flex-1 min-h-0 border-none shadow-md bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col">
                <CardHeader className="py-2 px-4 shrink-0">
                    <CardTitle className="text-sm font-semibold">Tabla de Proyecciones</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
                    <ExcelTable<any>
                        data={viewMode === 'project' ? tableData : productTableData}
                        columns={viewMode === 'project' ? columns : productColumns}
                        onCellEdit={viewMode === 'project' ? handleProjectCellEdit : handleProductCellEdit}
                        getRowIndicatorColor={(row) => row.isTotal ? 'bg-primary' : 'bg-transparent'}
                        headerClassName={viewMode === 'product' ? "bg-module text-module-foreground hover:bg-module/90" : undefined}
                        stickyColumnCount={2}
                        compact={true}
                    />
                </CardContent>
            </Card>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Crear Nuevo Producto</DialogTitle>
                        <DialogDescription>
                            Ingrese los detalles del nuevo producto para la proyección.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Nombre
                            </Label>
                            <Input
                                id="name"
                                value={newProduct.nombre}
                                onChange={(e) => setNewProduct({ ...newProduct, nombre: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="ticket" className="text-right">
                                Ticket Promedio
                            </Label>
                            <Input
                                id="ticket"
                                type="number"
                                value={newProduct.ticketPromedio}
                                onChange={(e) => setNewProduct({ ...newProduct, ticketPromedio: Number(e.target.value) })}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={handleSaveProduct}>Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}