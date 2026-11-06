import { createKokoroWebEngine } from './kokoroWeb';

declare global { interface Window { ReactNativeWebView: { postMessage(value: string): void }; } }
const engine = createKokoroWebEngine();
const send = (value: object) => window.ReactNativeWebView.postMessage(JSON.stringify(value));
window.addEventListener('message', event => {
  try {
    const command = JSON.parse(event.data);
    if (command.type === 'speak') engine.speak(command.text, update => send({ id: command.id, update }));
    if (command.type === 'stop') engine.stop();
  } catch { send({ error: 'No se pudo procesar el comando de voz.' }); }
});
send({ ready: true });
