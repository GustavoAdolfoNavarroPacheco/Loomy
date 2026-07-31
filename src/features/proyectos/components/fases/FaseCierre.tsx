import { useState, useEffect } from 'react';
import { FileText, Save, Clock } from 'lucide-react';
import { FilePreview } from '@/components/shared/FilePreview';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useData } from '@/contexts/DataContext';
import { Proyecto, CierreData } from '@/types';
import { Loader2 } from 'lucide-react';

interface FaseCierreProps {
  proyecto: Proyecto;
}

export function FaseCierre({ proyecto }: FaseCierreProps) {
  const { updateProyecto, uploadFile } = useData();
  const [precioFinal, setPrecioFinal] = useState(proyecto.cierre?.precioFinal || proyecto.valorAproximado || 0);
  const [contratoPdf, setContratoPdf] = useState(proyecto.cierre?.contratoPdf || '');
  const [porcentajeFacturacion, setPorcentajeFacturacion] = useState(proyecto.cierre?.porcentajeFacturacion || 33);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [facturasPorcentaje, setFacturasPorcentaje] = useState<number[]>(proyecto.cierre?.porcentajesDistribucion || [100]);
  const totalPorcentaje = facturasPorcentaje.reduce((a, b) => a + b, 0);
  const porcentajeValido = totalPorcentaje === 100;



  const initialDate = proyecto.fechasFases?.['cierre']
    ? new Date(proyecto.fechasFases['cierre']).toISOString().split('T')[0]
    : '';
  const [phaseDate, setPhaseDate] = useState(initialDate);

  const { toast } = useToast();

  // Sync state with props when proyecto changes
  useEffect(() => {
    setPrecioFinal(proyecto.cierre?.precioFinal || proyecto.valorAproximado || 0);
    setContratoPdf(proyecto.cierre?.contratoPdf || '');
    setPorcentajeFacturacion(proyecto.cierre?.porcentajeFacturacion || 33);
    setFacturasPorcentaje(proyecto.cierre?.porcentajesDistribucion || [100]);
    const newDate = proyecto.fechasFases?.['cierre']
      ? new Date(proyecto.fechasFases['cierre']).toISOString().split('T')[0]
      : '';
    setPhaseDate(newDate);
  }, [proyecto.id, proyecto.cierre, proyecto.valorAproximado, proyecto.fechasFases]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let finalPdfUrl = contratoPdf;

      if (selectedFile) {
        const path = `proyectos/${proyecto.id}/contrato_${Date.now()}.pdf`;
        finalPdfUrl = await uploadFile(selectedFile, path);
      }

      const cierre: CierreData = {
        precioFinal,
        contratoPdf: finalPdfUrl || undefined,
        porcentajeFacturacion: totalPorcentaje,
        porcentajesDistribucion: facturasPorcentaje,
      };

      const now = new Date();
      const dateToSave = phaseDate ? (() => {
        const [y, m, d] = phaseDate.split('-').map(Number);
        return new Date(y, m - 1, d);
      })() : undefined;

      await updateProyecto(proyecto.id, {
        cierre,
        valorFinal: precioFinal,
        fechasFases: {
          ...proyecto.fechasFases,
          cierre: dateToSave as Date
        },
        metadataFases: {
          ...(proyecto.metadataFases || {}),
          cierre: {
            ...proyecto.metadataFases?.['cierre'],
            lastUpdated: now
          }
        },
        faseActual: 'cierre',
        etapaActual: 'START',
        faseGuardada: 'cierre',
        etapaGuardada: 'START'
      });

      setContratoPdf(finalPdfUrl);
      setSelectedFile(null);

      toast({
        title: "Cierre de proyecto guardado",
        description: "Los datos de cierre y facturación han sido actualizados."
      });
    } catch (error) {
      console.error('Error saving cierre:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el cierre."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setContratoPdf(file.name);
    }
  };

  const total = facturasPorcentaje.reduce((a, b) => a + b, 0);

  const actualizarPorcentaje = (index: number, value: string) => {
    const nuevoValor = parseFloat(value) || 0;

    const nuevos = [...facturasPorcentaje];
    nuevos[index] = nuevoValor;
    setFacturasPorcentaje(nuevos);
  };

  const agregarFactura = () => {
    setFacturasPorcentaje([...facturasPorcentaje, 0]);
  };

  const eliminarFactura = (index: number) => {
    const nuevos = facturasPorcentaje.filter((_, i) => i !== index);
    setFacturasPorcentaje(nuevos);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cierre del Proyecto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="grid gap-2">
            <Label htmlFor="precioFinal">Precio Final</Label>
            <CurrencyInput
              id="precioFinal"
              value={precioFinal || 0}
              onChange={(val) => setPrecioFinal(val)}
            />
          </div>

          <div className="space-y-3">
            <Label>% Facturación por Entregas</Label>

            {facturasPorcentaje.map((porcentaje, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={porcentaje}
                  onChange={(e) => actualizarPorcentaje(index, e.target.value)}
                />
                <span>%</span>

                {facturasPorcentaje.length > 1 && (
                  <button
                    type="button"
                    onClick={() => eliminarFactura(index)}
                    className="text-red-500 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            <p className={`text-sm mt-2 ${porcentajeValido ? "text-green-600" : "text-red-500"}`}>
              {porcentajeValido
                ? "✔ Los porcentajes suman 100%"
                : `Faltan ${(100 - totalPorcentaje).toFixed(2)}% para completar 100%`}
            </p>

            <button
              type="button"
              onClick={agregarFactura}
              className="text-sm text-blue-600"
            >
              + Agregar otra factura
            </button>

            <p className="text-sm mt-2">
              Total: <strong>{facturasPorcentaje.reduce((a, b) => a + b, 0)}%</strong>
            </p>
          </div>

        </div>

        <div className="grid gap-2">
          <Label>Contrato (PDF)</Label>
          <Input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
          />
          {contratoPdf && (
            <FilePreview
              filename={contratoPdf}
              label="Contrato Digital"
            />
          )}
        </div>

        <div className="p-4 bg-muted/30 rounded-lg space-y-2">
          <p className="text-sm text-muted-foreground">
            Distribución de facturación por entregas:
          </p>

          {facturasPorcentaje.map((porcentaje, index) => {
            const valorFactura = (precioFinal * porcentaje) / 100;

            return (
              <div key={index} className="flex justify-between text-sm">
                <span>Factura {index + 1} ({porcentaje}%)</span>
                <span className="font-medium">
                  ${valorFactura.toLocaleString('es-CO')}
                </span>
              </div>
            );
          })}

          <div className="border-t pt-2 flex justify-between font-semibold">
            <span>Total</span>
            <span>${precioFinal.toLocaleString('es-CO')}</span>
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
          <Button onClick={handleSave} className="flex-1" disabled={!porcentajeValido || isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar Cierre
          </Button>
        </div>

        {proyecto.metadataFases?.['cierre']?.lastUpdated && (
          <div className="pt-2 text-xs text-muted-foreground italic flex justify-end items-center gap-1">
            <Clock className="h-3 w-3" />
            Último guardado: {new Date(proyecto.metadataFases['cierre'].lastUpdated).toLocaleString('es-CO')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
