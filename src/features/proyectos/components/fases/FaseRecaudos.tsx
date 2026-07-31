import { useState } from 'react';
import { Plus, Trash2, Loader2, Save, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useData } from '@/contexts/DataContext';
import { Proyecto, RecaudoProyecto } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FaseRecaudosProps {
  proyecto: Proyecto;
}

export function FaseRecaudos({ proyecto }: FaseRecaudosProps) {
  const { updateProyecto } = useData();
  const { toast } = useToast();

  const [newRecaudo, setNewRecaudo] = useState({ fecha: '', valor: 0, numeroRecaudo: '', facturaId: '' });
  const [isSaving, setIsSaving] = useState(false);

  const facturasDelProyecto = proyecto.facturas || [];
  const recaudosDelProyecto = proyecto.recaudos || [];

  const handleAddRecaudo = async () => {
    if (!newRecaudo.fecha || !newRecaudo.numeroRecaudo || !newRecaudo.facturaId) {
      toast({
        variant: "destructive",
        title: "Campos incompletos",
        description: "Por favor complete la fecha, el número de recaudo y seleccione una factura."
      });
      return;
    }

    const [y, m, d] = newRecaudo.fecha.split('-').map(Number);
    const dateToSave = new Date(y, m - 1, d);

    const recaudo: RecaudoProyecto = {
      id: `recaudo-${Math.random().toString(36).substr(2, 9)}`,
      facturaId: newRecaudo.facturaId,
      fecha: dateToSave,
      valor: newRecaudo.valor,
      numeroRecaudo: newRecaudo.numeroRecaudo,
    };

    setIsSaving(true);
    try {
      await updateProyecto(proyecto.id, { recaudos: [...recaudosDelProyecto, recaudo] });
      setNewRecaudo({ fecha: '', valor: 0, numeroRecaudo: '', facturaId: '' });
      toast({
        title: "Recaudo agregado",
        description: `El recaudo ${recaudo.numeroRecaudo} ha sido registrado.`
      });
    } catch (error) {
      console.error('Error adding recaudo:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo agregar el recaudo."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecaudo = async (id: string) => {
    setIsSaving(true);
    try {
      await updateProyecto(proyecto.id, {
        recaudos: recaudosDelProyecto.filter(r => r.id !== id)
      });
      toast({
        title: "Recaudo eliminado",
        description: "El recaudo ha sido eliminado."
      });
    } catch (error) {
      console.error('Error deleting recaudo:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el recaudo."
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gestión de Recaudos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/30">
            <div className="grid gap-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={newRecaudo.fecha}
                onChange={(e) => setNewRecaudo(prev => ({ ...prev, fecha: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Valor</Label>
              <CurrencyInput
                placeholder="$ 0"
                value={newRecaudo.valor || 0}
                onChange={(val) => setNewRecaudo(prev => ({ ...prev, valor: val }))}
              />
            </div>
            <div className="grid gap-2">
              <Label># Recaudo</Label>
              <Input
                placeholder="RC-001"
                value={newRecaudo.numeroRecaudo}
                onChange={(e) => setNewRecaudo(prev => ({ ...prev, numeroRecaudo: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Factura Asociada</Label>
              <Select
                value={newRecaudo.facturaId}
                onValueChange={(val) => setNewRecaudo(prev => ({ ...prev, facturaId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar factura" />
                </SelectTrigger>
                <SelectContent>
                  {facturasDelProyecto.length === 0 ? (
                    <SelectItem value="none" disabled>Debe agregar una factura primero</SelectItem>
                  ) : (
                    facturasDelProyecto.map((f, idx) => (
                      <SelectItem key={`${f.id || 'factura'}-${idx}`} value={f.id}>
                        {f.numeroFactura} - ${(f.valor || 0).toLocaleString('es-CO')}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddRecaudo} className="w-full" disabled={isSaving}>
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
                  <TableHead># Recaudo</TableHead>
                  <TableHead>Factura Asociada</TableHead>
                  <TableHead className="w-20">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recaudosDelProyecto.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No hay recaudos registrados en el proyecto
                    </TableCell>
                  </TableRow>
                ) : (
                  recaudosDelProyecto.map((recaudo, idx) => {
                    const factura = facturasDelProyecto.find(f => f.id === recaudo.facturaId);
                    return (
                      <TableRow key={recaudo.id || `recaudo-${idx}`}>
                        <TableCell>{new Date(recaudo.fecha).toLocaleDateString('es-CO')}</TableCell>
                        <TableCell>${(recaudo.valor || 0).toLocaleString('es-CO')}</TableCell>
                        <TableCell>{recaudo.numeroRecaudo}</TableCell>
                        <TableCell>{factura ? factura.numeroFactura : 'Desconocida'}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDeleteRecaudo(recaudo.id)}
                            disabled={isSaving}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
              <Label>Fecha de Conciliación de Recaudos</Label>
              <Input
                type="date"
                value={(() => {
                  const date = proyecto.fechasFases?.['recaudos'];
                  if (!date) return '';
                  return new Date(date).toISOString().split('T')[0];
                })()}
                onChange={async (e) => {
                  const dateToSave = e.target.value ? (() => {
                    const [y, m, d] = e.target.value.split('-').map(Number);
                    return new Date(y, m - 1, d);
                  })() : undefined;

                  await updateProyecto(proyecto.id, {
                    fechasFases: {
                      ...proyecto.fechasFases,
                      recaudos: dateToSave as Date
                    }
                  });
                }}
              />
            </div>
            <Button 
               className="flex-1" 
               disabled={isSaving}
               onClick={async () => {
                  setIsSaving(true);
                  try {
                    await updateProyecto(proyecto.id, {
                        faseActual: 'recaudos',
                        etapaActual: 'DEVELOP',
                        faseGuardada: 'recaudos',
                        etapaGuardada: 'DEVELOP',
                        metadataFases: {
                            ...proyecto.metadataFases,
                            recaudos: {
                                ...proyecto.metadataFases?.['recaudos'],
                                lastUpdated: new Date()
                            }
                        }
                    });
                    toast({
                        title: "Fase actualizada",
                        description: "La fase de recaudos ha sido actualizada como fase oficial."
                    });
                  } catch (e) {
                      console.error(e);
                  } finally {
                      setIsSaving(false);
                  }
               }}
            >
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Fase
            </Button>
          </div>
          {proyecto.metadataFases?.['recaudos']?.lastUpdated && (
            <div className="pt-2 text-xs text-muted-foreground italic flex justify-end items-center gap-1">
               <Clock className="h-3 w-3" />
               Último guardado: {new Date(proyecto.metadataFases['recaudos'].lastUpdated).toLocaleString('es-CO')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
