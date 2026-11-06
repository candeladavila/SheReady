const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/services/api.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const exported = {};
let fileExists = true;
let response = { status: 200, body: JSON.stringify({ transcript: 'Mi respuesta', saved: false, source: 'ai', next_step: 'confirm' }) };
let captured;
let fetchCalls = 0;
const native = {
  FileSystemUploadType: { MULTIPART: 1 },
  getInfoAsync: async () => ({ exists: fileExists, size: 1000, isDirectory: false }),
  createUploadTask: (url, uri, options) => {
    captured = { url, uri, options };
    return { uploadAsync: async () => response, cancelAsync: async () => {} };
  },
};
vm.runInNewContext(compiled, {
  exports: exported, process: { env: {} }, Blob, FormData, AbortController, setTimeout, clearTimeout,
  require: name => { assert.equal(name, 'expo-file-system/legacy'); return native; },
  fetch: async () => { fetchCalls++; return { ok: true, status: 200, json: async () => ({ transcript: 'Web', saved: false }) }; },
});
(async () => {
  const client = exported.createApiClient({ baseUrl: 'http://test.local:8000', getToken: () => 'test-token' });
  const audio = { uri: 'file:///cache/recording.m4a', name: 'respuesta.m4a', type: 'audio/mp4' };
  assert.equal((await client.interviews.transcribe('interview/1', audio)).transcript, 'Mi respuesta');
  assert.equal(fetchCalls, 0);
  assert.equal(captured.url, 'http://test.local:8000/interviews/interview%2F1/transcriptions');
  assert.equal(captured.uri, audio.uri);
  assert.equal(captured.options.fieldName, 'file');
  assert.equal(captured.options.uploadType, 1);
  assert.equal(captured.options.mimeType, 'audio/mp4');
  assert.equal(captured.options.headers.Authorization, 'Bearer test-token');
  assert.equal(captured.options.headers['Content-Type'], undefined);
  response = { status: 422, body: JSON.stringify({ detail: 'No se reconoció habla.' }) };
  await assert.rejects(client.interviews.transcribe('i', audio), e => e.status === 422 && e.message === 'No se reconoció habla.');
  fileExists = false;
  await assert.rejects(client.interviews.transcribe('i', audio), e => e.message.includes('vacía'));
  fileExists = true;
  native.createUploadTask = () => ({ uploadAsync: async () => { throw Error('native upload failed'); }, cancelAsync: async () => {} });
  await assert.rejects(client.interviews.transcribe('i', audio), e => e.message.includes('Se conserva'));
  assert.equal((await client.interviews.transcribe('i', new Blob(['audio']))).transcript, 'Web');
  assert.equal(fetchCalls, 1);
  console.log('5 comprobaciones: subida nativa, multipart, errores HTTP, archivo ausente, ruta web y fallo de transporte.');
})().catch(error => { console.error(error); process.exitCode = 1; });
