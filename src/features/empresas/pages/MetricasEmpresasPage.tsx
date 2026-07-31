import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { Building2, Globe, Laptop, Landmark, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie,
  Legend
} from 'recharts';

const COLORS = ['#5C6B82', '#4A7C6F', '#5C7A9E', '#8B7284', '#6E7F8C', '#7A8499', '#5E6E7A'];

export default function MetricasEmpresasPage() {
  const { empresas, proyectos, sectores, ciudades } = useData();
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [ciudadFilter, setCiudadFilter] = useState<string>('all');

  const metricas = useMemo(() => {
    const filtrados = empresas.filter(e => {
        const matchSector = sectorFilter === 'all' || e.sector === sectorFilter;
        const matchCiudad = ciudadFilter === 'all' || e.ciudad === ciudadFilter;
        return matchSector && matchCiudad;
    });

    const total = filtrados.length;

    // Por sector
    const porSector = Object.entries(
      filtrados.reduce((acc, e) => {
        const sector = sectores.find(s => s.id === e.sector)?.nombre || 'Sin sector';
        acc[sector] = (acc[sector] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }))
     .sort((a, b) => b.value - a.value);

    // Por ciudad
    const porCiudad = Object.entries(
      filtrados.reduce((acc, e) => {
        const ciudad = ciudades.find(c => c.id === e.ciudad)?.nombre || 'Sin ciudad';
        acc[ciudad] = (acc[ciudad] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }))
     .sort((a, b) => b.value - a.value);

    // Facturación promedio
    const totalFacturacion = filtrados.reduce((acc, e) => acc + (e.facturacionAnual || 0), 0);
    const promedioFacturacion = total > 0 ? totalFacturacion / total : 0;

    // Tecnología promedio
    const empresasConTec = filtrados.filter(e => e.porcentajeTecnologia !== undefined);
    const promedioTec = empresasConTec.length > 0 
        ? empresasConTec.reduce((acc, e) => acc + (e.porcentajeTecnologia || 0), 0) / empresasConTec.length 
        : 0;

    // Por proyectos
    const filtradosIds = new Set(filtrados.map(e => e.id));
    const empresasConProyectos = new Set(proyectos.filter(p => {
        const estado = p.estado?.toLowerCase();
        return filtradosIds.has(p.empresaId) && estado !== 'archivado' && estado !== 'perdido';
    }).map(p => p.empresaId)).size;
    const empresasActivdadPct = total > 0 ? Math.round((empresasConProyectos / total) * 100) : 0;

    return { 
      total, 
      porSector, 
      porCiudad, 
      empresasConProyectos,
      promedioFacturacion,
      promedioTec,
      empresasActivdadPct
    };
  }, [empresas, proyectos, sectores, ciudades, sectorFilter, ciudadFilter]);

  return (
    <div className="space-y-8 p-1 md:p-2 max-w-[1600px] mx-auto pb-12">
      <header className="glass-panel flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Building2 className="h-6 w-6 text-indigo-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                Análisis de Empresas
            </h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium">Demografía corporativa y potencial tecnológico.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Sector</span>
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-[180px] h-10 shadow-sm border-muted-foreground/20">
                <SelectValue placeholder="Sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Sectores</SelectItem>
                {sectores.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Ciudad</span>
            <Select value={ciudadFilter} onValueChange={setCiudadFilter}>
              <SelectTrigger className="w-[160px] h-10 shadow-sm border-muted-foreground/20">
                <SelectValue placeholder="Ciudad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Ciudades</SelectItem>
                {ciudades.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <MetricCard 
            title="Total Empresas" 
            value={metricas.total} 
            icon={<Landmark className="h-5 w-5" />} 
            description="Entidades registradas"
            color="text-indigo-600" 
        />
        <MetricCard 
            title="Facturación Promedio" 
            value={new Intl.NumberFormat('es-CO', { 
                style: 'currency', 
                currency: 'COP', 
                maximumFractionDigits: 0,
                notation: 'compact' 
            }).format(metricas.promedioFacturacion)} 
            icon={<TrendingUp className="h-5 w-5" />} 
            description="Ingreso anual estimado"
            color="text-emerald-600" 
        />
        <MetricCard 
            title="Nivel Tecnología" 
            value={`${metricas.promedioTec.toFixed(1)}%`} 
            icon={<Laptop className="h-5 w-5" />} 
            description="Adopción digital promedio"
            color="text-amber-600" 
        />
        <MetricCard 
            title="Empresas con Proyectos" 
            value={metricas.empresasConProyectos} 
            icon={<Building2 className="h-5 w-5" />} 
            description={`${metricas.empresasActivdadPct}% del total`}
            trend="Activas"
            color="text-blue-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-md border-muted/30 bg-card/40">
          <CardHeader className="border-b bg-muted/5">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Globe className="h-5 w-5 text-indigo-500" />
                Distribución por Ciudad
            </CardTitle>
            <CardDescription>Presencia geográfica de las empresas</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={metricas.porCiudad} margin={{ left: 40, right: 30 }}>
                        <XAxis type="number" hide />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                        />
                        <RechartsTooltip 
                             cursor={{ fill: 'transparent' }}
                             contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                            {metricas.porCiudad.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-muted/30 bg-card/40 flex flex-col">
          <CardHeader className="border-b bg-muted/5">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-emerald-500" />
                Sectores Económicos
            </CardTitle>
            <CardDescription>Segmentación por tipo de industria</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center pt-8">
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={metricas.porSector}
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {metricas.porSector.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <RechartsTooltip 
                             contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color, description, trend }: { title: string, value: string | number, icon: React.ReactNode, color: string, description?: string, trend?: string }) {
  return (
    <Card className="border shadow-sm transition-all hover:shadow-md hover:border-primary/20 overflow-hidden relative group">
      <div className={cn("absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity translate-x-2 -translate-y-2", color)}>
        {icon}
      </div>
      <CardHeader className="pb-2 pt-5 px-5">
        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className={cn("text-2xl md:text-3xl font-black mb-1", color)}>{value}</div>
        <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-muted-foreground font-medium">{description}</p>
            {trend && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{trend}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
