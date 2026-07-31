import { useState, useEffect } from 'react';
import { Save, Clock, Trash2, FileText, CheckCircle2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useData } from '@/contexts/DataContext';
import { Proyecto, PropuestaData } from '@/types';
import { Loader2 } from 'lucide-react';

interface FasePropuestaProps {
  proyecto: Proyecto;
}

export function FasePropuesta({ proyecto }: FasePropuestaProps) {
  const { updateProyecto, uploadFile } = useData();
  const { toast } = useToast();

  const [pdfArchivos, setPdfArchivos] = useState<string[]>(
    proyecto.propuesta?.pdfArchivos ||
    (proyecto.propuesta?.pdfArchivo ? [proyecto.propuesta.pdfArchivo] : [])
  );
  const [costoAproximado, setCostoAproximado] = useState(proyecto.propuesta?.costoAproximado || 0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [comercialArchivos, setComercialArchivos] = useState<string[]>(proyecto.propuesta?.archivosComercial || []);
  const [selectedComercialFiles, setSelectedComercialFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const initialDate = proyecto.fechasFases?.['propuesta']
    ? new Date(proyecto.fechasFases['propuesta']).toISOString().split('T')[0]
    : '';
  const [phaseDate, setPhaseDate] = useState(initialDate);

  useEffect(() => {
    setPdfArchivos(
      proyecto.propuesta?.pdfArchivos ||
      (proyecto.propuesta?.pdfArchivo ? [proyecto.propuesta.pdfArchivo] : [])
    );
    setComercialArchivos(proyecto.propuesta?.archivosComercial || []);
    setCostoAproximado(proyecto.propuesta?.costoAproximado || 0);
    const newDate = proyecto.fechasFases?.['propuesta']
      ? new Date(proyecto.fechasFases['propuesta']).toISOString().split('T')[0]
      : '';
    setPhaseDate(newDate);
  }, [proyecto.id, proyecto.propuesta, proyecto.fechasFases]);

  const cleanFileName = (path: string) => {
    try {
      const decodedPath = decodeURIComponent(path);
      const fileName = decodedPath.split('/').pop()?.split('?')[0] || 'Archivo';
      return fileName.replace(/^(propuesta|comercial)_\d+_/, '');
    } catch (error) {
      return path.split('/').pop()?.split('?')[0] || 'Archivo';
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let updatedPdfArchivos = [...pdfArchivos];
      let updatedComercialArchivos = [...comercialArchivos];

      if (selectedFiles.length > 0) {
        const uploadedUrls = await Promise.all(selectedFiles.map(async (file) => {
          const path = `proyectos/${proyecto.id}/propuesta_${Date.now()}_${file.name}`;
          return await uploadFile(file, path);
        }));
        updatedPdfArchivos = [...updatedPdfArchivos, ...uploadedUrls];
      }

      if (selectedComercialFiles.length > 0) {
        const uploadedUrls = await Promise.all(selectedComercialFiles.map(async (file) => {
          const path = `proyectos/${proyecto.id}/comercial_${Date.now()}_${file.name}`;
          return await uploadFile(file, path);
        }));
        updatedComercialArchivos = [...updatedComercialArchivos, ...uploadedUrls];
      }

      const propuesta: PropuestaData = {
        tipo: 'tecnica',
        pdfArchivos: updatedPdfArchivos,
        pdfArchivo: updatedPdfArchivos[0] || undefined,
        archivosComercial: updatedComercialArchivos,
        costoAproximado: costoAproximado,
      };

      const now = new Date();
      const dateToSave = phaseDate ? (() => {
        const [y, m, d] = phaseDate.split('-').map(Number);
        return new Date(y, m - 1, d);
      })() : undefined;

      await updateProyecto(proyecto.id, {
        propuesta,
        valorAproximado: costoAproximado,
        fechasFases: {
          ...proyecto.fechasFases,
          propuesta: dateToSave as Date
        },
        metadataFases: {
          ...proyecto.metadataFases,
          propuesta: {
            ...proyecto.metadataFases?.['propuesta'],
            lastUpdated: now
          }
        },
        faseActual: 'propuesta',
        etapaActual: 'START',
        faseGuardada: 'propuesta',
        etapaGuardada: 'START'
      });

      toast({
        title: "Fase actualizada",
        description: phaseDate
          ? "La propuesta ha sido guardada."
          : "La fecha de la propuesta ha sido eliminada."
      });

      setSelectedFiles([]);
      setSelectedComercialFiles([]);

      setPdfArchivos(updatedPdfArchivos);
      setComercialArchivos(updatedComercialArchivos);
    } catch (error) {
      console.error('Error saving propuesta:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la propuesta."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
      e.target.value = '';
    }
  };

  const handleComercialFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedComercialFiles(prev => [...prev, ...newFiles]);
      e.target.value = '';
    }
  };

  const handleRemoveSavedFile = (index: number) => {
    setPdfArchivos(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveSavedComercialFile = (index: number) => {
    setComercialArchivos(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveSelectedComercialFile = (index: number) => {
    setSelectedComercialFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Propuesta</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4 border p-4 rounded-lg">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Propuesta Técnica
            </h3>
            <div className="grid gap-2">
              <Label>Documentos (PDF)</Label>
              <Input
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileChange}
              />

              {(pdfArchivos.length > 0 || selectedFiles.length > 0) && (
                <div className="border rounded-md mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Archivo</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pdfArchivos.map((archivo, index) => (
                        <TableRow key={`saved-${index}`}>
                          <TableCell className="font-medium p-2">
                            <a
                              href={archivo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-2 text-sm"
                            >
                              {cleanFileName(archivo)}
                            </a>
                            <span className="text-xs text-green-600 flex items-center gap-1 mt-1">
                              <CheckCircle2 className="h-3 w-3" /> Guardado
                            </span>
                          </TableCell>
                          <TableCell className="p-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRemoveSavedFile(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {selectedFiles.map((file, index) => (
                        <TableRow key={`new-${index}`}>
                          <TableCell className="font-medium p-2">
                            <span className="flex items-center gap-2 text-sm">
                              {file.name}
                            </span>
                            <span className="text-xs text-yellow-600 mt-1 block">Pendiente</span>
                          </TableCell>
                          <TableCell className="p-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRemoveSelectedFile(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 border p-4 rounded-lg">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <div className="bg-green-100 p-1 rounded-full text-green-700">
                <FileText className="h-4 w-4" />
              </div>
              Propuesta Comercial
            </h3>

            <div className="grid gap-2">
              <Label htmlFor="costoAproximado">Costo Aproximado</Label>
              <Input
                id="costoAproximado"
                type="number"
                value={costoAproximado || ''}
                onChange={(e) => setCostoAproximado(parseFloat(e.target.value) || 0)}
                placeholder="Ingrese el valor..."
              />
            </div>

            <div className="grid gap-2 pt-2 border-t">
              <Label>Documentos Comerciales (PDF)</Label>
              <Input
                type="file"
                accept=".pdf"
                multiple
                onChange={handleComercialFileChange}
              />

              {(comercialArchivos.length > 0 || selectedComercialFiles.length > 0) && (
                <div className="border rounded-md mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Archivo</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comercialArchivos.map((archivo, index) => (
                        <TableRow key={`saved-com-${index}`}>
                          <TableCell className="font-medium p-2">
                            <a
                              href={archivo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-2 text-sm"
                            >
                              {cleanFileName(archivo)}
                            </a>
                            <span className="text-xs text-green-600 flex items-center gap-1 mt-1">
                              <CheckCircle2 className="h-3 w-3" /> Guardado
                            </span>
                          </TableCell>
                          <TableCell className="p-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRemoveSavedComercialFile(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {selectedComercialFiles.map((file, index) => (
                        <TableRow key={`new-com-${index}`}>
                          <TableCell className="font-medium p-2">
                            <span className="flex items-center gap-2 text-sm">
                              {file.name}
                            </span>
                            <span className="text-xs text-yellow-600 mt-1 block">Pendiente</span>
                          </TableCell>
                          <TableCell className="p-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRemoveSelectedComercialFile(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
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
            Guardar Propuesta
          </Button>
        </div>

        {proyecto.metadataFases?.['propuesta']?.lastUpdated && (
          <div className="pt-2 text-xs text-muted-foreground italic flex justify-end items-center gap-1">
            <Clock className="h-3 w-3" />
            Último guardado: {new Date(proyecto.metadataFases['propuesta'].lastUpdated).toLocaleString('es-CO')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
