import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Clock } from 'lucide-react';
import { FilePreview } from '@/components/shared/FilePreview';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useData } from '@/contexts/DataContext';
import { Proyecto, AlcanceItem } from '@/types';
import { Loader2 } from 'lucide-react';

interface FaseAlcancesProps {
  proyecto: Proyecto;
}

export function FaseAlcances({ proyecto }: FaseAlcancesProps) {
  const { updateProyecto, uploadFile } = useData();
  const { toast } = useToast();
  const [newAlcance, setNewAlcance] = useState({ descripcion: '', costo: 0, pdfArchivo: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [addingAlcance, setAddingAlcance] = useState(false);
  const [isSavingPhase, setIsSavingPhase] = useState(false);

  const initialDate = proyecto.fechasFases?.['alcances']
    ? new Date(proyecto.fechasFases['alcances']).toISOString().split('T')[0]
    : '';
  const [phaseDate, setPhaseDate] = useState(initialDate);

  // Sync state with props when proyecto changes
  useEffect(() => {
    const newDate = proyecto.fechasFases?.['alcances']
      ? new Date(proyecto.fechasFases['alcances']).toISOString().split('T')[0]
      : '';
    setPhaseDate(newDate);
  }, [proyecto.id, proyecto.fechasFases]);

  const handleSavePhase = async () => {
    const dateToSave = phaseDate ? (() => {
      const [y, m, d] = phaseDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    })() : undefined;

    const now = new Date();
    setIsSavingPhase(true);
    try {
      await updateProyecto(proyecto.id, {
        fechasFases: {
          ...proyecto.fechasFases,
          alcances: dateToSave as Date
        },
        metadataFases: {
          ...(proyecto.metadataFases || {}),
          alcances: {
            ...proyecto.metadataFases?.['alcances'],
            lastUpdated: now
          }
        },
        faseActual: 'alcances',
        etapaActual: 'START',
        faseGuardada: 'alcances',
        etapaGuardada: 'START'
      });

      toast({
        title: "Fase actualizada",
        description: phaseDate
          ? "La fase de alcances ha sido marcada como completada."
          : "La fase de alcances ha sido desmarcada."
      });
    } catch (error) {
      console.error('Error saving phase:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la fase de alcances."
      });
    } finally {
      setIsSavingPhase(false);
    }
  };

  const handleAddAlcance = async () => {
    if (!newAlcance.descripcion.trim()) return;

    setAddingAlcance(true);
    try {
      let pdfUrl = '';
      if (selectedFile) {
        const path = `proyectos/${proyecto.id}/alcances/${Date.now()}_${selectedFile.name.replace(/\s+/g, '_')}`;
        pdfUrl = await uploadFile(selectedFile, path);
      }

      const alcance: AlcanceItem = {
        id: Math.random().toString(36).substr(2, 9),
        descripcion: newAlcance.descripcion,
        costo: newAlcance.costo,
        pdfArchivo: pdfUrl || undefined,
      };

      await updateProyecto(proyecto.id, { alcances: [...(proyecto.alcances || []), alcance] });
      setNewAlcance({ descripcion: '', costo: 0, pdfArchivo: '' });
      setSelectedFile(null);
    } catch (error) {
      console.error('Error adding alcance:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo agregar el alcance."
      });
    } finally {
      setAddingAlcance(false);
    }
  };

  const handleDeleteAlcance = (id: string) => {
    updateProyecto(proyecto.id, {
      alcances: (proyecto.alcances || []).filter(a => a.id !== id)
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setNewAlcance(prev => ({ ...prev, pdfArchivo: file.name }));
    }
  };

  const alcances = proyecto.alcances || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alcances del Proyecto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Formulario nuevo alcance */}
        <div className="grid gap-4 p-4 border rounded-lg bg-muted/30">
          <h4 className="font-medium">Agregar Alcance</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Descripción</Label>
              <Input
                placeholder="Descripción del alcance"
                value={newAlcance.descripcion}
                onChange={(e) => setNewAlcance(prev => ({ ...prev, descripcion: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Costo</Label>
              <Input
                type="number"
                placeholder="0"
                value={newAlcance.costo || ''}
                onChange={(e) => setNewAlcance(prev => ({ ...prev, costo: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>PDF (opcional)</Label>
              <Input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
              />
            </div>
          </div>
          <Button onClick={handleAddAlcance} className="w-fit" disabled={addingAlcance}>
            {addingAlcance ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Agregar Alcance
          </Button>
        </div>

        {/* Tabla de alcances */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>PDF</TableHead>
                <TableHead className="w-20">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alcances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No hay alcances registrados
                  </TableCell>
                </TableRow>
              ) : (
                alcances.map(alcance => (
                  <TableRow key={alcance.id}>
                    <TableCell>{alcance.descripcion}</TableCell>
                    <TableCell>${(alcance.costo || 0).toLocaleString('es-CO')}</TableCell>
                    <TableCell>
                      {alcance.pdfArchivo ? (
                        <FilePreview filename={alcance.pdfArchivo} />
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDeleteAlcance(alcance.id)}
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

        {/* Total */}
        {alcances.length > 0 && (
          <div className="text-right font-semibold">
            Total: ${alcances.reduce((sum, a) => sum + (a.costo || 0), 0).toLocaleString('es-CO')}
          </div>
        )}

        <div className="flex items-end gap-4 pt-4 border-t">
          <div className="grid gap-2 flex-1">
            <Label>Fecha de Realización</Label>
            <Input
              type="date"
              value={phaseDate}
              onChange={(e) => setPhaseDate(e.target.value)}
            />
          </div>
          <Button onClick={handleSavePhase} className="flex-1" disabled={isSavingPhase}>
            {isSavingPhase ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar Fase
          </Button>
        </div>

        {proyecto.metadataFases?.['alcances']?.lastUpdated && (
          <div className="pt-2 text-xs text-muted-foreground italic flex justify-end items-center gap-1">
            <Clock className="h-3 w-3" />
            Último guardado: {new Date(proyecto.metadataFases['alcances'].lastUpdated).toLocaleString('es-CO')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
