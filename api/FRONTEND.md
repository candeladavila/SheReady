# Contrato para conectar el frontend

Todas las rutas usan la misma URL base; no hay prefijo `/api` ni `/v1`.
Fechas: `YYYY-MM-DD`. Timestamps: ISO 8601. JSON UTF-8. Los nombres de campo están en inglés.
La nueva versión requiere una sesión individual. Consulta [AUTH.md](AUTH.md) para
registro, login, tokens, logout y la cuenta demo. No envíes identificadores de usuaria.

`GET /capabilities` devuelve `ai_provider`, `ai_configured`, `models` y `speech_transport`.
Si `speech_transport=device` (Groq), obtiene el texto desde `GET /interviews/{id}` y lee
la pregunta del turno con `expo-speech`, idioma `es-ES`. Espera `onDone` antes de grabar.
Cancelar o salir debe detener la voz; un error de voz no debe activar el micrófono.
Si `speech_transport=server`, utiliza el endpoint WAV `/interviews/{id}/turns/{turn_id}/speech`.
Las grabaciones siguen pasando por `/transcriptions`, independientemente del proveedor.

## Perfil y onboarding

`GET /profile/options` devuelve habilidades y opciones de plazo para los selectores.
Los valores de fortalezas y aspectos a mejorar son textos, no necesitan ser IDs del catálogo.

`GET /profile` devuelve 409 si no se ha completado el onboarding.
`PUT /profile` crea o reemplaza todos los campos editables:

```json
{
  "age": 25,
  "sector": "Tecnología",
  "target_role": "Desarrolladora backend junior",
  "experience_years": 1.5,
  "daily_minutes": 5,
  "strengths": ["Trabajo en equipo", "Curiosidad"],
  "improvement_areas": ["Explicar mis logros"],
  "interview_in_days": 14
}
```

También se puede enviar `interview_date: "2026-11-20"` en lugar de `interview_in_days`.
No envíes ambos ni copies a PUT la respuesta completa: `id`, `days_until_interview`,
`created_at` y `updated_at` son campos de salida. Todos los demás son obligatorios.
Se admiten fechas pasadas para conservar el perfil después de la entrevista; el contador
puede ser negativo. Al editar el perfil se mantiene el historial ya generado.

## Actividad diaria

1. `POST /activities/daily` sin cuerpo genera o recupera la actividad del día.
2. Muestra `title`, `instructions` y `text`.
3. `POST /activities/{id}/answer` con `{"answer":"Respuesta de la usuaria"}`.
4. Muestra `feedback` y actualiza `/progress`.

Actividad devuelta:

```json
{
  "id": "uuid",
  "date": "2026-11-06",
  "title": "Explica tu proyecto",
  "instructions": "Describe tu aportación con un ejemplo.",
  "text": "Pregunta generada por IA",
  "skill": "communication",
  "category": "soft_skills",
  "answer": null,
  "feedback": null,
  "completed_at": null,
  "source": "ai"
}
```

`GET /activities?limit=20&offset=0` devuelve `{items, total}`.
`GET /activities/{id}` recupera una actividad concreta. Una actividad completada
no permite sustituir su respuesta; repetir el mismo envío es seguro.

## Entrevista por turnos

1. `POST /interviews` con `{"duration_minutes":3}` (también 5 o 10).
   Devuelve 201 y una entrevista con `id` y `current_turn`.
2. Muestra `current_turn.question.text`. Para reproducirla solicita
   `GET /interviews/{id}/turns/{turn_id}/speech`: devuelve **bytes WAV**, no JSON ni URL.
3. Graba audio y envía `POST /interviews/{id}/transcriptions` con multipart campo **file**.
   No establezcas manualmente `Content-Type` de multipart: deja que FormData añada el boundary.
4. La respuesta contiene `transcript` y `saved:false`. Muestra el texto para revisarlo.
   También se puede escribir directamente, omitiendo la transcripción.
5. Confirma con `POST /interviews/{id}/answers`:

```json
{"turn_id":"id-del-turno-actual", "answer":"Transcripción revisada o respuesta escrita"}
```

6. Si hay `current_turn`, repite. Si `ready_to_finish` es true, ofrece finalizar.
7. `POST /interviews/{id}/finish` sin cuerpo genera y guarda el feedback final.
   También se permite terminar antes del máximo, tras al menos una respuesta.

Forma de la entrevista:

```json
{
  "id": "uuid",
  "status": "active",
  "duration_minutes": 3,
  "max_questions": 2,
  "answered_questions": 0,
  "ready_to_finish": false,
  "current_turn": {
    "id": "uuid-turno",
    "position": 1,
    "question": {"text":"Pregunta generada", "skill":"self_presentation", "category":"soft_skills"},
    "answer": null,
    "answered_at": null
  },
  "turns": [],
  "feedback": null,
  "created_at": "timestamp",
  "finished_at": null,
  "profile_snapshot": {},
  "disclaimer": "Práctica con IA..."
}
```

`turns` contiene todos los turnos, incluido el actual (el array vacío anterior solo
abrevia el ejemplo). Al finalizar, `status` pasa a `completed`, `current_turn` a null,
`ready_to_finish` a false y aparece `feedback`. La duración elegida es orientativa:
no hay cuenta atrás que corte una grabación. El frontend puede mostrar tiempo transcurrido.

El audio de respuesta admite WAV, MP3, M4A/MP4, AAC, OGG, FLAC y WebM con su MIME correcto.
El proveedor puede rechazar archivos dañados aunque su MIME esté permitido. No reutilices
la transcripción de una pregunta anterior: envía siempre el `turn_id` que se está mostrando.
Desactiva el botón de enviar mientras haya una petición pendiente.

Las llamadas de IA pueden tardar hasta 60 segundos por defecto. Muestra estados
«Preparando pregunta», «Transcribiendo» y «Preparando tus sugerencias». Si falla la voz,
el texto de la pregunta sigue disponible, pero no debe mostrarse como voz reproducida.

## Feedback (actividades y entrevistas)

```json
{
  "summary": "Resumen constructivo",
  "strengths": ["Fortaleza observada en la respuesta"],
  "improvements": [
    {"turn_id":"uuid", "suggestion":"Sugerencia concreta", "reformulation":"Una posible reformulación"}
  ],
  "recommended_activities": [
    {"skill":"communication", "activity":"Ejercicio propuesto para practicar"}
  ]
}
```

`turn_id` identifica la respuesta que debe mostrarse junto a la mejora. En una actividad,
es el ID de la actividad. Renderiza el texto generado como texto, no como HTML ejecutable.

## Historial, progreso y contenido

- `GET /interviews?limit=20&offset=0`: `{items,total}` con ID, estado, duración, fechas y resumen.
- `GET /interviews/{id}`: conversación completa y feedback, permite recuperar el estado tras un fallo.
- `DELETE /interviews/{id}`: 204 sin cuerpo; después actualiza el historial y el progreso.
- `GET /progress`: `completed_activities`, `completed_interviews`, `answered_interview_questions`,
  `skills` con número de prácticas, `milestones` con `current`, `target`, `achieved`,
  `recommendations` con feedback reciente y `measurement` explicando su alcance.
- Habilidades: `technical`, `communication`, `teamwork`, `problem_solving`, `self_presentation`.
- Categorías: `technical`, `professional_situation`, `soft_skills`.
- `GET /news`, `GET /events`, `GET /wellbeing/activities`: `{source:"sample",is_sample:true,items:[...]}`.
  Muestra la etiqueta de ejemplo; eventos con fecha/enlace null no permiten inscripción.

## Errores y recuperación

Los errores usan `{"detail":"mensaje"}`; los de validación 422 incluyen una lista de campos.

| Código | Acción en frontend |
|---|---|
| 401 | Revisar el token compartido de demo. |
| 404 | El recurso se ha eliminado o no existe. Actualizar historial. |
| 409 | Recuperar actividad/entrevista actual. No avanzar el turno localmente. |
| 413 / 415 | Reducir grabación o elegir un formato admitido. |
| 422 | Corregir los campos o repetir la grabación. |
| 429 | Mostrar límite de cuota y esperar; evitar bucles automáticos. |
| 502 / 503 / 504 | Conservar el texto local y permitir reintento manual. |

Si falla la creación de la siguiente pregunta, la respuesta no queda confirmada: reenvía
el mismo texto y turn_id. Si la respuesta del servidor se pierde después del guardado,
repetir exactamente ese envío devuelve el estado actual sin duplicar el turno.
El backend no reintenta solicitudes de IA automáticamente.


## Finalización de bienestar

`POST /wellbeing/completions` recibe:
`{"id":"identificador-unico-del-intento","kind":"breathing","duration_seconds":60}`.
También admite kind="confidence" y duración 0 si la reflexión no tiene temporizador.
Reutiliza el mismo id al reintentar para evitar contar dos veces una práctica. Devuelve
el registro guardado; un id reutilizado con datos distintos devuelve 409. Requiere perfil.
`GET /progress` incluye ahora `completed_wellbeing`, separado de las actividades de IA.
Las frases personales de «mini yo» no se envían ni se guardan en este endpoint.
