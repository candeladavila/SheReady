# Plan pendiente: despliegue e integración de IA

Cuando se solicite preparar el despliegue de SheReady o expresiones equivalentes, recuperar este contexto e implementarlo como parte del trabajo solicitado. Este documento describe funcionalidades pendientes; no implica que ya existan.

## Flujo personalizado previsto

1. La nueva usuaria selecciona sus intereses y completa el onboarding.
2. Realiza una entrevista inicial común de tres minutos, con las mismas preguntas para todas.
3. La IA analiza las preguntas y respuestas de esa entrevista y genera un perfil de características, fortalezas y áreas de mejora de la usuaria. El backend debe guardar este perfil de forma persistente y asociarlo a su cuenta para personalizar la preparación. Es una guía educativa, no un diagnóstico ni una valoración definitiva de la persona.
4. En su perfil, la usuaria selecciona el puesto o rol al que quiere aplicar. El plan se genera para esa usuaria y ese rol, a partir de su perfil y, cuando exista, de la información de la oferta y la entrevista real.
5. La IA genera tres simulacros distintos para cada duración de práctica de 5, 10 y 15 minutos: nueve en total por usuaria y rol. Cada intento usa el siguiente simulacro de la duración elegida, de forma cíclica; el progreso debe persistir por usuaria, rol y duración.
6. La IA también propone exactamente tres actividades personalizadas por usuaria y rol para trabajar las áreas de mejora identificadas y reforzar sus habilidades. El backend valida la respuesta y crea las actividades con el contenido necesario para que funcionen con la estructura y las experiencias de actividades existentes.
7. Al finalizar cada simulacro, el backend envía a la IA las preguntas y la transcripción de las respuestas y genera un informe claro, estructurado y educativo, con fortalezas, sugerencias y ejemplos de reformulación para mejorar su forma de expresarse.

## Contrato propuesto para actividades generadas

La IA debe devolver JSON estructurado; el esquema final, los tipos de actividad compatibles y las rutas se definirán durante la implementación. Ejemplo orientativo para una respuesta de tres actividades:

```json
{
  "actividades": [
    {
      "tipo": "reflexion_guiada",
      "titulo": "Presenta un logro con claridad",
      "descripcion": "Organiza un ejemplo profesional para explicarlo con seguridad.",
      "objetivo": "Mejorar la presentación de experiencias relevantes.",
      "area_de_mejora": "comunicación de logros",
      "duracion_minutos": 3,
      "instrucciones": ["Elige una experiencia.", "Describe qué hiciste y qué resultado obtuviste."],
      "preguntas": ["¿Qué aportaste y qué aprendiste?"],
      "color": "#B9A3DE"
    }
  ]
}
```

El ejemplo muestra una actividad para ilustrar los campos; la respuesta real debe contener tres. El backend validará el esquema, la cantidad, los tipos admitidos, las instrucciones y el color, y asignará identificadores y relaciones con la usuaria y el rol. Las tarjetas de estas actividades usarán un color liso de la paleta de SheReady o compatible con ella. No se generan iconos ni imágenes para cada actividad personalizada. La creación, persistencia, ejecución y revisión del plan están pendientes.

## Contexto de despliegue

- El repositorio contiene `app` (Expo/React Native y web) y `api` (FastAPI).
- Se plantea desplegar la web y el backend en Vercel y usar Groq para la generación de contenido. Confirmar compatibilidad, límites y costes vigentes al implementarlo.
- La clave de Groq debe permanecer en el backend mediante variables de entorno; no incorporarla al frontend ni al repositorio.
- Diseñar la persistencia necesaria para datos, simulacros, avance cíclico, transcripciones, informes y actividades; la implementación concreta queda pendiente.
- Revisar la integración existente de transcripción e IA y completar y verificar el flujo personalizado descrito arriba antes de darlo por implementado.
