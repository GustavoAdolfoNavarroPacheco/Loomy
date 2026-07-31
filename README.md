# Loomy 🚀

Sistema de gestión y proyección empresarial — **versión DEMO**.
Reemplaza los datos reales por información ficticia de ejemplo y funciona con
**PostgreSQL en Neon** + **API serverless en Vercel** (sin Firebase).

> 🔐 Acceso demo: `demo@loomy.com` / `demo1234`

---

## Arquitectura

```
┌────────────────────────────┐      ┌─────────────────────────────┐
│  Frontend React + Vite     │ ───► │  API Serverless (api/)       │
│  (src/)                    │ /api │  Vercel Functions + Neon     │
└────────────────────────────┘      └──────────────┬──────────────┘
                                                    ▼
                                        PostgreSQL (Neon)
                                        documents · users · sessions · files
```

- **Colecciones**: la app trabaja con colecciones (`empresas`, `proyectos`, `facturas`,
  `sectores`, `categorias`, `int_*`, …) que se almacenan como JSONB en una tabla
  `documents`, replicando el comportamiento de Firestore.
- **Auth**: login por correo/contraseña contra la tabla `users`, con tokens de sesión.
- **Archivos**: se guardan como base64 en la tabla `files` y se sirven por `/api/files/:id`.
- **Real-time**: el frontend hace *polling* cada 10s a `/api/collections/:name`.

---

## Requisitos

- Node.js 18+
- Cuenta en [Neon](https://neon.tech) y proyecto PostgreSQL creado
- Cuenta en [Vercel](https://vercel.com)

---

## Configuración local

1. Instalar dependencias:

```bash
npm install
```

2. Crear el archivo `.env` copiando `.env.example` y pegar tu connection string de Neon:

```
DATABASE_URL=postgresql://user:password@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
VITE_API_URL=/api
```

3. Cargar el esquema y los datos de demostración:

```bash
npm run db:seed -- --force
```
> ⚠️ El seed vacía la base completa antes de cargar los datos ficticios; `--force` confirma la operación.

4. Levantar la API local (Vercel Functions):

```bash
npx vercel dev
```
> Sirve la app y las funciones en `http://localhost:3000`. Con `npm run dev`
> (Vite en el puerto 8080) el proxy de `vite.config.ts` reenvía `/api` a `:3000`.

---

## Despliegue en Vercel

1. Sube el repo a GitHub y **conecta el proyecto en Vercel** (import project).
   - Framework preset: **Vite**
   - Build: `npm run build` · Output: `dist` (ya configurado en `vercel.json`)
2. En **Settings → Environment Variables** agrega:
   - `DATABASE_URL` → tu connection string de Neon
   - (opcional) `VITE_API_URL` → `/api`
3. Carga el esquema y los datos demo en la base de Neon **antes de** la primera visita:

```bash
npm run db:seed -- --force
```

4. Despliega (deploy). La app quedará en tu dominio `.vercel.app`.

> Nota: el seed borra y recrea las tablas. No lo ejecutes contra una base con datos que quieras conservar.

---

## Estructura relevante

| Ruta | Descripción |
| --- | --- |
| `api/` | Vercel Functions: auth, colecciones, usuarios, archivos |
| `scripts/seed.js` | Esquema + datos ficticios de ejemplo |
| `src/services/dataService.ts` | Cliente API que sustituye a Firebase |
| `src/contexts/` | Auth y datos (sin dependencias de Firebase) |
| `vercel.json` | Configuración de build y rewrites SPA |

## Notas

- **Demo**: los nombres, empresas, clientes y números son ficticios. No expongas datos reales.
- **Límites**: Neon free tier soporta bien este uso de polling; para cargas altas
  conviene aumentar el intervalo en `dataService.ts` (`POLL_MS`) o migrar a WebSockets.
- **Ciberseguridad**: en producción real agrega rate-limiting y hashing más robusto en la API.
