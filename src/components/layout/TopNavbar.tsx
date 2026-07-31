import { NavLink, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Building2,
  FolderKanban,
  Receipt,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  Users,
  Globe,
  MapPin,
  ChevronDown,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mainMenuItems = [
  { title: 'Empresas', url: '/empresas', icon: Building2 },
  { title: 'Seguimiento', url: '/seguimiento', icon: ClipboardList },
  { title: 'Proyectos', url: '/proyectos', icon: FolderKanban },
  { title: 'Facturación', url: '/facturacion', icon: Receipt },
  { title: 'Recaudos', url: '/recaudos', icon: Wallet },
  { title: 'Cartera', url: '/cartera', icon: Wallet },
  { title: 'Proyección', url: '/proyeccion', icon: BarChart3 },
  { title: 'Clientes', url: '/clientes', icon: Users },
];

const metricasItems = [
  { title: 'Proyectos', url: '/metricas/proyectos', icon: BarChart3 },
  { title: 'Empresas', url: '/metricas/empresas', icon: BarChart3 },
  { title: 'Cartera', url: '/metricas/cartera', icon: BarChart3 },
  { title: 'Recaudo', url: '/metricas/recaudo', icon: BarChart3 },
  { title: 'Comercial', url: '/metricas/comercial', icon: BarChart3 },
];

export function TopNavbar() {
  const { logout, currentUser, canModifyInternational, canModifyLocal, isCotizador, isMarianaOrHector, isHector } = useAuth();
  const { environment, setEnvironment, canModify } = useData();
  const location = useLocation();

  const filteredMainMenu = mainMenuItems
    .filter(i => !isCotizador || ['Proyectos', 'Facturación', 'Proyección'].includes(i.title));

  const filteredMetricas = metricasItems;

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-card/90 backdrop-blur-md shadow-sm">
      <div className="w-full px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo / Brand */}
        <div className="flex items-center gap-2 font-bold text-xl text-foreground shrink-0">
          <FolderKanban className="h-6 w-6 text-primary" />
          <span className="hidden sm:inline-block">Loomy</span>
          <span className="hidden md:inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
            Demo
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
          {filteredMainMenu.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              className={({ isActive }) => cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive 
                  ? "bg-foreground text-background shadow-sm" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </NavLink>
          ))}

          {/* Metrics Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium h-9",
                  location.pathname.startsWith('/metricas') && "bg-muted text-foreground"
                )}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Métricas</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Indicadores</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {filteredMetricas.map((item) => (
                <DropdownMenuItem key={item.url} asChild>
                  <NavLink to={item.url} className="flex items-center gap-2 w-full cursor-pointer">
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </NavLink>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Environment Toggles */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex bg-muted p-1 rounded-lg">
              <Button
                variant={environment === 'local' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setEnvironment('local')}
                className="h-7 px-2 text-[10px] uppercase font-bold"
                title="Local"
              >
                <MapPin className="h-3 w-3 mr-1" />
                Local
              </Button>
              <Button
                variant={environment === 'international' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setEnvironment('international')}
                className="h-7 px-2 text-[10px] uppercase font-bold"
                title="Internacional"
              >
                <Globe className="h-3 w-3 mr-1" />
                Intl
              </Button>
            </div>
            
            {/* Read/Write Badge */}
            <div className={cn(
              "hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9px] uppercase font-bold tracking-tight",
              canModify 
                ? "bg-secondary border-border text-foreground" 
                : "bg-muted border-border text-muted-foreground"
            )}>
              {canModify ? 'Modo Escritura' : 'Sólo Lectura'}
            </div>
          </div>

          <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

          {/* User / Settings / Logout */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full overflow-hidden border border-muted-foreground/10">
                <div className="bg-primary/10 text-primary h-full w-full flex items-center justify-center text-xs font-bold uppercase transition-colors hover:bg-primary/20">
                  {currentUser?.email?.charAt(0) || 'U'}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Mi Cuenta</p>
                  <p className="text-xs leading-none text-muted-foreground truncate">{currentUser?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {!isMarianaOrHector && !isHector && (
                <>
                  <DropdownMenuItem asChild>
                    <NavLink to="/configuracion" className="flex items-center gap-2 w-full cursor-pointer">
                      <Settings className="h-4 w-4" />
                      <span>Configuración</span>
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Trigger */}
          <div className="lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[80vw] max-w-xs">
                {filteredMainMenu.map((item) => (
                  <DropdownMenuItem key={item.url} asChild>
                    <NavLink to={item.url} className="flex items-center gap-2 w-full py-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {filteredMetricas.map((item) => (
                  <DropdownMenuItem key={item.url} asChild>
                    <NavLink to={item.url} className="flex items-center gap-2 w-full py-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
