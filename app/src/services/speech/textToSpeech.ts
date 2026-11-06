export type SpeechStatus = 'idle' | 'starting' | 'speaking' | 'finished' | 'stopped' | 'unsupported' | 'error';
export type SpeechUpdate = { status: SpeechStatus; message?: string };
export interface TextToSpeechEngine {
  speak(text: string, onUpdate: (update: SpeechUpdate) => void): void;
  stop(): void;
  dispose(): void;
}

/** La API no informa del género; solo usamos voces cuyo nombre identifica una voz masculina conocida. */
function chooseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const spanish = voices.filter(voice => /^es(?:[-_]|$)/i.test(voice.lang));
  const likelyMale = (voice: SpeechSynthesisVoice) =>
    /\b(male|hombre|masculin[oa]|jorge|pablo|alvaro|álvaro|enrique|diego|dario|darío|raul|raúl|carlos|antonio|miguel|javier|daniel)\b/i.test(voice.name)
    && !/\b(female|mujer|femenin[oa])\b/i.test(voice.name);
  return spanish.find(voice => /^es[-_]ES$/i.test(voice.lang) && likelyMale(voice))
    ?? spanish.find(likelyMale);
}

/** Adaptador sustituible: ninguna pantalla depende directamente de la API del navegador. */
export function createWebSpeechEngine(): TextToSpeechEngine {
  let current = 0;
  let startTimer: ReturnType<typeof setTimeout> | undefined;
  let voices: SpeechSynthesisVoice[] = [];
  let activeUtterance: SpeechSynthesisUtterance | undefined;
  let voiceTimer: ReturnType<typeof setTimeout> | undefined;
  let pendingVoices: (() => void) | undefined;
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  const synth = supported ? window.speechSynthesis : undefined;
  const refreshVoices = () => { voices = synth?.getVoices() ?? []; if (voices.length) pendingVoices?.(); };
  if (synth) { refreshVoices(); synth.addEventListener('voiceschanged', refreshVoices); }
  const cancel = () => { current++; if (startTimer) clearTimeout(startTimer); if (voiceTimer) clearTimeout(voiceTimer); startTimer = undefined; voiceTimer = undefined; pendingVoices = undefined; activeUtterance = undefined; synth?.cancel(); };
  return {
    speak(text, onUpdate) {
      cancel();
      if (!synth) { onUpdate({ status: 'unsupported', message: 'La voz no está disponible en este dispositivo. Puedes continuar leyendo las preguntas.' }); return; }
      const request = current;
      const start = () => {
        if (request !== current) return;
        pendingVoices = undefined;
        if (voiceTimer) clearTimeout(voiceTimer);
        const voice = chooseVoice(voices);
        if (!voice) {
          onUpdate({ status: 'error', message: 'No hay una voz masculina en español identificable en este navegador. Instala una voz como Jorge o Álvaro en el dispositivo y vuelve a intentarlo, o continúa sin audio.' });
          return;
        }
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        activeUtterance = utterance;
        utterance.lang = 'es-ES'; utterance.rate = 0.9; utterance.pitch = 0.85;
        utterance.voice = voice;
        utterance.onstart = () => { if (request !== current) return; if (startTimer) clearTimeout(startTimer); onUpdate({ status: 'speaking' }); };
        utterance.onend = () => { if (request !== current) return; if (startTimer) clearTimeout(startTimer); activeUtterance = undefined; onUpdate({ status: 'finished' }); };
        utterance.onerror = () => { if (request !== current) return; if (startTimer) clearTimeout(startTimer); activeUtterance = undefined; onUpdate({ status: 'error', message: 'No se ha podido reproducir la pregunta. Puedes intentarlo de nuevo o continuar sin audio.' }); };
        onUpdate({ status: 'starting' });
        // Si el navegador bloquea el inicio, no dejar la entrevista esperando indefinidamente.
        startTimer = setTimeout(() => { if (request !== current || !activeUtterance) return; cancel(); onUpdate({ status: 'error', message: 'El navegador no ha iniciado el audio. Pulsa «Repetir pregunta» o continúa sin audio.' }); }, 6000);
        synth.speak(utterance);
      } catch { if (startTimer) clearTimeout(startTimer); activeUtterance = undefined; onUpdate({ status: 'error', message: 'No se ha podido reproducir la pregunta. Puedes continuar sin audio.' }); }
      };
      refreshVoices();
      if (voices.length) start();
      else {
        onUpdate({ status: 'starting' });
        pendingVoices = start;
        voiceTimer = setTimeout(start, 2000);
      }
    },
    stop: cancel,
    dispose() { cancel(); synth?.removeEventListener('voiceschanged', refreshVoices); },
  };
}
