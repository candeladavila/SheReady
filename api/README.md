# SheReady API

**Autenticación individual:** consultar [AUTH.md](AUTH.md). La nueva versión requiere
un token de sesión para los datos de producto. La cuenta demo conserva sus datos;
las nuevas cuentas tienen perfil y progreso propios.

Backend de demo con FastAPI, SQLAlchemy, PostgreSQL y Groq. Python **3.12+**.
Gemini y Ollama siguen disponibles mediante `AI_PROVIDER`.

## Arranque local

Desde la carpeta `api/`, en PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env
# Edita .env e introduce GROQ_API_KEY. No subas .env a Git.
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

Selecciona `AI_PROVIDER=groq` y guarda `GROQ_API_KEY` únicamente en `.env` o como secreto
del servidor. La plantilla `groq.env.example` contiene la configuración mínima, pero no
debes copiarla sobre un `.env` que ya contenga tus credenciales de base de datos.
Por defecto, `GROQ_MODEL=openai/gpt-oss-120b` genera preguntas, actividades y feedback;
`GROQ_AUDIO_MODEL=whisper-large-v3-turbo` transcribe las grabaciones en español mediante
multipart. El audio se envía a Groq para procesarlo; esta aplicación no lo conserva.
La cuota gratuita depende de la cuenta y se comparte entre todas las usuarias. Consulta
los [límites de Groq](https://console.groq.com/docs/rate-limits); no se activa un plan de pago.

Con Groq, `GET /capabilities` indica `speech_transport=device`. El cliente utiliza
`expo-speech` para leer el texto de la pregunta en español y solo después abre el micrófono.
No requiere Ollama, Whisper local, PowerShell ni dependencias de `requirements-local-audio.txt`.
La voz disponible depende del navegador/dispositivo; en iPhone hay que desactivar el modo
silencio. Hay que probar la reproducción y permisos de micrófono en la web HTTPS desde los
móviles que se usarán en la demo. El endpoint antiguo `/speech` devuelve 409 en este modo:
el cliente debe consultar las capacidades y usar la voz del dispositivo.

Para seleccionar Gemini utiliza `AI_PROVIDER=gemini`, `GEMINI_API_KEY` y sus variables
`GEMINI_MODEL`, `GEMINI_AUDIO_MODEL` y `GEMINI_TTS_MODEL`. Comprueba el acceso a los modelos
en la cuenta correspondiente antes de cambiar de proveedor.

No hay modo de respuestas prefabricadas para IA. Sin clave devuelve 503; cuota agotada,
429; respuesta inválida o fallo del proveedor, 502; timeout, 504. Los mocks existen solo
en las pruebas. No se realizan reintentos automáticos que multipliquen llamadas.

Las preguntas se crean con una batería de referencia en `data/question_bank.json`, perfil
y feedback reciente (máximo tres entrevistas y tres actividades). La edad se guarda en el
perfil pero se omite del contexto que decide la dificultad. No se usan agentes autónomos,
vectores ni servicios adicionales para esta demo.

## Funcionalidad y decisiones

- Cuentas individuales con registro, login y sesiones revocables; cuenta demo precargada.
- Onboarding obligatorio: edad, sector, puesto, años de experiencia, minutos diarios,
  al menos una fortaleza y un área de mejora, y fecha o plazo de entrevista.
- `interview_in_days` se convierte en una fecha concreta usando `APP_TIMEZONE`.
  Para editar conservando la fecha envía `interview_date` y omite el plazo.
- Una actividad generada por día del perfil. Respuesta libre por texto y feedback de IA.
  La misma petición de actividad devuelve la ya creada, incluso si está completada.
- Entrevistas por puesto con una pregunta o 5/10/15 minutos, con 1/3/5/7 preguntas respectivamente. Se requiere un plan propio listo.
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
- Noticias y eventos usan proveedores configurables; consulta [Actualidad](ACTUALIDAD.md).
  Bienestar sigue siendo contenido editorial de ejemplo.

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


## Ollama local (alternativa a Gemini para texto)

En `.env` configura `AI_PROVIDER=ollama`, `OLLAMA_MODEL=qwen3:4b` y, si hace falta,
`OLLAMA_URL=http://127.0.0.1:11434`. Ejecuta `ollama pull qwen3:4b` y mantén Ollama
iniciado. Hay un ejemplo en `ollama.env.example`. En esta máquina se ha configurado
el proveedor local; PostgreSQL se configura por separado con DATABASE_URL.

Ollama genera preguntas, actividades y feedback con JSON Schema y validación Pydantic.
No hay sustitución automática por Gemini. El timeout local se controla mediante
OLLAMA_TIMEOUT_SECONDS (180 por defecto). El primer arranque del modelo puede ser lento.

Qwen3:4b sigue generando el texto; los motores locales de audio se describen al final de este documento. PostgreSQL se configura por separado.

## Arranque local en Windows

PostgreSQL se ejecuta con el servicio `db` de `compose.yaml`, con volumen persistente
`api_pgdata` y puerto local 5432. La configuración local usa Ollama para texto.
Para iniciar la base, aplicar migraciones y mantener FastAPI en primer plano:

```powershell
cd api
.\start-local.ps1
```

Docker Desktop debe poder iniciar su motor Linux. La API se publica en
http://localhost:8000 y `/ready` verifica la conexión PostgreSQL y el esquema.
El frontend web usa EXPO_PUBLIC_API_URL=http://localhost:8000. Para un dispositivo
físico se necesita la IP del ordenador y arrancar Uvicorn escuchando en la red;
`localhost` en el teléfono apunta al teléfono, no a este ordenador.

Una base nueva no contiene perfil: PUT /profile debe guardar los campos obligatorios
antes de POST /interviews. El onboarding visual introductorio aún no envía esos campos;
no se crean perfiles ficticios automáticamente. Ollama ya genera texto, pero la voz
local sigue pendiente de motores de transcripción y síntesis.


## Voz local configurada

El proveedor Ollama utiliza ahora Windows System.Speech con voz española para sintetizar
las preguntas y faster-whisper (base multilingüe, CPU int8) para transcribir respuestas.
No se envía audio a Gemini. Instala `requirements-local-audio.txt` y ejecuta una vez
`python prepare-local-audio.py` para descargar el modelo. Después la transcripción usa
solo los archivos locales en `.models/whisper-base` (ignorados en Git). El audio temporal
de síntesis se elimina al terminar la petición. Esta síntesis requiere Windows con una
voz española instalada y no es compatible con el contenedor Linux del Dockerfile actual.

## Dictado en campos de texto

El dictado requiere sesión y usa `POST /dictation/transcriptions`; no crea ni guarda respuestas. Con `GROQ_API_KEY` configurada utiliza el modelo Whisper de Groq (`GROQ_AUDIO_MODEL`); sin ella necesita el modelo local faster-whisper preparado según las instrucciones anteriores. El audio se envía al servidor y, cuando se usa Groq, a ese proveedor. Se debe informar a la usuaria antes de grabar. La grabación se limita a 90 segundos y la transcripción se puede editar antes de guardar. No se ofrece dictado en contraseñas ni en la pantalla de acceso, ya que aún no existe sesión.
