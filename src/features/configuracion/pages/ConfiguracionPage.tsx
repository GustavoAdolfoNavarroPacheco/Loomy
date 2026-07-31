import { useState } from 'react';
import { Plus, Trash2, Loader2, Target, ShieldCheck, Pencil } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { CatalogManager } from '@/features/configuracion/components/CatalogManager';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const availableYears = ['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'];

interface UserPermission {
    id: string;
    email: string;
    modifyLocal: boolean;
    modifyInternational: boolean;
    isCotizador: boolean;
}

export default function ConfiguracionPage() {
  const {
    categorias, addCategoria, updateCategoria, deleteCategoria,
    sectores, addSector, updateSector, deleteSector,
    ciudades, addCiudad, updateCiudad, deleteCiudad,
    estados, addEstado, updateEstado, deleteEstado,
    comerciales, addComercial, updateComercial, deleteComercial,
    lineas, addLinea, updateLinea, deleteLinea,
    metas, addMeta, deleteMeta,
    allowedUsers, addAllowedUser, updateAllowedUser, removeAllowedUser
  } = useData();
  const { isMarianaOrHector } = useAuth();
  const { toast } = useToast();

  // Estados para Nueva Meta
  const [newMetaMes, setNewMetaMes] = useState('1'); // Febrero por defecto
  const [newMetaAnio, setNewMetaAnio] = useState('2026');
  const [newMetaTipo, setNewMetaTipo] = useState<'facturacion' | 'recaudo'>('facturacion');
  const [newMetaValor, setNewMetaValor] = useState(0);

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newPermissions, setNewPermissions] = useState({
    modifyLocal: false,
    modifyInternational: false,
    isCotizador: false
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // Estado para edición de usuario
  const [editingUser, setEditingUser] = useState<UserPermission | null>(null);

  const handleAddAllowedUser = async () => {
    if (!newUserEmail.trim() || !newUserEmail.includes('@') || !newUserPassword.trim()) return;
    setIsSaving(true);
    try {
      await addAllowedUser(newUserEmail, newUserPassword, newPermissions);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewPermissions({ modifyLocal: false, modifyInternational: false, isCotizador: false });
      toast({ title: "Acceso Concedido", description: `El usuario ${newUserEmail} ahora puede ingresar.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo autorizar al usuario." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMeta = async () => {
    if (newMetaValor <= 0) return;
    setIsSaving(true);
    try {
      await addMeta({
        mes: newMetaMes,
        anio: newMetaAnio,
        tipo: newMetaTipo,
        valor: newMetaValor
      });
      setNewMetaValor(0);
      toast({ title: "Agregado", description: "La meta ha sido guardada." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo agregar la meta." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveUser = async (email: string) => {
    if (confirm(`¿Revocar acceso al usuario ${email}?`)) {
      try {
        await removeAllowedUser(email);
        toast({ title: "Acceso Revocado", description: "El usuario ya no tiene acceso al sistema." });
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo revocar el acceso." });
      }
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden">
      <div className="shrink-0">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">Configuración</h2>
        <p className="text-xs md:text-sm text-muted-foreground">Gestione los catálogos del sistema</p>
      </div>

      <Tabs defaultValue="categorias" className="flex-1 min-h-0 flex flex-col">
        <TabsList className="shrink-0 flex-wrap h-auto p-1 bg-muted/50">
          <TabsTrigger value="categorias">Categorías</TabsTrigger>
          <TabsTrigger value="sectores">Sectores</TabsTrigger>
          <TabsTrigger value="ciudades">Ciudades</TabsTrigger>
          <TabsTrigger value="estados">Estados Proyecto</TabsTrigger>
          <TabsTrigger value="comerciales">Comerciales</TabsTrigger>
          <TabsTrigger value="lineas">Líneas</TabsTrigger>
          <TabsTrigger value="metas">Metas</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 mt-4 overflow-hidden">
          <TabsContent value="categorias" className="h-full m-0">
            <CatalogManager
              title="Categorías de Proyectos"
              placeholder="Nueva categoría..."
              items={categorias}
              onAdd={addCategoria}
              onUpdate={updateCategoria}
              onDelete={deleteCategoria}
              isReadOnly={isMarianaOrHector}
            />
          </TabsContent>

          <TabsContent value="sectores" className="h-full m-0">
            <CatalogManager
              title="Sectores Empresariales"
              placeholder="Nuevo sector..."
              items={sectores}
              onAdd={addSector}
              onUpdate={updateSector}
              onDelete={deleteSector}
              isReadOnly={isMarianaOrHector}
            />
          </TabsContent>

          <TabsContent value="ciudades" className="h-full m-0">
            <CatalogManager
              title="Ciudades"
              placeholder="Nueva ciudad..."
              items={ciudades}
              onAdd={addCiudad}
              onUpdate={updateCiudad}
              onDelete={deleteCiudad}
              isReadOnly={isMarianaOrHector}
            />
          </TabsContent>

          <TabsContent value="estados" className="h-full m-0">
            <CatalogManager
              title="Estados de Proyecto"
              placeholder="Nuevo estado..."
              items={estados}
              onAdd={addEstado}
              onUpdate={updateEstado}
              onDelete={deleteEstado}
              isReadOnly={isMarianaOrHector}
            />
          </TabsContent>

          <TabsContent value="comerciales" className="h-full m-0">
            <CatalogManager
              title="Comerciales"
              placeholder="Nuevo comercial..."
              items={comerciales}
              onAdd={addComercial}
              onUpdate={updateComercial}
              onDelete={deleteComercial}
              isReadOnly={isMarianaOrHector}
            />
          </TabsContent>

          <TabsContent value="lineas" className="h-full m-0">
            <CatalogManager
              title="Líneas de Negocio"
              placeholder="Nueva línea..."
              items={lineas}
              onAdd={addLinea}
              onUpdate={updateLinea}
              onDelete={deleteLinea}
              isReadOnly={isMarianaOrHector}
            />
          </TabsContent>

          <TabsContent value="usuarios" className="h-full m-0">
            <Card className="h-full flex flex-col">
              <CardHeader className="py-3 px-6 shrink-0 border-b">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Control de Acceso
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 space-y-6 p-6 overflow-hidden flex flex-col">
                {!isMarianaOrHector && (
                  <div className="flex flex-col gap-4 bg-muted/30 p-4 rounded-lg border shrink-0">
                    <div className="flex gap-2">
                        <Input
                          placeholder="correo@ejemplo.com"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          className="bg-background h-9"
                        />
                        <Input
                          type="password"
                          placeholder="Contraseña"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          className="bg-background h-9"
                        />
                        <Button size="sm" onClick={handleAddAllowedUser} disabled={!newUserEmail.trim() || !newUserPassword.trim() || isSaving} className="h-9">
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                          Autorizar
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2">
                        <div className="flex items-center gap-2">
                            <Checkbox 
                                id="perm-local" 
                                checked={newPermissions.modifyLocal} 
                                onCheckedChange={(checked) => setNewPermissions({...newPermissions, modifyLocal: !!checked})}
                            />
                            <Label htmlFor="perm-local" className="text-xs cursor-pointer">Modificar Local</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox 
                                id="perm-int" 
                                checked={newPermissions.modifyInternational} 
                                onCheckedChange={(checked) => setNewPermissions({...newPermissions, modifyInternational: !!checked})}
                            />
                            <Label htmlFor="perm-int" className="text-xs cursor-pointer">Modificar Internacional</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox 
                                id="perm-cot" 
                                checked={newPermissions.isCotizador} 
                                onCheckedChange={(checked) => setNewPermissions({...newPermissions, isCotizador: !!checked})}
                            />
                            <Label htmlFor="perm-cot" className="text-xs cursor-pointer">Acceso Cotizador</Label>
                        </div>
                    </div>
                  </div>
                )}

                <div className="flex-1 min-h-0 flex flex-col gap-2">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">Lista de Autorizados</h4>
                  <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
                      {allowedUsers.map(user => (
                        <div key={user.id} className="flex flex-col p-3 border rounded-lg bg-background hover:bg-muted/10 transition-colors group gap-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                              <span className="text-sm font-medium">{user.email || user.id}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {!isMarianaOrHector && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => setEditingUser(user)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleRemoveUser(user.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                            {user.modifyLocal && <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-bold">LOCAL</span>}
                            {user.modifyInternational && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold">INT.</span>}
                            {user.isCotizador && <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-bold">COTIZ.</span>}
                            {!user.modifyLocal && !user.modifyInternational && !user.isCotizador && <span>Sin permisos</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Modal de Edición de Permisos */}
                {editingUser && (
                  <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Editar Permisos</DialogTitle>
                        <CardDescription>
                          Modifica los permisos para {editingUser.email || editingUser.id}
                        </CardDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="flex items-center gap-2">
                            <Checkbox 
                                id="edit-perm-local" 
                                checked={editingUser.modifyLocal} 
                                onCheckedChange={(checked) => setEditingUser({...editingUser, modifyLocal: !!checked})}
                            />
                            <Label htmlFor="edit-perm-local" className="text-sm cursor-pointer">Modificar Local</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox 
                                id="edit-perm-int" 
                                checked={editingUser.modifyInternational} 
                                onCheckedChange={(checked) => setEditingUser({...editingUser, modifyInternational: !!checked})}
                            />
                            <Label htmlFor="edit-perm-int" className="text-sm cursor-pointer">Modificar Internacional</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox 
                                id="edit-perm-cot" 
                                checked={editingUser.isCotizador} 
                                onCheckedChange={(checked) => setEditingUser({...editingUser, isCotizador: !!checked})}
                            />
                            <Label htmlFor="edit-perm-cot" className="text-sm cursor-pointer">Acceso Cotizador</Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
                        <Button onClick={async () => {
                            await updateAllowedUser(editingUser.id, {
                                modifyLocal: editingUser.modifyLocal,
                                modifyInternational: editingUser.modifyInternational,
                                isCotizador: editingUser.isCotizador
                            });
                            setEditingUser(null);
                            toast({ title: "Guardado", description: "Permisos actualizados correctamente." });
                        }}>Guardar Cambios</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metas" className="h-full m-0">
            <Card className="h-full flex flex-col">
              <CardHeader className="py-3 px-6 shrink-0 border-b">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Target className="h-4 w-4 text-primary" />
                  Gestión de Metas
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 space-y-6 p-6 overflow-hidden flex flex-col">
                {!isMarianaOrHector && (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-muted/30 p-4 rounded-lg border shrink-0">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Año</label>
                      <Select value={newMetaAnio} onValueChange={setNewMetaAnio}>
                        <SelectTrigger className="bg-background h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Mes</label>
                      <Select value={newMetaMes} onValueChange={setNewMetaMes}>
                        <SelectTrigger className="bg-background h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {meses.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Tipo</label>
                      <Select value={newMetaTipo} onValueChange={(v: any) => setNewMetaTipo(v)}>
                        <SelectTrigger className="bg-background h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="facturacion">Facturación</SelectItem>
                          <SelectItem value="recaudo">Recaudo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Valor</label>
                      <CurrencyInput
                        value={newMetaValor}
                        onChange={setNewMetaValor}
                        className="bg-background h-9 text-xs"
                      />
                    </div>
                    <Button size="sm" onClick={handleAddMeta} disabled={newMetaValor <= 0 || isSaving} className="w-full h-9">
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                      Definir
                    </Button>
                  </div>
                )}

                <div className="flex-1 min-h-0 flex flex-col gap-2">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">Metas Definidas</h4>
                  <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                    {metas.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground bg-muted/10 rounded-lg border border-dashed text-sm">No hay metas definidas aún.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
                        {metas.sort((a, b) => {
                          if (a.anio !== b.anio) return b.anio.localeCompare(a.anio);
                          return parseInt(b.mes) - parseInt(a.mes);
                        }).map(meta => (
                          <div key={meta.id} className="flex items-center justify-between p-3 border rounded-lg bg-background hover:shadow-sm transition-all group">
                            <div>
                              <p className="font-bold text-sm capitalize">
                                {meses[parseInt(meta.mes)]} {meta.anio}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={cn(
                                  "text-[9px] uppercase font-bold px-1.5 py-0.5 rounded",
                                  meta.tipo === 'facturacion' ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                                )}>
                                  {meta.tipo === 'facturacion' ? 'Facturación' : 'Recaudo'}
                                </span>
                                <span className="text-sm font-mono font-medium">
                                  ${meta.valor.toLocaleString('es-CO')}
                                </span>
                              </div>
                            </div>
                            {!isMarianaOrHector && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => deleteMeta(meta.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
