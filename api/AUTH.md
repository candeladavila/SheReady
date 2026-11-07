# Inicio de sesión para el frontend

Backend preparado con cuentas propias de SheReady almacenadas en PostgreSQL de Supabase.
No utiliza Supabase Auth ni necesita claves de Supabase en el frontend. El identificador
de la cuenta se obtiene de la sesión; el cliente nunca envía `user_id` ni `profile_id`.

## Endpoints

`POST /auth/register` (201) y `POST /auth/login` (200) reciben JSON:

```json
{"email":"usuaria@example.com","password":"una-contraseña-de-al-menos-12-caracteres"}
```

Correo válido, contraseña de 12 a 128 caracteres. El correo se normaliza a minúsculas.
La respuesta incluye `access_token`, `token_type=bearer`, `expires_in=604800`,
`expires_at` y `user: {id,email,created_at}`. Registrar no crea un perfil vacío:
hay que completar el onboarding mediante `PUT /profile`.

Todas las rutas de producto (incluyendo `/capabilities`, opciones, historial, audio y
progreso) requieren `Authorization: Bearer <access_token>`. Las rutas `/auth/register`,
`/auth/login`, `/health`, `/ready` y documentación son públicas.

- `GET /auth/me`: obtiene la cuenta autenticada.
- `POST /auth/logout`: revoca la sesión actual y devuelve 204. El frontend borra su token.
- `POST /auth/delete-account`: recibe `{ "password": "..." }` y elimina la cuenta
  autenticada y sus datos asociados; requiere confirmar la contraseña y devuelve 204.
  El cliente elimina además los datos de esa cuenta guardados en el dispositivo.
- Sesión caducada, revocada o token inválido: 401; volver al login. No hay refresh token.
- Registro duplicado: 409; datos de entrada inválidos: 422.
- Perfil sin onboarding: 409; recurso de otra usuaria: 404.
- Cinco accesos fallidos bloquean temporalmente la cuenta durante cinco minutos.

El cliente debe guardar el token usando almacenamiento apropiado de la plataforma y
pasarlo al `getToken` del cliente centralizado existente. Las contraseñas no se guardan
en el frontend. No incluir tokens en URLs ni escribirlos en logs.

## Datos de cada cuenta

Perfil, actividades diarias, entrevistas, transcripciones, feedback, progreso, hitos,
bienestar y contexto para IA se limitan a la identidad autenticada. Noticias y contenido
editorial siguen siendo comunes. Las contraseñas se guardan con Argon2; los tokens
aleatorios solo se guardan como hash SHA-256 y son revocables.

## Cuenta demo y puesta en marcha

Las credenciales están en **`api/.env.demo.local`**, excluido de Git y de Vercel.
La cuenta demo usa el identificador heredado `demo` para conservar el perfil y las
prácticas anteriores. Las nuevas cuentas obtienen identificadores distintos.

Desde `api/`:

```powershell
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m alembic upgrade head
.\.venv\Scripts\python seed-demo-account.py
```

Para la base remota, el script admite `--production` y utiliza la conexión privada de
`.env.production.local`. No publicar ninguna de esas variables en Expo.

La API y el frontend de login ya se han publicado conjuntamente en Vercel.
`PUT /profile/onboarding` recibe el documento JSON del onboarding y lo asocia al usuario
que autentica el token. No acepta identificadores de otras cuentas. Permite conservar
rangos de edad, tiempo flexible y campos sin responder sin inventar valores. Los datos
profesionales de un perfil existente se conservan. `GET /profile` devuelve el documento
como `onboarding_document`. Puede haber campos del perfil todavía a null.

El cliente guarda `onboarding-profile.json` en el almacenamiento privado nativo; en web
conserva el JSON en almacenamiento local y ofrece descargarlo desde la pantalla de acceso.
El pendiente se elimina al recibir confirmación del servidor. Un fallo deja el JSON para
reintentar. Las sesiones nativas utilizan SecureStore; en web se utiliza sessionStorage.
La invitada puede explorar y usar bienestar, pero no enviar peticiones de IA sin sesión.

Este alcance no incluye recuperación de contraseña, verificación de correo ni OAuth.
