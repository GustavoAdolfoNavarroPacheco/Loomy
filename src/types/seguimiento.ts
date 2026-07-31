// Tipos para el módulo de Seguimiento (empresas en prospección comercial)

export interface ContactoSeguimiento {
  id: string;
  nombre: string;
  cargo?: string;
  comentario?: string;
  fechaAgregado?: Date;
}

export interface NotaEtapaEntry {
  id: string;
  texto: string;
  fecha: Date;
}

export interface DocumentoAdjunto {
  id: string;
  nombre: string;
  url: string;
  tipo: string;
  fechaSubida: Date;
}

export interface SeguimientoEmpresa {
  id: string;

  // Datos de la empresa (tabla principal)
  nombreComercial: string;
  razonSocial: string;
  nit: string;
  sector: string; // id del catálogo `sectores`
  ciudad: string; // id del catálogo `ciudades`
  facturacionAnual?: number;
  porcentajeTecnologia?: number;
  requerimientoArchivo?: string;
  documentos?: DocumentoAdjunto[];

  // Info Empresa: seguimiento comercial
  /** Se autocompleta con la fecha del primer contacto agregado; no es editable manualmente. */
  fecha?: Date;
  /** @deprecated usar `contactos` — se conserva para compatibilidad con registros antiguos */
  contacto?: string;
  /** @deprecated usar `contactos` — se conserva para compatibilidad con registros antiguos */
  cargo?: string;
  contactos?: ContactoSeguimiento[];
  conexion?: boolean;
  /** @deprecated usar `notasEtapas['0']` — se conserva como respaldo para registros antiguos */
  notaConexion?: string;
  /** Historial de notas por etapa del stepper, clave = índice de SEGUIMIENTO_STAGES ('0'..'4') */
  notasEtapas?: Record<string, NotaEtapaEntry[]>;
  /** true = el avance está "guardado" (bloqueado): el stepper solo navega entre etapas sin modificar el progreso real */
  avanceGuardado?: boolean;
  pendientesAceptadas?: boolean;
  primerMensaje?: boolean;
  pitch?: boolean;
  whatsapp?: boolean;
  reunion?: boolean;
  fechaReunion?: Date;
  cotizado?: boolean;
  montoCotizado?: number;
  observaciones?: string;

  createdAt: Date;
}

export type EtapaSeguimiento =
  | 'Sin Contacto'
  | 'Conexión'
  | '1er Mensaje'
  | 'Pitch / WhatsApp'
  | 'Reunión'
  | 'Cotizado';

export const SEGUIMIENTO_ETAPAS_ORDER: EtapaSeguimiento[] = [
  'Sin Contacto',
  'Conexión',
  '1er Mensaje',
  'Pitch / WhatsApp',
  'Reunión',
  'Cotizado',
];

type EtapaFlags = Pick<SeguimientoEmpresa, 'conexion' | 'primerMensaje' | 'pitch' | 'whatsapp' | 'reunion' | 'cotizado'>;

// Determina la etapa comercial vigente tomando la más avanzada entre las marcadas.
export function getEtapaSeguimiento(empresa: EtapaFlags): EtapaSeguimiento {
  if (empresa.cotizado) return 'Cotizado';
  if (empresa.reunion) return 'Reunión';
  if (empresa.pitch || empresa.whatsapp) return 'Pitch / WhatsApp';
  if (empresa.primerMensaje) return '1er Mensaje';
  if (empresa.conexion) return 'Conexión';
  return 'Sin Contacto';
}

export interface SeguimientoStageDef {
  etapa: Exclude<EtapaSeguimiento, 'Sin Contacto'>;
  fields: (keyof EtapaFlags)[];
}

// Define, en orden, qué campo(s) booleanos representa cada escalón del stepper evolutivo.
// 'Pitch / WhatsApp' es un único escalón respaldado por dos campos (cualquiera de los dos lo marca como alcanzado).
export const SEGUIMIENTO_STAGES: SeguimientoStageDef[] = [
  { etapa: 'Conexión', fields: ['conexion'] },
  { etapa: '1er Mensaje', fields: ['primerMensaje'] },
  { etapa: 'Pitch / WhatsApp', fields: ['pitch', 'whatsapp'] },
  { etapa: 'Reunión', fields: ['reunion'] },
  { etapa: 'Cotizado', fields: ['cotizado'] },
];

// Índice (0-based sobre SEGUIMIENTO_STAGES) de la etapa más avanzada alcanzada; -1 = Sin Contacto.
export function getEtapaIndex(empresa: EtapaFlags): number {
  let index = -1;
  SEGUIMIENTO_STAGES.forEach((stage, i) => {
    if (stage.fields.some(f => empresa[f])) index = i;
  });
  return index;
}

// Mapeo de columnas del Excel a campos de SeguimientoEmpresa (para importación masiva)
export const SEGUIMIENTO_EXCEL_COLUMN_MAP: Record<string, keyof Pick<SeguimientoEmpresa,
  'nombreComercial' | 'razonSocial' | 'nit' | 'facturacionAnual' | 'porcentajeTecnologia'
>> = {
  'Nombre Comercial': 'nombreComercial',
  'Razón Social': 'razonSocial',
  'Razon Social': 'razonSocial',
  'NIT': 'nit',
  'Facturacion Anual Aprox.': 'facturacionAnual',
  'Facturación Anual Aprox.': 'facturacionAnual',
  '% Tecnologia': 'porcentajeTecnologia',
  '% Tecnología': 'porcentajeTecnologia',
};
