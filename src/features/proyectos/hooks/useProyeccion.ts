import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import * as XLSX from 'xlsx';

const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export interface ProyeccionRow {
    id: string;
    empresa: string;
    proyecto: string;
    isTotal?: boolean;
    [key: string]: string | number | boolean | undefined;
}

export interface ProductoRow {
    id: string;
    nombre: string;
    ticketPromedio: number;
    isTotal?: boolean;
    [key: string]: string | number | boolean | undefined | any;
}

export const useProyeccion = () => {
    const { proyectos, empresas, facturas, clientes, productosProyeccion, updateProyecto, addProductoProyeccion, updateProductoProyeccion } = useData();
    
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [selectedColorFilter, setSelectedColorFilter] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'project' | 'product'>('project');
    const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newProduct, setNewProduct] = useState({ nombre: '', ticketPromedio: 0 });
    const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);

    const toggleMonth = (mes: string) => {
        setExpandedMonth(prev => prev === mes ? null : mes);
    };

    const toggleColumnVisibility = (key: string) => {
        setHiddenColumns(prev => 
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const tableData = useMemo(() => {
        const proyectosValidos = proyectos.filter(p => p.id !== 'PROJECT_TOTALS_OVERRIDE' && p.estado?.toLowerCase() !== 'perdido' && p.estado?.toLowerCase() !== 'archivado');
        const rows: ProyeccionRow[] = proyectosValidos.map(p => {
            const empresa = empresas.find(e => e.id === p.empresaId);
            const row: ProyeccionRow = {
                id: p.id,
                empresa: empresa?.nombre || 'N/A',
                proyecto: p.nombre,
                isTotal: false
            };

            const empresaTieneMultiproyecto = proyectosValidos.filter(
                x => x.empresaId === p.empresaId
            ).length > 1;

            meses.forEach((mes, index) => {
                const proyeccion = p.proyeccion || {};
                let proyectado = 0;

                if (selectedYear === '2026' && (proyeccion as any)['Enero'] !== undefined && !proyeccion['2026']) {
                    proyectado = (proyeccion as any)[mes] || 0;
                } else {
                    proyectado = proyeccion[selectedYear]?.[mes] || 0;
                }

                const facturadoEnMes = facturas
                    .filter(f => {
                        const fDate = new Date(f.fecha);
                        const matchEmpresa = f.empresaId === p.empresaId;
                        const matchCliente = f.clienteId && clientes.find(c => c.id === f.clienteId)?.empresaId === p.empresaId;

                        if (!(matchEmpresa || matchCliente)) return false;
                        if (fDate.getFullYear() !== parseInt(selectedYear) || fDate.getMonth() !== index) return false;

                        if (empresaTieneMultiproyecto) {
                            return proyectado > 0 && f.valorTotal === proyectado;
                        }

                        return true;
                    })
                    .reduce((acc, f) => acc + f.valorTotal, 0);

                row[mes] = facturadoEnMes > 0 ? facturadoEnMes : proyectado;
                row[mes + '_proyectado'] = proyectado as number;
                row[mes + '_facturado'] = facturadoEnMes;
                row[mes + '_probabilidad'] = p.probabilidades?.[selectedYear]?.[mes];
                row[mes + '_is_override'] = false;
            });

            return row;
        }).filter(row => {
            const hasValues = meses.some(mes => (row[mes] as number) > 0);
            if (!hasValues) return false;
            if (selectedColorFilter === 'all') return true;
            
            const filterValue = Number(selectedColorFilter);
            return meses.some(mes => {
                const facturado = row[mes + '_facturado'] as number;
                const isMatch = facturado > 0;
                const prob = isMatch ? 100 : row[mes + '_probabilidad'];
                return (row[mes] as number) > 0 && prob === filterValue;
            });
        });

        const overrideDoc = proyectos.find(p => p.id === 'PROJECT_TOTALS_OVERRIDE');
        const totalRow: ProyeccionRow = {
            id: 'total-row',
            empresa: 'TOTAL GENERAL',
            proyecto: '',
            isTotal: true
        };

        meses.forEach(mes => {
            const sum = rows.reduce((acc, row) => {
                const val = row[mes];
                return acc + (typeof val === 'number' ? val : 0);
            }, 0);

            const override = overrideDoc?.proyeccion?.[selectedYear]?.[mes];
            totalRow[mes] = override !== undefined ? override : sum;
            totalRow[mes + '_is_override'] = override !== undefined;
        });

        return [...rows, totalRow];
    }, [proyectos, empresas, facturas, clientes, selectedYear, selectedColorFilter]);

    const productTableData = useMemo(() => {
        const normalProducts = productosProyeccion.filter(p => p.id !== 'PRODUCT_TOTALS_OVERRIDE');
        const rows: ProductoRow[] = normalProducts.map(p => {
            const row: ProductoRow = {
                id: p.id,
                nombre: p.nombre,
                ticketPromedio: p.ticketPromedio,
                isTotal: false
            };

            meses.forEach(mes => {
                const key = `${selectedYear}_${mes}`;
                const datosMes = p.proyeccion?.[key] || { cantidad: 0, real: 0, meta: 0 };

                row[`${mes}_cantidad`] = datosMes.cantidad;
                row[`${mes}_real`] = datosMes.real;
                row[`${mes}_meta`] = datosMes.meta;
                row[`${mes}_total`] = datosMes.cantidad * p.ticketPromedio;
                row[`${mes}_probabilidad`] = datosMes.probabilidad;
            });

            return row;
        });

        const filteredRows = selectedColorFilter === 'all'
            ? rows
            : rows.filter(row => {
                const filterValue = Number(selectedColorFilter);
                return meses.some(mes => {
                    const prob = row[`${mes}_probabilidad`];
                    return (row[`${mes}_total`] as number) > 0 && prob === filterValue;
                });
            });

        const overrideDoc = productosProyeccion.find(p => p.id === 'PRODUCT_TOTALS_OVERRIDE');
        const totalRow: ProductoRow = {
            id: 'total-row-prod',
            nombre: 'TOTAL GENERAL',
            ticketPromedio: overrideDoc?.ticketPromedio || 0,
            isTotal: true
        };

        meses.forEach(mes => {
            const totalCantidad = filteredRows.reduce((acc, r) => acc + (r[`${mes}_cantidad`] as number || 0), 0);
            const totalReal = filteredRows.reduce((acc, r) => acc + (r[`${mes}_real`] as number || 0), 0);
            const totalMeta = filteredRows.reduce((acc, r) => acc + (r[`${mes}_meta`] as number || 0), 0);
            const totalMonto = filteredRows.reduce((acc, r) => acc + (r[`${mes}_total`] as number || 0), 0);

            const key = `${selectedYear}_${mes}`;
            const override = overrideDoc?.proyeccion?.[key];

            totalRow[`${mes}_cantidad`] = override?.cantidad !== undefined ? override.cantidad : totalCantidad;
            totalRow[`${mes}_real`] = override?.real !== undefined ? override.real : totalReal;
            totalRow[`${mes}_meta`] = override?.meta !== undefined ? override.meta : totalMeta;

            totalRow[`${mes}_total`] = override?.total !== undefined
                ? override.total
                : (override?.cantidad !== undefined
                    ? (override.cantidad * (overrideDoc?.ticketPromedio || 0))
                    : totalMonto);

            totalRow[`${mes}_is_override`] = override?.total !== undefined || override?.cantidad !== undefined;
        });

        return [...filteredRows, totalRow];
    }, [productosProyeccion, selectedYear, selectedColorFilter]);

    const handleProjectCellEdit = async (rowId: string, key: string, value: any) => {
        const isTotalRow = rowId === 'total-row';
        const targetId = isTotalRow ? 'PROJECT_TOTALS_OVERRIDE' : rowId;

        let proyecto = proyectos.find(p => p.id === targetId);

        if (isTotalRow && !proyecto) {
            proyecto = {
                id: targetId,
                nombre: 'TOTAL GENERAL',
                empresaId: '',
                categoriaId: '',
                estado: 'activo',
                etapaActual: 'START',
                faseActual: 'proyeccion',
                costo: 0,
                valorAproximado: 0,
                valorFinal: 0,
                alcances: [],
                facturas: [],
                entrega1: [],
                entrega2: [],
                entrega3: [],
                createdAt: new Date(),
                proyeccion: {}
            };
        }

        if (!proyecto) return;

        const currentProyeccion = proyecto.proyeccion || {};
        const currentProbabilidades = proyecto.probabilidades || {};
        const currentYearData = currentProyeccion[selectedYear] || {};
        const currentYearProb = currentProbabilidades[selectedYear] || {};

        if (key.startsWith('PROB_')) {
            const mesKey = key.replace('PROB_', '');
            const newProbData = {
                ...currentProbabilidades,
                [selectedYear]: {
                    ...currentYearProb,
                    [mesKey]: Number(value)
                }
            };
            await updateProyecto(targetId, { probabilidades: newProbData });
        } else {
            const newData = {
                ...currentProyeccion,
                [selectedYear]: {
                    ...currentYearData,
                    [key]: Number(value)
                }
            };
            
            if (!currentYearProb[key]) {
                const newProbData = {
                    ...currentProbabilidades,
                    [selectedYear]: {
                        ...currentYearProb,
                        [key]: 20
                    }
                };
                await updateProyecto(targetId, { proyeccion: newData, probabilidades: newProbData });
            } else {
                await updateProyecto(targetId, { proyeccion: newData });
            }
        }
    };

    const handleProductCellEdit = async (rowId: string, key: string, value: any) => {
        const isTotalRow = rowId === 'total-row-prod';
        const targetId = isTotalRow ? 'PRODUCT_TOTALS_OVERRIDE' : rowId;

        let producto = productosProyeccion.find(p => p.id === targetId);

        if (isTotalRow && !producto) {
            producto = {
                id: targetId,
                nombre: 'TOTAL GENERAL',
                ticketPromedio: 0,
                proyeccion: {},
                createdAt: new Date()
            };
        }

        if (!producto) return;

        if (key === 'nombre') {
            if (!isTotalRow) {
                await updateProductoProyeccion(targetId, { nombre: value });
            }
        } else if (key === 'ticketPromedio') {
            await updateProductoProyeccion(targetId, { ticketPromedio: Number(value) });
        } else {
            const [mes, field] = key.split('_');
            const proyeccionKey = `${selectedYear}_${mes}`;

            const currentProyeccion = producto.proyeccion || {};
            const currentMesData = currentProyeccion[proyeccionKey] || { cantidad: 0, real: 0, meta: 0 };

            let newData;
            if (field === 'probabilidad') {
                newData = {
                    ...currentProyeccion,
                    [proyeccionKey]: {
                        ...currentMesData,
                        probabilidad: Number(value)
                    }
                };
            } else {
                let updateValue = Number(value);
                let updateField = field;

                if (field === 'total' && !isTotalRow) {
                    updateField = 'cantidad';
                    updateValue = producto.ticketPromedio > 0 ? Number(value) / producto.ticketPromedio : 0;
                }

                newData = {
                    ...currentProyeccion,
                    [proyeccionKey]: {
                        ...currentMesData,
                        [updateField]: updateValue,
                        probabilidad: currentMesData.probabilidad ?? 20
                    }
                };
            }

            await updateProductoProyeccion(targetId, { proyeccion: newData });
        }
    };

    const handleSaveProduct = async () => {
        if (!newProduct.nombre) return;

        await addProductoProyeccion({
            nombre: newProduct.nombre,
            ticketPromedio: newProduct.ticketPromedio,
            proyeccion: {}
        });

        setIsCreateOpen(false);
        setNewProduct({ nombre: '', ticketPromedio: 0 });
    };

    const handleExportExcel = () => {
        const dataToExport = tableData.map(row => {
            const exportRow: any = {
                'Empresa': row.empresa,
                'Proyecto': row.proyecto,
            };

            meses.forEach(mes => {
                exportRow[mes] = row[mes];
            });

            const total = meses.reduce((acc, mes) => acc + (row[mes] as number || 0), 0);
            exportRow['Total Anual'] = total;

            return exportRow;
        });

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Proyecciones");
        XLSX.writeFile(wb, `Proyeccion_Anual_${selectedYear}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return {
        selectedYear, setSelectedYear,
        selectedColorFilter, setSelectedColorFilter,
        viewMode, setViewMode,
        expandedMonth, setExpandedMonth,
        isCreateOpen, setIsCreateOpen,
        newProduct, setNewProduct,
        hiddenColumns, setHiddenColumns,
        toggleMonth,
        toggleColumnVisibility,
        tableData,
        productTableData,
        handleProjectCellEdit,
        handleProductCellEdit,
        handleSaveProduct,
        handleExportExcel,
        proyectos,
        productosProyeccion,
    };
};
