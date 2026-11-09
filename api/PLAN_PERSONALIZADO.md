# Contratos de planificación y reflexión

## Petición de planificación

`POST /role-plans` recibe los datos del puesto. Si se incluye `offer_url`, el servidor intenta descargar una página pública HTML o texto y extraer hasta 6.000 caracteres para contextualizar el plan. La extracción sigue un número limitado de redirecciones, solo acepta HTTP(S) en puertos web estándar, rechaza destinos con direcciones IP no públicas y limita tiempo y tamaño de respuesta. No envía cookies ni credenciales. Algunos portales bloquean lecturas automáticas o renderizan la oferta con JavaScript; en esos casos, pega la descripción en `offer_description`. Si existe una descripción manual se conserva como alternativa cuando falla la extracción. El contenido extraído se trata como dato no confiable, nunca como instrucciones para el modelo.

El servidor hace una única petición al proveedor de IA configurado y valida la salida con `PersonalizedPlan`; devuelve `502` si no cumple el contrato. El plan ya generado para el mismo puesto se devuelve sin repetir la extracción ni llamar de nuevo a la IA.

```json
{
  "title": "Diseñadora de producto",
  "sector": "Tecnología",
  "company": "Empresa de ejemplo",
  "offer_url": "https://example.com/empleo/disenadora-producto",
  "offer_description": "Diseñar experiencias digitales y colaborar con equipos de producto."
}
```

El puesto requiere título, sector y al menos una URL o descripción. El contexto de la entrevista inicial se carga desde la cuenta autenticada; no se envían fortalezas ni respuestas en esta petición. Una URL puede fallar si el portal requiere iniciar sesión, bloquea el acceso automático o construye la oferta con JavaScript. Se recomienda no incluir datos personales innecesarios.

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

El flujo autenticado guarda la entrevista inicial y su contexto mediante `PUT /profile/initial-interview`. `POST /role-plans` crea y guarda un único plan por cuenta y puesto; `GET /role-plans` recupera los planes propios. Si la generación falla, se puede reintentar; una generación en curso no se duplica. Tras diez minutos un intento abandonado se puede recuperar. La app muestra las actividades del plan activo y permite elegir el puesto desde el perfil. Los simulacros se seleccionan cíclicamente por plan y duración; sus preguntas quedan guardadas en la entrevista. Las respuestas de las actividades se guardan por ahora en el dispositivo, no se sincronizan entre dispositivos. El límite de tokens y el rendimiento dependen del modelo configurado; no se ha probado una generación real con credenciales.

## Modalidad de una pregunta

`POST /interviews` requiere el `plan_id` de un plan propio listo y acepta `duration_minutes` 1, 5, 10 o 15. El valor `1` identifica la modalidad «Una pregunta» y **no implica una duración de un minuto**. Las entrevistas históricas sin plan siguen disponibles para consulta y continuación, pero no se crean otras nuevas sin plan.

## Reflexión al salir de una entrevista

El cliente presenta el mismo cuestionario a todas: satisfacción elegida por la usuaria, acciones que afirma haber realizado y una reflexión opcional. Guarda este JSON en el dispositivo asociado al identificador de entrevista:

```json
{
  "satisfaction": 4,
  "checkpoints": ["explained_experience", "gave_example"],
  "reflection": "Quiero recordar preparar una pregunta para la próxima vez."
}
```

`satisfaction` es un entero de 1 a 5; `checkpoints` puede estar vacío y admite `explained_experience`, `gave_example`, `asked_question`, `discussed_role` y `explained_interest`, sin duplicados; `reflection` puede estar vacío. Es una autoevaluación, no una verificación automática de hechos. El backend define `ExitReflection` para validar el contrato, pero todavía no hay endpoint de sincronización ni almacenamiento de estas respuestas en el servidor. El JSON nuevo de feedback sigue pendiente de las plantillas.

## Informe de entrevista

Al finalizar un simulacro de un plan, la IA devuelve un `InterviewReport` validado
(`interview-report-v1`). Se guarda con la entrevista y se recupera desde el historial.
El contrato completo está en `schemas.py`; su estructura principal es:

```json
{
  "version": "interview-report-v1",
  "headline": "Una práctica para seguir creciendo",
  "summary": "Puedes avanzar con ejemplos concretos.",
  "worked": "Has compartido tu experiencia.",
  "improvement": "Puedes añadir más detalles.",
  "focus": "Explica tu contribución.",
  "skills": [{"label": "Ejemplos", "level": "en_desarrollo", "evidence": "Has descrito una experiencia."}],
  "strengths": [{"title": "Claridad", "evidence": "Explicaste tu experiencia."}],
  "focus_title": "Estructura tu respuesta",
  "focus_explanation": "Ordena la experiencia de principio a fin.",
  "focus_advice": "Habla en primera persona.",
  "checklist": ["Explica qué hiciste."],
  "improvements": [{
    "turn_id": "identificador-del-turno",
    "title": "Añade un ejemplo",
    "observation": "Puedes concretar tu aportación.",
    "original_excerpt": "Una cita literal de tu respuesta",
    "framework": "STAR",
    "parts": [{"label": "Acción", "text": "[Describe tu aportación]"}],
    "why": ["Más concreto"]
  }]
}
```

La API comprueba que cada `turn_id` corresponda a una respuesta y que la cita sea
literal. El prompt pide no inventar hechos o cifras y usar marcadores si faltan datos.
Los niveles orientan la práctica; no son una nota ni un diagnóstico. Los informes
existentes conservan su formato anterior. La vista no exporta PDF todavía.
