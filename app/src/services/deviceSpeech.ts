import * as Speech from 'expo-speech';

/** Resolve only after speech ends, so the recorder cannot capture the question. */
export function speakOnDevice(text: string) {
  let finish: (error?: Error) => void = () => {};
  const finished = new Promise<void>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      finish(new Error('La voz del dispositivo no respondió. Comprueba que tienes una voz en español disponible.'));
      void Speech.stop().catch(() => {});
    }, 120_000);
    finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error); else resolve();
    };
    try {
      Speech.speak(text, {
        language: 'es-ES', rate: 1,
        onDone: () => finish(),
        onStopped: () => finish(new Error('Reproducción cancelada.')),
        onError: () => finish(new Error('No se pudo leer la pregunta con la voz del dispositivo.')),
      });
    } catch {
      finish(new Error('La voz del dispositivo no está disponible en este navegador.'));
    }
  });
  return {
    finished,
    cancel: () => {
      finish(new Error('Reproducción cancelada.'));
      void Speech.stop().catch(() => {});
    },
  };
}
