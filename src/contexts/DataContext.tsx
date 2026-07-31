import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
  Empresa, Cliente, Proyecto, Factura, Recaudo, Categoria, Sector, Ciudad, Estado, Comercial, Linea, Meta, ProductoProyeccion
} from '@/types';
import { SeguimientoEmpresa } from '@/types/seguimiento';
import {
    subscribeToCollection,
    addItem,
    updateItem,
    setItem,
    deleteItem,
    uploadFile as apiUploadFile,
    deleteFile as apiDeleteFile,
    createUser,
    updateUser as apiUpdateUser,
    deleteUser as apiDeleteUser
} from '@/services/dataService';

interface UserPermission {
    id: string; // email
    email: string;
    modifyLocal: boolean;
    modifyInternational: boolean;
    isCotizador: boolean;
}

interface DataContextType {
  // Empresas
  empresas: Empresa[];
  empresasLoading: boolean;
  addEmpresa: (empresa: Omit<Empresa, 'id' | 'createdAt'>) => Promise<void>;
  updateEmpresa: (id: string, data: Partial<Empresa>) => Promise<void>;
  deleteEmpresa: (id: string) => Promise<void>;

  // Seguimiento (empresas en prospección comercial)
  seguimientoEmpresas: SeguimientoEmpresa[];
  seguimientoEmpresasLoading: boolean;
  addSeguimientoEmpresa: (empresa: Omit<SeguimientoEmpresa, 'id' | 'createdAt'>) => Promise<void>;
  updateSeguimientoEmpresa: (id: string, data: Partial<SeguimientoEmpresa>) => Promise<void>;
  deleteSeguimientoEmpresa: (id: string) => Promise<void>;

  // Clientes
  clientes: Cliente[];
  clientesLoading: boolean;
  addCliente: (cliente: Omit<Cliente, 'id' | 'createdAt'>) => Promise<void>;
  updateCliente: (id: string, data: Partial<Cliente>) => Promise<void>;
  deleteCliente: (id: string) => Promise<void>;
  getClientesByEmpresa: (empresaId: string) => Cliente[];

  // Proyectos
  proyectos: Proyecto[];
  addProyecto: (proyecto: Omit<Proyecto, 'id' | 'createdAt'>) => Promise<void>;
  updateProyecto: (id: string, data: Partial<Proyecto>) => Promise<void>;
  deleteProyecto: (id: string) => Promise<void>;

  facturas: Factura[];
  addFactura: (factura: Omit<Factura, 'id' | 'createdAt'>) => Promise<void>;
  updateFactura: (id: string, data: Partial<Factura>) => Promise<void>;
  deleteFactura: (id: string) => Promise<void>;
  
  recaudos: Recaudo[];
  addRecaudo: (recaudo: Omit<Recaudo, 'id' | 'createdAt'>) => Promise<void>;
  updateRecaudo: (id: string, data: Partial<Recaudo>) => Promise<void>;
  deleteRecaudo: (id: string) => Promise<void>;

  metas: Meta[];
  addMeta: (meta: Omit<Meta, 'id' | 'createdAt'>) => Promise<void>;
  updateMeta: (id: string, data: Partial<Meta>) => Promise<void>;
  deleteMeta: (id: string) => Promise<void>;

  // Proyecciones Productos
  productosProyeccion: ProductoProyeccion[];
  addProductoProyeccion: (producto: Omit<ProductoProyeccion, 'id' | 'createdAt'>) => Promise<void>;
  updateProductoProyeccion: (id: string, data: Partial<ProductoProyeccion>) => Promise<void>;
  deleteProductoProyeccion: (id: string) => Promise<void>;

  // Catálogos
  categorias: Categoria[];
  addCategoria: (nombre: string) => Promise<void>;
  updateCategoria: (id: string, nombre: string) => Promise<void>;
  deleteCategoria: (id: string) => Promise<void>;

  sectores: Sector[];
  addSector: (nombre: string) => Promise<void>;
  updateSector: (id: string, nombre: string) => Promise<void>;
  deleteSector: (id: string) => Promise<void>;

  ciudades: Ciudad[];
  addCiudad: (nombre: string) => Promise<void>;
  updateCiudad: (id: string, nombre: string) => Promise<void>;
  deleteCiudad: (id: string) => Promise<void>;

  estados: Estado[];
  addEstado: (nombre: string) => Promise<void>;
  updateEstado: (id: string, nombre: string) => Promise<void>;
  deleteEstado: (id: string) => Promise<void>;

  comerciales: Comercial[];
  addComercial: (nombre: string) => Promise<void>;
  updateComercial: (id: string, nombre: string) => Promise<void>;
  deleteComercial: (id: string) => Promise<void>;

  lineas: Linea[];
  addLinea: (nombre: string) => Promise<void>;
  updateLinea: (id: string, nombre: string) => Promise<void>;
  deleteLinea: (id: string) => Promise<void>;

  // Utils
  // Environment
  environment: 'local' | 'international';
  setEnvironment: (env: 'local' | 'international') => void;
  uploadFile: (file: File, path: string) => Promise<string>;
  deleteFile: (url: string) => Promise<void>;

  // Auth / Users
  allowedUsers: UserPermission[];
  addAllowedUser: (email: string, pass: string, permissions: { modifyLocal: boolean, modifyInternational: boolean, isCotizador: boolean }) => Promise<void>;
  updateAllowedUser: (email: string, data: Partial<{ modifyLocal: boolean, modifyInternational: boolean, isCotizador: boolean }>) => Promise<void>;
  removeAllowedUser: (email: string) => Promise<void>;
  canModify: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { isAuthorized, canModifyLocal, canModifyInternational } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresasLoading, setEmpresasLoading] = useState(true);
  const [seguimientoEmpresas, setSeguimientoEmpresas] = useState<SeguimientoEmpresa[]>([]);
  const [seguimientoEmpresasLoading, setSeguimientoEmpresasLoading] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesLoading, setClientesLoading] = useState(true);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [recaudos, setRecaudos] = useState<Recaudo[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [comerciales, setComerciales] = useState<Comercial[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [productosProyeccion, setProductosProyeccion] = useState<ProductoProyeccion[]>([]);
  const [allowedUsers, setAllowedUsers] = useState<UserPermission[]>([]);
  const [environment, setEnvState] = useState<'local' | 'international'>(
    (localStorage.getItem('app-environment') as 'local' | 'international') || 'local'
  );

  const canModify = environment === 'international' ? canModifyInternational : canModifyLocal;

  const setEnvironment = (env: 'local' | 'international') => {
    setEnvState(env);
    localStorage.setItem('app-environment', env);
  };

  useEffect(() => {
    if (!isAuthorized) {
      setEmpresas([]);
      setEmpresasLoading(true);
      setSeguimientoEmpresas([]);
      setSeguimientoEmpresasLoading(true);
      setClientes([]);
      setClientesLoading(true);
      setProyectos([]);
      setFacturas([]);
      setMetas([]);
      setCategorias([]);
      setSectores([]);
      setCiudades([]);
      setEstados([]);
      setComerciales([]);
      setLineas([]);
      setProductosProyeccion([]);
      setAllowedUsers([]);
      return;
    }

    const prefix = environment === 'international' ? 'int_' : '';

    setEmpresasLoading(true);
    setSeguimientoEmpresasLoading(true);
    setClientesLoading(true);

    // Polling subscriptions via API
    const unsubEmpresas = subscribeToCollection<Empresa>(`${prefix}empresas`, (data) => {
      setEmpresas(data);
      setEmpresasLoading(false);
    }, 'createdAt');
    const unsubSeguimientoEmpresas = subscribeToCollection<SeguimientoEmpresa>(`${prefix}seguimiento_empresas`, (data) => {
      setSeguimientoEmpresas(data);
      setSeguimientoEmpresasLoading(false);
    }, 'createdAt');
    const unsubClientes = subscribeToCollection<Cliente>(`${prefix}clientes`, (data) => {
      setClientes(data);
      setClientesLoading(false);
    }, 'createdAt');
    const unsubProyectos = subscribeToCollection<Proyecto>(`${prefix}proyectos`, setProyectos, 'createdAt');
    const unsubFacturas = subscribeToCollection<Factura>(`${prefix}facturas`, setFacturas, 'createdAt');
    const unsubRecaudos = subscribeToCollection<Recaudo>(`${prefix}recaudos`, setRecaudos, 'createdAt');
    const unsubMetas = subscribeToCollection<Meta>(`${prefix}metas`, setMetas, 'createdAt');

    const unsubCats = subscribeToCollection<Categoria>(`${prefix}categorias`, setCategorias);
    const unsubSectors = subscribeToCollection<Sector>(`${prefix}sectores`, setSectores);
    const unsubCities = subscribeToCollection<Ciudad>(`${prefix}ciudades`, setCiudades);
    const unsubStates = subscribeToCollection<Estado>(`${prefix}estados`, setEstados);
    const unsubComs = subscribeToCollection<Comercial>(`${prefix}comerciales`, setComerciales);
    const unsubLines = subscribeToCollection<Linea>(`${prefix}lineas`, setLineas);
    const unsubProds = subscribeToCollection<ProductoProyeccion>(`${prefix}proyecciones_productos`, setProductosProyeccion);
    
    // Special case for allowed users (not using prefix)
    const unsubUsers = subscribeToCollection<UserPermission>("allowed_users", setAllowedUsers);

    return () => {
      unsubEmpresas(); unsubSeguimientoEmpresas(); unsubClientes(); unsubProyectos(); unsubFacturas(); unsubRecaudos(); unsubMetas();
      unsubCats(); unsubSectors(); unsubCities(); unsubStates(); unsubComs(); unsubLines(); unsubProds();
      unsubUsers();
    };
  }, [isAuthorized, environment]);

  const prefix = environment === 'international' ? 'int_' : '';

  // CRUD Operations using API
  const addEmpresa = async (empresa: Omit<Empresa, 'id' | 'createdAt'>) => {
    if (!canModify) return;
    await addItem(`${prefix}empresas`, empresa);
  };

  const updateEmpresa = async (id: string, data: Partial<Empresa>) => {
    if (!canModify) return;
    await updateItem(`${prefix}empresas`, id, data);
  };

  const deleteEmpresa = async (id: string) => {
    if (!canModify) return;
    await deleteItem(`${prefix}empresas`, id);
  };

  const addSeguimientoEmpresa = async (empresa: Omit<SeguimientoEmpresa, 'id' | 'createdAt'>) => {
    if (!canModify) return;
    await addItem(`${prefix}seguimiento_empresas`, empresa);
  };

  const updateSeguimientoEmpresa = async (id: string, data: Partial<SeguimientoEmpresa>) => {
    if (!canModify) return;
    await updateItem(`${prefix}seguimiento_empresas`, id, data);
  };

  const deleteSeguimientoEmpresa = async (id: string) => {
    if (!canModify) return;
    await deleteItem(`${prefix}seguimiento_empresas`, id);
  };

  const addCliente = async (cliente: Omit<Cliente, 'id' | 'createdAt'>) => {
    if (!canModify) return;
    await addItem(`${prefix}clientes`, cliente);
  };

  const updateCliente = async (id: string, data: Partial<Cliente>) => {
    if (!canModify) return;
    await updateItem(`${prefix}clientes`, id, data);
  };

  const deleteCliente = async (id: string) => {
    if (!canModify) return;
    await deleteItem(`${prefix}clientes`, id);
  };

  const getClientesByEmpresa = (empresaId: string) => {
    return clientes.filter(c => c.empresaId === empresaId);
  };

  const addProyecto = async (proyecto: Omit<Proyecto, 'id' | 'createdAt'>) => {
    if (!canModify) return;
    await addItem(`${prefix}proyectos`, proyecto);
  };

  const updateProyecto = async (id: string, data: Partial<Proyecto>) => {
    if (!canModify) return;
    await setItem(`${prefix}proyectos`, id, data);
  };

  const deleteProyecto = async (id: string) => {
    if (!canModify) return;
    await deleteItem(`${prefix}proyectos`, id);
  };

  const addFactura = async (factura: Omit<Factura, 'id' | 'createdAt'>) => {
    if (!canModify) return;
    await addItem(`${prefix}facturas`, factura);
  };

  const updateFactura = async (id: string, data: Partial<Factura>) => {
    if (!canModify) return;
    await updateItem(`${prefix}facturas`, id, data);
  };

  const deleteFactura = async (id: string) => {
    if (!canModify) return;
    await deleteItem(`${prefix}facturas`, id);
  };

  const addRecaudo = async (recaudo: Omit<Recaudo, 'id' | 'createdAt'>) => {
    if (!canModify) return;
    await addItem(`${prefix}recaudos`, recaudo);
  };

  const updateRecaudo = async (id: string, data: Partial<Recaudo>) => {
    if (!canModify) return;
    await updateItem(`${prefix}recaudos`, id, data);
  };

  const deleteRecaudo = async (id: string) => {
    if (!canModify) return;
    await deleteItem(`${prefix}recaudos`, id);
  };

  const addMeta = async (meta: Omit<Meta, 'id' | 'createdAt'>) => {
    if (!canModify) return;
    await addItem(`${prefix}metas`, meta);
  };

  const updateMeta = async (id: string, data: Partial<Meta>) => {
    if (!canModify) return;
    await updateItem(`${prefix}metas`, id, data);
  };

  const deleteMeta = async (id: string) => {
    if (!canModify) return;
    await deleteItem(`${prefix}metas`, id);
  };

  const addProductoProyeccion = async (producto: Omit<ProductoProyeccion, 'id' | 'createdAt'>) => {
    if (!canModify) return;
    await addItem(`${prefix}proyecciones_productos`, producto);
  };

  const updateProductoProyeccion = async (id: string, data: Partial<ProductoProyeccion>) => {
    if (!canModify) return;
    await setItem(`${prefix}proyecciones_productos`, id, data);
  };

  const deleteProductoProyeccion = async (id: string) => {
    if (!canModify) return;
    await deleteItem(`${prefix}proyecciones_productos`, id);
  };

  // Catalog operations
  const addCategoria = async (nombre: string) => { if (!canModify) return; await addItem(`${prefix}categorias`, { nombre }); };
  const updateCategoria = async (id: string, nombre: string) => { if (!canModify) return; await updateItem(`${prefix}categorias`, id, { nombre }); };
  const deleteCategoria = async (id: string) => { if (!canModify) return; await deleteItem(`${prefix}categorias`, id); };

  const addSector = async (nombre: string) => { if (!canModify) return; await addItem(`${prefix}sectores`, { nombre }); };
  const updateSector = async (id: string, nombre: string) => { if (!canModify) return; await updateItem(`${prefix}sectores`, id, { nombre }); };
  const deleteSector = async (id: string) => { if (!canModify) return; await deleteItem(`${prefix}sectores`, id); };

  const addCiudad = async (nombre: string) => { if (!canModify) return; await addItem(`${prefix}ciudades`, { nombre }); };
  const updateCiudad = async (id: string, nombre: string) => { if (!canModify) return; await updateItem(`${prefix}ciudades`, id, { nombre }); };
  const deleteCiudad = async (id: string) => { if (!canModify) return; await deleteItem(`${prefix}ciudades`, id); };

  const addEstado = async (nombre: string) => { if (!canModify) return; await addItem(`${prefix}estados`, { nombre }); };
  const updateEstado = async (id: string, nombre: string) => { if (!canModify) return; await updateItem(`${prefix}estados`, id, { nombre }); };
  const deleteEstado = async (id: string) => { if (!canModify) return; await deleteItem(`${prefix}estados`, id); };

  const addComercial = async (nombre: string) => { if (!canModify) return; await addItem(`${prefix}comerciales`, { nombre }); };
  const updateComercial = async (id: string, nombre: string) => { if (!canModify) return; await updateItem(`${prefix}comerciales`, id, { nombre }); };
  const deleteComercial = async (id: string) => { if (!canModify) return; await deleteItem(`${prefix}comerciales`, id); };

  const addLinea = async (nombre: string) => { if (!canModify) return; await addItem(`${prefix}lineas`, { nombre }); };
  const updateLinea = async (id: string, nombre: string) => { if (!canModify) return; await updateItem(`${prefix}lineas`, id, { nombre }); };
  const deleteLinea = async (id: string) => { if (!canModify) return; await deleteItem(`${prefix}lineas`, id); };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    return await apiUploadFile(file, path);
  };

  const deleteFile = async (url: string): Promise<void> => {
    await apiDeleteFile(url);
  };

  const addAllowedUser = async (email: string, pass: string, permissions: { modifyLocal: boolean, modifyInternational: boolean, isCotizador: boolean }) => {
    const normalized = email.toLowerCase().trim();
    
    // Crear usuario en la tabla users (login)
    await createUser({ email: normalized, password: pass, ...permissions });
    
    // Guardar permisos en la colección allowed_users
    await setItem("allowed_users", normalized, { email: normalized, ...permissions, createdAt: new Date() });
  };

  const updateAllowedUser = async (email: string, data: Partial<{ modifyLocal: boolean, modifyInternational: boolean, isCotizador: boolean }>) => {
    // Sincroniza permisos en la tabla users (login) y en la colección allowed_users (UI)
    await apiUpdateUser(email, data);
    await updateItem("allowed_users", email, data);
  };

  const removeAllowedUser = async (email: string) => {
    // Elimina el acceso real (tabla users) y el registro visible (colección)
    await apiDeleteUser(email);
    await deleteItem("allowed_users", email);
  };

  return (
    <DataContext.Provider value={{
      environment, setEnvironment,
      empresas, empresasLoading, addEmpresa, updateEmpresa, deleteEmpresa,
      seguimientoEmpresas, seguimientoEmpresasLoading, addSeguimientoEmpresa, updateSeguimientoEmpresa, deleteSeguimientoEmpresa,
      clientes, clientesLoading, addCliente, updateCliente, deleteCliente, getClientesByEmpresa,
      proyectos, addProyecto, updateProyecto, deleteProyecto,
      facturas, addFactura, updateFactura, deleteFactura,
      recaudos, addRecaudo, updateRecaudo, deleteRecaudo,
      metas, addMeta, updateMeta, deleteMeta,
      categorias, addCategoria, updateCategoria, deleteCategoria,
      sectores, addSector, updateSector, deleteSector,
      ciudades, addCiudad, updateCiudad, deleteCiudad,
      estados, addEstado, updateEstado, deleteEstado,
      comerciales, addComercial, updateComercial, deleteComercial,
      lineas, addLinea, updateLinea, deleteLinea,
      productosProyeccion, addProductoProyeccion, updateProductoProyeccion, deleteProductoProyeccion,
      uploadFile, deleteFile,
      allowedUsers, addAllowedUser, updateAllowedUser, removeAllowedUser,
      canModify
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
