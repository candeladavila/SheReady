import { ImageSourcePropType } from 'react-native';

type Pose = 'normal' | 'hablando' | 'conversando' | 'actividad' | 'actualidad' | 'perfil' | 'progreso';
const illustrations: Record<string, Record<Pose, ImageSourcePropType>> = {
  'Tecnología': { normal: require('../assets/women/tecnologia/normal.png'), hablando: require('../assets/women/tecnologia/hablando.png'), conversando: require('../assets/women/tecnologia/conversando.png'), actividad: require('../assets/women/tecnologia/actividad.png'), actualidad: require('../assets/women/tecnologia/actualidad.png'), perfil: require('../assets/women/tecnologia/perfil.png'), progreso: require('../assets/women/tecnologia/progreso.png') },
  'Marketing': { normal: require('../assets/women/marketing/normal.png'), hablando: require('../assets/women/marketing/hablando.png'), conversando: require('../assets/women/marketing/conversando.png'), actividad: require('../assets/women/marketing/actividad.png'), actualidad: require('../assets/women/marketing/actualidad.png'), perfil: require('../assets/women/marketing/perfil.png'), progreso: require('../assets/women/marketing/progreso.png') },
  'Finanzas': { normal: require('../assets/women/finanzas/normal.png'), hablando: require('../assets/women/finanzas/hablando.png'), conversando: require('../assets/women/finanzas/conversando.png'), actividad: require('../assets/women/finanzas/actividad.png'), actualidad: require('../assets/women/finanzas/actualidad.png'), perfil: require('../assets/women/finanzas/perfil.png'), progreso: require('../assets/women/finanzas/progreso.png') },
  'Educación y salud': { normal: require('../assets/women/salud/normal.png'), hablando: require('../assets/women/salud/hablando.png'), conversando: require('../assets/women/salud/conversando.png'), actividad: require('../assets/women/salud/actividad.png'), actualidad: require('../assets/women/salud/actualidad.png'), perfil: require('../assets/women/salud/perfil.png'), progreso: require('../assets/women/salud/progreso.png') },
  'Comercio y servicios': { normal: require('../assets/women/comercio/normal.png'), hablando: require('../assets/women/comercio/hablando.png'), conversando: require('../assets/women/comercio/conversando.png'), actividad: require('../assets/women/comercio/actividad.png'), actualidad: require('../assets/women/comercio/actualidad.png'), perfil: require('../assets/women/comercio/perfil.png'), progreso: require('../assets/women/comercio/progreso.png') },
  'Otro sector': { normal: require('../assets/women/arquitectura/normal.png'), hablando: require('../assets/women/arquitectura/hablando.png'), conversando: require('../assets/women/arquitectura/conversando.png'), actividad: require('../assets/women/arquitectura/actividad.png'), actualidad: require('../assets/women/arquitectura/actualidad.png'), perfil: require('../assets/women/arquitectura/perfil.png'), progreso: require('../assets/women/arquitectura/progreso.png') },
};
/** Sin sector elegido no se asigna un personaje. */
export function sectorIllustration(sector?: string, pose: Pose = 'normal'): ImageSourcePropType | undefined {
  return sector ? illustrations[sector]?.[pose] : undefined;
}

/** Desplazamientos horizontales en píxeles de la hoja original (fotogramas de 724 px). */
export function speakingFrameOffsets(sector?: string): readonly [number, number, number] {
  return sector === 'Tecnología' ? [0, 45, 90] : [0, 0, 0];
}
