import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { SpeechUpdate, TextToSpeechEngine } from './textToSpeech';
import { kokoroBridgeBundle } from './kokoroBridgeBundle';

type Command = { type: 'speak'; text: string; id: number } | { type: 'stop' };
let sendCommand: ((command: Command) => void) | undefined;
let current = 0;
let listener: ((update: SpeechUpdate) => void) | undefined;
let queued: Command | undefined;
const send = (command: Command) => { if (sendCommand) sendCommand(command); else queued = command; };

export function createNativeSpeechEngine(): TextToSpeechEngine {
  return {
    speak(text, onUpdate) {
      const id = ++current;
      listener = onUpdate;
      onUpdate({ status: 'starting', message: 'Preparando la voz del entrevistador. La primera carga puede tardar unos minutos.' });
      send({ type: 'speak', text, id });
    },
    stop() { current++; listener = undefined; send({ type: 'stop' }); },
    dispose() { current++; listener = undefined; send({ type: 'stop' }); },
  };
}

const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><script>${kokoroBridgeBundle.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
export function NativeSpeechHost() {
  const ref = useRef<WebView<{}>>(null);
  useEffect(() => () => { sendCommand = undefined; queued = undefined; }, []);
  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.ready) {
        sendCommand = command => ref.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message', {data: ${JSON.stringify(JSON.stringify(command))}})); true;`);
        if (queued) { sendCommand(queued); queued = undefined; }
      } else if (data.id === current && data.update) listener?.(data.update);
      else if (data.error) listener?.({ status: 'error', message: 'No se ha podido preparar la voz. Puedes continuar sin audio.' });
    } catch { listener?.({ status: 'error', message: 'No se ha podido preparar la voz. Puedes continuar sin audio.' }); }
  };
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}><WebView<{}> ref={ref} source={{ html, baseUrl: 'https://localhost/' }} originWhitelist={['https://*']} javaScriptEnabled mediaPlaybackRequiresUserAction={false} onMessage={onMessage} onError={() => listener?.({ status: 'error', message: 'No se ha podido iniciar la voz. Puedes continuar sin audio.' })} /></View>;
}
