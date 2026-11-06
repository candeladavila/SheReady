# Cliente de la API

Configura `EXPO_PUBLIC_API_URL` en `app/.env` (por ejemplo `http://localhost:8000` en web).
Reinicia Expo después de cambiarla. En un móvil físico usa la IP local del ordenador y asegúrate
de que FastAPI escucha en la red; `localhost` en el móvil se refiere al propio dispositivo.
Para web, configura el origen exacto en `CORS_ORIGINS` del backend.

```ts
import { api, ApiError } from '../services/api';

try {
  const activity = await api.activities.daily();
  console.log(activity.title);
} catch (error) {
  if (error instanceof ApiError) console.log(error.status, error.message, error.detail);
}
```

El cliente concentra las rutas, los tipos, los errores y un límite de espera de 90 segundos.
No reintenta automáticamente las peticiones. `status` es `null` si no se pudo conectar,
se canceló o venció el tiempo. Una respuesta 409 puede significar que falta el onboarding
o que una operación entró en conflicto; consulta el mensaje y recupera el estado.

Para voz, `speech` devuelve un `Blob` WAV; la reproducción requiere adaptarlo al reproductor
de cada plataforma. `transcribe` acepta un `Blob` en web o `{ uri, name, type }` en móvil.
La transcripción no se guarda hasta llamar a `interviews.answer` con el texto revisado y el
ID del turno. No establezcas el encabezado multipart manualmente.

Las variables `EXPO_PUBLIC_*` se incluyen en la aplicación y son públicas: **no pongas ahí**
la clave de Gemini ni un token secreto. Para una futura sesión se puede crear el cliente con
`createApiClient({ baseUrl, getToken })`; conectar ese proveedor no implementa autenticación.

## Integración sin rediseño

Se conserva el layout y los estilos originales. Inicio carga noticias en el espacio
existente; las prácticas de bienestar registran su finalización sin añadir tarjetas.
El menú y las animaciones de entrevista son los originales, con sus controles conectados
al backend. El historial abre el análisis dentro de la pantalla de revisión existente.
No se han añadido campos al onboarding visual ni se inventan los datos que faltan: por
ahora el perfil completo del backend debe existir antes de empezar (PUT /profile en /docs).

## IA local

El backend admite AI_PROVIDER=ollama y OLLAMA_MODEL=qwen3:4b. Los endpoints de preguntas,
actividades y feedback conservan el mismo contrato. Qwen procesa texto: el modo Ollama
actual devuelve un error explícito en transcripción y síntesis de voz, sin enviar nada
a Gemini. Falta configurar motores de audio locales antes de usar entrevistas por voz.
PostgreSQL sigue requiriendo una instancia accesible y migraciones aplicadas. La voz de
la interfaz no debe confundirse con las preguntas de texto ya generadas por Ollama.


### Expo Go en móvil físico

La configuración local apunta ahora a `http://192.168.1.141:8000`. El móvil y el
ordenador deben estar en la misma Wi-Fi. Al cambiar la IP o EXPO_PUBLIC_API_URL, reinicia
Expo con `pnpm exec expo start --clear --lan`. Para publicar la API solo en esa IP:
`cd api` y `./start-local.ps1 -BindAddress 192.168.1.141`. La IP puede cambiar al cambiar
de red; en ese caso actualiza la variable y el parámetro. Comprueba `/ready` desde el
navegador del móvil antes de probar la app. No uses localhost para acceder al ordenador
desde un teléfono.


### Audio local operativo en Windows

Ollama genera el texto; Windows System.Speech sintetiza la voz española y Whisper base
transcribe las grabaciones en el ordenador. El cliente espera a que termine la pregunta
antes de activar el micrófono. Los modelos se descargan durante la configuración;
las grabaciones no se envían a Gemini. La calidad de reconocimiento puede variar según
el ruido, la pronunciación y los términos técnicos. La prueba desde un móvil físico
sigue siendo necesaria para validar permisos, altavoz y micrófono del dispositivo.
