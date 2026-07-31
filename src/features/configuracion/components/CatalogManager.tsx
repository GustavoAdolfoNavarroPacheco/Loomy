import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Pencil, Check, X, Trash2 } from 'lucide-react';
import { useState } from "react";

interface Item {
    id: string;
    nombre: string;
}

interface CatalogManagerProps {
    title: string;
    placeholder: string;
    items: Item[];
    onAdd: (name: string) => Promise<void>;
    onUpdate: (id: string, name: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    isReadOnly?: boolean;
}

export const CatalogManager = ({
    title,
    placeholder,
    items,
    onAdd,
    onUpdate,
    onDelete,
    isReadOnly = false
}: CatalogManagerProps) => {
    const [newValue, setNewValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const handleAdd = async () => {
        if (!newValue.trim()) return;
        setIsSaving(true);
        try {
            await onAdd(newValue);
            setNewValue('');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveEdit = async (id: string) => {
        if (!editValue.trim()) return;
        setIsSaving(true);
        try {
            await onUpdate(id, editValue);
            setEditingId(null);
            setEditValue('');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="py-3 px-6 shrink-0 border-b">
                <CardTitle className="text-base font-semibold">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 space-y-4 p-6 overflow-hidden flex flex-col">
                {!isReadOnly && (
                    <div className="flex gap-2 shrink-0">
                        <Input
                            placeholder={placeholder}
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            className="h-9"
                        />
                        <Button size="sm" onClick={handleAdd} disabled={!newValue.trim() || isSaving} className="h-9">
                            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                            Agregar
                        </Button>
                    </div>
                )}
                <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                    {items.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg transition-all hover:bg-muted/30">
                            {editingId === item.id && !isReadOnly ? (
                                <div className="flex items-center gap-2 flex-1 mr-2">
                                    <Input
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(item.id)}
                                        className="h-8"
                                        autoFocus
                                    />
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleSaveEdit(item.id)}>
                                        <Check className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingId(null)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <span className="font-medium">{item.nombre}</span>
                                    {!isReadOnly && (
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                onClick={() => { setEditingId(item.id); setEditValue(item.nombre); }}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive"
                                                onClick={() => onDelete(item.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};
