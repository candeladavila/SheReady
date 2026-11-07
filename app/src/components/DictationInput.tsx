import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import Svg, { Path, Rect } from 'react-native-svg';
import { api } from '../services/api';
import { colors } from '../theme/colors';

/** Dictado opcional: el texto sigue siendo editable y nunca se envía al guardar automáticamente. */
export default function DictationInput(props: TextInputProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 250);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const recording = useRef(false);
  const mounted = useRef(true);
  const latest = useRef(props);
  latest.current = props;
  const pulse = useRef(new Animated.Value(0)).current;
  const selection = useRef<{ start: number; end: number } | null>(null);
  const disabled = props.editable === false || props.secureTextEntry;
  useEffect(() => {
    if (!state.isRecording) { pulse.setValue(0); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]));
    animation.start(); return () => animation.stop();
  }, [state.isRecording, pulse]);
  useEffect(() => () => { mounted.current = false; if (recording.current) void recorder.stop().then(async () => { const uri = recorder.uri; if (!uri) return; if (Platform.OS === 'web') URL.revokeObjectURL(uri); else await FileSystem.deleteAsync(uri, { idempotent: true }); }).catch(() => {}); }, [recorder]);
  async function toggle() {
    if (busy || disabled) return;
    setError(''); setBusy(true);
    let uri: string | null = null;
    try {
      if (!recording.current) {
        const permission = await requestRecordingPermissionsAsync();
        if (!permission.granted) throw new Error('Permite el acceso al micrófono para dictar.');
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync(); recorder.record(); recording.current = true;
      } else {
        await recorder.stop(); recording.current = false;
        uri = recorder.uri;
        if (!uri) throw new Error('No se ha podido guardar la grabación.');
        const result = Platform.OS === 'web'
          ? await api.dictate(await (await fetch(uri)).blob())
          : await api.dictate({ uri, name: 'dictado.m4a', type: 'audio/mp4' });
        if (!mounted.current) return;
        const current = latest.current.value ?? '';
        const range = selection.current ?? { start: current.length, end: current.length };
        const start = Math.min(range.start, current.length), end = Math.min(range.end, current.length);
        const text = current.slice(0, start) + result.transcript + current.slice(end);
        latest.current.onChangeText?.(latest.current.maxLength ? text.slice(0, latest.current.maxLength) : text);
      }
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : 'No se ha podido transcribir.'); }
    finally {
      if (uri) {
        if (Platform.OS === 'web') URL.revokeObjectURL(uri);
        else await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      }
      if (mounted.current) setBusy(false);
    }
  }
  useEffect(() => { if (state.isRecording && state.durationMillis >= 90000 && !busy) void toggle(); }, [state.durationMillis, state.isRecording, busy]);
  if (props.secureTextEntry) return <TextInput {...props} />;
  return <View><TextInput {...props} onSelectionChange={event => { selection.current = event.nativeEvent.selection; props.onSelectionChange?.(event); }} />
    <View style={styles.row}><Pressable accessibilityRole="button" accessibilityLabel={state.isRecording ? 'Detener dictado y transcribir' : 'Iniciar dictado por voz'} accessibilityState={{ disabled: busy || disabled }} disabled={busy || disabled} onPress={() => void toggle()} style={[styles.pill, state.isRecording && styles.listening]}>
      {busy ? <ActivityIndicator size="small" color={colors.plum} /> : <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={state.isRecording ? colors.white : colors.plum} strokeWidth={2} strokeLinecap="round"><Rect x="9" y="3" width="6" height="12" rx="3" /><Path d="M5 11a7 7 0 0 0 14 0M12 18v3m-3 0h6" /></Svg>}
      {state.isRecording ? <><Animated.View style={[styles.bar, { transform: [{ scaleY: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]} /><Animated.View style={[styles.bar, { transform: [{ scaleY: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }) }] }]} /><Text style={styles.recordText}>{Math.floor(state.durationMillis / 1000)} s · Detener</Text></> : <Text style={styles.label}>{busy ? 'Transcribiendo…' : 'Dictar'}</Text>}
    </Pressable><Text style={styles.hint}>El audio se envía para transcribirlo.</Text></View>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 }, pill: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, borderRadius: 24, backgroundColor: colors.lavenderSurface }, listening: { backgroundColor: colors.plum }, label: { color: colors.plum, fontWeight: '700', fontSize: 12 }, recordText: { color: colors.white, fontWeight: '700', fontSize: 12 }, bar: { width: 3, height: 16, borderRadius: 2, backgroundColor: colors.white }, hint: { color: colors.mutedText, fontSize: 11, flexShrink: 1 }, error: { color: '#a12d45', marginTop: 6 } });
