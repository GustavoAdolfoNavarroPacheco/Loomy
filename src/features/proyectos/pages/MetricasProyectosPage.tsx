import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, PieChart as PieChartIcon, Target, ListFilter, TrendingUp, Briefcase } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
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
  PieChart, 
  Pie,
  Legend
} from 'recharts';

const COLORS = ['#5C6B82', '#4A7C6F', '#5C7A9E', '#8B7284', '#6E7F8C', '#7A8499', '#5E6E7A'];

export default function MetricasProyectosPage() {
  const { proyectos, estados } = useData();

  const [etapaFilter, setEtapaFilter] = useState<string>('all');
  const [estadoFilter, setEstadoFilter] = useState<string>('all');
  const [comercialFilter, setComercialFilter] = useState<string>('all');
  const [lineaFilter, setLineaFilter] = useState<string>('all');

  const stats = useMemo(() => {
    const filtrados = proyectos.filter(p => {
      const estado = p.estado?.toLowerCase() || '';
      const matchEtapa = etapaFilter === 'all' || p.etapaActual === etapaFilter;
      const matchEstado = estadoFilter === 'all' 
        ? (!estado.includes('archivado') && !estado.includes('perdido') && !estado.includes('perdida') && !estado.includes('cancelado') && !estado.includes('cancelada'))
        : estado === estadoFilter.toLowerCase();
      const matchComercial = comercialFilter === 'all' || p.comercial === comercialFilter;
      const matchLinea = lineaFilter === 'all' || p.linea === lineaFilter;
      return matchEtapa && matchEstado && matchComercial && matchLinea;
    });

    const total = filtrados.length;
    const cerrados = filtrados.filter(p => p.estado === 'cerrado').length;
    const efectividad = total > 0 ? Math.round((cerrados / total) * 100) : 0;

    const valorTotal = filtrados.reduce((acc, p) => {
      const valor = p.valorFinal > 0 ? p.valorFinal : (p.valorAproximado || 0);
      return acc + valor;
    }, 0);

    const porEtapa = Object.entries(
      filtrados.reduce((acc, p) => {
        const key = p.etapaActual || 'N/A';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name: name.toUpperCase(), value }));

    const porFase = Object.entries(
      filtrados.reduce((acc, p) => {
        const key = p.faseActual || 'N/A';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }));

    const porEstado = Object.entries(
      filtrados.reduce((acc, p) => {
        const key = p.estado || 'N/A';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(), value }));

    return { total, cerrados, efectividad, valorTotal, porEtapa, porFase, porEstado };
  }, [proyectos, etapaFilter, estadoFilter, comercialFilter, lineaFilter]);

  const comerciales = useMemo(() => 
    Array.from(new Set(proyectos.map(p => p.comercial).filter(Boolean))), 
  [proyectos]);

  const lineas = useMemo(() => 
    Array.from(new Set(proyectos.map(p => p.linea).filter(Boolean))), 
  [proyectos]);

  const faseLabels: Record<string, string> = {
    trazabilidad: 'Trazabilidad',
    identificacion: 'Identificación',
    alcances: 'Alcances',
    propuesta: 'Propuesta',
    cierre: 'Cierre',
    kickoff: 'Kick Off',
    factura1: 'Factura 1',
    entrega1: 'Entrega 1',
  };

  const formattedFaseData = stats.porFase.map(item => ({
    ...item,
    displayName: faseLabels[item.name] || item.name
  }));

  return (
    <div className="space-y-8 p-1 md:p-2 max-w-[1600px] mx-auto pb-12">
      <header className="glass-panel flex flex-col xl:flex-row xl:items-center justify-between gap-6 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-primary/10 rounded-lg">
                <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                Métricas de Proyectos
            </h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium">Panel de control estratégico y estados de avance.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Comercial</span>
            <Select value={comercialFilter} onValueChange={setComercialFilter}>
              <SelectTrigger className="w-[140px] h-10 shadow-sm border-muted-foreground/20">
                <SelectValue placeholder="Comercial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {comerciales.map(c => (
                  <SelectItem key={c} value={c!}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Línea</span>
            <Select value={lineaFilter} onValueChange={setLineaFilter}>
              <SelectTrigger className="w-[140px] h-10 shadow-sm border-muted-foreground/20">
                <SelectValue placeholder="Línea" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {lineas.map(l => (
                  <SelectItem key={l} value={l!}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Estado</span>
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="w-[140px] h-10 shadow-sm border-muted-foreground/20">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="pausado">Pausado</SelectItem>
                <SelectItem value="cerrado">Cerrado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                <SelectItem value="perdido">Perdido</SelectItem>
                <SelectItem value="archivado">Archivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Etapa</span>
            <Select value={etapaFilter} onValueChange={setEtapaFilter}>
              <SelectTrigger className="w-[100px] h-10 shadow-sm border-muted-foreground/20">
                <SelectValue placeholder="Etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="START">START</SelectItem>
                <SelectItem value="DEVELOP">DEVELOP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <MetricCard 
            title="Proyectos Totales" 
            value={stats.total} 
            icon={<BarChart3 className="h-5 w-5" />} 
            description="Proyectos bajo gestión"
            trend="+2.5%"
            trendColor="text-emerald-600"
            color="text-primary" 
        />
        <MetricCard 
            title="Proyectos Cerrados" 
            value={stats.cerrados} 
            icon={<Target className="h-5 w-5" />} 
            description="Objetivos completados"
            trend="Cierre total"
            color="text-emerald-600" 
        />
        <MetricCard 
            title="Efectividad Comercial" 
            value={`${stats.efectividad}%`} 
            icon={<TrendingUp className="h-5 w-5" />} 
            description="Ratio de cierre exitoso"
            color="text-indigo-600" 
        />
        <MetricCard
          title="Valor Cartera Proyectada"
          value={new Intl.NumberFormat('es-CO', { 
            style: 'currency', 
            currency: 'COP', 
            maximumFractionDigits: 0,
            notation: 'compact'
          }).format(stats.valorTotal)}
          icon={<BarChart3 className="h-5 w-5" />}
          description="Monto total en pipeline"
          color="text-slate-900"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-md border-muted/30 overflow-hidden bg-card/40">
          <CardHeader className="border-b bg-muted/5">
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Distribución por Fase
                    </CardTitle>
                    <CardDescription>Cantidad de proyectos en cada etapa operativa</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-[350px] w-full">
              {formattedFaseData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={formattedFaseData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                            dataKey="displayName" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                            angle={-15}
                            textAnchor="end"
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <RechartsTooltip 
                            cursor={{ fill: '#f1f5f9' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={45}>
                            {formattedFaseData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground italic">No hay datos para mostrar</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-muted/30 flex flex-col bg-card/40">
          <CardHeader className="border-b bg-muted/5">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-indigo-500" />
                Estado del Portafolio
            </CardTitle>
            <CardDescription>Resumen porcentual de estados</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center pt-6">
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={stats.porEstado}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {stats.porEstado.map((_, index) => (
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
            
            <div className="grid grid-cols-2 gap-3 mt-4">
                {stats.porEtapa.map((item, idx) => (
                    <div key={item.name} className="p-3 rounded-xl bg-muted/30 border">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">{item.name}</span>
                        <span className="text-xl font-extrabold text-foreground">{item.value}</span>
                    </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ 
    title, 
    value, 
    icon, 
    color, 
    description, 
    trend, 
    trendColor = "text-muted-foreground" 
}: { 
    title: string, 
    value: string | number, 
    icon: React.ReactNode, 
    color: string,
    description?: string,
    trend?: string,
    trendColor?: string
}) {
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
            {trend && <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted", trendColor)}>{trend}</span>}
        </div>
      </CardContent>
    </Card>
  );
}