// Seed de la DEMO "Loomy"
// Ejecutar: node scripts/seed.js  (requiere DATABASE_URL en .env)
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { randomBytes, scryptSync } from 'node:crypto';

// ⚠️ Este seed es DESTRUCTIVO: vacía documents/sessions/files y borra los usuarios
// antes de cargar los datos ficticios de la demo. Usa --force para confirmar.
if (!process.argv.includes('--force')) {
  console.error('\n⚠️  El seed vacía la base de datos completa (documents, sessions, files, users).');
  console.error('   Si estás seguro, vuelve a correrlo con:');
  console.error('   - npm run db:seed -- --force');
  console.error('   - node scripts/seed.js --force\n');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  console.log('🌱 Creando esquema en Neon...');

  await sql`
    CREATE TABLE IF NOT EXISTS documents (
      collection TEXT NOT NULL,
      id TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (collection, id)
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents (collection, created_at DESC);`;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      modify_local BOOLEAN DEFAULT false,
      modify_international BOOLEAN DEFAULT false,
      is_cotizador BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      email TEXT REFERENCES users(email) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT now(),
      expires_at TIMESTAMPTZ
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      name TEXT,
      mime TEXT,
      data TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;

  console.log('🗑  Limpiando datos existentes...');
  await sql`TRUNCATE documents, sessions CASCADE;`;
  await sql`DELETE FROM users;`;
  await sql`TRUNCATE files;`;

  console.log('👤 Creando usuario demo (demo@loomy.com / demo1234)...');
  await sql`
    INSERT INTO users (email, password_hash, modify_local, modify_international, is_cotizador)
    VALUES ('demo@loomy.com', ${hashPassword('demo1234')}, true, true, false);
  `;

  const put = async (collection, id, data) => {
    const createdAt = data.createdAt || new Date().toISOString();
    await sql`
      INSERT INTO documents (collection, id, data)
      VALUES (${collection}, ${id}, ${JSON.stringify({ ...data, createdAt })})
      ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data;
    `;
  };

  console.log('🏷️  Creando catálogos...');

  const categorias = ['Desarrollo Web', 'Apps Móviles', 'Consultoría TI', 'Cloud & Infraestructura', 'Data & BI'];
  const sectores = ['Tecnología', 'Salud', 'Retail', 'Construcción', 'Finanzas', 'Educación'];
  const ciudades = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Bucaramanga'];
  const estados = ['activo', 'pausado', 'cerrado', 'cancelado', 'perdido'];
  const comerciales = ['Carlos Mendoza', 'Laura Ramírez', 'Andrés Torres', 'Diana Gómez'];
  const lineas = ['Software', 'Consultoría', 'Soporte', 'Infraestructura', 'Licenciamiento'];

  categorias.forEach((n, i) => put('categorias', `cat-${i + 1}`, { nombre: n }));
  sectores.forEach((n, i) => put('sectores', `sec-${i + 1}`, { nombre: n }));
  ciudades.forEach((n, i) => put('ciudades', `ciu-${i + 1}`, { nombre: n }));
  estados.forEach((n, i) => put('estados', `est-${i + 1}`, { nombre: n }));
  comerciales.forEach((n, i) => put('comerciales', `com-${i + 1}`, { nombre: n }));
  lineas.forEach((n, i) => put('lineas', `lin-${i + 1}`, { nombre: n }));

  console.log('🏢 Creando empresas ficticias...');

  const empresas = [
    { id: 'emp-1', nombre: 'Grupo Andino', razonSocial: 'Grupo Andino S.A.S.', nit: '901123456', sector: 'sec-1', ciudad: 'ciu-1', facturacionAnual: 2500000000, porcentajeTecnologia: 65 },
    { id: 'emp-2', nombre: 'Clínica Vida', razonSocial: 'Clínica Vida S.A.S.', nit: '901234567', sector: 'sec-2', ciudad: 'ciu-2', facturacionAnual: 1800000000, porcentajeTecnologia: 40 },
    { id: 'emp-3', nombre: 'RetailMax', razonSocial: 'RetailMax Colombia S.A.', nit: '901345678', sector: 'sec-3', ciudad: 'ciu-3', facturacionAnual: 3200000000, porcentajeTecnologia: 55 },
    { id: 'emp-4', nombre: 'Constructora Horizonte', razonSocial: 'Horizonte Construcciones Ltda.', nit: '901456789', sector: 'sec-4', ciudad: 'ciu-4', facturacionAnual: 900000000, porcentajeTecnologia: 25 },
    { id: 'emp-5', nombre: 'Banco Aurora', razonSocial: 'Aurora Financiera S.A.', nit: '901567890', sector: 'sec-5', ciudad: 'ciu-1', facturacionAnual: 5000000000, porcentajeTecnologia: 70 },
    { id: 'emp-6', nombre: 'EduPlataforma', razonSocial: 'EduPlataforma S.A.S.', nit: '901678901', sector: 'sec-6', ciudad: 'ciu-5', facturacionAnual: 600000000, porcentajeTecnologia: 85 },
  ];
  for (const e of empresas) await put('empresas', e.id, e);

  console.log('👥 Creando clientes ficticios...');
  const clientes = [
    { id: 'cli-1', empresaId: 'emp-1', nombre: 'María López', contacto: 'Contacto 1', celular: '3001234567', cargo: 'Gerente de TI', cedula: '1020304050' },
    { id: 'cli-2', empresaId: 'emp-1', nombre: 'Pedro Gómez', celular: '3112345678', cargo: 'Jefe de Proyectos', cedula: '1122334455' },
    { id: 'cli-3', empresaId: 'emp-2', nombre: 'Ana Torres', celular: '3223456789', cargo: 'Directora Administrativa', cedula: '1234567890' },
    { id: 'cli-4', empresaId: 'emp-3', nombre: 'Jorge Ramírez', celular: '3334567890', cargo: 'CFO', cedula: '2345678901' },
    { id: 'cli-5', empresaId: 'emp-4', nombre: 'Luisa Martínez', celular: '3445678901', cargo: 'Gerente General', cedula: '3456789012' },
    { id: 'cli-6', empresaId: 'emp-5', nombre: 'Carlos Herrera', celular: '3556789012', cargo: 'VP de Innovación', cedula: '4567890123' },
    { id: 'cli-7', empresaId: 'emp-6', nombre: 'Sofía Vega', celular: '3667890123', cargo: 'Rectora', cedula: '5678901234' },
    { id: 'cli-8', empresaId: 'emp-2', nombre: 'Diego Rojas', celular: '3778901234', cargo: 'Coordinador de Sistemas', cedula: '6789012345' },
  ];
  for (const c of clientes) await put('clientes', c.id, c);

  console.log('📁 Creando proyectos ficticios...');

  const iso = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).toISOString();
  const proyeccionAnual = (base) => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const p = {};
    meses.forEach((m, i) => { p[m] = Math.round(base * (0.8 + (i % 3) * 0.25)); });
    return { '2026': p };
  };
  const probabilidadesAnual = () => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const p = {};
    meses.forEach((m) => { p[m] = 70 + Math.round(Math.random() * 25); });
    return { '2026': p };
  };

  const proyectos = [
    {
      id: 'pro-1', nombre: 'Portal Web Andino', empresaId: 'emp-1', clienteId: 'cli-1', categoriaId: 'cat-1',
      estado: 'activo', estadoCotizacion: 'cotizado', etapaActual: 'DEVELOP', faseActual: 'factura1', faseGuardada: 'factura1', etapaGuardada: 'DEVELOP',
      costo: 85000000, valorAproximado: 140000000, valorFinal: 138000000, porcentajeCierre: 85,
      comercial: 'Carlos Mendoza', linea: 'Software', empresaNombre: 'Grupo Andino',
      descripcion: 'Desarrollo del portal corporativo con módulo de autoservicio.',
      fechaInicio: iso(2026, 2, 10),
      fechasFases: { identificacion: iso(2026, 2, 10), alcances: iso(2026, 3, 1), cotizacion: iso(2026, 3, 15), propuesta: iso(2026, 4, 2), cierre: iso(2026, 4, 20), kickoff: iso(2026, 5, 5), factura1: iso(2026, 6, 1) },
      metadataFases: { factura1: { lastUpdated: iso(2026, 6, 1) } },
      alcances: [
        { id: 'a1', descripcion: 'Módulo de autoservicio de clientes', fechaInicio: iso(2026, 3, 1), costo: 25000000 },
        { id: 'a2', descripcion: 'Integración con pasarela de pagos', fechaInicio: iso(2026, 3, 10), costo: 18000000 },
      ],
      facturas: [
        { id: 'f1-x1', fecha: iso(2026, 6, 1), valor: 42000000, numeroFactura: 'FA-2026-1001' },
      ],
      recaudos: [
        { id: 'r1', facturaId: 'f1-x1', fecha: iso(2026, 6, 20), valor: 42000000, numeroRecaudo: 'RC-2026-0501' },
      ],
      entrega1: [{ id: 'e1', descripcion: 'Entrega fase 1 del portal', completado: false }],
      entrega2: [], entrega3: [],
      proyeccion: proyeccionAnual(140000000), probabilidades: probabilidadesAnual(),
      trazabilidad: [{ id: 't1', fecha: iso(2026, 2, 5), ubicacion: 'Bogotá', descripcion: 'Reunión inicial', medio: 'Videollamada' }],
      identificacion: 'Cliente identificado con necesidad de renovación tecnológica.',
    },
    {
      id: 'pro-2', nombre: 'App Clínica Vida', empresaId: 'emp-2', clienteId: 'cli-3', categoriaId: 'cat-2',
      estado: 'activo', estadoCotizacion: 'cotizado', etapaActual: 'DEVELOP', faseActual: 'entrega1', faseGuardada: 'entrega1', etapaGuardada: 'DEVELOP',
      costo: 60000000, valorAproximado: 95000000, valorFinal: 0, porcentajeCierre: 60,
      comercial: 'Laura Ramírez', linea: 'Apps Móviles', empresaNombre: 'Clínica Vida',
      descripcion: 'App móvil para gestión de citas y resultados médicos.',
      fechaInicio: iso(2026, 3, 15),
      fechasFases: { identificacion: iso(2026, 3, 15), alcances: iso(2026, 4, 1), cotizacion: iso(2026, 4, 12), propuesta: iso(2026, 5, 1), cierre: iso(2026, 5, 18), kickoff: iso(2026, 6, 2), factura1: iso(2026, 6, 15), entrega1: iso(2026, 7, 10) },
      metadataFases: { entrega1: { lastUpdated: iso(2026, 7, 10) } },
      alcances: [
        { id: 'a1', descripcion: 'Agenda de citas', fechaInicio: iso(2026, 4, 1), costo: 20000000 },
        { id: 'a2', descripcion: 'Resultados de laboratorio', fechaInicio: iso(2026, 4, 15), costo: 15000000 },
      ],
      facturas: [
        { id: 'f1-x2', fecha: iso(2026, 6, 15), valor: 30000000, numeroFactura: 'FA-2026-1002' },
      ],
      recaudos: [],
      entrega1: [
        { id: 'e1', descripcion: 'Entrega MVP de agenda', completado: true, fecha: iso(2026, 7, 10) },
        { id: 'e2', descripcion: 'Entrega módulo de resultados', completado: false },
      ],
      entrega2: [], entrega3: [],
      proyeccion: proyeccionAnual(95000000), probabilidades: probabilidadesAnual(),
      trazabilidad: [{ id: 't1', fecha: iso(2026, 3, 10), ubicacion: 'Medellín', descripcion: 'Primera reunión comercial', medio: 'Presencial' }],
      identificacion: 'Necesidad de digitalización de servicios médicos.',
    },
    {
      id: 'pro-3', nombre: 'E-commerce RetailMax', empresaId: 'emp-3', clienteId: 'cli-4', categoriaId: 'cat-1',
      estado: 'activo', estadoCotizacion: 'en_proceso', etapaActual: 'START', faseActual: 'cotizacion', faseGuardada: 'cotizacion', etapaGuardada: 'START',
      costo: 0, valorAproximado: 0, valorFinal: 0, porcentajeCierre: 30,
      comercial: 'Andrés Torres', linea: 'Consultoría', empresaNombre: 'RetailMax',
      descripcion: 'Tienda en línea con integración logística.',
      fechaInicio: iso(2026, 6, 1),
      fechasFases: { identificacion: iso(2026, 6, 1), alcances: iso(2026, 6, 20), cotizacion: iso(2026, 7, 5) },
      alcances: [
        { id: 'a1', descripcion: 'Catálogo y checkout', fechaInicio: iso(2026, 6, 20) },
        { id: 'a2', descripcion: 'Integración ERP', fechaInicio: iso(2026, 7, 1) },
      ],
      facturas: [], recaudos: [], entrega1: [], entrega2: [], entrega3: [],
      proyeccion: proyeccionAnual(200000000), probabilidades: probabilidadesAnual(),
      trazabilidad: [{ id: 't1', fecha: iso(2026, 5, 28), ubicacion: 'Cali', descripcion: 'Reunión de descubrimiento', medio: 'Presencial' }],
      identificacion: 'Cliente evaluando migración a plataforma e-commerce.',
    },
    {
      id: 'pro-4', nombre: 'ERP Constructora', empresaId: 'emp-4', clienteId: 'cli-5', categoriaId: 'cat-3',
      estado: 'pausado', estadoCotizacion: 'cotizado', etapaActual: 'DEVELOP', faseActual: 'kickoff', faseGuardada: 'kickoff', etapaGuardada: 'DEVELOP',
      costo: 45000000, valorAproximado: 120000000, valorFinal: 0, porcentajeCierre: 45,
      comercial: 'Diana Gómez', linea: 'Consultoría', empresaNombre: 'Constructora Horizonte',
      descripcion: 'Implementación de ERP para gestión de obras.',
      fechaInicio: iso(2026, 4, 1),
      fechasFases: { identificacion: iso(2026, 4, 1), alcances: iso(2026, 4, 20), cotizacion: iso(2026, 5, 10), propuesta: iso(2026, 5, 25), cierre: iso(2026, 6, 8), kickoff: iso(2026, 6, 20) },
      metadataFases: { kickoff: { lastUpdated: iso(2026, 6, 20) } },
      alcances: [{ id: 'a1', descripcion: 'Configuración módulos de obra', fechaInicio: iso(2026, 5, 1) }],
      facturas: [], recaudos: [], entrega1: [], entrega2: [], entrega3: [],
      proyeccion: proyeccionAnual(120000000), probabilidades: probabilidadesAnual(),
      identificacion: 'Proyecto pausado por decisiones internas del cliente.',
    },
    {
      id: 'pro-5', nombre: 'Banca Digital Aurora', empresaId: 'emp-5', clienteId: 'cli-6', categoriaId: 'cat-2',
      estado: 'cerrado', estadoCotizacion: 'cotizado', etapaActual: 'DEVELOP', faseActual: 'entrega3', faseGuardada: 'entrega3', etapaGuardada: 'DEVELOP',
      costo: 300000000, valorAproximado: 520000000, valorFinal: 510000000, porcentajeCierre: 100,
      comercial: 'Carlos Mendoza', linea: 'Software', empresaNombre: 'Banco Aurora',
      descripcion: 'Plataforma de banca digital para clientes.',
      fechaInicio: iso(2025, 8, 1),
      fechasFases: { identificacion: iso(2025, 8, 1), alcances: iso(2025, 9, 1), cotizacion: iso(2025, 9, 20), propuesta: iso(2025, 10, 10), cierre: iso(2025, 11, 5), kickoff: iso(2025, 11, 20), factura1: iso(2025, 12, 1), entrega1: iso(2026, 2, 1), factura2: iso(2026, 3, 1), entrega2: iso(2026, 5, 1), factura3: iso(2026, 6, 1), entrega3: iso(2026, 7, 15) },
      metadataFases: { entrega3: { lastUpdated: iso(2026, 7, 15) } },
      alcances: [
        { id: 'a1', descripcion: 'Banca transaccional', fechaInicio: iso(2025, 9, 1), costo: 120000000 },
        { id: 'a2', descripcion: 'Módulo de pagos', fechaInicio: iso(2025, 9, 15), costo: 90000000 },
        { id: 'a3', descripcion: 'App móvil', fechaInicio: iso(2025, 10, 1), costo: 90000000 },
      ],
      facturas: [
        { id: 'f1-x3', fecha: iso(2025, 12, 1), valor: 150000000, numeroFactura: 'FA-2025-0801' },
        { id: 'f2-x3', fecha: iso(2026, 3, 1), valor: 170000000, numeroFactura: 'FA-2026-0301' },
        { id: 'f3-x3', fecha: iso(2026, 6, 1), valor: 190000000, numeroFactura: 'FA-2026-0601' },
      ],
      recaudos: [
        { id: 'r1', facturaId: 'f1-x3', fecha: iso(2025, 12, 20), valor: 150000000, numeroRecaudo: 'RC-2025-0901' },
        { id: 'r2', facturaId: 'f2-x3', fecha: iso(2026, 4, 5), valor: 170000000, numeroRecaudo: 'RC-2026-0201' },
      ],
      entrega1: [
        { id: 'e1', descripcion: 'Entrega banca transaccional', completado: true, fecha: iso(2026, 2, 1) },
        { id: 'e2', descripcion: 'Entrega módulo de pagos', completado: true, fecha: iso(2026, 3, 20) },
      ],
      entrega2: [
        { id: 'e1', descripcion: 'Entrega App móvil', completado: true, fecha: iso(2026, 5, 1) },
      ],
      entrega3: [
        { id: 'e1', descripcion: 'Cierre y estabilización', completado: true, fecha: iso(2026, 7, 15) },
      ],
      proyeccion: proyeccionAnual(510000000), probabilidades: probabilidadesAnual(),
      trazabilidad: [{ id: 't1', fecha: iso(2025, 7, 28), ubicacion: 'Bogotá', descripcion: 'Reunión de licitación', medio: 'Presencial' }],
      identificacion: 'Proyecto de gran escala cerrado exitosamente.',
    },
    {
      id: 'pro-6', nombre: 'Plataforma EduPlataforma', empresaId: 'emp-6', clienteId: 'cli-7', categoriaId: 'cat-4',
      estado: 'perdido', estadoCotizacion: 'cotizado', etapaActual: 'START', faseActual: 'cierre', faseGuardada: 'cierre', etapaGuardada: 'START',
      costo: 0, valorAproximado: 0, valorFinal: 0, porcentajeCierre: 100,
      comercial: 'Laura Ramírez', linea: 'Licenciamiento', empresaNombre: 'EduPlataforma',
      descripcion: 'Plataforma LMS para educación superior.',
      fechaInicio: iso(2026, 5, 10),
      fechasFases: { identificacion: iso(2026, 5, 10), alcances: iso(2026, 5, 25), cotizacion: iso(2026, 6, 10), propuesta: iso(2026, 6, 25), cierre: iso(2026, 7, 10) },
      alcances: [{ id: 'a1', descripcion: 'Plataforma LMS completa' }],
      facturas: [], recaudos: [], entrega1: [], entrega2: [], entrega3: [],
      proyeccion: {}, probabilidades: {},
      identificacion: 'Negocio no concretado, competencia ganó la licitación.',
    },
  ];
  for (const p of proyectos) await put('proyectos', p.id, p);

  console.log('🧾 Creando facturas y recaudos ficticios...');
  const facturas = [
    { id: 'fac-1', empresaId: 'emp-1', clienteId: 'cli-1', fecha: iso(2026, 1, 15), comercial: 'Carlos Mendoza', linea: 'Software', nit: '901123456', empresaNombre: 'Grupo Andino', descripcion: 'Licencias de software anuales', cantidad: 50, precioUnitario: 1200000, valorTotal: 60000000, numeroFactura: 'FA-2026-0001' },
    { id: 'fac-2', empresaId: 'emp-2', clienteId: 'cli-3', fecha: iso(2026, 2, 10), comercial: 'Laura Ramírez', linea: 'Soporte', nit: '901234567', empresaNombre: 'Clínica Vida', descripcion: 'Soporte técnico mensual', cantidad: 12, precioUnitario: 3500000, valorTotal: 42000000, numeroFactura: 'FA-2026-0002' },
    { id: 'fac-3', empresaId: 'emp-3', clienteId: 'cli-4', fecha: iso(2026, 3, 5), comercial: 'Andrés Torres', linea: 'Consultoría', nit: '901345678', empresaNombre: 'RetailMax', descripcion: 'Consultoría de transformación digital', cantidad: 40, precioUnitario: 950000, valorTotal: 38000000, numeroFactura: 'FA-2026-0003' },
    { id: 'fac-4', empresaId: 'emp-5', clienteId: 'cli-6', fecha: iso(2026, 4, 8), comercial: 'Carlos Mendoza', linea: 'Infraestructura', nit: '901567890', empresaNombre: 'Banco Aurora', descripcion: 'Infraestructura en la nube', cantidad: 1, precioUnitario: 250000000, valorTotal: 250000000, numeroFactura: 'FA-2026-0004' },
    { id: 'fac-5', empresaId: 'emp-1', clienteId: 'cli-2', fecha: iso(2026, 5, 12), comercial: 'Diana Gómez', linea: 'Consultoría', nit: '901123456', empresaNombre: 'Grupo Andino', descripcion: 'Talleres de capacitación', cantidad: 20, precioUnitario: 800000, valorTotal: 16000000, numeroFactura: 'FA-2026-0005' },
    { id: 'fac-6', empresaId: 'emp-2', clienteId: 'cli-8', fecha: iso(2026, 6, 18), comercial: 'Laura Ramírez', linea: 'Software', nit: '901234567', empresaNombre: 'Clínica Vida', descripcion: 'Licenciamiento EHR', cantidad: 30, precioUnitario: 1500000, valorTotal: 45000000, numeroFactura: 'FA-2026-0006' },
    { id: 'fac-7', empresaId: 'emp-4', clienteId: 'cli-5', fecha: iso(2025, 11, 20), comercial: 'Andrés Torres', linea: 'Consultoría', nit: '901456789', empresaNombre: 'Constructora Horizonte', descripcion: 'Diagnóstico ERP', cantidad: 15, precioUnitario: 900000, valorTotal: 13500000, numeroFactura: 'FA-2025-0121' },
    { id: 'fac-8', empresaId: 'emp-6', clienteId: 'cli-7', fecha: iso(2026, 2, 25), comercial: 'Diana Gómez', linea: 'Licenciamiento', nit: '901678901', empresaNombre: 'EduPlataforma', descripcion: 'Licencias LMS', cantidad: 100, precioUnitario: 250000, valorTotal: 25000000, numeroFactura: 'FA-2026-0008' },
  ];
  for (const f of facturas) await put('facturas', f.id, f);

  const recaudos = [
    { id: 'rec-1', facturaId: 'fac-1', numeroFactura: 'FA-2026-0001', fecha: iso(2026, 2, 10), valor: 60000000, numeroRecaudo: 'RC-2026-001', empresaNombre: 'Grupo Andino', nit: '901123456', comercial: 'Carlos Mendoza', linea: 'Software', metodoPago: 'Transferencia' },
    { id: 'rec-2', facturaId: 'fac-2', numeroFactura: 'FA-2026-0002', fecha: iso(2026, 3, 5), valor: 42000000, numeroRecaudo: 'RC-2026-002', empresaNombre: 'Clínica Vida', nit: '901234567', comercial: 'Laura Ramírez', linea: 'Soporte', metodoPago: 'PSE' },
    { id: 'rec-3', facturaId: 'fac-3', numeroFactura: 'FA-2026-0003', fecha: iso(2026, 4, 1), valor: 38000000, numeroRecaudo: 'RC-2026-003', empresaNombre: 'RetailMax', nit: '901345678', comercial: 'Andrés Torres', linea: 'Consultoría', metodoPago: 'Transferencia' },
    { id: 'rec-4', facturaId: 'fac-4', numeroFactura: 'FA-2026-0004', fecha: iso(2026, 5, 15), valor: 250000000, numeroRecaudo: 'RC-2026-004', empresaNombre: 'Banco Aurora', nit: '901567890', comercial: 'Carlos Mendoza', linea: 'Infraestructura', metodoPago: 'Cheque' },
    { id: 'rec-5', facturaId: 'fac-5', numeroFactura: 'FA-2026-0005', fecha: iso(2026, 6, 2), valor: 16000000, numeroRecaudo: 'RC-2026-005', empresaNombre: 'Grupo Andino', nit: '901123456', comercial: 'Diana Gómez', linea: 'Consultoría', metodoPago: 'PSE' },
    { id: 'rec-6', facturaId: 'fac-6', numeroFactura: 'FA-2026-0006', fecha: iso(2026, 7, 1), valor: 45000000, numeroRecaudo: 'RC-2026-006', empresaNombre: 'Clínica Vida', nit: '901234567', comercial: 'Laura Ramírez', linea: 'Software', metodoPago: 'Transferencia' },
  ];
  for (const r of recaudos) await put('recaudos', r.id, r);

  console.log('🎯 Creando metas ficticias...');
  const meses = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
  const tipos = ['facturacion', 'recaudo'];
  for (const m of meses) {
    for (const t of tipos) {
      const valor = t === 'facturacion' ? 220000000 + parseInt(m) * 15000000 : 180000000 + parseInt(m) * 12000000;
      await put('metas', `met-2026-${m}-${t}`, { mes: m, anio: '2026', tipo: t, valor });
    }
  }

  console.log('📦 Creando productos de proyección...');
  const productos = [
    {
      id: 'prod-1', nombre: 'Desarrollo Web', ticketPromedio: 45000000,
      proyeccion: (() => {
        const p = {};
        meses.forEach((m, i) => {
          p[`2026_${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][i]}`] = { cantidad: 1 + (i % 2), real: i < 6 ? 1 : 0, meta: 2, probabilidad: 75 };
        });
        return p;
      })(),
    },
    {
      id: 'prod-2', nombre: 'Apps Móviles', ticketPromedio: 60000000,
      proyeccion: (() => {
        const p = {};
        meses.forEach((m, i) => {
          p[`2026_${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][i]}`] = { cantidad: i % 3 === 0 ? 1 : 0, real: i < 3 ? 1 : 0, meta: 1, probabilidad: 60 };
        });
        return p;
      })(),
    },
    {
      id: 'prod-3', nombre: 'Consultoría TI', ticketPromedio: 35000000,
      proyeccion: (() => {
        const p = {};
        meses.forEach((m, i) => {
          p[`2026_${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][i]}`] = { cantidad: 2, real: i < 4 ? 2 : 0, meta: 3, probabilidad: 80 };
        });
        return p;
      })(),
    },
  ];
  for (const p of productos) await put('proyecciones_productos', p.id, p);

  console.log('📋 Creando seguimiento de empresas...');
  const seguimiento = [
    { id: 'seg-1', nombreComercial: 'Farmacias Unidas', razonSocial: 'Farmacias Unidas S.A.', nit: '901789012', sector: 'sec-2', ciudad: 'ciu-1', facturacionAnual: 800000000, porcentajeTecnologia: 30, contacto: 'Elena Ríos', cargo: 'Gerente Comercial', conexion: true, primerMensaje: true, pitch: false, whatsapp: true, reunion: false, cotizado: false, notasEtapas: { '0': [{ id: 'n1', texto: 'Primer contacto realizado', fecha: iso(2026, 6, 1) }], '1': [{ id: 'n2', texto: 'Enviado pitch de valor', fecha: iso(2026, 6, 15) }] } },
    { id: 'seg-2', nombreComercial: 'Textiles del Norte', razonSocial: 'Textiles del Norte Ltda.', nit: '901890123', sector: 'sec-3', ciudad: 'ciu-4', facturacionAnual: 500000000, porcentajeTecnologia: 20, contacto: 'Marco Salas', cargo: 'Gerente de Operaciones', conexion: true, primerMensaje: true, pitch: true, whatsapp: false, reunion: true, fechaReunion: iso(2026, 7, 12), cotizado: false, notasEtapas: { '3': [{ id: 'n3', texto: 'Reunión agendada para propuesta', fecha: iso(2026, 7, 5) }] } },
    { id: 'seg-3', nombreComercial: 'LogiCargo', razonSocial: 'LogiCargo S.A.S.', nit: '901901234', sector: 'sec-3', ciudad: 'ciu-2', facturacionAnual: 1200000000, porcentajeTecnologia: 50, contacto: 'Paola Muñoz', cargo: 'CTO', conexion: true, primerMensaje: true, pitch: true, whatsapp: true, reunion: true, fechaReunion: iso(2026, 7, 20), cotizado: true, montoCotizado: 180000000, notasEtapas: { '4': [{ id: 'n4', texto: 'Cotización de $180M enviada', fecha: iso(2026, 7, 20) }] } },
    { id: 'seg-4', nombreComercial: 'AgroAndina', razonSocial: 'AgroAndina S.A.', nit: '902012345', sector: 'sec-1', ciudad: 'ciu-5', facturacionAnual: 350000000, porcentajeTecnologia: 15, contacto: 'Rafael Pinto', cargo: 'Administrador', conexion: false, notasEtapas: {} },
  ];
  for (const s of seguimiento) await put('seguimiento_empresas', s.id, s);

  console.log('📊 Creando datos comerciales...');
  const datosComerciales = [
    { id: 'dc-1', empresa: 'Farmacias Unidas', sector: 'sec-2', fechaContacto: iso(2026, 6, 1), etapa: 'Contactado', valorNegocio: 80000000, comercial: 'Carlos Mendoza', observaciones: 'Requiere demo de software' },
    { id: 'dc-2', empresa: 'Textiles del Norte', sector: 'sec-3', fechaContacto: iso(2026, 6, 15), etapa: 'Reunión Agendada', valorNegocio: 120000000, fechaReunion: iso(2026, 7, 12), comercial: 'Laura Ramírez' },
    { id: 'dc-3', empresa: 'LogiCargo', sector: 'sec-3', fechaContacto: iso(2026, 6, 20), etapa: 'Oportunidad Abierta', valorNegocio: 180000000, comercial: 'Andrés Torres' },
    { id: 'dc-4', empresa: 'AgroAndina', sector: 'sec-1', fechaContacto: iso(2026, 7, 1), etapa: 'Contactado', valorNegocio: 50000000, comercial: 'Diana Gómez' },
    { id: 'dc-5', empresa: 'Papelería Central', sector: 'sec-3', fechaContacto: iso(2026, 5, 10), etapa: 'Negociación', valorNegocio: 95000000, fechaReunion: iso(2026, 7, 8), comercial: 'Carlos Mendoza' },
    { id: 'dc-6', empresa: 'Servicios Médicos Plus', sector: 'sec-2', fechaContacto: iso(2026, 5, 22), etapa: 'Venta Cerrada', valorNegocio: 140000000, comercial: 'Laura Ramírez', observaciones: 'Cierre exitoso' },
  ];
  for (const d of datosComerciales) await put('datos_comerciales', d.id, d);

  console.log('🌎 Creando entorno Internacional (int_*)...');
  // Catálogos internacionales
  categorias.forEach((n, i) => put('int_categorias', `cat-${i + 1}`, { nombre: n }));
  sectores.forEach((n, i) => put('int_sectores', `sec-${i + 1}`, { nombre: n }));
  ciudades.forEach((n, i) => put('int_ciudades', `ciu-${i + 1}`, { nombre: n }));
  estados.forEach((n, i) => put('int_estados', `est-${i + 1}`, { nombre: n }));
  comerciales.forEach((n, i) => put('int_comerciales', `com-${i + 1}`, { nombre: n }));
  lineas.forEach((n, i) => put('int_lineas', `lin-${i + 1}`, { nombre: n }));

  const intEmpresas = [
    { id: 'int-emp-1', nombre: 'GlobalTech Miami', razonSocial: 'GlobalTech Inc.', nit: '930123456', sector: 'sec-1', ciudad: 'ciu-1', facturacionAnual: 5000000000, porcentajeTecnologia: 90 },
    { id: 'int-emp-2', nombre: 'Andina Perú', razonSocial: 'Andina Perú S.A.C.', nit: '940234567', sector: 'sec-5', ciudad: 'ciu-2', facturacionAnual: 2500000000, porcentajeTecnologia: 60 },
  ];
  for (const e of intEmpresas) await put('int_empresas', e.id, e);

  const intClientes = [
    { id: 'int-cli-1', empresaId: 'int-emp-1', nombre: 'John Carter', celular: '+13005551234', cargo: 'CTO', cedula: '88010112345' },
    { id: 'int-cli-2', empresaId: 'int-emp-2', nombre: 'Lucía Fernández', celular: '+51987654321', cargo: 'Gerente Financiera', cedula: '77020234567' },
  ];
  for (const c of intClientes) await put('int_clientes', c.id, c);

  const intProyectos = [
    {
      id: 'int-pro-1', nombre: 'Cloud Platform Miami', empresaId: 'int-emp-1', clienteId: 'int-cli-1', categoriaId: 'cat-4',
      estado: 'activo', estadoCotizacion: 'cotizado', etapaActual: 'DEVELOP', faseActual: 'entrega1', faseGuardada: 'entrega1', etapaGuardada: 'DEVELOP',
      costo: 350000000, valorAproximado: 600000000, valorFinal: 0, porcentajeCierre: 55,
      comercial: 'Carlos Mendoza', linea: 'Infraestructura', empresaNombre: 'GlobalTech Miami',
      descripcion: 'Migración a nube multiregión.',
      fechaInicio: iso(2026, 5, 1),
      fechasFases: { identificacion: iso(2026, 5, 1), alcances: iso(2026, 5, 20), cotizacion: iso(2026, 6, 5), propuesta: iso(2026, 6, 25), cierre: iso(2026, 7, 5), kickoff: iso(2026, 7, 15) },
      metadataFases: { kickoff: { lastUpdated: iso(2026, 7, 15) } },
      alcances: [{ id: 'a1', descripcion: 'Migración de workloads', fechaInicio: iso(2026, 6, 1), costo: 200000000 }],
      facturas: [], recaudos: [], entrega1: [], entrega2: [], entrega3: [],
      proyeccion: proyeccionAnual(600000000), probabilidades: probabilidadesAnual(),
      identificacion: 'Cliente internacional con operación en varias regiones.',
    },
    {
      id: 'int-pro-2', nombre: 'Fintech Andina', empresaId: 'int-emp-2', clienteId: 'int-cli-2', categoriaId: 'cat-2',
      estado: 'cerrado', estadoCotizacion: 'cotizado', etapaActual: 'DEVELOP', faseActual: 'entrega2', faseGuardada: 'entrega2', etapaGuardada: 'DEVELOP',
      costo: 120000000, valorAproximado: 260000000, valorFinal: 250000000, porcentajeCierre: 100,
      comercial: 'Laura Ramírez', linea: 'Software', empresaNombre: 'Andina Perú',
      descripcion: 'App de banca móvil para el mercado peruano.',
      fechaInicio: iso(2025, 10, 1),
      fechasFases: { identificacion: iso(2025, 10, 1), alcances: iso(2025, 10, 20), cotizacion: iso(2025, 11, 10), propuesta: iso(2025, 12, 1), cierre: iso(2025, 12, 15), kickoff: iso(2026, 1, 10), factura1: iso(2026, 2, 1), entrega1: iso(2026, 4, 1), factura2: iso(2026, 5, 1), entrega2: iso(2026, 7, 1) },
      metadataFases: { entrega2: { lastUpdated: iso(2026, 7, 1) } },
      alcances: [{ id: 'a1', descripcion: 'Banca móvil completa', fechaInicio: iso(2025, 11, 1), costo: 80000000 }],
      facturas: [
        { id: 'f1-x1', fecha: iso(2026, 2, 1), valor: 80000000, numeroFactura: 'INT-2026-0001' },
        { id: 'f2-x1', fecha: iso(2026, 5, 1), valor: 90000000, numeroFactura: 'INT-2026-0002' },
      ],
      recaudos: [
        { id: 'r1', facturaId: 'f1-x1', fecha: iso(2026, 3, 1), valor: 80000000, numeroRecaudo: 'INTR-2026-001' },
      ],
      entrega1: [{ id: 'e1', descripcion: 'Entrega fase 1', completado: true, fecha: iso(2026, 4, 1) }],
      entrega2: [{ id: 'e1', descripcion: 'Entrega fase 2', completado: true, fecha: iso(2026, 7, 1) }],
      entrega3: [],
      proyeccion: proyeccionAnual(250000000), probabilidades: probabilidadesAnual(),
      identificacion: 'Expansión internacional del portafolio.',
    },
  ];
  for (const p of intProyectos) await put('int_proyectos', p.id, p);

  const intFacturas = [
    { id: 'int-fac-1', empresaId: 'int-emp-1', fecha: iso(2026, 3, 10), comercial: 'Carlos Mendoza', linea: 'Infraestructura', nit: '930123456', empresaNombre: 'GlobalTech Miami', descripcion: 'Servicios cloud Q1', cantidad: 1, precioUnitario: 150000000, valorTotal: 150000000, numeroFactura: 'INT-2026-0010' },
    { id: 'int-fac-2', empresaId: 'int-emp-2', fecha: iso(2026, 5, 15), comercial: 'Laura Ramírez', linea: 'Software', nit: '940234567', empresaNombre: 'Andina Perú', descripcion: 'Licencias banca móvil', cantidad: 3, precioUnitario: 40000000, valorTotal: 120000000, numeroFactura: 'INT-2026-0011' },
  ];
  for (const f of intFacturas) await put('int_facturas', f.id, f);

  const intRecaudos = [
    { id: 'int-rec-1', facturaId: 'int-fac-1', numeroFactura: 'INT-2026-0010', fecha: iso(2026, 4, 5), valor: 150000000, numeroRecaudo: 'INTR-2026-010', empresaNombre: 'GlobalTech Miami', nit: '930123456', metodoPago: 'Wire transfer' },
  ];
  for (const r of intRecaudos) await put('int_recaudos', r.id, r);

  await put('int_datos_comerciales', 'int-dc-1', { empresa: 'GlobalTech Miami', sector: 'sec-1', fechaContacto: iso(2026, 5, 1), etapa: 'Oportunidad Abierta', valorNegocio: 400000000, comercial: 'Carlos Mendoza' });

  // Metas, seguimiento y productos del entorno internacional (para que el toggle se vea completo)
  for (const m of meses) {
    await put('int_metas', `int-met-2026-${m}-facturacion`, { mes: m, anio: '2026', tipo: 'facturacion', valor: 300000000 + parseInt(m) * 20000000 });
    await put('int_metas', `int-met-2026-${m}-recaudo`, { mes: m, anio: '2026', tipo: 'recaudo', valor: 250000000 + parseInt(m) * 15000000 });
  }

  await put('int_seguimiento_empresas', 'int-seg-1', { nombreComercial: 'Nova Labs', razonSocial: 'Nova Labs LLC', nit: '950123456', sector: 'sec-1', ciudad: 'ciu-1', facturacionAnual: 1500000000, porcentajeTecnologia: 95, contacto: 'Sarah Kim', cargo: 'COO', conexion: true, primerMensaje: true, pitch: true, whatsapp: true, reunion: true, fechaReunion: iso(2026, 7, 25), cotizado: false, notasEtapas: { '3': [{ id: 'n1', texto: 'Reunión virtual agendada', fecha: iso(2026, 7, 20) }] } });

  const intProductos = [
    { id: 'int-prod-1', nombre: 'Cloud Services', ticketPromedio: 120000000, proyeccion: { '2026_Enero': { cantidad: 1, real: 1, meta: 2, probabilidad: 80 }, '2026_Febrero': { cantidad: 1, real: 0, meta: 2, probabilidad: 70 }, '2026_Marzo': { cantidad: 2, real: 0, meta: 2, probabilidad: 75 } } },
    { id: 'int-prod-2', nombre: 'Data Analytics', ticketPromedio: 90000000, proyeccion: { '2026_Enero': { cantidad: 1, real: 1, meta: 1, probabilidad: 85 }, '2026_Febrero': { cantidad: 1, real: 0, meta: 1, probabilidad: 65 } } },
  ];
  for (const p of intProductos) await put('int_proyecciones_productos', p.id, p);

  console.log('🔐 Creando lista de usuarios autorizados...');
  await put('allowed_users', 'demo@loomy.com', { email: 'demo@loomy.com', modifyLocal: true, modifyInternational: true, isCotizador: false });

  console.log('✅ Seed completado.');
  console.log('   Usuario demo:  demo@loomy.com');
  console.log('   Contraseña:    demo1234');
}

main().catch((err) => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});
