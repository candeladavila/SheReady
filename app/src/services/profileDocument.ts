import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export type ProfileDocument = { schema_version: 1; created_at: string; completed: boolean; goals: string[]; age_range: string | null; daily_time_choice: string | null; daily_minutes: number | null; sector: string | null };
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
