import React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import { PROBABILITIES } from './ProbabilityLegend';
import { cn } from '@/lib/utils';

interface ProbabilitySelectProps {
    value: number | undefined;
    onChange: (value: number) => void;
    disabled?: boolean;
    isFacturado?: boolean;
}

export function ProbabilitySelect({ value, onChange, disabled, isFacturado }: ProbabilitySelectProps) {
    if (isFacturado) {
        return (
            <div className="flex items-center justify-center w-full h-full pointer-events-none" title="Facturado automáticamente al 100%">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-sm" />
            </div>
        );
    }

    // Default to -1 (Sin color) if undefined
    const currentProbValue = value !== undefined ? value : -1;

    return (
        <Select
            value={String(currentProbValue)}
            onValueChange={(v) => onChange(Number(v))}
            disabled={disabled}
        >
            <SelectTrigger
                className={cn(
                    "h-4 w-4 border-none bg-transparent hover:bg-black/10 p-0 shadow-none focus:ring-0 focus:ring-offset-0 rounded-full flex items-center justify-center",
                    "transition-all"
                )}
            >
                <div className={cn(
                    "w-2 h-2 rounded-full shrink-0 shadow-sm",
                    currentProbValue === -1 
                        ? "bg-white border border-slate-300" 
                        : (PROBABILITIES.find(p => p.value === currentProbValue)?.color || "bg-slate-300")
                )} />
            </SelectTrigger>
            <SelectContent className="min-w-[140px] p-0 overflow-hidden shadow-xl border-border/60">
                <SelectItem
                    value="-1"
                    className={cn(
                        "cursor-pointer text-[11px] py-1.5 px-3 flex items-center gap-2 font-semibold",
                        "hover:bg-accent focus:bg-accent",
                        currentProbValue === -1 && "bg-accent/50"
                    )}
                >
                    <div className="flex items-center gap-2 w-full">
                       <div className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300" />
                       Sin color / Reset
                    </div>
                </SelectItem>
                {PROBABILITIES.map((p) => (
                    <SelectItem
                        key={p.value}
                        value={String(p.value)}
                        className={cn(
                            "cursor-pointer text-[11px] py-1.5 px-3 flex items-center gap-2 font-semibold",
                            "hover:bg-accent focus:bg-accent",
                            p.value === currentProbValue && "bg-accent/50"
                        )}
                    >
                        <div className="flex items-center gap-2 w-full">
                           <div className={cn("w-2.5 h-2.5 rounded-full", p.color)} />
                           {p.label}
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
