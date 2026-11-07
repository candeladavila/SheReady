import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api, ApiError, AuthSession } from './api';
import { setAccess } from './access';
import storage from './accountStorage';
import { clearLocalOnboarding, clearPendingDocument, pendingProfileDocument } from './profileDocument';

const KEY = 'sheready-session-v1';
async function persist(value: string | null) {
  if (Platform.OS === 'web') {
    if (value) window.sessionStorage.setItem(KEY, value); else window.sessionStorage.removeItem(KEY);
  } else if (value) await SecureStore.setItemAsync(KEY, value); else await SecureStore.deleteItemAsync(KEY);
}
export async function syncPendingProfile() {
  const document = await pendingProfileDocument();
  if (document) { await api.profile.saveOnboarding(document); await clearPendingDocument(); }
}
export async function activateSession(session: AuthSession) {
  setAccess(session.access_token, session.user.id);
  try {
    await persist(JSON.stringify(session));
    await syncPendingProfile();
  } catch (error) {
    await api.auth.logout().catch(() => {});
    await persist(null).catch(() => {}); setAccess(null); throw error;
  }
}
export async function restoreSession(): Promise<AuthSession | null> {
  const value = Platform.OS === 'web' ? window.sessionStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
  if (!value) return null;
  let session: AuthSession;
  try { session = JSON.parse(value); } catch { await persist(null); return null; }
  if (!session.access_token || !session.user?.id || !Number.isFinite(Date.parse(session.expires_at)) || Date.parse(session.expires_at) <= Date.now()) { await persist(null); return null; }
  setAccess(session.access_token, session.user.id);
  try { session.user = await api.auth.me(); await persist(JSON.stringify(session)); await syncPendingProfile(); return session; }
  catch (error) { setAccess(null); if (error instanceof ApiError && error.status === 401) { await persist(null); return null; } throw error; }
}
export async function endSession(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  let revoked = false;
  try { await api.auth.logout(controller.signal); revoked = true; }
  catch { /* Local sign-out still works when the API is unavailable. */ }
  finally { clearTimeout(timeout); }
  await persist(null);
  setAccess(null);
  return revoked;
}

export async function deleteAccount(password: string): Promise<boolean> {
  await api.auth.deleteAccount(password);
  let cleared = true;
  try { await storage.clearAccount(); } catch { cleared = false; }
  try { await clearLocalOnboarding(); } catch { cleared = false; }
  try { await persist(null); } catch { cleared = false; }
  setAccess(null);
  return cleared;
}

export async function enterGuestSession() { await persist(null); setAccess(null); }
