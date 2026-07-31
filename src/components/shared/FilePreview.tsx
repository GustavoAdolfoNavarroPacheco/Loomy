import React from 'react';
import { FileText, ExternalLink, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FilePreviewProps {
    filename: string;
    label?: string;
    onView?: () => void;
    compact?: boolean;
}

export function FilePreview({ filename, label, onView, compact = false }: FilePreviewProps) {
    if (!filename) return null;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onView) {
            onView();
        } else {
            window.open(filename, '_blank');
        }
    };

    if (compact) {
        return (
            <div
                className="flex items-center gap-2 p-1.5 border rounded-md bg-muted/10 group hover:bg-muted/20 transition-colors max-w-[200px] cursor-pointer"
                onClick={handleClick}
            >
                <div className="p-1 bg-red-50 rounded group-hover:bg-red-100 transition-colors">
                    <FileText className="h-3.5 w-3.5 text-red-600" />
                </div>
                <span className="text-xs font-medium truncate flex-1" title={filename}>
                    {filename.startsWith('http') || filename.startsWith('/api/files/') ? 'Ver PDF' : filename}
                </span>
                <div className="h-6 w-6 flex items-center justify-center shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Eye className="h-3 w-3" />
                </div>
            </div>
        );
    }

    return (
        <div
            className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={handleClick}
        >
            {label && <span className="text-xs font-medium text-muted-foreground uppercase">{label}</span>}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="p-2 bg-red-100 rounded-md">
                        <FileText className="h-5 w-5 text-red-600" />
                    </div>
                    <span className="text-sm font-medium truncate" title={filename}>
                        {filename.startsWith('http') || filename.startsWith('/api/files/') ? 'Ver Documento' : filename}
                    </span>
                </div>
                <div className="flex gap-2 shrink-0">
                    <div className="h-8 px-2 flex items-center justify-center text-xs font-medium bg-secondary/50 rounded-md group-hover:bg-secondary">
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Ver
                    </div>
                </div>
            </div>

            {/* Mini previsualización mock si se desea */}
            <div className="mt-1 h-24 bg-background border rounded flex items-center justify-center relative overflow-hidden group">
                <FileText className="h-10 w-10 text-muted-foreground/30" />
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ExternalLink className="h-5 w-5 text-muted-foreground" />
                </div>
            </div>
        </div>
    );
}
