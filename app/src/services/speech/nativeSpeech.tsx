import { createWebSpeechEngine } from './textToSpeech';
export const createNativeSpeechEngine = createWebSpeechEngine;
export function NativeSpeechHost() { return null; }
