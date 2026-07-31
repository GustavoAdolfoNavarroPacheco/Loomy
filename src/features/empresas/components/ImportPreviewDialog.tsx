import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { FileSpreadsheet, Loader2, CheckCircle2, CopyX, CircleAlert } from 'lucide-react';

export type ImportRowStatus = 'ok' | 'duplicate' | 'invalid';

export interface ImportPreviewRow {
  rowNum: number;
  nombre: string;
  nit: string;
  sectorNombre: string;
  ciudadNombre: string;
  facturacionAnual: number;
  porcentajeTecnologia: number;
  status: ImportRowStatus;
  reason?: string;
}

interface ImportPreviewDialogProps {
  open: boolean;
  fileName: string;
  rows: ImportPreviewRow[];
  importing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const STATUS_BADGE: Record<ImportRowStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  ok: { label: 'Se creará', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  duplicate: { label: 'Duplicado', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: CopyX },
  invalid: { label: 'Sin nombre', className: 'bg-red-50 text-red-700 border-red-200', icon: CircleAlert },
};

export function ImportPreviewDialog({ open, fileName, rows, importing, onCancel, onConfirm }: ImportPreviewDialogProps) {
  const okCount = rows.filter(r => r.status === 'ok').length;
  const duplicateCount = rows.filter(r => r.status === 'duplicate').length;
  const invalidCount = rows.filter(r => r.status === 'invalid').length;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent className="sm:max-w-[760px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Confirmar importación
          </DialogTitle>
          <DialogDescription>
            {fileName} · {rows.length} fila{rows.length !== 1 ? 's' : ''} encontrada{rows.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {okCount} para importar
          </Badge>
          {duplicateCount > 0 && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1.5">
              <CopyX className="h-3.5 w-3.5" />
              {duplicateCount} duplicado{duplicateCount !== 1 ? 's' : ''} (se omiten)
            </Badge>
          )}
          {invalidCount > 0 && (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1.5">
              <CircleAlert className="h-3.5 w-3.5" />
              {invalidCount} inválida{invalidCount !== 1 ? 's' : ''} (se omiten)
            </Badge>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-12">Fila</TableHead>
                <TableHead>Nombre Comercial</TableHead>
                <TableHead>NIT</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const badge = STATUS_BADGE[row.status];
                const Icon = badge.icon;
                return (
                  <TableRow key={row.rowNum} className={row.status !== 'ok' ? 'opacity-70' : undefined}>
                    <TableCell className="text-muted-foreground tabular-nums">{row.rowNum}</TableCell>
                    <TableCell className="font-medium">{row.nombre || '—'}</TableCell>
                    <TableCell className="tabular-nums">{row.nit || '—'}</TableCell>
                    <TableCell>{row.sectorNombre || '—'}</TableCell>
                    <TableCell>{row.ciudadNombre || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`gap-1 text-[11px] font-semibold ${badge.className}`} title={row.reason}>
                        <Icon className="h-3 w-3" />
                        {badge.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="shrink-0">
          <Button type="button" variant="outline" onClick={onCancel} disabled={importing}>
            Cancelar
          </Button>
          <Button type="button" onClick={onConfirm} disabled={importing || okCount === 0}>
            {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {importing ? 'Importando...' : `Importar ${okCount} empresa${okCount !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
