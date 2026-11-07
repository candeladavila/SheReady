import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const api = new URL(process.env.EXPO_PUBLIC_API_URL || 'http://localhost');
if (api.protocol !== 'https:' || /^(localhost|127\.|192\.168\.|10\.|\[?::1)/.test(api.hostname)) {
  throw new Error('Configura EXPO_PUBLIC_API_URL con la URL HTTPS de la API publicada antes de compilar.');
}
const result = spawnSync(process.execPath, [require.resolve('expo/bin/cli'), 'export', '--platform', 'web', ...process.argv.slice(2)], {
  stdio: 'inherit', env: { ...process.env, EXPO_NO_DOTENV: '1' },
});
process.exit(result.status ?? 1);
