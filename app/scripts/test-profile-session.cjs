const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(name, modules, globals = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/services', name + '.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(compiled, { exports, require: name => { assert(name in modules, name); return modules[name]; }, Date, Error, setTimeout, ...globals });
  return exports;
}
const memory = new Map();
const storage = { getItem: async key => memory.get(key) ?? null, setItem: async (key, value) => memory.set(key, value), removeItem: async key => memory.delete(key) };
let written;
const documentService = load('profileDocument', {
  '@react-native-async-storage/async-storage': { __esModule: true, default: storage },
  'react-native': { Platform: { OS: 'android' } },
  'expo-file-system/legacy': { documentDirectory: 'private://documents/', writeAsStringAsync: async (file, json) => { written = { file, json }; } },
});
let identity = null;
let failUpload = false;
let uploads = 0;
let revocations = 0;
class ApiError extends Error { constructor(status) { super(); this.status = status; } }
const sessionService = load('session', {
  'react-native': { Platform: { OS: 'web' } }, 'expo-secure-store': {},
  './api': { ApiError, api: { auth: { me: async () => ({ id: identity.owner }), logout: async () => { revocations++; } }, profile: { saveOnboarding: async doc => { uploads++; if (failUpload) throw Error('offline'); assert.equal(identity.owner, 'a'); assert.equal(doc.sector, 'Tecnología'); } } } },
  './access': { setAccess: (token, owner) => { identity = token ? { token, owner } : null; } },
  './profileDocument': documentService,
}, { window: { sessionStorage: { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) } } });
const account = id => ({ access_token: 'token-' + id, expires_at: new Date(Date.now() + 60000).toISOString(), user: { id } });
(async () => {
  const doc = { schema_version: 1, created_at: new Date().toISOString(), completed: true, goals: ['Preparar entrevistas'], age_range: null, daily_time_choice: 'Iré día a día', daily_minutes: null, sector: 'Tecnología' };
  await documentService.saveProfileDocument(doc);
  assert.equal(written.file, 'private://documents/onboarding-profile.json');
  assert.equal(JSON.parse(written.json).daily_minutes, null);
  failUpload = true;
  await assert.rejects(sessionService.activateSession(account('a')), /offline/);
  assert.equal(identity, null);
  assert.equal(revocations, 1);
  assert(await documentService.pendingProfileDocument(), 'A failed upload must retain the document');
  failUpload = false;
  await sessionService.activateSession(account('a'));
  assert.equal(await documentService.pendingProfileDocument(), null);
  assert.equal(identity.owner, 'a');
  await sessionService.endSession();
  assert.equal(identity, null);
  await sessionService.activateSession(account('b'));
  assert.equal(uploads, 2, 'Account B must not receive the already claimed document');
  await sessionService.enterGuestSession();
  assert.equal(await sessionService.restoreSession(), null);
  console.log('JSON file, null values, failed sync retention, retry, logout and account isolation passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
