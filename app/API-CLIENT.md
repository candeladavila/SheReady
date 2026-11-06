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

Las pantallas actuales aún utilizan datos locales. Deben conectarse de forma incremental a
este cliente y adaptar sus campos al contrato de `api/FRONTEND.md`; en particular, el perfil
del backend exige edad, puesto, experiencia, fortalezas, mejoras y fecha de entrevista.
