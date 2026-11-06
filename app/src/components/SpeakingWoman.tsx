import { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, ImageSourcePropType, StyleSheet, View } from 'react-native';

/** Cada imagen contiene tres fotogramas en columnas iguales. */
export default function SpeakingWoman({ source, size, frameOffsets = [0, 0, 0], accessibilityLabel = 'Ilustración de una mujer conversando' }: { source: ImageSourcePropType; size: number; frameOffsets?: readonly [number, number, number]; accessibilityLabel?: string }) {
  const [frame, setFrame] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {}); }, []);
  useEffect(() => {
    if (reduceMotion) { setFrame(0); return; }
    const timer = setInterval(() => setFrame(current => (current + 1) % 3), 450);
    return () => clearInterval(timer);
  }, [reduceMotion]);
  // Las hojas contienen tres fotogramas cuadrados de 724 × 724.
  const width = size;
  const height = size;
  return <View accessibilityLabel={accessibilityLabel} accessibilityRole="image" style={[styles.frame, { width, height }]}><View style={[styles.frame, { position: 'absolute', width, height, left: frameOffsets[frame] * width / 724, top: 0 }]}><Image accessible={false} source={source} resizeMode="stretch" style={{ position: 'absolute', width: width * 3, height, left: -frame * width, top: 0 }} /></View></View>;
}
const styles = StyleSheet.create({ frame: { overflow: 'hidden' } });
