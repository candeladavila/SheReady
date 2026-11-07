# Contratos de planificación y reflexión

## Petición de planificación

`POST /plans/generate` recibe un JSON con el contexto declarado por la usuaria y el puesto. El servidor hace una única petición al proveedor de IA configurado; valida la salida con `PersonalizedPlan` y devuelve `502` si no cumple el contrato. El contexto y la oferta son datos, no instrucciones. El endpoint no descarga el contenido de la URL: para tener en cuenta la oferta hay que proporcionar también `offer_description`.

```json
{
  "context": {
    "strengths": ["Escucha activa"],
    "improvement_areas": ["Explicar mis logros con ejemplos"],
    "preferences": ["Practicar con preguntas breves"],
    "initial_answers": ["Me interesa desarrollar productos accesibles."]
  },
  "target_role": {
    "title": "Diseñadora de producto",
    "sector": "Tecnología",
    "company": "Empresa de ejemplo",
    "offer_url": "",
    "offer_description": "Diseñar experiencias digitales y colaborar con equipos de producto."
  }
}
```

`strengths` puede estar vacío; `improvement_areas` contiene al menos un elemento. `preferences` e `initial_answers` son opcionales. El puesto requiere título, sector y al menos una URL o descripción. La URL no se interpreta automáticamente. Se recomienda omitir datos innecesarios y no incluir edad.

## JSON de respuesta de la IA

El contrato completo y sus restricciones se definen en [`schemas.py`](schemas.py) como `PersonalizedPlan`, `PlannedInterview`, `PlannedQuestion` y `PlannedActivity`; también está disponible como esquema JSON en `/openapi.json`. Tiene esta forma:

```json
{
  "single_question": [{"title": "Simulacro 1", "questions": [{"text": "Cuéntame cómo presentarías tu experiencia.", "skill": "communication", "category": "soft_skills"}]}],
  "five_minutes": [],
  "ten_minutes": [],
  "fifteen_minutes": [],
  "activities": [{
    "type": "guided_reflection",
    "title": "Explica un logro",
    "description": "Practica cómo presentar una experiencia.",
    "objective": "Comunicar un logro con claridad.",
    "improvement_area": "Explicar mis logros con ejemplos",
    "skill": "communication",
    "duration_minutes": 3,
    "instructions": ["Elige una experiencia real.", "Describe tu aportación y el resultado."],
    "prompts": ["¿Qué hiciste y qué aprendiste?"],
    "color": "#B9A3DE"
  }]
}
```

**Ejemplo abreviado:** para ser válido debe contener exactamente **tres simulacros en cada una de las cuatro listas** y **tres actividades**. Las preguntas por simulacro son respectivamente 1, 3, 5 y 7. Las modalidades de 5, 10 y 15 minutos son orientativas. Cada pregunta incluye texto, habilidad y categoría; cada actividad incluye tipo, título, descripción, objetivo, área, habilidad, duración, instrucciones, preguntas y color liso de la paleta. La IA no genera iconos.

La respuesta se devuelve al cliente, pero aún **no se guarda como plan**, no crea las actividades en la base de datos y no alimenta los simulacros existentes. Tampoco existe todavía una cuenta individual ni un fichero de contexto sincronizado; el frontend de onboarding conserva sus respuestas localmente. La selección cíclica por persona y puesto sigue pendiente. El límite de tokens y el rendimiento dependen del modelo configurado; no se ha probado una generación real con credenciales.

## Modalidad de una pregunta

`POST /interviews` acepta `{"duration_minutes": 1}` como identificador de la modalidad «Una pregunta» y crea un simulacro con una sola pregunta. El valor `1` es un identificador de compatibilidad y **no implica una duración de un minuto**. Los valores existentes 3, 5, 10 y 15 mantienen sus usos anteriores.

## Reflexión al salir de una entrevista

El cliente presenta el mismo cuestionario a todas: satisfacción elegida por la usuaria, acciones que afirma haber realizado y una reflexión opcional. Guarda este JSON en el dispositivo asociado al identificador de entrevista:

```json
{
  "satisfaction": 4,
  "checkpoints": ["explained_experience", "gave_example"],
  "reflection": "Quiero recordar preparar una pregunta para la próxima vez."
}
```

`satisfaction` es un entero de 1 a 5; `checkpoints` puede estar vacío y admite `explained_experience`, `gave_example`, `asked_question`, `discussed_role` y `explained_interest`, sin duplicados; `reflection` puede estar vacío. Es una autoevaluación, no una verificación automática de hechos. El backend define `ExitReflection` para validar el contrato, pero todavía no hay endpoint de sincronización ni almacenamiento de estas respuestas en el servidor. No se ha diseñado ningún JSON nuevo de feedback.
