import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { TopNavbar } from '@/components/layout/TopNavbar';
import { useData } from '@/contexts/DataContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const { environment } = useData();

  const getThemeClass = (path: string) => {
    if (path.startsWith('/proyectos')) return 'theme-royal';
    if (path.startsWith('/facturacion')) return 'theme-midnight';
    if (path.startsWith('/recaudos')) return 'theme-emerald';
    if (path.startsWith('/cartera')) return 'theme-obsidian';
    if (path.startsWith('/metricas')) return 'theme-ocean';
    if (path.startsWith('/configuracion')) return 'theme-slate';
    if (path.startsWith('/empresas')) return 'theme-forest';
    if (path.startsWith('/seguimiento')) return 'theme-amber';
    if (path.startsWith('/clientes')) return 'theme-indigo';
    if (path.startsWith('/proyeccion')) return 'theme-wine';
    return '';
  };

  return (
    <div className={cn("relative h-screen flex flex-col w-full overflow-hidden", getThemeClass(pathname))}>
      {/* Fondo de cristal: gradiente suave + blobs de color por módulo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-surface-accent via-background to-muted" />
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-25 blur-3xl" style={{ background: 'hsl(var(--module))' }} />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full opacity-15 blur-3xl" style={{ background: 'hsl(var(--module))' }} />
        <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full opacity-10 blur-3xl" style={{ background: 'hsl(var(--module))' }} />
      </div>

      <TopNavbar />
      <main className="relative flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="w-full min-h-full p-2 md:p-4">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
