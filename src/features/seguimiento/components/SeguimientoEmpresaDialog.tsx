import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { SeguimientoEmpresa } from '@/types/seguimiento';
import { Loader2, AlertTriangle } from 'lucide-react';
import { isDuplicateValue } from '@/lib/utils';
import { toast } from 'sonner';

interface SeguimientoEmpresaDialogProps {
  open: boolean;
  onClose: () => void;
  empresa: SeguimientoEmpresa | null;
}

export function SeguimientoEmpresaDialog({ open, onClose, empresa }: SeguimientoEmpresaDialogProps) {
  const { seguimientoEmpresas, sectores, ciudades, addSeguimientoEmpresa, updateSeguimientoEmpresa, uploadFile } = useData();
  const [formData, setFormData] = useState({
    nombreComercial: '',
    razonSocial: '',
    nit: '',
    sector: '',
    ciudad: '',
    facturacionAnual: 0,
    porcentajeTecnologia: 0,
    requerimientoArchivo: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nitDuplicado = useMemo(
    () => isDuplicateValue(seguimientoEmpresas, e => e.nit || '', formData.nit, empresa?.id),
    [seguimientoEmpresas, formData.nit, empresa?.id]
  );
  const nombreDuplicado = useMemo(
    () => isDuplicateValue(seguimientoEmpresas, e => e.nombreComercial, formData.nombreComercial, empresa?.id),
    [seguimientoEmpresas, formData.nombreComercial, empresa?.id]
  );

  useEffect(() => {
    if (empresa) {
      setFormData({
        nombreComercial: empresa.nombreComercial,
        razonSocial: empresa.razonSocial || empresa.nombreComercial,
        nit: empresa.nit || '',
        sector: empresa.sector,
        ciudad: empresa.ciudad,
        facturacionAnual: empresa.facturacionAnual || 0,
        porcentajeTecnologia: empresa.porcentajeTecnologia || 0,
        requerimientoArchivo: empresa.requerimientoArchivo || '',
      });
    } else {
      setFormData({
        nombreComercial: '',
        razonSocial: '',
        nit: '',
        sector: '',
        ciudad: '',
        facturacionAnual: 0,
        porcentajeTecnologia: 0,
        requerimientoArchivo: '',
      });
      setFile(null);
    }
  }, [empresa, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombreComercial.trim() || !formData.razonSocial.trim()) return;
    if (nitDuplicado) return;

    setIsSubmitting(true);
    try {
      const updatedData = { ...formData };

      if (file) {
        const path = `seguimiento/${formData.nombreComercial.replace(/\s+/g, '_')}_${Date.now()}_requerimiento.pdf`;
        const url = await uploadFile(file, path);
        updatedData.requerimientoArchivo = url;
      }

      if (empresa) {
        await updateSeguimientoEmpresa(empresa.id, updatedData);
      } else {
        await addSeguimientoEmpresa(updatedData);
      }
      onClose();
    } catch (error) {
      console.error('Error saving empresa de seguimiento:', error);
      toast.error('Error al guardar la empresa', { description: 'Por favor intente de nuevo.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {empresa ? 'Editar Empresa' : 'Nueva Empresa en Seguimiento'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombreComercial">Nombre Comercial *</Label>
              <Input
                id="nombreComercial"
                value={formData.nombreComercial}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => {
                    const shouldAutoFill = !prev.razonSocial || prev.razonSocial === prev.nombreComercial;
                    return {
                      ...prev,
                      nombreComercial: val,
                      razonSocial: shouldAutoFill ? val : prev.razonSocial
                    };
                  });
                }}
                required
              />
              {nombreDuplicado && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Ya existe una empresa con un nombre igual o muy similar. Verifique antes de continuar.
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="razonSocial">Razón Social *</Label>
              <Input
                id="razonSocial"
                value={formData.razonSocial}
                onChange={(e) => setFormData(prev => ({ ...prev, razonSocial: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nit">NIT</Label>
              <Input
                id="nit"
                value={formData.nit}
                onChange={(e) => setFormData(prev => ({ ...prev, nit: e.target.value }))}
                className={nitDuplicado ? 'border-destructive focus-visible:ring-destructive' : undefined}
              />
              {nitDuplicado && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Ya existe una empresa registrada con este NIT.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sector">Sector</Label>
                <Select
                  value={formData.sector}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, sector: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectores.map(sector => (
                      <SelectItem key={sector.id} value={sector.id}>
                        {sector.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ciudad">Ciudad</Label>
                <Select
                  value={formData.ciudad}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, ciudad: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar ciudad" />
                  </SelectTrigger>
                  <SelectContent>
                    {ciudades.map(ciudad => (
                      <SelectItem key={ciudad.id} value={ciudad.id}>
                        {ciudad.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="facturacionAnual">Facturación Anual Aprox.</Label>
                <Input
                  id="facturacionAnual"
                  type="number"
                  value={formData.facturacionAnual}
                  onChange={(e) => setFormData(prev => ({ ...prev, facturacionAnual: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="porcentajeTecnologia">% Tecnología</Label>
                <Input
                  id="porcentajeTecnologia"
                  type="number"
                  value={formData.porcentajeTecnologia}
                  onChange={(e) => setFormData(prev => ({ ...prev, porcentajeTecnologia: Number(e.target.value) }))}
                  placeholder="0"
                  max="100"
                  min="0"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="requerimientoArchivo">Requerimiento (PDF)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="requerimientoArchivo"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setFile(f);
                      setFormData(prev => ({ ...prev, requerimientoArchivo: f.name }));
                    }
                  }}
                  className="cursor-pointer"
                />
                {formData.requerimientoArchivo && (
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {formData.requerimientoArchivo.split('/').pop()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || nitDuplicado}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {empresa ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
