import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ImportErrorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errors: string[];
  fileNameHint?: string;
}

export function ImportErrorsDialog({ open, onOpenChange, errors, fileNameHint }: ImportErrorsDialogProps) {
  const handleDownload = () => {
    const blob = new Blob([errors.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `errores_importacion_${fileNameHint || 'archivo'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Filas con advertencias</DialogTitle>
          <DialogDescription>
            {errors.length} fila{errors.length !== 1 ? 's' : ''} no se importaron o generaron un aviso.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto rounded-md border bg-muted/20">
          <ul className="divide-y">
            {errors.map((err, i) => (
              <li key={i} className="px-3 py-2 text-sm">{err}</li>
            ))}
          </ul>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" />
            Descargar como texto
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
