import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Save, MessageSquare, Users, Clock, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useData } from '@/contexts/DataContext';
import { Proyecto, EntregaItem } from '@/types';
import { Label } from '@/components/ui/label';

interface FaseEntregaProps {
  proyecto: Proyecto;
  faseId: string;
}

export function FaseEntrega({ proyecto, faseId }: FaseEntregaProps) {
  const { updateProyecto } = useData();
  const { toast } = useToast();
  const [newItem, setNewItem] = useState('');
  const [newItemDate, setNewItemDate] = useState('');

  // Phase completion date
  const initialDate = proyecto.fechasFases?.[faseId]
    ? new Date(proyecto.fechasFases[faseId]).toISOString().split('T')[0]
    : '';
  const [phaseDate, setPhaseDate] = useState(initialDate);

  // Metadata (Meeting & Comments)
  const initialMetadata = proyecto.metadataFases?.[faseId] || {};
  const [meetingDate, setMeetingDate] = useState(
    initialMetadata.fechaReunion
      ? new Date(initialMetadata.fechaReunion).toISOString().split('T')[0]
      : ''
  );
  const [comment, setComment] = useState(initialMetadata.comentario || '');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state with props when proyecto changes
  useEffect(() => {
    const newDate = proyecto.fechasFases?.[faseId]
      ? new Date(proyecto.fechasFases[faseId]).toISOString().split('T')[0]
      : '';
    setPhaseDate(newDate);

    const newMetadata = proyecto.metadataFases?.[faseId] || {};
    const newMeetingDate = newMetadata.fechaReunion
      ? new Date(newMetadata.fechaReunion).toISOString().split('T')[0]
      : '';
    setMeetingDate(newMeetingDate);
    setComment(newMetadata.comentario || '');
  }, [proyecto.id, faseId, proyecto.fechasFases, proyecto.metadataFases]);

  const handleSavePhase = async () => {
    const dateToSave = phaseDate ? (() => {
      const [y, m, d] = phaseDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    })() : undefined;

    const meetingDateToSave = meetingDate ? (() => {
      const [y, m, d] = meetingDate.split('-').map(Number);
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
            fechaReunion: meetingDateToSave,
            comentario: comment,
            lastUpdated: now
          }
        },
        faseActual: faseId as any,
        etapaActual: 'DEVELOP',
        faseGuardada: faseId as any,
        etapaGuardada: 'DEVELOP'
      });

      toast({
        title: "Fase actualizada",
        description: phaseDate
          ? "La fase de entrega ha sido marcada como completada."
          : "La fase de entrega ha sido desmarcada."
      });
    } catch (error) {
      console.error('Error saving phase:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la fase de entrega."
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Determine items based on faseId using maps or legacy props
  const getItems = (): EntregaItem[] => {
    // Try to get from map first (new data structure)
    if (proyecto.entregasMap && proyecto.entregasMap[faseId]) {
      return proyecto.entregasMap[faseId];
    }

    // Fallback to legacy properties for existing data
    if (faseId === 'entrega1') return proyecto.entrega1 || [];
    if (faseId === 'entrega2') return proyecto.entrega2 || [];
    if (faseId === 'entrega3') return proyecto.entrega3 || [];

    return [];
  };

  const items = getItems();

  const handleUpdateItems = (newItems: EntregaItem[]) => {

    const isLegacy = ['entrega1', 'entrega2', 'entrega3'].includes(faseId);

    const updates: Partial<Proyecto> = {};

    // Always update map
    updates.entregasMap = {
      ...(proyecto.entregasMap || {}),
      [faseId]: newItems
    };

    if (isLegacy) {
      if (faseId === 'entrega1') updates.entrega1 = newItems;
      if (faseId === 'entrega2') updates.entrega2 = newItems;
      if (faseId === 'entrega3') updates.entrega3 = newItems;
    }

    updateProyecto(proyecto.id, updates);
  };


  const handleAddItem = () => {
    if (!newItem.trim()) return;
    const item: EntregaItem = {
      id: Math.random().toString(36).substr(2, 9),
      descripcion: newItem,
      completado: false,
      fecha: newItemDate ? (() => {
        const [y, m, d] = newItemDate.split('-').map(Number);
        return new Date(y, m - 1, d);
      })() : undefined,
    };
    handleUpdateItems([...items, item]);
    setNewItem('');
    setNewItemDate('');
  };

  const handleToggleItem = (id: string) => {
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, completado: !item.completado } : item
    );
    handleUpdateItems(updatedItems);
  };

  const handleDeleteItem = (id: string) => {
    handleUpdateItems(items.filter(item => item.id !== id));
  };

  const completados = items.filter(i => i.completado).length;
  const total = items.length;

  // Determine title based on faseId
  const getTitle = () => {
    const ordenItem = proyecto.fasesOrden?.find(f => f.id === faseId);
    if (ordenItem) return ordenItem.label;

    // Fallback for defaults
    if (faseId === 'entrega1') return 'Entrega 1';
    if (faseId === 'entrega2') return 'Entrega 2';
    if (faseId === 'entrega3') return 'Entrega 3';
    return 'Entrega';
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{getTitle()} - Checklist</CardTitle>
            {total > 0 && (
              <span className="text-sm text-muted-foreground">
                {completados}/{total} completados ({Math.round((completados / total) * 100)}%)
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Formulario nuevo item */}
          <div className="flex gap-2">
            <Input
              placeholder="Agregar elemento al checklist..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            />
            <Input
              type="date"
              value={newItemDate}
              onChange={(e) => setNewItemDate(e.target.value)}
              className="w-[180px]"
            />
            <Button onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          </div>

          {/* Lista de items */}
          <div className="space-y-2">
            {items.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No hay elementos en el checklist
              </p>
            ) : (
              items.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <Checkbox
                    checked={item.completado}
                    onCheckedChange={() => handleToggleItem(item.id)}
                  />
                  <div className="flex-1 flex flex-col">
                    <span className={item.completado ? 'line-through text-muted-foreground' : ''}>
                      {item.descripcion}
                    </span>
                    {item.fecha && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(item.fecha).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive h-8 w-8"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>

      </Card>

      {/* Detalles de la Entrega */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalles de la Entrega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Fecha de Reunión
            </Label>
            <Input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comentarios / Observaciones
            </Label>
            <Textarea
              placeholder="Escribe aquí los comentarios sobre la entrega..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
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
    </div>
  );
}
