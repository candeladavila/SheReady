import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { Profile } from './api';

export type ProfileDocument = { schema_version: 1; created_at: string; completed: boolean; goals: string[]; age_range: string | null; daily_time_choice: string | null; daily_minutes: number | null; sector: string | null };
export function documentFromProfile(profile: Profile): ProfileDocument | null {
  const document = profile.onboarding_document;
  if (document?.completed) return document;
  const goals = Array.isArray(profile.goals) ? profile.goals : [];
  const minutes = profile.daily_minutes ?? null;
  const time = profile.daily_time_choice ?? ([5, 10, 20].includes(minutes ?? 0) ? `${minutes} minutos` : null);
  if (!document && !goals.length && !profile.age_range && !time && !profile.sector) return null;
  return { schema_version: 1, created_at: document?.created_at ?? profile.created_at, completed: false,
    goals: document?.goals?.length ? document.goals : goals,
    age_range: document?.age_range ?? profile.age_range ?? null,
    daily_time_choice: document?.daily_time_choice ?? time,
    daily_minutes: document?.daily_time_choice ? document.daily_minutes : minutes,
    sector: document?.sector ?? profile.sector ?? null };
}
const KEY = '@sheready/pending-onboarding-v1';
export async function saveProfileDocument(document: ProfileDocument) {
  const json = JSON.stringify(document, null, 2);
  if (Platform.OS !== 'web') await FileSystem.writeAsStringAsync(`${FileSystem.documentDirectory}onboarding-profile.json`, json);
  await AsyncStorage.setItem(KEY, json);
  await AsyncStorage.setItem('@sheready/onboarding-seen', 'true');
}
export async function pendingProfileDocument(): Promise<ProfileDocument | null> {
  const json = await AsyncStorage.getItem(KEY);
  return json ? JSON.parse(json) : null;
}
export const clearPendingDocument = () => AsyncStorage.removeItem(KEY);
export async function clearLocalOnboarding() {
  await AsyncStorage.multiRemove([KEY, '@sheready/onboarding-seen']);
  if (Platform.OS !== 'web' && FileSystem.documentDirectory) await FileSystem.deleteAsync(`${FileSystem.documentDirectory}onboarding-profile.json`, { idempotent: true });
}
export const hasSavedOnboarding = async () => (await AsyncStorage.getItem('@sheready/onboarding-seen')) === 'true';
export async function downloadProfileDocument() {
  const document = await pendingProfileDocument();
  if (!document) throw new Error('No hay un documento pendiente.');
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }));
    const link = window.document.createElement('a'); link.href = url; link.download = 'onboarding-profile.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
