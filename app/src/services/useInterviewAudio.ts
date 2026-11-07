import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { api } from './api';
import { speakOnDevice } from './deviceSpeech';

export function useInterviewAudio() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const player = useAudioPlayer(null);
  const playbackStatus = useAudioPlayerStatus(player);
  const temporary = useRef<string | null>(null);
  const active = useRef(false);
  const transcriptCache = useRef<{ interviewId: string; result: Awaited<ReturnType<typeof api.interviews.transcribe>> } | null>(null);
  const playbackGeneration = useRef(0);
  const cancelPlayback = useRef<(() => void) | null>(null);
  async function clearAudio() {
    playbackGeneration.current += 1;
    cancelPlayback.current?.(); cancelPlayback.current = null;
    player.pause();
    const uri = temporary.current; temporary.current = null;
    if (uri) {
      if (Platform.OS === 'web') URL.revokeObjectURL(uri);
      else await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  }
  async function stop() {
    await clearAudio();
    if (active.current) { active.current = false; await recorder.stop(); }
    if (recorder.uri) {
      if (Platform.OS === 'web') URL.revokeObjectURL(recorder.uri);
      else await FileSystem.deleteAsync(recorder.uri, { idempotent: true });
    }
  }
  useEffect(() => () => { void stop().catch(() => {}); }, []);
  useEffect(() => {
    if (state.isRecording && state.durationMillis >= 90_000) void recorder.stop().then(() => { active.current = false; }).catch(() => {});
  }, [state.durationMillis, state.isRecording]);
  return {
    recording: state.isRecording,
    playing: playbackStatus.playing,
    async play(interviewId: string, turnId: string) {
      await clearAudio();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const generation = playbackGeneration.current;
      const capabilities = await api.capabilities();
      if (generation !== playbackGeneration.current) throw new Error('Reproducción cancelada.');
      if (capabilities.speech_transport === 'device') {
        const interview = await api.interviews.get(interviewId);
        if (generation !== playbackGeneration.current) throw new Error('Reproducción cancelada.');
        const turn = interview.turns.find(item => item.id === turnId);
        if (!turn) throw new Error('No se encontró la pregunta de la entrevista.');
        const speech = speakOnDevice(turn.question.text);
        cancelPlayback.current = speech.cancel;
        try { await speech.finished; }
        finally { if (generation === playbackGeneration.current) cancelPlayback.current = null; }
        return;
      }
      const audio = await api.interviews.speech(interviewId, turnId);
      if (generation !== playbackGeneration.current) throw new Error('Reproducción cancelada.');
      if (Platform.OS === 'web') temporary.current = URL.createObjectURL(audio);
      else {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader(); reader.onerror = reject;
          reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(audio);
        });
        temporary.current = `${FileSystem.cacheDirectory}question-${Date.now()}.wav`;
        await FileSystem.writeAsStringAsync(temporary.current, base64, { encoding: FileSystem.EncodingType.Base64 });
      }
      if (generation !== playbackGeneration.current) { await clearAudio(); throw new Error('Reproducción cancelada.'); }
      player.replace(temporary.current);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => finish(new Error('La reproducción de voz ha tardado demasiado.')), 90_000);
        const subscription = player.addListener('playbackStatusUpdate', status => {
          if (status.didJustFinish) finish();
        });
        function finish(error?: Error) {
          clearTimeout(timer); subscription.remove(); cancelPlayback.current = null;
          if (error) reject(error); else resolve();
        }
        cancelPlayback.current = () => finish(new Error('Reproducción cancelada.'));
        try { player.play(); } catch (e) { finish(e instanceof Error ? e : new Error('No se pudo reproducir la pregunta.')); }
      });
    },
    async record() {
      transcriptCache.current = null;
      await clearAudio();
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) throw new Error('Permite el micrófono o responde por escrito.');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync(); recorder.record(); active.current = true;
    },
    async transcribe(interviewId: string) {
      if (transcriptCache.current?.interviewId === interviewId) return transcriptCache.current.result;
      if (active.current) { await recorder.stop(); active.current = false; }
      const uri = recorder.uri;
      if (!uri) throw new Error('No hay grabación disponible. Graba de nuevo tu respuesta.');
      const result = Platform.OS === 'web'
        ? await api.interviews.transcribe(interviewId, await (await fetch(uri)).blob())
        : await api.interviews.transcribe(interviewId, { uri, name: 'respuesta.m4a', type: 'audio/mp4' });
      transcriptCache.current = { interviewId, result };
      // Keep the recording when upload fails. Cache a successful transcript if the next API call needs retrying.
      if (Platform.OS !== 'web') await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      return result;
    }, stop,
  };
}
