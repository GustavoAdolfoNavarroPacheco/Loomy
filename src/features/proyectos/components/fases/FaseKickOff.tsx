import { useState, useEffect } from 'react';
import { Save, Upload, Clock } from 'lucide-react';
import { FilePreview } from '@/components/shared/FilePreview';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useData } from '@/contexts/DataContext';
import { Proyecto } from '@/types';
import { Loader2 } from 'lucide-react';

interface FaseKickOffProps {
  proyecto: Proyecto;
}

export function FaseKickOff({ proyecto }: FaseKickOffProps) {
  const { updateProyecto, uploadFile } = useData();
  const { toast } = useToast();
  const [kickoffPdf, setKickoffPdf] = useState(proyecto.kickoffPdf || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const initialDate = proyecto.fechasFases?.['kickoff']
    ? new Date(proyecto.fechasFases['kickoff']).toISOString().split('T')[0]
    : '';
  const [phaseDate, setPhaseDate] = useState(initialDate);

  // Sync state with props when proyecto changes
  useEffect(() => {
    setKickoffPdf(proyecto.kickoffPdf || '');
    const newDate = proyecto.fechasFases?.['kickoff']
      ? new Date(proyecto.fechasFases['kickoff']).toISOString().split('T')[0]
      : '';
    setPhaseDate(newDate);
  }, [proyecto.id, proyecto.kickoffPdf, proyecto.fechasFases]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let finalPdfUrl = kickoffPdf;

      if (selectedFile) {
        const path = `proyectos/${proyecto.id}/kickoff_${Date.now()}.pdf`;
        finalPdfUrl = await uploadFile(selectedFile, path);
      }

      const now = new Date();
      const dateToSave = phaseDate ? (() => {
        const [y, m, d] = phaseDate.split('-').map(Number);
        return new Date(y, m - 1, d);
      })() : undefined;

      await updateProyecto(proyecto.id, {
        kickoffPdf: finalPdfUrl || undefined,
        fechasFases: {
          ...proyecto.fechasFases,
          kickoff: dateToSave as Date
        },
        metadataFases: {
          ...proyecto.metadataFases,
          kickoff: {
            ...proyecto.metadataFases?.['kickoff'],
            lastUpdated: now
          }
        },
        faseActual: 'kickoff',
        etapaActual: 'DEVELOP',
        faseGuardada: 'kickoff',
        etapaGuardada: 'DEVELOP'
      });

      toast({
        title: "Fase actualizada",
        description: phaseDate
          ? "La fase de Kick Off ha sido marcada como completada."
          : "Se ha eliminado la fecha de finalización de Kick Off."
      });
      setKickoffPdf(finalPdfUrl);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error saving kickoff:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la fase de Kick Off."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setKickoffPdf(file.name);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kick Off</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          <Label>Documento de Kick Off (PDF)</Label>
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="max-w-md"
            />
          </div>
          {kickoffPdf && (
            <div className="w-fit">
              <FilePreview filename={kickoffPdf} label="Acta de Kick Off" />
            </div>
          )}
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

        {proyecto.metadataFases?.['kickoff']?.lastUpdated && (
          <div className="pt-2 text-xs text-muted-foreground italic flex justify-end items-center gap-1">
            <Clock className="h-3 w-3" />
            Último guardado: {new Date(proyecto.metadataFases['kickoff'].lastUpdated).toLocaleString('es-CO')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
