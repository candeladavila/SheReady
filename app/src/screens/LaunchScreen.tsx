import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { G, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/colors';

const AnimatedGroup = Animated.createAnimatedComponent(G);

type Props = { onFinish: () => void };

/** Las formas y coordenadas proceden de assets/logo.svg; los colores usan la paleta de la app. */
export default function LaunchScreen({ onFinish }: Props) {
  const { width } = useWindowDimensions();
  const scale = Math.min(1.5, (width - 12) / 310);
  const steps = useRef(new Animated.Value(0)).current;
  const flag = useRef(new Animated.Value(0)).current;
  const rays = useRef(new Animated.Value(0)).current;
  const shift = useRef(new Animated.Value(0)).current;
  const name = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | undefined;
    const start = (reduceMotion: boolean) => {
      if (!active) return;
      if (reduceMotion) {
        onFinishRef.current();
        return;
      }
      const timing = (value: Animated.Value, toValue: number, duration: number) =>
        Animated.timing(value, { toValue, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true });
      animation = Animated.sequence([
        timing(steps, 1, 650),
        timing(flag, 1, 350),
        timing(rays, 1, 300),
        Animated.delay(200),
        Animated.parallel([timing(shift, 1, 550), timing(name, 1, 550)]),
        Animated.delay(800),
        timing(fade, 0, 450),
      ]);
      animation.start(({ finished }) => { if (finished && active) onFinishRef.current(); });
    };
    AccessibilityInfo.isReduceMotionEnabled().then(start).catch(() => start(false));
    return () => { active = false; animation?.stop(); };
  }, [steps, flag, rays, shift, name, fade]);

  return (
    <Animated.View style={[styles.container, { opacity: fade }]} accessibilityLabel="SheReady" accessibilityRole="image">
      <StatusBar style="light" />
      <View style={[styles.lockup, { width: 310 * scale, height: 140 * scale }]}>
        <Animated.View style={[styles.logo, { width: 140 * scale, height: 140 * scale, transform: [{ translateX: shift.interpolate({ inputRange: [0, 1], outputRange: [75 * scale, 0] }) }] }]}>
          <Svg width={140 * scale} height={140 * scale} viewBox="0 0 600 600">
            <AnimatedGroup opacity={steps}>
              <Path d="M150 415 H210 V373 Q210 341 242 341 H321 V311 Q321 280 352 280 H434 Q463 280 463 308 V484 Q463 500 447 500 H123 Q108 500 108 485 V459 Q108 415 150 415 Z" fill={colors.ivory} />
              <Path d="M150 415 H329 Q354 415 354 442 V500 H123 Q108 500 108 485 V458 Q108 415 150 415 Z" fill={colors.lavender} />
              <Path d="M367 340 H463 V485 Q463 500 447 500 H232 V457 Q232 415 275 415 H337 V370 Q337 340 367 340 Z" fill={colors.lavender} />
            </AnimatedGroup>
            <AnimatedGroup opacity={flag}>
              <Rect x="387" y="149" width="14" height="143" rx="7" fill={colors.coral} />
              <Path d="M396 153 L482 192 Q490 197 482 203 L396 241 Z" fill={colors.coral} />
            </AnimatedGroup>
            <AnimatedGroup opacity={rays} fill="none" stroke={colors.ivory} strokeWidth={15} strokeLinecap="round">
              <Path d="M278 182 H312" /><Path d="M299 124 L329 151" /><Path d="M350 89 L365 121" />
            </AnimatedGroup>
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.name, { opacity: name, transform: [{ translateX: name.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}><Text style={[styles.nameText, { fontSize: 52 * scale, lineHeight: 54 * scale, letterSpacing: -2 * scale }]}>She{'\n'}Ready</Text></Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.plum, alignItems: 'center', justifyContent: 'center' },
  lockup: { flexDirection: 'row', alignItems: 'center' },
  logo: {},
  name: { flex: 1 },
  nameText: { color: colors.ivory, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }) },
});
