# Fokus - Gestion de Tareas y Proyectos

Aplicacion de productividad con Tablero Kanban, Matriz de Eisenhower y gestion de proyectos para equipos pequenos.

## Stack

- **Frontend**: React + Vite + TypeScript → Vercel (gratis)
- **Backend + DB + Auth**: Supabase (PostgreSQL + Auth + API REST automatica) (gratis)

No se necesita servidor backend separado. El frontend se comunica directamente con Supabase, que provee la API REST, autenticacion y Row Level Security.

## Estructura del Proyecto

```
fokus/
├── frontend/          # React + Vite app (desplegada en Vercel)
│   ├── src/
│   │   ├── components/
│   │   │   ├── kanban/        # Tablero Kanban con drag & drop
│   │   │   ├── eisenhower/    # Matriz de Eisenhower
│   │   │   ├── projects/      # Gestion de proyectos
│   │   │   ├── auth/          # Login / Registro
│   │   │   └── layout/        # Layout principal
│   │   ├── pages/             # Paginas de la app
│   │   ├── hooks/             # Custom hooks (auth)
│   │   ├── lib/               # Supabase client + queries
│   │   └── types/             # TypeScript types
│   └── vercel.json            # Config Vercel
└── supabase/
    └── schema.sql             # SQL para crear las tablas
```

## Setup Rapido

### 1. Supabase (backend + base de datos)

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta el contenido de `supabase/schema.sql`
3. Copia de **Settings > API**:
   - Project URL (`VITE_SUPABASE_URL`)
   - `anon` public key (`VITE_SUPABASE_ANON_KEY`)

### 2. Frontend (desarrollo local)

```bash
cd frontend
npm install
cp .env.example .env.local  # Edita con tus keys de Supabase
npm run dev
```

Abre http://localhost:5173

## Deploy a Produccion

### Frontend → Vercel

1. Conecta tu repo de GitHub en [vercel.com](https://vercel.com)
2. **Root Directory**: `frontend`
3. Agrega las variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**

Cada push futuro se desplegara automaticamente.

### Supabase

No necesita deploy adicional. Una vez creado el proyecto y ejecutado el schema, Supabase esta listo. La API REST se genera automaticamente desde las tablas.

## Funcionalidades

- **Tablero Kanban**: 4 columnas (Backlog, Por hacer, En progreso, Hecho) con drag & drop
- **Matriz de Eisenhower**: 4 cuadrantes (Urgente/Importante, No urgente/Importante, etc.)
- **Gestion de Proyectos**: Crea, edita y elimina proyectos con colores
- **Autenticacion**: Login/registro con Supabase Auth
- **Row Level Security**: Cada usuario solo ve sus propios datos

## Ventajas de esta arquitectura

- **Sin servidor backend**: menos complejidad, menos costos, sin cold starts
- **100% gratuito**: Vercel free tier + Supabase free tier
- **Seguridad**: RLS en PostgreSQL garantiza aislamiento de datos por usuario
- **Escalable**: Supabase maneja la base de datos, auth y API automaticamente
