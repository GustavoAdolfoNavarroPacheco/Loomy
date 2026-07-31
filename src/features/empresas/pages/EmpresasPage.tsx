import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Upload, Loader2, Building2, Hash, User, MapPin, Tag, CopyX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExcelTable } from '@/components/shared/ExcelTable';
import { EmpresaDialog } from '@/features/empresas/components/EmpresaDialog';
import { ImportPreviewDialog, ImportPreviewRow } from '@/features/empresas/components/ImportPreviewDialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ImportErrorsDialog } from '@/components/shared/ImportErrorsDialog';
import { useData } from '@/contexts/DataContext';
import { useUndoableDelete } from '@/hooks/useUndoableDelete';
import { Empresa, ColumnConfig } from '@/types';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { FilePreview } from '@/components/shared/FilePreview';
import { useAuth } from '@/contexts/AuthContext';
import { findDuplicateIds } from '@/lib/utils';
import { addItem } from '@/services/dataService';

const EMPRESA_EXCEL_COLUMN_MAP: Record<string, keyof Pick<Empresa, 'nombre' | 'razonSocial' | 'nit' | 'facturacionAnual' | 'porcentajeTecnologia'>> = {
  'Nombre Comercial': 'nombre',
  'Razón Social': 'razonSocial',
  'Razon Social': 'razonSocial',
  'NIT': 'nit',
  'Facturacion Anual Aprox.': 'facturacionAnual',
  'Facturación Anual Aprox.': 'facturacionAnual',
  '% Tecnologia': 'porcentajeTecnologia',
  '% Tecnología': 'porcentajeTecnologia',
};

type PendingImportRow = ImportPreviewRow & { razonSocial: string };

export default function EmpresasPage() {
  const navigate = useNavigate();
  const { empresas, empresasLoading, sectores, ciudades, environment, addEmpresa, deleteEmpresa } = useData();
  const { isMarianaOrHector } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Empresa | null>(null);
  const [showOnlyDuplicates, setShowOnlyDuplicates] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);
  const [confirmingImport, setConfirmingImport] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFileName, setPreviewFileName] = useState('');
  const [previewRows, setPreviewRows] = useState<PendingImportRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importErrorsOpen, setImportErrorsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { pendingIds, scheduleDelete } = useUndoableDelete(deleteEmpresa);
  const getSectorNombre = (sectorId: string) => {
    return sectores.find(s => s.id === sectorId)?.nombre || '-';
  };

  const getCiudadNombre = (ciudadId: string) => {
    return ciudades.find(c => c.id === ciudadId)?.nombre || '-';
  };

  // Detecta empresas repetidas (mismo NIT, o mismo nombre si el NIT está vacío) para facilitar su limpieza.
  const duplicateIds = useMemo(
    () => findDuplicateIds(empresas, e => e.nit?.trim() || e.nombre),
    [empresas]
  );
  const visibleEmpresas = useMemo(() => empresas.filter(e => !pendingIds.has(e.id)), [empresas, pendingIds]);
  const displayedEmpresas = showOnlyDuplicates ? visibleEmpresas.filter(e => duplicateIds.has(e.id)) : visibleEmpresas;

  const columns: ColumnConfig<Empresa>[] = [
    {
      key: 'nombre',
      header: (
        <span className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 opacity-70" />
          Nombre Comercial
        </span>
      ),
      headerLabel: 'Nombre Comercial',
    },
    {
      key: 'razonSocial',
      header: (
        <span className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 opacity-70" />
          Razón Social
        </span>
      ),
      headerLabel: 'Razón Social',
      render: (value, row) => value || row.nombre
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
    },
    {
      key: 'sector',
      header: (
        <span className="flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 opacity-70" />
          Sector
        </span>
      ),
      headerLabel: 'Sector',
      render: (value) => getSectorNombre(value),
    },
    {
      key: 'ciudad',
      header: (
        <span className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 opacity-70" />
          Ciudad
        </span>
      ),
      headerLabel: 'Ciudad',
      render: (value) => getCiudadNombre(value),
    },
    {
      key: 'facturacionAnual',
      header: 'Fact. Anual Aprox.',
      render: (value) => value ? `$ ${Number(value).toLocaleString('es-CO')}` : '-',
      type: 'number'
    },
    {
      key: 'porcentajeTecnologia',
      header: '% Tecnología',
      render: (value) => value !== undefined ? `${value}%` : '-',
      type: 'number'
    },
    {
      key: 'requerimientoArchivo',
      header: 'Requerimiento',
      render: (value) => value ? (
        <div onClick={(e) => e.stopPropagation()}>
          <FilePreview filename={value} label="Ver Archivo" compact />
        </div>
      ) : '-',
    },
  ];

  const handleRowClick = (empresa: Empresa) => {
    navigate(`/empresas/${empresa.id}/clientes`);
  };

  const handleEdit = (empresa: Empresa) => {
    setEditingEmpresa(empresa);
    setDialogOpen(true);
  };

  const handleDelete = (empresa: Empresa) => {
    setDeleteTarget(empresa);
  };

  const confirmDelete = () => {
    if (deleteTarget) scheduleDelete(deleteTarget.id, deleteTarget.nombre);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingEmpresa(null);
  };

  const handleExportExcel = () => {
    const dataToExport = empresas.map(empresa => ({
      'Nombre Comercial': empresa.nombre,
      'Razón Social': empresa.razonSocial || empresa.nombre,
      'NIT': empresa.nit,
      'Sector': getSectorNombre(empresa.sector),
      'Ciudad': getCiudadNombre(empresa.ciudad),
      'Facturacion Anual Aprox.': empresa.facturacionAnual || 0,
      '% Tecnologia': empresa.porcentajeTecnologia || 0,
      'Archivo Requerimiento': empresa.requerimientoArchivo || '',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Empresas");
    XLSX.writeFile(wb, `Empresas_${new Date().toISOString().split('T')[0]}.xlsx`);
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

      const parseNumber = (raw: unknown) =>
        typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(/[^0-9.-]/g, '')) || 0;

      // Claves ya existentes (NIT, o nombre si el NIT está vacío) para no crear empresas repetidas al importar.
      const seenKeys = new Set(
        empresas.map(emp => (emp.nit?.trim() || emp.nombre || '').trim().toLowerCase()).filter(Boolean)
      );

      const preview: PendingImportRow[] = rows.map((row, i) => {
        const rowNum = i + 2;
        const mapped: Record<string, unknown> = {};
        for (const [excelCol, field] of Object.entries(EMPRESA_EXCEL_COLUMN_MAP)) {
          const header = Object.keys(row).find(h => h.trim() === excelCol);
          if (header) mapped[field] = row[header];
        }

        const nombre = String(mapped.nombre || '').trim();
        const nit = String(mapped.nit || '').trim();
        const sectorNombre = String(row['Sector'] ?? '').trim();
        const ciudadNombre = String(row['Ciudad'] ?? '').trim();
        const razonSocial = String(mapped.razonSocial || nombre).trim();
        const facturacionAnual = parseNumber(mapped.facturacionAnual);
        const porcentajeTecnologia = parseNumber(mapped.porcentajeTecnologia);
        const base = { rowNum, nombre, nit, sectorNombre, ciudadNombre, facturacionAnual, porcentajeTecnologia, razonSocial };

        if (!nombre) {
          return { ...base, status: 'invalid' as const, reason: 'Falta el Nombre Comercial' };
        }

        const dedupeKey = (nit || nombre).toLowerCase();
        if (dedupeKey && seenKeys.has(dedupeKey)) {
          return { ...base, status: 'duplicate' as const, reason: `Ya existe (${nit ? `NIT ${nit}` : 'mismo nombre'})` };
        }
        if (dedupeKey) seenKeys.add(dedupeKey);

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
    setConfirmingImport(true);
    const errors: string[] = [];
    let imported = 0;
    const prefix = environment === 'international' ? 'int_' : '';

    // Caches locales de nombre -> id para no crear duplicados de catálogo dentro del mismo import
    const sectorMap = new Map(sectores.map(s => [s.nombre.trim().toLowerCase(), s.id]));
    const ciudadMap = new Map(ciudades.map(c => [c.nombre.trim().toLowerCase(), c.id]));

    const resolveCatalogId = async (collectionSuffix: 'sectores' | 'ciudades', map: Map<string, string>, nombre: string) => {
      const key = nombre.trim().toLowerCase();
      if (!key) return '';
      const existing = map.get(key);
      if (existing) return existing;
      const ref = await addItem(`${prefix}${collectionSuffix}`, { nombre: nombre.trim() });
      map.set(key, ref.id);
      return ref.id;
    };

    try {
      for (const row of previewRows) {
        if (row.status !== 'ok') continue;
        try {
          const sectorId = row.sectorNombre ? await resolveCatalogId('sectores', sectorMap, row.sectorNombre) : '';
          const ciudadId = row.ciudadNombre ? await resolveCatalogId('ciudades', ciudadMap, row.ciudadNombre) : '';

          await addEmpresa({
            nombre: row.nombre,
            razonSocial: row.razonSocial,
            nit: row.nit,
            sector: sectorId,
            ciudad: ciudadId,
            facturacionAnual: row.facturacionAnual,
            porcentajeTecnologia: row.porcentajeTecnologia,
          });
          imported++;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Error desconocido';
          errors.push(`Fila ${row.rowNum}: Error inesperado — ${message}`);
        }
      }

      if (imported > 0) {
        toast.success('Importación completada', { description: `${imported} empresas importadas exitosamente.` });
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
          <p className="text-sm text-muted-foreground font-medium">Cargando empresas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Empresas</h2>
          <p className="text-muted-foreground text-sm">
            Gestione las empresas y haga clic en una fila para ver sus clientes
          </p>
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
              >
                {parsingFile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                {parsingFile ? 'Leyendo...' : 'Importar Excel'}
              </Button>
            </>
          )}
          {duplicateIds.size > 0 && (
            <Button
              variant={showOnlyDuplicates ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowOnlyDuplicates(v => !v)}
              className="gap-2"
            >
              <CopyX className="h-4 w-4" />
              {showOnlyDuplicates ? 'Ver Todas' : `Duplicados (${duplicateIds.size})`}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
          {!isMarianaOrHector && (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Empresa
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ExcelTable
          data={displayedEmpresas}
          columns={columns}
          onRowClick={handleRowClick}
          onEdit={!isMarianaOrHector ? handleEdit : undefined}
          onDelete={!isMarianaOrHector ? handleDelete : undefined}
          getRowIndicatorColor={(row) => duplicateIds.has(row.id) ? 'bg-red-500' : ''}
        />
      </div>

      <EmpresaDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        empresa={editingEmpresa}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Eliminar empresa"
        description={`¿Está seguro de eliminar la empresa "${deleteTarget?.nombre}"? Podrá deshacerlo desde la notificación durante unos segundos.`}
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
        fileNameHint="empresas"
      />
    </div>
  );
}
