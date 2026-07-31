import { useState } from 'react';
import { Plus, Trash2, Save, Clock, Loader2, ChevronsUpDown, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useData } from '@/contexts/DataContext';
import { Proyecto, FacturaProyecto, RecaudoProyecto } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
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

interface FaseFacturaProps {
  proyecto: Proyecto;
  faseId: string;
}

export function FaseFactura({ proyecto, faseId }: FaseFacturaProps) {
  const { facturas, updateProyecto } = useData();
  const { toast } = useToast();
  const facturasDelProyecto = proyecto.facturas || [];

  // Filtrar facturas globales por la empresa de este proyecto
  const facturasDisponibles = facturas.filter(f => f.empresaId === proyecto.empresaId);

  const [newFactura, setNewFactura] = useState({ fecha: '', valor: 0, numeroFactura: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [openFacturaSearch, setOpenFacturaSearch] = useState(false);

  const initialDate = proyecto.fechasFases?.[faseId]
    ? new Date(proyecto.fechasFases[faseId]).toISOString().split('T')[0]
    : '';
  const [phaseDate, setPhaseDate] = useState(initialDate);

  const handleSavePhase = async () => {
    const dateToSave = phaseDate ? (() => {
      const [y, m, d] = phaseDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    })() : undefined;

    const now = new Date();
    setIsSaving(true);
    try {
      await updateProyecto(proyecto.id, {
        fechasFases: {
          ...proyecto.fechasFases,
          [faseId]: dateToSave as Date
        },
        metadataFases: {
          ...(proyecto.metadataFases || {}),
          [faseId]: {
            ...proyecto.metadataFases?.[faseId],
            lastUpdated: now
          }
        },
        // Sincronizar progreso oficial al guardar la fase
        faseActual: faseId as any,
        etapaActual: 'DEVELOP',
        faseGuardada: faseId as any,
        etapaGuardada: 'DEVELOP'
      });

      toast({
        title: "Fase actualizada",
        description: phaseDate
          ? "La fecha de la fase ha sido guardada correctamente."
          : "La fecha de la fase ha sido eliminada."
      });
    } catch (error) {
      console.error('Error saving phase:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la fase."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getPrefix = (id: string) => {
    if (id === 'factura1') return 'f1';
    if (id === 'factura2') return 'f2';
    if (id === 'factura3') return 'f3';
    return id;
  };

  const phasePrefix = getPrefix(faseId);

  const handleAddFactura = async () => {
    if (!newFactura.fecha || !newFactura.numeroFactura) {
      toast({
        variant: "destructive",
        title: "Campos incompletos",
        description: "Por favor complete la fecha y el número de factura."
      });
      return;
    }

    const [y, m, d] = newFactura.fecha.split('-').map(Number);
    const dateToSave = new Date(y, m - 1, d);

    const factura: FacturaProyecto = {
      id: `${phasePrefix}-${Math.random().toString(36).substr(2, 9)}`,
      fecha: dateToSave,
      valor: newFactura.valor,
      numeroFactura: newFactura.numeroFactura,
    };

    setIsSaving(true);
    try {
      await updateProyecto(proyecto.id, { facturas: [...(proyecto.facturas || []), factura] });
      setNewFactura({ fecha: '', valor: 0, numeroFactura: '' });
      toast({
        title: "Factura agregada",
        description: `La factura ${factura.numeroFactura} ha sido registrada.`
      });
    } catch (error) {
      console.error('Error adding factura:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo agregar la factura."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFactura = async (id: string) => {
    setIsSaving(true);
    try {
      await updateProyecto(proyecto.id, {
        facturas: (proyecto.facturas || []).filter(f => f.id !== id),
      });
      toast({
        title: "Factura eliminada",
        description: "La factura y sus recaudos asociados han sido eliminados."
      });
    } catch (error) {
      console.error('Error deleting factura:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la factura."
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Filter based on the ID prefix containing the phase identifier
  const filteredFacturas = (proyecto.facturas || []).filter(f => f?.id && (f.id.startsWith(`${phasePrefix}-`) || f.id.includes(phasePrefix))); // Loose check for backward compat

  // Determine title based on faseId
  const getTitle = () => {
    const ordenItem = proyecto.fasesOrden?.find(f => f.id === faseId);
    if (ordenItem) return ordenItem.label;

    // Fallback for defaults
    if (faseId === 'factura1') return 'Factura 1';
    if (faseId === 'factura2') return 'Factura 2';
    if (faseId === 'factura3') return 'Factura 3';
    return 'Factura';
  }

  return (
    <div className="space-y-6">
      {/* Tabla Factura */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{getTitle()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/30">
            <div className="grid gap-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={newFactura.fecha || ''}
                onChange={(e) => setNewFactura(prev => ({ ...prev, fecha: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Valor</Label>
              <CurrencyInput
                placeholder="$ 0"
                value={newFactura.valor || 0}
                onChange={(val) => setNewFactura(prev => ({ ...prev, valor: val }))}
              />
            </div>
            <div className="grid gap-2">
              <Label># Factura</Label>
              <Popover open={openFacturaSearch} onOpenChange={setOpenFacturaSearch}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    {newFactura.numeroFactura || "Seleccionar..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar factura..." />
                    <CommandList>
                      <CommandEmpty>No se encontró.</CommandEmpty>
                      <CommandGroup>
                        {facturasDisponibles.length === 0 ? (
                          <div className="py-6 text-center text-sm">No hay facturas para esta empresa</div>
                        ) : (
                          facturasDisponibles.map(f => (
                            <CommandItem
                              key={f.id}
                              value={f.numeroFactura}
                              onSelect={() => {
                                const fechaStr = new Date(f.fecha).toISOString().split('T')[0];
                                setNewFactura(prev => ({
                                  ...prev,
                                  numeroFactura: f.numeroFactura,
                                  valor: f.valorTotal,
                                  fecha: fechaStr
                                }));
                                setOpenFacturaSearch(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  newFactura.numeroFactura === f.numeroFactura ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{f.numeroFactura}</span>
                                <span className="text-xs text-muted-foreground">${(f.valorTotal || 0).toLocaleString('es-CO')}</span>
                              </div>
                            </CommandItem>
                          ))
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddFactura} className="w-full" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Agregar
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead># Factura</TableHead>
                  <TableHead className="w-20">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFacturas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No hay facturas registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFacturas.map(factura => (
                    <TableRow key={factura.id}>
                      <TableCell>{new Date(factura.fecha).toLocaleDateString('es-CO')}</TableCell>
                      <TableCell>${(factura.valor || 0).toLocaleString('es-CO')}</TableCell>
                      <TableCell>{factura.numeroFactura}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDeleteFactura(factura.id)}
                          disabled={isSaving}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cierre de Fase */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="grid gap-2 flex-1">
              <Label>Fecha de Realización de Fase</Label>
              <Input
                type="date"
                value={phaseDate}
                onChange={(e) => setPhaseDate(e.target.value)}
              />
            </div>
            <Button onClick={handleSavePhase} className="flex-1" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Fase
            </Button>
          </div>

          {proyecto.metadataFases?.[faseId]?.lastUpdated && (
            <div className="pt-2 text-xs text-muted-foreground italic flex justify-end items-center gap-1">
              <Clock className="h-3 w-3" />
              Último guardado: {new Date(proyecto.metadataFases[faseId].lastUpdated).toLocaleString('es-CO')}
            </div>
          )}
        </CardContent>
      </Card>
    </div >
  );
}

