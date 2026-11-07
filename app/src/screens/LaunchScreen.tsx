import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme/colors';

const AnimatedGroup = Animated.createAnimatedComponent(G);

function LogoGroup({ value, children, ...props }: Omit<ComponentProps<typeof G>, 'opacity'> & { value: Animated.Value }) {
  const [opacity, setOpacity] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const listener = value.addListener(({ value: current }) => setOpacity(current));
    return () => value.removeListener(listener);
  }, [value]);
  return Platform.OS === 'web'
    ? <G {...props} opacity={opacity}>{children}</G>
    : <AnimatedGroup {...props} opacity={value}>{children}</AnimatedGroup>;
}

type Props = { onFinish: () => void };

/** Las formas y coordenadas proceden de assets/logo_banderin_turquesa.svg y se animan por capas. */
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
        Animated.timing(value, { toValue, duration, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' });
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
    <View style={styles.container} accessibilityLabel="SheReady" accessibilityRole="image">
      <StatusBar style="light" />
      <Animated.View style={[styles.lockup, { width: 310 * scale, height: 140 * scale, opacity: fade }]}>
        <Animated.View style={[styles.logo, { width: 140 * scale, height: 140 * scale, transform: [{ translateX: shift.interpolate({ inputRange: [0, 1], outputRange: [75 * scale, 0] }) }] }]}>
          <Svg width={140 * scale} height={140 * scale} viewBox="0 0 600 600">
            <Defs>
              <LinearGradient id="launchPlum" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#603162" /><Stop offset="1" stopColor="#4C254C" /></LinearGradient>
              <LinearGradient id="launchCream" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFFBF6" /><Stop offset="1" stopColor="#F3E8E2" /></LinearGradient>
              <LinearGradient id="launchBase" x1="0" y1="0" x2="1" y2="0.8"><Stop offset="0" stopColor="#E6D1EE" /><Stop offset="1" stopColor="#BFA1D8" /></LinearGradient>
              <LinearGradient id="launchFront" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#C39BD4" /><Stop offset="1" stopColor="#A47AB7" /></LinearGradient>
            </Defs>
            <Rect x="18" y="18" width="564" height="564" rx="145" fill="url(#launchPlum)" />
            <LogoGroup value={steps}>
              <Path d="M150 415 H210 V373 Q210 341 242 341 H321 V311 Q321 280 352 280 H434 Q463 280 463 308 V484 Q463 500 447 500 H123 Q108 500 108 485 V459 Q108 415 150 415 Z" fill="url(#launchCream)" />
              <Path d="M150 415 H329 Q354 415 354 442 V500 H123 Q108 500 108 485 V458 Q108 415 150 415 Z" fill="url(#launchBase)" />
              <Path d="M367 340 H463 V485 Q463 500 447 500 H232 V457 Q232 415 275 415 H337 V370 Q337 340 367 340 Z" fill="url(#launchFront)" />
            </LogoGroup>
            <LogoGroup value={flag}>
              <Rect x="387" y="149" width="14" height="143" rx="7" fill="#C3DED5" />
              <Path d="M396 153 L482 192 Q490 197 482 203 L396 241 Z" fill="#C3DED5" />
            </LogoGroup>
            <LogoGroup value={rays} fill="none" stroke="#FFF4E9" strokeWidth={15} strokeLinecap="round">
              <Path d="M278 182 H312" /><Path d="M299 124 L329 151" /><Path d="M350 89 L365 121" />
            </LogoGroup>
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.name, { opacity: name, transform: [{ translateX: name.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}><Text style={[styles.nameText, { fontSize: 52 * scale, lineHeight: 54 * scale, letterSpacing: -2 * scale }]}>She{'\n'}Ready</Text></Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.plum, alignItems: 'center', justifyContent: 'center' },
  lockup: { flexDirection: 'row', alignItems: 'center' },
  logo: {},
  name: { flex: 1 },
  nameText: { color: colors.ivory, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }) },
});
