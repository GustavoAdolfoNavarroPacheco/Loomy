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
import { Proyecto, EstadoProyecto } from '@/types';
import { Loader2, Check, ChevronsUpDown, AlertTriangle } from 'lucide-react';
import { isDuplicateValue } from '@/lib/utils';
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface ProyectoDialogProps {
  open: boolean;
  onClose: () => void;
  proyecto: Proyecto | null;
}

export function ProyectoDialog({ open, onClose, proyecto }: ProyectoDialogProps) {
  const { empresas, clientes, categorias, estados, proyectos, addProyecto, updateProyecto } = useData();
  const [formData, setFormData] = useState({
    nombre: '',
    empresaId: '',
    clienteId: '',
    categoriaId: '',
    estado: 'activo' as EstadoProyecto,
    costo: 0,
    valorAproximado: 0,
    porcentajeCierre: 0,
  });

  const opcionesTerceros = useMemo(() => [
    ...empresas.map(e => ({ id: e.id, nombre: e.nombre, doc: e.nit, tipo: "empresa" as const, empresaId: e.id })),
    ...clientes.map(c => ({ id: c.id, nombre: c.nombre, doc: c.cedula, tipo: "cliente" as const, empresaId: c.empresaId }))
  ], [empresas, clientes]);

  const listaEmpresas = opcionesTerceros.filter(t => t.tipo === 'empresa');
  const listaClientes = opcionesTerceros.filter(t => t.tipo === 'cliente');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openEmpresa, setOpenEmpresa] = useState(false);

  const proyectosDeEmpresa = useMemo(
    () => proyectos.filter(p => p.empresaId === formData.empresaId),
    [proyectos, formData.empresaId]
  );
  const nombreDuplicado = useMemo(
    () => isDuplicateValue(proyectosDeEmpresa, p => p.nombre, formData.nombre, proyecto?.id),
    [proyectosDeEmpresa, formData.nombre, proyecto?.id]
  );

  useEffect(() => {
    if (proyecto) {
      setFormData({
        nombre: proyecto.nombre,
        empresaId: proyecto.empresaId,
        clienteId: proyecto.clienteId || '',
        categoriaId: proyecto.categoriaId,
        estado: proyecto.estado,
        costo: proyecto.costo,
        valorAproximado: proyecto.valorAproximado,
        porcentajeCierre: proyecto.porcentajeCierre || 0,
      });
    } else {
      setFormData({
        nombre: '',
        empresaId: '',
        clienteId: '',
        categoriaId: '',
        estado: 'activo',
        costo: 0,
        valorAproximado: 0,
        porcentajeCierre: 0,
      });
    }
  }, [proyecto, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return;
    if (nombreDuplicado) return;

    setIsSubmitting(true);
    try {
      if (proyecto) {
        await updateProyecto(proyecto.id, formData);
      } else {
        await addProyecto({
          ...formData,
          etapaActual: 'START',
          faseActual: 'trazabilidad',
          estadoCotizacion: 'sin_cotizar',
          valorFinal: 0,
          alcances: [],
          facturas: [],
          entrega1: [],
          entrega2: [],
          entrega3: [],
          entregasMap: {},
          proyeccion: {},
          fechasFases: {},
          metadataFases: {},
        });
      }
      onClose();
    } catch (error) {
      console.error('Error saving proyecto:', error);
      alert('Error al guardar el proyecto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {proyecto ? 'Editar Proyecto' : 'Nuevo Proyecto'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                required
                className={nombreDuplicado ? 'border-destructive focus-visible:ring-destructive' : undefined}
              />
              {nombreDuplicado && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Ya existe un proyecto con este nombre para la empresa/cliente seleccionado.
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="empresaId">Empresa o Cliente *</Label>
              <Popover open={openEmpresa} onOpenChange={setOpenEmpresa}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openEmpresa}
                    className="w-full justify-between"
                  >
                    {formData.empresaId
                      ? (formData.clienteId
                        ? clientes.find(c => c.id === formData.clienteId)?.nombre
                        : empresas.find(e => e.id === formData.empresaId)?.nombre)
                      : "Buscar empresa o cliente..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[452px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar por nombre o NIT/CC..." />
                    <CommandList>
                      <CommandEmpty>No se encontró.</CommandEmpty>

                      {listaEmpresas.length > 0 && (
                        <CommandGroup heading="🏢 Empresas">
                          {listaEmpresas.map((t) => (
                            <CommandItem
                              key={t.id}
                              value={t.nombre}
                              onSelect={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  empresaId: t.empresaId,
                                  clienteId: ''
                                }));
                                setOpenEmpresa(false);
                              }}
                            >
                              <div className="flex items-center w-full">
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    (formData.empresaId === t.id && !formData.clienteId) ? "opacity-100" : "opacity-0"
                                  )}
                                />
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

                      {listaClientes.length > 0 && (
                        <CommandGroup heading="👤 Clientes">
                          {listaClientes.map((t) => (
                            <CommandItem
                              key={t.id}
                              value={t.nombre}
                              onSelect={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  empresaId: t.empresaId,
                                  clienteId: t.id
                                }));
                                setOpenEmpresa(false);
                              }}
                            >
                              <div className="flex items-center w-full">
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.clienteId === t.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="categoriaId">Categoría</Label>
                <Select
                  value={formData.categoriaId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, categoriaId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map(categoria => (
                      <SelectItem key={categoria.id} value={categoria.id}>
                        {categoria.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="estado">Estado</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value: EstadoProyecto) => setFormData(prev => ({ ...prev, estado: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                    <SelectItem value="cerrado">Cerrado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                    {estados.filter(e => !['activo', 'pausado', 'cerrado', 'cancelado'].includes(e.nombre.toLowerCase())).map(estado => (
                      <SelectItem key={estado.id} value={estado.nombre.toLowerCase()}>
                        {estado.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="costo">Costo</Label>
                <Input
                  id="costo"
                  type="number"
                  value={formData.costo}
                  onChange={(e) => setFormData(prev => ({ ...prev, costo: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="valorAproximado">Valor Aproximado</Label>
                <Input
                  id="valorAproximado"
                  type="number"
                  value={formData.valorAproximado}
                  onChange={(e) => setFormData(prev => ({ ...prev, valorAproximado: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="porcentajeCierre">% Probabilidad de Cierre</Label>
              <Input
                id="porcentajeCierre"
                type="number"
                min="0"
                max="100"
                value={formData.porcentajeCierre}
                onChange={(e) => setFormData(prev => ({ ...prev, porcentajeCierre: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || nombreDuplicado}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {proyecto ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
