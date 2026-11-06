import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { strandsHtml } from '../generated/strandsHtml';
import { VoiceStrands } from './InterviewVisuals';

/** Ejecuta el mismo componente WebGL que la web en un WebView local, sin conexión. */
export default function VoiceVisualization() {
  const [failed, setFailed] = useState(false);
  if (failed) return <VoiceStrands />;
  return <View style={styles.container} pointerEvents="none"><WebView
    originWhitelist={['*']}
    source={{ html: strandsHtml }}
    javaScriptEnabled
    scrollEnabled={false}
    style={styles.webview}
    onError={() => setFailed(true)}
    onMessage={event => { if (event.nativeEvent.data === 'webgl-unavailable') setFailed(true); }}
    accessibilityLabel="Animación de voz"
  /></View>;
}
const styles = StyleSheet.create({ container: { width: '100%', maxWidth: 300, aspectRatio: 1 }, webview: { flex: 1, backgroundColor: 'transparent' } });
