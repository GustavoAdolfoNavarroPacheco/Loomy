import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Calendar, MapPin, FileText, Globe } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useData } from '@/contexts/DataContext';
import { Proyecto, Visita } from '@/types';
import { Loader2 } from 'lucide-react';

interface FaseTrazabilidadProps {
    proyecto: Proyecto;
}

export function FaseTrazabilidad({ proyecto }: FaseTrazabilidadProps) {
    const { updateProyecto } = useData();
    const { toast } = useToast();
    const [visitas, setVisitas] = useState<Visita[]>(proyecto.trazabilidad || []);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!proyecto.trazabilidad || proyecto.trazabilidad.length === 0) {
            if (visitas.length === 0) {
                setVisitas([{
                    id: crypto.randomUUID(),
                    fecha: new Date(),
                    ubicacion: '',
                    descripcion: '',
                    medio: ''
                }]);
            }
        } else {

        }
    }, [proyecto.id]);

    const handleAddVisita = () => {
        setVisitas([
            ...visitas,
            {
                id: crypto.randomUUID(),
                fecha: new Date(),
                ubicacion: '',
                descripcion: '',
                medio: ''
            }
        ]);
    };

    const handleRemoveVisita = (id: string) => {
        setVisitas(visitas.filter(v => v.id !== id));
    };

    const handleChange = (id: string, field: keyof Visita, value: any) => {
        setVisitas(visitas.map(v =>
            v.id === id ? { ...v, [field]: value } : v
        ));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateProyecto(proyecto.id, {
                trazabilidad: visitas,
                faseActual: 'trazabilidad',
                etapaActual: 'START',
                faseGuardada: 'trazabilidad',
                etapaGuardada: 'START'
            });

            toast({
                title: "Trazabilidad actualizada",
                description: "Las visitas han sido guardadas exitosamente."
            });
        } catch (error) {
            console.error('Error saving trazabilidad:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo guardar la trazabilidad."
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">Historial de Visitas y Seguimiento</h3>
                    <p className="text-sm text-muted-foreground">Registra agendamientos, reuniones y visitas.</p>
                </div>
                <Button onClick={handleAddVisita} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Visita
                </Button>
            </div>

            <div className="grid gap-4">
                {visitas.map((visita, index) => (
                    <Card key={visita.id} className="relative overflow-hidden">
                        <div className="absolute top-2 right-2 z-10">
                            {visitas.length > 1 && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleRemoveVisita(visita.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        <CardContent className="p-6">
                            <div className="grid md:grid-cols-2 gap-4">

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-primary" />
                                        Fecha
                                    </Label>
                                    <Input
                                        type="date"
                                        value={
                                            visita.fecha instanceof Date
                                                ? visita.fecha.toISOString().split('T')[0]
                                                : typeof visita.fecha === 'string'
                                                    ? (visita.fecha as string).split('T')[0]
                                                    : ''
                                        }
                                        onChange={(e) => {
                                            const date = new Date(e.target.value);

                                            const [y, m, d] = e.target.value.split('-').map(Number);
                                            const newDate = new Date(y, m - 1, d, 12, 0, 0);
                                            handleChange(visita.id, 'fecha', newDate);
                                        }}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        Ubicación
                                    </Label>
                                    <Input
                                        placeholder="Lugar de la reunión"
                                        value={visita.ubicacion}
                                        onChange={(e) => handleChange(visita.id, 'ubicacion', e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Globe className="h-4 w-4 text-primary" />
                                        Medio (Presencial/Virtual)
                                    </Label>
                                    <Input
                                        placeholder="Ej. Google Meet, Oficina Cliente..."
                                        value={visita.medio}
                                        onChange={(e) => handleChange(visita.id, 'medio', e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-primary" />
                                        Descripción / Notas
                                    </Label>
                                    <Textarea
                                        placeholder="Detalles importantes de la visita..."
                                        value={visita.descripcion}
                                        onChange={(e) => handleChange(visita.id, 'descripcion', e.target.value)}
                                    />
                                </div>

                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Guardar Trazabilidad
                </Button>
            </div>
        </div>
    );
}
