import { spawnSync } from 'node:child_process';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const api = new URL(process.env.EXPO_PUBLIC_API_URL || 'http://localhost');
if (api.protocol !== 'https:' || /^(localhost|127\.|192\.168\.|10\.|\[?::1)/.test(api.hostname)) {
  throw new Error('Configura EXPO_PUBLIC_API_URL con la URL HTTPS de la API publicada antes de compilar.');
}
const result = spawnSync(process.execPath, [require.resolve('expo/bin/cli'), 'export', '--platform', 'web', ...process.argv.slice(2)], {
  stdio: 'inherit', env: { ...process.env, EXPO_NO_DOTENV: '1' },
});
if (result.status === 0) {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf('--output-dir');
  const outputOption = args.find(arg => arg.startsWith('--output-dir='));
  const output = resolve(outputIndex >= 0 ? args[outputIndex + 1] : outputOption?.slice('--output-dir='.length) || 'dist');
  const htmlPath = resolve(output, 'index.html');
  const html = readFileSync(htmlPath, 'utf8');
  const defaultIcon = /<link\s+rel=["'](?:shortcut )?icon["'][^>]*>/i;
  if (!defaultIcon.test(html)) throw new Error('No se encontró el favicon generado por Expo.');
  copyFileSync(new URL('../src/assets/logo_banderin_turquesa.svg', import.meta.url), resolve(output, 'favicon-sheready-v2.svg'));
  writeFileSync(htmlPath, html.replace(defaultIcon, '<link rel="icon" href="/favicon.ico?v=sheready-v2"><link rel="icon" type="image/svg+xml" href="/favicon-sheready-v2.svg">'));
}
process.exit(result.status ?? 1);
