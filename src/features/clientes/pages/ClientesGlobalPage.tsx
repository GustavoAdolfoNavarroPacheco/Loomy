import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Users, Upload, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExcelTable } from '@/components/shared/ExcelTable';
import { ClienteDialog } from '@/features/clientes/components/ClienteDialog';
import { ImportPreviewDialog, ImportPreviewRow } from '@/features/clientes/components/ImportPreviewDialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ImportErrorsDialog } from '@/components/shared/ImportErrorsDialog';
import { FilePreview } from '@/components/shared/FilePreview';
import { useData } from '@/contexts/DataContext';
import { useUndoableDelete } from '@/hooks/useUndoableDelete';
import { Cliente, ColumnConfig } from '@/types';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const CLIENTE_GLOBAL_EXCEL_COLUMN_MAP: Record<string, keyof Pick<Cliente, 'nombre' | 'nombreFacturacion' | 'contacto' | 'celular' | 'cargo' | 'cedula'>> = {
    'Nombre': 'nombre',
    'Nombre Facturación (Excel)': 'nombreFacturacion',
    'Nombre Facturacion (Excel)': 'nombreFacturacion',
    'Contacto': 'contacto',
    'Celular': 'celular',
    'Cargo': 'cargo',
    'Cédula': 'cedula',
    'Cedula': 'cedula',
};

type PendingImportRow = ImportPreviewRow & { empresaId?: string; nombreFacturacion?: string; contacto?: string };

export default function ClientesGlobalPage() {
    const navigate = useNavigate();
    const { clientes, clientesLoading, empresas, empresasLoading, addCliente, deleteCliente } = useData();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Cliente | null>(null);
    const [parsingFile, setParsingFile] = useState(false);
    const [confirmingImport, setConfirmingImport] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewFileName, setPreviewFileName] = useState('');
    const [previewRows, setPreviewRows] = useState<PendingImportRow[]>([]);
    const [importErrors, setImportErrors] = useState<string[]>([]);
    const [importErrorsOpen, setImportErrorsOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { pendingIds, scheduleDelete } = useUndoableDelete(deleteCliente);

    const getEmpresaNombre = (empresaId: string) => {
        return empresas.find(e => e.id === empresaId)?.nombre || 'N/A';
    };

    const visibleClientes = useMemo(() => clientes.filter(c => !pendingIds.has(c.id)), [clientes, pendingIds]);

    const columns: ColumnConfig<Cliente>[] = [
        { key: 'nombre', header: 'Nombre' },
        { key: 'nombreFacturacion', header: 'Nombre Facturación (Excel)' },
        { key: 'contacto', header: 'Contacto' },
        { key: 'celular', header: 'Celular' },
        { key: 'cargo', header: 'Cargo' },
        { key: 'cedula', header: 'Cédula' },
        {
            key: 'empresaId',
            header: 'Empresa',
            render: (value) => (
                <Button
                    variant="link"
                    className="p-0 h-auto font-normal text-blue-600 hover:underline"
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/empresas/${value}/clientes`);
                    }}
                >
                    {getEmpresaNombre(value)}
                </Button>
            ),
        },
        {
            key: 'rutArchivo',
            header: 'RUT',
            render: (value) => value ? <FilePreview filename={value} compact={true} /> : '-',
        },
        {
            key: 'camaraComercioArchivo',
            header: 'Cámara Comercio',
            render: (value) => value ? <FilePreview filename={value} compact={true} /> : '-',
        },
        {
            key: 'inscripcionClienteArchivo',
            header: 'Inscripción Cliente',
            render: (value) => value ? <FilePreview filename={value} compact={true} /> : '-',
        },
    ];

    const handleAddNew = () => {
        setEditingCliente(null);
        setDialogOpen(true);
    };

    const handleEdit = (cliente: Cliente) => {
        setEditingCliente(cliente);
        setDialogOpen(true);
    };

    const handleDelete = (cliente: Cliente) => {
        setDeleteTarget(cliente);
    };

    const confirmDelete = () => {
        if (deleteTarget) scheduleDelete(deleteTarget.id, deleteTarget.nombre);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingCliente(null);
    };

    const handleExportExcel = () => {
        const dataToExport = clientes.map(cliente => ({
            'Nombre': cliente.nombre,
            'Nombre Facturación (Excel)': cliente.nombreFacturacion || '',
            'Celular': cliente.celular,
            'Cargo': cliente.cargo,
            'Cédula': cliente.cedula,
            'Empresa': getEmpresaNombre(cliente.empresaId),
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Clientes");
        XLSX.writeFile(wb, `Clientes_Global_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Fase 1: lee y analiza el Excel, arma la vista previa. No escribe nada todavía.
    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setParsingFile(true);
        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
                toast.error('El archivo Excel no contiene hojas.');
                return;
            }

            const sheet = workbook.Sheets[sheetName];
            const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

            if (rows.length === 0) {
                toast.info('La hoja de cálculo está vacía.');
                return;
            }

            const empresaMap = new Map(empresas.map(emp => [(emp.nombre || '').trim().toLowerCase(), emp.id]));
            // Cédulas ya existentes por empresa, para no crear clientes repetidos al importar.
            const seenCedulasByEmpresa = new Map<string, Set<string>>();
            clientes.forEach(c => {
                const cedulaKey = c.cedula?.trim().toLowerCase();
                if (!cedulaKey) return;
                const set = seenCedulasByEmpresa.get(c.empresaId) || new Set<string>();
                set.add(cedulaKey);
                seenCedulasByEmpresa.set(c.empresaId, set);
            });

            const preview: PendingImportRow[] = rows.map((row, i) => {
                const rowNum = i + 2;
                const mapped: Record<string, unknown> = {};
                for (const [excelCol, field] of Object.entries(CLIENTE_GLOBAL_EXCEL_COLUMN_MAP)) {
                    const header = Object.keys(row).find(h => h.trim() === excelCol);
                    if (header) mapped[field] = row[header];
                }

                const nombre = String(mapped.nombre || '').trim();
                const celular = String(mapped.celular || '').trim();
                const cargo = String(mapped.cargo || '').trim();
                const cedula = String(mapped.cedula || '').trim();
                const nombreFacturacion = String(mapped.nombreFacturacion || '').trim() || undefined;
                const contacto = String(mapped.contacto || '').trim() || undefined;
                const empresaNombre = String(row['Empresa'] ?? '').trim();
                const base = { rowNum, nombre, celular, cargo, cedula, nombreFacturacion, contacto, empresaNombre };

                if (!nombre) {
                    return { ...base, status: 'invalid' as const, reason: 'Falta el Nombre' };
                }

                const empresaId = empresaNombre ? empresaMap.get(empresaNombre.toLowerCase()) : undefined;
                if (!empresaId) {
                    return { ...base, status: 'invalid' as const, reason: `Empresa "${empresaNombre || '(vacía)'}" no encontrada. Créela primero en el módulo Empresas.` };
                }

                const cedulaKey = cedula.toLowerCase();
                const empresaCedulas = seenCedulasByEmpresa.get(empresaId);
                if (cedulaKey && empresaCedulas?.has(cedulaKey)) {
                    return { ...base, empresaId, status: 'duplicate' as const, reason: `Ya existe (cédula ${cedula} repetida en ${empresaNombre})` };
                }
                if (cedulaKey) {
                    const set = seenCedulasByEmpresa.get(empresaId) || new Set<string>();
                    set.add(cedulaKey);
                    seenCedulasByEmpresa.set(empresaId, set);
                }

                return { ...base, empresaId, status: 'ok' as const };
            });

            setPreviewFileName(file.name);
            setPreviewRows(preview);
            setPreviewOpen(true);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error desconocido';
            toast.error('Error al leer el archivo', { description: message });
        } finally {
            setParsingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Fase 2: el usuario confirmó en la vista previa; recién aquí se crean los registros.
    const handleConfirmImport = async () => {
        setConfirmingImport(true);
        const errors: string[] = [];
        let imported = 0;

        try {
            for (const row of previewRows) {
                if (row.status !== 'ok' || !row.empresaId) continue;
                try {
                    await addCliente({
                        empresaId: row.empresaId,
                        nombre: row.nombre,
                        nombreFacturacion: row.nombreFacturacion,
                        contacto: row.contacto,
                        celular: row.celular,
                        cargo: row.cargo,
                        cedula: row.cedula,
                    });
                    imported++;
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'Error desconocido';
                    errors.push(`Fila ${row.rowNum}: Error inesperado — ${message}`);
                }
            }

            if (imported > 0) {
                toast.success('Importación completada', { description: `${imported} clientes importados exitosamente.` });
            }
            if (errors.length > 0) {
                setImportErrors(errors);
                toast.warning(`${errors.length} fila${errors.length !== 1 ? 's' : ''} con advertencias`, {
                    description: errors[0] + (errors.length > 1 ? ` (y ${errors.length - 1} más)` : ''),
                    action: { label: 'Ver todos', onClick: () => setImportErrorsOpen(true) },
                });
            }
        } finally {
            setConfirmingImport(false);
            setPreviewOpen(false);
            setPreviewRows([]);
        }
    };

    const handleCancelImport = () => {
        setPreviewOpen(false);
        setPreviewRows([]);
    };

    if (empresasLoading || clientesLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground font-medium">Cargando clientes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-4 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        <h2 className="text-xl font-bold text-foreground">Todos los Clientes</h2>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Listado general de clientes registrados en todas las empresas
                    </p>
                </div>
                <div className="flex gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={handleFileSelected}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={parsingFile}
                        className="h-8 text-xs"
                    >
                        {parsingFile ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-2" />}
                        {parsingFile ? 'Leyendo...' : 'Importar Excel'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-8 text-xs">
                        <Download className="h-3.5 w-3.5 mr-2" />
                        Exportar Excel
                    </Button>
                    <Button size="sm" onClick={handleAddNew} className="h-8 text-xs">
                        <Plus className="h-3.5 w-3.5 mr-2" />
                        Nuevo Cliente
                    </Button>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <ExcelTable
                    data={visibleClientes}
                    columns={columns}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </div>

            <ClienteDialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                cliente={editingCliente}
                empresaId={editingCliente?.empresaId}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
                title="Eliminar cliente"
                description={`¿Está seguro de eliminar al cliente "${deleteTarget?.nombre}"? Podrá deshacerlo desde la notificación durante unos segundos.`}
                confirmLabel="Eliminar"
                onConfirm={confirmDelete}
            />

            <ImportPreviewDialog
                open={previewOpen}
                fileName={previewFileName}
                rows={previewRows}
                importing={confirmingImport}
                showEmpresaColumn
                onCancel={handleCancelImport}
                onConfirm={handleConfirmImport}
            />

            <ImportErrorsDialog
                open={importErrorsOpen}
                onOpenChange={setImportErrorsOpen}
                errors={importErrors}
                fileNameHint="clientes_global"
            />
        </div>
    );
}
