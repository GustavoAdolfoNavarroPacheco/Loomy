import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ExcelTable } from '@/components/shared/ExcelTable';
import { useData } from '@/contexts/DataContext';
import { Cliente, ColumnConfig } from '@/types';

export default function ListaClientesPage() {
    const navigate = useNavigate();
    const { clientes, empresas, updateCliente, deleteCliente } = useData();

    // Combine client data with company info
    const displayData = clientes.map(cliente => {
        const empresa = empresas.find(e => e.id === cliente.empresaId);
        return {
            ...cliente,
            empresaNombre: empresa ? empresa.nombre : 'No asignada'
        };
    });

    const columns: ColumnConfig<any>[] = [
        { key: 'nombre', header: 'Nombre', editable: true },
        { key: 'empresaNombre', header: 'Empresa', editable: false },
        { key: 'celular', header: 'Celular', editable: true },
        { key: 'cargo', header: 'Cargo', editable: true },
        { key: 'cedula', header: 'Cédula', editable: true },
    ];

    const handleEdit = (cliente: Cliente) => {
        // Navigate to the company's client page if we want to use the existing dialog logic
        // or we could implement a global edit here. Given the request, we'll keep it simple
        // and allow inline editing via ExcelTable if supported, or just view.
        navigate(`/empresas/${cliente.empresaId}/clientes`);
    };

    const handleDelete = (cliente: Cliente) => {
        if (confirm(`¿Está seguro de eliminar el cliente "${cliente.nombre}"?`)) {
            deleteCliente(cliente.id);
        }
    };

    const handleCellEdit = (rowId: string, key: string, value: any) => {
        updateCliente(rowId, { [key]: value });
    };

    const handleExportExcel = () => {
        const dataToExport = displayData.map(item => ({
            'Nombre': item.nombre,
            'Empresa': item.empresaNombre,
            'Celular': item.celular,
            'Cargo': item.cargo,
            'Cédula': item.cedula,
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Lista de Clientes");
        XLSX.writeFile(wb, `Lista_Clientes_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="space-y-6">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbPage>Clientes</BreadcrumbPage>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Lista Global</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-full">
                        <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">
                            Lista de Clientes
                        </h2>
                        <p className="text-muted-foreground">
                            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} en total
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportExcel}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar Excel
                    </Button>
                </div>
            </div>

            <ExcelTable
                data={displayData}
                columns={columns}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onCellEdit={handleCellEdit}
            />
        </div>
    );
}
