# SheReady

<p align="center">
  <img src="app/src/assets/logo_banderin_turquesa.svg" alt="Logo de SheReady: una escalera hacia el empleo con un banderín turquesa" width="160" />
</p>

<p align="center"><strong>Preparación profesional y práctica de entrevistas, a tu ritmo.</strong></p>

SheReady es una aplicación para ayudar a mujeres a preparar entrevistas de trabajo y reforzar su confianza. Ofrece simulacros personalizados, ejercicios de práctica, seguimiento del progreso y contenido de actualidad. La interfaz funciona en web y en dispositivos móviles.

## Qué incluye

- **Cuenta y perfil individual:** registro e inicio de sesión; los datos de perfil y práctica se asocian a la cuenta.
- **Onboarding y entrevista inicial:** recoge preferencias y respuestas iniciales. La API utiliza esa información para elaborar un contexto de fortalezas y áreas de práctica.
- **Preparación para un puesto:** se puede registrar el rol y los datos de la oferta. La URL se conserva como referencia; para que la IA use el contenido de la oferta también hay que proporcionar su descripción.
- **Plan personalizado:** para cada puesto, la IA prepara tres simulacros de cada modalidad (una pregunta, 5, 10 y 15 minutos) y tres actividades enfocadas en las áreas de práctica de la usuaria.
- **Entrevistas de práctica:** preguntas generadas para el plan, respuestas por texto o voz, transcripción de audio, informe de feedback e historial.
- **Actividades y progreso:** actividades de bienestar y confianza, ejercicios personalizados y registro de avances.
- **Actualidad:** noticias y eventos organizados por sector y ciudad. Las fuentes en vivo dependen de la configuración del backend; puede haber contenido editorial de ejemplo.

Las recomendaciones de la IA son material educativo para practicar. SheReady no diagnostica ni predice resultados de contratación.

## Tecnologías

| Parte | Tecnologías |
| --- | --- |
| Aplicación | React Native, Expo y TypeScript; Expo Web para navegador |
| API | FastAPI, Python 3.12+, Pydantic y SQLAlchemy |
| Base de datos | PostgreSQL y migraciones con Alembic |
| IA y transcripción | Groq por defecto, configurable desde el backend |
| Voz | Síntesis del dispositivo con Expo Speech; transcripción procesada por la API |

El frontend no contiene claves de proveedores. La URL de la API se configura con `EXPO_PUBLIC_API_URL`; las claves de IA y la conexión de base de datos pertenecen únicamente al backend.

## Estructura del repositorio

```text
SheReady/
├── app/                    # Aplicación Expo para móvil y web
│   ├── App.tsx              # Sesión, onboarding y flujo principal
│   └── src/
│       ├── components/      # Componentes compartidos
│       ├── features/        # Flujos de onboarding, entrevistas y actividades
│       ├── navigation/      # Navegación entre secciones
│       ├── screens/         # Pantallas principales
│       ├── services/        # Cliente HTTP, sesión y voz
│       └── assets/           # Logo e ilustraciones
├── api/                     # API FastAPI, persistencia, IA y migraciones
└── docs/                    # Notas de arquitectura y trabajo pendiente
```

## Requisitos

- Node.js compatible con la versión indicada en `app/package.json` y pnpm.
- Python 3.12 o superior.
- PostgreSQL local o una instancia PostgreSQL accesible.
- Una clave de Groq para las funciones de IA y transcripción. Sin credenciales configuradas, esas funciones no pueden generar contenido.

## Ejecutar en local

### 1. API

Desde la raíz del repositorio:

```bash
cd api
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

Edita `api/.env`: configura `DATABASE_URL`, `GROQ_API_KEY` y el origen web en `CORS_ORIGINS`. No compartas ni subas el archivo `.env`.

Para usar el PostgreSQL local definido por el proyecto, inicia Docker y ejecuta:

```bash
docker compose up -d db
python -m alembic upgrade head
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

La API queda en <http://localhost:8000>. Documentación interactiva: <http://localhost:8000/docs>; comprobación de servicio: <http://localhost:8000/health> y <http://localhost:8000/ready>.

### 2. Aplicación

En otra terminal:

```bash
cd app
pnpm install
cp .env.example .env
```

Configura `EXPO_PUBLIC_API_URL` en `app/.env`. Para navegador o simulador en el mismo ordenador, normalmente será `http://localhost:8000`. Para un teléfono físico, usa la dirección IP local del ordenador en la red, ya que `localhost` en el teléfono apunta al propio teléfono.

Arranca Expo:

```bash
pnpm start
```

Para abrir la versión web:

```bash
pnpm web
```

## Comprobaciones

```bash
# Frontend
cd app
pnpm typecheck

# Backend (desde api/, con requirements-dev.txt instalado)
python -m pytest -q
python -m ruff check .
```

Las pruebas del backend usan una base temporal y proveedores de IA simulados; no necesitan llamar a Groq.

## Documentación relacionada

- [Guía de la API](api/README.md)
- [Autenticación y sesiones](api/AUTH.md)
- [Actualidad y fuentes de noticias](api/ACTUALIDAD.md)
- [Contrato de planificación personalizada](api/PLAN_PERSONALIZADO.md)
- [Notas del cliente de API móvil](app/API-CLIENT.md)
- [Plan de trabajo de IA y despliegue](docs/PLAN_DESPLIEGUE_IA.md)
