import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Empresa } from '@/types';
import { Loader2, AlertTriangle, X } from 'lucide-react';
import { isDuplicateValue } from '@/lib/utils';
import { toast } from 'sonner';

interface EmpresaDialogProps {
  open: boolean;
  onClose: () => void;
  empresa: Empresa | null;
}

export function EmpresaDialog({ open, onClose, empresa }: EmpresaDialogProps) {
  const { empresas, sectores, ciudades, addEmpresa, updateEmpresa, uploadFile } = useData();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: '',
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nitDuplicado = useMemo(
    () => isDuplicateValue(empresas, e => e.nit || '', formData.nit, empresa?.id),
    [empresas, formData.nit, empresa?.id]
  );
  const nombreExistente = useMemo(() => {
    const normalized = formData.nombre.trim().toLowerCase();
    if (!normalized) return undefined;
    return empresas.find(e => e.id !== empresa?.id && (e.nombre || '').trim().toLowerCase() === normalized);
  }, [empresas, formData.nombre, empresa?.id]);

  useEffect(() => {
    if (empresa) {
      setFormData({
        nombre: empresa.nombre,
        razonSocial: empresa.razonSocial || empresa.nombre,
        nit: empresa.nit || '',
        sector: empresa.sector,
        ciudad: empresa.ciudad,
        facturacionAnual: empresa.facturacionAnual || 0,
        porcentajeTecnologia: empresa.porcentajeTecnologia || 0,
        requerimientoArchivo: empresa.requerimientoArchivo || '',
      });
    } else {
      setFormData({
        nombre: '',
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
    if (!formData.nombre.trim() || !formData.razonSocial.trim()) return;
    if (nitDuplicado) return;

    setIsSubmitting(true);
    try {
      const updatedData = { ...formData };

      if (file) {
        const path = `empresas/${formData.nombre.replace(/\s+/g, '_')}_${Date.now()}_requerimiento.pdf`;
        const url = await uploadFile(file, path);
        updatedData.requerimientoArchivo = url;
      }

      if (empresa) {
        await updateEmpresa(empresa.id, updatedData);
      } else {
        await addEmpresa(updatedData);
      }
      onClose();
    } catch (error) {
      console.error('Error saving empresa:', error);
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
            {empresa ? 'Editar Empresa' : 'Nueva Empresa'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre Comercial *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => {
                    const shouldAutoFill = !prev.razonSocial || prev.razonSocial === prev.nombre;
                    return {
                      ...prev,
                      nombre: val,
                      razonSocial: shouldAutoFill ? val : prev.razonSocial
                    };
                  });
                }}
                required
              />
              {nombreExistente && (
                <p className="text-xs text-amber-600 flex items-center gap-1 flex-wrap">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  Ya existe una empresa con un nombre igual o muy similar.
                  <button
                    type="button"
                    className="underline font-medium hover:text-amber-700"
                    onClick={() => { onClose(); navigate(`/empresas/${nombreExistente.id}/clientes`); }}
                  >
                    Ver empresa existente
                  </button>
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="razonSocial">Razón Social (Facturación) *</Label>
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
                  ref={fileInputRef}
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
                  <>
                    <span className="text-sm text-muted-foreground truncate max-w-[160px]">
                      {formData.requerimientoArchivo.split('/').pop()}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      title="Quitar archivo"
                      onClick={() => {
                        setFile(null);
                        setFormData(prev => ({ ...prev, requerimientoArchivo: '' }));
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
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
