import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useData } from '@/contexts/DataContext';
import { CarteraItem, ColumnConfig } from '@/types';
import { ExcelTable } from '@/components/shared/ExcelTable';
import { Hash, DollarSign, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';

export default function CarteraPage() {
  const { facturas, recaudos } = useData();

  interface CarteraItemWithId extends CarteraItem {
    id: string;
  }

  const { filteredItems, totales } = useMemo(() => {
    const invoicesByNumber = new Map<string, {
      numeroFactura: string;
      empresaNombre: string;
      valor: number;
    }>();

    const recaudosByNumber = new Map<string, number>();

    // 1. Solo facturas del módulo general, filtradas por año 2026
    facturas.forEach(f => {
      if (!f.numeroFactura) return;
      const fecha = f.fecha instanceof Date ? f.fecha : new Date(f.fecha);
      if (fecha.getFullYear() !== 2026) return;

      const key = String(f.numeroFactura).trim().toUpperCase();
      if (!invoicesByNumber.has(key)) {
        invoicesByNumber.set(key, {
          numeroFactura: String(f.numeroFactura),
          empresaNombre: f.empresaNombre,
          valor: f.valorTotal,
        });
      }
    });

    // 2. Recaudos generales — solo los que corresponden a facturas del mapa
    (recaudos || []).forEach(r => {
      if (!r.numeroFactura) return;
      const key = String(r.numeroFactura).trim().toUpperCase();
      if (!invoicesByNumber.has(key)) return; // ignorar recaudos de facturas fuera del filtro
      recaudosByNumber.set(key, (recaudosByNumber.get(key) || 0) + r.valor);
    });

    const allItems: CarteraItemWithId[] = [];
    invoicesByNumber.forEach((inv, key) => {
      const recaudoHecho = recaudosByNumber.get(key) || 0;
      const pendiente = inv.valor - recaudoHecho;

      // Solo incluir si hay saldo pendiente
      if (pendiente > 0) {
        allItems.push({
          id: key,
          numeroFactura: inv.numeroFactura,
          empresaNombre: inv.empresaNombre,
          valor: inv.valor,
          recaudoHecho,
          carteraPendiente: pendiente,
        });
      }
    });

    const totales = {
      valor: allItems.reduce((sum, item) => sum + item.valor, 0),
      recaudoHecho: allItems.reduce((sum, item) => sum + item.recaudoHecho, 0),
      carteraPendiente: allItems.reduce((sum, item) => sum + item.carteraPendiente, 0),
    };

    return { filteredItems: allItems, totales };
  }, [facturas, recaudos]);

  const columns: ColumnConfig<CarteraItemWithId>[] = [
    {
      key: 'numeroFactura',
      header: (
        <span className="flex items-center gap-2">
          <Hash className="h-3.5 w-3.5 opacity-70" />
          # Factura
        </span>
      ),
      headerLabel: '# Factura'
    },
    {
      key: 'empresaNombre',
      header: (
        <span className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 opacity-70" />
          Empresa
        </span>
      ),
      headerLabel: 'Empresa'
    },
    {
      key: 'valor',
      header: (
        <span className="flex items-center gap-2">
          <DollarSign className="h-3.5 w-3.5 opacity-70" />
          Valor
        </span>
      ),
      headerLabel: 'Valor',
      type: 'number',
      format: (value) => `$${(value || 0).toLocaleString('es-CO')}`,
    },
    {
      key: 'recaudoHecho',
      header: (
        <span className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 opacity-70" />
          Recaudo Hecho
        </span>
      ),
      headerLabel: 'Recaudo Hecho',
      type: 'number',
      format: (value) => `$${(value || 0).toLocaleString('es-CO')}`,
      render: (value) => <span className="text-emerald-600 font-medium">${(value || 0).toLocaleString('es-CO')}</span>
    },
    {
      key: 'carteraPendiente',
      header: (
        <span className="flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 opacity-70" />
          Cartera Pendiente
        </span>
      ),
      headerLabel: 'Cartera Pendiente',
      type: 'number',
      format: (value) => `$${(value || 0).toLocaleString('es-CO')}`,
      render: (value) => <span className="text-orange-600 font-bold">${(value || 0).toLocaleString('es-CO')}</span>
    },
  ];

  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 shrink-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Cartera</h2>
          <p className="text-sm text-muted-foreground">
            Vista automática de facturas pendientes por recaudar
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 shrink-0">
        <Card className="border shadow-sm border-blue-100 bg-blue-50/10">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total Facturado
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-lg font-black text-blue-900">${(totales.valor || 0).toLocaleString('es-CO')}</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm border-green-100 bg-green-50/10">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total Recaudado
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-lg font-black text-green-700">${(totales.recaudoHecho || 0).toLocaleString('es-CO')}</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm border-orange-100 bg-orange-50/10">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Cartera Pendiente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-lg font-black text-orange-600">${(totales.carteraPendiente || 0).toLocaleString('es-CO')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 min-h-0 rounded-lg bg-card border border-border overflow-hidden">
        <ExcelTable
          data={filteredItems}
          columns={columns}
        />
      </div>
    </div>
  );
}
