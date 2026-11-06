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

Tras el onboarding se muestra la navegación principal: en móvil, una barra inferior de iconos con etiquetas accesibles; en pantallas anchas, una barra superior. Las secciones distintas de la entrevista son provisionales.

La entrevista es una demostración local de cuatro intervenciones (dos del entrevistador y dos de la usuaria). No reproduce audio, no solicita el micrófono, no graba respuestas y no realiza análisis. En web se usa [Strands de React Bits](https://www.reactbits.dev/animations/strands); en móvil se utiliza una animación SVG inspirada en Strands, compatible con Expo Go. El entrevistador es una ilustración vectorial animada, no un modelo 3D.

### Endpoints pendientes para entrevistas

- **Crear y conducir una sesión de práctica por voz**: método, ruta, autenticación, transporte y contrato por definir. Deberá gestionar los turnos y los permisos necesarios.
- **Finalizar una entrevista y consultar su análisis**: método, ruta, datos enviados y estructura del resultado por definir. El mensaje final de la demo no inicia ningún análisis.
- **Consultar el historial y el detalle de entrevistas**: métodos, rutas y respuestas por definir.
