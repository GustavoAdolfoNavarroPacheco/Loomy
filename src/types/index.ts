import { StringToBoolean } from "class-variance-authority/types";

// Tipos base
export interface Empresa {
  id: string;
  nombre: string;
  razonSocial: string;
  nit: string;
  sector: string;
  ciudad: string;
  facturacionAnual?: number;
  porcentajeTecnologia?: number;
  requerimientoArchivo?: string;
  createdAt: Date;
}

export interface Cliente {
  id: string;
  empresaId: string;
  nombre: string;
  nombreFacturacion?: string;
  contacto?: string;
  celular: string;
  cargo: string;
  cedula: string;
  rutArchivo?: string;
  camaraComercioArchivo?: string;
  inscripcionClienteArchivo?: string;
  createdAt: Date;
}

export interface Categoria {
  id: string;
  nombre: string;
}

export interface Sector {
  id: string;
  nombre: string;
}

export interface Ciudad {
  id: string;
  nombre: string;
}

export type EtapaProyecto = 'START' | 'DEVELOP';

export type FaseStart = 'trazabilidad' | 'identificacion' | 'alcances' | 'propuesta' | 'cierre' | 'proyeccion' | 'cotizacion';
export type FaseDevelop = 'kickoff' | 'factura1' | 'entrega1' | 'factura2' | 'entrega2' | 'factura3' | 'entrega3' | 'recaudos';
export type FaseProyecto = FaseStart | FaseDevelop;

export interface Estado {
  id: string;
  nombre: string;
}

export interface Comercial {
  id: string;
  nombre: string;
}

export interface Linea {
  id: string;
  nombre: string;
}

export type EstadoProyecto = 'activo' | 'pausado' | 'cerrado' | 'cancelado' | string; // Allow string for custom states

export interface AlcanceItem {
  id: string;
  descripcion: string;
  pdfArchivo?: string;
  fechaInicio?: Date;
  costo?: number;
}

export interface Visita {
  id: string;
  fecha: Date;
  ubicacion: string;
  descripcion: string;
  medio: string;
}

export interface PropuestaData {
  tipo: 'tecnica' | 'comercial';
  pdfArchivo?: string;
  pdfArchivos?: string[];
  archivosComercial?: string[];
  costoAproximado?: number;
}

export interface CierreData {
  precioFinal: number;
  contratoPdf?: string;
  porcentajeFacturacion: number;
  porcentajesDistribucion?: number[];
}

export interface FacturaProyecto {
  id: string;
  fecha: Date;
  valor: number;
  numeroFactura: string;
}

export interface RecaudoProyecto {
  id: string;
  facturaId: string;
  fecha: Date;
  valor: number;
  numeroRecaudo: string;
}

export interface EntregaItem {
  id: string;
  descripcion: string;
  completado: boolean;
  fecha?: Date;
}

export interface CotizacionItem {
  id: string;
  nombre: string;
  fase?: string;
  isOpen?: boolean;
  dias?: Record<string, number>;
  meses?: Record<string, boolean>;
  children?: CotizacionItem[];
}

export type EstadoCotizacion = 'sin_cotizar' | 'solo_estructura' | 'en_proceso' | 'cotizado';

export interface Proyecto {
  id: string;
  nombre: string;
  empresaId: string;
  clienteId?: string;
  categoriaId: string;
  estado: EstadoProyecto;
  estadoCotizacion?: EstadoCotizacion;
  etapaActual: EtapaProyecto;
  faseActual: FaseProyecto;
  etapaGuardada?: EtapaProyecto;
  faseGuardada?: FaseProyecto;
  costo: number;
  valorAproximado: number;
  valorFinal: number;
  porcentajeCierre?: number;
  margenCotizacion?: number;
  trmCotizacion?: number;
  observacionesCotizacion?: string;
  fasesOrden?: {
    id: string;
    type: 'kickoff' | 'factura' | 'entrega' | 'proyeccion';
    label: string
  }[];
  entregasMap?: Record<string, EntregaItem[]>;
  fechasFases?: Record<string, Date>;
  metadataFases?: Record<string, {
    fechaReunion?: Date;
    comentario?: string;
    lastUpdated?: Date | string;
  }>;

  // Datos de fases START
  trazabilidad?: Visita[];
  identificacion?: string;
  alcances: AlcanceItem[];
  propuesta?: PropuestaData;
  cierre?: CierreData;
  cotizacion?: CotizacionItem[];

  // Datos de fases DEVELOP
  kickoffPdf?: string;
  facturas: FacturaProyecto[];
  entrega1: EntregaItem[];
  entrega2: EntregaItem[];
  entrega3: EntregaItem[];

  comercial?: string;
  linea?: string;
  empresaNombre?: string;
  proyeccion?: Record<string, Record<string, number>>;
  probabilidades?: Record<string, Record<string, number>>;
  descripcion?: string;
  fechaInicio?: Date | string;
  recaudos?: RecaudoProyecto[];
  createdAt: Date;
}

// Facturación general
export interface Factura {
  id: string;
  empresaId: string;
  clienteId?: string;
  fecha: Date;
  comercial: string;
  linea: string;
  nit: string;
  empresaNombre: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  valorTotal: number;
  numeroFactura: string;
  createdAt: Date;
}

// Recaudos generales
export interface Recaudo {
  id: string;
  facturaId?: string;
  numeroFactura: string;
  fecha: Date;
  valor: number;
  numeroRecaudo: string;
  empresaNombre: string;
  nit?: string;
  comercial?: string;
  linea?: string;
  metodoPago?: string;
  comentario?: string;
  createdAt: Date;
}

// Cartera (calculada)
export interface CarteraItem {
  numeroFactura: string;
  valor: number;
  recaudoHecho: number;
  carteraPendiente: number;
  empresaNombre?: string;
}

// Metas de facturación y recaudo
export interface Meta {
  id: string;
  mes: string; // "0" - "11"
  anio: string;
  tipo: 'facturacion' | 'recaudo';
  valor: number;
  createdAt: Date;
}

// Tabla Excel
export interface ColumnConfig<T> {
  key: keyof T | string;
  header: React.ReactNode;
  headerLabel?: string; // Standard string for placeholders, tooltips, etc.
  width?: string;
  editable?: boolean;
  type?: 'text' | 'number' | 'date' | 'select' | 'percentage';
  options?: { value: string; label: string }[];
  render?: (value: any, row: T) => React.ReactNode;
  format?: (value: any) => string;
  className?: string;
}

// Proyección de Productos
export interface ProductoProyeccion {
  id: string;
  nombre: string;
  ticketPromedio: number;
  proyeccion?: Record<string, { // clave: "2026_Enero"
    cantidad: number;
    real: number;
    meta: number;
    total?: number;
    probabilidad?: number;
  }>;
  createdAt: Date;
}

// ChatBot types
export interface Chat {
  sessionId: string;
  clientName?: string;
  ai_enabled: boolean;
  lastMessage: string;
  lastSender: 'bot' | 'client' | 'human' | string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  sender: 'bot' | 'client' | 'human' | string;
  text: string;
  timestamp: string;
}

