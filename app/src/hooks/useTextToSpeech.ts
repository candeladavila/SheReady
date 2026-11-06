import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { SpeechUpdate, TextToSpeechEngine } from '../services/speech/textToSpeech';
import { createNativeSpeechEngine } from '../services/speech/nativeSpeech';
import { createKokoroWebEngine } from '../services/speech/kokoroWeb';

const createSpeechEngine = Platform.OS === 'web' ? createKokoroWebEngine : createNativeSpeechEngine;

export function useTextToSpeech(createEngine: () => TextToSpeechEngine = createSpeechEngine) {
  const [state, setState] = useState<SpeechUpdate>({ status: 'idle' });
  const engine = useRef<TextToSpeechEngine | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; engine.current?.dispose(); engine.current = null; }; }, []);
  const speak = useCallback((text: string) => {
    if (!engine.current) engine.current = createEngine();
    engine.current.speak(text, update => { if (alive.current) setState(update); });
  }, [createEngine]);
  const stop = useCallback(() => { engine.current?.stop(); setState({ status: 'stopped' }); }, []);
  return { ...state, speak, stop };
}
