import { useState, useEffect, useMemo } from 'react';
import { ChevronsUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Label } from '@/components/ui/label';
import { useData } from '@/contexts/DataContext';
import { Factura } from '@/types';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FacturaDialogProps {
  open: boolean;
  onClose: () => void;
  factura: Factura | null;
}

export function FacturaDialog({ open, onClose, factura }: FacturaDialogProps) {
  const { addFactura, updateFactura, empresas, clientes, comerciales, lineas } = useData();
  const [openSearch, setOpenSearch] = useState(false);

  const opcionesTerceros = useMemo(() => [
    ...empresas.map(e => ({ id: e.id, nombre: e.nombre, doc: e.nit, tipo: "empresa" as const, empresaId: e.id })),
    ...clientes.map(c => ({ id: c.id, nombre: c.nombre, doc: c.cedula, tipo: "cliente" as const, empresaId: c.empresaId }))
  ], [empresas, clientes]);

  const listaEmpresas = opcionesTerceros.filter(t => t.tipo === 'empresa');
  const listaClientes = opcionesTerceros.filter(t => t.tipo === 'cliente');

  const [formData, setFormData] = useState({
    fecha: '',
    comercial: '',
    linea: '',
    nit: '',
    empresaNombre: '',
    descripcion: '',
    cantidad: 1,
    precioUnitario: 0,
    numeroFactura: '',
    empresaId: '',
    clienteId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (factura && open) {
      setFormData({
        fecha: new Date(factura.fecha).toISOString().split('T')[0],
        comercial: factura.comercial,
        linea: factura.linea,
        nit: factura.nit,
        empresaNombre: factura.empresaNombre,
        descripcion: factura.descripcion,
        cantidad: factura.cantidad,
        precioUnitario: factura.precioUnitario,
        numeroFactura: factura.numeroFactura,
        empresaId: factura.empresaId,
        clienteId: factura.clienteId || '',
      });
    } else if (open) {
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        comercial: '',
        linea: '',
        nit: '',
        empresaNombre: '',
        descripcion: '',
        cantidad: 1,
        precioUnitario: 0,
        numeroFactura: '',
        empresaId: '',
        clienteId: '',
      });
    }
  }, [factura, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = {
        ...formData,
        fecha: new Date(formData.fecha),
        valorTotal: formData.cantidad * formData.precioUnitario,
        clienteId: formData.clienteId || undefined
      };
      if (factura) {
        await updateFactura(factura.id, data);
      } else {
        await addFactura(data);
      }
      onClose();
    } catch (error) {
      console.error('Error saving factura:', error);
      toast.error('Error al guardar la factura', { description: 'Por favor intente de nuevo.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const valorTotal = formData.cantidad * formData.precioUnitario;

  const handleSelectTercero = (t: any) => {
    setFormData(p => ({
      ...p,
      empresaId: t.empresaId,
      clienteId: t.tipo === 'cliente' ? t.id : '',
      empresaNombre: t.nombre,
      nit: t.doc
    }));
    setOpenSearch(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden flex flex-col max-h-[95vh]">

        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold">
            {factura ? 'Editar Factura' : 'Nueva Factura'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-2">
          <form id="factura-form" onSubmit={handleSubmit} className="space-y-6">

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha</Label>
                <Input id="fecha" type="date" value={formData.fecha} onChange={(e) => setFormData(p => ({ ...p, fecha: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numeroFactura"># Factura</Label>
                <Input id="numeroFactura" placeholder="001" value={formData.numeroFactura} onChange={(e) => setFormData(p => ({ ...p, numeroFactura: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Empresa o Cliente</Label>

              <Popover open={openSearch} onOpenChange={setOpenSearch} modal={true}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal bg-background">
                    {formData.empresaId
                      ? (formData.clienteId
                        ? clientes.find(c => c.id === formData.clienteId)?.nombre
                        : empresas.find(e => e.id === formData.empresaId)?.nombre)
                      : "Buscar cliente..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Nombre o NIT..." />
                    <CommandList className="max-h-[250px] overflow-y-auto">
                      <CommandEmpty>No hay resultados.</CommandEmpty>

                      {/* GRUPO EMPRESAS */}
                      {listaEmpresas.length > 0 && (
                        <CommandGroup heading="🏢 Empresas">
                          {listaEmpresas.map((t) => (
                            <CommandItem
                              key={t.id}
                              value={t.nombre}
                              onSelect={() => handleSelectTercero(t)}
                            >
                              <div className="flex items-center w-full">
                                <span className="mr-2 text-lg">🏢</span>
                                <div className="flex flex-col">
                                  <span className="font-medium">{t.nombre}</span>
                                  <span className="text-xs text-muted-foreground">NIT: {t.doc}</span>
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      {listaEmpresas.length > 0 && listaClientes.length > 0 && <CommandSeparator />}

                      {/* GRUPO CLIENTES */}
                      {listaClientes.length > 0 && (
                        <CommandGroup heading="👤 Clientes">
                          {listaClientes.map((t) => (
                            <CommandItem
                              key={t.id}
                              value={t.nombre}
                              onSelect={() => handleSelectTercero(t)}
                            >
                              <div className="flex items-center w-full">
                                <span className="mr-2 text-lg">👤</span>
                                <div className="flex flex-col">
                                  <span className="font-medium">{t.nombre}</span>
                                  <span className="text-xs text-muted-foreground">CC: {t.doc}</span>
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Comercial</Label>
                <Select value={formData.comercial} onValueChange={(v) => setFormData(p => ({ ...p, comercial: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {comerciales.map((c) => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="linea">Línea</Label>
                <Select value={formData.linea} onValueChange={(v) => setFormData(p => ({ ...p, linea: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {lineas.map((l) => <SelectItem key={l.id} value={l.nombre}>{l.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input id="descripcion" value={formData.descripcion} onChange={(e) => setFormData(p => ({ ...p, descripcion: e.target.value }))} />
            </div>

            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg border border-dashed">
              <div className="space-y-2">
                <Label>Cant.</Label>
                <Input type="number" value={formData.cantidad} onChange={(e) => setFormData(p => ({ ...p, cantidad: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>Precio Unit.</Label>
                <CurrencyInput value={formData.precioUnitario} onChange={(val) => setFormData(p => ({ ...p, precioUnitario: val }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-primary">Total</Label>
                <div className="h-10 flex items-center font-bold text-lg">
                  ${valorTotal.toLocaleString('es-CO')}
                </div>
              </div>
            </div>
          </form>
        </div>

        <DialogFooter className="p-6 border-t bg-background">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="factura-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {factura ? 'Guardar Cambios' : 'Crear Factura'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}