# SheReady API

Backend de demo con FastAPI, SQLAlchemy, PostgreSQL y Gemini. Python **3.12+**.
La app móvil/web se desarrolla por separado en `app/`; este cambio solo afecta a `api/`.

## Arranque local

Desde la carpeta `api/`, en PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env
# Edita .env e introduce GEMINI_API_KEY. No subas .env a Git.
docker compose up -d db
.\.venv\Scripts\python -m alembic upgrade head
.\.venv\Scripts\python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Alternativa con API y PostgreSQL en contenedores: tras crear `.env`, ejecuta
`docker compose up --build`. Docker Desktop debe estar iniciado. El volumen `pgdata`
mantiene los datos al reiniciar; las credenciales de compose son solo para desarrollo local.

- Documentación interactiva: <http://localhost:8000/docs>
- Contrato OpenAPI: <http://localhost:8000/openapi.json>
- Proceso vivo: `GET /health`
- Conexión y esquema de base de datos: `GET /ready`
- Configuración de IA (sin revelar secretos): `GET /capabilities`

En un móvil físico, usa la IP local del ordenador, no `localhost`. En web, añade el
origen exacto del frontend a `CORS_ORIGINS`. La web publicada necesita HTTPS para el micrófono.

## Configuración de IA y coste

Crea una API key en Google AI Studio e introdúcela únicamente en `.env` o en las variables
del servidor. Los modelos son configurables con `GEMINI_MODEL`, `GEMINI_AUDIO_MODEL` y
`GEMINI_TTS_MODEL`; los nombres de `.env.example` son puntos de partida, no una garantía
de acceso o cuota gratuita. Comprueba los modelos habilitados en tu proyecto antes de la demo.
La transcripción usa audio inline; no se crean archivos persistentes en Google Files API.

No hay modo de respuestas prefabricadas para IA. Sin clave devuelve 503; cuota agotada,
429; respuesta inválida o fallo del proveedor, 502; timeout, 504. Los mocks existen solo
en las pruebas. No se realizan reintentos automáticos que multipliquen llamadas.

Las preguntas se crean con una batería de referencia en `data/question_bank.json`, perfil
y feedback reciente (máximo tres entrevistas y tres actividades). La edad se guarda en el
perfil pero se omite del contexto que decide la dificultad. No se usan agentes autónomos,
vectores ni servicios adicionales para esta demo.

## Funcionalidad y decisiones

- Un perfil de prueba compartido, sin registro ni cuentas individuales.
- Onboarding obligatorio: edad, sector, puesto, años de experiencia, minutos diarios,
  al menos una fortaleza y un área de mejora, y fecha o plazo de entrevista.
- `interview_in_days` se convierte en una fecha concreta usando `APP_TIMEZONE`.
  Para editar conservando la fecha envía `interview_date` y omite el plazo.
- Una actividad generada por día del perfil. Respuesta libre por texto y feedback de IA.
  La misma petición de actividad devuelve la ya creada, incluso si está completada.
- Entrevistas estimadas de 3/5/10 minutos, con un máximo de 2/3/5 preguntas respectivamente.
  No hay temporizador estricto: la usuaria puede terminar después de su primera respuesta.
- Preguntas de voz bajo petición; respuestas en audio se transcriben primero y NO se guardan
  hasta que la usuaria confirma o edita el texto y lo envía como respuesta.
- Finalizar es una petición explícita, separada de la última respuesta. Puede reintentarse
  si falla el feedback sin repetir las respuestas ya confirmadas.
- Historial paginado y eliminación en cascada de entrevista, turnos y feedback.
- El progreso se calcula desde las prácticas conservadas, por habilidad. Los hitos
  cuentan actividad realizada, sin puntuaciones de empleabilidad ni evaluaciones profesionales.
- La personalización se lee de los registros actuales: al borrar una entrevista se elimina
  su feedback del contexto futuro y se recalculan sus contribuciones al progreso. Actividades
  ya generadas y completadas siguen siendo prácticas independientes.
- Noticias, eventos y bienestar son contenido editorial de ejemplo, con `is_sample: true`.
  Los eventos ficticios no tienen fecha ni enlace de inscripción. No hay fuentes en vivo.

## Persistencia y estructura

Las migraciones crean `profiles`, `activities`, `interviews` e `interview_turns`. Se usan
claves foráneas con cascada, índices y unicidad por perfil/día y entrevista/posición.
Los campos variables del perfil y los resultados de IA se guardan como documentos JSON
validados en la API; las relaciones, estados, fechas y respuestas son columnas relacionales.
Las entrevistas guardan una copia del perfil relevante al comenzar para mantener coherencia.

La versión de cada entrevista/actividad protege frente a actualizaciones concurrentes.
Repetir la misma respuesta confirmada devuelve su estado; intentar sustituirla devuelve 409.
Dos creaciones simultáneas de actividad diaria pueden consumir dos llamadas de IA, pero
solo se guarda una. Al recibir 409 recupera el estado antes de reintentar.

Los audios no se guardan en la base de datos. Multipart puede usar un archivo temporal
durante la petición; se cierra al terminar. Límite por archivo: 8 MiB por defecto, además
de un límite de cuerpo previo al parser. El frontend debe limitar las grabaciones
(recomendado: 90 segundos por respuesta) y borrar su archivo local cuando deje de necesitarlo.
La duración real del audio no se verifica en el servidor; el tamaño y el texto sí se limitan.

## Pruebas

```powershell
.\.venv\Scripts\python -m pip install -r requirements-dev.txt
.\.venv\Scripts\python -m pytest -q
.\.venv\Scripts\python -m ruff check .
```

Por defecto las pruebas usan SQLite temporal y un proveedor de IA inyectado, sin coste ni
red. Incluyen recorrido completo, borrado, progreso, validación, rollback, cuota, formato
de voz y migraciones. Para ejecutar las pruebas de rutas sobre PostgreSQL, establece
`TEST_DATABASE_URL=postgresql+psycopg://...` a una base **exclusivamente de pruebas**:
las fixtures crean y eliminan sus tablas. No uses la base de la demo.

Para una comprobación real, configura la clave y la base de datos y sigue el recorrido
de `FRONTEND.md` desde `/docs`: perfil, actividad, entrevista, audio, transcripción y feedback.
Comprueba también cuota y latencia antes de tomar las capturas.

## Despliegue de la demo

La infraestructura no se crea automáticamente. Puedes alojar FastAPI en Render y usar
PostgreSQL de Render o Neon. Para un servicio Python con el repositorio conectado:

- Root Directory: `api`
- Build Command: `pip install -r requirements.txt`
- Start Command: `python -m alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health Check Path: `/ready`
- Variables: `DATABASE_URL`, `GEMINI_API_KEY`, modelos habilitados, `CORS_ORIGINS`
  y `DEMO_ACCESS_TOKEN` si debe tener una barrera de acceso compartida.

También puede desplegarse usando el Dockerfile con contexto `api/`. Las migraciones se
ejecutan antes de iniciar el proceso; esta configuración está pensada para una instancia.
En PostgreSQL remoto usa la cadena proporcionada por el servicio, incluidos sus parámetros
de TLS. Se aceptan prefijos `postgres://`, `postgresql://` y `postgresql+psycopg://`.
No uses el sistema de archivos efímero del servicio para almacenar datos de la demo.

No publiques una demo sin token con transcripciones personales: el perfil es compartido.
El token opcional es una barrera de demo, no autenticación individual; CORS tampoco lo es.
Para esta hackathon usad datos ficticios y acceso controlado. Antes de grabar, explicad
que el audio se procesa con Google y qué transcripciones se conservan. La retención del
proveedor no se controla borrando una entrevista en vuestra base de datos.

Referencias: [Gemini y audio](https://ai.google.dev/gemini-api/docs/audio),
[voz](https://ai.google.dev/gemini-api/docs/speech-generation),
[cuotas y precios](https://ai.google.dev/gemini-api/docs/pricing),
[condiciones de datos](https://ai.google.dev/gemini-api/terms),
[servicios gratuitos de Render](https://render.com/docs/free).
