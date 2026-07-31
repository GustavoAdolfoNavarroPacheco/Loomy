// Tipos para el módulo de Dashboard Comercial

export type EtapaComercial =
  | 'Contactado'
  | 'Reunión Agendada'
  | 'Oportunidad Abierta'
  | 'Negociación'
  | 'Venta Cerrada'
  | 'Perdido';

export const ETAPAS_COMERCIALES: EtapaComercial[] = [
  'Contactado',
  'Reunión Agendada',
  'Oportunidad Abierta',
  'Negociación',
  'Venta Cerrada',
  'Perdido',
];

// Orden del embudo (de más abierto a más cerrado)
export const ETAPAS_FUNNEL_ORDER: EtapaComercial[] = [
  'Contactado',
  'Reunión Agendada',
  'Oportunidad Abierta',
  'Negociación',
  'Venta Cerrada',
];

export interface DatoComercial {
  id: string;
  empresa: string;
  sector: string;
  fechaContacto: Date;
  etapa: EtapaComercial;
  valorNegocio: number;
  fechaReunion?: Date;
  comercial: string;
  observaciones?: string;
  createdAt: Date;
}

// Mapeo de columnas del Excel a campos del tipo DatoComercial
export const EXCEL_COLUMN_MAP: Record<string, keyof Omit<DatoComercial, 'id' | 'createdAt'>> = {
  'Empresa': 'empresa',
  'Sector': 'sector',
  'Fecha Contacto': 'fechaContacto',
  'Etapa': 'etapa',
  'Valor Negocio': 'valorNegocio',
  'Fecha Reunión': 'fechaReunion',
  'Fecha Reunion': 'fechaReunion',
  'Comercial': 'comercial',
  'Observaciones': 'observaciones',
};
