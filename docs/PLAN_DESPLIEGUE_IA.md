# Plan pendiente: despliegue e integración de IA

Cuando se solicite preparar el despliegue de SheReady o expresiones equivalentes, recuperar este contexto e implementarlo como parte del trabajo solicitado. Este documento describe funcionalidades pendientes; no implica que ya existan.

## Flujo de entrevistas personalizadas

1. La usuaria completa sus datos personales y registra su primera entrevista real.
2. A partir de sus datos y de la información de la entrevista, generar tres simulacros diferentes para cada duración disponible: 5, 10 y 15 minutos (nueve en total).
3. En cada intento, usar un simulacro distinto de la duración elegida, recorriendo cíclicamente los tres preparados para esa duración.
4. Al finalizar cada simulacro, enviar al backend las preguntas y la transcripción de las respuestas para generar un informe claro, estructurado y educativo, con recomendaciones para mejorar su forma de expresarse en entrevistas laborales.
5. Cuando la usuaria seleccione una entrevista real, generar una serie de actividades personalizadas para prepararla, siguiendo la estructura y experiencia de las actividades existentes.

## Contexto de despliegue

- El repositorio contiene `app` (Expo/React Native y web) y `api` (FastAPI).
- Se plantea desplegar la web y el backend en Vercel y usar Groq para la generación de contenido. Confirmar compatibilidad, límites y costes vigentes al implementarlo.
- La clave de Groq debe permanecer en el backend mediante variables de entorno; no incorporarla al frontend ni al repositorio.
- Diseñar la persistencia necesaria para datos, simulacros, avance cíclico, transcripciones, informes y actividades; la implementación concreta queda pendiente.
- La transcripción de voz y la integración de IA están pendientes y deben tratarse como tales hasta su implementación y verificación.
