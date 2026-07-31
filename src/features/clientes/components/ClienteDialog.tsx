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
import { Cliente } from '@/types';
import { Loader2, AlertTriangle } from 'lucide-react';
import { isDuplicateValue } from '@/lib/utils';
import { toast } from 'sonner';

const CELULAR_REGEX = /^[0-9+\-\s()]{7,20}$/;
const CEDULA_REGEX = /^[0-9]{5,15}$/;

interface ClienteDialogProps {
  open: boolean;
  onClose: () => void;
  cliente: Cliente | null;
  /** Si se omite (uso desde el listado global de Clientes), el diálogo pide elegir la empresa. */
  empresaId?: string;
}

export function ClienteDialog({ open, onClose, cliente, empresaId }: ClienteDialogProps) {
  const { clientes, empresas, addCliente, updateCliente, uploadFile } = useData();
  const [selectedEmpresaId, setSelectedEmpresaId] = useState('');
  const effectiveEmpresaId = empresaId || selectedEmpresaId;
  const [formData, setFormData] = useState({
    nombre: '',
    nombreFacturacion: '',
    contacto: '',
    celular: '',
    cargo: '',
    cedula: '',
    rutArchivo: '',
    camaraComercioArchivo: '',
    inscripcionClienteArchivo: '',
  });
  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    rutArchivo: null,
    camaraComercioArchivo: null,
    inscripcionClienteArchivo: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clientesDeEmpresa = useMemo(() => clientes.filter(c => c.empresaId === effectiveEmpresaId), [clientes, effectiveEmpresaId]);
  const cedulaDuplicada = useMemo(
    () => isDuplicateValue(clientesDeEmpresa, c => c.cedula || '', formData.cedula, cliente?.id),
    [clientesDeEmpresa, formData.cedula, cliente?.id]
  );
  const celularInvalido = formData.celular.trim().length > 0 && !CELULAR_REGEX.test(formData.celular.trim());
  const cedulaInvalida = formData.cedula.trim().length > 0 && !CEDULA_REGEX.test(formData.cedula.trim());

  useEffect(() => {
    if (cliente) {
      setFormData({
        nombre: cliente.nombre,
        nombreFacturacion: cliente.nombreFacturacion || '',
        contacto: cliente.contacto || '',
        celular: cliente.celular || '',
        cargo: cliente.cargo || '',
        cedula: cliente.cedula || '',
        rutArchivo: cliente.rutArchivo || '',
        camaraComercioArchivo: cliente.camaraComercioArchivo || '',
        inscripcionClienteArchivo: cliente.inscripcionClienteArchivo || '',
      });
      setSelectedEmpresaId(cliente.empresaId);
    } else {
      setFormData({
        nombre: '',
        nombreFacturacion: '',
        contacto: '',
        celular: '',
        cargo: '',
        cedula: '',
        rutArchivo: '',
        camaraComercioArchivo: '',
        inscripcionClienteArchivo: '',
      });
      setSelectedEmpresaId(empresaId || '');
    }
  }, [cliente, open, empresaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return;
    if (!effectiveEmpresaId) return;
    if (cedulaDuplicada || celularInvalido || cedulaInvalida) return;

    setIsSubmitting(true);
    try {
      const updatedData = { ...formData };

      for (const field of ['rutArchivo', 'camaraComercioArchivo', 'inscripcionClienteArchivo']) {
        const file = files[field];
        if (file) {
          const path = `clientes/${formData.nombre.replace(/\s+/g, '_')}_${Date.now()}_${field}.pdf`;
          const url = await uploadFile(file, path);
          updatedData[field as keyof typeof updatedData] = url;
        }
      }

      if (cliente) {
        await updateCliente(cliente.id, updatedData);
      } else {
        await addCliente({ ...updatedData, empresaId: effectiveEmpresaId });
      }
      onClose();
    } catch (error) {
      console.error('Error saving cliente:', error);
      toast.error('Error al guardar el cliente', { description: 'Por favor intente de nuevo.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFiles(prev => ({ ...prev, [field]: file }));
      setFormData(prev => ({ ...prev, [field]: file.name }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {cliente ? 'Editar Cliente' : 'Nuevo Cliente'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {!empresaId && (
              <div className="grid gap-2">
                <Label htmlFor="empresaSelect">Empresa *</Label>
                {cliente ? (
                  <Input value={empresas.find(e => e.id === cliente.empresaId)?.nombre || ''} disabled />
                ) : (
                  <Select value={selectedEmpresaId} onValueChange={setSelectedEmpresaId}>
                    <SelectTrigger id="empresaSelect">
                      <SelectValue placeholder="Seleccionar empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...empresas].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contacto">Contacto</Label>
                <Input
                  id="contacto"
                  value={formData.contacto}
                  onChange={(e) => setFormData(prev => ({ ...prev, contacto: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nombreFacturacion">Nombre en Facturación / Excel (Opcional)</Label>
              <Input
                id="nombreFacturacion"
                value={formData.nombreFacturacion}
                onChange={(e) => setFormData(prev => ({ ...prev, nombreFacturacion: e.target.value }))}
                placeholder="Por ej: Juan Camilo Vivas Allied (si difiere del nombre real)"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="celular">Celular</Label>
                <Input
                  id="celular"
                  value={formData.celular}
                  onChange={(e) => setFormData(prev => ({ ...prev, celular: e.target.value }))}
                  className={celularInvalido ? 'border-destructive focus-visible:ring-destructive' : undefined}
                />
                {celularInvalido && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Solo números, espacios, "+" o "-" (7 a 20 caracteres).
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cargo">Cargo</Label>
                <Input
                  id="cargo"
                  value={formData.cargo}
                  onChange={(e) => setFormData(prev => ({ ...prev, cargo: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cedula">Cédula</Label>
              <Input
                id="cedula"
                value={formData.cedula}
                onChange={(e) => setFormData(prev => ({ ...prev, cedula: e.target.value }))}
                className={(cedulaDuplicada || cedulaInvalida) ? 'border-destructive focus-visible:ring-destructive' : undefined}
              />
              {cedulaDuplicada && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Ya existe un cliente con esta cédula registrado en esta empresa.
                </p>
              )}
              {!cedulaDuplicada && cedulaInvalida && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Solo números (5 a 15 dígitos).
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>RUT (PDF)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange('rutArchivo')}
                  className="cursor-pointer"
                />
                {formData.rutArchivo && (
                  <span className="text-sm text-muted-foreground truncate max-w-32">
                    {formData.rutArchivo}
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Cámara de Comercio (PDF)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange('camaraComercioArchivo')}
                  className="cursor-pointer"
                />
                {formData.camaraComercioArchivo && (
                  <span className="text-sm text-muted-foreground truncate max-w-32">
                    {formData.camaraComercioArchivo}
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Inscripción del Cliente (PDF)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange('inscripcionClienteArchivo')}
                  className="cursor-pointer"
                />
                {formData.inscripcionClienteArchivo && (
                  <span className="text-sm text-muted-foreground truncate max-w-32">
                    {formData.inscripcionClienteArchivo}
                  </span>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !effectiveEmpresaId || cedulaDuplicada || celularInvalido || cedulaInvalida}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {cliente ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
