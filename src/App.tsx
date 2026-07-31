import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DataProvider } from "@/contexts/DataContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import { useEffect } from "react";
import { toast } from "sonner";

import LoginPage from "@/features/auth/pages/LoginPage";
import EmpresasPage from "@/features/empresas/pages/EmpresasPage";
import ClientesPage from "@/features/clientes/pages/ClientesPage";
import ClientesGlobalPage from "@/features/clientes/pages/ClientesGlobalPage";
import ProyectosPage from "@/features/proyectos/pages/ProyectosPage";
import SeguimientoPage from "@/features/proyectos/pages/SeguimientoPage";
import FacturacionPage from "@/features/finanzas/pages/FacturacionPage";
import RecaudosPage from "@/features/finanzas/pages/RecaudosPage";
import CarteraPage from "@/features/finanzas/pages/CarteraPage";
import MetricasProyectosPage from "@/features/proyectos/pages/MetricasProyectosPage";
import MetricasEmpresasPage from "@/features/empresas/pages/MetricasEmpresasPage";
import MetricasCarteraPage from "@/features/finanzas/pages/MetricasCarteraPage";
import MetricasRecaudoPage from "@/features/finanzas/pages/MetricasRecaudoPage";
import ConfiguracionPage from "@/features/configuracion/pages/ConfiguracionPage";
import ProyeccionPage from "@/features/proyectos/pages/ProyeccionPage";
import ListaClientesPage from "@/features/clientes/pages/ListaClientesPage";
import MetricasComercialPage from "@/features/comercial/pages/MetricasComercialPage";
import SeguimientoEmpresasPage from "@/features/seguimiento/pages/SeguimientoEmpresasPage";
import InfoEmpresaPage from "@/features/seguimiento/pages/InfoEmpresaPage";
import NotFound from "@/features/core/pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const handleOnline = () => {
      toast.dismiss("offline-toast");
      toast.success("Conexión restablecida", {
        description: "Se ha recuperado la conexión a Internet.",
      });
    };

    const handleOffline = () => {
      toast.warning("Sin conexión a Internet", {
        description: "No se pueden cargar datos nuevos mientras estés sin conexión.",
        duration: Infinity,
        id: "offline-toast",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    if (!navigator.onLine) {
      toast.warning("Sin conexión a Internet", {
        description: "No se pueden cargar datos nuevos mientras estés sin conexión.",
        duration: Infinity,
        id: "offline-toast",
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);


  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
      <AuthProvider>
        <DataProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Routes>
                        <Route path="/" element={<Navigate to="/empresas" replace />} />
                        <Route path="/proyeccion" element={<ProyeccionPage />} />
                        <Route path="/lista-clientes" element={<ListaClientesPage />} />
                        <Route path="/empresas" element={<EmpresasPage />} />
                        <Route path="/seguimiento" element={<SeguimientoEmpresasPage />} />
                        <Route path="/seguimiento/:empresaId" element={<InfoEmpresaPage />} />
                        <Route path="/empresas/:empresaId/clientes" element={<ClientesPage />} />
                        <Route path="/clientes" element={<ClientesGlobalPage />} />
                        <Route path="/proyectos" element={<ProyectosPage />} />
                        <Route path="/proyectos/:proyectoId/seguimiento" element={<SeguimientoPage />} />
                        <Route path="/facturacion" element={<FacturacionPage />} />
                        <Route path="/recaudos" element={<RecaudosPage />} />
                        <Route path="/cartera" element={<CarteraPage />} />
                        <Route path="/metricas/proyectos" element={<MetricasProyectosPage />} />
                        <Route path="/metricas/empresas" element={<MetricasEmpresasPage />} />
                        <Route path="/metricas/cartera" element={<MetricasCarteraPage />} />
                        <Route path="/metricas/recaudo" element={<MetricasRecaudoPage />} />
                        <Route path="/metricas/comercial" element={<MetricasComercialPage />} />
                        <Route path="/configuracion" element={<ConfiguracionPage />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </DataProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
