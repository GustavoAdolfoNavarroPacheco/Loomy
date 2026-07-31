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
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';

const mainMenuItems = [
  { title: 'Empresas', url: '/empresas', icon: Building2 },
  { title: 'Proyectos', url: '/proyectos', icon: FolderKanban },
  { title: 'Facturación', url: '/facturacion', icon: Receipt },
  { title: 'Cartera', url: '/cartera', icon: Wallet },
  { title: 'Proyección', url: '/proyeccion', icon: BarChart3 },
  { title: 'Clientes', url: '/clientes', icon: Users },
];

const metricasItems = [
  { title: 'Proyectos', url: '/metricas/proyectos', icon: BarChart3 },
  { title: 'Empresas', url: '/metricas/empresas', icon: BarChart3 },
  { title: 'Cartera', url: '/metricas/cartera', icon: BarChart3 },
  { title: 'Recaudo', url: '/metricas/recaudo', icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { logout, currentUser, isCotizador, isMarianaOrHector, isHector } = useAuth();
  const { environment, setEnvironment } = useData();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const filteredMainMenu = mainMenuItems
    .filter(i => !isCotizador || ['Proyectos', 'Facturación', 'Proyección'].includes(i.title));

  const filteredMetricas = metricasItems;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupLabel className={cn(collapsed && 'sr-only')}>
            Módulos
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMainMenu.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className={cn(collapsed && 'sr-only')}>
            Métricas
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMetricas.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <div className={cn("flex flex-col gap-1 p-2 mb-2 bg-muted/50 rounded-lg", collapsed && "p-1")}>
                  {!collapsed && <p className="text-[10px] font-bold text-muted-foreground uppercase px-2 mb-1">Entorno</p>}
                  <div className={cn("flex gap-1", collapsed && "flex-col items-center")}>
                    <Button
                      variant={environment === 'local' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setEnvironment('local')}
                      className={cn("flex-1 h-8 px-2 gap-2 justify-start", collapsed && "w-8 p-0 justify-center")}
                      title="Local"
                    >
                      <MapPin className="h-4 w-4" />
                      {!collapsed && <span className="text-xs">Local</span>}
                    </Button>
                    <Button
                      variant={environment === 'international' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setEnvironment('international')}
                      className={cn("flex-1 h-8 px-2 gap-2 justify-start", collapsed && "w-8 p-0 justify-center")}
                      title="Internacional"
                    >
                      <Globe className="h-4 w-4" />
                      {!collapsed && <span className="text-xs">Internacional</span>}
                    </Button>
                  </div>
                </div>
              </SidebarMenuItem>
              {!isMarianaOrHector && !isHector && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/configuracion')}
                    tooltip="Configuración"
                  >
                    <NavLink to="/configuracion">
                      <Settings className="h-4 w-4" />
                      <span>Configuración</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => logout()}
                  tooltip="Cerrar Sesión"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {currentUser && !collapsed && (
          <div className="px-4 py-2 mt-2 border-t border-border">
            <p className="text-xs text-muted-foreground truncate" title={currentUser.email || ''}>
              {currentUser.email}
            </p>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
