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
    <div className={cn("h-screen flex flex-col w-full bg-surface-accent overflow-hidden", getThemeClass(pathname))}>
      <TopNavbar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="w-full min-h-full p-2 md:p-4">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
