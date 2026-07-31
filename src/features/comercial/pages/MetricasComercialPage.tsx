import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/contexts/DataContext';
import { SEGUIMIENTO_ETAPAS_ORDER, EtapaSeguimiento, getEtapaSeguimiento } from '@/types/seguimiento';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import {
  Building2,
  CalendarCheck,
  Target,
  DollarSign,
  CheckCircle2,
  TrendingUp,
  Download,
  Activity,
  ClipboardList,
} from 'lucide-react';
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
  Legend,
} from 'recharts';

// Color palette for the funnel / pipeline (etapas de Seguimiento)
const FUNNEL_COLORS: Record<string, string> = {
  'Sin Contacto': '#94a3b8',
  'Conexión': '#64748b',
  '1er Mensaje': '#3b82f6',
  'Pitch / WhatsApp': '#f59e0b',
  'Reunión': '#8b5cf6',
  'Cotizado': '#10b981',
};

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function MetricasComercialPage() {
  const { environment, seguimientoEmpresas, sectores } = useData();

  // Filters
  const [empresaFilter, setEmpresaFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [etapaFilter, setEtapaFilter] = useState<string>('all');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');

  const getSectorNombre = (sectorId: string) => sectores.find(s => s.id === sectorId)?.nombre || 'Sin Sector';

  // Datos enriquecidos con la etapa calculada
  const datos = useMemo(() => seguimientoEmpresas.map(e => ({
    ...e,
    etapa: getEtapaSeguimiento(e) as EtapaSeguimiento,
    sectorNombre: getSectorNombre(e.sector),
  })), [seguimientoEmpresas, sectores]);

  // Unique values for filter dropdowns
  const empresasUnicas = useMemo(() => [...new Set(datos.map(d => d.nombreComercial))].sort(), [datos]);
  const sectoresUnicos = useMemo(() => [...new Set(datos.map(d => d.sectorNombre).filter(Boolean))].sort(), [datos]);

  // Filtered data
  const filteredData = useMemo(() => {
    return datos.filter(d => {
      if (empresaFilter !== 'all' && d.nombreComercial !== empresaFilter) return false;
      if (sectorFilter !== 'all' && d.sectorNombre !== sectorFilter) return false;
      if (etapaFilter !== 'all' && d.etapa !== etapaFilter) return false;

      if (fechaDesde) {
        const desde = new Date(fechaDesde);
        const fecha = d.fecha instanceof Date ? d.fecha : d.fecha ? new Date(d.fecha) : undefined;
        if (!fecha || fecha < desde) return false;
      }
      if (fechaHasta) {
        const hasta = new Date(fechaHasta);
        hasta.setHours(23, 59, 59, 999);
        const fecha = d.fecha instanceof Date ? d.fecha : d.fecha ? new Date(d.fecha) : undefined;
        if (!fecha || fecha > hasta) return false;
      }

      return true;
    });
  }, [datos, empresaFilter, sectorFilter, etapaFilter, fechaDesde, fechaHasta]);

  // KPI calculations
  const kpis = useMemo(() => {
    const total = filteredData.length;

    const conContacto = filteredData.filter(d => d.etapa !== 'Sin Contacto').length;

    const reunionesAgendadas = filteredData.filter(d => d.reunion).length;

    const cotizados = filteredData.filter(d => d.cotizado);
    const cotizadosCount = cotizados.length;
    const valorCotizadoTotal = cotizados.reduce((sum, d) => sum + (d.montoCotizado || 0), 0);

    const tasaConversion = total > 0 ? (cotizadosCount / total) * 100 : 0;

    return {
      total,
      conContacto,
      reunionesAgendadas,
      cotizadosCount,
      valorCotizadoTotal,
      tasaConversion,
    };
  }, [filteredData]);

  // Weekly activity chart data (basado en la fecha de contacto)
  const weeklyActivity = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun

    filteredData.forEach(d => {
      if (!d.fecha) return;
      const fecha = d.fecha instanceof Date ? d.fecha : new Date(d.fecha);
      if (!isNaN(fecha.getTime())) {
        const dayIndex = (fecha.getDay() + 6) % 7; // Mon=0
        counts[dayIndex]++;
      }
    });

    return WEEKDAY_LABELS.map((label, i) => ({
      name: label,
      actividades: counts[i],
    }));
  }, [filteredData]);

  // Pipeline / funnel data
  const pipelineData = useMemo(() => {
    const countByEtapa: Record<string, number> = {};
    filteredData.forEach(d => {
      countByEtapa[d.etapa] = (countByEtapa[d.etapa] || 0) + 1;
    });

    return SEGUIMIENTO_ETAPAS_ORDER.map(etapa => ({
      name: etapa,
      value: countByEtapa[etapa] || 0,
      fill: FUNNEL_COLORS[etapa] || '#94a3b8',
    }));
  }, [filteredData]);

  // Sector distribution for pie chart
  const sectorDistribution = useMemo(() => {
    const countBySector: Record<string, number> = {};
    filteredData.forEach(d => {
      countBySector[d.sectorNombre] = (countBySector[d.sectorNombre] || 0) + 1;
    });

    const SECTOR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#64748b'];
    return Object.entries(countBySector)
      .map(([name, value], i) => ({
        name,
        value,
        fill: SECTOR_COLORS[i % SECTOR_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

  const handleExportExcel = () => {
    const exportData = filteredData.map(d => ({
      'Empresa': d.nombreComercial,
      'Sector': d.sectorNombre,
      'Fecha': d.fecha ? new Date(d.fecha).toLocaleDateString('es-CO') : '',
      'Etapa': d.etapa,
      'Contacto': d.contactos?.[0]?.nombre || d.contacto || '',
      'Cargo': d.cargo || '',
      'Reunión': d.reunion ? 'Sí' : 'No',
      'Cotizado': d.cotizado ? 'Sí' : 'No',
      'Monto Cotizado': d.montoCotizado || 0,
      'Observaciones': d.observaciones || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comercial');
    const env = environment === 'international' ? 'Internacional' : 'Nacional';
    XLSX.writeFile(wb, `Dashboard_Comercial_${env}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-8 p-1 md:p-2 max-w-[1600px] mx-auto pb-12">
      {/* ──────────────────── HEADER ──────────────────── */}
      <header className="flex flex-col gap-6 bg-card p-6 rounded-2xl border shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-cyan-600" />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                Dashboard Comercial
              </h1>
              <Badge variant="outline" className="text-[10px] font-bold uppercase">
                {environment === 'international' ? 'Internacional' : 'Nacional'}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              Gestión y análisis del pipeline comercial, alimentado en tiempo real desde el módulo de Seguimiento.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={filteredData.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
          </div>
        </div>

        {/* ──────────────────── FILTERS ──────────────────── */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Empresa</span>
            <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
              <SelectTrigger className="w-[180px] h-10 shadow-sm border-muted-foreground/20">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Empresas</SelectItem>
                {empresasUnicas.map(e => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Sector</span>
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-[160px] h-10 shadow-sm border-muted-foreground/20">
                <SelectValue placeholder="Sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Sectores</SelectItem>
                {sectoresUnicos.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Etapa</span>
            <Select value={etapaFilter} onValueChange={setEtapaFilter}>
              <SelectTrigger className="w-[180px] h-10 shadow-sm border-muted-foreground/20">
                <SelectValue placeholder="Etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Etapas</SelectItem>
                {SEGUIMIENTO_ETAPAS_ORDER.map(e => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Desde</span>
            <Input
              type="date"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              className="w-[150px] h-10 shadow-sm border-muted-foreground/20"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Hasta</span>
            <Input
              type="date"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              className="w-[150px] h-10 shadow-sm border-muted-foreground/20"
            />
          </div>

          {(empresaFilter !== 'all' || sectorFilter !== 'all' || etapaFilter !== 'all' || fechaDesde || fechaHasta) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 text-xs"
              onClick={() => {
                setEmpresaFilter('all');
                setSectorFilter('all');
                setEtapaFilter('all');
                setFechaDesde('');
                setFechaHasta('');
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      </header>

      {/* ──────────────────── KPI CARDS ──────────────────── */}
      {datos.length === 0 ? (
        <Card className="border-dashed flex flex-col items-center justify-center py-16 bg-muted/5">
          <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-lg font-semibold text-muted-foreground mb-1">Sin empresas en seguimiento</p>
          <p className="text-sm text-muted-foreground/70 mb-4">
            Registra empresas en el módulo de Seguimiento para generar el dashboard automáticamente.
          </p>
          <Button variant="outline" asChild className="gap-2">
            <a href="/seguimiento">
              <ClipboardList className="h-4 w-4" />
              Ir a Seguimiento
            </a>
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard
              title="Empresas en Seguimiento"
              value={kpis.total}
              icon={<Building2 className="h-5 w-5" />}
              color="text-slate-600"
              description="Total filtrado"
            />
            <MetricCard
              title="Con Contacto"
              value={kpis.conContacto}
              icon={<Activity className="h-5 w-5" />}
              color="text-blue-600"
              description="Conexión o mensaje enviado"
            />
            <MetricCard
              title="Reuniones Agendadas"
              value={kpis.reunionesAgendadas}
              icon={<CalendarCheck className="h-5 w-5" />}
              color="text-purple-600"
              description="Empresas con reunión marcada"
            />
            <MetricCard
              title="Valor Cotizado"
              value={formatCurrency(kpis.valorCotizadoTotal)}
              icon={<DollarSign className="h-5 w-5" />}
              color="text-emerald-600"
              description="Suma de montos cotizados"
            />
            <MetricCard
              title="Empresas Cotizadas"
              value={kpis.cotizadosCount}
              icon={<CheckCircle2 className="h-5 w-5" />}
              color="text-amber-600"
              description="Con cotización enviada"
            />
            <MetricCard
              title="Tasa de Conversión"
              value={`${kpis.tasaConversion.toFixed(1)}%`}
              icon={<TrendingUp className="h-5 w-5" />}
              color="text-cyan-600"
              description="Cotizado / Total"
            />
          </div>

          {/* ──────────────────── CHARTS ──────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Weekly Activity */}
            <Card className="shadow-lg border-muted/20 bg-card/50 backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b bg-muted/5">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-cyan-500" />
                  Actividad Semanal
                </CardTitle>
                <CardDescription>Contactos registrados por día de la semana</CardDescription>
              </CardHeader>
              <CardContent className="pt-8 px-2 md:px-6">
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyActivity} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        allowDecimals={false}
                      />
                      <RechartsTooltip
                        cursor={{ fill: '#f0f9ff' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [`${value} contactos`, '']}
                      />
                      <Bar
                        dataKey="actividades"
                        fill="#0891b2"
                        radius={[6, 6, 0, 0]}
                        barSize={36}
                      >
                        {weeklyActivity.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.actividades > 0 ? '#0891b2' : '#cbd5e1'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pipeline / Funnel */}
            <Card className="shadow-lg border-muted/20 bg-card/50 backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b bg-muted/5">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Target className="h-5 w-5 text-cyan-500" />
                  Embudo de Seguimiento (Pipeline)
                </CardTitle>
                <CardDescription>Distribución de empresas por etapa</CardDescription>
              </CardHeader>
              <CardContent className="pt-8 px-2 md:px-6">
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pipelineData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        allowDecimals={false}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                        width={130}
                      />
                      <RechartsTooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [`${value} empresas`, '']}
                      />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                        {pipelineData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ──────────────────── SECTOR DISTRIBUTION ──────────────────── */}
          {sectorDistribution.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="shadow-lg border-muted/20 bg-card/50 backdrop-blur-sm overflow-hidden lg:col-span-1">
                <CardHeader className="border-b bg-muted/5">
                  <CardTitle className="text-lg font-bold">Distribución por Sector</CardTitle>
                  <CardDescription>Proporción de empresas por industria</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sectorDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={100}
                          dataKey="value"
                          paddingAngle={3}
                          stroke="none"
                        >
                          {sectorDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number, name: string) => [`${value} empresas`, name]}
                        />
                        <Legend
                          verticalAlign="bottom"
                          iconType="circle"
                          iconSize={8}
                          formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Table */}
              <Card className="shadow-lg border-muted/20 bg-card/50 backdrop-blur-sm overflow-hidden lg:col-span-2">
                <CardHeader className="border-b bg-muted/5">
                  <CardTitle className="text-lg font-bold">Resumen de Empresas</CardTitle>
                  <CardDescription>
                    {filteredData.length} empresas {filteredData.length !== datos.length ? `(filtradas de ${datos.length} total)` : 'en total'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 px-0">
                  <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-2">Empresa</th>
                          <th className="text-left px-4 py-2">Sector</th>
                          <th className="text-left px-4 py-2">Etapa</th>
                          <th className="text-right px-4 py-2">Monto Cotizado</th>
                          <th className="text-left px-4 py-2">Contacto</th>
                          <th className="text-left px-4 py-2">Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.slice(0, 50).map(d => {
                          const fecha = d.fecha ? (d.fecha instanceof Date ? d.fecha : new Date(d.fecha)) : undefined;
                          return (
                            <tr key={d.id} className="border-t border-border/40 hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-2.5 font-medium">{d.nombreComercial}</td>
                              <td className="px-4 py-2.5 text-muted-foreground">{d.sectorNombre || '—'}</td>
                              <td className="px-4 py-2.5">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-bold"
                                  style={{ borderColor: FUNNEL_COLORS[d.etapa] || '#94a3b8', color: FUNNEL_COLORS[d.etapa] || '#94a3b8' }}
                                >
                                  {d.etapa}
                                </Badge>
                              </td>
                              <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                                {d.cotizado ? formatCurrency(d.montoCotizado || 0) : '—'}
                              </td>
                              <td className="px-4 py-2.5 text-muted-foreground">{d.contactos?.[0]?.nombre || d.contacto || '—'}</td>
                              <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                                {fecha && !isNaN(fecha.getTime()) ? fecha.toLocaleDateString('es-CO') : '—'}
                              </td>
                            </tr>
                          );
                        })}
                        {filteredData.length > 50 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-3 text-center text-xs text-muted-foreground">
                              Mostrando 50 de {filteredData.length} empresas. Exporta el Excel para ver todas.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    {filteredData.length === 0 && (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        No se encontraron empresas con los filtros actuales.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ──────────────────── METRIC CARD COMPONENT ──────────────────── */
function MetricCard({ title, value, icon, color, description }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  description?: string;
}) {
  return (
    <Card className="border shadow-sm transition-all hover:shadow-md hover:border-cyan-200 overflow-hidden relative group">
      <div className={cn("absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity translate-x-2 -translate-y-2", color)}>
        {icon}
      </div>
      <CardHeader className="pb-2 pt-5 px-5">
        <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 flex flex-col justify-between min-h-[90px]">
        <div className={cn("text-xl md:text-2xl font-black mb-1 truncate", color)}>{value}</div>
        <p className="text-[10px] text-muted-foreground font-medium">{description}</p>
      </CardContent>
    </Card>
  );
}
