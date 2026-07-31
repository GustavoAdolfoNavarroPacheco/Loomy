import { useState, useEffect } from 'react';
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
import { useData } from '@/contexts/DataContext';
import { Recaudo } from '@/types';
import { Loader2, Calendar, User, Hash, Building2, Wallet, DollarSign, FileText } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RecaudoDialogProps {
  open: boolean;
  onClose: () => void;
  recaudo: Recaudo | null;
}

export function RecaudoDialog({ open, onClose, recaudo }: RecaudoDialogProps) {
  const { addRecaudo, updateRecaudo, comerciales, lineas, empresas } = useData();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Omit<Recaudo, 'id' | 'createdAt'>>({
    fecha: new Date(),
    comercial: '',
    linea: '',
    empresaNombre: '',
    nit: '',
    numeroFactura: '',
    numeroRecaudo: '',
    valor: 0,
    metodoPago: 'Transferencia',
    comentario: ''
  });

  useEffect(() => {
    if (recaudo) {
      setFormData({
        fecha: new Date(recaudo.fecha),
        comercial: recaudo.comercial || '',
        linea: recaudo.linea || '',
        empresaNombre: recaudo.empresaNombre || '',
        nit: recaudo.nit || '',
        numeroFactura: recaudo.numeroFactura || '',
        numeroRecaudo: recaudo.numeroRecaudo || '',
        valor: recaudo.valor || 0,
        metodoPago: recaudo.metodoPago || 'Transferencia',
        comentario: recaudo.comentario || ''
      });
    } else {
      setFormData({
        fecha: new Date(),
        comercial: '',
        linea: '',
        empresaNombre: '',
        nit: '',
        numeroFactura: '',
        numeroRecaudo: '',
        valor: 0,
        metodoPago: 'Transferencia',
        comentario: ''
      });
    }
  }, [recaudo, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (recaudo) {
        await updateRecaudo(recaudo.id, formData);
      } else {
        await addRecaudo(formData);
      }
      onClose();
    } catch (error) {
      console.error('Error saving recaudo:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmpresaChange = (nombre: string) => {
    const empresa = empresas.find(e => e.nombre === nombre);
    setFormData(prev => ({
      ...prev,
      empresaNombre: nombre,
      nit: empresa?.nit || prev.nit
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recaudo ? 'Editar Recaudo' : 'Nuevo Recaudo'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha" className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 opacity-70" />
                Fecha de Recaudo
              </Label>
              <Input
                id="fecha"
                type="date"
                required
                value={formData.fecha instanceof Date ? formData.fecha.toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, fecha: new Date(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comercial" className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 opacity-70" />
                Comercial
              </Label>
              <Select 
                value={formData.comercial} 
                onValueChange={(val) => setFormData({ ...formData, comercial: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar comercial" />
                </SelectTrigger>
                <SelectContent>
                  {comerciales.map(c => (
                    <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linea" className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 opacity-70" />
                Línea
              </Label>
              <Select 
                value={formData.linea} 
                onValueChange={(val) => setFormData({ ...formData, linea: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar línea" />
                </SelectTrigger>
                <SelectContent>
                  {lineas.map(l => (
                    <SelectItem key={l.id} value={l.nombre}>{l.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="empresa" className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 opacity-70" />
                Empresa
              </Label>
              <Select 
                value={formData.empresaNombre} 
                onValueChange={handleEmpresaChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map(e => (
                    <SelectItem key={e.id} value={e.nombre}>{e.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numeroFactura" className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 opacity-70" />
                # Factura
              </Label>
              <Input
                id="numeroFactura"
                placeholder="F-001"
                required
                value={formData.numeroFactura}
                onChange={(e) => setFormData({ ...formData, numeroFactura: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numeroRecaudo" className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 opacity-70" />
                # Recaudo
              </Label>
              <Input
                id="numeroRecaudo"
                placeholder="R-001"
                required
                value={formData.numeroRecaudo}
                onChange={(e) => setFormData({ ...formData, numeroRecaudo: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor" className="flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 opacity-70" />
                Valor Recaudado
              </Label>
              <Input
                id="valor"
                type="number"
                placeholder="0"
                required
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) })}
              />
            </div>

          </div>


          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {recaudo ? 'Actualizar' : 'Crear'} Recaudo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
