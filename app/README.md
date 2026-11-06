# SheReady App

Aplicación móvil de SheReady, creada con React Native, Expo y TypeScript.

## Puesta en marcha

```bash
cd app
npm install
npm start
```

Escanea el código QR con Expo Go o sigue las indicaciones de Expo para abrir la aplicación en un simulador. También puedes usar `npm run android`, `npm run ios` o `npm run web`. Para comprobar los tipos, ejecuta `npm run typecheck`.

## Estructura

```text
app/
├── App.tsx              # Punto de entrada
├── templates/           # Referencias visuales proporcionadas para las pantallas
└── src/
    ├── assets/          # Imágenes, fuentes y otros recursos de la aplicación
    ├── components/      # Componentes reutilizables
    ├── screens/         # Pantallas de la aplicación
    ├── services/        # Acceso a datos y futuras llamadas a la API
    │   └── mocks/       # Datos y respuestas simuladas durante el desarrollo
    ├── theme/           # Estilos y valores visuales compartidos
    └── types/           # Tipos compartidos de TypeScript
```

Se irán creando las pantallas y sus servicios a medida que se definan. Durante el desarrollo, los servicios utilizarán respuestas simuladas en `src/services/mocks`.

## Endpoints pendientes

El onboarding funciona en memoria: no envía datos ni conserva las respuestas al cerrar la aplicación. Su catálogo de opciones y el resumen son locales.

- **Guardar y recuperar el onboarding y el plan inicial**: pendientes de definir método y ruta. Datos previstos: objetivos, rango de edad opcional, tiempo disponible y sector. La respuesta y el contrato de persistencia están pendientes de diseño.
- **Obtener y comenzar la primera actividad**: pendientes de definir método, ruta, datos y respuesta. La pantalla posterior al resumen es provisional y no inicia ninguna actividad.

Estos endpoints aún no existen ni se realizan llamadas a la API.

## Paleta de colores

Los colores de marca están centralizados en `src/theme/colors.ts`. Las nuevas pantallas deben importar `colors` desde ese archivo para mantener la identidad visual. También incluye blanco y variantes translúcidas para superficies, bordes y textos secundarios.

| Color | Valor | Uso principal |
| --- | --- | --- |
| Ciruela | `#593D83` | Color principal, botones y superficies destacadas |
| Lavanda | `#B9A3DE` | Color secundario |
| Coral | `#EF968D` | Acento |
| Verde salvia | `#BCE1D5` | Progreso y logros |
| Marfil | `#FAF8F5` | Fondo general |
| Berenjena | `#282338` | Textos |

## Navegación y demo de entrevista

Tras el onboarding se muestra la navegación principal: en móvil, una barra inferior de iconos con etiquetas accesibles; en pantallas anchas, una barra superior. La entrevista y Actividades están disponibles como experiencias locales; las demás secciones son provisionales.

La entrevista es una demostración local de cuatro intervenciones (dos del entrevistador y dos de la usuaria). Antes de empezar permite elegir 5, 10 o 15 minutos; esta selección es orientativa y todavía no cambia la duración de la demo. No reproduce audio, no solicita el micrófono, no graba respuestas y no realiza análisis. Se usa el mismo [Strands de React Bits](https://www.reactbits.dev/animations/strands) en web y móvil; en Expo Go se ejecuta localmente en un WebView. Si el dispositivo no admite WebGL 2, se muestra una alternativa SVG. Tras cambiar Strands o la paleta, ejecuta `pnpm build:strands` para actualizar la versión integrada en móvil. El entrevistador es una ilustración vectorial animada, no un modelo 3D.

### Endpoints pendientes para entrevistas

- **Crear y conducir una sesión de práctica por voz**: método, ruta, autenticación, transporte y contrato por definir. Deberá gestionar los turnos y los permisos necesarios.
- **Finalizar una entrevista y consultar su análisis**: método, ruta, datos enviados y estructura del resultado por definir. El botón de revisión muestra un estado informativo: la demo no inicia ningún análisis ni añade entrevistas al historial.
- **Consultar el historial y el detalle de entrevistas**: métodos, rutas y respuestas por definir.

## Actividades

La sección Actividades agrupa las actividades diarias y muestra un espacio para futuros planes personalizados de preparación de entrevistas con IA, todavía sin implementar. Incluye una práctica guiada de respiración de 1, 5 o 10 minutos, a elegir antes de empezar (5 segundos de inhalación, 2 de pausa opcional y 5 de exhalación; basado en una pauta del [NHS](https://www.cht.nhs.uk/fileadmin/contentUploads/Services/Clinical/Oncology_Cancer_Services/Oncology/Documents/Booklets/Lung_PA_booklet_FINAL_A5_19.07.22.pdf)), con pausa y salida. La selección musical es opcional y se abre en Spotify. La actividad se pausa cuando la aplicación pasa a segundo plano. No se guardan resultados ni se llama a la API.

### Endpoints pendientes para actividades

- **Consultar catálogo y registrar actividades completadas**: métodos, rutas, persistencia y contratos pendientes de definir.

«Para mi mini yo» permite guardar y eliminar frases localmente en el dispositivo mediante AsyncStorage; no se sincronizan con el servidor. «Mi evidencia de confianza» guía una reflexión de cuatro pasos y mantiene las respuestas solo mientras la actividad está abierta. Ninguna de las dos requiere API.

## Inicio

La página de inicio usa un nombre y contenido de actualidad de ejemplo. La recomendación de confianza es una actividad existente mostrada como ejemplo; todavía no se genera un plan personalizado con IA. Los accesos de actividades abren las mismas instrucciones que el listado.

### Endpoints pendientes para inicio

- **Perfil de la usuaria y recomendaciones de actividades**: métodos, rutas y contratos pendientes de definir.
- **Noticias de actualidad**: fuentes, método, ruta y respuesta pendientes de definir.

## Perfil y entrevistas reales

Las entrevistas reales se guardan localmente con AsyncStorage en este dispositivo; no se sincronizan con una cuenta y el almacenamiento no está cifrado. El perfil permite retomar el onboarding si se ha saltado. El estado de finalización y las respuestas del onboarding solo duran durante la sesión; su persistencia está pendiente. Desde Perfil o desde Entrevista se puede registrar una oferta (enlace o descripción), empresa, puesto, fecha y hora local, consultar la cuenta atrás, anotar recordatorios personales y añadir feedback tras la entrevista. El acceso a respiración abre la actividad con un minuto como opción inicial.

### Endpoints pendientes de perfil y entrevistas reales

- Crear, consultar y modificar el perfil de la usuaria y recuperar los datos del onboarding: método, ruta y contrato por definir.
- Crear, consultar y modificar entrevistas reales, fechas, ofertas, notas y feedback: métodos, rutas y contratos por definir.
- Gestionar recordatorios y permisos de notificación, así como generar planes personalizados: métodos, rutas, canales y contratos por definir. Actualmente no se envían notificaciones ni se genera un plan con IA.
