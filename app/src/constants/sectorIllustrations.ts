import { ImageSourcePropType } from 'react-native';

type Pose = 'normal' | 'hablando' | 'conversando';
const illustrations: Record<string, Record<Pose, ImageSourcePropType>> = {
  'Tecnología': { normal: require('../assets/women/tecnologia/normal.png'), hablando: require('../assets/women/tecnologia/hablando.png'), conversando: require('../assets/women/tecnologia/conversando.png') },
  'Marketing': { normal: require('../assets/women/marketing/normal.png'), hablando: require('../assets/women/marketing/hablando.png'), conversando: require('../assets/women/marketing/conversando.png') },
  'Finanzas': { normal: require('../assets/women/finanzas/normal.png'), hablando: require('../assets/women/finanzas/hablando.png'), conversando: require('../assets/women/finanzas/conversando.png') },
  'Educación y salud': { normal: require('../assets/women/salud/normal.png'), hablando: require('../assets/women/salud/hablando.png'), conversando: require('../assets/women/salud/conversando.png') },
  'Comercio y servicios': { normal: require('../assets/women/comercio/normal.png'), hablando: require('../assets/women/comercio/hablando.png'), conversando: require('../assets/women/comercio/conversando.png') },
  'Otro sector': { normal: require('../assets/women/arquitectura/normal.png'), hablando: require('../assets/women/arquitectura/hablando.png'), conversando: require('../assets/women/arquitectura/conversando.png') },
};
/** Sin sector elegido no se asigna un personaje. */
export function sectorIllustration(sector?: string, pose: Pose = 'normal'): ImageSourcePropType | undefined {
  return sector ? illustrations[sector]?.[pose] : undefined;
}

/** Desplazamientos horizontales en píxeles de la hoja original (fotogramas de 724 px). */
export function speakingFrameOffsets(sector?: string): readonly [number, number, number] {
  return sector === 'Tecnología' ? [0, 45, 90] : [0, 0, 0];
}
