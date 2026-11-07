# Publicación de la demo en Vercel

Web de producción y URL para la tarjeta NFC: https://sheready.vercel.app
API de producción: https://sheready-api.vercel.app
Proyecto PostgreSQL: `vsdbppmgbytyuyqgknfr` (SheReady, Supabase, Londres).

Se crean dos proyectos del mismo repositorio: la web con raíz `app/` y FastAPI con raíz
`api/`. PostgreSQL se aloja en Supabase; Groq procesa texto y transcripción. Ninguno necesita
que el ordenador de desarrollo esté encendido. Las voces dependen del dispositivo.

## API

El proyecto de Vercel con raíz `api/` detecta FastAPI y `main:app`. `vercel.json` aplica
las migraciones Alembic durante la compilación y limita el audio a 4.000.000 bytes para
dejar espacio a las cabeceras multipart bajo el límite de las funciones de Vercel.
Los archivos `.env`, los modelos locales y el entorno Python no se suben.
Vercel instala las dependencias declaradas en `[project].dependencies` de `pyproject.toml`;
mantenerlas sincronizadas con `requirements.txt`, utilizado para el entorno local.

Configurar como variables de **Production**:

- `DATABASE_URL`: conexión PostgreSQL de Supabase con TLS (`sslmode=require`), mediante
  el pooler de transacciones (puerto 6543) para las peticiones de la aplicación.
- `MIGRATION_DATABASE_URL`: conexión de sesión (puerto 5432) para Alembic. Permite usar
  IPv4 sin el complemento de pago de Supabase. No confundirla con la URL de la Data API.
- `GROQ_API_KEY`: secreto de Groq, nunca una variable `EXPO_PUBLIC_*`.
- `CORS_ORIGINS`: origen HTTPS exacto de la web publicada, sin barra final.
- `GROQ_MODEL=openai/gpt-oss-120b`.
- `GROQ_AUDIO_MODEL=whisper-large-v3-turbo`.

`AI_PROVIDER=groq`, `DATABASE_POOLING=null` y `MAX_AUDIO_BYTES=4000000` están definidos
en la configuración de Vercel. Se desactivan prepared statements para el pooler de Supabase.
La migración habilita RLS sin políticas públicas en las tablas de la demo: solo FastAPI
se conecta mediante las credenciales privadas del servidor. No se necesita clave de Supabase en Expo.
El proceso de compilación requiere acceso a la base de datos para las migraciones.
No apuntar los previews a una base con datos que se quieran conservar: una migración de
un preview también modifica la base a la que apunte `DATABASE_URL`.

## Web

El proyecto con raíz `app/` instala el lockfile de pnpm y ejecuta `scripts/export-web.mjs`.
Solo necesita `EXPO_PUBLIC_API_URL=https://<dominio-estable-de-la-api>`. El script rechaza
direcciones HTTP/locales y desactiva la carga del `.env` del ordenador al exportar.
El directorio publicado es `dist/`. Las rutas de la SPA vuelven a `index.html`.

## Verificación antes de grabar la NFC

1. `GET https://<api>/ready` devuelve `{"status":"ready"}`.
2. `GET https://<api>/capabilities` muestra Groq configurado y `speech_transport=device`.
3. Abrir la web HTTPS desde un móvil y completar onboarding, una actividad y una entrevista.
4. Comprobar lectura en español, permisos de micrófono, transcripción y feedback.
5. Recargar y consultar la entrevista guardada para verificar persistencia.
6. Grabar en la NFC la URL **de producción** de la web, no la URL temporal de un despliegue.

La demo utiliza cuentas individuales. El perfil anterior pertenece a la cuenta demo;
las credenciales están en api/.env.demo.local. El frontend incluye acceso como invitada
sin compartir el historial de otras cuentas. Las cuotas gratuitas de Vercel, Supabase y
Groq pueden limitar su disponibilidad; no se activa facturación de pago en este proceso.
