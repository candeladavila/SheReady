import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme/colors';

function usePulse(duration: number) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [duration, value]);
  return value;
}

/** Ilustración vectorial original, construida con la paleta de SheReady. */
export function Interviewer() {
  const motion = usePulse(420);
  return <View style={styles.avatar} accessibilityLabel="Ilustración del entrevistador"><Svg width="100%" height="100%" viewBox="0 0 320 320">
    <Defs>
      <LinearGradient id="back" x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#E8DCF5" /><Stop offset="1" stopColor="#C5B6E4" /></LinearGradient>
      <LinearGradient id="skin" x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#F9CEB9" /><Stop offset="1" stopColor="#D99687" /></LinearGradient>
      <LinearGradient id="jacket" x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#8168AE" /><Stop offset="1" stopColor={colors.plum} /></LinearGradient>
    </Defs>
    <Circle cx="160" cy="160" r="151" fill="url(#back)" /><Circle cx="160" cy="160" r="129" fill="#F7F2FA" opacity={0.5} />
    <Ellipse cx="160" cy="274" rx="105" ry="17" fill={colors.plum} opacity={0.12} />
    <Path d="M55 273 C60 220 94 204 135 200 H185 C227 204 260 220 265 273 Q160 310 55 273Z" fill="url(#jacket)" />
    <Path d="M124 205 L160 250 L196 205 L181 196 H139Z" fill={colors.ivory} />
    <Path d="M139 177 H181 V211 Q160 230 139 211Z" fill="url(#skin)" />
    <Ellipse cx="160" cy="130" rx="63" ry="76" fill="url(#skin)" />
    <Ellipse cx="98" cy="143" rx="11" ry="17" fill="#E8AE9E" /><Ellipse cx="222" cy="143" rx="11" ry="17" fill="#DDA08F" />
    <Path d="M98 128 Q86 69 131 53 Q156 33 190 50 Q229 58 223 128 L211 116 Q205 92 190 91 Q160 108 119 95 Q111 110 110 128Z" fill={colors.eggplant} />
    <Path d="M123 124 Q133 119 142 124 M178 124 Q188 119 197 124" stroke={colors.eggplant} strokeWidth="4" strokeLinecap="round" fill="none" />
    <Circle cx="133" cy="137" r="3" fill={colors.eggplant} /><Circle cx="188" cy="137" r="3" fill={colors.eggplant} />
    <Path d="M158 139 L154 155 Q159 158 164 155" stroke="#B97D73" strokeWidth="3" fill="none" strokeLinecap="round" />
    <Path d="M145 172 Q160 182 176 171" stroke="#A55F62" strokeWidth="4" fill="none" strokeLinecap="round" />
  </Svg><Animated.View style={[styles.mouth, { transform: [{ scaleY: motion.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.3] }) }] }]} /></View>;
}

/** Adaptación SVG nativa inspirada en la esfera Strands de React Bits. */
export function VoiceStrands() {
  const motion = usePulse(1300);
  return <Animated.View style={[styles.orb, { transform: [{ scale: motion.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] }) }] }]}><Svg width="100%" height="100%" viewBox="0 0 300 300">
    <Defs><LinearGradient id="orb" x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#F6EFFE" /><Stop offset="1" stopColor="#DAD0ED" /></LinearGradient></Defs>
    <Circle cx="150" cy="150" r="145" fill="url(#orb)" /><Circle cx="150" cy="150" r="132" fill="none" stroke={colors.white} strokeWidth="2" opacity={0.8} />
    {Array.from({ length: 17 }, (_, i) => <Path key={i} d={`M ${28 + i * 3} ${108 + i * 3} C 95 ${28 + i * 5}, 178 ${245 - i * 4}, ${270 - i * 3} ${112 + i * 4}`} fill="none" stroke={[colors.plum, colors.lavender, colors.coral, colors.sage][i % 4]} strokeWidth="2.6" opacity={0.58} />)}
    <Ellipse cx="111" cy="79" rx="46" ry="18" fill={colors.white} opacity={0.27} transform="rotate(-32 111 79)" />
  </Svg></Animated.View>;
}
const styles = StyleSheet.create({ avatar: { width: '100%', aspectRatio: 1, maxWidth: 310 }, mouth: { position: 'absolute', width: '5%', height: '2.5%', borderRadius: 20, backgroundColor: '#A55F62', left: '47.5%', top: '53%' }, orb: { width: '100%', aspectRatio: 1, maxWidth: 300 } });
