---
name: buenas-practicas-frontend
description: Desarrollar, corregir o revisar el frontend de UrbanPulse en React Native, TypeScript y Expo, manteniendo código claro, soporte inglés/español, tamaño de fuente accesible, diseño responsive y verificación funcional y multiplataforma antes de finalizar. Aplicar al trabajar en app/ y sus componentes, pantallas, hooks o configuración.
---

# Buenas prácticas del frontend de UrbanPulse

## Alcance y preparación

- Localiza el frontend por su manifiesto. Actualmente está en `app/`, junto a `api/`; no existe `api/app/`. Resuelve las rutas desde la raíz del repositorio.
- Lee `AGENTS.md`, `README.md`, `CONTRIBUTING.md`, `app/AGENTS.md`, `app/README.md` y las instrucciones locales del área afectada. Sigue sus convenciones sin duplicar ni sustituir las reglas generales.
- Revisa el estado de Git y conserva cambios ajenos. Define el comportamiento esperado y sus criterios de aceptación antes de editar; limita el cambio a la tarea solicitada.
- Comprueba las versiones en `app/package.json`. Antes de usar APIs de Expo o React Native, consulta documentación oficial compatible con las versiones instaladas, como exige `app/AGENTS.md`. Reutiliza consultas ya realizadas si siguen siendo válidas; consulta de nuevo para APIs nuevas, dudas de compatibilidad o cuando las instrucciones del proyecto lo exijan. Evita recorrer archivos ajenos al cambio sin necesidad.
- Inspecciona los mecanismos existentes de traducción, preferencias y tipografía. No des por implementados selectores, persistencia ni soporte bilingüe: al crear esta skill, el cliente solo tiene un esqueleto y textos en español.

## Código claro, simple y mantenible

- Usa nombres descriptivos, tipos explícitos en contratos y uniones para estados finitos. Evita `any`, aserciones que oculten errores y supresiones del compilador o linter sin justificación concreta.
- Mantén funciones, componentes y hooks con una responsabilidad reconocible. Divide cuando mezclen responsabilidades, acumulen anidaciones o sean difíciles de leer o probar; no impongas un límite arbitrario de líneas ni fragmentes operaciones triviales.
- Prefiere retornos tempranos, composición y flujo explícito. Evita ternarios anidados, parámetros booleanos ambiguos, valores mágicos y comentarios que repitan el código; explica decisiones cuando haga falta.
- Conserva las rutas finas en `src/app/`, las capacidades en `src/features/` y lo transversal en `src/shared/`. Reutiliza componentes, tokens y contratos existentes sin crear abstracciones para necesidades hipotéticas.
- Separa presentación, coordinación y reglas de negocio. Centraliza el acceso HTTP en `src/shared/api/client.ts`; valida los datos externos antes de asumir su estructura.
- Evita estado derivado redundante y efectos para cálculos que pueden hacerse durante el renderizado. Usa efectos para sincronización externa, con dependencias correctas y limpieza; evita actualizaciones obsoletas al cambiar de pantalla o petición.
- Modela carga, vacío, error y éxito cuando correspondan. Impide envíos duplicados mientras se procesa una acción y ofrece recuperación útil ante fallos sin ocultarlos con capturas genéricas.
- Justifica dependencias nuevas y optimizaciones con una necesidad real. Usa pnpm y los comandos de instalación compatibles con Expo indicados por el proyecto.

## Idioma: inglés y español

- Toda interfaz nueva o modificada debe funcionar en español e inglés. Incluye títulos, botones, formularios, errores, validaciones, estados vacíos, confirmaciones y etiquetas o ayudas para lectores de pantalla.
- Reutiliza el sistema de traducciones y su fuente de idioma. Evita cadenas de interfaz incrustadas en componentes, traducciones dispersas y concatenaciones que impidan cambiar el orden gramatical; usa claves semánticas, interpolación y pluralización.
- Mantén las mismas claves y parámetros en ambos idiomas. Formatea fechas, números y unidades según el idioma seleccionado. No traduzcas identificadores técnicos ni contenido escrito por usuarios.
- Conserva la elección de idioma al navegar y renderizar de nuevo; si ya hay persistencia, respétala tras reiniciar. No restablezcas preferencias desde una pantalla ni mantengas copias locales que se desincronicen.
- Si falta la infraestructura bilingüe, identifica la carencia y crea la base compartida mínima necesaria para las interfaces de la tarea. Evita una migración ajena al alcance y comunica el soporte que quede pendiente. Si la tarea solicita un selector o persistencia, impleméntalos y compruébalos.

## Tamaño de fuente y accesibilidad

- Respeta el escalado de texto del sistema y la preferencia de tamaño de la aplicación cuando exista. No desactives `allowFontScaling` ni impongas un máximo para hacer encajar el diseño. Evita aplicar dos veces el mismo escalado.
- Reutiliza la tipografía compartida. Propaga las preferencias a textos, entradas, botones, mensajes y navegación; conserva su selección al navegar y, si existe persistencia, tras reiniciar.
- Diseña para texto ampliado y traducciones más largas: permite ajuste de línea, crecimiento y desplazamiento. Evita alturas fijas o truncamientos que oculten información esencial o acciones; no reduzcas automáticamente la fuente para compensar.
- Si se solicita una opción de tamaño y aún no existe, define una fuente de estado compartida y un control accesible; no inventes una preferencia distinta en cada pantalla. No afirmes que hay un selector propio solo porque funciona el escalado del sistema.
- Proporciona roles, nombres, estados y orden de foco coherentes para tecnologías de asistencia. Los controles con iconos necesitan nombre accesible; los elementos decorativos no deben añadir ruido.
- Mantén contraste suficiente en los temas existentes, áreas táctiles utilizables y errores identificables sin depender solo del color. Verifica teclado y foco en web y lector de pantalla en las plataformas disponibles según el impacto de la modificación.

## Diseño responsive y adaptación multiplataforma

Toda modificación visual o funcional del frontend debe considerar también su adaptación responsive. Aplica las comprobaciones visuales según el impacto real del cambio, como se detalla en la sección de verificación.

### Diseño adaptable

- Adapta toda pantalla, componente o interfaz nueva o modificada a distintos tamaños y orientaciones. Prioriza layouts fluidos y flexibles con las herramientas compatibles con React Native y Expo; usa breakpoints cuando sea necesario cambiar la distribución.
- Evita tamaños, márgenes, posiciones y alturas fijas que provoquen solapamientos o desbordamientos. Corrige la estructura del layout en lugar de aplicar desplazamientos arbitrarios.
- Respeta las áreas seguras y considera barras de navegación, teclado virtual, orientación y contenido desplazable.
- Evita scroll horizontal accidental. Mantén los controles y acciones esenciales visibles o alcanzables mediante desplazamiento en pantallas pequeñas.

### Tipografía y contenido adaptable

- Diseña para textos largos y traducciones ES/EN, respetando el escalado del sistema y las preferencias tipográficas disponibles en la aplicación. Verifica los escenarios afectados según los niveles siguientes.
- Permite crecimiento, ajuste de líneas y desplazamiento. No trunques contenido esencial ni reduzcas automáticamente la tipografía para compensar errores del layout.
- Evita superposiciones del texto con animaciones, imágenes y elementos posicionados.

### Elementos visuales y animaciones

- Adapta imágenes, mapas, gráficos y animaciones a las dimensiones disponibles. Ajusta encuadres, proporciones y contenedores según la plataforma y comprueba que sus elementos importantes no queden fuera de pantalla.
- Evita saltos de layout y desbordamientos causados por animaciones. Conserva las interacciones táctiles y el uso mediante teclado en web, respetando movimiento reducido y las demás preferencias de accesibilidad.

## Verificación antes de finalizar

Elige el nivel según el alcance y riesgo real; si una tarea abarca varios niveles, aplica el que corresponda a cada parte afectada. Amplía las comprobaciones si hay fallos, incertidumbre o una petición explícita. No declares verificado lo que no se haya probado.

### Nivel 1 — Cambios pequeños

Para colores, márgenes, textos o ajustes visuales localizados, ejecuta `pnpm run typecheck` y `pnpm run lint` una vez al terminar los cambios de código. Revisa visualmente solo el elemento modificado cuando corresponda. No es necesaria una matriz responsive completa ni comprobar todas las plataformas; reutiliza Expo si ya está disponible.

### Nivel 2 — Cambios funcionales o visuales relevantes

Para componentes nuevos, layouts, animaciones o cambios responsive, ejecuta typecheck y lint una vez al finalizar y comprueba el comportamiento principal y los errores de ejecución relacionados. Revisa normalmente una vista móvil de 390 px y otra de escritorio de 1440 px; añade dimensiones si el riesgo o los fallos lo justifican. Comprueba idiomas y tamaños de texto cuando puedan afectar a la distribución.

### Nivel 3 — Cambios estructurales o críticos

Para navegación global, autenticación, persistencia de preferencias, internacionalización global, cambios importantes de arquitectura o integraciones multiplataforma, ejecuta typecheck y lint y prueba los flujos afectados. Amplía la comprobación responsive y verifica idiomas, accesibilidad, persistencia y plataformas disponibles cuando correspondan. No hagas una regresión completa de la aplicación salvo que el cambio lo justifique o se solicite expresamente.

### Responsive, idiomas y plataformas

- Toda interfaz debe seguir siendo responsive. Para cambios visuales relevantes usa por defecto una vista móvil y otra desktop; revisa tablet si tiene una distribución específica o puede fallar en anchos intermedios, y dimensiones extremas si hay riesgo de desbordamiento. Amplía las resoluciones si detectas problemas. 320, 375–390, 768, 1024 y 1440 px son referencias disponibles, no una matriz obligatoria para cada tarea.
- Si cambian traducciones, comprueba español e inglés. Si cambia un layout con texto, revisa al menos una fuente ampliada; para cambios globales de preferencias verifica con mayor amplitud la conservación, persistencia tras reiniciar y distribución. Comprueba el escalado del sistema cuando esté disponible y afecte al cambio.
- Si solo cambia una geometría 3D o animación decorativa, no repitas toda la matriz de idiomas y tamaños. Comprueba movimiento reducido cuando cambie el comportamiento de una animación. Mantén los requisitos de accesibilidad durante la implementación.
- Verifica las plataformas realmente afectadas y disponibles: prioriza web para cambios exclusivos de web y, en componentes compartidos, comprueba lo necesario según el riesgo. No arranques emuladores innecesariamente. La web no demuestra funcionamiento nativo; declara las plataformas y tecnologías de asistencia que queden sin verificar.
- Según el cambio, comprueba ausencia de desbordamientos, cortes y solapamientos, texto legible, acciones alcanzables, alineación, navegación y adaptación de imágenes o animaciones; revisa teclado virtual cuando corresponda. Al modificar una pantalla o layout, revisa la composición afectada; para componentes compartidos, los contextos de uso que puedan verse afectados.

### Ejecución eficiente y entrega

- Agrupa las modificaciones antes de verificar. En cambios de código ejecuta `pnpm run typecheck` y `pnpm run lint` desde `app/`; si solo hay Corepack, usa `corepack pnpm` con la versión del manifiesto. No alteres reglas de TypeScript ni ESLint para ocultar fallos.
- Evita repetir typecheck, lint u otras comprobaciones que ya aportaron evidencia válida sin cambios relevantes. Si falla una comprobación, corrige el problema y repite las verificaciones afectadas. No ignores errores de ejecución conocidos; distingue los preexistentes y los bloqueos del entorno.
- Para lógica nueva o correcciones, comprueba casos positivos, límites y fallos relevantes usando el sistema de pruebas existente cuando lo haya. Si el cambio es solo de lógica sin impacto visual, verifica los flujos afectados sin forzar pruebas visuales. No añadas herramientas o dependencias solo para aumentar la verificación ni inventes un script `test`.
- Reutiliza servidores Expo existentes y evita reiniciar servicios sin necesidad. Revisa el comportamiento observable cuando corresponda: una compilación o un HTTP 200 no demuestran que una interacción funcione.
- No repitas capturas de pantallas sin cambios ni inspecciones páginas ajenas a un componente aislado. Evita imprimir logs completos cuando basten errores relevantes y un resumen.
- En cambios exclusivos de documentación o skills, comprueba coherencia, estructura, enlaces, rutas y diff de los archivos afectados; no arranques servicios ni ejecutes verificaciones de código innecesarias.
- Revisa el diff y la documentación afectada, sin secretos, artefactos generados ni cambios ajenos. Entrega brevemente en español qué cambió, qué comprobaciones se ejecutaron y sus resultados, y qué quedó sin comprobar. Indica tamaños y plataformas verificados en cambios visuales; amplía el informe solo ante errores, riesgos importantes o petición expresa.
