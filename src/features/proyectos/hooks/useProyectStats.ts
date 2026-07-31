import { useMemo, useState } from "react";
import { useData } from "@/contexts/DataContext";

type ProyectoExtended = any;

export function useProyectoStats() {
  const { proyectos } = useData() as { proyectos: ProyectoExtended[] };

  const [etapaFilter, setEtapaFilter] = useState<string>('all');
  const [faseFilter, setFaseFilter] = useState<string>('all');
  const [estadoFilter, setEstadoFilter] = useState<string>('all');

  const stats = useMemo(() => {
    const filtrados = proyectos.filter(p => {
      const matchEtapa = etapaFilter === 'all' || p.etapaActual === etapaFilter;
      const matchFase = faseFilter === 'all' || p.faseActual === faseFilter;
      const estado = p.estado?.toLowerCase() || '';
      const matchEstado = estadoFilter === 'all' 
        ? (!estado.includes('archivado') && !estado.includes('perdido') && !estado.includes('perdida') && !estado.includes('cancelado') && !estado.includes('cancelada'))
        : estado === estadoFilter.toLowerCase();
      return matchEtapa && matchFase && matchEstado;
    });

    const total = filtrados.length;
    const cerrados = filtrados.filter(p => p.estado === 'cerrado').length;
    const efectividad = total > 0 ? Math.round((cerrados / total) * 100) : 0;

    const valorTotal = filtrados.reduce((acc, p) => {
      const year = new Date().getFullYear().toString();
      const sumProyeccion = Object.values(p.proyeccion?.[year] || {}).reduce((sum: number, val) => sum + (val as number), 0);
      const valorBase = p.valorFinal > 0 ? p.valorFinal : (p.valorAproximado || 0);
      
      // Si el valor base es 0 pero hay proyección, usar la proyección
      const valor = valorBase > 0 ? valorBase : sumProyeccion;
      return acc + valor;
    }, 0);

    return { total, cerrados, efectividad, valorTotal };
  }, [proyectos, etapaFilter, faseFilter, estadoFilter]);

  return { stats, etapaFilter, setEtapaFilter, faseFilter, setFaseFilter, estadoFilter, setEstadoFilter };
}