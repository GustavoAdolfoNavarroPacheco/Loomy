import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useData } from '@/contexts/DataContext';
import { Target, TrendingUp, Wallet, CheckCircle2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';

const COLORS = ['#4A7C6F', '#5E8F7A', '#6FA08A', '#7FB09A', '#3D6B5F', '#5C7A6E', '#6E8B7C'];

export default function MetricasRecaudoPage() {
  const { proyectos, empresas, metas } = useData();
  const [empresaFilter, setEmpresaFilter] = useState<string>('all');
  const [anioFilter, setAnioFilter] = useState<string>(new Date().getFullYear().toString());

  const metricas = useMemo(() => {
    // Recopilar todos los recaudos de proyectos
    const todosRecaudos = proyectos.flatMap(p =>
      (p.recaudos || []).map(r => ({
        ...r,
        proyectoId: p.id,
        proyectoNombre: p.nombre,
        empresaId: p.empresaId,
      }))
    ).filter(r => {
        const fecha = new Date(r.fecha);
        const matchEmpresa = empresaFilter === 'all' || r.empresaId === empresaFilter;
        const matchAnio = anioFilter === 'all' || fecha.getFullYear().toString() === anioFilter;
        return matchEmpresa && matchAnio;
    });

    const total = todosRecaudos.reduce((sum, r) => sum + r.valor, 0);

    const porMesData = todosRecaudos.reduce((acc, r) => {
      const fecha = new Date(r.fecha);
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[key]) {
        acc[key] = { 
            key, 
            label: fecha.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }), 
            recaudado: 0, 
            meta: 0 
        };
      }
      acc[key].recaudado += r.valor;
      return acc;
    }, {} as Record<string, any>);

    metas.filter(m => m.tipo === 'recaudo').forEach(meta => {
      const key = `${meta.anio}-${String(parseInt(meta.mes) + 1).padStart(2, '0')}`;
      const matchAnioMeta = anioFilter === 'all' || meta.anio === anioFilter;
      if (matchAnioMeta) {
        if (porMesData[key]) {
            porMesData[key].meta = meta.valor;
        } else if (empresaFilter === 'all') {
            const date = new Date(parseInt(meta.anio), parseInt(meta.mes));
            porMesData[key] = { 
                key, 
                label: date.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }), 
                recaudado: 0, 
                meta: meta.valor 
            };
        }
      }
    });

    const chartData = Object.values(porMesData).sort((a: any, b: any) => a.key.localeCompare(b.key));

    const porAnio = Object.entries(
      todosRecaudos.reduce((acc, r) => {
        const anio = new Date(r.fecha).getFullYear().toString();
        acc[anio] = (acc[anio] || 0) + r.valor;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value })).sort((a, b) => b.name.localeCompare(a.name));

    return { total, chartData, porAnio };
  }, [proyectos, empresas, metas, empresaFilter, anioFilter]);

  const aniosDisponibles = useMemo(() => {
    const years = new Set<string>([new Date().getFullYear().toString()]);
    proyectos.forEach(p => (p.recaudos || []).forEach(r => years.add(new Date(r.fecha).getFullYear().toString())));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [proyectos]);

  return (
    <div className="space-y-8 p-1 md:p-2 max-w-[1600px] mx-auto pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-6 rounded-2xl border shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Wallet className="h-6 w-6 text-emerald-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                Métricas de Recaudo
            </h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium">Análisis de flujo de caja y efectividad de cobranza.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Empresa</span>
            <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
              <SelectTrigger className="w-[180px] h-10 shadow-sm border-muted-foreground/20">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Empresas</SelectItem>
                {empresas.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Año</span>
            <Select value={anioFilter} onValueChange={setAnioFilter}>
              <SelectTrigger className="w-[100px] h-10 shadow-sm border-muted-foreground/20">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {aniosDisponibles.map(anio => (
                  <SelectItem key={anio} value={anio}>{anio}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
            title="Total Recaudado" 
            value={new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(metricas.total)} 
            icon={<CheckCircle2 className="h-5 w-5" />} 
            description="Ingresos reales en cuenta"
            color="text-emerald-600" 
        />

        {(() => {
          const now = new Date();
          const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const current = metricas.chartData.find((d: any) => d.key === key) as { key: string; label: string; recaudado: number; meta: number } | undefined;
          
          if (!current || current.meta === 0) return (
            <Card className="md:col-span-2 border-dashed flex items-center justify-center bg-muted/5">
                <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Sin metas de recaudo para {now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
                </p>
            </Card>
          );

          const porcentaje = Math.min(110, (current.recaudado / current.meta) * 100);

          return (
            <Card className={cn(
                "md:col-span-2 border shadow-md relative overflow-hidden",
                porcentaje >= 100 ? "bg-emerald-50/50 border-emerald-200" : "bg-muted/5 border-muted"
            )}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                        Cumplimiento de Cobro
                    </CardTitle>
                    <CardDescription>Progreso sobre la meta de recaudo mensual</CardDescription>
                </div>
                <TrendingUp className="text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <span className="text-3xl font-black text-emerald-700">${(current.recaudado || 0).toLocaleString('es-CO')}</span>
                    <span className="text-sm text-muted-foreground ml-2 font-medium">objetivo: ${(current.meta || 0).toLocaleString('es-CO')}</span>
                  </div>
                  <span className="text-2xl font-black text-emerald-600">
                    {porcentaje.toFixed(1)}%
                  </span>
                </div>
                <Progress value={Math.min(100, porcentaje)} className="h-3 [&>div]:bg-emerald-600" />
              </CardContent>
            </Card>
          );
        })()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <Card className="lg:col-span-3 shadow-lg border-muted/20 bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/5">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Flujo Mensual vs Metas de Recaudo
            </CardTitle>
            <CardDescription>Comparativa entre dinero proyectado y dinero recaudado</CardDescription>
          </CardHeader>
          <CardContent className="pt-8 px-2 md:px-6">
            <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metricas.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                            dataKey="label" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
                        />
                        <RechartsTooltip 
                            cursor={{ fill: '#f0fdf4' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number) => [`$${value.toLocaleString('es-CO')}`, '']}
                        />
                        <Legend verticalAlign="top" height={36}/>
                        <Bar 
                            dataKey="recaudado" 
                            fill="#10b981" 
                            radius={[4, 4, 0, 0]} 
                            name="Recaudado" 
                            barSize={30}
                        />
                        <Bar 
                            dataKey="meta" 
                            fill="#94a3b8" 
                            radius={[4, 4, 0, 0]} 
                            name="Meta Recaudo" 
                            barSize={20}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-muted/20 bg-card/50 backdrop-blur-sm flex flex-col">
          <CardHeader className="border-b bg-muted/5">
            <CardTitle className="text-lg font-bold">Acumulado Anual</CardTitle>
            <CardDescription>Recaudo total por año</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex-1">
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metricas.porAnio}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <RechartsTooltip 
                             cursor={{ fill: '#f8fafc' }}
                             contentStyle={{ borderRadius: '12px', border: 'none' }}
                             formatter={(value: number) => `$${value.toLocaleString('es-CO')}`}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                            {metricas.porAnio.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color, description }: { title: string, value: string | number, icon: React.ReactNode, color: string, description?: string }) {
  return (
    <Card className="border shadow-sm transition-all hover:shadow-md hover:border-emerald-200 overflow-hidden relative group">
      <div className={cn("absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity translate-x-2 -translate-y-2", color)}>
        {icon}
      </div>
      <CardHeader className="pb-2 pt-5 px-5">
        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 flex flex-col justify-between min-h-[100px]">
        <div className={cn("text-2xl md:text-3xl font-black mb-1", color)}>{value}</div>
        <p className="text-[10px] text-muted-foreground font-medium">{description}</p>
      </CardContent>
    </Card>
  );
}
