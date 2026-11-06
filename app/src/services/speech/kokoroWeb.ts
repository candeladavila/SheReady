import { tokenize } from './kokoroTokenizer';
import type { SpeechUpdate, TextToSpeechEngine } from './textToSpeech';

// Versiones fijadas para que el módulo JavaScript y su WebAssembly coincidan.
const CDN = 'https://cdn.jsdelivr.net/npm/';
const MODEL = 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/1939ad2a8e416c0acfeecc08a694d14ef25f2231';
const importModule = new Function('url', 'return import(url)') as (url: string) => Promise<any>;
let resources: Promise<{ ort: any; session: any; voice: Float32Array; espeak: any }> | undefined;

async function download(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo descargar ${url}: ${response.status}`);
  return response.arrayBuffer();
}

function loadResources() {
  if (!resources) resources = (async () => {
    const [ort, espeakModule, model, voice] = await Promise.all([
      importModule(`${CDN}onnxruntime-web@1.21.0/dist/ort.min.mjs`),
      importModule(`${CDN}espeak-ng@1.0.2/dist/espeak-ng.js`),
      download(`${MODEL}/onnx/model_quantized.onnx`),
      download(`${MODEL}/voices/em_alex.bin`),
    ]);
    ort.env.wasm.wasmPaths = `${CDN}onnxruntime-web@1.21.0/dist/`;
    ort.env.wasm.numThreads = 1;
    const session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'] });
    return { ort, session, voice: new Float32Array(voice), espeak: espeakModule.default };
  })().catch(error => { resources = undefined; throw error; });
  return resources;
}

export function createKokoroWebEngine(): TextToSpeechEngine {
  let request = 0;
  let audio: AudioContext | undefined;
  let source: AudioBufferSourceNode | undefined;
  const stop = () => { request++; try { source?.stop(); } catch {} source = undefined; };
  return {
    speak(text: string, update: (value: SpeechUpdate) => void) {
      stop();
      const id = request;
      if (typeof window === 'undefined' || !window.AudioContext) {
        update({ status: 'unsupported', message: 'La voz no está disponible en este dispositivo.' });
        return;
      }
      audio ??= new AudioContext();
      // Activar el contexto durante el gesto, antes de descargar el modelo.
      const resume = audio.resume();
      update({ status: 'starting', message: 'Preparando la voz del entrevistador. La primera carga puede tardar unos minutos.' });
      void (async () => {
        const { ort, session, voice, espeak } = await loadResources();
        await Promise.race([resume, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Audio bloqueado')), 5000))]);
        if (id !== request) return;
        const phonemizer = await espeak({
          locateFile: () => `${CDN}espeak-ng@1.0.2/dist/espeak-ng.wasm`,
          arguments: ['--phonout', 'generated', '-q', '--ipa', '-v', 'es', text],
          print: () => {}, printErr: () => {},
        });
        if (id !== request) return;
        const phonemes: string = phonemizer.FS.readFile('generated', { encoding: 'utf8' }).replace(/\n/g, ' ').trim();
        const chunks = phonemes.match(/.{1,500}/gu) ?? [];
        const buffers: Float32Array[] = [];
        for (const chunk of chunks) {
          const tokens = tokenize(chunk);
          if (!tokens.length) continue;
          const style = voice.slice((tokens.length - 1) * 256, tokens.length * 256);
          if (style.length !== 256) throw new Error('Voz no compatible con la longitud del texto');
          const ids = [0, ...tokens, 0];
          const result = await session.run({
            input_ids: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]),
            style: new ort.Tensor('float32', style, [1, 256]),
            speed: new ort.Tensor('float32', [0.9], [1]),
          });
          if (id !== request) return;
          buffers.push(result.waveform.data as Float32Array);
        }
        if (!buffers.length) throw new Error('No se generó audio');
        const total = buffers.reduce((sum, item) => sum + item.length, 0);
        const output = audio!.createBuffer(1, total, 24000);
        let offset = 0;
        for (const buffer of buffers) { output.copyToChannel(buffer as Float32Array<ArrayBuffer>, 0, offset); offset += buffer.length; }
        source = audio!.createBufferSource(); source.buffer = output; source.connect(audio!.destination);
        source.onended = () => { if (id === request) { source = undefined; update({ status: 'finished' }); } };
        source.start(); update({ status: 'speaking' });
      })().catch(() => { if (id === request) update({ status: 'error', message: 'No se ha podido preparar la voz. Comprueba la conexión y vuelve a intentarlo, o continúa sin audio.' }); });
    },
    stop,
    dispose() { stop(); if (audio) void audio.close(); audio = undefined; },
  };
}
