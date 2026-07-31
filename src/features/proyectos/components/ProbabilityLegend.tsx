import React from 'react';
import { cn } from '@/lib/utils';

export const PROBABILITIES = [
    { value: 100, label: '100% - Seguro', color: 'bg-[#22c55e]', textColor: 'text-emerald-950', border: 'border-emerald-500' },
    { value: 80, label: '80% - Muy probable', color: 'bg-[#86efac]', textColor: 'text-emerald-900', border: 'border-emerald-300' },
    { value: 50, label: '50% - Media probabilidad', color: 'bg-[#fef08a]', textColor: 'text-yellow-900', border: 'border-yellow-400' },
    { value: 20, label: '20% - Baja probabilidad', color: 'bg-[#fed7aa]', textColor: 'text-orange-900', border: 'border-orange-400' },
    { value: 0, label: '0% - Sin probabilidad', color: 'bg-[#fecaca]', textColor: 'text-rose-900', border: 'border-rose-400' },
];

export function ProbabilityLegend() {
    return (
        <div className="flex flex-wrap items-center gap-3 p-2 bg-muted/30 rounded-lg border border-border/50">
            <span className="text-xs font-bold text-muted-foreground mr-1">PROBABILIDAD:</span>
            {PROBABILITIES.map((p) => (
                <div key={p.value} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border bg-background/50">
                    <div className={cn("w-3 h-3 rounded-full shadow-sm", p.color)} />
                    <span className="text-[10px] font-semibold whitespace-nowrap">{p.label}</span>
                </div>
            ))}
        </div>
    );
}

export function getProbabilityStyle(value: number | undefined, isFacturado: boolean = false) {
    if (isFacturado) return PROBABILITIES.find(p => p.value === 100);
    if (value === undefined) return null;
    return PROBABILITIES.find(p => p.value === value) || null;
}
