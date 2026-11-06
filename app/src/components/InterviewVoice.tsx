import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SpeechStatus } from '../services/speech/textToSpeech';
import { colors } from '../theme/colors';

type Props = { text: string; status: SpeechStatus; message?: string; onRepeat: () => void; onStop: () => void; onContinue: () => void; canContinue: boolean };
export default function InterviewVoice({ text, status, message, onRepeat, onStop, onContinue, canContinue }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (!active) return;
      if (reduce) { opacity.setValue(1); return; }
      opacity.setValue(0);
      animation = Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true });
      animation.start();
    }).catch(() => opacity.setValue(1));
    return () => { active = false; animation?.stop(); };
  }, [text, opacity]);
  const speaking = status === 'starting' || status === 'speaking';
  const failed = status === 'error' || status === 'unsupported';
  return <View style={styles.container}><Text accessibilityLiveRegion="polite" style={styles.status}>{speaking ? '●  El entrevistador está hablando' : failed ? 'Audio no disponible' : 'Tu turno'}</Text><Animated.Text accessibilityLiveRegion="polite" style={[styles.question, { opacity }]}>{text}</Animated.Text>{message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}<View style={styles.controls}><Pressable accessibilityRole="button" onPress={onRepeat} style={styles.secondary}><Text style={styles.secondaryText}>Repetir pregunta</Text></Pressable>{speaking && <Pressable accessibilityRole="button" onPress={onStop} style={styles.secondary}><Text style={styles.secondaryText}>Detener audio</Text></Pressable>}</View>{(canContinue || failed) && <Pressable accessibilityRole="button" onPress={onContinue} style={styles.primary}><Text style={styles.primaryText}>{failed && !canContinue ? 'Continuar sin audio' : 'Siguiente pregunta'}  ↗</Text></Pressable>}</View>;
}
const styles = StyleSheet.create({ container: { width: '100%', maxWidth: 560, alignItems: 'center', paddingHorizontal: 20 }, status: { color: colors.plum, fontSize: 13, fontWeight: '700', textAlign: 'center' }, question: { color: colors.eggplant, fontSize: 17, lineHeight: 25, textAlign: 'center', marginTop: 12 }, message: { color: colors.mutedText, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 10 }, controls: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 }, secondary: { minHeight: 44, borderRadius: 12, borderColor: colors.border, borderWidth: 1, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: colors.white }, secondaryText: { color: colors.plum, fontSize: 13, fontWeight: '600' }, primary: { minHeight: 52, width: '100%', maxWidth: 320, paddingHorizontal: 18, marginTop: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.plum }, primaryText: { color: colors.white, fontSize: 15, fontWeight: '700' } });
