import React from 'react';
import { Proyecto } from '@/types';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Button } from '@/components/ui/button';
import { Save, Clock, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FaseProyeccionProps {
    proyecto: Proyecto;
}

const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const availableYears = ['2025', '2026', '2027', '2028', '2029', '2030'];

export function FaseProyeccion({ proyecto }: FaseProyeccionProps) {
    const { updateProyecto } = useData();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);
    const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear().toString());

    const handleSave = async () => {
        const now = new Date();
        setIsSaving(true);
        try {
            await updateProyecto(proyecto.id, {
                metadataFases: {
                    ...(proyecto.metadataFases || {}),
                    proyeccion: {
                        ...proyecto.metadataFases?.['proyeccion'],
                        lastUpdated: now
                    }
                },
                faseActual: 'proyeccion',
                etapaActual: 'START',
                faseGuardada: 'proyeccion',
                etapaGuardada: 'START'
            });

            toast({
                title: "Proyección guardada",
                description: "Los valores mensuales han sido actualizados."
            });
        } catch (error) {
            console.error('Error saving proyeccion:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo guardar la proyección."
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex justify-between items-center w-full">
                    <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            Proyección Mensual
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Ingresa la cantidad de dinero proyectada para cada mes del año.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Label>Año:</Label>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="w-[100px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(y => (
                                    <SelectItem key={y} value={y}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {meses.map((mes) => (
                        <div key={mes} className="space-y-2 group">
                            <Label
                                htmlFor={`mes-${mes}`}
                                className="text-sm font-medium group-hover:text-primary transition-colors"
                            >
                                {mes}
                            </Label>
                            <CurrencyInput
                                id={`mes-${mes}`}
                                className="focus-visible:ring-primary"
                                value={(() => {
                                    const proyeccion = proyecto.proyeccion || {};
                                    return (proyeccion[selectedYear] || {})[mes] || 0;
                                })()}
                                onChange={(val) => {
                                    const currentProyeccion = proyecto.proyeccion || {};
                                    const yearProyeccion = currentProyeccion[selectedYear] || {};

                                    updateProyecto(proyecto.id, {
                                        proyeccion: {
                                            ...currentProyeccion,
                                            [selectedYear]: {
                                                ...yearProyeccion,
                                                [mes]: val
                                            }
                                        }
                                    });
                                }}
                            />
                        </div>
                    ))}
                </div>

                <div className="mt-8 p-4 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-foreground">Total Proyectado Anual:</span>
                        <span className="text-xl font-bold text-primary">
                            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
                                (() => {
                                    const p = proyecto.proyeccion || {};
                                    const yearData = p[selectedYear] || {};
                                    return Object.values(yearData).reduce((acc: number, curr) => acc + (curr as number), 0);
                                })()
                            )}
                        </span>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 border-t pt-6">
                <Button onClick={handleSave} className="w-full sm:w-auto" disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Guardar Proyección
                </Button>

                {proyecto.metadataFases?.['proyeccion']?.lastUpdated && (
                    <div className="w-full text-xs text-muted-foreground italic flex justify-end items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Último guardado: {new Date(proyecto.metadataFases['proyeccion'].lastUpdated).toLocaleString('es-CO')}
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
