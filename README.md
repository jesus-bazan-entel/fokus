# Fokus - Gestion de Tareas y Proyectos

Aplicacion de productividad con Tablero Kanban, Matriz de Eisenhower y gestion de proyectos para equipos pequenos.

## Stack

- **Frontend**: React + Vite + TypeScript → Vercel (gratis)
- **Backend**: FastAPI (Python) → Render.com (gratis)
- **Base de datos**: Supabase (PostgreSQL + Auth) (gratis)

## Estructura del Proyecto

```
fokus/
├── frontend/          # React + Vite app
│   ├── src/
│   │   ├── components/
│   │   │   ├── kanban/        # Tablero Kanban con drag & drop
│   │   │   ├── eisenhower/    # Matriz de Eisenhower
│   │   │   ├── projects/      # Gestion de proyectos
│   │   │   ├── auth/          # Login / Registro
│   │   │   └── layout/        # Layout principal
│   │   ├── pages/             # Paginas de la app
│   │   ├── hooks/             # Custom hooks (auth)
│   │   ├── lib/               # Supabase client, API helpers
│   │   └── types/             # TypeScript types
│   └── vercel.json            # Config Vercel
├── backend/           # FastAPI app
│   ├── app/
│   │   ├── routes/            # Endpoints (projects, tasks)
│   │   ├── auth.py            # JWT verification
│   │   ├── database.py        # Supabase client
│   │   ├── models.py          # Pydantic models
│   │   └── main.py            # FastAPI app
│   ├── requirements.txt
│   └── render.yaml            # Config Render
└── supabase/
    └── schema.sql             # SQL para crear las tablas
```

## Setup Rapido

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta el contenido de `supabase/schema.sql`
3. Copia de **Settings > API**:
   - Project URL
   - `anon` public key
   - `service_role` key
   - JWT Secret (Settings > API > JWT Settings)

### 2. Backend (local)

```bash
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # Edita con tus keys de Supabase
uvicorn app.main:app --reload
```

### 3. Frontend (local)

```bash
cd frontend
npm install
cp .env.example .env.local  # Edita con tus keys de Supabase
npm run dev
```

Abre http://localhost:5173

## Deploy

### Frontend → Vercel

1. Conecta tu repo de GitHub en [vercel.com](https://vercel.com)
2. **Root Directory**: `frontend`
3. Agrega las variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` = URL de tu backend en Render (ej: `https://fokus-api.onrender.com/api`)

### Backend → Render

1. Conecta tu repo en [render.com](https://render.com)
2. **Root Directory**: `backend`
3. **Build Command**: `pip install -r requirements.txt`
4. **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Agrega las variables de entorno:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `SUPABASE_JWT_SECRET`

### CORS

Despues de desplegar, agrega la URL de tu frontend en Vercel al CORS de `backend/app/main.py`.

### Keep-alive (Render free tier)

El backend en Render se duerme tras 15 min de inactividad. Usa [cron-job.org](https://cron-job.org) (gratis) para hacer ping a `https://tu-api.onrender.com/api/health` cada 10 minutos.

## Funcionalidades

- **Tablero Kanban**: 4 columnas (Backlog, Por hacer, En progreso, Hecho) con drag & drop
- **Matriz de Eisenhower**: 4 cuadrantes (Urgente/Importante, No urgente/Importante, etc.)
- **Gestion de Proyectos**: Crea, edita y elimina proyectos con colores
- **Autenticacion**: Login/registro con Supabase Auth
- **Row Level Security**: Cada usuario solo ve sus propios datos
