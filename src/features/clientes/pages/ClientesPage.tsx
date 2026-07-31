import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Download, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ExcelTable } from '@/components/shared/ExcelTable';
import { FilePreview } from '@/components/shared/FilePreview';
import { ClienteDialog } from '@/features/clientes/components/ClienteDialog';
import { ImportPreviewDialog, ImportPreviewRow } from '@/features/clientes/components/ImportPreviewDialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ImportErrorsDialog } from '@/components/shared/ImportErrorsDialog';
import { useData } from '@/contexts/DataContext';
import { useUndoableDelete } from '@/hooks/useUndoableDelete';
import { Cliente, ColumnConfig } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const CLIENTE_EXCEL_COLUMN_MAP: Record<string, keyof Pick<Cliente, 'nombre' | 'nombreFacturacion' | 'contacto' | 'celular' | 'cargo' | 'cedula'>> = {
  'Nombre': 'nombre',
  'Nombre en Facturación / Excel': 'nombreFacturacion',
  'Nombre en Facturacion / Excel': 'nombreFacturacion',
  'Contacto': 'contacto',
  'Celular': 'celular',
  'Cargo': 'cargo',
  'Cédula': 'cedula',
  'Cedula': 'cedula',
};

type PendingImportRow = ImportPreviewRow & { nombreFacturacion?: string; contacto?: string };

export default function ClientesPage() {
  const { empresaId } = useParams<{ empresaId: string }>();
  const navigate = useNavigate();
  const { empresas, empresasLoading, clientesLoading, getClientesByEmpresa, addCliente, deleteCliente } = useData();
  const { isMarianaOrHector } = useAuth();
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

  const empresa = empresas.find(e => e.id === empresaId);
  const clientes = (empresaId ? getClientesByEmpresa(empresaId) : []).filter(c => !pendingIds.has(c.id));

  const columns: ColumnConfig<Cliente>[] = [
    { key: 'nombre', header: 'Nombre' },
    { key: 'nombreFacturacion', header: 'Nombre en Facturación / Excel' },
    { key: 'contacto', header: 'Contacto' },
    { key: 'celular', header: 'Celular' },
    { key: 'cargo', header: 'Cargo' },
    { key: 'cedula', header: 'Cédula' },
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
      'Nombre en Facturación / Excel': cliente.nombreFacturacion || '',
      'Contacto': cliente.contacto || '',
      'Celular': cliente.celular,
      'Cargo': cliente.cargo,
      'Cédula': cliente.cedula,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, `Clientes_${empresa?.nombre}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Fase 1: lee y analiza el Excel, arma la vista previa. No escribe nada todavía.
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !empresaId) return;

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

      // Cédulas ya existentes para esta empresa, para no crear clientes repetidos al importar.
      const seenCedulas = new Set(
        clientes.map(c => c.cedula?.trim().toLowerCase()).filter(Boolean)
      );

      const preview: PendingImportRow[] = rows.map((row, i) => {
        const rowNum = i + 2;
        const mapped: Record<string, unknown> = {};
        for (const [excelCol, field] of Object.entries(CLIENTE_EXCEL_COLUMN_MAP)) {
          const header = Object.keys(row).find(h => h.trim() === excelCol);
          if (header) mapped[field] = row[header];
        }

        const nombre = String(mapped.nombre || '').trim();
        const celular = String(mapped.celular || '').trim();
        const cargo = String(mapped.cargo || '').trim();
        const cedula = String(mapped.cedula || '').trim();
        const nombreFacturacion = String(mapped.nombreFacturacion || '').trim() || undefined;
        const contacto = String(mapped.contacto || '').trim() || undefined;
        const base = { rowNum, nombre, celular, cargo, cedula, nombreFacturacion, contacto };

        if (!nombre) {
          return { ...base, status: 'invalid' as const, reason: 'Falta el Nombre' };
        }

        const cedulaKey = cedula.toLowerCase();
        if (cedulaKey && seenCedulas.has(cedulaKey)) {
          return { ...base, status: 'duplicate' as const, reason: `Ya existe (cédula ${cedula} repetida en esta empresa)` };
        }
        if (cedulaKey) seenCedulas.add(cedulaKey);

        return { ...base, status: 'ok' as const };
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
    if (!empresaId) return;
    setConfirmingImport(true);
    const errors: string[] = [];
    let imported = 0;

    try {
      for (const row of previewRows) {
        if (row.status !== 'ok') continue;
        try {
          await addCliente({
            empresaId,
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

  if (empresasLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground font-medium">Cargando empresa...</p>
        </div>
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Empresa no encontrada</p>
        <Button variant="link" onClick={() => navigate('/empresas')}>
          Volver a empresas
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden">
      <div className="shrink-0 space-y-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/empresas" onClick={(e) => { e.preventDefault(); navigate('/empresas'); }}>
                Empresas
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{empresa.nombre}</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Clientes</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/empresas')} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Clientes de {empresa.nombre}
              </h2>
              <p className="text-xs text-muted-foreground">
                {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isMarianaOrHector && (
              <>
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
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-8 text-xs">
              <Download className="h-3.5 w-3.5 mr-2" />
              Exportar
            </Button>
            {!isMarianaOrHector && (
              <Button size="sm" onClick={() => setDialogOpen(true)} className="h-8 text-xs">
                <Plus className="h-3.5 w-3.5 mr-2" />
                Nuevo Cliente
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {clientesLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ExcelTable
            data={clientes}
            columns={columns}
            onEdit={!isMarianaOrHector ? handleEdit : undefined}
            onDelete={!isMarianaOrHector ? handleDelete : undefined}
          />
        )}
      </div>

      <ClienteDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        cliente={editingCliente}
        empresaId={empresaId!}
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
        onCancel={handleCancelImport}
        onConfirm={handleConfirmImport}
      />

      <ImportErrorsDialog
        open={importErrorsOpen}
        onOpenChange={setImportErrorsOpen}
        errors={importErrors}
        fileNameHint={`clientes_${empresa.nombre}`}
      />
    </div>
  );
}
