import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useData } from '@/contexts/DataContext';
import { Target, TrendingUp, DollarSign, Calendar, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

const COLORS = ['#5C6B82', '#4A7C6F', '#5C7A9E', '#8B7284', '#6E7F8C', '#7A8499', '#5E6E7A'];

export default function MetricasCarteraPage() {
  const { facturas, proyectos, metas, empresas } = useData();
  const [empresaFilter, setEmpresaFilter] = useState<string>('all');
  const [anioFilter, setAnioFilter] = useState<string>(new Date().getFullYear().toString());

  const metricas = useMemo(() => {
    const facturasMap = new Map<string, { fecha: Date; valor: number; empresaId?: string }>();

    proyectos.forEach(p => {
      (p.facturas || []).forEach(f => {
        if (!f.numeroFactura) return;
        facturasMap.set(String(f.numeroFactura).trim().toLowerCase(), { 
            fecha: f.fecha, 
            valor: f.valor,
            empresaId: p.empresaId
        });
      });
    });

    facturas.forEach(f => {
      if (!f.numeroFactura) return;
      const key = String(f.numeroFactura).trim().toLowerCase();
      if (!facturasMap.has(key)) {
        facturasMap.set(key, { 
            fecha: f.fecha, 
            valor: f.valorTotal,
            empresaId: f.empresaId
        });
      }
    });

    const filtradas = Array.from(facturasMap.values()).filter(f => {
        const fecha = new Date(f.fecha);
        const matchEmpresa = empresaFilter === 'all' || f.empresaId === empresaFilter;
        const matchAnio = anioFilter === 'all' || fecha.getFullYear().toString() === anioFilter;
        return matchEmpresa && matchAnio;
    });

    const total = filtradas.reduce((sum, f) => sum + f.valor, 0);

    const porMesData = filtradas.reduce((acc, f) => {
      const fecha = new Date(f.fecha);
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[key]) {
        acc[key] = { key, label: fecha.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }), facturado: 0, meta: 0 };
      }
      acc[key].facturado += f.valor;
      return acc;
    }, {} as Record<string, any>);

    // Solo mostrar metas si no hay filtro de empresa o si el filtro de empresa coincide? 
    // Las metas son globales usualmente.
    metas.filter(m => m.tipo === 'facturacion').forEach(meta => {
      const key = `${meta.anio}-${String(parseInt(meta.mes) + 1).padStart(2, '0')}`;
      const matchAnioMeta = anioFilter === 'all' || meta.anio === anioFilter;
      if (matchAnioMeta) {
        if (porMesData[key]) {
            porMesData[key].meta = meta.valor;
        } else if (empresaFilter === 'all') { // Solo crear entradas de meta vacías si no estamos filtrando por empresa específica
            const date = new Date(parseInt(meta.anio), parseInt(meta.mes));
            porMesData[key] = { key, label: date.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }), facturado: 0, meta: meta.valor };
        }
      }
    });

    const chartData = Object.values(porMesData).sort((a: any, b: any) => a.key.localeCompare(b.key));

    const porAnio = Object.entries(
      filtradas.reduce((acc, f) => {
        const anio = new Date(f.fecha).getFullYear().toString();
        acc[anio] = (acc[anio] || 0) + f.valor;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value })).sort((a, b) => b.name.localeCompare(a.name));

    return { total, chartData, porAnio };
  }, [facturas, proyectos, metas, empresaFilter, anioFilter]);

  const aniosDisponibles = useMemo(() => {
    const years = new Set<string>([new Date().getFullYear().toString()]);
    facturas.forEach(f => years.add(new Date(f.fecha).getFullYear().toString()));
    proyectos.forEach(p => (p.facturas || []).forEach(f => years.add(new Date(f.fecha).getFullYear().toString())));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [facturas, proyectos]);

  return (
    <div className="space-y-8 p-1 md:p-2 max-w-[1600px] mx-auto pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-6 rounded-2xl border shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-500/10 rounded-lg">
                <Target className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                Métricas de Facturación
            </h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium">Cumplimiento de objetivos financieros y tendencias de venta.</p>
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
            title="Total Facturado" 
            value={new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(metricas.total)} 
            icon={<DollarSign className="h-5 w-5" />} 
            description="Ventas totales consolidadas"
            color="text-blue-600" 
        />

        {(() => {
          const now = new Date();
          const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const current = metricas.chartData.find((d: any) => d.key === key);
          
          if (!current || current.meta === 0) return (
            <Card className="md:col-span-2 border-dashed flex items-center justify-center bg-muted/5">
                <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    No hay metas definidas para el periodo {now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
                </p>
            </Card>
          );

          const porcentaje = Math.min(110, (current.facturado / current.meta) * 100);

          return (
            <Card className={cn(
                "md:col-span-2 border shadow-md relative overflow-hidden",
                porcentaje >= 100 ? "bg-emerald-50/30 border-emerald-200" : "bg-blue-50/30 border-blue-200"
            )}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className={cn("text-xs font-bold uppercase tracking-widest", porcentaje >= 100 ? "text-emerald-700" : "text-blue-700")}>
                        Cumplimiento del Mes
                    </CardTitle>
                    <CardDescription>Progreso sobre la meta de facturación</CardDescription>
                </div>
                <TrendingUp className={porcentaje >= 100 ? "text-emerald-600" : "text-blue-600"} />
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <span className="text-3xl font-black text-foreground">${(current.facturado || 0).toLocaleString('es-CO')}</span>
                    <span className="text-sm text-muted-foreground ml-2 font-medium">de ${(current.meta || 0).toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={cn("text-2xl font-black", porcentaje >= 100 ? "text-emerald-600" : "text-blue-600")}>
                        {porcentaje.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <Progress value={Math.min(100, porcentaje)} className={cn("h-3", porcentaje >= 100 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-blue-500")} />
              </CardContent>
            </Card>
          );
        })()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <Card className="lg:col-span-3 shadow-lg border-muted/20 bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/5">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Tendencia de Facturación vs Metas
            </CardTitle>
            <CardDescription>Historial de ventas mensuales comparadas con objetivos</CardDescription>
          </CardHeader>
          <CardContent className="pt-8 px-2 md:px-6">
            <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metricas.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorFact" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
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
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number) => [`$${value.toLocaleString('es-CO')}`, '']}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="facturado" 
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorFact)" 
                            name="Facturado"
                        />
                        <Area 
                            type="monotone" 
                            dataKey="meta" 
                            stroke="#94a3b8" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            fill="transparent" 
                            name="Meta"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-muted/20 bg-card/50 backdrop-blur-sm flex flex-col">
          <CardHeader className="border-b bg-muted/5">
            <CardTitle className="text-lg font-bold">Ventas Anuales</CardTitle>
            <CardDescription>Cierre por año calendario</CardDescription>
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
    <Card className="border shadow-sm transition-all hover:shadow-md hover:border-primary/20 overflow-hidden relative group">
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


