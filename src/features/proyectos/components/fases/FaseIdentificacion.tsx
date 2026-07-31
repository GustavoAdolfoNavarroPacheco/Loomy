import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useData } from '@/contexts/DataContext';
import { Proyecto } from '@/types';
import { Save, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface FaseIdentificacionProps {
  proyecto: Proyecto;
}

export function FaseIdentificacion({ proyecto }: FaseIdentificacionProps) {
  const { updateProyecto } = useData();
  const { toast } = useToast();
  const [identificacion, setIdentificacion] = useState(proyecto.identificacion || '');
  const [isSaving, setIsSaving] = useState(false);

  const initialDate = proyecto.fechasFases?.['identificacion']
    ? new Date(proyecto.fechasFases['identificacion']).toISOString().split('T')[0]
    : '';
  const [phaseDate, setPhaseDate] = useState(initialDate);

  // Sync state with props when proyecto changes
  useEffect(() => {
    setIdentificacion(proyecto.identificacion || '');
    const newDate = proyecto.fechasFases?.['identificacion']
      ? new Date(proyecto.fechasFases['identificacion']).toISOString().split('T')[0]
      : '';
    setPhaseDate(newDate);
  }, [proyecto.id, proyecto.identificacion, proyecto.fechasFases]);

  const handleSave = async () => {
    const now = new Date();
    const dateToSave = phaseDate ? (() => {
      const [y, m, d] = phaseDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    })() : undefined;

    setIsSaving(true);
    try {
      await updateProyecto(proyecto.id, {
        identificacion,
        fechasFases: {
          ...proyecto.fechasFases,
          identificacion: dateToSave as Date
        },
        metadataFases: {
          ...(proyecto.metadataFases || {}),
          identificacion: {
            ...proyecto.metadataFases?.['identificacion'],
            lastUpdated: now
          }
        },
        faseActual: 'identificacion',
        etapaActual: 'START',
        faseGuardada: 'identificacion',
        etapaGuardada: 'START'
      });

      toast({
        title: "Fase actualizada",
        description: phaseDate
          ? "La identificación del proyecto ha sido guardada."
          : "La fecha de identificación ha sido eliminada."
      });
    } catch (error) {
      console.error('Error saving identification:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la identificación."
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Identificación del Proyecto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="identificacion">Descripción del Proyecto</Label>
          <Textarea
            id="identificacion"
            placeholder="Describa el proyecto, sus objetivos y alcance general..."
            value={identificacion}
            onChange={(e) => setIdentificacion(e.target.value)}
            rows={6}
          />
        </div>

        <div className="flex items-end gap-4 pt-4 border-t">
          <div className="grid gap-2 flex-1">
            <Label>Fecha de Realización</Label>
            <Input
              type="date"
              value={phaseDate}
              onChange={(e) => setPhaseDate(e.target.value)}
            />
          </div>
          <Button onClick={handleSave} className="flex-1" disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar Fase
          </Button>
        </div>

        {proyecto.metadataFases?.['identificacion']?.lastUpdated && (
          <div className="pt-2 text-xs text-muted-foreground italic flex justify-end">
            Último guardado: {new Date(proyecto.metadataFases['identificacion'].lastUpdated).toLocaleString('es-CO')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
